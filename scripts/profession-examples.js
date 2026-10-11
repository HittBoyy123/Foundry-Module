import { MODULE_ID } from './constants.js';
import { PROFESSION_EXAMPLES } from '../content/profession-examples.js';
import { setActorProfession, synchronizeActorProfession, getActorProfessions, getProfessionGrant } from './professions.js';
import { knownCraftingSpells } from './scroll-crafting.js';

export const EXAMPLE_FOLDER = 'Wrathmaker - Profession Examples';
export const EXAMPLE_PACK = 'wrathmaker-profession-examples';
let building = false;
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function exampleActorSource(base, example) {
  const source = structuredClone(base);
  delete source._id; delete source._stats; delete source.folder;
  source.name = `${example.foundation.replace(/ \(Level \d+\)$/, '')} - ${example.professionName}`;
  source.ownership = { default: 2 };
  source.flags ??= {};
  // Keep native item IDs: prepared spell slots and spellcasting entries refer to them.
  source.flags[MODULE_ID] = { professionExample: { professionId: example.professionId, version: 1, foundation: example.foundation } };
  source.system ??= {}; source.system.details ??= {}; source.system.details.biography ??= {};
  source.system.details.biography.value = `<h2>Wrathmaker profession example</h2><p><strong>${escape(example.professionName)}</strong>: ${escape(example.purpose)}</p><p>Level 5 ${escape(example.classSlug)}. Based on the PF2e system's ${escape(example.foundation)} prebuilt character. Native class features, equipment and spell lists are retained. This is a demonstration build with bonus Crafting training where needed, plus Wrathmaker profession benefits.</p><p>Assign a player ownership of a world copy to test player permissions. Spell contributors must join the crafting team. Pottery, Weaving and Tailoring currently provide assistance rather than dedicated recipes.</p>` + (source.system.details.biography.value ?? '');
  source.system.skills ??= {}; source.system.skills.crafting ??= {};
  source.system.skills.crafting.rank = Math.max(1, Number(source.system.skills.crafting.rank) || 0);
  source.prototypeToken ??= {};
  delete source.prototypeToken.actorId;
  source.prototypeToken.name = source.name;
  source.prototypeToken.actorLink = true;
  source.prototypeToken.disposition = 1;
  return source;
}

export function exampleReadiness(actor, example) {
  const items = Array.from(actor.items ?? []);
  const professions = getActorProfessions(actor);
  const grants = items.map(getProfessionGrant).filter(Boolean);
  const spells = knownCraftingSpells(actor);
  const errors = [];
  if (actor.type !== 'character') errors.push('Not a player character');
  if (!items.some(i => i.type === 'class' && i.system?.slug === example.classSlug)) errors.push('Missing expected class');
  if (professions.length !== 1 || professions[0].id !== example.professionId) errors.push('Profession not assigned');
  if (!items.some(i => i.type === 'lore' && getProfessionGrant(i)?.professionId === example.professionId)) errors.push('Profession Lore missing');
  if (!grants.some(g => g.professionId === example.professionId && g.kind === 'additional-lore')) errors.push('Additional Lore missing');
  if (!grants.some(g => g.professionId === example.professionId && g.kind === 'specialty-crafting')) errors.push('Specialty Crafting missing');
  if (example.spellcaster && spells.length === 0) errors.push('No usable known spells');
  return { name: actor.name, profession: example.professionName, class: example.classSlug, level: actor.level, spells: spells.length, errors };
}

/** Explicit GM action only. Never runs on ready and never overwrites existing demo characters. */
export async function createProfessionExamples() {
  if (!game.user.isGM) throw new Error('Only the GM can create profession examples.');
  if (building) return ui.notifications.info('Profession examples are already being prepared.');
  building = true;
  try {
    const native = game.packs.get('pf2e.iconics');
    if (!native) throw new Error('The PF2e Iconics compendium is required.');
    const index = await native.getIndex();
    const foundations = new Map();
    // Resolve all foundations before creating anything, so missing system content is reported upfront.
    for (const example of PROFESSION_EXAMPLES) {
      const entry = index.find(i => i.name === example.foundation);
      if (!entry) throw new Error(`Missing PF2e foundation: ${example.foundation}`);
      foundations.set(example.professionId, await native.getDocument(entry._id));
    }
    let folder = game.folders.find(f => f.type === 'Actor' && f.name === EXAMPLE_FOLDER);
    folder ??= await Folder.create({ name: EXAMPLE_FOLDER, type: 'Actor', color: '#5e0000', sorting: 'a' });
    let pack = game.packs.get(`world.${EXAMPLE_PACK}`);
    pack ??= await CompendiumCollection.createCompendium({ name: EXAMPLE_PACK, label: 'Wrathmaker Profession Examples', type: 'Actor', system: 'pf2e' });
    if (pack.documentName !== 'Actor') throw new Error('The example compendium name is already used by a different document type.');
    await pack.configure({ locked: false });
    const rows = [];
    try {
      const templates = await pack.getDocuments();
      for (const example of PROFESSION_EXAMPLES) {
        ui.notifications.info(`Preparing ${example.professionName} example...`);
        let actor = game.actors.find(a => a.flags?.[MODULE_ID]?.professionExample?.professionId === example.professionId);
        const existing = Boolean(actor);
        if (!actor) {
          const saved = templates.find(a => a.flags?.[MODULE_ID]?.professionExample?.professionId === example.professionId);
          const source = saved ? saved.toObject() : exampleActorSource(foundations.get(example.professionId).toObject(), example);
          delete source._id; delete source._stats;
          source.folder = folder.id;
          actor = await Actor.create(source, { keepEmbeddedIds: true, renderSheet: false });
          await setActorProfession(actor, example.professionId);
          for (let attempt = 0; attempt < 20; attempt++) {
            await synchronizeActorProfession(actor);
            if (!exampleReadiness(actor, example).errors.length) break;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          await actor.update({ 'system.attributes.hp.value': actor.system.attributes.hp.max });
        }
        const row = exampleReadiness(actor, example);
        if (row.errors.length) throw new Error(`${actor.name}: ${row.errors.join(', ')}. The character was retained for inspection.`);
        if (!templates.some(a => a.flags?.[MODULE_ID]?.professionExample?.professionId === example.professionId)) {
          const source = actor.toObject(); delete source._id; delete source._stats; source.folder = null;
          source.ownership = { default: 0 };
          await Actor.create(source, { pack: pack.collection, keepEmbeddedIds: true, renderSheet: false });
        }
        rows.push({ ...row, existing });
      }
    } finally { await pack.configure({ locked: true }); }
    const content = `<p>Characters are in <strong>${EXAMPLE_FOLDER}</strong>. Reusable copies are in <strong>Wrathmaker Profession Examples</strong>. Existing examples were kept unchanged.</p><table><thead><tr><th>Character</th><th>Class</th><th>Level</th><th>Known spells</th></tr></thead><tbody>${rows.map(r => `<tr><td>${escape(r.name)}</td><td>${escape(r.class)}</td><td>${r.level}</td><td>${r.spells}</td></tr>`).join('')}</tbody></table><p>Drag compendium characters into Actors to make fresh copies. Assign player ownership on a world copy to test crafting permissions.</p>`;
    new Dialog({ title: 'Profession Examples Ready', content, buttons: { ok: { label: 'Done' } } }, { width: 640 }).render(true);
    return rows;
  } catch (error) { ui.notifications.error(error.message); throw error; }
  finally { building = false; }
}
