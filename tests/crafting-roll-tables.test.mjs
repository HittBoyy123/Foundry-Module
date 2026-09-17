import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CRAFTING_ROLL_TABLES } from "../content/crafting-roll-tables.js";
import { ensureCraftingRollTables } from "../scripts/crafting-roll-tables.js";
import { CRAFTING_EDGES, MASTERSTROKES } from "../scripts/crafting-edges.js";
import { MODULE_ID } from "../scripts/constants.js";

test("native tables contain exactly the shared rules with equal-weight, repeatable results", () => {
  assert.deepEqual(CRAFTING_ROLL_TABLES.map(table => table.formula), ["1d3", "1d8"]);
  for (const [index, table] of CRAFTING_ROLL_TABLES.entries()) {
    assert.match(table._id, /^[a-zA-Z0-9]{16}$/);
    assert.equal(table.replacement, true);
    assert.equal(table.ownership.default, 2);
    const rules = index === 0 ? CRAFTING_EDGES : MASTERSTROKES;
    assert.equal(table.results.length, rules.length);
    for (const [i, result] of table.results.entries()) {
      assert.match(result._id, /^[a-zA-Z0-9]{16}$/);
      assert.equal(result.type, "text");
      assert.equal(result.name, rules[i].name);
      assert.ok(result.description.includes(rules[i].description));
      assert.equal(result.weight, 1);
      assert.equal(result.drawn, false);
      assert.deepEqual(result.range, [i + 1, i + 1]);
    }
  }
});

test("only the primary GM creates missing sidebar tables, preserving edited copies", async () => {
  const gm = { id: "a", isGM: true, active: true };
  const game = { user: gm, system: { id: "pf2e" }, users: [gm], tables: [] };
  let calls = 0;
  const Table = { async createDocuments(sources) { calls++; game.tables.push(...sources); return sources; } };
  assert.equal((await ensureCraftingRollTables({ game, Table })).length, 2);
  game.tables[0].name = "Custom Edge";
  game.tables[0].formula = "1d4";
  assert.deepEqual(await ensureCraftingRollTables({ game, Table }), []);
  assert.equal(calls, 1);
  assert.equal(game.tables[0].name, "Custom Edge");
  assert.equal(CRAFTING_ROLL_TABLES[0].formula, "1d3");
  game.tables.pop();
  assert.equal((await ensureCraftingRollTables({ game, Table })).length, 1);
  game.user = { id: "z", isGM: true, active: true }; game.users.push(game.user);
  game.tables = [];
  assert.deepEqual(await ensureCraftingRollTables({ game, Table }), []);
  game.user = { id: "player", isGM: false };
  assert.deepEqual(await ensureCraftingRollTables({ game, Table }), []);
});

test("manifest and generated compendium include both RollTables", async () => {
  const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url), "utf8"));
  const pack = manifest.packs.find(pack => pack.name === "crafting-tables");
  assert.equal(pack.type, "RollTable");
  assert.equal(pack.ownership.PLAYER, "OBSERVER");
  const sources = (await readFile(new URL(`../${pack.path}`, import.meta.url), "utf8")).trim().split("\n").map(line => JSON.parse(line));
  assert.deepEqual(sources, CRAFTING_ROLL_TABLES);
  assert.equal(sources[0].flags[MODULE_ID].craftingTable, sources[0]._id);
});
