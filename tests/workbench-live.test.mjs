import test from "node:test";
import assert from "node:assert/strict";
import { sharedCraftDraft, hydrateCraftDraft, bindSharedCraftDraft } from "../scripts/workbench-live.js";

test("shared drafts copy crafting choices without changing each viewer's tab or party", () => {
  const state = { partyId: "party", tab: "craft", artisanSlots: ["Actor.pc"], tier: 3, selectedMarks: [] };
  const draft = sharedCraftDraft(state);
  state.artisanSlots[0] = "changed";
  assert.deepEqual(draft.artisanSlots, ["Actor.pc"]);
  const viewer = { workbenchState: { partyId: "party", tab: "projects", scrollTop: 200 } };
  hydrateCraftDraft(viewer, { id: "party", getFlag: () => ({ ...draft, tab: "craft", partyId: "wrong" }) });
  assert.equal(viewer.workbenchState.tab, "projects");
  assert.equal(viewer.workbenchState.partyId, "party");
  assert.equal(viewer.workbenchState.tier, 3);
});

test("editing a draft sends only changed fields and respects party permissions", async () => {
  const originalGame = globalThis.game;
  const originalTimeout = globalThis.setTimeout;
  let flush;
  globalThis.game = { user: { id: "player" } };
  globalThis.setTimeout = callback => { flush = callback; return 1; };
  const listeners = {};
  const writes = [];
  const party = { id: "party", canUserModify: () => true, update: async changes => writes.push(changes) };
  const application = { workbenchState: { tier: 2 }, sharedCraftBaseline: { tier: 1 }, sharedCraftPartyId: "party" };
  try {
    bindSharedCraftDraft(application, { addEventListener: (name, fn) => { listeners[name] = fn; } }, () => party);
    listeners.change(); await flush();
    assert.deepEqual(writes, [{ "flags.pf2e-crafting-material-tiers.craftDraft.tier": 2 }]);
    party.canUserModify = () => false;
    application.workbenchState.tier = 3;
    listeners.change(); await flush();
    assert.equal(writes.length, 1);
  } finally { globalThis.game = originalGame; globalThis.setTimeout = originalTimeout; }
});
