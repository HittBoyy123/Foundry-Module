import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CRAFTING_RESOURCE_SCHEMA_VERSION,
  CRAFTING_RESOURCE_SOURCES,
} from "../content/crafting-resources.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_ID = "pf2e-crafting-material-tiers";
const TIER_LEVELS = [1, 4, 8, 12, 16, 20];
const TIER_DCS = [15, 19, 24, 30, 35, 40];

function resourceData(item) {
  return item.flags[MODULE_ID].resource;
}

test("the resource catalogue includes every base material tier and dragon color tier", () => {
  assert.equal(CRAFTING_RESOURCE_SOURCES.length, 66);
  assert.equal(new Set(CRAFTING_RESOURCE_SOURCES.map((item) => item._id)).size, 66);

  for (const item of CRAFTING_RESOURCE_SOURCES) {
    const resource = resourceData(item);
    assert.match(item._id, /^WmCraftRes\d{6}$/u);
    assert.equal(item._id.length, 16);
    assert.equal(item.type, "treasure");
    assert.equal(item.system.traits.otherTags.includes("wrathmaker-resource"), true);
    assert.equal(resource.schemaVersion, CRAFTING_RESOURCE_SCHEMA_VERSION);
    assert.equal(resource.tier >= 1 && resource.tier <= 6, true);
    assert.equal(resource.unitsPerItem >= 1, true);
    assert.equal(item.system.price.value && Object.keys(item.system.price.value).length, 0);
    assert.equal(item.system.level.value, TIER_LEVELS[resource.tier - 1]);
    assert.match(item.system.description.value, new RegExp(`crafting DC is <strong>${TIER_DCS[resource.tier - 1]}</strong>`, "iu"));
  }

  for (const materialId of ["metal", "wood", "stone", "leather", "herbs", "mana-crystals"]) {
    const resources = CRAFTING_RESOURCE_SOURCES.filter((item) => resourceData(item).materialId === materialId);
    assert.deepEqual(resources.map((item) => resourceData(item).tier), [1, 2, 3, 4, 5, 6]);
  }

  const dragonScales = CRAFTING_RESOURCE_SOURCES.filter((item) => resourceData(item).materialId === "dragon-scale");
  assert.equal(dragonScales.length, 30);
  for (const color of ["black", "blue", "green", "red", "white"]) {
    const colorScales = dragonScales.filter((item) => resourceData(item).variantId === color);
    assert.deepEqual(colorScales.map((item) => resourceData(item).tier), [1, 2, 3, 4, 5, 6]);
    assert.equal(colorScales.every((item) => resourceData(item).unitsPerItem === 5), true);
  }
});

test("resource names and bundle quantities remain useful in a PF2e inventory", () => {
  const iron = CRAFTING_RESOURCE_SOURCES.find((item) => item.name === "Iron Ingot");
  const godwood = CRAFTING_RESOURCE_SOURCES.find((item) => item.name === "Godwood Lumber");
  const mana = CRAFTING_RESOURCE_SOURCES.find((item) => item.name === "Aetherheart Crystals (10)");
  const scales = CRAFTING_RESOURCE_SOURCES.find((item) => item.name === "Arch Dragon Red Dragon Scales (5)");

  assert.equal(resourceData(iron).unit, "ingot");
  assert.equal(resourceData(godwood).tier, 6);
  assert.equal(resourceData(mana).unitsPerItem, 10);
  assert.equal(resourceData(scales).variantId, "red");
  assert.equal(resourceData(scales).unitsPerItem, 5);
  assert.equal(scales.system.level.value, 20);
});

test("the generated resource pack and manifest match the catalogue", async () => {
  const pack = await readFile(path.join(projectRoot, "packs", "crafting-resources.db"), "utf8");
  const entries = pack.trim().split(/\r?\n/u).map((line) => JSON.parse(line));
  assert.deepEqual(entries, CRAFTING_RESOURCE_SOURCES);

  const manifest = JSON.parse(await readFile(path.join(projectRoot, "module.json"), "utf8"));
  assert.deepEqual(manifest.packs.find((entry) => entry.name === "crafting-resources"), {
    name: "crafting-resources",
    label: "Wrathmaker Crafting Resources",
    path: "packs/crafting-resources.db",
    type: "Item",
    system: "pf2e",
    ownership: {
      PLAYER: "OBSERVER",
      TRUSTED: "OBSERVER",
      ASSISTANT: "OWNER",
    },
  });
  assert.equal(manifest.packFolders[0].packs.includes("crafting-resources"), true);
});
