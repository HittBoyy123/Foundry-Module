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
  "blacksmithing-specialty-2-martyrs-forge": { type: "reaction", value: null },
  "glassmaking-specialty-2-reflective-ward": { type: "reaction", value: null },
  "tailoring-specialty-1-reactive-weave": { type: "reaction", value: null },
  "alchemy-specialty-1-rapid-infusion": { type: "action", value: 1 },
  "leatherwork-specialty-2-chimera-binding": { type: "free", value: null, note: "Switch active property only. The combined-property activation has no specified action cost." },
});
