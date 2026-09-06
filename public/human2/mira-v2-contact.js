import * as T from 'three';
const V=()=>new T.Vector3(),clamp=T.MathUtils.clamp;
const limb=n=>/^([LR])_(Upperarm|Forearm|Elbow|Hand|Thumb|Index|Mid|Ring|Pinky)/.test(n)?n[0]+'Arm':/^([LR])_(Thigh|Calf|Knee|Foot|Toe)/.test(n)?n[0]+'Leg':/Head|Eye|Jaw|Neck/.test(n)?'head':'torso';
const kind=n=>/Breast/i.test(n)?'breast':/Butt|Glute/i.test(n)?'glute':/Thigh/.test(n)?'thigh':/Head|Neck/.test(n)?'head':/Hip/.test(n)?'hip':/Waist/.test(n)?'belly':'chest';
// Narrow-phase contact uses the current skinned/morphed triangles, grouped by
// bone for broad-phase culling. GPU-only micro-normal detail is not geometry.
export class BodySurface {
 constructor(actor){
  this.actor=actor;this.frame=0;this.groups=[];this.stores=new Map();actor.group.updateMatrixWorld(true);
  actor.root.traverse(mesh=>{
   if(!mesh.isSkinnedMesh||!/^body/.test(mesh.name))return;
   const g=mesh.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
   let cache=this.stores.get(p);if(!cache){cache={mesh,data:new Float32Array(p.count*3),stamp:new Int32Array(p.count)};this.stores.set(p,cache);}
   const byBone=new Map();for(let i=0;i<g.index.count;i+=3){const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)],scores=new Map();for(const id of ids)for(let j=0;j<4;j++){const bi=si.array[id*4+j];scores.set(bi,(scores.get(bi)||0)+sw.array[id*4+j]);}const bi=[...scores].sort((a,b)=>b[1]-a[1])[0][0];if(!byBone.has(bi))byBone.set(bi,[]);byBone.get(bi).push(ids);}
   for(const [bi,tris] of byBone){const bone=mesh.skeleton.bones[bi];for(let k=0;k<tris.length;k+=96){const chunk=tris.slice(k,k+96),box=new T.Box3();for(const ids of chunk)for(const id of ids)box.expandByPoint(bone.worldToLocal(mesh.getVertexPosition(id,V()).applyMatrix4(mesh.matrixWorld)));const sphere=box.getBoundingSphere(new T.Sphere());this.groups.push({bone,region:limb(bone.name),tris:chunk,cache,sphere,worldSphere:new T.Sphere()});}}
  });
 }
 begin(){this.frame++;this.actor.group.updateMatrixWorld(true);this.actor.root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});this.bounds();}
 bounds(region=''){for(const g of this.groups)if(!region||g.region===region){g.worldSphere.copy(g.sphere).applyMatrix4(g.bone.matrixWorld);g.worldSphere.radius+=.10*this.actor.shape.height;}}
 refresh(region){this.actor.root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});for(const g of this.groups)if(g.region===region)for(const ids of g.tris)for(const i of ids)g.cache.stamp[i]=-1;this.bounds(region);}
 vertex(cache,i,out){if(cache.stamp[i]!==this.frame){const m=cache.mesh,g=m.geometry;m.getVertexPosition(i,out).applyMatrix4(m.matrixWorld);const a=g.attributes.v2FleshA,b=g.attributes.v2FleshB,off=this.actor.surfaceFlesh?.offsets;if(off&&a&&b){for(let j=0;j<3;j++)out.addScaledVector(off[j],a.array[i*3+j]);for(let j=0;j<2;j++)out.addScaledVector(off[j+3],b.array[i*2+j]);}out.toArray(cache.data,i*3);cache.stamp[i]=this.frame;}return out.fromArray(cache.data,i*3);}
 project(point,r,exclude='',react=false){
  let best=null,dist=Infinity;const tri=new T.Triangle(),closest=V(),sphere=new T.Sphere();
  for(const g of this.groups){if(exclude&&g.region===exclude)continue;sphere.copy(g.worldSphere);if(sphere.center.distanceTo(point)>sphere.radius+r)continue;
   for(const ids of g.tris){this.vertex(g.cache,ids[0],tri.a);this.vertex(g.cache,ids[1],tri.b);this.vertex(g.cache,ids[2],tri.c);tri.closestPointToPoint(point,closest);const d=point.distanceToSquared(closest);if(d<dist){dist=d;best={point:closest.clone(),normal:tri.getNormal(V()),bone:g.bone,cache:g.cache,ids,bary:tri.getBarycoord(closest,V())};}}
  }
  this.lastClosest=best;if(!best)return false;dist=Math.sqrt(dist);const signed=point.clone().sub(best.point).dot(best.normal);if(dist>=r&&(signed>=0||dist>.18*this.actor.shape.height))return false;
  const normal=signed<0?best.normal:point.clone().sub(best.point).normalize();if(normal.lengthSq()<.1)normal.copy(best.normal);
  const depth=signed<0?r+dist:r-dist;point.addScaledVector(normal,Math.min(.20,depth+.001));
  if(react){const hit={name:best.bone.name,kind:kind(best.bone.name)};this.actor.contactSoft(hit,normal,Math.min(.02,depth),Math.min(.3,depth*3));this.actor.surfaceFlesh?.contact(hit,normal,0,Math.min(depth,.02));}
  return {depth,normal};
 }
}
export class BodyContacts {
 constructor(actors){this.actors=actors;this.surfaces=new WeakMap();this.stats={contacts:0};}
 surface(a){let s=this.surfaces.get(a);if(!s){s=new BodySurface(a);this.surfaces.set(a,s);}return s;}
 project(a,p,r,exclude,react=true){let moved=false;for(const b of this.actors){if(b.version!=='v2'||b.group.position.distanceTo(a.group.position)>1.6)continue;const c=this.surface(b).project(p,r,b===a?exclude:'',react);if(c){this.stats.contacts++;moved=true;}}return moved;}
 tick(){
  const list=this.actors.filter(a=>a.version==='v2');list.forEach(a=>this.surface(a).begin());this.stats.contacts=0;
  for(const a of list){const h=a.shape.height;
   for(let pass=0;pass<(a.socialPair?2:1);pass++)for(const side of ['L','R']){
    const hand=a.bones[side+'_Hand'],elbow=a.bones[side+'_Forearm'];if(!hand||!elbow)continue;
    const wrist=hand.getWorldPosition(V()),pole=elbow.getWorldPosition(V()),shift=V();let touch=false;
    const samples=[{p:wrist.clone(),r:.029*h},{p:wrist.clone().lerp(pole,.45),r:.033*h}];
    const finger=a.bones[side+'_Mid3'],thumb=a.bones[side+'_Thumb3'];if(finger)samples.push({p:finger.getWorldPosition(V()),r:.028*h});if(thumb)samples.push({p:thumb.getWorldPosition(V()),r:.014*h});
    for(const s of samples){const p=s.p.clone();if(this.project(a,p,s.r,side+'Arm')){const d=p.sub(s.p);if(d.lengthSq()>shift.lengthSq())shift.copy(d);touch=true;}}
    const oldPole=pole.clone();if(this.project(a,pole,.038*h,side+'Arm'))touch=true;
    if(touch){wrist.add(shift);if(shift.lengthSq()<1e-9)wrist.add(pole.clone().sub(oldPole).multiplyScalar(.6));a.solveChain(side,'arm',wrist,pole);a.group.updateMatrixWorld(true);a.handTargets[side]=hand.getWorldPosition(V());this.surface(a).refresh(side+'Arm');}
   }
   const head=a.bones.Head,neck=a.bones.NeckTwist01;if(head&&neck){const center=head.getWorldPosition(V()).add(new T.Vector3(0,.063*h,.015*h).applyQuaternion(a.group.getWorldQuaternion(new T.Quaternion()))),p=center.clone();if(this.project(a,p,.075*h,'head')){const before=neck.quaternion.clone(),target=head.getWorldPosition(V()).add(p.sub(center));a.aimBone(neck,head,target);const solved=neck.quaternion.clone();neck.quaternion.copy(before).rotateTowards(solved,.22);a.group.updateMatrixWorld(true);this.surface(a).refresh('head');}}
  }
 }
}
// Low-cost moving volumes for cloth. Main surfaces have no hidden body masks.
export function bodyVolumes(a){
 const h=a.shape.height,wp=n=>a.bones[n]?.getWorldPosition(V()),out=[];
 const add=(x,y,r)=>{const p=wp(x),q=wp(y);if(p&&q)out.push({a:p,b:q,r:r*h});};
 add('Hip','Waist',.14*Math.sqrt(a.shape.hips));add('Waist','Spine02',.12);add('NeckTwist01','Head',.065);
 for(const s of ['L','R']){add(s+'_Upperarm',s+'_Forearm',.048);add(s+'_Forearm',s+'_Hand',.035);add(s+'_Thigh',s+'_Calf',.086*Math.sqrt(a.shape.thigh));add(s+'_Calf',s+'_Foot',.05);}
 for(const s of a.soft||[]){const p=wp(s.name);if(p)out.push({a:p,b:p.clone(),r:(s.kind==='breast'?.07:.09)*h*Math.cbrt(s.kind==='breast'?a.shape.breast:a.shape.butt)});}
 return out;
}
export function projectVolume(p,r,c){const ab=c.b.clone().sub(c.a),u=clamp(p.clone().sub(c.a).dot(ab)/Math.max(1e-9,ab.lengthSq()),0,1),q=c.a.clone().addScaledVector(ab,u),d=p.clone().sub(q),n=d.length(),radius=r+c.r;if(n>=radius)return false;if(n<1e-7)d.set(0,0,1);else d.divideScalar(n);p.copy(q).addScaledVector(d,radius);return true;}
