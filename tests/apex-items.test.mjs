import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { APEX_ITEM_SOURCES } from "../content/apex-items.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_ID = "pf2e-crafting-material-tiers";

test("the Apex compendium contains five items for each ability", () => {
  assert.equal(APEX_ITEM_SOURCES.length, 30);
  const grouped = APEX_ITEM_SOURCES.reduce((groups, item) => {
    const attribute = item.flags[MODULE_ID].abilityBoost.attribute;
    (groups[attribute] ??= []).push(item);
    return groups;
  }, {});

  for (const attribute of ["str", "dex", "con", "int", "wis", "cha"]) {
    const items = grouped[attribute];
    assert.equal(items.length, 5);
    assert.deepEqual(items.map((item) => item.flags[MODULE_ID].abilityBoost.value), [1, 2, 3, 4, 5]);
    assert.deepEqual(items.map((item) => item.system.level.value), [1, 5, 9, 13, 17]);
  }
});

test("every custom item is valid worn Apex equipment with Item Boost tracking", async () => {
  const ids = new Set();
  const names = new Set();

  for (const item of APEX_ITEM_SOURCES) {
    const boost = item.flags[MODULE_ID].abilityBoost;
    assert.equal(item.type, "equipment");
    assert.match(item._id, /^[A-Za-z0-9]{16}$/);
    assert.equal(ids.has(item._id), false);
    assert.equal(names.has(item.name), false);
    ids.add(item._id);
    names.add(item.name);

    assert.equal(item.system.apex.attribute, boost.attribute);
    assert.equal(item.system.traits.value.includes("apex"), true);
    assert.equal(item.system.traits.value.includes("invested"), true);
    assert.equal(item.system.traits.value.includes("magical"), true);
    assert.equal(item.system.traits.otherTags.includes("item-boost"), true);
    assert.match(item.system.usage.value, /^worn/);
    assert.notEqual(item.system.usage.value, "wornshoes");
    assert.match(item.system.description.value, new RegExp(`Item Boost \\+${boost.value}`));
    assert.deepEqual(item.system.price.value, {});

    const imagePath = path.join(projectRoot, item.img.replace(`modules/${MODULE_ID}/`, ""));
    await access(imagePath);
  }
});

test("the generated NeDB pack matches its human-readable catalog", async () => {
  const pack = await readFile(path.join(projectRoot, "packs", "apex-items.db"), "utf8");
  const entries = pack.trim().split(/\r?\n/u).map((line) => JSON.parse(line));
  assert.deepEqual(entries, APEX_ITEM_SOURCES);

  const manifest = JSON.parse(await readFile(path.join(projectRoot, "module.json"), "utf8"));
  assert.deepEqual(manifest.packs.find((entry) => entry.name === "apex-items"), {
    name: "apex-items",
    label: "Wrathmaker Apex Ability Items",
    path: "packs/apex-items.db",
    type: "Item",
    system: "pf2e",
    ownership: {
      PLAYER: "OBSERVER",
      TRUSTED: "OBSERVER",
      ASSISTANT: "OWNER",
    },
  });
});
