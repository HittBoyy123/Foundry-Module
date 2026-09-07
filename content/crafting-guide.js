import { ARTISAN_MARK_JOURNAL_SOURCES } from "./artisan-mark-journals.js";

export const CRAFTING_GUIDE = {
  _id: "wmCraftingGuide1", name: "Wrathmaker — Crafting Handbook", ownership: { default: 2 },
  pages: [{
    _id: "wmCraftingRules1", name: "Crafting, gathering and recovery", type: "text", sort: 0,
    title: { show: true, level: 1 }, text: { format: 1, content: `
<h1>Wrathmaker Crafting</h1>
<p>The experimental Workbench is enabled by the GM. Open Craft to select a base item, recipe, Core material and Tier. Required materials come from the selected Party Stash.</p>
<h2>Solo or together</h2><p>Every supported recipe can be crafted by one lead artisan. Material specialists are optional: they unlock their own eligible Marks and combinations rather than permission to make the base item. The usual recipe checks and material requirements still apply.</p>
<p>Up to six different artisans can work together. Each assigned artisan contributes to the same Work Block and commits the same calendar downtime. Progress is the work-block result multiplied by the number of distinct artisans, capped at six. A successful one-day block yields one Progress solo or six with a full team. Failure and critical success are calculated per artisan first. Existing progress is not changed retroactively.</p>
<h2>Materials and Marks</h2><p>Tiers 1–6 correspond to levels 1, 4, 8, 12, 16 and 20. Material and recipe choices determine the requirements and DC shown in the Workbench. Marks must match the item, artisan, Anchor and minimum Tier. Capacity is shared across the entire item; only one zero-Capacity Mark is allowed. Specialist materials and Mark labour are included in the plan. Adding a specialist does not automatically grant every synergy: the selected Marks must meet their own rules.</p>
<h2>Reserve, work, confirm</h2><p>Create Project reserves resources so other projects cannot promise the same stock. Work Blocks advance progress without consuming that stock. At completion, review and confirm consumption and creation of the finished item. Cancelling releases unconsumed reservations. The GM can recover a missing completed output without paying again; this is not available after dismantling.</p>
<h2>Gather</h2><p>Use the Workbench Gather tab to select a character, environment and resource. Available resources may follow the configured region and Tier. The displayed skill, DC and results govern the attempt. The GM chooses whether rewards go to the Party Stash or gathering character.</p>
<h2>Disassemble</h2><p>Drop a Wrathmaker-formatted item from a character or Party Stash into Disassemble. Review the return before confirming destruction. Recorded items use the original consumption ledger; unrecorded items use a labelled standard-recipe estimate. Recovery is 90%, rounded down per material, Tier and variant. The source item is removed and returns enter the selected Party Stash. Dismantling is irreversible and cannot be repeated on the same item.</p>
<h2>Automation and activations</h2><p>Supported numerical effects apply automatically. Read each Mark: conditional, target-specific and GM-approved benefits may still require adjudication. An activation button presents its rules; it does not by itself resolve damage, select targets or spend encounter uses. Action costs that are not stated in the source are not invented.</p>
<h2>Artisan Mark library</h2><p>All Marks, including structure and consumable references, are included as pages in this handbook. The item picker only offers applicable Marks.</p>` },
  }, ...ARTISAN_MARK_JOURNAL_SOURCES.map((entry, index) => ({ ...entry.pages[0], name: entry.name, sort: (index + 1) * 100000 }))],
};
