import { MODULE_ID } from "./constants.js";

const PATCH_MARKER = Symbol.for(`${MODULE_ID}.prepareSynthetics.flanking`);
const SIDES = Object.freeze(["north", "east", "south", "west"]);
const OPPOSITE_PAIRS = Object.freeze([
  Object.freeze(["north", "south"]),
  Object.freeze(["east", "west"]),
]);
const SIZE_RANKS = Object.freeze({
  tiny: 0,
  sm: 1,
  small: 1,
  med: 2,
  medium: 2,
  lg: 3,
  large: 3,
  huge: 4,
  grg: 5,
  gargantuan: 5,
});
const BASE_ATTACK_REACH_BY_SIZE = Object.freeze({
  tiny: 0,
  sm: 5,
  small: 5,
  med: 5,
  medium: 5,
  lg: 5,
  large: 5,
  huge: 10,
  grg: 15,
  gargantuan: 15,
});
const BASE_ATTACK_REACH_BY_SIZE_RANK = Object.freeze([0, 5, 5, 5, 10, 15]);

let refreshTimer = null;
let warnedAboutModifier = false;

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asRollOptionSet(value) {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value);
  return new Set();
}

function numericRollOption(options, prefix) {
  for (const option of options) {
    if (!option.startsWith(`${prefix}:`)) continue;
    const value = Number(option.slice(prefix.length + 1));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function originBaseAttackReach(options) {
  const explicitReach = numericRollOption(options, "origin:reach");
  if (explicitReach !== null) return Math.max(explicitReach, 0);

  for (const option of options) {
    if (!option.startsWith("origin:size:")) continue;
    const size = option.slice("origin:size:".length).toLowerCase();
    if (size in BASE_ATTACK_REACH_BY_SIZE) return BASE_ATTACK_REACH_BY_SIZE[size];
    const rank = Number(size);
    if (Number.isInteger(rank) && rank >= 0 && rank < BASE_ATTACK_REACH_BY_SIZE_RANK.length) {
      return BASE_ATTACK_REACH_BY_SIZE_RANK[rank];
    }
  }
  return 5;
}

/**
 * Restrict Wrathmaker's contextual AC penalty to an attack that can participate in melee flanking.
 * PF2e supplies these item, origin-distance, and origin-flanking options to the target's contextual clone.
 */
export function isEligibleWrathmakerFlankingAttack(test) {
  const options = asRollOptionSet(test);
  if (!options.has("item:melee")) return false;

  // PF2e's own flanking option already includes item-specific reach and token geometry.
  if (options.has("origin:flanking")) return true;

  const distance = numericRollOption(options, "origin:distance");
  if (distance === null) return false;

  const numberedReach = [...options]
    .filter((option) => /^item:trait:reach-\d+$/.test(option))
    .map((option) => Number(option.replace(/^item:trait:reach-/, "")))
    .filter(Number.isFinite);
  const baseReach = originBaseAttackReach(options);
  const itemReach = numberedReach.length > 0
    ? Math.max(...numberedReach)
    : baseReach + (options.has("item:trait:reach") ? 5 : 0);
  return distance <= itemReach;
}

export function getSizeRank(value) {
  const size = value?.value ?? value?.slug ?? value;
  return SIZE_RANKS[String(size ?? "medium").toLowerCase()] ?? SIZE_RANKS.medium;
}

export function classifyFlankingSide(target, flanker) {
  const targetCenterX = target.x + (target.width / 2);
  const targetCenterY = target.y + (target.height / 2);
  const flankerCenterX = flanker.x + (flanker.width / 2);
  const flankerCenterY = flanker.y + (flanker.height / 2);
  const horizontalScale = Math.max((target.width + flanker.width) / 2, 1);
  const verticalScale = Math.max((target.height + flanker.height) / 2, 1);
  const dx = (flankerCenterX - targetCenterX) / horizontalScale;
  const dy = (flankerCenterY - targetCenterY) / verticalScale;

  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "west" : "east";
  return dy < 0 ? "north" : "south";
}

export function rectanglesWithinReach(target, flanker, allowedGap = 1) {
  const targetRight = target.x + target.width;
  const targetBottom = target.y + target.height;
  const flankerRight = flanker.x + flanker.width;
  const flankerBottom = flanker.y + flanker.height;
  const gapX = Math.max(target.x - flankerRight, flanker.x - targetRight, 0);
  const gapY = Math.max(target.y - flankerBottom, flanker.y - targetBottom, 0);
  return Math.hypot(gapX, gapY) <= Math.max(allowedGap, 0);
}

function hasOppositePair(sides) {
  return OPPOSITE_PAIRS.some(([first, second]) => sides.includes(first) && sides.includes(second));
}

export function calculateFlankingState({ targetSize, flankers, config }) {
  const sideWeights = Object.fromEntries(SIDES.map((side) => [side, 0]));
  const targetRank = getSizeRank(targetSize);
  for (const flanker of flankers) {
    if (!SIDES.includes(flanker.side)) continue;
    const sizeDifference = targetRank - getSizeRank(flanker.size);
    const contribution = sizeDifference > config.maxNormalSizeDifference
      ? 1 / config.oversizedParticipantsPerSide
      : 1;
    sideWeights[flanker.side] += contribution;
  }

  const qualifiedSides = SIDES.filter((side) => sideWeights[side] >= 1 - Number.EPSILON);
  let sides = Math.min(qualifiedSides.length, 4);
  if (sides === 2 && config.requireOppositeSidesForTwo && !hasOppositePair(qualifiedSides)) sides = 0;
  if (sides < 2) {
    return { active: false, penalty: 0, wrathmakerPenalty: 0, sides: 0, qualifiedSides, sideWeights };
  }
  const penalty = numeric(config.penalties[sides]);
  const basePenalty = numeric(config.penalties[2]);
  const wrathmakerPenalty = config.pf2eHandlesTwoSidedFlanking
    ? Math.min(penalty - basePenalty, 0)
    : penalty;
  return {
    active: true,
    penalty,
    wrathmakerPenalty,
    sides,
    qualifiedSides,
    sideWeights,
  };
}

function tokenRectangle(token, gridSize) {
  const bounds = token.bounds;
  if (bounds && [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) {
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  }
  const document = token.document ?? token;
  return {
    x: numeric(document.x),
    y: numeric(document.y),
    width: numeric(document.width, 1) * gridSize,
    height: numeric(document.height, 1) * gridSize,
  };
}

function actorSize(actor) {
  return actor?.size ?? actor?.system?.traits?.size?.value ?? actor?.system?.traits?.size ?? "medium";
}

function tokenDisposition(token) {
  return numeric(token.document?.disposition ?? token.disposition);
}

function actorsAreOpposed(targetToken, flankerToken) {
  const targetAlliance = targetToken.actor?.system?.details?.alliance ?? null;
  const flankerAlliance = flankerToken.actor?.system?.details?.alliance ?? null;
  if (targetAlliance && flankerAlliance) return targetAlliance !== flankerAlliance;
  return tokenDisposition(targetToken) * tokenDisposition(flankerToken) < 0;
}

function canParticipate(token) {
  const actor = token.actor;
  if (!actor || actor.isDead || actor.canAttack === false || actor.hasCondition?.("unconscious")) return false;
  return actor.system?.attributes?.flanking?.canFlank !== false;
}

function flankerReachPixels(token, gridSize, gridDistance) {
  const actor = token.actor;
  let reach = gridDistance;
  try {
    reach = numeric(actor?.getReach?.({ action: "attack" }), gridDistance);
  } catch (_error) {
    reach = numeric(actor?.system?.attributes?.reach?.base, gridDistance);
  }
  const extraSquares = Math.max((reach / Math.max(gridDistance, 1)) - 1, 0);
  return (extraSquares * gridSize) + Math.max(2, gridSize * 0.02);
}

export function calculateTokenFlankingState(targetToken, tokens, config, grid = {}) {
  if (!targetToken?.actor || !config.enabled) return null;
  const flanking = targetToken.actor.system?.attributes?.flanking;
  if (flanking?.flankable === false || flanking?.offGuardable === false) return null;
  if (targetToken.actor.isImmuneTo?.("off-guard")) return null;

  const gridSize = numeric(grid.size, 100);
  const gridDistance = numeric(grid.distance, 5);
  const targetRect = tokenRectangle(targetToken, gridSize);
  const flankers = [];
  for (const token of tokens) {
    if (token === targetToken || !canParticipate(token) || !actorsAreOpposed(targetToken, token)) continue;
    const flankerRect = tokenRectangle(token, gridSize);
    const allowedGap = flankerReachPixels(token, gridSize, gridDistance);
    if (!rectanglesWithinReach(targetRect, flankerRect, allowedGap)) continue;
    flankers.push({
      side: classifyFlankingSide(targetRect, flankerRect),
      size: actorSize(token.actor),
      token,
    });
  }
  return calculateFlankingState({ targetSize: actorSize(targetToken.actor), flankers, config });
}

export function calculateActorFlankingState(actor, config, environment = {}) {
  if (!actor || !config.enabled) return null;
  if (actor.isOfType && !actor.isOfType("creature")) return null;
  const tokens = environment.tokens ?? globalThis.canvas?.tokens?.placeables ?? [];
  const targetTokens = tokens.filter((token) => {
    const tokenActor = token.actor;
    return tokenActor === actor
      || (!!tokenActor?.uuid && !!actor.uuid && tokenActor.uuid === actor.uuid)
      || (!!tokenActor?.id && !!actor.id && tokenActor.id === actor.id);
  });
  if (targetTokens.length === 0) return null;
  const grid = environment.grid ?? {
    size: globalThis.canvas?.grid?.size,
    distance: globalThis.canvas?.scene?.grid?.distance,
  };
  return targetTokens
    .map((target) => calculateTokenFlankingState(target, tokens, config, grid))
    .filter((state) => state?.active)
    .sort((first, second) => first.penalty - second.penalty)[0] ?? null;
}

export function injectFlankingModifier(actor, config, environment = {}) {
  const state = calculateActorFlankingState(actor, config, environment);
  if (!state?.active || state.wrathmakerPenalty === 0) return false;
  const Modifier = globalThis.game?.pf2e?.Modifier;
  if (typeof Modifier !== "function") {
    if (!warnedAboutModifier) {
      warnedAboutModifier = true;
      console.error(`${MODULE_ID} | PF2e's Modifier constructor is unavailable; custom flanking cannot be applied.`);
    }
    return false;
  }

  const modifiers = (actor.synthetics.modifiers.ac ??= []);
  const label = globalThis.game?.i18n?.format?.("CMT.Flanking.Modifier", { sides: state.sides })
    ?? `Wrathmaker Flanking (${state.sides} sides)`;
  modifiers.push(({ test } = {}) => {
    if (!isEligibleWrathmakerFlankingAttack(test)) return null;
    return new Modifier({
      slug: "wrathmaker-flanking",
      label,
      modifier: state.wrathmakerPenalty,
      type: config.pf2eHandlesTwoSidedFlanking || config.stackWithOffGuard ? "untyped" : "circumstance",
      domains: ["ac"],
    });
  });
  return true;
}

function refreshSceneActors() {
  refreshTimer = null;
  const actors = new Set((globalThis.canvas?.tokens?.placeables ?? []).map((token) => token.actor).filter(Boolean));
  for (const actor of actors) {
    actor.reset?.();
    if (actor.sheet?.rendered) actor.render?.(false);
  }
}

export function scheduleFlankingRefresh() {
  if (refreshTimer !== null) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshSceneActors, 50);
}

function registerRefreshHooks() {
  Hooks.on("canvasReady", scheduleFlankingRefresh);
  Hooks.on("createToken", scheduleFlankingRefresh);
  Hooks.on("deleteToken", scheduleFlankingRefresh);
  Hooks.on("updateToken", (_document, changes) => {
    const relevant = ["x", "y", "width", "height", "elevation", "disposition", "hidden"];
    if (relevant.some((key) => key in changes)) scheduleFlankingRefresh();
  });
  Hooks.on("updateActor", scheduleFlankingRefresh);
  Hooks.on("createItem", (item) => item.actor && scheduleFlankingRefresh());
  Hooks.on("updateItem", (item) => item.actor && scheduleFlankingRefresh());
  Hooks.on("deleteItem", (item) => item.actor && scheduleFlankingRefresh());
  Hooks.on("updateCombatant", scheduleFlankingRefresh);
}

export function installFlankingBridge(getConfig) {
  const ActorClass = CONFIG.Actor?.documentClass;
  const prototype = ActorClass?.prototype;
  const original = prototype?.prepareSynthetics;
  if (typeof original !== "function") {
    console.error(`${MODULE_ID} | PF2e Actor.prepareSynthetics was not found; custom flanking cannot be automated.`);
    return false;
  }
  if (original[PATCH_MARKER]) return true;

  function prepareSyntheticsWithWrathmakerFlanking(...args) {
    const result = original.apply(this, args);
    try {
      injectFlankingModifier(this, getConfig().flanking);
    } catch (error) {
      console.error(`${MODULE_ID} | Could not calculate custom flanking for ${this?.name ?? "an actor"}.`, error);
    }
    return result;
  }

  Object.defineProperty(prepareSyntheticsWithWrathmakerFlanking, PATCH_MARKER, { value: true });
  Object.defineProperty(prepareSyntheticsWithWrathmakerFlanking, "name", { value: original.name });
  prototype.prepareSynthetics = prepareSyntheticsWithWrathmakerFlanking;
  registerRefreshHooks();
  return true;
}
