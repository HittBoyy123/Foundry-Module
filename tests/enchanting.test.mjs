import { plannedEquipment, validateCraftingEnchantments, addEnchantmentCosts } from "../scripts/crafting-enchantments.js";
import { createCraftingProject, normalizeCraftingProject } from "../scripts/crafting-projects.js";
import { buildCompletedItemSource } from "../scripts/workbench.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { scaleEquipmentRecipe } from "../scripts/equipment-size.js";
import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID, cloneDefaultRulesConfig } from "../scripts/constants.js";
import { materialRuneSlots, installMaterialRuneSlots } from "../scripts/property-runes.js";
import { applyEnchantment, propertyRuneChoices, openEnchanting } from "../scripts/enchanting.js";
import { PROFESSION_ITEM_SOURCES } from "../content/professions.js";
import { normalizeRulesConfig } from "../scripts/model.js";
import { specializationsEnabled } from "../scripts/profession-options.js";
import { hasWyrmcraft } from "../scripts/workbench-team.js";
const config = cloneDefaultRulesConfig();
config.crafting = { ...config.crafting, workbenchEnabled: true };
const normalized = normalizeRulesConfig(config);

function fixture() {
  const user = { id: "gm", isGM: true };
  const gem = { id: "gem", name: "Mana Gem", flags: { [MODULE_ID]: { resource: { materialId: "mana-crystals", tier: 3 } } }, system: { quantity: 2 }, async update(change) { this.system.quantity = change["system.quantity"]; } };
  const party = { id: "party", type: "party", name: "Party", items: [gem], getFlag: () => ({ projects: [] }) };
  const artisan = { id: "artisan", name: "Enchanter", items: [structuredClone(PROFESSION_ITEM_SOURCES.find(item => item.flags[MODULE_ID].profession.id === "enchanting"))] };
  const catalogue = [{ _id: "flame", name: "Flaming", system: { slug: "flaming", level: { value: 8 }, usage: { value: "etched-onto-a-weapon" } } },
    { _id: "greater", name: "Flaming (Greater)", system: { slug: "flaming-greater", level: { value: 15 }, usage: { value: "etched-onto-a-weapon" } } }];
  const item = { id: "sword", uuid: "Actor.party.Item.sword", actor: party, name: "Sword", type: "weapon", flags: { [MODULE_ID]: { material: "metal", tier: 2 } },
    system: { quantity: 1, runes: { property: [] } }, _source: { system: { runes: { property: [] } } },
    sheet: { getData: async () => ({ runeTypes: { property: [{ slug: "flaming", name: "Flaming" }, { slug: "greaterFlaming", name: "Flaming (Greater)" }] } }) },
    async update(change) { this._source.system.runes.property = change["system.runes.property"]; } };
  globalThis.game = { user, actors: new Map([["party", party], ["artisan", artisan]]), settings: { get: (_id, key) => key === "professionSpecializations" ? false : JSON.stringify(config) }, packs: new Map([["pf2e.equipment-srd", { getIndex: async () => catalogue }]]) };
  globalThis.fromUuid = async () => item;
  globalThis.ChatMessage = { create: async () => {} };
  return { gem, item, artisan, party, user, request: { partyId: "party", artisanId: "artisan", itemUuid: item.uuid, gemId: "gem", slug: "flaming" } };
}

test("material slots scale from zero to three and preserve native property effects without potency", () => {
  fixture();
  assert.deepEqual([1,2,3,4,5,6].map(tier => materialRuneSlots({ type: "weapon", flags: { [MODULE_ID]: { material: "metal", tier } } }, normalized)), [0,1,2,3,3,3]);
  class Weapon {
    prepareBaseData() { this.system.runes.property = this.system.runes.property.slice(0, this.system.runes.potency); this.nativeCalled = true; }
  }
  installMaterialRuneSlots({ weapon: Weapon });
  const item = new Weapon();
  Object.assign(item, { type: "weapon", flags: { [MODULE_ID]: { material: "metal", tier: 2 } }, system: { runes: { potency: 0, striking: 2, property: ["flaming"] } } });
  item.prepareBaseData();
  assert.deepEqual(item.system.runes, { potency: 0, striking: 2, property: ["flaming"] });
  assert.equal(item.nativeCalled, true);
});

test("mana tier gates standard rune levels and higher-grade replacements", async () => {
  const { item } = fixture();
  assert.equal((await propertyRuneChoices(item, 2)).length, 0);
  assert.deepEqual((await propertyRuneChoices(item, 3)).map(r=>r.slug), ["flaming"]);
  item._source.system.runes.property = ["flaming"];
  assert.deepEqual((await propertyRuneChoices(item, 5)).map(r=>[r.slug,r.replaced]), [["greaterFlaming","flaming"]]);
  item._source.system.runes.property = ["greaterFlaming"];
  assert.equal((await propertyRuneChoices(item, 6)).length, 0);
});

test("enchanting spends one unit once and rejects duplicate, wrong-profession and insufficient-stock attempts", async () => {
  const f = fixture();
  await applyEnchantment(f.request, f.user);
  assert.equal(f.gem.system.quantity, 1);
  assert.deepEqual(f.item._source.system.runes.property, ["flaming"]);
  await assert.rejects(applyEnchantment(f.request, f.user), /not eligible/);
  assert.equal(f.gem.system.quantity, 1);
  f.artisan.items = [];
  await assert.rejects(applyEnchantment(f.request, f.user), /Enchanting artisan/);
  const g = fixture(); g.gem.system.quantity = 0;
  await assert.rejects(applyEnchantment(g.request, g.user), /unreserved Mana Gem/);
});

test("failed item updates restore the spent Mana Gem", async () => {
  const f = fixture(); f.item.update = async () => { throw new Error("update failed"); };
  await assert.rejects(applyEnchantment(f.request, f.user), /update failed/);
  assert.equal(f.gem.system.quantity, 2);
});

test("specializations default off and ordinary Leatherwork qualifies for dragon scales", () => {
  fixture();
  assert.equal(specializationsEnabled(), false);
  assert.equal(hasWyrmcraft({ professions: [{ id: "leatherwork" }] }), true);
  assert.equal(hasWyrmcraft({ professions: [{ id: "blacksmithing" }] }), false);
});


test("enchant dialogs resolve equipment despite the native form item method and offer rune details", async () => {
  const f = fixture();
  f.party.items.push(f.item);
  game.actors.contents = [...game.actors.values()];
  let dialogs = 0, opened = false, detailsClick;
  globalThis.fromUuid = async uuid => uuid.startsWith("Compendium.") ? {
    system: { description: { value: "Adds fire damage to attacks." } },
    sheet: { render: () => { opened = true; } },
  } : f.item;
  globalThis.document = { createElement: () => ({ set innerHTML(value) { this.textContent = value; } }) };
  globalThis.foundry = { applications: {
    ux: { TextEditor: { implementation: { enrichHTML: async text => text } } },
    api: { DialogV2: { wait: async config => {
      dialogs++;
      if (dialogs === 1) {
        const values = { artisan: f.artisan.id, item: f.item.uuid, gem: f.gem.id };
        return config.buttons[0].callback(null, { form: { elements: {
          item: () => {}, namedItem: name => ({ value: values[name] }),
        } } });
      }
      assert.match(config.content, /Flaming/);
      assert.match(config.content, /Adds fire damage/);
      assert.match(config.content, /type="radio"/);
      assert.match(config.content, /fa-bookmark/);
      config.render(null, { element: { querySelectorAll: () => [{
        dataset: { runeDetails: "Compendium.pf2e.equipment-srd.Item.flame" },
        addEventListener: (_event, callback) => { detailsClick = callback; },
      }] } });
      await detailsClick({ preventDefault() {} });
      return null;
    } } },
  } };
  try {
    await openEnchanting(f.party);
    assert.equal(dialogs, 2);
    assert.equal(opened, true);
    assert.equal(f.gem.system.quantity, 2, "browsing and cancelling never consumes resources");
  } finally { delete globalThis.document; delete globalThis.foundry; }
});

test("a missing equipment selection has a readable error", async () => {
  await assert.rejects(propertyRuneChoices(undefined, 2), /selected equipment is no longer available/);
});


test("planned enchantments require an enchanter and valid material slots and Mana Gem tier", async () => {
  const { item } = fixture();
  const state = { tab: "craft", materialId: "metal", tier: 2, enchantments: [{ slug: "flaming", name: "Flaming", tier: 3 }] };
  const profiles = [{ professions: [{ id: "enchanting" }] }];
  await validateCraftingEnchantments(item, state, profiles);
  await assert.rejects(validateCraftingEnchantments(item, state, []), /Assign an Enchanting artisan/);
  await assert.rejects(validateCraftingEnchantments(item, { ...state, tier: 1 }, profiles), /no longer fits/);
  await assert.rejects(validateCraftingEnchantments(item, { ...state, enchantments: [{ ...state.enchantments[0], tier: 2 }] }, profiles), /no longer fits/);
  await assert.rejects(validateCraftingEnchantments(item, { ...state, enchantments: [...state.enchantments, ...state.enchantments] }, profiles), /no longer fits/);
});

test("crafting reserves one gem per rune regardless of size and preserves runes through completion", () => {
  const { item } = fixture();
  item.system.category = "martial";
  item.toObject = () => ({ name: item.name, type: item.type, system: structuredClone(item.system), flags: structuredClone(item.flags) });
  const enchantments = [{ slug: "flaming", name: "Flaming", tier: 3 }];
  const recipe = addEnchantmentCosts(scaleEquipmentRecipe(buildCraftingRecipeFromBand("weapon-sword", { targetItem: item, tier: 2 }), "grg"), enchantments);
  const cost = recipe.ingredientSets[0].groups.find(group => group.id === "enchantment-0");
  assert.deepEqual(cost.options, [{ materialId: "mana-crystals", tier: 3, tierMode: "minimum", maximumTier: 3, units: 1 }]);
  const project = normalizeCraftingProject(createCraftingProject({ recipe, coreMaterialId: "metal", coreTier: 2, enchantments }));
  assert.deepEqual(project.enchantments, enchantments);
  const source = buildCompletedItemSource(project, item, normalized);
  assert.deepEqual(source.system.runes.property, ["flaming"]);
  assert.deepEqual(item.system.runes.property, [], "planning does not alter the source item");
  assert.deepEqual(plannedEquipment(item, { materialId: "metal", tier: 2 }, enchantments).system.runes.property, ["flaming"]);
});
