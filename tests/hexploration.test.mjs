import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_HEXPLORATION_CONFIG } from "../scripts/constants.js";
import {
  applyPreparedPartyTravelSpeed,
  calculateActivitiesPerDay,
  calculateTravelState,
  getActorGroundSpeed,
  getVehicleGroundSpeed,
  normalizeHexplorationPlan,
} from "../scripts/hexploration-model.js";

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
  assert.equal(plan.activities[0].note.length, 200);
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
