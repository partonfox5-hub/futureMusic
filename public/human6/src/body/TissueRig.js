import * as T from 'three';
import {XPBDCluster,BOX_CORNERS,dampingRate,signedVolume} from './XPBDCluster.js';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),clamp=T.MathUtils.clamp;
export class TissueRig {
 constructor(actor,shapePoint){this.actor=actor;this.shapePoint=shapePoint;this.clusters=[];this.accumulator=0;this.shapeKey='';this.ready=false;this.stats={particles:32,substeps:0,maxVolumeError:0,recoveries:0};}
 key(){const a=this.actor,s=a.shape;return [s.height,s.breast,s.butt,s.breastHeight,s.breastSpacing,s.breastAngle,s.buttHeight,s.buttSpacing,s.buttAngle,s.softness,s.waist,s.hips,s.thigh,s.gap,a.bodyType].join('/');}
 rebuild(){
  const a=this.actor,s=a.shape;this.clusters=[];a.group.updateMatrixWorld(true);
  for(const soft of a.soft){const bone=a.bones[soft.name];if(!bone)continue;const breast=soft.kind==='breast',sign=soft.name.startsWith('L_')?1:-1,center=[sign*(breast?.078:.080),breast?1.207:.85,breast?.073:-.077],r=breast?[.042,.038,.026]:[.055,.052,.033];
   const parentIndex=a.skeleton.bones.indexOf(bone.parent),inverseBind=a.skeleton.boneInverses[parentIndex];if(!inverseBind)throw new Error('Missing tissue parent inverse bind: '+soft.name);
   const restLocal=new Float64Array(24),restWorld=new Float64Array(24);
   for(let i=0;i<8;i++){const corner=BOX_CORNERS[i],p=center.map((n,j)=>n+corner[j]*r[j]),sculpt=this.shapePoint(...p,s.breast,0,s.butt,s.arms,{...s,male:a.bodyType==='male'}),v=V().fromArray(sculpt).applyMatrix4(inverseBind);v.toArray(restLocal,i*3);v.applyMatrix4(bone.parent.matrixWorld).toArray(restWorld,i*3);}
   const cluster=new XPBDCluster(restWorld,{pins:breast?[0,1,2,3]:[4,5,6,7]});
   this.clusters.push({soft,bone,cluster,restLocal,frame:bone.parent.matrixWorld.clone(),lastAnchor:V().setFromMatrixPosition(bone.parent.matrixWorld),contacts:[]});
  }
  this.shapeKey=this.key();this.ready=true;this.accumulator=0;this.stats.particles=this.clusters.length*8;
 }
 targets(c){const v=V();for(let i=0;i<24;i+=3)v.fromArray(c.restLocal,i).applyMatrix4(c.bone.parent.matrixWorld).toArray(c.cluster.target,i);}
 collectContacts(c){
  const a=this.actor,contacts=[],center=V().fromArray(c.cluster.centroid([],c.cluster.target)),s=c.soft;
  for(const hand of a.externalHands||[]){if(!hand.a||!hand.b||!Number.isFinite(hand.r))continue;if(center.distanceTo(hand.a)>hand.r+.35&&center.distanceTo(hand.b)>hand.r+.35)continue;contacts.push({type:'capsule',a:hand.a.toArray(),b:hand.b.toArray(),r:hand.r+.008});}
  if(s.press?.lengthSq()>1e-10){const n=s.press.clone().applyQuaternion(c.bone.parent.getWorldQuaternion(Q())),depth=Math.min(.014*a.shape.height,n.length());n.normalize();let support=Infinity;for(let i=0;i<24;i+=3)support=Math.min(support,n.x*c.cluster.target[i]+n.y*c.cluster.target[i+1]+n.z*c.cluster.target[i+2]);contacts.push({type:'plane',n:n.toArray(),offset:support+depth});}
  if(a.seat&&s.kind==='glute'){
   const seat=a.seat,ob=seat.obstacle,p=seat.position;
   contacts.push({type:'plane',n:[0,1,0],offset:p.y+.006,bounds:{x:p.x,z:p.z,rx:ob?.w/2||.38,rz:ob?.d/2||.35}});
  }
  const pair=a.socialPair;if(pair?.stage==='embrace'&&pair.kind==='hug'){
   const other=a===pair.a?pair.b:pair.a;
   if(other?.bones.Hip&&other.bones.Spine02)contacts.push({type:'capsule',a:other.bones.Hip.getWorldPosition(V()).toArray(),b:other.bones.Spine02.getWorldPosition(V()).toArray(),r:(.12+.025*Math.cbrt(other.shape.hips))*other.shape.height});
  }
  return contacts;
 }
 tick(dt){
  const a=this.actor;if(a.inBaseTick||!(dt>0))return;if(!this.ready||this.key()!==this.shapeKey)this.rebuild();dt=Math.min(.05,dt);a.group.updateMatrixWorld(true);
  for(const c of this.clusters){this.targets(c);const anchor=V().setFromMatrixPosition(c.bone.parent.matrixWorld);if(anchor.distanceTo(c.lastAnchor)>.30)c.cluster.reset();c.lastAnchor.copy(anchor);c.frame.copy(c.bone.parent.matrixWorld);c.soft.pressT-=dt;if(c.soft.pressT<=0)c.soft.press.multiplyScalar(Math.exp(-20*dt));c.contacts=this.collectContacts(c);}
  this.accumulator=Math.min(.05,this.accumulator+dt);const h=1/120;this.stats.substeps=0;
  while(this.accumulator+1e-10>=h){
   for(const c of this.clusters){let grab=null;const held=[...a.grabs.values()].find(g=>g.spring===c.soft);if(held){const target=V().set(held.tx||0,held.ty||0,held.tz||0).applyQuaternion(c.bone.parent.getWorldQuaternion(Q())).add(V().fromArray(c.cluster.centroid([],c.cluster.target)));grab=target.toArray();}
    const amount=clamp(a.jiggleAmt()/2.8,0,2);c.cluster.step(h,{softness:clamp((a.shape.softness??.62)*(.55+.45*amount),0,1),damping:a.shape.damping,gravity:Number.isFinite(a.world?.gravity)?a.world.gravity:9.81,contacts:c.contacts,grab});
   }
   this.accumulator-=h;this.stats.substeps++;
  }
  this.writeBones();
 }
 writeBones(){
  const a=this.actor;
  for(const c of this.clusters){const {cluster,bone,soft:s}=c,delta=V().fromArray(cluster.centroid()).sub(V().fromArray(cluster.centroid([],cluster.target))),q=bone.parent.getWorldQuaternion(Q()),inv=q.clone().invert(),local=delta.clone().applyQuaternion(inv),previous=V().set(s.x,s.y,s.z);
   const maxOff=.09*Math.max(.7,a.shape.height||1);if(local.length()>maxOff)local.setLength(maxOff);
   s.x=local.x;s.y=local.y;s.z=local.z;s.vx=(s.x-previous.x)*120;s.vy=(s.y-previous.y)*120;s.vz=(s.z-previous.z)*120;a.limitSoft(s);
   // Retain the supplied weighted-triangle guard. Move the entire simulated
   // cage by the clamped centroid correction; translation preserves its volume.
   const correction=V().set(s.x,s.y,s.z).sub(local).applyQuaternion(q);
   if(correction.lengthSq()>1e-12)for(let i=0;i<24;i+=3){cluster.p[i]+=correction.x;cluster.p[i+1]+=correction.y;cluster.p[i+2]+=correction.z;}
   const scale=bone.parent.getWorldScale(V());bone.position.copy(a.bindPos[s.name]);bone.position.x+=s.x/Math.max(.01,Math.abs(scale.x));bone.position.y+=s.y/Math.max(.01,Math.abs(scale.y));bone.position.z+=s.z/Math.max(.01,Math.abs(scale.z));
   const bind=a.bindPos[s.name],off=V().subVectors(bone.position,bind);if(off.length()>maxOff)bone.position.copy(bind).addScaledVector(off.normalize(),maxOff);
   this.stats.maxVolumeError=Math.max(this.stats.maxVolumeError,Math.abs(signedVolume(cluster.p)/cluster.restVolume-1));
  }
  this.stats.recoveries=this.clusters.reduce((n,c)=>n+c.cluster.recoveries,0);
 }
 afterSeatPose(){
  if(!this.ready)return;const a=this.actor;a.group.updateMatrixWorld(true);
  // The host seats actors AFTER their normal tick. Follow that final kinematic
  // pose, then project the seat once here; do not advance simulation time twice.
  for(const c of this.clusters){const transform=c.bone.parent.matrixWorld.clone().multiply(c.frame.clone().invert()),v=V(),rot=Q().setFromRotationMatrix(transform.clone().extractRotation(transform));
   for(let i=0;i<24;i+=3){v.fromArray(c.cluster.p,i).applyMatrix4(transform).toArray(c.cluster.p,i);v.fromArray(c.cluster.v,i).applyQuaternion(rot).toArray(c.cluster.v,i);}
   this.targets(c);c.frame.copy(c.bone.parent.matrixWorld);c.lastAnchor.setFromMatrixPosition(c.frame);c.contacts=this.collectContacts(c);c.cluster.volumeLambda=0;for(let i=0;i<6;i++){c.cluster.solveVolume(0);for(const contact of c.contacts)c.cluster.projectContact(contact);}
  }
  this.writeBones();a.group.updateMatrixWorld(true);
 }
 reset(){this.ready=false;this.accumulator=0;this.stats.maxVolumeError=0;}
}
// Keep the existing five SurfaceFlesh guides. Only separate drag from stiffness;
// no extra spring, Hip/root oscillator, mesh or shader pass is introduced.
export function installSurfaceDamping(surface){
 if(!surface)return()=>{};const original=surface.tick;
 surface.tick=function(dt){
  if(!(dt>0))return;dt=Math.min(.05,dt);const a=this.actor,shape=a.shape,h=1/120;
  for(const g of this.guides){const pos=a.bones[g.name].getWorldPosition(V()),vel=pos.clone().sub(g.last).divideScalar(dt);if(!g.ready||pos.distanceTo(g.last)>.3){g.a.set(0,0,0);g.lastV.copy(vel);g.ready=true;}else{g.a.copy(vel).sub(g.lastV).divideScalar(dt).clampLength(0,25);g.lastV.copy(vel);}g.last.copy(pos);}
  this.acc=Math.min(.05,this.acc+dt);
  while(this.acc+1e-10>=h){for(let i=0;i<5;i++){const g=this.guides[i],face=i>=3,soft=face?shape.faceSoftness:shape.bodySoftness,held=[...a.grabs.values()].some(gr=>face?gr.head:i===0?!gr.limb:gr.limb==='leg'&&gr.side===(i===1?'L':'R')),omega=2*Math.PI*(face?6.5:4.2)/(1+.65*soft),k=omega*omega,drag=dampingRate(shape.damping)+(held?18:0),gain=held?0:soft*a.jiggleAmt()*(face?.09:.28);
   for(const axis of ['x','y','z']){g.v[axis]=(g.v[axis]+h*(-g.a[axis]*gain-k*g.p[axis]))/(1+drag*h+k*h*h);g.p[axis]+=h*g.v[axis];}const max=shape.height*soft*(face?.009:.013);if(g.p.length()>max){g.p.setLength(max);g.v.multiplyScalar(.4);}}
   this.acc-=h;
  }
  this.guides.forEach((g,i)=>this.offsets[i].copy(g.p));
 };return()=>{surface.tick=original;};
}
