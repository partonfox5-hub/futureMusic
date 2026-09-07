import * as T from 'three';
import {playSfx,sfxForHit,unlockSfx} from './mira-v2-sfx.js?v=11.0';
import {furnitureRoot,syncFurniture} from './mira-v2-furniture.js?v=11.4';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
const visible=o=>{while(o){if(!o.visible)return false;o=o.parent;}return true;};
export const WEAPONS={sword:{name:'Sword',mass:1.4,reach:.95,sharpness:.85,kind:'cut'},mace:{name:'Mace',mass:2.8,reach:.66,sharpness:0,kind:'blunt'},pistol:{name:'Pistol',mass:.9,reach:.24,kind:'bullet'},laser:{name:'Laser pistol',mass:1.2,reach:.28,kind:'laser'}};
export class Props {
 constructor({scene,system,world,wardrobe,camera,renderer,rig}){Object.assign(this,{scene,system,world,wardrobe,camera,renderer,rig});this.items=[];this.held=new Map();this.furnHolds=new Map();this.shots=[];this.effects=[];this.marks=[];this.time=0;this.revision=-1;this.rc=new T.Raycaster();this.status='Weapons are on the living-room table.';this.syncWorld();}
 make(id){const data=WEAPONS[id],group=new T.Group(),metal=new T.MeshStandardMaterial({color:id==='laser'?0x467e8a:0x8b9298,roughness:.32,metalness:.75}),grip=new T.MeshStandardMaterial({color:0x362e2b,roughness:.95}),add=(geom,mat,x,y,z)=>{const m=new T.Mesh(geom,mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
 add(new T.BoxGeometry(.037,.06,.15),grip,0,-.025,0);
 if(id==='sword'){add(new T.BoxGeometry(.24,.02,.035),metal,0,0,-.14);add(new T.BoxGeometry(.042,.009,.70,1,1,8),metal,0,0,-.505);const tip=add(new T.ConeGeometry(.028,.12,4),metal,0,0,-.915);tip.rotation.x=-Math.PI/2;tip.rotation.z=Math.PI/4;}
 else if(id==='mace'){const shaft=add(new T.CylinderGeometry(.016,.022,.53,12),grip,0,0,-.25);shaft.rotation.x=Math.PI/2;add(new T.IcosahedronGeometry(.088,1),metal,0,0,-.57);for(let i=0;i<6;i++){const m=add(new T.BoxGeometry(.026,.19,.105),metal,0,0,-.57);m.rotation.z=i*Math.PI/3;}}
 else{add(new T.BoxGeometry(.055,.075,.24),metal,0,.03,-.08);const handle=add(new T.BoxGeometry(.044,.11,.055),grip,0,-.057,.016);handle.rotation.x=-.2;add(new T.TorusGeometry(.029,.005,6,14),metal,0,-.045,-.057).rotation.y=Math.PI/2;add(new T.BoxGeometry(.018,.012,.014),grip,0,.075,-.15);if(id==='laser')for(const x of [-.033,.033])add(new T.BoxGeometry(.008,.017,.13),new T.MeshBasicMaterial({color:0x9df5ff}),x,.035,-.09);}
 group.traverse(m=>m.userData.weapon=id);const item={id,data,group,holder:null,lastTip:null,lastPoint:null,handle:new T.Vector3(0,['pistol','laser'].includes(id)?-.057:-.025,['pistol','laser'].includes(id)?.016:0),velocity:V(),lastHit:new Map(),kick:0,swing:0};this.scene.add(group);return item;}
 syncWorld(){if(this.revision===this.world.revision)return;this.revision=this.world.revision;this.furnHolds.clear();if(this.restraints){for(const l of [...this.restraints.links])this.restraints.remove(l);this.restraints.cancel();}for(const m of this.marks.filter(m=>!m.actor))this.dispose(m.mesh);this.marks=this.marks.filter(m=>m.actor);this.shots=[];for(const e of this.effects)this.dispose(e.mesh);this.effects=[];const kept=[];for(const item of this.items){if(item.holder!==null){kept.push(item);continue;}item.group.removeFromParent();item.group.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});}this.items=kept;const heldIds=new Set(kept.map(i=>i.id));if(this.world.name!=='Living room')return;const p=this.world.tableAnchor;if(!p)return;Object.keys(WEAPONS).forEach((id,i)=>{if(heldIds.has(id))return;const item=this.make(id);item.group.position.set(i<2?p.x-.65:p.x+.50,p.y+.055,p.z+(i%2?.22:-.16));item.group.rotation.y=i<2?-Math.PI/2:0;this.items.push(item);});}
 ray(i){const c=this.system.hands.ctrl[i];return new T.Ray(c.getWorldPosition(V()),new T.Vector3(0,0,-1).applyQuaternion(c.getWorldQuaternion(Q())));}
 weaponHit(ray){this.rc.ray.copy(ray);this.rc.far=8;const h=this.rc.intersectObjects(this.items.filter(x=>x.holder===null).map(x=>x.group),true).find(h=>visible(h.object));if(!h)return null;const blocker=this.hit(ray,h.distance,false);if(blocker&&blocker.distance<h.distance-.005)return null;return this.items.find(x=>x.id===h.object.userData.weapon);}
 handParent(key){if(key==='desktop')return this.camera;return this.system.hands?.grip[key]||this.system.hands?.ctrl[key]||null;}
 applyHoldPose(item){
  const key=item.holder,gun=item.data.kind==='bullet'||item.data.kind==='laser',vr=key!=='desktop';
  if(vr&&!this.renderer.xr.isPresenting){this.drop(key);return;}
  const parent=this.handParent(key);if(!parent){this.drop(key);return;}
  if(item.group.parent!==parent)parent.attach(item.group);
  if(vr){
   item.group.quaternion.setFromEuler(new T.Euler((gun?-.18:0)-(item.kick||0)*1.2,0,gun?0:Math.PI/2));
   item.group.position.copy(new T.Vector3(0,-.012,-.05)).sub(item.handle.clone().applyQuaternion(item.group.quaternion));
  }else{
   item.group.position.set(gun?.16:.20,gun?-.11:-.14,gun?-.40:-.44);
   item.group.rotation.set((gun?.16:-.12)-(item.kick||0)*1.2,item.swing>0?Math.sin(item.swing/.28*Math.PI)*1.05:0,gun?0:Math.PI/2);
  }
  item.group.updateMatrixWorld(true);
 }
 nearestFreeWeapon(p,r=.22){let best=null,bd=r*r;for(const item of this.items){if(item.holder!==null)continue;const d=item.group.localToWorld(item.handle.clone()).distanceToSquared(p);if(d<bd){bd=d;best=item;}}return best;}
 hold(item,key){if(!item||item.holder!==null)return false;unlockSfx();this.drop(key);item.holder=key;item.lastTip=null;item.lastSamples=null;item.lastPoint=null;item.kick=0;item.swing=0;item.armedAt=this.time+.22;item.velocity.set(0,0,0);this.held.set(key,item);this.applyHoldPose(item);this.status=item.data.name+' held · '+(key==='desktop'?'click to use, Q to drop':'release grip to drop · trigger fires · swing your hand for melee');if(typeof key==='number')this.system.hands.haptics?.contact(key,'prop',1,.008);return true;}
 equip(id){return this.hold(this.items.find(i=>i.id===id),'desktop');}
 drop(key){const item=this.held.get(key);if(!item)return;item.group.updateMatrixWorld(true);this.scene.attach(item.group);item.holder=null;item.lastTip=null;item.lastSamples=null;item.lastPoint=null;item.kick=0;this.held.delete(key);this.status='Dropped '+item.data.name;}
 nearestFurniture(pos,r=.2){let best=null,bd=r;for(const group of this.world.movables||[]){if(!group.parent)continue;const box=new T.Box3().setFromObject(group),closest=box.clampPoint(pos,V()),d=closest.distanceTo(pos);if(d<bd){bd=d;best={group,point:closest,distance:d};}}return best;}
 holdFurniture(group,key,point,ctrl=null){const furn=group.userData.furniture;if(!furn)return false;furn.holds??=new Set();
  if(furn.held!=null&&furn.held!==key){const prev=this.furnHolds.get(furn.held);if(prev&&prev.group!==group)this.releaseFurniture(furn.held);}
  if(ctrl?.position)ctrl.position.copy(point);this.furnHolds.set(key,{group,local:group.worldToLocal(point.clone()),ctrl,last:point.clone()});furn.holds.add(key);furn.held=key;furn.velocity.set(0,0,0);furn.spin=0;furn.omega=furn.omega||new T.Vector3();this.status='Holding '+furn.id+' · '+Math.round(furn.mass)+' kg';if(typeof key==='number')this.system.hands.haptics?.contact(key,'prop',1,.01);return true;}
 holdFurnitureAt(i){const palm=this.system.hands.palmPos(i),found=this.nearestFurniture(palm,.2);if(!found)return false;for(const actor of this.system.actors){const hit=actor.nearestHit(palm,found.distance);if(hit&&actor.lastHitDistance<found.distance-.01)return false;}const meshes=[];found.group.traverse(m=>{if(m.isMesh&&m.visible)meshes.push(m);});let point=found.point;if(meshes.length){const dir=found.point.clone().sub(palm),len=dir.length();if(len>1e-5){this.rc.ray.origin.copy(palm);this.rc.ray.direction.copy(dir.normalize());this.rc.near=0;this.rc.far=len+.05;const hit=this.rc.intersectObjects(meshes,false)[0];if(hit)point=hit.point;}}return this.holdFurniture(found.group,i,point);}
 grabFurnitureFromRay(ray,ctrl,key='desktop'){const meshes=[];for(const g of this.world.movables||[])g.traverse(m=>{if(m.isMesh&&m.visible)meshes.push(m);});if(!meshes.length)return false;this.rc.ray.copy(ray);this.rc.near=0;this.rc.far=8;const hit=this.rc.intersectObjects(meshes,false).find(h=>visible(h.object));if(!hit)return false;const group=furnitureRoot(hit.object);return group?this.holdFurniture(group,key,hit.point,ctrl):false;}
 releaseFurniture(key){const hold=this.furnHolds.get(key);if(!hold)return;const furn=hold.group.userData.furniture;this.furnHolds.delete(key);if(furn){furn.holds?.delete(key);furn.held=furn.holds?.size?[...furn.holds][0]:null;}if(hold.group.parent)syncFurniture(this.world,hold.group);}
 shoveFurniture(furn,dir,wMass,speed,point){const n=dir.clone();n.y=0;if(n.lengthSq()<1e-6)n.set(0,0,-1);n.normalize();const impulse=Math.min(3.2,wMass*speed*1.6/Math.max(2,furn.mass));furn.velocity.addScaledVector(n,impulse);const group=furn.obstacle?.object;if(group&&point){const center=new T.Box3().setFromObject(group).getCenter(V());furn.spin+=((point.x-center.x)*n.z-(point.z-center.z)*n.x)*impulse*1.4;}}
 holdTarget(hold,key){return hold.ctrl?hold.ctrl.getWorldPosition(V()):(typeof key==='number'?this.system.hands.palmPos(key):null);}
 clampFurnitureFloor(group,furn){
  group.updateWorldMatrix(true,true);const box=new T.Box3().setFromObject(group);
  if(box.min.y<furn.floorY){group.position.y+=furn.floorY-box.min.y;if(furn.omega){furn.omega.x*=.35;furn.omega.z*=.35;}if(furn.velocity.y<0)furn.velocity.y=0;}
 }
 tickFurniture(dt){
  const byGroup=new Map();
  for(const [key,hold] of [...this.furnHolds]){
   const group=hold.group,furn=group.userData.furniture;if(!group.parent||!furn){this.furnHolds.delete(key);continue;}
   const target=this.holdTarget(hold,key);if(!target){this.releaseFurniture(key);continue;}
   if(!byGroup.has(group))byGroup.set(group,[]);byGroup.get(group).push({key,hold,target});
  }
  for(const [group,list] of byGroup){
   const furn=group.userData.furniture;furn.omega=furn.omega||new T.Vector3();
   group.updateWorldMatrix(true,true);
   if(list.length>=2){
    const a=list[0],b=list[1],Ga=group.localToWorld(a.hold.local.clone()),Gb=group.localToWorld(b.hold.local.clone());
    const midG=Ga.clone().lerp(Gb,.5),midT=a.target.clone().lerp(b.target,.5);
    group.position.add(midT.sub(midG));
    const from=Gb.clone().sub(Ga),to=b.target.clone().sub(a.target);
    if(from.lengthSq()>.002&&to.lengthSq()>.002){
     from.normalize();to.normalize();
     const q=new T.Quaternion().setFromUnitVectors(from,to);
     group.quaternion.premultiply(q);
     group.updateWorldMatrix(true,true);
     const mid2=group.localToWorld(a.hold.local.clone()).lerp(group.localToWorld(b.hold.local.clone()),.5);
     group.position.add(a.target.clone().lerp(b.target,.5).sub(mid2));
    }
    furn.omega.set(0,0,0);furn.velocity.set(0,0,0);
   }else{
    const {hold,target}=list[0];
    const current=group.localToWorld(hold.local.clone()),delta=target.clone().sub(current);delta.y*=Math.min(1,18/furn.mass);
    delta.multiplyScalar(1-Math.exp(-dt*(10/Math.sqrt(furn.mass/8))));const max=Math.max(.03,(7/furn.mass)*dt+.035);if(delta.length()>max)delta.setLength(max);
    group.position.add(delta);
    group.updateWorldMatrix(true,true);
    const G=group.localToWorld(hold.local.clone()),box=new T.Box3().setFromObject(group),com=box.getCenter(V());
    const r=com.sub(G),torque=r.clone().cross(new T.Vector3(0,-9.81,0));
    furn.omega.addScaledVector(torque,dt/Math.max(6,furn.mass*.45));furn.omega.multiplyScalar(Math.exp(-dt*2.2));
    if(furn.omega.length()>5)furn.omega.setLength(5);
    const ang=furn.omega.length();
    if(ang>1e-4){
     group.rotateOnWorldAxis(furn.omega.clone().normalize(),ang*dt);
     group.updateWorldMatrix(true,true);
     const G2=group.localToWorld(hold.local.clone());group.position.add(G.sub(G2));
    }
    furn.velocity.copy(delta).divideScalar(Math.max(.001,dt));
   }
   this.clampFurnitureFloor(group,furn);
   const p=group.position.clone(),rad=Math.max(.2,Math.hypot(furn.obstacle?.w||.4,furn.obstacle?.d||.4)/2);this.world.project(p,rad,.02,1.6,furn.obstacle);group.position.x=p.x;group.position.z=p.z;syncFurniture(this.world,group);
  }
  for(const group of this.world.movables||[]){
   const furn=group.userData.furniture;if(!furn||furn.holds?.size||furn.held!=null||!group.parent)continue;
   furn.omega=furn.omega||new T.Vector3();
   if(furn.velocity.lengthSq()<1e-6&&furn.omega.lengthSq()<1e-6&&Math.abs(furn.spin)<1e-4&&group.position.y<=furn.floorY+1e-4)continue;
   group.position.addScaledVector(furn.velocity,dt);furn.velocity.y-=9.81*dt;furn.velocity.x*=Math.exp(-dt*(1.6+furn.mass*.03));furn.velocity.z*=Math.exp(-dt*(1.6+furn.mass*.03));
   furn.omega.multiplyScalar(Math.exp(-dt*2.4));const ang=furn.omega.length();if(ang>1e-4)group.rotateOnWorldAxis(furn.omega.clone().normalize(),ang*dt);
   furn.spin*=Math.exp(-dt*3);group.rotation.y+=furn.spin*dt;
   this.clampFurnitureFloor(group,furn);
   const p=group.position.clone(),rad=Math.max(.2,Math.hypot(furn.obstacle?.w||.4,furn.obstacle?.d||.4)/2);this.world.project(p,rad,.02,1.6,furn.obstacle);group.position.x=p.x;group.position.z=p.z;syncFurniture(this.world,group);
  }
  if(this.world.movables)this.world.movables=this.world.movables.filter(g=>g.parent);
 }
 grip(i){if(this.held.has(i)||this.furnHolds.has(i))return true;const palm=this.system.hands.palmPos(i),target=this.nearestFreeWeapon(palm,.22);if(target){const handle=target.group.localToWorld(target.handle.clone()),distance=handle.distanceTo(palm),block=distance>.001?this.hit(new T.Ray(palm,handle.clone().sub(palm).normalize()),distance,false):null;if(!block||block.distance>=distance-.035)return this.hold(target,i);}if(this.holdFurnitureAt(i))return true;return this.vehicle?.grip(i)||false;}
 release(i){this.drop(i);this.releaseFurniture(i);this.vehicle?.release(i);}
 resetMotion(){for(const item of this.items){item.lastTip=null;item.lastSamples=null;item.lastPoint=null;item.velocity.set(0,0,0);}}
 trigger(i){if(this.builder?.active){this.builder.controller=i;return this.builder.place(this.ray(i));}if(this.restraints?.placing)return this.restraints.place(this.ray(i));if(this.vehicle?.driving)return true;const held=this.held.get(i);if(held){if(['bullet','laser'].includes(held.data.kind))this.fire(held);return true;}return false;}
 desktop(ray){if(this.builder?.active)return this.builder.place(ray);if(this.vehicle?.driving)return true;if(this.restraints?.placing)return this.restraints.place(ray);const item=this.held.get('desktop');if(item){if(['bullet','laser'].includes(item.data.kind))this.fire(item,ray);else{item.swing=.30;const hit=this.hit(ray,1.45);if(hit)this.impact(hit,item.data.mass*18,ray.direction,item.data.kind,item.data.sharpness);}return true;}const rope=this.restraints?.hit(ray);if(rope){this.restraints.selected=rope.object.userData.restraint;this.restraints.status='Selected link '+this.restraints.selected.id;return true;}if(this.vehicle?.click(ray))return true;const picked=this.weaponHit(ray);return picked?this.hold(picked,'desktop'):false;}
 hit(ray,max=50,ropes=true,opts={}){
  this.rc.ray.copy(ray);this.rc.near=0;this.rc.far=max;
  const clothes=(this.wardrobe?.clothes||[]).map(c=>c.mesh).filter(m=>m&&visible(m));
  const clothHit=clothes.length?this.rc.intersectObjects(clothes,false).find(h=>visible(h.object)):null;
  const meshes=[];
  if(opts.world!==false)meshes.push(...this.world.pickables,...(this.vehicle?.pickables||[]));
  for(const a of this.system.actors)a.root.traverse(m=>{if(m.isSkinnedMesh&&/^body/.test(m.name))meshes.push(m);});
  const hit=meshes.length?this.rc.intersectObjects(meshes,false).find(h=>visible(h.object)&&!h.object.userData.chunks?.[h.instanceId]?.broken):null;
  const rope=ropes&&this.restraints?.hit(ray,max);
  const candidates=[clothHit,hit,rope].filter(Boolean).sort((a,b)=>a.distance-b.distance);
  return candidates[0]||null;
 }
 actorFor(o){while(o){const a=this.system.actors.find(a=>a.root===o);if(a)return a;o=o.parent;}return null;}
 fire(item,aim){if(this.time-(item.lastFire??-2)<(item.id==='laser'?.18:.22))return;item.lastFire=this.time;item.kick=Math.min(.12,(item.kick||0)+.05);unlockSfx();playSfx(item.id==='laser'?'laser':'gun');const muzzle=item.group.localToWorld(new T.Vector3(0,.032,-item.data.reach)),dir=aim?(this.hit(aim,35)?.point||aim.at(15,V())).clone().sub(muzzle).normalize():new T.Vector3(0,0,-1).applyQuaternion(item.group.getWorldQuaternion(Q())),ray=new T.Ray(muzzle,dir);if(item.id==='laser'){const hit=this.hit(ray,35),end=hit?.point||ray.at(35,V());this.beam(muzzle,end,0x99f7ff,.10);if(hit)this.impact(hit,24,dir,'laser',0);}else{this.shots.push({position:muzzle.clone(),velocity:dir.clone().multiplyScalar(85),age:0});this.beam(muzzle,muzzle.clone().addScaledVector(dir,.12),0xffde9c,.04);}if(typeof item.holder==='number')this.system.hands.haptics.contact(item.holder,'prop',1,.004);}
 beam(a,b,color,ttl){const length=a.distanceTo(b),m=new T.Mesh(new T.CylinderGeometry(.003,.003,Math.max(.001,length),5),new T.MeshBasicMaterial({color,transparent:true}));m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());this.scene.add(m);this.effects.push({mesh:m,ttl,life:ttl,velocity:V(),expand:0});}
 impact(hit,energy,dir,kind,sharpness=0){unlockSfx();playSfx(sfxForHit(kind));if(hit.object.userData.restraint){if(kind==='cut'||kind==='laser')this.restraints.cut(hit.object.userData.restraint);return;}
  const cloth=hit.object.userData.cloth;if(cloth&&['cut','laser','bullet'].includes(kind)){const n=cloth.slash(hit.point,dir,kind,energy);this.status=(kind==='laser'?'Laser burned':kind==='bullet'?'Shot through': 'Cut')+' clothing'+(n?' · '+n+' tears':'');
   const wearer=cloth.actor;if(wearer){const region=wearer.nearestHit(hit.point,.18);if(region){if(this.injuries)this.injuries.impact(wearer,hit,energy*.65,kind,dir);else wearer.applyStrike?.(region,dir.clone().negate(),Math.min(3,Math.sqrt(energy)*.25),0,hit.point);}}
   this.mark(hit,wearer||null,kind,dir,energy);return;}
  const actor=this.actorFor(hit.object);let result=null;if(actor){if(this.injuries)result=this.injuries.impact(actor,hit,energy,kind,dir);else{const region=actor.nearestHit(hit.point,.15);if(region)actor.applyStrike?.(region,dir.clone().negate(),Math.min(3,Math.sqrt(energy)*.3),0,hit.point);}}else if(hit.object.userData.carPart)this.vehicle.damage(hit,energy,kind,dir);else this.world.fractures.impact(hit,energy,dir,kind,sharpness);if(!actor||this.injuries?.enabled!==false)this.mark(hit,actor,kind,dir,energy);this.status=(kind==='laser'?'Laser burn':kind==='bullet'?'Bullet impact':kind==='cut'?'Blade cut':'Blunt bruise')+(result?' · '+result.region+(result.severed?' · severed':result.fractured?' · fractured':''):'');
 if(kind==='laser')for(let j=0;j<5;j++){const m=new T.Mesh(new T.IcosahedronGeometry(.008,0),new T.MeshBasicMaterial({color:j<3?0xffb46b:0x878681,transparent:true,opacity:.8}));m.position.copy(hit.point);this.scene.add(m);this.effects.push({mesh:m,ttl:.55,life:.55,velocity:dir.clone().multiplyScalar(-.35).add(new T.Vector3(Math.sin(j*2.3)*.3,.25+j*.08,Math.cos(j*2.3)*.3)),expand:j>2?2:0});}}
 mark(hit,actor,kind,dir=new T.Vector3(1,0,0),energy=12){
  const cut=kind==='cut',bruise=kind==='blunt'&&!!actor,laser=kind==='laser',bullet=kind==='bullet';
  const len=cut?Math.min(.16,.07+Math.sqrt(Math.max(0,energy))*.012):(laser?.034:bullet?.024:.05+Math.min(.08,Math.sqrt(Math.max(0,energy))*.01));
  const wid=cut?.007:.0;
  const geom=cut?new T.PlaneGeometry(len,wid*2):new T.PlaneGeometry(len*2,len*2);
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,uniforms:{age:{value:0},laser:{value:laser?1:0},skin:{value:actor?1:0},bullet:{value:bullet?1:0},cut:{value:cut?1:0},bruise:{value:bruise?1:0},seed:{value:Math.random()*6.28}},vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 u;uniform float age;uniform float laser;uniform float skin;uniform float bullet;uniform float cut;uniform float bruise;uniform float seed;
void main(){
 vec2 p=(u-.5)*2.0;
 if(cut>.5){
  float line=1.0-smoothstep(.10,.72,abs(p.y));
  float fade=1.0-smoothstep(.78,1.0,abs(p.x));
  float alpha=line*fade*.96;
  vec3 c=mix(vec3(.02,.01,.01),vec3(.32,.05,.06),smoothstep(.06,.7,abs(p.y)));
  gl_FragColor=vec4(c,alpha);return;
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
  let anchor=null;if(actor){const surface=this.system.contacts.surface(actor);surface.begin();surface.project(hit.point.clone(),.004);anchor=surface.lastClosest?{surface,ref:surface.lastClosest}:null;}else if(!hit.object.isInstancedMesh)hit.object.attach(mesh);if(!mesh.parent)this.scene.add(mesh);this.marks.push({mesh,actor,anchor,object:hit.object,piece:hit.object.userData.chunks?.[hit.instanceId]||hit.object.userData.piece,age:0,along:cut?along.clone():null});while(this.marks.length>80)this.dispose(this.marks.shift().mesh);
 }
 dispose(m){m.removeFromParent();m.geometry?.dispose();m.material?.dispose();}
 tick(dt){this.time+=dt;this.syncWorld();for(const item of this.items)item.group.visible=this.world.root.visible;if(!this.world.root.visible){this.vehicle?.tick(dt);return;}this.vehicle?.tick(dt);this.restraints?.tick(dt);this.injuries?.tick(dt);this.tickFurniture(dt);for(const item of this.items){if(item.holder!==null){item.kick*=Math.exp(-dt*14);if(item.swing>0)item.swing=Math.max(0,item.swing-dt);this.applyHoldPose(item);
 const samples=[.45,1].map(f=>item.group.localToWorld(new T.Vector3(0,0,-item.data.reach*f)));
 if(item.lastSamples&&item.holder!=='desktop'&&['cut','blunt'].includes(item.data.kind)&&this.time>=(item.armedAt||0))for(let j=0;j<samples.length;j++){
  const point=samples[j],old=item.lastSamples[j],dist=point.distanceTo(old),speed=Math.min(12,dist/Math.max(.001,dt));
  if(dist>.004&&dist<.75){const ray=new T.Ray(old.clone(),point.clone().sub(old).normalize()),hit=this.hit(ray,dist+.03,false,{world:true});if(!hit)continue;
   const furn=furnitureRoot(hit.object)?.userData.furniture,body=this.actorFor(hit.object)||hit.object.userData.cloth;
   const key=hit.object.userData.cloth?'c'+hit.object.uuid:(furn?'f'+(furn.obstacle?.object?.uuid||hit.object.uuid):(this.actorFor(hit.object)?.group.uuid||hit.object.uuid));
   if(this.time-(item.lastHit.get(key)??-2)<.28)continue;
   if(furn&&speed<1.55){item.lastHit.set(key,this.time);this.shoveFurniture(furn,ray.direction,item.data.mass,speed,hit.point);this.system.hands.haptics?.contact(item.holder,'prop',Math.min(1,speed),.006);continue;}
   if((body&&speed>1.15)||(!body&&!furn&&speed>2.2)||(furn&&speed>=1.55)){item.lastHit.set(key,this.time);this.impact(hit,.5*item.data.mass*speed*speed,ray.direction,item.data.kind,item.data.sharpness);this.system.hands.haptics?.contact(item.holder,'prop',speed,.01);}
  }
 }
 item.lastSamples=samples;const p=item.group.getWorldPosition(V());if(item.lastPoint)item.velocity.copy(p).sub(item.lastPoint).divideScalar(Math.max(.001,dt)).clampLength(0,8);item.lastPoint=p.clone();
 }else{item.velocity.y-=9.81*dt;item.group.position.addScaledVector(item.velocity,dt);const p=item.group.position,old=p.clone();if(this.world.projectSphere(p,.055)){const n=p.clone().sub(old).normalize(),vn=item.velocity.dot(n);if(vn<0)item.velocity.addScaledVector(n,-1.1*vn);item.velocity.multiplyScalar(.8);}if(p.y<.05){p.y=.05;item.velocity.multiplyScalar(.85);item.velocity.y=Math.abs(item.velocity.y)*.12;}}}
 for(const shot of this.shots){shot.age+=dt;const next=shot.position.clone().addScaledVector(shot.velocity,dt),dist=next.distanceTo(shot.position),ray=new T.Ray(shot.position.clone(),shot.velocity.clone().normalize()),hit=this.hit(ray,dist);this.beam(shot.position,hit?.point||next,0xffe5ac,.035);if(hit){this.impact(hit,32,ray.direction,'bullet');shot.age=2;}shot.position.copy(next);shot.velocity.y-=9.81*dt;}this.shots=this.shots.filter(x=>x.age<.8).slice(-12);
 for(const e of this.effects){e.ttl-=dt;e.mesh.position.addScaledVector(e.velocity,dt);e.mesh.material.opacity=Math.max(0,e.ttl/e.life);if(e.expand)e.mesh.scale.addScalar(dt*e.expand*10);if(e.ttl<=0)this.dispose(e.mesh);}this.effects=this.effects.filter(e=>e.ttl>0);while(this.effects.length>80)this.dispose(this.effects.shift().mesh);
 const updated=new Set();for(const m of this.marks){m.age+=dt;m.mesh.material.uniforms.age.value=m.age;if(m.anchor&&this.system.actors.includes(m.actor)){const {surface,ref}=m.anchor;if(!updated.has(surface)){surface.begin();updated.add(surface);}const tri=new T.Triangle();surface.vertex(ref.cache,ref.ids[0],tri.a);surface.vertex(ref.cache,ref.ids[1],tri.b);surface.vertex(ref.cache,ref.ids[2],tri.c);const normal=tri.getNormal(V());m.mesh.position.copy(tri.a).multiplyScalar(ref.bary.x).addScaledVector(tri.b,ref.bary.y).addScaledVector(tri.c,ref.bary.z).addScaledVector(normal,.002);if(m.along){const along=m.along.clone().addScaledVector(normal,-m.along.dot(normal));if(along.lengthSq()<1e-6)along.copy(m.along);along.normalize();const bin=new T.Vector3().crossVectors(normal,along).normalize();m.mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(along,bin,normal));}else m.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);}if(m.age>100||m.piece?.broken||m.actor&&!this.system.actors.includes(m.actor))this.dispose(m.mesh);}this.marks=this.marks.filter(m=>m.mesh.parent);
 }
}
