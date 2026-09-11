import * as T from 'three';
export class FloraHarvest {
 constructor(env,debris){this.env=env;this.debris=debris;}
 pull(item){const e=this.env,h=e.find(item);if(!h?.planted||!this.debris.plantSlot())return false;h.planted=false;h.loose=true;h.gripStart.clear();const f=h.group.userData.furniture;f.anchored=false;f.mass=h.mass;f.density=f.mass/Math.max(.0001,f.volume);f.velocity.set(0,.12,0);f.omega?.set(0,0,0);const point=h.group.getWorldPosition(new T.Vector3());this.debris.burst(point);return true;}
 tick(dt){const e=this.env;for(const h of [...e.items]){if(!h.planted)continue;const g=h.group,f=g.userData.furniture,holds=[...(e.ctx.props?.furnHolds?.entries?.()||[])].filter(([,v])=>v.group===g);let rise=0;
   for(const [key,hold] of holds){let palm=hold.ctrl?.getWorldPosition?.(new T.Vector3());if(!palm&&typeof key==='number')palm=e.ctx.props?.system?.hands?.palmPos?.(key)||e.ctx.system?.hands?.palmPos?.(key);if(!palm)palm=g.localToWorld(hold.local?.clone?.()||new T.Vector3());if(!h.gripStart.has(key))h.gripStart.set(key,palm.y);rise=Math.max(rise,palm.y-h.gripStart.get(key));}
   if(rise>=.18){this.pull(h);continue;}if(!holds.length&&h.gripStart.size){h.gripStart.clear();this.debris.rustle();}
   // Resistance is applied AFTER the existing furniture grab solver. No second grip.
   const delta=g.position.clone().sub(h.anchor),length=Math.hypot(delta.x,delta.z);if(length>.07){delta.x*=.07/length;delta.z*=.07/length;}delta.y=holds.length?Math.min(.038,Math.max(0,rise)*.2):0;
   const target=h.anchor.clone().add(delta.multiplyScalar(holds.length?.6:0));g.position.lerp(target,1-Math.exp(-dt*42));const offset=g.position.clone().sub(h.anchor),xz=Math.hypot(offset.x,offset.z);if(xz>.07){g.position.x=h.anchor.x+offset.x*.07/xz;g.position.z=h.anchor.z+offset.z*.07/xz;}g.position.y=Math.min(h.anchor.y+.038,Math.max(h.anchor.y,g.position.y));if(!holds.length)g.position.copy(h.anchor);g.quaternion.slerp(h.quaternion,1-Math.exp(-dt*30));f.velocity.set(0,0,0);f.omega?.set(0,0,0);e.sync(g);
  }}
}
