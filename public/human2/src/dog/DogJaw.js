import * as THREE from 'three';
import { clamp } from './Dog.js?v=12.1';

export class DogJaw {
  constructor(model){
    this.model=model;this.manual=0;this.value=0;this.barkAge=Infinity;this.peak=.7;
    const gum=model.material({color:0x35201e,roughness:.65}),tooth=model.material({color:0xdbd1b4,roughness:.40});
    model.ellipsoid('mouth',[0,.688,.535],[.052,.016,.070],'Head',gum,'coat',12,6);
    this.mesh=model.ellipsoid('jaw',[0,.666,.524],[.053,.025,.076],'Jaw',model.coat,'muzzle',14,7);
    const g=this.mesh.geometry,pos=g.getAttribute('position'),delta=new Float32Array(pos.count*3);
    for(let i=0;i<pos.count;i++)delta[i*3+1]=-.003*clamp((pos.getZ(i)-.45)/.12);
    const morph=new THREE.Float32BufferAttribute(delta,3);morph.name='Jaw_Open';g.morphAttributes.position=[morph];g.morphTargetsRelative=true;this.mesh.updateMorphTargets();
    model.ellipsoid('tongue',[0,.684,.545],[.026,.008,.042],'Jaw',model.material({color:0xb9797b,roughness:.46}),'coat',10,6);
    for(const s of [-1,1])for(const z of [.475,.515,.561]){
      model.ellipsoid('teeth',[s*.037,.686,z],[.005,.011,.006],'Jaw',tooth,'coat',7,4);
      model.ellipsoid('teeth',[s*.037,.692,z],[.005,.010,.006],'Head',tooth,'coat',7,4);
    }
  }
  set(t){this.manual=clamp(t);this.barkAge=Infinity;this.apply(this.manual);}
  bark(){this.barkAge=0;this.peak=.55+Math.random()*.30;}
  apply(t){this.value=t;this.model.bones.Jaw.rotation.x=t*.32;this.mesh.morphTargetInfluences[0]=t;}
  tick(dt){
    this.barkAge+=dt;let v=this.manual,t=this.barkAge;
    if(t<.2)v=this.peak*(t/.2);else if(t<.32)v=this.peak;else if(t<.57)v=this.peak*(1-(t-.32)/.25);
    this.apply(clamp(v));
  }
}
