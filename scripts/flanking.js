import { MODULE_ID } from "./constants.js";

const PATCH_MARKER = Symbol.for(`${MODULE_ID}.prepareSynthetics.flanking`);
const TOKEN_PATCH_MARKER = Symbol.for(`${MODULE_ID}.token.isFlanking`);
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
let refreshHooksRegistered = false;
const actorsPreparingSynthetics = new WeakSet();

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
  const validFlankers = flankers.filter((flanker) => SIDES.includes(flanker.side));
  const sideWeights = Object.fromEntries(SIDES.map((side) => [side, 0]));
  const targetRank = getSizeRank(targetSize);
  for (const flanker of validFlankers) {
    sideWeights[flanker.side] += 1;
  }

  const occupiedSides = SIDES.filter((side) => sideWeights[side] > 0);
  const hasBaseFlank = validFlankers.length >= 2
    && (!config.requireOppositeSidesForTwo || hasOppositePair(occupiedSides));
  const largestFlankerRank = validFlankers.reduce(
    (largest, flanker) => Math.max(largest, getSizeRank(flanker.size)),
    Number.NEGATIVE_INFINITY,
  );
  const oversized = Number.isFinite(largestFlankerRank)
    && targetRank - largestFlankerRank > config.maxNormalSizeDifference;
  const enhancementMultiplier = oversized
    ? Math.max(2, numeric(config.oversizedParticipantsPerSide, 2))
    : 1;
  const participants = validFlankers.length;

  if (!hasBaseFlank) {
    return {
      active: false,
      penalty: 0,
      wrathmakerPenalty: 0,
      sides: 0,
      participants,
      occupiedSides,
      qualifiedSides: occupiedSides,
      sideWeights,
      oversized,
      requiredParticipants: { 3: 3 * enhancementMultiplier, 4: 4 * enhancementMultiplier },
    };
  }

  // Ordinary two-creature flanking always remains available. Only the enhanced
  // three- and four-combatant thresholds are multiplied for an oversized target.
  const sides = participants >= 4 * enhancementMultiplier
    ? 4
    : participants >= 3 * enhancementMultiplier
      ? 3
      : 2;
  const penalty = numeric(config.penalties[sides], numeric(config.penalties[2], -2));
  const basePenalty = numeric(config.penalties[2]);
  const wrathmakerPenalty = penalty < basePenalty ? penalty : 0;
  return {
    active: true,
    penalty,
    wrathmakerPenalty,
    sides,
    participants,
    occupiedSides,
    qualifiedSides: occupiedSides,
    sideWeights,
    oversized,
    requiredParticipants: { 3: 3 * enhancementMultiplier, 4: 4 * enhancementMultiplier },
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
  const targetAlliance = targetToken.actor?.system?.details?.alliance ?? targetToken.actor?.alliance ?? null;
  const flankerAlliance = flankerToken.actor?.system?.details?.alliance ?? flankerToken.actor?.alliance ?? null;
  if (targetAlliance && flankerAlliance) return targetAlliance !== flankerAlliance;
  return tokenDisposition(targetToken) * tokenDisposition(flankerToken) < 0;
}

function actorsAreAllied(firstToken, secondToken) {
  if (firstToken.actor === secondToken.actor && firstToken.document?.isLinked && secondToken.document?.isLinked) {
    return true;
  }
  const firstAlliance = firstToken.actor?.system?.details?.alliance ?? firstToken.actor?.alliance ?? null;
  const secondAlliance = secondToken.actor?.system?.details?.alliance ?? secondToken.actor?.alliance ?? null;
  if (firstAlliance && secondAlliance) return firstAlliance === secondAlliance;
  return tokenDisposition(firstToken) * tokenDisposition(secondToken) > 0;
}

function canParticipate(token) {
  const actor = token.actor;
  if (token.document?.hidden || !actor || actor.isDead || actor.canAttack === false || actor.hasCondition?.("unconscious")) {
    return false;
  }
  return (actor.attributes?.flanking?.canFlank ?? actor.system?.attributes?.flanking?.canFlank) !== false;
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
  if (targetToken.document?.hidden) return null;
  const flanking = targetToken.actor.attributes?.flanking ?? targetToken.actor.system?.attributes?.flanking;
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

function tokenCanMakeCurrentMeleeAttack(originToken, targetToken, context = {}, grid = {}) {
  if (!canParticipate(originToken) || !actorsAreOpposed(targetToken, originToken)) return false;
  const originActor = originToken.actor;
  if (originActor?.isOfType && !originActor.isOfType("creature")) return false;
  if (targetToken.actor?.isOfType && !targetToken.actor.isOfType("creature")) return false;

  const reach = numeric(
    context.reach,
    numeric(originActor?.getReach?.({ action: "attack" }), numeric(grid.distance, 5)),
  );
  if (typeof originToken.distanceTo === "function") {
    const distance = originToken.distanceTo(targetToken, { reach });
    return typeof distance === "number" && Number.isFinite(distance) && reach >= distance;
  }

  const gridSize = numeric(grid.size, 100);
  const gridDistance = numeric(grid.distance, 5);
  const extraSquares = Math.max((reach / Math.max(gridDistance, 1)) - 1, 0);
  const allowedGap = (extraSquares * gridSize) + Math.max(2, gridSize * 0.02);
  return rectanglesWithinReach(
    tokenRectangle(targetToken, gridSize),
    tokenRectangle(originToken, gridSize),
    allowedGap,
  );
}

function tokensAreOnOppositeSides(originToken, buddyToken, targetToken, gridSize) {
  if (typeof originToken.onOppositeSides === "function") {
    return originToken.onOppositeSides(originToken, buddyToken, targetToken);
  }
  const targetRect = tokenRectangle(targetToken, gridSize);
  const originSide = classifyFlankingSide(targetRect, tokenRectangle(originToken, gridSize));
  const buddySide = classifyFlankingSide(targetRect, tokenRectangle(buddyToken, gridSize));
  return OPPOSITE_PAIRS.some(([first, second]) => (
    (originSide === first && buddySide === second) || (originSide === second && buddySide === first)
  ));
}

function originHasOppositeBuddy(originToken, targetToken, tokens, grid) {
  const gridSize = numeric(grid.size, 100);
  return tokens.some((buddyToken) => (
    buddyToken !== originToken
    && canParticipate(buddyToken)
    && actorsAreAllied(originToken, buddyToken)
    && actorsAreOpposed(targetToken, buddyToken)
    && rectanglesWithinReach(
      tokenRectangle(targetToken, gridSize),
      tokenRectangle(buddyToken, gridSize),
      flankerReachPixels(buddyToken, gridSize, numeric(grid.distance, 5)),
    )
    && tokensAreOnOppositeSides(originToken, buddyToken, targetToken, gridSize)
  ));
}

export function isWrathmakerFlankingOrigin(originToken, targetToken, tokens, config, context = {}, grid = {}) {
  if (!config.enabled || !tokenCanMakeCurrentMeleeAttack(originToken, targetToken, context, grid)) return false;
  const state = calculateTokenFlankingState(targetToken, tokens, config, grid);
  if (!state?.active) return false;

  // Once the enhanced threshold is met, every qualifying melee combatant in
  // reach shares the flank. At the ordinary two-person threshold, the attacker
  // must itself be one half of the opposite-side pair.
  return state.sides >= 3 || originHasOppositeBuddy(originToken, targetToken, tokens, grid);
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
  const label = globalThis.game?.i18n?.format?.("CMT.Flanking.Modifier", { participants: state.participants })
    ?? `Wrathmaker Flanking (${state.participants} combatants)`;
  modifiers.push(() => {
    const offGuardable = actor.attributes?.flanking?.offGuardable
      ?? actor.system?.attributes?.flanking?.offGuardable;
    if (offGuardable === false) return null;
    const predicate = ["item:melee", "origin:flanking"];
    if (typeof offGuardable === "number") predicate.push({ gt: ["origin:level", offGuardable] });

    return new Modifier({
      slug: "wrathmaker-flanking",
      label,
      modifier: state.wrathmakerPenalty,
      // This is the final circumstance penalty, not an extra penalty. PF2e's
      // normal -2 Off-guard modifier remains present and stacking rules retain
      // only this more severe value at three or four qualifying combatants.
      type: "circumstance",
      domains: ["ac"],
      // PF2e extracts AC synthetic factories while preparing the statistic and
      // does not pass the eventual attack test to the factory. Keep the
      // attack-specific restrictions on the Modifier predicate so PF2e can
      // evaluate them later against the contextual target roll options.
      predicate,
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
  if (refreshHooksRegistered) return;
  refreshHooksRegistered = true;
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

function installTokenFlankingOverride(getConfig) {
  const prototype = CONFIG.Token?.objectClass?.prototype;
  const original = prototype?.isFlanking;
  if (typeof original !== "function") {
    console.error(`${MODULE_ID} | PF2e Token.isFlanking was not found; Off-guard flanking detection cannot be replaced.`);
    return false;
  }
  if (original[TOKEN_PATCH_MARKER]) return true;

  function isFlankingWithWrathmaker(flankee, context = {}) {
    const normalFlanking = original.apply(this, [flankee, context]);
    const config = getConfig().flanking;
    if (!config.enabled || normalFlanking) return normalFlanking;

    const tokens = this.layer?.placeables ?? globalThis.canvas?.tokens?.placeables ?? [];
    const grid = {
      size: globalThis.canvas?.grid?.size,
      distance: globalThis.canvas?.scene?.grid?.distance,
    };
    try {
      return isWrathmakerFlankingOrigin(this, flankee, tokens, config, context, grid);
    } catch (error) {
      console.error(`${MODULE_ID} | Could not resolve Off-guard flanking for ${this?.name ?? "a token"}.`, error);
      return false;
    }
  }

  Object.defineProperty(isFlankingWithWrathmaker, TOKEN_PATCH_MARKER, { value: true });
  Object.defineProperty(isFlankingWithWrathmaker, "name", { value: original.name });
  Object.defineProperty(prototype, "isFlanking", {
    configurable: true,
    writable: true,
    value: isFlankingWithWrathmaker,
  });
  return true;
}

export function installFlankingBridge(getConfig) {
  const documentClasses = Object.values(CONFIG.PF2E?.Actor?.documentClasses ?? {});
  const prototypes = [...new Set(documentClasses.map((ActorClass) => ActorClass?.prototype).filter(Boolean))];
  const patchTargets = prototypes
    .map((prototype) => ({ prototype, original: prototype.prepareSynthetics }))
    .filter(({ original }) => typeof original === "function");

  if (patchTargets.length === 0) {
    console.error(`${MODULE_ID} | PF2e creature preparation classes were not found; custom flanking cannot be automated.`);
    return false;
  }

  let installed = 0;
  for (const { prototype, original } of patchTargets) {
    if (Object.hasOwn(prototype, "prepareSynthetics") && prototype.prepareSynthetics?.[PATCH_MARKER]) {
      installed += 1;
      continue;
    }

    function prepareSyntheticsWithWrathmakerFlanking(...args) {
      const outermostCall = !actorsPreparingSynthetics.has(this);
      if (outermostCall) actorsPreparingSynthetics.add(this);
      try {
        const result = original.apply(this, args);
        if (outermostCall) {
          try {
            injectFlankingModifier(this, getConfig().flanking);
          } catch (error) {
            console.error(`${MODULE_ID} | Could not calculate custom flanking for ${this?.name ?? "an actor"}.`, error);
          }
        }
        return result;
      } finally {
        if (outermostCall) actorsPreparingSynthetics.delete(this);
      }
    }

    Object.defineProperty(prepareSyntheticsWithWrathmakerFlanking, PATCH_MARKER, { value: true });
    Object.defineProperty(prepareSyntheticsWithWrathmakerFlanking, "name", { value: original.name });
    Object.defineProperty(prototype, "prepareSynthetics", {
      configurable: true,
      writable: true,
      value: prepareSyntheticsWithWrathmakerFlanking,
    });
    installed += 1;
  }

  if (installed === 0) return false;
  const tokenOverrideInstalled = installTokenFlankingOverride(getConfig);
  registerRefreshHooks();
  return tokenOverrideInstalled;
}
