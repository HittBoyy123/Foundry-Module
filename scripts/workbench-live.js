import { MODULE_ID } from "./constants.js";

export const SHARED_CRAFT_FIELDS = Object.freeze([
  "baseItemUuid", "bandId", "materialId", "tier", "artisanSlots", "secondaryMaterials",
  "selectedMarks", "projectName", "componentTiers", "upgradeDragon",
]);

export function sharedCraftDraft(state) {
  return Object.fromEntries(SHARED_CRAFT_FIELDS.filter(key => state[key] !== undefined)
    .map(key => [key, structuredClone(state[key])]));
}

export function hydrateCraftDraft(application, party) {
  const draft = party?.getFlag?.(MODULE_ID, "craftDraft");
  if (draft && typeof draft === "object") Object.assign(application.workbenchState, sharedCraftDraft(draft));
  application.sharedCraftBaseline = sharedCraftDraft(application.workbenchState);
  application.sharedCraftPartyId = party?.id;
}

export function bindSharedCraftDraft(application, root, getParty) {
  const publish = () => {
    clearTimeout(application.sharedCraftTimer);
    application.sharedCraftTimer = setTimeout(async () => {
      const party = getParty();
      if (!party || application.sharedCraftPartyId !== party.id || !party.canUserModify?.(game.user, "update")) return;
      const next = sharedCraftDraft(application.workbenchState);
      const previous = application.sharedCraftBaseline ?? {};
      const update = Object.fromEntries(Object.entries(next).filter(([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(previous[key]))
        .map(([key, value]) => [`flags.${MODULE_ID}.craftDraft.${key}`, value]));
      if (!Object.keys(update).length) return;
      application.sharedCraftBaseline = next;
      try { await party.update(update); }
      catch (error) { application.sharedCraftBaseline = previous; ui.notifications.error(error.message); }
    }, 150);
  };
  for (const event of ["change", "drop", "click"]) root.addEventListener(event, publish);
}
