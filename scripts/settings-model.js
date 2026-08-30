import { ConfigValidationError, getTierPresentation } from "./model.js";

const RARITIES = Object.freeze([
  Object.freeze({ value: "common", label: "Common" }),
  Object.freeze({ value: "uncommon", label: "Uncommon" }),
  Object.freeze({ value: "rare", label: "Rare" }),
  Object.freeze({ value: "unique", label: "Unique" }),
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
      itemTypes: material.itemTypes
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
  const updated = clone(config);
  const material = updated.materials[materialId];
  if (!material) throw new ConfigValidationError(`Material "${materialId}" does not exist.`);

  const label = String(form.material?.label ?? "").trim();
  if (!label) throw new ConfigValidationError("The material name cannot be blank.");
  material.label = label;
  material.enabled = checked(form.material?.enabled);

  const preservedTypes = material.itemTypes.filter((type) => type !== "weapon" && type !== "armor");
  const selectedTypes = [
    checked(form.itemTypes?.weapon) ? "weapon" : null,
    checked(form.itemTypes?.armor) ? "armor" : null,
  ].filter(Boolean);
  material.itemTypes = [...new Set([...preservedTypes, ...selectedTypes])];
  if (material.itemTypes.length === 0) {
    throw new ConfigValidationError("Choose Weapons, Armor, or both for this material.");
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
