/** Native PF2e ammunition and pre-migration consumable ammunition. */
export function isAmmunition(item) {
  return item?.type === "ammo" || (item?.type === "consumable" && item.system?.category === "ammo");
}

export function isMagicalAmmunition(item) {
  return isAmmunition(item) && (item.system?.traits?.value ?? []).some(trait =>
    ["magical", "arcane", "divine", "occult", "primal"].includes(trait));
}

export function ammunitionForms(item) {
  if (!isAmmunition(item)) return [];
  const system = item.system ?? {};
  // Magazines, batteries and tanks require their own charged-container recipes.
  if (Number(system.uses?.max ?? 1) > 1) return [];
  const keys = system.baseItem ? [system.baseItem] : system.craftableAs?.length ? system.craftableAs : [system.stackGroup || system.slug || ""];
  const form = key => {
    if (/magazine|battery|chem-tank/.test(key)) return null;
    if (/sling/.test(key)) return "sling";
    if (/arrow/.test(key)) return "arrows";
    if (/bolt/.test(key) && !/ballista/.test(key)) return "bolts";
    if (/round|bullet/.test(key)) return "bullets";
    if (/blowgun|dart/.test(key)) return "darts";
    return null;
  };
  return [...new Set(keys.map(form).filter(Boolean))];
}
