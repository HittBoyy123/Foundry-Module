import { MODULE_ID } from "./constants.js";
import { asArtisanBonus, toPF2eArtisanRule } from "./artisan-bonus.js";
import { markDescriptionHtml, markFormulaContext } from "./mark-formulas.js";

/** Explicit timed-effect adapters. Unlisted activations are not silently guessed. */
export function timedMarkRules(definition, item, mark) {
  const { tier } = markFormulaContext(item);
  if (!tier) return null;
  const flat = (selector, value, predicate = []) => ({ key: "FlatModifier", selector, value, predicate });
  const resistance = (type, value) => ({ key: "Resistance", type, value });
  const choice = mark.configuration?.choice;
  switch (definition.id) {
    case "blacksmithing-specialty-1-hellfire-channel": return {
      minutes: 1, rules: [{ key: "DamageDice", selector: [`${item.id}-damage`], diceNumber: tier, dieSize: "d8", damageType: "fire" }],
      manual: "Reduce fire resistance by the stated amount against this added damage only; immunity remains unchanged.",
    };
    case "enchanting-specialty-2-living-essence":
      if (!["acid", "cold", "electricity", "fire"].includes(choice)) throw new Error("Configure the Living Essence energy type first.");
      return { minutes: 1, rules: [{ key: "BaseSpeed", selector: "fly", value: "@actor.system.attributes.speed.value" }, resistance(choice, 4 * tier)], manual: "" };
    case "weaving-specialty-1-aetherbound-form": return { minutes: 1,
      rules: [{ key: "BaseSpeed", selector: "fly", value: 40 }, resistance("physical", 5 * tier)],
      manual: "Treat openings as though two sizes smaller when squeezing; this does not change actual creature size." };
    case "tailoring-specialty-2-phase-veil": return { rounds: 1,
      rules: [resistance("physical", 6 * tier)], manual: "Movement through creature spaces and non-magical difficult terrain still requires legal positioning." };
    case "tailoring-specialty-2-shadow-mantle": return { minutes: 1,
      rules: [{ key: "RollOption", domain: "all", option: `wrathmaker:shadow-mantle:${item.id}`, toggleable: true, value: false, label: "Shadow Mantle: In Dim Light or Darkness" },
        flat("stealth", tier, [`wrathmaker:shadow-mantle:${item.id}`])],
      manual: "Toggle the lighting condition when applicable; apply concealment only in dim light or darkness." };
    default: return null;
  }
}

export function createTimedMarkEffect(definition, item, mark) {
  const adapter = timedMarkRules(definition, item, mark);
  if (!adapter) return null;
  return { name: `${definition.name} (${item.name})`, type: "effect", img: item.img,
    flags: { [MODULE_ID]: { timedMark: { itemId: item.id, definitionId: definition.id } } },
    system: { tokenIcon: { show: true }, level: { value: Number(item.system?.level?.value) || 1 },
      duration: { value: adapter.minutes ?? adapter.rounds, unit: adapter.minutes ? "minutes" : "rounds", expiry: "turn-end", sustained: false },
      rules: adapter.rules.map(rule => toPF2eArtisanRule(asArtisanBonus(rule, definition.name))),
      description: { value: `<p>${markDescriptionHtml(definition.effectSummary, markFormulaContext(item))}</p>${adapter.manual ? `<p><strong>Manual resolution:</strong> ${adapter.manual}</p>` : ""}` },
    } };
}

export function activationFrequency(text) {
  // Only exact frequency phrases from the maintained catalogue are recognised.
  if (/three charges per day/i.test(text)) return { max: 3, period: "day" };
  if (/once per day|once a day/i.test(text)) return { max: 1, period: "day" };
  if (/once per encounter/i.test(text)) return { max: 1, period: "encounter" };
  if (/once per round/i.test(text)) return { max: 1, period: "round" };
  if (/once per 10 minutes/i.test(text)) return { max: 1, period: "ten-minutes" };
  return null;
}

export function activationPeriodKey(frequency, { worldTime, combat } = {}) {
  if (!frequency) return "unlimited";
  if (frequency.period === "encounter" || frequency.period === "round") {
    if (!combat?.started) throw new Error("Start an encounter before using this encounter-limited activation.");
    return frequency.period === "round" ? `${combat.id}:${combat.round}` : combat.id;
  }
  if (!Number.isFinite(worldTime)) throw new Error("World time is unavailable.");
  // Day-limited use is deliberately not inferred from a midnight crossing.
  // Reset by the GM after daily preparations; item transfers do not reset it.
  return frequency.period === "day" ? "daily-preparations" : String(Math.floor(worldTime / 600));
}
