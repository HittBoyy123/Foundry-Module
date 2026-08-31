import { DEFAULT_HEXPLORATION_CONFIG, HEXPLORATION_PLAN_SCHEMA_VERSION } from "./constants.js";

export const TRAVEL_MODES = Object.freeze(["foot", "vehicle", "hauled"]);
export const TRAVEL_CHECK_SKILLS = Object.freeze(["survival", "nature"]);
export const EXPRESS_RIDER_OUTCOMES = Object.freeze([
  "unrolled",
  "criticalFailure",
  "failure",
  "success",
  "criticalSuccess",
]);
export const ACTIVITY_TYPES = Object.freeze([
  "none",
  "travel",
  "reconnoiter",
  "fortify-camp",
  "map-area",
  "subsist",
  "other",
]);

const MAX_ACTIVITY_SLOTS = 4;
const MAX_SPEED = 1000;
const MAX_CHECK_DC = 100;

function cleanId(value) {
  return typeof value === "string" ? value.trim().slice(0, 128) : "";
}

function uniqueIds(value) {
  return Array.isArray(value) ? [...new Set(value.map(cleanId).filter(Boolean))] : [];
}

function finiteSpeed(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.min(number, MAX_SPEED) : null;
}

function finiteAdjustment(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(-MAX_SPEED, Math.min(number, MAX_SPEED)) : 0;
}

function finiteCheckValue(value, maximum = Number.POSITIVE_INFINITY) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(Math.trunc(number), maximum)) : null;
}

function finiteRollTotal(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(-MAX_SPEED, Math.min(Math.trunc(number), MAX_SPEED)) : null;
}

export function expressRiderOutcomeFromDegree(degree) {
  return ["criticalFailure", "failure", "success", "criticalSuccess"][Number(degree)] ?? "unrolled";
}

function parseSpeedText(value) {
  if (typeof value !== "string") return null;
  const match = value.replaceAll(",", "").match(/(?:^|\s)(\d+(?:\.\d+)?)(?:\s*(?:feet|foot|ft)\b|\s|$)/i);
  return match ? finiteSpeed(match[1]) : null;
}

export function getActorGroundSpeed(actor) {
  const candidates = [
    actor?.system?.movement?.speeds?.land?.total,
    actor?.system?.movement?.speeds?.land?.value,
    actor?.system?.attributes?.speed?.total,
    actor?.system?.attributes?.speed?.value,
  ];
  for (const candidate of candidates) {
    const speed = finiteSpeed(candidate);
    if (speed !== null) return speed;
  }
  return 0;
}

export function getVehicleGroundSpeed(actor) {
  const candidates = [
    actor?.system?.movement?.speeds?.drive?.total,
    actor?.system?.movement?.speeds?.drive?.value,
    actor?.system?.attributes?.speed?.total,
    actor?.system?.attributes?.speed?.value,
  ];
  for (const candidate of candidates) {
    const speed = finiteSpeed(candidate);
    if (speed !== null) return speed;
  }
  return parseSpeedText(actor?.system?.details?.speed) ?? 0;
}

export function normalizeHexplorationPlan(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const mode = TRAVEL_MODES.includes(source.mode) ? source.mode : "foot";
  const manualSpeed = finiteSpeed(source.manualSpeed);
  const activities = (Array.isArray(source.activities) ? source.activities : [])
    .slice(0, MAX_ACTIVITY_SLOTS)
    .map((activity) => {
      const type = ACTIVITY_TYPES.includes(activity?.type) ? activity.type : "none";
      return {
        type,
        actorId: cleanId(activity?.actorId),
        note: String(activity?.note ?? "").trim().slice(0, 200),
        used: type !== "none" && activity?.used === true,
      };
    });
  const modifierSource = source.travelModifiers && typeof source.travelModifiers === "object"
    ? source.travelModifiers
    : {};
  const expressSource = modifierSource.expressRider && typeof modifierSource.expressRider === "object"
    ? modifierSource.expressRider
    : {};
  const otherSource = modifierSource.other && typeof modifierSource.other === "object"
    ? modifierSource.other
    : {};
  const skill = TRAVEL_CHECK_SKILLS.includes(expressSource.skill) ? expressSource.skill : "survival";
  const outcome = EXPRESS_RIDER_OUTCOMES.includes(expressSource.outcome)
    ? expressSource.outcome
    : "unrolled";

  return {
    schemaVersion: HEXPLORATION_PLAN_SCHEMA_VERSION,
    mode,
    vehicleId: cleanId(source.vehicleId),
    customVehicleName: String(source.customVehicleName ?? "").trim().slice(0, 80),
    manualSpeed: manualSpeed && manualSpeed > 0 ? manualSpeed : null,
    riderIds: uniqueIds(source.riderIds),
    haulerIds: uniqueIds(source.haulerIds),
    activities,
    travelModifiers: {
      expressRider: {
        enabled: expressSource.enabled === true,
        actorId: cleanId(expressSource.actorId),
        skill,
        dc: finiteCheckValue(expressSource.dc, MAX_CHECK_DC),
        outcome,
        rollTotal: finiteRollTotal(expressSource.rollTotal),
      },
      other: {
        enabled: otherSource.enabled === true,
        label: String(otherSource.label ?? "").trim().slice(0, 80),
        speedBonus: finiteAdjustment(otherSource.speedBonus),
      },
    },
  };
}

export function calculateActivitiesPerDay(speed, config = DEFAULT_HEXPLORATION_CONFIG) {
  const travelSpeed = finiteSpeed(speed) ?? 0;
  const thresholds = Array.isArray(config.activityThresholds)
    ? config.activityThresholds
    : DEFAULT_HEXPLORATION_CONFIG.activityThresholds;
  const threshold = thresholds.find((entry) => entry.maxSpeed === null || travelSpeed <= entry.maxSpeed);
  return Number(threshold?.activities ?? 0);
}

function indexById(entries) {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

export function calculateTravelState({ plan: inputPlan, members = [], vehicles = [], haulers = [], config }) {
  const plan = normalizeHexplorationPlan(inputPlan);
  const hexConfig = config ?? DEFAULT_HEXPLORATION_CONFIG;
  const normalizedMembers = members.map((member) => ({ ...member, speed: finiteSpeed(member.speed) ?? 0 }));
  const memberById = indexById(normalizedMembers);
  const vehicleById = indexById(vehicles.map((vehicle) => ({
    ...vehicle,
    speed: finiteSpeed(vehicle.speed) ?? 0,
  })));
  const haulerById = indexById(haulers.map((hauler) => ({
    ...hauler,
    speed: finiteSpeed(hauler.speed) ?? 0,
  })));
  const selectedVehicle = vehicleById.get(plan.vehicleId) ?? (plan.customVehicleName
    ? { id: "custom", name: plan.customVehicleName, speed: 0, custom: true }
    : null);
  const selectedHaulers = plan.mode === "hauled"
    ? plan.haulerIds.map((id) => haulerById.get(id)).filter(Boolean)
    : [];
  const selectedHaulerIds = new Set(selectedHaulers.map((hauler) => hauler.id));
  const riderIds = new Set(plan.riderIds.filter((id) => memberById.has(id) && !selectedHaulerIds.has(id)));
  const walkingMembers = normalizedMembers.filter((member) => !riderIds.has(member.id) && !selectedHaulerIds.has(member.id));
  const warnings = [];
  const expressRiderSuccessful = plan.travelModifiers.expressRider.enabled
    && ["success", "criticalSuccess"].includes(plan.travelModifiers.expressRider.outcome);
  const expressRiderEligible = memberById.has(plan.travelModifiers.expressRider.actorId)
    && plan.mode === "hauled"
    && selectedHaulers.length > 0;
  const expressRiderApplied = expressRiderSuccessful && expressRiderEligible;

  let transportSpeed = null;
  let baseTransportSpeed = null;
  if (plan.mode !== "foot") {
    if (!selectedVehicle) {
      warnings.push("vehicle-required");
    } else if (plan.mode === "vehicle") {
      baseTransportSpeed = selectedVehicle.speed;
      transportSpeed = plan.manualSpeed ?? baseTransportSpeed;
      if (!(transportSpeed > 0)) warnings.push("vehicle-speed-required");
    } else {
      if (selectedHaulers.length === 0) {
        warnings.push("hauler-required");
      } else {
        const haulerSpeed = Math.min(...selectedHaulers.map((hauler) => hauler.speed));
        baseTransportSpeed = haulerSpeed;
        const effectiveHaulerSpeed = expressRiderApplied ? haulerSpeed * 1.5 : haulerSpeed;
        transportSpeed = plan.manualSpeed ? Math.min(plan.manualSpeed, effectiveHaulerSpeed) : effectiveHaulerSpeed;
        if (!(transportSpeed > 0)) warnings.push("hauler-speed-required");
      }
    }
  }

  const speedContributors = plan.mode === "foot"
    ? normalizedMembers.map((member) => member.speed)
    : walkingMembers.map((member) => member.speed);
  if (plan.mode !== "foot" && transportSpeed !== null) speedContributors.push(transportSpeed);
  const baseSharedSpeed = speedContributors.length > 0 ? Math.min(...speedContributors) : 0;
  const customSpeedBonus = plan.travelModifiers.other.enabled
    ? plan.travelModifiers.other.speedBonus
    : 0;
  const sharedSpeed = Math.max(0, Math.min(baseSharedSpeed + customSpeedBonus, MAX_SPEED));
  if (normalizedMembers.length === 0) warnings.push("members-required");
  const travelValid = warnings.length === 0;

  const activitiesPerDay = calculateActivitiesPerDay(sharedSpeed, hexConfig);
  const plannedActivities = plan.activities.filter((activity) => activity.type !== "none");
  const usedActivities = plannedActivities.filter((activity) => activity.used);
  const maxPlannableActivities = Math.max(1, Math.ceil(activitiesPerDay));
  const overCapacity = plannedActivities.length > maxPlannableActivities;
  if (overCapacity) warnings.push("activity-limit");

  return {
    plan,
    mode: plan.mode,
    selectedVehicle,
    selectedHaulers,
    riderIds: [...riderIds],
    walkingMembers,
    transportSpeed,
    baseTransportSpeed,
    baseSharedSpeed,
    sharedSpeed,
    feetPerMinute: sharedSpeed * 10,
    milesPerHour: sharedSpeed / Number(hexConfig.milesPerHourDivisor ?? 10),
    milesPerDay: sharedSpeed * Number(hexConfig.milesPerDayMultiplier ?? 0.8),
    activitiesPerDay,
    plannedActivities,
    usedActivities,
    assignedCount: plannedActivities.length,
    usedCount: usedActivities.length,
    remainingActivities: Math.max(activitiesPerDay - usedActivities.length, 0),
    unassignedActivities: Math.max(maxPlannableActivities - plannedActivities.length, 0),
    daysRequired: activitiesPerDay === 0.5
      ? Math.max(plannedActivities.length * 2, 1)
      : Math.max(Math.ceil(plannedActivities.length / Math.max(activitiesPerDay, 1)), 1),
    overCapacity,
    travelValid,
    valid: travelValid && !overCapacity,
    expressRiderSuccessful,
    expressRiderEligible,
    expressRiderApplied,
    expressRiderSpeedBonus: expressRiderApplied && transportSpeed !== null && baseTransportSpeed !== null
      ? Math.max(transportSpeed - baseTransportSpeed, 0)
      : 0,
    customSpeedBonus,
    warnings,
  };
}

export function applyPreparedPartyTravelSpeed(party, state) {
  if (!party || party.type !== "party" || !(state?.travelValid ?? state?.valid)) return false;
  const speed = state.sharedSpeed;
  let applied = false;
  const travel = party.system?.movement?.speeds?.travel;
  if (travel && typeof travel === "object") {
    travel.value = speed;
    applied = true;
  }
  const legacy = party.system?.attributes?.speed;
  if (legacy && typeof legacy === "object") {
    legacy.value = speed;
    applied = true;
  }
  return applied;
}
