import test from 'node:test';
import assert from 'node:assert/strict';
import { craftingDescription, installCraftingDescription } from '../scripts/crafting-description.js';
import { MODULE_ID, cloneDefaultRulesConfig } from '../scripts/constants.js';
const config = cloneDefaultRulesConfig();
function item() { return { type: 'weapon', name: 'Sword', system: { runes: { property: ['ghostTouch'] } }, flags: { [MODULE_ID]: { material: 'metal', tier: 3, crafting: { core: { contributor: { name: '<Maker>' } }, masterstrokes: [{ result: 7, edition: 'chad', category: 'weapon' }] } } } }; }
test('crafting description orders maker, runes, material and Masterstroke without changing item data', () => {
 const source = item(), before = structuredClone(source);
 const html = craftingDescription(source, config);
 assert.ok(html.includes('Crafted by &lt;Maker&gt;'));
 assert.ok(html.indexOf('Ghost Touch') < html.indexOf('Cold Iron'));
 assert.ok(html.indexOf('Cold Iron') < html.indexOf('Masterstroke'));
 assert.ok(html.includes('Artisan’s Triumph'));
 assert.ok(!html.includes('property-rune slots'));
 const withoutRunes = structuredClone(source);
 withoutRunes.system.runes.property = [];
 assert.ok(!craftingDescription(withoutRunes, config).includes('Property Runes'));
 assert.deepEqual(source, before);
 assert.equal(craftingDescription({ ...source, isIdentified: false }, config), '');
 assert.equal(craftingDescription({ ...source, flags: {} }, config), '');
});
test('description integration retains native text and GM notes and installs only once', async () => {
 class Weapon { async getDescription() { return { value: '<p>Native description</p>', gm: 'Private notes' }; } }
 const classes = { weapon: Weapon };
 installCraftingDescription(() => config, classes);
 installCraftingDescription(() => config, classes);
 const weapon = Object.assign(new Weapon(), item());
 const result = await weapon.getDescription({ includeAddendum: false });
 assert.ok(result.value.startsWith('<p>Native description</p>'));
 assert.equal(result.value.split('class="cmt-crafting-description"').length, 2);
 assert.equal(result.gm, 'Private notes');
 assert.equal((await weapon.getDescription()).value, result.value);
});
