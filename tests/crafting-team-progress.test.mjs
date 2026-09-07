import test from "node:test";
import assert from "node:assert/strict";
import { advanceCraftingProject, createCraftingProject, projectArtisanCount } from "../scripts/crafting-projects.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { getArtisanMarkDefinition } from "../content/artisan-marks.js";
import { markActionSources, addMarkActions } from "../scripts/mark-actions.js";
import { markAppliesToItem } from "../scripts/artisan-mark-effects.js";
const moduleId = "pf2e-crafting-material-tiers";

test("team work multiplies progress, not calendar days, and retains an audit count", () => {
  const recipe = buildCraftingRecipeFromBand("weapon-sword", { targetItem: { type: "weapon", system: { category: "martial" } }, tier: 2 });
  const project = createCraftingProject({ recipe, requiredProgress: 20, contributors: Array.from({ length: 6 }, (_, i) => ({ actorUuid: `Actor.${i}` })) });
  project.reservations = [{ itemId: "stock", quantity: 1, units: 1 }];
  const result = advanceCraftingProject(project, { days: 1, degree: "success" });
  assert.equal(result.currentProgress, 6);
  assert.equal(result.downtimeSpent, 1);
  assert.equal(result.workBlocks[0].artisanCount, 6);
  assert.equal(advanceCraftingProject(project, { days: 1, degree: "criticalFailure" }).currentProgress, 0);
  assert.equal(projectArtisanCount({ contributors: [{ actorUuid: "a" }, { actorUuid: "a" }] }), 1);
  assert.equal(projectArtisanCount({}), 1);
});

test("structure and consumable marks do not appear on weapons; anti-structure weapons remain eligible", () => {
  for (const id of ["carpentry-specialty-2-reinforced-frame", "alchemy-universal-stable-formula"]) {
    assert.equal(markAppliesToItem(getArtisanMarkDefinition(id), "weapon"), false);
  }
  assert.equal(markAppliesToItem(getArtisanMarkDefinition("carpentry-universal-reinforced-limb"), "weapon"), true);
});

test("explicit activations create native actions idempotently without inventing effect automation", async () => {
  const actor = { uuid: "Actor.test", type: "character", isOwner: true, items: [], async createEmbeddedDocuments(type, sources) { this.items.push(...sources); } };
  const item = { id: "shield", name: "Shield", actor, flags: { [moduleId]: { crafting: { artisanMarks: [
    { definitionId: "blacksmithing-specialty-2-martyrs-forge", status: "completed" },
  ] } } } };
  const sources = markActionSources(item);
  assert.equal(sources[0].system.actionType.value, "reaction");
  assert.deepEqual(sources[0].system.rules, []);
  assert.equal(await addMarkActions(item), 1);
  assert.equal(await addMarkActions(item), 0);
  actor.isOwner = false;
  await assert.rejects(addMarkActions(item), /owned character/);
});
