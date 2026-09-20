import { getRulesConfig } from "./config-store.js";
import { MODULE_ID } from "./constants.js";
import { getArtisanProfile } from "./artisan-marks.js";
import { hasWyrmcraft, buildArtisanSlots, chooseSecondaryMaterials } from "./workbench-team.js";
import { buildCraftingRecipeFromBand } from "./recipe-catalog.js";
import { canReinforceWithScales } from "./armor-resistance.js";

export function canControlArtisan(actor, user) {
  return Boolean(actor && ["character", "npc"].includes(actor.type) && !actor.pack
    && (user?.isGM || actor.testUserPermission?.(user, "OWNER") === true));
}
export function slotAllowsArtisan(slot, profile) {
  if (!profile?.professions?.length) return false;
  if (slot.requiresWyrmcraft && !hasWyrmcraft(profile)) return false;
  return !slot.materialIds?.length || profile.professions.some(profession => profession.materialIds.some(id => slot.materialIds.includes(id)));
}
export function artisanSlotChoices(slot, profiles, slots) {
  return profiles.filter(profile => slotAllowsArtisan(slot, profile)
    && !slots.some((uuid, index) => index !== slot.index && uuid === profile.actorUuid))
    .map(profile => ({ uuid: profile.actorUuid, label: `${profile.name} — ${profile.professions.map(p => p.name).join(" / ")}`, selected: profile.actorUuid === slots[slot.index] }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function resolveDroppedArtisan(data, { resolve = globalThis.fromUuid, actors = globalThis.game?.actors, scenes = globalThis.game?.scenes } = {}) {
  const uuid = data?.uuid ?? data?.actorUuid;
  let document = uuid ? await resolve(uuid, { strict: false }) : null;
  if (!document && data?.sceneId && (data?.tokenId || data?.id)) document = scenes?.get(data.sceneId)?.tokens?.get(data.tokenId ?? data.id);
  if (!document && (data?.actorId || data?.type === "Actor")) document = actors?.get(data.actorId ?? data.id);
  const actor = document?.documentName === "Token" ? document.actor : document;
  return actor?.documentName === "Actor" && ["character", "npc"].includes(actor.type) ? actor : null;
}

export function availableArtisanProfiles(world = globalThis.game, tokens = globalThis.canvas?.tokens?.placeables ?? []) {
  const actors = [...Array.from(world.actors ?? []), ...tokens.map(token => token.actor)].filter(actor => canControlArtisan(actor, world.user));
  return [...new Map(actors.map(actor => [actor.uuid, actor])).values()].map(getArtisanProfile).filter(profile => profile?.professions.length);
}

/** Only the selected slot is written; the player cannot modify stash permissions or inventory. */
export async function assignSharedArtisan({ party, user, index, actorUuid, resolve = globalThis.fromUuid, profileFor = getArtisanProfile }) {
  if (!Number.isInteger(index) || index < 0 || index > 5) throw new Error("Choose a valid artisan slot.");
  const editable = party?.canUserModify?.(user, "update") === true;
  const memberOwner = Array.from(party?.members ?? []).some(member => canControlArtisan(member.actor ?? member, user));
  if (!party || party.type !== "party" || (!editable && !party.testUserPermission?.(user, "LIMITED") && !memberOwner))
    throw new Error("You cannot access this party’s crafting project.");
  const draft = structuredClone(party.getFlag(MODULE_ID, "craftDraft") ?? {});
  const signature = JSON.stringify(draft);
  const slots = Array.from({ length: 6 }, (_, i) => draft.artisanSlots?.[i] ?? "");
  const existing = slots[index] ? await resolve(slots[index], { strict: false }) : null;
  if (existing && !editable && !canControlArtisan(existing, user)) throw new Error("Only the GM or that artisan’s owner can replace this slot.");
  if (actorUuid) {
    const actor = await resolve(actorUuid, { strict: false });
    if (!canControlArtisan(actor, user)) throw new Error("Choose a character or NPC you control.");
    if (slots.some((uuid, i) => uuid === actor.uuid && i !== index)) throw new Error("This artisan already occupies a slot.");
    const baseItem = draft.baseItemUuid ? await resolve(draft.baseItemUuid, { strict: false }) : null;
    let recipe = null;
    if (baseItem && draft.bandId) {
      recipe = buildCraftingRecipeFromBand(draft.bandId, { targetItem: baseItem, tier: draft.tier, coreMaterialId: draft.materialId });
      chooseSecondaryMaterials(recipe, draft.secondaryMaterials ?? {});
    }
    const slot = buildArtisanSlots(recipe, slots, [], { armor: canReinforceWithScales(baseItem), dragonResistance: canReinforceWithScales(baseItem) && Boolean(draft.upgradeDragon?.color) })[index];
    if (!slotAllowsArtisan(slot, profileFor(actor))) throw new Error(`${slot.role} requires ${slot.requirement} expertise.`);
    slots[index] = actor.uuid;
  } else slots[index] = "";
  // A recipe edit from another client must not be validated against stale requirements.
  const latest = party.getFlag(MODULE_ID, "craftDraft") ?? {};
  if (JSON.stringify(latest) !== signature) throw new Error("The draft changed; try selecting the artisan again.");
  await party.update({ [`flags.${MODULE_ID}.craftDraft.artisanSlots`]: slots });
  return slots;
}

const channel = `module.${MODULE_ID}`;
const pending = new Map();
const queues = new Map();
function primaryGM() { return Array.from(game.users ?? []).filter(user => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0]; }
export async function requestArtisanAssignment(party, index, actorUuid) {
  if (!getRulesConfig().crafting?.workbenchEnabled) throw new Error("The Workbench is disabled.");
  const gm = primaryGM();
  if (!gm) {
    if (party.canUserModify?.(game.user, "update")) return assignSharedArtisan({ party, user: game.user, index, actorUuid });
    throw new Error("A GM must be online to add your artisan to the shared workbench.");
  }
  if (gm.id === game.user.id) return enqueueAssignment({ party, user: game.user, index, actorUuid });
  const requestId = foundry.utils.randomID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error("The GM did not respond. Try selecting the artisan again.")); }, 15000);
    pending.set(requestId, { resolve, reject, timeout, gmId: gm.id });
    game.socket.emit(channel, { type: "artisan-assignment", requestId, gmId: gm.id, userId: game.user.id, partyId: party.id, index, actorUuid });
  });
}
function enqueueAssignment(args) {
  const previous = queues.get(args.party.id) ?? Promise.resolve();
  const result = previous.catch(() => {}).then(() => assignSharedArtisan(args));
  queues.set(args.party.id, result);
  result.finally(() => { if (queues.get(args.party.id) === result) queues.delete(args.party.id); }).catch(() => {});
  return result;
}
export function installArtisanAssignmentSocket() {
  game.socket.on(channel, async payload => {
    if (payload?.type === "artisan-assignment-result" && payload.userId === game.user.id) {
      const request = pending.get(payload.requestId);
      if (!request || request.gmId !== payload.gmId) return;
      pending.delete(payload.requestId); clearTimeout(request.timeout);
      if (payload.error) request.reject(new Error(payload.error)); else request.resolve(payload.slots);
      return;
    }
    if (payload?.type !== "artisan-assignment" || !game.user.isGM || primaryGM()?.id !== game.user.id || payload.gmId !== game.user.id) return;
    const response = { type: "artisan-assignment-result", requestId: payload.requestId, userId: payload.userId, gmId: game.user.id };
    try {
      if (!getRulesConfig().crafting?.workbenchEnabled) throw new Error("The Workbench is disabled.");
      const party = game.actors.get(payload.partyId), user = game.users.get(payload.userId);
      if (!party || !user?.active) throw new Error("The party or requesting player is unavailable.");
      response.slots = await enqueueAssignment({ party, user, index: payload.index, actorUuid: payload.actorUuid });
    } catch (error) { response.error = error.message; }
    game.socket.emit(channel, response);
  });
}
