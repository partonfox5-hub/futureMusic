import * as T from 'three';
import {V,wrapMethod} from './human5-common.js?v=19.3.0';
/** Reuses the host navigator, seats, piano and held props. Explicit orders win. */
export function installActivities({world,mira,props,fire}={}){
 const beds=new Map(),restores=[];let due=0;
 const autonomous=a=>!a.dead&&!a.held&&!a.grabs?.size&&!a.h5Frozen&&a.balance?.state==='standing'&&(!a.h5Brain||!a.h5Brain.hostile&&!a.h5Brain.follower&&!a.h5Ambient&&a.h5Brain.mode!=='still');
 function go(a,p,seat=null){const ok=world.walk(a,p,seat);if(ok){a.autonomy=true;a.lifeT=20;}return ok;}
 function release(a){a.h5Urgent=false;delete a.h5Task;}
 function discoverBeds(){for(const g of world.movables){if(g.userData.furniture?.id!=='Mattress'||!g.userData.bedFrame||beds.has(g))continue;const box=new T.Box3().setFromObject(g),seat={group:g,position:box.getCenter(V()).setY(box.max.y+.07),yaw:g.rotation.y,approach:g.localToWorld(new T.Vector3(.98,0,.3)),occupant:null,h5Bed:true,sitDuration:22};seat.approach.y=world.floorHeight(seat.approach,undefined,.5);beds.set(g,seat);world.seats.push(seat);}
  for(const [g,s]of beds)if(!g.parent||!g.userData.bedFrame){if(s.occupant?.seat===s){s.occupant.seat=null;s.occupant.setMode('auto');}world.seats=world.seats.filter(x=>x!==s);beds.delete(g);}
 }
 // A bed is a horizontal support. Preserve the same occupancy/navigation rules.
 restores.push(wrapMethod(world,'after',old=>function(a,dt){const seat=a.seat;if(!seat?.h5Bed)return old.apply(this,arguments);
  if(a.dead||a.held||a.grabs.size){seat.occupant=null;a.seat=null;return old.apply(this,arguments);}
  a.group.rotation.y=seat.yaw;a.root.quaternion.setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2);a.root.position.copy(a.baseRootPos||V());
  const box=new T.Box3().setFromObject(seat.group),center=box.getCenter(V());center.y=box.max.y+.085;center.add(new T.Vector3(0,0,-.82*a.shape.height).applyQuaternion(a.group.quaternion));a.group.position.copy(center);a.group.updateMatrixWorld(true);
  for(const side of ['L','R']){const sign=side==='L'?1:-1,hand=a.group.localToWorld(new T.Vector3(sign*.20,0,.86).multiplyScalar(a.shape.height)),pole=hand.clone().add(new T.Vector3(sign*.18,.1,-.1));a.solveChain(side,'arm',hand,pole);}
  a.group.updateMatrixWorld(true);for(const skeleton of a.h5Skeletons||[])skeleton.update();a.h5Activity='resting in bed';
 }));
 function emergency(a,emitters){
  const task=a.h5Task;
  if(task){if(!task.item.group.parent||task.item.holder!=null&&task.item.holder!==a||task.age>22){release(a);return;}task.age+=.5;
   if(task.item.holder!==a){if(task.item.group.getWorldPosition(V()).distanceTo(a.group.position)<1.35){props.drop(a);props.hold(task.item,a);a.navigation=null;a.dest=null;a.speed=0;a.autoWander=false;}
    else if(!a.navigation)go(a,task.item.group.getWorldPosition(V()));return;}
   if(task.kind==='arm'){release(a);a.h5Activity='alert';return;}
   const source=emitters.find(e=>e.position.distanceTo(task.firePoint)<2);if(!source){props.drop(a);release(a);a.setMode('auto');return;}
   const point=source.position;if(a.group.position.distanceTo(point)>2){if(!a.navigation){const away=a.group.position.clone().sub(point).setY(0).normalize();go(a,point.clone().addScaledVector(away,1.6));}}else{a.navigation=null;a.dest=null;a.autoWander=false;const origin=a.bones.R_Hand.getWorldPosition(V());props.fire(task.item,new T.Ray(origin,point.clone().sub(origin).normalize()));a.h5Activity='using extinguisher';}return;
  }
  if(!a.autonomy||a.seat||a.navigation||a.socialPair||props.held.has(a))return;
  const nearby=emitters.find(e=>e.position.distanceToSquared(a.group.position)<144),threat=[...(world.h5NPCs?.brains?.values()||[])].find(b=>b.hostile&&!b.actor.dead&&b.actor.group.position.distanceToSquared(a.group.position)<100);
  if(!nearby&&!threat)return;const item=props.items.filter(i=>i.holder==null&&(nearby?i.id==='extinguisher':['sword','pistol','rifle'].includes(i.id))).sort((x,y)=>x.group.position.distanceToSquared(a.group.position)-y.group.position.distanceToSquared(a.group.position))[0];
  if(item&&item.group.getWorldPosition(V()).distanceToSquared(a.group.position)<225&&go(a,item.group.getWorldPosition(V()))){a.h5Task={kind:nearby?'fire':'arm',item,firePoint:nearby?.position.clone(),age:0};a.h5Urgent=true;a.h5Activity=nearby?'fetching extinguisher':'seeking a weapon';}
 }
 return {beds,tick(dt){due-=dt;if(due>0)return;due=.5;discoverBeds();const emitters=fire.emitters();for(const a of mira.actors){if(a.version!=='v2')continue;if(!autonomous(a)){if(a.h5Task)release(a);continue;}emergency(a,emitters);
   if(a.seat){a.h5Activity=a.seat.piano?'playing piano':a.seat.h5Bed?'resting in bed':'sitting';if(!a.seat.h5Bed&&!a.seat.piano){const tv=world.movables.find(g=>g.userData.furniture?.id==='TV stand'&&g.getWorldPosition(V()).distanceToSquared(a.group.position)<36);if(tv){a.h5Activity='watching TV';a.attention.copy(tv.getWorldPosition(V()).add(new T.Vector3(0,1.1,0)));a.attentionT=1;}}}
   else if(!a.h5Task)a.h5Activity=a.speed>.1?(a.h5RunBlend>.4?'running':'walking'):'looking around';
  }},dispose(){restores.reverse().forEach(f=>f());world.seats=world.seats.filter(s=>!s.h5Bed);beds.clear();}};
}
