import test from "node:test";
import assert from "node:assert/strict";
import { recoverProjectItem } from "../scripts/project-recovery.js";
import { createCraftingProject, normalizeCraftingWorkbench } from "../scripts/crafting-projects.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";

function fixture() {
  const recipe = buildCraftingRecipeFromBand("weapon-sword", { targetItem: { type: "weapon", system: { category: "martial" } }, tier: 4 });
  const source = { _id: "old", name: "Sword", type: "weapon", system: { quantity: 1 }, flags: { test: { marks: ["Blood Temper"], maker: "Malion" } } };
  let state = normalizeCraftingWorkbench({ projects: [{
    ...createCraftingProject({ recipe }), status: "completed", finalItemUuid: "Actor.party.Item.old",
    finalItemSource: source, downtimeSpent: 12, consumptionConfirmed: true,
    reservations: [{ itemId: "metal", quantity: 10, state: "consumed" }],
  }] });
  const calls = { created: [], deleted: [] };
  const party = {
    id: "party", canUserModify: () => true,
    createEmbeddedDocuments: async (_type, sources) => { calls.created.push(...sources); return [{ id: "new", uuid: "Actor.party.Item.new" }]; },
    deleteEmbeddedDocuments: async (_type, ids) => calls.deleted.push(...ids),
    updateEmbeddedDocuments: async () => { throw Error("Recovery must not consume resources"); },
  };
  const options = {
    user: { id: "gm", name: "GM", isGM: true }, locks: new Set(), loadWorkbench: () => structuredClone(state),
    saveWorkbench: async (_party, data) => { state = data; }, findExisting: async () => false,
    buildLegacySource: async () => source,
  };
  return { party, options, calls, id: state.projects[0].id, state: () => state };
}

test("recovery keeps completed output, Marks, resource history and downtime with an audit record", async () => {
  const f = fixture();
  await recoverProjectItem(f.party, f.id, f.options);
  const project = f.state().projects[0];
  assert.equal(f.calls.created.length, 1);
  assert.equal(f.calls.created[0]._id, undefined);
  assert.deepEqual(f.calls.created[0].flags.test, { marks: ["Blood Temper"], maker: "Malion" });
  assert.equal(project.finalItemUuid, "Actor.party.Item.new");
  assert.equal(project.status, "completed");
  assert.equal(project.downtimeSpent, 12);
  assert.equal(project.reservations[0].state, "consumed");
  assert.equal(project.reservations[0].quantity, 10);
  assert.equal(project.audit.at(-1).action, "item-recovered");
  assert.equal(f.options.locks.size, 0);
});

test("players, existing output, and concurrent operations cannot create replacements", async () => {
  const f = fixture();
  await assert.rejects(recoverProjectItem(f.party, f.id, { ...f.options, user: { isGM: false } }), /Only a GM/);
  await assert.rejects(recoverProjectItem(f.party, f.id, { ...f.options, findExisting: async () => true }), /still exists/);
  f.options.locks.add("party");
  await assert.rejects(recoverProjectItem(f.party, f.id, f.options), /already processing/);
  assert.equal(f.calls.created.length, 0);
});

test("failure to save recovery removes the temporary replacement", async () => {
  const f = fixture();
  await assert.rejects(recoverProjectItem(f.party, f.id, { ...f.options, saveWorkbench: async () => { throw Error("Save failed"); } }), /Save failed/);
  assert.deepEqual(f.calls.deleted, ["new"]);
  assert.equal(f.state().projects[0].finalItemUuid, "Actor.party.Item.old");
  assert.equal(f.options.locks.size, 0);
});

test("older completed projects rebuild from their base or explain when that is unavailable", async () => {
  const f = fixture();
  f.state().projects[0].finalItemSource = null;
  await assert.rejects(recoverProjectItem(f.party, f.id, { ...f.options, buildLegacySource: async () => null }), /cannot be rebuilt/);
  assert.equal(f.calls.created.length, 0);
  await recoverProjectItem(f.party, f.id, f.options);
  assert.equal(f.calls.created.length, 1);
});

test("unfinished projects cannot recover an output", async () => {
  const f = fixture();
  f.state().projects[0].status = "active";
  await assert.rejects(recoverProjectItem(f.party, f.id, f.options), /Only completed/);
  assert.equal(f.calls.created.length, 0);
});
