import { FOCUS_SLOTS, setFocusSlot } from "./spell-focus.js";
import { getCraftingItemType } from "./model.js";
import { MODULE_ID } from "./constants.js";

export const EQUIPMENT_SLOTS = Object.freeze([
  ["head", "Head", "fa-crown"], ["neck", "Neck", "fa-gem"],
  ["body", "Body", "fa-shirt"], ["back", "Cloak / back", "fa-feather"],
  ["pack", "Backpack", "fa-bag-shopping"], ["rings", "Worn rings", "fa-ring"],
  ["wrists", "Wrists", "fa-shield-halved"], ["hands", "Gloves", "fa-hand"],
  ["held", "Held items", "fa-hand-fist"], ["waist", "Waist", "fa-ring"],
  ["feet", "Feet", "fa-shoe-prints"], ["accessories", "Accessories", "fa-gem"],
]);
const physical = item => ["armor", "weapon", "shield", "equipment", "backpack", "consumable"].includes(item?.type);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const list = actor => Array.from(actor.items?.contents ?? actor.items ?? []);

export function equipmentSlot(item) {
  if (!physical(item)) return null;
  const usage = item.system?.usage ?? {};
  const where = usage.where ?? String(usage.value ?? "").replace(/^worn/, "");
  if (item.type === "weapon" || item.type === "shield" || usage.type === "held" || String(usage.value).startsWith("held")) return "held";
  if (item.type === "armor" || ["armor", "clothing", "garment"].includes(where)) return "body";
  if (item.type === "backpack") return "pack";
  if (["back", "cloak", "cape"].includes(where)) return "back";
  if (["ring", "rings"].includes(where)) return "rings";
  const aliases = { head: "head", headwear: "head", helmet: "head", neck: "neck", necklace: "neck", collar: "neck", wrists: "wrists", bracelets: "wrists", gloves: "hands", hands: "hands", belt: "waist", waist: "waist", shoes: "feet", boots: "feet", feet: "feet" };
  return aliases[where] ?? "accessories";
}

function displaySlot(item) {
  const saved = item.flags?.[MODULE_ID]?.equipmentPanel?.slot;
  return saved && EQUIPMENT_SLOTS.some(slot => slot[0] === saved) ? saved : equipmentSlot(item);
}

export function visibleEquipment(actor) {
  return list(actor).filter(item => physical(item) && !item.system?.containerId && !item.flags?.[MODULE_ID]?.equipmentPanel?.carried
    && ["worn", "held"].includes(item.system?.equipped?.carryType)
    && (item.system?.equipped?.carryType !== "held" || item.system.equipped.handsHeld > 0)
    && !(item.system?.usage?.where && item.system.equipped.inSlot === false));
}

export async function equipPanelItem(actor, item, slot, { remove = false } = {}) {
  if (!game.settings.get(MODULE_ID, "equipmentPanel")) throw new Error("The experimental equipment panel is disabled.");
  if (!actor.isOwner || item?.parent?.uuid !== actor.uuid || !physical(item)) throw new Error("Choose equipment from this character's inventory.");
  if (!remove && getCraftingItemType(item) === "spellFocus" && FOCUS_SLOTS[slot]) await setFocusSlot(item, slot);
  const expected = equipmentSlot(item);
  if (!remove && expected !== slot && !(expected === "accessories" && slot !== "held")) throw new Error(`This item belongs in ${EQUIPMENT_SLOTS.find(s => s[0] === expected)?.[1] ?? "another slot"}.`);
  if (typeof actor.changeCarryType !== "function") throw new Error("This system version does not support equipment changes from this panel.");
  const held = slot === "held" && !remove;
  const hands = Number(item.system?.usage?.hands ?? (String(item.system?.usage?.value).includes("two") ? 2 : 1));
  await actor.changeCarryType(item, { carryType: "worn", handsHeld: 0, inSlot: false, ...(!remove ? { carryType: held ? "held" : "worn", handsHeld: held ? hands : 0, inSlot: true } : {}) });
  await item.update({ [`flags.${MODULE_ID}.equipmentPanel`]: { slot, carried: remove } });
}

export function equipmentMarkup(actor) {
  const equipped = visibleEquipment(actor);
  return `<div class="cmt-equipment-layout"><div class="cmt-equipment-figure" aria-hidden="true"><svg viewBox="0 0 160 360"><circle cx="80" cy="34" r="24"/><path d="M55 67 Q80 58 105 67 L120 143 L143 190 Q143 204 130 202 L101 157 L100 209 L112 323 Q113 341 98 341 L81 231 L64 341 Q49 341 49 324 L60 209 L59 157 L30 202 Q17 204 17 190 L40 143 Z"/></svg></div>${EQUIPMENT_SLOTS.map(([key, label, icon]) => {
    const entries = equipped.filter(i => displaySlot(i) === key);
    return `<section class="cmt-equipment-slot" data-equipment-slot="${key}"><strong><i class="fa-solid ${icon}"></i> ${label}</strong>${entries.map(i => `<div class="cmt-equipment-entry"><button type="button" data-equipment-open="${esc(i.id)}" title="${esc(i.name)}"><img src="${esc(i.img)}" alt=""><span>${esc(i.name)}</span></button>${actor.isOwner ? `<button type="button" class="cmt-equipment-remove" data-equipment-remove="${esc(i.id)}" title="Return to carried inventory" aria-label="Unequip ${esc(i.name)}">×</button>` : ""}</div>`).join("")}${actor.isOwner ? `<button type="button" class="cmt-equipment-add" data-equipment-choose="${key}">${entries.length ? "+ Add" : "Drop or choose"}</button>` : entries.length ? "" : "<small>Empty</small>"}</section>`;
  }).join("")}</div><p class="cmt-equipment-note">Equipment stays in your inventory. Investment is managed on the inventory tab. Wings granted by ancestry or Bonds remain character features.</p>`;
}

async function chooseItem(actor, slot) {
  const candidates = list(actor).filter(i => physical(i) && (equipmentSlot(i) === slot || (getCraftingItemType(i) === "spellFocus" && FOCUS_SLOTS[slot]) || (equipmentSlot(i) === "accessories" && slot !== "held")));
  if (!candidates.length) return ui.notifications.info("No matching equipment in this character's inventory.");
  const id = await foundry.applications.api.DialogV2.wait({ window: { title: `Equip — ${EQUIPMENT_SLOTS.find(s => s[0] === slot)[1]}` }, content: `<label>Inventory item<select name="equipment">${candidates.map(i => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join("")}</select></label>`, buttons: [{ action: "equip", label: "Equip", default: true, callback: (_e, button) => button.form.elements.namedItem("equipment").value }, { action: "cancel", label: "Cancel", callback: () => null }], rejectClose: false });
  if (id) await equipPanelItem(actor, actor.items.get(id), slot);
}

function bindPanel(root, actor) {
  const run = async action => { try { await action(); } catch (e) { ui.notifications.error(e.message); } };
  root.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    event.preventDefault(); event.stopPropagation();
    if (button.dataset.equipmentOpen) actor.items.get(button.dataset.equipmentOpen)?.sheet.render(true);
    if (button.dataset.equipmentChoose) void run(() => chooseItem(actor, button.dataset.equipmentChoose));
    if (button.dataset.equipmentRemove) void run(() => equipPanelItem(actor, actor.items.get(button.dataset.equipmentRemove), null, { remove: true }));
    if (button.dataset.equipmentExpand !== undefined) openEquipment(actor);
  });
  root.addEventListener("dragover", event => { if (actor.isOwner && event.target.closest("[data-equipment-slot]")) { event.preventDefault(); event.stopPropagation(); } });
  root.addEventListener("drop", event => {
    const target = event.target.closest("[data-equipment-slot]");
    if (!target) return;
    event.preventDefault(); event.stopPropagation();
    void run(async () => {
      const data = JSON.parse(event.dataTransfer.getData("text/plain"));
      const item = data.uuid ? await fromUuid(data.uuid) : actor.items.get(data.id);
      await equipPanelItem(actor, item, target.dataset.equipmentSlot);
    });
  });
}

const equipmentWindows = new Set();
const characterSheets = new Set();

export async function refreshEquipmentPreview(enabled) {
  if (!enabled) {
    document.querySelectorAll(".cmt-equipment-panel").forEach(panel => panel.remove());
    await Promise.allSettled([...equipmentWindows].map(window => window.close()));
  }
  for (const sheet of characterSheets) {
    if (sheet.rendered) sheet.render(false);
    else characterSheets.delete(sheet);
  }
}

let EquipmentWindow;
function openEquipment(actor) {
  if (!game.settings.get(MODULE_ID, "equipmentPanel")) return;
  if (!EquipmentWindow) {
    EquipmentWindow = class extends foundry.applications.api.ApplicationV2 {
      static DEFAULT_OPTIONS = { classes: ["cmt-equipment-window"], position: { width: 600, height: 740 }, window: { resizable: true } };
      constructor(actor) { super({ window: { title: `${actor.name} — Equipment` } }); this.actor = actor; }
      async _renderHTML() { const root = document.createElement("div"); root.className = "cmt-equipment-panel"; root.innerHTML = equipmentMarkup(this.actor); bindPanel(root, this.actor); return root; }
      _replaceHTML(result, content) { content.replaceChildren(result); }
      _onRender(context, options) { super._onRender(context, options); this.actor.apps[this.id] = this; equipmentWindows.add(this); }
      async close(options) { equipmentWindows.delete(this); delete this.actor.apps[this.id]; return super.close(options); }
    };
  }
  new EquipmentWindow(actor).render(true);
}

export function injectEquipmentPanel(application, html) {
  const actor = application.actor ?? application.document;
  const element = html ?? application.element;
  const root = element?.querySelector ? element : element?.[0];
  if (!root) return;
  if (actor?.type !== "character") { root.querySelector(".cmt-equipment-panel")?.remove(); return; }
  characterSheets.add(application);
  if (!game.settings.get(MODULE_ID, "equipmentPanel")) {
    root.querySelector(".cmt-equipment-panel")?.remove();
    return;
  }
  const anchor = root.querySelector('[data-tab="inventory"] [data-inventory]');
  if (!anchor || root.querySelector(".cmt-equipment-panel")) return;
  const panel = document.createElement("details"); panel.className = "cmt-equipment-panel cmt-equipment-inventory"; panel.open = true;
  panel.innerHTML = `<summary>Equipment <button type="button" data-equipment-expand title="Open equipment window" aria-label="Open equipment window"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button></summary>${equipmentMarkup(actor)}`;
  bindPanel(panel, actor);
  anchor.append(panel);
}

export function registerEquipmentPanel() {
  game.settings.register(MODULE_ID, "equipmentPanel", { name: "Experimental: Visual equipment panel", hint: "GM switch for the entire world. Enable to test equipment slots below inventory containers. Disable to hide the panel and close its windows for everyone; equipped items stay as they are.", scope: "world", restricted: true, config: true, type: Boolean, default: false, onChange: refreshEquipmentPreview });
  for (const hook of ["renderActorSheet", "renderActorSheetV2", "renderCharacterSheetPF2e"]) Hooks.on(hook, injectEquipmentPanel);
  Hooks.on("closeApplication", application => characterSheets.delete(application));
  // A normal inventory change takes priority over the preview's carried/display markers.
  Hooks.on("preUpdateItem", (item, changes) => {
    if (!item.flags?.[MODULE_ID]?.equipmentPanel) return;
    if (Object.keys(changes).some(key => key.startsWith("system.equipped")) || changes.system?.equipped) {
      changes[`flags.${MODULE_ID}.equipmentPanel.carried`] = false;
      changes[`flags.${MODULE_ID}.equipmentPanel.slot`] ??= equipmentSlot({ ...item, type: item.type, system: { ...item.system, usage: changes["system.usage.value"] ? { value: changes["system.usage.value"] } : item.system.usage } });
    }
  });
}
