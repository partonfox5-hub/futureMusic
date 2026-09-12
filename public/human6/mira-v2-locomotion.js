import * as T from 'three';
import {SprintBurst,PLAYER_SPEED_GAIN} from './modules/human5-sprint.js?v=19.3.2';
// xr-standard reserves 0/1 for the touchpad, even when no touchpad exists.
export function stickAxes(gamepad){
 const a=gamepad?.axes;if(!a)return {x:0,y:0};
 const i=a.length>=4?2:0;
 return {x:Number.isFinite(a[i])?a[i]:0,y:Number.isFinite(a[i+1])?a[i+1]:0};
}
export function deadzone(x,y,threshold=.14){
 const length=Math.hypot(x,y);if(length<=threshold)return {x:0,y:0};
 const gain=Math.min(1,(length-threshold)/(1-threshold))/length;
 return {x:x*gain,y:y*gain};
}
export class SmoothLocomotion {
 constructor(rig,camera,world){Object.assign(this,{rig,camera,world});this.forward=new T.Vector3(0,0,-1);this.floorY=0;this.jumpVel=0;this.jumping=false;this.pace=0;this.sprint=new SprintBurst();this.jumpDown=false;world.h5Locomotion=this;}
 jump(){
  if(this.jumping||this.world.waterSystem?.playerSubmerged?.(this.camera))return false;
  this.jumpVel=4.5;this.jumping=true;return true;
 }
 tick(dt,sources,blocked=false){
  const raw=[...sources],leftInput=raw.find(s=>s.handedness==='left'&&!s.hand),rightInput=raw.find(s=>s.handedness==='right'&&!s.hand);
  const occupied=this.world.h5Home?.consumesStick('left')||this.world.builder?.active;
  const sprint=this.sprint.tick(dt,!!leftInput?.gamepad?.buttons?.[3]?.pressed,blocked||occupied);
  const jumpDown=!!rightInput?.gamepad?.buttons?.[4]?.pressed,jumpEdge=jumpDown&&!this.jumpDown;this.jumpDown=jumpDown;
  if(blocked||!(dt>0)){this.pace=0;return;}dt=Math.min(dt,.05);
  sources=[...sources].map(s=>{if(!s.gamepad)return s;const home=this.world.h5Home?.consumesStick(s.handedness),equipment=this.world.h5Equipment?.consumesStick(s.handedness);if(!home&&!equipment)return s;const axes=Array.from(s.gamepad.axes);axes[axes.length>=4?3:1]=0;if(home)axes[axes.length>=4?2:0]=0;return {...s,gamepad:{axes,buttons:s.gamepad.buttons},hand:s.hand,handedness:s.handedness};});
  const water=this.world.waterSystem,camera=this.camera;
  if(water?.playerSwimIntent({rig:this.rig,camera,dt,sources,blocked}).active){this.jumping=false;this.jumpVel=0;return;}
  const left=[...sources].find(s=>s.handedness==='left'&&!s.hand),right=[...sources].find(s=>s.handedness==='right'&&!s.hand);
  const l=stickAxes(left?.gamepad),r=stickAxes(right?.gamepad),move=deadzone(l.x,l.y),turn=deadzone(r.x,0,.16).x;
  if(jumpEdge&&!this.jumping&&!this.world.h5Home?.consumesStick('right'))this.jump();
  const eye=this.camera.getWorldPosition(new T.Vector3());
  const forward=new T.Vector3(0,0,-1).applyQuaternion(this.camera.getWorldQuaternion(new T.Quaternion())).setY(0);
  if(forward.lengthSq()>.01)this.forward.copy(forward).normalize();
  const strafe=new T.Vector3(-this.forward.z,0,this.forward.x);
  const input=Math.hypot(move.x,move.y),max=1.45*1.25*1.15*1.30*PLAYER_SPEED_GAIN*sprint*(this.world.h5Combat?.speedScale()||1);
  // Releasing the stick stops translation. Never invent a forward direction.
  if(input>.02)this.pace+=(max*input-this.pace)*(1-Math.exp(-dt/ .12));
  else this.pace=0;
  const delta=this.forward.clone().multiplyScalar(-move.y).addScaledVector(strafe,move.x);
  if(delta.lengthSq()>1e-8)delta.normalize().multiplyScalar(this.pace*dt);
  else delta.set(0,0,0);
  const angle=-turn*2.15*dt,offset=eye.clone().sub(this.rig.position);
  this.rig.position.add(offset).sub(offset.clone().applyAxisAngle(new T.Vector3(0,1,0),angle));
  // Yaw-only: leftover car pitch/roll after exit inverted right-stick look.
  const yaw=new T.Euler().setFromQuaternion(this.rig.quaternion,'YXZ').y+angle;
  this.rig.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),yaw);
  this.rig.rotation.set(0,yaw,0);
  const target=eye.clone().add(delta),before=target.clone();
  this.world.project(target,.32,-1.5,1.7);
  target.x=T.MathUtils.clamp(target.x,-this.world.extent,this.world.extent);
  target.z=T.MathUtils.clamp(target.z,-this.world.extent,this.world.extent);
  this.rig.position.add(delta).add(target.sub(before));
  const feet=this.camera.getWorldPosition(new T.Vector3());feet.y=this.rig.position.y;
  const want=this.world.floorHeight?.(feet,undefined,.42)||0;
  const grav=Number.isFinite(this.world.gravity)?this.world.gravity:9.81;
  if(grav<0.5){
   const look=new T.Vector3(0,0,-1).applyQuaternion(this.camera.getWorldQuaternion(new T.Quaternion()));
   if(right?.gamepad?.buttons?.[4]?.pressed)this.jumpVel+= (look.y<-.35?-1:1)*9.5*dt;
   this.jumpVel*=Math.exp(-dt*.35);
   this.rig.position.y+=this.jumpVel*dt;
   this.floorY=this.rig.position.y;this.jumping=false;
  }else if(this.jumping){
   this.jumpVel-=grav*dt;this.rig.position.y+=this.jumpVel*dt;this.floorY=this.rig.position.y;
   if(this.rig.position.y<=want&&this.jumpVel<=0){this.rig.position.y=want;this.floorY=want;this.jumpVel=0;this.jumping=false;}
  }else if(!water?.playerSubmerged(camera)){
   this.floorY=T.MathUtils.damp(this.floorY,want,14,dt);
   this.rig.position.y=this.floorY;
  }
  this.rig.updateWorldMatrix(true,true);
 }
}
