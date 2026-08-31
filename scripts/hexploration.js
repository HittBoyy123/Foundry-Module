import { MODULE_ID } from "./constants.js";
import {
  ACTIVITY_TYPES,
  EXPRESS_RIDER_SKILL,
  TRAVEL_MODES,
  applyPreparedPartyTravelSpeed,
  calculateTravelState,
  expressRiderOutcomeFromDegree,
  getActorGroundSpeed,
  getVehicleGroundSpeed,
  normalizeHexplorationPlan,
} from "./hexploration-model.js";

const PARTY_PATCH_MARKER = Symbol.for(`${MODULE_ID}.hexploration.prepareDerivedData`);
const PARTY_SCROLL_MARKER = Symbol.for(`${MODULE_ID}.hexploration.scrollPosition`);
const SCROLL_TRACKING_MARKER = Symbol.for(`${MODULE_ID}.hexploration.scrollTracking`);
const ACTIVITY_ROWS = 4;
const EXPRESS_RIDER_BENEFICIARY_LIMIT = 6;
const EXPLORATION_TAB_ID = "exploration";
const TRAVEL_FOLDER_NAMES = Object.freeze({
  root: "Wrathmaker Travel",
  animals: "Animals & Mounts",
  vehicles: "Vehicles & Transport",
});
const ALWAYS_INCLUDED_MOUNTS = new Set(["riding-horse", "riding-drake"]);
let refreshTimer = null;

function isParty(actor) {
  return actor?.type === "party" || actor?.isOfType?.("party") === true;
}

function canObserve(actor) {
  return game.user?.isGM || actor?.testUserPermission?.(game.user, "OBSERVER") === true;
}

function actorCollection(environment = {}) {
  return environment.actors ?? game.actors?.contents ?? [];
}

function folderCollection(environment = {}) {
  return environment.folders ?? game.folders?.contents ?? [];
}

function partyMembers(party) {
  return Array.isArray(party?.members) ? party.members : [];
}

function itemSlug(item) {
  return String(item?.slug ?? item?.system?.slug ?? item?.name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function folderRole(folder) {
  return folder?.getFlag?.(MODULE_ID, "travelRole")
    ?? folder?.flags?.[MODULE_ID]?.travelRole
    ?? null;
}

function folderParentId(folder) {
  return folder?.folder?.id ?? folder?._source?.folder ?? null;
}

function isActorFolder(folder) {
  return folder?.type === "Actor";
}

function findTravelFolders(environment = {}) {
  const folders = folderCollection(environment).filter(isActorFolder);
  const root = folders.find((folder) => folderRole(folder) === "root")
    ?? folders.find((folder) => folder.name === TRAVEL_FOLDER_NAMES.root && !folderParentId(folder))
    ?? null;
  const child = (role, name) => folders.find((folder) => folderRole(folder) === role)
    ?? folders.find((folder) => folder.name === name && (!root || folderParentId(folder) === root.id))
    ?? null;
  return {
    root,
    animals: child("animals", TRAVEL_FOLDER_NAMES.animals),
    vehicles: child("vehicles", TRAVEL_FOLDER_NAMES.vehicles),
  };
}

export function actorIsInTravelFolder(actor, targetFolder) {
  if (!actor || !targetFolder) return false;
  let folder = actor.folder ?? null;
  const visited = new Set();
  while (folder && !visited.has(folder.id)) {
    if (folder.id === targetFolder.id) return true;
    visited.add(folder.id);
    folder = folder.folder ?? null;
  }
  return false;
}

async function ensureTravelFolders() {
  if (!game.user?.isGM) return findTravelFolders();
  const FolderClass = globalThis.getDocumentClass?.("Folder") ?? globalThis.Folder;
  if (!FolderClass?.create) return findTravelFolders();
  let folders = findTravelFolders();
  if (!folders.root) {
    folders.root = await FolderClass.create({
      name: TRAVEL_FOLDER_NAMES.root,
      type: "Actor",
      sorting: "a",
      flags: { [MODULE_ID]: { travelRole: "root" } },
    });
  }
  if (!folders.animals) {
    folders.animals = await FolderClass.create({
      name: TRAVEL_FOLDER_NAMES.animals,
      type: "Actor",
      folder: folders.root.id,
      sorting: "a",
      flags: { [MODULE_ID]: { travelRole: "animals" } },
    });
  }
  if (!folders.vehicles) {
    folders.vehicles = await FolderClass.create({
      name: TRAVEL_FOLDER_NAMES.vehicles,
      type: "Actor",
      folder: folders.root.id,
      sorting: "a",
      flags: { [MODULE_ID]: { travelRole: "vehicles" } },
    });
  }
  return folders;
}

function getTravelActorEntries(actors, plan, environment = {}, { visibleOnly = false } = {}) {
  const folders = findTravelFolders(environment);
  const visible = (actor, selected) => !visibleOnly || selected || canObserve(actor);
  const vehicles = actors
    .filter((actor) => actor.type === "vehicle")
    .filter((actor) => actor.id === plan.vehicleId || actorIsInTravelFolder(actor, folders.vehicles))
    .filter((actor) => visible(actor, actor.id === plan.vehicleId))
    .map(vehicleEntry);
  const haulers = actors
    .filter((actor) => ["character", "npc", "familiar"].includes(actor.type))
    .filter((actor) => (
      plan.haulerIds.includes(actor.id)
      || actorIsInTravelFolder(actor, folders.animals)
      || ALWAYS_INCLUDED_MOUNTS.has(itemSlug(actor))
    ))
    .filter((actor) => visible(actor, plan.haulerIds.includes(actor.id)))
    .map(actorEntry)
    .filter((actor) => actor.speed > 0);
  return { folders, vehicles, haulers };
}

function actorHasFeat(actor, slug) {
  return [...(actor?.items ?? [])].some((item) => (
    (item?.type === "feat" || item?.isOfType?.("feat") === true) && itemSlug(item) === slug
  ));
}

function actorEntry(actor) {
  return {
    id: actor.id,
    uuid: actor.uuid,
    name: actor.name,
    img: actor.img,
    speed: getActorGroundSpeed(actor),
    hasExpressRider: actorHasFeat(actor, "express-rider"),
  };
}

function vehicleEntry(actor) {
  return {
    id: actor.id,
    uuid: actor.uuid,
    name: actor.name,
    img: actor.img,
    speed: getVehicleGroundSpeed(actor),
  };
}

export function buildPartyTravelState(party, config, environment = {}) {
  const actors = actorCollection(environment);
  const members = partyMembers(party).map(actorEntry);
  const plan = normalizeHexplorationPlan(party.getFlag?.(MODULE_ID, "hexploration"));
  const { vehicles, haulers } = getTravelActorEntries(actors, plan, environment);
  return calculateTravelState({ plan, members, vehicles, haulers, config });
}

function localize(key) {
  return game.i18n.localize(key);
}

function format(key, data) {
  return game.i18n.format(key, data);
}

function activityLabel(type) {
  const key = `CMT.Hexploration.Activities.${type}`;
  const label = localize(key);
  return label === key ? type : label;
}

function warningLabel(code) {
  const key = `CMT.Hexploration.Warnings.${code}`;
  const label = localize(key);
  return label === key ? code : label;
}

function outcomeLabel(outcome) {
  const key = `CMT.Hexploration.Outcomes.${outcome}`;
  const label = localize(key);
  return label === key ? outcome : label;
}

function formatActivities(value) {
  return value === 0.5 ? "½" : String(value);
}

function formatDistance(value) {
  return new Intl.NumberFormat(game.i18n.lang, { maximumFractionDigits: 1 }).format(value);
}

function modeOptions(selectedMode) {
  return TRAVEL_MODES.map((value) => ({
    value,
    label: localize(`CMT.Hexploration.Modes.${value}`),
    selected: value === selectedMode,
  }));
}

function activityOptions(selectedType) {
  return ACTIVITY_TYPES.map((value) => ({
    value,
    label: activityLabel(value),
    selected: value === selectedType,
  }));
}

function travellerStatus(member, plan) {
  if (plan.haulerIds.includes(member.id)) return localize("CMT.Hexploration.Pulling");
  if (plan.riderIds.includes(member.id)) return localize("CMT.Hexploration.Riding");
  return localize("CMT.Hexploration.Walking");
}

export function buildHexplorationSheetContext(party, config, draftPlan = null, environment = {}) {
  const actors = actorCollection(environment);
  const members = partyMembers(party).map(actorEntry);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const savedPlan = normalizeHexplorationPlan(draftPlan ?? party.getFlag?.(MODULE_ID, "hexploration"));
  const suggestedExpressActor = savedPlan.travelModifiers.expressRider.enabled
    ? members.find((member) => member.hasExpressRider)
    : null;
  const plan = normalizeHexplorationPlan({
    ...savedPlan,
    travelModifiers: {
      ...savedPlan.travelModifiers,
      expressRider: {
        ...savedPlan.travelModifiers.expressRider,
        actorId: savedPlan.travelModifiers.expressRider.actorId || suggestedExpressActor?.id || "",
      },
    },
  });
  const travelActors = getTravelActorEntries(actors, plan, environment, { visibleOnly: true });
  const vehicles = travelActors.vehicles.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
  const haulers = travelActors.haulers.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
  const state = calculateTravelState({ plan, members, vehicles, haulers, config });
  const activityRows = Array.from({ length: ACTIVITY_ROWS }, (_unused, index) => {
    const activity = plan.activities[index] ?? { type: "none", actorId: "", note: "", used: false };
    const assignee = memberById.get(activity.actorId);
    return {
      index,
      number: index + 1,
      actorId: activity.actorId,
      assigneeName: assignee?.name ?? localize("CMT.Hexploration.PartyAssignment"),
      img: assignee?.img ?? party.img,
      note: activity.note,
      used: activity.used,
      assigned: activity.type !== "none",
      options: activityOptions(activity.type),
      assigneeOptions: [
        { id: "", label: localize("CMT.Hexploration.PartyAssignment"), selected: !activity.actorId },
        ...members.map((member) => ({
          id: member.id,
          label: member.name,
          selected: member.id === activity.actorId,
        })),
      ],
    };
  });
  const hauling = plan.mode === "hauled";
  const usingVehicle = plan.mode !== "foot";
  const customVehicleSelected = usingVehicle && !plan.vehicleId && !!plan.customVehicleName;
  const expressRider = plan.travelModifiers.expressRider;
  const expressActor = memberById.get(expressRider.actorId);
  const beneficiarySet = new Set(expressRider.beneficiaryIds);
  const canEdit = party.canUserModify?.(game.user, "update") === true;

  return {
    partyId: party.id,
    canEdit,
    usingVehicle,
    hauling,
    customVehicleSelected,
    travelFoldersReady: !!(travelActors.folders.animals && travelActors.folders.vehicles),
    travelFolderRoot: TRAVEL_FOLDER_NAMES.root,
    travelAnimalsFolder: TRAVEL_FOLDER_NAMES.animals,
    travelVehiclesFolder: TRAVEL_FOLDER_NAMES.vehicles,
    modeOptions: modeOptions(plan.mode),
    vehicles: vehicles.map((vehicle) => ({ ...vehicle, selected: vehicle.id === plan.vehicleId })),
    selectedVehicleName: state.selectedVehicle?.name ?? localize("CMT.Hexploration.NoVehicle"),
    customVehicleName: plan.customVehicleName,
    manualSpeed: plan.manualSpeed ?? "",
    members: members.map((member) => ({
      ...member,
      riding: state.riderIds.includes(member.id),
      canRide: usingVehicle && !plan.haulerIds.includes(member.id),
      status: travellerStatus(member, plan),
    })),
    haulers: haulers.map((hauler) => ({
      ...hauler,
      selected: plan.haulerIds.includes(hauler.id),
    })),
    activityRows,
    warnings: state.warnings.map((warning) => warningLabel(warning)),
    hasWarnings: state.warnings.length > 0,
    sharedSpeed: formatDistance(state.sharedSpeed),
    transportSpeed: state.transportSpeed === null ? null : formatDistance(state.transportSpeed),
    hasTransportSpeed: state.transportSpeed !== null,
    feetPerMinute: formatDistance(state.feetPerMinute),
    milesPerHour: formatDistance(state.milesPerHour),
    milesPerDay: formatDistance(state.milesPerDay),
    activitiesPerDay: formatActivities(state.activitiesPerDay),
    assignedCount: state.assignedCount,
    usedCount: state.usedCount,
    remainingCount: formatActivities(state.remainingActivities),
    unassignedCount: state.unassignedActivities,
    daysRequired: state.daysRequired,
    slowTravel: state.activitiesPerDay === 0.5,
    valid: state.valid,
    expressRider: {
      ...expressRider,
      dc: expressRider.dc ?? "",
      rollTotal: expressRider.rollTotal ?? "",
      hasRollTotal: expressRider.rollTotal !== null,
      outcomeLabel: outcomeLabel(expressRider.outcome),
      actorName: expressActor?.name ?? localize("CMT.Hexploration.NoCharacter"),
      actorHasFeat: expressActor?.hasExpressRider === true,
      successful: state.expressRiderSuccessful,
      applied: state.expressRiderApplied,
      speedBonus: formatDistance(state.expressRiderSpeedBonus),
      hasSpeedBonus: state.expressRiderSpeedBonus > 0,
      beneficiaryCount: expressRider.beneficiaryIds.length,
      beneficiaryLimit: EXPRESS_RIDER_BENEFICIARY_LIMIT,
    },
    expressRiderActors: members.map((member) => ({
      ...member,
      selected: member.id === expressRider.actorId,
    })),
    expressRiderBeneficiaries: members.map((member) => ({
      ...member,
      selected: beneficiarySet.has(member.id),
      riding: state.riderIds.includes(member.id),
    })),
    canRollExpressRider: canEdit
      && expressRider.enabled
      && !!expressActor
      && expressRider.dc !== null,
    otherModifier: plan.travelModifiers.other,
  };
}

async function renderTemplate(path, data) {
  const renderer = foundry.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  if (typeof renderer !== "function") throw new Error("Foundry's Handlebars renderer is unavailable.");
  return renderer(path, data);
}

function rootElement(html) {
  if (html instanceof HTMLElement) return html;
  return html?.[0] instanceof HTMLElement ? html[0] : null;
}

function collectPlan(tab) {
  const value = (field) => tab.querySelector(`[data-cmt-field="${field}"]`)?.value ?? "";
  const checked = (field) => tab.querySelector(`[data-cmt-field="${field}"]`)?.checked === true;
  const checkedIds = (selector) => [...tab.querySelectorAll(selector)]
    .filter((input) => input.checked)
    .map((input) => input.value);
  const activities = [...tab.querySelectorAll("[data-cmt-activity-row]")].map((row) => ({
    type: row.querySelector('[data-cmt-field="activity-type"]')?.value ?? "none",
    actorId: row.querySelector('[data-cmt-field="activity-actor"]')?.value ?? "",
    note: row.querySelector('[data-cmt-field="activity-note"]')?.value ?? "",
    used: row.querySelector('[data-cmt-field="activity-used"]')?.checked === true,
  }));
  const expressSection = tab.querySelector("[data-cmt-express-rider]");
  const expressActorInput = tab.querySelector('[data-cmt-field="express-rider-actor"]');
  const expressDcInput = tab.querySelector('[data-cmt-field="express-rider-dc"]');
  const expressActorId = expressActorInput?.value ?? expressSection?.dataset.cmtExpressActor ?? "";
  const expressDc = expressDcInput?.value ?? expressSection?.dataset.cmtExpressDc ?? "";
  const otherSection = tab.querySelector("[data-cmt-other-modifier]");
  const otherLabelInput = tab.querySelector('[data-cmt-field="other-modifier-label"]');
  const otherSpeedInput = tab.querySelector('[data-cmt-field="other-modifier-speed"]');
  const resultMatchesInputs = expressActorId === (expressSection?.dataset.cmtExpressActor ?? "")
    && String(expressDc) === (expressSection?.dataset.cmtExpressDc ?? "");

  return normalizeHexplorationPlan({
    mode: value("mode"),
    vehicleId: value("vehicle") === "custom" ? "" : value("vehicle"),
    customVehicleName: value("vehicle") === "custom"
      ? (value("custom-vehicle") || localize("CMT.Hexploration.CustomVehicleDefault"))
      : "",
    manualSpeed: value("manual-speed"),
    riderIds: checkedIds('[data-cmt-field="rider"]'),
    haulerIds: checkedIds('[data-cmt-field="hauler"]'),
    activities,
    travelModifiers: {
      expressRider: {
        enabled: checked("express-rider-enabled"),
        actorId: expressActorId,
        skill: EXPRESS_RIDER_SKILL,
        dc: expressDc,
        outcome: resultMatchesInputs ? expressSection?.dataset.cmtExpressOutcome : "unrolled",
        rollTotal: resultMatchesInputs ? expressSection?.dataset.cmtExpressTotal : null,
        beneficiaryIds: checkedIds('[data-cmt-field="express-rider-beneficiary"]')
          .slice(0, EXPRESS_RIDER_BENEFICIARY_LIMIT),
      },
      other: {
        enabled: checked("other-modifier-enabled"),
        label: otherLabelInput?.value ?? otherSection?.dataset.cmtOtherLabel ?? "",
        speedBonus: otherSpeedInput?.value ?? otherSection?.dataset.cmtOtherSpeed ?? 0,
      },
    },
  });
}

async function savePlan(party, plan, config) {
  if (!party.canUserModify?.(game.user, "update")) {
    throw new Error(localize("CMT.Hexploration.NotEditable"));
  }
  await party.setFlag(MODULE_ID, "hexploration", normalizeHexplorationPlan(plan));
  party.reset?.();
  return buildPartyTravelState(party, config);
}

async function postPlanToChat(party, state) {
  const memberById = new Map(partyMembers(party).map((member) => [member.id, member]));
  const activities = state.plannedActivities.map((activity) => ({
    label: activityLabel(activity.type),
    assignee: memberById.get(activity.actorId)?.name ?? localize("CMT.Hexploration.PartyAssignment"),
    note: activity.note,
    used: activity.used,
  }));
  const express = state.plan.travelModifiers.expressRider;
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/hexploration-chat.hbs`, {
    partyName: party.name,
    mode: localize(`CMT.Hexploration.Modes.${state.mode}`),
    vehicle: state.selectedVehicle?.name ?? null,
    haulers: state.selectedHaulers.map((hauler) => hauler.name).join(", "),
    sharedSpeed: formatDistance(state.sharedSpeed),
    feetPerMinute: formatDistance(state.feetPerMinute),
    milesPerHour: formatDistance(state.milesPerHour),
    milesPerDay: formatDistance(state.milesPerDay),
    activitiesPerDay: formatActivities(state.activitiesPerDay),
    assignedCount: state.assignedCount,
    usedCount: state.usedCount,
    remainingCount: formatActivities(state.remainingActivities),
    daysRequired: state.daysRequired,
    slowTravel: state.activitiesPerDay === 0.5,
    expressRider: express.enabled ? {
      actor: memberById.get(express.actorId)?.name ?? localize("CMT.Hexploration.NoCharacter"),
      outcome: outcomeLabel(express.outcome),
      total: express.rollTotal,
      hasTotal: express.rollTotal !== null,
      applied: state.expressRiderApplied,
      beneficiaries: express.beneficiaryIds
        .map((id) => memberById.get(id)?.name)
        .filter(Boolean)
        .join(", "),
    } : null,
    activities,
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: party }),
    content,
  });
}

function calculateStateForDraft(party, config, plan) {
  const actors = actorCollection();
  const members = partyMembers(party).map(actorEntry);
  const { vehicles, haulers } = getTravelActorEntries(actors, plan);
  return calculateTravelState({ plan, members, vehicles, haulers, config });
}

function scrollElements(explorationRoot) {
  const candidates = [
    explorationRoot,
    explorationRoot?.querySelector(":scope > section.content"),
    explorationRoot?.closest(".window-content"),
  ];
  return [...new Set(candidates.filter((element) => element instanceof HTMLElement))];
}

function captureScrollPositions(explorationRoot) {
  return scrollElements(explorationRoot).map((element) => ({
    element,
    left: element.scrollLeft,
    top: element.scrollTop,
  }));
}

function rememberScrollPosition(app, explorationRoot) {
  const content = explorationRoot?.querySelector(":scope > section.content");
  const windowContent = explorationRoot?.closest(".window-content");
  app[PARTY_SCROLL_MARKER] = {
    exploration: explorationRoot?.scrollTop ?? 0,
    content: content?.scrollTop ?? 0,
    window: windowContent?.scrollTop ?? 0,
  };
}

function restoreScrollPositions(app, explorationRoot, captured = []) {
  for (const position of captured) {
    if (!position.element?.isConnected) continue;
    position.element.scrollLeft = position.left;
    position.element.scrollTop = position.top;
  }
  const remembered = app[PARTY_SCROLL_MARKER];
  if (!remembered) return;
  explorationRoot.scrollTop = remembered.exploration;
  const content = explorationRoot.querySelector(":scope > section.content");
  if (content) content.scrollTop = remembered.content;
  const windowContent = explorationRoot.closest(".window-content");
  if (windowContent) windowContent.scrollTop = remembered.window;
}

function trackScrollPosition(app, explorationRoot) {
  for (const element of scrollElements(explorationRoot)) {
    if (element[SCROLL_TRACKING_MARKER]) continue;
    Object.defineProperty(element, SCROLL_TRACKING_MARKER, { value: true });
    element.addEventListener("scroll", () => rememberScrollPosition(app, explorationRoot), { passive: true });
  }
}

function makeSidebarProgress(context) {
  const progress = document.createElement("div");
  progress.className = "cmt-native-progress";
  progress.dataset.cmtNativeProgress = "true";
  for (const [label, value] of [
    [localize("CMT.Hexploration.Assigned"), context.assignedCount],
    [localize("CMT.Hexploration.Used"), context.usedCount],
    [localize("CMT.Hexploration.Remaining"), context.remainingCount],
  ]) {
    const item = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = String(value);
    item.append(strong, document.createTextNode(label));
    progress.append(item);
  }
  return progress;
}

function syncNativeExplorationSidebar(explorationRoot, context) {
  explorationRoot.classList.add("cmt-hexploration-integrated");
  const summary = explorationRoot.querySelector(":scope > aside.sidebar li.summary .summary-data");
  if (summary) {
    for (const old of summary.querySelectorAll("[data-cmt-native-progress]")) old.remove();
    const divider = document.createElement("hr");
    divider.dataset.cmtNativeProgress = "true";
    summary.append(divider, makeSidebarProgress(context));
  }

  const memberByUuid = new Map(context.members.map((member) => [member.uuid, member]));
  for (const link of explorationRoot.querySelectorAll(':scope > aside.sidebar .actor-link[data-actor-uuid]')) {
    const member = memberByUuid.get(link.dataset.actorUuid);
    const card = link.closest("li.member");
    if (!member || !card) continue;
    card.querySelector(":scope > .cmt-native-travel-role")?.remove();
    const role = document.createElement("div");
    role.className = "cmt-native-travel-role";
    if (context.usingVehicle && member.canRide) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = member.id;
      input.dataset.cmtField = "rider";
      input.checked = member.riding;
      input.disabled = !context.canEdit;
      const icon = document.createElement("i");
      icon.className = member.riding ? "fa-solid fa-horse" : "fa-solid fa-person-walking";
      icon.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.textContent = member.status;
      label.append(input, icon, text);
      role.append(label);
    } else {
      const icon = document.createElement("i");
      icon.className = member.status === localize("CMT.Hexploration.Pulling")
        ? "fa-solid fa-horse-head"
        : "fa-solid fa-person-walking";
      icon.setAttribute("aria-hidden", "true");
      role.append(icon, document.createTextNode(member.status));
    }
    const footer = card.querySelector(":scope > footer");
    if (footer) card.insertBefore(role, footer);
    else card.append(role);
  }
}

async function renderTabContents(app, party, tab, config, draftPlan = null, explorationRoot = null) {
  explorationRoot ??= tab.closest(`[data-tab="${EXPLORATION_TAB_ID}"]`);
  const context = buildHexplorationSheetContext(party, config, draftPlan);
  tab.innerHTML = await renderTemplate(`modules/${MODULE_ID}/templates/hexploration-tab.hbs`, context);
  if (explorationRoot) syncNativeExplorationSidebar(explorationRoot, context);

  const refreshDraft = async () => {
    try {
      const scope = explorationRoot ?? tab;
      const captured = captureScrollPositions(explorationRoot);
      rememberScrollPosition(app, explorationRoot);
      await renderTabContents(app, party, tab, config, collectPlan(scope), explorationRoot);
      restoreScrollPositions(app, explorationRoot, captured);
      requestAnimationFrame(() => restoreScrollPositions(app, explorationRoot, captured));
    } catch (error) {
      console.error(`${MODULE_ID} | Could not refresh the Hexploration planner.`, error);
    }
  };
  const scope = explorationRoot ?? tab;
  const refreshFields = [
    "mode",
    "vehicle",
    "manual-speed",
    "rider",
    "hauler",
    "activity-type",
    "activity-actor",
    "express-rider-enabled",
    "express-rider-actor",
    "express-rider-dc",
    "other-modifier-enabled",
    "other-modifier-speed",
  ];
  for (const field of refreshFields) {
    for (const input of scope.querySelectorAll(`[data-cmt-field="${field}"]`)) {
      input.addEventListener("change", refreshDraft);
    }
  }

  for (const input of tab.querySelectorAll('[data-cmt-field="express-rider-beneficiary"]')) {
    input.addEventListener("change", async () => {
      const selected = tab.querySelectorAll('[data-cmt-field="express-rider-beneficiary"]:checked');
      if (selected.length > EXPRESS_RIDER_BENEFICIARY_LIMIT) {
        input.checked = false;
        ui.notifications.warn(localize("CMT.Hexploration.ExpressRiderLimit"));
        return;
      }
      await refreshDraft();
    });
  }

  for (const input of tab.querySelectorAll('[data-cmt-field="activity-used"]')) {
    input.addEventListener("change", async () => {
      try {
        const captured = captureScrollPositions(explorationRoot);
        rememberScrollPosition(app, explorationRoot);
        const plan = collectPlan(scope);
        const state = calculateStateForDraft(party, config, plan);
        if (!state.valid) throw new Error(localize("CMT.Hexploration.InvalidPlan"));
        await savePlan(party, plan, config);
        if (tab.isConnected) await renderTabContents(app, party, tab, config, null, explorationRoot);
        restoreScrollPositions(app, explorationRoot, captured);
      } catch (error) {
        console.error(`${MODULE_ID} | Activity progress was not saved.`, error);
        ui.notifications.error(error.message);
        if (tab.isConnected) await renderTabContents(app, party, tab, config, null, explorationRoot);
      }
    });
  }

  tab.querySelector('[data-cmt-action="roll-express-rider"]')?.addEventListener("click", async (event) => {
    try {
      rememberScrollPosition(app, explorationRoot);
      const plan = collectPlan(scope);
      const express = plan.travelModifiers.expressRider;
      const actor = partyMembers(party).find((member) => member.id === express.actorId);
      const statistic = actor?.getStatistic?.(EXPRESS_RIDER_SKILL);
      if (!actor || !statistic || express.dc === null) {
        throw new Error(localize("CMT.Hexploration.ExpressRiderIncomplete"));
      }
      const roll = await statistic.roll({
        event,
        dc: express.dc,
        title: format("CMT.Hexploration.ExpressRiderRollTitle", { actor: actor.name }),
        label: localize("CMT.Hexploration.ExpressRider"),
        extraRollOptions: ["action:express-rider", "wrathmaker:hexploration"],
      });
      if (!roll) return;
      const outcome = expressRiderOutcomeFromDegree(roll.degreeOfSuccess ?? roll.options?.degreeOfSuccess);
      if (outcome === "unrolled") throw new Error(localize("CMT.Hexploration.ExpressRiderNoOutcome"));
      plan.travelModifiers.expressRider.outcome = outcome;
      plan.travelModifiers.expressRider.rollTotal = Number(roll.total);
      await savePlan(party, plan, config);
      ui.notifications.info(format("CMT.Hexploration.ExpressRiderRolled", {
        actor: actor.name,
        outcome: outcomeLabel(outcome),
      }));
      if (tab.isConnected) await renderTabContents(app, party, tab, config, null, explorationRoot);
    } catch (error) {
      console.error(`${MODULE_ID} | Express Rider could not be rolled.`, error);
      ui.notifications.error(error.message);
    }
  });

  tab.querySelector('[data-cmt-action="reset-day"]')?.addEventListener("click", async () => {
    try {
      rememberScrollPosition(app, explorationRoot);
      const plan = collectPlan(scope);
      plan.activities = plan.activities.map((activity) => ({ ...activity, used: false }));
      plan.travelModifiers.expressRider.outcome = "unrolled";
      plan.travelModifiers.expressRider.rollTotal = null;
      await savePlan(party, plan, config);
      ui.notifications.info(localize("CMT.Hexploration.DayReset"));
      if (tab.isConnected) await renderTabContents(app, party, tab, config, null, explorationRoot);
    } catch (error) {
      console.error(`${MODULE_ID} | Hexploration day could not be reset.`, error);
      ui.notifications.error(error.message);
    }
  });

  tab.querySelector('[data-cmt-action="save"]')?.addEventListener("click", async () => {
    try {
      rememberScrollPosition(app, explorationRoot);
      const plan = collectPlan(scope);
      const state = calculateStateForDraft(party, config, plan);
      if (!state.valid) throw new Error(localize("CMT.Hexploration.InvalidPlan"));
      await savePlan(party, plan, config);
      ui.notifications.info(localize("CMT.Hexploration.Saved"));
      if (tab.isConnected) await renderTabContents(app, party, tab, config, null, explorationRoot);
    } catch (error) {
      console.error(`${MODULE_ID} | Hexploration plan was not saved.`, error);
      ui.notifications.error(error.message);
    }
  });

  tab.querySelector('[data-cmt-action="begin"]')?.addEventListener("click", async () => {
    try {
      rememberScrollPosition(app, explorationRoot);
      const plan = collectPlan(scope);
      const state = calculateStateForDraft(party, config, plan);
      if (!state.valid) throw new Error(localize("CMT.Hexploration.InvalidPlan"));
      await savePlan(party, plan, config);
      await postPlanToChat(party, state);
      ui.notifications.info(localize("CMT.Hexploration.Announced"));
      if (tab.isConnected) await renderTabContents(app, party, tab, config, null, explorationRoot);
    } catch (error) {
      console.error(`${MODULE_ID} | Hexploration day could not begin.`, error);
      ui.notifications.error(error.message);
    }
  });
}

async function injectPartyExploration(app, html, getConfig) {
  const party = app.actor ?? app.document;
  const config = getConfig().hexploration;
  if (!isParty(party) || !config?.enabled) return;
  const root = rootElement(html);
  if (!root) return;
  const form = root.matches("form") ? root : root.querySelector("form");
  const container = form?.querySelector("section.container") ?? form?.querySelector(".container");
  const explorationRoot = container?.querySelector(`:scope > [data-tab="${EXPLORATION_TAB_ID}"]`);
  const content = explorationRoot?.querySelector(":scope > section.content");
  if (!explorationRoot || !content) return;

  let tab = content.querySelector(":scope > .cmt-hexploration-tab");
  if (!tab) {
    tab = document.createElement("section");
    tab.className = "cmt-hexploration-tab";
    content.append(tab);
  }
  await renderTabContents(app, party, tab, config, null, explorationRoot);
  restoreScrollPositions(app, explorationRoot);
  requestAnimationFrame(() => restoreScrollPositions(app, explorationRoot));
  trackScrollPosition(app, explorationRoot);
}

function refreshParties() {
  refreshTimer = null;
  for (const party of (game.actors?.contents ?? []).filter(isParty)) {
    party.reset?.();
    if (party.sheet?.rendered) party.sheet.render(false);
  }
}

function schedulePartyRefresh(actor) {
  if (isParty(actor)) return;
  if (refreshTimer !== null) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshParties, 50);
}

function patchPartyClass(PartyClass, getConfig) {
  const prototype = PartyClass?.prototype;
  const original = prototype?.prepareDerivedData;
  if (typeof original !== "function") return false;
  if (original[PARTY_PATCH_MARKER]) return true;

  function prepareDerivedDataWithWrathmakerHexploration(...args) {
    const result = original.apply(this, args);
    const config = getConfig().hexploration;
    if (config?.enabled && isParty(this)) {
      try {
        applyPreparedPartyTravelSpeed(this, buildPartyTravelState(this, config));
      } catch (error) {
        console.error(`${MODULE_ID} | Could not prepare Hexploration travel speed for ${this.name}.`, error);
      }
    }
    return result;
  }

  Object.defineProperty(prepareDerivedDataWithWrathmakerHexploration, PARTY_PATCH_MARKER, { value: true });
  Object.defineProperty(prepareDerivedDataWithWrathmakerHexploration, "name", { value: original.name });
  prototype.prepareDerivedData = prepareDerivedDataWithWrathmakerHexploration;
  return true;
}

export function installHexploration(getConfig) {
  const configuredPartyClass = CONFIG.PF2E?.Actor?.documentClasses?.party
    ?? CONFIG.Actor?.documentClasses?.party;
  patchPartyClass(configuredPartyClass, getConfig);
  Hooks.once("ready", async () => {
    try {
      await ensureTravelFolders();
    } catch (error) {
      console.error(`${MODULE_ID} | Could not prepare the travel Actor folders.`, error);
    }
    const existingParty = (game.actors?.contents ?? []).find(isParty);
    if (existingParty && patchPartyClass(existingParty.constructor, getConfig)) {
      refreshParties();
    }
  });
  Hooks.on("renderActorSheet", (app, html) => injectPartyExploration(app, html, getConfig));
  Hooks.on("renderActorSheetV2", (app, html) => injectPartyExploration(app, html, getConfig));
  Hooks.on("createActor", (actor) => {
    if (isParty(actor)) {
      if (patchPartyClass(actor.constructor, getConfig)) actor.reset?.();
    } else {
      schedulePartyRefresh(actor);
    }
  });
  Hooks.on("updateActor", schedulePartyRefresh);
  Hooks.on("deleteActor", schedulePartyRefresh);
  Hooks.on("createFolder", (folder) => {
    if (isActorFolder(folder)) schedulePartyRefresh(folder);
  });
  Hooks.on("updateFolder", (folder) => {
    if (isActorFolder(folder)) schedulePartyRefresh(folder);
  });
  Hooks.on("deleteFolder", (folder) => {
    if (isActorFolder(folder)) schedulePartyRefresh(folder);
  });
  return true;
}
