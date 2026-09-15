import test from 'node:test';
import assert from 'node:assert/strict';
import { craftingMaterialSummary } from '../scripts/crafting-summary.js';
const option = (units, extra = {}) => ({ materialId: 'metal', tier: 2, tierMode: 'exact', maximumTier: 2, owned: 10, units, ...extra });
test('base and mark requirements combine while stash availability is counted once', () => {
 const rows = craftingMaterialSummary([{ options: [option(7)] }, { options: [option(5)] }]);
 assert.equal(rows.length, 1);
 assert.equal(rows[0].units, 12);
 assert.equal(rows[0].owned, 10);
 assert.equal(rows[0].missing, 2);
 assert.equal(rows[0].available, false);
});
test('different tiers and variants remain separate; alternative costs are not summed', () => {
 const rows = craftingMaterialSummary([{ options: [option(2)] }, { options: [option(3, { tier: 3 })] }, { options: [option(4, { variantId: 'red' })] }, { options: [option(1), option(2, { materialId: 'wood' })] }]);
 assert.equal(rows.length, 4);
 assert.equal(rows[3].alternative, true);
 assert.match(rows[3].label, / or /);
});
