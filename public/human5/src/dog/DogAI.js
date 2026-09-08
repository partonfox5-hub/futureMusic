import * as THREE from 'three';
import { clamp } from './Dog.js?v=12.1';
import { floorAt } from './DogPaws.js?v=12.1';
const Y=new THREE.Vector3(0,1,0),V=()=>new THREE.Vector3();
export class DogAI {
 constructor(model,ctx){
  this.model=model;this.ctx=ctx;this.follow=false;this.state='idle';this.speed=0;
  this.target=V();this.goal=V();this.q=new THREE.Quaternion();
  this.attentionMode='attentive';this.lookPhase=true;this.lookPhaseT=2+Math.random()*3;
  this.lifeT=1+Math.random()*2;this.sitT=0;this.held=false;this.seat=null;this.hurt=false;this.dead=false;
 }
 setAttention(mode){if(['attentive','hyperattentive','ignoring'].includes(mode))this.attentionMode=mode;return this;}
 tick(dt){
  const actors=(this.ctx.mira||this.ctx.system)?.actors||[],actor=actors[0],group=actor?.group,m=this.model,world=this.ctx.world;
  this.speed=0;
  if(this.dead){this.speed=0;this.state='sit';m.root.position.y=floorAt(world,m.root.position.x,m.root.position.z,m.root.position.y);return;}
  if(this.held){this.state='alert';m.bones.Neck.rotation.x=THREE.MathUtils.damp(m.bones.Neck.rotation.x,-.12,8,dt);return;}
  const root=m.root,wp=root.getWorldPosition(V());
  const player=this.ctx.camera?.getWorldPosition?.(V())||actor?.group?.position;
  if(group)group.getWorldPosition?.(this.target)||this.target.copy(group.position||V());
  else if(player)this.target.copy(player);
  const local=root.worldToLocal(this.target.clone()),distance=wp.distanceTo(this.target);
  this.lookPhaseT-=dt;if(this.lookPhaseT<=0){
   if(this.attentionMode==='hyperattentive')this.lookPhase=true;
   else if(this.attentionMode==='ignoring')this.lookPhase=Math.random()<.16;
   else this.lookPhase=Math.random()<.55;
   this.lookPhaseT=(this.lookPhase?2.5:4)+Math.random()*3;
  }
  const watch=this.attentionMode==='hyperattentive'||this.lookPhase;
  const look=watch&&distance<4.5;
  const neckYaw=look?clamp(Math.atan2(local.x,local.z),-.60,.60):0;
  m.bones.Neck.rotation.y=THREE.MathUtils.damp(m.bones.Neck.rotation.y,neckYaw*.40,4,dt);
  m.bones.Head.rotation.y=THREE.MathUtils.damp(m.bones.Head.rotation.y,neckYaw*.60,4,dt);
  m.bones.Head.rotation.x=THREE.MathUtils.damp(m.bones.Head.rotation.x,look?clamp(-Math.atan2(local.y-.76,Math.hypot(local.x,local.z)),-.24,.22):0,4,dt);
  this.lifeT-=dt;
  if(this.state==='sit'){
   this.sitT+=dt;
   if(this.sitT>6+Math.random()*6){this.state='idle';this.sitT=0;if(this.seat){this.seat.occupant=null;this.seat=null;}this.lifeT=1;}
   root.position.y=floorAt(world,wp.x,wp.z,root.position.y);return;
  }
  const follow=this.follow||this.attentionMode==='hyperattentive'||(this.attentionMode==='attentive'&&this.lookPhase&&distance>2.2);
  if(follow&&group&&this.state!=='sit'){
   const yaw=group.getWorldQuaternion?new THREE.Euler().setFromQuaternion(group.getWorldQuaternion(this.q),'YXZ').y:group.rotation?.y||0;
   this.goal.copy(this.target).add(new THREE.Vector3(.85,0,.15).applyAxisAngle(Y,yaw));
  }else if(this.lifeT<=0){
   this.lifeT=5+Math.random()*8;
   const seats=world?.seats?.filter(s=>!s.occupant)||[];
   if(seats.length&&Math.random()<.35){
    const seat=seats[Math.floor(Math.random()*seats.length)];
    this.goal.copy(seat.position||seat.approach);this.goal.y=0;this.pendingSeat=seat;
   }else{
    this.pendingSeat=null;
    const ext=Math.min(8,world?.extent||6);
    this.goal.set((Math.random()-.5)*ext*1.4,0,(Math.random()-.5)*ext*1.4);
    if(world?.blocked?.(this.goal,.3))this.goal.set((Math.random()-.5)*ext,0,(Math.random()-.5)*ext);
   }
  }
  if(this.goal){
   if(root.parent?.worldToLocal){/* goal already world-ish in scene */}
   const d=this.goal.clone().sub(root.position);d.y=0;const length=d.length();
   if(length>.18){
    this.state='idle';this.speed=Math.min(this.hurt?0.28:0.62,(length-.18)*1.15);
    root.position.addScaledVector(d,this.speed*dt/length);
    const desired=Math.atan2(d.x,d.z),delta=Math.atan2(Math.sin(desired-root.rotation.y),Math.cos(desired-root.rotation.y));
    root.rotation.y+=delta*Math.min(1,dt*3.2);
   }else if(this.pendingSeat){
    this.seat=this.pendingSeat;this.seat.occupant=this;this.pendingSeat=null;this.state='sit';this.sitT=0;this.speed=0;
   }else this.state=watch?'alert':'idle';
  }
  const now=root.getWorldPosition(V());root.position.y=floorAt(world,now.x,now.z,root.position.y);
  if(world?.project){const p=root.position.clone();world.project(p,.16,.02,0.6);root.position.x=p.x;root.position.z=p.z;}
 }
}
