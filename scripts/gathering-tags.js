/** Wrathmaker house-rule resource mappings. These are not PF2e commodity conversions. */
export const HEX_TERRAIN_RESOURCES = Object.freeze({
  plains: Object.freeze(["herbs", "leather"]),
  forest: Object.freeze(["wood", "herbs", "leather"]),
  hills: Object.freeze(["stone", "metal", "herbs"]),
  mountains: Object.freeze(["stone", "metal"]),
  wetlands: Object.freeze(["wood", "herbs", "leather"]),
  water: Object.freeze(["herbs", "leather"]),
});

export const HEX_FEATURE_RESOURCES = Object.freeze({
  ore: Object.freeze(["metal"]),
  lumber: Object.freeze(["wood"]),
  stone: Object.freeze(["stone"]),
  food: Object.freeze(["herbs"]),
  luxuries: Object.freeze(["mana-crystals"]),
  farmland: Object.freeze(["herbs"]),
});

const TERRAIN_ALIASES = Object.freeze({ swamp: "wetlands", lake: "water" });
const TERRAIN_ENVIRONMENTS = Object.freeze({ hills: "mountains", water: "wetlands" });

/** Normalize external tags only. Persisted material IDs and zone IDs stay unchanged. */
export function normalizeGatheringTag(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[\s_]+/gu, "-") : "";
}

export function normalizeGatheringTerrain(value) {
  const tag = normalizeGatheringTag(value);
  return TERRAIN_ALIASES[tag] ?? tag;
}

export function gatheringEnvironmentForTerrain(terrain) {
  return TERRAIN_ENVIRONMENTS[terrain] ?? terrain;
}

/** Preserve existing rule-element predicates while providing a consistent module namespace. */
export function gatheringRollOptions(task) {
  return [
    "action:gather",
    `action:gather:${task.materialId}`,
    "wrathmaker:gathering",
    `wrathmaker:gathering:material:${task.materialId}`,
    `wrathmaker:gathering:tier:${task.tier}`,
  ];
}
