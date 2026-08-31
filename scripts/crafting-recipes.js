import {
  CRAFTING_CATEGORIES,
  categorizeCraftableItem,
  getCraftingResourceData,
} from "./crafting-categories.js";
import {
  CRAFTING_DIFFICULTY_ADJUSTMENTS,
  calculateCraftingDC,
} from "./crafting-dc.js";

export const CRAFTING_RECIPE_SCHEMA_VERSION = 1;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export class CraftingRecipeValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CraftingRecipeValidationError";
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nonBlank(value, path) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new CraftingRecipeValidationError(`${path} cannot be blank.`);
  return text;
}

function slug(value, path) {
  const text = nonBlank(value, path).toLowerCase();
  if (!SLUG_PATTERN.test(text)) {
    throw new CraftingRecipeValidationError(`${path} must be a lowercase slug.`);
  }
  return text;
}

function positiveInteger(value, path) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new CraftingRecipeValidationError(`${path} must be a positive whole number.`);
  }
  return number;
}

function normalizeResourceOption(source, path, recipeTier) {
  if (!source || typeof source !== "object") {
    throw new CraftingRecipeValidationError(`${path} must be an object.`);
  }
  const tier = positiveInteger(source.tier ?? recipeTier, `${path}.tier`);
  if (tier < 1 || tier > 6) throw new CraftingRecipeValidationError(`${path}.tier must be from 1 to 6.`);
  if (tier !== recipeTier) {
    throw new CraftingRecipeValidationError(`${path}.tier must match the recipe tier.`);
  }

  return {
    kind: "resource",
    materialId: slug(source.materialId, `${path}.materialId`),
    tier,
    variantId: typeof source.variantId === "string" ? source.variantId.trim().toLowerCase() : "",
    units: positiveInteger(source.units, `${path}.units`),
  };
}

function normalizeIngredientSets(source, recipeTier) {
  if (!Array.isArray(source) || source.length === 0) {
    throw new CraftingRecipeValidationError("ingredientSets must contain at least one set.");
  }

  return source.map((set, setIndex) => {
    const setPath = `ingredientSets[${setIndex}]`;
    if (!set || typeof set !== "object") throw new CraftingRecipeValidationError(`${setPath} must be an object.`);
    if (!Array.isArray(set.groups) || set.groups.length === 0) {
      throw new CraftingRecipeValidationError(`${setPath}.groups must contain at least one group.`);
    }

    return {
      id: slug(set.id ?? `set-${setIndex + 1}`, `${setPath}.id`),
      label: nonBlank(set.label ?? `Option ${setIndex + 1}`, `${setPath}.label`),
      groups: set.groups.map((group, groupIndex) => {
        const groupPath = `${setPath}.groups[${groupIndex}]`;
        if (!group || typeof group !== "object") {
          throw new CraftingRecipeValidationError(`${groupPath} must be an object.`);
        }
        if (!Array.isArray(group.options) || group.options.length === 0) {
          throw new CraftingRecipeValidationError(`${groupPath}.options must contain at least one option.`);
        }
        return {
          id: slug(group.id ?? `group-${groupIndex + 1}`, `${groupPath}.id`),
          label: nonBlank(group.label ?? `Requirement ${groupIndex + 1}`, `${groupPath}.label`),
          options: group.options.map((option, optionIndex) => (
            normalizeResourceOption(option, `${groupPath}.options[${optionIndex}]`, recipeTier)
          )),
        };
      }),
    };
  });
}

export function normalizeCraftingRecipe(source) {
  if (!source || typeof source !== "object") {
    throw new CraftingRecipeValidationError("A recipe must be an object.");
  }
  const categoryId = nonBlank(source.categoryId, "categoryId");
  if (!Object.hasOwn(CRAFTING_CATEGORIES, categoryId)) {
    throw new CraftingRecipeValidationError(`categoryId \"${categoryId}\" is not a supported crafting category.`);
  }
  const tier = positiveInteger(source.tier, "tier");
  if (tier < 1 || tier > 6) throw new CraftingRecipeValidationError("tier must be from 1 to 6.");
  const adjustment = Object.hasOwn(CRAFTING_DIFFICULTY_ADJUSTMENTS, source.check?.adjustment)
    ? source.check.adjustment
    : "normal";

  return {
    schemaVersion: CRAFTING_RECIPE_SCHEMA_VERSION,
    id: slug(source.id, "id"),
    name: nonBlank(source.name, "name"),
    description: typeof source.description === "string" ? source.description : "",
    enabled: source.enabled === true,
    categoryId,
    tier,
    ingredientSets: normalizeIngredientSets(source.ingredientSets, tier),
    toolUuids: Array.isArray(source.toolUuids)
      ? [...new Set(source.toolUuids.map((uuid, index) => nonBlank(uuid, `toolUuids[${index}]`)))]
      : [],
    check: {
      mode: "tier-dc",
      adjustment,
    },
    result: {
      mode: "selected-item",
      quantity: positiveInteger(source.result?.quantity ?? 1, "result.quantity"),
    },
  };
}

function resourceKey({ materialId, tier, variantId = "" }) {
  return `${materialId}|${tier}|${variantId}`;
}

export function summarizeCraftingResources(items) {
  const summary = new Map();
  for (const item of Array.from(items ?? [])) {
    const resource = getCraftingResourceData(item);
    if (!resource) continue;
    const quantity = Math.max(0, Math.trunc(Number(item.system?.quantity ?? item.quantity ?? 0) || 0));
    if (quantity === 0) continue;
    const key = resourceKey(resource);
    const entry = summary.get(key) ?? {
      materialId: resource.materialId,
      tier: resource.tier,
      variantId: resource.variantId,
      unit: resource.unit,
      units: 0,
      stacks: [],
    };
    const units = quantity * resource.unitsPerItem;
    entry.units += units;
    entry.stacks.push({
      itemId: item.id ?? item._id ?? "",
      quantity,
      units,
    });
    summary.set(key, entry);
  }
  return [...summary.values()].map((entry) => clone(entry));
}

function inventoryMap(items) {
  return new Map(summarizeCraftingResources(items).map((entry) => [resourceKey(entry), entry.units]));
}

function allocateGroups(groups, groupIndex, remaining, choices) {
  if (groupIndex >= groups.length) return { remaining, choices };
  const group = groups[groupIndex];
  for (const option of group.options) {
    const key = resourceKey(option);
    const owned = remaining.get(key) ?? 0;
    if (owned < option.units) continue;
    const next = new Map(remaining);
    next.set(key, owned - option.units);
    const result = allocateGroups(groups, groupIndex + 1, next, [
      ...choices,
      { groupId: group.id, ...clone(option) },
    ]);
    if (result) return result;
  }
  return null;
}

function describeSet(set, inventory) {
  return {
    id: set.id,
    label: set.label,
    groups: set.groups.map((group) => ({
      id: group.id,
      label: group.label,
      options: group.options.map((option) => {
        const owned = inventory.get(resourceKey(option)) ?? 0;
        return {
          ...clone(option),
          owned,
          missing: Math.max(0, option.units - owned),
          available: owned >= option.units,
        };
      }),
    })),
  };
}

/**
 * Preview a craft without changing any Item. Inventory is allocated across all
 * AND groups, including alternative OR options, so one stack is never counted
 * twice. Consumption and item creation belong to the later GM-authoritative
 * transaction layer.
 */
export function evaluateCraftingRecipe(source, { targetItem, inventoryItems = [] } = {}) {
  const recipe = normalizeCraftingRecipe(source);
  const targetCategory = categorizeCraftableItem(targetItem);
  const targetMatches = targetCategory?.id === recipe.categoryId;
  const inventory = inventoryMap(inventoryItems);
  let allocation = null;
  let selectedSet = null;
  for (const set of recipe.ingredientSets) {
    const possible = allocateGroups(set.groups, 0, new Map(inventory), []);
    if (possible) {
      allocation = possible.choices;
      selectedSet = { id: set.id, label: set.label };
      break;
    }
  }

  return {
    recipe,
    targetCategory,
    targetMatches,
    enabled: recipe.enabled,
    craftable: recipe.enabled && targetMatches && allocation !== null,
    check: calculateCraftingDC(recipe.tier, recipe.check.adjustment),
    selectedSet,
    allocation: allocation ?? [],
    ingredientSets: recipe.ingredientSets.map((set) => describeSet(set, inventory)),
  };
}
