import {
  DEFAULT_ITEM_FLAGS,
  DEFAULT_FLANKING_CONFIG,
  DEFAULT_HEXPLORATION_CONFIG,
  DEFAULT_RULES_CONFIG,
  DEFAULT_TIER_LABELS,
  DEFAULT_TIER_PRICES_GP,
  DEFAULT_TIER_RARITIES,
  DRAGON_SCALE_TIER_LABELS,
  ITEM_SCHEMA_VERSION,
  RULES_SCHEMA_VERSION,
  cloneDefaultRulesConfig,
} from "./constants.js";

const MODIFIER_TYPES = new Set([
  "ability",
  "circumstance",
  "item",
  "potency",
  "proficiency",
  "status",
  "untyped",
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ITEM_TYPE_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
const RARITIES = new Set(["common", "uncommon", "rare", "unique"]);
const RARITY_RANKS = Object.freeze({ common: 0, uncommon: 1, rare: 2, unique: 3 });
const MIN_VALUE = -100;
const MAX_VALUE = 100;
const MAX_PRICE_GP = 1_000_000_000;
const MATERIALS_WITH_RENAMED_TIERS = new Set(["stone", "leather", "herbs", "mana-crystals"]);
const LEGACY_TIER_LABELS = Object.freeze({
  1: "Tier 1",
  2: "Tier 2",
  3: "Tier 3",
  4: "Tier 4",
  5: "Tier 5",
  6: "Tier 6",
});
const LEGACY_TIER_PRICES_GP = Object.freeze({ 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 });
const LEGACY_MATERIAL_LABELS = Object.freeze({
  metal: "Metal",
  wood: "Wood",
  stone: "Stone",
  leather: "Leather",
  "dragon-scale": "Dragon Scale",
  herbs: "Herbs",
  "mana-crystals": "Mana Crystals",
});

export class ConfigValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function copyJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function finiteNumber(value, path, { integer = false, fallback } = {}) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    if (fallback !== undefined) return fallback;
    throw new ConfigValidationError(`${path} must be a finite number.`);
  }
  if (integer && !Number.isInteger(number)) {
    throw new ConfigValidationError(`${path} must be an integer.`);
  }
  if (number < MIN_VALUE || number > MAX_VALUE) {
    throw new ConfigValidationError(`${path} must be between ${MIN_VALUE} and ${MAX_VALUE}.`);
  }
  return number;
}

function nonBlankString(value, path) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ConfigValidationError(`${path} must be a non-blank string.`);
  }
  return value.trim();
}

function nonNegativePrice(value, path) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0 || number > MAX_PRICE_GP) {
    throw new ConfigValidationError(`${path} must be a number between 0 and ${MAX_PRICE_GP}.`);
  }
  const copper = Math.round(number * 100);
  if (Math.abs(number - (copper / 100)) > Number.EPSILON) {
    throw new ConfigValidationError(`${path} cannot use fractions smaller than one copper piece (0.01 gp).`);
  }
  return copper / 100;
}

function normalizeTierLabels(source, path, { partial = false } = {}) {
  if (!isPlainObject(source)) {
    throw new ConfigValidationError(`${path} must be an object.`);
  }
  const labels = {};
  for (let tier = 1; tier <= 6; tier += 1) {
    if (source[tier] === undefined && partial) continue;
    labels[tier] = nonBlankString(source[tier], `${path}.${tier}`);
  }
  return labels;
}

function normalizeTierBonuses(source, path, { partial = false } = {}) {
  if (!isPlainObject(source)) {
    throw new ConfigValidationError(`${path} must be an object.`);
  }
  const bonuses = {};
  for (let tier = 1; tier <= 6; tier += 1) {
    if (source[tier] === undefined && partial) continue;
    bonuses[tier] = finiteNumber(source[tier], `${path}.${tier}`);
  }
  return bonuses;
}

function normalizeTierPrices(source, path, { partial = false } = {}) {
  if (!isPlainObject(source)) {
    throw new ConfigValidationError(`${path} must be an object.`);
  }
  const prices = {};
  for (let tier = 1; tier <= 6; tier += 1) {
    if (source[tier] === undefined && partial) continue;
    prices[tier] = nonNegativePrice(source[tier], `${path}.${tier}`);
  }
  return prices;
}

function normalizeTierRarities(source, path, { partial = false } = {}) {
  if (!isPlainObject(source)) {
    throw new ConfigValidationError(`${path} must be an object.`);
  }
  const rarities = {};
  for (let tier = 1; tier <= 6; tier += 1) {
    if (source[tier] === undefined && partial) continue;
    const rarity = nonBlankString(source[tier], `${path}.${tier}`).toLowerCase();
    if (!RARITIES.has(rarity)) {
      throw new ConfigValidationError(`${path}.${tier} must be common, uncommon, rare, or unique.`);
    }
    rarities[tier] = rarity;
  }
  return rarities;
}

function normalizeItemTypes(value, path) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ConfigValidationError(`${path} must contain at least one item type.`);
  }
  return [...new Set(value.map((itemType, index) => {
    const normalized = nonBlankString(itemType, `${path}[${index}]`);
    if (!ITEM_TYPE_PATTERN.test(normalized)) {
      throw new ConfigValidationError(`${path}[${index}] is not a valid item type.`);
    }
    return normalized;
  }))];
}

function normalizeMaterialIds(value, path) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ConfigValidationError(`${path} must contain at least one material id.`);
  }
  return [...new Set(value.map((materialId, index) => {
    const normalized = nonBlankString(materialId, `${path}[${index}]`).toLowerCase();
    if (!SLUG_PATTERN.test(normalized)) {
      throw new ConfigValidationError(`${path}[${index}] must be a lowercase material slug.`);
    }
    return normalized;
  }))];
}

function normalizeDragonScaleColors(value, path) {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    throw new ConfigValidationError(`${path} must contain at least one dragon color.`);
  }
  const colors = {};
  for (const [colorId, color] of Object.entries(value)) {
    if (!SLUG_PATTERN.test(colorId) || !isPlainObject(color)) {
      throw new ConfigValidationError(`${path}.${colorId} must be a dragon-color definition with a slug id.`);
    }
    const damageType = nonBlankString(color.damageType, `${path}.${colorId}.damageType`).toLowerCase();
    if (!SLUG_PATTERN.test(damageType)) {
      throw new ConfigValidationError(`${path}.${colorId}.damageType must be a lowercase PF2e damage-type slug.`);
    }
    colors[colorId] = {
      label: nonBlankString(color.label, `${path}.${colorId}.label`),
      damageType,
    };
  }
  return colors;
}

function tierMapMatches(source, expected) {
  return isPlainObject(source) && [1, 2, 3, 4, 5, 6].every((tier) => source[tier] === expected[tier]);
}

function normalizeFlankingConfig(source) {
  if (!isPlainObject(source)) {
    throw new ConfigValidationError("flanking must be an object.");
  }
  if (!isPlainObject(source.penalties)) {
    throw new ConfigValidationError("flanking.penalties must contain entries for 2, 3, and 4 sides.");
  }
  const penalties = {};
  for (let sides = 2; sides <= 4; sides += 1) {
    const penalty = finiteNumber(source.penalties[sides], `flanking.penalties.${sides}`, { integer: true });
    if (penalty > 0) {
      throw new ConfigValidationError(`flanking.penalties.${sides} must be zero or negative.`);
    }
    penalties[sides] = penalty;
  }
  if (penalties[3] > penalties[2] || penalties[4] > penalties[3]) {
    throw new ConfigValidationError("flanking.penalties must stay the same or become more severe as sides increase.");
  }
  const maxNormalSizeDifference = finiteNumber(
    source.maxNormalSizeDifference ?? 1,
    "flanking.maxNormalSizeDifference",
    { integer: true },
  );
  if (maxNormalSizeDifference < 0 || maxNormalSizeDifference > 5) {
    throw new ConfigValidationError("flanking.maxNormalSizeDifference must be between 0 and 5.");
  }
  const oversizedParticipantsPerSide = finiteNumber(
    source.oversizedParticipantsPerSide ?? 2,
    "flanking.oversizedParticipantsPerSide",
    { integer: true },
  );
  if (oversizedParticipantsPerSide < 2 || oversizedParticipantsPerSide > 8) {
    throw new ConfigValidationError("flanking.oversizedParticipantsPerSide must be between 2 and 8.");
  }
  return {
    enabled: source.enabled !== false,
    penalties,
    maxNormalSizeDifference,
    oversizedParticipantsPerSide,
    requireOppositeSidesForTwo: source.requireOppositeSidesForTwo !== false,
    pf2eHandlesTwoSidedFlanking: source.pf2eHandlesTwoSidedFlanking !== false,
    stackWithOffGuard: source.stackWithOffGuard !== false,
  };
}

function normalizeHexplorationConfig(source) {
  if (!isPlainObject(source)) {
    throw new ConfigValidationError("hexploration must be an object.");
  }
  if (!Array.isArray(source.activityThresholds) || source.activityThresholds.length === 0) {
    throw new ConfigValidationError("hexploration.activityThresholds must contain at least one row.");
  }
  let previousMax = -Infinity;
  const activityThresholds = source.activityThresholds.map((entry, index, entries) => {
    if (!isPlainObject(entry)) {
      throw new ConfigValidationError(`hexploration.activityThresholds[${index}] must be an object.`);
    }
    const isFinal = index === entries.length - 1;
    const maxSpeed = entry.maxSpeed === null ? null : Number(entry.maxSpeed);
    if (maxSpeed === null && !isFinal) {
      throw new ConfigValidationError("Only the final Hexploration speed threshold can have no maximum.");
    }
    if (maxSpeed !== null && (!Number.isInteger(maxSpeed) || maxSpeed < 0 || maxSpeed > 1000)) {
      throw new ConfigValidationError(`hexploration.activityThresholds[${index}].maxSpeed must be 0–1000 or null.`);
    }
    if (maxSpeed !== null && maxSpeed <= previousMax) {
      throw new ConfigValidationError("Hexploration speed thresholds must be in ascending order.");
    }
    if (maxSpeed !== null) previousMax = maxSpeed;
    const activities = Number(entry.activities);
    if (!Number.isFinite(activities) || activities <= 0 || activities > 10) {
      throw new ConfigValidationError(`hexploration.activityThresholds[${index}].activities must be between 0 and 10.`);
    }
    return { maxSpeed, activities };
  });
  if (activityThresholds.at(-1)?.maxSpeed !== null) {
    throw new ConfigValidationError("The final Hexploration speed threshold must have maxSpeed set to null.");
  }
  const milesPerHourDivisor = Number(source.milesPerHourDivisor ?? 10);
  const milesPerDayMultiplier = Number(source.milesPerDayMultiplier ?? 0.8);
  if (!Number.isFinite(milesPerHourDivisor) || milesPerHourDivisor <= 0 || milesPerHourDivisor > 100) {
    throw new ConfigValidationError("hexploration.milesPerHourDivisor must be greater than 0 and no more than 100.");
  }
  if (!Number.isFinite(milesPerDayMultiplier) || milesPerDayMultiplier < 0 || milesPerDayMultiplier > 100) {
    throw new ConfigValidationError("hexploration.milesPerDayMultiplier must be between 0 and 100.");
  }
  return {
    enabled: source.enabled !== false,
    activityThresholds,
    milesPerHourDivisor,
    milesPerDayMultiplier,
  };
}

function normalizeSelectors(value, path) {
  const selectors = typeof value === "string" ? [value] : value;
  if (!Array.isArray(selectors) || selectors.length === 0) {
    throw new ConfigValidationError(`${path} must contain at least one selector.`);
  }
  return [...new Set(selectors.map((selector, index) => nonBlankString(selector, `${path}[${index}]`)))];
}

function normalizeValue(value, path) {
  if (value === undefined || value === "tierBonus") {
    return { mode: "tierBonus", multiplier: 1, offset: 0 };
  }
  if (value === "tier") {
    return { mode: "tier", multiplier: 1, offset: 0 };
  }
  if (typeof value === "number") {
    return { mode: "fixed", value: finiteNumber(value, path) };
  }
  if (!isPlainObject(value)) {
    throw new ConfigValidationError(`${path} must be a number, "tierBonus", "tier", or a value object.`);
  }

  const mode = value.mode ?? "tierBonus";
  if (mode === "fixed") {
    return { mode, value: finiteNumber(value.value, `${path}.value`) };
  }
  if (!new Set(["tierBonus", "tier"]).has(mode)) {
    throw new ConfigValidationError(`${path}.mode must be "tierBonus", "tier", or "fixed".`);
  }
  return {
    mode,
    multiplier: finiteNumber(value.multiplier ?? 1, `${path}.multiplier`),
    offset: finiteNumber(value.offset ?? 0, `${path}.offset`),
  };
}

function normalizeEffect(effect, path) {
  if (!isPlainObject(effect)) {
    throw new ConfigValidationError(`${path} must be an object.`);
  }
  const kind = effect.kind ?? "flatModifier";
  if (kind !== "flatModifier") {
    throw new ConfigValidationError(`${path}.kind currently supports only "flatModifier".`);
  }
  const id = nonBlankString(effect.id, `${path}.id`);
  if (!SLUG_PATTERN.test(id)) {
    throw new ConfigValidationError(`${path}.id must be a lowercase slug (for example, "weapon-attack").`);
  }
  const modifierType = effect.modifierType ?? "untyped";
  if (!MODIFIER_TYPES.has(modifierType)) {
    throw new ConfigValidationError(`${path}.modifierType is not a PF2e modifier type.`);
  }

  const normalized = {
    id,
    kind,
    enabled: effect.enabled !== false,
    label: typeof effect.label === "string" && effect.label.trim()
      ? effect.label.trim()
      : "Crafted {material} (Tier {tier})",
    selectors: normalizeSelectors(effect.selectors ?? effect.selector, `${path}.selectors`),
    modifierType,
    value: normalizeValue(effect.value, `${path}.value`),
  };

  if (effect.itemTypes !== undefined) {
    normalized.itemTypes = normalizeItemTypes(effect.itemTypes, `${path}.itemTypes`);
  }

  if (effect.predicate !== undefined) {
    if (!Array.isArray(effect.predicate) && !isPlainObject(effect.predicate)) {
      throw new ConfigValidationError(`${path}.predicate must be an array or object.`);
    }
    normalized.predicate = copyJson(effect.predicate);
  }
  if (typeof effect.force === "boolean") normalized.force = effect.force;
  if (typeof effect.hideIfDisabled === "boolean") normalized.hideIfDisabled = effect.hideIfDisabled;
  return normalized;
}

export function normalizeRulesConfig(input) {
  if (input === undefined || input === null || input === "") return cloneDefaultRulesConfig();
  const parsed = typeof input === "string" ? (() => {
    try {
      return JSON.parse(input);
    } catch (error) {
      throw new ConfigValidationError(`The rules configuration is not valid JSON: ${error.message}`);
    }
  })() : input;

  if (!isPlainObject(parsed)) {
    throw new ConfigValidationError("The rules configuration must be an object.");
  }
  const sourceSchemaVersion = Number(parsed.schemaVersion ?? 1);
  if (!Number.isInteger(sourceSchemaVersion) || sourceSchemaVersion < 1 || sourceSchemaVersion > RULES_SCHEMA_VERSION) {
    throw new ConfigValidationError(`Unsupported rules schema version ${sourceSchemaVersion}.`);
  }

  if (parsed.crafting !== undefined && !isPlainObject(parsed.crafting)) {
    throw new ConfigValidationError("crafting must be an object.");
  }
  const crafting = {
    enabled: parsed.crafting?.enabled !== false,
  };
  if (parsed.gathering !== undefined && !isPlainObject(parsed.gathering)) {
    throw new ConfigValidationError("gathering must be an object.");
  }
  const gathering = {
    enabled: parsed.gathering?.enabled !== false,
    environmentId: typeof parsed.gathering?.environmentId === "string"
      && SLUG_PATTERN.test(parsed.gathering.environmentId)
      ? parsed.gathering.environmentId
      : DEFAULT_RULES_CONFIG.gathering.environmentId,
    maxTier: Math.min(6, Math.max(1, finiteNumber(
      parsed.gathering?.maxTier,
      "gathering.maxTier",
      { integer: true, fallback: DEFAULT_RULES_CONFIG.gathering.maxTier },
    ))),
  };
  const tierBonuses = normalizeTierBonuses(parsed.tierBonuses, "tierBonuses");
  const useNewTierLabels = sourceSchemaVersion < 3 && (
    parsed.tierLabels === undefined || tierMapMatches(parsed.tierLabels, LEGACY_TIER_LABELS)
  );
  const useNewTierPrices = sourceSchemaVersion < 3 && (
    parsed.tierPricesGp === undefined || tierMapMatches(parsed.tierPricesGp, LEGACY_TIER_PRICES_GP)
  );
  const tierLabels = normalizeTierLabels(
    useNewTierLabels ? DEFAULT_TIER_LABELS : parsed.tierLabels,
    "tierLabels",
  );
  const tierPricesGp = normalizeTierPrices(
    useNewTierPrices ? DEFAULT_TIER_PRICES_GP : parsed.tierPricesGp,
    "tierPricesGp",
  );
  const tierRarities = normalizeTierRarities(
    parsed.tierRarities ?? DEFAULT_TIER_RARITIES,
    "tierRarities",
  );
  const flanking = normalizeFlankingConfig(parsed.flanking ?? DEFAULT_FLANKING_CONFIG);
  const hexploration = normalizeHexplorationConfig(parsed.hexploration ?? DEFAULT_HEXPLORATION_CONFIG);

  if (!isPlainObject(parsed.materials) || Object.keys(parsed.materials).length === 0) {
    throw new ConfigValidationError("materials must contain at least one material definition.");
  }
  const materials = {};
  for (const [materialId, material] of Object.entries(parsed.materials)) {
    if (!SLUG_PATTERN.test(materialId)) {
      throw new ConfigValidationError(`Material id "${materialId}" must be a lowercase slug.`);
    }
    if (!isPlainObject(material)) {
      throw new ConfigValidationError(`materials.${materialId} must be an object.`);
    }
    const originalItemTypes = normalizeItemTypes(material.itemTypes, `materials.${materialId}.itemTypes`);
    const defaultMaterial = DEFAULT_RULES_CONFIG.materials[materialId];
    const isLegacyDragonScale = materialId === "dragon-scale" && sourceSchemaVersion < 8;
    const augmentation = material.augmentation === true || isLegacyDragonScale;
    let itemTypes = augmentation
      ? ["armor"]
      : sourceSchemaVersion < 4 && defaultMaterial
      ? [...new Set([...originalItemTypes, "armor"])]
      : originalItemTypes;
    if (!augmentation && sourceSchemaVersion < 10 && defaultMaterial?.itemTypes.includes("spellFocus")) {
      itemTypes = [...new Set([...itemTypes, "spellFocus"])];
    }
    if (!Array.isArray(material.effects)) {
      throw new ConfigValidationError(`materials.${materialId}.effects must be an array.`);
    }
    const effectSources = (augmentation ? [] : material.effects).map((effect) => (
      sourceSchemaVersion < 4 && isPlainObject(effect) && effect.itemTypes === undefined
        ? { ...effect, itemTypes: originalItemTypes }
        : effect
    ));
    const hasArmorEffect = effectSources.some((effect) => (
      isPlainObject(effect) && (
        effect.id === "armor-ac" ||
        [effect.selector, effect.selectors].flat().some((selector) => selector === "ac")
      )
    ));
    const defaultArmorEffect = defaultMaterial?.effects.find((effect) => effect.id === "armor-ac");
    if (!augmentation && sourceSchemaVersion < 4 && defaultArmorEffect && !hasArmorEffect) {
      effectSources.push(copyJson(defaultArmorEffect));
    }
    if (!augmentation && sourceSchemaVersion < 10) {
      const standardEffects = DEFAULT_RULES_CONFIG.materials.metal.effects;
      const migrationEffectIds = [
        (defaultMaterial?.itemTypes.includes("weapon") || originalItemTypes.includes("weapon"))
          ? "weapon-damage"
          : null,
        "spell-focus-potency",
      ].filter(Boolean);
      for (const effectId of migrationEffectIds) {
        if (effectSources.some((effect) => isPlainObject(effect) && effect.id === effectId)) continue;
        const template = standardEffects.find((effect) => effect.id === effectId);
        if (template) effectSources.push(copyJson(template));
      }
    }
    const effects = effectSources.map((effect, index) =>
      normalizeEffect(effect, `materials.${materialId}.effects[${index}]`));
    const duplicateEffect = effects.find((effect, index) => effects.findIndex((other) => other.id === effect.id) !== index);
    if (duplicateEffect) {
      throw new ConfigValidationError(`materials.${materialId} contains duplicate effect id "${duplicateEffect.id}".`);
    }
    const usesLegacyDragonScaleTierLabels = materialId === "dragon-scale"
      && sourceSchemaVersion < 9
      && (material.tierLabels === undefined || tierMapMatches(material.tierLabels, DEFAULT_TIER_LABELS));
    const usesGenericMaterialTierLabels = sourceSchemaVersion < 11
      && MATERIALS_WITH_RENAMED_TIERS.has(materialId)
      && defaultMaterial?.tierLabels;
    const renamedMaterialTierLabels = usesGenericMaterialTierLabels
      ? Object.fromEntries([1, 2, 3, 4, 5, 6].map((tier) => {
        const existing = material.tierLabels?.[tier];
        const label = existing === undefined || existing === DEFAULT_TIER_LABELS[tier]
          ? defaultMaterial.tierLabels[tier]
          : existing;
        return [tier, label];
      }))
      : undefined;
    const migratedTierLabels = usesLegacyDragonScaleTierLabels
      ? defaultMaterial?.tierLabels ?? DRAGON_SCALE_TIER_LABELS
      : renamedMaterialTierLabels
        ? renamedMaterialTierLabels
      : sourceSchemaVersion < 3 && material.tierLabels === undefined
        ? defaultMaterial?.tierLabels
        : undefined;
    const migratedTierPrices = sourceSchemaVersion < 3 ? defaultMaterial?.tierPricesGp : undefined;
    const tierLabelSource = migratedTierLabels ?? material.tierLabels;
    const tierLabelOverrides = tierLabelSource === undefined
      ? {}
      : normalizeTierLabels(
        tierLabelSource,
        `materials.${materialId}.tierLabels`,
        { partial: true },
      );
    const tierPriceOverrides = material.tierPricesGp === undefined && migratedTierPrices === undefined
      ? {}
      : normalizeTierPrices(
        material.tierPricesGp ?? migratedTierPrices,
        `materials.${materialId}.tierPricesGp`,
        { partial: true },
      );
    const tierRarityOverrides = material.tierRarities === undefined
      ? {}
      : normalizeTierRarities(
        material.tierRarities,
        `materials.${materialId}.tierRarities`,
        { partial: true },
      );
    const tierBonusSource = augmentation
      ? material.tierBonuses ?? defaultMaterial?.tierBonuses
      : material.tierBonuses;
    const tierBonusOverrides = tierBonusSource === undefined
      ? {}
      : normalizeTierBonuses(
        tierBonusSource,
        `materials.${materialId}.tierBonuses`,
        { partial: true },
      );
    const legacyLabel = LEGACY_MATERIAL_LABELS[materialId];
    const migratedLabel = sourceSchemaVersion < 3 && material.label === legacyLabel
      ? defaultMaterial?.label
      : material.label;
    const normalizedMaterial = {
      label: nonBlankString(migratedLabel ?? materialId, `materials.${materialId}.label`),
      enabled: material.enabled !== false,
      itemTypes,
      effects,
      ...(Object.keys(tierBonusOverrides).length > 0 ? { tierBonuses: tierBonusOverrides } : {}),
      ...(Object.keys(tierLabelOverrides).length > 0 ? { tierLabels: tierLabelOverrides } : {}),
      ...(Object.keys(tierPriceOverrides).length > 0 ? { tierPricesGp: tierPriceOverrides } : {}),
      ...(Object.keys(tierRarityOverrides).length > 0 ? { tierRarities: tierRarityOverrides } : {}),
    };
    if (augmentation) {
      normalizedMaterial.augmentation = true;
      normalizedMaterial.allowedBaseMaterials = normalizeMaterialIds(
        material.allowedBaseMaterials ?? defaultMaterial?.allowedBaseMaterials,
        `materials.${materialId}.allowedBaseMaterials`,
      );
      normalizedMaterial.colors = normalizeDragonScaleColors(
        material.colors ?? defaultMaterial?.colors,
        `materials.${materialId}.colors`,
      );
    }
    materials[materialId] = normalizedMaterial;
  }

  return {
    schemaVersion: RULES_SCHEMA_VERSION,
    crafting,
    gathering,
    tierBonuses,
    tierLabels,
    tierPricesGp,
    tierRarities,
    flanking,
    hexploration,
    materials,
  };
}

export function normalizeItemFlags(input, config = null) {
  const source = isPlainObject(input) ? input : {};
  const tierNumber = Number(source.tier ?? DEFAULT_ITEM_FLAGS.tier);
  const tier = Number.isInteger(tierNumber) ? Math.min(6, Math.max(1, tierNumber)) : DEFAULT_ITEM_FLAGS.tier;
  const material = typeof source.material === "string" && source.material.trim()
    ? source.material.trim()
    : DEFAULT_ITEM_FLAGS.material;
  const dragonScaleSource = isPlainObject(source.dragonScale) ? source.dragonScale : {};
  const dragonScaleTierNumber = Number(dragonScaleSource.tier ?? DEFAULT_ITEM_FLAGS.dragonScale.tier);
  const dragonScaleTier = Number.isInteger(dragonScaleTierNumber)
    ? Math.min(6, Math.max(1, dragonScaleTierNumber))
    : DEFAULT_ITEM_FLAGS.dragonScale.tier;
  const dragonScaleColor = typeof dragonScaleSource.color === "string"
    ? dragonScaleSource.color.trim().toLowerCase()
    : DEFAULT_ITEM_FLAGS.dragonScale.color;
  return {
    schemaVersion: ITEM_SCHEMA_VERSION,
    material,
    tier,
    dragonScale: {
      color: dragonScaleColor,
      tier: dragonScaleTier,
    },
  };
}

export function materialsForItemType(config, itemType) {
  if (config.crafting?.enabled === false) return [];
  return Object.entries(config.materials)
    .filter(([, material]) => !material.augmentation && material.enabled && material.itemTypes.includes(itemType))
    .map(([id, material]) => ({ id, label: material.label }));
}

export function itemTypeIsSupported(config, itemType) {
  return materialsForItemType(config, itemType).length > 0;
}

export function getCraftingItemType(item) {
  if (item?.type !== "equipment") return item?.type ?? null;
  const otherTags = item.system?.traits?.otherTags;
  const isSpellFocus = Array.isArray(otherTags)
    ? otherTags.includes("spell-focus")
    : otherTags?.has?.("spell-focus") === true;
  return isSpellFocus ? "spellFocus" : item.type;
}

export function getTierPresentation(config, materialId, tier) {
  const normalizedTier = Math.min(6, Math.max(1, Number(tier) || 1));
  const material = config.materials[materialId] ?? null;
  return {
    label: material?.tierLabels?.[normalizedTier] ?? config.tierLabels[normalizedTier],
    priceGp: material?.tierPricesGp?.[normalizedTier] ?? config.tierPricesGp[normalizedTier],
    rarity: material?.tierRarities?.[normalizedTier] ?? config.tierRarities[normalizedTier],
  };
}

export function insertTierLabel(generatedName, baseName, tierLabel) {
  const generated = String(generatedName ?? "").trim();
  const base = String(baseName ?? "").trim();
  const label = String(tierLabel ?? "").trim();
  if (!generated || !base || !label) return generated;

  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const suffix = new RegExp(`${escapedBase}$`, "iu");
  if (!suffix.test(generated)) return `${label} ${generated}`;

  const prefix = generated.replace(suffix, "").trim();
  if (prefix.endsWith(label)) return generated;
  return [prefix, label, base].filter(Boolean).join(" ");
}

function resolveValue(valueConfig, tier, tierBonus) {
  if (valueConfig.mode === "fixed") return valueConfig.value;
  const base = valueConfig.mode === "tier" ? tier : tierBonus;
  return (base * valueConfig.multiplier) + valueConfig.offset;
}

function formatLabel(template, context) {
  return template.replace(
    /\{(material|materialId|tier|tierLabel|bonus|item)\}/g,
    (_match, key) => String(context[key]),
  );
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "material-bonus";
}

function higherRarity(first, second) {
  return (RARITY_RANKS[second] ?? -1) > (RARITY_RANKS[first] ?? -1) ? second : first;
}

export function calculateItemEffects({ itemType, itemId, itemName, flags, config }) {
  const configured = isPlainObject(flags) && (typeof flags.material === "string" || flags.tier !== undefined);
  const normalizedFlags = normalizeItemFlags(flags, config);
  const material = config.materials[normalizedFlags.material] ?? null;
  const tierBonus = material?.tierBonuses?.[normalizedFlags.tier]
    ?? config.tierBonuses[normalizedFlags.tier]
    ?? 0;
  const presentation = getTierPresentation(config, normalizedFlags.material, normalizedFlags.tier);
  const inactive = config.crafting?.enabled === false
    || !configured
    || !material?.enabled
    || material?.augmentation
    || !material?.itemTypes.includes(itemType);
  if (inactive) {
    return {
      active: false,
      flags: normalizedFlags,
      material,
      tierBonus,
      presentation,
      dragonScale: null,
      effectiveRarity: presentation.rarity,
      priceGp: presentation.priceGp,
      previews: [],
      rules: [],
    };
  }

  const previews = material.effects
    .filter((effect) => effect.enabled && (!effect.itemTypes || effect.itemTypes.includes(itemType)))
    .map((effect) => {
      const value = resolveValue(effect.value, normalizedFlags.tier, tierBonus);
      const context = {
        material: material.label,
        materialId: normalizedFlags.material,
        tier: normalizedFlags.tier,
        tierLabel: presentation.label,
        bonus: value >= 0 ? `+${value}` : value,
        item: itemName,
      };
      return {
        ...effect,
        value,
        resolvedLabel: formatLabel(effect.label, context),
      };
    });

  const rules = previews
    .filter((effect) => effect.kind === "flatModifier" && effect.value !== 0)
    .map((effect) => {
      const rule = {
        key: "FlatModifier",
        slug: slugify(`craft-material-${normalizedFlags.material}-${effect.id}-${itemId}`),
        label: effect.resolvedLabel,
        selector: [...effect.selectors],
        type: effect.modifierType,
        value: effect.value,
      };
      if (effect.predicate !== undefined) rule.predicate = copyJson(effect.predicate);
      if (effect.force !== undefined) rule.force = effect.force;
      if (effect.hideIfDisabled !== undefined) rule.hideIfDisabled = effect.hideIfDisabled;
      return rule;
    });

  const dragonMaterial = config.materials["dragon-scale"];
  const dragonSelection = normalizedFlags.dragonScale;
  const dragonColor = dragonMaterial?.colors?.[dragonSelection.color];
  const dragonEligible = itemType === "armor"
    && dragonMaterial?.augmentation === true
    && dragonMaterial.enabled
    && dragonMaterial.allowedBaseMaterials.includes(normalizedFlags.material)
    && dragonColor;
  let dragonScale = null;
  if (dragonEligible) {
    const dragonPresentation = getTierPresentation(config, "dragon-scale", dragonSelection.tier);
    const resistance = dragonMaterial.tierBonuses?.[dragonSelection.tier] ?? 0;
    const name = `${dragonPresentation.label} ${dragonColor.label} Dragon Scale`;
    dragonScale = {
      colorId: dragonSelection.color,
      colorLabel: dragonColor.label,
      damageType: dragonColor.damageType,
      tier: dragonSelection.tier,
      resistance,
      name,
      presentation: dragonPresentation,
    };
    previews.push({
      id: "dragon-scale-resistance",
      kind: "resistance",
      label: `${name} (${dragonColor.damageType} resistance)`,
      value: resistance,
      damageType: dragonColor.damageType,
    });
    if (resistance > 0) {
      rules.push({
        key: "Resistance",
        type: dragonColor.damageType,
        value: resistance,
      });
    }
  }

  return {
    active: true,
    flags: normalizedFlags,
    material,
    tierBonus,
    presentation,
    dragonScale,
    effectiveRarity: dragonScale
      ? higherRarity(presentation.rarity, dragonScale.presentation.rarity)
      : presentation.rarity,
    priceGp: presentation.priceGp + (dragonScale?.presentation.priceGp ?? 0),
    previews,
    rules,
  };
}
