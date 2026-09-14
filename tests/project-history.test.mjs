import test from 'node:test';
import assert from 'node:assert/strict';
import { captureProjectDate, archivedProjectMatches } from '../scripts/project-history.js';
import { createCraftingProject, normalizeCraftingProject, completeCraftingProject, recordProjectDisassembly } from '../scripts/crafting-projects.js';
import { buildCraftingRecipeFromBand } from '../scripts/recipe-catalog.js';

test('campaign date captures zero and safely handles missing calendars', () => {
  assert.deepEqual(captureProjectDate({ worldTime: 0, calendar: { format: time => 'Campaign day ' + time } }), { worldTime: 0, label: 'Campaign day 0' });
  assert.deepEqual(captureProjectDate({ worldTime: 12 }), { worldTime: 12, label: '' });
  assert.deepEqual(captureProjectDate({}), { worldTime: null, label: '' });
});
test('completion and disassembly preserve separate campaign dates and archive automatically', () => {
  const recipe = buildCraftingRecipeFromBand('weapon-sword', { targetItem: { type: 'weapon', system: { category: 'martial' } }, tier: 2 });
  const project = { ...createCraftingProject({ recipe }), status: 'ready' };
  globalThis.game = { time: { worldTime: 0, calendar: { format: time => 'Campaign day ' + time } } };
  try {
    const completed = completeCraftingProject(project);
    game.time.worldTime = 100;
    const dismantled = normalizeCraftingProject(recordProjectDisassembly(completed, [], {}));
    assert.equal(dismantled.archived, true);
    assert.equal(dismantled.completedWorldDate, 'Campaign day 0');
    assert.equal(dismantled.disassembledWorldDate, 'Campaign day 100');
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
