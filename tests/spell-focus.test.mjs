import test from "node:test";
import assert from "node:assert/strict";
import { setFocusSlot } from "../scripts/spell-focus.js";

test("changing an active focus to a ring updates native usage and frees its hand", async () => {
  let changes;
  const item = { type: "equipment", isOwner: true, isEquipped: true, system: { traits: { otherTags: ["spell-focus"] }, equipped: { carryType: "held", handsHeld: 1 } }, update: async value => { changes = value; } };
  await setFocusSlot(item, "rings");
  assert.equal(changes["system.usage.value"], "wornring");
  assert.equal(changes["system.equipped.handsHeld"], 0);
  assert.equal(changes["system.equipped.inSlot"], true);
  assert.equal(changes["system.equipped.carryType"], "worn");
  item.isEquipped = false;
  await setFocusSlot(item, "neck");
  assert.equal(changes["system.usage.value"], "wornnecklace");
  assert.ok(!("system.equipped.carryType" in changes));
  item.isOwner = false;
  await assert.rejects(() => setFocusSlot(item, "rings"), /can edit/);
});
