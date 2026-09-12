import test from 'node:test';
import assert from 'node:assert/strict';
import {T,V} from '../js/math.js';
import {Simulation} from '../js/sim.js';
import {tickSpawns,tickAI} from '../js/ai.js';
import {tickScreens,incomingToScreen,screenFrame} from '../js/screens.js';
import {entityRay,resolveBody} from '../js/collision.js';
import {knightSwordPose} from '../js/knight-pose.js';
import {plasmaImpact,screenCue,chargeSettings} from '../js/synthesis.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function blank(){const g=new Simulation(729);g.entities=[];g.map.nests.forEach(n=>n.disabled=true);g.flags={knight:true,camel:true,trilo:true};g.timers={crate:9999,cage:9999,rift:9999,hornet:9999};g.time=2;g.player.p.set(0,0,0);g.grid.rebuild(g.entities);return g;}
test('hydra first head has 60 HP, splits after exactly ten seconds, compounds all heads',()=>{
 const g=blank(),n=g.map.nests[0];n.disabled=false;n.open=true;
 const first=g.spawn('hydra',V(0,0,8),{nest:0});near(first.hp,60);g.damage(first,100);near(n.headHealth,72);assert.equal(n.regrowth.length,1);
 g.time=11.999;tickSpawns(g,0);assert.equal(g.entities.filter(e=>e.alive&&e.type==='hydra').length,0);
 g.time=12;tickSpawns(g,0);let heads=g.entities.filter(e=>e.alive&&e.type==='hydra');assert.equal(heads.length,2);heads.forEach(e=>near(e.hp,72));
 g.damage(heads[1],12,V(),'enemy');g.damage(heads[0],100);near(n.headHealth,86.4);near(heads[1].maxHp,86.4);near(heads[1].hp,72);
 g.time=21.999;tickSpawns(g,0);assert.equal(g.entities.filter(e=>e.alive&&e.type==='hydra').length,1);
 g.time=22;tickSpawns(g,0);assert.equal(g.entities.filter(e=>e.alive&&e.type==='hydra').length,3);
});
test('simultaneous head kills have independent regrowth timers and no eight-head cap',()=>{
 const g=blank(),n=g.map.nests[0];n.disabled=false;n.open=true;
 for(let i=0;i<6;i++)g.damage(g.spawn('hydra',V(i,0,8),{nest:0}),10000);
 g.time+=10;tickSpawns(g,0);const heads=g.entities.filter(e=>e.alive&&e.type==='hydra');assert.equal(heads.length,12);heads.forEach(e=>near(e.maxHp,60*1.2**6));
});
test('destroyed nest cancels pending heads, removes its door and stays a traversable hole after saving',()=>{
 const g=blank(),n=g.map.nests[0];n.disabled=false;n.open=true;g.damage(g.spawn('hydra',V(0,0,8),{nest:0}),100);
 const kennel=g.add('kennel',n.pos,{nest:0,hp:240,maxHp:240});g.damage(kennel,300);assert.equal(n.disabled,true);assert.deepEqual(n.regrowth,[]);assert.ok(g.map.through(g.map.spheres[n.sphere],n.pos));
 const loaded=Simulation.restore(JSON.parse(JSON.stringify(g.snapshot())));loaded.time+=1000;tickSpawns(loaded,0);assert.equal(loaded.entities.filter(e=>e.alive&&e.type==='hydra'&&e.nest===0).length,0);assert.ok(loaded.map.through(loaded.map.spheres[n.sphere],n.pos));
});
test('camel health increases and old version saves migrate health without healing damage',()=>{
 const g=blank(),e=g.spawn('camel',V(0,0,7));near(e.maxHp,100);e.hp=14;e.maxHp=28;
 const old=g.snapshot();old.version=3;const next=Simulation.restore(old),camel=next.entities.find(e=>e.type==='camel');near(camel.maxHp,100);near(camel.hp,50);
});
test('regrowth deadlines and torn contours survive save/load unchanged',()=>{
 const g=blank(),n=g.map.nests[0];n.disabled=false;n.open=true;g.damage(g.spawn('hydra',V(0,0,8),{nest:0}),100);g.map.addHole(0,V(1,0,0),3);
 const next=Simulation.restore(JSON.parse(JSON.stringify(g.snapshot())));assert.deepEqual(next.map.nests[0].regrowth,n.regrowth);assert.deepEqual(next.map.spheres[0].holes.at(-1).profile,g.map.spheres[0].holes.at(-1).profile);near(next.map.nests[0].headHealth,72);
});
test('screens greet locally, predict approaching hits, flee off-screen and recover after danger',()=>{
 const g=blank(),q=new T.Quaternion().setFromUnitVectors(V(0,0,1),V(0,0,-1));
 const e=g.add('window',V(0,0,5),{q,kind:0}),other=g.add('window',V(15,0,5),{q:q.clone(),kind:1});g.grid.rebuild(g.entities);tickScreens(g,.11);assert.equal(e.screen.mode,'greet');assert.equal(other.screen.mode,'idle');assert.ok(g.events.some(e=>e.type==='carhorn'));
 const b=g.shot(V(),V(0,0,1),8,2);assert.ok(incomingToScreen(e,b)<1);g.time+=.11;tickScreens(g,.11);assert.equal(e.screen.mode,'flee');assert.equal(other.screen.mode,'idle');
 g.time+=.8;tickScreens(g,.11);assert.equal(screenFrame(e),6);g.projectiles=[];g.time+=3;tickScreens(g,.11);assert.notEqual(e.screen.mode,'hidden');
 const miss={alive:true,p:V(5,0,0),v:V(0,0,20),r:.1},away={alive:true,p:V(),v:V(0,0,-20),r:.1};assert.equal(incomingToScreen(e,miss),Infinity);assert.equal(incomingToScreen(e,away),Infinity);
});
test('red sword beam stops at a tough target and emits fire at that collision',()=>{
 const g=blank(),e=g.spawn('camel',V(0,0,8));g.grid.rebuild(g.entities);g.weapons.tip.set(0,0,0);g.weapons.fireLaser(V(0,0,1),.1);
 assert.equal(g.weapons.beam.color,0xff271f);near(g.weapons.beam.b.z,8-e.r-.08);const contact=g.events.find(x=>x.type==='ignite'&&x.target===e.id);assert.ok(contact);near(contact.p.distanceTo(g.weapons.beam.b),0);assert.ok(e.hp<100&&e.alive);
});
test('mech sword visibly charges before its purple beam uses the sword-tip pose',()=>{
 const g=blank(),e=g.spawn('knight',V(0,0,15),{cd:0});g.grid.rebuild(g.entities);
 for(let i=0;i<45;i++){g.time+=1/60;tickAI(g,1/60,{});}assert.equal(e.laserCast,'charge');assert.ok(e.laserCharge>.4);assert.equal(e.beam,null);
 for(let i=0;i<42;i++){g.time+=1/60;tickAI(g,1/60,{});}assert.equal(e.laserCast,'fire');assert.ok(e.beam);assert.equal(e.beam.color,0xac47ff);near(e.beam.a.distanceTo(knightSwordPose(e,g.time).tip),0);
});
test('wall fragments inherit their impact site and are curved collidable destructible zero-G platforms',()=>{
 const g=blank(),hit={type:'sphere',id:0,pos:V(45,0,0),normal:V(1,0,0)};for(let i=0;i<5;i++)g.map.scorch(hit,6);g.breach(hit);const fragments=g.entities.filter(e=>e.type==='hullChunk');assert.equal(fragments.length,6);
 const e=fragments[0];near(e.source.origin.length(),45);assert.equal(e.source.id,0);assert.equal(e.hp,42);
 e.p.set(0,0,10);e.q.identity();e.v.set(.3,.1,0);g.grid.rebuild(g.entities);
 const ray=entityRay(e.p.clone().add(V(0,3,0)),V(0,-1,0),e,5);near(ray,3);const body=e.p.clone().add(V(0,.2,0)),velocity=V(0,-1,0);assert.ok(resolveBody(body,velocity,e));assert.ok(body.y>.35);
 const before=e.v.clone();g.player.p.set(0,10,0);for(let i=0;i<30;i++)g.step(1/60,{});near(e.v.distanceTo(before),0);assert.ok(e.p.x>.1);g.damage(e,50);assert.equal(e.alive,false);
});
test('plasma explosions scale in duration and charge hum rises without clipping generated cues',()=>{
 assert.ok(plasmaImpact(14).length>plasmaImpact(1).length*2);assert.ok(chargeSettings(1).bass>chargeSettings(.1).bass*2);assert.ok(chargeSettings(1).volume>chargeSettings(.1).volume*4);
 for(const data of [plasmaImpact(1),plasmaImpact(14),plasmaImpact(28),screenCue('car'),screenCue('boat')]){let energy=0;for(const value of data){assert.ok(Number.isFinite(value)&&Math.abs(value)<1);energy+=value*value;}assert.ok(energy/data.length>.0001);assert.ok(Math.abs(data.at(-1))<.002);}
});
test('reused projectile records reset radius-independent charge, color and range',()=>{
 const g=blank(),first=g.shot(V(),V(0,0,1),10,1,{charge:1,color:0xff00ff,range:2});first.alive=false;g.tickProjectiles(1/60,{});const next=g.shot(V(),V(0,0,1),10,1);assert.equal(next.charge,0);assert.equal(next.color,0);assert.equal(next.range,0);
});
