import assert from "node:assert/strict";
import test from "node:test";

import {
  categorizeCraftableItem,
  getCraftingRecipeKey,
  getCraftingResourceData,
  listCraftingCategories,
} from "../scripts/crafting-categories.js";

const MODULE_ID = "pf2e-crafting-material-tiers";

test("PF2e armor categories map to stable category-wide recipe ids", () => {
  for (const category of ["light", "medium", "heavy"]) {
    const result = categorizeCraftableItem({ type: "armor", system: { category } });
    assert.equal(result.id, `armor.${category}`);
    assert.equal(result.group, "armor");
    assert.equal(result.label, `${category[0].toUpperCase()}${category.slice(1)} Armor`);
  }

  assert.equal(categorizeCraftableItem({ type: "armor", system: { category: "unarmored" } }), null);
});

test("weapons, shields, and spell focuses have their own future recipe groups", () => {
  assert.equal(categorizeCraftableItem({ type: "weapon", system: { category: "simple" } }).id, "weapon.simple");
  assert.equal(categorizeCraftableItem({ type: "weapon", system: { category: "martial" } }).id, "weapon.martial");
  assert.equal(categorizeCraftableItem({ type: "weapon", system: { category: "advanced" } }).id, "weapon.advanced");
  assert.equal(categorizeCraftableItem({ type: "weapon", system: { category: "unarmed" } }), null);
  assert.equal(categorizeCraftableItem({ type: "shield", system: {} }).id, "shield");
  assert.equal(categorizeCraftableItem({
    type: "equipment",
    system: { traits: { otherTags: ["spell-focus"] } },
  }).id, "spell-focus");
  assert.equal(categorizeCraftableItem({ type: "equipment", system: { traits: { otherTags: [] } } }), null);
  assert.equal(listCraftingCategories().length, 8);
});

test("recipe keys combine the broad PF2e category with material and tier", () => {
  const armor = { type: "armor", system: { category: "heavy" } };
  assert.equal(
    getCraftingRecipeKey(armor, { materialId: "metal", tier: 4 }),
    "armor.heavy:metal:tier-4",
  );
  assert.equal(getCraftingRecipeKey(armor, { materialId: "", tier: 4 }), null);
  assert.equal(getCraftingRecipeKey(armor, { materialId: "metal", tier: 7 }), null);
});

test("resource flags normalize from plain sources and Foundry item documents", () => {
  const resource = {
    schemaVersion: 2,
    materialId: "metal",
    family: "metal",
    tier: 2,
    unit: "ingot",
    unitsPerItem: 1,
    variantId: "",
    bundleSize: 1,
    tags: ["metal"],
    nativeEffects: [],
    eligibleItemTags: ["weapon"],
    specialisationHooks: ["blacksmithing"],
    pricePerUnitGp: 15,
  };
  const expected = { ...resource, level: 4, baseDC: 19 };
  assert.deepEqual(getCraftingResourceData({ flags: { [MODULE_ID]: { resource } } }), expected);
  assert.deepEqual(getCraftingResourceData({ getFlag: () => resource }), expected);
  assert.equal(getCraftingResourceData({ flags: { [MODULE_ID]: { resource: { tier: 9 } } } }), null);
});
