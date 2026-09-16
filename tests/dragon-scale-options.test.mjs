import test from 'node:test';
import assert from 'node:assert/strict';
import { dragonScaleOptions } from '../scripts/dragon-scale-options.js';
import { MODULE_ID } from '../scripts/constants.js';
const item = (tier, quantity) => ({ system: { quantity }, flags: { [MODULE_ID]: { resource: { materialId: 'dragon-scale', tier, variantId: 'red', unitsPerItem: 1 } } } });
test('scale choices combine available stock and preserve distinct tiers', () => {
 const options = dragonScaleOptions([item(2, 3), item(2, 4), item(3, 1), item(4, 0)], { red: { label: 'Red' } });
 assert.deepEqual(options.map(o => [o.id, o.units]), [['red:2',7], ['red:3',1]]);
});
test('depleted selected scales remain visible as unavailable instead of changing selection', () => {
 const options = dragonScaleOptions([], { red: { label: 'Red' } }, { color: 'red', tier: 2 });
 assert.equal(options[0].selected, true);
 assert.equal(options[0].unavailable, true);
});
