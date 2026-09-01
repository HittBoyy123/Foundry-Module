import {
  PF2E_PROFESSION_FEAT_UUIDS,
  PROFESSION_DEFINITIONS,
  PROFESSION_ITEM_SOURCES,
  PROFESSION_SCHEMA_VERSION,
} from "../content/professions.js";
import { MODULE_ID } from "./constants.js";

export const PROFESSION_GRANT_SCHEMA_VERSION = 2;
export const PROFESSION_SELECTION_SCHEMA_VERSION = 1;
export const PROFESSION_MILESTONE_LEVELS = Object.freeze([4, 10, 16]);

const PROFESSION_BY_ID = new Map(PROFESSION_DEFINITIONS.map((profession) => [profession.id, profession]));
const PROFESSION_SOURCE_BY_ID = new Map(PROFESSION_ITEM_SOURCES.map((source) => [
  source.flags?.[MODULE_ID]?.profession?.id,
  source,
]));
const PROFESSION_GRANT_KINDS = Object.freeze({
  lore: "lore",
  additionalLore: "additional-lore",
  specialtyCrafting: "specialty-crafting",
  bonusFeat: "bonus-feat",
  specialtyLore: "specialty-lore",
});
const PROFESSION_SELECTION_ROLES = Object.freeze({
  primary: "primary",
  milestone: "milestone",
});
const PROFESSION_MILESTONE_KINDS = Object.freeze({
  profession: "profession",
  specialty: "specialty",
});
const PROFESSION_GRANT_LINK_PREFIX = "wrathmakerProfession";
const PROFESSION_FEAT_CHILD_ORDER = Object.freeze({
  specialty: 0,
  [PROFESSION_GRANT_KINDS.additionalLore]: 1,
  [PROFESSION_GRANT_KINDS.specialtyCrafting]: 2,
  [PROFESSION_GRANT_KINDS.bonusFeat]: 3,
});
const syncingActors = new Set();
const scheduledActors = new Map();
let ProfessionPickerApplication = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function localize(key, fallback = key) {
  const value = game.i18n.localize(key);
  return value === key ? fallback : value;
}

function actorItems(actor) {
  if (Array.isArray(actor?.items?.contents)) return actor.items.contents;
  if (actor?.items && Symbol.iterator in Object(actor.items)) return Array.from(actor.items);
  return [];
}

function moduleFlags(item) {
  return item?.getFlag?.(MODULE_ID) ?? item?.flags?.[MODULE_ID] ?? null;
}

function itemId(item) {
  return item?.id ?? item?._id ?? null;
}

function actorId(actor) {
  return actor?.uuid ?? actor?.id ?? actor?._id ?? null;
}

function actorLevel(actor) {
  return Math.max(1, Math.trunc(Number(actor?.level ?? actor?.system?.details?.level?.value) || 1));
}

function sourceUuid(item) {
  return item?.sourceId ?? item?._stats?.compendiumSource ?? item?._source?._stats?.compendiumSource ?? "";
}

function attachGrantFlags(source, professionId, kind, extra = {}) {
  source.flags ??= {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    professionGrant: {
      schemaVersion: PROFESSION_GRANT_SCHEMA_VERSION,
      professionId,
      kind,
      ...extra,
    },
  };
  return source;
}

function attachSelectionFlags(source, role, milestoneLevel = 1) {
  source.flags ??= {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    professionSelection: {
      schemaVersion: PROFESSION_SELECTION_SCHEMA_VERSION,
      role,
      milestoneLevel,
    },
  };
  return source;
}

function cloneDocumentSource(document) {
  const source = typeof document?.toObject === "function" ? document.toObject() : clone(document);
  delete source._id;
  delete source.folder;
  return source;
}

export function professionRankForLevel(level) {
  const current = Math.max(1, Math.trunc(Number(level) || 1));
  if (current >= 15) return 4;
  if (current >= 7) return 3;
  if (current >= 3) return 2;
  return 1;
}

export function professionRankLabel(rank) {
  return ["Untrained", "Trained", "Expert", "Master", "Legendary"][Number(rank)] ?? "Untrained";
}

export function normalizeProfessionData(value) {
  const id = String(value?.id ?? "").trim().toLowerCase();
  const definition = PROFESSION_BY_ID.get(id);
  if (!definition) return null;
  const schemaVersion = Math.max(1, Math.trunc(Number(value?.schemaVersion) || 1));
  const suppliedLoreName = String(value?.loreName ?? "").trim();
  const loreName = schemaVersion < 2 && /\s+lore$/iu.test(suppliedLoreName)
    ? definition.loreName
    : suppliedLoreName || definition.loreName;
  return {
    schemaVersion: PROFESSION_SCHEMA_VERSION,
    id: definition.id,
    name: definition.name,
    loreName,
    craftingSpecialty: String(value?.craftingSpecialty ?? definition.craftingSpecialty).trim()
      || definition.craftingSpecialty,
    materialIds: [...new Set(Array.isArray(value?.materialIds) ? value.materialIds : definition.materialIds)]
      .map((materialId) => String(materialId).trim())
      .filter(Boolean),
    checkBonus: Number.isFinite(Number(value?.checkBonus)) ? Number(value.checkBonus) : definition.checkBonus,
    checkBonusType: String(value?.checkBonusType ?? definition.checkBonusType).trim() || "circumstance",
    bonusFeatUuid: String(value?.bonusFeatUuid ?? definition.bonusFeatUuid).trim(),
    bonusFeatName: String(value?.bonusFeatName ?? definition.bonusFeatName).trim() || "To be determined",
    specialties: clone(Array.isArray(value?.specialties) ? value.specialties : definition.specialties),
  };
}

export function getProfessionData(item) {
  if (item?.type !== "feat") return null;
  return normalizeProfessionData(moduleFlags(item)?.profession);
}

export function getProfessionGrant(item) {
  const grant = moduleFlags(item)?.professionGrant;
  const professionId = String(grant?.professionId ?? "").trim().toLowerCase();
  const kind = String(grant?.kind ?? "").trim();
  if (!PROFESSION_BY_ID.has(professionId) || !Object.values(PROFESSION_GRANT_KINDS).includes(kind)) return null;
  const normalized = {
    schemaVersion: PROFESSION_GRANT_SCHEMA_VERSION,
    professionId,
    kind,
  };
  if (kind === PROFESSION_GRANT_KINDS.specialtyLore) {
    const specialtyId = String(grant?.specialtyId ?? "").trim().toLowerCase();
    const milestoneLevel = Math.trunc(Number(grant?.milestoneLevel) || 0);
    if (!specialtyId || !PROFESSION_MILESTONE_LEVELS.includes(milestoneLevel)) return null;
    normalized.specialtyId = specialtyId;
    normalized.milestoneLevel = milestoneLevel;
  }
  return normalized;
}

export function getProfessionSelection(item) {
  if (!getProfessionData(item)) return null;
  const selection = moduleFlags(item)?.professionSelection;
  const role = String(selection?.role ?? "").trim();
  const milestoneLevel = Math.trunc(Number(selection?.milestoneLevel) || 0);
  if (role === PROFESSION_SELECTION_ROLES.primary) {
    return {
      schemaVersion: PROFESSION_SELECTION_SCHEMA_VERSION,
      role,
      milestoneLevel: 1,
    };
  }
  if (role === PROFESSION_SELECTION_ROLES.milestone && PROFESSION_MILESTONE_LEVELS.includes(milestoneLevel)) {
    return {
      schemaVersion: PROFESSION_SELECTION_SCHEMA_VERSION,
      role,
      milestoneLevel,
    };
  }
  return null;
}

export function getProfessionSpecialty(item) {
  const specialty = moduleFlags(item)?.professionSpecialty;
  const professionId = String(specialty?.professionId ?? "").trim().toLowerCase();
  const specialtyId = String(specialty?.specialtyId ?? "").trim().toLowerCase();
  const milestoneLevel = Math.trunc(Number(specialty?.milestoneLevel) || 0);
  const definition = PROFESSION_BY_ID.get(professionId);
  const specialtyDefinition = definition?.specialties.find((entry) => entry.id === specialtyId);
  if (!definition || !specialtyDefinition || !PROFESSION_MILESTONE_LEVELS.includes(milestoneLevel)) return null;
  return {
    schemaVersion: PROFESSION_SELECTION_SCHEMA_VERSION,
    professionId,
    specialtyId,
    milestoneLevel,
    name: specialtyDefinition.label,
    description: specialtyDefinition.description,
  };
}

function professionEntries(actor) {
  return actorItems(actor)
    .map((item) => {
      const profession = getProfessionData(item);
      return profession ? { ...profession, item, selection: getProfessionSelection(item) } : null;
    })
    .filter(Boolean);
}

export function getActorProfessions(actor) {
  const entries = professionEntries(actor);
  if (entries.length === 0) return [];
  const primary = entries.find((entry) => entry.selection?.role === PROFESSION_SELECTION_ROLES.primary) ?? entries[0];
  const level = actorLevel(actor);
  const milestones = entries
    .filter((entry) => (
      entry !== primary
      && entry.selection?.role === PROFESSION_SELECTION_ROLES.milestone
      && level >= entry.selection.milestoneLevel
    ))
    .sort((left, right) => left.selection.milestoneLevel - right.selection.milestoneLevel);
  return [primary, ...milestones];
}

export function getActorProfession(actor) {
  return getActorProfessions(actor)[0] ?? null;
}

function professionFeatChildOrder(item) {
  const specialty = getProfessionSpecialty(item);
  if (specialty) {
    return [PROFESSION_FEAT_CHILD_ORDER.specialty, specialty.milestoneLevel, item.name ?? ""];
  }
  const grant = getProfessionGrant(item);
  return [PROFESSION_FEAT_CHILD_ORDER[grant?.kind] ?? 99, 0, item.name ?? ""];
}

/** Return the module-owned feat tree shown in the character sheet's Profession Feats section. */
export function getActorProfessionFeatGroups(actor) {
  const items = actorItems(actor);
  return getActorProfessions(actor).map((profession) => {
    const children = items
      .filter((item) => {
        if (item?.type !== "feat" || item === profession.item) return false;
        const specialty = getProfessionSpecialty(item);
        const grant = getProfessionGrant(item);
        return specialty?.professionId === profession.id || grant?.professionId === profession.id;
      })
      .sort((left, right) => {
        const leftOrder = professionFeatChildOrder(left);
        const rightOrder = professionFeatChildOrder(right);
        return leftOrder[0] - rightOrder[0]
          || leftOrder[1] - rightOrder[1]
          || String(leftOrder[2]).localeCompare(String(rightOrder[2]), globalThis.game?.i18n?.lang);
      });
    return {
      professionId: profession.id,
      parent: profession.item,
      children,
    };
  });
}

function sameData(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

/** Establish native PF2e grant links so profession feats prepare as parent/child feat trees. */
export async function synchronizeProfessionFeatHierarchy(actor) {
  const updates = new Map();
  for (const group of getActorProfessionFeatGroups(actor)) {
    const parentId = itemId(group.parent);
    if (!parentId) continue;
    const existingGrants = group.parent?.flags?.pf2e?.itemGrants ?? {};
    const desiredGrants = Object.fromEntries(Object.entries(existingGrants)
      .filter(([key]) => !key.startsWith(PROFESSION_GRANT_LINK_PREFIX)));
    for (const child of group.children) {
      const childId = itemId(child);
      if (!childId) continue;
      desiredGrants[`${PROFESSION_GRANT_LINK_PREFIX}${childId}`] = {
        id: childId,
        onDelete: "detach",
        nested: true,
      };
      const desiredGrantedBy = { id: parentId, onDelete: "detach" };
      if (!sameData(child?.flags?.pf2e?.grantedBy, desiredGrantedBy)) {
        updates.set(childId, {
          ...(updates.get(childId) ?? { _id: childId }),
          "flags.pf2e.grantedBy": desiredGrantedBy,
        });
      }
    }
    if (!sameData(existingGrants, desiredGrants)) {
      updates.set(parentId, {
        ...(updates.get(parentId) ?? { _id: parentId }),
        "flags.pf2e.itemGrants": desiredGrants,
      });
    }
  }
  if (updates.size === 0) return false;
  await actor.updateEmbeddedDocuments("Item", [...updates.values()], { render: false });
  return true;
}

export function professionCheckRollOptions(actor, { materialId = "" } = {}) {
  const material = String(materialId).trim();
  if (!material) return [];
  return getActorProfessions(actor)
    .filter((profession) => profession.materialIds.includes(material))
    .map((profession) => `wrathmaker:profession-check:${profession.id}`);
}

export function createProfessionLoreSource(professionValue, level = 1) {
  const profession = normalizeProfessionData(professionValue);
  if (!profession) throw new TypeError("A valid Wrathmaker profession is required.");
  const rank = professionRankForLevel(level);
  return attachGrantFlags({
    img: "systems/pf2e/icons/default-icons/lore.svg",
    name: profession.loreName,
    system: {
      description: {
        value: `<p>Knowledge and practical experience gained through the <strong>${profession.name}</strong> profession.</p><p>Wrathmaker automatically advances this Lore to expert at level 3, master at level 7, and legendary at level 15.</p>`,
      },
      mod: { value: 0 },
      proficient: { value: rank },
      publication: { license: "ORC", remaster: true, title: "Wrathmaker" },
      rules: [],
      slug: `${profession.id}-lore`,
      traits: {},
    },
    type: "lore",
  }, profession.id, PROFESSION_GRANT_KINDS.lore);
}

export function createProfessionSpecialtySource(professionValue, specialtyId, milestoneLevel) {
  const profession = normalizeProfessionData(professionValue);
  const specialty = profession?.specialties.find((entry) => entry.id === String(specialtyId ?? "").trim().toLowerCase());
  const level = Math.trunc(Number(milestoneLevel) || 0);
  if (!profession || !specialty || !PROFESSION_MILESTONE_LEVELS.includes(level)) {
    throw new TypeError("A valid profession specialty and milestone level are required.");
  }
  return {
    img: PROFESSION_BY_ID.get(profession.id)?.img ?? "icons/tools/smithing/anvil.webp",
    name: `${profession.name}: ${specialty.label}`,
    system: {
      actionType: { value: "passive" },
      actions: { value: null },
      category: "bonus",
      description: {
        value: `<p><strong>${specialty.label}</strong> is a level ${level} specialty of the ${profession.name} profession.</p><p>${specialty.description}</p><p>Its Lore proficiency follows the profession progression: expert at level 3, master at level 7, and legendary at level 15.</p>`,
      },
      level: { value: level },
      maxTakable: 1,
      prerequisites: { value: [{ value: `${profession.name} profession` }] },
      publication: { license: "ORC", remaster: true, title: "Wrathmaker" },
      rules: [{
        key: "RollOption",
        domain: "all",
        option: `wrathmaker:profession-specialty:${profession.id}:${specialty.id}`,
      }],
      slug: `wrathmaker-profession-specialty-${profession.id}-${specialty.id}`,
      traits: { rarity: "common", value: ["general", "skill"] },
    },
    type: "feat",
    flags: {
      [MODULE_ID]: {
        professionSpecialty: {
          schemaVersion: PROFESSION_SELECTION_SCHEMA_VERSION,
          professionId: profession.id,
          specialtyId: specialty.id,
          milestoneLevel: level,
        },
      },
    },
  };
}

export function createProfessionSpecialtyLoreSource(professionValue, specialtyId, milestoneLevel, level = 1) {
  const profession = normalizeProfessionData(professionValue);
  const specialty = profession?.specialties.find((entry) => entry.id === String(specialtyId ?? "").trim().toLowerCase());
  const choiceLevel = Math.trunc(Number(milestoneLevel) || 0);
  if (!profession || !specialty || !PROFESSION_MILESTONE_LEVELS.includes(choiceLevel)) {
    throw new TypeError("A valid profession specialty and milestone level are required.");
  }
  return attachGrantFlags({
    img: "systems/pf2e/icons/default-icons/lore.svg",
    name: `${profession.name}: ${specialty.label}`,
    system: {
      description: {
        value: `<p>Specialized knowledge gained through <strong>${profession.name}: ${specialty.label}</strong>.</p><p>Wrathmaker advances this Lore to expert at level 3, master at level 7, and legendary at level 15.</p>`,
      },
      mod: { value: 0 },
      proficient: { value: professionRankForLevel(level) },
      publication: { license: "ORC", remaster: true, title: "Wrathmaker" },
      rules: [],
      slug: `${profession.id}-${specialty.id}`,
      traits: {},
    },
    type: "lore",
  }, profession.id, PROFESSION_GRANT_KINDS.specialtyLore, {
    specialtyId: specialty.id,
    milestoneLevel: choiceLevel,
  });
}

export function createEnchantingSpecialtySource(professionValue) {
  const profession = normalizeProfessionData(professionValue);
  if (!profession || profession.id !== "enchanting") {
    throw new TypeError("The custom Enchanting specialty requires the Enchanting profession.");
  }
  return attachGrantFlags({
    img: "icons/sundries/books/book-red-exclamation.webp",
    name: "Specialty Crafting (Enchanting)",
    system: {
      actionType: { value: "passive" },
      actions: { value: null },
      category: "skill",
      description: {
        value: "<p>Your training focuses on imbuing crafted objects with magical power. You gain a +1 circumstance bonus to Crafting checks for enchanting. If you are a master in Crafting, this bonus increases to +2.</p>",
      },
      level: { value: 1 },
      maxTakable: 1,
      prerequisites: { value: [{ value: "trained in Crafting" }] },
      publication: { license: "ORC", remaster: true, title: "Wrathmaker" },
      rules: [{
        key: "FlatModifier",
        predicate: ["action:craft", "enchanting"],
        selector: "crafting",
        type: "circumstance",
        value: "ternary(gte(@actor.system.skills.crafting.rank,3),2,1)",
      }],
      slug: "specialty-crafting-enchanting",
      traits: { rarity: "common", value: ["general", "skill"] },
    },
    type: "feat",
  }, profession.id, PROFESSION_GRANT_KINDS.specialtyCrafting);
}

async function compendiumSource(uuid) {
  const document = await fromUuid(uuid);
  return document ? cloneDocumentSource(document) : null;
}

async function createAdditionalLoreSource(profession) {
  const source = await compendiumSource(PF2E_PROFESSION_FEAT_UUIDS.additionalLore);
  if (!source) return null;
  source.name = `Additional Lore (${profession.loreName})`;
  return attachGrantFlags(source, profession.id, PROFESSION_GRANT_KINDS.additionalLore);
}

async function createSpecialtyCraftingSource(profession) {
  if (profession.id === "enchanting") return createEnchantingSpecialtySource(profession);
  const source = await compendiumSource(PF2E_PROFESSION_FEAT_UUIDS.specialtyCrafting);
  if (!source) return null;
  source.name = `Specialty Crafting (${PROFESSION_BY_ID.get(profession.id)?.name ?? profession.name})`;
  const choice = source.system?.rules?.find((rule) => rule.key === "ChoiceSet" && rule.flag === "specialtyCrafting");
  if (choice) {
    choice.selection = profession.craftingSpecialty;
    choice.adjustName = false;
  }
  return attachGrantFlags(source, profession.id, PROFESSION_GRANT_KINDS.specialtyCrafting);
}

async function createBonusFeatSource(profession) {
  if (!profession.bonusFeatUuid) return null;
  const source = await compendiumSource(profession.bonusFeatUuid);
  return source ? attachGrantFlags(source, profession.id, PROFESSION_GRANT_KINDS.bonusFeat) : null;
}

function hasExternalBonusFeat(actor, profession) {
  if (!profession.bonusFeatUuid) return false;
  return actorItems(actor).some((item) => (
    !getProfessionGrant(item) && sourceUuid(item) === profession.bonusFeatUuid
  ));
}

async function deleteItems(actor, items) {
  const ids = items.map(itemId).filter(Boolean);
  if (ids.length > 0) await actor.deleteEmbeddedDocuments("Item", ids, { render: false });
}

function unlockedProfessionMilestones(level) {
  const current = actorLevel({ level });
  return PROFESSION_MILESTONE_LEVELS.filter((milestoneLevel) => current >= milestoneLevel);
}

function professionSpecialtyEntries(actor) {
  return actorItems(actor)
    .map((item) => {
      const specialty = getProfessionSpecialty(item);
      return specialty ? { ...specialty, item } : null;
    })
    .filter(Boolean);
}

function grantKey(grant) {
  if (!grant) return "";
  return [grant.kind, grant.professionId, grant.specialtyId ?? "", grant.milestoneLevel ?? ""].join(":");
}

function expectedStandardGrantKinds(actor, profession) {
  const kinds = [
    PROFESSION_GRANT_KINDS.lore,
    PROFESSION_GRANT_KINDS.additionalLore,
    PROFESSION_GRANT_KINDS.specialtyCrafting,
  ];
  if (profession.bonusFeatUuid && !hasExternalBonusFeat(actor, profession)) {
    kinds.push(PROFESSION_GRANT_KINDS.bonusFeat);
  }
  return kinds;
}

function resolveActorProfessionSelections(actor) {
  const entries = professionEntries(actor);
  const specialtyEntries = professionSpecialtyEntries(actor);
  const unlocked = unlockedProfessionMilestones(actorLevel(actor));
  const primary = entries.find((entry) => entry.selection?.role === PROFESSION_SELECTION_ROLES.primary)
    ?? entries[0]
    ?? null;
  if (!primary) {
    return {
      activeProfessions: [],
      activeSpecialties: [],
      obsoleteSelections: specialtyEntries.map((entry) => entry.item),
      selectionUpdates: [],
    };
  }

  const activeProfessions = [primary];
  const activeSpecialties = [];
  const obsoleteSelections = [];
  const selectionUpdates = [];
  const usedMilestones = new Set();
  const usedProfessionIds = new Set([primary.id]);
  const usedSpecialtyIds = new Set();
  if (primary.selection?.role !== PROFESSION_SELECTION_ROLES.primary) {
    selectionUpdates.push({
      _id: itemId(primary.item),
      [`flags.${MODULE_ID}.professionSelection`]: {
        schemaVersion: PROFESSION_SELECTION_SCHEMA_VERSION,
        role: PROFESSION_SELECTION_ROLES.primary,
        milestoneLevel: 1,
      },
    });
  }

  const explicitProfessionEntries = entries
    .filter((entry) => entry !== primary && entry.selection?.role === PROFESSION_SELECTION_ROLES.milestone)
    .sort((left, right) => left.selection.milestoneLevel - right.selection.milestoneLevel);
  for (const entry of explicitProfessionEntries) {
    const milestoneLevel = entry.selection.milestoneLevel;
    if (!unlocked.includes(milestoneLevel)) continue;
    if (usedMilestones.has(milestoneLevel) || usedProfessionIds.has(entry.id)) {
      obsoleteSelections.push(entry.item);
      continue;
    }
    usedMilestones.add(milestoneLevel);
    usedProfessionIds.add(entry.id);
    activeProfessions.push(entry);
  }

  for (const entry of specialtyEntries.sort((left, right) => left.milestoneLevel - right.milestoneLevel)) {
    if (entry.professionId !== primary.id) {
      obsoleteSelections.push(entry.item);
      continue;
    }
    if (!unlocked.includes(entry.milestoneLevel)) continue;
    if (usedMilestones.has(entry.milestoneLevel) || usedSpecialtyIds.has(entry.specialtyId)) {
      obsoleteSelections.push(entry.item);
      continue;
    }
    usedMilestones.add(entry.milestoneLevel);
    usedSpecialtyIds.add(entry.specialtyId);
    activeSpecialties.push(entry);
  }

  const unassignedProfessions = entries.filter((entry) => (
    entry !== primary && entry.selection?.role !== PROFESSION_SELECTION_ROLES.milestone
  ));
  for (const entry of unassignedProfessions) {
    const milestoneLevel = unlocked.find((candidate) => !usedMilestones.has(candidate));
    if (!milestoneLevel || usedProfessionIds.has(entry.id)) {
      obsoleteSelections.push(entry.item);
      continue;
    }
    usedMilestones.add(milestoneLevel);
    usedProfessionIds.add(entry.id);
    activeProfessions.push({
      ...entry,
      selection: {
        schemaVersion: PROFESSION_SELECTION_SCHEMA_VERSION,
        role: PROFESSION_SELECTION_ROLES.milestone,
        milestoneLevel,
      },
    });
    selectionUpdates.push({
      _id: itemId(entry.item),
      [`flags.${MODULE_ID}.professionSelection`]: {
        schemaVersion: PROFESSION_SELECTION_SCHEMA_VERSION,
        role: PROFESSION_SELECTION_ROLES.milestone,
        milestoneLevel,
      },
    });
  }

  return {
    activeProfessions,
    activeSpecialties,
    obsoleteSelections,
    selectionUpdates,
  };
}

export async function synchronizeActorProfession(actor, _options = {}) {
  const key = actorId(actor);
  if (!key || actor?.type !== "character" || syncingActors.has(key)) return false;
  if (!game.user.isGM && !actor.isOwner) return false;
  syncingActors.add(key);
  try {
    let changed = false;
    const plan = resolveActorProfessionSelections(actor);
    await deleteItems(actor, plan.obsoleteSelections);
    changed ||= plan.obsoleteSelections.length > 0;
    const itemUpdates = new Map(plan.selectionUpdates.map((update) => [update._id, update]));
    for (const profession of plan.activeProfessions) {
      const storedSchema = Math.trunc(Number(moduleFlags(profession.item)?.profession?.schemaVersion) || 1);
      const currentSource = PROFESSION_SOURCE_BY_ID.get(profession.id);
      if (storedSchema >= PROFESSION_SCHEMA_VERSION || !currentSource) continue;
      const id = itemId(profession.item);
      itemUpdates.set(id, {
        ...(itemUpdates.get(id) ?? { _id: id }),
        name: currentSource.name,
        img: currentSource.img,
        [`flags.${MODULE_ID}.profession`]: clone(currentSource.flags[MODULE_ID].profession),
        "system.description.value": currentSource.system.description.value,
        "system.rules": clone(currentSource.system.rules),
      });
    }
    if (itemUpdates.size > 0) {
      await actor.updateEmbeddedDocuments("Item", [...itemUpdates.values()], { render: false });
      changed = true;
    }

    const expectedGrants = new Map();
    for (const profession of plan.activeProfessions) {
      for (const kind of expectedStandardGrantKinds(actor, profession)) {
        const grant = { kind, professionId: profession.id };
        expectedGrants.set(grantKey(grant), grant);
      }
    }
    for (const specialty of plan.activeSpecialties) {
      const grant = {
        kind: PROFESSION_GRANT_KINDS.specialtyLore,
        professionId: specialty.professionId,
        specialtyId: specialty.specialtyId,
        milestoneLevel: specialty.milestoneLevel,
      };
      expectedGrants.set(grantKey(grant), grant);
    }

    const allGrants = actorItems(actor).filter((item) => getProfessionGrant(item));
    const obsoleteGrants = allGrants.filter((item) => !expectedGrants.has(grantKey(getProfessionGrant(item))));
    await deleteItems(actor, obsoleteGrants);
    changed ||= obsoleteGrants.length > 0;

    const currentGrants = actorItems(actor).filter((item) => getProfessionGrant(item));
    const grantsByKind = new Map();
    const duplicateGrants = [];
    for (const item of currentGrants) {
      const keyName = grantKey(getProfessionGrant(item));
      if (grantsByKind.has(keyName)) duplicateGrants.push(item);
      else grantsByKind.set(keyName, item);
    }
    await deleteItems(actor, duplicateGrants);
    changed ||= duplicateGrants.length > 0;

    const rank = professionRankForLevel(actorLevel(actor));
    const loreUpdates = [];
    for (const profession of plan.activeProfessions) {
      const lore = grantsByKind.get(grantKey({
        kind: PROFESSION_GRANT_KINDS.lore,
        professionId: profession.id,
      }));
      if (lore) {
        const changes = { _id: itemId(lore) };
        if (lore.name !== profession.loreName) changes.name = profession.loreName;
        if (Number(lore.system?.proficient?.value) !== rank) changes["system.proficient.value"] = rank;
        if (Object.keys(changes).length > 1) loreUpdates.push(changes);
      }
    }
    for (const specialty of plan.activeSpecialties) {
      const profession = plan.activeProfessions.find((entry) => entry.id === specialty.professionId);
      const lore = grantsByKind.get(grantKey({
        kind: PROFESSION_GRANT_KINDS.specialtyLore,
        professionId: specialty.professionId,
        specialtyId: specialty.specialtyId,
        milestoneLevel: specialty.milestoneLevel,
      }));
      if (profession && lore) {
        const expectedName = `${profession.name}: ${specialty.name}`;
        const changes = { _id: itemId(lore) };
        if (lore.name !== expectedName) changes.name = expectedName;
        if (Number(lore.system?.proficient?.value) !== rank) changes["system.proficient.value"] = rank;
        if (Object.keys(changes).length > 1) loreUpdates.push(changes);
      }
    }
    if (loreUpdates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", loreUpdates, { render: false });
      changed = true;
    }

    const sources = [];
    for (const profession of plan.activeProfessions) {
      if (!grantsByKind.has(grantKey({ kind: PROFESSION_GRANT_KINDS.lore, professionId: profession.id }))) {
        sources.push(createProfessionLoreSource(profession, actorLevel(actor)));
      }
      if (!grantsByKind.has(grantKey({ kind: PROFESSION_GRANT_KINDS.additionalLore, professionId: profession.id }))) {
        const source = await createAdditionalLoreSource(profession);
        if (source) sources.push(source);
      }
      if (!grantsByKind.has(grantKey({ kind: PROFESSION_GRANT_KINDS.specialtyCrafting, professionId: profession.id }))) {
        const source = await createSpecialtyCraftingSource(profession);
        if (source) sources.push(source);
      }
      if (expectedStandardGrantKinds(actor, profession).includes(PROFESSION_GRANT_KINDS.bonusFeat)
        && !grantsByKind.has(grantKey({ kind: PROFESSION_GRANT_KINDS.bonusFeat, professionId: profession.id }))) {
        const source = await createBonusFeatSource(profession);
        if (source) sources.push(source);
      }
    }
    for (const specialty of plan.activeSpecialties) {
      const profession = plan.activeProfessions.find((entry) => entry.id === specialty.professionId);
      const keyName = grantKey({
        kind: PROFESSION_GRANT_KINDS.specialtyLore,
        professionId: specialty.professionId,
        specialtyId: specialty.specialtyId,
        milestoneLevel: specialty.milestoneLevel,
      });
      if (profession && !grantsByKind.has(keyName)) {
        sources.push(createProfessionSpecialtyLoreSource(
          profession,
          specialty.specialtyId,
          specialty.milestoneLevel,
          actorLevel(actor),
        ));
      }
    }
    if (sources.length > 0) {
      await actor.createEmbeddedDocuments("Item", sources, { render: false });
      changed = true;
    }
    const hierarchyChanged = await synchronizeProfessionFeatHierarchy(actor);
    changed = hierarchyChanged || changed;
    return changed;
  } finally {
    syncingActors.delete(key);
  }
}

function scheduleProfessionSync(actor, preferredProfessionItemId = null) {
  const key = actorId(actor);
  if (!key || scheduledActors.has(key)) return;
  const timeout = setTimeout(async () => {
    scheduledActors.delete(key);
    try {
      await synchronizeActorProfession(actor, { preferredProfessionItemId });
      if (actor.sheet?.rendered) actor.sheet.render(false);
    } catch (error) {
      console.error(`${MODULE_ID} | Profession synchronization failed for ${actor?.name ?? "a character"}.`, error);
    }
  }, 0);
  scheduledActors.set(key, timeout);
}

async function professionPackDocuments() {
  const pack = game.packs.get(`${MODULE_ID}.professions`);
  if (!pack) throw new Error(localize("CMT.Profession.PackMissing", "The Wrathmaker Professions compendium is unavailable."));
  const documents = await pack.getDocuments();
  return documents.filter((document) => getProfessionData(document));
}

function canEditProfession(actor) {
  return actor?.type === "character"
    && (actor.canUserModify?.(game.user, "update") ?? actor.isOwner ?? game.user.isGM);
}

export function getActorProfessionPlan(actor) {
  const entries = professionEntries(actor);
  const primary = entries.find((entry) => entry.selection?.role === PROFESSION_SELECTION_ROLES.primary)
    ?? entries[0]
    ?? null;
  const professionChoices = new Map(entries
    .filter((entry) => entry !== primary && entry.selection?.role === PROFESSION_SELECTION_ROLES.milestone)
    .map((entry) => [entry.selection.milestoneLevel, entry]));
  const specialtyChoices = new Map(professionSpecialtyEntries(actor)
    .filter((entry) => entry.professionId === primary?.id)
    .map((entry) => [entry.milestoneLevel, entry]));
  return {
    primary,
    milestones: PROFESSION_MILESTONE_LEVELS.map((milestoneLevel) => {
      const profession = professionChoices.get(milestoneLevel);
      const specialty = specialtyChoices.get(milestoneLevel);
      if (profession) {
        return {
          milestoneLevel,
          kind: PROFESSION_MILESTONE_KINDS.profession,
          professionId: profession.id,
          specialtyId: "",
        };
      }
      if (specialty) {
        return {
          milestoneLevel,
          kind: PROFESSION_MILESTONE_KINDS.specialty,
          professionId: primary.id,
          specialtyId: specialty.specialtyId,
        };
      }
      return { milestoneLevel, kind: "", professionId: "", specialtyId: "" };
    }),
  };
}

function normalizeSubmittedMilestones(actor, primary, milestones) {
  const unlocked = unlockedProfessionMilestones(actorLevel(actor));
  const supplied = new Map((Array.isArray(milestones) ? milestones : [])
    .map((entry) => [Math.trunc(Number(entry?.milestoneLevel) || 0), entry]));
  const usedProfessionIds = new Set([primary.id]);
  const usedSpecialtyIds = new Set();
  const normalized = [];
  for (const milestoneLevel of PROFESSION_MILESTONE_LEVELS) {
    const entry = supplied.get(milestoneLevel);
    const kind = String(entry?.kind ?? "").trim().toLowerCase();
    if (!kind) continue;
    if (!unlocked.includes(milestoneLevel)) {
      throw new Error(localize("CMT.Profession.MilestoneLocked", `The level ${milestoneLevel} profession choice is not unlocked.`));
    }
    if (kind === PROFESSION_MILESTONE_KINDS.profession) {
      const professionId = String(entry?.professionId ?? "").trim().toLowerCase();
      if (!PROFESSION_BY_ID.has(professionId) || usedProfessionIds.has(professionId)) {
        throw new Error(localize("CMT.Profession.InvalidMilestoneProfession", "Choose a different valid profession for each milestone."));
      }
      usedProfessionIds.add(professionId);
      normalized.push({ milestoneLevel, kind, professionId, specialtyId: "" });
      continue;
    }
    if (kind === PROFESSION_MILESTONE_KINDS.specialty) {
      const specialtyId = String(entry?.specialtyId ?? "").trim().toLowerCase();
      if (!primary.specialties.some((specialty) => specialty.id === specialtyId) || usedSpecialtyIds.has(specialtyId)) {
        throw new Error(localize("CMT.Profession.InvalidMilestoneSpecialty", "Choose a different valid specialty of the starting profession."));
      }
      usedSpecialtyIds.add(specialtyId);
      normalized.push({ milestoneLevel, kind, professionId: primary.id, specialtyId });
      continue;
    }
    throw new Error(localize("CMT.Profession.InvalidMilestone", "Choose either a specialty or a new profession."));
  }
  return normalized;
}

export async function setActorProfessionPlan(actor, { primaryProfessionId, milestones = [] } = {}) {
  if (!canEditProfession(actor)) throw new Error(localize("CMT.Profession.NotEditable", "You cannot edit this character."));
  const id = String(primaryProfessionId ?? "").trim().toLowerCase();
  const professionDocuments = await professionPackDocuments();
  const documentsById = new Map(professionDocuments.map((document) => [getProfessionData(document)?.id, document]));
  const professionDocument = professionDocuments.find((document) => getProfessionData(document)?.id === id);
  if (!professionDocument) throw new Error(localize("CMT.Profession.Invalid", "Choose a valid Wrathmaker profession."));
  const primary = getProfessionData(professionDocument);
  const choices = normalizeSubmittedMilestones(actor, primary, milestones);
  const sources = [attachSelectionFlags(
    cloneDocumentSource(professionDocument),
    PROFESSION_SELECTION_ROLES.primary,
    1,
  )];
  for (const choice of choices) {
    if (choice.kind === PROFESSION_MILESTONE_KINDS.profession) {
      const document = documentsById.get(choice.professionId);
      if (!document) throw new Error(localize("CMT.Profession.Invalid", "Choose a valid Wrathmaker profession."));
      sources.push(attachSelectionFlags(
        cloneDocumentSource(document),
        PROFESSION_SELECTION_ROLES.milestone,
        choice.milestoneLevel,
      ));
    } else {
      sources.push(createProfessionSpecialtySource(primary, choice.specialtyId, choice.milestoneLevel));
    }
  }
  const removals = actorItems(actor).filter((item) => (
    getProfessionData(item) || getProfessionGrant(item) || getProfessionSpecialty(item)
  ));
  await deleteItems(actor, removals);
  const created = await actor.createEmbeddedDocuments("Item", sources, { render: false });
  const professionItem = created?.[0] ?? null;
  if (!professionItem) throw new Error(localize("CMT.Profession.CreateFailed", "The profession could not be added."));
  await synchronizeActorProfession(actor);
  actor.render?.(false);
  return professionItem;
}

export async function setActorProfession(actor, professionId) {
  return setActorProfessionPlan(actor, { primaryProfessionId: professionId, milestones: [] });
}

export async function clearActorProfession(actor) {
  if (!canEditProfession(actor)) throw new Error(localize("CMT.Profession.NotEditable", "You cannot edit this character."));
  const removals = actorItems(actor).filter((item) => (
    getProfessionData(item) || getProfessionGrant(item) || getProfessionSpecialty(item)
  ));
  await deleteItems(actor, removals);
  actor.render?.(false);
  return removals.length > 0;
}

function asElement(value) {
  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return value;
  if (typeof HTMLElement !== "undefined" && value?.[0] instanceof HTMLElement) return value[0];
  return null;
}

function characterActor(application) {
  const actor = application?.actor ?? application?.document ?? application?.object;
  return actor?.documentName === "Actor" && actor.type === "character" ? actor : null;
}

function injectProfessionField(application, html) {
  const actor = characterActor(application);
  const root = asElement(html) ?? asElement(application?.element);
  const details = root?.querySelector('.tab.character .subsection.details .abcd, .tab[data-tab="character"] .subsection.details .abcd');
  if (!actor || !details || details.querySelector("[data-cmt-profession-field]")) return;
  const profession = getActorProfession(actor);
  const professions = getActorProfessions(actor);
  const editable = Boolean(application.isEditable ?? application.options?.editable ?? actor.isOwner);
  const field = document.createElement("div");
  field.className = `detail profession${profession ? " selected" : ""}`;
  field.dataset.cmtProfessionField = "true";
  field.innerHTML = [
    `<span class="details-label">${localize("CMT.Profession.Label", "Profession")}</span>`,
    "<h3>",
    `<span class="value">${profession ? `${profession.name}${professions.length > 1 ? ` (+${professions.length - 1})` : ""}` : localize("CMT.Profession.None", "Choose a profession")}</span>`,
    editable
      ? `<button type="button" class="cmt-profession-control" data-tooltip="${localize("CMT.Profession.Choose", "Choose Profession")}" aria-label="${localize("CMT.Profession.Choose", "Choose Profession")}"><i class="fa-solid fa-fw ${profession ? "fa-ellipsis-vertical" : "fa-magnifying-glass"}"></i></button>`
      : "",
    "</h3>",
  ].join("");
  const deity = details.querySelector(":scope > .detail.deity");
  if (deity) deity.insertAdjacentElement("afterend", field);
  else details.append(field);

  field.querySelector(".value")?.addEventListener("click", () => profession?.item?.sheet?.render?.(true));
  field.querySelector(".cmt-profession-control")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openProfessionPicker(actor);
  });
}

/** Move PF2e's native profession feat rows into their own section without replacing sheet item controls. */
export function injectProfessionFeatSection(application, html) {
  const actor = characterActor(application);
  const root = asElement(html) ?? asElement(application?.element);
  const pane = root?.matches?.("section.tab.feats, .feats-pane")
    ? root
    : root?.querySelector?.("section.tab.feats, .feats-pane");
  if (!actor || !pane) return false;
  const existing = pane.querySelector("[data-cmt-profession-feats]");
  if (existing) return true;

  const groups = getActorProfessionFeatGroups(actor);
  const rowsById = new Map(Array.from(pane.querySelectorAll("li[data-item-id]"))
    .map((row) => [row.dataset.itemId, row]));
  const visibleGroups = groups.filter((group) => rowsById.has(itemId(group.parent)));
  if (visibleGroups.length === 0) return false;

  const firstParentRow = rowsById.get(itemId(visibleGroups[0].parent));
  const sourceSection = firstParentRow?.closest("section.feat-section");
  if (!sourceSection) return false;

  const section = document.createElement("section");
  section.className = "feat-section major cmt-profession-feats";
  section.dataset.groupId = "wrathmaker-professions";
  section.dataset.cmtProfessionFeats = "true";
  const header = document.createElement("header");
  header.textContent = localize("CMT.Profession.FeatSection", "Profession Feats");
  const list = document.createElement("ol");
  list.className = "feats-list";
  section.append(header, list);
  sourceSection.insertAdjacentElement("beforebegin", section);

  for (const group of visibleGroups) {
    const parentRow = rowsById.get(itemId(group.parent));
    if (!parentRow) continue;
    parentRow.querySelector(":scope > .item-name")?.removeAttribute("data-drag-handle");
    parentRow.querySelector(":scope > .item-name")?.classList.remove("drag-handle");
    list.append(parentRow);
    for (const child of group.children) {
      const childRow = rowsById.get(itemId(child));
      if (!childRow || parentRow.contains(childRow)) continue;
      let nested = parentRow.querySelector(":scope > ol.nested-items");
      if (!nested) {
        nested = document.createElement("ol");
        nested.className = "nested-items";
        parentRow.append(nested);
      }
      childRow.classList.remove("slot");
      childRow.removeAttribute("data-slot-id");
      const slotTitle = childRow.querySelector(":scope > .item-name > .feat-slot-title");
      if (slotTitle) slotTitle.textContent = "";
      nested.append(childRow);
    }
  }
  return true;
}

function createProfessionPickerApplication() {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
  return class WrathmakerProfessionPicker extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-profession-picker`,
      classes: [MODULE_ID, "cmt-profession-picker"],
      tag: "form",
      position: { width: 700, height: 800 },
      window: {
        icon: "fa-solid fa-hammer",
        title: "CMT.Profession.PickerTitle",
        resizable: true,
      },
      form: {
        closeOnSubmit: false,
        handler: this.selectProfession,
      },
      actions: {
        removeProfession: this.removeProfession,
      },
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/profession-picker.hbs` },
    };

    constructor(actor, options = {}) {
      super(options);
      this.actor = actor;
    }

    _onRender(context, options) {
      super._onRender(context, options);
      const root = asElement(this.element);
      if (!root) return;
      const updateControls = () => this._syncMilestoneControls(root);
      for (const control of root.querySelectorAll('[name="professionId"], [data-cmt-milestone-kind], [data-cmt-milestone-profession], [data-cmt-specialty-field] select')) {
        control.addEventListener("change", updateControls);
      }
      updateControls();
    }

    _syncMilestoneControls(root) {
      const primaryId = root.querySelector('[name="professionId"]:checked')?.value ?? "";
      const rows = Array.from(root.querySelectorAll("[data-cmt-milestone]"));
      const selectedProfessions = new Map(rows.map((row) => [
        row.dataset.cmtMilestone,
        row.querySelector("[data-cmt-milestone-kind]")?.value === PROFESSION_MILESTONE_KINDS.profession
          ? row.querySelector("[data-cmt-milestone-profession]")?.value ?? ""
          : "",
      ]));
      const selectedSpecialties = new Map(rows.map((row) => [
        row.dataset.cmtMilestone,
        row.querySelector("[data-cmt-milestone-kind]")?.value === PROFESSION_MILESTONE_KINDS.specialty
          ? row.querySelector("[data-cmt-specialty-field] select")?.value ?? ""
          : "",
      ]));
      for (const row of rows) {
        const kind = row.querySelector("[data-cmt-milestone-kind]")?.value ?? "";
        const specialtyField = row.querySelector("[data-cmt-specialty-field]");
        const specialtySelect = specialtyField?.querySelector("select");
        const professionField = row.querySelector("[data-cmt-profession-field-choice]");
        const professionSelect = professionField?.querySelector("select");
        if (specialtyField) specialtyField.hidden = kind !== PROFESSION_MILESTONE_KINDS.specialty;
        if (professionField) professionField.hidden = kind !== PROFESSION_MILESTONE_KINDS.profession;
        if (specialtySelect) {
          let firstAvailable = "";
          for (const option of specialtySelect.options) {
            const usedElsewhere = [...selectedSpecialties.entries()].some(([level, value]) => (
              level !== row.dataset.cmtMilestone && value && value === option.value
            ));
            const available = !option.value || (option.dataset.professionId === primaryId && !usedElsewhere);
            option.hidden = !available;
            option.disabled = !available;
            if (available && option.value && !firstAvailable) firstAvailable = option.value;
          }
          const selected = specialtySelect.selectedOptions[0];
          if (kind === PROFESSION_MILESTONE_KINDS.specialty && (!selected || selected.disabled || !selected.value)) {
            specialtySelect.value = firstAvailable;
          }
        }
        if (professionSelect) {
          for (const option of professionSelect.options) {
            const usedElsewhere = [...selectedProfessions.entries()].some(([level, value]) => (
              level !== row.dataset.cmtMilestone && value && value === option.value
            ));
            option.disabled = Boolean(option.value && (option.value === primaryId || usedElsewhere));
          }
          if (kind === PROFESSION_MILESTONE_KINDS.profession && professionSelect.selectedOptions[0]?.disabled) {
            professionSelect.value = Array.from(professionSelect.options).find((option) => option.value && !option.disabled)?.value ?? "";
          }
        }
      }
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const currentPlan = getActorProfessionPlan(this.actor);
      const current = currentPlan.primary;
      const documents = await professionPackDocuments();
      const documentsByProfession = new Map(documents.map((document) => [getProfessionData(document).id, document]));
      const professionOptions = PROFESSION_DEFINITIONS.map((definition) => ({
        id: definition.id,
        name: documentsByProfession.get(definition.id)?.name ?? definition.name,
      }));
      return {
        ...context,
        actorName: this.actor.name,
        actorLevel: actorLevel(this.actor),
        hasProfession: Boolean(current),
        professions: PROFESSION_DEFINITIONS.map((definition) => {
          const document = documentsByProfession.get(definition.id);
          const profession = getProfessionData(document) ?? normalizeProfessionData(definition);
          return {
            ...profession,
            name: document?.name ?? definition.name,
            img: document?.img ?? definition.img,
            selected: profession.id === current?.id,
            bonusFeatLabel: profession.bonusFeatName,
            materialLabel: profession.materialIds.length > 0
              ? profession.materialIds.map((id) => id.replaceAll("-", " ")).join(", ")
            : localize("CMT.Profession.FutureMaterials", "Future crafting categories"),
          };
        }),
        milestones: currentPlan.milestones.map((choice) => ({
          level: choice.milestoneLevel,
          unlocked: actorLevel(this.actor) >= choice.milestoneLevel,
          kind: choice.kind,
          noneSelected: !choice.kind,
          specialtySelected: choice.kind === PROFESSION_MILESTONE_KINDS.specialty,
          professionSelected: choice.kind === PROFESSION_MILESTONE_KINDS.profession,
          specialtyOptions: PROFESSION_DEFINITIONS.flatMap((definition) => definition.specialties.map((specialty) => ({
            id: specialty.id,
            professionId: definition.id,
            label: `${definition.name}: ${specialty.label}`,
            selected: choice.kind === PROFESSION_MILESTONE_KINDS.specialty
              && choice.professionId === definition.id
              && choice.specialtyId === specialty.id,
          }))),
          professionOptions: professionOptions.map((profession) => ({
            ...profession,
            selected: choice.kind === PROFESSION_MILESTONE_KINDS.profession
              && choice.professionId === profession.id,
          })),
        })),
      };
    }

    static async selectProfession(_event, _form, formData) {
      try {
        const data = formData.object;
        const milestones = PROFESSION_MILESTONE_LEVELS.map((milestoneLevel) => ({
          milestoneLevel,
          kind: data[`milestone${milestoneLevel}Kind`] ?? "",
          specialtyId: data[`milestone${milestoneLevel}Specialty`] ?? "",
          professionId: data[`milestone${milestoneLevel}Profession`] ?? "",
        }));
        await setActorProfessionPlan(this.actor, {
          primaryProfessionId: data.professionId,
          milestones,
        });
        ui.notifications.info(game.i18n.format("CMT.Profession.Selected", {
          actor: this.actor.name,
          profession: getActorProfession(this.actor)?.name ?? "",
        }));
        await this.close();
      } catch (error) {
        console.error(`${MODULE_ID} | Profession selection failed.`, error);
        ui.notifications.error(error.message);
      }
    }

    static async removeProfession() {
      try {
        await clearActorProfession(this.actor);
        ui.notifications.info(game.i18n.format("CMT.Profession.Removed", { actor: this.actor.name }));
        await this.close();
      } catch (error) {
        console.error(`${MODULE_ID} | Profession removal failed.`, error);
        ui.notifications.error(error.message);
      }
    }
  };
}

export function openProfessionPicker(actor) {
  if (!ProfessionPickerApplication) throw new Error("Wrathmaker professions have not been initialized.");
  const application = new ProfessionPickerApplication(actor);
  application.render({ force: true });
  return application;
}

export function registerProfessionHooks() {
  ProfessionPickerApplication = createProfessionPickerApplication();
  for (const hook of ["renderActorSheet", "renderActorSheetV2", "renderCharacterSheetPF2e"]) {
    Hooks.on(hook, (application, html) => {
      injectProfessionField(application, html);
      injectProfessionFeatSection(application, html);
    });
  }
  Hooks.on("createItem", (item) => {
    if (item?.actor?.type !== "character") return;
    const profession = getProfessionData(item);
    scheduleProfessionSync(item.actor, profession ? itemId(item) : null);
  });
  Hooks.on("deleteItem", (item) => {
    if (item?.actor?.type === "character" && (
      getProfessionData(item) || getProfessionGrant(item) || getProfessionSpecialty(item)
    )) {
      scheduleProfessionSync(item.actor);
    }
  });
  Hooks.on("updateActor", (actor, changes) => {
    if (actor?.type !== "character") return;
    const serialized = JSON.stringify(changes ?? {});
    if (serialized.includes("level")) scheduleProfessionSync(actor);
  });
  Hooks.once("ready", () => {
    for (const actor of game.actors ?? []) {
      if (actor.type === "character" && (game.user.isGM || actor.isOwner) && getActorProfession(actor)) {
        scheduleProfessionSync(actor);
      }
    }
  });
  return true;
}
