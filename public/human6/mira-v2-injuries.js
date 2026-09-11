import * as T from 'three';
const V=()=>new T.Vector3();
const isDog=a=>a&&(['dog','cat'].includes(a.version)||['dog','cat'].includes(a.kind));
const region=(n,dog=false)=>{
 if(dog){
  if(/Head|Jaw|Neck/.test(n))return 'head';
  if(/^L_(Shoulder|UpperArm|ForeArm|Paw)/.test(n))return 'LArm';
  if(/^R_(Shoulder|UpperArm|ForeArm|Paw)/.test(n))return 'RArm';
  if(/^L_(Hip|Thigh|Calf|Foot)/.test(n))return 'LLeg';
  if(/^R_(Hip|Thigh|Calf|Foot)/.test(n))return 'RLeg';
  return 'torso';
 }
 return /^([LR])_(Upperarm|Forearm|Elbow|Hand|Thumb|Index|Mid|Ring|Pinky)/.test(n)?n[0]+'Arm':/^([LR])_(Thigh|Calf|Knee|Foot|Toe)/.test(n)?n[0]+'Leg':/Head|Eye|Jaw|Neck|Teeth|Tongue/.test(n)?'head':'torso';
};
const HEAD_BONES=['Head','NeckTwist01','NeckTwist02','JawRoot','L_Eye','R_Eye'];
const DOG_HEAD=['Head','Neck','Jaw'];
export class Injuries {
 constructor(props){this.props=props;this.enabled=true;this.allowSever=true;this.states=new Map();this.detached=[];}
 state(a){if(!this.states.has(a)){const state={damage:{},fractures:new Set(),missing:new Set(),original:new Map(),hidden:new Map(),caps:[]};this.states.set(a,state);a.injuryDriver=this;}return this.states.get(a);}
 fatal(s){return s.missing.has('head')||(s.missing.has('LLeg')&&s.missing.has('RLeg'))||(s.damage.torso||0)>160||(s.damage.head||0)>140;}
 liveDog(a){return isDog(a)&&!!(this.props.dogs?.list?.().includes(a)||a.root?.parent);}
 impact(actor,hit,energy,kind,dir,weaponId){
  if(!this.enabled)return null;
  const dog=isDog(actor);
  if(!dog&&actor.version!=='v2')return null;
  const nearest=actor.nearestHit(hit.point,dog?.32:.25);if(!nearest)return null;
  const s=this.state(actor),r=region(nearest.name,dog),damage=energy*(kind==='laser'?.60:kind==='bullet'?1.2:kind==='cut'?1.15:1);
  s.damage[r]=(s.damage[r]||0)+damage;
  const stagger=hit.stagger??(weaponId==='rifle'?.5:weaponId==='sniper'?1.8:weaponId==='shotgun'?1.35:1);
  actor.applyStrike?.(nearest,dir.clone().negate(),Math.min(4.8,Math.sqrt(energy)*.4*stagger),0,hit.point);
  if(dog){actor.bark?.();if(actor._ai){actor._ai.hurt=true;actor._ai.state='alert';}}
  else if(!actor.dead)actor.setEmotion('concerned',.65,{source:'impact',hold:5});
  if(s.damage[r]>80&&r!=='torso'&&r!=='head')s.fractures.add(r);
  if(this.allowSever&&kind==='cut'&&r!=='torso'&&!s.missing.has(r)){
   const need=r==='head'?(dog?40:48):(dog?30:36);
   if(s.damage[r]>=need&&energy>=(dog?6:8))this.sever(actor,r,dir);
  }
  if(this.fatal(s))actor.die?.();
  return {region:r,fractured:s.fractures.has(r),severed:s.missing.has(r)};
 }
 pose(a){
  const s=this.states.get(a);if(!s)return;
  if(isDog(a))return this.poseDog(a,s);
  if(this.fatal(s))a.die?.();
  if(s.missing.has('head')||[...s.fractures,...s.missing].some(r=>r.endsWith('Leg'))){
   a.autonomy=false;a.dest=null;a.navigation=null;a.autoWander=false;
   if(a.balance.state==='standing')a.knockDown(new T.Vector3(0,0,-1));
   if(a.balance.state==='down'||a.balance.state==='loose'||a.balance.state==='recovering'){a.balance.state='loose';a.balance.time=0;}
  }
  if(s.missing.has('head')){
   a.headMissing=true;
   for(const name of HEAD_BONES){const bone=a.bones[name];if(bone&&a.bindQ[name])bone.quaternion.copy(a.bindQ[name]);}
  }
  for(const r of s.fractures){if(!r.endsWith('Arm')||s.missing.has(r))continue;const side=r[0],sign=side==='L'?1:-1,target=a.group.localToWorld(new T.Vector3(sign*.10,1.04,.17).multiplyScalar(a.shape.height)),pole=a.group.localToWorld(new T.Vector3(sign*.32,1.02,.02).multiplyScalar(a.shape.height));a.solveChain(side,'arm',target,pole);}
  for(const m of s.hidden.keys())m.visible=false;
 }
 poseDog(a,s){
  if(this.fatal(s))a.die?.();
  if(a._ai){
   if(s.missing.has('head')||(s.missing.has('LLeg')&&s.missing.has('RLeg')))a._ai.dead=true;
   else if([...s.fractures,...s.missing].some(r=>r.endsWith('Leg')||r.endsWith('Arm')))a._ai.hurt=true;
  }
  for(const m of s.hidden.keys())m.visible=false;
 }
 sever(a,r,dir){
  if(isDog(a))return this.severDog(a,r,dir);
  const s=this.state(a);s.missing.add(r);s.fractures.delete(r);a.endGrab();a.socialPair?.cancel();a.group.updateMatrixWorld(true);
  const baseName=r==='head'?'NeckTwist01':r[0]+(r.endsWith('Arm')?'_Upperarm':'_Thigh'),bone=a.bones[baseName],origin=bone.getWorldPosition(V()),group=new T.Group();
  group.position.copy(origin);this.props.scene.add(group);
  this.splitSkinned(a.root,s,r,false,origin,group);
  const capMat=new T.MeshStandardMaterial({color:0x111111,roughness:.96,metalness:0});
  const cap=new T.Mesh(new T.SphereGeometry(r==='head'?.048:.045,12,8),capMat);cap.scale.y=.28;bone.add(cap);s.caps.push(cap);
  const endCap=cap.clone();endCap.geometry=cap.geometry.clone();endCap.material=capMat.clone();group.add(endCap);
  this.detached.push({actor:a,group,velocity:dir.clone().multiplyScalar(1.5).add(new T.Vector3(0,.6,0)),spin:new T.Vector3(1,2,.8),age:0});
  this.props.system.contacts.surfaces.delete(a);
  for(const c of this.props.wardrobe.clothes)if(c.actor===a)c.shapeStamp='refit';
  if(r==='head')a.headMissing=true;
  a.knockDown(dir);
  if(this.fatal(s))a.die?.();
 }
 severDog(a,r,dir){
  const s=this.state(a);s.missing.add(r);s.fractures.delete(r);a.endGrab?.();
  const bones=a.bones||a._model?.bones;if(!bones)return;
  a.root.updateMatrixWorld(true);
  const baseName=r==='head'?'Neck':r.endsWith('Arm')?r[0]+'_Shoulder':r[0]+'_Hip',bone=bones[baseName];if(!bone)return;
  const origin=bone.getWorldPosition(V()),group=new T.Group();
  group.position.copy(origin);this.props.scene.add(group);
  this.splitSkinned(a.root,s,r,true,origin,group);
  if(r==='head')for(const name of DOG_HEAD){const b=bones[name];if(b)b.scale.setScalar(0.001);}
  const capMat=new T.MeshStandardMaterial({color:0x1a0a0a,roughness:.96,metalness:0});
  const cap=new T.Mesh(new T.SphereGeometry(r==='head'?.04:.032,10,8),capMat);cap.scale.y=.32;bone.add(cap);s.caps.push(cap);
  const endCap=cap.clone();endCap.geometry=cap.geometry.clone();endCap.material=capMat.clone();group.add(endCap);
  this.detached.push({actor:a,group,velocity:dir.clone().multiplyScalar(1.35).add(new T.Vector3(0,.45,0)),spin:new T.Vector3(.8,1.6,.5),age:0});
  a.headMissing=r==='head';
  a.knockDown?.(dir);
  if(this.fatal(s))a.die?.();
 }
 splitSkinned(root,s,r,dog,origin,group){
  root.traverse(mesh=>{
   if(!mesh.isSkinnedMesh||!mesh.visible)return;const geom=mesh.geometry,si=geom.attributes.skinIndex,sw=geom.attributes.skinWeight;if(!si||!geom.index)return;
   const names=mesh.skeleton.bones.map(b=>b.name),selected=i=>{let weight=0;for(let j=0;j<4;j++)if(region(names[si.array[i*4+j]],dog)===r)weight+=sw.array[i*4+j];return weight>.48;},keep=[],take=[];
   const source=geom.index.array;for(let i=0;i<source.length;i+=3){const ids=[source[i],source[i+1],source[i+2]];(ids.filter(selected).length>=2?take:keep).push(...ids);}
   if(!take.length)return;
   if(!s.original.has(mesh))s.original.set(mesh,geom.index.clone());
   const g=geom.clone(),positions=new Float32Array(geom.attributes.position.count*3);mesh.skeleton.update();
   for(let i=0;i<positions.length/3;i++)mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld).sub(origin).toArray(positions,i*3);
   g.setAttribute('position',new T.BufferAttribute(positions,3));g.setIndex(take);g.morphAttributes={};g.clearGroups();
   for(const key of ['skinIndex','skinWeight','v2FleshA','v2FleshB'])g.deleteAttribute(key);
   g.computeVertexNormals();g.computeBoundingSphere();
   const src=mesh.material,mat=new T.MeshStandardMaterial({map:src.map,color:src.color,vertexColors:!!src.vertexColors,roughness:Math.max(.42,src.roughness||.6),normalMap:src.normalMap,normalScale:src.normalScale||new T.Vector2(.12,.12),alphaMap:src.alphaMap,alphaTest:src.alphaTest,side:T.DoubleSide});
   const piece=new T.Mesh(g,mat);group.add(piece);geom.setIndex(keep);geom.computeBoundingSphere();
   if(keep.length===0){s.hidden.set(mesh,mesh.visible);mesh.visible=false;}
  });
 }
 heal(actor){
  const s=this.states.get(actor);if(!s)return;
  for(const [m,index] of s.original){m.geometry.setIndex(index);m.geometry.computeBoundingSphere();}
  for(const [m,visible] of s.hidden)m.visible=visible;
  for(const m of s.caps){m.removeFromParent();m.geometry.dispose();m.material.dispose();}
  for(const d of this.detached.filter(d=>d.actor===actor))this.dispose(d.group);
  this.detached=this.detached.filter(d=>d.actor!==actor);
  for(const m of this.props.marks.filter(m=>m.actor===actor))this.props.dispose(m.mesh);
  this.props.marks=this.props.marks.filter(m=>m.mesh.parent);
  this.states.delete(actor);delete actor.injuryDriver;actor.headMissing=false;actor.dead=false;
  if(isDog(actor)){
   const bones=actor.bones||actor._model?.bones;
   if(bones)for(const name of DOG_HEAD)if(bones[name])bones[name].scale.setScalar(1);
   if(actor._ai){actor._ai.dead=false;actor._ai.hurt=false;actor._ai.state='idle';}
   actor.root.rotation.z=0;
   return;
  }
  this.props.system.contacts.surfaces.delete(actor);
  actor.balance.state='recovering';actor.balance.time=0;actor.balance.recoverFrom=actor.balance.tilt;
 }
 clearBodies(){
  for(const d of [...this.detached])this.dispose(d.group);
  this.detached=[];
  const system=this.props.system,dead=system.actors.filter(a=>a.dead||this.states.get(a)?.missing.size);
  for(const a of dead){
   for(const m of this.props.marks.filter(m=>m.actor===a))this.props.dispose(m.mesh);
   this.states.delete(a);delete a.injuryDriver;system.remove(a);
  }
  let dogs=0;
  for(const d of this.props.dogs?.list?.()||[]){
   if(!d._ai?.dead&&!this.states.get(d)?.missing.size)continue;
   for(const m of this.props.marks.filter(m=>m.actor===d))this.props.dispose(m.mesh);
   this.states.delete(d);this.props.dogs.despawn(d);dogs++;
  }
  this.props.marks=this.props.marks.filter(m=>m.mesh.parent);
  const n=dead.length+dogs;
  this.props.status=n?'Cleared '+n+' bod'+(n===1?'y':'ies'):'No bodies to clear';
  return this.props.status;
 }
 dispose(group){group.removeFromParent();group.traverse(m=>{m.geometry?.dispose();if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material])mat?.dispose();});}
 tick(dt){
  for(const d of this.detached){
   d.age+=dt;d.velocity.y-=9.81*dt;const old=d.group.position.clone();d.group.position.addScaledVector(d.velocity,dt);
   if(this.props.world.projectSphere(d.group.position,.10)){const n=d.group.position.clone().sub(old).normalize(),v=d.velocity.dot(n);if(v<0)d.velocity.addScaledVector(n,-1.2*v);}
   if(d.group.position.y<.12){d.group.position.y=.12;d.velocity.y=Math.abs(d.velocity.y)*.15;d.velocity.x*=.88;d.velocity.z*=.88;d.spin.multiplyScalar(.95);}
   d.group.rotateX(d.spin.x*dt);d.group.rotateY(d.spin.y*dt);
  }
  this.detached=this.detached.filter(d=>d.group.parent);
  for(const [a] of [...this.states]){
   if(isDog(a)){if(!this.liveDog(a))this.states.delete(a);else this.poseDog(a,this.states.get(a));}
   else if(!this.props.system.actors.includes(a))this.states.delete(a);
  }
 }
}
