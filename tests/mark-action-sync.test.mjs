import test from "node:test";
import assert from "node:assert/strict";
import { syncActorMarkActions, markActionSources } from "../scripts/mark-actions.js";
import { ARTISAN_MARK_DEFINITIONS } from "../content/artisan-marks.js";
import { MARK_ACTIVATIONS } from "../content/mark-applicability.js";
const moduleId = "pf2e-crafting-material-tiers";
function fixture() {
  let sequence = 0;
  const actor = { uuid: "Actor.sync", isOwner: true, type: "character", items: [],
    async createEmbeddedDocuments(_type, sources) { this.items.push(...sources.map(source => ({ ...structuredClone(source), id: `created${++sequence}` }))); },
    async deleteEmbeddedDocuments(_type, ids) { this.items = this.items.filter(item => !ids.includes(item.id)); },
    async updateEmbeddedDocuments(_type, updates) { for (const update of updates) { const item = this.items.find(item => item.id === update._id); for (const [key, value] of Object.entries(update)) { if (key.startsWith("system.")) item.system[key.slice(7)] = value; else if (key !== "_id") item[key] = value; } } },
  };
  const item = { id: "source", type: "weapon", name: "Sword", system: { quantity: 1, equipped: { carryType: "held" } }, flags: { [moduleId]: { crafting: { artisanMarks: [{ definitionId: "blacksmithing-specialty-1-hellfire-channel", status: "completed" }] } } } };
  actor.items.push(item, { id: "personal", type: "action", name: "Personal action" });
  return { actor, item };
}
test("automatic actions follow carried items, stay unique and leave independent actions untouched", async () => {
  const { actor, item } = fixture();
  await Promise.all([syncActorMarkActions(actor), syncActorMarkActions(actor)]);
  assert.equal(actor.items.length, 3);
  item.name = "Renamed Sword";
  await syncActorMarkActions(actor);
  assert.ok(actor.items.some(entry => entry.name === "Hellfire Channel (Renamed Sword)"));
  item.system.equipped.carryType = "dropped";
  await syncActorMarkActions(actor);
  assert.equal(actor.items.length, 2);
  item.system.equipped.carryType = "stowed";
  await syncActorMarkActions(actor);
  assert.equal(actor.items.length, 3);
  actor.items = actor.items.filter(entry => entry.id !== "source");
  await syncActorMarkActions(actor);
  assert.deepEqual(actor.items.map(entry => entry.id), ["personal"]);
});
test("activation catalogue references real Marks and supports native PF2e action costs", () => {
  for (const [id, action] of Object.entries(MARK_ACTIVATIONS)) {
    assert.ok(ARTISAN_MARK_DEFINITIONS.some(mark => mark.id === id), id);
    assert.ok(["action", "reaction", "free"].includes(action.type));
    assert.ok(action.type !== "action" || [1, 2, 3].includes(action.value));
  }
  const { item } = fixture();
  item.system.quantity = 0;
  assert.deepEqual(markActionSources(item), []);
});
