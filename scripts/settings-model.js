import { ConfigValidationError, getTierPresentation } from "./model.js";
import { GATHERING_ENVIRONMENT_SOURCES } from "../content/gathering-presets.js";
import { GATHERING_REWARD_DESTINATIONS } from "./gathering-destination.js";

const RARITIES = Object.freeze([
  Object.freeze({ value: "common", label: "Common" }),
  Object.freeze({ value: "uncommon", label: "Uncommon" }),
  Object.freeze({ value: "rare", label: "Rare" }),
  Object.freeze({ value: "unique", label: "Unique" }),
]);

const MODIFIER_TYPES = Object.freeze([
  Object.freeze({ value: "untyped", label: "Untyped" }),
  Object.freeze({ value: "item", label: "Item" }),
  Object.freeze({ value: "status", label: "Status" }),
  Object.freeze({ value: "circumstance", label: "Circumstance" }),
]);

const DAMAGE_TYPES = Object.freeze([
  "acid",
  "bleed",
  "bludgeoning",
  "cold",
  "electricity",
  "fire",
  "force",
  "mental",
  "piercing",
  "poison",
  "slashing",
  "sonic",
  "spirit",
  "vitality",
  "void",
]);

const ITEM_TYPE_LABELS = Object.freeze({
  weapon: "Weapons",
  armor: "Armor",
  spellFocus: "Spell Focuses",
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatList(values) {
  if (values.length < 2) return values[0] ?? "";
  if (values.length === 2) return values.join(" and ");
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function checked(value) {
  return value === true || value === 1 || value === "1" || value === "true" || value === "on";
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function expandDottedFormData(form) {
  if (!form || typeof form !== "object" || Array.isArray(form)) return {};
  const expanded = {};
  for (const [key, value] of Object.entries(form)) {
    const path = key.split(".");
    let target = expanded;
    for (let index = 0; index < path.length - 1; index += 1) {
      const segment = path[index];
      if (!target[segment] || typeof target[segment] !== "object" || Array.isArray(target[segment])) {
        target[segment] = {};
      }
      target = target[segment];
    }
    const finalKey = path.at(-1);
    if (path.length === 1 && value && typeof value === "object" && !Array.isArray(value)) {
      target[finalKey] = { ...(target[finalKey] ?? {}), ...clone(value) };
    } else {
      target[finalKey] = value;
    }
  }
  return expanded;
}

export function buildDashboardContext(config) {
  return {
    craftingEnabled: config.crafting?.enabled !== false,
    gatheringEnabled: config.gathering?.enabled !== false,
    gatheringEnvironments: GATHERING_ENVIRONMENT_SOURCES.map((environment) => ({
      id: environment.id,
      name: environment.name,
      selected: environment.id === config.gathering?.environmentId,
    })),
    gatheringTiers: Array.from({ length: 6 }, (_unused, index) => ({
      value: index + 1,
      selected: index + 1 === config.gathering?.maxTier,
    })),
    gatheringUsesSceneRegion: config.gathering?.useSceneRegion !== false,
    gatheringRewardDestinations: Object.entries(GATHERING_REWARD_DESTINATIONS).map(([value, label]) => ({
      value,
      label,
      selected: value === config.gathering?.rewardDestination,
    })),
    flankingEnabled: config.flanking.enabled !== false,
    hexplorationEnabled: config.hexploration?.enabled !== false,
    penaltyThree: config.flanking.penalties[3],
    penaltyFour: config.flanking.penalties[4],
    maxNormalSizeDifference: config.flanking.maxNormalSizeDifference,
    oversizedParticipantsPerSide: config.flanking.oversizedParticipantsPerSide,
    materials: Object.entries(config.materials).map(([id, material]) => ({
      id,
      label: material.label,
      enabled: material.enabled,
      itemTypes: material.augmentation
        ? "Metal and Leather/Hide armor enhancement"
        : formatList(material.itemTypes
          .filter((type) => ITEM_TYPE_LABELS[type])
          .map((type) => ITEM_TYPE_LABELS[type])),
      tiers: Array.from({ length: 6 }, (_unused, index) => {
        const tier = index + 1;
        return `${tier}: ${getTierPresentation(config, id, tier).label}`;
      }).join(" · "),
    })),
  };
}

export function applyDashboardChanges(config, form) {
  form = expandDottedFormData(form);
  const updated = clone(config);
  updated.crafting ??= {};
  updated.crafting.enabled = checked(form.crafting?.enabled);
  updated.gathering ??= {};
  updated.gathering.enabled = checked(form.gathering?.enabled);
  updated.gathering.environmentId = String(
    form.gathering?.environmentId ?? updated.gathering.environmentId ?? "forest",
  ).trim();
  updated.gathering.maxTier = number(
    form.gathering?.maxTier,
    updated.gathering.maxTier ?? 1,
  );
  updated.gathering.useSceneRegion = checked(form.gathering?.useSceneRegion);
  updated.gathering.rewardDestination = String(
    form.gathering?.rewardDestination ?? updated.gathering.rewardDestination ?? "party-stash",
  ).trim();
  updated.flanking.enabled = checked(form.flanking?.enabled);
  updated.hexploration ??= {};
  updated.hexploration.enabled = checked(form.hexploration?.enabled);
  updated.flanking.penalties[2] = -2;
  updated.flanking.penalties[3] = number(form.flanking?.penalties?.[3], updated.flanking.penalties[3]);
  updated.flanking.penalties[4] = number(form.flanking?.penalties?.[4], updated.flanking.penalties[4]);
  updated.flanking.maxNormalSizeDifference = number(
    form.flanking?.maxNormalSizeDifference,
    updated.flanking.maxNormalSizeDifference,
  );
  updated.flanking.oversizedParticipantsPerSide = number(
    form.flanking?.oversizedParticipantsPerSide,
    updated.flanking.oversizedParticipantsPerSide,
  );
  updated.flanking.pf2eHandlesTwoSidedFlanking = true;
  updated.flanking.stackWithOffGuard = true;
  return updated;
}

export function buildMaterialEditorContext(config, materialId) {
  const material = config.materials[materialId];
  if (!material) throw new ConfigValidationError(`Material "${materialId}" does not exist.`);
  return {
    materialId,
    label: material.label,
    enabled: material.enabled,
    supportsWeapon: material.itemTypes.includes("weapon"),
    supportsArmor: material.itemTypes.includes("armor"),
    supportsSpellFocus: material.itemTypes.includes("spellFocus"),
    isDragonScale: material.augmentation === true,
    modifierTypes: MODIFIER_TYPES.map((type) => ({
      ...type,
      selected: type.value === (material.effects.find((effect) => effect.kind === "flatModifier")?.modifierType ?? "untyped"),
    })),
    dragonColors: Object.entries(material.colors ?? {}).map(([id, color]) => ({
      id,
      label: color.label,
      damageTypes: DAMAGE_TYPES.map((damageType) => ({
        value: damageType,
        label: damageType.replace(/(^|-)([a-z])/g, (_match, separator, letter) => `${separator}${letter.toUpperCase()}`),
        selected: damageType === color.damageType,
      })),
    })),
    tiers: Array.from({ length: 6 }, (_unused, index) => {
      const tier = index + 1;
      const presentation = getTierPresentation(config, materialId, tier);
      return {
        tier,
        label: presentation.label,
        bonus: material.tierBonuses?.[tier] ?? config.tierBonuses[tier],
        priceGp: presentation.priceGp,
        rarities: RARITIES.map((rarity) => ({
          ...rarity,
          selected: rarity.value === presentation.rarity,
        })),
      };
    }),
  };
}

export function applyMaterialChanges(config, materialId, form) {
  form = expandDottedFormData(form);
  const updated = clone(config);
  const material = updated.materials[materialId];
  if (!material) throw new ConfigValidationError(`Material "${materialId}" does not exist.`);

  const label = String(form.material?.label ?? "").trim();
  if (!label) throw new ConfigValidationError("The material name cannot be blank.");
  material.label = label;
  material.enabled = checked(form.material?.enabled);

  if (material.augmentation) {
    material.itemTypes = ["armor"];
    for (const [colorId, color] of Object.entries(material.colors ?? {})) {
      const colorForm = form.dragonColors?.[colorId] ?? {};
      color.label = String(colorForm.label ?? color.label).trim();
      color.damageType = String(colorForm.damageType ?? color.damageType).trim().toLowerCase();
    }
  } else {
    const preservedTypes = material.itemTypes.filter((type) => !["weapon", "armor", "spellFocus"].includes(type));
    const selectedTypes = [
      checked(form.itemTypes?.weapon) ? "weapon" : null,
      checked(form.itemTypes?.armor) ? "armor" : null,
      checked(form.itemTypes?.spellFocus) ? "spellFocus" : null,
    ].filter(Boolean);
    material.itemTypes = [...new Set([...preservedTypes, ...selectedTypes])];
    if (material.itemTypes.length === 0) {
      throw new ConfigValidationError("Choose Weapons, Armor, Spell Focuses, or a combination for this material.");
    }
    const modifierType = String(form.material?.modifierType ?? "untyped").toLowerCase();
    material.effects = material.effects.map((effect) => effect.kind === "flatModifier"
      ? { ...effect, modifierType }
      : effect);
  }

  material.tierLabels = {};
  material.tierBonuses = {};
  material.tierPricesGp = {};
  material.tierRarities = {};
  for (let tier = 1; tier <= 6; tier += 1) {
    const tierForm = form.tiers?.[tier] ?? {};
    material.tierLabels[tier] = String(tierForm.label ?? "").trim();
    material.tierBonuses[tier] = number(tierForm.bonus, Number.NaN);
    material.tierPricesGp[tier] = number(tierForm.priceGp, Number.NaN);
    material.tierRarities[tier] = String(tierForm.rarity ?? "").toLowerCase();
  }
  return updated;
}
