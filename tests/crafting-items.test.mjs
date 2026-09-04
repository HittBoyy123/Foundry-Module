import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CRAFTING_ITEM_SOURCES } from "../content/crafting-items.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_ID = "pf2e-crafting-material-tiers";

test("the crafting compendium provides one configurable held spell focus", () => {
  assert.equal(CRAFTING_ITEM_SOURCES.length, 1);
  const focus = CRAFTING_ITEM_SOURCES[0];
  assert.equal(focus._id, "WmSpellFocus0001");
  assert.equal(focus.name, "Spell Focus");
  assert.equal(focus.type, "equipment");
  assert.equal(focus.system.usage.value, "held-in-one-hand");
  assert.equal(focus.system.traits.otherTags.includes("spell-focus"), true);
  assert.equal(focus.system.rules.length, 0);
  assert.equal(focus.flags[MODULE_ID].schemaVersion, 4);
  assert.equal(focus.flags[MODULE_ID].crafting.schemaVersion, 1);
  assert.deepEqual(focus.flags[MODULE_ID].crafting.core, { materialId: "metal", tier: 1 });
  assert.deepEqual(focus.flags[MODULE_ID].crafting.artisanMarks, []);
  assert.match(focus.system.description.value, /spell attack and spell DC progression/i);
  assert.match(focus.system.description.value, /Make &amp; Marks/i);
});

test("the generated crafting pack and manifest match the catalogue", async () => {
  const pack = await readFile(path.join(projectRoot, "packs", "crafting-items.db"), "utf8");
  const entries = pack.trim().split(/\r?\n/u).map((line) => JSON.parse(line));
  assert.deepEqual(entries, CRAFTING_ITEM_SOURCES);

  const manifest = JSON.parse(await readFile(path.join(projectRoot, "module.json"), "utf8"));
  assert.deepEqual(manifest.packs.find((entry) => entry.name === "crafting-items"), {
    name: "crafting-items",
    label: "Wrathmaker Crafting Items",
    path: "packs/crafting-items.db",
    type: "Item",
    system: "pf2e",
    ownership: {
      PLAYER: "OBSERVER",
      TRUSTED: "OBSERVER",
      ASSISTANT: "OWNER",
    },
  });
});
