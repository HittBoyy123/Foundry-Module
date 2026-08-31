import { MODULE_ID } from "./constants.js";

export const HERO_POINTS_MAX = 10;
export const NEPHILIM_POINTS_MAX = 10;
export const NEPHILIM_POINTS_SCHEMA_VERSION = 1;

const HERO_POINT_PATCH_MARKER = Symbol.for(`${MODULE_ID}.campaignResources.prepareBaseData`);

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function asElement(value) {
  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return value;
  if (typeof HTMLElement !== "undefined" && value?.[0] instanceof HTMLElement) return value[0];
  return null;
}

function getParty(application) {
  const actor = application?.actor ?? application?.document ?? application?.object;
  return actor?.type === "party" || actor?.isOfType?.("party") === true ? actor : null;
}

function format(key, data, fallback) {
  const localized = game.i18n.format(key, data);
  if (localized !== key) return localized;
  return Object.entries(data).reduce(
    (message, [placeholder, value]) => message.replaceAll(`{${placeholder}}`, String(value)),
    fallback,
  );
}

export function applyHeroPointMaximum(actor) {
  const isCharacter = actor?.type === "character" || actor?.isOfType?.("character") === true;
  const heroPoints = actor?.system?.resources?.heroPoints;
  if (!isCharacter || !heroPoints || typeof heroPoints !== "object") return false;

  const value = Number(heroPoints.value);
  heroPoints.value = Number.isFinite(value) ? clamp(Math.trunc(value), 0, HERO_POINTS_MAX) : 0;
  heroPoints.max = HERO_POINTS_MAX;
  return true;
}

export function installCampaignResourceBridge() {
  const CharacterClass = CONFIG.PF2E?.Actor?.documentClasses?.character;
  const prototype = CharacterClass?.prototype;
  const original = prototype?.prepareBaseData;
  if (typeof original !== "function") {
    console.error(`${MODULE_ID} | PF2e Character.prepareBaseData was not found; the Hero Point maximum cannot be changed.`);
    return false;
  }
  if (original[HERO_POINT_PATCH_MARKER]) return true;

  function prepareBaseDataWithWrathmakerHeroPoints(...args) {
    const result = original.apply(this, args);
    applyHeroPointMaximum(this);
    return result;
  }

  Object.defineProperty(prepareBaseDataWithWrathmakerHeroPoints, HERO_POINT_PATCH_MARKER, { value: true });
  Object.defineProperty(prepareBaseDataWithWrathmakerHeroPoints, "name", { value: original.name });
  prototype.prepareBaseData = prepareBaseDataWithWrathmakerHeroPoints;
  return true;
}

export function normalizeNephilimPoints(value) {
  const source = typeof value === "number" ? { value } : value && typeof value === "object" ? value : {};
  const points = Number(source.value);
  return Object.freeze({
    schemaVersion: NEPHILIM_POINTS_SCHEMA_VERSION,
    value: Number.isFinite(points) ? clamp(Math.trunc(points), 0, NEPHILIM_POINTS_MAX) : 0,
    max: NEPHILIM_POINTS_MAX,
  });
}

export function getPartyNephilimPoints(party) {
  const value = party?.getFlag?.(MODULE_ID, "nephilimPoints")
    ?? party?.flags?.[MODULE_ID]?.nephilimPoints;
  return normalizeNephilimPoints(value);
}

export async function setPartyNephilimPoints(party, value) {
  const points = normalizeNephilimPoints({ value });
  await party.setFlag(MODULE_ID, "nephilimPoints", points);
  return points;
}

function updateTrackerDisplay(tracker, points) {
  tracker.querySelector("[data-cmt-nephilim-value]").textContent = `${points.value} / ${points.max}`;
  for (const button of tracker.querySelectorAll("[data-cmt-nephilim-point]")) {
    const filled = Number(button.dataset.cmtNephilimPoint) <= points.value;
    const icon = button.querySelector("i");
    icon.className = `${filled ? "fa-solid" : "fa-regular"} fa-circle`;
    button.classList.toggle("active", filled);
  }
}

function injectNephilimPoints(application, html) {
  const party = getParty(application);
  const root = asElement(html) ?? asElement(application?.element);
  const form = root?.matches?.("form") ? root : root?.querySelector("form");
  const details = form?.querySelector(":scope > header .details");
  if (!party || !details || details.querySelector("[data-cmt-nephilim-tracker]")) return;

  const editable = Boolean(
    application.isEditable
    ?? application.options?.editable
    ?? party.canUserModify?.(game.user, "update")
    ?? party.isOwner,
  );
  const points = getPartyNephilimPoints(party);
  const tracker = document.createElement("div");
  tracker.className = "cmt-nephilim-points";
  tracker.dataset.cmtNephilimTracker = "true";

  const heading = document.createElement("span");
  heading.className = "cmt-nephilim-heading";
  heading.textContent = game.i18n.localize("CMT.Resources.NephilimPoints");

  const value = document.createElement("span");
  value.dataset.cmtNephilimValue = "true";

  const pips = document.createElement("span");
  pips.className = "cmt-nephilim-pips";
  for (let point = 1; point <= NEPHILIM_POINTS_MAX; point += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.cmtNephilimPoint = String(point);
    button.disabled = !editable;
    button.setAttribute("aria-label", format(
      "CMT.Resources.SetNephilimPoints",
      { value: point, max: NEPHILIM_POINTS_MAX },
      "Set Nephilim Points to {value} of {max}",
    ));
    button.dataset.tooltip = button.getAttribute("aria-label");
    button.append(document.createElement("i"));
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const current = getPartyNephilimPoints(party).value;
      const next = point === current ? current - 1 : point;
      tracker.classList.add("saving");
      try {
        updateTrackerDisplay(tracker, await setPartyNephilimPoints(party, next));
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to update Nephilim Points.`, error);
        ui.notifications.error(game.i18n.localize("CMT.Resources.NephilimUpdateFailed"));
      } finally {
        tracker.classList.remove("saving");
      }
    });
    pips.append(button);
  }

  tracker.addEventListener("contextmenu", async (event) => {
    if (!editable) return;
    event.preventDefault();
    event.stopPropagation();
    tracker.classList.add("saving");
    try {
      const current = getPartyNephilimPoints(party).value;
      updateTrackerDisplay(tracker, await setPartyNephilimPoints(party, current - 1));
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to update Nephilim Points.`, error);
      ui.notifications.error(game.i18n.localize("CMT.Resources.NephilimUpdateFailed"));
    } finally {
      tracker.classList.remove("saving");
    }
  });

  heading.append(" ", value);
  tracker.append(heading, pips);
  details.classList.add("cmt-has-nephilim-points");
  details.append(tracker);
  updateTrackerDisplay(tracker, points);
}

export function registerCampaignResourceSheetHooks() {
  Hooks.on("renderActorSheet", (application, html) => injectNephilimPoints(application, html));
  Hooks.on("renderActorSheetV2", (application, html) => injectNephilimPoints(application, html));
  Hooks.on("renderPartySheetPF2e", (application, html) => injectNephilimPoints(application, html));
}
