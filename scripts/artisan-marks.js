import {
  ARTISAN_MARK_GRADE_RULES,
  getArtisanMarkDefinition,
  getSpecialisationFeatures,
  listArtisanMarks,
} from "../content/artisan-marks.js";
import { getCoreTierProgression } from "./crafting-model.js";
import { normalizeCraftingRecipe } from "./crafting-recipes.js";
import { getActorProfessionSpecialties, getActorProfessions } from "./professions.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function text(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function slug(value) {
  return text(value)
    .toLowerCase()
    .replace(/[’']/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function actorUuid(actor) {
  return text(actor?.uuid, actor?.id ? `Actor.${actor.id}` : "");
}

export function getArtisanProfile(actor) {
  if (!actor) return null;
  const professions = getActorProfessions(actor).map((profession) => ({
    id: profession.id,
    name: profession.name,
    materialIds: [...(profession.materialIds ?? [])],
  }));
  const specializations = getActorProfessionSpecialties(actor).map((specialty) => ({
    professionId: specialty.professionId,
    specializationId: specialty.specialtyId,
    name: specialty.name,
    milestoneLevel: specialty.milestoneLevel,
    stages: clone(specialty.stages),
    features: getSpecialisationFeatures(specialty.professionId, specialty.specialtyId),
  }));
  return {
    actor,
    actorUuid: actorUuid(actor),
    actorId: text(actor.id),
    name: text(actor.name, "Artisan"),
    img: text(actor.img, "icons/svg/mystery-man.svg"),
    professions,
    specializations,
    marks: listArtisanMarks({
      professionIds: professions.map((profession) => profession.id),
      specializations,
    }),
  };
}

export function buildRecipeAnchorSlots(recipe) {
  const normalized = normalizeCraftingRecipe(recipe);
  return normalized.ingredientSets[0].groups.map((group) => ({
    id: group.id,
    slotType: group.id,
    label: group.label,
    minimumTier: Math.min(...group.options.map((option) => option.tier)),
    maximumTier: Math.max(...group.options.map((option) => option.maximumTier)),
    materialIds: unique(group.options.map((option) => option.materialId)),
  }));
}

function markRequiredAnchorTier(mark, coreTier) {
  return mark.requiresCoreTierAnchors ? coreTier : mark.minimumAnchorTier;
}

export function evaluateArtisanMarkChoice(markSource, {
  itemGroup = "",
  coreTier = 1,
  anchorSlots = [],
  capacityUsed = 0,
  selectedDefinitionIds = [],
  selectedStackGroups = [],
} = {}) {
  const mark = getArtisanMarkDefinition(markSource?.definitionId ?? markSource?.id) ?? clone(markSource);
  const maximum = getCoreTierProgression(coreTier).capacity;
  const requiredTier = markRequiredAnchorTier(mark, coreTier);
  const anchors = anchorSlots
    .filter((slot) => mark.anchorSlotTypes.includes(slot.slotType))
    .filter((slot) => slot.maximumTier >= requiredTier)
    .map((slot) => ({
      ...clone(slot),
      requiredTier,
      label: `${slot.label} (T${requiredTier}+)`,
    }));
  let reason = "";
  if (!mark.validItemGroups.includes(itemGroup)) {
    reason = "This Mark does not apply to the selected item type.";
  } else if (coreTier < mark.minimumTier) {
    reason = `${mark.name} requires a Tier ${mark.minimumTier} or higher Core.`;
  } else if (anchors.length === 0) {
    reason = `${mark.name} has no compatible Tier ${requiredTier}+ Anchor in this recipe.`;
  } else if (selectedDefinitionIds.includes(mark.id)) {
    reason = "This Mark is already supplied by another contributor.";
  } else if (mark.stackGroup && selectedStackGroups.includes(mark.stackGroup)) {
    reason = `Another selected Mark already uses the ${mark.stackGroup.replaceAll("-", " ")} stacking group.`;
  } else if (capacityUsed + mark.capacityCost > maximum) {
    reason = `${mark.name} needs ${mark.capacityCost} Capacity; only ${Math.max(0, maximum - capacityUsed)} remains.`;
  }
  return {
    mark,
    eligible: !reason,
    reason,
    anchors,
    defaultAnchorId: anchors[0]?.id ?? "",
  };
}

export function buildArtisanMarkAssignment(markSource, artisan, anchorSlot, coreTier) {
  const mark = getArtisanMarkDefinition(markSource?.definitionId ?? markSource?.id) ?? clone(markSource);
  const requiredTier = markRequiredAnchorTier(mark, coreTier);
  return {
    id: `${mark.id}-${slug(artisan.actorUuid ?? artisan.uuid ?? artisan.id ?? artisan.name)}`,
    definitionId: mark.id,
    name: mark.name,
    professionId: mark.professionId,
    profession: mark.profession,
    specializationId: mark.specializationId,
    specialisation: mark.specialisation,
    grade: mark.grade,
    capacityCost: mark.capacityCost,
    minimumTier: mark.minimumTier,
    anchorSlotIds: [anchorSlot.id],
    anchorSlotTypes: [...mark.anchorSlotTypes],
    minimumAnchorTier: mark.minimumAnchorTier,
    requiresCoreTierAnchors: mark.requiresCoreTierAnchors,
    effectiveMarkTier: Math.min(coreTier, Math.max(requiredTier, anchorSlot.minimumTier)),
    status: "planned",
    effectSummary: mark.effectSummary,
    maker: {
      actorUuid: text(artisan.actorUuid ?? artisan.uuid),
      actorId: text(artisan.actorId ?? artisan.id),
      name: text(artisan.name, "Artisan"),
      professionId: mark.professionId,
      specializationId: mark.specializationId,
    },
    effects: clone(mark.effects),
    synergyTags: [...mark.synergyTags],
    stackGroup: mark.stackGroup,
    scalingSource: mark.scalingSource,
    requiredMaterialIds: [...mark.requiredMaterialIds],
    materialUnits: mark.materialUnits,
    materialTierOffset: mark.materialTierOffset,
    artisanDayMultiplier: mark.artisanDayMultiplier,
    materialRequirementGroupId: mark.materialUnits > 0 ? `mark-${slug(mark.id)}` : "",
  };
}

export function calculateMarkLabourDays(assignments, coreTier) {
  return assignments.reduce((total, assignment) => {
    const grade = ARTISAN_MARK_GRADE_RULES[assignment.grade] ?? ARTISAN_MARK_GRADE_RULES.minor;
    if (assignment.grade === "minor") return total + 1;
    return total + (Math.max(1, coreTier) * grade.artisanDayMultiplier);
  }, 0);
}

/**
 * Add specialist stock to the selected recipe and raise an anchored component's
 * minimum Tier when a Mark needs a stronger physical Anchor.
 */
export function augmentRecipeWithArtisanMarks(recipeSource, assignments = []) {
  const recipe = normalizeCraftingRecipe(recipeSource);
  const groups = recipe.ingredientSets[0].groups;
  for (const assignment of assignments) {
    const requiredAnchorTier = markRequiredAnchorTier(assignment, recipe.tier);
    for (const anchorId of assignment.anchorSlotIds) {
      const group = groups.find((entry) => entry.id === anchorId);
      if (!group || group.id === "core") continue;
      group.options = group.options
        .filter((option) => option.maximumTier >= requiredAnchorTier)
        .map((option) => ({
          ...option,
          tier: Math.max(option.tier, requiredAnchorTier),
          tierMode: "minimum",
        }));
      if (group.options.length === 0) {
        throw new Error(`${assignment.name} has no valid Tier ${requiredAnchorTier}+ Anchor option.`);
      }
    }
    if (assignment.materialUnits <= 0 || !assignment.materialRequirementGroupId) continue;
    const materialTier = Math.min(6, Math.max(1, recipe.tier + assignment.materialTierOffset));
    groups.push({
      id: assignment.materialRequirementGroupId,
      label: `${assignment.name} specialist material`,
      options: assignment.requiredMaterialIds.map((materialId) => ({
        kind: "resource",
        materialId,
        tier: materialTier,
        tierMode: "minimum",
        maximumTier: materialTier,
        variantId: "",
        units: assignment.materialUnits,
      })),
    });
  }
  return normalizeCraftingRecipe(recipe);
}

export function selectedMarkCapacity(assignments, coreTier) {
  const maximum = getCoreTierProgression(coreTier).capacity;
  const used = assignments.reduce((total, assignment) => total + assignment.capacityCost, 0);
  return {
    used,
    maximum,
    remaining: Math.max(0, maximum - used),
    overCapacity: used > maximum,
  };
}
