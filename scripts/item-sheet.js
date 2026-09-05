import { DEFAULT_ITEM_FLAGS, MODULE_ID } from "./constants.js";
import {
  calculateItemEffects,
  getTierPresentation,
  getCraftingItemType,
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

function dragonScaleConfig(config) {
  const material = config.materials?.["dragon-scale"];
  return material?.augmentation === true && material.enabled ? material : null;
}

function dragonScaleIsAvailable(config, itemType, materialId) {
  const dragonScale = dragonScaleConfig(config);
  return itemType === "armor" && Boolean(dragonScale?.allowedBaseMaterials.includes(materialId));
}

function populateDragonScaleColors(control, selectedColor, config) {
  const dragonScale = dragonScaleConfig(config);
  control.replaceChildren(option("", localize("CMT.ItemSheet.NoDragonScale", "None"), selectedColor));
  if (!dragonScale) return;
  if (selectedColor && !dragonScale.colors[selectedColor]) {
    control.append(option(
      selectedColor,
      `${localize("CMT.ItemSheet.Unavailable", "Unavailable material")} (${selectedColor})`,
      selectedColor,
    ));
  }
  for (const [colorId, color] of Object.entries(dragonScale.colors)) {
    control.append(option(colorId, `${color.label} — ${color.damageType}`, selectedColor));
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
  const current = normalizeItemFlags(item.getFlag?.(MODULE_ID) ?? item.flags?.[MODULE_ID], config);
  const dragonColor = root.querySelector('[data-cmt-field="dragon-scale-color"]')?.value;
  const dragonTier = root.querySelector('[data-cmt-field="dragon-scale-tier"]')?.value;
  const flags = normalizeItemFlags({
    material,
    tier,
    crafting: current.crafting,
    dragonScale: dragonColor === undefined
      ? current.dragonScale
      : {
        ...current.dragonScale,
        color: dragonColor,
        tier: Number(dragonTier ?? current.dragonScale.tier),
      },
  }, config);
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

function hideRuneControls(root) {
  for (const control of root.querySelectorAll('[name^="system.runes."]')) {
    const row = control.closest(".form-group, .form-field, .field, li");
    if (row) {
      row.hidden = true;
      row.dataset.cmtReplacedRuneControl = "true";
    }
  }
}

function createMakeAndMarksStrip(item, flags, config, craftingItemType) {
  const result = calculateItemEffects({
    itemType: craftingItemType,
    itemId: item.id ?? item._id ?? "item",
    itemName: item.name ?? "Item",
    flags,
    config,
  });
  if (!result.active) return null;

  const strip = document.createElement("section");
  strip.className = "cmt-make-marks-strip";
  strip.dataset.cmtMakeMarks = "true";

  const heading = document.createElement("h3");
  heading.textContent = localize("CMT.ItemSheet.MakeAndMarks", "Make & Marks");

  const chips = document.createElement("div");
  chips.className = "cmt-make-marks-chips";
  const core = document.createElement("span");
  core.className = "cmt-make-mark-chip is-core";
  core.title = localize("CMT.ItemSheet.CoreMaterialHint", "The Core Material sets the item's fundamental progression.");
  core.textContent = `${result.presentation.label} · T${result.flags.tier}`;

  const activeMarks = result.flags.crafting.artisanMarks.filter((mark) => mark.status !== "suppressed");
  const marks = document.createElement("span");
  marks.className = "cmt-make-mark-chip";
  const markCount = activeMarks.length;
  marks.textContent = game.i18n.format("CMT.ItemSheet.ArtisanMarksCount", { count: markCount });

  const capacity = document.createElement("span");
  capacity.className = `cmt-make-mark-capacity${result.capacity.overCapacity ? " is-invalid" : ""}`;
  capacity.title = localize("CMT.ItemSheet.CapacityHint", "Core Tier determines available Artisan Capacity.");
  const capacityLabel = document.createElement("strong");
  capacityLabel.textContent = game.i18n.format("CMT.ItemSheet.Capacity", {
    used: result.capacity.used,
    maximum: result.capacity.maximum,
  });
  const segments = document.createElement("span");
  segments.className = "cmt-capacity-segments";
  for (let index = 0; index < result.capacity.maximum; index += 1) {
    const segment = document.createElement("i");
    if (index < result.capacity.used) segment.className = "is-used";
    segments.append(segment);
  }
  capacity.append(capacityLabel, segments);
  chips.append(core, marks, capacity);
  strip.append(heading, chips);
  if (activeMarks.length) {
    const details = document.createElement("details");
    details.className = "cmt-applied-marks";
    const summary = document.createElement("summary");
    summary.textContent = localize("CMT.ItemSheet.AppliedMarks", "Applied Artisan Marks");
    const list = document.createElement("div");
    for (const mark of activeMarks) {
      const card = document.createElement("article");
      const header = document.createElement("header");
      const name = document.createElement("strong");
      name.textContent = mark.name;
      name.title = mark.effectSummary;
      const grade = document.createElement("span");
      grade.textContent = `${mark.grade[0].toUpperCase() + mark.grade.slice(1)} · ${mark.capacityCost} Capacity · T${mark.effectiveMarkTier}`;
      const effect = document.createElement("p");
      effect.textContent = mark.effectSummary;
      const provenance = document.createElement("small");
      provenance.textContent = [
        mark.profession,
        mark.specialisation,
        mark.configuration?.choice ? `Choice: ${mark.configuration.choice}` : "",
        mark.maker?.name ? `by ${mark.maker.name}` : "",
        mark.anchorSlotIds.length ? `Anchor: ${mark.anchorSlotIds.join(", ")}` : "",
      ].filter(Boolean).join(" · ");
      header.append(name, grade);
      card.append(header, effect, provenance);
      list.append(card);
    }
    details.append(summary, list);
    strip.append(details);
  }
  return strip;
}

function insertControls(application, item, root, config, craftingItemType) {
  const anchor = findQuantityRow(root);
  if (!anchor) {
    console.warn(`${MODULE_ID} | Could not find the physical-item field list on ${item.name}.`);
    return;
  }
  const referenceSelect = findReferenceSelect(root);

  const availableMaterials = materialsForItemType(config, craftingItemType);
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
  const rows = [materialRow, tierRow];

  let dragonColor = null;
  let dragonTier = null;
  let dragonColorRow = null;
  let dragonTierRow = null;
  if (item.type === "armor" && dragonScaleConfig(config)) {
    dragonColor = document.createElement("select");
    dragonColor.id = `${application.id ?? item.id}-cmt-dragon-scale`;
    dragonColor.dataset.cmtField = "dragon-scale-color";
    matchNativeSelect(dragonColor, referenceSelect);
    populateDragonScaleColors(dragonColor, flags.dragonScale.color, config);

    dragonTier = document.createElement("select");
    dragonTier.id = `${application.id ?? item.id}-cmt-dragon-scale-tier`;
    dragonTier.dataset.cmtField = "dragon-scale-tier";
    matchNativeSelect(dragonTier, referenceSelect);
    populateTierOptions(dragonTier, "dragon-scale", flags.dragonScale.tier, config);

    dragonColorRow = createNativeRow(
      anchor,
      localize("CMT.ItemSheet.DragonScale", "Dragon Scale"),
      dragonColor,
    );
    dragonTierRow = createNativeRow(
      anchor,
      localize("CMT.ItemSheet.DragonScaleTier", "Scale Tier"),
      dragonTier,
    );
    rows.push(dragonColorRow, dragonTierRow);
  }

  anchor.after(...rows);
  const makeAndMarks = createMakeAndMarksStrip(item, rawFlags, config, craftingItemType);
  if (makeAndMarks) {
    rows.at(-1).after(makeAndMarks);
    hideRuneControls(root);
  }
  const updateDragonScaleControls = () => {
    if (!dragonColor || !dragonTier) return;
    const available = dragonScaleIsAvailable(config, item.type, material.value);
    dragonColorRow.hidden = !available;
    dragonTierRow.hidden = !available;
    dragonColor.disabled = !editable || !available;
    dragonTier.disabled = !editable || !available || !dragonColor.value;
  };
  updateDragonScaleControls();
  material.addEventListener("change", () => {
    populateTierOptions(tier, material.value, Number(tier.value), config);
    updateDragonScaleControls();
    void saveSelection(item, root, config);
  });
  tier.addEventListener("change", () => void saveSelection(item, root, config));
  dragonColor?.addEventListener("change", () => {
    updateDragonScaleControls();
    void saveSelection(item, root, config);
  });
  dragonTier?.addEventListener("change", () => void saveSelection(item, root, config));
}

export function injectItemSheet(application, html, getConfig) {
  const item = getItem(application);
  const root = asElement(html) ?? asElement(application?.element);
  if (!item || !root || root.querySelector('[data-cmt-sheet-controls="true"]')) return;

  const config = getConfig();
  const craftingItemType = getCraftingItemType(item);
  if (!itemTypeIsSupported(config, craftingItemType)) return;
  insertControls(application, item, root, config, craftingItemType);
}

export function registerItemSheetHooks(getConfig) {
  Hooks.on("renderApplicationV2", (application, element) => injectItemSheet(application, element, getConfig));
  Hooks.on("renderItemSheet", (application, html) => injectItemSheet(application, html, getConfig));
  Hooks.on("renderItemSheetPF2e", (application, html) => injectItemSheet(application, html, getConfig));
}
