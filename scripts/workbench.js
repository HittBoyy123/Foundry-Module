import { MODULE_ID } from "./constants.js";
import { getRulesConfig } from "./config-store.js";
import { getCraftingResourceData } from "./crafting-categories.js";
import { evaluateCraftingRecipe } from "./crafting-recipes.js";
import {
  advanceCraftingProject,
  buildConsumptionPlan,
  completeCraftingProject,
  createCraftingProject,
  normalizeCraftingWorkbench,
  releaseCraftingProject,
  replaceProject,
  reservationLedger,
  reserveCraftingProject,
} from "./crafting-projects.js";
import {
  buildCraftingRecipeFromBand,
  compatibleRecipeBands,
  defaultProjectProgress,
  getCraftingRecipeBand,
} from "./recipe-catalog.js";
import { normalizeItemFlags } from "./model.js";
import { normalizeDegreeOfSuccess } from "./gathering-model.js";
import { openGatheringApplication } from "./gathering.js";

let WorkbenchApplication = null;
const WORKBENCH_SOCKET = `module.${MODULE_ID}`;
const COMPLETION_REQUEST_TIMEOUT_MS = 30_000;
const pendingCompletionRequests = new Map();
const completionLocks = new Set();
let workbenchSocketInstalled = false;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function localize(key, fallback = key) {
  const value = game.i18n.localize(key);
  return value === key ? fallback : value;
}

function format(key, data, fallback = key) {
  const value = game.i18n.format(key, data);
  return value === key ? fallback : value;
}

function rootElement(element) {
  return element instanceof HTMLElement ? element : element?.[0] ?? null;
}

function partyActors() {
  const actors = Array.from(game.actors ?? []).filter((actor) => actor.type === "party");
  const active = game.actors?.party;
  if (active?.type === "party" && !actors.includes(active)) actors.unshift(active);
  return actors.sort((left, right) => left.name.localeCompare(right.name));
}

function partyMembers(party) {
  return Array.from(party?.members ?? []).map((member) => member.actor ?? member).filter(Boolean);
}

function userAuditIdentity() {
  return { id: game.user.id, name: game.user.name };
}

function canEditParty(party) {
  return party?.canUserModify?.(game.user, "update") === true;
}

function activePrimaryGM() {
  return Array.from(game.users ?? [])
    .filter((user) => user.isGM && user.active)
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))[0] ?? null;
}

function projectState(party) {
  return normalizeCraftingWorkbench(party?.getFlag?.(MODULE_ID, "workbench"));
}

async function saveWorkbench(party, workbench) {
  if (!canEditParty(party)) throw new Error(localize("CMT.Workbench.NotEditable"));
  const normalized = normalizeCraftingWorkbench(workbench);
  await party.setFlag(MODULE_ID, "workbench", normalized);
  return normalized;
}

function materialLabel(materialId, tier = null) {
  const material = getRulesConfig().materials?.[materialId];
  if (!material) return materialId.replaceAll("-", " ");
  if (tier && material.tierLabels?.[tier]) return material.tierLabels[tier];
  return material.label;
}

function virtualUnreservedInventory(party, projects, excludeProjectId = "") {
  const ledger = reservationLedger(projects, { excludeProjectId });
  return Array.from(party?.items ?? []).flatMap((item) => {
    const resource = getCraftingResourceData(item);
    if (!resource) return [];
    const quantity = Math.max(0, Math.trunc(Number(item.system?.quantity) || 0));
    const available = Math.max(0, quantity - (ledger.get(item.id) ?? 0));
    return [{
      id: item.id,
      _id: item.id,
      name: item.name,
      uuid: item.uuid,
      type: item.type,
      system: { quantity: available },
      flags: { [MODULE_ID]: { resource } },
    }];
  });
}

function degreeLabel(degree) {
  return localize(`CMT.Gathering.Outcomes.${degree}`, degree);
}

function currentWorldDate() {
  const worldTime = Number(game.time?.worldTime);
  if (!Number.isFinite(worldTime)) return "";
  try {
    return new Date(worldTime * 1000).toLocaleDateString();
  } catch (_error) {
    return "";
  }
}

async function resolveBaseItem(uuid) {
  if (!uuid || typeof globalThis.fromUuid !== "function") return null;
  const document = await fromUuid(uuid);
  return document?.documentName === "Item" ? document : null;
}

function recipeGroupContext(group, config) {
  const options = group.options.map((option) => {
    const range = option.tierMode === "minimum" && option.maximumTier > option.tier
      ? `T${option.tier}–T${option.maximumTier}`
      : `T${option.tier}`;
    return {
      ...option,
      label: `${config.materials?.[option.materialId]?.label ?? option.materialId} ${range}`,
    };
  });
  return {
    id: group.id,
    label: group.label,
    available: options.some((option) => option.available),
    summary: options.map((option) => `${option.label}: ${option.owned}/${option.units}`).join(" or "),
  };
}

async function workbenchContext(application) {
  const config = getRulesConfig();
  const craftingEnabled = config.crafting?.enabled !== false;
  const parties = partyActors();
  application.workbenchState.partyId = parties.some((party) => party.id === application.workbenchState.partyId)
    ? application.workbenchState.partyId
    : game.actors?.party?.id ?? parties[0]?.id ?? "";
  const party = parties.find((entry) => entry.id === application.workbenchState.partyId) ?? null;
  const canEdit = canEditParty(party);
  const workbench = projectState(party);
  const baseItem = await resolveBaseItem(application.workbenchState.baseItemUuid);
  const recipeBands = baseItem ? compatibleRecipeBands(baseItem) : [];
  application.workbenchState.bandId = recipeBands.some((entry) => entry.id === application.workbenchState.bandId)
    ? application.workbenchState.bandId
    : recipeBands[0]?.id ?? "";
  const selectedBand = getCraftingRecipeBand(application.workbenchState.bandId);
  application.workbenchState.materialId = selectedBand?.coreMaterialIds.includes(application.workbenchState.materialId)
    ? application.workbenchState.materialId
    : selectedBand?.coreMaterialIds[0] ?? "";
  const tier = Math.min(6, Math.max(1, Math.trunc(Number(application.workbenchState.tier) || 1)));
  const members = partyMembers(party);
  application.workbenchState.artisanId = members.some((actor) => actor.id === application.workbenchState.artisanId)
    ? application.workbenchState.artisanId
    : members.find((actor) => game.user.isGM || actor.isOwner)?.id ?? members[0]?.id ?? "";

  let recipe = null;
  let evaluation = null;
  let requiredProgress = Math.max(1, Math.trunc(Number(application.workbenchState.requiredProgress) || 0));
  if (baseItem && selectedBand) {
    try {
      recipe = buildCraftingRecipeFromBand(selectedBand.id, {
        targetItem: baseItem,
        tier,
        coreMaterialId: application.workbenchState.materialId,
      });
      if (!application.workbenchState.requiredProgress) requiredProgress = defaultProjectProgress(recipe);
      evaluation = evaluateCraftingRecipe(recipe, {
        targetItem: baseItem,
        inventoryItems: virtualUnreservedInventory(party, workbench.projects),
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Workbench recipe preview failed.`, error);
    }
  }

  const statusLabels = {
    draft: localize("CMT.Workbench.Status.Draft", "Draft"),
    reserved: localize("CMT.Workbench.Status.Reserved", "Reserved"),
    active: localize("CMT.Workbench.Status.Active", "In progress"),
    ready: localize("CMT.Workbench.Status.Ready", "Ready"),
    completed: localize("CMT.Workbench.Status.Completed", "Completed"),
    cancelled: localize("CMT.Workbench.Status.Cancelled", "Cancelled"),
  };
  const projects = workbench.projects
    .slice()
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .map((project) => ({
      ...project,
      recipeName: getCraftingRecipeBand(project.recipeBandId)?.label ?? project.recipe.name,
      coreLabel: `Tier ${project.coreTier} ${materialLabel(project.coreMaterialId, project.coreTier)}`,
      statusLabel: statusLabels[project.status] ?? project.status,
      statusClass: `is-${project.status}`,
      progressPercent: Math.round((project.currentProgress / project.requiredProgress) * 100),
      reservationCount: project.reservations.filter((entry) => entry.state === "reserved").length,
      canWork: craftingEnabled && canEdit && ["reserved", "active"].includes(project.status),
      canComplete: craftingEnabled && canEdit && project.status === "ready",
      canCancel: canEdit && !["completed", "cancelled"].includes(project.status),
    }));

  const preview = evaluation ? {
    craftable: evaluation.craftable,
    check: evaluation.check,
    requiredProgress,
    groups: evaluation.ingredientSets[0].groups.map((group) => recipeGroupContext(group, config)),
  } : null;

  const activeProjectCount = projects.filter((project) => !["completed", "cancelled"].includes(project.status)).length;
  return {
    party,
    canEdit,
    craftingEnabled,
    worldDate: currentWorldDate(),
    parties: parties.map((entry) => ({ id: entry.id, name: entry.name, selected: entry.id === party?.id })),
    tabs: {
      craft: application.workbenchState.tab === "craft",
      gather: application.workbenchState.tab === "gather",
      projects: application.workbenchState.tab === "projects",
    },
    baseItem: baseItem ? {
      name: baseItem.name,
      img: baseItem.img,
      categoryLabel: evaluation?.targetCategory?.label ?? localize("CMT.Workbench.EligibleItem", "Eligible PF2e item"),
    } : null,
    recipeBands: recipeBands.map((entry) => ({ ...entry, selected: entry.id === selectedBand?.id })),
    selectedBand,
    coreMaterials: (selectedBand?.coreMaterialIds ?? []).map((materialId) => ({
      id: materialId,
      label: config.materials?.[materialId]?.label ?? materialId,
      selected: materialId === application.workbenchState.materialId,
    })),
    tiers: [1, 2, 3, 4, 5, 6].map((value) => ({
      value,
      label: config.materials?.[application.workbenchState.materialId]?.tierLabels?.[value]
        ?? config.tierLabels?.[value]
        ?? `Tier ${value}`,
      selected: value === tier,
    })),
    artisans: members.map((actor) => ({
      id: actor.id,
      name: actor.name,
      selected: actor.id === application.workbenchState.artisanId,
    })),
    draft: {
      name: application.workbenchState.projectName || (baseItem ? `${materialLabel(application.workbenchState.materialId, tier)} ${baseItem.name}` : ""),
      requiredProgress,
    },
    preview,
    canCreate: Boolean(craftingEnabled && canEdit && baseItem && selectedBand && application.workbenchState.artisanId && preview?.craftable),
    projects,
    projectCount: projects.length,
    activeProjectCount,
  };
}

async function createAndReserve(application) {
  const party = partyActors().find((entry) => entry.id === application.workbenchState.partyId);
  const baseItem = await resolveBaseItem(application.workbenchState.baseItemUuid);
  const band = getCraftingRecipeBand(application.workbenchState.bandId);
  const artisan = partyMembers(party).find((entry) => entry.id === application.workbenchState.artisanId);
  if (!party || !baseItem || !band || !artisan) throw new Error(localize("CMT.Workbench.IncompleteProject"));
  const recipe = buildCraftingRecipeFromBand(band.id, {
    targetItem: baseItem,
    tier: application.workbenchState.tier,
    coreMaterialId: application.workbenchState.materialId,
  });
  const workbench = projectState(party);
  let project = createCraftingProject({
    name: application.workbenchState.projectName || `${materialLabel(application.workbenchState.materialId, application.workbenchState.tier)} ${baseItem.name}`,
    partyUuid: party.uuid,
    baseItemUuid: baseItem.uuid,
    baseItemName: baseItem.name,
    baseItemImg: baseItem.img,
    recipeBandId: band.id,
    recipe,
    coreMaterialId: application.workbenchState.materialId,
    coreTier: application.workbenchState.tier,
    leadArtisanUuid: artisan.uuid,
    leadArtisanName: artisan.name,
    requiredProgress: application.workbenchState.requiredProgress || defaultProjectProgress(recipe),
  }, userAuditIdentity());
  project = reserveCraftingProject(project, {
    inventoryItems: party.items,
    otherProjects: workbench.projects,
    user: userAuditIdentity(),
  });
  await saveWorkbench(party, replaceProject(workbench, project));
  application.workbenchState.tab = "projects";
  application.workbenchState.projectName = "";
  ui.notifications.info(format("CMT.Workbench.ProjectCreated", { project: project.name }, `${project.name} was created and its resources were reserved.`));
}

async function rollWorkBlock(application, projectId, days, event) {
  const party = partyActors().find((entry) => entry.id === application.workbenchState.partyId);
  const workbench = projectState(party);
  const project = workbench.projects.find((entry) => entry.id === projectId);
  if (!project) throw new Error(localize("CMT.Workbench.ProjectMissing"));
  const artisan = await fromUuid(project.leadArtisanUuid);
  const statistic = artisan?.getStatistic?.("crafting");
  if (!statistic?.roll) throw new Error(localize("CMT.Workbench.CraftingUnavailable"));
  const dc = project.recipe.check ? evaluateCraftingRecipe(project.recipe, {
    targetItem: await resolveBaseItem(project.baseItemUuid),
    inventoryItems: party.items,
  }).check.dc : null;
  const progressBefore = project.currentProgress;
  const roll = await statistic.roll({
    event,
    dc,
    title: `${project.name} — Work Block`,
    label: project.name,
    extraRollOptions: ["action:craft", "wrathmaker:crafting", `wrathmaker:crafting:tier:${project.coreTier}`],
  });
  if (!roll) return;
  const degree = normalizeDegreeOfSuccess(roll.degreeOfSuccess ?? roll.options?.degreeOfSuccess);
  const updated = advanceCraftingProject(project, {
    days,
    degree,
    rollTotal: Number(roll.total),
    dc,
    artisanUuid: artisan.uuid,
    artisanName: artisan.name,
    user: userAuditIdentity(),
  });
  await saveWorkbench(party, replaceProject(workbench, updated));
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/crafting-work-chat.hbs`, {
    projectName: project.name,
    artisanName: artisan.name,
    days,
    rollTotal: Number(roll.total),
    dc,
    degreeLabel: degreeLabel(degree),
    progressBefore,
    progressAfter: updated.currentProgress,
    requiredProgress: updated.requiredProgress,
    ready: updated.status === "ready",
  });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: artisan }), content });
  ui.notifications.info(updated.status === "ready"
    ? format("CMT.Workbench.ProjectReady", { project: updated.name }, `${updated.name} is ready to complete.`)
    : format("CMT.Workbench.ProgressSaved", { project: updated.name }, `${updated.name} progress was saved.`));
}

function cloneItemSource(document) {
  const source = typeof document?.toObject === "function" ? document.toObject() : clone(document);
  delete source._id;
  delete source.folder;
  delete source.ownership;
  delete source._stats;
  return source;
}

async function completeProjectTransaction(party, projectId, auditUser) {
  const workbench = projectState(party);
  const current = workbench.projects.find((entry) => entry.id === projectId);
  if (!current) throw new Error(localize("CMT.Workbench.ProjectMissing"));
  const freshPlan = buildConsumptionPlan(current, party.items);
  const baseItem = await resolveBaseItem(current.baseItemUuid);
  if (!baseItem) throw new Error(localize("CMT.Workbench.BaseItemMissing"));
  const config = getRulesConfig();
  const source = cloneItemSource(baseItem);
  source.system ??= {};
  source.system.quantity = current.recipe.result.quantity;
  source.flags ??= {};
  const priorFlags = source.flags[MODULE_ID] ?? {};
  const componentGroups = new Map();
  for (const reservation of current.reservations.filter((entry) => entry.groupId !== "core")) {
    const key = `${reservation.groupId}|${reservation.materialId}|${reservation.tier}|${reservation.variantId}`;
    const component = componentGroups.get(key) ?? {
      id: `${current.id}-${reservation.groupId}-${reservation.materialId}-${reservation.tier}`,
      name: reservation.groupLabel,
      classification: "required-secondary",
      slotType: reservation.groupId,
      materialId: reservation.materialId,
      tier: reservation.tier,
      quantityRequired: 0,
      quantityCommitted: 0,
      structural: true,
      tags: [reservation.materialId, `tier-${reservation.tier}`],
      contributor: null,
    };
    component.quantityRequired += reservation.units;
    component.quantityCommitted += reservation.units;
    componentGroups.set(key, component);
  }
  const crafting = {
    ...(priorFlags.crafting ?? {}),
    core: {
      ...(priorFlags.crafting?.core ?? {}),
      materialId: current.coreMaterialId,
      tier: current.coreTier,
      resourceName: materialLabel(current.coreMaterialId, current.coreTier),
      quantityRequired: current.reservations
        .filter((entry) => entry.groupId === "core")
        .reduce((total, entry) => total + entry.units, 0),
      quantityCommitted: current.reservations
        .filter((entry) => entry.groupId === "core")
        .reduce((total, entry) => total + entry.units, 0),
      contributor: {
        actorUuid: current.leadArtisanUuid,
        name: current.leadArtisanName,
      },
    },
    components: [
      ...(priorFlags.crafting?.components ?? []).filter((component) => (
        ["optional", "special-treatment"].includes(component.classification)
      )),
      ...componentGroups.values(),
    ],
    provenance: [
      ...(priorFlags.crafting?.provenance ?? []),
      {
        projectId: current.id,
        projectName: current.name,
        artisanUuid: current.leadArtisanUuid,
        artisanName: current.leadArtisanName,
        completedAt: Date.now(),
        downtimeSpent: current.downtimeSpent,
      },
    ],
  };
  source.flags[MODULE_ID] = normalizeItemFlags({
    ...priorFlags,
    material: current.coreMaterialId,
    tier: current.coreTier,
    crafting,
  }, config);

  const consumeUpdates = freshPlan.map((entry) => ({ _id: entry.itemId, "system.quantity": entry.afterQuantity }));
  const rollbackUpdates = freshPlan.map((entry) => ({ _id: entry.itemId, "system.quantity": entry.beforeQuantity }));
  let created = null;
  try {
    await party.updateEmbeddedDocuments("Item", consumeUpdates);
    [created] = await party.createEmbeddedDocuments("Item", [source]);
    const completed = completeCraftingProject(current, {
      finalItemUuid: created?.uuid ?? "",
      user: auditUser,
    });
    await saveWorkbench(party, replaceProject(workbench, completed));
  } catch (error) {
    try {
      if (created) await party.deleteEmbeddedDocuments("Item", [created.id]);
      await party.updateEmbeddedDocuments("Item", rollbackUpdates);
    } catch (rollbackError) {
      console.error(`${MODULE_ID} | Workbench completion rollback failed.`, rollbackError);
    }
    throw error;
  }
  const depletedItemIds = freshPlan.filter((entry) => entry.afterQuantity === 0).map((entry) => entry.itemId);
  if (depletedItemIds.length) {
    try {
      await party.deleteEmbeddedDocuments("Item", depletedItemIds);
    } catch (error) {
      // A zero-quantity stack is already fully consumed. Failure to clean up its
      // empty row must not duplicate the output or roll the completed project back.
      console.warn(`${MODULE_ID} | Empty resource stacks could not be removed.`, error);
    }
  }
  return { projectId: current.id, projectName: current.name, finalItemUuid: created?.uuid ?? "" };
}

async function runCompletionWithLock(party, projectId, auditUser) {
  // Lock the whole Party Stash, not only one project. Two different projects
  // can reserve different quantities from the same stack and must not calculate
  // their before/after values concurrently.
  const key = party.id;
  if (completionLocks.has(key)) throw new Error(localize("CMT.Workbench.CompletionInProgress"));
  completionLocks.add(key);
  try {
    return await completeProjectTransaction(party, projectId, auditUser);
  } finally {
    completionLocks.delete(key);
  }
}

function requestGMProjectCompletion(party, projectId) {
  const gm = activePrimaryGM();
  if (!gm) return Promise.reject(new Error(localize("CMT.Workbench.NoActiveGM")));
  const requestId = foundry.utils.randomID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCompletionRequests.delete(requestId);
      reject(new Error(localize("CMT.Workbench.CompletionTimeout")));
    }, COMPLETION_REQUEST_TIMEOUT_MS);
    pendingCompletionRequests.set(requestId, { resolve, reject, timeout, gmId: gm.id });
    game.socket.emit(WORKBENCH_SOCKET, {
      type: "complete-request",
      requestId,
      gmId: gm.id,
      userId: game.user.id,
      partyId: party.id,
      projectId,
    });
  });
}

function settleCompletionResponse(payload) {
  if (payload?.type !== "complete-response" || payload.userId !== game.user.id) return false;
  const pending = pendingCompletionRequests.get(payload.requestId);
  if (!pending || pending.gmId !== payload.gmId) return true;
  clearTimeout(pending.timeout);
  pendingCompletionRequests.delete(payload.requestId);
  if (payload.ok) pending.resolve(payload.result ?? {});
  else pending.reject(new Error(payload.error || localize("CMT.Workbench.CompletionFailed")));
  return true;
}

async function handleCompletionRequest(payload) {
  const response = {
    type: "complete-response",
    requestId: payload.requestId,
    gmId: game.user.id,
    userId: payload.userId,
    ok: false,
  };
  try {
    const requestingUser = game.users?.get(payload.userId);
    const party = game.actors?.get(payload.partyId);
    if (!requestingUser || !party || party.type !== "party") {
      throw new Error(localize("CMT.Workbench.CompletionNotAllowed"));
    }
    if (party.canUserModify?.(requestingUser, "update") !== true) {
      throw new Error(localize("CMT.Workbench.CompletionNotAllowed"));
    }
    response.result = await runCompletionWithLock(party, payload.projectId, {
      id: requestingUser.id,
      name: requestingUser.name,
    });
    response.ok = true;
  } catch (error) {
    console.error(`${MODULE_ID} | GM project completion failed.`, error);
    response.error = error?.message || localize("CMT.Workbench.CompletionFailed");
  }
  game.socket.emit(WORKBENCH_SOCKET, response);
}

function installWorkbenchSocket() {
  if (workbenchSocketInstalled) return;
  workbenchSocketInstalled = true;
  game.socket.on(WORKBENCH_SOCKET, (payload) => {
    if (settleCompletionResponse(payload)) return;
    if (payload?.type !== "complete-request" || !game.user.isGM) return;
    const primaryGM = activePrimaryGM();
    if (payload.gmId !== game.user.id || primaryGM?.id !== game.user.id) return;
    void handleCompletionRequest(payload);
  });
}

async function completeProject(application, projectId) {
  const { DialogV2 } = foundry.applications.api;
  const party = partyActors().find((entry) => entry.id === application.workbenchState.partyId);
  const workbench = projectState(party);
  const project = workbench.projects.find((entry) => entry.id === projectId);
  if (!project) throw new Error(localize("CMT.Workbench.ProjectMissing"));
  const plan = buildConsumptionPlan(project, party.items);
  const list = plan.map((entry) => `<li>${entry.itemName}: ${entry.beforeQuantity} → ${entry.afterQuantity}</li>`).join("");
  const confirmed = await DialogV2.confirm({
    window: { title: localize("CMT.Workbench.ConfirmTitle", "Complete Crafting Project") },
    content: `<p><strong>${project.name}</strong></p><p>${localize("CMT.Workbench.ConfirmConsumption")}</p><ul>${list}</ul>`,
    modal: true,
  });
  if (!confirmed) return;

  // The selected GM re-reads the project and Party Stash after confirmation,
  // then performs consumption, output creation, and audit updates as one guarded flow.
  const primaryGM = activePrimaryGM();
  const result = game.user.isGM && primaryGM?.id === game.user.id
    ? await runCompletionWithLock(party, projectId, userAuditIdentity())
    : await requestGMProjectCompletion(party, projectId);
  ui.notifications.info(format(
    "CMT.Workbench.ProjectCompleted",
    { project: result.projectName ?? project.name },
    `${result.projectName ?? project.name} was completed and added to the Party Stash.`,
  ));
}

async function cancelProject(application, projectId) {
  const { DialogV2 } = foundry.applications.api;
  const party = partyActors().find((entry) => entry.id === application.workbenchState.partyId);
  const workbench = projectState(party);
  const project = workbench.projects.find((entry) => entry.id === projectId);
  if (!project) throw new Error(localize("CMT.Workbench.ProjectMissing"));
  const confirmed = await DialogV2.confirm({
    window: { title: localize("CMT.Workbench.CancelProject") },
    content: `<p>${format("CMT.Workbench.ConfirmCancel", { project: project.name }, `Cancel ${project.name} and release its reservations?`)}</p>`,
    modal: true,
  });
  if (!confirmed) return;
  const cancelled = releaseCraftingProject(project, userAuditIdentity());
  await saveWorkbench(party, replaceProject(workbench, cancelled));
  ui.notifications.info(format("CMT.Workbench.ProjectCancelled", { project: project.name }, `${project.name} was cancelled.`));
}

export function createWorkbenchApplication() {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

  return class WrathmakerWorkbench extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-workbench`,
      classes: [MODULE_ID, "cmt-workbench-app"],
      tag: "form",
      position: { width: 900, height: 780 },
      window: {
        icon: "fa-solid fa-hammer",
        title: "CMT.Workbench.Title",
        resizable: true,
      },
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/workbench.hbs` },
    };

    constructor(options = {}) {
      super(options);
      this.workbenchState = {
        partyId: options.partyId ?? "",
        tab: options.tab ?? "craft",
        baseItemUuid: options.baseItemUuid ?? "",
        bandId: options.bandId ?? "",
        materialId: options.materialId ?? "",
        tier: Number(options.tier) || 1,
        artisanId: options.artisanId ?? "",
        projectName: "",
        requiredProgress: 0,
      };
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return { ...context, ...(await workbenchContext(this)) };
    }

    _onRender(context, options) {
      super._onRender(context, options);
      const root = rootElement(this.element);
      if (!root) return;
      for (const button of root.querySelectorAll("[data-cmt-workbench-tab]")) {
        button.addEventListener("click", async () => {
          this.workbenchState.tab = button.dataset.cmtWorkbenchTab;
          await this.render({ force: true });
        });
      }
      for (const field of root.querySelectorAll("[data-cmt-workbench-field]")) {
        const stateKey = {
          party: "partyId",
          recipe: "bandId",
          material: "materialId",
          tier: "tier",
          artisan: "artisanId",
          "project-name": "projectName",
          "required-progress": "requiredProgress",
        }[field.dataset.cmtWorkbenchField];
        if (!stateKey) continue;
        const eventName = field.dataset.cmtWorkbenchField === "project-name" ? "input" : "change";
        field.addEventListener(eventName, async () => {
          this.workbenchState[stateKey] = ["tier", "requiredProgress"].includes(stateKey)
            ? Number(field.value)
            : field.value;
          if (stateKey === "partyId") {
            this.workbenchState.artisanId = "";
            this.workbenchState.baseItemUuid = "";
          }
          if (["partyId", "bandId", "materialId", "tier"].includes(stateKey)) {
            if (["bandId", "materialId", "tier"].includes(stateKey)) this.workbenchState.requiredProgress = 0;
            await this.render({ force: true });
          }
        });
      }
      const drop = root.querySelector('[data-cmt-workbench-drop="base-item"]');
      drop?.addEventListener("dragover", (event) => {
        event.preventDefault();
        drop.classList.add("is-dragover");
      });
      drop?.addEventListener("dragleave", () => drop.classList.remove("is-dragover"));
      drop?.addEventListener("drop", async (event) => {
        event.preventDefault();
        drop.classList.remove("is-dragover");
        try {
          const data = TextEditor.getDragEventData(event);
          const uuid = data.uuid ?? (data.type === "Item" && data.id ? `Item.${data.id}` : "");
          const item = await resolveBaseItem(uuid);
          if (!item || compatibleRecipeBands(item).length === 0) throw new Error(localize("CMT.Workbench.InvalidBase"));
          this.workbenchState.baseItemUuid = item.uuid;
          this.workbenchState.bandId = "";
          this.workbenchState.projectName = "";
          this.workbenchState.requiredProgress = 0;
          await this.render({ force: true });
        } catch (error) {
          ui.notifications.error(error.message);
        }
      });
      root.querySelector('[data-cmt-workbench-action="clear-base"]')?.addEventListener("click", async () => {
        this.workbenchState.baseItemUuid = "";
        this.workbenchState.bandId = "";
        await this.render({ force: true });
      });
      root.querySelector('[data-cmt-workbench-action="open-stash"]')?.addEventListener("click", () => {
        const party = partyActors().find((entry) => entry.id === this.workbenchState.partyId);
        party?.sheet?.render(true);
      });
      root.querySelector('[data-cmt-workbench-action="open-gathering"]')?.addEventListener("click", () => openGatheringApplication());
      root.querySelector('[data-cmt-workbench-action="create-project"]')?.addEventListener("click", async () => {
        try {
          await createAndReserve(this);
          await this.render({ force: true });
        } catch (error) {
          console.error(`${MODULE_ID} | Workbench project creation failed.`, error);
          ui.notifications.error(error.message);
        }
      });
      for (const card of root.querySelectorAll("[data-cmt-project-id]")) {
        const projectId = card.dataset.cmtProjectId;
        card.querySelector('[data-cmt-project-action="roll-work"]')?.addEventListener("click", async (event) => {
          try {
            const days = Number(card.querySelector('[data-cmt-project-field="days"]')?.value) || 1;
            await rollWorkBlock(this, projectId, days, event);
            await this.render({ force: true });
          } catch (error) {
            console.error(`${MODULE_ID} | Work Block failed.`, error);
            ui.notifications.error(error.message);
          }
        });
        card.querySelector('[data-cmt-project-action="complete"]')?.addEventListener("click", async () => {
          try {
            await completeProject(this, projectId);
            await this.render({ force: true });
          } catch (error) {
            console.error(`${MODULE_ID} | Project completion failed.`, error);
            ui.notifications.error(error.message, { permanent: true });
          }
        });
        card.querySelector('[data-cmt-project-action="cancel"]')?.addEventListener("click", async () => {
          try {
            await cancelProject(this, projectId);
            await this.render({ force: true });
          } catch (error) {
            console.error(`${MODULE_ID} | Project cancellation failed.`, error);
            ui.notifications.error(error.message);
          }
        });
      }
    }
  };
}

export function registerWorkbench() {
  WorkbenchApplication = createWorkbenchApplication();
  Hooks.once("ready", installWorkbenchSocket);
  Hooks.on("renderItemDirectory", (_application, element) => {
    const root = rootElement(element);
    if (!root || root.querySelector("[data-cmt-open-workbench]")) return;
    const actions = root.querySelector(".directory-header .header-actions, .directory-header .action-buttons, .directory-header");
    if (!actions) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.cmtOpenWorkbench = "true";
    button.innerHTML = `<i class="fa-solid fa-hammer" aria-hidden="true"></i> ${localize("CMT.Workbench.Open")}`;
    button.addEventListener("click", () => openWorkbenchApplication());
    actions.prepend(button);
  });
  const injectPartyButton = (application, element) => {
    const party = application.actor ?? application.document;
    if (party?.type !== "party") return;
    const root = rootElement(element) ?? rootElement(application.element);
    const form = root?.matches?.("form") ? root : root?.querySelector("form");
    const details = form?.querySelector(":scope > header .details");
    if (!details || details.querySelector("[data-cmt-party-workbench]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cmt-party-workbench-button";
    button.dataset.cmtPartyWorkbench = "true";
    button.dataset.tooltip = localize("CMT.Workbench.Open");
    button.setAttribute("aria-label", localize("CMT.Workbench.Open"));
    button.innerHTML = '<i class="fa-solid fa-hammer" aria-hidden="true"></i>';
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openWorkbenchApplication({ partyId: party.id });
    });
    details.append(button);
  };
  Hooks.on("renderActorSheet", injectPartyButton);
  Hooks.on("renderActorSheetV2", injectPartyButton);
  Hooks.on("renderPartySheetPF2e", injectPartyButton);
  return WorkbenchApplication;
}

export function openWorkbenchApplication(options = {}) {
  if (!WorkbenchApplication) throw new Error("Wrathmaker Workbench has not been initialized.");
  const application = new WorkbenchApplication(options);
  application.render({ force: true });
  return application;
}
