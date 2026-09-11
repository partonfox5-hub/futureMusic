import * as T from 'three';
import {WEAPONS} from '../mira-v2-props.js?v=18.0.0';
import {furnitureRoot} from '../mira-v2-furniture.js?v=18.0.0';
import {wrapMethod,disposeTree,clamp,V,rng} from './human5-common.js?v=18.0.0';
import {createScope} from './human5-scope.js?v=18.0.0';
import {playSfx,unlockSfx} from '../mira-v2-sfx.js?v=18.0.0';

export const PROJECTILES=Object.freeze({
 rocket:{speed:43,gravity:.10,radius:.06,blast:5,energy:85,life:6,color:0xff983c},
 miniNuke:{speed:24,gravity:.48,radius:.12,blast:24,energy:220,life:9,color:0xffcb60},
 fireball:{speed:17,gravity:.015,radius:.095,blast:1.2,energy:20,life:4,color:0xff6520}
});

export function installEquipment({scene,renderer,camera,world,mira,props,quest=true}={}){
 if(world.h5Equipment)return world.h5Equipment;
 const restores=[],scope=createScope(props,{quest}),projectiles=[],clouds=[],frozen=new Map(),jobs=[];
 const random=rng(83017),dummy=new T.Object3D(),pool=quest?6:10;let ui=null,lastRevision=world.revision;
 const cloudMaterial=new T.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:.69,depthWrite:false});
 // Rolling turbulence is a vertex effect; one bounded instanced draw per cloud.
 const cloudTime={value:0};cloudMaterial.onBeforeCompile=s=>{s.uniforms.h5CloudTime=cloudTime;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float h5CloudTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed*=1.+.075*sin(position.x*7.+instanceMatrix[3].y+h5CloudTime*1.4)*cos(position.z*6.-h5CloudTime);');};cloudMaterial.customProgramCacheKey=()=> 'h5-rolling-cloud-1';
 const cloudGeometry=new T.IcosahedronGeometry(1,1),cloudColor=new T.Color();
 for(let i=0;i<3;i++){const mesh=new T.InstancedMesh(cloudGeometry,cloudMaterial,64);mesh.count=0;mesh.frustumCulled=false;mesh.name='Bounded explosion cloud';mesh.userData.h5Effect=true;scene.add(mesh);clouds.push({mesh,age:0,life:0,point:V(),nuclear:false});}
 for(let i=0;i<pool;i++){const mesh=new T.Mesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0xff9d49,emissive:0xff6725,emissiveIntensity:1.7,roughness:.4}));mesh.visible=false;mesh.name='Spell / launcher projectile';mesh.userData.h5Effect=true;scene.add(mesh);projectiles.push({mesh,live:false,vel:V(),age:0,type:null,owner:null});}
 function hitActor(hit){return hit?.actor||hit?.object?.userData?.cloth?.actor||hit?.object?.userData?.h5Armor?.actor||props.actorFor(hit?.object)||props.dogFor(hit?.object);}
 function actorSurface(a){let mesh=null;a?.root?.traverse(m=>{if(!mesh&&m.isSkinnedMesh&&m.visible&&/^body/i.test(m.name))mesh=m;});return mesh;}
 function startCloud(point,nuclear=false){const c=clouds.find(c=>c.life<=c.age)||clouds.reduce((a,b)=>a.age/a.life>b.age/b.life?a:b);c.point.copy(point);c.age=0;c.life=nuclear?16:2.1;c.nuclear=nuclear;}
 function clear(){for(const p of projectiles){p.live=false;p.mesh.visible=false;}for(const c of clouds){c.mesh.count=0;c.life=0;}jobs.length=0;for(const [a,s]of frozen){s.restore();delete a.h5Frozen;}frozen.clear();}
 function freeze(a){if(!a||a.dead||world.h5Combat?.isProtected(a))return false;let s=frozen.get(a);if(!s){s={remaining:0,restore:wrapMethod(a,'tick',old=>function(){if(a.h5Frozen)return;return old.apply(this,arguments);})};frozen.set(a,s);}s.remaining=4.5;a.h5Frozen=true;return true;}
 function canReach(a,b,ignore=null){return !world.h5Upgrade?.fire.blocked(a,b,null,ignore);}
 function queueBlast(point,spec,type){
  const candidates=[],origin=point.clone();
  for(const a of [...mira.actors,...(props.dogs?.list?.()||[])]){const mesh=actorSurface(a);if(!mesh)continue;const target=(a.group||a.root).getWorldPosition(V()).add(new T.Vector3(0,a.version==='v2'?.95:.35,0)),d=target.distanceTo(point);if(d<spec.blast)candidates.push({object:mesh,point:target,actor:a,d});}
  for(const g of world.movables){if(!g.parent||g.userData.furniture?.held!=null)continue;const f=g.userData.furniture;g.updateWorldMatrix(true,true);const box=f?.localBox?.clone().applyMatrix4(g.matrixWorld)||new T.Box3().setFromObject(g),p=box.clampPoint(point,V()),d=p.distanceTo(point);if(d>=spec.blast)continue;let object=null;g.traverse(m=>{if(!object&&m.isMesh&&m.visible)object=m;});if(object)candidates.push({object,point:p,d,root:g});}
  for(const car of props.cars()){if(car.group.position.distanceTo(point)>spec.blast+3)continue;for(const part of [...car.wheels,...car.parts].filter(p=>!p.broken&&p.mesh).sort((a,b)=>a.mesh.getWorldPosition(V()).distanceToSquared(point)-b.mesh.getWorldPosition(V()).distanceToSquared(point)).slice(0,3)){const p=part.mesh.getWorldPosition(V()),d=p.distanceTo(point);if(d<spec.blast)candidates.push({object:part.mesh,point:p,d,root:car.group});}}
  // One hit per target, nearest first; bounded deferred work avoids a blast-frame stall.
  for(const c of candidates.sort((a,b)=>a.d-b.d).slice(0,36))jobs.push({origin,spec,type,hit:c});
  if(jobs.length>72)jobs.splice(0,jobs.length-72);
  const eye=camera.getWorldPosition(V()),distance=eye.distanceTo(origin);
  if(distance<spec.blast&&canReach(origin,eye))world.h5Combat?.playerHit(spec.energy*(1-distance/spec.blast)*.30,eye.sub(origin).normalize());
 }
 function explode(p,hit){const spec=PROJECTILES[p.type],point=(hit?.point||p.mesh.position).clone();let normal=hit?.face?.normal?.clone().transformDirection(hit.object.matrixWorld);if(normal)point.addScaledVector(normal,.045);
  startCloud(point,p.type==='miniNuke');queueBlast(point,spec,p.type);if(hit&&p.type==='fireball')props.flames?.ignite(hit,true);
  p.live=false;p.mesh.visible=false;unlockSfx();playSfx('gun',.8);
 }
 function cast(item,aim){
  if(item.data.kind!=='launcher'&&item.data.kind!=='spell')return false;
  if(item.holder?.h5Mouth)return true;if(item.reloading)return true;
  if(item.data.magSize&&item.mag<=0){props.startReload(item);return true;}
  if(props.time-(item.lastFire??-100)<item.data.fireRate)return true;
  const p=item.group.localToWorld(new T.Vector3(0,.03,-item.data.reach)),direction=new T.Vector3(0,0,-1).applyQuaternion(item.group.getWorldQuaternion(new T.Quaternion()));
  if(aim){const h=props.hit(aim,100,false);direction.copy(h?.point||aim.at(60,V())).sub(p).normalize();}
  const ray=new T.Ray(p,direction),hit=props.hit(ray,80,false),a=hitActor(hit),type=item.data.projectile||item.id;
  if(PROJECTILES[type]){
   const slot=projectiles.find(p=>!p.live);if(!slot){props.status='Wait for an active projectile to finish';return true;}
   if(type==='miniNuke'&&projectiles.some(p=>p.live&&p.type===type)){props.status='One mini-nuke in flight at a time';return true;}
   Object.assign(slot,{live:true,type,age:0,owner:item.holder});slot.mesh.position.copy(p);slot.mesh.scale.setScalar(PROJECTILES[type].radius);slot.mesh.material.color.setHex(PROJECTILES[type].color);slot.mesh.visible=true;slot.vel.copy(direction).multiplyScalar(PROJECTILES[type].speed);
  }else if(type==='lightning'){
   const end=hit?.point||ray.at(35,V()),start=end.clone().add(new T.Vector3(0,16,0));let from=start;
   for(let j=1;j<=10;j++){const next=start.clone().lerp(end,j/10);if(j<10)next.add(new T.Vector3((random()-.5)*.7,0,(random()-.5)*.7));props.beam(from,next,0xb9e7ff,.22);from=next;}
   props.beam(p,end,0x91bfff,.15);if(hit){props.impact(hit,34,direction,'blunt',0);props.flames?.ignite(hit,true);}
  }else if(type==='freeze'){
   if(a&&freeze(a)){props.status='Frozen for 4.5 seconds';props.beam(p,hit.point,0x9fe5ff,.25);}else if(hit){world.h5Upgrade?.fire.douse(hit.point,1,1);startCloud(hit.point);}
  }else if(type==='resurrection'){
   if(!a){props.status='Aim at an NPC to restore them';return true;}world.h5Combat?.heal(a);props.beam(p,hit.point,0x84ffbf,.5);props.status='NPC restored';
  }else if(type==='necromancy'){
   let follower=a?.dead?a:null;if(follower)world.h5Combat?.heal(follower);
   else if(hit){const point=hit.point.clone();point.y=world.floorHeight(point,undefined,.5);follower=world.h5NPCs?.spawn({role:'zombie',mode:'passive',position:point,hostile:false,select:false});}
   if(!follower){props.status='Aim at a body or open ground; active NPC limits apply';return true;}world.h5NPCs?.command(follower,'follow');props.beam(p,follower.group.getWorldPosition(V()).add(new T.Vector3(0,1,0)),0xae86ff,.5);props.status='Undead follower summoned';
  }
  item.lastFire=props.time;if(item.data.magSize)item.mag--;item.kick=.06;unlockSfx();playSfx(item.data.kind==='spell'?'laser':'gun');
  if(typeof item.holder==='number')mira.hands.haptics?.contact(item.holder,'prop',1,.01);return true;
 }
 restores.push(wrapMethod(props,'fire',old=>function(item,aim){if(cast(item,aim))return true;return old.apply(this,arguments);}));
 function spawn(id,{equip=true,hand='right'}={}){
  if(!WEAPONS[id])return null;let item=equip?props.items.find(i=>i.id===id&&i.holder==null):null;
  if(!item){if(props.items.filter(i=>i.h5UserSpawn).length>=24){props.status='24 spawned items: clear unheld equipment to add more';return null;}item=props.make(id);if(!item){props.status='Spawn limit reached for this item';return null;}item.h5UserSpawn=true;props.items.push(item);}
  if(equip){const index=mira.hands.handedness.indexOf(hand);props.hold(item,renderer.xr.isPresenting?(index>=0?index:1):'desktop');}
  else{const p=camera.getWorldPosition(V()),d=camera.getWorldDirection(V()).setY(0).normalize();p.addScaledVector(d,1.0);const before=p.clone();world.project(p,.2,-.4,.5);if(p.distanceTo(before)>.7)p.copy(camera.getWorldPosition(V()));item.group.position.copy(p).add(new T.Vector3(0,-.25,0));item.velocity.setScalar(0);props.status='Spawned '+item.data.name;}
  return item;
 }
 function clearLoose(){let n=0;for(const item of [...props.items])if(item.h5UserSpawn&&item.holder==null){disposeTree(item.group);props.items.splice(props.items.indexOf(item),1);n++;}props.status='Cleared '+n+' unheld spawned items';return n;}
 function makeUI(){const root=document.getElementById('ui');if(!root||ui)return;ui=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Weapons, tools & spells';ui.append(summary);const choices=document.createElement('select');choices.setAttribute('aria-label','Equipment');for(const [id,w]of Object.entries(WEAPONS))choices.add(new Option(w.name,id));ui.append(choices);
  for(const [label,fn]of [['EQUIP',()=>spawn(choices.value)],['SPAWN IN FRONT',()=>spawn(choices.value,{equip:false})],['CLEAR UNHELD SPAWNS',clearLoose],['CLEAR PORTALS',()=>props.gadgets?.clearPortals()]]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;ui.append(b);}const note=document.createElement('p');note.textContent='Scope: holding-hand stick forward/back (2–12×); mouse wheel on desktop. Portals: alternate shots at broad walls.';ui.append(note);root.append(ui);
 }
 const api={scope,spawn,clearLoose,cast,freeze,projectiles,clouds,jobs,
  consumesStick(hand){for(const [key,item]of props.held)if(typeof key==='number'&&mira.hands.handedness[key]===hand&&['sniper','fishingRod'].includes(item.id))return true;return false;},
  tick(dt){dt=Math.min(.05,Math.max(0,dt));makeUI();if(lastRevision!==world.revision){clear();lastRevision=world.revision;}cloudTime.value+=dt;
   for(const [a,s]of frozen){s.remaining-=dt;if(s.remaining<=0||!mira.actors.includes(a)&&!(props.dogs?.list?.()||[]).includes(a)){s.restore();delete a.h5Frozen;frozen.delete(a);}}
   for(let i=0,n=Math.min(6,jobs.length);i<n;i++){const j=jobs.shift(),h=j.hit;if(!h.object.parent||!canReach(j.origin,h.point,h.root))continue;const dir=h.point.clone().sub(j.origin).normalize(),energy=j.spec.energy*Math.pow(1-h.d/j.spec.blast,1.4);props.impact(h,energy,dir,'blunt',0);if(j.type!=='rocket')props.flames?.ignite(h,true);const f=furnitureRoot(h.object)?.userData.furniture;if(f?.velocity)f.velocity.addScaledVector(dir,Math.min(4,energy/Math.max(5,f.mass)));}
   for(const p of projectiles){if(!p.live)continue;const spec=PROJECTILES[p.type];p.age+=dt;let remaining=dt;
    while(remaining>0&&p.live){const h=Math.min(remaining,1/90);remaining-=h;const old=p.mesh.position.clone();p.vel.y-=(world.gravity??9.81)*spec.gravity*h;const next=old.clone().addScaledVector(p.vel,h),mapped=props.gadgets?.tryCross(next,old,p.vel,p.mesh);if(mapped){p.mesh.position.copy(mapped.pos);continue;}const distance=old.distanceTo(next);const hit=props.hit(new T.Ray(old,p.vel.clone().normalize()),distance+spec.radius,false,{ignoreActor:p.owner?.version==='v2'?p.owner:null});
     if(hit&&!props.gadgets?.coversPortal(hit.point)){explode(p,hit);break;}p.mesh.position.copy(next);
    }
    const wet=world.h5OpenWorld?.sampleWater(p.mesh.position.x,p.mesh.position.z);if(p.live&&wet&&p.mesh.position.y<wet.height&&p.type==='fireball'){p.live=false;p.mesh.visible=false;}
    if(p.live&&p.age>spec.life){p.live=false;p.mesh.visible=false;}
   }
   for(const c of clouds){c.age+=dt;if(c.age>=c.life){c.mesh.count=0;continue;}const u=c.age/c.life;
    if(c.point.distanceToSquared(camera.getWorldPosition(V()))>450*450){c.mesh.count=0;continue;}
    c.mesh.count=c.nuclear?64:14;const growth=1-Math.exp(-c.age*(c.nuclear?.7:4));
    for(let i=0;i<c.mesh.count;i++){const a=i*2.399963+(c.nuclear?c.age*.055:0),cap=i>=20;
     if(c.nuclear){const radius=cap?Math.sqrt((i-19)/44)*15*growth:1.4+Math.sin(i)*.45;const y=cap?23*growth+(i%4-1.5)*1.8:((i+.5)/20)*22*growth;dummy.position.set(Math.sin(a)*radius,y,Math.cos(a)*radius);dummy.scale.setScalar(cap?(3.4+Math.sin(i)*.55)*growth:(1.4+(i/20)*1.4)*growth);}
     else{dummy.position.set(Math.sin(a)*growth*1.5,(i%4)*.35+c.age*.7,Math.cos(a)*growth*1.5);dummy.scale.setScalar((.4+growth*.9)*(1-u));}
     dummy.position.add(c.point);dummy.rotation.set(i*.21,i*.53,c.age*.05);dummy.updateMatrix();c.mesh.setMatrixAt(i,dummy.matrix);
     const hot=Math.max(0,1-c.age/(c.nuclear?3:1));cloudColor.setRGB(.27+hot*.73,.26+hot*.20,.24-hot*.12);c.mesh.setColorAt(i,cloudColor);
    }c.mesh.instanceMatrix.needsUpdate=true;c.mesh.instanceColor.needsUpdate=true;
   }
  },
  snapshot(){return {projectiles:projectiles.filter(p=>p.live).length,clouds:clouds.filter(c=>c.age<c.life).length,queuedImpacts:jobs.length,scopeZoom:scope.zoom,scopeRenders:scope.renderCount,frozen:frozen.size,userItems:props.items.filter(i=>i.h5UserSpawn).length};},
  dispose(){clear();restores.reverse().forEach(f=>f());scope.dispose();for(const p of projectiles)disposeTree(p.mesh);for(const c of clouds)c.mesh.removeFromParent();cloudGeometry.dispose();cloudMaterial.dispose();ui?.remove();delete props.h5Equipment;delete world.h5Equipment;}
 };world.h5Equipment=props.h5Equipment=api;return api;
}
