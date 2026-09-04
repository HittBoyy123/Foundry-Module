import assert from "node:assert/strict";
import test from "node:test";

import {
  ARTISAN_MARK_DEFINITIONS,
  ARTISAN_MARK_GRADE_RULES,
  SPECIALISATION_FEATURES,
  getArtisanMarkDefinition,
  listArtisanMarks,
} from "../content/artisan-marks.js";
import {
  augmentRecipeWithArtisanMarks,
  buildArtisanMarkAssignment,
  buildRecipeAnchorSlots,
  calculateMarkLabourDays,
  evaluateArtisanMarkChoice,
  selectedMarkCapacity,
} from "../scripts/artisan-marks.js";
import { createCraftingProject } from "../scripts/crafting-projects.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";

const sword = { type: "weapon", system: { category: "martial", traits: { otherTags: [] } } };

test("the Notion catalogue contains 55 universal and 198 specialisation Artisan Marks", () => {
  assert.equal(ARTISAN_MARK_DEFINITIONS.length, 253);
  assert.equal(ARTISAN_MARK_DEFINITIONS.filter((mark) => mark.source === "universal").length, 55);
  assert.equal(ARTISAN_MARK_DEFINITIONS.filter((mark) => mark.source === "specialization").length, 198);
  assert.equal(SPECIALISATION_FEATURES.length, 33);

  const bySpecialisation = Map.groupBy(
    ARTISAN_MARK_DEFINITIONS.filter((mark) => mark.source === "specialization"),
    (mark) => `${mark.professionId}:${mark.specializationId}`,
  );
  assert.equal(bySpecialisation.size, 33);
  for (const marks of bySpecialisation.values()) {
    assert.equal(marks.length, 6);
    assert.deepEqual(
      marks.map((mark) => mark.grade).sort(),
      ["major", "major", "minor", "standard", "superior", "superior"],
    );
  }
});

test("Signature, Mastery, and Legacy benefits are populated with authoritative rules text", () => {
  for (const feature of SPECIALISATION_FEATURES) {
    for (const key of ["signature", "mastery", "legacy"]) {
      assert.ok(feature.stages[key].name);
      assert.ok(feature.stages[key].description);
      assert.doesNotMatch(feature.stages[key].description, /placeholder|to be determined/iu);
    }
  }
  const hellforging = SPECIALISATION_FEATURES.find((entry) => (
    entry.professionId === "blacksmithing" && entry.specializationId === "specialty-1"
  ));
  assert.equal(hellforging.stages.signature.name, "Infernal Temper");
  assert.equal(hellforging.stages.mastery.name, "Furnace Without Mercy");
  assert.equal(hellforging.stages.legacy.name, "Infernal Foundry");
});

test("an artisan receives universal Marks plus Marks from only their learned specialisation", () => {
  const marks = listArtisanMarks({
    professionIds: ["blacksmithing"],
    specializations: [{ professionId: "blacksmithing", specializationId: "specialty-1" }],
  });
  assert.equal(marks.length, 11);
  assert.equal(marks.filter((mark) => mark.source === "universal").length, 5);
  assert.equal(marks.filter((mark) => mark.specialisation === "Hellforging").length, 6);
  assert.equal(marks.some((mark) => mark.specialisation === "Radiant Forging"), false);
});

test("Mark selection spends Capacity, chooses a valid Anchor, and adds specialist stock and labour", () => {
  const recipe = buildCraftingRecipeFromBand("weapon-sword", {
    targetItem: sword,
    tier: 4,
    coreMaterialId: "metal",
  });
  const slots = buildRecipeAnchorSlots(recipe);
  const mark = getArtisanMarkDefinition("blacksmithing-specialty-1-blood-temper");
  const choice = evaluateArtisanMarkChoice(mark, {
    itemGroup: "weapon",
    coreTier: 4,
    anchorSlots: slots,
  });
  assert.equal(choice.eligible, true);
  assert.equal(choice.defaultAnchorId, "core");

  const assignment = buildArtisanMarkAssignment(mark, {
    actorUuid: "Actor.Smith",
    actorId: "Smith",
    name: "The Smith",
  }, choice.anchors[0], 4);
  assert.deepEqual(selectedMarkCapacity([assignment], 4), {
    used: 1,
    maximum: 4,
    remaining: 3,
    overCapacity: false,
  });
  assert.equal(calculateMarkLabourDays([assignment], 4), 4);

  const augmented = augmentRecipeWithArtisanMarks(recipe, [assignment]);
  const materialGroup = augmented.ingredientSets[0].groups.find((group) => (
    group.id === assignment.materialRequirementGroupId
  ));
  assert.ok(materialGroup);
  assert.equal(materialGroup.options[0].materialId, "metal");
  assert.equal(materialGroup.options[0].tier, 3);
  assert.equal(materialGroup.options[0].units, 1);
});

test("project data preserves contributors and planned Mark provenance", () => {
  const recipe = buildCraftingRecipeFromBand("weapon-sword", {
    targetItem: sword,
    tier: 2,
    coreMaterialId: "metal",
  });
  const mark = getArtisanMarkDefinition("blacksmithing-universal-reinforced-edge");
  const anchor = buildRecipeAnchorSlots(recipe)[0];
  const assignment = buildArtisanMarkAssignment(mark, {
    actorUuid: "Actor.Smith",
    actorId: "Smith",
    name: "The Smith",
  }, { ...anchor, requiredTier: 2 }, 2);
  const project = createCraftingProject({
    name: "Marked Sword",
    recipe,
    coreMaterialId: "metal",
    coreTier: 2,
    leadArtisanUuid: "Actor.Smith",
    leadArtisanName: "The Smith",
    contributors: [{
      actorUuid: "Actor.Smith",
      actorId: "Smith",
      name: "The Smith",
      professionIds: ["blacksmithing"],
      specializations: [],
    }],
    artisanMarks: [assignment],
  });
  assert.equal(project.contributors.length, 1);
  assert.equal(project.artisanMarks.length, 1);
  assert.equal(project.artisanMarks[0].definitionId, mark.id);
  assert.equal(project.artisanMarks[0].maker.actorUuid, "Actor.Smith");
});

test("grade rules retain the Capacity, Anchor, material, and labour schedule", () => {
  assert.deepEqual(ARTISAN_MARK_GRADE_RULES, {
    minor: {
      label: "Minor", capacityCost: 0, minimumAnchorTier: 1,
      materialUnits: 0, materialTierOffset: 0, artisanDayMultiplier: 1,
    },
    standard: {
      label: "Standard", capacityCost: 1, minimumAnchorTier: 2,
      materialUnits: 1, materialTierOffset: -1, artisanDayMultiplier: 1,
    },
    major: {
      label: "Major", capacityCost: 2, minimumAnchorTier: 3,
      materialUnits: 1, materialTierOffset: 0, artisanDayMultiplier: 2,
    },
    superior: {
      label: "Superior", capacityCost: 3, minimumAnchorTier: 4,
      materialUnits: 2, materialTierOffset: 0, artisanDayMultiplier: 4,
    },
  });
});
