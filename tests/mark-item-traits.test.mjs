import test from "node:test";
import assert from "node:assert/strict";
import { ARTISAN_MARK_DEFINITIONS as marks, getArtisanMarkDefinition as get } from "../content/artisan-marks.js";
import { markAppliesToItem } from "../scripts/artisan-mark-effects.js";
test("all Marks have explicit readable applicability traits", () => {
  for (const mark of marks) {
    assert.ok(mark.itemTraits.length, mark.id);
    assert.equal(mark.itemTraits.length, mark.itemTraitLabels.length);
    assert.ok(!mark.itemTraitLabels.includes("item"));
  }
});
test("shield offers durability and universal Marks but not weapon or wearer-armor-only effects", () => {
  const shield = { type: "shield", system: {} };
  for (const id of ["blacksmithing-universal-fortified-frame", "pottery-specialty-1-ceramic-plate", "enchanting-universal-stable-matrix"]) {
    assert.equal(markAppliesToItem(get(id), "shield", shield), true, id);
  }
  for (const id of ["carpentry-specialty-1-warbow-overdraw", "tailoring-specialty-1-vital-reinforcement", "glassmaking-specialty-3-arcane-conductor"]) {
    assert.equal(markAppliesToItem(get(id), "shield", shield), false, id);
  }
});
test("profession Universal does not mean compatible with every item", () => {
  const mark = get("blacksmithing-universal-tempered-construction");
  assert.equal(mark.specializationId, "");
  assert.deepEqual(mark.itemTraitLabels, ["Armor", "Shield"]);
  assert.equal(markAppliesToItem(mark, "weapon", { system: {} }), false);
  assert.deepEqual(get("enchanting-universal-stable-matrix").itemTraits, ["universal"]);
});
test("all tagged ranged Marks reject melee weapons, not only prose mentioning range increments", () => {
  for (const mark of marks.filter(m => m.itemTraits.includes("ranged"))) {
    assert.equal(markAppliesToItem(mark, "weapon", { system: { range: null } }), false, mark.id);
    assert.equal(markAppliesToItem(mark, "weapon", { system: { range: 60 } }), true, mark.id);
  }
});
test("structure and project traits never enter equipment selection", () => {
  for (const mark of marks.filter(m => m.itemTraits.some(t => ["structure", "project"].includes(t)))) {
    for (const group of ["weapon", "armor", "shield", "spellFocus"]) assert.equal(markAppliesToItem(mark, group), false, mark.id);
  }
});
