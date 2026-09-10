import * as T from 'three';
import {playSfx,sfxForHit,unlockSfx} from './mira-v2-sfx.js?v=15.3';
import {furnitureRoot,syncFurniture} from './mira-v2-furniture.js?v=14.6';
import {ensureGrabbableWood} from './mira-v2-nature.js?v=14.2';
import {GUNS,MELEE,buildMarker,buildPortalGun} from './mira-v2-gadgets.js?v=14.6';
import {FIREARMS,buildFirearm,firearmSpread} from './mira-v2-firearms.js?v=14.3';
import {buildTorch,buildExtinguisher} from './mira-v2-fire.js?v=14.7';
import {installWeightPhysics,throwSpeed} from './mira-v2-weights.js?v=15.2';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
const visible=o=>{while(o){if(!o.visible)return false;o=o.parent;}return true;};
const G=w=>Number.isFinite(w?.gravity)?w.gravity:9.81;
const isGun=k=>k==='bullet'||k==='laser'||k==='paint'||k==='portal'||k==='flame'||k==='foam';
export const WEAPONS={sword:{name:'Sword',mass:1.4,reach:.95,sharpness:.85,kind:'cut',category:'melee'},axe:{name:'Axe',mass:2.1,reach:.78,sharpness:.7,kind:'cut',category:'melee'},mace:{name:'Mace',mass:2.8,reach:.66,sharpness:0,kind:'blunt',category:'melee'},pistol:{name:'Pistol',mass:.9,reach:.24,kind:'bullet',category:'firearm',fireRate:.22,energy:32,spread:.018,pellets:1},laser:{name:'Laser pistol',mass:1.2,reach:.28,kind:'laser',category:'firearm'},...FIREARMS,marker:{name:'Paintball marker · blue',mass:1.05,reach:.42,kind:'paint',color:0x2aa0e8,category:'tool'},marker2:{name:'Paintball marker · red',mass:1.05,reach:.42,kind:'paint',color:0xc43b3b,category:'tool'},portal:{name:'Portal gun',mass:1.35,reach:.32,kind:'portal',category:'tool'},torch:{name:'Flame torch',mass:.7,reach:.48,kind:'flame',category:'tool',fireRate:.18,energy:12},extinguisher:{name:'Fire extinguisher',mass:2.4,reach:.32,kind:'foam',category:'tool',fireRate:.12,energy:0}};
export {GUNS,MELEE};
export class Props {
 constructor({scene,system,world,wardrobe,camera,renderer,rig}){Object.assign(this,{scene,system,world,wardrobe,camera,renderer,rig});this.items=[];this.held=new Map();this.furnHolds=new Map();this.shots=[];this.effects=[];this.marks=[];this.time=0;this.revision=-1;this.rc=new T.Raycaster();this.status='Guns hang on the living-room wall rack.';installWeightPhysics(this);this.syncWorld();}
 make(id){const data=WEAPONS[id],group=new T.Group(),metal=new T.MeshStandardMaterial({color:id==='laser'?0x467e8a:0x8b9298,roughness:.32,metalness:.75}),grip=new T.MeshStandardMaterial({color:0x362e2b,roughness:.95}),add=(geom,mat,x,y,z)=>{const m=new T.Mesh(geom,mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
 if(id==='marker'||id==='marker2')buildMarker(id,add);
 else if(id==='portal')buildPortalGun(add);
 else if(id==='torch')buildTorch(add);
 else if(id==='extinguisher')buildExtinguisher(add);
 else if(FIREARMS[id]){buildFirearm(id,add);group.userData.firearm=id;}
 else{
  add(new T.BoxGeometry(.037,.06,.15),grip,0,-.025,0);
  if(id==='sword'){add(new T.BoxGeometry(.24,.02,.035),metal,0,0,-.14);add(new T.BoxGeometry(.042,.009,.70,1,1,8),metal,0,0,-.505);const tip=add(new T.ConeGeometry(.028,.12,4),metal,0,0,-.915);tip.rotation.x=-Math.PI/2;tip.rotation.z=Math.PI/4;}
  else if(id==='axe'){const shaft=add(new T.CylinderGeometry(.016,.022,.58,8),grip,0,0,-.28);shaft.rotation.x=Math.PI/2;const head=add(new T.BoxGeometry(.16,.04,.11),metal,0,.02,-.58);head.rotation.z=.08;const bit=add(new T.BoxGeometry(.02,.13,.12),metal,.09,0,-.58);bit.rotation.z=.18;}
  else if(id==='mace'){const shaft=add(new T.CylinderGeometry(.016,.022,.53,12),grip,0,0,-.25);shaft.rotation.x=Math.PI/2;add(new T.IcosahedronGeometry(.088,1),metal,0,0,-.57);for(let i=0;i<6;i++){const m=add(new T.BoxGeometry(.026,.19,.105),metal,0,0,-.57);m.rotation.z=i*Math.PI/3;}}
  else{add(new T.BoxGeometry(.055,.075,.24),metal,0,.03,-.08);const handle=add(new T.BoxGeometry(.044,.11,.055),grip,0,-.057,.016);handle.rotation.x=-.2;add(new T.TorusGeometry(.029,.005,6,14),metal,0,-.045,-.057).rotation.y=Math.PI/2;add(new T.BoxGeometry(.018,.012,.014),grip,0,.075,-.15);if(id==='laser')for(const x of [-.033,.033])add(new T.BoxGeometry(.008,.017,.13),new T.MeshBasicMaterial({color:0x9df5ff}),x,.035,-.09);}
 }
 group.traverse(m=>m.userData.weapon=id);const gunGrip=isGun(data.kind)||['pistol','laser','marker','marker2','portal','rifle','sniper','shotgun','uzi','torch','extinguisher'].includes(id);
 const item={id,data,group,holder:null,lastTip:null,lastPoint:null,handle:new T.Vector3(0,gunGrip?-.057:-.025,gunGrip?.016:0),velocity:V(),lastHit:new Map(),kick:0,swing:0,portalNext:0};this.scene.add(group);this.gadgets?.decorate?.(item);return item;}
 syncWorld(){if(this.revision===this.world.revision)return;this.revision=this.world.revision;this.furnHolds.clear();if(this.restraints){for(const l of [...this.restraints.links])this.restraints.remove(l);this.restraints.cancel();}for(const m of this.marks.filter(m=>!m.actor))this.dispose(m.mesh);this.marks=this.marks.filter(m=>m.actor);this.shots=[];for(const e of this.effects)this.dispose(e.mesh);this.effects=[];this.gadgets?.clearPaint?.();this.gadgets?.clearPortals?.();const kept=[];for(const item of this.items){if(item.holder!==null){kept.push(item);continue;}item.group.removeFromParent();item.group.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});}this.items=kept;const heldIds=new Set(kept.map(i=>i.id));if(this.world.name!=='Living room'){this.gadgets?.rebuildRack?.();return;}const p=this.world.tableAnchor;if(p)MELEE.forEach((id,i)=>{if(heldIds.has(id))return;const item=this.make(id);item.group.position.set(p.x-.45+i*.45,p.y+.055,p.z+(i%2?.18:-.16));item.group.rotation.y=-Math.PI/2;this.items.push(item);});this.gadgets?this.gadgets.rebuildRack():GUNS.forEach((id,i)=>{if(heldIds.has(id))return;const item=this.make(id);item.group.position.set(.255,1.22,-1.05+i*.38);item.group.rotation.y=Math.PI/2;this.items.push(item);});}
 ray(i){const c=this.system.hands.ctrl[i];return new T.Ray(c.getWorldPosition(V()),new T.Vector3(0,0,-1).applyQuaternion(c.getWorldQuaternion(Q())));}
 weaponHit(ray){this.rc.ray.copy(ray);this.rc.far=8;const h=this.rc.intersectObjects(this.items.filter(x=>x.holder===null).map(x=>x.group),true).find(h=>visible(h.object));if(!h)return null;const blocker=this.hit(ray,h.distance,false);if(blocker&&blocker.distance<h.distance-.005)return null;return this.items.find(x=>x.id===h.object.userData.weapon);}
 handParent(key){if(key==='desktop')return this.camera;if(key?.bones?.R_Hand)return key.bones.R_Hand;return this.system.hands?.grip[key]||this.system.hands?.ctrl[key]||null;}
 applyHoldPose(item){
  const key=item.holder,gun=isGun(item.data.kind),vr=key!=='desktop',npc=!!key?.bones;
  if(vr&&!npc&&!this.renderer.xr.isPresenting){this.drop(key);return;}
  const parent=this.handParent(key);if(!parent){this.drop(key);return;}
  if(item.group.parent!==parent)parent.attach(item.group);
  if(npc){
   item.group.position.set(0,-.03,-.1);item.group.rotation.set(-.4,0,0);
  }else if(vr){
   item.group.quaternion.setFromEuler(new T.Euler((gun?-.18:0)-(item.kick||0)*1.2,0,gun?0:Math.PI/2));
   item.group.position.copy(new T.Vector3(0,-.012,-.05)).sub(item.handle.clone().applyQuaternion(item.group.quaternion));
  }else{
   item.group.position.set(gun?.16:.20,gun?-.11:-.14,gun?-.40:-.44);
   item.group.rotation.set((gun?.16:-.12)-(item.kick||0)*1.2,item.swing>0?Math.sin(item.swing/.28*Math.PI)*1.05:0,gun?0:Math.PI/2);
  }
  item.group.updateMatrixWorld(true);
  if(!npc)this.resolveHeldWall(item);
 }
 resolveHeldWall(item){
  if(!item?.group?.parent)return;
  const parent=item.group.parent,reach=Math.max(.18,item.data.reach||.4);
  const handle=item.group.localToWorld(item.handle.clone());
  const tip=item.group.localToWorld(new T.Vector3(0,0,-reach));
  const span=tip.clone().sub(handle),len=span.length();if(len<1e-4)return;
  const dir=span.clone().normalize(),ray=new T.Ray(handle,dir),hit=this.hit(ray,len+.02,false,{world:true});
  if(!hit)return;
  if(this.driving())return;
  if(this.actorFor(hit.object)||this.dogFor(hit.object)||hit.object.userData?.cloth)return;
  const pen=len-hit.distance+.012;if(pen<=0)return;
  const worldBack=dir.clone().multiplyScalar(-pen);
  const from=parent.worldToLocal(handle.clone()),to=parent.worldToLocal(handle.clone().add(worldBack));
  item.group.position.add(to.sub(from));
  item.group.updateMatrixWorld(true);
  if(item.holder==='desktop'&&this.rig){
   const eye=this.camera.getWorldPosition(V()),before=eye.clone();
   this.world.project(eye,.30,-1.55,1.7);
   this.rig.position.add(eye.sub(before));
  }
 }
 nearestFreeWeapon(p,r=.22){let best=null,bd=r*r;for(const item of this.items){if(item.holder!==null)continue;const d=item.group.localToWorld(item.handle.clone()).distanceToSquared(p);if(d<bd){bd=d;best=item;}}return best;}
 hold(item,key){if(!item||item.holder!==null)return false;unlockSfx();this.drop(key);item.holder=key;item.carSeat=null;item.lastTip=null;item.lastSamples=null;item.lastPoint=null;item.kick=0;item.swing=0;item.armedAt=this.time+.22;item.velocity.set(0,0,0);this.held.set(key,item);this.applyHoldPose(item);this.status=item.data.name+' held · '+(key==='desktop'?'click to use, Q to drop':'release grip to drop · trigger fires · swing your hand for melee');if(typeof key==='number')this.system.hands.haptics?.contact(key,'prop',1,.008);return true;}
 equip(id){let item=this.items.find(i=>i.id===id&&i.holder==null);if(!item&&WEAPONS[id]){item=this.make(id);this.items.push(item);}return this.hold(item,'desktop');}
 drop(key){const item=this.held.get(key);if(!item)return;item.group.updateMatrixWorld(true);item.holder=null;item.lastTip=null;item.lastSamples=null;item.lastPoint=null;item.kick=0;this.held.delete(key);
  const car=this.cars().find(c=>c.driving||c.inCabin);
  if(car&&this.placeOnCarSeat(item,car)){this.status=item.data.name+' on the front seat';return;}
  this.scene.attach(item.group);item.velocity.y=Math.min(item.velocity.y,1.2);item.velocity.multiplyScalar(.4);this.status='Dropped '+item.data.name;}
 ejectSeatItems(car){
  if(!car)return;
  for(const item of this.items){
   if(item.carSeat!==car||item.holder!=null)continue;
   item.group.updateMatrixWorld(true);
   this.scene.attach(item.group);
   item.carSeat=null;
  }
 }
 placeOnCarSeat(item,car){
  if(!item?.group||!car?.group)return false;
  car.group.updateMatrixWorld(true,true);item.group.updateMatrixWorld(true,true);
  const local=car.group.worldToLocal(item.group.getWorldPosition(V()));
  const inCabin=Math.abs(local.x)<1.05&&local.y>.25&&local.y<1.7&&local.z>-.95&&local.z<1.2;
  if(!inCabin&&!(car.driving&&local.distanceTo(new T.Vector3(.40,.72,.12))<.7))return false;
  car.group.attach(item.group);
  item.group.position.set(local.x<-.12?-0.40:.40,.70,.10);
  item.group.rotation.set(0,0,Math.PI/2);
  item.carSeat=car;item.velocity.set(0,0,0);
  return true;
 }
 nearestFurniture(pos,r=.2){let best=null,bd=r;for(const group of this.world.movables||[]){if(!group.parent)continue;const box=new T.Box3().setFromObject(group),closest=box.clampPoint(pos,V()),d=closest.distanceTo(pos);if(d<bd){bd=d;best={group,point:closest,distance:d};}}return best;}
 holdFurniture(group,key,point,ctrl=null){const furn=group.userData.furniture;if(!furn)return false;furn.holds??=new Set();
  if(furn.held!=null&&furn.held!==key){const prev=this.furnHolds.get(furn.held);if(prev&&prev.group!==group)this.releaseFurniture(furn.held);}
  if(ctrl?.position)ctrl.position.copy(point);this.furnHolds.set(key,{group,local:group.worldToLocal(point.clone()),ctrl,last:point.clone()});furn.holds.add(key);furn.held=key;furn.racked=false;furn.velocity.set(0,0,0);furn.spin=0;furn.omega=furn.omega||new T.Vector3();this.status='Holding '+furn.id+' · '+Math.round(furn.mass)+' kg';if(typeof key==='number')this.system.hands.haptics?.contact(key,'prop',1,.01);return true;}
 holdFurnitureAt(i){const palm=this.system.hands.palmPos(i);
  const plate=this.weights?.nearestPlate?.(palm,.2);
  if(plate){const picked=this.weights.pickPlate(plate)||plate;return this.holdFurniture(picked,i,palm.clone());}
  const found=this.nearestFurniture(palm,.22);let group=found?.group,point=found?.point,dist=found?.distance??.22;
  if(!group){const wood=this.nearestWoodMesh(palm,.22);if(wood){group=ensureGrabbableWood(this.world,wood.mesh);point=wood.point;dist=wood.distance;}}
  if(!group)return false;
  for(const actor of this.system.actors){const hit=actor.nearestHit(palm,dist);if(hit&&actor.lastHitDistance<dist-.01)return false;}
  for(const d of this.dogs?.list?.()||[]){const hit=d.nearestHit(palm,dist);if(hit&&d.lastHitDistance<dist-.01)return false;}
  const meshes=[];group.traverse(m=>{if(m.isMesh&&m.visible)meshes.push(m);});
  if(meshes.length&&point){const dir=point.clone().sub(palm),len=dir.length();if(len>1e-5){this.rc.ray.origin.copy(palm);this.rc.ray.direction.copy(dir.normalize());this.rc.near=0;this.rc.far=len+.05;const hit=this.rc.intersectObjects(meshes,false)[0];if(hit)point=hit.point;}}
  return this.holdFurniture(group,i,point||palm.clone());}
 grabFurnitureFromRay(ray,ctrl,key='desktop'){const meshes=[];for(const g of this.world.movables||[])g.traverse(m=>{if(m.isMesh&&m.visible)meshes.push(m);});
  const gym=this.world.gym;if(gym?.bar)gym.bar.traverse(m=>{if(m.isMesh&&m.visible)meshes.push(m);});
  for(const tree of this.world.trees||[]){tree.group?.traverse(m=>{if(m.isMesh&&m.visible&&m.userData.treeSeg&&!m.userData.treeSeg.trunk)meshes.push(m);});for(const piece of tree.falling||[])piece.group?.traverse(m=>{if(m.isMesh&&m.visible)meshes.push(m);});}if(!meshes.length)return false;this.rc.ray.copy(ray);this.rc.near=0;this.rc.far=8;const hit=this.rc.intersectObjects(meshes,false).find(h=>visible(h.object));if(!hit)return false;
  const plate=this.weights?.pickPlate?.(hit.object);if(plate)return this.holdFurniture(plate,key,hit.point,ctrl);
  const group=furnitureRoot(hit.object)||ensureGrabbableWood(this.world,hit.object);return group?this.holdFurniture(group,key,hit.point,ctrl):false;}
 nearestWoodMesh(pos,r=.22){let best=null,bd=r;for(const tree of this.world.trees||[]){const visit=mesh=>{if(!mesh?.isMesh||!mesh.visible||!mesh.userData.treeSeg)return;const standingTrunk=mesh.userData.treeSeg.trunk&&mesh.parent===tree.group&&!tree.fallen&&!mesh.userData.looseWood;if(standingTrunk)return;const box=new T.Box3().setFromObject(mesh),closest=box.clampPoint(pos,V()),d=closest.distanceTo(pos);if(d<bd){bd=d;best={mesh,point:closest.clone(),distance:d};}};tree.group?.traverse(m=>visit(m));for(const piece of tree.falling||[])piece.group?.traverse(m=>visit(m));}return best;}
 releaseFurniture(key){const hold=this.furnHolds.get(key);if(!hold)return;const group=hold.group,furn=group.userData.furniture;this.furnHolds.delete(key);if(furn){furn.holds?.delete(key);furn.held=furn.holds?.size?[...furn.holds][0]:null;
  if((furn.throwable||group.userData.plate||group.userData.dumbbell)&&furn.velocity){
   const max=throwSpeed(furn.mass||8);if(furn.velocity.length()>max)furn.velocity.setLength(max);
   if(furn.velocity.length()>1.2&&furn.velocity.y<furn.velocity.length()*.2)furn.velocity.y+=furn.velocity.length()*.22;
  }
 }if(group.parent)syncFurniture(this.world,group);this.weights?.onRelease?.(group);this.world.laundry?.onRelease?.(group);}
 shoveFurniture(furn,dir,wMass,speed,point){const n=dir.clone();n.y=0;if(n.lengthSq()<1e-6)n.set(0,0,-1);n.normalize();const impulse=Math.min(1.15,wMass*speed*.55/Math.max(6,furn.mass));furn.velocity.addScaledVector(n,impulse);const group=furn.obstacle?.object;if(group&&point){const center=new T.Box3().setFromObject(group).getCenter(V());furn.spin+=((point.x-center.x)*n.z-(point.z-center.z)*n.x)*impulse*.7;furn.omega=furn.omega||new T.Vector3();furn.omega.y+=impulse*.35;}}
 holdTarget(hold,key){return hold.ctrl?hold.ctrl.getWorldPosition(V()):(typeof key==='number'?this.system.hands.palmPos(key):null);}
 furnitureCorners(group,furn){
  group.updateWorldMatrix(true,true);
  let box=furn.localBox;
  if(!box){const inv=group.matrixWorld.clone().invert();box=new T.Box3().setFromObject(group).applyMatrix4(inv);furn.localBox=box;}
  const min=box.min,max=box.max,out=[];
  for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])out.push(new T.Vector3(x,y,z).applyMatrix4(group.matrixWorld));
  return out;
 }
 rotateAround(group,point,axis,angle){
  const q=new T.Quaternion().setFromAxisAngle(axis,angle);
  group.position.sub(point);group.position.applyQuaternion(q);group.position.add(point);group.quaternion.premultiply(q);
 }
 applyFurnitureGravity(group,furn,dt,holds){
  furn.omega=furn.omega||new T.Vector3();furn.velocity=furn.velocity||new T.Vector3();
  group.updateWorldMatrix(true,true);
  const box=new T.Box3().setFromObject(group),com=box.getCenter(V());
  const I=Math.max(2.4,furn.mass*(box.getSize(V()).lengthSq())/12);
  const floor=this.world.floorHeight?.(com,.12)??furn.floorY;
  const grav=G(this.world);
  furn.velocity.y-=grav*dt;
  let pivot=com;
  if(holds?.length===1){
   pivot=group.localToWorld(holds[0].hold.local.clone());
   furn.omega.addScaledVector(com.clone().sub(pivot).cross(new T.Vector3(0,-grav*furn.mass,0)),dt/I);
  }
  furn.omega.multiplyScalar(Math.exp(-dt*(holds?.length>1?6.5:.85)));
  if(furn.omega.length()>5.5)furn.omega.setLength(5.5);
  const ang=furn.omega.length();
  if(ang>1e-4)this.rotateAround(group,pivot,furn.omega.clone().normalize(),ang*dt);
  if(!holds?.length)group.position.addScaledVector(furn.velocity,dt);
  group.updateWorldMatrix(true,true);
  const com2=new T.Box3().setFromObject(group).getCenter(V());
  const corners=this.furnitureCorners(group,furn);
  const contacting=corners.filter(c=>c.y<=floor+.02);
  if(contacting.length&&grav>0.5){
   const Fn=furn.mass*grav/contacting.length;
   let maxPen=0;
   for(const c of contacting){
    const r=c.clone().sub(com2),pen=Math.max(0,floor-c.y);
    maxPen=Math.max(maxPen,pen);
    furn.omega.add(r.clone().cross(new T.Vector3(0,Fn+pen*4,0)).multiplyScalar(dt/I));
    furn.velocity.x*=.55;furn.velocity.z*=.55;
   }
   furn.omega.multiplyScalar(Math.exp(-dt*8));
   if(furn.velocity.y<0)furn.velocity.y*=.01;
   if(maxPen>0){
    group.position.y+=Math.min(.08,maxPen);
    if(furn.velocity.y<0.12)furn.velocity.y=0;
   }
   group.updateWorldMatrix(true,true);
   const low=new T.Box3().setFromObject(group).min.y;
   if(low<floor)group.position.y+=Math.min(.06,floor-low);
  }else if(contacting.length&&grav<=0.5){
   let maxPen=0;for(const c of contacting)maxPen=Math.max(maxPen,Math.max(0,floor-c.y));
   if(maxPen>0)group.position.y+=Math.min(.08,maxPen);
  }
 }
 tickFurniture(dt){
  const byGroup=new Map();
  for(const [key,hold] of [...this.furnHolds]){
   const group=hold.group,furn=group.userData.furniture;if(!group.parent||!furn){this.furnHolds.delete(key);continue;}
   const target=this.holdTarget(hold,key);if(!target){this.releaseFurniture(key);continue;}
   if(!byGroup.has(group))byGroup.set(group,[]);byGroup.get(group).push({key,hold,target});
  }
  for(const [group,list] of byGroup){
   const furn=group.userData.furniture;
   group.updateWorldMatrix(true,true);
   if(list.length>=2){
    const a=list[0],b=list[1],Ga=group.localToWorld(a.hold.local.clone()),Gb=group.localToWorld(b.hold.local.clone());
    group.position.add(a.target.clone().lerp(b.target,.5).sub(Ga.clone().lerp(Gb,.5)));
    const from=Gb.clone().sub(Ga),to=b.target.clone().sub(a.target);
    if(from.lengthSq()>.002&&to.lengthSq()>.002){
     const q=new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());
     group.quaternion.premultiply(q);group.updateWorldMatrix(true,true);
     group.position.add(a.target.clone().lerp(b.target,.5).sub(group.localToWorld(a.hold.local.clone()).lerp(group.localToWorld(b.hold.local.clone()),.5)));
    }
    furn.velocity.set(0,0,0);
   }else{
    const {hold,target}=list[0],current=group.localToWorld(hold.local.clone()),delta=target.clone().sub(current);
    delta.multiplyScalar(1-Math.exp(-dt*(9/Math.sqrt(furn.mass/8))));const max=Math.max(.04,(8/furn.mass)*dt+.04);if(delta.length()>max)delta.setLength(max);
    group.position.add(delta);furn.velocity.copy(delta).divideScalar(Math.max(.001,dt));
   }
   this.applyFurnitureGravity(group,furn,dt,list);
   if(list.length===1){group.updateWorldMatrix(true,true);const G=group.localToWorld(list[0].hold.local.clone());group.position.add(list[0].target.clone().sub(G));}
   this.restraints?.constrainObject(group);
   const p=group.position.clone(),rad=Math.max(.2,Math.hypot(furn.obstacle?.w||.4,furn.obstacle?.d||.4)/2);this.world.project(p,rad,.02,Math.max(.4,furn.obstacle?.h||1.2),furn.obstacle);group.position.x=p.x;group.position.z=p.z;syncFurniture(this.world,group);
  }
  for(const group of this.world.movables||[]){
   const furn=group.userData.furniture;if(!furn||furn.holds?.size||!group.parent)continue;
   if(furn.racked){furn.velocity.set(0,0,0);if(furn.omega)furn.omega.set(0,0,0);syncFurniture(this.world,group);continue;}
   if(this.water?.ownsHydro(group))continue;
   furn.omega=furn.omega||new T.Vector3();
   const floor=this.world.floorHeight?.(group.position,.12)??furn.floorY;
   const lows=this.furnitureCorners(group,furn).sort((a,b)=>a.y-b.y).slice(0,3);
   const maxLow=lows.reduce((m,c)=>Math.max(m,c.y),-1e9);
   if(furn.id==='Mattress'){
    const frame=group.userData.bedFrame,ff=frame?.userData?.furniture;
    if(frame?.parent&&!ff?.broken){
     const box=new T.Box3().setFromObject(frame),c=box.getCenter(V());
     group.position.set(c.x,box.max.y+.09,c.z);furn.velocity.set(0,0,0);furn.omega.set(0,0,0);syncFurniture(this.world,group);continue;
    }
    furn.velocity.x*=Math.exp(-dt*3.5);furn.velocity.z*=Math.exp(-dt*3.5);furn.omega.multiplyScalar(Math.exp(-dt*2.4));
    if(group.position.length()>30){group.position.set(-1.6,.22,-4.4);furn.velocity.set(0,0,0);furn.omega.set(0,0,0);}
   }
   if(furn.velocity.lengthSq()<4e-5&&furn.omega.lengthSq()<4e-5&&maxLow<=floor+.04){furn.velocity.set(0,0,0);furn.omega.set(0,0,0);continue;}
   this.applyFurnitureGravity(group,furn,dt,null);
   this.restraints?.constrainObject(group);
   const air=furn.throwable&&(furn.velocity?.length?.()||0)>1.4?0.28:1.2+furn.mass*.02;
   furn.velocity.x*=Math.exp(-dt*air);furn.velocity.z*=Math.exp(-dt*air);
   const p=group.position.clone(),rad=Math.max(.2,Math.hypot(furn.obstacle?.w||.4,furn.obstacle?.d||.4)/2);this.world.project(p,rad,.02,Math.max(.4,furn.obstacle?.h||1.2),furn.obstacle);group.position.x=p.x;group.position.z=p.z;syncFurniture(this.world,group);
  }
  if(this.world.movables)this.world.movables=this.world.movables.filter(g=>g.parent);
  this.restraints?.solve?.(dt);
 }
 cars(){return this.vehicles||(this.vehicle?[this.vehicle]:[]);}
 driving(){return this.cars().some(c=>c.driving);}
 grip(i){if(this.furnHolds.has(i))return true;if(this.water?.grip(i))return true;if(this.world.doors?.grip?.(i,this))return true;
  const palm0=this.system.hands.palmPos(i);
  if(palm0){for(const c of this.cars()){if(!c.driving)continue;for(const h of c.hinges)if(c.doorReach?.(h,palm0))return c.grip(i);}}
  if(this.held.has(i))return true;const palm=palm0||this.system.hands.palmPos(i),target=this.nearestFreeWeapon(palm,.22);if(target){const handle=target.group.localToWorld(target.handle.clone()),distance=handle.distanceTo(palm),block=distance>.001?this.hit(new T.Ray(palm,handle.clone().sub(palm).normalize()),distance,false):null;if(!block||block.distance>=distance-.035)return this.hold(target,i);}if(this.holdFurnitureAt(i))return true;for(const c of this.cars())if(c.grip(i))return true;return false;}
 release(i){this.water?.release(i);this.drop(i);this.releaseFurniture(i);this.world.doors?.release?.(i);for(const c of this.cars())c.release(i);}
 resetMotion(){for(const item of this.items){item.lastTip=null;item.lastSamples=null;item.lastPoint=null;item.velocity.set(0,0,0);}}
 trigger(i){if(this.builder?.active){this.builder.controller=i;return this.builder.place(this.ray(i));}if(this.restraints?.placing)return this.restraints.place(this.ray(i));const held=this.held.get(i);if(held){if(isGun(held.data.kind))this.fire(held);return true;}if(this.driving())return true;if(this.world.laundry?.click(this.ray(i),this))return true;if(this.world.piano?.click(this.ray(i),this))return true;const rope=this.restraints?.hit(this.ray(i));if(rope){const link=rope.object.userData.restraint||this.restraints.selected;if(rope.object.userData.restraintPanel)this.restraints.panelAction(rope.uv);else this.restraints.select(link,rope.point);return true;}return false;}
 desktop(ray){if(this.builder?.active)return this.builder.place(ray);if(this.restraints?.placing)return this.restraints.place(ray);const item=this.held.get('desktop');if(item){if(isGun(item.data.kind))this.fire(item,ray);else{item.swing=.30;const hit=this.hit(ray,1.45);if(hit)this.impact(hit,item.data.mass*18,ray.direction,item.data.kind,item.data.sharpness);}return true;}if(this.driving()){for(const c of this.cars())if(c.driving&&c.click(ray))return true;const picked=this.weaponHit(ray);return picked?this.hold(picked,'desktop'):true;}const rope=this.restraints?.hit(ray);if(rope){if(rope.object.userData.restraintPanel)this.restraints.panelAction(rope.uv);else this.restraints.select(rope.object.userData.restraint,rope.point);return true;}if(this.water?.click(ray))return true;if(this.world.laundry?.click(ray,this))return true;if(this.world.piano?.click(ray,this))return true;if(this.world.doors?.click?.(ray,this))return true;for(const c of this.cars())if(c.click(ray))return true;const picked=this.weaponHit(ray);return picked?this.hold(picked,'desktop'):false;}
 hit(ray,max=50,ropes=true,opts={}){
  this.rc.ray.copy(ray);this.rc.near=0;this.rc.far=max;
  const clothes=(this.wardrobe?.clothes||[]).map(c=>c.mesh).filter(m=>m&&visible(m));
  const clothHit=clothes.length?this.rc.intersectObjects(clothes,false).find(h=>visible(h.object)):null;
  const meshes=[];
  if(opts.world!==false){meshes.push(...this.world.pickables);for(const c of this.cars())meshes.push(...(c.pickables||[]));for(const p of this.world.fractures?.parts||[])if(p.frame&&p.mesh&&!p.broken)p.mesh.traverse(m=>{if(m.isMesh&&m.visible)meshes.push(m);});}
  for(const a of this.system.actors)a.root.traverse(m=>{if(m.isSkinnedMesh&&/^body/.test(m.name))meshes.push(m);});
  for(const d of this.dogs?.list?.()||[])d.root.traverse(m=>{if(m.isSkinnedMesh&&m.visible)meshes.push(m);});
  const hits=meshes.length?this.rc.intersectObjects(meshes,false):[];
  const hit=hits.find(h=>{
   if(!visible(h.object))return false;
   if(h.object.userData.noHit||h.object.userData.weatherSkip||h.object.userData.pianoKey)return false;
   const chunks=h.object.userData.chunks;
   if(chunks){if(h.instanceId==null)return false;const ch=chunks[h.instanceId];if(!ch||ch.broken)return false;}
   const piece=h.object.userData.piece||h.object.userData.wallPart;
   if(piece?.broken)return false;
   return true;
  })||null;
  const rope=ropes&&this.restraints?.hit(ray,max);
  const candidates=[clothHit,hit,rope].filter(Boolean).sort((a,b)=>a.distance-b.distance);
  return candidates[0]||null;
 }
 actorFor(o){while(o){const a=this.system.actors.find(a=>a.root===o);if(a)return a;o=o.parent;}return null;}
 dogFor(o){while(o){if(o.userData?.dog?.root)return o.userData.dog;const d=this.dogs?.list?.().find(d=>d.root===o);if(d)return d;o=o.parent;}return null;}
 stashHeldInCar(car){
  for(const [key,item] of [...this.held]){
   if(key?.bones)continue;
   item.group.updateMatrixWorld(true);item.holder=null;this.held.delete(key);
   if(!this.placeOnCarSeat(item,car)){this.scene.attach(item.group);item.velocity.set(0,.2,0);}
  }
 }
 fire(item,aim){
  if(item.data.kind==='paint'){this.gadgets?.shootPaint(item,aim);return;}
  if(item.data.kind==='portal'){this.gadgets?.shootPortal(item,aim);return;}
  if(item.data.kind==='flame'||item.data.kind==='foam'){
   const rate=item.data.fireRate??.16;if(this.time-(item.lastFire??-2)<rate)return;item.lastFire=this.time;item.kick=.04;unlockSfx();
   const muzzle=item.group.localToWorld(new T.Vector3(0,.03,-item.data.reach));
   const dir=aim?(this.hit(aim,12)?.point||aim.at(8,V())).clone().sub(muzzle).normalize():new T.Vector3(0,0,-1).applyQuaternion(item.group.getWorldQuaternion(Q()));
   if(item.data.kind==='flame'){const hit=this.hit(new T.Ray(muzzle,dir),4.2);this.beam(muzzle,hit?.point||muzzle.clone().addScaledVector(dir,1.1),0xff7a28,.12);if(hit)this.flames?.ignite(hit,true);}
   else{this.beam(muzzle,muzzle.clone().addScaledVector(dir,2.2),0xdfe8ee,.14);this.flames?.spray(muzzle,dir);}
   return;
  }
  const rate=item.data.fireRate??(item.id==='laser'?.18:.22);
  if(this.time-(item.lastFire??-2)<rate)return;item.lastFire=this.time;item.kick=Math.min(.16,(item.kick||0)+.05+(item.data.mass||1)*.008);unlockSfx();playSfx(item.id==='laser'?'laser':'gun');
  const muzzle=item.group.localToWorld(new T.Vector3(0,.032,-item.data.reach));
  const aimDir=aim?(this.hit(aim,48)?.point||aim.at(18,V())).clone().sub(muzzle).normalize():new T.Vector3(0,0,-1).applyQuaternion(item.group.getWorldQuaternion(Q()));
  const pellets=Math.max(1,item.data.pellets||1),spread=item.data.spread||0,energy=item.data.energy||32,speed=item.id==='sniper'?120:item.id==='shotgun'?68:85;
  for(let i=0;i<pellets;i++){
   const dir=spread?firearmSpread(aimDir,spread):aimDir.clone(),ray=new T.Ray(muzzle,dir);
   if(item.id==='laser'){const hit=this.hit(ray,35),end=hit?.point||ray.at(35,V());this.beam(muzzle,end,0x99f7ff,.10);if(hit)this.impact(hit,24,dir,'laser',0);}
   else{this.shots.push({position:muzzle.clone(),velocity:dir.clone().multiplyScalar(speed+(Math.random()-.5)*4),age:0,energy,weaponId:item.id,knockback:item.data.knockback,stagger:item.data.stagger});this.beam(muzzle,muzzle.clone().addScaledVector(dir,.14+Math.min(.2,item.data.reach*.12)),item.id==='shotgun'?0xffc07a:0xffde9c,.04);}
  }
  if(typeof item.holder==='number')this.system.hands.haptics.contact(item.holder,'prop',1,.004);}
 beam(a,b,color,ttl){const length=a.distanceTo(b),m=new T.Mesh(new T.CylinderGeometry(.003,.003,Math.max(.001,length),5),new T.MeshBasicMaterial({color,transparent:true}));m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());this.scene.add(m);this.effects.push({mesh:m,ttl,life:ttl,velocity:V(),expand:0});}
 impact(hit,energy,dir,kind,sharpness=0){unlockSfx();playSfx(sfxForHit(kind));if(hit.object.userData.restraint){if(kind==='cut'||kind==='laser')this.restraints.cut(hit.object.userData.restraint);return;}
  const cloth=hit.object.userData.cloth;if(cloth&&['cut','laser','bullet'].includes(kind)){const n=cloth.slash(hit.point,dir,kind,energy);this.status=(kind==='laser'?'Laser burned':kind==='bullet'?'Shot through': 'Cut')+' clothing'+(n?' · '+n+' tears':'');
   const wearer=cloth.actor;if(wearer){const region=wearer.nearestHit(hit.point,.18);if(region){if(this.injuries)this.injuries.impact(wearer,hit,energy*.65,kind,dir);else wearer.applyStrike?.(region,dir.clone().negate(),Math.min(3,Math.sqrt(energy)*.25),0,hit.point);}}
   this.mark(hit,wearer||null,kind,dir,energy);return;}
  const actor=this.actorFor(hit.object),dog=!actor&&this.dogFor(hit.object);let result=null;if(actor){if(this.injuries)result=this.injuries.impact(actor,hit,energy,kind,dir,hit.weaponId);else{const region=actor.nearestHit(hit.point,.15);if(region)actor.applyStrike?.(region,dir.clone().negate(),Math.min(3,Math.sqrt(energy)*.3)*(hit.stagger??1),0,hit.point);}this.impulseTarget(actor,dir,energy,hit.weaponId);}
  else if(dog){if(this.injuries)result=this.injuries.impact(dog,hit,energy,kind,dir,hit.weaponId);else dog.applyStrike?.(dog.nearestHit(hit.point,.2),dir.clone().negate(),Math.min(3,Math.sqrt(energy)*.3)*(hit.stagger??1),0,hit.point);this.impulseTarget(dog,dir,energy,hit.weaponId);}
  else if(hit.object.userData.tree){const fell=this.world.chopTree?.(hit.object.userData.tree,hit.point,energy,dir,kind);this.status=fell?(fell==='split'?'Wood split':fell==='fell'?'Tree falling':'Chopping wood'):'Chopping wood';this.mark(hit,null,kind,dir,energy);return;}
  else if(hit.object.userData.carPart){const part=hit.object.userData.carPart,car=this.cars().find(c=>c.parts.includes(part)||c.wheels.includes(part));car?.damage(hit,energy,kind,dir);}
  else{const furn=furnitureRoot(hit.object)?.userData.furniture;this.world.fractures.impact(hit,energy,dir,kind,sharpness);if(furn)this.damageFurniture(furn,energy,dir,kind,sharpness,hit);}
  if((!actor&&!dog)||this.injuries?.enabled!==false)this.mark(hit,actor||dog,kind,dir,energy);this.status=(kind==='laser'?'Laser burn':kind==='bullet'?'Bullet impact':kind==='cut'?'Blade cut':kind==='scuff'?'Scuff':'Blunt bruise')+(result?' · '+result.region+(result.severed?' · severed':result.fractured?' · fractured':''):'');
 if(kind==='laser')for(let j=0;j<5;j++){const m=new T.Mesh(new T.IcosahedronGeometry(.008,0),new T.MeshBasicMaterial({color:j<3?0xffb46b:0x878681,transparent:true,opacity:.8}));m.position.copy(hit.point);this.scene.add(m);this.effects.push({mesh:m,ttl:.55,life:.55,velocity:dir.clone().multiplyScalar(-.35).add(new T.Vector3(Math.sin(j*2.3)*.3,.25+j*.08,Math.cos(j*2.3)*.3)),expand:j>2?2:0});}}
 impulseTarget(target,dir,energy,weaponId){
  if(!target)return;
  const n=dir.clone();n.y*=.18;if(n.lengthSq()<1e-8)n.set(0,0,1);n.normalize();
  const push=weaponId==='sniper'?1.05:weaponId==='shotgun'?.28:weaponId==='rifle'?.05:.08;
  const root=target.group||target.root;if(!root)return;
  root.position.addScaledVector(n,push);
  this.world.project?.(root.position,target.version==='dog'?.3:.34,.06,1.7);
  if(weaponId==='sniper'){
   target.knockDown?.(n,n.clone().multiplyScalar(.9));
  }else if(weaponId==='shotgun'){
   if(this.time-(target._shotgunDump||0)>.12){target._shotgunDump=this.time;target.knockDown?.(n,n.clone().multiplyScalar(.42));}
  }
 }
 damageFurniture(furn,energy,dir,kind,sharpness,hit){
  if(!furn||furn.broken)return;
  furn.health??=['Chair','Couch','Mattress','Firewood','Table','Coffee table','Desk','Nightstand','Dresser','Bookshelf','Bed'].includes(furn.id)?24:80;
  const mul=kind==='cut'?(1+(sharpness||0)):kind==='laser'?1.4:1;
  furn.health-=Math.max(0,energy)*mul;
  if(furn.health>0)return;
  furn.broken=true;
  if(furn.mattress){
   const mat=furn.mattress,mf=mat.userData.furniture;
   this.world.root.attach(mat);mat.userData.bedFrame=null;
   if(mf){mf.velocity.set((Math.random()-.5)*.5,.35,(Math.random()-.5)*.5);mf.omega=new T.Vector3(.8,0,.35);mf.held=null;}
  }
  const group=furn.obstacle?.object;if(!group)return;
  group.traverse(m=>{const part=m.userData.piece;if(part&&!part.broken)this.world.fractures.break(part,dir||new T.Vector3(0,0,1),energy);});
  const chunks=hit?.object?.userData?.chunks;if(chunks)for(const part of chunks)if(part&&!part.broken)this.world.fractures.break(part,dir||new T.Vector3(0,0,1),energy);
  if(furn.obstacle)this.world.removeObstacle(furn.obstacle);
  if(this.world.movables)this.world.movables=this.world.movables.filter(g=>g!==group);
 }
 tickFists(dt){
  const hands=this.system?.hands;if(!hands||this.driving())return;
  this.fistPrev??=[null,null];this.fistHitAt??=[-2,-2];
  for(let i=0;i<2;i++){
   if(this.held.has(i)||this.furnHolds.has(i)){this.fistPrev[i]=null;continue;}
   const squeezed=(hands.squeeze?.[i]||0)>.52;const palm=hands.palmPos?.(i);if(!palm)continue;
   const prev=this.fistPrev[i];this.fistPrev[i]=palm.clone();
   if(!squeezed||!prev||this.time-this.fistHitAt[i]<.22)continue;
   const dist=palm.distanceTo(prev),speed=Math.min(10,dist/Math.max(.001,dt));
   if(speed<1.35||dist<.02||dist>.55)continue;
   const ray=new T.Ray(prev.clone(),palm.clone().sub(prev).normalize());
   const hit=this.hit(ray,dist+.04,false,{world:true});if(!hit)continue;
   const furn=furnitureRoot(hit.object)?.userData.furniture,wall=hit.object.userData.chunks||hit.object.userData.piece;
   if(!furn&&!wall&&!hit.object.userData.tree)continue;
   this.fistHitAt[i]=this.time;
   const energy=.5*.45*speed*speed;
   this.impact(hit,energy,ray.direction,'scuff',0);
   this.system.hands.haptics?.contact(i,'prop',Math.min(1,speed*.7),.008);
  }
 }
 mark(hit,actor,kind,dir=new T.Vector3(1,0,0),energy=12){
  const cut=kind==='cut',bruise=kind==='blunt'&&!!actor,laser=kind==='laser',bullet=kind==='bullet',scuff=kind==='scuff'||(kind==='blunt'&&!actor);
  const len=cut?Math.min(.16,.07+Math.sqrt(Math.max(0,energy))*.012):(laser?.034:bullet?.024:.05+Math.min(.08,Math.sqrt(Math.max(0,energy))*.01));
  const wid=cut?.007:.0;
  const geom=cut?new T.PlaneGeometry(len,wid*2):new T.PlaneGeometry(len*2,len*2);
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,uniforms:{age:{value:0},laser:{value:laser?1:0},skin:{value:actor?1:0},bullet:{value:bullet?1:0},cut:{value:cut?1:0},bruise:{value:bruise?1:0},scuff:{value:scuff?1:0},seed:{value:Math.random()*6.28}},vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 u;uniform float age;uniform float laser;uniform float skin;uniform float bullet;uniform float cut;uniform float bruise;uniform float scuff;uniform float seed;
void main(){
 vec2 p=(u-.5)*2.0;
 if(cut>.5){
  float line=1.0-smoothstep(.10,.72,abs(p.y));
  float fade=1.0-smoothstep(.78,1.0,abs(p.x));
  float alpha=line*fade*.96;
  vec3 c=mix(vec3(.02,.01,.01),vec3(.32,.05,.06),smoothstep(.06,.7,abs(p.y)));
  gl_FragColor=vec4(c,alpha);return;
 }
 if(scuff>.5){
  float line=1.0-smoothstep(.12,.85,abs(p.y));
  float fade=1.0-smoothstep(.70,1.0,abs(p.x));
  float alpha=line*fade*.70;
  gl_FragColor=vec4(vec3(.18,.16,.14),alpha);return;
 }
 float r=length(p*vec2(1.0+bruise*.4,1.0+bruise*.8));
 float n=sin(u.x*41.0+seed)*sin(u.y*37.0-seed);
 if(bruise>.5){
  float t=clamp(age/80.0,0.0,1.0);
  float alpha=(1.0-smoothstep(.32,1.0,r+n*.14))*mix(.64,.30,t);
  vec3 fresh=vec3(.46,.07,.13),peak=vec3(.17,.08,.30),fade=vec3(.40,.36,.10);
  vec3 c=mix(mix(fresh,peak,smoothstep(0.0,.34,t)),fade,smoothstep(.42,1.0,t));
  c*=.70+.30*n;
  gl_FragColor=vec4(c,alpha);return;
 }
 float alpha=(1.0-smoothstep(.50,1.0,r))*.8;
 vec3 c=mix(vec3(.065,.055,.045),vec3(.21,.16,.24),skin);
 c=mix(c,vec3(.045),bullet*(1.0-smoothstep(.08,.28,r)));
 float heat=laser*exp(-age*3.0)*(1.0-smoothstep(.18,.65,r));
 c+=heat*vec3(1.8,.43,.055);
 gl_FragColor=vec4(c,alpha);
}`});
  const mesh=new T.Mesh(geom,material);
  const normal=hit.face?.normal.clone().transformDirection(hit.object.matrixWorld)||new T.Vector3(0,1,0);
  if(normal.lengthSq()<1e-8)normal.set(0,1,0);normal.normalize();
  const along=dir.clone().addScaledVector(normal,-dir.dot(normal));
  if(along.lengthSq()<1e-6)along.set(1,0,0).addScaledVector(normal,-normal.x);
  along.normalize();
  const bin=new T.Vector3().crossVectors(normal,along).normalize();
  mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(along,bin,normal));
  mesh.position.copy(hit.point).addScaledVector(normal,.0016);
  let anchor=null;
  if(actor?.version==='v2'){const surface=this.system.contacts.surface(actor);surface.begin();surface.project(hit.point.clone(),.004);anchor=surface.lastClosest?{surface,ref:surface.lastClosest}:null;}
  else if(actor?.version==='dog'){
   const bone=actor.nearestHit(hit.point,.3)?.bone;
   if(bone){const worldQ=mesh.quaternion.clone();bone.updateWorldMatrix(true,false);bone.attach(mesh);mesh.position.copy(bone.worldToLocal(hit.point.clone()));mesh.quaternion.copy(bone.getWorldQuaternion(Q()).invert().premultiply(worldQ));}
   else if(!hit.object.isInstancedMesh)hit.object.attach(mesh);
  }else if(!hit.object.isInstancedMesh)hit.object.attach(mesh);
  if(!mesh.parent)this.scene.add(mesh);this.marks.push({mesh,actor,anchor,object:hit.object,piece:hit.object.userData.chunks?.[hit.instanceId]||hit.object.userData.piece,age:0,along:cut?along.clone():null});while(this.marks.length>80)this.dispose(this.marks.shift().mesh);
 }
 dispose(m){m.removeFromParent();m.geometry?.dispose();m.material?.dispose();}
 tick(dt){this.time+=dt;this.syncWorld();for(const item of this.items)item.group.visible=this.world.root.visible;if(!this.world.root.visible){for(const c of this.cars())c.tick(dt);return;}for(const c of this.cars())c.tick(dt);this.restraints?.tick(dt);this.injuries?.tick(dt);this.tickFurniture(dt);this.tickFists(dt);for(const item of this.items){if(item.holder!==null){item.kick*=Math.exp(-dt*14);if(item.swing>0)item.swing=Math.max(0,item.swing-dt);this.applyHoldPose(item);
 const samples=[.45,1].map(f=>item.group.localToWorld(new T.Vector3(0,0,-item.data.reach*f)));
 if(item.lastSamples&&item.holder!=='desktop'&&['cut','blunt'].includes(item.data.kind)&&this.time>=(item.armedAt||0))for(let j=0;j<samples.length;j++){
  const point=samples[j],old=item.lastSamples[j],dist=point.distanceTo(old),speed=Math.min(12,dist/Math.max(.001,dt));
  if(dist>.004&&dist<.75){const ray=new T.Ray(old.clone(),point.clone().sub(old).normalize()),hit=this.hit(ray,dist+.03,false,{world:true});if(!hit)continue;
   const furn=furnitureRoot(hit.object)?.userData.furniture,dog=this.dogFor(hit.object),body=this.actorFor(hit.object)||hit.object.userData.cloth||dog;
   const key=hit.object.userData.cloth?'c'+hit.object.uuid:(furn?'f'+(furn.obstacle?.object?.uuid||hit.object.uuid):(dog?('d'+dog.id):(this.actorFor(hit.object)?.group.uuid||hit.object.uuid)));
   if(this.time-(item.lastHit.get(key)??-2)<.28)continue;
   const tree=hit.object.userData.tree;
   const energy=.5*item.data.mass*speed*speed;
   if(tree&&speed>.7){item.lastHit.set(key,this.time);this.impact(hit,energy,ray.direction,item.data.kind,item.data.sharpness);this.system.hands.haptics?.contact(item.holder,'prop',speed,.01);continue;}
   if(furn){item.lastHit.set(key,this.time);this.shoveFurniture(furn,ray.direction,item.data.mass,speed,hit.point);if(speed>=.7)this.impact(hit,energy,ray.direction,item.data.kind,item.data.sharpness);this.system.hands.haptics?.contact(item.holder,'prop',Math.min(1,speed),.008);continue;}
   if((body&&speed>1.05)||(!body&&speed>2.2)){item.lastHit.set(key,this.time);this.impact(hit,energy,ray.direction,item.data.kind,item.data.sharpness);this.system.hands.haptics?.contact(item.holder,'prop',speed,.01);}
  }
 }
 item.lastSamples=samples;const p=item.group.getWorldPosition(V());if(item.lastPoint)item.velocity.copy(p).sub(item.lastPoint).divideScalar(Math.max(.001,dt)).clampLength(0,8);item.lastPoint=p.clone();
 }else{item.velocity.y-=G(this.world)*dt;item.group.position.addScaledVector(item.velocity,dt);const p=item.group.position,old=p.clone();if(this.world.projectSphere(p,.08)){const n=p.clone().sub(old).normalize(),vn=item.velocity.dot(n);if(vn<0)item.velocity.addScaledVector(n,-1.1*vn);item.velocity.multiplyScalar(.8);}item.group.updateWorldMatrix(true,true);const box=new T.Box3().setFromObject(item.group),floor=(this.world.floorHeight?.(p,.12)??0)+.02;if(box.min.y<floor){item.group.position.y+=floor-box.min.y;if(G(this.world)>0.5){if(item.velocity.y<0)item.velocity.y=Math.abs(item.velocity.y)*.1;item.velocity.x*=.82;item.velocity.z*=.82;}else if(item.velocity.y<0)item.velocity.y=Math.abs(item.velocity.y)*.4;}}}
 this.gadgets?.tick?.(dt);this.flames?.tick?.(dt);this.weights?.tick?.(dt);this.world.piano?.tick?.(this.camera);
 for(const shot of this.shots){shot.age+=dt;const next=shot.position.clone().addScaledVector(shot.velocity,dt),dist=next.distanceTo(shot.position),ray=new T.Ray(shot.position.clone(),shot.velocity.clone().normalize()),hit=this.hit(ray,dist);this.beam(shot.position,hit?.point||next,0xffe5ac,.035);if(hit){hit.weaponId=shot.weaponId;hit.stagger=shot.stagger;this.impact(hit,shot.energy||32,ray.direction,'bullet');shot.age=2;}shot.position.copy(next);shot.velocity.y-=G(this.world)*dt;}this.shots=this.shots.filter(x=>x.age<.8).slice(-12);
 for(const e of this.effects){e.ttl-=dt;e.mesh.position.addScaledVector(e.velocity,dt);e.mesh.material.opacity=Math.max(0,e.ttl/e.life);if(e.expand)e.mesh.scale.addScalar(dt*e.expand*10);if(e.ttl<=0)this.dispose(e.mesh);}this.effects=this.effects.filter(e=>e.ttl>0);while(this.effects.length>80)this.dispose(this.effects.shift().mesh);
 const updated=new Set();for(const m of this.marks){m.age+=dt;m.mesh.material.uniforms.age.value=m.age;if(m.anchor&&m.actor?.version==='v2'&&this.system.actors.includes(m.actor)){const {surface,ref}=m.anchor;if(!updated.has(surface)){surface.begin();updated.add(surface);}const tri=new T.Triangle();surface.vertex(ref.cache,ref.ids[0],tri.a);surface.vertex(ref.cache,ref.ids[1],tri.b);surface.vertex(ref.cache,ref.ids[2],tri.c);const normal=tri.getNormal(V());m.mesh.position.copy(tri.a).multiplyScalar(ref.bary.x).addScaledVector(tri.b,ref.bary.y).addScaledVector(tri.c,ref.bary.z).addScaledVector(normal,.002);if(m.along){const along=m.along.clone().addScaledVector(normal,-m.along.dot(normal));if(along.lengthSq()<1e-6)along.copy(m.along);along.normalize();const bin=new T.Vector3().crossVectors(normal,along).normalize();m.mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(along,bin,normal));}else m.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);}if(m.age>100||m.piece?.broken||m.actor&&!this.system.actors.includes(m.actor))this.dispose(m.mesh);}this.marks=this.marks.filter(m=>m.mesh.parent);
 }
}
