import { consumableMinimumTier } from './recipe-catalog.js';
export const isScroll = item => item?.type === "consumable" && item.system?.category === "scroll";
const list = value => Array.from(value ?? []);
const escape = text => String(text ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export function knownCraftingSpells(actor, { includeCantrips = false } = {}) {
  return list(actor?.items).filter(spell => {
    const traits = spell.system?.traits?.value ?? [];
    const entryId = spell.system?.location?.value;
    const entry = list(actor.items).find(item => item.id === entryId && item.type === "spellcastingEntry");
    const rank = Number(spell.system?.level?.value);
    const cantrip = spell.isCantrip || traits.includes("cantrip");
    return spell.type === "spell" && entry && (includeCantrips || !cantrip) && !spell.isFocusSpell && !spell.isRitual
      && !traits.includes("focus") && !spell.system?.ritual
      && !["focus", "ritual", "items"].includes(entry.system?.prepared?.value)
      && Number.isInteger(rank) && rank >= (includeCantrips && cantrip ? 0 : 1) && rank <= 10;
  });
}

/** Available rank capacity, independent of remaining daily slots. */
export function highestCraftingSpellRank(actors) {
  let highest = 0;
  for (const actor of actors) {
    const known = knownCraftingSpells(actor);
    for (const entry of list(actor?.items).filter(item => item.type === "spellcastingEntry")) {
      if (["focus", "ritual", "items"].includes(entry.system?.prepared?.value)) continue;
      const spells = known.filter(spell => spell.system.location.value === entry.id);
      const slots = Object.entries(entry.system?.slots ?? {}).filter(([key, slot]) => /^slot[1-9]$|^slot10$/.test(key) && Number(slot.max) > 0).map(([key]) => Number(key.slice(4)));
      const ranks = slots.length ? slots : spells.map(spell => Number(spell.system.location?.heightenedLevel ?? spell.system.level.value));
      highest = Math.max(highest, ...ranks);
    }
  }
  return Math.min(10, highest);
}

export async function validateScrollSpell(selection, contributorUuids, resolve = globalThis.fromUuid) {
  if (!selection?.actorUuid || !contributorUuids.includes(selection.actorUuid)) throw new Error("Assign the character supplying the scroll's spell to this project.");
  const actor = await resolve(selection.actorUuid);
  const spell = knownCraftingSpells(actor).find(item => item.uuid === selection.spellUuid);
  if (!spell) throw new Error("The participating character must still know the selected spell in their spellbook or repertoire.");
  const rank = Number(selection.rank);
  if (!Number.isInteger(rank) || rank < Number(spell.system.level.value) || rank > 10) throw new Error("Choose a valid scroll rank at or above the spell's base rank.");
  const participants = await Promise.all([...new Set(contributorUuids)].map(uuid => uuid === actor.uuid ? actor : resolve(uuid)));
  if (rank > highestCraftingSpellRank(participants)) throw new Error("The scroll rank exceeds the highest spell rank of the participating crafters.");
  return { actor, spell, rank };
}

export function scrollSpellSnapshot(spell, actor, rank) {
  const source = structuredClone(spell.toObject ? spell.toObject() : spell);
  for (const key of ["actor", "parent", "uuid", "folder", "ownership", "_stats"]) delete source[key];
  source.system.location = { value: null, heightenedLevel: rank };
  return { actorUuid: actor.uuid, actorName: actor.name, spellUuid: spell.uuid, name: spell.name, rank, source };
}

export function applyScrollSpell(source, selection) {
  if (!selection?.source || !isScroll(source)) throw new Error("A scroll needs a saved spell from a participating character.");
  source.system.spell = structuredClone(selection.source);
  source.system.traits ??= { value: [] };
  source.system.traits.value = [...new Set([...(source.system.traits.value ?? []), ...(selection.source.system.traits?.value ?? []), "magical", "scroll", "consumable"])];
  source.system.traits.rarity = selection.source.system.traits?.rarity ?? "common";
  source.name = `Scroll of ${selection.name} (Rank ${selection.rank})`;
  source.system.description ??= {};
  source.system.description.value = `<p><strong>${escape(selection.name)}</strong> — Rank ${selection.rank}</p>${source.system.description.value ?? ""}`;
  return source;
}

/** Resolve tiers from native scroll item levels, using the same gate as crafting. */
export async function scrollMaterialTiers(ranks, resolve = globalThis.fromUuid, uuids = globalThis.CONFIG?.PF2E?.spellcastingItems?.scroll?.compendiumUuids ?? {}) {
  return Object.fromEntries(await Promise.all(ranks.map(async rank => {
    const template = uuids[rank] ? await resolve(uuids[rank]) : null;
    return [rank, isScroll(template) ? consumableMinimumTier(template) : null];
  })));
}

export async function chooseScrollSpell(profiles) {
  const { chooseSpellbookSpell } = await import("./scroll-spell-picker.js");
  const choice = await chooseSpellbookSpell(profiles);
  if (!choice) return null;
  const ranks = Array.from({length:highestCraftingSpellRank(profiles.map(profile => profile.actor))+1-Number(choice.spell.system.level.value)},(_,i)=>i+Number(choice.spell.system.level.value));
  const tiers = await scrollMaterialTiers(ranks);
  const rank = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Scroll Rank" }, content: `<label>Rank<select name="rank">${ranks.map(r=>`<option value="${r}">${r} — ${tiers[r] ? `Tier ${tiers[r]}` : "Unavailable"}</option>`).join("")}</select></label>`,
    ok: {label:"Select Spell",callback:(_event,button)=>Number(button.form.elements.rank.value)},rejectClose:false,
  });
  if (!rank) return null;
  const uuid = globalThis.CONFIG?.PF2E?.spellcastingItems?.scroll?.compendiumUuids?.[rank];
  const template = uuid ? await fromUuid(uuid) : null;
  if (!isScroll(template)) throw new Error("The PF2e scroll template for that rank is unavailable.");
  return { template, selection: { actorUuid: choice.actor.uuid, actorName: choice.actor.name, spellUuid: choice.spell.uuid, name: choice.spell.name, rank } };
}
