import * as THREE from 'three';
const clamp=THREE.MathUtils.clamp, V=()=>new THREE.Vector3();
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// Small compliant surface guides supplement the breast / glute attachment bones.
// They are secondary motion, not a volumetric FEM or incompressible fluid solver.
export class SurfaceFlesh {
 constructor(actor){
  this.actor=actor;this.acc=0;this.offsets=Array.from({length:5},V);
  this.guides=['Waist','L_Thigh','R_Thigh','Head','Head'].map(name=>({name,p:V(),v:V(),last:V(),lastV:V(),a:V(),ready:false}));
  const shared=new Map();
  actor.root.traverse(mesh=>{
   if(!mesh.isSkinnedMesh||!/^body/.test(mesh.name))return;
   const g=mesh.geometry,p=g.attributes.position;let attrs=shared.get(p);
   if(!attrs){
    const record=actor.deform.find(d=>d.position===p),base=record?.base||p.array,a=new Float32Array(p.count*3),b=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){
     const [x,y,z]=base.subarray(i*3,i*3+3),front=smooth((z+.015)/.06);
     a[i*3]=(1-smooth(((y-1.045)/.125)**2))*smooth((Math.abs(x)-.012)/.065)*(1-smooth((Math.abs(x)-.14)/.065));
     const thigh=(1-smooth(((y-.65)/.13)**2))*smooth((Math.abs(x)-.04)/.07)*(1-smooth((Math.abs(x)-.16)/.07));
     a[i*3+1]=x>0?thigh:0;a[i*3+2]=x<0?thigh:0;
     for(let side=0;side<2;side++){const cx=side===0?.049:-.049;const rr=((x-cx)/.035)**2+((y-1.499)/.027)**2;b[i*2+side]=(1-smooth(rr))*front;}
    }
    attrs=[new THREE.BufferAttribute(a,3),new THREE.BufferAttribute(b,2)];shared.set(p,attrs);
   }
   g.setAttribute('v2FleshA',attrs[0]);g.setAttribute('v2FleshB',attrs[1]);
   mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:mesh.material.alphaTest>0?mesh.material.map:null,alphaTest:mesh.material.alphaTest||0,side:mesh.material.side});
   mesh.customDepthMaterial.onBeforeCompile=shader=>this.installShader(shader);
   mesh.customDepthMaterial.customProgramCacheKey=()=> 'mira-flesh-depth-r5';
  });
 }
 installShader(shader){
  if(shader.vertexShader.includes('uniform vec3 v2FleshOffset'))return;
  shader.uniforms.v2FleshOffset={value:this.offsets};
  shader.vertexShader='attribute vec3 v2FleshA;\nattribute vec2 v2FleshB;\nuniform vec3 v2FleshOffset[5];\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',`#include <skinning_vertex>
   vec3 fleshDelta=v2FleshA.x*v2FleshOffset[0]+v2FleshA.y*v2FleshOffset[1]+v2FleshA.z*v2FleshOffset[2]+v2FleshB.x*v2FleshOffset[3]+v2FleshB.y*v2FleshOffset[4];
   transformed+=inverse(mat3(modelMatrix))*fleshDelta;`);
 }
 contact(hit,normal,closing,push){
  const indices=hit.kind==='head'?[3,4]:hit.kind==='thigh'?[hit.name.startsWith('L_')?1:2]:['belly','hip'].includes(hit.kind)?[0]:[];
  for(const i of indices){const g=this.guides[i],amount=Math.min(i>=3?.045:.20,closing*.055+push*.15);g.v.addScaledVector(normal,-amount);}
 }
 reset(){this.acc=0;this.guides.forEach(g=>{g.ready=false;g.p.set(0,0,0);g.v.set(0,0,0);});this.offsets.forEach(v=>v.set(0,0,0));}
 tick(dt){
  if(!dt)return;const actor=this.actor,shape=actor.shape,h=shape.height;
  for(const g of this.guides){
   const bone=actor.bones[g.name],pos=bone.getWorldPosition(V()),vel=pos.clone().sub(g.last).divideScalar(dt);
   if(!g.ready||pos.distanceTo(g.last)>.3){g.a.set(0,0,0);g.lastV.set(0,0,0);g.ready=true;}
   else{g.a.copy(vel).sub(g.lastV).divideScalar(dt);if(g.a.length()>25)g.a.setLength(25);g.lastV.copy(vel);}
   g.last.copy(pos);
  }
  this.acc=Math.min(.05,this.acc+dt);const step=1/120;
  while(this.acc+1e-9>=step){
   for(let i=0;i<5;i++){
    const g=this.guides[i],face=i>=3,soft=face?shape.faceSoftness:shape.bodySoftness;
    const held=[...actor.grabs.values()].some(gr=>face?gr.head:i===0?!gr.limb:gr.limb==='leg'&&gr.side===(i===1?'L':'R'));
    const omega=2*Math.PI*(face?6.5:4.2)/(1+.65*soft),k=omega*omega,d=2*omega*(held?1:.20+.6*shape.damping);
    const gain=held?0:soft*actor.jiggleAmt()*(face?.09:.28);
    for(const axis of ['x','y','z']){g.v[axis]=(g.v[axis]+step*(-g.a[axis]*gain-k*g.p[axis]))/(1+d*step+k*step*step);g.p[axis]+=g.v[axis]*step;}
    const max=h*soft*(face?.0025:.013);if(g.p.length()>max){g.p.setLength(max);g.v.multiplyScalar(.4);}
   }
   this.acc-=step;
  }
  this.guides.forEach((g,i)=>this.offsets[i].copy(g.p));
 }
}
