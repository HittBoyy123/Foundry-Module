import { CATALOGUE_REVISIONS } from "../content/mark-catalogue-pass.js";
const condition = "wrathmaker:mark-condition";
const flat = (selector, value, predicate = []) => ({ key: "FlatModifier", selector: [selector], type: "untyped", value, predicate });
const resist = (type, value) => ({ key: "Resistance", type, value });

/** Exact ID/selector mappings, not guesses based on prose. Context remains a visible toggle. */
const SUBJECT_CHECKS = {
  "blacksmithing-specialty-2-consecrated-finish": ["religion", "action:recall-knowledge"],
  "blacksmithing-specialty-3-diagnostic-matrix": ["crafting"],
  "enchanting-specialty-3-runic-signature": ["arcana"],
  "leatherwork-universal-weather-seal": ["fortitude"],
  "leatherwork-specialty-1-wyrm-inscription": ["arcana"],
  "leatherwork-specialty-2-trophy-memory": ["nature", "action:recall-knowledge"],
  "leatherwork-specialty-3-trophy-finish": ["intimidation"],
  "carpentry-universal-precision-joinery": ["crafting"],
  "glassmaking-universal-perfect-clarity": ["perception"],
  "glassmaking-specialty-2-perfect-reflection": ["deception", "action:impersonate"],
  "glassmaking-specialty-2-truth-mirror": ["perception"],
  "pottery-specialty-1-fired-seal": ["crafting"],
  "pottery-specialty-2-sanctified-vessel": ["religion"],
  "weaving-universal-weatherproof-weave": ["fortitude"],
  "weaving-specialty-3-heraldic-seal": ["society"],
  "bookmaking-universal-perfect-index": ["society", "action:recall-knowledge"],
  "bookmaking-specialty-1-indexed-arcana": ["arcana"],
  "bookmaking-specialty-2-scholars-index": ["society"],
  "bookmaking-specialty-3-surveyors-mark": ["survival"],
  "tailoring-universal-hidden-pocketing": ["thievery", "action:conceal-an-object"],
  "tailoring-specialty-2-silent-stitch": ["stealth"],
  "tailoring-specialty-3-court-finish": ["society"],
  "tailoring-specialty-3-envoys-raiment": ["diplomacy"],
};
export function catalogueRules(id, item, tier, choice, weaponDice) {
  if (!CATALOGUE_REVISIONS[id]) return null;
  const t = Math.min(6, Math.max(1, Number(tier) || 1));
  const attack = `${item.id}-attack`, damage = `${item.id}-damage`;
  const subject = SUBJECT_CHECKS[id];
  if (subject) return [flat(subject[0], t + 2, [condition, ...subject.slice(1)])];
  switch (id) {
    case "blacksmithing-universal-perfect-balance": return [flat("athletics", t + 2, [`action:${choice}`, condition])];
    case "blacksmithing-universal-reinforced-edge": return [flat(damage, weaponDice * (t >= 5 ? 5 : 3), ["wrathmaker:target-object"])];
    case "blacksmithing-specialty-1-ember-temper": return [{ ...flat(damage, 4 * t), critical: true, damageType: "fire" }];
    case "blacksmithing-specialty-1-blood-temper": return [flat(damage, 4 * t, [{ lte: ["hp-percent", 50] }])];
    case "blacksmithing-specialty-2-dawnbound": return [{ ...flat(damage, 3 * weaponDice, [{ or: ["target:trait:undead", "target:trait:fiend"] }]), damageType: "spirit" }];
    case "enchanting-specialty-1-minor-empowerment": return [flat(choice, t + 2, [condition])];
    case "enchanting-specialty-1-focused-empowerment": return [flat(choice, t)];
    case "enchanting-specialty-1-overlord-matrix": return item.type === "weapon" ? [flat(attack, 2)] : [flat("spell-attack", 2), flat("spell-dc", 2)];
    case "enchanting-specialty-2-elemental-essence": return item.type === "weapon" ? [{ key: "DamageDice", selector: [damage], diceNumber: t, dieSize: "d8", damageType: choice }] : [resist(choice, 5 * t)];
    case "weaving-specialty-1-manaweave": return [resist(choice, 4 * t)];
    case "weaving-specialty-2-impact-mesh": return [resist("physical", 3 * t)];
    case "weaving-specialty-2-silken-steel": return [flat("ac", 5), resist("physical", 4 * t)];
    case "leatherwork-specialty-2-apex-hide": return [flat("hp", 10 * t), flat("fortitude", t, [condition])];
    case "weaving-specialty-2-shock-absorbing-warcloth": return [flat("hp", 12 * t)];
    case "pottery-specialty-1-living-ceramic-shell": return [flat("hp", 20 * t)];
    case "tailoring-specialty-1-war-skin-regeneration": return [flat("hp", 24 * t)];
    case "tailoring-specialty-3-coronation-regalia": return [flat("hp", 18 * t, [condition]), flat("diplomacy", 5, [condition]), flat("intimidation", 5, [condition])];
    case "carpentry-specialty-1-true-fletching":
    case "glassmaking-universal-precision-focus": return [flat(attack, t, [condition])];
    case "weaving-universal-tensioned-thread": return [flat("athletics", t + 2, [condition, { or: ["action:grapple", "action:trip"] }])];
    case "leatherwork-specialty-3-predators-cloak": return [flat("stealth", t, [condition]), flat("survival", t, [condition])];
    case "leatherwork-specialty-3-court-mantle": return [flat("diplomacy", t, [condition]), flat("society", t, [condition])];
    case "bookmaking-specialty-3-strategic-map": return [flat("initiative", 5, [condition])];
    case "tailoring-specialty-1-combat-cut": return [flat("acrobatics", t + 2, ["action:tumble-through"])];
    case "tailoring-specialty-2-chameleon-cloth": return [flat("stealth", t, [condition, { or: ["action:hide", "action:sneak"] }])];
    case "tailoring-specialty-2-many-faced-weave": return [flat("deception", 5, [condition, "action:impersonate"])];
    case "tailoring-specialty-3-judicators-robes": return [flat("perception", 5, ["action:sense-motive"])];
    case "enchanting-specialty-2-greater-binding":
    case "glassmaking-specialty-3-arcane-conductor":
    case "carpentry-specialty-1-warbow-overdraw":
    case "leatherwork-specialty-1-wyrms-fury": return [{
      key: "DamageAlteration", selectors: [damage], mode: "add", property: "dice-number",
      predicate: ["dice:slug:base"], value: id.includes("warbow") || id.includes("wyrms-fury") ? 3 : 2,
    }];
    default: return []; // Activations, project rules and unimplemented riders are explicitly manual.
  }
}
