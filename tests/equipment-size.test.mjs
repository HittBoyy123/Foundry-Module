import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleEquipmentRecipe } from '../scripts/equipment-size.js';
const recipe = { ingredientSets: [{ groups: [{ id: 'core', options: [{ units: 7 }] }, { id: 'mark', options: [{ units: 1 }] }, { id: 'dragon-scale', options: [{ units: 5 }] }] }] };
test('equipment size uses linear 25 percent steps and rounds down for every size', () => {
 for (const [size, expected] of [['tiny',3],['sm',5],['med',7],['lg',8],['huge',10],['grg',12]]) {
  const scaled = scaleEquipmentRecipe(recipe, size);
  assert.equal(scaled.ingredientSets[0].groups[0].options[0].units, expected);
  assert.ok(scaled.ingredientSets[0].groups[1].options[0].units >= 1);
 }
 assert.equal(recipe.ingredientSets[0].groups[0].options[0].units, 7);
 assert.equal(scaleEquipmentRecipe(recipe, 'lg').ingredientSets[0].groups[2].options[0].units, 6);
});
