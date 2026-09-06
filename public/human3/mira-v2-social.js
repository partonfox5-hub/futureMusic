import * as T from 'three';
const V=()=>new T.Vector3(),clamp=T.MathUtils.clamp,smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
function caps(actor){
 const h=actor.shape.height,b=actor.bones,wp=n=>b[n].getWorldPosition(V());
 return [{a:wp('Hip'),b:wp('Spine02'),r:h*(.12+.035*Math.max(0,actor.shape.hips-1))},{a:wp('Head').add(new T.Vector3(0,.065*h,0)),b:wp('Head').add(new T.Vector3(0,.065*h,0)),r:.09*h}];
}
// Closest points on two finite segments, including sphere/degenerate cases.
export function segmentContact(a,b){
 const d1=a.b.clone().sub(a.a),d2=b.b.clone().sub(b.a),r=a.a.clone().sub(b.a),aa=d1.lengthSq(),ee=d2.lengthSq(),f=d2.dot(r);let s=0,t=0;
 if(aa<1e-10)t=clamp(f/Math.max(ee,1e-10),0,1);
 else{const c=d1.dot(r);if(ee<1e-10)s=clamp(-c/aa,0,1);else{const q=d1.dot(d2),den=aa*ee-q*q;s=den>1e-10?clamp((q*f-c*ee)/den,0,1):0;t=(q*s+f)/ee;if(t<0){t=0;s=clamp(-c/aa,0,1);}else if(t>1){t=1;s=clamp((q-c)/aa,0,1);}}}
 const delta=a.a.clone().addScaledVector(d1,s).sub(b.a.clone().addScaledVector(d2,t)),distance=delta.length();return {delta,distance,depth:a.r+b.r-distance};
}
function projectTarget(point,actor){
 for(const c of caps(actor)){const ab=c.b.clone().sub(c.a),u=clamp(point.clone().sub(c.a).dot(ab)/Math.max(1e-10,ab.lengthSq()),0,1),center=c.a.clone().addScaledVector(ab,u),d=point.clone().sub(center),length=d.length(),radius=c.r+.029*actor.shape.height;if(length<radius){if(length<1e-6)d.set(1,0,0);else d.divideScalar(length);point.copy(center).addScaledVector(d,radius);}}
 return point;
}
export class MiraSocial {
 constructor(actors){this.actors=actors;this.pairs=new Set();this.cooldown=new WeakMap();this.clock=0;this.nextCheck=4;}
 eligible(a,manual=false){return a?.version==='v2'&&a.balance.state==='standing'&&!a.grabs.size&&!a.heldBall&&!a.speech?.active&&!a.directedWalk&&!a.socialPair&&(manual||a.autonomy)&&['idle','wander'].includes(a.mode);}
 request(a,kind='hug'){
  if(!this.eligible(a,true))return false;
  const list=this.actors.filter(b=>b!==a&&this.eligible(b,true)&&Math.abs(b.shape.height-a.shape.height)<.30&&b.group.position.distanceTo(a.group.position)<2.5).sort((x,y)=>x.group.position.distanceToSquared(a.group.position)-y.group.position.distanceToSquared(a.group.position));
  return !!list[0]&&this.start(a,list[0],kind);
 }
 start(a,b,kind='hug'){
  if(!this.eligible(a,true)||!this.eligible(b,true))return false;
  const mid=a.group.position.clone().add(b.group.position).multiplyScalar(.5).setY(0),axis=b.group.position.clone().sub(a.group.position).setY(0);if(axis.length()<.01)axis.set(1,0,0);axis.normalize();
  const h=(a.shape.height+b.shape.height)/2,gap=(kind==='hug'?.29+.10*(Math.cbrt(a.shape.breast)+Math.cbrt(b.shape.breast)-2):.34+.05*(a.shape.hips+b.shape.hips-2))*h;
  const p={a,b,kind,stage:'approach',t:0,weight:0,elapsed:0,slots:[mid.clone().addScaledVector(axis,-gap/2),mid.clone().addScaledVector(axis,gap/2)],saved:[a,b].map(x=>({autonomy:x.autonomy,idleChoice:x.idleChoice})),axis};
  p.cancel=()=>this.cancel(a);p.pose=actor=>this.pose(p,actor);this.pairs.add(p);
  for(const [i,x] of [a,b].entries()){x.navigation=null;x.socialPair=p;x.autonomy=false;x.mode='wander';x.modeT=0;x.autoWander=true;x.dest=p.slots[i].clone();x.miraWalk=3600;x.idleChoice='auto';x.idleKind='rest';x.lifeT=12;x.feet={};}
  return true;
 }
 cancel(actor){
  const p=actor?.socialPair;if(!p)return;this.pairs.delete(p);
  for(const [i,a] of [p.a,p.b].entries()){a.socialPair=null;a.dest=null;a.autoWander=false;a.mode='idle';a.modeT=0;a.speed=a.pathSpeed=0;a.autonomy=p.saved[i].autonomy;a.idleChoice=p.saved[i].idleChoice;a.idleT=0;a.lifeT=10+Math.random()*8;a.lookAtPos=null;this.cooldown.set(a,this.clock+22+Math.random()*18);}
 }
 tick(dt){
  this.clock+=dt;
  for(const p of [...this.pairs]){
   if(!this.actors.includes(p.a)||!this.actors.includes(p.b)||[p.a,p.b].some(a=>a.grabs.size||a.heldBall||a.balance.state!=='standing'||a.speech?.active||a.directedWalk)){this.cancel(p.a);continue;}
   p.elapsed+=dt;p.t+=dt;
   if(p.stage==='approach'){
    if(p.elapsed>18){this.cancel(p.a);continue;}
    for(const [i,a] of [p.a,p.b].entries()){const dist=a.group.position.clone().setY(0).distanceTo(p.slots[i]);if(dist>.025){a.dest=p.slots[i].clone();a.autoWander=true;}if(dist<.12){const k=1-Math.exp(-dt*3);a.group.position.x+=(p.slots[i].x-a.group.position.x)*k;a.group.position.z+=(p.slots[i].z-a.group.position.z)*k;}}
    if([p.a,p.b].every((a,i)=>a.group.position.clone().setY(0).distanceTo(p.slots[i])<.022)){
     p.stage='embrace';p.t=0;for(const a of [p.a,p.b]){a.dest=null;a.autoWander=false;a.mode='idle';a.speed=a.pathSpeed=0;a.feet={};a.setEmotion('happy',.72,{source:'social',hold:8});}
    }
   }else{
    p.weight=smooth(p.t/1.5)*smooth((7.5-p.t)/1.6);
    const front=p.kind==='hug'?p.axis:new T.Vector3(-p.axis.z,0,p.axis.x);
    for(const [i,a] of [p.a,p.b].entries()){const dir=front.clone().multiplyScalar(p.kind==='hug'&&i===1?-1:1),yaw=Math.atan2(dir.x,dir.z);a.group.rotation.y+=wrap(yaw-a.group.rotation.y)*(1-Math.exp(-dt*3));a.lookAtPos=(i?p.a:p.b).bones.Head.getWorldPosition(V());}
    if(p.t>7.5)this.cancel(p.a);
   }
  }
  this.nextCheck-=dt;if(this.nextCheck>0)return;this.nextCheck=3;
  for(let i=0;i<this.actors.length;i++){const a=this.actors[i];if(!this.eligible(a)||(this.cooldown.get(a)||0)>this.clock)continue;
   for(let j=i+1;j<this.actors.length;j++){const b=this.actors[j];if(!this.eligible(b)||(this.cooldown.get(b)||0)>this.clock||Math.abs(a.shape.height-b.shape.height)>.30)continue;
    const d=a.group.position.distanceTo(b.group.position);if(d<2.25&&d>.25&&Math.random()<.24){this.start(a,b,Math.random()<.6?'hug':'armAround');break;}
   }
  }
 }
 pose(p,a){
  if(p.stage!=='embrace'||p.weight<=.001)return;
  const other=a===p.a?p.b:p.a,h=a.shape.height;
  for(const side of ['L','R']){
   const sign=side==='L'?1:-1,hand=a.bones[side+'_Hand'];let target;
   if(p.kind==='hug')target=new T.Vector3(-sign*.065,1.20+(a===p.a?.045:-.025),-.085);
   else{
    const local=a.group.worldToLocal(other.group.position.clone());const inner=local.x>=0?'L':'R';if(side!==inner)continue;
    target=new T.Vector3((local.x>=0?1:-1)*.12,a===p.a?1.30:1.08,a===p.a?-.080:-.12);
   }
   target.multiplyScalar(other.shape.height);other.group.localToWorld(target);projectTarget(target,other);
   const wrist=hand.getWorldPosition(V()).lerp(target,p.weight),pole=new T.Vector3(sign*.60,1.23,p.kind==='hug'?.15:-.35).multiplyScalar(h);a.group.localToWorld(pole);
   a.solveChain(side,'arm',wrist,pole);
  }
  a.group.updateMatrixWorld(true);
 }
 resolveContacts(){
  // Torso and head capsules prevent interpenetration of the main body masses.
  // Hands target the other actor's exterior; this is not a full mesh SDF solver.
  for(let pass=0;pass<3;pass++)for(let i=0;i<this.actors.length;i++)for(let j=i+1;j<this.actors.length;j++){
   const a=this.actors[i],b=this.actors[j];if(a.version!=='v2'||b.version!=='v2'||a.balance.state!=='standing'||b.balance.state!=='standing'||a.group.position.distanceTo(b.group.position)>1)continue;
   for(const ac of caps(a))for(const bc of caps(b)){const c=segmentContact(ac,bc);if(c.depth<=0)continue;c.delta.y=0;if(c.delta.length()<1e-6)c.delta.copy(a.group.position).sub(b.group.position).setY(0);if(c.delta.length()<1e-6)c.delta.set(1,0,0);c.delta.normalize();
    const move=Math.min(c.depth+.0005,.045),wa=a.grabs.size?0:1,wb=b.grabs.size?0:1,total=wa+wb;if(!total)continue;a.group.position.addScaledVector(c.delta,move*wa/total);b.group.position.addScaledVector(c.delta,-move*wb/total);a.group.updateMatrixWorld(true);b.group.updateMatrixWorld(true);
   }
  }
 }
}
