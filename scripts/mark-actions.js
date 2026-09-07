import { MODULE_ID } from "./constants.js";
import { getArtisanMarkDefinition } from "../content/artisan-marks.js";
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function markActionSources(item) {
  if (item.system?.equipped?.carryType === "dropped" || Number(item.system?.quantity ?? 1) <= 0) return [];
  return (item.flags?.[MODULE_ID]?.crafting?.artisanMarks ?? []).filter(mark => mark.status === "completed").flatMap(mark => {
    const definition = getArtisanMarkDefinition(mark.definitionId);
    if (!definition?.activation || !definition.categories.some(category => ["item", "consumable"].includes(category))) return [];
    return [{
      name: `${definition.name} (${item.name})`, type: "action", img: item.img,
      flags: { [MODULE_ID]: { markAction: { itemId: item.id, definitionId: definition.id, managed: true } } },
      system: {
        actionType: { value: definition.activation.type }, actions: { value: definition.activation.value },
        category: "interaction", traits: { value: [] }, rules: [],
        description: { value: `<p><strong>${escape(definition.profession)} — ${escape(definition.specialisation || "Universal")}</strong></p><p>${escape(definition.effectSummary)}</p><p>${escape(definition.activation.note || "")}</p><p>Requires ${escape(item.name)} to be available and wielded or worn as appropriate. Resolve targets, usage limits and effects from the rules text; this button does not spend uses or apply damage automatically.</p>` },
      },
    }];
  });
}

const syncing = new Set();
const actorQueues = new Map();

/** Reconcile only module-linked Actions; never remove unrelated character actions. */
export function syncActorMarkActions(actor) {
  const previous = actorQueues.get(actor.uuid) ?? Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    if (!actor.isOwner || !["character", "npc"].includes(actor.type)) return;
    const items = Array.from(actor.items.values ? actor.items.values() : actor.items);
    const desired = new Map(items.filter(item => item.type !== "action").flatMap(item => markActionSources(item))
      .map(source => [source.flags[MODULE_ID].markAction.itemId + ":" + source.flags[MODULE_ID].markAction.definitionId, source]));
    const removals = [], updates = [];
    for (const item of items) {
      const link = item.flags?.[MODULE_ID]?.markAction;
      if (item.type !== "action" || !link?.itemId || !link.definitionId) continue;
      const key = link.itemId + ":" + link.definitionId;
      const source = desired.get(key);
      if (!source) { removals.push(item.id); continue; }
      desired.delete(key);
      const changes = { _id: item.id };
      if (item.name !== source.name) changes.name = source.name;
      if (item.img !== source.img) changes.img = source.img;
      for (const field of ["actionType", "actions", "description"]) {
        if (JSON.stringify(item.system?.[field]) !== JSON.stringify(source.system[field])) changes[`system.${field}`] = source.system[field];
      }
      if (Object.keys(changes).length > 1) updates.push(changes);
    }
    if (removals.length) await actor.deleteEmbeddedDocuments("Item", removals);
    if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
    if (desired.size) await actor.createEmbeddedDocuments("Item", [...desired.values()]);
  });
  actorQueues.set(actor.uuid, pending);
  pending.finally(() => { if (actorQueues.get(actor.uuid) === pending) actorQueues.delete(actor.uuid); }).catch(() => {});
  return pending;
}

export function registerMarkActionHooks() {
  const schedule = actor => {
    if (!actor || !["character", "npc"].includes(actor.type)) return;
    const users = Array.from(game.users).filter(user => user.active);
    const updater = users.filter(user => user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0]
      ?? users.filter(user => actor.testUserPermission(user, "OWNER")).sort((a, b) => a.id.localeCompare(b.id))[0];
    if (updater?.id !== game.user.id) return;
    void syncActorMarkActions(actor).catch(error => console.error(`${MODULE_ID} | Mark action synchronization failed`, error));
  };
  for (const hook of ["createItem", "updateItem", "deleteItem"]) Hooks.on(hook, item => {
    if (item.type !== "action") schedule(item.actor);
  });
  Hooks.on("createActor", schedule);
  Hooks.once("ready", () => {
    for (const actor of game.actors) schedule(actor);
    for (const token of canvas?.tokens?.placeables ?? []) schedule(token.actor);
  });
  Hooks.on("canvasReady", () => { for (const token of canvas?.tokens?.placeables ?? []) schedule(token.actor); });
}

export async function addMarkActions(item) {
  const actor = item.actor;
  if (!actor?.isOwner || !["character", "npc"].includes(actor.type)) throw new Error("An owned character or NPC must carry this item.");
  if (syncing.has(actor.uuid)) return;
  syncing.add(actor.uuid);
  try {
    const sources = markActionSources(item).filter(source => !actor.items.some(existing => {
      const link = existing.flags?.[MODULE_ID]?.markAction;
      return link?.itemId === item.id && link.definitionId === source.flags[MODULE_ID].markAction.definitionId;
    }));
    if (sources.length) await actor.createEmbeddedDocuments("Item", sources);
    return sources.length;
  } finally { syncing.delete(actor.uuid); }
}

export function insertMarkActionButton(item, root) {
  if (!item.actor?.isOwner || !markActionSources(item).length || root.querySelector("[data-cmt-add-mark-actions]")) return;
  const host = root.querySelector('[data-cmt-make-marks="true"]');
  if (!host) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.cmtAddMarkActions = "true";
  button.textContent = "Add Mark Actions to Wielder";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try { const count = await addMarkActions(item); ui.notifications.info(`${count ?? 0} Mark actions added. Existing entries were preserved.`); }
    catch (error) { ui.notifications.error(error.message); }
    finally { button.disabled = false; }
  });
  host.append(button);
}
