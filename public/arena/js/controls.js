import * as T from '../vendor/three.module.js';
export function deadzone(value,size=.15){return Math.abs(value)<=size?0:Math.sign(value)*(Math.abs(value)-size)/(1-size);}
export function stick(gamepad){const a=gamepad?.axes||[];return a.length>=4?[deadzone(a[2]),deadzone(a[3])]:[deadzone(a[0]||0),deadzone(a[1]||0)];}
const a=new T.Vector3(),b=new T.Vector3(),q=new T.Quaternion(),up=new T.Vector3(0,1,0);
export function turnAroundHead(rig,camera,angle){
  camera.getWorldPosition(a);rig.rotation.y+=angle;rig.updateMatrixWorld(true);camera.getWorldPosition(b);rig.position.add(a.sub(b));rig.updateMatrixWorld(true);
}
export function clampRig(rig,camera,velocity,radius=40){
  camera.getWorldPosition(a);if(a.lengthSq()<=radius*radius)return false;b.copy(a).setLength(radius).sub(a);rig.position.add(b);velocity.multiplyScalar(.4);rig.updateMatrixWorld(true);return true;
}
export function controllerAim(controller,origin,direction){controller.getWorldPosition(origin);controller.getWorldQuaternion(q);direction.set(0,0,-1).applyQuaternion(q).normalize();}
export class QualityGovernor {
  constructor(){this.slow=0;this.fast=0;this.level=1;this.age=0;this.ema=0;this.frames=0;this.target=72;this.auto=true;}
  reset(){this.slow=0;this.fast=0;this.age=0;this.ema=0;this.frames=0;}
  sample(ms,dt){
    if(ms<=0||ms>100)return false;this.frames++;this.ema=this.ema?this.ema*.96+ms*.04:ms;this.age+=dt;
    if(!this.auto||this.age<4)return false;
    const budget=1000/this.target;
    if(this.ema>budget*1.22){this.slow+=dt;this.fast=0;}else if(this.ema<budget*1.07){this.fast+=dt;this.slow=Math.max(0,this.slow-dt);}else{this.slow=Math.max(0,this.slow-dt);this.fast=0;}
    if(this.slow>2.5&&this.level>0){this.level--;this.slow=0;this.fast=0;return true;}
    // Never upgrades to High automatically; avoids oscillation and thermal creep.
    if(this.fast>25&&this.level<1){this.level++;this.fast=0;return true;}return false;
  }
}
