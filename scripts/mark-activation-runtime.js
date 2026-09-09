import { MODULE_ID } from "./constants.js";
import { getArtisanMarkDefinition } from "../content/artisan-marks.js";
import { createTimedMarkEffect, activationFrequency, activationPeriodKey } from "./mark-activation-effects.js";

const locks = new Set();
/** Apply only an explicit supported self-effect; no target or damage inference. */
export async function activateTimedMark(item, definitionId, { user, worldTime, combat } = {}) {
  const actor = item?.actor;
  if (!actor?.isOwner || !user || !["character", "npc"].includes(actor.type)) throw new Error("You must own the item's wielder.");
  if (!item.isEquipped || item.system?.equipped?.carryType === "dropped" || Number(item.system?.quantity ?? 1) < 1)
    throw new Error("Wield or wear the item before activating this Mark.");
  if (locks.has(actor.uuid)) throw new Error("Another Mark activation is still processing.");
  const mark = item.flags?.[MODULE_ID]?.crafting?.artisanMarks?.find(m => m.definitionId === definitionId && m.status === "completed");
  const definition = getArtisanMarkDefinition(definitionId);
  if (!mark || !definition) throw new Error("This item no longer has that completed Mark.");
  const source = createTimedMarkEffect(definition, item, mark);
  if (!source) throw new Error("This activation does not have a supported timed self-effect.");
  const frequency = activationFrequency(definition.effectSummary);
  const period = activationPeriodKey(frequency, { worldTime, combat });
  const path = `flags.${MODULE_ID}.markUses.${definitionId}`;
  const previous = item.flags?.[MODULE_ID]?.markUses?.[definitionId] ?? null;
  const count = previous?.period === period ? Number(previous.count) || 0 : 0;
  if (frequency && count >= frequency.max) throw new Error("This Mark has no uses remaining for this period.");
  const effects = Array.from(actor.items?.contents ?? actor.items ?? []);
  if (effects.some(effect => effect.flags?.[MODULE_ID]?.timedMark?.itemId === item.id
    && effect.flags[MODULE_ID].timedMark.definitionId === definitionId && !effect.system?.expired))
    throw new Error("This Mark's effect is already active. Remove the old effect before reactivating.");
  locks.add(actor.uuid);
  try {
    await item.update({ [path]: { period, count: count + 1 } });
    try { return await actor.createEmbeddedDocuments("Item", [source]); }
    catch (error) {
      await item.update({ [path]: previous });
      throw error;
    }
  } finally { locks.delete(actor.uuid); }
}

export function registerTimedMarkControls() {
  const bind = (_app, html) => {
    const root = html?.querySelectorAll ? html : html?.[0];
    for (const button of root?.querySelectorAll("[data-cmt-timed-mark]") ?? []) {
      if (button.dataset.cmtBound) continue;
      button.dataset.cmtBound = "true";
      button.addEventListener("click", async event => {
        event.preventDefault(); event.stopPropagation(); button.disabled = true;
        try {
          const item = await fromUuid(button.dataset.cmtSourceItem);
          const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: "Activate Artisan Mark" },
            content: "<p>Confirm the activation's requirements and action cost are met. This spends one Mark use and applies its timed numerical self-effect. Manual riders remain in its description.</p>",
          });
          if (confirmed) await activateTimedMark(item, button.dataset.cmtTimedMark,
            { user: game.user, worldTime: game.time.worldTime, combat: game.combat });
        } catch (error) { ui.notifications.error(error.message); }
        finally { button.disabled = false; }
      });
    }
  };
  for (const hook of ["renderChatMessage", "renderChatMessageHTML", "renderItemSheet", "renderItemSheetV2"])
    Hooks.on(hook, bind);
  const clear = async item => {
    const actor = item.actor;
    if (!actor?.isOwner || !game.user.isGM) return;
    const ids = Array.from(actor.items?.contents ?? actor.items ?? [])
      .filter(effect => effect.flags?.[MODULE_ID]?.timedMark?.itemId === item.id).map(effect => effect.id);
    if (ids.length) await actor.deleteEmbeddedDocuments("Item", ids);
  };
  Hooks.on("deleteItem", item => { if (item.type !== "effect") void clear(item).catch(console.error); });
  Hooks.on("updateItem", (item, changes) => {
    if (["weapon", "armor", "shield", "equipment"].includes(item.type)
      && /equipped|artisanMarks|"tier"/.test(JSON.stringify(changes))) void clear(item).catch(console.error);
  });
  for (const hook of ["renderItemSheet", "renderItemSheetV2"]) Hooks.on(hook, (app, html) => {
    const item = app.item ?? app.document;
    const root = html?.querySelector ? html : html?.[0];
    if (!game.user.isGM || !item?.flags?.[MODULE_ID]?.markUses || !root || root.querySelector("[data-cmt-reset-mark-uses]")) return;
    const host = root.querySelector(".window-content") ?? root;
    const button = document.createElement("button"); button.type = "button";
    button.dataset.cmtResetMarkUses = "true"; button.textContent = "GM: Reset Daily Mark Uses";
    button.addEventListener("click", async event => {
      event.preventDefault();
      if (!await foundry.applications.api.DialogV2.confirm({ window: { title: "Daily Preparations" }, content: "<p>Reset this item's daily Mark uses after completed daily preparations?</p>" })) return;
      const updates = {};
      for (const [id, usage] of Object.entries(item.flags?.[MODULE_ID]?.markUses ?? {}))
        if (usage?.period === "daily-preparations") updates[`flags.${MODULE_ID}.markUses.${id}.count`] = 0;
      if (Object.keys(updates).length) await item.update(updates);
    });
    host.append(button);
  });
}
