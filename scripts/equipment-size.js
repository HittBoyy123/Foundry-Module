export const EQUIPMENT_SIZES = [
  { id: "tiny", label: "Tiny", factor: 0.5 }, { id: "sm", label: "Small", factor: 0.75 },
  { id: "med", label: "Medium", factor: 1 }, { id: "lg", label: "Large", factor: 1.25 },
  { id: "huge", label: "Huge", factor: 1.5 }, { id: "grg", label: "Gargantuan", factor: 1.75 },
];
export function normalizeEquipmentSize(size) {
  return EQUIPMENT_SIZES.some(entry => entry.id === size) ? size : "med";
}
export function scaleEquipmentRecipe(recipe, size) {
  const factor = EQUIPMENT_SIZES.find(entry => entry.id === normalizeEquipmentSize(size)).factor;
  const scaled = structuredClone(recipe);
  for (const set of scaled.ingredientSets) for (const group of set.groups) for (const option of group.options) {
    option.units = Math.max(1, Math.floor(option.units * factor));
  }
  return scaled;
}
