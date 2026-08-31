export const MODULE_ID = "pf2e-crafting-material-tiers";
export const MODULE_TITLE = "Wrathmaker";
export const RULES_SCHEMA_VERSION = 11;
export const ITEM_SCHEMA_VERSION = 3;
export const HEXPLORATION_PLAN_SCHEMA_VERSION = 4;

export const DEFAULT_ITEM_FLAGS = Object.freeze({
  schemaVersion: ITEM_SCHEMA_VERSION,
  material: "metal",
  tier: 1,
  dragonScale: Object.freeze({
    color: "",
    tier: 1,
  }),
});

const defaultWeaponEffect = () => ({
  id: "weapon-attack",
  kind: "flatModifier",
  label: "Crafted {material} ({tierLabel})",
  itemTypes: ["weapon"],
  selectors: ["{item|_id}-attack"],
  modifierType: "untyped",
  value: {
    mode: "tierBonus",
    multiplier: 1,
    offset: 0,
  },
});

const defaultWeaponDamageEffect = () => ({
  id: "weapon-damage",
  kind: "flatModifier",
  label: "Crafted {material} Damage ({tierLabel})",
  itemTypes: ["weapon"],
  selectors: ["{item|_id}-damage"],
  modifierType: "untyped",
  value: {
    mode: "tierBonus",
    multiplier: 2,
    offset: 0,
  },
});

const defaultArmorEffect = () => ({
  id: "armor-ac",
  kind: "flatModifier",
  label: "Crafted {material} Armor ({tierLabel})",
  itemTypes: ["armor"],
  selectors: ["ac"],
  modifierType: "untyped",
  value: {
    mode: "tierBonus",
    multiplier: 1,
    offset: 0,
  },
});

const defaultSpellFocusEffect = () => ({
  id: "spell-focus-potency",
  kind: "flatModifier",
  label: "Crafted {material} Spell Focus ({tierLabel})",
  itemTypes: ["spellFocus"],
  selectors: ["spell-attack", "spell-dc"],
  modifierType: "untyped",
  value: {
    mode: "tierBonus",
    multiplier: 1,
    offset: 0,
  },
});

const defaultEffects = () => Object.freeze([
  Object.freeze(defaultWeaponEffect()),
  Object.freeze(defaultWeaponDamageEffect()),
  Object.freeze(defaultArmorEffect()),
  Object.freeze(defaultSpellFocusEffect()),
]);

export const DEFAULT_TIER_LABELS = Object.freeze({
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Epic",
  5: "Legendary",
  6: "Mythical",
});

export const DRAGON_SCALE_TIER_LABELS = Object.freeze({
  1: "Hatchling",
  2: "Juvenile",
  3: "Youth",
  4: "Adult",
  5: "Ancient",
  6: "Arch Dragon",
});

export const DEFAULT_TIER_PRICES_GP = Object.freeze({
  1: 0,
  2: 10,
  3: 25,
  4: 100,
  5: 1000,
  6: 5000,
});

export const DEFAULT_TIER_RARITIES = Object.freeze({
  1: "common",
  2: "uncommon",
  3: "rare",
  4: "unique",
  5: "unique",
  6: "unique",
});

export const DEFAULT_FLANKING_CONFIG = Object.freeze({
  enabled: true,
  penalties: Object.freeze({
    2: -2,
    3: -3,
    4: -4,
  }),
  maxNormalSizeDifference: 1,
  oversizedParticipantsPerSide: 2,
  requireOppositeSidesForTwo: true,
  pf2eHandlesTwoSidedFlanking: true,
  stackWithOffGuard: true,
});

export const DEFAULT_HEXPLORATION_CONFIG = Object.freeze({
  enabled: true,
  activityThresholds: Object.freeze([
    Object.freeze({ maxSpeed: 10, activities: 0.5 }),
    Object.freeze({ maxSpeed: 25, activities: 1 }),
    Object.freeze({ maxSpeed: 40, activities: 2 }),
    Object.freeze({ maxSpeed: 55, activities: 3 }),
    Object.freeze({ maxSpeed: null, activities: 4 }),
  ]),
  milesPerHourDivisor: 10,
  milesPerDayMultiplier: 0.8,
});

const METAL_TIER_LABELS = Object.freeze({
  1: "Iron",
  2: "Steel",
  3: "Cold Iron",
  4: "Mithril",
  5: "Adamantium",
  6: "Dark Iron",
});

const WOOD_TIER_LABELS = Object.freeze({
  1: "Softwood",
  2: "Hardwood",
  3: "Blackwood",
  4: "Darkmoon",
  5: "Starwood",
  6: "Godwood",
});

const STONE_TIER_LABELS = Object.freeze({
  1: "Fieldstone",
  2: "Granite",
  3: "Obsidian",
  4: "Runestone",
  5: "Celestite",
  6: "Worldstone",
});

const LEATHER_TIER_LABELS = Object.freeze({
  1: "Rawhide",
  2: "Hardened Leather",
  3: "Ironhide",
  4: "Moonhide",
  5: "Titanhide",
  6: "Primordial Hide",
});

const HERB_TIER_LABELS = Object.freeze({
  1: "Greenleaf",
  2: "Embercap",
  3: "Ghostmoss",
  4: "Moonbloom",
  5: "Starspore",
  6: "Worldroot",
});

const MANA_CRYSTAL_TIER_LABELS = Object.freeze({
  1: "Faint Mana Crystal",
  2: "Charged Mana Crystal",
  3: "Resonant Mana Crystal",
  4: "Arcane Prism",
  5: "Astral Crystal",
  6: "Aetherheart Crystal",
});

const DRAGON_SCALE_RESISTANCE_VALUES = Object.freeze({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
});

const DRAGON_SCALE_COLORS = Object.freeze({
  black: Object.freeze({ label: "Black", damageType: "acid" }),
  blue: Object.freeze({ label: "Blue", damageType: "electricity" }),
  green: Object.freeze({ label: "Green", damageType: "poison" }),
  red: Object.freeze({ label: "Red", damageType: "fire" }),
  white: Object.freeze({ label: "White", damageType: "cold" }),
});

export const DEFAULT_RULES_CONFIG = Object.freeze({
  schemaVersion: RULES_SCHEMA_VERSION,
  crafting: Object.freeze({
    enabled: true,
  }),
  tierBonuses: Object.freeze({
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
  }),
  tierLabels: DEFAULT_TIER_LABELS,
  tierPricesGp: DEFAULT_TIER_PRICES_GP,
  tierRarities: DEFAULT_TIER_RARITIES,
  flanking: DEFAULT_FLANKING_CONFIG,
  hexploration: DEFAULT_HEXPLORATION_CONFIG,
  materials: Object.freeze({
    metal: Object.freeze({
      label: "Metal",
      enabled: true,
      itemTypes: Object.freeze(["weapon", "armor", "spellFocus"]),
      effects: defaultEffects(),
      tierLabels: METAL_TIER_LABELS,
      tierPricesGp: DEFAULT_TIER_PRICES_GP,
    }),
    wood: Object.freeze({
      label: "Wood",
      enabled: true,
      itemTypes: Object.freeze(["weapon", "armor", "spellFocus"]),
      effects: defaultEffects(),
      tierLabels: WOOD_TIER_LABELS,
      tierPricesGp: DEFAULT_TIER_PRICES_GP,
    }),
    stone: Object.freeze({
      label: "Stone",
      enabled: true,
      itemTypes: Object.freeze(["weapon", "armor"]),
      effects: defaultEffects(),
      tierLabels: STONE_TIER_LABELS,
      tierPricesGp: DEFAULT_TIER_PRICES_GP,
    }),
    leather: Object.freeze({
      label: "Leather / Hide",
      enabled: true,
      itemTypes: Object.freeze(["weapon", "armor"]),
      effects: defaultEffects(),
      tierLabels: LEATHER_TIER_LABELS,
      tierPricesGp: DEFAULT_TIER_PRICES_GP,
    }),
    "dragon-scale": Object.freeze({
      label: "Dragon Scales",
      enabled: true,
      augmentation: true,
      itemTypes: Object.freeze(["armor"]),
      allowedBaseMaterials: Object.freeze(["metal", "leather"]),
      effects: Object.freeze([]),
      colors: DRAGON_SCALE_COLORS,
      tierBonuses: DRAGON_SCALE_RESISTANCE_VALUES,
      tierLabels: DRAGON_SCALE_TIER_LABELS,
      tierPricesGp: DEFAULT_TIER_PRICES_GP,
    }),
    herbs: Object.freeze({
      label: "Herbs / Mushrooms",
      enabled: true,
      itemTypes: Object.freeze(["weapon", "armor"]),
      effects: defaultEffects(),
      tierLabels: HERB_TIER_LABELS,
      tierPricesGp: DEFAULT_TIER_PRICES_GP,
    }),
    "mana-crystals": Object.freeze({
      label: "Mana Crystals",
      enabled: true,
      itemTypes: Object.freeze(["weapon", "armor"]),
      effects: defaultEffects(),
      tierLabels: MANA_CRYSTAL_TIER_LABELS,
      tierPricesGp: DEFAULT_TIER_PRICES_GP,
    }),
  }),
});

export function cloneDefaultRulesConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_RULES_CONFIG));
}
