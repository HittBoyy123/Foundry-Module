import test from 'node:test';
import assert from 'node:assert/strict';
import { itemTraitSummary } from '../scripts/item-trait-summary.js';
test('item traits use localized names and suppress duplicates', () => {
 assert.equal(itemTraitSummary({ type: 'armor', system: { traits: { value: ['bulwark','bulwark'] } } }, { armorTraits: { bulwark: 'Trait.Bulwark' } }, () => 'Bulwark'), 'Bulwark');
 assert.equal(itemTraitSummary({ type: 'weapon', system: { traits: { value: ['agile','finesse'] } } }), 'Agile · Finesse');
 assert.equal(itemTraitSummary({ type: 'armor', system: { category: 'heavy' } }), '');
});
