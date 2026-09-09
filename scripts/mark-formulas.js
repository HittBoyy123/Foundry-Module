import { MODULE_ID } from "./constants.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function markFormulaContext(item, coreTier) {
  const flags = item?.flags?.[MODULE_ID] ?? {};
  const tier = Number(coreTier ?? flags.crafting?.core?.tier ?? flags.tier);
  const actor = item?.actor;
  const entries = Array.from(actor?.spellcasting?.contents ?? []);
  const dcs = [actor?.system?.attributes?.classDC?.value, actor?.system?.attributes?.spellDC?.value,
    actor?.system?.attributes?.classOrSpellDC?.value, ...entries.map(e => e.statistic?.dc?.value)]
    .map(Number).filter(n => Number.isFinite(n) && n > 0);
  return { tier: Number.isInteger(tier) && tier >= 1 && tier <= 6 ? tier : null,
    dragonTier: Number(flags.dragonScale?.tier) || null,
    level: Number(actor?.level ?? actor?.system?.details?.level?.value) || null,
    dc: dcs.length ? Math.max(...dcs) : null };
}

/** Presentation only: a deliberately small arithmetic grammar, never eval or
 * inference of game mechanics from prose. Thresholds and unknown inputs stay visible. */
export function resolveMarkText(text, context) {
  let result = String(text ?? "");
  for (const [term, value] of [["Core Tier", context.tier], ["Dragon Tier", context.dragonTier], ["your level", context.level]]) {
    if (!Number.isFinite(value) || value <= 0) continue;
    const token = term + "(?![s\\w]|\\s+\\d)";
    result = result.replace(new RegExp(`${token}\\s*[×*]\\s*(\\d+)`, "gi"),
      (_match, multiplier) => String(value * Number(multiplier)));
    result = result.replace(new RegExp(`(\\d+)\\s*[×*]\\s*${token}(?:\\s*\\+\\s*(\\d+))?`, "gi"),
      (_match, multiplier, add) => String(Number(multiplier) * value + Number(add ?? 0)));
    result = result.replace(new RegExp(`\\(?${token}\\s*\\+\\s*(\\d+)\\)?`, "gi"),
      (_match, add) => String(value + Number(add)));
    result = result.replace(new RegExp(`\\b${token}\\b`, "gi"), String(value));
  }
  // Core Tier d8 means that many d8, not a multiplication of one random result.
  return result.replace(/\b(\d+)\s+d(4|6|8|10|12)\b/gi, "$1d$2");
}

export function markDescriptionHtml(text, context) {
  let html = escape(resolveMarkText(text, context));
  html = html.replace(/\b(\d+d(?:4|6|8|10|12))\s+(acid|bleed|cold|electricity|fire|force|mental|piercing|poison|slashing|sonic|spirit|vitality|void) damage\b/gi,
    (_match, dice, type) => `@Damage[${dice.toLowerCase()}[${type.toLowerCase()}]]{${dice} ${type} damage}`);
  // Retain outcome/target rules verbatim; the link rolls a save, not its resolution.
  if (context.dc && /higher class(?: or |\/)spell DC/i.test(text)) {
    const save = String(text).match(/\b(?:basic\s+)?(Fortitude|Reflex|Will)(?:\s+save)?\s+against/i);
    if (save) html += ` <br>@Check[type:${save[1].toLowerCase()}|dc:${context.dc}${/basic\s+(?:Fortitude|Reflex|Will)/i.test(text) ? "|basic:true" : ""}]`;
  }
  return html;
}
