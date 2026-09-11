import * as THREE from 'three';
import { clamp } from './Dog.js?v=18.0.0';
export class DogTail {
  constructor(model){
    this.model=model;this.amount=0;this.points=[];this.previous=[];this.lengths=[];this.accumulator=0;this.time=0;
    const names=Array.from({length:6},(_,i)=>`Tail${i}`),cat=model.species==='cat',p=names.map(n=>model.bind[n].toArray());p.push(cat?[0,.14,-.78]:[0,.155,-.65]);
    if(!model.breed)model.tube('tail',p,cat?[.028,.026,.022,.018,.014,.010,.004]:[.046,.043,.036,.030,.024,.016,.005],(x,y,z)=>{
      const u=clamp((-.35-z)/.30)*5,a=Math.floor(u),b=Math.min(5,a+1);return [[`Tail${a}`,1-(u-a)],[`Tail${b}`,u-a]];
    },model.coat,10,true);
    model.updatePoseWorld();
    this.bones=names.map(n=>model.bones[n]);this.rest=p.slice(0,6).map(a=>new THREE.Vector3(...a));
    for(let i=0;i<6;i++){const q=this.bones[i].getWorldPosition(new THREE.Vector3());this.points.push(q);this.previous.push(q.clone());if(i)this.lengths.push(this.rest[i].distanceTo(this.rest[i-1]));}
    this.anchor=this.points[0].clone();
  }
  tick(dt,time,amount=0,state='idle',mood={}){
    this.mood=mood;this.state=state;this.time=time;this.amount=clamp(amount);this.accumulator+=Math.min(dt,.1);
    const m=this.model;m.updatePoseWorld();
    const anchor=this.bones[0].getWorldPosition(new THREE.Vector3()),shift=anchor.clone().sub(this.anchor);
    // Teleports and host rig relocation must not fling a tail through the room.
    if(shift.length()>.20){for(let i=0;i<6;i++){this.points[i].add(shift);this.previous[i].copy(this.points[i]);}}
    this.anchor.copy(anchor);
    while(this.accumulator>=1/60){this.step(1/60,anchor,state);this.accumulator-=1/60;}
    // Convert world-space simulated segment directions back into local bone rotations.
    for(let i=0;i<5;i++){
      const bone=this.bones[i],rest=this.bones[i+1].position.clone().normalize();
      const direction=this.points[i+1].clone().sub(this.points[i]).normalize();
      direction.applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
      bone.quaternion.setFromUnitVectors(rest,direction);bone.updateWorldMatrix(false,true);
    }
    this.bones[5].quaternion.identity();
  }
  step(h,anchor,state){
    const root=this.model.root,amount=this.amount,alert=state==='alert',mood=this.mood||{},low=mood.sleepy||mood.hungry||state==='sleep'||state==='sit';this.points[0].copy(anchor);this.previous[0].copy(anchor);
    for(let i=1;i<6;i++){
      const p=this.points[i],old=p.clone(),v=p.clone().sub(this.previous[i]).multiplyScalar(.86);
      p.add(v);p.y-=9.8*.35*h*h;this.previous[i].copy(old);
      const target=this.rest[i].clone();const phase=this.time*(amount>.12?2.2:.9)*Math.PI*2-i*.23;
      target.x+=Math.sin(phase)*(.010+.063*amount)*(i/5);
      if(alert||mood.greeting)target.y+=.18*(i/5);
      if(low)target.y-=.07*(i/5);
      if(mood.hurt){target.y-=.1*(i/5);target.z+=.12*(i/5);}
      // Transform the groom target through the current Spine frame, including turn bend.
      target.sub(this.model.bind.Spine);target.applyMatrix4(this.model.bones.Spine.matrixWorld);p.lerp(target,alert?.30:.12);
    }
    const baseDirection=this.rest[1].clone().sub(this.rest[0]).normalize().transformDirection(this.model.bones.Spine.matrixWorld);
    for(let pass=0;pass<5;pass++){
      this.points[0].copy(anchor);let previousDir=baseDirection.clone();
      for(let i=1;i<6;i++){
        const a=this.points[i-1],p=this.points[i];let direction=p.clone().sub(a).normalize();
        const angle=previousDir.angleTo(direction),max=Math.PI/6;
        if(angle>max){const q=new THREE.Quaternion().setFromUnitVectors(previousDir,direction);q.slerp(new THREE.Quaternion(),1-max/angle);direction=previousDir.clone().applyQuaternion(q);}
        p.copy(a).addScaledVector(direction,this.lengths[i-1]);
        // Soft collision against the rear torso capsule, in dog-local coordinates.
        const local=root.worldToLocal(p.clone()),nearest=new THREE.Vector3(0,.45,clamp(local.z,-.28,.20));
        const delta=local.clone().sub(nearest),radius=.135;
        if(delta.length()<radius&&i>1){delta.normalize();local.copy(nearest).addScaledVector(delta,radius);p.lerp(root.localToWorld(local),.65);}
        p.y=Math.max(root.position.y+.018,p.y);previousDir=p.clone().sub(a).normalize();
      }
    }
  }
}
