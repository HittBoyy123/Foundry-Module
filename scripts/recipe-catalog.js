import { isAlchemicalBomb } from "./alchemical-crafting.js";
import { isAmmunition, isMagicalAmmunition, ammunitionForms } from "./ammunition.js";
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

export function consumableMinimumTier(item) {
  if (isAmmunition(item) && !isMagicalAmmunition(item)) return 1;
  if (item?.type !== "consumable" && !isAmmunition(item) && !isAlchemicalBomb(item)) return 1;
  const level = Number(item.system?.level?.value ?? 0);
  const index = [1, 4, 8, 12, 16, 20].findIndex(limit => level <= limit);
  if (index < 0 || !Number.isFinite(level)) throw new Error("Consumables above level 20 are not supported.");
  return index + 1;
}

export function compatibleRecipeBands(targetItem) {
  const category = categorizeCraftableItem(targetItem);
  if (!category) return [];
  const compatible = listCraftingRecipeBands().filter((band) => band.categoryIds.includes(category.id));
  if (category.group === "ammunition") return compatible.filter(band => ammunitionForms(targetItem).some(form => band.id === `ammo-${form}`));
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
  batchQuantity = 1,
} = {}) {
  const band = getCraftingRecipeBand(bandId);
  if (!band) throw new Error("Choose a valid Wrathmaker recipe.");
  const category = categorizeCraftableItem(targetItem);
  if (!category || !compatibleRecipeBands(targetItem).some((entry) => entry.id === band.id)) {
    throw new Error(`${band.label} is not compatible with this base item.`);
  }
  const ammo = isAmmunition(targetItem);
  const coreTier = ammo && !isMagicalAmmunition(targetItem) ? 1 : Math.min(6, Math.max(1, Math.trunc(Number(tier) || 1)));
  if (coreTier < consumableMinimumTier(targetItem)) throw new Error("Choose materials meeting the consumable's minimum tier.");
  const quantity = ["consumable", "ammunition"].includes(category.group) ? Number(batchQuantity) : 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 4) throw new Error("Choose a batch of one to four identical consumables.");
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
        tier: component.id === "inscription" ? coreTier : structuralFloor,
        tierMode: "minimum",
        maximumTier: coreTier,
        units: component.units,
      })),
    });
  }

  // Magical items always pay a catalyst cost, including magical weapon chassis.
  // Existing mandatory mana ingredients count; optional alternatives do not.
  const traits = targetItem?.system?.traits?.value ?? [];
  if (traits.includes("magical") || isMagicalAmmunition(targetItem)) {
    const hasMana = groups.some((group) => group.options.every((option) => option.materialId === "mana-crystals"));
    if (!hasMana) groups.push({
      id: "magic-catalyst", label: "Mandatory Mana Catalyst",
      options: [{ materialId: "mana-crystals", tier: coreTier, tierMode: "exact", units: ["weapon", "armor", "shield"].includes(category.group) ? 2 : ammo ? 10 : 1 }],
    });
  }

  for (const group of groups) for (const option of group.options) option.units *= quantity;
  return normalizeCraftingRecipe({
    id: `${slug(band.id)}-${slug(materialId)}-tier-${coreTier}`,
    name: `Tier ${coreTier} ${band.label}`,
    description: `${band.label} chassis using a Tier ${coreTier} ${materialId.replaceAll("-", " ")} Core.`,
    enabled: true,
    categoryId: category.id,
    tier: coreTier,
    ingredientSets: [{ id: "standard", label: "Standard recipe", groups }],
    check: { adjustment: "normal" },
    result: { quantity: quantity * (ammo ? 10 : 1) },
  });
}

export function defaultProjectProgress(recipe) {
  const normalized = normalizeCraftingRecipe(recipe);
  const firstSet = normalized.ingredientSets[0];
  return Math.max(1, Math.ceil(0.8 * firstSet.groups.reduce((total, group) => (
    total + Math.min(...group.options.map((option) => option.units)) / (normalized.categoryId === "ammunition" ? normalized.result.quantity / 10 : normalized.categoryId.startsWith("consumable.") ? normalized.result.quantity : 1)
  ), 0)));
}
