import test from "node:test";
import assert from "node:assert/strict";
import { MARK_REVISIONS } from "../content/mark-revisions.js";
import { getArtisanMarkDefinition } from "../content/artisan-marks.js";
import { rulesForArtisanMark, buildArtisanMarkRules } from "../scripts/artisan-mark-effects.js";
import { normalizeCraftingState } from "../scripts/crafting-model.js";
const moduleId = "pf2e-crafting-material-tiers";

test("all eighteen revised Marks have distinct descriptions and explicit numerical adapters", () => {
  assert.equal(Object.keys(MARK_REVISIONS).length, 18);
  assert.equal(new Set(Object.values(MARK_REVISIONS).map(mark => mark.effectSummary)).size, 18);
  for (const [id, revision] of Object.entries(MARK_REVISIONS)) {
    const definition = getArtisanMarkDefinition(id);
    assert.equal(definition.name, revision.name);
    for (const tier of [1, 4, 6]) {
      const item = { id: "gear", type: revision.validItemGroups[0], system: {}, flags: { [moduleId]: { crafting: { core: { tier } } } } };
      const rules = rulesForArtisanMark({ definitionId: id }, item);
      assert.ok(rules.length > 0, id);
      for (const rule of rules.filter(rule => rule.key === "FlatModifier")) assert.equal(rule.type, "untyped", id);
    }
  }
});
test("revised Marks preserve provenance and replace obsolete snapshot rules text", () => {
  const id = "leatherwork-universal-reinforced-hide";
  const result = normalizeCraftingState({ artisanMarks: [{ definitionId: id, name: "Reinforced Hide", grade: "standard", effectSummary: "old durability", maker: { name: "Alice" }, status: "completed" }] });
  assert.equal(result.artisanMarks[0].name, "Tanner's Acid Ward");
  assert.equal(result.artisanMarks[0].maker.name, "Alice");
  assert.match(result.artisanMarks[0].effectSummary, /acid resistance/);
});
test("execution precision damage uses an item-scoped condition toggle and scales at Tier six", () => {
  const id = "blacksmithing-specialty-1-perfected-killing-edge";
  const item = { id: "blade", type: "weapon", actor: {}, isEquipped: true, flags: { [moduleId]: { crafting: { core: { tier: 6 }, artisanMarks: [{ definitionId: id, name: "Executioner's Ember", status: "completed" }] } } } };
  const rules = buildArtisanMarkRules(item);
  assert.equal(rules[0].key, "RollOption");
  assert.equal(rules[1].diceNumber, 3);
  assert.equal(rules[1].category, "precision");
  assert.deepEqual(rules[1].predicate, [`wrathmaker:mark-condition:blade:${id}`]);
});
