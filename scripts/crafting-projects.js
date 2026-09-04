import { getCraftingResourceData } from "./crafting-categories.js";
import { evaluateCraftingRecipe, normalizeCraftingRecipe } from "./crafting-recipes.js";
import { defaultProjectProgress } from "./recipe-catalog.js";
import { MODULE_ID } from "./constants.js";

export const CRAFTING_PROJECT_SCHEMA_VERSION = 1;
export const CRAFTING_WORKBENCH_SCHEMA_VERSION = 1;

export const CRAFTING_PROJECT_STAGES = Object.freeze([
  "planning",
  "components",
  "assembly",
  "artisan-work",
  "finalisation",
  "completed",
  "cancelled",
]);

export const CRAFTING_PROJECT_STATUSES = Object.freeze([
  "draft",
  "reserved",
  "active",
  "ready",
  "completed",
  "cancelled",
]);

const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function text(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function integer(value, fallback = 0, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const normalized = Math.trunc(Number(value));
  return Number.isFinite(normalized) ? Math.min(maximum, Math.max(minimum, normalized)) : fallback;
}

function id(value, fallbackPrefix = "project") {
  const normalized = text(value);
  if (normalized) return normalized;
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${fallbackPrefix}-${random}`;
}

function timestamp(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : Date.now();
}

function normalizeReservation(source, index) {
  return {
    id: id(source?.id, `reservation-${index + 1}`),
    groupId: text(source?.groupId, `requirement-${index + 1}`),
    groupLabel: text(source?.groupLabel, `Requirement ${index + 1}`),
    itemId: text(source?.itemId),
    itemUuid: text(source?.itemUuid),
    itemName: text(source?.itemName, "Crafting Resource"),
    materialId: text(source?.materialId),
    tier: integer(source?.tier, 1, 1, 6),
    variantId: text(source?.variantId),
    quantity: integer(source?.quantity, 0, 0),
    units: integer(source?.units, 0, 0),
    unitsPerItem: integer(source?.unitsPerItem, 1, 1),
    state: source?.state === "consumed" ? "consumed" : "reserved",
  };
}

function normalizeWorkBlock(source, index) {
  return {
    id: id(source?.id, `work-${index + 1}`),
    days: integer(source?.days, 1, 1, 5),
    degree: ["criticalFailure", "failure", "success", "criticalSuccess"].includes(source?.degree)
      ? source.degree
      : "success",
    progress: integer(source?.progress, 0, 0),
    rollTotal: Number.isFinite(Number(source?.rollTotal)) ? Number(source.rollTotal) : null,
    dc: Number.isFinite(Number(source?.dc)) ? Number(source.dc) : null,
    artisanUuid: text(source?.artisanUuid),
    artisanName: text(source?.artisanName),
    userId: text(source?.userId),
    createdAt: timestamp(source?.createdAt),
  };
}

function normalizeAuditEntry(source, index) {
  return {
    id: id(source?.id, `audit-${index + 1}`),
    action: text(source?.action, "updated"),
    message: text(source?.message),
    userId: text(source?.userId),
    userName: text(source?.userName),
    createdAt: timestamp(source?.createdAt),
    details: source?.details && typeof source.details === "object" ? clone(source.details) : {},
  };
}

export function progressForWorkBlock(days, degree) {
  const committed = integer(days, 1, 1, 5);
  switch (degree) {
    case "criticalSuccess": return Math.ceil(committed * 1.5);
    case "success": return committed;
    case "failure": return committed >= 2 ? Math.max(1, Math.floor(committed * 0.5)) : 0;
    case "criticalFailure": return 0;
    default: throw new Error("Choose a valid degree of success.");
  }
}

export function normalizeCraftingProject(source) {
  if (!source || typeof source !== "object") throw new TypeError("A crafting project must be an object.");
  const recipe = normalizeCraftingRecipe(source.recipe);
  const status = CRAFTING_PROJECT_STATUSES.includes(source.status) ? source.status : "draft";
  const requiredProgress = integer(source.requiredProgress, defaultProjectProgress(recipe), 1);
  const currentProgress = integer(source.currentProgress, 0, 0, requiredProgress);
  const stage = CRAFTING_PROJECT_STAGES.includes(source.stage)
    ? source.stage
    : status === "draft" ? "planning" : "components";
  return {
    schemaVersion: CRAFTING_PROJECT_SCHEMA_VERSION,
    id: id(source.id),
    name: text(source.name, recipe.name),
    partyUuid: text(source.partyUuid),
    baseItemUuid: text(source.baseItemUuid),
    baseItemName: text(source.baseItemName, recipe.name),
    baseItemImg: text(source.baseItemImg, "icons/svg/item-bag.svg"),
    recipeBandId: text(source.recipeBandId),
    recipe,
    coreMaterialId: text(source.coreMaterialId),
    coreTier: integer(source.coreTier, recipe.tier, 1, 6),
    leadArtisanUuid: text(source.leadArtisanUuid),
    leadArtisanName: text(source.leadArtisanName),
    status,
    stage,
    reservations: (Array.isArray(source.reservations) ? source.reservations : []).map(normalizeReservation),
    requiredProgress,
    currentProgress,
    downtimeSpent: integer(source.downtimeSpent, 0, 0),
    workBlocks: (Array.isArray(source.workBlocks) ? source.workBlocks : []).map(normalizeWorkBlock),
    audit: (Array.isArray(source.audit) ? source.audit : []).map(normalizeAuditEntry),
    createdBy: text(source.createdBy),
    createdAt: timestamp(source.createdAt),
    updatedAt: timestamp(source.updatedAt),
    completedAt: source.completedAt ? timestamp(source.completedAt) : null,
    completedBy: text(source.completedBy),
    finalItemUuid: text(source.finalItemUuid),
    consumptionConfirmed: source.consumptionConfirmed === true,
  };
}

export function normalizeCraftingWorkbench(source) {
  const input = source && typeof source === "object" ? source : {};
  const projects = [];
  const seen = new Set();
  for (const value of Array.isArray(input.projects) ? input.projects : []) {
    try {
      const project = normalizeCraftingProject(value);
      if (seen.has(project.id)) continue;
      seen.add(project.id);
      projects.push(project);
    } catch (_error) {
      // Ignore corrupt legacy entries so one bad project cannot hide the Workbench.
    }
  }
  return { schemaVersion: CRAFTING_WORKBENCH_SCHEMA_VERSION, projects };
}

function audit(project, action, message, user = {}, details = {}) {
  return {
    ...project,
    updatedAt: Date.now(),
    audit: [...project.audit, normalizeAuditEntry({
      action,
      message,
      userId: user.id,
      userName: user.name,
      details,
    }, project.audit.length)],
  };
}

export function createCraftingProject(source, user = {}) {
  let project = normalizeCraftingProject({
    ...source,
    status: "draft",
    stage: "planning",
    reservations: [],
    currentProgress: 0,
    downtimeSpent: 0,
    workBlocks: [],
    audit: [],
    createdBy: user.id ?? source.createdBy,
  });
  project = audit(project, "created", "Project plan created.", user);
  return project;
}

export function reservationLedger(projects, { excludeProjectId = "" } = {}) {
  const ledger = new Map();
  for (const source of projects ?? []) {
    let project;
    try {
      project = normalizeCraftingProject(source);
    } catch (_error) {
      continue;
    }
    if (project.id === excludeProjectId || TERMINAL_STATUSES.has(project.status)) continue;
    for (const reservation of project.reservations.filter((entry) => entry.state === "reserved")) {
      ledger.set(reservation.itemId, (ledger.get(reservation.itemId) ?? 0) + reservation.quantity);
    }
  }
  return ledger;
}

function availableStacks(items, ledger) {
  return Array.from(items ?? []).flatMap((item) => {
    const resource = getCraftingResourceData(item);
    if (!resource) return [];
    const quantity = integer(item.system?.quantity ?? item.quantity, 0, 0);
    const reserved = ledger.get(item.id ?? item._id ?? "") ?? 0;
    const availableQuantity = Math.max(0, quantity - reserved);
    if (!availableQuantity) return [];
    return [{
      item,
      itemId: item.id ?? item._id ?? "",
      itemUuid: item.uuid ?? "",
      itemName: item.name ?? "Crafting Resource",
      quantity: availableQuantity,
      materialId: resource.materialId,
      tier: resource.tier,
      variantId: resource.variantId,
      unitsPerItem: resource.unitsPerItem,
    }];
  });
}

function allocateStackReservations(allocation, stacks, groupLabels = new Map()) {
  const remaining = new Map(stacks.map((entry) => [entry.itemId, entry.quantity]));
  const reservations = [];
  for (const requirement of allocation) {
    for (const resource of requirement.allocations ?? [requirement]) {
      let unitsNeeded = resource.units;
      const candidates = stacks.filter((stack) => (
        stack.materialId === resource.materialId
        && stack.tier === resource.tier
        && (!resource.variantId || stack.variantId === resource.variantId)
      ));
      for (const stack of candidates) {
        const availableQuantity = remaining.get(stack.itemId) ?? 0;
        if (!availableQuantity || unitsNeeded <= 0) continue;
        const quantity = Math.min(availableQuantity, Math.ceil(unitsNeeded / stack.unitsPerItem));
        const units = quantity * stack.unitsPerItem;
        remaining.set(stack.itemId, availableQuantity - quantity);
        reservations.push(normalizeReservation({
          groupId: requirement.groupId,
          groupLabel: groupLabels.get(requirement.groupId) ?? requirement.groupId,
          itemId: stack.itemId,
          itemUuid: stack.itemUuid,
          itemName: stack.itemName,
          materialId: stack.materialId,
          tier: stack.tier,
          variantId: stack.variantId,
          quantity,
          units,
          unitsPerItem: stack.unitsPerItem,
        }, reservations.length));
        unitsNeeded -= units;
      }
      if (unitsNeeded > 0) throw new Error("The selected Party Stash stock changed before it could be reserved.");
    }
  }
  return reservations;
}

export function reserveCraftingProject(source, { inventoryItems = [], otherProjects = [], user = {} } = {}) {
  let project = normalizeCraftingProject(source);
  if (TERMINAL_STATUSES.has(project.status)) throw new Error("A completed or cancelled project cannot reserve materials.");
  const ledger = reservationLedger(otherProjects, { excludeProjectId: project.id });
  const stacks = availableStacks(inventoryItems, ledger);
  const virtualItems = stacks.map((stack) => ({
    id: stack.itemId,
    _id: stack.itemId,
    name: stack.itemName,
    uuid: stack.itemUuid,
    system: { quantity: stack.quantity },
    flags: {
      [MODULE_ID]: {
        resource: {
          materialId: stack.materialId,
          tier: stack.tier,
          variantId: stack.variantId,
          unitsPerItem: stack.unitsPerItem,
          unit: "resource",
        },
      },
    },
  }));
  const evaluation = evaluateCraftingRecipe(project.recipe, {
    targetItem: {
      type: project.recipe.categoryId.startsWith("weapon.") ? "weapon"
        : project.recipe.categoryId.startsWith("armor.") || project.recipe.categoryId === "shield" ? "armor"
        : "equipment",
      system: {
        category: project.recipe.categoryId.startsWith("weapon.") || project.recipe.categoryId.startsWith("armor.")
          ? project.recipe.categoryId.split(".")[1]
          : project.recipe.categoryId === "shield" ? "shield" : null,
        traits: { otherTags: project.recipe.categoryId === "spell-focus" ? ["spell-focus"] : [] },
      },
    },
    inventoryItems: virtualItems,
  });
  if (!evaluation.craftable) throw new Error("The Party Stash does not have enough unreserved resources for this recipe.");
  const selectedSet = project.recipe.ingredientSets.find((set) => set.id === evaluation.selectedSet?.id);
  const groupLabels = new Map((selectedSet?.groups ?? []).map((group) => [group.id, group.label]));
  project.reservations = allocateStackReservations(evaluation.allocation, stacks, groupLabels);
  project.status = "reserved";
  project.stage = "components";
  project = audit(project, "reserved", "Party Stash resources reserved.", user, {
    reservations: clone(project.reservations),
  });
  return project;
}

export function releaseCraftingProject(source, user = {}) {
  let project = normalizeCraftingProject(source);
  if (project.status === "completed") throw new Error("A completed project cannot be cancelled.");
  project.status = "cancelled";
  project.stage = "cancelled";
  project.reservations = [];
  project = audit(project, "cancelled", "Project cancelled; unconsumed reservations released.", user);
  return project;
}

export function advanceCraftingProject(source, {
  days = 1,
  degree = "success",
  rollTotal = null,
  dc = null,
  artisanUuid = "",
  artisanName = "",
  user = {},
} = {}) {
  let project = normalizeCraftingProject(source);
  if (!project.reservations.length) throw new Error("Reserve the required Party Stash materials before beginning work.");
  if (TERMINAL_STATUSES.has(project.status) || project.status === "ready") {
    throw new Error("This project cannot receive another Work Block.");
  }
  const committedDays = integer(days, 1, 1, 5);
  const progress = progressForWorkBlock(committedDays, degree);
  const before = project.currentProgress;
  const after = Math.min(project.requiredProgress, before + progress);
  const block = normalizeWorkBlock({
    days: committedDays,
    degree,
    progress: after - before,
    rollTotal,
    dc,
    artisanUuid: artisanUuid || project.leadArtisanUuid,
    artisanName: artisanName || project.leadArtisanName,
    userId: user.id,
  }, project.workBlocks.length);
  project.currentProgress = after;
  project.downtimeSpent += committedDays;
  project.workBlocks.push(block);
  project.status = after >= project.requiredProgress ? "ready" : "active";
  project.stage = after >= project.requiredProgress ? "finalisation" : "assembly";
  project = audit(project, "work-block", `${committedDays}-day Work Block: ${progress} Progress.`, user, { block });
  return project;
}

export function validateProjectReservations(source, inventoryItems = []) {
  const project = normalizeCraftingProject(source);
  const itemById = new Map(Array.from(inventoryItems ?? []).map((item) => [item.id ?? item._id, item]));
  const issues = [];
  for (const reservation of project.reservations.filter((entry) => entry.state === "reserved")) {
    const item = itemById.get(reservation.itemId);
    const resource = getCraftingResourceData(item);
    const quantity = integer(item?.system?.quantity ?? item?.quantity, 0, 0);
    if (!item || !resource) {
      issues.push({ code: "missing-stack", reservationId: reservation.id, message: `${reservation.itemName} is no longer in the Party Stash.` });
    } else if (quantity < reservation.quantity) {
      issues.push({ code: "quantity-changed", reservationId: reservation.id, message: `${reservation.itemName} has only ${quantity} remaining; ${reservation.quantity} are reserved.` });
    } else if (resource.materialId !== reservation.materialId || resource.tier !== reservation.tier || resource.variantId !== reservation.variantId) {
      issues.push({ code: "resource-changed", reservationId: reservation.id, message: `${reservation.itemName} no longer matches its reservation.` });
    }
  }
  return { valid: issues.length === 0, issues };
}

export function buildConsumptionPlan(source, inventoryItems = []) {
  const project = normalizeCraftingProject(source);
  if (project.status !== "ready" || project.currentProgress < project.requiredProgress) {
    throw new Error("Finish the required downtime before completing this project.");
  }
  const validation = validateProjectReservations(project, inventoryItems);
  if (!validation.valid) throw new Error(validation.issues.map((issue) => issue.message).join(" "));
  const itemById = new Map(Array.from(inventoryItems ?? []).map((item) => [item.id ?? item._id, item]));
  const quantities = new Map();
  for (const reservation of project.reservations.filter((entry) => entry.state === "reserved")) {
    quantities.set(reservation.itemId, (quantities.get(reservation.itemId) ?? 0) + reservation.quantity);
  }
  return [...quantities].map(([itemId, consumedQuantity]) => {
    const item = itemById.get(itemId);
    const beforeQuantity = integer(item.system?.quantity ?? item.quantity, 0, 0);
    return {
      itemId,
      itemName: item.name,
      beforeQuantity,
      consumedQuantity,
      afterQuantity: beforeQuantity - consumedQuantity,
    };
  });
}

export function completeCraftingProject(source, { finalItemUuid = "", user = {} } = {}) {
  let project = normalizeCraftingProject(source);
  if (project.status !== "ready") throw new Error("This project is not ready to complete.");
  project.status = "completed";
  project.stage = "completed";
  project.reservations = project.reservations.map((entry) => ({ ...entry, state: "consumed" }));
  project.consumptionConfirmed = true;
  project.completedAt = Date.now();
  project.completedBy = user.id ?? "";
  project.finalItemUuid = finalItemUuid;
  project = audit(project, "completed", "Resource consumption confirmed and finished item created.", user, { finalItemUuid });
  return project;
}

export function replaceProject(workbench, source) {
  const normalized = normalizeCraftingWorkbench(workbench);
  const project = normalizeCraftingProject(source);
  const index = normalized.projects.findIndex((entry) => entry.id === project.id);
  if (index >= 0) normalized.projects[index] = project;
  else normalized.projects.push(project);
  return normalized;
}
