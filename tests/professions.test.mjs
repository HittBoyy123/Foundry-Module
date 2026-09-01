import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PF2E_PROFESSION_FEAT_UUIDS,
  PROFESSION_DEFINITIONS,
  PROFESSION_ITEM_SOURCES,
} from "../content/professions.js";
import {
  createEnchantingSpecialtySource,
  createProfessionLoreSource,
  createProfessionSpecialtyLoreSource,
  createProfessionSpecialtySource,
  getActorProfession,
  getActorProfessionFeatGroups,
  getActorProfessionPlan,
  getActorProfessions,
  getProfessionData,
  getProfessionSpecialty,
  professionCheckRollOptions,
  professionRankForLevel,
  setActorProfessionPlan,
  synchronizeProfessionFeatHierarchy,
  synchronizeActorProfession,
} from "../scripts/professions.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_ID = "pf2e-crafting-material-tiers";

function professionItem(id) {
  return PROFESSION_ITEM_SOURCES.find((item) => item.flags[MODULE_ID].profession.id === id);
}

function selectedProfessionItem(id, role, milestoneLevel) {
  const item = structuredClone(professionItem(id));
  item.id = item._id;
  item.flags[MODULE_ID].professionSelection = {
    schemaVersion: 1,
    role,
    milestoneLevel,
  };
  return item;
}

test("the profession catalogue contains all eleven requested professions", () => {
  assert.deepEqual(PROFESSION_DEFINITIONS.map((profession) => profession.id), [
    "blacksmithing",
    "alchemy",
    "enchanting",
    "leatherwork",
    "carpentry",
    "stonemason",
    "glassmaking",
    "pottery",
    "weaving",
    "bookmaking",
    "tailoring",
  ]);
  assert.equal(PROFESSION_ITEM_SOURCES.length, 11);
  assert.equal(new Set(PROFESSION_ITEM_SOURCES.map((item) => item._id)).size, 11);
  assert.equal(PROFESSION_ITEM_SOURCES.every((item) => /^[A-Za-z0-9]{16}$/u.test(item._id)), true);
});

test("profession items provide three future specialties and a relevant +2 modifier", () => {
  for (const item of PROFESSION_ITEM_SOURCES) {
    const profession = getProfessionData(item);
    assert.ok(profession);
    assert.equal(item.type, "feat");
    assert.equal(item.system.category, "bonus");
    assert.equal(profession.specialties.length, 3);
    assert.equal(profession.checkBonus, 2);
    assert.equal(profession.checkBonusType, "circumstance");
    assert.equal(item.system.rules.filter((rule) => rule.key === "FlatModifier").length, 5);
    assert.equal(item.system.rules.some((rule) => rule.selector === `${profession.id}-lore` && !rule.predicate), true);
    assert.match(item.system.description.value, /trained at level 1, expert at level 3, master at level 7, and legendary at level 15/i);
  }
});

test("profession Lore advances at the requested character levels", () => {
  assert.deepEqual([1, 3, 4, 7, 10, 15, 16, 20].map(professionRankForLevel), [1, 2, 2, 3, 3, 4, 4, 4]);
  const lore = createProfessionLoreSource(getProfessionData(professionItem("blacksmithing")), 10);
  assert.equal(lore.type, "lore");
  assert.equal(lore.name, "Blacksmithing");
  assert.equal(lore.system.proficient.value, 3);
  assert.deepEqual(lore.flags[MODULE_ID].professionGrant, {
    schemaVersion: 2,
    professionId: "blacksmithing",
    kind: "lore",
  });
});

test("profession skill names omit the redundant Lore suffix and legacy entries migrate", () => {
  for (const item of PROFESSION_ITEM_SOURCES) {
    const profession = getProfessionData(item);
    assert.doesNotMatch(profession.loreName, /\sLore$/u);
  }
  const legacy = structuredClone(professionItem("enchanting"));
  legacy.flags[MODULE_ID].profession.schemaVersion = 1;
  legacy.flags[MODULE_ID].profession.loreName = "Enchanting Lore";
  assert.equal(getProfessionData(legacy).loreName, "Enchanting");
});

test("profession milestone specialties create visible feats and Lore at the same progression", () => {
  const profession = getProfessionData(professionItem("blacksmithing"));
  const specialty = createProfessionSpecialtySource(profession, "specialty-1", 4);
  assert.equal(specialty.type, "feat");
  assert.equal(getProfessionSpecialty(specialty).milestoneLevel, 4);
  assert.equal(getProfessionSpecialty(specialty).professionId, "blacksmithing");
  const lore = createProfessionSpecialtyLoreSource(profession, "specialty-1", 4, 7);
  assert.equal(lore.name, "Blacksmithing: Specialty I");
  assert.equal(lore.system.proficient.value, 3);
  assert.deepEqual(lore.flags[MODULE_ID].professionGrant, {
    schemaVersion: 2,
    professionId: "blacksmithing",
    kind: "specialty-lore",
    specialtyId: "specialty-1",
    milestoneLevel: 4,
  });
});

test("profession feat groups keep each profession as the parent of only its module-granted feats", () => {
  const blacksmith = selectedProfessionItem("blacksmithing", "primary", 1);
  const alchemist = selectedProfessionItem("alchemy", "milestone", 4);
  const specialty = createProfessionSpecialtySource(getProfessionData(blacksmith), "specialty-1", 10);
  specialty.id = "BlacksmithSpecialty";
  const additionalLore = {
    id: "BlacksmithAdditionalLore",
    name: "Additional Lore (Blacksmithing)",
    type: "feat",
    flags: { [MODULE_ID]: { professionGrant: { professionId: "blacksmithing", kind: "additional-lore" } } },
  };
  const alchemyCrafting = {
    id: "AlchemySpecialtyCrafting",
    name: "Specialty Crafting (Alchemy)",
    type: "feat",
    flags: { [MODULE_ID]: { professionGrant: { professionId: "alchemy", kind: "specialty-crafting" } } },
  };
  const loreSkill = {
    id: "BlacksmithLoreSkill",
    name: "Blacksmithing",
    type: "lore",
    flags: { [MODULE_ID]: { professionGrant: { professionId: "blacksmithing", kind: "lore" } } },
  };
  const actor = { level: 10, items: [blacksmith, alchemist, specialty, additionalLore, alchemyCrafting, loreSkill] };
  const groups = getActorProfessionFeatGroups(actor);
  assert.deepEqual(groups.map((group) => group.professionId), ["blacksmithing", "alchemy"]);
  assert.deepEqual(groups[0].children.map((item) => item.id), ["BlacksmithSpecialty", "BlacksmithAdditionalLore"]);
  assert.deepEqual(groups[1].children.map((item) => item.id), ["AlchemySpecialtyCrafting"]);
});

test("profession hierarchy writes native PF2e nested grant links without replacing unrelated grants", async () => {
  const parent = selectedProfessionItem("blacksmithing", "primary", 1);
  parent.flags.pf2e = { itemGrants: { existingGrant: { id: "UnrelatedFeat", onDelete: "restrict" } } };
  const child = {
    id: "ProfessionChild",
    name: "Specialty Crafting (Blacksmithing)",
    type: "feat",
    flags: { [MODULE_ID]: { professionGrant: { professionId: "blacksmithing", kind: "specialty-crafting" } } },
  };
  const updates = [];
  const actor = {
    level: 1,
    items: [parent, child],
    async updateEmbeddedDocuments(_type, itemUpdates) {
      updates.push(...itemUpdates);
    },
  };
  assert.equal(await synchronizeProfessionFeatHierarchy(actor), true);
  const parentUpdate = updates.find((update) => update._id === parent.id);
  const childUpdate = updates.find((update) => update._id === child.id);
  assert.deepEqual(parentUpdate["flags.pf2e.itemGrants"], {
    existingGrant: { id: "UnrelatedFeat", onDelete: "restrict" },
    wrathmakerProfessionProfessionChild: { id: "ProfessionChild", onDelete: "detach", nested: true },
  });
  assert.deepEqual(childUpdate["flags.pf2e.grantedBy"], { id: parent.id, onDelete: "detach" });
});

test("profession checks activate only for related Wrathmaker materials", () => {
  const blacksmith = professionItem("blacksmithing");
  const actor = { items: [blacksmith] };
  assert.equal(getActorProfession(actor).name, "Blacksmithing");
  assert.deepEqual(professionCheckRollOptions(actor, { materialId: "metal" }), [
    "wrathmaker:profession-check:blacksmithing",
  ]);
  assert.deepEqual(professionCheckRollOptions(actor, { materialId: "wood" }), []);
  const leatherworker = { items: [professionItem("leatherwork")] };
  assert.equal(professionCheckRollOptions(leatherworker, { materialId: "dragon-scale" }).length, 1);
});

test("milestone professions remain active together and are limited by character level", () => {
  const primary = selectedProfessionItem("blacksmithing", "primary", 1);
  const second = selectedProfessionItem("alchemy", "milestone", 4);
  const third = selectedProfessionItem("carpentry", "milestone", 10);
  const actor = { level: 9, items: [primary, second, third] };
  assert.deepEqual(getActorProfessions(actor).map((profession) => profession.id), ["blacksmithing", "alchemy"]);
  assert.equal(getActorProfession(actor).id, "blacksmithing");
  assert.deepEqual(professionCheckRollOptions(actor, { materialId: "herbs" }), [
    "wrathmaker:profession-check:alchemy",
  ]);
  assert.deepEqual(professionCheckRollOptions(actor, { materialId: "wood" }), []);
  actor.level = 10;
  assert.deepEqual(getActorProfessions(actor).map((profession) => profession.id), [
    "blacksmithing",
    "alchemy",
    "carpentry",
  ]);
});

test("profession plans distinguish a starting profession from level 4, 10, and 16 choices", () => {
  const primary = selectedProfessionItem("blacksmithing", "primary", 1);
  const second = selectedProfessionItem("alchemy", "milestone", 4);
  const specialty = createProfessionSpecialtySource(getProfessionData(primary), "specialty-2", 10);
  specialty.id = "SpecialtyChoice1";
  const plan = getActorProfessionPlan({ level: 10, items: [primary, second, specialty] });
  assert.equal(plan.primary.id, "blacksmithing");
  assert.deepEqual(plan.milestones, [
    { milestoneLevel: 4, kind: "profession", professionId: "alchemy", specialtyId: "" },
    { milestoneLevel: 10, kind: "specialty", professionId: "blacksmithing", specialtyId: "specialty-2" },
    { milestoneLevel: 16, kind: "", professionId: "", specialtyId: "" },
  ]);
});

test("the five determined professions reference the correct current PF2e feats", () => {
  assert.equal(getProfessionData(professionItem("blacksmithing")).bonusFeatUuid, PF2E_PROFESSION_FEAT_UUIDS.quickRepair);
  assert.equal(getProfessionData(professionItem("alchemy")).bonusFeatUuid, PF2E_PROFESSION_FEAT_UUIDS.alchemicalCrafting);
  assert.equal(getProfessionData(professionItem("enchanting")).bonusFeatUuid, PF2E_PROFESSION_FEAT_UUIDS.magicalCrafting);
  assert.equal(getProfessionData(professionItem("leatherwork")).bonusFeatUuid, PF2E_PROFESSION_FEAT_UUIDS.experiencedTracker);
  assert.equal(getProfessionData(professionItem("carpentry")).bonusFeatUuid, PF2E_PROFESSION_FEAT_UUIDS.heftyHauler);
  assert.equal(getProfessionData(professionItem("stonemason")).bonusFeatUuid, "");
});

test("Enchanting receives a custom Specialty Crafting implementation", () => {
  const source = createEnchantingSpecialtySource(getProfessionData(professionItem("enchanting")));
  assert.equal(source.name, "Specialty Crafting (Enchanting)");
  assert.deepEqual(source.system.rules[0].predicate, ["action:craft", "enchanting"]);
  assert.equal(source.flags[MODULE_ID].professionGrant.kind, "specialty-crafting");
});

test("profession synchronization creates PF2e-visible grants and advances only its Lore", async () => {
  const originalGame = globalThis.game;
  const originalFromUuid = globalThis.fromUuid;
  globalThis.game = { user: { isGM: true } };
  globalThis.fromUuid = async (uuid) => ({
    toObject: () => ({
      _id: "CompendiumItem",
      _stats: { compendiumSource: uuid },
      img: "icons/sundries/books/book-red-exclamation.webp",
      name: uuid === PF2E_PROFESSION_FEAT_UUIDS.specialtyCrafting ? "Specialty Crafting" : "Granted Feat",
      system: {
        rules: uuid === PF2E_PROFESSION_FEAT_UUIDS.specialtyCrafting
          ? [{ key: "ChoiceSet", flag: "specialtyCrafting" }, { key: "FlatModifier" }]
          : [],
      },
      type: "feat",
    }),
  });

  try {
    const profession = structuredClone(professionItem("blacksmithing"));
    profession.id = profession._id;
    profession.flags[MODULE_ID].profession.schemaVersion = 1;
    profession.flags[MODULE_ID].profession.loreName = "Blacksmithing Lore";
    profession.system.description.value = "Old profession progression";
    const items = [profession];
    let nextId = 1;
    const actor = {
      id: "Hero1",
      type: "character",
      isOwner: true,
      level: 4,
      items: { contents: items },
      async createEmbeddedDocuments(_type, sources) {
        const created = sources.map((source) => ({
          ...structuredClone(source),
          id: `Grant${nextId++}`,
        }));
        items.push(...created);
        return created;
      },
      async deleteEmbeddedDocuments(_type, ids) {
        for (const id of ids) {
          const index = items.findIndex((item) => item.id === id);
          if (index >= 0) items.splice(index, 1);
        }
      },
      async updateEmbeddedDocuments(_type, updates) {
        for (const update of updates) {
          const item = items.find((entry) => entry.id === update._id);
          if (!item) continue;
          if (Object.hasOwn(update, "system.proficient.value")) item.system.proficient.value = update["system.proficient.value"];
          if (Object.hasOwn(update, "system.description.value")) item.system.description.value = update["system.description.value"];
          if (Object.hasOwn(update, "system.rules")) item.system.rules = structuredClone(update["system.rules"]);
          if (Object.hasOwn(update, "img")) item.img = update.img;
          if (Object.hasOwn(update, "name")) item.name = update.name;
          const professionKey = `flags.${MODULE_ID}.profession`;
          if (Object.hasOwn(update, professionKey)) item.flags[MODULE_ID].profession = structuredClone(update[professionKey]);
          const selectionKey = `flags.${MODULE_ID}.professionSelection`;
          if (Object.hasOwn(update, selectionKey)) item.flags[MODULE_ID].professionSelection = structuredClone(update[selectionKey]);
          if (Object.hasOwn(update, "flags.pf2e.itemGrants")) {
            item.flags.pf2e ??= {};
            item.flags.pf2e.itemGrants = structuredClone(update["flags.pf2e.itemGrants"]);
          }
          if (Object.hasOwn(update, "flags.pf2e.grantedBy")) {
            item.flags.pf2e ??= {};
            item.flags.pf2e.grantedBy = structuredClone(update["flags.pf2e.grantedBy"]);
          }
        }
      },
    };

    assert.equal(await synchronizeActorProfession(actor), true);
    const grants = items.filter((item) => item.flags?.[MODULE_ID]?.professionGrant);
    assert.deepEqual(grants.map((item) => item.flags[MODULE_ID].professionGrant.kind).sort(), [
      "additional-lore",
      "bonus-feat",
      "lore",
      "specialty-crafting",
    ]);
    const lore = grants.find((item) => item.type === "lore");
    assert.equal(lore.system.proficient.value, 2);
    assert.equal(lore.name, "Blacksmithing");
    assert.equal(profession.flags[MODULE_ID].profession.schemaVersion, 2);
    assert.match(profession.system.description.value, /expert at level 3/i);
    const specialty = grants.find((item) => item.flags[MODULE_ID].professionGrant.kind === "specialty-crafting");
    assert.equal(specialty.system.rules[0].selection, "blacksmithing");
    assert.deepEqual(specialty.flags.pf2e.grantedBy, { id: profession.id, onDelete: "detach" });
    assert.equal(Object.values(profession.flags.pf2e.itemGrants).length, 3);
    assert.equal(Object.values(profession.flags.pf2e.itemGrants).every((grant) => grant.nested === true), true);

    actor.level = 16;
    assert.equal(await synchronizeActorProfession(actor), true);
    assert.equal(lore.system.proficient.value, 4);
  } finally {
    globalThis.game = originalGame;
    globalThis.fromUuid = originalFromUuid;
  }
});

test("a level 10 character can combine a starting profession, a new profession, and a specialty", async () => {
  const originalGame = globalThis.game;
  const originalFromUuid = globalThis.fromUuid;
  globalThis.game = {
    user: { isGM: true },
    packs: new Map([[
      `${MODULE_ID}.professions`,
      { getDocuments: async () => PROFESSION_ITEM_SOURCES.map((source) => structuredClone(source)) },
    ]]),
  };
  globalThis.fromUuid = async (uuid) => ({
    toObject: () => ({
      _id: "CompendiumItem",
      _stats: { compendiumSource: uuid },
      img: "icons/sundries/books/book-red-exclamation.webp",
      name: uuid === PF2E_PROFESSION_FEAT_UUIDS.specialtyCrafting ? "Specialty Crafting" : "Granted Feat",
      system: {
        rules: uuid === PF2E_PROFESSION_FEAT_UUIDS.specialtyCrafting
          ? [{ key: "ChoiceSet", flag: "specialtyCrafting" }]
          : [],
      },
      type: "feat",
    }),
  });

  try {
    const items = [];
    let nextId = 1;
    const actor = {
      id: "HeroPlan",
      type: "character",
      isOwner: true,
      level: 10,
      items: { contents: items },
      async createEmbeddedDocuments(_type, sources) {
        const created = sources.map((source) => ({
          ...structuredClone(source),
          id: `PlanItem${nextId++}`,
        }));
        items.push(...created);
        return created;
      },
      async deleteEmbeddedDocuments(_type, ids) {
        for (const id of ids) {
          const index = items.findIndex((item) => item.id === id);
          if (index >= 0) items.splice(index, 1);
        }
      },
      async updateEmbeddedDocuments(_type, updates) {
        for (const update of updates) {
          const item = items.find((entry) => entry.id === update._id);
          if (!item) continue;
          if (Object.hasOwn(update, "system.proficient.value")) {
            item.system.proficient.value = update["system.proficient.value"];
          }
          const selectionKey = `flags.${MODULE_ID}.professionSelection`;
          if (Object.hasOwn(update, selectionKey)) {
            item.flags[MODULE_ID].professionSelection = structuredClone(update[selectionKey]);
          }
        }
      },
      render() {},
    };

    await setActorProfessionPlan(actor, {
      primaryProfessionId: "blacksmithing",
      milestones: [
        { milestoneLevel: 4, kind: "profession", professionId: "alchemy" },
        { milestoneLevel: 10, kind: "specialty", specialtyId: "specialty-1" },
      ],
    });

    assert.deepEqual(getActorProfessions(actor).map((profession) => profession.id), ["blacksmithing", "alchemy"]);
    const specialty = items.find((item) => getProfessionSpecialty(item));
    assert.equal(getProfessionSpecialty(specialty).milestoneLevel, 10);
    const loreNames = items
      .filter((item) => item.type === "lore")
      .map((item) => item.name)
      .sort();
    assert.deepEqual(loreNames, ["Alchemy", "Blacksmithing", "Blacksmithing: Specialty I"]);
    assert.equal(items.filter((item) => item.flags?.[MODULE_ID]?.professionGrant).length, 9);
  } finally {
    globalThis.game = originalGame;
    globalThis.fromUuid = originalFromUuid;
  }
});

test("the generated profession pack and manifest match the catalogue", async () => {
  const pack = await readFile(path.join(projectRoot, "packs", "professions.db"), "utf8");
  const entries = pack.trim().split(/\r?\n/u).map((line) => JSON.parse(line));
  assert.deepEqual(entries, PROFESSION_ITEM_SOURCES);

  const manifest = JSON.parse(await readFile(path.join(projectRoot, "module.json"), "utf8"));
  assert.deepEqual(manifest.packs.find((entry) => entry.name === "professions"), {
    name: "professions",
    label: "Wrathmaker Professions",
    path: "packs/professions.db",
    type: "Item",
    system: "pf2e",
    ownership: {
      PLAYER: "OBSERVER",
      TRUSTED: "OBSERVER",
      ASSISTANT: "OWNER",
    },
  });
});

test("Alchemy, Pottery, and Tailoring use bundled Wrathmaker artwork", async () => {
  for (const id of ["alchemy", "pottery", "tailoring"]) {
    const item = professionItem(id);
    assert.equal(item.img, `modules/${MODULE_ID}/assets/professions/${id}.png`);
    const image = await readFile(path.join(projectRoot, "assets", "professions", `${id}.png`));
    assert.ok(image.length > 10_000);
  }
});

test("the PF2e character overview exposes the profession picker and gathering uses its roll option", async () => {
  const [professionScript, pickerTemplate, gatheringScript, gatheringTemplate, mainScript, css] = await Promise.all([
    readFile(path.join(projectRoot, "scripts", "professions.js"), "utf8"),
    readFile(path.join(projectRoot, "templates", "profession-picker.hbs"), "utf8"),
    readFile(path.join(projectRoot, "scripts", "gathering.js"), "utf8"),
    readFile(path.join(projectRoot, "templates", "gathering.hbs"), "utf8"),
    readFile(path.join(projectRoot, "scripts", "main.js"), "utf8"),
    readFile(path.join(projectRoot, "styles", "module.css"), "utf8"),
  ]);

  assert.match(professionScript, /\.subsection\.details \.abcd/);
  assert.match(professionScript, /deity\.insertAdjacentElement\("afterend", field\)/);
  assert.match(professionScript, /templates\/profession-picker\.hbs/);
  assert.match(professionScript, /data-cmt-profession-feats/);
  assert.match(professionScript, /"flags\.pf2e\.itemGrants"/);
  assert.match(professionScript, /"flags\.pf2e\.grantedBy"/);
  assert.match(professionScript, /createEmbeddedDocuments\("Item", sources/);
  assert.match(professionScript, /"system\.proficient\.value"/);
  assert.match(pickerTemplate, /name="professionId"/);
  assert.match(pickerTemplate, /data-cmt-milestone="\{\{level\}\}"/);
  assert.match(pickerTemplate, /milestone\{\{level\}\}Specialty/);
  assert.match(pickerTemplate, /milestone\{\{level\}\}Profession/);
  assert.match(pickerTemplate, /data-action="removeProfession"/);
  assert.match(gatheringScript, /professionCheckRollOptions/);
  assert.match(gatheringTemplate, /professionBonus/);
  assert.match(mainScript, /registerProfessionHooks/);
  assert.match(css, /--cmt-profession-brown:\s*#605856/i);
  assert.match(css, /--cmt-profession-red:\s*#5e0000/i);
  assert.match(css, /--cmt-profession-soft:\s*#e7d9cf/i);
  assert.match(css, /--cmt-profession-yellow:\s*#e9d7a1/i);
  assert.match(css, /--cmt-profession-green:\s*#0d4b2a/i);
  assert.match(css, /\.cmt-profession-picker-header\s*\{[\s\S]*repeating-linear-gradient[\s\S]*var\(--cmt-profession-green\)/i);
  assert.match(css, /\.cmt-profession-feats\s*>\s*header/);
  assert.match(css, /\.cmt-profession-option-details small[\s\S]*white-space:\s*normal/i);
  assert.match(css, /\.cmt-profession-milestone-list/);
});
