import assert from "node:assert/strict";
import test from "node:test";

import {
  CraftingRecipeValidationError,
  evaluateCraftingRecipe,
  normalizeCraftingRecipe,
  summarizeCraftingResources,
} from "../scripts/crafting-recipes.js";

const MODULE_ID = "pf2e-crafting-material-tiers";

function resourceItem({ id, materialId, tier, quantity, unitsPerItem = 1, variantId = "" }) {
  return {
    _id: id,
    type: "treasure",
    system: { quantity },
    flags: {
      [MODULE_ID]: {
        resource: {
          schemaVersion: 1,
          materialId,
          tier,
          unit: materialId === "metal" ? "ingot" : "resource",
          unitsPerItem,
          variantId,
        },
      },
    },
  };
}

function heavyArmorRecipe(overrides = {}) {
  return {
    id: "steel-heavy-armor-tier-2",
    name: "Tier 2 Heavy Armor",
    enabled: true,
    categoryId: "armor.heavy",
    tier: 2,
    ingredientSets: [{
      id: "forged-set",
      label: "Forged armor",
      groups: [
        {
          id: "plates",
          label: "Armor plates",
          options: [{ materialId: "metal", tier: 2, units: 6 }],
        },
        {
          id: "lining",
          label: "Lining",
          options: [
            { materialId: "leather", tier: 2, units: 2 },
            { materialId: "wood", tier: 2, units: 2 },
          ],
        },
      ],
    }],
    check: { adjustment: "hard" },
    result: { quantity: 1 },
    ...overrides,
  };
}

test("category recipes normalize into independent ingredient sets, groups, and alternatives", () => {
  const recipe = normalizeCraftingRecipe(heavyArmorRecipe());
  assert.equal(recipe.schemaVersion, 1);
  assert.equal(recipe.categoryId, "armor.heavy");
  assert.equal(recipe.result.mode, "selected-item");
  assert.equal(recipe.ingredientSets.length, 1);
  assert.equal(recipe.ingredientSets[0].groups.length, 2);
  assert.equal(recipe.ingredientSets[0].groups[1].options.length, 2);
  assert.equal(recipe.check.adjustment, "hard");
});

test("resource summaries use module flags and bundle sizes rather than displayed names", () => {
  const summary = summarizeCraftingResources([
    resourceItem({ id: "scale-a", materialId: "dragon-scale", tier: 4, quantity: 2, unitsPerItem: 5, variantId: "red" }),
    resourceItem({ id: "scale-b", materialId: "dragon-scale", tier: 4, quantity: 1, unitsPerItem: 5, variantId: "red" }),
    { _id: "ordinary-treasure", type: "treasure", system: { quantity: 99 }, flags: {} },
  ]);

  assert.equal(summary.length, 1);
  assert.equal(summary[0].materialId, "dragon-scale");
  assert.equal(summary[0].variantId, "red");
  assert.equal(summary[0].units, 15);
  assert.equal(summary[0].stacks.length, 2);
});

test("craftability validates target category, ingredients, and tier DC without mutating inventory", () => {
  const inventory = [
    resourceItem({ id: "steel", materialId: "metal", tier: 2, quantity: 6 }),
    resourceItem({ id: "hardwood", materialId: "wood", tier: 2, quantity: 2 }),
  ];
  const before = JSON.stringify(inventory);
  const result = evaluateCraftingRecipe(heavyArmorRecipe(), {
    targetItem: { type: "armor", system: { category: "heavy" } },
    inventoryItems: inventory,
  });

  assert.equal(result.targetMatches, true);
  assert.equal(result.craftable, true);
  assert.equal(result.selectedSet.id, "forged-set");
  assert.deepEqual(result.allocation.map((entry) => entry.materialId), ["metal", "wood"]);
  assert.equal(result.check.baseDC, 19);
  assert.equal(result.check.modifier, 2);
  assert.equal(result.check.dc, 21);
  assert.equal(JSON.stringify(inventory), before);

  const wrongTarget = evaluateCraftingRecipe(heavyArmorRecipe(), {
    targetItem: { type: "armor", system: { category: "light" } },
    inventoryItems: inventory,
  });
  assert.equal(wrongTarget.targetMatches, false);
  assert.equal(wrongTarget.craftable, false);
});

test("one resource stack cannot satisfy two AND groups at the same time", () => {
  const duplicateGroups = heavyArmorRecipe({
    ingredientSets: [{
      id: "double-metal",
      label: "Double metal",
      groups: [
        { id: "first", label: "First", options: [{ materialId: "metal", tier: 2, units: 4 }] },
        { id: "second", label: "Second", options: [{ materialId: "metal", tier: 2, units: 4 }] },
      ],
    }],
  });
  const result = evaluateCraftingRecipe(duplicateGroups, {
    targetItem: { type: "armor", system: { category: "heavy" } },
    inventoryItems: [resourceItem({ id: "steel", materialId: "metal", tier: 2, quantity: 6 })],
  });
  assert.equal(result.craftable, false);
  assert.deepEqual(result.allocation, []);
});

test("required structural components can use one material tier from Core Tier minus two through Core Tier", () => {
  const recipe = heavyArmorRecipe({
    tier: 4,
    ingredientSets: [{
      id: "mixed-tier",
      label: "Mixed tier armor",
      groups: [
        { id: "core", label: "Core", options: [{ materialId: "metal", tier: 4, units: 6 }] },
        {
          id: "lining",
          label: "Lining",
          options: [{ materialId: "leather", tier: 2, tierMode: "minimum", maximumTier: 4, units: 2 }],
        },
      ],
    }],
  });
  const result = evaluateCraftingRecipe(recipe, {
    targetItem: { type: "armor", system: { category: "heavy" } },
    inventoryItems: [
      resourceItem({ id: "mithril", materialId: "metal", tier: 4, quantity: 6 }),
      resourceItem({ id: "ironhide", materialId: "leather", tier: 3, quantity: 2 }),
    ],
  });
  assert.equal(result.craftable, true);
  assert.equal(result.allocation[1].allocations[0].tier, 3);
});

test("invalid or incomplete recipes are rejected before players can use them", () => {
  assert.throws(
    () => normalizeCraftingRecipe(heavyArmorRecipe({ categoryId: "armor.powered" })),
    CraftingRecipeValidationError,
  );
  assert.throws(
    () => normalizeCraftingRecipe(heavyArmorRecipe({ ingredientSets: [] })),
    /at least one set/iu,
  );
  assert.throws(
    () => normalizeCraftingRecipe(heavyArmorRecipe({ tier: 7 })),
    /from 1 to 6/iu,
  );
});
