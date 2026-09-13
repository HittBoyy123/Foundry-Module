import test from "node:test";
import assert from "node:assert/strict";
import { gatheringParticipantCount, groupGatheringTask, findGatheringParty } from "../scripts/gathering-destination.js";
import { gatheringResourceKey, resolveGatheringOutcome } from "../scripts/gathering-model.js";
import { grantGatheringResource } from "../scripts/gathering.js";
import { GATHERING_TASK_SOURCES } from "../content/gathering-presets.js";
import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";

test("ordinary stash items have no resource identity instead of throwing", () => {
  assert.equal(gatheringResourceKey(null), null);
});

test("party size excludes NPCs and duplicates; one lead roll awards 1 or 2 per character", () => {
  const pc = { id: "pc", type: "character" };
  const party = { members: [pc, pc, { id: "pc2", type: "character" }, { id: "npc", type: "npc" }] };
  const count = gatheringParticipantCount(party);
  assert.equal(count, 2);
  const task = groupGatheringTask(GATHERING_TASK_SOURCES[0], count);
  for (const [degree, quantity] of [[0, 0], [1, 0], [2, 2], [3, 4]]) {
    assert.equal(resolveGatheringOutcome(task, degree).quantity, quantity);
  }
  assert.throws(() => groupGatheringTask(task, 0));
});

test("rewards create then stack the exact resource alongside ordinary stash items", async () => {
  const original = globalThis.game;
  globalThis.game = { user: {} };
  const resource = structuredClone(CRAFTING_RESOURCE_SOURCES[0]);
  const stash = {
    items: [{ name: "Ordinary sword", system: {} }],
    canUserModify: () => true,
    async createEmbeddedDocuments(_type, sources) {
      const item = sources[0];
      item.update = async changes => { item.system.quantity = changes["system.quantity"]; };
      this.items.push(item);
      return [item];
    },
  };
  try {
    await grantGatheringResource(stash, resource, 4);
    assert.equal(stash.items.length, 2);
    assert.equal(stash.items[1].system.quantity, 4);
    await grantGatheringResource(stash, resource, 8);
    assert.equal(stash.items.length, 2);
    assert.equal(stash.items[1].system.quantity, 12);
  } finally { globalThis.game = original; }
});

test("the active party receives rewards when the lead belongs to multiple parties", () => {
  const actor = { id: "lead" };
  const first = { type: "party", members: [actor] };
  const active = { type: "party", members: [actor] };
  assert.equal(findGatheringParty(actor, [first, active], active), active);
});
