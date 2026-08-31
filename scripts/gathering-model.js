import { getCraftingResourceData } from "./crafting-categories.js";
import {
  CRAFTING_DIFFICULTY_ADJUSTMENTS,
  calculateCraftingDC,
} from "./crafting-dc.js";

export const GATHERING_SCHEMA_VERSION = 1;

export const GATHERING_SKILLS = Object.freeze([
  Object.freeze({ id: "arcana", label: "Arcana" }),
  Object.freeze({ id: "crafting", label: "Crafting" }),
  Object.freeze({ id: "nature", label: "Nature" }),
  Object.freeze({ id: "survival", label: "Survival" }),
]);

const SKILL_IDS = new Set(GATHERING_SKILLS.map((skill) => skill.id));
const DEGREE_BY_NUMBER = Object.freeze({
  0: "criticalFailure",
  1: "failure",
  2: "success",
  3: "criticalSuccess",
});
const DEGREE_IDS = new Set(Object.values(DEGREE_BY_NUMBER));
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export class GatheringValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "GatheringValidationError";
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nonBlank(value, path) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new GatheringValidationError(`${path} cannot be blank.`);
  return text;
}

function slug(value, path) {
  const text = nonBlank(value, path).toLowerCase();
  if (!SLUG_PATTERN.test(text)) throw new GatheringValidationError(`${path} must be a lowercase slug.`);
  return text;
}

function wholeNumber(value, path, { minimum = 0 } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) {
    throw new GatheringValidationError(`${path} must be a whole number of at least ${minimum}.`);
  }
  return number;
}

function stringList(source, path, { slugs = false } = {}) {
  if (source === undefined) return [];
  if (!Array.isArray(source)) throw new GatheringValidationError(`${path} must be an array.`);
  return [...new Set(source.map((value, index) => (
    slugs ? slug(value, `${path}[${index}]`) : nonBlank(value, `${path}[${index}]`)
  )))];
}

export function normalizeGatheringEnvironment(source) {
  if (!source || typeof source !== "object") {
    throw new GatheringValidationError("A gathering environment must be an object.");
  }
  const selectionMode = source.selectionMode === "blind" ? "blind" : "targeted";
  return {
    schemaVersion: GATHERING_SCHEMA_VERSION,
    id: slug(source.id, "id"),
    name: nonBlank(source.name, "name"),
    description: typeof source.description === "string" ? source.description.trim() : "",
    img: typeof source.img === "string" ? source.img.trim() : "",
    enabled: source.enabled !== false,
    selectionMode,
    biomeIds: stringList(source.biomeIds, "biomeIds", { slugs: true }),
    taskIds: stringList(source.taskIds, "taskIds", { slugs: true }),
    sceneUuid: typeof source.sceneUuid === "string" ? source.sceneUuid.trim() : "",
  };
}

export function normalizeGatheringTask(source) {
  if (!source || typeof source !== "object") {
    throw new GatheringValidationError("A gathering task must be an object.");
  }
  const tier = wholeNumber(source.tier, "tier", { minimum: 1 });
  if (tier > 6) throw new GatheringValidationError("tier must be from 1 to 6.");
  const skill = slug(source.check?.skill, "check.skill");
  if (!SKILL_IDS.has(skill)) throw new GatheringValidationError(`check.skill \"${skill}\" is not supported.`);
  const adjustment = Object.hasOwn(CRAFTING_DIFFICULTY_ADJUSTMENTS, source.check?.adjustment)
    ? source.check.adjustment
    : "normal";
  const variantSource = typeof source.variantId === "string" ? source.variantId.trim() : "";

  return {
    schemaVersion: GATHERING_SCHEMA_VERSION,
    id: slug(source.id, "id"),
    name: nonBlank(source.name, "name"),
    description: typeof source.description === "string" ? source.description.trim() : "",
    img: typeof source.img === "string" ? source.img.trim() : "",
    enabled: source.enabled !== false,
    environmentIds: stringList(source.environmentIds, "environmentIds", { slugs: true }),
    materialId: slug(source.materialId, "materialId"),
    tier,
    variantId: variantSource ? slug(variantSource, "variantId") : "",
    check: {
      skill,
      adjustment,
    },
    yields: {
      criticalFailure: wholeNumber(source.yields?.criticalFailure ?? 0, "yields.criticalFailure"),
      failure: wholeNumber(source.yields?.failure ?? 0, "yields.failure"),
      success: wholeNumber(source.yields?.success ?? 1, "yields.success"),
      criticalSuccess: wholeNumber(source.yields?.criticalSuccess ?? 2, "yields.criticalSuccess"),
    },
    timeMinutes: wholeNumber(source.timeMinutes ?? 60, "timeMinutes", { minimum: 1 }),
    requiredToolUuids: stringList(source.requiredToolUuids, "requiredToolUuids"),
  };
}

export function normalizeDegreeOfSuccess(value) {
  if (typeof value === "number") return DEGREE_BY_NUMBER[value] ?? null;
  const text = typeof value === "string" ? value.replace(/[\s_-]/gu, "").toLowerCase() : "";
  const normalized = {
    criticalfailure: "criticalFailure",
    failure: "failure",
    success: "success",
    criticalsuccess: "criticalSuccess",
  }[text];
  return DEGREE_IDS.has(normalized) ? normalized : null;
}

export function gatheringResourceKey({ materialId, tier, variantId = "" } = {}) {
  const normalizedMaterial = typeof materialId === "string" ? materialId.trim().toLowerCase() : "";
  const normalizedTier = Number(tier);
  const normalizedVariant = typeof variantId === "string" ? variantId.trim().toLowerCase() : "";
  if (!normalizedMaterial || !Number.isInteger(normalizedTier) || normalizedTier < 1 || normalizedTier > 6) return null;
  return `${normalizedMaterial}|${normalizedTier}|${normalizedVariant}`;
}

export function findGatheringResource(taskSource, items) {
  const task = normalizeGatheringTask(taskSource);
  const expectedKey = gatheringResourceKey(task);
  for (const item of Array.from(items ?? [])) {
    const resource = getCraftingResourceData(item);
    if (resource && gatheringResourceKey(resource) === expectedKey) return item;
  }
  return null;
}

export function listTasksForEnvironment(environmentSource, taskSources) {
  const environment = normalizeGatheringEnvironment(environmentSource);
  return Array.from(taskSources ?? [])
    .map((task) => normalizeGatheringTask(task))
    .filter((task) => task.enabled && (
      environment.taskIds.includes(task.id) || task.environmentIds.includes(environment.id)
    ))
    .map(clone);
}

export function evaluateGatheringTask(taskSource, {
  environment = null,
  resources = [],
  materialEnabled = true,
  sceneUuid = "",
} = {}) {
  const task = normalizeGatheringTask(taskSource);
  const normalizedEnvironment = environment ? normalizeGatheringEnvironment(environment) : null;
  const environmentMatches = !normalizedEnvironment || (
    normalizedEnvironment.taskIds.includes(task.id) || task.environmentIds.includes(normalizedEnvironment.id)
  );
  const sceneMatches = !normalizedEnvironment?.sceneUuid || normalizedEnvironment.sceneUuid === sceneUuid;
  const resource = findGatheringResource(task, resources);
  const check = calculateCraftingDC(task.tier, task.check.adjustment);
  const warnings = [
    !task.enabled ? "task-disabled" : null,
    normalizedEnvironment && !normalizedEnvironment.enabled ? "environment-disabled" : null,
    !environmentMatches ? "environment-mismatch" : null,
    !sceneMatches ? "scene-mismatch" : null,
    !materialEnabled ? "material-disabled" : null,
    !resource ? "resource-missing" : null,
  ].filter(Boolean);

  return {
    task,
    environment: normalizedEnvironment,
    resource,
    check,
    available: warnings.length === 0,
    warnings,
  };
}

export function resolveGatheringOutcome(taskSource, degree, resourceSource = null) {
  const task = normalizeGatheringTask(taskSource);
  const outcome = normalizeDegreeOfSuccess(degree);
  if (!outcome) throw new GatheringValidationError("The gathering roll did not provide a valid degree of success.");
  const resource = resourceSource ? getCraftingResourceData(resourceSource) : null;
  const quantity = task.yields[outcome];
  return {
    outcome,
    quantity,
    units: quantity * (resource?.unitsPerItem ?? 1),
    resource: resource ? clone(resource) : null,
  };
}
