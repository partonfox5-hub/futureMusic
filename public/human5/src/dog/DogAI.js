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
  this.lookYaw=0;this.lookPitch=0;this.lookRoll=0;this.bodyYaw=0;this.turn=0;
 }
 setAttention(mode){if(['attentive','hyperattentive','ignoring'].includes(mode))this.attentionMode=mode;return this;}
 tick(dt){
  const actors=(this.ctx.mira||this.ctx.system)?.actors||[],actor=actors[0],group=actor?.group,m=this.model,world=this.ctx.world;
  this.speed=0;this.turn=0;
  const root=m.root;
  const swimming=!!root.userData.waterSwimming;
  if(this.dead){this.state='sit';if(!swimming)root.position.y=floorAt(world,root.position.x,root.position.z,root.position.y);return;}
  const handle=root.userData.dog,neckHeld=[...handle?.grabs?.values?.()||[]].some(g=>/Neck|Head/.test(g.bone?.name||''));
  if(this.held){this.state='alert';}
  const wp=root.getWorldPosition(V());
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
  const look=watch&&distance<5.5;
  const wantYaw=look?clamp(Math.atan2(local.x,local.z),-1.4,1.4):0;
  const wantPitch=look?clamp(-Math.atan2(local.y-.52,Math.hypot(local.x,local.z)),-.78,.7):0;
  const wantRoll=look?clamp(local.x*.22,-.42,.42):0;
  this.lookYaw=THREE.MathUtils.damp(this.lookYaw,wantYaw,5,dt);
  this.lookPitch=THREE.MathUtils.damp(this.lookPitch,wantPitch,5,dt);
  this.lookRoll=THREE.MathUtils.damp(this.lookRoll,wantRoll,4,dt);
  if(!neckHeld){
   m.bones.Neck.rotation.y=this.lookYaw*.42;
   m.bones.Head.rotation.y=this.lookYaw*.58;
   m.bones.Neck.rotation.x=this.lookPitch*.4+(this.held?-.12:0);
   m.bones.Head.rotation.x=this.lookPitch*.62;
   m.bones.Neck.rotation.z=this.lookRoll*.4;
   m.bones.Head.rotation.z=this.lookRoll*.55;
  }
  this.bodyYaw=THREE.MathUtils.damp(this.bodyYaw,this.lookYaw*.22,3,dt);
  if(this.held){this.state='alert';return;}
  if(this.state==='sit'){
   this.sitT+=dt;
   if(this.sitT>6+Math.random()*6){this.state='idle';this.sitT=0;if(this.seat){this.seat.occupant=null;this.seat=null;}this.lifeT=1;}
   if(!swimming)root.position.y=floorAt(world,wp.x,wp.z,root.position.y);this.separate(world,actors,root);return;
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
    const ext=Math.min(10,world?.extent||6);
    this.goal.set((Math.random()-.5)*ext*1.2,0,(Math.random()-.5)*ext*1.2);
    if(world?.blocked?.(this.goal,.28))this.goal.set((Math.random()-.5)*ext,0,(Math.random()-.5)*ext);
   }
  }
  this.lifeT-=dt;
  if(this.goal){
   const d=this.goal.clone().sub(root.position);d.y=0;const length=d.length();
   if(length>.18){
    this.state='idle';this.speed=Math.min(this.hurt?0.28:0.62,(length-.18)*1.15);
    const step=d.clone().multiplyScalar(this.speed*dt/length),next=root.position.clone().add(step);
    if(world?.blocked?.(next,.22)){
     const side=new THREE.Vector3(-d.z,0,d.x).normalize().multiplyScalar(.18);
     if(!world.blocked(root.position.clone().add(side),.22))root.position.add(side);
     else{this.lifeT=0;this.speed=0;}
    }else root.position.add(step);
    const desired=Math.atan2(d.x,d.z),delta=Math.atan2(Math.sin(desired-root.rotation.y),Math.cos(desired-root.rotation.y));
    this.turn=delta;root.rotation.y+=delta*Math.min(1,dt*3.2);
   }else if(this.pendingSeat){
    this.seat=this.pendingSeat;this.seat.occupant=this;this.pendingSeat=null;this.state='sit';this.sitT=0;this.speed=0;
   }else this.state=watch?'alert':'idle';
  }
  const now=root.getWorldPosition(V());if(!swimming)root.position.y=floorAt(world,now.x,now.z,root.position.y);
  this.separate(world,actors,root);
  if(world?.project){const p=root.position.clone();world.project(p,.22,.02,0.55);root.position.x=p.x;root.position.z=p.z;}
 }
 separate(world,actors,root){
  const p=root.position;
  for(const a of actors||[]){
   if(!a?.group)continue;
   const q=a.group.position,dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz);
   if(d<.42&&d>1e-4){const push=(.42-d)/d;p.x+=dx*push;p.z+=dz*push;}
  }
  const dogs=this.ctx.props?.dogs?.list?.()||[];
  for(const h of dogs){
   if(!h?.root||h.root===root)continue;
   const q=h.root.position,dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz);
   if(d<.4&&d>1e-4){const push=(.4-d)/d;p.x+=dx*push;p.z+=dz*push;}
  }
 }
}
