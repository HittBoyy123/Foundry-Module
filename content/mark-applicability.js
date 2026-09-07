// Explicit overrides: a reference to damaging structures must not hide a weapon Mark.
const STRUCTURE_MARKS = new Set([
  "carpentry-specialty-2-reinforced-frame", "carpentry-specialty-2-modular-construction",
  "stonemason-universal-perfect-foundation", "stonemason-universal-anchored-construction",
  "stonemason-specialty-1-enduring-monument", "stonemason-specialty-1-grand-foundation",
  "stonemason-specialty-1-civic-wonder", "stonemason-specialty-1-imperial-work",
  "stonemason-specialty-1-world-rooted-foundation",
]);
const CONSUMABLE_MARKS = new Set([
  "alchemy-universal-stable-formula", "alchemy-universal-refined-reagent",
  "alchemy-specialty-1-measured-dose", "alchemy-specialty-1-concentrated",
  "alchemy-specialty-1-rapid-infusion",
]);
export function markCategories(id, groups) {
  if (STRUCTURE_MARKS.has(id)) return ["structure"];
  if (CONSUMABLE_MARKS.has(id)) return ["consumable"];
  return groups.length ? ["item"] : ["project"];
}

// Only action costs explicitly provided by the source are represented here.
export const MARK_ACTIVATIONS = Object.freeze({
  ...Object.fromEntries([
    "blacksmithing-specialty-1-hellfire-channel", "blacksmithing-specialty-3-phase-mechanism",
    "blacksmithing-specialty-3-reality-engine", "enchanting-specialty-3-living-rune",
    "enchanting-specialty-2-living-essence", "leatherwork-specialty-3-legendary-pelt",
    "bookmaking-specialty-1-archmage-codex", "bookmaking-specialty-1-endless-grimoire",
    "tailoring-specialty-2-shadow-mantle", "tailoring-specialty-2-phase-veil",
    "tailoring-specialty-2-null-mantle", "tailoring-specialty-3-judicators-robes",
  ].map(id => [id, { type: "action", value: 1, note: "Wrathmaker ruling: activate with one action. Follow the source's frequency and duration." }])),
  ...Object.fromEntries([
    "blacksmithing-specialty-2-solar-ascension", "leatherwork-specialty-1-dragonheart-awakening",
    "weaving-specialty-1-aetherbound-form", "weaving-specialty-3-conquerors-standard",
    "weaving-specialty-3-sovereign-standard", "tailoring-specialty-3-sovereign-presence",
    "tailoring-specialty-3-coronation-regalia", "pottery-specialty-3-furnace-heart",
  ].map(id => [id, { type: "action", value: 2, note: "Wrathmaker ruling: activate with two actions. Follow the source's frequency and duration." }])),
  "enchanting-specialty-3-grand-glyph": { type: "action", value: 3, note: "Wrathmaker ruling: three actions to place the rune zone; choose its approved effect beforehand." },
  ...Object.fromEntries([
    "blacksmithing-specialty-1-soul-burned-steel", "blacksmithing-specialty-2-guardians-radiance",
    "enchanting-specialty-3-runic-feedback", "bookmaking-specialty-1-spell-echo",
  ].map(id => [id, { type: "reaction", value: null, note: "Wrathmaker ruling: spend your reaction when the trigger in the description occurs." }])),
  ...Object.fromEntries([
    "enchanting-specialty-1-overcharged-matrix", "leatherwork-specialty-3-predators-cloak",
    "carpentry-specialty-1-rapid-mechanism", "carpentry-specialty-3-serpent-carving",
    "weaving-specialty-1-ethereal-weave", "bookmaking-specialty-2-tactical-treatise",
    "bookmaking-universal-reference-tabs",
  ].map(id => [id, { type: "free", value: null, note: "Wrathmaker ruling: free action at the described trigger or immediately before the affected check. Frequency limits still apply." }])),
  "blacksmithing-specialty-2-martyrs-forge": { type: "reaction", value: null },
  "glassmaking-specialty-2-reflective-ward": { type: "reaction", value: null },
  "tailoring-specialty-1-reactive-weave": { type: "reaction", value: null },
  "alchemy-specialty-1-rapid-infusion": { type: "action", value: 1 },
  "leatherwork-specialty-2-chimera-binding": { type: "free", value: null, note: "Switch active property only. The combined-property activation has no specified action cost." },
});
