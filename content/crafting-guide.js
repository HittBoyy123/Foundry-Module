import { CRAFTING_EDGE_GUIDE } from "./crafting-edges-guide.js";
import { ENCHANTING_GUIDE } from "./enchanting-guide.js";

export const CRAFTING_GUIDE = {
  _id: "wmCraftingGuide1", name: "Crafting Handbook", ownership: { default: 2 },
  pages: [{
    _id: "wmCraftingRules1", name: "Crafting, gathering and recovery", type: "text", sort: 0,
    title: { show: true, level: 1 }, text: { format: 1, content: `
<h1>Crafting</h1>
<p>The experimental Workbench is enabled by the GM. Open Craft to select a base item, recipe, Core material and Tier. Required materials come from the selected Party Stash.</p>
<h2>Solo or together</h2><p>Ordinary recipes can be crafted by one lead artisan; selected enhancements can require another qualified artisan. Additional artisans contribute to the work. Dragon-scale reinforcement requires a Leatherwork artisan. The usual recipe checks and material requirements still apply.</p>
<p>Up to six different artisans can work together. Each artisan after the lead grants +1 to Work Block rolls, up to +5. This stacks with profession bonuses and the existing teamwork time reduction. Each assigned artisan contributes to the same Work Block and commits the same calendar downtime. Teamwork multiplies work by ×1 for 1–2 artisans, ×1.25 for 3–5, and ×1.5 for six. Fractional work carries between blocks. Critical successes roll a Crafting Edge before the teamwork rate is applied. Existing progress is not changed retroactively.</p>
<h2>Materials</h2><p>Tiers 1–6 correspond to levels 1, 4, 8, 12, 16 and 20. Material and recipe choices determine the requirements and DC shown in the Workbench. Weapon materials grant attack bonuses. Only Striking runes increase base weapon damage dice. Artisan Marks are retired and grant no automated benefits.</p>
${ENCHANTING_GUIDE}
<h2>Reserve, work, confirm</h2><p>Create Project reserves resources so other projects cannot promise the same stock. Work Blocks advance progress without consuming that stock. At completion, review and confirm consumption and creation of the finished item. Cancelling releases unconsumed reservations. The GM can recover a missing completed output without paying again; this is not available after dismantling.</p>
${CRAFTING_EDGE_GUIDE}
<h2>Gather</h2><p>Use the Workbench Gather tab to select a character, environment and resource. Available resources may follow the configured region and Tier. The displayed skill, DC and results govern the attempt. The GM chooses whether rewards go to the Party Stash or gathering character.</p>
<h2>Disassemble</h2><p>Drop an item with a Core material and tier from a character or Party Stash into Disassemble. Review the return before confirming destruction. Recorded items use the original consumption ledger; unrecorded items use a labelled standard-recipe estimate. Recovery is 50%, rounded up per material, Tier and variant. The source item is removed and returns enter the selected Party Stash. Dismantling is irreversible and cannot be repeated on the same item.</p>
` },
  }],
};
