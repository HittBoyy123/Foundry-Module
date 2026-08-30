import { MODULE_ID } from "./constants.js";
import {
  ACTIVITY_TYPES,
  TRAVEL_MODES,
  applyPreparedPartyTravelSpeed,
  calculateTravelState,
  getActorGroundSpeed,
  getVehicleGroundSpeed,
  normalizeHexplorationPlan,
} from "./hexploration-model.js";

const TAB_ID = "wrathmaker-hexploration";
const ACTIVE_TAB = Symbol.for(`${MODULE_ID}.hexploration.activeTab`);
const PARTY_PATCH_MARKER = Symbol.for(`${MODULE_ID}.hexploration.prepareDerivedData`);
const ACTIVITY_ROWS = 4;
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

function partyMembers(party) {
  return Array.isArray(party?.members) ? party.members : [];
}

function actorEntry(actor) {
  return {
    id: actor.id,
    uuid: actor.uuid,
    name: actor.name,
    img: actor.img,
    speed: getActorGroundSpeed(actor),
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
  const vehicles = actors.filter((actor) => actor.type === "vehicle").map(vehicleEntry);
  const haulerActors = actors.filter((actor) => ["character", "npc", "familiar"].includes(actor.type));
  const haulers = haulerActors.map(actorEntry).filter((actor) => actor.speed > 0);
  const plan = normalizeHexplorationPlan(party.getFlag?.(MODULE_ID, "hexploration"));
  return calculateTravelState({ plan, members, vehicles, haulers, config });
}

function localize(key) {
  return game.i18n.localize(key);
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

export function buildHexplorationSheetContext(party, config, draftPlan = null, environment = {}) {
  const actors = actorCollection(environment);
  const members = partyMembers(party).map(actorEntry);
  const plan = normalizeHexplorationPlan(draftPlan ?? party.getFlag?.(MODULE_ID, "hexploration"));
  const vehicles = actors
    .filter((actor) => actor.type === "vehicle" && (canObserve(actor) || actor.id === plan.vehicleId))
    .map(vehicleEntry)
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
  const memberIds = new Set(members.map((member) => member.id));
  const haulers = actors
    .filter((actor) => ["character", "npc", "familiar"].includes(actor.type))
    .filter((actor) => memberIds.has(actor.id) || canObserve(actor) || plan.haulerIds.includes(actor.id))
    .map(actorEntry)
    .filter((actor) => actor.speed > 0)
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
  const state = calculateTravelState({ plan, members, vehicles, haulers, config });
  const activityRows = Array.from({ length: ACTIVITY_ROWS }, (_unused, index) => {
    const activity = plan.activities[index] ?? { type: "none", note: "" };
    return {
      index,
      number: index + 1,
      note: activity.note,
      options: activityOptions(activity.type),
    };
  });
  const hauling = plan.mode === "hauled";
  const usingVehicle = plan.mode !== "foot";
  const customVehicleSelected = usingVehicle && !plan.vehicleId && !!plan.customVehicleName;

  return {
    partyId: party.id,
    canEdit: party.canUserModify?.(game.user, "update") === true,
    usingVehicle,
    hauling,
    customVehicleSelected,
    modeOptions: modeOptions(plan.mode),
    vehicles: vehicles.map((vehicle) => ({ ...vehicle, selected: vehicle.id === plan.vehicleId })),
    selectedVehicleName: state.selectedVehicle?.name ?? localize("CMT.Hexploration.NoVehicle"),
    customVehicleName: plan.customVehicleName,
    manualSpeed: plan.manualSpeed ?? "",
    members: members.map((member) => ({
      ...member,
      riding: state.riderIds.includes(member.id),
      canRide: usingVehicle && !plan.haulerIds.includes(member.id),
    })),
    haulers: haulers.map((hauler) => ({
      ...hauler,
      selected: plan.haulerIds.includes(hauler.id),
    })),
    activityRows,
    warnings: state.warnings.map((warning) => warningLabel(warning)),
    hasWarnings: state.warnings.length > 0,
    sharedSpeed: state.sharedSpeed,
    transportSpeed: state.transportSpeed,
    hasTransportSpeed: state.transportSpeed !== null,
    feetPerMinute: formatDistance(state.feetPerMinute),
    milesPerHour: formatDistance(state.milesPerHour),
    milesPerDay: formatDistance(state.milesPerDay),
    activitiesPerDay: formatActivities(state.activitiesPerDay),
    plannedCount: state.plannedActivities.length,
    daysRequired: state.daysRequired,
    slowTravel: state.activitiesPerDay === 0.5,
    valid: state.valid,
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
  const checkedIds = (selector) => [...tab.querySelectorAll(selector)]
    .filter((input) => input.checked)
    .map((input) => input.value);
  const activities = [...tab.querySelectorAll("[data-cmt-activity-row]")].map((row) => ({
    type: row.querySelector('[data-cmt-field="activity-type"]')?.value ?? "none",
    note: row.querySelector('[data-cmt-field="activity-note"]')?.value ?? "",
  }));
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
  const activities = state.plannedActivities.map((activity) => ({
    label: activityLabel(activity.type),
    note: activity.note,
  }));
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/hexploration-chat.hbs`, {
    partyName: party.name,
    mode: localize(`CMT.Hexploration.Modes.${state.mode}`),
    vehicle: state.selectedVehicle?.name ?? null,
    haulers: state.selectedHaulers.map((hauler) => hauler.name).join(", "),
    sharedSpeed: state.sharedSpeed,
    milesPerHour: formatDistance(state.milesPerHour),
    milesPerDay: formatDistance(state.milesPerDay),
    activitiesPerDay: formatActivities(state.activitiesPerDay),
    daysRequired: state.daysRequired,
    slowTravel: state.activitiesPerDay === 0.5,
    activities,
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: party }),
    content,
  });
}

async function renderTabContents(app, party, tab, config, draftPlan = null) {
  const context = buildHexplorationSheetContext(party, config, draftPlan);
  tab.innerHTML = await renderTemplate(`modules/${MODULE_ID}/templates/hexploration-tab.hbs`, context);

  const refreshDraft = async () => {
    try {
      await renderTabContents(app, party, tab, config, collectPlan(tab));
    } catch (error) {
      console.error(`${MODULE_ID} | Could not refresh the Hexploration planner.`, error);
    }
  };
  for (const input of tab.querySelectorAll('[data-cmt-field="mode"], [data-cmt-field="vehicle"], [data-cmt-field="manual-speed"], [data-cmt-field="rider"], [data-cmt-field="hauler"], [data-cmt-field="activity-type"]')) {
    input.addEventListener("change", refreshDraft);
  }

  tab.querySelector('[data-cmt-action="save"]')?.addEventListener("click", async () => {
    try {
      const plan = collectPlan(tab);
      const state = calculateStateForDraft(party, config, plan);
      if (!state.valid) throw new Error(localize("CMT.Hexploration.InvalidPlan"));
      await savePlan(party, plan, config);
      ui.notifications.info(localize("CMT.Hexploration.Saved"));
      await renderTabContents(app, party, tab, config);
    } catch (error) {
      console.error(`${MODULE_ID} | Hexploration plan was not saved.`, error);
      ui.notifications.error(error.message);
    }
  });

  tab.querySelector('[data-cmt-action="begin"]')?.addEventListener("click", async () => {
    try {
      const plan = collectPlan(tab);
      const state = calculateStateForDraft(party, config, plan);
      if (!state.valid) throw new Error(localize("CMT.Hexploration.InvalidPlan"));
      await savePlan(party, plan, config);
      await postPlanToChat(party, state);
      ui.notifications.info(localize("CMT.Hexploration.Announced"));
      await renderTabContents(app, party, tab, config);
    } catch (error) {
      console.error(`${MODULE_ID} | Hexploration day could not begin.`, error);
      ui.notifications.error(error.message);
    }
  });
}

function calculateStateForDraft(party, config, plan) {
  const actors = actorCollection();
  const members = partyMembers(party).map(actorEntry);
  const vehicles = actors.filter((actor) => actor.type === "vehicle").map(vehicleEntry);
  const haulers = actors
    .filter((actor) => ["character", "npc", "familiar"].includes(actor.type))
    .map(actorEntry)
    .filter((actor) => actor.speed > 0);
  return calculateTravelState({ plan, members, vehicles, haulers, config });
}

async function injectPartyTab(app, html, getConfig) {
  const party = app.actor ?? app.document;
  const config = getConfig().hexploration;
  if (!isParty(party) || !config?.enabled) return;
  const root = rootElement(html);
  if (!root) return;
  const form = root.matches("form") ? root : root.querySelector("form");
  const nav = form?.querySelector("nav.sub-nav") ?? form?.querySelector("nav");
  const container = form?.querySelector("section.container") ?? form?.querySelector(".container");
  if (!nav || !container) return;

  let link = nav.querySelector(`[data-tab="${TAB_ID}"]`);
  if (!link) {
    link = document.createElement("a");
    link.dataset.tab = TAB_ID;
    link.innerHTML = `<i class="fa-solid fa-map-location-dot" aria-hidden="true"></i> ${localize("CMT.Hexploration.Tab")}`;
    nav.append(link);
  }
  let tab = container.querySelector(`:scope > [data-tab="${TAB_ID}"]`);
  if (!tab) {
    tab = document.createElement("div");
    tab.className = "tab cmt-hexploration-tab";
    tab.dataset.tab = TAB_ID;
    container.append(tab);
  }
  await renderTabContents(app, party, tab, config);

  const activateCustomTab = (event) => {
    event?.preventDefault();
    for (const item of nav.querySelectorAll("[data-tab]")) item.classList.toggle("active", item === link);
    for (const panel of container.querySelectorAll(":scope > .tab")) panel.classList.toggle("active", panel === tab);
    app[ACTIVE_TAB] = true;
  };
  link.addEventListener("click", activateCustomTab);
  for (const nativeLink of nav.querySelectorAll(`[data-tab]:not([data-tab="${TAB_ID}"])`)) {
    nativeLink.addEventListener("click", () => {
      app[ACTIVE_TAB] = false;
      link.classList.remove("active");
      tab.classList.remove("active");
    });
  }
  if (app[ACTIVE_TAB]) activateCustomTab();
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
  Hooks.once("ready", () => {
    const existingParty = (game.actors?.contents ?? []).find(isParty);
    if (existingParty && patchPartyClass(existingParty.constructor, getConfig)) {
      refreshParties();
    }
  });
  Hooks.on("renderActorSheet", (app, html) => injectPartyTab(app, html, getConfig));
  Hooks.on("renderActorSheetV2", (app, html) => injectPartyTab(app, html, getConfig));
  Hooks.on("createActor", (actor) => {
    if (isParty(actor)) {
      if (patchPartyClass(actor.constructor, getConfig)) actor.reset?.();
    } else {
      schedulePartyRefresh(actor);
    }
  });
  Hooks.on("updateActor", schedulePartyRefresh);
  Hooks.on("deleteActor", schedulePartyRefresh);
  return true;
}
