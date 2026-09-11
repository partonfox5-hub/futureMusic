import * as T from 'three';
import {furnitureRoot} from '../mira-v2-furniture.js?v=17.2.0';
import {ensureGrabbableWood} from '../mira-v2-nature.js?v=17.2.0';
import {wrapMethod,V,clamp} from './human5-common.js?v=17.2.0';

export function installPetRefinement({scene,props,dogs,camera,world}={}){
 const pets=new Map(),restores=[];let time=0;
 function attach(pet){if(pets.has(pet))return pets.get(pet);const mouth=new T.Object3D();mouth.name='Pet mouth attachment';scene.add(mouth);const s={pet,mouth,held:null,goal:null,restores:[],last:V(),velocity:V(),phase:Math.random()*6.28};pets.set(pet,s);pet.h5Mouth=s;
  if(pet.beginGrab)s.restores.push(wrapMethod(pet,'beginGrab',old=>function(ctrl,hit,...args){if(s.held&&/Head|Jaw/.test(hit?.bone?.name||hit?.name||'')){const h=s.held;release(pet);let key=props.system.hands.grip.indexOf(ctrl);if(key<0)key=props.system.hands.ctrl.indexOf(ctrl);if(key<0)key='desktop';if(h.type==='weapon')props.hold(h.item,key);else if(h.type==='furniture')props.holdFurniture(h.group,key,s.mouth.position,key==='desktop'?ctrl:null);else return old.call(this,ctrl,hit,...args);return;}return old.call(this,ctrl,hit,...args);}));
  if(pet._ai?.tick)s.restores.push(wrapMethod(pet._ai,'tick',old=>function(dt){if(s.goal&&!pet.dead&&!this.held){this.approach(s.goal.point,.30,dt,1.1);this.state='fetch';this.interest=s.goal.point;this.look?.(dt);return;}if(s.held){this.command='';this.destroyT=0;}return old.call(this,dt);}));
  if(pet._anim?.tick)s.restores.push(wrapMethod(pet._anim,'tick',old=>function(dt){const r=old.call(this,dt);const ai=pet._ai;if(!pet.dead&&!ai?.held){const moving=(ai?.speed||0),amp=Math.min(.022,moving*.018),sp=pet.bones.Spine,ch=pet.bones.Chest;if(sp){sp.rotation.y+=Math.sin(time*7+s.phase)*amp;sp.rotation.z+=Math.sin(time*7+s.phase)*amp*.4;}if(ch)ch.rotation.y-=Math.sin(time*7+s.phase+.45)*amp*.65;}return r;}));
  return s;
 }
 function updateMouth(s){const pet=s.pet;pet.root.updateWorldMatrix(true,true);pet._bite?.muzzle(s.mouth.position);pet.bones.Head.getWorldQuaternion(s.mouth.quaternion);s.mouth.updateMatrixWorld(true);}
 function pick(pet,hit){if(!pet||pet.dead||!hit?.object)return false;const s=attach(pet);updateMouth(s);if(hit.point.distanceTo(s.mouth.position)>.45)return false;
  let weapon=null;for(let o=hit.object;o;o=o.parent){weapon=props.items.find(i=>i.group===o);if(weapon)break;}
  const cloth=hit.object.userData.cloth,actor=props.actorFor(hit.object),group=furnitureRoot(hit.object)||(!actor&&!cloth&&!weapon?ensureGrabbableWood(world,hit.object):null);
  if(weapon?.holder!=null||group?.userData.furniture?.holds?.size||cloth?.hold||actor?.held||actor===pet)return false;
  release(pet);pet._items?.releaseDog?.(pet);
  if(weapon){s.held={type:'weapon',item:weapon,local:weapon.group.worldToLocal(hit.point.clone())};if(!props.hold(weapon,pet)){s.held=null;return false;}}
  else if(cloth){s.held={type:'cloth',cloth};cloth.begin(hit.point,s.mouth);}
  else if(actor){const bone=actor.nearestHit(hit.point,.3);if(!bone)return false;s.held={type:'actor',actor};actor.beginGrab(s.mouth,bone);}
  else if(group?.userData.furniture){s.held={type:'furniture',group};if(!props.holdFurniture(group,pet,hit.point,s.mouth)){s.held=null;return false;}updateMouth(s);}
  else return false;
  pet._jaw.set(.3);pet._ai.command='';pet._ai.interest=null;pet._ai.state='idle';props.status='Mouth grip attached at contact point';return true;
 }
 function release(pet){const s=pets.get(pet);if(!s)return false;const h=s.held;if(h?.type==='weapon')props.drop(pet);else if(h?.type==='furniture')props.releaseFurniture(pet);else if(h?.type==='cloth')h.cloth.hold=null;else if(h?.type==='actor')h.actor.endGrab(s.mouth);s.held=null;s.goal=null;pet._jaw?.set(0);return !!h;}
 restores.push(wrapMethod(props,'applyHoldPose',old=>function(item){const s=pets.get(item.holder);if(!s?.held||s.held.type!=='weapon')return old.call(this,item);updateMouth(s);const g=item.group;if(g.parent!==s.mouth)s.mouth.attach(g);g.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2);g.position.copy(s.held.local).applyQuaternion(g.quaternion).negate();g.updateMatrixWorld(true);}));
 restores.push(wrapMethod(props,'fire',old=>function(item){if(pets.has(item?.holder))return false;return old.apply(this,arguments);}));
 if(props.triggerHeld)restores.push(wrapMethod(props,'triggerHeld',old=>function(key){if(pets.has(key))return false;return old.call(this,key);}));
 restores.push(wrapMethod(props,'holdTarget',old=>function(hold,key){const target=old.call(this,hold,key),s=pets.get(key);if(!s||!target)return target;const mass=hold.group.userData.furniture?.mass||1,limit=key.kind==='cat'?2:9;if(mass<=limit)return target;const contact=hold.group.localToWorld(hold.local.clone()),delta=target.clone().sub(contact);return contact.add(delta.clampLength(0,Math.max(.001,s.dt||1/72)*Math.min(.7,limit*2/mass)));}));
 // Carrying a blade must not invoke the player's swing damage path.
 if(props.tickMelee)restores.push(wrapMethod(props,'tickMelee',old=>function(item){if(pets.has(item?.holder))return;return old.apply(this,arguments);}));
 const api={pets,attach,pick,release,
  fetch(pet,ray){const weapon=props.weaponHit(ray);const h=weapon?{object:weapon.group,point:weapon.group.localToWorld(weapon.handle.clone())}:props.hit(ray,30,false);if(!h)return false;const s=attach(pet);s.goal={hit:h,point:h.point.clone()};pet._ai.follow=false;return true;},
  nearest(){const p=camera.getWorldPosition(V());return dogs.list().filter(a=>!a.dead).sort((a,b)=>a.root.position.distanceToSquared(p)-b.root.position.distanceToSquared(p))[0];},
  tick(dt){time+=dt;const current=dogs.list();for(const pet of current){const s=attach(pet);s.dt=Math.min(.05,dt);updateMouth(s);s.velocity.copy(s.mouth.position).sub(s.last).divideScalar(Math.max(.001,dt));s.last.copy(s.mouth.position);
    if(pet.dead){release(pet);continue;}
    const d=pet.root.getWorldPosition(V()).distanceTo(camera.getWorldPosition(V()));pet._fur?.setLayers(d<7?1:0);
    for(const h of props.system.hands?.colliders||[]){const p=h.position||h.p;if(p?.isVector3&&p.distanceTo(pet.root.getWorldPosition(V()).add(new T.Vector3(0,.4,0)))<.75)pet._fur?.ripple(p);}
    if(s.goal){const goal=s.goal;if(s.mouth.position.distanceTo(goal.point)<.43){s.goal=null;pick(pet,goal.hit);}}
    if(s.held){pet._jaw.set(.22);if(s.held.type==='weapon'&&s.held.item.holder!==pet)s.held=null;else if(s.held.type==='furniture'&&(!s.held.group.parent||!props.furnHolds.has(pet)))s.held=null;}
   }
   for(const [pet,s]of pets)if(!current.includes(pet)){release(pet);s.restores.reverse().forEach(f=>f());s.mouth.removeFromParent();pets.delete(pet);delete pet.h5Mouth;}
  },
  dispose(){for(const [pet,s]of pets){release(pet);s.restores.reverse().forEach(f=>f());s.mouth.removeFromParent();delete pet.h5Mouth;}restores.reverse().forEach(f=>f());pets.clear();}
 };return api;
}
