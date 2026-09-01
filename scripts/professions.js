import {
  PF2E_PROFESSION_FEAT_UUIDS,
  PROFESSION_DEFINITIONS,
  PROFESSION_SCHEMA_VERSION,
} from "../content/professions.js";
import { MODULE_ID } from "./constants.js";

export const PROFESSION_GRANT_SCHEMA_VERSION = 1;

const PROFESSION_BY_ID = new Map(PROFESSION_DEFINITIONS.map((profession) => [profession.id, profession]));
const PROFESSION_GRANT_KINDS = Object.freeze({
  lore: "lore",
  additionalLore: "additional-lore",
  specialtyCrafting: "specialty-crafting",
  bonusFeat: "bonus-feat",
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

function attachGrantFlags(source, professionId, kind) {
  source.flags ??= {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    professionGrant: {
      schemaVersion: PROFESSION_GRANT_SCHEMA_VERSION,
      professionId,
      kind,
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
  if (current >= 16) return 4;
  if (current >= 10) return 3;
  if (current >= 4) return 2;
  return 1;
}

export function professionRankLabel(rank) {
  return ["Untrained", "Trained", "Expert", "Master", "Legendary"][Number(rank)] ?? "Untrained";
}

export function normalizeProfessionData(value) {
  const id = String(value?.id ?? "").trim().toLowerCase();
  const definition = PROFESSION_BY_ID.get(id);
  if (!definition) return null;
  return {
    schemaVersion: PROFESSION_SCHEMA_VERSION,
    id: definition.id,
    name: definition.name,
    loreName: String(value?.loreName ?? definition.loreName).trim() || definition.loreName,
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
  return {
    schemaVersion: PROFESSION_GRANT_SCHEMA_VERSION,
    professionId,
    kind,
  };
}

export function getActorProfession(actor) {
  for (const item of actorItems(actor)) {
    const profession = getProfessionData(item);
    if (profession) return { ...profession, item };
  }
  return null;
}

export function professionCheckRollOptions(actor, { materialId = "" } = {}) {
  const profession = getActorProfession(actor);
  const material = String(materialId).trim();
  if (!profession || !material || !profession.materialIds.includes(material)) return [];
  return [`wrathmaker:profession-check:${profession.id}`];
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
        value: `<p>Knowledge and practical experience gained through the <strong>${profession.name}</strong> profession.</p><p>Wrathmaker automatically advances this Lore to expert at level 4, master at level 10, and legendary at level 16.</p>`,
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

export async function synchronizeActorProfession(actor, { preferredProfessionItemId = null } = {}) {
  const key = actorId(actor);
  if (!key || actor?.type !== "character" || syncingActors.has(key)) return false;
  if (!game.user.isGM && !actor.isOwner) return false;
  syncingActors.add(key);
  try {
    let changed = false;
    const items = actorItems(actor);
    const professionItems = items.filter((item) => getProfessionData(item));
    const preferred = preferredProfessionItemId
      ? professionItems.find((item) => itemId(item) === preferredProfessionItemId)
      : null;
    const activeItem = preferred ?? professionItems[0] ?? null;
    const extraProfessions = professionItems.filter((item) => item !== activeItem);
    const active = activeItem ? getProfessionData(activeItem) : null;
    const grants = items.filter((item) => getProfessionGrant(item));
    const obsoleteGrants = active
      ? grants.filter((item) => getProfessionGrant(item)?.professionId !== active.id)
      : grants;
    await deleteItems(actor, [...extraProfessions, ...obsoleteGrants]);
    changed ||= obsoleteGrants.length > 0 || extraProfessions.length > 0;
    if (!active) return changed;

    const currentGrants = actorItems(actor).filter((item) => getProfessionGrant(item)?.professionId === active.id);
    const grantsByKind = new Map();
    const duplicateGrants = [];
    for (const item of currentGrants) {
      const kind = getProfessionGrant(item).kind;
      if (grantsByKind.has(kind)) duplicateGrants.push(item);
      else grantsByKind.set(kind, item);
    }
    await deleteItems(actor, duplicateGrants);
    changed ||= duplicateGrants.length > 0;

    const lore = grantsByKind.get(PROFESSION_GRANT_KINDS.lore);
    const rank = professionRankForLevel(actorLevel(actor));
    if (lore) {
      const changes = { _id: itemId(lore) };
      if (lore.name !== active.loreName) changes.name = active.loreName;
      if (Number(lore.system?.proficient?.value) !== rank) changes["system.proficient.value"] = rank;
      if (Object.keys(changes).length > 1) {
        await actor.updateEmbeddedDocuments("Item", [changes], { render: false });
        changed = true;
      }
    }

    const sources = [];
    if (!lore) sources.push(createProfessionLoreSource(active, actorLevel(actor)));
    if (!grantsByKind.has(PROFESSION_GRANT_KINDS.additionalLore)) {
      const source = await createAdditionalLoreSource(active);
      if (source) sources.push(source);
    }
    if (!grantsByKind.has(PROFESSION_GRANT_KINDS.specialtyCrafting)) {
      const source = await createSpecialtyCraftingSource(active);
      if (source) sources.push(source);
    }
    if (active.bonusFeatUuid
      && !grantsByKind.has(PROFESSION_GRANT_KINDS.bonusFeat)
      && !hasExternalBonusFeat(actor, active)) {
      const source = await createBonusFeatSource(active);
      if (source) sources.push(source);
    }
    if (sources.length > 0) {
      await actor.createEmbeddedDocuments("Item", sources, { render: false });
      changed = true;
    }
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

export async function setActorProfession(actor, professionId) {
  if (!canEditProfession(actor)) throw new Error(localize("CMT.Profession.NotEditable", "You cannot edit this character."));
  const id = String(professionId ?? "").trim().toLowerCase();
  const professionDocuments = await professionPackDocuments();
  const professionDocument = professionDocuments.find((document) => getProfessionData(document)?.id === id);
  if (!professionDocument) throw new Error(localize("CMT.Profession.Invalid", "Choose a valid Wrathmaker profession."));

  const current = getActorProfession(actor);
  if (current?.id === id) {
    await synchronizeActorProfession(actor, { preferredProfessionItemId: itemId(current.item) });
    return current.item;
  }

  const removals = actorItems(actor).filter((item) => getProfessionData(item) || getProfessionGrant(item));
  await deleteItems(actor, removals);
  const source = cloneDocumentSource(professionDocument);
  const created = await actor.createEmbeddedDocuments("Item", [source], { render: false });
  const professionItem = created?.[0] ?? null;
  if (!professionItem) throw new Error(localize("CMT.Profession.CreateFailed", "The profession could not be added."));
  await synchronizeActorProfession(actor, { preferredProfessionItemId: itemId(professionItem) });
  actor.render?.(false);
  return professionItem;
}

export async function clearActorProfession(actor) {
  if (!canEditProfession(actor)) throw new Error(localize("CMT.Profession.NotEditable", "You cannot edit this character."));
  const removals = actorItems(actor).filter((item) => getProfessionData(item) || getProfessionGrant(item));
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
  const editable = Boolean(application.isEditable ?? application.options?.editable ?? actor.isOwner);
  const field = document.createElement("div");
  field.className = `detail profession${profession ? " selected" : ""}`;
  field.dataset.cmtProfessionField = "true";
  field.innerHTML = [
    `<span class="details-label">${localize("CMT.Profession.Label", "Profession")}</span>`,
    "<h3>",
    `<span class="value">${profession?.name ?? localize("CMT.Profession.None", "Choose a profession")}</span>`,
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

function createProfessionPickerApplication() {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
  return class WrathmakerProfessionPicker extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-profession-picker`,
      classes: [MODULE_ID, "cmt-profession-picker"],
      tag: "form",
      position: { width: 620, height: 680 },
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

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const current = getActorProfession(this.actor);
      const documents = await professionPackDocuments();
      const documentsByProfession = new Map(documents.map((document) => [getProfessionData(document).id, document]));
      return {
        ...context,
        actorName: this.actor.name,
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
      };
    }

    static async selectProfession(_event, _form, formData) {
      try {
        await setActorProfession(this.actor, formData.object.professionId);
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
    Hooks.on(hook, (application, html) => injectProfessionField(application, html));
  }
  Hooks.on("createItem", (item) => {
    if (item?.actor?.type !== "character") return;
    const profession = getProfessionData(item);
    scheduleProfessionSync(item.actor, profession ? itemId(item) : null);
  });
  Hooks.on("deleteItem", (item) => {
    if (item?.actor?.type === "character" && (getProfessionData(item) || getProfessionGrant(item))) {
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
