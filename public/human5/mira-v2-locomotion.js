import * as T from 'three';
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
 constructor(rig,camera,world){Object.assign(this,{rig,camera,world});this.forward=new T.Vector3(0,0,-1);this.floorY=0;}
 tick(dt,sources,blocked=false){
  if(blocked||!(dt>0))return;dt=Math.min(dt,.05);
  const water=this.world.waterSystem,camera=this.camera;
  if(water?.playerSwimIntent({rig:this.rig,camera,dt,sources,blocked}).active)return;
  const left=[...sources].find(s=>s.handedness==='left'&&!s.hand),right=[...sources].find(s=>s.handedness==='right'&&!s.hand);
  const l=stickAxes(left?.gamepad),r=stickAxes(right?.gamepad),move=deadzone(l.x,l.y),turn=deadzone(r.x,0,.16).x;
  const trigger=left?.gamepad?.buttons?.[0],sprint=(trigger?.pressed||(trigger?.value||0)>.42)?2:1;
  const eye=this.camera.getWorldPosition(new T.Vector3());
  const forward=new T.Vector3(0,0,-1).applyQuaternion(this.camera.getWorldQuaternion(new T.Quaternion())).setY(0);
  if(forward.lengthSq()>.01)this.forward.copy(forward).normalize();
  const strafe=new T.Vector3(-this.forward.z,0,this.forward.x);
  const delta=this.forward.clone().multiplyScalar(-move.y).addScaledVector(strafe,move.x).multiplyScalar(1.45*sprint*dt);
  const angle=-turn*2.15*dt,offset=eye.clone().sub(this.rig.position);
  this.rig.position.add(offset).sub(offset.clone().applyAxisAngle(new T.Vector3(0,1,0),angle));
  this.rig.rotation.y+=angle;
  const target=eye.clone().add(delta),before=target.clone();
  this.world.project(target,.18,.10,1.5);
  target.x=T.MathUtils.clamp(target.x,-this.world.extent,this.world.extent);
  target.z=T.MathUtils.clamp(target.z,-this.world.extent,this.world.extent);
  this.rig.position.add(delta).add(target.sub(before));
  if(!water?.playerSubmerged(camera)){
   const want=this.world.floorHeight?.(this.camera.getWorldPosition(new T.Vector3()))||0;
   this.floorY=T.MathUtils.damp(this.floorY,want,14,dt);
   this.rig.position.y=this.floorY;
  }
  this.rig.updateWorldMatrix(true,true);
 }
}
