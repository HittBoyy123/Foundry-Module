import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFESSION_EXAMPLES, PROFESSION_EXAMPLE_MACROS } from '../content/profession-examples.js';
import { PROFESSION_DEFINITIONS } from '../content/professions.js';
import { exampleActorSource, createProfessionExamples } from '../scripts/profession-examples.js';
test('demo roster covers every profession exactly once with casters and noncasters',()=>{
 assert.deepEqual(PROFESSION_EXAMPLES.map(p=>p.professionId).sort(),PROFESSION_DEFINITIONS.map(p=>p.id).sort());
 assert.equal(PROFESSION_EXAMPLES.filter(p=>p.spellcaster).length,6);
 assert.equal(new Set(PROFESSION_EXAMPLES.map(p=>p.foundation)).size,11);
 assert.equal(PROFESSION_EXAMPLE_MACROS[0]._id.length,16);
});
test('example cloning retains spell links and build data without world identity or ownership',()=>{
 const source={_id:'source',folder:'old',ownership:{oldUser:3},_stats:{compendiumSource:'old'},name:'base',type:'character',items:[{_id:'entry',type:'spellcastingEntry'},{_id:'spell',type:'spell',system:{location:{value:'entry'}}}],system:{skills:{crafting:{rank:0}},details:{biography:{value:'original'},level:{value:5}}},prototypeToken:{actorId:'old'}};
 const original=structuredClone(source),result=exampleActorSource(source,PROFESSION_EXAMPLES[2]);
 assert.deepEqual(source,original);assert.deepEqual(result.items,source.items);
 assert.equal(result._id,undefined);assert.equal(result.folder,undefined);assert.equal(result._stats,undefined);
 assert.deepEqual(result.ownership,{default:2});assert.equal(result.prototypeToken.actorId,undefined);
 assert.equal(result.system.skills.crafting.rank,1);assert.equal(result.system.details.level.value,5);
 source.system.skills.crafting.rank=3;assert.equal(exampleActorSource(source,PROFESSION_EXAMPLES[0]).system.skills.crafting.rank,3);
});
test('only GMs can generate examples',async()=>{
 const previous=globalThis.game;globalThis.game={user:{isGM:false}};
 try { await assert.rejects(createProfessionExamples(),/Only the GM/); } finally {globalThis.game=previous;}
});
