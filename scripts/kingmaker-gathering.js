import { gatheringTierForRegionLevel } from "./gathering-regions.js";

import {
  HEX_TERRAIN_RESOURCES,
  HEX_FEATURE_RESOURCES,
  normalizeGatheringTag,
  normalizeGatheringTerrain,
  gatheringEnvironmentForTerrain,
} from "./gathering-tags.js";

export { HEX_TERRAIN_RESOURCES } from "./gathering-tags.js";

function collectionValues(collection) {
  if (Array.isArray(collection)) return collection;
  return typeof collection?.values === "function" ? Array.from(collection.values()) : [];
}

function blockedGathering(reason) {
  return {
    active: true, source: "kingmaker", blocked: true, reason,
    name: "Kingmaker gathering unavailable", maxTier: 0, level: null,
    environmentId: "forest", environmentIds: [], materialIds: [], tags: [],
  };
}

function discoveredResources(data, terrain) {
  const materials = new Set(HEX_TERRAIN_RESOURCES[terrain]);
  const tags = new Set();
  const addTag = value => {
    const tag = normalizeGatheringTag(value);
    if (!tag) return;
    tags.add(tag);
    if (Object.hasOwn(HEX_FEATURE_RESOURCES, tag)) {
      for (const material of HEX_FEATURE_RESOURCES[tag]) materials.add(material);
    }
  };
  if (data.showResources === true) addTag(data.commodity);
  for (const feature of collectionValues(data.features)) {
    if (feature?.discovered === true) addTag(feature.type);
  }
  return { materialIds: [...materials], tags: [...tags] };
}

/** Read the licensed module's runtime data, never duplicate its map catalogue. */
export function resolveKingmakerGathering({ actor, party, canvas, kingmaker, regionTierLimits = {}, localize = s => s } = {}) {
  const blocked = blockedGathering;
  if (!kingmaker?.active) return blocked("Enable the required Pathfinder: Kingmaker module.");
  const region = kingmaker.region;
  if (!region?.active || !canvas?.scene || typeof region.getHexFromPoint !== "function")
    return blocked("View the Stolen Lands map to gather from its hexes.");
  const parties = collectionValues(actor?.parties);
  if (!party && parties.length > 1) return blocked("Select a party before gathering; this character belongs to multiple parties.");
  const members = collectionValues(party?.members);
  const belongs = members.some(m => m?.id === actor?.id || m === actor?.id || m === actor?.uuid);
  // An explicitly selected party must not borrow another party's map position.
  if (party && !belongs) return blocked("Choose a character who belongs to the active party.");
  const partyIds = new Set(belongs ? [party.id] : parties.map(p => p.id));
  const tokens = collectionValues(canvas.tokens?.placeables);
  const partyTokens = tokens.filter(t => partyIds.has(t.actor?.id));
  const candidates = partyTokens.length ? partyTokens : tokens.filter(t => actor && t.actor?.id === actor.id);
  const hexes = candidates.map(token => region.getHexFromPoint(token.center));
  if (!hexes.length || hexes.some(hex => !hex)) return blocked("Place this character or their party token in a Stolen Lands hex.");
  if (new Set(hexes.map(h => h.key)).size !== 1) return blocked("Multiple tokens occupy different hexes; resolve the party location first.");
  const hex = hexes[0];
  const { data, zone } = hex;
  if (!data || !zone || data.travel === "impassable") return blocked("This hex is not a valid gathering location.");
  const level = Number(zone.level);
  if (zone.level == null || zone.level === "" || !Number.isFinite(level) || level < 0)
    return blocked("The hex zone has no resource level.");
  const terrain = normalizeGatheringTerrain(data.terrain);
  if (!Object.hasOwn(HEX_TERRAIN_RESOURCES, terrain))
    return blocked("This hex terrain has no gathering resource mapping.");
  const { materialIds, tags } = discoveredResources(data, terrain);
  const memberActors = members.length && belongs ? members : collectionValues(parties[0]?.members);
  const levels = (memberActors.length ? memberActors : [actor]).filter(m => m?.type === "character")
    .map(m => Number(m.level ?? m.system?.details?.level?.value)).filter(n => Number.isFinite(n) && n >= 1);
  if (!levels.length) return blocked("The party's character levels could not be determined.");
  const averageLevel = Math.floor(levels.reduce((a,b) => a+b, 0) / levels.length);
  const override = regionTierLimits[data.zone];
  const regionTier = Number.isInteger(override) && override >= 1 && override <= 6
    ? override : gatheringTierForRegionLevel(Math.max(1, level));
  const maxTier = Math.min(regionTier, gatheringTierForRegionLevel(averageLevel));
  const environmentId = gatheringEnvironmentForTerrain(terrain);
  return { active: true, blocked: false, source: "kingmaker", id: String(hex.key),
    name: localize(zone.label) + " · Hex " + hex.toString(), level, averageLevel,
    terrain, exploration: ["Unexplored", "Reconnoitred", "Mapped"][data.exploration] ?? "Unknown", tags,
    environmentId, environmentIds: [environmentId], materialIds, maxTier };
}

export function kingmakerTaskAllowed(region, task) {
  return !region.blocked && region.materialIds.includes(task.materialId) && task.tier <= region.maxTier;
}

export function kingmakerEnvironment(environment, region, tasks) {
  return { ...environment, taskIds: tasks.filter(t => kingmakerTaskAllowed(region, t)).map(t => t.id) };
}
