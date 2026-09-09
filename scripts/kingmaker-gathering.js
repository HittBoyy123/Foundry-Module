import { gatheringTierForRegionLevel } from "./gathering-regions.js";

export const HEX_TERRAIN_RESOURCES = Object.freeze({
  plains: ["herbs", "leather"], forest: ["wood", "herbs", "leather"],
  hills: ["stone", "metal", "herbs"], mountains: ["stone", "metal"],
  wetlands: ["wood", "herbs", "leather"], water: ["herbs", "leather"],
});
const COMMODITIES = { ore: ["metal"], lumber: ["wood"], stone: ["stone"], food: ["herbs"], luxuries: ["mana-crystals"] };
const ENVIRONMENT = { hills: "mountains", water: "wetlands" };
const values = c => Array.isArray(c) ? c : c?.values ? Array.from(c.values()) : [];

/** Read the licensed module's runtime data, never duplicate its map catalogue. */
export function resolveKingmakerGathering({ actor, party, canvas, kingmaker, localize = s => s } = {}) {
  const blocked = reason => ({ active: true, source: "kingmaker", blocked: true, reason,
    name: "Kingmaker gathering unavailable", maxTier: 0, level: null,
    environmentId: "forest", environmentIds: [], materialIds: [], tags: [] });
  if (!kingmaker?.active) return blocked("Enable the required Pathfinder: Kingmaker module.");
  const region = kingmaker.region;
  if (!region?.active || !canvas?.scene || typeof region.getHexFromPoint !== "function")
    return blocked("View the Stolen Lands map to gather from its hexes.");
  const parties = values(actor?.parties);
  const members = values(party?.members);
  const belongs = members.some(m => m?.id === actor?.id || m === actor?.id || m === actor?.uuid);
  // An explicitly selected party must not borrow another party's map position.
  if (party && !belongs) return blocked("Choose a character who belongs to the active party.");
  const partyIds = new Set(belongs ? [party.id] : parties.map(p => p.id));
  const tokens = values(canvas.tokens?.placeables);
  const partyTokens = tokens.filter(t => partyIds.has(t.actor?.id));
  const candidates = partyTokens.length ? partyTokens : tokens.filter(t => actor && t.actor?.id === actor.id);
  const hexes = candidates.map(t => region.getHexFromPoint(t.center)).filter(Boolean);
  if (!hexes.length) return blocked("Place this character or their party token in a Stolen Lands hex.");
  if (new Set(hexes.map(h => h.key)).size !== 1) return blocked("Multiple tokens occupy different hexes; resolve the party location first.");
  const hex = hexes[0], data = hex.data, zone = hex.zone;
  if (!data || !zone || data.travel === "impassable") return blocked("This hex is not a valid gathering location.");
  const level = Number(zone.level);
  if (zone.level == null || zone.level === "" || !Number.isFinite(level) || level < 0)
    return blocked("The hex zone has no resource level.");
  if (!Object.hasOwn(HEX_TERRAIN_RESOURCES, data.terrain))
    return blocked("This hex terrain has no gathering resource mapping.");
  const materials = new Set(HEX_TERRAIN_RESOURCES[data.terrain] ?? []);
  const tags = [];
  if (data.showResources && data.commodity) {
    for (const material of COMMODITIES[data.commodity] ?? []) materials.add(material);
    tags.push(data.commodity);
  }
  for (const feature of values(data.features).filter(f => f.discovered)) {
    tags.push(feature.type);
    // Explicit resource feature types only; never infer deposits from secret names.
    for (const material of COMMODITIES[feature.type] ?? []) materials.add(material);
    if (feature.type === "farmland") materials.add("herbs");
  }
  const memberActors = members.length && belongs ? members : values(parties[0]?.members);
  const levels = (memberActors.length ? memberActors : [actor]).filter(m => m?.type === "character")
    .map(m => Number(m.level ?? m.system?.details?.level?.value)).filter(n => Number.isFinite(n) && n >= 1);
  if (!levels.length) return blocked("The party's character levels could not be determined.");
  const averageLevel = Math.floor(levels.reduce((a,b) => a+b, 0) / levels.length);
  const maxTier = Math.min(gatheringTierForRegionLevel(Math.max(1, level)), gatheringTierForRegionLevel(averageLevel));
  const environmentId = ENVIRONMENT[data.terrain] ?? data.terrain;
  return { active: true, blocked: false, source: "kingmaker", id: String(hex.key),
    name: localize(zone.label) + " · Hex " + hex.toString(), level, averageLevel,
    terrain: data.terrain, exploration: ["Unexplored", "Reconnoitred", "Mapped"][data.exploration] ?? "Unknown", tags,
    environmentId, environmentIds: [environmentId], materialIds: [...materials], maxTier };
}

export function kingmakerTaskAllowed(region, task) {
  return !region.blocked && region.materialIds.includes(task.materialId) && task.tier <= region.maxTier;
}

export function kingmakerEnvironment(environment, region, tasks) {
  return { ...environment, taskIds: tasks.filter(t => kingmakerTaskAllowed(region, t)).map(t => t.id) };
}
