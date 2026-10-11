export function isAlchemicalBomb(item) {
 const traits = item?.system?.traits?.value ?? [];
 return item?.type === "weapon" && traits.includes("alchemical") && (item.system?.group === "bomb" || item.system?.baseItem === "alchemical-bomb" || traits.includes("bomb"));
}
