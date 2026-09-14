import test from 'node:test';
import assert from 'node:assert/strict';
import { captureProjectDate, archivedProjectMatches, formatProjectDate, projectHistoryDate } from '../scripts/project-history.js';
import { createCraftingProject, normalizeCraftingProject, completeCraftingProject, recordProjectDisassembly } from '../scripts/crafting-projects.js';
import { buildCraftingRecipeFromBand } from '../scripts/recipe-catalog.js';

test('campaign date captures zero and safely handles missing calendars', () => {
  assert.deepEqual(captureProjectDate({ worldTime: 0, calendar: { timeToComponents: time => ({ dayOfMonth: time === 0 ? 6 : 22, month: 0, year: 0 }), months: { values: [{ name: 'Rova' }] }, years: { yearZero: 4710 } } }), { worldTime: 0, label: '7th Rova 4710' });
  assert.deepEqual(captureProjectDate({ worldTime: 12 }), { worldTime: 12, label: '' });
  assert.deepEqual(captureProjectDate({}), { worldTime: null, label: '' });
});
test('completion and disassembly preserve separate campaign dates and archive automatically', () => {
  const recipe = buildCraftingRecipeFromBand('weapon-sword', { targetItem: { type: 'weapon', system: { category: 'martial' } }, tier: 2 });
  const project = { ...createCraftingProject({ recipe }), status: 'ready' };
  globalThis.game = { time: { worldTime: 0, calendar: { timeToComponents: time => ({ dayOfMonth: time === 0 ? 6 : 22, month: 0, year: 0 }), months: { values: [{ name: 'Rova' }] }, years: { yearZero: 4710 } } } };
  try {
    const completed = completeCraftingProject(project);
    game.time.worldTime = 100;
    const dismantled = normalizeCraftingProject(recordProjectDisassembly(completed, [], {}));
    assert.equal(dismantled.archived, true);
    assert.equal(dismantled.completedWorldDate, '7th Rova 4710');
    assert.equal(dismantled.disassembledWorldDate, '23rd Rova 4710');
    assert.equal(dismantled.completedWorldTime, 0);
    assert.equal(archivedProjectMatches(dismantled, 'crafted'), false);
    assert.equal(archivedProjectMatches(dismantled, 'disassembled'), true);
    assert.equal(normalizeCraftingProject({ ...dismantled, archived: false }).archived, true);
  } finally { delete globalThis.game; }
});
test('archive categories separate crafted and disassembled records', () => {
  assert.equal(archivedProjectMatches({ archived: true }, 'crafted'), true);
  assert.equal(archivedProjectMatches({ archived: true }, 'disassembled'), false);
  assert.equal(archivedProjectMatches({ archived: false }, 'crafted'), false);
  assert.equal(archivedProjectMatches({ disassembledAt: 1 }, 'disassembled'), true);
});

test('PF2e dates include the configured era and reformat stored event times', () => {
  globalThis.CONFIG = { PF2E: { worldClock: { AR: { yearOffset: 2700, Era: 'AR', Months: { September: 'Rova' } } } } };
  globalThis.game = { pf2e: { worldClock: { dateTheme: 'AR', worldCreatedOn: { plus: ({ seconds }) => ({ day: seconds, year: 2010, setLocale: () => ({ monthLong: 'September' }) }) } } } };
  try {
    for (const [day, suffix] of [[1,'st'],[2,'nd'],[3,'rd'],[7,'th'],[11,'th'],[12,'th'],[13,'th'],[21,'st'],[23,'rd']]) {
      assert.equal(formatProjectDate(day), `${day}${suffix} Rova 4710 AR`);
    }
    assert.equal(projectHistoryDate({ disassembledAt: 1, disassembledWorldTime: 7, disassembledWorldDate: 'old date 12:30:00' }), '7th Rova 4710 AR');
    assert.equal(formatProjectDate(null), '');
  } finally { delete globalThis.game; delete globalThis.CONFIG; }
});
