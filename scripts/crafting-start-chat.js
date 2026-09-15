import { artisanWorkRate, projectArtisanCount } from "./crafting-projects.js";
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function craftingStartContent(project, partyName) {
  const totals = new Map();
  for (const row of project.reservations ?? []) {
    if (row.state !== "reserved") continue;
    const key = JSON.stringify([row.materialId, row.tier, row.variantId || ""]);
    const total = totals.get(key) ?? { name: row.itemName, tier: row.tier, units: 0 };
    total.units += row.quantity * row.unitsPerItem;
    totals.set(key, total);
  }
  const materials = [...totals.values()].map(row => `<li>${escape(row.name)} — Tier ${escape(row.tier)}: <strong>${row.units} units</strong></li>`).join("");
  const days = Math.ceil(project.requiredProgress / artisanWorkRate(projectArtisanCount(project)));
  return `<section class="cmt-disassembly-chat"><h3>${project.upgrade ? "Upgrade Started" : "Crafting Started"}</h3><p>Now ${project.upgrade ? "upgrading" : "crafting"} <strong>${escape(project.name)}</strong>.</p><p>Materials reserved in ${escape(partyName)}.</p><h4>Materials Required</h4><ul>${materials}</ul><p>Days required: <strong>${days}</strong> on successful checks.</p></section>`;
}

export async function postCraftingStart(project, party) {
  try {
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: party }), content: craftingStartContent(project, party.name), whisper: [], blind: false });
  } catch (error) {
    console.error("Wrathmaker | Crafting announcement failed", error);
    globalThis.ui?.notifications?.warn("Project created, but its chat announcement could not be posted.");
  }
}
