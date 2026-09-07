import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID, cloneDefaultRulesConfig } from "../scripts/constants.js";
import { buildDisassemblyPlan, disassembleProjectItem, findDisassemblyItem, droppedDisassemblyContext } from "../scripts/disassembly.js";
import { buildGMItemSource } from "../scripts/gm-item-model.js";
import { createCraftingProject, normalizeCraftingWorkbench, recordProjectRecovery } from "../scripts/crafting-projects.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { recoverProjectItem } from "../scripts/project-recovery.js";

function fixture() {
  const recipe = buildCraftingRecipeFromBand("weapon-sword", { targetItem: { type: "weapon", system: { category: "martial" } }, tier: 2 });
  const item = { id: "sword", uuid: "Actor.party.Item.sword", name: "Steel Sword", type: "weapon", system: { quantity: 1 } };
  let state = normalizeCraftingWorkbench({ projects: [{
    ...createCraftingProject({ recipe }), status: "completed", finalItemUuid: item.uuid,
    consumptionConfirmed: true, downtimeSpent: 4,
    reservations: [
      { materialId: "metal", tier: 2, quantity: 7, unitsPerItem: 1, state: "consumed" },
      { materialId: "metal", tier: 2, quantity: 3, unitsPerItem: 1, state: "consumed" },
      { materialId: "wood", tier: 1, quantity: 1, unitsPerItem: 1, state: "consumed" },
    ],
  }] });
  let sequence = 0;
  const calls = [];
  const party = {
    id: "party", items: [item], canUserModify: () => true,
    async createEmbeddedDocuments(_type, sources) {
      const docs = sources.map(source => ({ ...structuredClone(source), id: "returned-" + ++sequence }));
      this.items.push(...docs); calls.push("create"); return docs;
    },
    async deleteEmbeddedDocuments(_type, ids) {
      this.items = this.items.filter(item => !ids.includes(item.id)); calls.push("delete");
    },
  };
  const options = {
    user: { id: "gm", isGM: true }, locks: new Set(), requireEnabled: () => {},
    loadWorkbench: () => structuredClone(state),
    saveWorkbench: async (_party, updated) => { state = updated; calls.push("save"); },
    expectedSignature: buildDisassemblyPlan(state.projects[0], item).signature,
  };
  return { party, item, options, calls, id: state.projects[0].id, state: () => state };
}

test("90% returns aggregate each material before rounding, including zero returns", () => {
  const f = fixture();
  const plan = buildDisassemblyPlan(f.state().projects[0], f.item);
  assert.deepEqual(plan.returns.map(row => [row.materialId, row.consumed, row.quantity]), [["metal", 10, 9], ["wood", 1, 0]]);
});

test("disassembly replaces gear with resources once and preserves completion history", async () => {
  const f = fixture();
  await disassembleProjectItem(f.party, f.id, f.options);
  assert.equal(f.party.items.length, 1);
  assert.equal(f.party.items[0].system.quantity, 9);
  assert.equal(f.party.items[0].flags[MODULE_ID].resource.materialId, "metal");
  const project = f.state().projects[0];
  assert.ok(project.disassembledAt);
  assert.equal(project.downtimeSpent, 4);
  assert.equal(project.reservations[0].quantity, 7);
  assert.equal(project.audit.at(-1).action, "item-disassembled");
  await assert.rejects(disassembleProjectItem(f.party, f.id, f.options), /already been disassembled/);
  assert.equal(f.party.items.length, 1);
  assert.throws(() => recordProjectRecovery(project, {}), /cannot be recovered/);
  await assert.rejects(recoverProjectItem(f.party, f.id, f.options), /cannot be recovered/);
});

test("player execution, disabled Workbench, and overlapping transactions are rejected", async () => {
  const f = fixture();
  await assert.rejects(disassembleProjectItem(f.party, f.id, { ...f.options, user: { isGM: false } }), /GM/);
  await assert.rejects(disassembleProjectItem(f.party, f.id, { ...f.options, requireEnabled() { throw Error("disabled"); } }), /disabled/);
  f.options.locks.add("party");
  await assert.rejects(disassembleProjectItem(f.party, f.id, f.options), /already processing/);
  assert.equal(f.calls.length, 0);
});

test("stale confirmation, missing gear, stacked items, and unrecorded materials are blocked", async () => {
  const f = fixture();
  await assert.rejects(disassembleProjectItem(f.party, f.id, { ...f.options, expectedSignature: "old" }), /fresh preview/);
  f.item.system.quantity = 2;
  assert.throws(() => buildDisassemblyPlan(f.state().projects[0], f.item), /single-item/);
  f.item.system.quantity = 1;
  f.state().projects[0].reservations[0].materialId = "unknown";
  assert.throws(() => buildDisassemblyPlan(f.state().projects[0], f.item), /No matching resource/);
  f.party.items = [];
  await assert.rejects(disassembleProjectItem(f.party, f.id, f.options), /Party Stash/);
  assert.equal(f.calls.length, 0);
});

test("save failure removes returned stacks and keeps the original gear", async () => {
  const f = fixture();
  await assert.rejects(disassembleProjectItem(f.party, f.id, { ...f.options, saveWorkbench: async () => { throw Error("save failed"); } }), /save failed/);
  assert.deepEqual(f.party.items, [f.item]);
  assert.equal(f.state().projects[0].disassembledAt, null);
  assert.equal(f.options.locks.size, 0);
});

test("deletion failure rolls back the return and project record", async () => {
  const f = fixture();
  const remove = f.party.deleteEmbeddedDocuments.bind(f.party);
  f.party.deleteEmbeddedDocuments = async (type, ids) => {
    if (ids.includes("sword")) throw Error("delete failed");
    return remove(type, ids);
  };
  await assert.rejects(disassembleProjectItem(f.party, f.id, f.options), /delete failed/);
  assert.deepEqual(f.party.items, [f.item]);
  assert.equal(f.state().projects[0].disassembledAt, null);
});

test("moving gear during processing aborts the return", async () => {
  const f = fixture();
  const create = f.party.createEmbeddedDocuments.bind(f.party);
  f.party.createEmbeddedDocuments = async (type, sources) => {
    const created = await create(type, sources);
    f.party.items = f.party.items.filter(item => item.id !== "sword");
    return created;
  };
  await assert.rejects(disassembleProjectItem(f.party, f.id, f.options), /Party Stash/);
  assert.equal(f.party.items.length, 0);
  assert.equal(f.state().projects[0].disassembledAt, null);
});

test("transferred output matches its recorded provenance; ambiguous duplicates do not", () => {
  const f = fixture();
  f.item.uuid = "Actor.party.Item.transferred";
  f.item.flags = { [MODULE_ID]: { crafting: { provenance: [{ projectId: f.id }] } } };
  assert.equal(findDisassemblyItem(f.party, f.state().projects[0]), f.item);
  assert.equal(buildDisassemblyPlan(f.state().projects[0], f.item).returns[0].quantity, 9);
  f.party.items.push({ ...f.item, id: "duplicate" });
  assert.equal(findDisassemblyItem(f.party, f.state().projects[0]), null);
});

test("mixed tiers and colored scale variants remain distinct", () => {
  const f = fixture();
  f.state().projects[0].reservations.push(
    { materialId: "metal", tier: 3, quantity: 10, unitsPerItem: 1, state: "consumed" },
    { materialId: "dragon-scale", tier: 2, variantId: "red", quantity: 4, unitsPerItem: 3, state: "consumed" },
  );
  const plan = buildDisassemblyPlan(f.state().projects[0], f.item);
  assert.deepEqual(plan.returns.slice(2).map(row => [row.materialId, row.tier, row.variantId, row.quantity]),
    [["metal", 3, "", 9], ["dragon-scale", 2, "red", 10]]);
});

function droppedFixture() {
  const f = fixture();
  const config = cloneDefaultRulesConfig();
  const source = buildGMItemSource(
    { name: "Longsword", type: "weapon", system: { category: "martial", group: "sword", quantity: 1 } },
    { name: "GM Steel Sword", materialId: "metal", tier: 2, marks: [] }, config, { isGM: true });
  const owner = { name: "Player Character", canUserModify: () => true };
  let live = { ...source, id: "custom", uuid: "Actor.hero.Item.custom", actor: owner, delete: async () => { live = null; } };
  f.party.items = [];
  const context = droppedDisassemblyContext(f.state(), live, config);
  Object.assign(f.options, {
    itemUuid: live.uuid, resolveItem: async () => live, config,
    requestingUser: { id: "player", isGM: false }, expectedSignature: context.plan.signature,
  });
  return { ...f, context, owner, live: () => live };
}

test("GM-created inventory items derive recipe stock and are removed from the actual character", async () => {
  const f = droppedFixture();
  assert.equal(f.context.existing, false);
  assert.match(f.context.plan.basis, /Standard Wrathmaker recipe/);
  await disassembleProjectItem(f.party, null, f.options);
  assert.equal(f.live(), null);
  assert.ok(f.party.items.length > 0);
  const recorded = f.state().projects.find(project => project.id === f.context.project.id);
  assert.ok(recorded.disassembledAt);
  assert.throws(() => recordProjectRecovery(recorded, {}), /cannot be recovered/);
  await assert.rejects(disassembleProjectItem(f.party, null, f.options), /no longer available/);
});

test("dropped-item ownership is enforced independently of Party Stash ownership", async () => {
  const f = droppedFixture();
  f.owner.canUserModify = () => false;
  await assert.rejects(disassembleProjectItem(f.party, null, f.options), /permission/);
  assert.ok(f.live());
  assert.equal(f.party.items.length, 0);
});

test("a failed character item deletion removes returns and the temporary disassembly record", async () => {
  const f = droppedFixture();
  f.live().delete = async () => { throw Error("delete refused"); };
  await assert.rejects(disassembleProjectItem(f.party, null, f.options), /delete refused/);
  assert.ok(f.live());
  assert.equal(f.party.items.length, 0);
  assert.equal(f.state().projects.some(project => project.id === f.context.project.id), false);
});

test("world items are GM-only; compendium templates and unformatted items are rejected", async () => {
  const f = droppedFixture();
  delete f.live().actor;
  await assert.rejects(disassembleProjectItem(f.party, null, f.options), /permission/);
  f.options.requestingUser = f.options.user;
  await disassembleProjectItem(f.party, null, f.options);
  assert.equal(f.live(), null);
  assert.throws(() => droppedDisassemblyContext(f.state(), { pack: "example" }, f.options.config), /Import/);
  assert.throws(() => droppedDisassemblyContext(f.state(), { flags: {} }, f.options.config), /Wrathmaker material/);
});

test("tracked gear still uses its original ledger after moving to a character", () => {
  const f = fixture();
  f.item.uuid = "Actor.hero.Item.moved";
  f.item.flags = { [MODULE_ID]: { material: "metal", tier: 2, crafting: { provenance: [{ projectId: f.id }] } } };
  const context = droppedDisassemblyContext(f.state(), f.item, cloneDefaultRulesConfig());
  assert.equal(context.existing, true);
  assert.equal(context.plan.returns[0].quantity, 9);
  f.state().projects[0].disassembledAt = Date.now();
  assert.throws(() => droppedDisassemblyContext(f.state(), f.item, cloneDefaultRulesConfig()), /already been disassembled/);
  assert.throws(() => droppedDisassemblyContext({ projects: [] }, f.item, cloneDefaultRulesConfig()), /original crafting project/);
});
