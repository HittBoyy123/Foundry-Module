import { MODULE_ID } from "./constants.js";
import { calculateCraftingDC } from "./crafting-dc.js";

export const CRAFTING_CATEGORY_SCHEMA_VERSION = 1;
export const CRAFTING_RESOURCE_SCHEMA_VERSION = 1;

const CATEGORY_LIST = Object.freeze([
  Object.freeze({ id: "armor.light", group: "armor", itemType: "armor", pf2eCategory: "light", label: "Light Armor" }),
  Object.freeze({ id: "armor.medium", group: "armor", itemType: "armor", pf2eCategory: "medium", label: "Medium Armor" }),
  Object.freeze({ id: "armor.heavy", group: "armor", itemType: "armor", pf2eCategory: "heavy", label: "Heavy Armor" }),
  Object.freeze({ id: "weapon.simple", group: "weapon", itemType: "weapon", pf2eCategory: "simple", label: "Simple Weapon" }),
  Object.freeze({ id: "weapon.martial", group: "weapon", itemType: "weapon", pf2eCategory: "martial", label: "Martial Weapon" }),
  Object.freeze({ id: "weapon.advanced", group: "weapon", itemType: "weapon", pf2eCategory: "advanced", label: "Advanced Weapon" }),
  Object.freeze({ id: "shield", group: "shield", itemType: "shield", pf2eCategory: null, label: "Shield" }),
  Object.freeze({ id: "spell-focus", group: "spellFocus", itemType: "equipment", pf2eCategory: null, label: "Spell Focus" }),
]);

export const CRAFTING_CATEGORIES = Object.freeze(Object.fromEntries(
  CATEGORY_LIST.map((category) => [category.id, category]),
));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function itemOtherTags(item) {
  const tags = item?.system?.traits?.otherTags;
  return Array.isArray(tags) ? tags : [];
}

/**
 * Return the stable Wrathmaker cost category for a PF2e physical item.
 * These ids intentionally describe broad recipe groups rather than individual
 * base items, allowing one future cost entry to cover every item in a group.
 */
export function categorizeCraftableItem(item) {
  if (!item || typeof item !== "object") return null;

  if (item.type === "armor") {
    return clone(CRAFTING_CATEGORIES[`armor.${item.system?.category ?? ""}`] ?? null);
  }

  if (item.type === "weapon") {
    return clone(CRAFTING_CATEGORIES[`weapon.${item.system?.category ?? ""}`] ?? null);
  }

  if (item.type === "shield") return clone(CRAFTING_CATEGORIES.shield);

  if (item.type === "equipment" && itemOtherTags(item).includes("spell-focus")) {
    return clone(CRAFTING_CATEGORIES["spell-focus"]);
  }

  return null;
}

export function listCraftingCategories() {
  return clone(CATEGORY_LIST);
}

export function getCraftingResourceData(item) {
  if (!item || typeof item !== "object") return null;
  const source = typeof item.getFlag === "function"
    ? item.getFlag(MODULE_ID, "resource")
    : item.flags?.[MODULE_ID]?.resource;
  if (!source || typeof source !== "object") return null;

  const materialId = typeof source.materialId === "string" ? source.materialId.trim() : "";
  const tier = Number(source.tier);
  const unitsPerItem = Number(source.unitsPerItem);
  if (!materialId || !Number.isInteger(tier) || tier < 1 || tier > 6) return null;
  if (!Number.isInteger(unitsPerItem) || unitsPerItem < 1) return null;
  const craftingDC = calculateCraftingDC(tier);

  return {
    schemaVersion: CRAFTING_RESOURCE_SCHEMA_VERSION,
    materialId,
    tier,
    unit: typeof source.unit === "string" ? source.unit : "resource",
    unitsPerItem,
    variantId: typeof source.variantId === "string" ? source.variantId : "",
    level: craftingDC.level,
    baseDC: craftingDC.baseDC,
  };
}

export function getCraftingRecipeKey(item, { materialId, tier } = {}) {
  const category = categorizeCraftableItem(item);
  const normalizedMaterial = typeof materialId === "string" ? materialId.trim() : "";
  const normalizedTier = Number(tier);
  if (!category || !normalizedMaterial || !Number.isInteger(normalizedTier) || normalizedTier < 1 || normalizedTier > 6) {
    return null;
  }
  return `${category.id}:${normalizedMaterial}:tier-${normalizedTier}`;
}
