import { getCraftingRecipeBand, listCraftingRecipeBands } from "../content/crafting-recipes.js";
import { categorizeCraftableItem } from "./crafting-categories.js";
import { normalizeCraftingRecipe } from "./crafting-recipes.js";

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

export { getCraftingRecipeBand, listCraftingRecipeBands };

export function compatibleRecipeBands(targetItem) {
  const category = categorizeCraftableItem(targetItem);
  if (!category) return [];
  const compatible = listCraftingRecipeBands().filter((band) => band.categoryIds.includes(category.id));
  if (category.group !== "weapon") return compatible;
  const group = slug(targetItem.system?.group);
  if (!group) return compatible;
  const exact = compatible.filter((band) => band.id === `weapon-${group}`);
  return exact.length ? exact : compatible;
}

export function buildCraftingRecipeFromBand(bandId, {
  targetItem,
  tier = 1,
  coreMaterialId = "",
} = {}) {
  const band = getCraftingRecipeBand(bandId);
  if (!band) throw new Error("Choose a valid Wrathmaker recipe.");
  const category = categorizeCraftableItem(targetItem);
  if (!category || !compatibleRecipeBands(targetItem).some((entry) => entry.id === band.id)) {
    throw new Error(`${band.label} is not compatible with this base item.`);
  }
  const coreTier = Math.min(6, Math.max(1, Math.trunc(Number(tier) || 1)));
  const materialId = band.coreMaterialIds.includes(coreMaterialId)
    ? coreMaterialId
    : band.coreMaterialIds[0];
  const structuralFloor = Math.max(1, coreTier - 2);
  const groups = [{
    id: "core",
    label: `${band.label} Core`,
    options: [{
      materialId,
      tier: coreTier,
      tierMode: "exact",
      units: band.coreUnits,
    }],
  }];

  for (const component of band.secondaries) {
    if (component.optional) continue;
    groups.push({
      id: slug(component.id),
      label: component.label,
      options: component.materialIds.map((secondaryMaterialId) => ({
        materialId: secondaryMaterialId,
        tier: structuralFloor,
        tierMode: "minimum",
        maximumTier: coreTier,
        units: component.units,
      })),
    });
  }

  return normalizeCraftingRecipe({
    id: `${slug(band.id)}-${slug(materialId)}-tier-${coreTier}`,
    name: `Tier ${coreTier} ${band.label}`,
    description: `Wrathmaker ${band.label} chassis using a Tier ${coreTier} ${materialId.replaceAll("-", " ")} Core.`,
    enabled: true,
    categoryId: category.id,
    tier: coreTier,
    ingredientSets: [{ id: "standard", label: "Standard recipe", groups }],
    check: { adjustment: "normal" },
    result: { quantity: 1 },
  });
}

export function defaultProjectProgress(recipe) {
  const normalized = normalizeCraftingRecipe(recipe);
  const firstSet = normalized.ingredientSets[0];
  return Math.max(1, firstSet.groups.reduce((total, group) => (
    total + Math.min(...group.options.map((option) => option.units))
  ), 0));
}
