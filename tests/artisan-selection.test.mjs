import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID, cloneDefaultRulesConfig } from "../scripts/constants.js";
import { resolveDroppedArtisan, artisanSlotChoices, slotAllowsArtisan, assignSharedArtisan, requestArtisanAssignment, installArtisanAssignmentSocket } from "../scripts/artisan-selection.js";
const user = { id: "player", isGM: false };
const actor = (uuid, type = "character", owner = true) => ({ uuid, type, documentName: "Actor", name: uuid, testUserPermission: (_user, level) => owner && level === "OWNER" });
const profile = (actor, material = "metal", specializations = []) => ({ actorUuid: actor.uuid, name: actor.name,
  professions: [{ name: material, materialIds: [material] }], specializations });

test("actor, token UUID, and legacy token data resolve to their character or NPC", async () => {
  const pc = actor("Actor.pc"), npc = actor("Scene.scene.Token.npc.Actor.npc", "npc");
  const token = { documentName: "Token", actor: npc };
  const resolve = async uuid => ({ "Actor.pc": pc, "Scene.scene.Token.npc": token })[uuid];
  const environment = { resolve, actors: new Map([["pc", pc]]), scenes: new Map([["scene", { tokens: new Map([["npc", token]]) }]]) };
  assert.equal(await resolveDroppedArtisan({ uuid: pc.uuid }, environment), pc);
  assert.equal(await resolveDroppedArtisan({ uuid: "Scene.scene.Token.npc" }, environment), npc);
  assert.equal(await resolveDroppedArtisan({ type: "Token", sceneId: "scene", tokenId: "npc" }, environment), npc);
  assert.equal(await resolveDroppedArtisan({ type: "Actor", id: "pc" }, environment), pc);
  assert.equal(await resolveDroppedArtisan({ type: "Item", uuid: "Item.sword" }, environment), null);
});
test("selectors filter profession, duplicate slots, and Wyrmcraft specialization", () => {
  const smith = profile(actor("Actor.smith"));
  const leather = profile(actor("Actor.leather"), "leather");
  const wyrm = profile(actor("Actor.wyrm", "npc"), "leather", [{ professionId: "leatherwork", specializationId: "specialty-1" }]);
  const slot = { index: 1, materialIds: ["leather"], requiresWyrmcraft: true };
  assert.deepEqual(artisanSlotChoices(slot, [smith, leather, wyrm], [smith.actorUuid]).map(entry => entry.uuid), [wyrm.actorUuid]);
  assert.equal(artisanSlotChoices(slot, [wyrm], [wyrm.actorUuid]).length, 0);
  assert.equal(artisanSlotChoices(slot, [wyrm], [smith.actorUuid, wyrm.actorUuid])[0].selected, true);
  assert.equal(slotAllowsArtisan({ materialIds: [] }, { professions: [] }), false);
  assert.equal(slotAllowsArtisan({ materialIds: [] }, smith), true);
});
function fixture() {
  const pc = actor("Actor.pc"), other = actor("Actor.other", "npc", false);
  let draft = { bandId: "weapon-sword", baseItemUuid: "Item.sword", tier: 2, materialId: "metal", artisanSlots: Array(6).fill("") };
  const writes = [];
  const party = { type: "party", id: "party", canUserModify: () => false, testUserPermission: () => true,
    getFlag: () => draft, async update(change) { writes.push(change); draft.artisanSlots = change[`flags.${MODULE_ID}.craftDraft.artisanSlots`]; } };
  const resolve = async uuid => ({ "Actor.pc": pc, "Actor.other": other, "Item.sword": { type: "weapon", system: { category: "martial" } } })[uuid];
  return { pc, other, party, resolve, writes, draft, args: { party, user, index: 0, actorUuid: pc.uuid, resolve, profileFor: actor => profile(actor) } };
}
test("a player without Party edit rights can add their own eligible artisan via the GM operation", async () => {
  const f = fixture();
  const result = await assignSharedArtisan(f.args);
  assert.equal(result[0], f.pc.uuid);
  assert.deepEqual(Object.keys(f.writes[0]), [`flags.${MODULE_ID}.craftDraft.artisanSlots`]);
  assert.equal(f.draft.materialId, "metal");
  await assignSharedArtisan({ ...f.args, actorUuid: "" });
  assert.equal(f.draft.artisanSlots[0], "");
});
test("assignment rejects uncontrolled actors, duplicate artisans, inaccessible parties, and wrong professions", async () => {
  const f = fixture();
  await assert.rejects(assignSharedArtisan({ ...f.args, actorUuid: f.other.uuid }), /control/);
  await assert.rejects(assignSharedArtisan({ ...f.args, profileFor: actor => profile(actor, "wood") }), /expertise/);
  await assert.rejects(assignSharedArtisan({ ...f.args, index: 6 }), /valid artisan slot/);
  f.draft.artisanSlots[1] = f.pc.uuid;
  await assert.rejects(assignSharedArtisan(f.args), /already occupies/);
  f.draft.artisanSlots[1] = ""; f.draft.artisanSlots[0] = f.other.uuid;
  await assert.rejects(assignSharedArtisan(f.args), /replace this slot/);
  f.party.testUserPermission = () => false;
  await assert.rejects(assignSharedArtisan(f.args), /cannot access/);
  assert.equal(f.writes.length, 0);
});
test("a concurrent draft edit cannot be overwritten after checking stale requirements", async () => {
  const f = fixture();
  const resolve = async uuid => { const result = await f.resolve(uuid); if (uuid === "Item.sword") f.draft.tier = 4; return result; };
  await assert.rejects(assignSharedArtisan({ ...f.args, resolve }), /draft changed/);
  assert.equal(f.writes.length, 0);
});

test("player-to-GM assignment request persists and returns the shared slots", async () => {
  const f = fixture();
  const gm = { id: "gm", active: true, isGM: true };
  const player = { ...user, active: true };
  const users = [gm, player]; users.get = id => users.find(user => user.id === id);
  const config = cloneDefaultRulesConfig(); config.crafting.workbenchEnabled = true;
  let receive;
  const original = { game: globalThis.game, foundry: globalThis.foundry, fromUuid: globalThis.fromUuid };
  // Use an actual profession item so the GM revalidates from actor data, not client input.
  const { PROFESSION_ITEM_SOURCES } = await import("../content/professions.js");
  f.pc.items = [structuredClone(PROFESSION_ITEM_SOURCES.find(item => item.name === "Blacksmithing"))];
  f.pc.system = { details: { level: { value: 1 } } };
  globalThis.fromUuid = f.resolve;
  globalThis.foundry = { utils: { randomID: () => "assignment-test" } };
  globalThis.game = { user: player, users, actors: new Map([[f.party.id, f.party]]), settings: { get: () => config },
    socket: { on(_channel, handler) { receive = handler; }, emit(_channel, payload) {
      game.user = payload.type === "artisan-assignment" ? gm : player;
      void receive(payload);
    } } };
  try {
    installArtisanAssignmentSocket();
    const slots = await requestArtisanAssignment(f.party, 0, f.pc.uuid);
    assert.equal(slots[0], f.pc.uuid);
    assert.equal(f.writes.length, 1);
    assert.deepEqual(f.draft.artisanSlots, slots);
    gm.active = false;
    await assert.rejects(requestArtisanAssignment(f.party, 0, f.pc.uuid), /GM must be online/);
  } finally { Object.assign(globalThis, original); }
});
