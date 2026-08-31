import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCraftingDC,
  getCraftingTierLevel,
  listCraftingDifficultyAdjustments,
} from "../scripts/crafting-dc.js";

test("resource tiers map to the requested item levels and PF2e level-based DCs", () => {
  const expected = [
    { tier: 1, level: 1, dc: 15 },
    { tier: 2, level: 4, dc: 19 },
    { tier: 3, level: 8, dc: 24 },
    { tier: 4, level: 12, dc: 30 },
    { tier: 5, level: 16, dc: 35 },
    { tier: 6, level: 20, dc: 40 },
  ];

  for (const entry of expected) {
    assert.equal(getCraftingTierLevel(entry.tier), entry.level);
    assert.deepEqual(calculateCraftingDC(entry.tier), {
      tier: entry.tier,
      level: entry.level,
      baseDC: entry.dc,
      adjustment: "normal",
      adjustmentLabel: "Normal",
      modifier: 0,
      dc: entry.dc,
    });
  }

  assert.equal(calculateCraftingDC(0), null);
  assert.equal(calculateCraftingDC(7), null);
});

test("the GM can apply PF2e difficulty adjustments without changing the resource", () => {
  const expectedModifiers = {
    "incredibly-easy": -10,
    "very-easy": -5,
    easy: -2,
    normal: 0,
    hard: 2,
    "very-hard": 5,
    "incredibly-hard": 10,
  };

  for (const [adjustment, modifier] of Object.entries(expectedModifiers)) {
    const result = calculateCraftingDC(4, adjustment);
    assert.equal(result.baseDC, 30);
    assert.equal(result.modifier, modifier);
    assert.equal(result.dc, 30 + modifier);
  }

  assert.equal(calculateCraftingDC(4, "unknown").adjustment, "normal");
  assert.deepEqual(
    Object.fromEntries(listCraftingDifficultyAdjustments().map((entry) => [entry.id, entry.modifier])),
    expectedModifiers,
  );
});
