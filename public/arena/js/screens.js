import {V,clamp} from './math.js?v=5.0.0';

// World-space threat prediction is independent of presentation and frame rate.
// Each screen has its own response. Atlas frames are shared, not reactions.
export function incomingToScreen(e,b,horizon=1.35){
 if(!b.alive||!b.v.lengthSq())return Infinity;
 const inv=e.q.clone().invert(),p=b.p.clone().sub(e.p).applyQuaternion(inv),v=b.v.clone().applyQuaternion(inv);
 if(p.z<=.03||v.z>=-.01)return Infinity;
 const time=(.09-p.z)/v.z;
 if(time<0||time>horizon)return Infinity;
 const scale=e.scale||1,pad=(b.r||.05)+.15;
 return Math.abs(p.x+v.x*time)<1.3*scale+pad&&Math.abs(p.y+v.y*time)<.8*scale+pad?time:Infinity;
}
export function tickScreens(g,dt){
 g.screenAcc=(g.screenAcc||0)+dt;if(g.screenAcc<.1)return;g.screenAcc%=.1;
 const time=g.time,threats=new Set();g.screenChecks=0;
 // Spatial lookup only visits screens inside each projectile's future path.
 for(const b of g.projectiles){if(!b.alive)continue;const speed=b.v.length();if(speed<.01)continue;
  const dir=b.v.clone().multiplyScalar(1/speed),range=Math.min(speed*1.35,65);
  for(const e of g.grid.ray(b.p,dir,range,.3,[])){if(e.type!=='window'||e.cracked||e.p.distanceToSquared(g.player.p)>75*75)continue;g.screenChecks++;
   const arrival=incomingToScreen(e,b,range/speed);if(!Number.isFinite(arrival))continue;
   if(!g.map.ray(b.p,dir,Math.max(0,speed*arrival-.2)))threats.add(e.id);
  }
 }
 for(const e of g.entities){if(!e.alive||e.type!=='window')continue;
  const s=e.screen||(e.screen={mode:'idle',panicAt:-10,safeAt:-10,greetUntil:0,greetAt:-10});
  if(e.cracked){s.mode='broken';continue;}
  if(threats.has(e.id)){if(s.mode!=='flee'&&s.mode!=='hidden')s.panicAt=time;s.safeAt=time+2.8;s.mode='flee';}
  if(time<s.safeAt){s.escape=clamp((time-s.panicAt)/.7,0,1);s.mode=s.escape>=1?'hidden':'flee';continue;}
  const delta=g.player.p.clone().sub(e.p),near=delta.lengthSq()<6.5**2&&delta.dot(V(0,0,1).applyQuaternion(e.q))>0;
  if(near&&time>s.greetAt+9){s.greetAt=time;s.greetUntil=time+3;g.emit(e.kind===0?'carhorn':e.kind===1?'boathorn':'screenhello',e.p,{quiet:true});}
  s.mode=near&&time<s.greetUntil?'greet':'idle';s.escape=0;
 }
}
export function screenFrame(e){if(e.cracked)return 7;const s=e.screen;if(!s)return 0;if(s.mode==='hidden')return 6;if(s.mode==='flee')return 2+Math.min(4,Math.floor((s.escape||0)*5));return s.mode==='greet'?1:0;}
