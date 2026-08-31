import assert from "node:assert/strict";
import test from "node:test";

import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import { calculateItemEffects, normalizeRulesConfig } from "../scripts/model.js";
import {
  applyDashboardChanges,
  applyMaterialChanges,
  buildDashboardContext,
  buildMaterialEditorContext,
  expandDottedFormData,
} from "../scripts/settings-model.js";

const config = normalizeRulesConfig(cloneDefaultRulesConfig());

test("dashboard context exposes friendly crafting, flanking, and material summaries", () => {
  const context = buildDashboardContext(config);
  assert.equal(context.craftingEnabled, true);
  assert.equal(context.flankingEnabled, true);
  assert.equal(context.hexplorationEnabled, true);
  assert.equal(context.penaltyThree, -3);
  const metal = context.materials.find((material) => material.id === "metal");
  assert.match(metal.tiers, /1: Iron/);
  assert.equal(metal.itemTypes, "Weapons, Armor, and Spell Focuses");
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
    hexploration: { enabled: false },
  }));
  assert.equal(changed.crafting.enabled, false);
  assert.equal(changed.flanking.enabled, false);
  assert.equal(changed.hexploration.enabled, false);
  assert.deepEqual(changed.flanking.penalties, { 2: -2, 3: -4, 4: -6 });
  assert.equal(changed.flanking.maxNormalSizeDifference, 2);
  assert.equal(changed.flanking.oversizedParticipantsPerSide, 3);
});

test("Foundry dotted form fields expand before dashboard toggles are saved", () => {
  assert.deepEqual(expandDottedFormData({
    "crafting.enabled": "on",
    "flanking.enabled": "on",
    "hexploration.enabled": "on",
    "flanking.penalties.3": "-3",
    "flanking.penalties.4": "-4",
  }), {
    crafting: { enabled: "on" },
    flanking: { enabled: "on", penalties: { 3: "-3", 4: "-4" } },
    hexploration: { enabled: "on" },
  });

  const changed = normalizeRulesConfig(applyDashboardChanges(config, {
    "crafting.enabled": "on",
    "flanking.enabled": "on",
    "hexploration.enabled": "on",
    "flanking.penalties.3": "-3",
    "flanking.penalties.4": "-4",
    "flanking.maxNormalSizeDifference": "1",
    "flanking.oversizedParticipantsPerSide": "2",
  }));
  assert.equal(changed.crafting.enabled, true);
  assert.equal(changed.flanking.enabled, true);
  assert.equal(changed.hexploration.enabled, true);
});

test("material editor changes all tier presentation fields and per-material bonuses", () => {
  const editor = buildMaterialEditorContext(config, "metal");
  assert.equal(editor.tiers[1].label, "Steel");
  assert.equal(editor.tiers[1].bonus, 1);
  assert.equal(editor.supportsSpellFocus, true);

  const tiers = Object.fromEntries(editor.tiers.map((row) => [row.tier, {
    label: row.tier === 2 ? "Kingssteel" : row.label,
    bonus: row.tier === 2 ? 3 : row.bonus,
    priceGp: row.tier === 2 ? 75 : row.priceGp,
    rarity: row.tier === 2 ? "rare" : row.rarities.find((rarity) => rarity.selected).value,
  }]));
  const changed = normalizeRulesConfig(applyMaterialChanges(config, "metal", {
    material: { label: "Forged Metal", enabled: true },
    itemTypes: { weapon: true, armor: true, spellFocus: true },
    tiers,
  }));
  assert.equal(changed.materials.metal.label, "Forged Metal");
  assert.equal(changed.materials.metal.tierLabels[2], "Kingssteel");
  assert.equal(changed.materials.metal.tierBonuses[2], 3);
  assert.equal(changed.materials.metal.tierPricesGp[2], 75);
  assert.equal(changed.materials.metal.tierRarities[2], "rare");
  assert.equal(changed.materials.metal.itemTypes.includes("spellFocus"), true);

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

test("flat material editor fields save names, tiers, and an untyped bonus", () => {
  const flat = {
    "material.label": "Forged Metal",
    "material.enabled": "on",
    "material.modifierType": "untyped",
    "itemTypes.weapon": "on",
    "itemTypes.armor": "on",
    "itemTypes.spellFocus": "on",
  };
  for (let tier = 1; tier <= 6; tier += 1) {
    flat[`tiers.${tier}.label`] = tier === 2 ? "Kingssteel" : config.materials.metal.tierLabels[tier];
    flat[`tiers.${tier}.bonus`] = String(tier - 1);
    flat[`tiers.${tier}.priceGp`] = String(config.materials.metal.tierPricesGp[tier]);
    flat[`tiers.${tier}.rarity`] = config.tierRarities[tier];
  }

  const changed = normalizeRulesConfig(applyMaterialChanges(config, "metal", flat));
  assert.equal(changed.materials.metal.label, "Forged Metal");
  assert.equal(changed.materials.metal.enabled, true);
  assert.equal(changed.materials.metal.tierLabels[2], "Kingssteel");
  assert.equal(changed.materials.metal.effects.every((effect) => effect.modifierType === "untyped"), true);
});

test("dragon-scale editor changes color mappings and resistance values", () => {
  const editor = buildMaterialEditorContext(config, "dragon-scale");
  assert.equal(editor.isDragonScale, true);
  assert.equal(editor.supportsWeapon, false);
  assert.equal(editor.dragonColors.find((color) => color.id === "red").label, "Red");
  assert.deepEqual(editor.tiers.map((tier) => tier.label), [
    "Hatchling",
    "Juvenile",
    "Youth",
    "Adult",
    "Ancient",
    "Arch Dragon",
  ]);

  const flat = {
    "material.label": "Dragon Scale Plating",
    "material.enabled": "on",
    "dragonColors.red.label": "Crimson",
    "dragonColors.red.damageType": "fire",
  };
  for (const color of editor.dragonColors) {
    if (color.id === "red") continue;
    flat[`dragonColors.${color.id}.label`] = color.label;
    flat[`dragonColors.${color.id}.damageType`] = color.damageTypes.find((type) => type.selected).value;
  }
  for (const row of editor.tiers) {
    flat[`tiers.${row.tier}.label`] = row.label;
    flat[`tiers.${row.tier}.bonus`] = row.tier === 4 ? "9" : String(row.bonus);
    flat[`tiers.${row.tier}.priceGp`] = String(row.priceGp);
    flat[`tiers.${row.tier}.rarity`] = row.rarities.find((rarity) => rarity.selected).value;
  }

  const changed = normalizeRulesConfig(applyMaterialChanges(config, "dragon-scale", flat));
  assert.equal(changed.materials["dragon-scale"].label, "Dragon Scale Plating");
  assert.equal(changed.materials["dragon-scale"].colors.red.label, "Crimson");
  assert.equal(changed.materials["dragon-scale"].tierBonuses[4], 9);
  assert.deepEqual(changed.materials["dragon-scale"].allowedBaseMaterials, ["metal", "leather"]);
});
