import assert from "node:assert/strict";
import test from "node:test";
import { buildCraftingRecipeFromBand, compatibleRecipeBands } from "../scripts/recipe-catalog.js";

const equipment = { type: "equipment", system: { traits: { value: ["magical", "apex"] } } };
test("magical accessories and books receive a mandatory mana ingredient without mutating their source", () => {
  const before = JSON.stringify(equipment);
  assert.ok(compatibleRecipeBands(equipment).some(b => b.id === "equipment-book"));
  const recipe = buildCraftingRecipeFromBand("equipment-jewellery", { targetItem: equipment, tier: 3 });
  const mana = recipe.ingredientSets[0].groups.find(g => g.id === "magic-catalyst");
  assert.equal(mana.options[0].materialId, "mana-crystals");
  assert.equal(mana.options[0].tier, 3);
  assert.equal(JSON.stringify(equipment), before);
});
test("existing focus catalyst is not charged twice and mundane equipment needs none", () => {
  const focus = { type: "equipment", system: { traits: { value: ["magical"], otherTags: ["spell-focus"] } } };
  const recipe = buildCraftingRecipeFromBand("focus-staff", { targetItem: focus });
  assert.equal(recipe.ingredientSets[0].groups.filter(g => g.options.every(o => o.materialId === "mana-crystals")).length, 1);
  const mundane = buildCraftingRecipeFromBand("equipment-book", { targetItem: { type: "equipment" } });
  assert.ok(!mundane.ingredientSets[0].groups.some(g => g.id === "magic-catalyst"));
});
