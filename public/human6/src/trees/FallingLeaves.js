import * as T from 'three';
import {random,SPECIES} from './TreeGeometry.js?v=19.1.0';
export class FallingLeaves {
 constructor(field,root,{capacity=48,rate=2,seed=44}={}){
  this.field=field;this.capacity=Math.max(0,Math.min(128,capacity|0));this.rate=rate;this.random=random(seed);this.pool=Array.from({length:this.capacity},()=>({active:false,p:new T.Vector3(),v:new T.Vector3(),q:new T.Vector3(),age:0,grounded:0,size:1}));this.emit=0;this.time=0;this.dummy=new T.Object3D();
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.035,.035,0,0,.045,.012,.035,.035,0,0,.095,0],3));g.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);g.computeVertexNormals();
  this.material=new T.MeshStandardMaterial({color:0xaaa04e,roughness:.87,side:T.DoubleSide});this.mesh=new T.InstancedMesh(g,this.material,Math.max(1,this.capacity));this.mesh.count=0;this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.raycast=()=>{};this.mesh.name='Bounded falling leaf pool';root.add(this.mesh);
 }
 tick(dt,viewer,trees){
  dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.emit+=dt*this.rate;
  const eligible=trees.filter(t=>SPECIES[t.species].deciduous&&Math.hypot(t.x-viewer.x,t.z-viewer.z)<24);
  if(this.emit>=1){this.emit=0;const slot=this.pool.find(p=>!p.active);if(slot&&eligible.length){const t=eligible[Math.floor(this.random()*eligible.length)],tips=t.tips,tip=tips[Math.floor(this.random()*tips.length)];
   slot.p.fromArray(tip).multiply(t.scaleXYZ).applyAxisAngle(new T.Vector3(0,1,0),t.yaw).add(new T.Vector3(t.x,t.y,t.z));slot.v.set((this.random()-.5)*.24,-.25,(this.random()-.5)*.24);slot.q.set(this.random()*6,this.random()*6,this.random()*6);slot.age=slot.grounded=0;slot.size=.65+this.random()*.7;slot.active=true;
  }}
  let n=0;const d=this.dummy;
  for(const p of this.pool){if(!p.active)continue;p.age+=dt;const ground=this.field.heightAt(p.p.x,p.p.z);if(ground==null||p.age>22||p.grounded>4||p.p.distanceToSquared(viewer)>1600){p.active=false;continue;}
   if(!p.grounded){p.v.y=Math.max(-.65,p.v.y-dt*.24);p.p.x+=dt*(p.v.x+Math.sin(this.time*2.6+p.q.x)*.23+.14);p.p.z+=dt*(p.v.z+Math.cos(this.time*2.0+p.q.y)*.20);p.p.y+=p.v.y*dt;p.q.x+=dt*1.8;p.q.z+=dt*2.1;if(p.p.y<=ground+.016){p.p.y=ground+.016;p.grounded=.001;}}
   else p.grounded+=dt;
   d.position.copy(p.p);d.rotation.set(p.grounded?-Math.PI/2:p.q.x,p.q.y,p.grounded?0:p.q.z);d.scale.setScalar(p.size*(p.grounded>3?Math.max(0,4-p.grounded):1));d.updateMatrix();this.mesh.setMatrixAt(n++,d.matrix);
  }
  this.mesh.count=n;this.mesh.visible=n>0;if(n){this.mesh.instanceMatrix.needsUpdate=true;this.mesh.computeBoundingSphere();}
 }
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.material.dispose();}
}
