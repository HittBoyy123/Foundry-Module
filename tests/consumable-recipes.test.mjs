import test from "node:test";
import assert from "node:assert/strict";
import { compatibleRecipeBands, buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { createCraftingProject, reserveCraftingProject } from "../scripts/crafting-projects.js";
import { buildCompletedItemSource } from "../scripts/workbench.js";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
const MODULE = "pf2e-crafting-material-tiers";
for (const category of ["potion", "oil", "elixir"]) test(`${category}: single-dose recipe, reservation and unchanged native effects`, () => {
  const target = { type: "consumable", name: "Test dose", system: { category, quantity: 8, traits: { value: category === "elixir" ? ["alchemical"] : ["magical"] }, uses: { value: 1, max: 1, autoDestroy: true }, description: { value: "@Damage[1d6[healing]]" }, rules: [], damage: { formula: "1d6", type: "healing" } } };
  const snapshot = structuredClone(target);
  const bands = compatibleRecipeBands(target);
  assert.deepEqual(bands.map(b => b.id), [`consumable-${category}`]);
  const recipe = buildCraftingRecipeFromBand(bands[0].id, { targetItem: target });
  assert.equal(recipe.result.quantity, 1);
  assert.equal(recipe.ingredientSets[0].groups.some(g => g.id === "magic-catalyst"), category !== "elixir");
  const inventoryItems = ["herbs", "stone", "mana-crystals"].map((materialId, i) => ({ id: String(i), name: materialId, system: { quantity: 10 }, flags: { [MODULE]: { resource: { materialId, tier: 1, unitsPerItem: 1 } } } }));
  const project = reserveCraftingProject(createCraftingProject({ recipe, coreMaterialId: "herbs", coreTier: 1 }), { inventoryItems });
  assert.equal(project.status, "reserved");
  const result = buildCompletedItemSource(project, target, cloneDefaultRulesConfig());
  assert.deepEqual(result.system, { ...snapshot.system, quantity: 1 });
  assert.deepEqual(target, snapshot);
});
test("other consumable categories remain excluded", () => {
  assert.deepEqual(compatibleRecipeBands({ type: "consumable", system: { category: "poison" } }), []);
});
