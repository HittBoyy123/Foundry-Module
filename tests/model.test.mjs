import assert from "node:assert/strict";
import test from "node:test";

import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import {
  ConfigValidationError,
  calculateItemEffects,
  getCraftingItemType,
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
    assert.equal(result.rules.length, tier === 1 ? 0 : 2);
    if (tier > 1) {
      const attack = result.rules.find((rule) => rule.selector.includes("{item|_id}-attack"));
      const damage = result.rules.find((rule) => rule.selector.includes("{item|_id}-damage"));
      assert.equal(attack.value, tier - 1);
      assert.equal(damage.value, (tier - 1) * 2);
    }
  }
});

test("supplied tier names and prices resolve for every material", () => {
  const priceSchedule = [0, 10, 25, 100, 1000, 5000];
  const raritySchedule = ["common", "uncommon", "rare", "unique", "unique", "unique"];
  const expectedLabels = {
    metal: ["Iron", "Steel", "Cold Iron", "Mithril", "Adamantium", "Dark Iron"],
    wood: ["Softwood", "Hardwood", "Blackwood", "Darkmoon", "Starwood", "Godwood"],
    stone: ["Fieldstone", "Granite", "Obsidian", "Runestone", "Celestite", "Worldstone"],
    leather: ["Rawhide", "Hardened Leather", "Ironhide", "Moonhide", "Titanhide", "Primordial Hide"],
    "dragon-scale": ["Hatchling", "Juvenile", "Youth", "Adult", "Ancient", "Arch Dragon"],
    herbs: ["Greenleaf", "Embercap", "Ghostmoss", "Moonbloom", "Starspore", "Worldroot"],
    "mana-crystals": ["Faint Mana Crystal", "Charged Mana Crystal", "Resonant Mana Crystal", "Arcane Prism", "Astral Crystal", "Aetherheart Crystal"],
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
  const attack = result.rules.find((rule) => rule.selector.includes("{item|_id}-attack"));
  const damage = result.rules.find((rule) => rule.selector.includes("{item|_id}-damage"));
  assert.deepEqual(attack.selector, ["{item|_id}-attack"]);
  assert.equal(attack.type, "untyped");
  assert.equal(attack.value, 3);
  assert.match(attack.label, /Wood/);
  assert.deepEqual(damage.selector, ["{item|_id}-damage"]);
  assert.equal(damage.type, "untyped");
  assert.equal(damage.value, 6);
  assert.equal(JSON.stringify(config), before);
});

test("metal and wood spell focuses apply their tier bonus to spell attacks and DCs", () => {
  const focusItem = {
    type: "equipment",
    system: { traits: { otherTags: ["spell-focus"] } },
  };
  assert.equal(getCraftingItemType(focusItem), "spellFocus");
  assert.equal(getCraftingItemType({ ...focusItem, system: { traits: { otherTags: [] } } }), "equipment");

  for (const material of ["metal", "wood"]) {
    const result = calculateItemEffects({
      itemType: "spellFocus",
      itemId: "focus1",
      itemName: "Spell Focus",
      flags: { material, tier: 5 },
      config,
    });
    assert.equal(result.active, true);
    assert.equal(result.rules.length, 1);
    assert.deepEqual(result.rules[0].selector, ["spell-attack", "spell-dc"]);
    assert.equal(result.rules[0].value, 4);
  }

  const stone = calculateItemEffects({
    itemType: "spellFocus",
    itemId: "focus2",
    itemName: "Spell Focus",
    flags: { material: "stone", tier: 5 },
    config,
  });
  assert.equal(stone.active, false);
  assert.equal(stone.rules.length, 0);

  const expanded = cloneDefaultRulesConfig();
  expanded.materials.stone.itemTypes.push("spellFocus");
  const expandedConfig = normalizeRulesConfig(expanded);
  const enabledStone = calculateItemEffects({
    itemType: "spellFocus",
    itemId: "focus3",
    itemName: "Spell Focus",
    flags: { material: "stone", tier: 5 },
    config: expandedConfig,
  });
  assert.equal(enabledStone.active, true);
  assert.equal(enabledStone.rules[0].value, 4);
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
  assert.equal(migrated.schemaVersion, 11);
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
  assert.equal(migrated.schemaVersion, 11);
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
  assert.equal(migrated.schemaVersion, 11);
  assert.deepEqual(migrated.tierRarities, {
    1: "common",
    2: "uncommon",
    3: "rare",
    4: "unique",
    5: "unique",
    6: "unique",
  });
  assert.deepEqual(metal.itemTypes, ["weapon", "armor", "spellFocus"]);
  assert.deepEqual(weaponEffect.itemTypes, ["weapon"]);
  assert.deepEqual(armorEffect.itemTypes, ["armor"]);
  assert.equal(metal.effects.some((effect) => effect.id === "weapon-damage"), true);
  assert.equal(metal.effects.some((effect) => effect.id === "spell-focus-potency"), true);
  assert.deepEqual(migrated.flanking.penalties, { 2: -2, 3: -3, 4: -4 });
  assert.equal(migrated.flanking.pf2eHandlesTwoSidedFlanking, true);
  assert.equal(migrated.flanking.stackWithOffGuard, true);
});

test("version 4 flanking rules migrate to PF2e-managed two-sided flanking", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 4;
  delete legacy.flanking.pf2eHandlesTwoSidedFlanking;

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 11);
  assert.deepEqual(migrated.flanking.penalties, { 2: -2, 3: -3, 4: -4 });
  assert.equal(migrated.flanking.pf2eHandlesTwoSidedFlanking, true);
});

test("version 5 rules migrate with both in-game systems enabled", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 5;
  delete legacy.crafting;

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 11);
  assert.equal(migrated.hexploration.enabled, true);
  assert.equal(migrated.crafting.enabled, true);
  assert.equal(migrated.flanking.enabled, true);
});

test("version 6 control-panel rules migrate with Hexploration enabled", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 6;
  delete legacy.hexploration;

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 11);
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
  assert.equal(migrated.schemaVersion, 11);
  assert.equal(migrated.materials["dragon-scale"].augmentation, true);
  assert.deepEqual(migrated.materials["dragon-scale"].itemTypes, ["armor"]);
  assert.deepEqual(migrated.materials["dragon-scale"].allowedBaseMaterials, ["metal", "leather"]);
  assert.equal(migrated.materials["dragon-scale"].colors.red.damageType, "fire");
  assert.equal(migrated.materials["dragon-scale"].effects.length, 0);
  assert.equal(migrated.materials["dragon-scale"].tierBonuses[6], 0);
});

test("version 8 default dragon-scale labels migrate to age tiers without replacing custom names", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 8;
  legacy.materials["dragon-scale"].tierLabels = {
    1: "Common",
    2: "Uncommon",
    3: "Rare",
    4: "Epic",
    5: "Legendary",
    6: "Mythical",
  };

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 11);
  assert.deepEqual(migrated.materials["dragon-scale"].tierLabels, {
    1: "Hatchling",
    2: "Juvenile",
    3: "Youth",
    4: "Adult",
    5: "Ancient",
    6: "Arch Dragon",
  });

  legacy.materials["dragon-scale"].tierLabels[2] = "Lesser Wyrm";
  const customized = normalizeRulesConfig(legacy);
  assert.equal(customized.materials["dragon-scale"].tierLabels[2], "Lesser Wyrm");
  assert.equal(customized.materials["dragon-scale"].tierLabels[6], "Mythical");
});

test("version 9 materials migrate to weapon damage and metal or wood spell focuses", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 9;
  for (const material of Object.values(legacy.materials)) {
    material.itemTypes = material.itemTypes.filter((type) => type !== "spellFocus");
    material.effects = material.effects.filter((effect) => !["weapon-damage", "spell-focus-potency"].includes(effect.id));
  }

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 11);
  for (const [materialId, material] of Object.entries(migrated.materials)) {
    if (material.augmentation) continue;
    assert.equal(material.effects.some((effect) => effect.id === "weapon-damage"), true, materialId);
    assert.equal(material.effects.some((effect) => effect.id === "spell-focus-potency"), true, materialId);
  }
  for (const materialId of ["metal", "wood"]) {
    const material = migrated.materials[materialId];
    assert.equal(material.itemTypes.includes("spellFocus"), true);
    assert.equal(material.effects.some((effect) => effect.id === "spell-focus-potency"), true);
  }
  assert.equal(migrated.materials.stone.itemTypes.includes("spellFocus"), false);
});

test("version 10 generic material labels migrate individually without replacing custom names", () => {
  const legacy = cloneDefaultRulesConfig();
  legacy.schemaVersion = 10;
  const generic = { 1: "Common", 2: "Uncommon", 3: "Rare", 4: "Epic", 5: "Legendary", 6: "Mythical" };
  for (const materialId of ["stone", "leather", "herbs", "mana-crystals"]) {
    legacy.materials[materialId].tierLabels = structuredClone(generic);
  }
  legacy.materials.leather.tierLabels[4] = "GM's Custom Hide";

  const migrated = normalizeRulesConfig(legacy);
  assert.equal(migrated.schemaVersion, 11);
  assert.deepEqual(migrated.materials.stone.tierLabels, {
    1: "Fieldstone",
    2: "Granite",
    3: "Obsidian",
    4: "Runestone",
    5: "Celestite",
    6: "Worldstone",
  });
  assert.equal(migrated.materials.leather.tierLabels[3], "Ironhide");
  assert.equal(migrated.materials.leather.tierLabels[4], "GM's Custom Hide");
  assert.equal(migrated.materials.herbs.tierLabels[6], "Worldroot");
  assert.equal(migrated.materials["mana-crystals"].tierLabels[5], "Astral Crystal");
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
