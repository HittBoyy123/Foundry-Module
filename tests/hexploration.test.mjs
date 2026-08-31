import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_HEXPLORATION_CONFIG } from "../scripts/constants.js";
import {
  applyPreparedPartyTravelSpeed,
  calculateActivitiesPerDay,
  calculateTravelState,
  expressRiderOutcomeFromDegree,
  getActorGroundSpeed,
  getVehicleGroundSpeed,
  normalizeHexplorationPlan,
} from "../scripts/hexploration-model.js";
import { actorIsInTravelFolder } from "../scripts/hexploration.js";

const members = [
  { id: "slow", name: "Slow Hero", speed: 20 },
  { id: "fast", name: "Fast Hero", speed: 30 },
];
const vehicles = [{ id: "wagon", name: "Wagon", speed: 40 }];
const haulers = [
  { id: "horse", name: "Horse", speed: 40 },
  { id: "mule", name: "Mule", speed: 30 },
];

test("on-foot Hexploration uses the slowest party member", () => {
  const state = calculateTravelState({
    plan: { mode: "foot" },
    members,
    vehicles,
    haulers,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(state.valid, true);
  assert.equal(state.sharedSpeed, 20);
  assert.equal(state.activitiesPerDay, 1);
  assert.equal(state.milesPerHour, 2);
  assert.equal(state.milesPerDay, 16);
});

test("travel readouts recalculate from current member Speeds instead of retaining an earlier value", () => {
  const first = calculateTravelState({
    plan: { mode: "foot" },
    members: [{ id: "one", speed: 60 }, { id: "two", speed: 60 }],
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  const changed = calculateTravelState({
    plan: { mode: "foot" },
    members: [{ id: "one", speed: 30 }, { id: "two", speed: 40 }],
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(first.sharedSpeed, 60);
  assert.equal(first.activitiesPerDay, 4);
  assert.equal(changed.sharedSpeed, 30);
  assert.equal(changed.feetPerMinute, 300);
  assert.equal(changed.milesPerHour, 3);
  assert.equal(changed.milesPerDay, 24);
  assert.equal(changed.activitiesPerDay, 2);
});

test("vehicle riders use vehicle Speed while walkers still limit the party", () => {
  const mixed = calculateTravelState({
    plan: { mode: "vehicle", vehicleId: "wagon", riderIds: ["fast"], haulerIds: ["slow"] },
    members,
    vehicles,
    haulers,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(mixed.sharedSpeed, 20);
  assert.deepEqual(mixed.selectedHaulers, []);

  const boarded = calculateTravelState({
    plan: { mode: "vehicle", vehicleId: "wagon", riderIds: ["slow", "fast"] },
    members,
    vehicles,
    haulers,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(boarded.sharedSpeed, 40);
  assert.equal(boarded.activitiesPerDay, 2);
});

test("a pulled vehicle uses the slowest selected hauler and an optional vehicle limit", () => {
  const pulled = calculateTravelState({
    plan: {
      mode: "hauled",
      vehicleId: "wagon",
      riderIds: ["slow", "fast"],
      haulerIds: ["horse", "mule"],
    },
    members,
    vehicles,
    haulers,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(pulled.transportSpeed, 30);
  assert.equal(pulled.sharedSpeed, 30);
  assert.equal(pulled.activitiesPerDay, 2);

  const limited = calculateTravelState({
    plan: {
      mode: "hauled",
      vehicleId: "wagon",
      riderIds: ["slow", "fast"],
      haulerIds: ["horse"],
      manualSpeed: 25,
    },
    members,
    vehicles,
    haulers,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(limited.transportSpeed, 25);
  assert.equal(limited.sharedSpeed, 25);

  const customWagon = calculateTravelState({
    plan: {
      mode: "hauled",
      customVehicleName: "Covered Wagon",
      riderIds: ["slow", "fast"],
      haulerIds: ["horse"],
    },
    members,
    vehicles: [],
    haulers,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(customWagon.selectedVehicle.name, "Covered Wagon");
  assert.equal(customWagon.sharedSpeed, 40);
});

test("the GM Core activity thresholds include half an activity at Speed 10 or less", () => {
  assert.equal(calculateActivitiesPerDay(10), 0.5);
  assert.equal(calculateActivitiesPerDay(15), 1);
  assert.equal(calculateActivitiesPerDay(30), 2);
  assert.equal(calculateActivitiesPerDay(45), 3);
  assert.equal(calculateActivitiesPerDay(60), 4);

  const slow = calculateTravelState({
    plan: { mode: "foot", activities: [{ type: "travel", note: "Cross the plains" }] },
    members: [{ id: "slow", speed: 10 }],
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(slow.daysRequired, 2);
  assert.equal(slow.overCapacity, false);
});

test("travel plans are bounded and unknown activity values are made safe", () => {
  const plan = normalizeHexplorationPlan({
    mode: "teleport",
    riderIds: ["a", "a", ""],
    activities: Array.from({ length: 8 }, (_unused, index) => ({
      type: index === 0 ? "not-code" : "travel",
      note: "x".repeat(500),
    })),
  });
  assert.equal(plan.mode, "foot");
  assert.deepEqual(plan.riderIds, ["a"]);
  assert.equal(plan.activities.length, 4);
  assert.equal(plan.activities[0].type, "none");
  assert.equal(plan.activities[0].actorId, "");
  assert.equal(plan.activities[0].used, false);
  assert.equal(plan.activities[0].note.length, 200);
  assert.equal(plan.schemaVersion, 3);
  assert.equal(plan.travelModifiers.expressRider.skill, "nature");
});

test("Express Rider beneficiaries are de-duplicated and limited to six", () => {
  const plan = normalizeHexplorationPlan({
    travelModifiers: {
      expressRider: {
        skill: "survival",
        beneficiaryIds: ["a", "b", "a", "c", "d", "e", "f", "g"],
      },
    },
  });
  assert.equal(plan.travelModifiers.expressRider.skill, "nature");
  assert.deepEqual(plan.travelModifiers.expressRider.beneficiaryIds, ["a", "b", "c", "d", "e", "f"]);
});

test("daily assignments track assigned, used, and remaining activities", () => {
  const state = calculateTravelState({
    plan: {
      mode: "foot",
      activities: [
        { type: "reconnoiter", actorId: "slow", used: true },
        { type: "map-area", actorId: "fast", used: false },
      ],
    },
    members: [
      { id: "slow", speed: 30 },
      { id: "fast", speed: 35 },
    ],
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(state.activitiesPerDay, 2);
  assert.equal(state.assignedCount, 2);
  assert.equal(state.usedCount, 1);
  assert.equal(state.remainingActivities, 1);
  assert.equal(state.unassignedActivities, 0);
  assert.equal(state.plan.activities[0].actorId, "slow");
});

test("a successful Express Rider check increases hauled travel Speed by half for the day", () => {
  const state = calculateTravelState({
    plan: {
      mode: "hauled",
      vehicleId: "wagon",
      riderIds: ["slow", "fast"],
      haulerIds: ["horse"],
      travelModifiers: {
        expressRider: {
          enabled: true,
          actorId: "fast",
          skill: "nature",
          dc: 20,
          outcome: "success",
          rollTotal: 24,
        },
      },
    },
    members,
    vehicles,
    haulers,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(state.baseTransportSpeed, 40);
  assert.equal(state.transportSpeed, 60);
  assert.equal(state.sharedSpeed, 60);
  assert.equal(state.expressRiderApplied, true);
  assert.equal(state.expressRiderSpeedBonus, 20);
  assert.equal(state.activitiesPerDay, 4);
});

test("Express Rider does not boost foot travel or a failed check", () => {
  const foot = calculateTravelState({
    plan: {
      mode: "foot",
      travelModifiers: { expressRider: { enabled: true, outcome: "criticalSuccess" } },
    },
    members,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(foot.expressRiderSuccessful, true);
  assert.equal(foot.expressRiderApplied, false);
  assert.equal(foot.sharedSpeed, 20);

  const failed = calculateTravelState({
    plan: {
      mode: "hauled",
      vehicleId: "wagon",
      riderIds: ["slow", "fast"],
      haulerIds: ["horse"],
      travelModifiers: { expressRider: { enabled: true, outcome: "failure" } },
    },
    members,
    vehicles,
    haulers,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(failed.transportSpeed, 40);
  assert.equal(failed.expressRiderApplied, false);
});

test("Express Rider can boost selected walkers while unselected walkers still limit the party", () => {
  const boosted = calculateTravelState({
    plan: {
      mode: "foot",
      travelModifiers: {
        expressRider: {
          enabled: true,
          actorId: "fast",
          dc: 20,
          outcome: "success",
          beneficiaryIds: ["slow", "fast"],
        },
      },
    },
    members,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(boosted.baseSharedSpeed, 20);
  assert.equal(boosted.sharedSpeed, 30);
  assert.equal(boosted.expressRiderApplied, true);
  assert.equal(boosted.expressRiderSpeedBonus, 10);

  const limited = calculateTravelState({
    plan: {
      mode: "foot",
      travelModifiers: {
        expressRider: {
          enabled: true,
          actorId: "fast",
          outcome: "success",
          beneficiaryIds: ["fast"],
        },
      },
    },
    members,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(limited.sharedSpeed, 20);
});

test("travel Actor folder membership includes descendants", () => {
  const travel = { id: "travel", folder: null };
  const animals = { id: "animals", folder: travel };
  const horses = { id: "horses", folder: animals };
  assert.equal(actorIsInTravelFolder({ folder: horses }, animals), true);
  assert.equal(actorIsInTravelFolder({ folder: horses }, travel), true);
  assert.equal(actorIsInTravelFolder({ folder: horses }, { id: "vehicles" }), false);
});

test("Express Rider requires a selected party member before its daily result can apply", () => {
  const state = calculateTravelState({
    plan: {
      mode: "hauled",
      vehicleId: "wagon",
      riderIds: ["slow", "fast"],
      haulerIds: ["horse"],
      travelModifiers: {
        expressRider: { enabled: true, outcome: "success" },
      },
    },
    members,
    vehicles,
    haulers,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(state.expressRiderSuccessful, true);
  assert.equal(state.expressRiderEligible, false);
  assert.equal(state.expressRiderApplied, false);
  assert.equal(state.transportSpeed, 40);
});

test("manual travel effects adjust shared Speed and check degrees map safely", () => {
  const state = calculateTravelState({
    plan: {
      mode: "foot",
      travelModifiers: { other: { enabled: true, label: "Tailwind", speedBonus: 10 } },
    },
    members,
    config: DEFAULT_HEXPLORATION_CONFIG,
  });
  assert.equal(state.baseSharedSpeed, 20);
  assert.equal(state.sharedSpeed, 30);
  assert.equal(state.customSpeedBonus, 10);
  assert.equal(expressRiderOutcomeFromDegree(0), "criticalFailure");
  assert.equal(expressRiderOutcomeFromDegree(2), "success");
  assert.equal(expressRiderOutcomeFromDegree(99), "unrolled");
});

test("PF2e v13 and v14 actor and vehicle Speed paths are supported", () => {
  assert.equal(getActorGroundSpeed({ system: { attributes: { speed: { total: 25 } } } }), 25);
  assert.equal(getActorGroundSpeed({ system: { movement: { speeds: { land: { value: 35 } } } } }), 35);
  assert.equal(getVehicleGroundSpeed({ system: { movement: { speeds: { drive: { value: 50 } } } } }), 50);
  assert.equal(getVehicleGroundSpeed({ system: { details: { speed: "Speed 30 feet" } } }), 30);
});

test("the prepared party travel value changes without touching member combat Speeds", () => {
  const party = {
    type: "party",
    system: { movement: { speeds: { travel: { value: 20 } } } },
  };
  const state = { travelValid: true, valid: false, sharedSpeed: 40 };
  assert.equal(applyPreparedPartyTravelSpeed(party, state), true);
  assert.equal(party.system.movement.speeds.travel.value, 40);
  assert.equal(members[0].speed, 20);
});
