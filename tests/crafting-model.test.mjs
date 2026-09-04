import assert from "node:assert/strict";
import test from "node:test";

import {
  ARTISAN_MARK_GRADES,
  CORE_TIER_PROGRESSION,
  calculateArtisanCapacity,
  getCoreTierProgression,
  normalizeCraftingState,
  validateCraftingState,
} from "../scripts/crafting-model.js";
import { createPublicApi } from "../scripts/api.js";

test("Core Tiers use the Wrathmaker progression and Artisan Capacity table", () => {
  assert.deepEqual(Object.values(CORE_TIER_PROGRESSION), [
    { attack: 0, weaponDice: 0, spellcasting: 0, armor: 0, saves: 0, capacity: 1 },
    { attack: 1, weaponDice: 1, spellcasting: 1, armor: 1, saves: 1, capacity: 2 },
    { attack: 2, weaponDice: 2, spellcasting: 2, armor: 2, saves: 2, capacity: 3 },
    { attack: 3, weaponDice: 2, spellcasting: 3, armor: 3, saves: 3, capacity: 4 },
    { attack: 4, weaponDice: 3, spellcasting: 4, armor: 4, saves: 4, capacity: 6 },
    { attack: 5, weaponDice: 4, spellcasting: 5, armor: 5, saves: 5, capacity: 8 },
  ]);
  assert.equal(getCoreTierProgression(99).capacity, 8);
});

test("Artisan Mark grades have canonical costs and minimum Anchor Tiers", () => {
  assert.deepEqual(ARTISAN_MARK_GRADES, {
    minor: { label: "Minor", capacityCost: 0, minimumAnchorTier: 1 },
    standard: { label: "Standard", capacityCost: 1, minimumAnchorTier: 2 },
    major: { label: "Major", capacityCost: 2, minimumAnchorTier: 3 },
    superior: { label: "Superior", capacityCost: 3, minimumAnchorTier: 4 },
  });
});

test("crafting state normalization preserves data-driven components, Marks, synergies, and provenance", () => {
  const state = normalizeCraftingState({
    core: { materialId: "metal", tier: 4, quantityRequired: 8, quantityCommitted: 3, tags: ["metal", "metal"] },
    components: [{ id: "grip", name: "Grip", classification: "required-secondary", tier: 2, structural: true }],
    artisanMarks: [{ id: "mark", name: "Flame Mark", grade: "major", anchorSlotIds: ["grip"] }],
    synergies: [{ id: "flame-tempered" }],
    provenance: [{ actorUuid: "Actor.Crafter" }],
  });
  assert.equal(state.core.quantityCommitted, 3);
  assert.deepEqual(state.core.tags, ["metal"]);
  assert.equal(state.components[0].classification, "required-secondary");
  assert.equal(state.artisanMarks[0].capacityCost, 2);
  assert.deepEqual(state.synergies, [{ id: "flame-tempered" }]);
  assert.deepEqual(state.provenance, [{ actorUuid: "Actor.Crafter" }]);
});

test("capacity ignores suppressed Marks and reports over-capacity items", () => {
  const state = normalizeCraftingState({
    core: { tier: 2 },
    artisanMarks: [
      { grade: "superior", anchorSlotIds: ["core"] },
      { grade: "major", status: "suppressed", anchorSlotIds: ["core"] },
    ],
  });
  assert.deepEqual(calculateArtisanCapacity(state), {
    used: 3,
    maximum: 2,
    remaining: 0,
    overCapacity: true,
  });
});

test("validation enforces structural floors, required Anchors, Anchor Tiers, and capacity", () => {
  const result = validateCraftingState({
    core: { materialId: "metal", tier: 5 },
    components: [
      { id: "low", name: "Low-tier haft", classification: "required-secondary", tier: 2, structural: true },
      { id: "anchor", name: "Rune socket", tier: 2 },
    ],
    artisanMarks: [
      { id: "missing", name: "Unanchored Mark", grade: "minor" },
      { id: "weak", name: "Weak Mark", grade: "major", anchorSlotIds: ["anchor"] },
      { id: "unknown", name: "Lost Mark", grade: "standard", anchorSlotIds: ["not-there"] },
      { id: "large", name: "Large Mark", grade: "superior", anchorSlotIds: ["anchor"] },
      { id: "too-much", name: "Another Large Mark", grade: "superior", anchorSlotIds: ["anchor"] },
    ],
  });
  assert.equal(result.valid, false);
  assert.equal(result.structuralFloor, 3);
  assert.deepEqual(new Set(result.issues.map((issue) => issue.code)), new Set([
    "structural-tier",
    "missing-anchor",
    "anchor-tier",
    "capacity",
  ]));
});

test("the public API exposes the versioned crafting-state foundation", () => {
  const api = createPublicApi();
  assert.equal(api.craftingStateSchemaVersion, 2);
  assert.equal(api.craftingProjectSchemaVersion, 2);
  assert.equal(api.craftingWorkbenchSchemaVersion, 2);
  assert.equal(api.getCoreTierProgression(6).capacity, 8);
  assert.equal(api.calculateArtisanCapacity({ core: { tier: 1 } }).maximum, 1);
  assert.equal(api.validateCraftingState({ core: { tier: 1 } }).valid, true);
  assert.equal(api.listCraftingRecipeBands("weapon").length >= 15, true);
  assert.equal(api.progressForWorkBlock(5, "criticalSuccess"), 8);
});
