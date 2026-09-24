import { MODULE_ID } from "./constants.js";
import { getCraftingItemType } from "./model.js";

export const FOCUS_SLOTS = Object.freeze({ held: ["held-in-one-hand", "Held"], rings: ["wornring", "Ring"], neck: ["wornnecklace", "Necklace"], head: ["wornheadwear", "Headwear"], hands: ["worngloves", "Gloves"], waist: ["wornbelt", "Belt"], feet: ["wornshoes", "Footwear"], back: ["worncloak", "Cloak"], accessories: ["worn", "Other worn focus"] });

export async function setFocusSlot(item, slot) {
  if (!item.isOwner || getCraftingItemType(item) !== "spellFocus" || !FOCUS_SLOTS[slot]) throw new Error("Choose a supported slot on a Spell Focus you can edit.");
  const equipped = item.system?.equipped;
  const active = item.isEquipped === true && !item.system?.containerId && !item.flags?.[MODULE_ID]?.equipmentPanel?.carried;
  const changes = { "system.usage.value": FOCUS_SLOTS[slot][0], [`flags.${MODULE_ID}.equipmentPanel.slot`]: slot };
  if (active && equipped) {
    changes["system.equipped.carryType"] = slot === "held" ? "held" : "worn";
    changes["system.equipped.handsHeld"] = slot === "held" ? 1 : 0;
    changes["system.equipped.inSlot"] = slot !== "held";
  }
  await item.update(changes);
}

export function insertFocusSlotControl(item, root) {
  if (getCraftingItemType(item) !== "spellFocus" || root.querySelector(".cmt-focus-slot")) return;
  const tier = root.querySelector('[data-cmt-field="tier"]');
  const anchor = tier?.closest(".cmt-inline-field");
  if (!anchor) return;
  const row = document.createElement(anchor.tagName.toLowerCase());
  row.className = `${anchor.className} cmt-focus-slot`;
  const select = document.createElement("select"); select.disabled = !item.isOwner;
  select.id = `${tier.id}-focus-slot`;
  select.className = tier.className;
  select.style.cssText = tier.style.cssText;
  const label = document.createElement("label");
  label.textContent = "Spell focus slot"; label.htmlFor = select.id;
  row.append(label);
  const current = item.system?.usage?.value;
  if (!Object.values(FOCUS_SLOTS).some(([usage]) => usage === current)) {
    const option = document.createElement("option"); option.textContent = "Current item usage"; option.value = ""; select.append(option);
  }
  for (const [key, [usage, label]] of Object.entries(FOCUS_SLOTS)) {
    const option = document.createElement("option"); option.value = key; option.textContent = label; option.selected = usage === current; select.append(option);
  }
  select.addEventListener("change", async event => {
    event.stopPropagation(); select.disabled = true;
    try { await setFocusSlot(item, select.value); }
    catch (error) { ui.notifications.error(error.message); }
    finally { select.disabled = !item.isOwner; }
  });
  row.append(select); anchor.after(row);
  if (game.user.isGM) {
    const frame = document.createElement("label"); frame.className = "cmt-focus-frame";
    const checkbox = document.createElement("input"); checkbox.type = "checkbox";
    checkbox.checked = item.flags?.[MODULE_ID]?.crafting?.omnipotisiumFrame === true;
    frame.append(checkbox, document.createTextNode("GM: Omnipotassium frame"));
    checkbox.addEventListener("change", async event => {
      event.stopPropagation(); checkbox.disabled = true;
      try { if (game.user.isGM) await item.update({ [`flags.${MODULE_ID}.crafting.omnipotisiumFrame`]: checkbox.checked }); }
      catch (error) { ui.notifications.error(error.message); }
      finally { checkbox.disabled = false; }
    });
    row.after(frame);
  }
}
