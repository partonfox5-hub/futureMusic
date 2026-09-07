import * as THREE from 'three';
import { clamp } from './Dog.js?v=12.1';
import { floorAt } from './DogPaws.js?v=12.1';
export class DogAI {
  constructor(model,ctx){this.model=model;this.ctx=ctx;this.follow=false;this.state='idle';this.speed=0;this.target=new THREE.Vector3();this.q=new THREE.Quaternion();}
  tick(dt){
    const actor=(this.ctx.mira||this.ctx.system)?.actors?.[0],group=actor?.group;
    this.speed=0;const m=this.model;
    if(!group){m.bones.Head.rotation.y*=Math.exp(-dt*4);m.bones.Neck.rotation.y*=Math.exp(-dt*4);return;}
    group.getWorldPosition?.(this.target)||this.target.copy(group.position||new THREE.Vector3());
    const local=m.root.worldToLocal(this.target.clone()),distance=m.root.getWorldPosition(new THREE.Vector3()).distanceTo(this.target);
    const neckYaw=distance<3?clamp(Math.atan2(local.x,local.z),-.60,.60):0;
    m.bones.Neck.rotation.y=THREE.MathUtils.damp(m.bones.Neck.rotation.y,neckYaw*.40,4,dt);
    m.bones.Head.rotation.y=THREE.MathUtils.damp(m.bones.Head.rotation.y,neckYaw*.60,4,dt);
    m.bones.Head.rotation.x=THREE.MathUtils.damp(m.bones.Head.rotation.x,distance<3?clamp(-Math.atan2(local.y-.76,Math.hypot(local.x,local.z)),-.24,.22):0,4,dt);
    if(this.follow&&this.state!=='sit'){
      const yaw=group.getWorldQuaternion?new THREE.Euler().setFromQuaternion(group.getWorldQuaternion(this.q),'YXZ').y:group.rotation?.y||0;
      const goal=this.target.clone().add(new THREE.Vector3(.85,0,.15).applyAxisAngle(new THREE.Vector3(0,1,0),yaw));
      if(m.root.parent)m.root.parent.worldToLocal(goal);
      const d=goal.clone().sub(m.root.position);d.y=0;const length=d.length();
      if(length>.20){this.speed=Math.min(.58,(length-.20)*1.1);m.root.position.addScaledVector(d,this.speed*dt/length);const desired=Math.atan2(d.x,d.z);const delta=Math.atan2(Math.sin(desired-m.root.rotation.y),Math.cos(desired-m.root.rotation.y));m.root.rotation.y+=delta*Math.min(1,dt*3);}
      const wp=m.root.getWorldPosition(new THREE.Vector3());m.root.position.y=floorAt(this.ctx.world,wp.x,wp.z,m.root.position.y);
    }
  }
}
