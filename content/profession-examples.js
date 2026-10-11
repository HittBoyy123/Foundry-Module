import { PROFESSION_DEFINITIONS } from './professions.js';

// Foundations remain in the installed PF2e system; no Paizo actor data or art is bundled here.
export const PROFESSION_EXAMPLES = Object.freeze([
  ['blacksmithing', 'Valeros (Level 5)', 'fighter', false, 'Weapons, armour, shields and metal ammunition.'],
  ['alchemy', 'Fumbus (Level 5)', 'alchemist', false, 'Bombs, elixirs and consumable batches. Pair with Glassmaking.'],
  ['enchanting', 'Ezren (Level 5)', 'wizard', true, 'Property runes, Mana Gems and spell contributions.'],
  ['leatherwork', 'Harsk (Level 5)', 'ranger', false, 'Leather armour and leather support components.'],
  ['carpentry', 'Lini (Level 5)', 'druid', true, 'Wooden equipment, ammunition and primal spell contributions.'],
  ['stonemason', 'Amiri (Level 5)', 'barbarian', false, 'Stone equipment and sling ammunition.'],
  ['glassmaking', 'Seoni (Level 5)', 'sorcerer', true, 'Container support for Alchemy and spontaneous spell contributions.'],
  ['pottery', 'Kyra (Level 5)', 'cleric', true, 'General artisan assistance and divine spell contributions.'],
  ['weaving', 'Lem (Level 5)', 'bard', true, 'General artisan assistance and occult spell contributions.'],
  ['bookmaking', 'Feiya (Level 5)', 'witch', true, 'Scroll crafting; use a known spell or a participating ally\'s spell.'],
  ['tailoring', 'Merisiel (Level 5)', 'rogue', false, 'General artisan assistance and non-spellcaster testing.'],
].map(([professionId, foundation, classSlug, spellcaster, purpose]) => Object.freeze({
  professionId, foundation, classSlug, spellcaster, purpose,
  professionName: PROFESSION_DEFINITIONS.find(p => p.id === professionId)?.name ?? professionId,
})));

export const PROFESSION_EXAMPLE_MACROS = [{
  _id: 'wmDemoArtisans01', name: 'Create Profession Example Characters', type: 'script',
  img: 'icons/skills/trades/academics-study-reading-book.webp', scope: 'global',
  command: 'const { createProfessionExamples } = await import("/modules/pf2e-crafting-material-tiers/scripts/profession-examples.js"); await createProfessionExamples();',
  ownership: { default: 0 },
}];
