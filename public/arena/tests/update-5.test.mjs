import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../js/sim.js';import {V,T} from '../js/math.js';import {RULES} from '../js/data.js';import {tickAI,tickSpawns} from '../js/ai.js';import {fragmentChime,slashCrackle} from '../js/synthesis.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function blank(){const g=new Simulation(172);g.entities=[];g.map.nests.forEach(n=>n.disabled=true);g.map.hatches=[];g.flags={knight:true,camel:true,trilo:true};g.timers={crate:9999,cage:9999,rift:9999,hornet:9999};g.time=2;g.player.p.set(0,0,0);g.grid.rebuild(g.entities);return g;}
function advanceAI(g,e,seconds=90,stopDistance=12){let crossed=false;for(let i=0;i<seconds*60;i++){g.time+=1/60;g.grid.rebuild(g.entities);tickAI(g,1/60,{});g.events=[];if(g.map.sector(e.p)<0)crossed=true;if(e.p.distanceTo(g.player.p)<stopDistance)break;}return crossed;}
test('hydra box is exactly three base heads, never scales with regrowth, and damaged v4 saves migrate proportionally',()=>{
 const g=new Simulation(381),k=g.entities.find(e=>e.type==='kennel'),n=g.map.nests[k.nest];near(k.hp,180);near(k.hp,3*RULES.hydraBaseHealth);n.disabled=false;n.open=true;g.damage(g.spawn('hydra',V(0,0,8),{nest:k.nest}),100);near(n.headHealth,72);near(k.maxHp,180);g.damage(k,179);assert.ok(k.alive);g.damage(k,1);assert.ok(!k.alive&&n.disabled);
 const old=new Simulation(71),box=old.entities.find(e=>e.type==='kennel');box.hp=120;box.maxHp=240;old.map.nests[box.nest].hp=120;const save=old.snapshot();save.version=4;const next=Simulation.restore(save),loaded=next.entities.find(e=>e.id===box.id);near(loaded.hp,90);near(loaded.maxHp,180);near(next.map.nests[box.nest].hp,90);
});
test('walls have 15 percent higher structural threshold and block travel from both sides until breached',()=>{
 const g=blank(),m=g.map,s=m.spheres[0],o=V(0,60,0),dir=V(0,-1,0);m.spheres[0].holes=[];near(RULES.wallStrength,4*1.15);assert.equal(m.ray(o,dir,30,true).type,'sphere');const hit=m.ray(s.c,V(0,1,0),50);for(let i=0;i<4;i++)assert.equal(m.scorch(hit),false);assert.ok(m.scorch(hit));assert.equal(m.ray(o,dir,30,true),null);
});
test('all six mobile enemy families leave a sphere through a breach instead of orbiting its edge',()=>{
 for(const type of ['drone','camel','knight','trilo','lemur','hornet']){const g=blank();g.player.p.set(0,63,0);g.map.addHole(0,V(0,1,0),3.4);const e=g.spawn(type,V(15,5,0),{sphere:0,cd:9999});assert.ok(advanceAI(g,e),type+' never exited');assert.ok(e.p.distanceTo(g.player.p)<12,type+' did not pursue');assert.equal(g.map.navigator.builds,1);}
});
test('pursuit crosses multiple tunnels to an exit in a different sphere',()=>{
 const g=blank();g.player.p.set(0,63,0);g.map.addHole(0,V(0,1,0),3.4);const e=g.spawn('drone',g.map.spheres[7].c,{cd:9999});assert.ok(advanceAI(g,e,130));assert.ok(e.p.distanceTo(g.player.p)<12,e.p.toArray().join(','));
});
test('exterior pursuit goes around solid hull and crossing tunnel without entering them',()=>{
 const g=blank();g.player.p.set(0,60,0);const e=g.spawn('camel',V(0,-60,0),{cd:9999});advanceAI(g,e,100);assert.ok(e.p.distanceTo(g.player.p)<12,e.p.toArray().join(','));assert.equal(g.map.sector(e.p),-1);
});
test('outside enemies re-enter through a breach to reach an inside player',()=>{
 const g=blank();g.map.addHole(0,V(0,1,0),3.4);g.player.p.set(12,0,0);const e=g.spawn('drone',V(0,60,0),{cd:9999});advanceAI(g,e,100);assert.equal(g.map.sector(e.p),0);assert.ok(e.p.distanceTo(g.player.p)<12,e.p.toArray().join(','));
});
test('enemy projectile damage exhausts hull then power and actually ends the run',()=>{
 const g=blank();g.weapons.base.set(9,9,9);g.weapons.tip.set(9,9,10);for(let i=0;i<60&&!g.over;i++){g.time+=.5;g.player.inv=0;g.shot(V(0,0,1),V(0,0,-1),60,2,{owner:'enemy'});g.tickProjectiles(1/60,{});}assert.equal(g.over,true);near(g.player.hearts,0);near(g.player.energy,0);assert.ok(g.events.some(e=>e.type==='gameover'));const time=g.time;g.step(1/60,{});near(g.time,time);
});
test('resting sword cannot passively shield a shot, but a swept blade intercept before the player does',()=>{
 for(const speed of [0,8]){const g=blank();g.weapons.base.set(0,0,.5);g.weapons.tip.set(0,0,1.8);g.weapons.swing=speed;g.shot(V(0,0,2.5),V(0,0,-1),180,2,{owner:'enemy'});g.tickProjectiles(1/60,{});near(g.player.hearts,speed?20:18);}
 const g=blank();g.weapons.base.set(0,0,-1);g.weapons.tip.set(0,0,-2);g.weapons.swing=8;g.shot(V(0,0,1),V(0,0,-1),240,2,{owner:'enemy'});g.tickProjectiles(1/60,{});near(g.player.hearts,18);
});
test('hostile splash and nearby barrel chains damage player, and wells pause healing during hits',()=>{
 const g=blank();g.blast(V(1,0,0),4,3,'enemy');assert.ok(g.player.hearts<20);const after=g.player.hearts;g.add('well',V(),{r:8,invulnerable:true});for(let i=0;i<60;i++)g.step(1/60,{});near(g.player.hearts,after);for(let i=0;i<120;i++)g.step(1/60,{});assert.ok(g.player.hearts>after);g.player.inv=0;const before=g.player.hearts;g.blast(V(1,0,0),4,3,'chain');assert.ok(g.player.hearts<before);
});
test('saved excessive immunity is clamped; depleted saved runs cannot resume alive',()=>{
 const g=blank();g.player.inv=1e9;const loaded=Simulation.restore(g.snapshot());assert.ok(loaded.player.inv<=.38);for(let i=0;i<25;i++)loaded.step(1/60,{});loaded.hurt(2);near(loaded.player.hearts,18);g.player.energy=0;assert.equal(Simulation.restore(g.snapshot()).over,true);
});
test('physical swing emits one collidable red slash; walking and steady holding do not',()=>{
 const g=blank(),w=g.weapons,input={right:{offset:V(),dir:V(0,0,1)}};w.tick(1/60,input);g.player.p.x+=1;w.tick(1/60,input);assert.equal(g.projectiles.length,0);input.right.offset.x=.14;w.tick(1/60,input);assert.equal(g.projectiles.length,1);const b=g.projectiles[0];assert.equal(b.kind,'slash');assert.equal(b.color,0xff193e);assert.ok(g.events.some(e=>e.type==='energyslash'));
 for(let i=0;i<8;i++){input.right.offset.x+=.14;w.tick(1/60,input);}assert.equal(g.projectiles.length,1,'cooldown');const enemy=g.spawn('camel',b.p.clone().add(V(0,0,2)));g.grid.rebuild(g.entities);const hp=enemy.hp;for(let i=0;i<10;i++)g.tickProjectiles(1/60,{});assert.ok(enemy.hp<hp);assert.ok(g.events.some(e=>e.type==='ignite'&&e.target===enemy.id));
});
test('swarm intervals scale by 1.3 and stochastic rounding averages 30 percent larger batches, announced once',()=>{
 const g=blank();let count=0,events=0;for(let i=0;i<1000;i++){g.entities=[];g.rifts=[];g.events=[];g.timers.rift=0;tickSpawns(g,0);near(g.timers.rift,Math.max(4.35,20-(g.time-60)*.12)*1.05*1.3);tickSpawns(g,.8);count+=g.entities.filter(e=>e.type==='drone').length;events+=g.events.filter(e=>e.type==='swarm').length;tickSpawns(g,.1);assert.equal(g.events.filter(e=>e.type==='swarm').length,1);}assert.equal(events,1000);assert.ok(count/1000>3.12&&count/1000<3.38,count/1000);
});
test('fragment notes differ, contain audible energy, and chimes/crackles end without clipped samples',()=>{
 const hashes=new Set();for(const data of [...Array.from({length:8},(_,i)=>fragmentChime(i)),slashCrackle()]){let power=0,hash=0;for(let i=0;i<data.length;i++){assert.ok(Number.isFinite(data[i])&&Math.abs(data[i])<1);power+=data[i]**2;hash+=data[i]*(i%17);}assert.ok(power/data.length>.0001);assert.ok(Math.abs(data.at(-1))<.003);hashes.add(hash.toFixed(5));}assert.equal(hashes.size,9);
});
test('desktop looking and an untracked VR controller cannot emit momentum projectiles',()=>{
 for(const props of [{desktop:true,right:{offset:V(),dir:V(0,0,1)}},{right:{tracked:false,offset:V(),dir:V(0,0,1)}}]){const g=blank();g.weapons.tick(1/60,props);props.right.offset.x=1;g.weapons.tick(1/60,props);assert.equal(g.projectiles.length,0);}
});
test('exterior hornets keep patrolling when player is inside a sealed sphere',()=>{
 const g=blank(),e=g.spawn('hornet',V(0,60,0),{cd:9999,exterior:true});const before=e.p.clone();advanceAI(g,e,3,0);assert.ok(e.p.distanceTo(before)>1);assert.equal(g.map.sector(e.p),-1);
});
