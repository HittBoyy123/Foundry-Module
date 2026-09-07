import { MODULE_ID } from "./constants.js";
import { getArtisanMarkDefinition } from "../content/artisan-marks.js";
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function markActionSources(item) {
  return (item.flags?.[MODULE_ID]?.crafting?.artisanMarks ?? []).filter(mark => mark.status === "completed").flatMap(mark => {
    const definition = getArtisanMarkDefinition(mark.definitionId);
    if (!definition?.activation) return [];
    return [{
      name: `${definition.name} (${item.name})`, type: "action", img: item.img,
      flags: { [MODULE_ID]: { markAction: { itemId: item.id, definitionId: definition.id } } },
      system: {
        actionType: { value: definition.activation.type }, actions: { value: definition.activation.value },
        category: "interaction", traits: { value: [] }, rules: [],
        description: { value: `<p><strong>${escape(definition.profession)} — ${escape(definition.specialisation || "Universal")}</strong></p><p>${escape(definition.effectSummary)}</p><p>${escape(definition.activation.note || "")}</p><p>Requires ${escape(item.name)} to be available and wielded or worn as appropriate. Resolve targets, usage limits and effects from the rules text; this button does not spend uses or apply damage automatically.</p>` },
      },
    }];
  });
}

const syncing = new Set();
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
