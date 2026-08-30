import assert from "node:assert/strict";
import test from "node:test";

import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import {
  calculateFlankingState,
  calculateTokenFlankingState,
  classifyFlankingSide,
  injectFlankingModifier,
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

test("two opposite, three, and four occupied sides apply -2, -3, and -4", () => {
  const target = token({ x: 100, y: 100, alliance: "opposition", target: true });
  const north = token({ x: 100, y: 0 });
  const south = token({ x: 100, y: 200 });
  const east = token({ x: 200, y: 100 });
  const west = token({ x: 0, y: 100 });

  assert.equal(calculateTokenFlankingState(target, [target, north, south], config, { size: 100, distance: 5 }).penalty, -2);
  assert.equal(calculateTokenFlankingState(target, [target, north, south, east], config, { size: 100, distance: 5 }).penalty, -3);
  assert.equal(calculateTokenFlankingState(target, [target, north, south, east, west], config, { size: 100, distance: 5 }).penalty, -4);
});

test("two adjacent sides do not count as a completed flank", () => {
  const target = token({ x: 100, y: 100, alliance: "opposition", target: true });
  const north = token({ x: 100, y: 0 });
  const east = token({ x: 200, y: 100 });
  const state = calculateTokenFlankingState(target, [target, north, east], config, { size: 100, distance: 5 });
  assert.equal(state.active, false);
  assert.equal(state.penalty, 0);
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
});

test("flanking injects an untyped AC modifier so it stacks with off-guard", () => {
  class MockModifier {
    constructor(data) {
      Object.assign(this, data);
    }
  }
  globalThis.game = {
    pf2e: { Modifier: MockModifier },
    i18n: { format: (_key, { sides }) => `Wrathmaker Flanking (${sides} sides)` },
  };

  const target = token({ x: 100, y: 100, alliance: "opposition", target: true });
  target.actor.isOfType = () => true;
  target.actor.synthetics = { modifiers: {} };
  const north = token({ x: 100, y: 0 });
  const south = token({ x: 100, y: 200 });
  const applied = injectFlankingModifier(target.actor, config, {
    tokens: [target, north, south],
    grid: { size: 100, distance: 5 },
  });

  assert.equal(applied, true);
  const modifier = target.actor.synthetics.modifiers.ac[0]();
  assert.equal(modifier.modifier, -2);
  assert.equal(modifier.type, "untyped");
  assert.deepEqual(modifier.domains, ["ac"]);
});
