import { getCraftingResourceData } from "./crafting-categories.js";

export function dragonScaleOptions(items, colors, selection = null) {
  const options = new Map();
  for (const item of items ?? []) {
    const resource = getCraftingResourceData(item);
    if (resource?.materialId !== "dragon-scale" || !colors?.[resource.variantId]) continue;
    const units = Number(item.system?.quantity ?? 0) * resource.unitsPerItem;
    if (units <= 0) continue;
    const id = `${resource.variantId}:${resource.tier}`;
    const row = options.get(id) ?? { id, color: resource.variantId, tier: resource.tier, units: 0 };
    row.units += units;
    options.set(id, row);
  }
  const selectedId = selection?.color ? `${selection.color}:${selection.tier}` : "";
  if (selectedId && !options.has(selectedId)) options.set(selectedId, {
    id: selectedId, color: selection.color, tier: selection.tier, units: 0, unavailable: true,
  });
  return [...options.values()].sort((a, b) => a.tier - b.tier || a.color.localeCompare(b.color)).map(row => ({
    ...row, selected: row.id === selectedId,
    label: `${colors?.[row.color]?.label ?? row.color} · Tier ${row.tier} · ${row.units} available`,
  }));
}
