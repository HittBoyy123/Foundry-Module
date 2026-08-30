import { DEFAULT_ITEM_FLAGS, MODULE_ID } from "./constants.js";
import {
  getTierPresentation,
  itemTypeIsSupported,
  materialsForItemType,
  normalizeItemFlags,
} from "./model.js";

function localize(key, fallback) {
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
}

function asElement(value) {
  if (value instanceof HTMLElement) return value;
  if (value?.[0] instanceof HTMLElement) return value[0];
  return null;
}

function getItem(application) {
  const document = application?.document ?? application?.item ?? application?.object;
  return document?.documentName === "Item" ? document : null;
}

function option(value, label, selected) {
  const element = document.createElement("option");
  element.value = String(value);
  element.textContent = label;
  element.selected = String(value) === String(selected);
  return element;
}

function findQuantityRow(root) {
  const control = root.querySelector('[name="system.quantity"]');
  const row = control?.closest(".form-group, .form-field, .field");
  if (row?.parentElement) return row;

  const label = [...root.querySelectorAll("label")].find((element) =>
    element.textContent?.trim().toLowerCase() === localize("PF2E.QuantityLabel", "Quantity").toLowerCase());
  return label?.closest(".form-group, .form-field, .field") ?? null;
}

function findReferenceSelect(root) {
  const selectors = [
    '[name="system.equipped.handsHeld"]',
    '[name="system.bulk.value"]',
    '[name="system.size"]',
  ];
  return selectors.map((selector) => root.querySelector(selector)).find(Boolean) ?? null;
}

function matchNativeSelect(control, reference) {
  if (!reference) return;
  control.className = reference.className;
  const width = reference.getBoundingClientRect?.().width || reference.offsetWidth || 0;
  if (width <= 0) return;
  const pixels = `${width}px`;
  control.style.flex = `0 0 ${pixels}`;
  control.style.width = pixels;
  control.style.maxWidth = pixels;
}

function populateTierOptions(control, materialId, selectedTier, config) {
  control.replaceChildren();
  for (let tier = 1; tier <= 6; tier += 1) {
    const presentation = getTierPresentation(config, materialId, tier);
    control.append(option(tier, `${tier} — ${presentation.label}`, selectedTier));
  }
}

function createNativeRow(anchor, labelText, control) {
  const tagName = ["DIV", "LI"].includes(anchor.tagName) ? anchor.tagName.toLowerCase() : "div";
  const row = document.createElement(tagName);
  row.className = anchor.className;
  row.classList.add("cmt-inline-field");

  const label = document.createElement("label");
  label.textContent = labelText;
  label.htmlFor = control.id;
  row.append(label, control);
  return row;
}

async function saveSelection(item, root, config) {
  const material = root.querySelector('[data-cmt-field="material"]')?.value ?? DEFAULT_ITEM_FLAGS.material;
  const tier = Number(root.querySelector('[data-cmt-field="tier"]')?.value ?? 1);
  const flags = normalizeItemFlags({ material, tier }, config);
  const controls = root.querySelectorAll("[data-cmt-field]");
  controls.forEach((control) => { control.disabled = true; });
  try {
    await item.update({ [`flags.${MODULE_ID}`]: flags });
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to update ${item.name}.`, error);
    ui.notifications.error(localize("CMT.Notifications.UpdateFailed", "The crafting material could not be saved."));
  } finally {
    controls.forEach((control) => { control.disabled = false; });
  }
}

function insertControls(application, item, root, config) {
  const anchor = findQuantityRow(root);
  if (!anchor) {
    console.warn(`${MODULE_ID} | Could not find the physical-item field list on ${item.name}.`);
    return;
  }
  const referenceSelect = findReferenceSelect(root);

  const availableMaterials = materialsForItemType(config, item.type);
  const rawFlags = item.getFlag?.(MODULE_ID) ?? item.flags?.[MODULE_ID];
  const flags = normalizeItemFlags(rawFlags, config);
  const editable = Boolean(application.isEditable ?? application.options?.editable ?? item.isOwner);
  const materialIsAvailable = availableMaterials.some((entry) => entry.id === flags.material);

  const material = document.createElement("select");
  material.id = `${application.id ?? item.id}-cmt-material`;
  material.dataset.cmtField = "material";
  material.disabled = !editable;
  matchNativeSelect(material, referenceSelect);
  if (!materialIsAvailable) {
    material.append(option(
      flags.material,
      `${localize("CMT.ItemSheet.Unavailable", "Unavailable material")} (${flags.material})`,
      flags.material,
    ));
  }
  for (const entry of availableMaterials) material.append(option(entry.id, entry.label, flags.material));

  const tier = document.createElement("select");
  tier.id = `${application.id ?? item.id}-cmt-tier`;
  tier.dataset.cmtField = "tier";
  tier.disabled = !editable;
  matchNativeSelect(tier, referenceSelect);
  populateTierOptions(tier, flags.material, flags.tier, config);

  const materialRow = createNativeRow(anchor, localize("CMT.ItemSheet.Material", "Material"), material);
  materialRow.dataset.cmtSheetControls = "true";
  const tierRow = createNativeRow(anchor, localize("CMT.ItemSheet.Tier", "Tier"), tier);

  anchor.after(materialRow, tierRow);
  material.addEventListener("change", () => {
    populateTierOptions(tier, material.value, Number(tier.value), config);
    void saveSelection(item, root, config);
  });
  tier.addEventListener("change", () => void saveSelection(item, root, config));
}

export function injectItemSheet(application, html, getConfig) {
  const item = getItem(application);
  const root = asElement(html) ?? asElement(application?.element);
  if (!item || !root || root.querySelector('[data-cmt-sheet-controls="true"]')) return;

  const config = getConfig();
  if (!itemTypeIsSupported(config, item.type)) return;
  insertControls(application, item, root, config);
}

export function registerItemSheetHooks(getConfig) {
  Hooks.on("renderApplicationV2", (application, element) => injectItemSheet(application, element, getConfig));
  Hooks.on("renderItemSheet", (application, html) => injectItemSheet(application, html, getConfig));
  Hooks.on("renderItemSheetPF2e", (application, html) => injectItemSheet(application, html, getConfig));
}
