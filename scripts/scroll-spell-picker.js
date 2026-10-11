import { highestCraftingSpellRank, scrollMaterialTiers } from './scroll-crafting.js';
import { knownCraftingSpells } from './scroll-crafting.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cantrip = spell => Boolean(spell.isCantrip || spell.system?.traits?.value?.includes('cantrip'));
const fold = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const rankLabel = rank => rank === 0 ? 'Cantrips' : `${rank}${({1:'st',2:'nd',3:'rd'})[rank] ?? 'th'} Rank`;

/** Merge identical spells, retaining a real participant as the hidden provider. */
export function scrollSpellbookChoices(profiles) {
  const maximumRank = highestCraftingSpellRank(profiles.map(profile => profile.actor));
  const seen = new Set();
  const choices = [];
  for (const profile of profiles) for (const spell of knownCraftingSpells(profile.actor)) {
    const rank = cantrip(spell) ? 0 : Number(spell.system.level.value);
    if (rank > maximumRank) continue;
    const source = spell.toObject ? spell.toObject().system : structuredClone(spell.system);
    const { location, _migration, ...mechanics } = source;
    const key = `${spell.name}|${rank}|${JSON.stringify(mechanics)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    choices.push({ actor: profile.actor, spell, rank, selectable: rank > 0 });
  }
  return choices.sort((a,b) => a.rank-b.rank || a.spell.name.localeCompare(b.spell.name));
}

export function scrollSpellbookGroups(choices, query = '') {
  const search = fold(query.trim());
  const groups = new Map();
  choices.forEach((choice, index) => {
    if (search && !fold(choice.spell.name).includes(search)) return;
    if (!groups.has(choice.rank)) groups.set(choice.rank, { rank: choice.rank, label: rankLabel(choice.rank), spells: [] });
    groups.get(choice.rank).spells.push({ ...choice, index });
  });
  return Array.from(groups.values()).sort((a,b)=>a.rank-b.rank);
}

function spellDefense(spell) {
  if (spell.defense?.label) return spell.defense.label;
  const save = spell.system?.defense?.save;
  if (save?.statistic) return `${save.basic ? 'basic ' : ''}${({fortitude:'Fortitude',reflex:'Reflex',will:'Will'})[save.statistic] ?? save.statistic}`;
  return spell.system?.traits?.value?.includes('attack') ? 'AC' : '';
}

export function scrollSpellbookHTML(choices) {
  const glyphs = {'0':'F',free:'F','1':'1','2':'2','3':'3',reaction:'R','1 or 2':'1/2','1 to 3':'1 – 3','2 or 3':'2/3','2 rounds':'3,3'};
  return `<div class="cmt-scroll-spellbook"><label class="cmt-spell-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" name="spellSearch" placeholder="Search Spells" aria-label="Search Spells" autocomplete="off"></label><div class="cmt-spell-list">${scrollSpellbookGroups(choices).map(group => `<section data-spell-rank="${group.rank}" aria-label="${group.label}"><div class="cmt-spell-rank"><strong>${group.label}</strong><span>Defense</span><span>Range</span><span>Material Tier</span><span></span><span></span><span></span></div>${group.spells.map(({spell,index,selectable,minimumTier}) => {
    const time = String(spell.system?.time?.value ?? '').trim().toLowerCase();
    const glyph = glyphs[time] ?? '';
    return `<div class="cmt-spell-row" data-spell-index="${index}" data-search="${esc(fold(spell.name))}"><label class="cmt-spell-name ${selectable ? '' : 'cmt-spell-reference'}" title="${selectable ? 'Select this spell' : 'Cantrips cannot be crafted into scrolls'}"><input type="radio" name="scrollSpell" value="${index}" ${selectable ? '' : 'disabled'}><span class="cmt-spell-square" aria-hidden="true"></span><img src="${esc(spell.img || 'icons/svg/book.svg')}" alt=""><span>${esc(spell.name)}</span>${glyph ? `<span class="cmt-spell-glyph" aria-label="${esc(time)}">${glyph}</span>` : time ? `<small>${esc(time)}</small>` : ''}</label><span class="cmt-spell-defense">${esc(spellDefense(spell))}</span><span class="cmt-spell-range">${esc(spell.system?.range?.value ?? '')}</span><span class="cmt-spell-tier" title="Minimum tier at base spell rank; each scroll uses 1 Wood and 1 Mana Gem">${minimumTier ? `Tier ${minimumTier}` : "Unavailable"}</span><button type="button" data-spell-remove="${index}" aria-label="Clear ${esc(spell.name)}" title="Clear selection">−</button><button type="button" data-spell-add="${index}" aria-label="Choose rank for ${esc(spell.name)}" title="Choose scroll rank">+</button><button type="button" data-spell-details="${index}" aria-label="Read ${esc(spell.name)}" title="Read spell"><i class="fa-solid fa-book-open" aria-hidden="true"></i></button></div>`;
  }).join('')}${group.rank === 0 ? '<p class="cmt-cantrip-note">Cantrips are shown for reference; they cannot be made into scrolls.</p>' : ''}</section>`).join('')}<p class="cmt-spell-empty" hidden>No matching spells.</p></div><p class="cmt-spell-hint">Tier shown is for the base rank. Each scroll uses 1 Wood + 1 Mana Gem. Higher scroll ranks may need a higher tier. No spell slot is spent.</p></div>`;
}

export async function chooseSpellbookSpell(profiles) {
  const choices = scrollSpellbookChoices(profiles);
  if (!choices.length) throw new Error('Assign a character with known spells to the crafting team first.');
  const tiers = await scrollMaterialTiers([...new Set(choices.map(choice => choice.rank))]);
  choices.forEach(choice => { choice.minimumTier = tiers[choice.rank]; });
  const selected = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Choose Scroll Spell' }, classes: ['dialog', 'cmt-scroll-picker'], position: { width: 920 },
    content: scrollSpellbookHTML(choices),
    render: (_event, dialog) => {
      const root = dialog.element;
      const choose = root.querySelector('button[data-action="choose"]');
      choose.disabled = true;
      root.querySelectorAll('input[name="scrollSpell"]').forEach(radio => radio.addEventListener('change', () => {
        choose.disabled = !root.querySelector('input[name="scrollSpell"]:checked:not(:disabled)');
        root.querySelectorAll('.cmt-spell-row').forEach(row => row.classList.toggle('selected', Boolean(row.querySelector('input:checked'))));
      }));
      root.querySelector('input[name="spellSearch"]').addEventListener('input', event => {
        const search = fold(event.target.value.trim());
        root.querySelectorAll('[data-spell-index]').forEach(row => { row.hidden = !row.dataset.search.includes(search); });
        root.querySelectorAll('[data-spell-rank]').forEach(group => { group.hidden = !group.querySelector('[data-spell-index]:not([hidden])'); });
        root.querySelector('.cmt-spell-empty').hidden = Boolean(root.querySelector('[data-spell-rank]:not([hidden])'));
        // A filtered-out selection must not be submitted accidentally with Enter.
        const checked = root.querySelector('input[name="scrollSpell"]:checked');
        if (checked?.closest('[data-spell-index]').hidden) {
          checked.checked = false; checked.closest('[data-spell-index]').classList.remove('selected'); choose.disabled = true;
        }
      });
      root.querySelectorAll('[data-spell-add]').forEach(button => button.addEventListener('click', () => {
        const radio = root.querySelector(`input[name="scrollSpell"][value="${button.dataset.spellAdd}"]`);
        radio.checked = true;
        choose.disabled = false;
        choose.click();
      }));
      root.querySelectorAll('[data-spell-remove]').forEach(button => button.addEventListener('click', () => {
        const radio = root.querySelector(`input[name="scrollSpell"][value="${button.dataset.spellRemove}"]`);
        radio.checked = false;
        radio.dispatchEvent(new Event('change'));
      }));
      root.querySelectorAll('[data-spell-details]').forEach(button => button.addEventListener('click', () => {
        choices[Number(button.dataset.spellDetails)]?.spell.sheet?.render(true);
      }));
    },
    buttons: [
      { action: 'choose', label: 'Choose Rank', icon: 'fa-solid fa-check', default: true, callback: (_event,button) => {
        const value = button.form.querySelector('input[name="scrollSpell"]:checked:not(:disabled)')?.value;
        return value === undefined ? null : Number(value);
      } },
      { action: 'cancel', label: 'Cancel', callback: () => null },
    ], close: () => null,
  });
  return selected === null || selected === undefined || !choices[selected]?.selectable ? null : choices[selected];
}
