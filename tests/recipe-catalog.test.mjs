import assert from "node:assert/strict";
import test from "node:test";

import { CRAFTING_RECIPE_BANDS } from "../content/crafting-recipes.js";
import {
  buildCraftingRecipeFromBand,
  compatibleRecipeBands,
  defaultProjectProgress,
} from "../scripts/recipe-catalog.js";

const sword = {
  type: "weapon",
  system: { category: "martial", group: "sword", traits: { otherTags: [] } },
};

test("recipe catalogue covers supported weapons, armor, shields, and spell focuses", () => {
  assert.equal(CRAFTING_RECIPE_BANDS.length >= 35, true);
  assert.equal(CRAFTING_RECIPE_BANDS.some((entry) => entry.id === "weapon-sword"), true);
  assert.equal(CRAFTING_RECIPE_BANDS.some((entry) => entry.id === "armor-full-plate"), true);
  assert.equal(CRAFTING_RECIPE_BANDS.some((entry) => entry.id === "shield-standard"), true);
  assert.equal(CRAFTING_RECIPE_BANDS.some((entry) => entry.id === "focus-staff"), true);
});

test("a broad recipe becomes a tier-specific recipe for the dropped PF2e item", () => {
  const recipe = buildCraftingRecipeFromBand("weapon-sword", {
    targetItem: sword,
    tier: 4,
    coreMaterialId: "metal",
  });
  assert.equal(recipe.categoryId, "weapon.martial");
  assert.equal(recipe.tier, 4);
  assert.equal(recipe.ingredientSets[0].groups[0].options[0].units, 3);
  assert.equal(recipe.ingredientSets[0].groups[0].options[0].tierMode, "exact");
  assert.equal(recipe.ingredientSets[0].groups[1].options[0].tierMode, "minimum");
  assert.equal(recipe.ingredientSets[0].groups[1].options[0].tier, 2);
  assert.equal(defaultProjectProgress(recipe), 4);
});

test("compatible recipe selection follows the actual PF2e item category", () => {
  assert.equal(compatibleRecipeBands(sword).some((entry) => entry.id === "weapon-sword"), true);
  assert.equal(compatibleRecipeBands(sword).some((entry) => entry.id === "armor-full-plate"), false);
  assert.throws(() => buildCraftingRecipeFromBand("armor-full-plate", {
    targetItem: sword,
    tier: 2,
    coreMaterialId: "metal",
  }), /not compatible/iu);
});
