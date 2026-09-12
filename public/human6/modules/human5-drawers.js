import * as T from 'three';
import {wrapMethod,V} from './human5-common.js?v=19.3.0';
/** Short constrained slides: closed box shell, pull handles, hard end stops. */
export function installDrawers({world,props}={}){
 const states=new Map(),holds=new Map(),restores=[];let scan=0;
 function discover(){for(const root of world.movables||[])root.traverse(o=>{if(o.userData.h5DrawerSpec&&!states.has(o))states.set(o,{root:o,home:o.position.clone(),position:0,velocity:0,target:0,travel:o.userData.h5DrawerSpec.travel||.32});});for(const [o]of states){let top=o;while(top.parent)top=top.parent;if(!top.isScene){states.delete(o);for(const [i,h]of holds)if(h.s.root===o)holds.delete(i);}}}
 function slideFor(o){for(;o;o=o.parent)if(states.has(o))return states.get(o);return null;}
 function rayAction(ray){if(props.builder?.active||props.restraints?.placing||props.driving())return false;const hit=props.hit(ray,3,false),s=slideFor(hit?.object);if(!s)return false;s.target=s.target>.05?0:s.travel;props.status=s.target?'Opening drawer':'Closing drawer';return true;}
 restores.push(wrapMethod(props,'desktop',old=>function(ray){if(!this.held.has('desktop')&&rayAction(ray))return true;return old.apply(this,arguments);}));
 restores.push(wrapMethod(props,'trigger',old=>function(i){if(!this.held.has(i)&&rayAction(this.ray(i)))return true;return old.apply(this,arguments);}));
 restores.push(wrapMethod(props,'grip',old=>function(i){if(this.driving()||this.held.has(i))return old.apply(this,arguments);const palm=this.system.hands.palmPos(i);if(palm){let best=null,d=.11;for(const s of states.values()){if(!s.root.parent)continue;const handle=s.root.localToWorld(new T.Vector3(0,0,.265)),n=handle.distanceTo(palm);if(n<d){best=s;d=n;}}if(best){holds.set(i,{s:best,start:best.position,palm:best.root.parent.worldToLocal(palm.clone()).z});return true;}}return old.apply(this,arguments);}));
 // Host release() is also used when tracking or the session is lost.
 restores.push(wrapMethod(props,'release',old=>function(i){holds.delete(i);return old.apply(this,arguments);}));
 return {states,holds,toggle(root){const s=states.get(root);if(s)s.target=s.target>.05?0:s.travel;return !!s;},tick(dt){
  scan-=dt;if(scan<=0){scan=.5;discover();}dt=Math.min(.05,Math.max(0,dt));
  for(const [i,h]of holds){const p=props.system.hands.palmPos(i);if(!p||!h.s.root.parent){holds.delete(i);continue;}h.s.target=T.MathUtils.clamp(h.start+h.s.root.parent.worldToLocal(p.clone()).z-h.palm,0,h.s.travel);}
  for(const s of states.values()){if(Math.abs(s.position-s.target)<.0001&&Math.abs(s.velocity)<.001)continue;const k=180,d=24;s.velocity=(s.velocity+dt*k*(s.target-s.position))/(1+d*dt+k*dt*dt);s.position=T.MathUtils.clamp(s.position+s.velocity*dt,0,s.travel);s.root.position.copy(s.home);s.root.position.z+=s.position;}
 },dispose(){restores.reverse().forEach(f=>f());holds.clear();states.clear();}};
}
