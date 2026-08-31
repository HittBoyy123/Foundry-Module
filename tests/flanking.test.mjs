import assert from "node:assert/strict";
import test from "node:test";

import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import {
  calculateFlankingState,
  calculateTokenFlankingState,
  classifyFlankingSide,
  injectFlankingModifier,
  isEligibleWrathmakerFlankingAttack,
  rectanglesWithinReach,
} from "../scripts/flanking.js";
import { normalizeRulesConfig } from "../scripts/model.js";

const config = normalizeRulesConfig(cloneDefaultRulesConfig()).flanking;

function actor({ alliance, size = "med", canFlank = true, canAttack = true, offGuardable = true } = {}) {
  return {
    isDead: false,
    canAttack,
    size,
    system: {
      attributes: { flanking: { canFlank, flankable: true, offGuardable } },
      details: { alliance },
    },
    getReach: () => 5,
    hasCondition: () => false,
    isImmuneTo: () => false,
  };
}

function token({ x, y, alliance = "party", size = "med", disposition = 1, target = false, canAttack = true, offGuardable = true }) {
  const tokenActor = actor({ alliance, size, canAttack, offGuardable });
  return {
    actor: tokenActor,
    bounds: { x, y, width: 100, height: 100 },
    document: { disposition: target ? -1 : disposition },
  };
}

test("flanking geometry classifies the four sides and reach", () => {
  const target = { x: 100, y: 100, width: 100, height: 100 };
  assert.equal(classifyFlankingSide(target, { x: 100, y: 0, width: 100, height: 100 }), "north");
  assert.equal(classifyFlankingSide(target, { x: 200, y: 100, width: 100, height: 100 }), "east");
  assert.equal(classifyFlankingSide(target, { x: 100, y: 200, width: 100, height: 100 }), "south");
  assert.equal(classifyFlankingSide(target, { x: 0, y: 100, width: 100, height: 100 }), "west");
  assert.equal(rectanglesWithinReach(target, { x: 200, y: 100, width: 100, height: 100 }, 2), true);
  assert.equal(rectanglesWithinReach(target, { x: 301, y: 100, width: 100, height: 100 }, 2), false);
});

test("two opposite, three, and four occupied sides target totals of -2, -3, and -4", () => {
  const target = token({ x: 100, y: 100, alliance: "opposition", target: true });
  const north = token({ x: 100, y: 0 });
  const south = token({ x: 100, y: 200 });
  const east = token({ x: 200, y: 100 });
  const west = token({ x: 0, y: 100 });

  const twoSides = calculateTokenFlankingState(target, [target, north, south], config, { size: 100, distance: 5 });
  const threeSides = calculateTokenFlankingState(target, [target, north, south, east], config, { size: 100, distance: 5 });
  const fourSides = calculateTokenFlankingState(target, [target, north, south, east, west], config, { size: 100, distance: 5 });
  assert.deepEqual([twoSides.penalty, threeSides.penalty, fourSides.penalty], [-2, -3, -4]);
  assert.deepEqual([twoSides.wrathmakerPenalty, threeSides.wrathmakerPenalty, fourSides.wrathmakerPenalty], [0, -1, -2]);
});

test("two adjacent sides do not count as a completed flank", () => {
  const target = token({ x: 100, y: 100, alliance: "opposition", target: true });
  const north = token({ x: 100, y: 0 });
  const east = token({ x: 200, y: 100 });
  const state = calculateTokenFlankingState(target, [target, north, east], config, { size: 100, distance: 5 });
  assert.equal(state.active, false);
  assert.equal(state.penalty, 0);
  assert.equal(state.wrathmakerPenalty, 0);
});

test("creatures unable to attack do not contribute and non-off-guardable targets are ignored", () => {
  const target = token({ x: 100, y: 100, alliance: "opposition", target: true });
  const north = token({ x: 100, y: 0, canAttack: false });
  const south = token({ x: 100, y: 200 });
  assert.equal(calculateTokenFlankingState(target, [target, north, south], config, { size: 100, distance: 5 }).active, false);

  const immuneTarget = token({ x: 100, y: 100, alliance: "opposition", target: true, offGuardable: false });
  assert.equal(calculateTokenFlankingState(immuneTarget, [immuneTarget, north, south], config, { size: 100, distance: 5 }), null);
});

test("a target more than one size larger requires two participants per side", () => {
  const singlePerSide = calculateFlankingState({
    targetSize: "huge",
    flankers: [
      { side: "north", size: "med" },
      { side: "south", size: "med" },
    ],
    config,
  });
  assert.equal(singlePerSide.active, false);

  const doubled = calculateFlankingState({
    targetSize: "huge",
    flankers: [
      { side: "north", size: "med" },
      { side: "north", size: "med" },
      { side: "south", size: "med" },
      { side: "south", size: "med" },
    ],
    config,
  });
  assert.equal(doubled.active, true);
  assert.equal(doubled.penalty, -2);
  assert.equal(doubled.wrathmakerPenalty, 0);
});

test("the extra AC penalty is contextual to melee attacks that can reach", () => {
  assert.equal(isEligibleWrathmakerFlankingAttack(new Set([
    "item:melee",
    "origin:size:medium",
    "origin:distance:5",
  ])), true);
  assert.equal(isEligibleWrathmakerFlankingAttack(new Set([
    "item:ranged",
    "origin:size:medium",
    "origin:distance:5",
  ])), false);
  assert.equal(isEligibleWrathmakerFlankingAttack(new Set([
    "item:melee",
    "origin:size:medium",
    "origin:distance:10",
  ])), false);
  assert.equal(isEligibleWrathmakerFlankingAttack(new Set([
    "item:melee",
    "item:trait:reach",
    "origin:size:medium",
    "origin:distance:10",
  ])), true);
  assert.equal(isEligibleWrathmakerFlankingAttack(new Set([
    "item:melee",
    "item:trait:reach-15",
    "origin:size:medium",
    "origin:distance:15",
  ])), true);
  assert.equal(isEligibleWrathmakerFlankingAttack(new Set([
    "item:melee",
    "origin:flanking",
    "origin:distance:20",
  ])), true);
  assert.equal(isEligibleWrathmakerFlankingAttack(new Set(["item:melee"])), false);
});

test("PF2e handles two-sided flanking while Wrathmaker adds -1 at three and -2 at four", () => {
  class MockModifier {
    constructor(data) {
      Object.assign(this, data);
    }
  }
  globalThis.game = {
    pf2e: { Modifier: MockModifier },
    i18n: { format: (_key, { sides }) => `Wrathmaker Flanking Extra (${sides} sides)` },
  };

  const target = token({ x: 100, y: 100, alliance: "opposition", target: true });
  target.actor.id = "target-actor";
  target.actor.uuid = "Actor.target-actor";
  target.actor.isOfType = () => true;
  target.actor.synthetics = { modifiers: {} };
  const north = token({ x: 100, y: 0 });
  const south = token({ x: 100, y: 200 });
  const east = token({ x: 200, y: 100 });
  const west = token({ x: 0, y: 100 });
  const twoApplied = injectFlankingModifier(target.actor, config, {
    tokens: [target, north, south],
    grid: { size: 100, distance: 5 },
  });
  assert.equal(twoApplied, false);
  assert.deepEqual(target.actor.synthetics.modifiers, {});

  const contextualTarget = {
    ...target.actor,
    synthetics: { modifiers: {} },
  };
  const threeApplied = injectFlankingModifier(contextualTarget, config, {
    tokens: [target, north, south, east],
    grid: { size: 100, distance: 5 },
  });
  assert.equal(threeApplied, true);
  const modifierFactory = contextualTarget.synthetics.modifiers.ac[0];
  assert.equal(modifierFactory({ test: new Set(["item:ranged", "origin:distance:5"]) }), null);
  assert.equal(modifierFactory({ test: new Set(["item:melee", "origin:distance:10", "origin:size:medium"]) }), null);
  const modifier = modifierFactory({
    test: new Set(["item:melee", "item:trait:reach", "origin:distance:10", "origin:size:medium"]),
  });
  assert.equal(modifier.modifier, -1);
  assert.equal(modifier.type, "untyped");
  assert.deepEqual(modifier.domains, ["ac"]);

  target.actor.synthetics = { modifiers: {} };
  const fourApplied = injectFlankingModifier(target.actor, config, {
    tokens: [target, north, south, east, west],
    grid: { size: 100, distance: 5 },
  });
  assert.equal(fourApplied, true);
  assert.equal(target.actor.synthetics.modifiers.ac[0]({
    test: new Set(["item:melee", "origin:flanking"]),
  }).modifier, -2);
});
