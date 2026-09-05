import { MODULE_ID } from "./constants.js";
import { calculateItemEffects, getCraftingItemType } from "./model.js";

/** Shared, plain-data readout. Never expose unidentified material or Mark data. */
export function makeAndMarksChatSummary(item, config) {
  if (!item || item.isIdentified === false) return null;
  const flags = item.flags?.[MODULE_ID] ?? item.getFlag?.(MODULE_ID);
  if (!flags) return null;
  const itemType = getCraftingItemType(item);
  const result = calculateItemEffects({
    itemType, itemId: item.id ?? "item", itemName: item.name ?? "Item", flags, config,
  });
  if (!result.active) return null;
  const marks = result.flags.crafting.artisanMarks
    .filter((mark) => mark.status !== "suppressed")
    .map((mark) => ({ name: mark.name, maker: mark.maker?.name ?? "" }));
  return { material: result.presentation.label, tier: result.flags.tier, itemType, marks };
}

async function resolveCardItem(message, card) {
  if (message.item) return message.item;
  const uuid = message.flags?.pf2e?.origin?.uuid;
  if (uuid && typeof globalThis.fromUuid === "function") {
    const item = await fromUuid(uuid);
    if (item?.documentName === "Item") return item;
  }
  return message.actor?.items?.get?.(card.dataset.itemId) ?? null;
}

function label(key, fallback) {
  const translated = game.i18n.localize(key);
  return translated === key ? fallback : translated;
}

export async function injectItemChatMarks(message, html, getConfig) {
  if (message.isContentVisible === false || message.visible === false) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const cards = root.matches(".chat-card") ? [root] : root.querySelectorAll(".chat-card");
  for (const card of cards) {
    const description = card.querySelector(":scope > .card-content");
    if (!description || card.querySelector("[data-cmt-chat-marks]")) continue;
    const item = await resolveCardItem(message, card);
    const summary = makeAndMarksChatSummary(item, getConfig());
    // Both Foundry chat rendering hooks can run on the same card.
    if (!summary || card.querySelector("[data-cmt-chat-marks]")) continue;
    const row = document.createElement("section");
    row.className = "cmt-chat-make-marks";
    row.dataset.cmtChatMarks = "true";
    row.setAttribute("aria-label", label("CMT.ItemSheet.MakeAndMarks", "Make & Marks"));
    const core = document.createElement("span");
    core.className = "cmt-chat-core";
    const type = { weapon: "Weapon", armor: "Armor", shield: "Shield", spellFocus: "Spell Focus" }[summary.itemType] ?? "Item";
    core.textContent = `${summary.material} ${type} · T${summary.tier}`;
    const marks = document.createElement("span");
    marks.className = "cmt-chat-mark-count";
    marks.tabIndex = 0;
    marks.textContent = game.i18n.format("CMT.ItemSheet.ArtisanMarksCount", { count: summary.marks.length });
    const tooltip = document.createElement("div");
    for (const mark of summary.marks) {
      const line = document.createElement("div");
      line.textContent = `${mark.name} — ${mark.maker || label("CMT.ItemSheet.UnknownMaker", "Unknown maker")}`;
      tooltip.append(line);
    }
    if (!summary.marks.length) tooltip.textContent = label("CMT.ItemSheet.NoArtisanMarks", "No Artisan Marks");
    marks.dataset.tooltip = tooltip.innerHTML;
    marks.dataset.tooltipClass = "pf2e cmt-chat-mark-tooltip";
    marks.setAttribute("aria-label", [marks.textContent, ...summary.marks.map(mark => `${mark.name} — ${mark.maker || "Unknown maker"}`)].join(". "));
    row.append(core, marks);
    description.before(row);
  }
}

export function registerItemChatHooks(getConfig) {
  const inject = (message, html) => {
    void injectItemChatMarks(message, html, getConfig).catch(error => {
      console.error(`${MODULE_ID} | Could not display item Make & Marks.`, error);
    });
  };
  Hooks.on("renderChatMessageHTML", inject);
  Hooks.on("renderChatMessage", inject);
}
