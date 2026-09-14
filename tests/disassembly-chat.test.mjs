import test from 'node:test';
import assert from 'node:assert/strict';
import { disassemblyChatContent, postDisassemblyChat } from '../scripts/disassembly-chat.js';
const plan = (name, quantity) => ({ itemName: name, stackQuantity: 20, returns: [{ materialId: 'metal', tier: 3, variantId: '', name: 'Cold Iron', quantity }] });
test('disassembly chat lists stack quantities and combines material rewards', () => {
  const content = disassemblyChatContent('The Party', [plan('Sword', 30), plan('Shield', 10)]);
  assert.match(content, /Sword × <strong>20/);
  assert.match(content, /Shield × <strong>20/);
  assert.match(content, /Cold Iron — Tier 3: <strong>40/);
  assert.equal((content.match(/Cold Iron/g) ?? []).length, 1);
});
test('disassembly chat escapes item and party names', () => {
  const content = disassemblyChatContent('<party>', [plan('<img src=x>', 1)]);
  assert.ok(!content.includes('<img'));
  assert.match(content, /&lt;party&gt;/);
});
test('disassembly posts publicly and skips empty results', async () => {
  const messages = [];
  globalThis.ChatMessage = { getSpeaker: () => ({}), create: async data => messages.push(data) };
  await postDisassemblyChat({ name: 'Party' }, []);
  assert.equal(messages.length, 0);
  await postDisassemblyChat({ name: 'Party' }, [plan('Sword', 30)]);
  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0].whisper, []);
  assert.equal(messages[0].blind, false);
  delete globalThis.ChatMessage;
});
