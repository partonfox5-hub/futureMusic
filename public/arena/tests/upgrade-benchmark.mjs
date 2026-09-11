import fs from 'node:fs';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {Simulation} from '../js/sim.js';import {V,rng,unit} from '../js/math.js';import {entityRay} from '../js/collision.js';import {tickScreens} from '../js/screens.js';
const g=new Simulation(76541),random=rng(6192);for(let i=0;i<120;i++)g.spawn('drone',g.map.interior(i%8,.8),{kind:i%7});g.grid.rebuild(g.entities);
const rays=Array.from({length:1800},(_,i)=>({p:g.map.interior(i%8,.8),d:unit(random),len:30+random()*150,pad:i%4===0?.25:0}));
const box=q=>{const b=q.p.clone().addScaledVector(q.d,q.len);return g.grid.box(Math.min(q.p.x,b.x)-q.pad,Math.min(q.p.y,b.y)-q.pad,Math.min(q.p.z,b.z)-q.pad,Math.max(q.p.x,b.x)+q.pad,Math.max(q.p.y,b.y)+q.pad,Math.max(q.p.z,b.z)+q.pad,[]);};
const hit=(q,list)=>{let distance=q.len,id=0;for(const e of list){const t=entityRay(q.p,q.d,e,distance,q.pad);if(t<distance){distance=t;id=e.id;}}return {distance,id};};
// Warm both implementations before timing repeated identical workloads.
for(const q of rays.slice(0,120)){hit(q,box(q));hit(q,g.grid.ray(q.p,q.d,q.len,q.pad,[]));}
let before=0,after=0,boxes=0,cells=0;
for(let repeat=0;repeat<3;repeat++){
 let t=performance.now();const original=rays.map(q=>{const list=box(q);if(!repeat)boxes+=list.length;return hit(q,list);});before+=performance.now()-t;
 t=performance.now();const optimized=rays.map(q=>{const list=g.grid.ray(q.p,q.d,q.len,q.pad,[]);if(!repeat)cells+=list.length;return hit(q,list);});after+=performance.now()-t;
 for(let i=0;i<rays.length;i++){assert.equal(optimized[i].id,original[i].id,'ray '+i);assert.ok(Math.abs(optimized[i].distance-original[i].distance)<1e-6);}
}
const screenRun=new Simulation(719);screenRun.player.p.set(0,0,0);for(let i=0;i<128;i++)screenRun.shot(screenRun.map.interior(i%8,.8),unit(random),18,1);screenRun.grid.rebuild(screenRun.entities);const screenTimes=[];
for(let i=0;i<240;i++){screenRun.time+=.11;const start=performance.now();tickScreens(screenRun,.11);screenTimes.push(performance.now()-start);}screenTimes.sort((a,b)=>a-b);
const report={environment:'Node '+process.version+'; build-host CPU only, not GPU or headset timings',rays:{count:rays.length,repeats:3,oldBoundingBoxMs:+(before/3).toFixed(2),cellTraversalMs:+(after/3).toFixed(2),speedup:+(before/after).toFixed(2),oldCandidates:boxes,newCandidates:cells,candidateReductionPercent:+(100*(1-cells/boxes)).toFixed(1),allNearestHitsMatched:true},screenPrediction:{projectiles:128,checks:240,medianMs:+screenTimes[120].toFixed(3),p95Ms:+screenTimes[228].toFixed(3)}};
fs.writeFileSync(new URL('../docs/validation/upgrade-performance.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
