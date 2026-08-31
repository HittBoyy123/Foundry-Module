import { MODULE_ID } from "./constants.js";
import {
  ACTIVITY_TYPES,
  TRAVEL_CHECK_SKILLS,
  TRAVEL_MODES,
  applyPreparedPartyTravelSpeed,
  calculateTravelState,
  expressRiderOutcomeFromDegree,
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

function itemSlug(item) {
  return String(item?.slug ?? item?.system?.slug ?? item?.name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  const vehicles = actors.filter((actor) => actor.type === "vehicle").map(vehicleEntry);
  const haulerActors = actors.filter((actor) => ["character", "npc", "familiar"].includes(actor.type));
  const haulers = haulerActors.map(actorEntry).filter((actor) => actor.speed > 0);
  const plan = normalizeHexplorationPlan(party.getFlag?.(MODULE_ID, "hexploration"));
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

function skillOptions(selectedSkill) {
  return TRAVEL_CHECK_SKILLS.map((value) => ({
    value,
    label: localize(`CMT.Hexploration.Skills.${value}`),
    selected: value === selectedSkill,
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
  const savedExpressRider = plan.travelModifiers.expressRider;
  const suggestedExpressActor = savedExpressRider.enabled
    ? members.find((member) => member.hasExpressRider)
    : null;
  const expressRider = {
    ...savedExpressRider,
    actorId: savedExpressRider.actorId || suggestedExpressActor?.id || "",
  };
  const expressActor = memberById.get(expressRider.actorId);
  const canEdit = party.canUserModify?.(game.user, "update") === true;

  return {
    partyId: party.id,
    canEdit,
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
    },
    expressRiderActors: members.map((member) => ({
      ...member,
      selected: member.id === expressRider.actorId,
    })),
    skillOptions: skillOptions(expressRider.skill),
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
  const expressSkillInput = tab.querySelector('[data-cmt-field="express-rider-skill"]');
  const expressDcInput = tab.querySelector('[data-cmt-field="express-rider-dc"]');
  const expressActorId = expressActorInput?.value ?? expressSection?.dataset.cmtExpressActor ?? "";
  const expressSkill = expressSkillInput?.value ?? expressSection?.dataset.cmtExpressSkill ?? "survival";
  const expressDc = expressDcInput?.value ?? expressSection?.dataset.cmtExpressDc ?? "";
  const otherSection = tab.querySelector("[data-cmt-other-modifier]");
  const otherLabelInput = tab.querySelector('[data-cmt-field="other-modifier-label"]');
  const otherSpeedInput = tab.querySelector('[data-cmt-field="other-modifier-speed"]');
  const resultMatchesInputs = expressActorId === (expressSection?.dataset.cmtExpressActor ?? "")
    && expressSkill === (expressSection?.dataset.cmtExpressSkill ?? "nature")
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
        skill: expressSkill,
        dc: expressDc,
        outcome: resultMatchesInputs ? expressSection?.dataset.cmtExpressOutcome : "unrolled",
        rollTotal: resultMatchesInputs ? expressSection?.dataset.cmtExpressTotal : null,
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
  const vehicles = actors.filter((actor) => actor.type === "vehicle").map(vehicleEntry);
  const haulers = actors
    .filter((actor) => ["character", "npc", "familiar"].includes(actor.type))
    .map(actorEntry)
    .filter((actor) => actor.speed > 0);
  return calculateTravelState({ plan, members, vehicles, haulers, config });
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
    "express-rider-skill",
    "express-rider-dc",
    "other-modifier-enabled",
    "other-modifier-speed",
  ];
  for (const field of refreshFields) {
    for (const input of tab.querySelectorAll(`[data-cmt-field="${field}"]`)) {
      input.addEventListener("change", refreshDraft);
    }
  }

  for (const input of tab.querySelectorAll('[data-cmt-field="activity-used"]')) {
    input.addEventListener("change", async () => {
      try {
        const plan = collectPlan(tab);
        const state = calculateStateForDraft(party, config, plan);
        if (!state.valid) throw new Error(localize("CMT.Hexploration.InvalidPlan"));
        await savePlan(party, plan, config);
        await renderTabContents(app, party, tab, config);
      } catch (error) {
        console.error(`${MODULE_ID} | Activity progress was not saved.`, error);
        ui.notifications.error(error.message);
        await renderTabContents(app, party, tab, config);
      }
    });
  }

  tab.querySelector('[data-cmt-action="roll-express-rider"]')?.addEventListener("click", async (event) => {
    try {
      const plan = collectPlan(tab);
      const express = plan.travelModifiers.expressRider;
      const actor = partyMembers(party).find((member) => member.id === express.actorId);
      const statistic = actor?.getStatistic?.(express.skill);
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
      await renderTabContents(app, party, tab, config);
    } catch (error) {
      console.error(`${MODULE_ID} | Express Rider could not be rolled.`, error);
      ui.notifications.error(error.message);
    }
  });

  tab.querySelector('[data-cmt-action="reset-day"]')?.addEventListener("click", async () => {
    try {
      const plan = collectPlan(tab);
      plan.activities = plan.activities.map((activity) => ({ ...activity, used: false }));
      plan.travelModifiers.expressRider.outcome = "unrolled";
      plan.travelModifiers.expressRider.rollTotal = null;
      await savePlan(party, plan, config);
      ui.notifications.info(localize("CMT.Hexploration.DayReset"));
      await renderTabContents(app, party, tab, config);
    } catch (error) {
      console.error(`${MODULE_ID} | Hexploration day could not be reset.`, error);
      ui.notifications.error(error.message);
    }
  });

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
