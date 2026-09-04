import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceCraftingProject,
  buildConsumptionPlan,
  completeCraftingProject,
  createCraftingProject,
  normalizeCraftingWorkbench,
  progressForWorkBlock,
  releaseCraftingProject,
  reservationLedger,
  reserveCraftingProject,
  validateProjectReservations,
} from "../scripts/crafting-projects.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";

const MODULE_ID = "pf2e-crafting-material-tiers";
const sword = { type: "weapon", system: { category: "martial", traits: { otherTags: [] } } };

function resourceItem(id, name, materialId, tier, quantity, variantId = "") {
  return {
    id,
    _id: id,
    uuid: `Actor.party.Item.${id}`,
    name,
    type: "treasure",
    system: { quantity },
    flags: {
      [MODULE_ID]: {
        resource: { materialId, tier, variantId, unitsPerItem: 1, unit: "resource" },
      },
    },
  };
}

function swordProject() {
  const recipe = buildCraftingRecipeFromBand("weapon-sword", {
    targetItem: sword,
    tier: 2,
    coreMaterialId: "metal",
  });
  return createCraftingProject({
    id: "project-sword",
    name: "Steel Longsword",
    partyUuid: "Actor.party",
    baseItemUuid: "Compendium.pf2e.equipment-srd.Item.sword",
    baseItemName: "Longsword",
    recipeBandId: "weapon-sword",
    recipe,
    coreMaterialId: "metal",
    coreTier: 2,
    leadArtisanUuid: "Actor.smith",
    leadArtisanName: "Smith",
    requiredProgress: 6,
  }, { id: "player", name: "Player" });
}

test("Work Blocks follow the 1–5 day progress table", () => {
  assert.equal(progressForWorkBlock(5, "criticalSuccess"), 8);
  assert.equal(progressForWorkBlock(5, "success"), 5);
  assert.equal(progressForWorkBlock(5, "failure"), 2);
  assert.equal(progressForWorkBlock(1, "failure"), 0);
  assert.equal(progressForWorkBlock(5, "criticalFailure"), 0);
  assert.throws(() => progressForWorkBlock(6, "unexpected"), /degree of success/iu);
});

test("Party Stash reservations use exact stacks and prevent double booking", () => {
  const inventory = [
    resourceItem("steel", "Steel Ingots", "metal", 2, 3),
    resourceItem("hide", "Rawhide Sheet", "leather", 1, 1),
  ];
  const reserved = reserveCraftingProject(swordProject(), {
    inventoryItems: inventory,
    otherProjects: [],
    user: { id: "player", name: "Player" },
  });
  assert.equal(reserved.status, "reserved");
  assert.deepEqual(reserved.reservations.map((entry) => [entry.itemId, entry.quantity]), [
    ["steel", 3],
    ["hide", 1],
  ]);
  assert.equal(reservationLedger([reserved]).get("steel"), 3);
  assert.throws(() => reserveCraftingProject({ ...swordProject(), id: "project-two" }, {
    inventoryItems: inventory,
    otherProjects: [reserved],
  }), /unreserved resources/iu);
});

test("downtime progress reaches finalisation without consuming reserved stock", () => {
  const inventory = [
    resourceItem("steel", "Steel Ingots", "metal", 2, 3),
    resourceItem("hide", "Rawhide Sheet", "leather", 1, 1),
  ];
  let project = reserveCraftingProject(swordProject(), { inventoryItems: inventory });
  project = advanceCraftingProject(project, { days: 5, degree: "failure" });
  assert.equal(project.currentProgress, 2);
  assert.equal(project.status, "active");
  project = advanceCraftingProject(project, { days: 4, degree: "success" });
  assert.equal(project.currentProgress, 6);
  assert.equal(project.status, "ready");
  assert.equal(project.stage, "finalisation");
  assert.equal(project.downtimeSpent, 9);
  assert.deepEqual(inventory.map((item) => item.system.quantity), [3, 1]);

  const plan = buildConsumptionPlan(project, inventory);
  assert.deepEqual(plan.map((entry) => [entry.itemId, entry.afterQuantity]), [["steel", 0], ["hide", 0]]);
  const completed = completeCraftingProject(project, { finalItemUuid: "Actor.party.Item.finished" });
  assert.equal(completed.status, "completed");
  assert.equal(completed.consumptionConfirmed, true);
  assert.equal(completed.reservations.every((entry) => entry.state === "consumed"), true);
});

test("final confirmation revalidates the live stash and cancellation releases stock", () => {
  const inventory = [
    resourceItem("steel", "Steel Ingots", "metal", 2, 3),
    resourceItem("hide", "Rawhide Sheet", "leather", 1, 1),
  ];
  const project = reserveCraftingProject(swordProject(), { inventoryItems: inventory });
  inventory[0].system.quantity = 2;
  const validation = validateProjectReservations(project, inventory);
  assert.equal(validation.valid, false);
  assert.equal(validation.issues[0].code, "quantity-changed");
  const cancelled = releaseCraftingProject(project);
  assert.equal(cancelled.status, "cancelled");
  assert.deepEqual(cancelled.reservations, []);
  assert.equal(reservationLedger([cancelled]).size, 0);
});

test("corrupt stored projects do not prevent the Workbench opening", () => {
  const normalized = normalizeCraftingWorkbench({ projects: [{ broken: true }, swordProject()] });
  assert.equal(normalized.projects.length, 1);
  assert.equal(normalized.projects[0].id, "project-sword");
});
