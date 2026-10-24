import { CRAFTING_EDGES } from "../scripts/crafting-edges.js";
import { MODULE_ID } from "../scripts/constants.js";
import { WEAPON_MASTERSTROKES, EQUIPMENT_MASTERSTROKES } from "../scripts/masterstroke-rules.js";

function table(id, name, formula, entries, description) {
  return {
    _id: id, name, img: "icons/svg/d20-grey.svg", description,
    formula, replacement: true, displayRoll: true, ownership: { default: 2 },
    flags: { [MODULE_ID]: { craftingTable: id } },
    results: entries.map((entry, index) => ({
      _id: `${id.slice(0, 13)}${String(index + 1).padStart(3, "0")}`,
      type: "text", name: entry.name,
      description: `<p><strong>${entry.name}</strong></p><p>${entry.description}</p>`,
      img: "icons/svg/anvil.svg", weight: 1, range: [index + 1, index + 1], drawn: false,
    })),
  };
}
export const CRAFTING_ROLL_TABLES = [
  table("wmCraftEdge00001", "Crafting Edge", "1d3", CRAFTING_EDGES,
    '<p>On any critical success, roll d3. Use Final Block (d4) when accelerated work could finish the contribution. Result 4 is final-block only: if 100% work is insufficient, use Accelerated Work instead; otherwise roll the Masterstroke table.</p><p>Manual table rolls show results in chat. Spend 1 Hero Point on the lead crafter’s sheet to reroll and choose either result. Record the final result using Resolve Crafting Tables in the Workbench.</p>'),
  table("wmMasterstroke01", "Masterstroke — Weapons", "1d8", WEAPON_MASTERSTROKES,
    '<p>Roll after Masterstroke Opportunity completes the final Work Block. An item can have one Masterstroke, retained through upgrades. Spend 1 Hero Point on the lead crafter’s sheet to reroll and choose either result. The lead crafter’s owner or GM selects the final result in Resolve Crafting Tables.</p>'),
  table("wmMasterstroke02", "Masterstroke — Equipment", "1d8", EQUIPMENT_MASTERSTROKES,
    '<p>For armour, shields, spell focuses and other equipment. Reroll incompatible results. An item can have one Masterstroke, retained through upgrades. Reroll incompatible results, then select the final result in Resolve Crafting Tables. A Hero Point permits a reroll with either result kept; record the point spent on the lead crafter’s sheet.</p>'),
];
