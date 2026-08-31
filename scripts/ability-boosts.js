import { MODULE_ID } from "./constants.js";

export const ABILITY_BOOST_SCHEMA_VERSION = 1;
export const ABILITY_BOOST_ATTRIBUTES = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);

const PATCH_MARKER = Symbol.for(`${MODULE_ID}.abilityBoosts.prepareBuildData`);
const ATTRIBUTE_SET = new Set(ABILITY_BOOST_ATTRIBUTES);

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getModuleFlags(item) {
  return item?.getFlag?.(MODULE_ID) ?? item?.flags?.[MODULE_ID] ?? null;
}

function getActorInventory(actor) {
  const inventory = actor?.inventory?.contents;
  if (Array.isArray(inventory)) return inventory;

  const items = actor?.items?.contents;
  if (Array.isArray(items)) return items;
  if (actor?.items && Symbol.iterator in Object(actor.items)) return Array.from(actor.items);
  return [];
}

export function normalizeAbilityBoost(value) {
  if (!value || typeof value !== "object") return null;
  const attribute = String(value.attribute ?? "").trim().toLowerCase();
  const bonus = Number(value.value);
  if (!ATTRIBUTE_SET.has(attribute) || !Number.isInteger(bonus) || bonus < 1 || bonus > 5) return null;
  return Object.freeze({
    schemaVersion: ABILITY_BOOST_SCHEMA_VERSION,
    attribute,
    value: bonus,
  });
}

export function getItemAbilityBoost(item) {
  if (item?.type !== "equipment") return null;
  const boost = normalizeAbilityBoost(getModuleFlags(item)?.abilityBoost);
  if (!boost) return null;

  const traits = item.system?.traits?.value;
  const otherTags = item.system?.traits?.otherTags;
  if (!Array.isArray(traits) || !traits.includes("apex")) return null;
  if (!Array.isArray(otherTags) || !otherTags.includes("item-boost")) return null;
  if (item.system?.apex?.attribute !== boost.attribute) return null;
  return boost;
}

export function getActiveAbilityBoost(actor) {
  if (!actor?.system?.abilities || actor.type !== "character") return null;

  for (const item of getActorInventory(actor)) {
    const boost = getItemAbilityBoost(item);
    if (!boost || item.system?.apex?.selected !== true) continue;

    const invested = item.isInvested ?? item.system?.equipped?.invested;
    const equipped = item.isEquipped ?? (item.system?.equipped?.carryType === "worn");
    if (invested === true && equipped === true) return { ...boost, item };
  }

  return null;
}

export function applyAbilityBoost(actor, boost) {
  const normalized = normalizeAbilityBoost(boost);
  const ability = normalized ? actor?.system?.abilities?.[normalized.attribute] : null;
  if (!ability || typeof ability !== "object") return false;

  const current = Number(ability.mod);
  if (!Number.isFinite(current)) return false;
  ability.mod = clamp(current + normalized.value, -5, 10);
  ability.base = Math.trunc(ability.mod);
  return true;
}

/**
 * Replace PF2e's standard Apex adjustment only for Wrathmaker item-boost
 * equipment. PF2e still owns investment and the single selected-Apex-item
 * workflow. Wrathmaker intercepts the attribute-build stage after PF2e has
 * resolved that selection, suppresses the standard Apex adjustment, and then
 * supplies the configured additive value before derived statistics are
 * calculated.
 */
export function installAbilityBoostBridge() {
  const CharacterClass = CONFIG.PF2E?.Actor?.documentClasses?.character;
  const prototype = CharacterClass?.prototype;
  const original = prototype?.prepareBuildData;
  if (typeof original !== "function") {
    console.error(`${MODULE_ID} | PF2e Character.prepareBuildData was not found; item boosts cannot be automated.`);
    return false;
  }
  if (original[PATCH_MARKER]) return true;

  function prepareBuildDataWithAbilityBoosts(...args) {
    const active = getActiveAbilityBoost(this);
    const buildAttributes = this.system?.build?.attributes;
    const storedApex = buildAttributes?.apex ?? null;
    const suppressStandardApex = active && buildAttributes && storedApex === active.attribute;

    if (suppressStandardApex) buildAttributes.apex = null;
    let result;
    try {
      result = original.apply(this, args);
    } finally {
      if (suppressStandardApex) buildAttributes.apex = storedApex;
    }

    if (active) applyAbilityBoost(this, active);
    return result;
  }

  Object.defineProperty(prepareBuildDataWithAbilityBoosts, PATCH_MARKER, { value: true });
  Object.defineProperty(prepareBuildDataWithAbilityBoosts, "name", { value: original.name });
  prototype.prepareBuildData = prepareBuildDataWithAbilityBoosts;
  return true;
}
