import { MODULE_ID } from "./constants.js";

export const ABILITY_BOOST_SCHEMA_VERSION = 2;
export const ABILITY_BOOST_ATTRIBUTES = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);

const PATCH_MARKER = Symbol.for(`${MODULE_ID}.abilityBoosts.prepareBuildData`);
const ATTRIBUTE_SET = new Set(ABILITY_BOOST_ATTRIBUTES);

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getModuleFlags(item) {
  return item?.getFlag?.(MODULE_ID) ?? item?.flags?.[MODULE_ID] ?? null;
}

function getActorInventory(actor) {
  const inventory = actor?.inventory?.contents;
  if (Array.isArray(inventory)) return inventory;

  const items = actor?.items?.contents;
  if (Array.isArray(items)) return items;
  if (actor?.items && Symbol.iterator in Object(actor.items)) return Array.from(actor.items);
  return [];
}

function itemIsReady(item) {
  const invested = item?.isInvested ?? item?.system?.equipped?.invested;
  const equipped = item?.isEquipped ?? (item?.system?.equipped?.carryType === "worn");
  return invested === true && equipped === true;
}

function itemId(item) {
  return item?.id ?? item?._id ?? null;
}

function format(key, data, fallback) {
  const localized = game.i18n.format(key, data);
  if (localized !== key) return localized;
  return Object.entries(data).reduce(
    (message, [placeholder, value]) => message.replaceAll(`{${placeholder}}`, String(value)),
    fallback,
  );
}

function asElement(value) {
  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return value;
  if (typeof HTMLElement !== "undefined" && value?.[0] instanceof HTMLElement) return value[0];
  return null;
}

function getCharacterActor(application) {
  const actor = application?.actor ?? application?.document ?? application?.object;
  return actor?.documentName === "Actor" && actor.type === "character" ? actor : null;
}

export function normalizeAbilityBoost(value) {
  if (!value || typeof value !== "object") return null;
  const attribute = String(value.attribute ?? "").trim().toLowerCase();
  const bonus = Number(value.value);
  if (!ATTRIBUTE_SET.has(attribute) || !Number.isInteger(bonus) || bonus < 1 || bonus > 5) return null;
  return Object.freeze({
    schemaVersion: ABILITY_BOOST_SCHEMA_VERSION,
    attribute,
    value: bonus,
    active: typeof value.active === "boolean" ? value.active : null,
  });
}

export function getItemAbilityBoost(item) {
  if (item?.type !== "equipment") return null;
  const boost = normalizeAbilityBoost(getModuleFlags(item)?.abilityBoost);
  if (!boost) return null;

  const traits = item.system?.traits?.value;
  const otherTags = item.system?.traits?.otherTags;
  if (!Array.isArray(traits) || !traits.includes("apex")) return null;
  if (!Array.isArray(otherTags) || !otherTags.includes("item-boost")) return null;
  if (item.system?.apex?.attribute !== boost.attribute) return null;
  return boost;
}

/** Legacy v1 items inherit their old PF2e selected state until first toggled. */
export function abilityBoostIsActive(item, boost = getItemAbilityBoost(item)) {
  if (!boost) return false;
  return boost.active ?? item.system?.apex?.selected === true;
}

function getAbilityBoostEntries(actor, attribute = null) {
  return getActorInventory(actor).flatMap((item) => {
    const boost = getItemAbilityBoost(item);
    return boost && (!attribute || boost.attribute === attribute) ? [{ ...boost, item }] : [];
  });
}

/**
 * Return every active custom Apex increase, with at most the strongest item for
 * each attribute. Different attributes are intentionally allowed to stack.
 */
export function getActiveAbilityBoosts(actor) {
  if (!actor?.system?.abilities || actor.type !== "character") return [];

  const strongest = new Map();
  for (const entry of getAbilityBoostEntries(actor)) {
    if (!itemIsReady(entry.item) || !abilityBoostIsActive(entry.item, entry)) continue;
    const current = strongest.get(entry.attribute);
    if (!current || entry.value > current.value) strongest.set(entry.attribute, entry);
  }

  return ABILITY_BOOST_ATTRIBUTES.flatMap((attribute) => {
    const boost = strongest.get(attribute);
    return boost ? [boost] : [];
  });
}

/** Backwards-compatible single-result helper retained for the public script API. */
export function getActiveAbilityBoost(actor) {
  return getActiveAbilityBoosts(actor)[0] ?? null;
}

export function applyAbilityBoost(actor, boost) {
  const normalized = normalizeAbilityBoost(boost);
  const ability = normalized ? actor?.system?.abilities?.[normalized.attribute] : null;
  if (!ability || typeof ability !== "object") return false;

  const current = Number(ability.mod);
  if (!Number.isFinite(current)) return false;
  ability.mod = clamp(current + normalized.value, -5, 10);
  ability.base = Math.trunc(ability.mod);
  return true;
}

/**
 * Build the embedded-item updates for one attribute marker. Clicking an active
 * marker disables every custom item for that attribute. Clicking an inactive
 * marker enables the strongest invested and worn item, without changing any
 * other attribute.
 */
export function buildAbilityBoostSelectionUpdates(actor, attribute) {
  if (!ATTRIBUTE_SET.has(attribute)) return [];
  const entries = getAbilityBoostEntries(actor, attribute);
  const ready = entries
    .filter((entry) => itemIsReady(entry.item))
    .sort((left, right) => right.value - left.value || String(itemId(left.item)).localeCompare(String(itemId(right.item))));
  if (ready.length === 0) return [];

  const hasActiveReadyItem = ready.some((entry) => abilityBoostIsActive(entry.item, entry));
  const selectedId = hasActiveReadyItem ? null : itemId(ready[0].item);
  return entries.flatMap((entry) => {
    const id = itemId(entry.item);
    if (!id) return [];
    const active = id === selectedId;
    if (entry.active === active) return [];
    return [{
      _id: id,
      [`flags.${MODULE_ID}.abilityBoost.active`]: active,
      [`flags.${MODULE_ID}.abilityBoost.schemaVersion`]: ABILITY_BOOST_SCHEMA_VERSION,
    }];
  });
}

export async function toggleAbilityBoostAttribute(actor, attribute) {
  const updates = buildAbilityBoostSelectionUpdates(actor, attribute);
  if (updates.length === 0) return false;
  try {
    await actor.updateEmbeddedDocuments("Item", updates);
    return true;
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to change an active Apex item.`, error);
    ui.notifications.error(game.i18n.localize("CMT.Apex.UpdateFailed"));
    return false;
  }
}

function injectAbilityBoostMarkers(application, html) {
  const actor = getCharacterActor(application);
  const root = asElement(html) ?? asElement(application?.element);
  const attributes = root?.querySelector(".subsection.attributes");
  if (!actor || !attributes || attributes.dataset.cmtApexMarkers === "true") return;
  attributes.dataset.cmtApexMarkers = "true";

  const editable = Boolean(application.isEditable ?? application.options?.editable ?? actor.isOwner);
  for (const attribute of ABILITY_BOOST_ATTRIBUTES) {
    const entries = getAbilityBoostEntries(actor, attribute)
      .filter((entry) => itemIsReady(entry.item))
      .sort((left, right) => right.value - left.value || String(itemId(left.item)).localeCompare(String(itemId(right.item))));
    if (entries.length === 0) continue;

    const heading = attributes.querySelector(`li.attribute[data-attribute="${attribute}"] .abbreviation`);
    if (!heading) continue;

    // PF2e's native marker has a deliberately singular click handler. Replace
    // it only where Wrathmaker has a usable custom Apex item.
    for (const marker of heading.querySelectorAll("i.apex")) {
      const container = marker.closest("a[data-action='select-apex-attribute']");
      (container ?? marker).remove();
    }

    const active = entries.filter((entry) => abilityBoostIsActive(entry.item, entry));
    const displayed = active[0] ?? entries[0];
    const data = { item: displayed.item.name, bonus: displayed.value };
    const tooltip = active.length
      ? format("CMT.Apex.ActiveHint", data, "Active: {item} (Item Boost +{bonus}). Click to deactivate.")
      : format("CMT.Apex.InactiveHint", data, "Available: {item} (Item Boost +{bonus}). Click to activate.");

    const icon = document.createElement("i");
    icon.className = `apex ${active.length ? "fa-solid" : "fa-regular unselected"} fa-circle-a`;
    icon.dataset.tooltip = tooltip;

    if (editable) {
      const link = document.createElement("a");
      link.dataset.cmtApexAttribute = attribute;
      link.setAttribute("aria-label", tooltip);
      link.append(icon);
      link.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        void toggleAbilityBoostAttribute(actor, attribute);
      });
      heading.append(link);
    } else {
      heading.append(icon);
    }
  }
}

export function registerAbilityBoostSheetHooks() {
  Hooks.on("renderActorSheet", (application, html) => injectAbilityBoostMarkers(application, html));
  Hooks.on("renderActorSheetV2", (application, html) => injectAbilityBoostMarkers(application, html));
  Hooks.on("renderCharacterSheetPF2e", (application, html) => injectAbilityBoostMarkers(application, html));
}

/**
 * Replace PF2e's standard adjustment only when its singular selected Apex item
 * is a Wrathmaker item. Each independently active Wrathmaker item is then
 * applied before PF2e calculates derived statistics.
 */
export function installAbilityBoostBridge() {
  const CharacterClass = CONFIG.PF2E?.Actor?.documentClasses?.character;
  const prototype = CharacterClass?.prototype;
  const original = prototype?.prepareBuildData;
  if (typeof original !== "function") {
    console.error(`${MODULE_ID} | PF2e Character.prepareBuildData was not found; item boosts cannot be automated.`);
    return false;
  }
  if (original[PATCH_MARKER]) return true;

  function prepareBuildDataWithAbilityBoosts(...args) {
    const active = getActiveAbilityBoosts(this);
    const buildAttributes = this.system?.build?.attributes;
    const storedApex = buildAttributes?.apex ?? null;
    const selectedCustomApex = storedApex && getAbilityBoostEntries(this, storedApex)
      .some((entry) => entry.item.system?.apex?.selected === true);
    const suppressStandardApex = Boolean(buildAttributes && selectedCustomApex);

    if (suppressStandardApex) buildAttributes.apex = null;
    let result;
    try {
      result = original.apply(this, args);
    } finally {
      if (suppressStandardApex) buildAttributes.apex = storedApex;
    }

    for (const boost of active) applyAbilityBoost(this, boost);
    return result;
  }

  Object.defineProperty(prepareBuildDataWithAbilityBoosts, PATCH_MARKER, { value: true });
  Object.defineProperty(prepareBuildDataWithAbilityBoosts, "name", { value: original.name });
  prototype.prepareBuildData = prepareBuildDataWithAbilityBoosts;
  return true;
}
