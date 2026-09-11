import * as THREE from 'three';
import { clamp } from './Dog.js?v=18.0.0';
import { floorAt } from './DogPaws.js?v=18.0.0';
const V=()=>new THREE.Vector3(),Y=new THREE.Vector3(0,1,0),angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class DogAI {
 constructor(model,ctx){
  this.model=model;this.ctx=ctx;this.follow=false;this.state='idle';this.speed=0;this.goal=V();this.target=V();this.player=V();this.interest=null;
  this.attentionMode='attentive';this.lifeT=1.5;this.roamT=0;this.sitT=0;this.held=false;this.dead=false;this.hurt=false;this.hurtT=0;this.seat=null;this.pendingSeat=null;
  this.lookYaw=0;this.lookPitch=0;this.lookRoll=0;this.bodyYaw=0;this.turn=0;this.pathBend=0;this.clock=0;this.interruptT=0;this.lastBark=-100;
  this.fetch=null;this.seenThrows=new Map();this.barkTimes=new Map();this.actionT=0;this.eatT=0;this.destroyT=0;this.destroyCheck=3;this.zoomT=0;this.bowT=0;this.pantT=0;this.command=null;this.drinking=false;this.calledT=0;
 }
 get handle(){return this.model.root.userData.dog;}
 get needs(){return this.handle.needs;}
 get items(){return this.handle._items;}
 setAttention(mode){if(['attentive','hyperattentive','ignoring'].includes(mode))this.attentionMode=mode;return this;}
 say(pattern,cooldown=2){if(this.clock-(this.barkTimes.get(pattern)??-100)<cooldown)return;this.barkTimes.set(pattern,this.clock);this.lastBark=this.clock;this.handle.bark(pattern);}
 cancelFetch(){if(this.fetch?.bone?.owner===this.handle)this.items.drop(this.fetch.bone);this.fetch=null;}
 disturb(){if(this.state==='sleep')this.say('sleepy-grumble',8);this.interruptT=2;this.drinking=false;this.command=null;this.state='alert';}
 setState(state){if(['idle','sit','stand','alert','sleep','snap','destroy'].includes(state)){this.releaseSeat();this.command=state;this.actionT=state==='snap'?.55:state==='destroy'?3:10;this.state=state;}return this;}
 releaseSeat(){if(this.seat?.occupant===this)this.seat.occupant=null;this.seat=null;this.pendingSeat=null;}
 tick(dt){
  const h=this.handle,n=this.needs,root=this.model.root,items=this.items;
  this.clock+=dt;this.speed=0;this.turn=0;this.interest=null;this.interruptT=Math.max(0,this.interruptT-dt);this.lifeT-=dt;this.destroyCheck-=dt;
  const actor=(this.ctx.mira||this.ctx.system)?.actors?.[0];
  if(this.ctx.camera?.getWorldPosition)this.ctx.camera.getWorldPosition(this.player);else if(actor?.group)actor.group.getWorldPosition(this.player);else this.player.copy(root.getWorldPosition(V())).add(new THREE.Vector3(0,1.6,1));
  if(this.dead){this.state='sleep';this.releaseSeat();this.cancelFetch();return;}
  if(this.held){this.releaseSeat();this.state='alert';this.interest=this.player;this.look(dt);return;}
  if(root.userData.waterSwimming){this.drinking=false;this.state='swim';this.interest=this.player;this.look(dt);return;}
  if(this.hurt){this.hurtT+=dt;if(this.hurtT>8){this.hurt=false;this.hurtT=0;}}
  const wp=root.getWorldPosition(V()),muzzle=h._bite.muzzle(),water=this.ctx.props?.water;
  if(this.calledT>0){
   this.calledT=Math.max(0,this.calledT-dt);this.releaseSeat();this.drinking=false;this.cancelFetch();this.command=null;this.zoomT=0;this.destroyT=0;
   this.interest=this.player;this.state='greet';this.greeting=true;
   const distance=Math.hypot(wp.x-this.player.x,wp.z-this.player.z);
   this.approach(this.player,.85,dt,.95);
   if(distance<1.15){this.say('greeting',8);this.calledT=0;this.greeting=false;this.follow=false;this.lifeT=14;this.peelT=3;}
   this.look(dt);return;
  }
  const wet=water?.contains?.(muzzle);
  if(this.interruptT<=0&&(this.drinking||n.thirst<70)&&wet&&wet.depth>.01&&n.thirst<100){
   this.releaseSeat();this.drinking=true;this.state='drink';n.drink(dt);if(n.thirst>=100){this.drinking=false;this.interruptT=.5;}this.interest=muzzle.clone().add(new THREE.Vector3(0,-.025,.08));this.look(dt);return;
  }
  if(this.drinking&&n.thirst>=100)this.interruptT=.5;this.drinking=false;
  // Priorities can interrupt a trip; ownership stays on the blackboard until resumed.
  const food=n.hunger<99.9?items.foodNear(wp,2.5):null;
  if(food){
   this.releaseSeat();this.interest=food.p;this.state='eat';const flat=muzzle.clone().sub(food.p);flat.y=0;
   if(wp.clone().setY(0).distanceTo(food.p.clone().setY(0))>.72){this.approach(food.p,.43,dt,.68);this.state='seek-food';}
   else if(flat.length()>.065){const goal=wp.clone().add(food.p.clone().sub(muzzle).setY(0));this.move(goal,dt,.26,.035);}
   this.eatT-=dt;if(this.state==='eat'&&this.eatT<=0&&items.eat(muzzle,n,.14)){this.eatT=.35;h._jaw.bark();}
   this.look(dt);return;
  }
  if(n.hunger===0&&!items.bowlFood()){
   const bag=items.items.filter(a=>(a.type==='bag'||a.type==='catbag')&&!a.torn&&!items.isHeld(a)&&a.group.getWorldPosition(V()).distanceTo(wp)<2).sort((a,b)=>a.group.position.distanceToSquared(root.position)-b.group.position.distanceToSquared(root.position))[0];
   if(bag){this.releaseSeat();this.interest=bag.group.localToWorld(new THREE.Vector3(0,.22,0));this.approach(this.interest,.68,dt,.58);this.state='eat-bag';this.look(dt);return;}
  }
  if(this.toyBehavior(dt,wp)){this.releaseSeat();this.look(dt);return;}
  if(this.command){
   this.actionT-=dt;this.state=this.command;this.interest=this.player;
   if(this.command==='destroy'){const target=this.weakProp(wp);if(target){this.interest=target.point;this.approach(target.point,.70,dt,.5);this.state='destroy';}}
   if(this.actionT<=0)this.command=null;this.look(dt);return;
  }
  if(this.bowT>0){this.bowT-=dt;this.state='play-bow';this.interest=this.player;this.look(dt);return;}
  if(this.zoomT>0){
   this.zoomT-=dt;this.state='zoomie';const c=this.zoomCenter,t=this.clock*1.9,r=1.25;
   const goal=c.clone().add(new THREE.Vector3(Math.sin(t)*r,0,Math.cos(t)*r));this.move(goal,dt,.95*1.6,.05);this.interest=goal;
   if(this.zoomT<=0||n.energy<15){this.zoomT=0;this.pantT=2.5;}this.look(dt);return;
  }
  if(this.pantT>0){this.pantT-=dt;this.state='pant';this.look(dt);return;}
  if(this.destroyT>0){
   this.destroyT-=dt;const target=this.weakProp(wp);if(target){this.interest=target.point;this.approach(target.point,.70,dt,.58);this.state='destroy';this.look(dt);return;}
  }
  if(this.destroyCheck<=0){this.destroyCheck=3+Math.random()*4;if(n.restless&&Math.random()<(n.hunger===0?.65:.22)&&this.weakProp(wp)){this.destroyT=2.5;this.say('warning-destroy',5);}}
  const distance=Math.hypot(wp.x-this.player.x,wp.z-this.player.z);
  if(this.greeting||this.lifeT<=0&&distance>=1.2&&distance<=3.5&&this.attentionMode!=='ignoring'){
   this.greeting=true;this.interest=this.player;this.state='greet';this.approach(this.player,.95,dt,.65*n.obedience);
   if(distance<1.25){this.say('greeting',10);this.greeting=false;this.lifeT=this.attentionMode==='hyperattentive'?9+Math.random()*6:12+Math.random()*13;this.roamT=0;this.peelT=3;}
   this.look(dt);return;
  }
  if(this.follow||this.attentionMode==='hyperattentive'&&distance>2){this.releaseSeat();this.state='idle';this.interest=this.player;this.approach(this.player,this.attentionMode==='hyperattentive'?1.4:1.8,dt,.68*n.obedience);this.look(dt);return;}
  // Sleep is the idle fallback. It yields to water, food, fetching, commands and greetings.
  if((n.sleep<18||this.state==='sleep'&&n.sleep<92)&&this.interruptT<=0){this.releaseSeat();this.state='sleep';this.look(dt);return;}
  if(this.seat){this.state='sit';this.sitT-=dt;if(this.sitT>0){this.look(dt);return;}this.releaseSeat();}
  this.roamT-=dt;this.peelT=Math.max(0,(this.peelT||0)-dt);
  if(this.roamT<=0){
   this.roamT=4+Math.random()*7;this.pendingSeat=null;
   const seats=(this.ctx.world?.seats||[]).filter(s=>!s.occupant);
   if(seats.length&&Math.random()<.2&&!this.peelT){const s=seats[Math.floor(Math.random()*seats.length)];this.pendingSeat=s;this.goal.copy(s.approach||s.position);}
   else{const a=Math.random()*Math.PI*2,r=1+Math.random()*(this.model.breed?.coat==='tricolor'?1.35:1)*(this.attentionMode==='ignoring'?4:2.5);this.goal.copy(wp).add(new THREE.Vector3(Math.sin(a)*r,0,Math.cos(a)*r));
   }
   if(this.peelT){this.goal.copy(wp).add(wp.clone().sub(this.player).setY(0).normalize().multiplyScalar(1.6));}
   const ext=this.ctx.world?.extent;if(Number.isFinite(ext)){this.goal.x=clamp(this.goal.x,-ext,ext);this.goal.z=clamp(this.goal.z,-ext,ext);}
  }
  this.state='idle';this.move(this.goal,dt,(this.hurt?.28:n.restless?.72:.55)*(.55+.45*n.energy/100));
  if(!this.speed&&this.pendingSeat&&!this.pendingSeat.occupant&&wp.distanceTo(this.goal)<.55){this.seat=this.pendingSeat;this.seat.occupant=this;this.pendingSeat=null;this.sitT=5+Math.random()*5;this.state='sit';}
  if(this.attentionMode!=='ignoring'&&distance<5&&Math.sin(this.clock*.45)>.2)this.interest=this.player;
  this.look(dt);
 }
 wantsToy(item){
  if(!item)return false;
  if(this.handle.kind==='cat')return item.type==='chicken';
  return item.type==='bone'||item.type==='chicken';
 }
 toyBehavior(dt,wp){
  const items=this.items,h=this.handle,n=this.needs,cat=h.kind==='cat';
  for(const bone of items.items){
   if(this.fetch&&['chew','stash','flee','keep','tug'].includes(this.fetch.phase)&&this.fetch.bone.owner===h)break;
   if(!this.wantsToy(bone))continue;
   const bp=bone.group.getWorldPosition(V()),distance=wp.distanceTo(bp);
   if(items.isHeld(bone)&&distance<4){
    if(this.fetch?.bone===bone&&this.fetch.phase==='wait')this.fetch=null;
    if(!this.boneAttention)this.boneAttention=this.attentionMode;this.attentionMode='attentive';this.interest=bp;this.state='alert';
    if(bone.stillFor>6)this.say('demand-bone',6);else if(this.clock-(this.barkTimes.get('bone-interest')??0)>5){this.barkTimes.set('bone-interest',this.clock);if(Math.random()<.35)this.say('demand-bone',5);}
    this.seenThrows.set(bone,bone.throwSerial);return true;
   }
  }
  if(this.boneAttention){this.attentionMode=this.boneAttention;this.boneAttention=null;}
  if(!this.fetch||this.fetch.phase==='wait')for(const bone of items.items){
   if(!this.wantsToy(bone)||bone.owner||items.isHeld(bone))continue;
   if(bone.throwSerial>(this.seenThrows.get(bone)||0)){this.seenThrows.set(bone,bone.throwSerial);if(bone.group.getWorldPosition(V()).distanceTo(wp)<12){this.fetch={bone,phase:'chase',thrown:true};break;}}
  }
  let f=this.fetch;
  if(!f){for(const bone of items.items){
   if(!this.wantsToy(bone)||bone.owner||items.isHeld(bone)||items.time<bone.nextInterest||bone.velocity.length()>.2)continue;
   const p=bone.group.getWorldPosition(V());if(p.distanceTo(wp)>3.5)continue;
   bone.nextInterest=items.time+12+Math.random()*8;const r=Math.random();
   if(r<.3)continue;f=this.fetch={bone,phase:'chase',choice:cat?'flee':(r<.7?'keep':'return'),thrown:false};break;
  }}
  if(!f)return false;const bone=f.bone;
  if(!bone.group.parent||items.isHeld(bone)||(bone.owner&&bone.owner!==h&&f.phase!=='tug'&&f.phase!=='chase')){if(f.phase!=='tug')this.fetch=null;if(f.phase!=='tug')return false;}
  const bp=bone.group.getWorldPosition(V());this.interest=bp;
  if(f.phase==='chase'&&bone.type==='chicken'){
   const dogs=this.ctx.props?.dogs?.list?.()||[];
   const rival=dogs.find(o=>o!==h&&o._ai?.fetch?.bone===bone&&['chase','tug'].includes(o._ai.fetch.phase));
   if(rival&&wp.distanceTo(rival.root.getWorldPosition(V()))<1.35&&wp.distanceTo(bp)<1.4){
    if(!items.tug)items.tug={toy:bone,a:h,b:rival,t:0};
    f.phase='tug';rival._ai.fetch.phase='tug';
   }
  }
  if(f.phase==='tug'){
   this.state='tug';this.approach(bp,.22,dt,.55);
   if(items.tug&&items.tug.toy===bone&&items.tug.a===h){
    items.tug.t+=dt;
    if(items.tug.t>1.15){
     const winner=Math.random()<.5?items.tug.a:items.tug.b,loser=winner===items.tug.a?items.tug.b:items.tug.a;
     if(bone.owner)items.drop(bone);
     items.carry(bone,winner);
     winner._ai.fetch={bone,phase:winner.kind==='cat'?'flee':'return',choice:winner.kind==='cat'?'flee':'return',timer:0};
     if(winner.kind!=='cat')winner._ai.fetch.spot=wp.clone().add(wp.clone().sub(this.player).setY(0).normalize().multiplyScalar(1.1));
     loser._ai.fetch=null;loser._ai.say('warning-destroy',4);items.tug=null;
    }
   }
   return true;
  }
  if(f.phase==='chase'){
   this.state='fetch';this.approach(bp,.38,dt,n.energy>40?1.52:.68);
   if(wp.distanceTo(bp)<.85&&bone.velocity.length()<2){
    this.state='pickup';const mouth=h._bite.muzzle(),flat=bp.clone().sub(mouth).setY(0);
    if(flat.length()>.07)this.move(wp.clone().add(flat),dt,.3,.035);
    if(mouth.distanceTo(bp.clone().add(new THREE.Vector3(0,.04,0)))<.19&&items.carry(bone,h)){
     if(cat){f.phase='flee';f.timer=0;f.spot=null;}
     else if(bone.type==='chicken'&&f.thrown){f.phase='return';f.timer=0;}
     else{const choice=f.choice||(Math.random()<(n.restless?.2:.5)?'return':'keep');f.phase=choice==='return'?'return':'stash';f.timer=0;
     if(choice==='keep')f.spot=wp.clone().add(wp.clone().sub(this.player).setY(0).normalize().multiplyScalar(1.2));}
    }
   }return true;
  }
  if(f.phase==='flee'){
   this.state='carry';
   if(!f.spot){const away=wp.clone().sub(this.player).setY(0);if(away.lengthSq()<1e-4)away.set(1,0,.2);f.spot=wp.clone().addScaledVector(away.normalize(),4.2+Math.random()*2.4);}
   this.interest=f.spot;this.move(f.spot,dt,1.38);
   if(wp.distanceTo(f.spot)<.45){f.phase='keep';f.timer=7;}return true;
  }
  if(f.phase==='keep'){this.state='chew';this.interest=null;f.timer-=dt;if(f.timer<=0){items.drop(bone);this.fetch=null;this.state='sit';}return true;}
  if(f.phase==='stash'){this.state='carry';this.interest=f.spot;this.move(f.spot,dt,.58);if(wp.distanceTo(f.spot)<.25){f.phase='chew';f.timer=8;}return true;}
  if(f.phase==='chew'){
   this.state='chew';this.interest=null;f.timer-=dt;if(f.timer<=0){items.drop(bone);this.fetch=null;this.state='sit';}return true;
  }
  if(f.phase==='return'){
   this.interest=this.player;this.state='fetch-return';this.approach(this.player,.8,dt,n.energy>40?.95:.58);
   if(Math.hypot(wp.x-this.player.x,wp.z-this.player.z)<1){
    const forward=new THREE.Vector3(0,0,-1);if(this.ctx.camera?.getWorldQuaternion)forward.applyQuaternion(this.ctx.camera.getWorldQuaternion(new THREE.Quaternion()));forward.y=0;forward.normalize();
    const drop=this.player.clone().addScaledVector(forward,.4);drop.y=floorAt(this.ctx.world,drop.x,drop.z,0)+.025;items.drop(bone,drop,new THREE.Vector3(0,.1,0));f.phase='wait';f.drop=drop;f.timer=0;this.state='sit';
   }return true;
  }
  if(f.phase==='wait'){
   if(items.isHeld(bone)){this.fetch=null;return false;}
   f.timer+=dt;if(this.player.clone().setY(0).distanceTo(f.drop.clone().setY(0))>6)this.say('left-behind-bone',8);
   this.state='sit';this.interest=this.player;if(f.timer>12)return false;return true;
  }
  return false;
 }
 weakProp(wp){
  let best=null,dist=2;
  const candidates=[...(this.ctx.world?.movables||[]),...(this.ctx.scene?.children||[])];
  for(const root of candidates){root?.traverse?.(o=>{
   if(!o.isMesh||o.userData.dog||this.items.resolve(o)||o.visible===false)return;
   const u=o.userData,health=u.health??u.fracture?.health??u.destructible?.health,kind=String(u.kind||u.material||u.fracture?.material||o.material?.name||'').toLowerCase();
   if(!(Number.isFinite(health)&&health<60||/wood|plaster/.test(kind)))return;
   const box=new THREE.Box3().setFromObject(o),p=box.clampPoint(wp.clone().add(new THREE.Vector3(0,.5,0)),V()),d=p.distanceTo(wp);
   if(d<dist){dist=d;best={mesh:o,point:p};}
  });}return best;
 }
 startBurst(){if(this.needs.energy<=40||this.fetch||this.held||this.dead||this.state!=='idle'||this.needs.sleep<18)return false;this.bowT=.55;this.zoomT=2+Math.random()*2;this.zoomCenter=this.player.clone();this.zoomCenter.y=this.model.root.getWorldPosition(V()).y;this.needs.spend(5);this.say('play-zoomie',8);return true;}
 approach(point,standOff,dt,speed){const wp=this.model.root.getWorldPosition(V()),d=point.clone().sub(wp);d.y=0;const len=d.length();if(len<=standOff)return;this.move(point.clone().addScaledVector(d.normalize(),-standOff),dt,speed,.035);}
 move(goal,dt,speed=.6,stop=.15){
  speed*=this.model.breed?.speed||1;
  const root=this.model.root,w=this.ctx.world,wp=root.getWorldPosition(V()),d=goal.clone().sub(wp);d.y=0;const len=d.length();if(len<=stop)return;
  d.normalize();let heading=Math.atan2(d.x,d.z),delta=angle(heading-this.worldYaw());
  this.turn=clamp(delta,-.9,.9);
  // Sample a half-spine ahead of Root; the front tracks the next path tangent first.
  this.lookAhead=wp.clone().addScaledVector(new THREE.Vector3(Math.sin(this.worldYaw()),0,Math.cos(this.worldYaw())),Math.min(.38,len*.5));
  const ahead=goal.clone().sub(this.lookAhead);ahead.y=0;
  const headingAhead=Math.atan2(ahead.x,ahead.z),bend=angle(headingAhead-this.worldYaw());
  this.pathBend=THREE.MathUtils.damp(this.pathBend,clamp(bend,-.7,.7),6,dt);
  let actual=Math.min(speed,(len-stop)*2),next=wp.clone().addScaledVector(d,actual*dt);
  if(w?.blocked?.(next,.30)){
   let found=false;for(const sign of [1,-1]){const side=d.clone().applyAxisAngle(Y,sign*.9),p=wp.clone().addScaledVector(side,actual*dt);
    if(!w.blocked(p.clone().addScaledVector(side,.18),.30)){next=p;heading=Math.atan2(side.x,side.z);found=true;break;}}
   if(!found){this.roamT=0;this.speed=0;return;}
  }
  w?.project?.(next,.30,.04,.7);if((w?.gravity??9.81)>0.5)next.y=floorAt(w,next.x,next.z,wp.y);
  root.position.copy(root.parent?.worldToLocal(next.clone())||next);root.rotation.y+=angle(heading-this.worldYaw())*Math.min(1,dt*4);
  this.speed=wp.distanceTo(next)/Math.max(dt,.001);this.separate();this.model.updatePoseWorld();
 }
 worldYaw(){return new THREE.Euler().setFromQuaternion(this.model.root.getWorldQuaternion(new THREE.Quaternion()),'YXZ').y;}
 separate(){
  const root=this.model.root,p=root.getWorldPosition(V()),actors=(this.ctx.mira||this.ctx.system)?.actors||[],dogs=this.ctx.props?.dogs?.list?.()||[];
  for(const a of [...actors,...dogs]){const g=a.group||a.root;if(!g||g===root)continue;const q=g.getWorldPosition(V()),d=p.clone().sub(q);d.y=0;const n=d.length();if(n>1e-5&&n<.4)p.addScaledVector(d,(.4-n)/n);}
  root.position.copy(root.parent?.worldToLocal(p.clone())||p);
 }
 look(dt){
  const root=this.model.root,head=this.model.bones.Head,local=this.interest?.clone().sub(head.getWorldPosition(V())).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()).invert());
  let yaw=local?clamp(Math.atan2(local.x,local.z),-1.4,1.4):0,pitch=local?clamp(-Math.atan2(local.y,Math.hypot(local.x,local.z)),-.75,1.5):0;
  if(this.state==='sleep'){pitch=1.1;yaw=.12;}
  if(this.state==='eat'||this.state==='pickup'){pitch=1.48;yaw=clamp(yaw,-.5,.5);}
  this.lookYaw=THREE.MathUtils.damp(this.lookYaw,yaw,7,dt);this.lookPitch=THREE.MathUtils.damp(this.lookPitch,pitch,7,dt);
  this.lookRoll=THREE.MathUtils.damp(this.lookRoll,local&&this.state==='alert'?clamp(local.x*.18,-.45,.45):0,4,dt);this.bodyYaw=this.lookYaw*.07;
 }
 poseLook(){
  const handle=this.model.root.userData.dog;
  if([...handle?.grabs?.values?.()||[]].some(g=>/Neck|Head/.test(g.bone?.name||'')))return;
  // Solve the desired Head world frame, then use Neck for the rotation Head cannot take.
  const b=this.model.bones,rootQ=this.model.root.getWorldQuaternion(new THREE.Quaternion());
  const want=rootQ.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(this.lookPitch,this.lookYaw,this.lookRoll,'YXZ')));
  b.Neck.quaternion.identity();this.model.updatePoseWorld();
  const local=b.Neck.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(want),e=new THREE.Euler().setFromQuaternion(local,'YXZ');
  b.Neck.rotation.set(clamp(e.x-clamp(e.x*.7,-.7,.9),-.65,.65),clamp(e.y-clamp(e.y*.7,-.9,.9),-.55,.55),clamp(e.z*.4,-.18,.18),'YXZ');
  b.Neck.updateWorldMatrix(false,true);const head=b.Head.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(want),he=new THREE.Euler().setFromQuaternion(head,'YXZ');
  b.Head.rotation.set(clamp(he.x,-.8,.95),clamp(he.y,-.95,.95),clamp(he.z,-.27,.27),'YXZ');
 }
}
