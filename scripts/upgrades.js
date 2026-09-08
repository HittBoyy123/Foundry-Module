import { MODULE_ID } from "./constants.js";
import { normalizeCraftingRecipe } from "./crafting-recipes.js";
import { getArtisanMarkDefinition, assertSingleFreeMark } from "../content/artisan-marks.js";
import { buildRecipeAnchorSlots, evaluateArtisanMarkChoice, calculateMarkLabourDays } from "./artisan-marks.js";

export function upgradeSnapshot(item) {
  const source = structuredClone(item.toObject ? item.toObject() : item);
  delete source._stats;
  if (source.flags?.[MODULE_ID]) delete source.flags[MODULE_ID].upgradeProject;
  return JSON.stringify(source);
}

export function validateUpgradeItem(item, projects = []) {
  if (!item || item.pack || !item.flags?.[MODULE_ID]?.crafting?.core?.materialId)
    throw new Error("Drop an existing Wrathmaker-crafted world item.");
  if (Number(item.system?.quantity) !== 1) throw new Error("Split the item stack before upgrading.");
  if (item.flags[MODULE_ID].upgradeProject) throw new Error("This item already has an upgrade project.");
  if (["held", "worn"].includes(item.system?.equipped?.carryType) || item.system?.equipped?.invested)
    throw new Error("Stow and uninvest the item before starting its upgrade.");
  if (!item.isOwner) throw new Error("You must own this item to upgrade it.");
  if (projects.some(p => p.upgrade && p.baseItemUuid === item.uuid && !["completed", "cancelled"].includes(p.status)))
    throw new Error("This item already has an upgrade project.");
}

export function retainedUpgradeMarks(item, recipe, itemGroup, coreTier, rearrangement = null) {
  const marks = structuredClone(item.flags?.[MODULE_ID]?.crafting?.artisanMarks ?? []);
  const anchors = buildRecipeAnchorSlots(recipe);
  const result = [];
  for (const mark of marks) {
    if (rearrangement?.definitionId === mark.definitionId) mark.anchorSlotIds = [rearrangement.anchorId];
    const definition = getArtisanMarkDefinition(mark.definitionId);
    if (!definition) throw new Error("An existing Mark is unknown; ask the GM to resolve it before upgrading.");
    const check = evaluateArtisanMarkChoice(definition, {
      itemGroup, coreTier, anchorSlots: anchors, targetItem: item,
      capacityUsed: result.reduce((n, m) => n + m.capacityCost, 0),
      selectedDefinitionIds: result.map(m => m.definitionId),
      selectedStackGroups: result.map(m => m.stackGroup).filter(Boolean),
    });
    if (!check.eligible || !mark.anchorSlotIds.every(id => check.anchors.some(a => a.id === id)))
      throw new Error(mark.name + ": the upgraded materials must retain a compatible anchor. " + (check.reason || ""));
    result.push(mark);
  }
  assertSingleFreeMark(result);
  return result;
}

export function selectUpgradeComponentTiers(recipe, tiers = {}) {
  for (const group of recipe.ingredientSets[0].groups) {
    if (group.id === "core" || !tiers[group.id]) continue;
    for (const option of group.options) {
      option.tier = Math.max(option.tier, Math.min(recipe.tier, Number(tiers[group.id])));
      option.maximumTier = option.tier;
      option.tierMode = "minimum";
    }
  }
}

/** Discount only replaced chassis components, never newly purchased Marks. */
export function buildUpgradePlan(item, fullRecipe, newMarks = [], dragonScale = null) {
  const crafting = item.flags[MODULE_ID].crafting;
  const recipe = structuredClone(fullRecipe);
  const coreMaterial = recipe.ingredientSets[0].groups[0].options[0].materialId;
  if (item.flags[MODULE_ID].dragonScale?.color && !["metal", "leather"].includes(coreMaterial))
    throw new Error("Retained dragon scales require Metal or Leather armor.");
  if (dragonScale?.color) {
    if (item.type !== "armor" || !["metal", "leather"].includes(recipe.ingredientSets[0].groups[0].options[0].materialId))
      throw new Error("Dragon scales require Metal or Leather armor.");
    const tier = Math.min(6, Math.max(1, Number(dragonScale.tier) || recipe.tier));
    const previous = item.flags[MODULE_ID].dragonScale ?? {};
    if (previous.color !== dragonScale.color || previous.tier !== tier) {
      recipe.ingredientSets[0].groups.push({ id: "dragon-scale", label: "Dragon Scale enhancement",
        options: [{ materialId: "dragon-scale", tier, tierMode: "minimum", maximumTier: tier,
          variantId: dragonScale.color, units: Math.max(1, previous.unitsCommitted || 1) }] });
    }
  }
  const replaced = [];
  let fullWork = 0;
  for (const set of recipe.ingredientSets) {
    set.groups = set.groups.filter(group => {
      if (group.id.startsWith("mark-")) return true;
      const old = group.id === "core" ? crafting.core
        : crafting.components?.find(c => (c.slotType || c.id) === group.id);
      if (old && group.options.some(o => o.materialId === old.materialId &&
        old.tier >= o.tier && old.tier <= o.maximumTier)) return false;
      replaced.push(group.id);
      fullWork += Math.min(...group.options.map(o => o.units));
      for (const option of group.options) option.units = Math.max(1, Math.ceil(option.units * 0.75));
      return true;
    });
  }
  if (!recipe.ingredientSets[0].groups.length) throw new Error("Choose a material improvement or add a new Mark.");
  if (recipe.tier < crafting.core.tier) throw new Error("Upgrades cannot lower the core tier.");
  return {
    recipe: normalizeCraftingRecipe(recipe), replaced,
    requiredProgress: Math.max(1, Math.ceil(fullWork * 0.75) + calculateMarkLabourDays(newMarks, recipe.tier)),
    originalSnapshot: upgradeSnapshot(item),
    dragonScale,
  };
}

export function retainedMaterialHistory(item, replaced) {
  const crafting = item.flags[MODULE_ID].crafting;
  return [{ ...crafting.core, id: "core", slotType: "core" }, ...(crafting.components ?? [])]
    .filter(c => !replaced.includes(c.slotType || c.id) && c.quantityCommitted > 0)
    .map((c, index) => ({
      id: "retained-" + index, groupId: c.slotType || c.id, groupLabel: c.name || "Retained component",
      itemId: "", itemUuid: "", itemName: c.resourceName || c.name || c.materialId,
      materialId: c.materialId, tier: c.tier, variantId: c.variantId || "",
      quantity: c.quantityCommitted, units: c.quantityCommitted, unitsPerItem: 1, state: "consumed",
    }));
}
