import { MODULE_ID } from "./constants.js";
import { CRAFTING_TIER_LEVELS } from "./crafting-dc.js";

export const PF2E_ENVIRONMENT_TO_GATHERING = Object.freeze({
  aquatic: "wetlands",
  arctic: "mountains",
  desert: "plains",
  forest: "forest",
  mountain: "mountains",
  plains: "plains",
  swamp: "wetlands",
  underground: "underground",
  urban: "plains",
});

function collectionValues(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.values === "function") return Array.from(collection.values());
  return Array.from(collection);
}

function moduleGatheringFlag(document) {
  const fromMethod = document?.getFlag?.(MODULE_ID, "gathering");
  if (fromMethod && typeof fromMethod === "object") return fromMethod;
  const source = document?.flags?.[MODULE_ID]?.gathering;
  return source && typeof source === "object" ? source : {};
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function parseGatheringRegionLevel(name) {
  const text = typeof name === "string" ? name.trim() : "";
  const match = text.match(/(?:\blevels?|\blv\.?|\bl)\s*[:#-]?\s*(\d{1,2})\b/iu)
    ?? text.match(/\b(\d{1,2})(?:st|nd|rd|th)[ -]level\b/iu);
  const level = positiveInteger(match?.[1]);
  return level && level <= 20 ? level : null;
}

export function gatheringTierForRegionLevel(level, fallbackTier = 1) {
  const normalizedLevel = positiveInteger(level);
  if (!normalizedLevel) return Math.min(6, Math.max(1, positiveInteger(fallbackTier) ?? 1));
  return [1, 2, 3, 4, 5, 6].reduce((highest, tier) => (
    normalizedLevel >= CRAFTING_TIER_LEVELS[tier] ? tier : highest
  ), 1);
}

function environmentTypesFromBehaviors(document) {
  const types = [];
  for (const behavior of collectionValues(document?.behaviors)) {
    const behaviorType = behavior?.type ?? behavior?.system?.type ?? "";
    if (behaviorType !== "environment") continue;
    types.push(...collectionValues(behavior.system?.environmentTypes ?? behavior.environmentTypes));
  }
  return types;
}

function environmentTypes(document) {
  return [
    ...collectionValues(document?.environmentTypes),
    ...environmentTypesFromBehaviors(document),
  ].map((type) => String(type).trim().toLowerCase()).filter(Boolean);
}

export function gatheringEnvironmentsForDocument(document, fallbackEnvironmentId = "forest") {
  const flag = moduleGatheringFlag(document);
  const configured = [
    ...(Array.isArray(flag.environmentIds) ? flag.environmentIds : []),
    flag.environmentId,
  ].filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim());
  if (configured.length > 0) return [...new Set(configured)];
  const mapped = environmentTypes(document)
    .map((type) => PF2E_ENVIRONMENT_TO_GATHERING[type])
    .filter(Boolean);
  return [...new Set(mapped.length > 0 ? mapped : [fallbackEnvironmentId])];
}

export function gatheringEnvironmentForDocument(document, fallbackEnvironmentId = "forest") {
  return gatheringEnvironmentsForDocument(document, fallbackEnvironmentId)[0];
}

function actorCandidates(actor, scene) {
  if (!actor) return [];
  const candidates = [actor, ...collectionValues(actor?.parties)].filter(Boolean);
  for (const token of collectionValues(scene?.tokens)) {
    const tokenActor = token?.actor;
    if (tokenActor?.type !== "party") continue;
    const containsActor = collectionValues(tokenActor.members).some((member) => {
      if (typeof member === "string") return member === actor.id || member === actor.uuid;
      return member === actor || member?.id === actor.id || member?.uuid === actor.uuid;
    });
    if (containsActor) candidates.push(tokenActor);
  }
  return [...new Set(candidates)];
}

function tokenMatchesActor(token, actors) {
  return actors.some((actor) => (
    token?.actor === actor
    || token?.actor?.id === actor?.id
    || token?.actorId === actor?.id
    || token?.actor?.uuid === actor?.uuid
  ));
}

function regionsContainingActor(scene, actor) {
  const actors = actorCandidates(actor, scene);
  const matches = [];
  for (const region of collectionValues(scene?.regions)) {
    const containsActor = collectionValues(region?.tokens).some((token) => tokenMatchesActor(token, actors));
    if (containsActor) matches.push(region);
  }
  if (matches.length > 0) return matches;
  for (const token of collectionValues(scene?.tokens).filter((entry) => tokenMatchesActor(entry, actors))) {
    matches.push(...collectionValues(token?.regions));
  }
  return [...new Set(matches)];
}

function documentRegionData(document, fallbackEnvironmentId, fallbackMaxTier) {
  if (!document) return null;
  const flag = moduleGatheringFlag(document);
  if (flag.enabled === false) return null;
  const level = positiveInteger(flag.level)
    ?? positiveInteger(document?.flags?.pf2e?.kingmaker?.level)
    ?? positiveInteger(document?.flags?.kingmaker?.level)
    ?? positiveInteger(document?.flags?.["pf2e-kingmaker"]?.level)
    ?? positiveInteger(document?.system?.level?.value ?? document?.system?.level)
    ?? parseGatheringRegionLevel(document.name);
  const hasEnvironmentMetadata = environmentTypes(document).length > 0
    || (typeof flag.environmentId === "string" && flag.environmentId.trim())
    || (Array.isArray(flag.environmentIds) && flag.environmentIds.length > 0);
  const isConfigured = level !== null || hasEnvironmentMetadata || flag.enabled === true;
  if (!isConfigured) return null;
  const environmentIds = gatheringEnvironmentsForDocument(document, fallbackEnvironmentId);
  return {
    id: document.id ?? document.uuid ?? "",
    name: document.name ?? "Stolen Lands Region",
    level,
    environmentId: environmentIds[0],
    environmentIds,
    maxTier: gatheringTierForRegionLevel(level, fallbackMaxTier),
  };
}

export function resolveGatheringRegion({
  actor = null,
  scene = null,
  useSceneRegion = true,
  fallbackEnvironmentId = "forest",
  fallbackMaxTier = 1,
} = {}) {
  const fallback = {
    active: false,
    source: "manual",
    id: "",
    name: "",
    level: null,
    environmentId: fallbackEnvironmentId,
    environmentIds: [fallbackEnvironmentId],
    maxTier: gatheringTierForRegionLevel(null, fallbackMaxTier),
  };
  if (!useSceneRegion || !scene) return fallback;

  const regionCandidates = regionsContainingActor(scene, actor)
    .map((region) => ({ region, data: documentRegionData(region, fallbackEnvironmentId, fallbackMaxTier) }))
    .filter((entry) => entry.data)
    .sort((left, right) => {
      const leftFlag = moduleGatheringFlag(left.region);
      const rightFlag = moduleGatheringFlag(right.region);
      return Number(rightFlag.enabled === true) - Number(leftFlag.enabled === true)
        || Number(right.data.level !== null) - Number(left.data.level !== null)
        || left.data.name.localeCompare(right.data.name);
    });
  const region = regionCandidates[0]?.data;
  if (region) return { ...region, active: true, source: "scene-region" };

  const sceneData = documentRegionData(scene, fallbackEnvironmentId, fallbackMaxTier);
  return sceneData
    ? { ...sceneData, active: true, source: "scene" }
    : fallback;
}
