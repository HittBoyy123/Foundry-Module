/** Combine identical requirements without multiplying the available stash stock. */
export function craftingMaterialSummary(groups, materials = {}) {
  const totals = new Map();
  const alternatives = [];
  const describe = option => {
    const range = option.tierMode === "minimum" && option.maximumTier > option.tier
      ? `T${option.tier}–T${option.maximumTier}` : `T${option.tier}`;
    return `${materials[option.materialId]?.label ?? option.materialId} ${range}${option.variantId ? " · " + option.variantId : ""}`;
  };
  for (const group of groups ?? []) {
    if (group.options.length !== 1) {
      alternatives.push({ label: group.options.map(option => `${describe(option)}: ${option.units}`).join(" or "), alternative: true });
      continue;
    }
    const option = group.options[0];
    const key = JSON.stringify([option.materialId, option.tier, option.tierMode, option.maximumTier, option.variantId || ""]);
    const total = totals.get(key) ?? { label: describe(option), units: 0, owned: option.owned ?? 0 };
    total.units += option.units;
    totals.set(key, total);
  }
  return [...totals.values()].map(row => ({ ...row, missing: Math.max(0, row.units - row.owned), available: row.owned >= row.units })).concat(alternatives);
}
