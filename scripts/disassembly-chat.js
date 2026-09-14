const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function disassemblyChatContent(partyName, plans) {
  const totals = new Map();
  for (const plan of plans) for (const row of plan.returns) {
    const key = JSON.stringify([row.materialId, row.tier, row.variantId || ""]);
    const total = totals.get(key) ?? { ...row, quantity: 0 };
    total.quantity += row.quantity;
    totals.set(key, total);
  }
  const items = plans.map(plan => '<li>' + escape(plan.itemName) + ' × <strong>' + escape(plan.stackQuantity) + '</strong></li>').join("");
  const materials = [...totals.values()].map(row => '<li>' + escape(row.name) + ' — Tier ' + escape(row.tier) + ': <strong>' + escape(row.quantity) + '</strong></li>').join("");
  return '<section class="cmt-disassembly-chat"><h3>Disassembly Complete</h3><p>Materials added to ' + escape(partyName) + '.</p><h4>Items Disassembled</h4><ul>' + items + '</ul><h4>Total Materials Earned</h4><ul>' + materials + '</ul></section>';
}

/** Chat failure must never turn a completed inventory transaction into a retry. */
export async function postDisassemblyChat(party, plans) {
  if (!plans.length) return;
  try {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: party }),
      content: disassemblyChatContent(party.name, plans),
      whisper: [], blind: false,
    });
  } catch (error) {
    console.error("Wrathmaker | Disassembly chat failed", error);
    globalThis.ui?.notifications?.warn("Disassembly completed, but its chat readout could not be posted.");
  }
}
