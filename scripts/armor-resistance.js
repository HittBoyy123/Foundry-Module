export function addArmorResistance(recipe, item, selection, config) {
  if (!selection?.color) return;
  const core = recipe.ingredientSets[0].groups.find(group => group.id === "core")?.options[0]?.materialId;
  if (item?.type !== "armor" || !["metal", "leather"].includes(core)) throw new Error("Dragon-scale resistance requires Metal or Leather armor.");
  if (!config.materials["dragon-scale"].colors[selection.color]) throw new Error("Choose a valid dragon scale color.");
  const tier = Math.min(6, Math.max(1, Number(selection.tier) || recipe.tier));
  recipe.ingredientSets[0].groups.push({ id: "dragon-scale", label: "Dragon-scale resistance", options: [
    { materialId: "dragon-scale", tier, tierMode: "minimum", maximumTier: tier, variantId: selection.color, units: 1 },
  ] });
}
