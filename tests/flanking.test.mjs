import assert from "node:assert/strict";
import test from "node:test";

import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import {
  calculateFlankingState,
  calculateTokenFlankingState,
  classifyFlankingSide,
  injectFlankingModifier,
  installFlankingBridge,
  isEligibleWrathmakerFlankingAttack,
  isWrathmakerFlankingOrigin,
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

test("two opposite flankers and third and fourth combatants target totals of -2, -3, and -4", () => {
  const target = token({ x: 100, y: 100, alliance: "opposition", target: true });
  const north = token({ x: 100, y: 0 });
  const south = token({ x: 100, y: 200 });
  const east = token({ x: 200, y: 100 });
  const west = token({ x: 0, y: 100 });

  const twoSides = calculateTokenFlankingState(target, [target, north, south], config, { size: 100, distance: 5 });
  const threeSides = calculateTokenFlankingState(target, [target, north, south, east], config, { size: 100, distance: 5 });
  const fourSides = calculateTokenFlankingState(target, [target, north, south, east, west], config, { size: 100, distance: 5 });
  assert.deepEqual([twoSides.penalty, threeSides.penalty, fourSides.penalty], [-2, -3, -4]);
  assert.deepEqual([twoSides.wrathmakerPenalty, threeSides.wrathmakerPenalty, fourSides.wrathmakerPenalty], [0, -3, -4]);
  assert.deepEqual([twoSides.participants, threeSides.participants, fourSides.participants], [2, 3, 4]);
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

test("an oversized target keeps normal two-person flanking but doubles enhanced thresholds", () => {
  const ordinaryFlank = calculateFlankingState({
    targetSize: "huge",
    flankers: [
      { side: "north", size: "med" },
      { side: "south", size: "med" },
    ],
    config,
  });
  assert.equal(ordinaryFlank.active, true);
  assert.equal(ordinaryFlank.penalty, -2);
  assert.equal(ordinaryFlank.wrathmakerPenalty, 0);
  assert.equal(ordinaryFlank.oversized, true);
  assert.deepEqual(ordinaryFlank.requiredParticipants, { 3: 6, 4: 8 });

  const sixFlankers = calculateFlankingState({
    targetSize: "huge",
    flankers: [
      { side: "north", size: "med" },
      { side: "north", size: "med" },
      { side: "north", size: "med" },
      { side: "south", size: "med" },
      { side: "south", size: "med" },
      { side: "south", size: "med" },
    ],
    config,
  });
  assert.equal(sixFlankers.penalty, -3);
  assert.equal(sixFlankers.wrathmakerPenalty, -3);

  const eightFlankers = calculateFlankingState({
    targetSize: "huge",
    flankers: [
      ...Array.from({ length: 4 }, () => ({ side: "north", size: "med" })),
      ...Array.from({ length: 4 }, () => ({ side: "south", size: "med" })),
    ],
    config,
  });
  assert.equal(eightFlankers.penalty, -4);
  assert.equal(eightFlankers.wrathmakerPenalty, -4);
});

test("the largest qualifying flanker determines whether enhanced thresholds are doubled", () => {
  const state = calculateFlankingState({
    targetSize: "huge",
    flankers: [
      { side: "north", size: "med" },
      { side: "south", size: "large" },
      { side: "east", size: "med" },
    ],
    config,
  });
  assert.equal(state.oversized, false);
  assert.equal(state.penalty, -3);
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

test("Wrathmaker flanking origins preserve the opposite pair and include enhanced participants", () => {
  const target = token({ x: 100, y: 100, alliance: "opposition", target: true });
  const north = token({ x: 100, y: 0 });
  const south = token({ x: 100, y: 200 });
  const east = token({ x: 200, y: 100 });
  const grid = { size: 100, distance: 5 };

  assert.equal(isWrathmakerFlankingOrigin(north, target, [target, north, south], config, { reach: 5 }, grid), true);
  assert.equal(isWrathmakerFlankingOrigin(east, target, [target, north, east], config, { reach: 5 }, grid), false);
  assert.equal(isWrathmakerFlankingOrigin(east, target, [target, north, south, east], config, { reach: 5 }, grid), true);
});

test("PF2e handles two-sided Off-guard while Wrathmaker supplies the final -3 and -4 circumstance penalties", () => {
  class MockModifier {
    constructor(data) {
      Object.assign(this, data);
    }
  }
  globalThis.game = {
    pf2e: { Modifier: MockModifier },
    i18n: {
      localize: (key) => ({
        "CMT.Flanking.Outnumbered": "Outnumbered (Flanked)",
        "CMT.Flanking.Surrounded": "Surrounded (Flanked)",
      })[key] ?? key,
    },
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
  const modifier = modifierFactory();
  assert.equal(modifier.modifier, -3);
  assert.equal(modifier.type, "circumstance");
  assert.deepEqual(modifier.domains, ["ac"]);
  assert.deepEqual(modifier.predicate, ["item:melee", "origin:flanking"]);
  assert.equal(modifier.label, "Outnumbered (Flanked)");

  target.actor.synthetics = { modifiers: {} };
  const fourApplied = injectFlankingModifier(target.actor, config, {
    tokens: [target, north, south, east, west],
    grid: { size: 100, distance: 5 },
  });
  assert.equal(fourApplied, true);
  const fourCombatantModifier = target.actor.synthetics.modifiers.ac[0]();
  assert.equal(fourCombatantModifier.modifier, -4);
  assert.equal(fourCombatantModifier.label, "Surrounded (Flanked)");
});

test("the AC synthetic retains PF2e's level gate for limited Off-guard targets", () => {
  class MockModifier {
    constructor(data) {
      Object.assign(this, data);
    }
  }
  globalThis.game = {
    pf2e: { Modifier: MockModifier },
    i18n: {
      localize: (key) => ({
        "CMT.Flanking.Outnumbered": "Outnumbered (Flanked)",
        "CMT.Flanking.Surrounded": "Surrounded (Flanked)",
      })[key] ?? key,
    },
  };

  const target = token({
    x: 100,
    y: 100,
    alliance: "opposition",
    target: true,
    offGuardable: 5,
  });
  target.actor.id = "limited-target";
  target.actor.uuid = "Actor.limited-target";
  target.actor.isOfType = () => true;
  target.actor.synthetics = { modifiers: {} };
  const north = token({ x: 100, y: 0 });
  const south = token({ x: 100, y: 200 });
  const east = token({ x: 200, y: 100 });

  assert.equal(injectFlankingModifier(target.actor, config, {
    tokens: [target, north, south, east],
    grid: { size: 100, distance: 5 },
  }), true);
  assert.deepEqual(target.actor.synthetics.modifiers.ac[0]().predicate, [
    "item:melee",
    "origin:flanking",
    { gt: ["origin:level", 5] },
  ]);
});

test("the bridge patches PF2e concrete actor classes instead of the generic actor proxy", () => {
  class GenericActorProxy {}
  class CreatureDocument {
    prepareSynthetics() {
      this.prepared = true;
    }
  }
  class CharacterDocument extends CreatureDocument {}
  class NpcDocument extends CreatureDocument {}
  class TokenObject {
    isFlanking() {
      return false;
    }
  }

  globalThis.CONFIG = {
    Actor: { documentClass: GenericActorProxy },
    Token: { objectClass: TokenObject },
    PF2E: {
      Actor: {
        documentClasses: {
          character: CharacterDocument,
          npc: NpcDocument,
        },
      },
    },
  };
  globalThis.Hooks = { on: () => {} };

  assert.equal(installFlankingBridge(() => ({ flanking: config })), true);
  assert.equal(Object.hasOwn(CharacterDocument.prototype, "prepareSynthetics"), true);
  assert.equal(Object.hasOwn(NpcDocument.prototype, "prepareSynthetics"), true);
  assert.equal(Object.hasOwn(GenericActorProxy.prototype, "prepareSynthetics"), false);
  assert.equal(Object.hasOwn(TokenObject.prototype, "isFlanking"), true);

  const character = new CharacterDocument();
  character.prepareSynthetics();
  assert.equal(character.prepared, true);
});
