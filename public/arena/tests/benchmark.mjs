import {performance} from 'node:perf_hooks';
import {Simulation,seededRandom} from '../js/simulation.js';
const s=new Simulation(seededRandom(123)),eye={x:0,y:0,z:18};const samples=[];let maxBolts=0;
// Twenty simulated minutes; continuous stress firing and moving target.
for(let i=0;i<108000;i++){
  const t=i/90;eye.x=Math.sin(t*.3)*25;eye.z=Math.cos(t*.3)*25;eye.y=Math.sin(t*.17)*12;
  if(s.ended)s.reset();s.power=Math.max(500,s.power);
  if(i%3===0){const d=s.drones[i%s.drones.length];s.fire(eye.x,eye.y,eye.z,d.x-eye.x,d.y-eye.y,d.z-eye.z);}
  const start=performance.now();s.step(1/90,eye);samples.push(performance.now()-start);maxBolts=Math.max(maxBolts,s.bolts.filter(b=>b.active).length);
}
samples.sort((a,b)=>a-b);console.log(JSON.stringify({simulationMinutes:20,steps:samples.length,stepMeanMs:samples.reduce((a,b)=>a+b)/samples.length,stepP95Ms:samples[Math.floor(samples.length*.95)],stepP99Ms:samples[Math.floor(samples.length*.99)],peakActiveBolts:maxBolts,allocatedBolts:s.bolts.length,drones:s.drones.length,eventPool:s.eventPool.length,platform:process.platform,node:process.version,note:'Node CPU-only synthetic test. These numbers are not Quest frame rates.'},null,2));
