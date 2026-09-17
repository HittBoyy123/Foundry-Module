import { CRAFTING_ROLL_TABLES } from "../content/crafting-roll-tables.js";
import { MODULE_ID } from "./constants.js";

/** Create missing world copies only. Renamed or edited copies remain untouched. */
export async function ensureCraftingRollTables({ game: world = globalThis.game, Table = globalThis.RollTable } = {}) {
  if (!world?.user?.isGM || world.system?.id !== "pf2e") return [];
  const primary = Array.from(world.users ?? []).filter(user => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0];
  if (primary?.id !== world.user.id) return [];
  const existing = new Set(Array.from(world.tables ?? []).map(table => table.flags?.[MODULE_ID]?.craftingTable));
  const missing = CRAFTING_ROLL_TABLES.filter(source => !existing.has(source._id)).map(source => {
    const copy = structuredClone(source);
    delete copy._id;
    return copy;
  });
  return missing.length ? Table.createDocuments(missing) : [];
}

export function registerCraftingTableControls() {
  const render = (application, html) => {
    const table = application.document ?? application.object;
    if (table?.documentName !== "RollTable" || table.flags?.[MODULE_ID]?.craftingTable !== CRAFTING_ROLL_TABLES[0]._id) return;
    const root = html?.querySelector ? html : html?.[0];
    if (!root || root.querySelector("[data-cmt-edge-table-controls]")) return;
    const host = root.querySelector(".window-content") ?? root;
    const controls = document.createElement("div");
    controls.dataset.cmtEdgeTableControls = "true";
    controls.className = "cmt-edge-table-controls";
    for (const [formula, label] of [["1d3", "Crafting Edge (d3)"], ["1d4", "Final Block (d4)"]]) {
      const button = document.createElement("button");
      button.type = "button"; button.textContent = label;
      button.addEventListener("click", async event => {
        event.preventDefault(); event.stopPropagation();
        const buttons = controls.querySelectorAll("button"); buttons.forEach(button => { button.disabled = true; });
        try { await table.draw({ roll: new Roll(formula), displayChat: true }); }
        catch (error) { ui.notifications.error(error.message); }
        finally { buttons.forEach(button => { button.disabled = false; }); }
      });
      controls.append(button);
    }
    host.prepend(controls);
  };
  Hooks.on("renderApplicationV2", render);
  Hooks.on("renderRollTableConfig", render);
}
