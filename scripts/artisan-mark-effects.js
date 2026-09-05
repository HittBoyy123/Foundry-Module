import { MODULE_ID } from "./constants.js";
import { getCoreTierProgression } from "./crafting-model.js";
import { getArtisanMarkDefinition } from "../content/artisan-marks.js";

const hp = (value) => ({ key: "FlatModifier", selector: ["hp"], value, type: "untyped" });
const resist = (type, value) => ({ key: "Resistance", type, value });
const flat = (selector, value, extra = {}) => ({ key: "FlatModifier", selector: [selector], value, type: "untyped", ...extra });
const skillChoices = ["acrobatics", "arcana", "athletics", "crafting", "deception", "diplomacy", "intimidation", "medicine", "nature", "occultism", "performance", "religion", "society", "stealth", "survival", "thievery"];
const energyChoices = ["acid", "cold", "electricity", "fire"];

export function artisanMarkStackGroup(mark) {
  if (/Max[ -]HP/i.test(mark.effectSummary)) return "max-hp-artisan-mark";
  if (/over-potency/i.test(mark.stackGroup)) return "over-potency";
  if (/ac-over-core/i.test(mark.stackGroup)) return "ac-over-core";
  return mark.stackGroup ?? "";
}

export function markAppliesToItem(mark, itemGroup, item = null) {
  const id = mark.definitionId ?? mark.id;
  const groups = {
    "blacksmithing-specialty-1-blood-temper": ["weapon"],
    "blacksmithing-specialty-2-aegis-of-dawn": ["armor"],
    "enchanting-specialty-1-overlord-matrix": ["weapon", "spellFocus"],
    "enchanting-specialty-2-elemental-essence": ["weapon", "armor", "shield"],
    "glassmaking-specialty-1-crown-prism": ["spellFocus"],
    "leatherwork-specialty-3-sovereign-pelt": ["armor"],
    "weaving-specialty-1-manaweave": ["armor"],
    "weaving-specialty-2-impact-mesh": ["armor"],
    "weaving-specialty-2-unbreakable-braid": ["armor"],
  }[id] ?? mark.validItemGroups;
  if (!groups.includes(itemGroup)) return false;
  const text = mark.effectSummary;
  if (itemGroup === "weapon" && /Hardness|item HP|component HP/i.test(text)
    && !/weapon|damage per|critical hit|Strike/i.test(text)) return false;
  if (/Ranged weapon|Bow\/crossbow|range increment/i.test(text) && itemGroup === "weapon"
    && item && !Number(item.system?.range)) return false;
  if (/Dragon Scale Core or Reinforcement|Dragon Tier/i.test(text)
    && item && !item.flags?.[MODULE_ID]?.dragonScale?.color) return false;
  return true;
}

export function markConfigurationChoices(id) {
  if (["enchanting-specialty-2-elemental-essence", "weaving-specialty-1-manaweave"].includes(id)) return energyChoices;
  if (id === "leatherwork-specialty-3-sovereign-pelt") return ["intimidation", "diplomacy"];
  if (id === "enchanting-specialty-1-focused-empowerment") return [...skillChoices, "initiative"];
  if (id === "enchanting-specialty-1-minor-empowerment") return skillChoices;
  if (id === "blacksmithing-universal-perfect-balance") return ["trip", "shove", "disarm", "grapple", "reposition"];
  return [];
}

const DURABILITY = {
  "blacksmithing-universal-tempered-construction": [0.1, 1],
  "blacksmithing-universal-fortified-frame": [0.2, 2],
  "leatherwork-universal-reinforced-hide": [0.1, 1],
  "carpentry-universal-seasoned-construction": [0.1, 0],
  "stonemason-universal-stonebound": [0.1, 1],
  "glassmaking-universal-hardened-glass": [0.2, 2],
  "pottery-universal-hardened-ceramic": [0.1, 1],
  "weaving-universal-reinforced-weave": [0.2, 1],
  "tailoring-universal-reinforced-seam": [0.1, 1],
};
const appliedSystems = new WeakSet();

export function applyMarkItemStats(item) {
  if (!item.system || appliedSystems.has(item.system)) return;
  const marks = item.flags?.[MODULE_ID]?.crafting?.artisanMarks ?? [];
  const baseHP = Number(item.system.hp?.max) || 0;
  let extraHP = 0;
  for (const mark of marks.filter((entry) => entry.status === "completed")) {
    const id = mark.definitionId;
    const tier = Number(item.flags?.[MODULE_ID]?.crafting?.core?.tier) || 1;
    const durability = DURABILITY[id];
    if (durability && item.type !== "weapon") {
      const multiplier = id === "leatherwork-universal-reinforced-hide" && tier >= 5 ? 2 : 1;
      extraHP += Math.floor(baseHP * durability[0] * multiplier);
      if (Number.isFinite(item.system.hardness)) item.system.hardness += durability[1] * multiplier;
    }
    if (id === "pottery-specialty-1-ceramic-plate" && item.type === "armor") {
      extraHP += 15 * tier;
      if (Number.isFinite(item.system.hardness)) item.system.hardness += 2;
    }
    if (id === "carpentry-specialty-1-longshot-construction" && item.type === "weapon" && item.system.range > 0) {
      item.system.range = Math.floor(item.system.range * 1.5);
    }
    if (id === "weaving-specialty-2-flexible-weave" && item.type === "armor") {
      item.system.speedPenalty = Math.min(0, (Number(item.system.speedPenalty) || 0) + 5);
      if (Number.isFinite(item.system.dexCap)) item.system.dexCap += 1;
    }
  }
  if (extraHP && item.system.hp) {
    item.system.hp.max += extraHP;
    item.system.hp.value = Math.min(item.system.hp.max, item.system.hp.value + extraHP);
    if ("brokenThreshold" in item.system.hp) item.system.hp.brokenThreshold = Math.floor(item.system.hp.max / 2);
  }
  appliedSystems.add(item.system);
}

/** Explicit adapters only: source rules are never inferred from arbitrary prose. */
export function rulesForArtisanMark(mark, item) {
  const id = mark.definitionId ?? mark.id;
  const tier = Number(item.flags?.[MODULE_ID]?.crafting?.core?.tier) || 1;
  const attack = `${item.id}-attack`, damage = `${item.id}-damage`;
  const dice = (Number(item.system?.damage?.dice) || 1) + getCoreTierProgression(tier).weaponDice;
  const choice = mark.configuration?.choice;
  const permitted = markConfigurationChoices(id);
  if (permitted.length && !permitted.includes(choice)) return [];
  switch (id) {
    case "blacksmithing-specialty-1-perfected-killing-edge":
    case "carpentry-specialty-1-perfected-tension": return [flat(attack, 1)];
    case "enchanting-specialty-1-overlord-matrix":
      return item.type === "weapon" ? [flat(attack, 1)] : [flat("spell-attack", 1), flat("spell-dc", 1)];
    case "glassmaking-specialty-1-crown-prism": return [flat("spell-attack", 1), flat("spell-dc", 1)];
    case "blacksmithing-specialty-1-ember-temper": return [flat(damage, tier, { critical: true, damageType: "fire" })];
    case "blacksmithing-specialty-1-blood-temper":
      return [flat(damage, tier >= 5 ? 4 : 2, { predicate: [{ lte: ["hp-percent", 50] }] })];
    case "blacksmithing-universal-reinforced-edge":
    case "carpentry-universal-reinforced-limb":
      return [flat(damage, dice * (id.includes("reinforced-edge") && tier >= 5 ? 2 : 1), { predicate: ["wrathmaker:target-object"] })];
    case "blacksmithing-specialty-2-dawnbound":
      return [flat(damage, dice, { damageType: "spirit", predicate: [{ or: ["target:trait:undead", "target:trait:fiend"] }] })];
    case "blacksmithing-specialty-2-aegis-of-dawn": return [hp(4 * tier), resist("spirit", tier), resist("void", tier)];
    case "stonemason-specialty-3-mountain-plate": return [hp(4 * tier), resist("physical", tier)];
    case "stonemason-specialty-3-mountain-blood-plate": return [hp(8 * tier), resist("physical", 2 * tier)];
    case "tailoring-specialty-1-vital-reinforcement": return [hp(5 * tier)];
    case "weaving-specialty-2-unbreakable-braid": return [hp(6 * tier)];
    case "leatherwork-specialty-3-sovereign-pelt": return [hp(6 * tier), flat(choice, 2)];
    case "weaving-specialty-2-impact-mesh": return [resist("physical", Math.ceil(tier / 2))];
    case "weaving-specialty-2-silken-steel": return [flat("ac", 1), resist("physical", tier)];
    case "tailoring-specialty-1-war-skin": return [flat("ac", 1), flat("land-speed", 5), resist("physical", tier)];
    case "enchanting-specialty-2-elemental-essence":
      return item.type === "weapon" ? [{
        key: "DamageDice", selector: [damage], diceNumber: tier >= 6 ? 3 : tier >= 4 ? 2 : 1,
        dieSize: "d6", damageType: choice,
      }] : [resist(choice, 2 * tier)];
    case "weaving-specialty-1-manaweave": return [resist(choice, tier)];
    case "enchanting-specialty-1-focused-empowerment": return [flat(choice, 1)];
    case "enchanting-specialty-1-minor-empowerment": return [flat(choice, 1, { predicate: ["wrathmaker:mark-condition"] })];
    case "blacksmithing-universal-perfect-balance": return [flat("athletics", 1, { predicate: [`action:${choice}`, "wrathmaker:mark-condition"] })];
    default: return [];
  }
}

export function buildArtisanMarkRules(item, itemGroup = item.type) {
  if (!item.actor || item.isEquipped === false) return [];
  const marks = item.flags?.[MODULE_ID]?.crafting?.artisanMarks ?? [];
  return marks.filter((mark) => mark.status === "completed").flatMap((mark) => {
    const definition = getArtisanMarkDefinition(mark.definitionId);
    if (!definition || !markAppliesToItem(definition, itemGroup, item)) return [];
    const conditionOption = `wrathmaker:mark-condition:${item.id}:${mark.definitionId}`;
    const rules = rulesForArtisanMark(mark, item).map((rule) => ({
      ...rule, label: mark.name, slug: mark.definitionId,
      ...(rule.predicate ? { predicate: rule.predicate.map((term) => term === "wrathmaker:mark-condition" ? conditionOption : term) } : {}),
    }));
    const predicates = rules.flatMap((rule) => rule.predicate ?? []);
    for (const option of ["wrathmaker:target-object", conditionOption]) {
      if (predicates.includes(option)) rules.unshift({
        key: "RollOption", domain: "all", option, toggleable: true, value: false,
        label: `${mark.name}: ${option.endsWith("target-object") ? "target is an object" : "condition applies"}`,
      });
    }
    return rules;
  });
}

export function markAutomationLabel(mark) {
  const id = mark.definitionId ?? mark.id;
  const item = { id: "preview", type: "weapon", system: { damage: { dice: 1 } }, flags: {} };
  const sample = { ...mark, configuration: { choice: markConfigurationChoices(id)[0] } };
  if (DURABILITY[id] || ["pottery-specialty-1-ceramic-plate", "carpentry-specialty-1-longshot-construction", "weaving-specialty-2-flexible-weave", "blacksmithing-specialty-1-blood-temper"].includes(id)
    || rulesForArtisanMark(sample, item).length) return "Includes numerical automation; other benefits follow the rules text.";
  return "Rules text — resolve this Mark's activation or special benefit during play.";
}
