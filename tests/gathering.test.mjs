import assert from "node:assert/strict";
import test from "node:test";

import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";
import {
  GATHERING_ENVIRONMENT_SOURCES,
  GATHERING_TASK_SOURCES,
} from "../content/gathering-presets.js";
import {
  GatheringValidationError,
  evaluateGatheringTask,
  findGatheringResource,
  listTasksForEnvironment,
  normalizeDegreeOfSuccess,
  normalizeGatheringEnvironment,
  normalizeGatheringTask,
  resolveGatheringOutcome,
} from "../scripts/gathering-model.js";

test("every Wrathmaker crafting resource has one gatherable task", () => {
  assert.equal(GATHERING_TASK_SOURCES.length, 66);
  assert.equal(GATHERING_TASK_SOURCES.length, CRAFTING_RESOURCE_SOURCES.length);
  const identities = new Set(GATHERING_TASK_SOURCES.map((task) => (
    `${task.materialId}|${task.tier}|${task.variantId}`
  )));
  assert.equal(identities.size, 66);
  for (const task of GATHERING_TASK_SOURCES) {
    assert.ok(findGatheringResource(task, CRAFTING_RESOURCE_SOURCES), task.name);
  }
});

test("default environments compose targeted material tasks", () => {
  assert.equal(GATHERING_ENVIRONMENT_SOURCES.length, 7);
  const forest = GATHERING_ENVIRONMENT_SOURCES.find((environment) => environment.id === "forest");
  const forestTasks = listTasksForEnvironment(forest, GATHERING_TASK_SOURCES);
  assert.ok(forestTasks.some((task) => task.materialId === "wood"));
  assert.ok(forestTasks.some((task) => task.materialId === "herbs"));
  assert.ok(forestTasks.some((task) => task.materialId === "leather"));
  assert.equal(forestTasks.some((task) => task.materialId === "metal"), false);

  const dragonGrounds = GATHERING_ENVIRONMENT_SOURCES.find((environment) => (
    environment.id === "dragon-hunting-grounds"
  ));
  const dragonTasks = listTasksForEnvironment(dragonGrounds, GATHERING_TASK_SOURCES);
  assert.equal(dragonTasks.length, 30);
  assert.equal(dragonTasks.every((task) => task.materialId === "dragon-scale"), true);
});

test("gathering previews use the resource tier DC and stable flag identity", () => {
  const environment = GATHERING_ENVIRONMENT_SOURCES.find((entry) => entry.id === "mountains");
  const task = GATHERING_TASK_SOURCES.find((entry) => entry.materialId === "metal" && entry.tier === 4);
  const result = evaluateGatheringTask(task, {
    environment,
    resources: CRAFTING_RESOURCE_SOURCES,
  });
  assert.equal(result.available, true);
  assert.deepEqual(result.check, {
    tier: 4,
    level: 12,
    baseDC: 30,
    adjustment: "normal",
    adjustmentLabel: "Normal",
    modifier: 0,
    dc: 30,
  });
  assert.equal(result.resource.name, "Mithril Ingot");

  const renamed = structuredClone(result.resource);
  renamed.name = "GM Renamed Ore";
  assert.equal(findGatheringResource(task, [renamed]).name, "GM Renamed Ore");
});

test("disabled materials, missing resources, and wrong environments block attempts", () => {
  const task = GATHERING_TASK_SOURCES.find((entry) => entry.materialId === "wood" && entry.tier === 2);
  const mountains = GATHERING_ENVIRONMENT_SOURCES.find((entry) => entry.id === "mountains");
  const blocked = evaluateGatheringTask(task, {
    environment: mountains,
    resources: [],
    materialEnabled: false,
  });
  assert.equal(blocked.available, false);
  assert.deepEqual(blocked.warnings, ["environment-mismatch", "material-disabled", "resource-missing"]);
});

test("PF2e degrees of success produce configurable bundle and unit quantities", () => {
  const manaTask = GATHERING_TASK_SOURCES.find((entry) => (
    entry.materialId === "mana-crystals" && entry.tier === 3
  ));
  const manaResource = findGatheringResource(manaTask, CRAFTING_RESOURCE_SOURCES);
  assert.equal(normalizeDegreeOfSuccess(0), "criticalFailure");
  assert.equal(normalizeDegreeOfSuccess("critical-success"), "criticalSuccess");
  assert.deepEqual(resolveGatheringOutcome(manaTask, "success", manaResource), {
    outcome: "success",
    quantity: 5,
    units: 5,
    resource: {
      schemaVersion: 2,
      materialId: "mana-crystals",
      tier: 3,
      unit: "mana-lot",
      unitsPerItem: 1,
      variantId: "",
      family: "mana-crystals",
      bundleSize: 1,
      tags: ["wrathmaker-resource", "material-mana-crystals", "material-tier-3"],
      nativeEffects: [],
      eligibleItemTags: [],
      specialisationHooks: [],
      pricePerUnitGp: 85,
      level: 8,
      baseDC: 24,
    },
  });
  assert.equal(resolveGatheringOutcome(manaTask, 3, manaResource).units, 10);
  assert.equal(resolveGatheringOutcome(manaTask, "failure", manaResource).quantity, 0);
});

test("gathering definitions are validated before player use", () => {
  assert.equal(normalizeGatheringEnvironment(GATHERING_ENVIRONMENT_SOURCES[0]).selectionMode, "targeted");
  assert.equal(normalizeGatheringTask(GATHERING_TASK_SOURCES[0]).timeMinutes, 60);
  assert.throws(
    () => normalizeGatheringTask({ ...GATHERING_TASK_SOURCES[0], tier: 7 }),
    GatheringValidationError,
  );
  assert.throws(
    () => normalizeGatheringTask({
      ...GATHERING_TASK_SOURCES[0],
      check: { skill: "thievery", adjustment: "normal" },
    }),
    /not supported/u,
  );
  assert.throws(
    () => normalizeGatheringEnvironment({ ...GATHERING_ENVIRONMENT_SOURCES[0], id: "Bad Id" }),
    GatheringValidationError,
  );
});
