import { MODULE_ID } from "./constants.js";
import { calculateCraftingDC } from "./crafting-dc.js";
import { lighterBulk, normalizeMasterstrokes } from "./crafting-edges.js";

const preparedBulk = new WeakSet();
const benefitLocks = new Set();
const strokes = item => normalizeMasterstrokes(item?.flags?.[MODULE_ID]?.crafting?.masterstrokes);

export function applyMasterstrokeBulk(item) {
  if (!strokes(item).some(entry => entry.result === 6) || !item.system?.bulk || preparedBulk.has(item.system.bulk)) return;
  const carry = item.system.equipped?.carryType;
  if (!["worn", "stowed"].includes(carry) || (item.type === "armor" && carry === "worn")) return;
  // Prepared values only: equipped weapon use and source Bulk are never changed.
  const bulk = item.system.bulk;
  if (typeof bulk.value !== "number") return;
  bulk.value = lighterBulk(bulk.value);
  if (typeof bulk.heldOrStowed === "number") bulk.heldOrStowed = lighterBulk(bulk.heldOrStowed);
  preparedBulk.add(bulk);
}

export async function expendMasterstroke(item, id) {
  if (!item.isOwner) throw new Error("You must own this item to expend its benefit.");
  const entries = strokes(item);
  const benefit = entries.find(entry => entry.id === id);
  if (!benefit?.singleUse || benefit.used) throw new Error("This benefit is no longer available.");
  for (const entry of entries) if (entry.result === benefit.result) entry.used = true;
  if (!await item.update({ [`flags.${MODULE_ID}.crafting.masterstrokes`]: entries })) throw new Error("The benefit could not be expended.");
}

export function resonantState(item) {
  return {
    hp: Number(item.system?.hp?.value),
    dormant: (item.flags?.[MODULE_ID]?.crafting?.artisanMarks ?? []).filter(mark => mark.status === "dormant").map(mark => mark.id),
    charges: [item.system?.uses?.value, item.system?.charges?.value].map(value => typeof value === "number" ? value : null),
  };
}
export function resonantChanges(before, after) {
  const reasons = [];
  if (Number.isFinite(before.hp) && Number.isFinite(after.hp) && after.hp < before.hp) reasons.push("it has been damaged");
  if (after.dormant.some(id => !before.dormant.includes(id))) reasons.push("one of its Marks has become Dormant");
  if (after.charges.some((value, index) => value === 0 && before.charges[index] > 0)) reasons.push("its tracked charges are exhausted");
  return reasons;
}

function esc(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }

async function chooseArtisan(item) {
  const actors = Array.from(game.actors ?? []).filter(actor => actor.isOwner && ["character", "npc"].includes(actor.type));
  if (item.actor?.isOwner && ["character", "npc"].includes(item.actor.type)) return item.actor;
  if (!actors.length) throw new Error("Choose an owned character to make this check.");
  const id = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Choose Artisan" },
    content: `<select name="artisan">${actors.map(actor => `<option value="${esc(actor.id)}">${esc(actor.name)}</option>`).join("")}</select>`,
    ok: { label: "Choose", callback: (_event, button) => button.form.elements.artisan.value }, rejectClose: false,
  });
  return actors.find(actor => actor.id === id);
}

async function useBenefit(item, entry, action) {
  if (benefitLocks.has(item.uuid)) throw new Error("A benefit for this item is already being resolved.");
  if (!item.isOwner) throw new Error("You must own this item.");
  if (item.flags?.[MODULE_ID]?.upgradeProject) throw new Error("Complete or cancel the upgrade before using this item.");
  benefitLocks.add(item.uuid);
  try {
    if (!strokes(item).some(stroke => stroke.id === entry.id && !stroke.used)) throw new Error("This benefit is no longer available.");
    if (action === "repair") {
      const actor = await chooseArtisan(item);
      if (!actor) return;
      const dc = await foundry.applications.api.DialogV2.prompt({
        window: { title: "Resilient Finish — Repair" },
        content: `<p>Make the item’s next Repair check with a +2 circumstance bonus. Resolve repairs or damage from the result as usual.</p><label>Repair DC <input name="dc" type="number" min="0" value="${calculateCraftingDC(item.flags?.[MODULE_ID]?.tier ?? 1)?.dc ?? 15}"></label>`,
        ok: { label: "Roll Repair", callback: (_event, button) => Number(button.form.elements.dc.value) }, rejectClose: false,
      });
      if (dc === null || dc === undefined) return;
      const roll = await (actor.getStatistic?.("crafting") ?? actor.skills.crafting).roll({ dc: { value: dc }, title: `${item.name} — Repair`,
        extraRollOptions: ["action:repair"],
        modifiers: [new game.pf2e.Modifier({ label: "Resilient Finish", modifier: 2, type: "circumstance" })] });
      if (roll) await expendMasterstroke(item, entry.id);
    } else if (action === "presence") {
      const actor = await chooseArtisan(item);
      if (!actor) return;
      const choice = await foundry.applications.api.DialogV2.prompt({
        window: { title: "Storied Presence" },
        content: '<p>Use only when the documented maker or provenance is directly relevant.</p><select name="action"><option value="make-an-impression">Make an Impression</option><option value="request">Request</option></select>',
        ok: { label: "Roll Diplomacy", callback: (_event, button) => button.form.elements.action.value }, rejectClose: false,
      });
      if (choice) await (actor.getStatistic?.("diplomacy") ?? actor.skills.diplomacy).roll({ title: `${item.name} — Storied Presence`, extraRollOptions: [`action:${choice}`],
        modifiers: [new game.pf2e.Modifier({ label: "Storied Presence", modifier: 1, type: "circumstance" })] });
    } else if (entry.result === 4) {
      const days = await foundry.applications.api.DialogV2.prompt({
        window: { title: "Efficient Maintenance" },
        content: '<p>Enter the artisan-days required for this repair or maintenance contribution before this benefit.</p><input name="days" type="number" min="1" step="1" value="2">',
        ok: { label: "Apply Benefit", callback: (_event, button) => Number(button.form.elements.days.value) }, rejectClose: false,
      });
      if (days === null || days === undefined) return;
      if (!Number.isInteger(days) || days < 1) throw new Error("Enter a positive whole number of artisan-days.");
      await expendMasterstroke(item, entry.id);
      await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: item.actor }),
        content: `<section class="cmt-crafting-chat"><h3>Efficient Maintenance</h3><p>${esc(item.name)}: ${days} → ${Math.max(1, days - 1)} artisan-day(s) for this contribution. The benefit is now expended.</p></section>` });
    } else {
      const confirmed = await foundry.applications.api.DialogV2.confirm({ window: { title: entry.name },
        content: `<p>${esc(entry.description)}</p><p>Mark this benefit as used for the contribution or check being resolved?</p>` });
      if (confirmed) await expendMasterstroke(item, entry.id);
    }
  } finally { benefitLocks.delete(item.uuid); }
}

export function insertMasterstrokeControls(item, root) {
  const entries = strokes(item);
  if (!entries.length || item.isIdentified === false || root.querySelector("[data-cmt-masterstrokes]")) return;
  const host = root.querySelector('[data-cmt-make-marks="true"]');
  if (!host) return;
  const panel = document.createElement("section");
  panel.dataset.cmtMasterstrokes = "true";
  panel.className = "cmt-masterstrokes";
  const heading = document.createElement("h3"); heading.textContent = "Masterstrokes"; panel.append(heading);
  for (const entry of entries) {
    const details = document.createElement("details");
    const summary = document.createElement("summary"); summary.textContent = `${entry.name}${entry.used ? " · Used" : ""}`;
    const description = document.createElement("p"); description.textContent = entry.description;
    details.append(summary, description);
    const maker = document.createElement("p"); maker.textContent = `Maker: ${entry.maker || "Unknown"}`; details.append(maker);
    if (entry.result === 5) {
      const dc = document.createElement("p"); dc.textContent = `Current Crafting DC: ${calculateCraftingDC(item.flags?.[MODULE_ID]?.tier ?? 1)?.dc ?? "—"}`; details.append(dc);
    }
    if (item.isOwner && !entry.used) {
      const actions = entry.result === 2 ? [["repair", "Roll Repair (+2)"], ["use", "Mark Used"]]
        : entry.result === 4 ? [["use", "Use Maintenance Benefit"]] : entry.result === 8 ? [["presence", "Roll Diplomacy (+1)"]] : [];
      for (const [action, label] of actions) {
        const button = document.createElement("button"); button.type = "button"; button.textContent = label;
        button.addEventListener("click", async event => {
          event.preventDefault(); button.disabled = true;
          try { await useBenefit(item, entry, action); }
          catch (error) { ui.notifications.error(error.message); }
          finally { button.disabled = false; }
        });
        details.append(button);
      }
    }
    panel.append(details);
  }
  host.append(panel);
}

export function registerMasterstrokeWarnings() {
  Hooks.on("preUpdateItem", (item, _changes, options) => {
    if (strokes(item).some(entry => entry.result === 7)) options.cmtResonantBefore = resonantState(item);
  });
  Hooks.on("updateItem", (item, _changes, options, userId) => {
    if (userId !== game.user.id || !options.cmtResonantBefore || !item.actor || item.actor.type === "party" || item.system?.equipped?.carryType === "dropped") return;
    const reasons = resonantChanges(options.cmtResonantBefore, resonantState(item));
    if (!reasons.length) return;
    const whisper = Array.from(game.users).filter(user => user.isGM || item.actor.testUserPermission(user, "OWNER")).map(user => user.id);
    if (!whisper.length) return;
    void ChatMessage.create({ whisper, speaker: ChatMessage.getSpeaker({ actor: item.actor }),
      content: `<section class="cmt-crafting-chat"><h3>Resonant Tell</h3><p>${esc(item.name)} gives its bearer a harmless sensory warning: ${esc(reasons.join("; "))}.</p></section>` });
  });
}
