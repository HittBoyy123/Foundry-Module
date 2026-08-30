import assert from "node:assert/strict";
import test from "node:test";

import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import { calculateItemEffects, normalizeRulesConfig } from "../scripts/model.js";
import {
  applyDashboardChanges,
  applyMaterialChanges,
  buildDashboardContext,
  buildMaterialEditorContext,
} from "../scripts/settings-model.js";

const config = normalizeRulesConfig(cloneDefaultRulesConfig());

test("dashboard context exposes friendly crafting, flanking, and material summaries", () => {
  const context = buildDashboardContext(config);
  assert.equal(context.craftingEnabled, true);
  assert.equal(context.flankingEnabled, true);
  assert.equal(context.penaltyThree, -3);
  assert.match(context.materials.find((material) => material.id === "metal").tiers, /1: Iron/);
});

test("dashboard changes toggle both systems and update flanking totals", () => {
  const changed = normalizeRulesConfig(applyDashboardChanges(config, {
    crafting: { enabled: false },
    flanking: {
      enabled: false,
      penalties: { 3: -4, 4: -6 },
      maxNormalSizeDifference: 2,
      oversizedParticipantsPerSide: 3,
    },
  }));
  assert.equal(changed.crafting.enabled, false);
  assert.equal(changed.flanking.enabled, false);
  assert.deepEqual(changed.flanking.penalties, { 2: -2, 3: -4, 4: -6 });
  assert.equal(changed.flanking.maxNormalSizeDifference, 2);
  assert.equal(changed.flanking.oversizedParticipantsPerSide, 3);
});

test("material editor changes all tier presentation fields and per-material bonuses", () => {
  const editor = buildMaterialEditorContext(config, "metal");
  assert.equal(editor.tiers[1].label, "Steel");
  assert.equal(editor.tiers[1].bonus, 1);

  const tiers = Object.fromEntries(editor.tiers.map((row) => [row.tier, {
    label: row.tier === 2 ? "Kingssteel" : row.label,
    bonus: row.tier === 2 ? 3 : row.bonus,
    priceGp: row.tier === 2 ? 75 : row.priceGp,
    rarity: row.tier === 2 ? "rare" : row.rarities.find((rarity) => rarity.selected).value,
  }]));
  const changed = normalizeRulesConfig(applyMaterialChanges(config, "metal", {
    material: { label: "Forged Metal", enabled: true },
    itemTypes: { weapon: true, armor: true },
    tiers,
  }));
  assert.equal(changed.materials.metal.label, "Forged Metal");
  assert.equal(changed.materials.metal.tierLabels[2], "Kingssteel");
  assert.equal(changed.materials.metal.tierBonuses[2], 3);
  assert.equal(changed.materials.metal.tierPricesGp[2], 75);
  assert.equal(changed.materials.metal.tierRarities[2], "rare");

  const result = calculateItemEffects({
    itemType: "weapon",
    itemId: "weapon1",
    itemName: "Sword",
    flags: { material: "metal", tier: 2 },
    config: changed,
  });
  assert.equal(result.tierBonus, 3);
  assert.equal(result.presentation.label, "Kingssteel");
  assert.equal(result.presentation.priceGp, 75);
  assert.equal(result.presentation.rarity, "rare");
});
