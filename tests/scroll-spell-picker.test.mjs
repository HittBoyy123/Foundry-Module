import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollSpellbookChoices, scrollSpellbookGroups, scrollSpellbookHTML } from '../scripts/scroll-spell-picker.js';
import { knownCraftingSpells, validateScrollSpell } from '../scripts/scroll-crafting.js';
const spell=(id,name,rank,traits=[])=>({id,uuid:`Actor.one.Item.${id}`,name,type:'spell',img:'icons/svg/book.svg',system:{level:{value:rank},location:{value:'entry'},traits:{value:traits},time:{value:'2'},range:{value:'30 feet'},defense:{save:{statistic:'will',basic:true}}}});
const actor=(uuid,items)=>({uuid,name:'PRIVATE PROVIDER',items:[{id:'entry',type:'spellcastingEntry',system:{prepared:{value:'prepared'}}},...items]});
test('spellbook combines participants, groups by rank and merges identical shared spells',()=>{
 const a=actor('Actor.one',[spell('f','Fireball',3),spell('l','Light',1,['cantrip']),spell('b','Bane',1)]);
 const b=actor('Actor.two',[spell('b2','Bane',1),spell('a','Alarm',1)]);
 const choices=scrollSpellbookChoices([{actor:a},{actor:b}]);
 assert.deepEqual(choices.map(c=>c.spell.name),['Alarm','Bane','Fireball']);
 assert.deepEqual(scrollSpellbookGroups(choices).map(g=>g.label),['1st Rank','3rd Rank']);
 assert.equal(choices.find(c=>c.spell.name==='Bane').actor.uuid,'Actor.one');
 assert.deepEqual(scrollSpellbookGroups(choices,' FIRE ').flatMap(g=>g.spells.map(c=>c.spell.name)),['Fireball']);
 assert.equal(scrollSpellbookGroups(choices,'unknown').length,0);
});
test('cantrips are hidden; focus spells and item spells remain excluded',async()=>{
 const a=actor('Actor.one',[spell('l','Light',1,['cantrip']),spell('f','Focus',1,['focus'])]);
 assert.equal(knownCraftingSpells(a).length,0);
 const choices=scrollSpellbookChoices([{actor:a}]);assert.equal(choices.length,0);
 await assert.rejects(validateScrollSpell({actorUuid:a.uuid,spellUuid:a.items[1].uuid,rank:1},[a.uuid],async()=>a),/still know/);
 assert.ok(!scrollSpellbookHTML(choices).includes("Cantrips"));
 a.items[0].system.prepared.value='items';assert.equal(scrollSpellbookChoices([{actor:a}]).length,0);
});
test('spell rows escape data, hide provider names and retain mechanical variants',()=>{
 const a=actor('Actor.one',[spell('a','Bane',1),spell('b','Bane',1),spell('x','<Unsafe>',2)]);
 a.items[2].system.range.value='120 feet';
 const choices=scrollSpellbookChoices([{actor:a}]);assert.equal(choices.length,3);
 const html=scrollSpellbookHTML(choices);
 assert.ok(!html.includes('PRIVATE PROVIDER'));assert.ok(!html.includes('<Unsafe>'));assert.ok(html.includes('&lt;Unsafe&gt;'));
 assert.ok(html.includes('basic Will'));assert.ok(html.includes('120 feet'));assert.ok(html.includes('cmt-spell-glyph'));
 assert.ok(html.includes('Read Bane'));
});

test('scroll tiers use native item levels through the shared material thresholds', async()=>{
 const { scrollMaterialTiers } = await import('../scripts/scroll-crafting.js');
 const levels=[1,3,5,7,9,11,13,15,17,19];
 const uuids=Object.fromEntries(levels.map((_,i)=>[i+1,String(i)]));
 const tiers=await scrollMaterialTiers([1,2,3,4,5,6,7,8,9,10], async id=>({type:'consumable',system:{category:'scroll',level:{value:levels[Number(id)]}}}),uuids);
 assert.deepEqual(Object.values(tiers),[1,2,3,3,4,4,5,5,6,6]);
 const choices=scrollSpellbookChoices([{actor:actor('Actor.one',[spell('b','Bane',1)])}]);
 choices[0].minimumTier=tiers[1];
 assert.match(scrollSpellbookHTML(choices),/Material Tier/);
 assert.match(scrollSpellbookHTML(choices),/>Tier 1</);
 assert.match(scrollSpellbookHTML(choices),/cmt-spell-square/);
});
