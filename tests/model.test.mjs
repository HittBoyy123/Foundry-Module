import assert from "node:assert/strict";
import test from "node:test";

import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import {
  ConfigValidationError,
  calculateItemEffects,
  getTierPresentation,
  insertTierLabel,
  itemTypeIsSupported,
  normalizeItemFlags,
  normalizeRulesConfig,
} from "../scripts/model.js";

const config = normalizeRulesConfig(cloneDefaultRulesConfig());

function calculate(flags, overrides = {}) {
  return calculateItemEffects({
    itemType: "weapon",
    itemId: "abc123",
    itemName: "Test Sword",
    flags,
    config,
    ...overrides,
  });
}

test("default tiers resolve from +0 through +5", () => {
  for (let tier = 1; tier <= 6; tier += 1) {
    const result = calculate({ material: "metal", tier });
    assert.equal(result.tierBonus, tier - 1);
    assert.equal(result.rules.length, tier === 1 ? 0 : 1);
  }
});

test("supplied tier names and prices resolve for every material", () => {
  const priceSchedule = [0, 10, 25, 100, 1000, 5000];
  const raritySchedule = ["common", "uncommon", "rare", "unique", "unique", "unique"];
  const expectedLabels = {
    metal: ["Iron", "Steel", "Cold Iron", "Mithril", "Adamantium", "Dark Iron"],
    wood: ["Softwood", "Hardwood", "Blackwood", "Darkmoon", "Starwood", "Godwood"],
    stone: ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythical"],
    leather: ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythical"],
    "dragon-scale": ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythical"],
    herbs: ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythical"],
    "mana-crystals": ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythical"],
  };
  for (const [material, labels] of Object.entries(expectedLabels)) {
    for (let tier = 1; tier <= 6; tier += 1) {
      assert.deepEqual(getTierPresentation(config, material, tier), {
        label: labels[tier - 1],
        priceGp: priceSchedule[tier - 1],
        rarity: raritySchedule[tier - 1],
      });
    }
  }
});

test("material-specific names and prices can override shared tier placeholders", () => {
  const customized = cloneDefaultRulesConfig();
  customized.materials.metal.tierLabels = { 2: "Cold Iron" };
  customized.materials.metal.tierPricesGp = { 2: 18 };
  const customConfig = normalizeRulesConfig(customized);
  assert.deepEqual(getTierPresentation(customConfig, "metal", 2), {
    label: "Cold Iron",
    priceGp: 18,
    rarity: "uncommon",
  });
  assert.deepEqual(getTierPresentation(customConfig, "wood", 2), {
    label: "Hardwood",
    priceGp: 10,
    rarity: "uncommon",
  });
});

test("tier label is inserted between PF2e rune text and the source item name", () => {
  assert.equal(
    insertTierLabel("+1 Striking Bastard Sword", "Bastard Sword", "Steel"),
    "+1 Striking Steel Bastard Sword",
  );
  assert.equal(
    insertTierLabel("+1 Striking Steel Bastard Sword", "Bastard Sword", "Steel"),
    "+1 Striking Steel Bastard Sword",
  );
});

test("weapon rule is item-specific, untyped, and leaves input config unchanged", () => {
  const before = JSON.stringify(config);
  const result = calculate({ material: "wood", tier: 4 });
  assert.deepEqual(result.rules[0].selector, ["{item|_id}-attack"]);
  assert.equal(result.rules[0].type, "untyped");
  assert.equal(result.rules[0].value, 3);
  assert.match(result.rules[0].label, /Wood/);
  assert.equal(JSON.stringify(config), before);
});

test("legacy enable and override fields are ignored", () => {
  const result = calculate({ enabled: false, material: "stone", tier: 2, bonusOverride: 7 });
  assert.equal(result.tierBonus, 1);
  assert.equal(result.rules[0].value, 1);
  assert.deepEqual(result.flags, {
    schemaVersion: 3,
    material: "stone",
    tier: 2,
    dragonScale: { color: "", tier: 1 },
  });
});

test("unconfigured and unsupported items receive no effects", () => {
  assert.equal(calculate(undefined).rules.length, 0);
  assert.equal(calculate(
    { material: "metal", tier: 6 },
    { itemType: "consumable" },
  ).rules.length, 0);
  assert.equal(itemTypeIsSupported(config, "consumable"), false);
});

test("base crafting materials support armor and apply only the AC effect", () => {
  for (const material of Object.keys(config.materials).filter((id) => id !== "dragon-scale")) {
    const result = calculateItemEffects({
      itemType: "armor",
      itemId: "armor1",
      itemName: "Test Armor",
      flags: { material, tier: 3 },
      config,
    });
    assert.equal(itemTypeIsSupported(config, "armor"), true);
    assert.equal(result.rules.length, 1);
    assert.equal(result.rules[0].value, 2);
    assert.deepEqual(result.rules[0].selector, ["ac"]);
  }
});

test("item flags are clamped and normalized", () => {
  assert.deepEqual(normalizeItemFlags({ material: "missing", tier: 99 }, config), {
    schemaVersion: 3,
    material: "missing",
    tier: 6,
    dragonScale: { color: "", tier: 1 },
  });
});

test("dragon scales add editable armor resistance without replacing the base material", () => {
  const customized = cloneDefaultRulesConfig();
  customized.materials["dragon-scale"].tierBonuses[3] = 7;
  const dragonConfig = normalizeRulesConfig(customized);
  const result = calculateItemEffects({
    itemType: "armor",
    itemId: "armor-dragon",
    itemName: "Breastplate",
    flags: {
      material: "metal",
      tier: 2,
      dragonScale: { color: "red", tier: 3 },
    },
    config: dragonConfig,
  });

  assert.equal(result.material.label, "Metal");
  assert.equal(result.dragonScale.colorLabel, "Red");
  assert.equal(result.dragonScale.damageType, "fire");
  assert.equal(result.dragonScale.resistance, 7);
  assert.deepEqual(result.rules.find((rule) => rule.key === "Resistance"), {
    key: "Resistance",
    type: "fire",
    value: 7,
  });
  assert.equal(result.rules.find((rule) => rule.key === "FlatModifier").value, 1);
  assert.equal(result.priceGp, 35);
  assert.equal(result.effectiveRarity, "rare");
});

test("dragon-scale resistance is armor-only and limited to metal or leather bases", () => {
  const customized = cloneDefaultRulesConfig();
  customized.materials["dragon-scale"].tierBonuses[2] = 4;
  const dragonConfig = normalizeRulesConfig(customized);
  const flags = { material: "wood", tier: 2, dragonScale: { color: "white", tier: 2 } };
  const woodenArmor = calculateItemEffects({
    itemType: "armor",
    itemId: "wood-armor",
    itemName: "Wooden Armor",
    flags,
    config: dragonConfig,
  });
  assert.equal(woodenArmor.dragonScale, null);
  assert.equal(woodenArmor.rules.some((rule) => rule.key === "Resistance"), false);

  const metalWeapon = calculateItemEffects({
    itemType: "weapon",
    itemId: "metal-weapon",
    itemName: "Sword",
    flags: { ...flags, material: "metal" },
    config: dragonConfig,
  });
  assert.equal(metalWeapon.dragonScale, null);
  assert.equal(metalWeapon.rules.some((rule) => rule.key === "Resistance"), false);
});

test("invalid configuration is rejected before saving", () => {
  const invalid = cloneDefaultRulesConfig();
  invalid.materials.metal.effects[0].modifierType = "crafting";
  assert.throws(() => normalizeRulesConfig(invalid), ConfigValidationError);
  assert.throws(() => normalizeRulesConfig("{not json"), ConfigValidationError);
});

test("version 1 rules migrate without discarding customized materials", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 1;
  delete legacy.tierLabels;
  delete legacy.tierPricesGp;
  legacy.materials.metal.label = "Custom Metal";
  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 8);
  assert.equal(migrated.materials.metal.label, "Custom Metal");
  assert.equal(migrated.tierLabels[3], "Rare");
  assert.equal(migrated.tierPricesGp[3], 25);
  assert.equal(migrated.materials.metal.tierLabels[3], "Cold Iron");
  assert.equal(migrated.materials.metal.tierPricesGp[3], 25);
});

test("version 2 defaults migrate while existing material-specific overrides are preserved", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 2;
  legacy.tierLabels = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3", 4: "Tier 4", 5: "Tier 5", 6: "Tier 6" };
  legacy.tierPricesGp = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
  for (const material of Object.values(legacy.materials)) {
    delete material.tierLabels;
    delete material.tierPricesGp;
  }
  legacy.materials.metal.tierLabels = { 4: "Moonsteel" };
  legacy.materials.metal.tierPricesGp = { 4: 777 };

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 8);
  assert.equal(migrated.tierLabels[4], "Epic");
  assert.equal(migrated.tierPricesGp[4], 100);
  assert.equal(migrated.materials.metal.tierLabels[4], "Moonsteel");
  assert.equal(migrated.materials.metal.tierPricesGp[4], 777);
  assert.equal(migrated.materials.wood.tierLabels[4], "Darkmoon");
  assert.equal(migrated.materials.wood.itemTypes.includes("armor"), true);
  assert.equal(migrated.materials.wood.effects.some((effect) => effect.id === "armor-ac"), true);
});

test("version 3 weapon-only rules migrate to item-scoped weapon and armor effects", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 3;
  delete legacy.tierRarities;
  delete legacy.flanking;
  for (const material of Object.values(legacy.materials)) {
    material.itemTypes = ["weapon"];
    material.effects = material.effects
      .filter((effect) => effect.id === "weapon-attack")
      .map((effect) => {
        const source = structuredClone(effect);
        delete source.itemTypes;
        return source;
      });
  }

  const migrated = normalizeRulesConfig(legacy);
  const metal = migrated.materials.metal;
  const weaponEffect = metal.effects.find((effect) => effect.id === "weapon-attack");
  const armorEffect = metal.effects.find((effect) => effect.id === "armor-ac");
  assert.equal(migrated.schemaVersion, 8);
  assert.deepEqual(migrated.tierRarities, {
    1: "common",
    2: "uncommon",
    3: "rare",
    4: "unique",
    5: "unique",
    6: "unique",
  });
  assert.deepEqual(metal.itemTypes, ["weapon", "armor"]);
  assert.deepEqual(weaponEffect.itemTypes, ["weapon"]);
  assert.deepEqual(armorEffect.itemTypes, ["armor"]);
  assert.deepEqual(migrated.flanking.penalties, { 2: -2, 3: -3, 4: -4 });
  assert.equal(migrated.flanking.pf2eHandlesTwoSidedFlanking, true);
  assert.equal(migrated.flanking.stackWithOffGuard, true);
});

test("version 4 flanking rules migrate to PF2e-managed two-sided flanking", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 4;
  delete legacy.flanking.pf2eHandlesTwoSidedFlanking;

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 8);
  assert.deepEqual(migrated.flanking.penalties, { 2: -2, 3: -3, 4: -4 });
  assert.equal(migrated.flanking.pf2eHandlesTwoSidedFlanking, true);
});

test("version 5 rules migrate with both in-game systems enabled", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 5;
  delete legacy.crafting;

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 8);
  assert.equal(migrated.hexploration.enabled, true);
  assert.equal(migrated.crafting.enabled, true);
  assert.equal(migrated.flanking.enabled, true);
});

test("version 6 control-panel rules migrate with Hexploration enabled", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 6;
  delete legacy.hexploration;

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 8);
  assert.equal(migrated.hexploration.enabled, true);
  assert.deepEqual(migrated.hexploration.activityThresholds, [
    { maxSpeed: 10, activities: 0.5 },
    { maxSpeed: 25, activities: 1 },
    { maxSpeed: 40, activities: 2 },
    { maxSpeed: 55, activities: 3 },
    { maxSpeed: null, activities: 4 },
  ]);
});

test("version 7 dragon scale material migrates to an armor augmentation", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 7;
  const dragonScale = legacy.materials["dragon-scale"];
  delete dragonScale.augmentation;
  delete dragonScale.allowedBaseMaterials;
  delete dragonScale.colors;
  delete dragonScale.tierBonuses;
  dragonScale.itemTypes = ["weapon", "armor"];
  dragonScale.effects = structuredClone(legacy.materials.metal.effects);

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 8);
  assert.equal(migrated.materials["dragon-scale"].augmentation, true);
  assert.deepEqual(migrated.materials["dragon-scale"].itemTypes, ["armor"]);
  assert.deepEqual(migrated.materials["dragon-scale"].allowedBaseMaterials, ["metal", "leather"]);
  assert.equal(migrated.materials["dragon-scale"].colors.red.damageType, "fire");
  assert.equal(migrated.materials["dragon-scale"].effects.length, 0);
  assert.equal(migrated.materials["dragon-scale"].tierBonuses[6], 0);
});

test("crafting master switch hides controls and disables prepared effects", () => {
  const disabled = cloneDefaultRulesConfig();
  disabled.crafting.enabled = false;
  const normalized = normalizeRulesConfig(disabled);
  assert.equal(itemTypeIsSupported(normalized, "weapon"), false);
  assert.equal(calculate({ material: "metal", tier: 6 }, { config: normalized }).active, false);
});

test("rarity schedule can be configured globally or per material", () => {
  const customized = cloneDefaultRulesConfig();
  customized.tierRarities[5] = "rare";
  customized.materials.metal.tierRarities = { 5: "unique" };
  const rarityConfig = normalizeRulesConfig(customized);
  assert.equal(getTierPresentation(rarityConfig, "wood", 5).rarity, "rare");
  assert.equal(getTierPresentation(rarityConfig, "metal", 5).rarity, "unique");

  customized.tierRarities[2] = "legendary";
  assert.throws(() => normalizeRulesConfig(customized), ConfigValidationError);
});

test("custom flanking configuration is validated", () => {
  const customized = cloneDefaultRulesConfig();
  customized.flanking.penalties[3] = -5;
  customized.flanking.penalties[4] = -6;
  customized.flanking.oversizedParticipantsPerSide = 3;
  const normalized = normalizeRulesConfig(customized);
  assert.equal(normalized.flanking.penalties[3], -5);
  assert.equal(normalized.flanking.penalties[4], -6);
  assert.equal(normalized.flanking.oversizedParticipantsPerSide, 3);
  assert.equal(normalized.flanking.pf2eHandlesTwoSidedFlanking, true);

  customized.flanking.penalties[2] = 2;
  assert.throws(() => normalizeRulesConfig(customized), ConfigValidationError);

  const nonEscalating = cloneDefaultRulesConfig();
  nonEscalating.flanking.penalties[3] = -1;
  assert.throws(() => normalizeRulesConfig(nonEscalating), ConfigValidationError);
});

test("custom Hexploration thresholds are validated", () => {
  const customized = cloneDefaultRulesConfig();
  customized.hexploration.activityThresholds[1].activities = 1.5;
  customized.hexploration.milesPerDayMultiplier = 1;
  const normalized = normalizeRulesConfig(customized);
  assert.equal(normalized.hexploration.activityThresholds[1].activities, 1.5);
  assert.equal(normalized.hexploration.milesPerDayMultiplier, 1);

  customized.hexploration.activityThresholds[2].maxSpeed = 20;
  assert.throws(() => normalizeRulesConfig(customized), ConfigValidationError);
});
