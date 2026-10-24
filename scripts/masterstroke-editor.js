import { MODULE_ID } from "./constants.js";
import { normalizeMasterstrokes } from "./crafting-edges.js";
import { masterstrokeCategory, masterstrokeTable, eligibleMasterstroke } from "./masterstroke-rules.js";

export async function updateItemMasterstroke(item, result, user = globalThis.game?.user) {
  if (!user?.isGM) throw new Error("Only a GM or assistant GM can edit Masterstrokes.");
  if (item.canUserModify?.(user, "update") === false) throw new Error("This item cannot be edited.");
  if (!["weapon", "armor", "shield", "equipment"].includes(item.type)) throw new Error("This item cannot have a Masterstroke.");
  if (item.flags?.[MODULE_ID]?.upgradeProject) throw new Error("Finish or cancel the active upgrade before editing its Masterstroke.");
  if (!Number.isInteger(result) || result < 0 || (result && !eligibleMasterstroke(item, result))) throw new Error("Choose a compatible Masterstroke.");
  const crafting = item.flags?.[MODULE_ID]?.crafting ?? {};
  const previous = crafting.masterstrokes?.[0];
  const category = masterstrokeCategory(item);
  if (previous?.edition === "chad" && previous.category === category && previous.result === result) return;
  const masterstrokes = result ? normalizeMasterstrokes([{ result, edition: "chad", category,
    id: `${item.id ?? "item"}-gm-${Date.now()}`, maker: previous?.maker ?? crafting.maker ?? "", projectId: previous?.projectId ?? "" }]) : [];
  await item.update({
    [`flags.${MODULE_ID}.crafting.masterstrokes`]: masterstrokes,
    [`flags.${MODULE_ID}.crafting.masterstrokeArmed`]: null,
    [`flags.${MODULE_ID}.crafting.-=masterstrokeUses`]: null,
    [`flags.${MODULE_ID}.crafting.-=masterstrokeClaims`]: null,
  }, { wrathmakerUpgrade: true });
}

export function insertMasterstrokeEditor(item, root) {
  if (!globalThis.game?.user?.isGM || !["weapon", "armor", "shield", "equipment"].includes(item.type)
    || root.querySelector("[data-cmt-masterstroke-editor]")) return;
  const details = root.querySelector('.tab[data-tab="details"], .tab.details');
  if (!details) return;
  const panel = document.createElement("fieldset");
  panel.dataset.cmtMasterstrokeEditor = "true";
  const heading = document.createElement("legend"); heading.textContent = "Masterstroke — GM";
  const row = document.createElement("div"); row.className = "form-group";
  const label = document.createElement("label"); label.textContent = "Masterstroke";
  const select = document.createElement("select"); select.setAttribute("aria-label", "Masterstroke — GM");
  select.add(new Option("None", "0"));
  const current = item.flags?.[MODULE_ID]?.crafting?.masterstrokes?.[0];
  masterstrokeTable(masterstrokeCategory(item)).forEach((entry, index) => {
    if (eligibleMasterstroke(item, index + 1)) select.add(new Option(entry.name, String(index + 1)));
  });
  select.value = current?.edition === "chad" ? String(current.result) : "0";
  const note = document.createElement("p");
  note.textContent = "One Masterstroke per item. Changing it resets its limited uses. Crafting Edges affect project work and are resolved in the Workbench.";
  const description = document.createElement("p");
  const updateDescription = () => { description.textContent = masterstrokeTable(masterstrokeCategory(item))[Number(select.value) - 1]?.description ?? "No Masterstroke."; };
  updateDescription();
  select.addEventListener("change", updateDescription);
  const save = document.createElement("button"); save.type = "button"; save.textContent = "Update Masterstroke";
  save.addEventListener("click", async event => {
    event.preventDefault(); save.disabled = true;
    try { await updateItemMasterstroke(item, Number(select.value)); ui.notifications.info("Masterstroke updated."); }
    catch (error) { ui.notifications.error(error.message); }
    finally { save.disabled = false; }
  });
  row.append(label, select); panel.append(heading, row, description, note, save);
  const striking = details.querySelector('[name="system.runes.striking"], [data-property="system.runes.striking"]')?.closest("fieldset");
  if (striking) striking.after(panel); else details.append(panel);
}
