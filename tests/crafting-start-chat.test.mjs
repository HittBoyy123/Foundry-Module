import test from 'node:test';
import assert from 'node:assert/strict';
import { craftingStartContent, postCraftingStart } from '../scripts/crafting-start-chat.js';
const project = { name: '<Sword>', requiredProgress: 4, contributors: [], reservations: [2, 3].map(quantity => ({ state: 'reserved', materialId: 'metal', tier: 2, itemName: 'Steel', quantity, unitsPerItem: 1 })) };
test('crafting announcement combines reserved materials and escapes names', () => {
 const html = craftingStartContent(project, 'The Party');
 assert.match(html, /&lt;Sword&gt;/);
 assert.match(html, /5 units/);
 assert.equal((html.match(/Steel/g) ?? []).length, 1);
 assert.match(html, /Materials reserved in The Party/);
});
test('crafting announcement is public', async () => {
 let message;
 globalThis.ChatMessage = { getSpeaker: () => ({}), create: async value => { message = value; } };
 try {
  await postCraftingStart(project, { name: 'Party' });
  assert.deepEqual(message.whisper, []);
  assert.equal(message.blind, false);
 } finally { delete globalThis.ChatMessage; }
});
