import * as THREE from 'three';
import { clamp } from './Dog.js?v=20.3.0';
const vec=a=>new THREE.Vector3(...a),floorPoint=new THREE.Vector3();

export function floorAt(world,x,z,fallback=0) {
  if(!world)return fallback;
  try {
    if(typeof world.floorHeight==='function'){
      const y=world.floorHeight(floorPoint.set(x,fallback,z),.2);
      if(Number.isFinite(y))return y;
    }
    else if(Number.isFinite(world.floorHeight))return world.floorHeight;
    if(typeof world.project==='function'){
      const point=floorPoint.set(x,fallback,z),r=world.project(point);
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
    this.model=model;this.world=world;this.legs=[];this.scratch=Object.fromEntries(['target','rest','direction','hip','pole','knee','point','aim'].map(k=>[k,new THREE.Vector3()]));this.parentQ=new THREE.Quaternion();this.aimQ=new THREE.Quaternion();this.yawQ=new THREE.Quaternion();
    const pad=model.material({color:0x29201b,roughness:.94}),claw=model.material({color:0x392f25,roughness:.68});this.padMaterial=pad;
    for(const s of ['L','R'])for(const front of [true,false]){
      const cat=model.species==='cat',thin=cat?.72:1,x=s==='L'?.115:-.115,upper=`${s}_${front?'UpperArm':'Thigh'}`,lower=`${s}_${front?'ForeArm':'Calf'}`,foot=`${s}_${front?'Paw':'Foot'}`;
      const shoulder=model.bind[front?`${s}_Shoulder`:`${s}_Hip`];
      const a=model.bind[upper],b=model.bind[lower],c=model.bind[foot];
      if(!model.breed){model.tube(`${s}_${front?'foreleg':'hindleg'}`,[a.toArray(),a.clone().lerp(b,.45).toArray(),b.toArray(),b.clone().lerp(c,.55).toArray(),c.toArray()],(front?[.052,.044,.028,.023,.025]:[.071,.060,.036,.025,.026]).map(r=>r*thin),(xx,y,z)=>{
        const d=vec([xx,y,z]),t=clamp(d.clone().sub(b).dot(c.clone().sub(b))/b.distanceToSquared(c));
        return [[upper,1-t],[lower,t]];
      },model.coat,10,true);
      // The planted, cream-colored feet include toe lobes, pads and four short claws.
      const z=c.z+.029,ps=cat?.78:1;
      model.ellipsoid('paws',[x,.046,z],[.044*ps,.037*ps,.070*ps],foot,model.coat,'cream',12,7,true);
      for(let toe=0;toe<4;toe++){
        const dx=(toe-1.5)*.020*ps,zz=z+.044*ps-(Math.abs(toe-1.5)-.5)*.008;
        model.ellipsoid('toe',[x+dx,.036,zz],[.012*ps,.021*ps,.026*ps],foot,model.coat,'cream',8,5);
        model.ellipsoid('claws',[x+dx,.021,zz+.023*ps],[.004*ps,.005*ps,.012*ps],foot,claw,'coat',7,4);
        model.ellipsoid('toe_pad',[x+dx,.012,zz-.004],[.008*ps,.008*ps,.013*ps],foot,pad,'coat',7,4);
      }
      model.ellipsoid('paw_pad',[x,.010,z-.016],[.030*ps,.009*ps,.036*ps],foot,pad,'coat',10,6);
      // A small carpal pad is visible on the back of each front ankle.
      if(front)model.ellipsoid('carpal_pad',[x,.090,c.z-.022],[.016,.016,.009],foot,pad,'coat',8,5);
      }
      this.legs.push({holdKey:s+'_'+(front?'front':'hind'),root:model.bones[front?`${s}_Shoulder`:`${s}_Hip`],upper:model.bones[upper],lower:model.bones[lower],foot:model.bones[foot],home:c.clone(),front,length1:a.distanceTo(b),length2:b.distanceTo(c),reach:shoulder.distanceTo(c)});
    }
  }
  tick(time,state,moving=0,bend=0,run=0){
    this.crouching=state==='sleep'||state==='eat'||state==='pickup'||state==='eat-bag';const m=this.model;m.updatePoseWorld();
    if(m.root.userData.waterSwimming)return;
    const held=m.root.userData.dog?._heldLimbs;
    for(let i=0;i<this.legs.length;i++){const leg=this.legs[i];
      if(held&&held.has(leg.holdKey))continue;
      const target=this.scratch.target.copy(leg.home);
      // Compact alternating step only when follow movement is active.
      const s=m.root.scale.y||1,walkPhase=i===0||i===3?0:Math.PI,runPhase=leg.front?(i<2?0:.48):Math.PI+(i<2?0:.48),phase=time*8.2*(m.breed?.gait||1)+walkPhase*(1-run)+runPhase*run,lift=Math.max(0,Math.sin(phase))*(.065+.08*run)*moving;
      target.z+=Math.cos(phase)*(.11+.08*run)*moving;
      // Feet straddle the curved centerline sampled at each fore/hind contact.
      target.x+=Math.sin(bend)*target.z*.34;
      if(state==='sleep'){target.z+=leg.front?.09:.15;target.x*=1.15;}
      if(state==='sit'&&!leg.front){target.z+=.18;target.y+=.04;target.x*=1.12;}
      if(state==='sit'&&leg.front){target.z+=.04;}
      target.applyMatrix4(m.root.matrixWorld);target.y=floorAt(this.world,target.x,target.z,m.root.position.y)+leg.home.y*s+lift*s;
      this.solve(leg,target);
    }
  }
  solve(leg,target){
    const s=this.model.root.scale.y||1,{upper,lower,foot,length1,length2,root}=leg,a=length1*s,b=length2*s;
    const {rest,direction,hip,pole,knee,point,aim}=this.scratch,q=this.parentQ;
    if(root){
      root.getWorldPosition(point);aim.copy(target).sub(point).normalize();root.parent.getWorldQuaternion(q).invert();aim.applyQuaternion(q);rest.copy(upper.position).normalize();
      if(this.crouching&&!leg.front)root.rotation.set(-1.0,0,0);
      else if(aim.lengthSq()>.01)root.quaternion.slerp(this.aimQ.setFromUnitVectors(rest,aim),.35);
      root.updateWorldMatrix(false,true);
    }
    upper.getWorldPosition(hip);direction.copy(target).sub(hip);const raw=direction.length();if(raw<1e-6)return;
    const length=clamp(raw,Math.abs(a-b)+.0001,a+b-.0001);direction.divideScalar(raw);
    pole.set(0,this.crouching?1:(leg.front?.25:-.15),leg.front?-1:1).transformDirection(this.model.root.matrixWorld);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
    const along=(a*a-b*b+length*length)/(2*length),height=Math.sqrt(Math.max(0,a*a-along*along));
    knee.copy(hip).addScaledVector(direction,along).addScaledVector(pole,height);
    aim.copy(knee).sub(hip);this.aimBone(upper,lower.position,aim);
    lower.getWorldPosition(point);aim.copy(target).sub(point);this.aimBone(lower,foot.position,aim);
    foot.parent.getWorldQuaternion(q).invert();this.model.root.getWorldQuaternion(this.yawQ);foot.quaternion.copy(q.multiply(this.yawQ));foot.updateWorldMatrix(false,true);
  }
  aimBone(bone,rest,to){
    const q=bone.parent.getWorldQuaternion(this.parentQ).invert();
    bone.quaternion.setFromUnitVectors(this.scratch.rest.copy(rest).normalize(),to.normalize().applyQuaternion(q));bone.updateWorldMatrix(false,true);
  }
}
