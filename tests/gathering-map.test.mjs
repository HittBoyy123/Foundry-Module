import test from 'node:test';
import assert from 'node:assert/strict';
import { viewStolenLandsMap } from '../scripts/gathering-map.js';
test('map shortcut views only the selected scene without activating it', async () => {
  let viewed = 0;
  await viewStolenLandsMap([{ name: 'The Stolen Lands', view: async () => viewed++, activate: () => assert.fail('must not activate') }, { name: 'Other Scene' }]);
  assert.equal(viewed, 1);
});
test('map shortcut reports missing and ambiguous scenes', async () => {
  await assert.rejects(viewStolenLandsMap([]), /not available/);
  await assert.rejects(viewStolenLandsMap([{ name: 'Stolen Lands' }, { name: 'Stolen Lands Map' }]), /More than one/);
});
