import * as THREE from 'three';
import { clamp } from './Dog.js?v=12.1';
const vec=a=>new THREE.Vector3(...a);

export function floorAt(world,x,z,fallback=0) {
  if(!world)return fallback;
  try {
    if(typeof world.floorHeight==='function'){const y=world.floorHeight(x,z);if(Number.isFinite(y))return y;}
    else if(Number.isFinite(world.floorHeight))return world.floorHeight;
    if(typeof world.project==='function'){
      const point=new THREE.Vector3(x,fallback,z),r=world.project(point);
      const y=Number.isFinite(r)?r:(Array.isArray(r)?r[1]:(r?.y??r?.position?.y));
      if(Number.isFinite(y))return y;
      // Some host projectors mutate their argument instead of returning it.
      if(Number.isFinite(point.y))return point.y;
    }
  } catch(_){ /* Missing or differently shaped optional host floor API is harmless. */ }
  return fallback;
}

export class DogPaws {
  constructor(model,world){
    this.model=model;this.world=world;this.legs=[];
    const pad=model.material({color:0x29201b,roughness:.94}),claw=model.material({color:0x392f25,roughness:.68});this.padMaterial=pad;
    for(const s of ['L','R'])for(const front of [true,false]){
      const x=s==='L'?.115:-.115,upper=`${s}_${front?'UpperArm':'Thigh'}`,lower=`${s}_${front?'ForeArm':'Calf'}`,foot=`${s}_${front?'Paw':'Foot'}`;
      const a=model.bind[upper],b=model.bind[lower],c=model.bind[foot];
      model.tube(`${s}_${front?'foreleg':'hindleg'}`,[a.toArray(),a.clone().lerp(b,.45).toArray(),b.toArray(),b.clone().lerp(c,.55).toArray(),c.toArray()],front?[.052,.044,.028,.023,.025]:[.071,.060,.036,.025,.026],(xx,y,z)=>{
        const d=vec([xx,y,z]),t=clamp(d.clone().sub(b).dot(c.clone().sub(b))/b.distanceToSquared(c));
        return [[upper,1-t],[lower,t]];
      },model.coat,10,true);
      // The planted, cream-colored feet include toe lobes, pads and four short claws.
      const z=c.z+.029;
      model.ellipsoid('paws',[x,.046,z],[.044,.037,.070],foot,model.coat,'cream',12,7,true);
      for(let toe=0;toe<4;toe++){
        const dx=(toe-1.5)*.020,zz=z+.044-(Math.abs(toe-1.5)-.5)*.008;
        model.ellipsoid('toe',[x+dx,.036,zz],[.012,.021,.026],foot,model.coat,'cream',8,5);
        model.ellipsoid('claws',[x+dx,.021,zz+.023],[.004,.005,.012],foot,claw,'coat',7,4);
        model.ellipsoid('toe_pad',[x+dx,.012,zz-.004],[.008,.008,.013],foot,pad,'coat',7,4);
      }
      model.ellipsoid('paw_pad',[x,.010,z-.016],[.030,.009,.036],foot,pad,'coat',10,6);
      // A small carpal pad is visible on the back of each front ankle.
      if(front)model.ellipsoid('carpal_pad',[x,.090,c.z-.022],[.016,.016,.009],foot,pad,'coat',8,5);
      this.legs.push({upper:model.bones[upper],lower:model.bones[lower],foot:model.bones[foot],home:c.clone(),front,length1:a.distanceTo(b),length2:b.distanceTo(c)});
    }
  }
  tick(time,state,moving=0){
    const m=this.model;m.root.updateMatrixWorld(true);
    this.legs.forEach((leg,i)=>{
      const target=leg.home.clone();
      // Compact alternating step only when follow movement is active.
      const phase=time*7+(i===0||i===3?0:Math.PI),lift=Math.max(0,Math.sin(phase))*.033*moving;
      target.z+=Math.cos(phase)*.045*moving;
      if(state==='sit'&&!leg.front){target.z+=.07;target.x*=1.08;}
      target.applyMatrix4(m.root.matrixWorld);target.y=floorAt(this.world,target.x,target.z,m.root.position.y)+leg.home.y+lift;
      this.solve(leg,target);
    });
  }
  solve(leg,target){
    const {upper,lower,foot,length1:a,length2:b}=leg;
    const hip=upper.getWorldPosition(new THREE.Vector3()),d=target.clone().sub(hip),raw=d.length();if(raw<1e-6)return;
    const length=clamp(raw,Math.abs(a-b)+.0001,a+b-.0001);d.divideScalar(raw);
    const pole=new THREE.Vector3(0,0,leg.front?-1:1).transformDirection(this.model.root.matrixWorld);pole.addScaledVector(d,-pole.dot(d)).normalize();
    const along=(a*a-b*b+length*length)/(2*length),height=Math.sqrt(Math.max(0,a*a-along*along));
    const knee=hip.clone().addScaledVector(d,along).addScaledVector(pole,height);
    const aim=(bone,rest,to)=>{
      const q=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      bone.quaternion.setFromUnitVectors(rest.clone().normalize(),to.clone().normalize().applyQuaternion(q));bone.updateWorldMatrix(false,true);
    };
    aim(upper,lower.position,knee.clone().sub(hip));
    aim(lower,foot.position,target.clone().sub(lower.getWorldPosition(new THREE.Vector3())));
    // Counterrotate the foot so pads remain on the floor even during hip sway.
    const parentQ=foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const yawQ=this.model.root.getWorldQuaternion(new THREE.Quaternion());foot.quaternion.copy(parentQ.multiply(yawQ));foot.updateWorldMatrix(false,true);
  }
}
