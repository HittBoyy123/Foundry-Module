import { CRAFTING_EDGES, MASTERSTROKES } from "../scripts/crafting-edges.js";
import { MODULE_ID } from "../scripts/constants.js";

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
    '<p>On any critical success, roll d3. Use Final Block (d4) when accelerated work could finish the contribution. Result 4 is final-block only: if 100% work is insufficient, use Accelerated Work instead; otherwise roll the Masterstroke table.</p><p>Manual table rolls show results in chat. The Workbench already resolves these rolls automatically; do not apply a manual result a second time.</p>'),
  table("wmMasterstroke01", "Masterstroke", "1d8", MASTERSTROKES,
    '<p>Roll after Masterstroke Opportunity completes the contribution at 100% work. Hidden Detail is allowed for all crafted equipment. Masterstrokes do not use Artisan Mark capacity.</p><p>Manual rolls show the effect in chat; they do not attach it to an item. Workbench crafting records its automatically rolled Masterstroke on the finished item.</p>'),
];
