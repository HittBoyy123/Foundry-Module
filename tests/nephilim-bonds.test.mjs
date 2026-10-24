import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_ID } from '../scripts/constants.js';
import { NEPHILIM_BONDS, createBondSource, validateBondSelection, bondAllowance, bondMilestones, preparedBondRules, chooseBond, installBondRules, staminaSlotUpdates } from '../scripts/nephilim-bonds.js';
const party=value=>({flags:{[MODULE_ID]:{nephilimPoints:{value}}}});
const actor=(points=2)=>({type:'character',level:1,isOwner:true,parties:[party(points)],items:[]});
test('new gifts require two points even when placed in the first slot',()=>{
 for(const id of ['communion','pincer','charge','valor','stamina']) {
  assert.throws(()=>validateBondSelection({id,slot:1,choice:'will'},[],1),/requires 2/);
  const a=actor(1),i=add(a,id,1,'will');assert.deepEqual(preparedBondRules(i),[]);
 }
});
test('ally gifts require another active holder in the same party and do not multiply by ally count',()=>{
 for(const [id,value] of [['communion',3],['pincer',3],['valor',4]]) {
  const a=actor(),b=actor(),p=a.parties[0];b.parties=[p];p.members=[a,b];
  const own=add(a,id,1,'will');assert.deepEqual(preparedBondRules(own),[]);
  add(b,id,2,'reflex');assert.equal(preparedBondRules(own)[0].value,value);
  add(a,id,2,'fortitude');assert.equal(a.items.flatMap(preparedBondRules).length,2);
  p.members=[a];assert.deepEqual(preparedBondRules(own),[]);
 }
});
test('charge retains its selected toggle and restricts bonus to melee strikes',()=>{
 const a=actor(),i=add(a,'charge',1);i.system.rules[0].value=true;
 const rules=preparedBondRules(i);assert.equal(rules[0].value,true);
 assert.equal(rules[1].selector,'strike-attack-roll');assert.deepEqual(rules[1].predicate,['nephilim-charge','item:melee']);
});
test('stamina grants once per accessible rank, stacks, excludes cantrips, and reverses only its own slots',()=>{
 const a=actor();add(a,'stamina',1);add(a,'stamina',2);
 const entry={id:'caster',type:'spellcastingEntry',system:{prepared:{value:'spontaneous'},slots:{slot0:{max:5,value:5},slot1:{max:3,value:1},slot2:{max:2,value:0},slot3:{max:0,value:0}}}};
 a.items.push(entry,{...entry,id:'second'});
 let updates=staminaSlotUpdates(a);assert.equal(updates.length,1);
 assert.equal(updates[0]['system.slots.slot1.max'],5);assert.equal(updates[0]['system.slots.slot1.value'],3);
 assert.equal(updates[0]['system.slots.slot2.max'],4);assert.equal(updates[0]['system.slots.slot3.max'],undefined);
 assert.equal(updates[0]['system.slots.slot0.max'],undefined);
 a.items.pop();entry.flags={[MODULE_ID]:{nephilimStamina:{slot1:2,slot2:2}}};
 entry.system.slots.slot1={max:5,value:2};entry.system.slots.slot2={max:4,value:0};
 assert.deepEqual(staminaSlotUpdates(a),[]);
 a.parties=[party(1)];updates=staminaSlotUpdates(a);
 assert.equal(updates[0]['system.slots.slot1.max'],3);assert.equal(updates[0]['system.slots.slot1.value'],0);
});
function add(a,id,slot,choice){const i=createBondSource({id,slot,choice});i.actor=a;a.items.push(i);return i;}
test('shared points unlock slots regardless of level and independent party pools do not add',()=>{
 const a=actor();assert.equal(bondAllowance(a),2);assert.deepEqual(bondMilestones(a).filter(s=>s.unlocked).map(s=>s.milestone),[1,2]);
 a.level=20;a.parties=[];assert.equal(bondAllowance(a),0);
 a.parties=[party(2),party(3)];assert.equal(bondAllowance(a),3);
 assert.throws(()=>validateBondSelection({id:'skin',slot:3},[],2));
 assert.equal(validateBondSelection({id:'skin',slot:2},[{id:'skin',slot:1}],2).id,'skin');
});
test('all repeated gifts have additive rules and unique modifier slugs',()=>{
 for(const gift of NEPHILIM_BONDS.filter(gift => !gift.minimumPoints)){const a=actor();const x=add(a,gift.id,1,gift.choices?.[0]), y=add(a,gift.id,2,gift.choices?.[0]);
 const first=preparedBondRules(x),second=preparedBondRules(y);assert.ok(first.length);assert.ok(second.length);
 for(const rule of [...first,...second]){assert.deepEqual(rule.predicate,[]);if(rule.key==='FlatModifier')assert.equal(rule.type,'untyped');else assert.equal(rule.mode,'add');}
 if(first[0].key==='FlatModifier')assert.notEqual(first[0].slug,second[0].slug);
 }
 const a=actor();assert.equal([add(a,'skin',1),add(a,'skin',2)].flatMap(preparedBondRules).reduce((sum,r)=>sum+r.value,0),4);
 assert.throws(()=>createBondSource({id:'will',slot:1,choice:'bad'}));
});
test('point loss disables later choices and return restores them without deleting choices',()=>{
 const a=actor(),one=add(a,'skin',1),two=add(a,'skin',2);
 a.parties=[party(1)];assert.equal(preparedBondRules(one).length,1);assert.deepEqual(preparedBondRules(two),[]);
 assert.equal(a.items.length,2);a.parties=[party(2)];assert.equal(preparedBondRules(two).length,1);
 a.parties=[];assert.deepEqual(preparedBondRules(one),[]);
});
test('legacy milestone choices use ordered point slots, retaining original documents',()=>{
 const a=actor();const legacy={name:'Nephilim Skin',actor:a,flags:{[MODULE_ID]:{nephilimBond:{id:'skin',milestone:10}}},system:{rules:[{predicate:[{gte:['self:level',10]}]}]}};a.items.push(legacy);
 assert.equal(bondMilestones(a)[1].selected,true);assert.deepEqual(preparedBondRules(legacy)[0].predicate,[]);
 assert.equal(legacy.flags[MODULE_ID].nephilimBond.milestone,10);
 a.parties=[party(1)];assert.deepEqual(preparedBondRules(legacy),[]);
});
test('native rule preparation uses current points and restores saved source rules',()=>{
 const old=globalThis.CONFIG;class Feat {prepareRuleElements(){return structuredClone(this.system.rules);}}
 globalThis.CONFIG={PF2E:{Item:{documentClasses:{feat:Feat}}}};
 try{installBondRules();installBondRules();const a=actor(),f=Object.assign(new Feat(),createBondSource({id:'skin',slot:2}));f.actor=a;a.items.push(f);const saved=f.system.rules;
 assert.equal(f.prepareRuleElements().length,1);a.parties=[party(1)];assert.deepEqual(f.prepareRuleElements(),[]);assert.equal(f.system.rules,saved);
 }finally{globalThis.CONFIG=old;}
});
test('point loss during the chooser prevents saving a newly locked bond',async()=>{
 const old=globalThis.foundry,a=actor();globalThis.foundry={applications:{api:{DialogV2:{wait:async()=>{a.parties=[party(1)];return {id:'skin',slot:2};}}}}};
 try{await assert.rejects(chooseBond(a,2),/shared Nephilim points/);}finally{globalThis.foundry=old;}
});
