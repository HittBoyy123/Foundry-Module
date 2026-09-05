export const CRAFTING_STATE_SCHEMA_VERSION = 2;

export const CORE_TIER_PROGRESSION = Object.freeze({
  1: Object.freeze({ attack: 0, weaponDice: 0, spellcasting: 0, armor: 0, saves: 0, capacity: 1 }),
  2: Object.freeze({ attack: 1, weaponDice: 1, spellcasting: 1, armor: 1, saves: 1, capacity: 2 }),
  3: Object.freeze({ attack: 2, weaponDice: 2, spellcasting: 2, armor: 2, saves: 2, capacity: 3 }),
  4: Object.freeze({ attack: 3, weaponDice: 2, spellcasting: 3, armor: 3, saves: 3, capacity: 4 }),
  5: Object.freeze({ attack: 4, weaponDice: 3, spellcasting: 4, armor: 4, saves: 4, capacity: 6 }),
  6: Object.freeze({ attack: 5, weaponDice: 4, spellcasting: 5, armor: 5, saves: 5, capacity: 8 }),
});

export const ARTISAN_MARK_GRADES = Object.freeze({
  minor: Object.freeze({ label: "Minor", capacityCost: 0, minimumAnchorTier: 1 }),
  standard: Object.freeze({ label: "Standard", capacityCost: 1, minimumAnchorTier: 2 }),
  major: Object.freeze({ label: "Major", capacityCost: 2, minimumAnchorTier: 3 }),
  superior: Object.freeze({ label: "Superior", capacityCost: 3, minimumAnchorTier: 4 }),
});

const COMPONENT_CLASSIFICATIONS = new Set(["core", "required-secondary", "optional", "special-treatment"]);
const MARK_STATUSES = new Set(["planned", "completed", "dormant", "suppressed"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function text(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function tier(value, fallback = 1) {
  const normalized = Math.trunc(Number(value));
  return Number.isInteger(normalized) ? Math.min(6, Math.max(1, normalized)) : fallback;
}

function stringArray(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map((entry) => text(entry))
    .filter(Boolean))];
}

export function getCoreTierProgression(value) {
  return clone(CORE_TIER_PROGRESSION[tier(value)]);
}

function normalizeComponent(source, index) {
  const classification = COMPONENT_CLASSIFICATIONS.has(source?.classification)
    ? source.classification
    : "optional";
  return {
    id: text(source?.id, `component-${index + 1}`),
    name: text(source?.name, `Component ${index + 1}`),
    classification,
    slotType: text(source?.slotType, "component"),
    materialId: text(source?.materialId),
    tier: tier(source?.tier),
    quantityRequired: Math.max(0, Math.trunc(Number(source?.quantityRequired) || 0)),
    quantityCommitted: Math.max(0, Math.trunc(Number(source?.quantityCommitted) || 0)),
    structural: source?.structural === true,
    tags: stringArray(source?.tags),
    contributor: source?.contributor && typeof source.contributor === "object"
      ? clone(source.contributor)
      : null,
  };
}

function normalizeMark(source, index) {
  const grade = Object.hasOwn(ARTISAN_MARK_GRADES, source?.grade) ? source.grade : "minor";
  const gradeDefinition = ARTISAN_MARK_GRADES[grade];
  const status = MARK_STATUSES.has(source?.status) ? source.status : "planned";
  return {
    id: text(source?.id, `mark-${index + 1}`),
    definitionId: text(source?.definitionId, source?.id),
    name: text(source?.name, `Artisan Mark ${index + 1}`),
    professionId: text(source?.professionId),
    profession: text(source?.profession),
    specializationId: text(source?.specializationId),
    specialisation: text(source?.specialisation),
    grade,
    capacityCost: gradeDefinition.capacityCost,
    minimumTier: tier(source?.minimumTier),
    anchorSlotIds: stringArray(source?.anchorSlotIds),
    anchorSlotTypes: stringArray(source?.anchorSlotTypes),
    minimumAnchorTier: tier(source?.minimumAnchorTier, gradeDefinition.minimumAnchorTier),
    requiresCoreTierAnchors: source?.requiresCoreTierAnchors === true,
    effectiveMarkTier: tier(source?.effectiveMarkTier),
    status,
    effectSummary: text(source?.effectSummary),
    dormantReason: status === "dormant" ? text(source?.dormantReason, "Requirements are not currently met.") : "",
    maker: source?.maker && typeof source.maker === "object" ? clone(source.maker) : null,
    effects: Array.isArray(source?.effects) ? clone(source.effects) : [],
    configuration: { choice: typeof source?.configuration?.choice === "string" ? source.configuration.choice : "" },
    synergyTags: stringArray(source?.synergyTags),
    stackGroup: text(source?.stackGroup),
    scalingSource: text(source?.scalingSource, "fixed"),
    requiredMaterialIds: stringArray(source?.requiredMaterialIds),
    materialUnits: Math.max(0, Math.trunc(Number(source?.materialUnits) || 0)),
    materialTierOffset: Math.min(0, Math.max(-5, Math.trunc(Number(source?.materialTierOffset) || 0))),
    artisanDayMultiplier: Math.max(0, Math.trunc(Number(source?.artisanDayMultiplier) || 0)),
    materialRequirementGroupId: text(source?.materialRequirementGroupId),
  };
}

export function normalizeCraftingState(source, { materialId = "metal", tier: coreTier = 1 } = {}) {
  const input = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const core = input.core && typeof input.core === "object" ? input.core : {};
  return {
    schemaVersion: CRAFTING_STATE_SCHEMA_VERSION,
    core: {
      materialId: text(core.materialId, materialId),
      tier: tier(core.tier, tier(coreTier)),
      resourceName: text(core.resourceName),
      quantityRequired: Math.max(0, Math.trunc(Number(core.quantityRequired) || 0)),
      quantityCommitted: Math.max(0, Math.trunc(Number(core.quantityCommitted) || 0)),
      tags: stringArray(core.tags),
      contributor: core.contributor && typeof core.contributor === "object" ? clone(core.contributor) : null,
    },
    components: (Array.isArray(input.components) ? input.components : []).map(normalizeComponent),
    artisanMarks: (Array.isArray(input.artisanMarks) ? input.artisanMarks : []).map(normalizeMark),
    synergies: Array.isArray(input.synergies) ? clone(input.synergies) : [],
    provenance: Array.isArray(input.provenance) ? clone(input.provenance) : [],
  };
}

export function calculateArtisanCapacity(state) {
  const normalized = normalizeCraftingState(state, {
    materialId: state?.core?.materialId,
    tier: state?.core?.tier,
  });
  const maximum = getCoreTierProgression(normalized.core.tier).capacity;
  const used = normalized.artisanMarks
    .filter((mark) => mark.status !== "suppressed")
    .reduce((total, mark) => total + mark.capacityCost, 0);
  return {
    used,
    maximum,
    remaining: Math.max(0, maximum - used),
    overCapacity: used > maximum,
  };
}

export function validateCraftingState(state) {
  const normalized = normalizeCraftingState(state, {
    materialId: state?.core?.materialId,
    tier: state?.core?.tier,
  });
  const issues = [];
  const structuralFloor = Math.max(1, normalized.core.tier - 2);
  for (const component of normalized.components) {
    if (component.structural && component.classification === "required-secondary" && component.tier < structuralFloor) {
      issues.push({
        code: "structural-tier",
        componentId: component.id,
        message: `${component.name} is Tier ${component.tier}; this Core requires Tier ${structuralFloor} or higher.`,
      });
    }
  }
  const componentById = new Map([
    ["core", {
      id: "core",
      name: normalized.core.resourceName || "Core Material",
      classification: "core",
      slotType: "core",
      materialId: normalized.core.materialId,
      tier: normalized.core.tier,
      structural: true,
    }],
    ...normalized.components.map((component) => [component.id, component]),
  ]);
  for (const mark of normalized.artisanMarks) {
    if (mark.status === "suppressed") continue;
    if (mark.anchorSlotIds.length === 0) {
      issues.push({ code: "missing-anchor", markId: mark.id, message: `${mark.name} requires at least one Anchor component.` });
      continue;
    }
    const anchors = mark.anchorSlotIds.map((id) => componentById.get(id)).filter(Boolean);
    if (mark.anchorSlotIds.length > 0 && anchors.length !== mark.anchorSlotIds.length) {
      issues.push({ code: "missing-anchor", markId: mark.id, message: `${mark.name} has a missing Anchor component.` });
      continue;
    }
    const requiredTier = mark.requiresCoreTierAnchors ? normalized.core.tier : mark.minimumAnchorTier;
    if (anchors.some((anchor) => anchor.tier < requiredTier)) {
      issues.push({
        code: "anchor-tier",
        markId: mark.id,
        message: `${mark.name} requires every Anchor to be Tier ${requiredTier} or higher.`,
      });
    }
  }
  const capacity = calculateArtisanCapacity(normalized);
  if (capacity.overCapacity) {
    issues.push({
      code: "capacity",
      message: `Artisan Marks use ${capacity.used} Capacity, above the Core maximum of ${capacity.maximum}.`,
    });
  }
  return { valid: issues.length === 0, issues, capacity, structuralFloor };
}
