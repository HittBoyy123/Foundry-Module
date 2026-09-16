import test from 'node:test';
import assert from 'node:assert/strict';
import { projectDayPips } from '../scripts/project-day-pips.js';
test('project pips show five completed and fourteen remaining out of nineteen', () => {
 const result = projectDayPips({ currentProgress: 5, requiredProgress: 19 });
 assert.equal(result.dayPips.length, 19);
 assert.equal(result.dayPips.filter(p => p.completed).length, 5);
 assert.equal(result.daysRemaining, 14);
 assert.equal(projectDayPips({ currentProgress: 19, requiredProgress: 19 }).daysRemaining, 0);
});
