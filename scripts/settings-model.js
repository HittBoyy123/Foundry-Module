import { ConfigValidationError, getTierPresentation } from "./model.js";

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
        : material.itemTypes
        .filter((type) => type === "weapon" || type === "armor")
        .map((type) => type === "weapon" ? "Weapons" : "Armor")
        .join(" and "),
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
    const preservedTypes = material.itemTypes.filter((type) => type !== "weapon" && type !== "armor");
    const selectedTypes = [
      checked(form.itemTypes?.weapon) ? "weapon" : null,
      checked(form.itemTypes?.armor) ? "armor" : null,
    ].filter(Boolean);
    material.itemTypes = [...new Set([...preservedTypes, ...selectedTypes])];
    if (material.itemTypes.length === 0) {
      throw new ConfigValidationError("Choose Weapons, Armor, or both for this material.");
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
