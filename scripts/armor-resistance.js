const SCALE_COSTS = {
  "shield-buckler": 1, "shield-light": 2, "shield-standard": 3, "shield-tower": 4, "shield-fortress": 5,
  "armor-combat-clothing": 2, "armor-light-flexible": 2, "armor-light-reinforced": 2,
  "armor-medium-hide": 3, "armor-medium-metal": 3, "armor-heavy": 4, "armor-full-plate": 5,
};
export function dragonScaleUnits(recipe) {
  const band = Object.keys(SCALE_COSTS).find(id => recipe.id === id || recipe.id?.startsWith(id + "-"));
  if (!band) throw new Error("Choose an armor or shield recipe to determine dragon-scale quantities.");
  return SCALE_COSTS[band];
}
export function canReinforceWithScales(item) {
  return item?.type === "armor" || item?.type === "shield";
}

export function addArmorResistance(recipe, item, selection, config) {
  if (!selection?.color) return;
  if (!canReinforceWithScales(item)) throw new Error("Dragon-scale reinforcements require armor or a shield.");
  if (!config.materials["dragon-scale"].colors[selection.color]) throw new Error("Choose a valid dragon scale color.");
  const tier = Math.min(6, Math.max(1, Number(selection.tier) || recipe.tier));
  recipe.ingredientSets[0].groups.push({ id: "dragon-scale", label: "Dragon-scale resistance", options: [
    { materialId: "dragon-scale", tier, tierMode: "minimum", maximumTier: tier, variantId: selection.color, units: dragonScaleUnits(recipe) },
  ] });
}
