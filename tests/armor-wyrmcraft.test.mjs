import test from 'node:test';
import assert from 'node:assert/strict';
import { validateArtisanTeam } from '../scripts/workbench-team.js';
const recipe = { ingredientSets: [{ groups: [{ id: 'core', options: [{ materialId: 'metal' }] }] }] };
const lead = { actorUuid: 'Actor.lead', professions: [{ name: 'Blacksmithing', materialIds: ['metal'] }], specializations: [] };
test('armor resistance requires Wyrmcraft, while plain armor does not', () => {
 assert.equal(validateArtisanTeam(recipe, ['Actor.lead'], [lead], { armor: true }).valid, true);
 const blocked = validateArtisanTeam(recipe, ['Actor.lead'], [lead], { armor: true, dragonResistance: true });
 assert.equal(blocked.valid, false);
 assert.equal(blocked.slots[2].role, 'Wyrmcraft Specialist');
 assert.equal(blocked.slots[2].required, true);
 const specialist = { ...lead, actorUuid: 'Actor.wyrm', specializations: [{ professionId: 'leatherwork', specializationId: 'specialty-1' }] };
 assert.equal(validateArtisanTeam(recipe, ['Actor.lead', '', 'Actor.wyrm'], [lead, specialist], { armor: true, dragonResistance: true }).valid, true);
 specialist.specializations[0].specializationId = 'specialty-2';
 assert.equal(validateArtisanTeam(recipe, ['Actor.lead', '', 'Actor.wyrm'], [lead, specialist], { armor: true, dragonResistance: true }).valid, false);
});
