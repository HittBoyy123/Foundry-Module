import test from 'node:test';
import assert from 'node:assert/strict';
import { hideRuneControls, placeMakeAndMarks } from '../scripts/item-sheet.js';

// Model both PF2e field-binding conventions without changing the native controls.
function sheet(binding, striking = true) {
  const fields = ['potency', ...(striking ? ['striking'] : []), 'property.0'].map(rune => {
    const path = `system.runes.${rune}`;
    const control = { name: binding === 'name' ? path : '', dataset: binding === 'data-property' ? { property: path } : {}, value: rune === 'striking' ? '2' : '0' };
    const matches = selector => selector.split(',').some(part => part.trim() === `[${binding}="${path}"]` || part.trim() === `[${binding}^="system.runes."]`);
    const row = { hidden: false, dataset: {}, querySelector: selector => matches(selector) ? control : null };
    control.closest = () => row;
    return { control, row, matches };
  });
  const material = { hidden: false }, legend = { textContent: 'Material and Runes' };
  const panel = { hidden: true, dataset: {}, querySelector: selector => selector === '.precious-material' ? material : selector === 'legend' ? legend : fields.find(f => f.matches(selector))?.control, before(strip) { this.strip = strip; } };
  const root = { querySelector: selector => selector === 'fieldset.material-runes' ? panel : null, querySelectorAll: selector => fields.filter(f => f.matches(selector)).map(f => f.control) };
  return { root, panel, fields, material, legend };
}
for (const binding of ['name', 'data-property']) test(`Striking remains editable beside crafted material with ${binding} fields`, () => {
  globalThis.game = { i18n: { localize: key => key } };
  const { root, panel, fields, material, legend } = sheet(binding);
  const strip = { classList: { add() {} } };
  const original = fields[1].control;
  hideRuneControls(root);
  placeMakeAndMarks(root, strip, null);
  assert.equal(panel.hidden, false);
  assert.equal(panel.strip, strip);
  assert.equal(fields[1].row.hidden, false);
  assert.equal(fields[0].row.hidden, true);
  assert.equal(fields[2].row.hidden, true);
  assert.equal(material.hidden, true);
  assert.equal(legend.textContent, 'Striking Rune');
  assert.equal(fields[1].control, original);
  assert.equal(original.value, '2');
  assert.equal(original.disabled, undefined);
});
test('a sheet without Striking keeps the replaced native rune panel hidden', () => {
  const { root, panel } = sheet('data-property', false);
  hideRuneControls(root);
  placeMakeAndMarks(root, { classList: { add() {} } }, null);
  assert.equal(panel.hidden, true);
});
