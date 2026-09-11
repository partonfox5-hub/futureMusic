import * as THREE from 'three';
const clamp=THREE.MathUtils.clamp,V=()=>new THREE.Vector3(),CHAINS=20,LEVELS=7,COUNT=CHAINS*LEVELS,MAX_CAPS=32;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const normal=V();
// Capsule projection is shared by the guide test / solver. Contacts are resolved
// AFTER shape constraints, so the rest-shape clamp cannot undo hand collision.
export function projectHairPoint(p,c,margin=0){
 const dx=c.b.x-c.a.x,dy=c.b.y-c.a.y,dz=c.b.z-c.a.z;
 const t=clamp(((p.x-c.a.x)*dx+(p.y-c.a.y)*dy+(p.z-c.a.z)*dz)/Math.max(1e-10,dx*dx+dy*dy+dz*dz),0,1);
 const x=c.a.x+dx*t,y=c.a.y+dy*t,z=c.a.z+dz*t,nx=p.x-x,ny=p.y-y,nz=p.z-z,length=Math.hypot(nx,ny,nz),r=c.r+margin;
 if(length>=r)return false;
 if(length<1e-7)normal.set(0,0,-1);else normal.set(nx/length,ny/length,nz/length);
 p.set(x+normal.x*r,y+normal.y*r,z+normal.z*r);return true;
}
export class HairGuides {
 constructor(actor,hits,mode='advanced'){
  this.actor=actor;this.hits=hits;this.acc=0;this.ready=false;this.uniform=Array.from({length:COUNT},V);this.chains=[];this.capsules=[];this.previousCaps=[];
  this.capsA=Array.from({length:MAX_CAPS},()=>new THREE.Vector4());this.capsB=Array.from({length:MAX_CAPS},()=>new THREE.Vector4());this.capCount={value:0};
  actor.root.traverse(o=>{if(o.isSkinnedMesh&&/hair/i.test(o.name))this.mesh=o;});if(!this.mesh)return;
  const mesh=this.mesh,old=mesh.geometry;this.source=old.clone();mesh.geometry=this.source;this.refToHead=actor.bones.Head.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
  this.originalCompile=mesh.material.onBeforeCompile;this.originalKey=mesh.material.customProgramCacheKey;this.originalRoughness=mesh.material.roughness;
  this.originalAlphaTest=mesh.material.alphaTest;this.originalA2C=!!mesh.material.alphaToCoverage;this.originalTransparent=!!mesh.material.transparent;this.originalAlphaHash=!!mesh.material.alphaHash;
  this.setMode(mode);
 }
 setMode(mode){
  this.mode=mode==='classic'?'classic':'advanced';if(!this.mesh)return;
  const m=this.mesh.material;
  if(this.mode==='classic'){
   if(this.mesh.geometry!==this.source)this.advancedGeometry=this.mesh.geometry;
   this.mesh.geometry=this.source;m.roughness=this.originalRoughness;m.onBeforeCompile=this.originalCompile;m.customProgramCacheKey=this.originalKey;
   m.alphaTest=this.originalAlphaTest;m.alphaToCoverage=this.originalA2C;m.transparent=this.originalTransparent;m.alphaHash=this.originalAlphaHash;m.depthWrite=true;
   this.mesh.visible=this.actor.hairStyle!==9;this.reset();
  }else{
   if(this.advancedGeometry){this.mesh.geometry=this.advancedGeometry;this.advancedGeometry=null;}
   this.setStyle(this.actor.hairStyle||0);m.roughness=.46;m.onBeforeCompile=s=>this.installShader(s);m.customProgramCacheKey=()=> 'mira-hair-r12.9-kajiya-clip';
   // Alpha-hash dither reads as frizz/fuzz, especially on Quest with MSAA off.
   m.transparent=false;m.alphaTest=.40;m.alphaToCoverage=false;m.alphaHash=false;m.depthWrite=true;
  }
  m.needsUpdate=true;
 }
 disposeInactive(){if(this.mesh?.geometry!==this.source)this.source?.dispose();if(this.advancedGeometry&&this.advancedGeometry!==this.mesh?.geometry)this.advancedGeometry.dispose();}

 setStyle(style){
  if(!this.mesh)return;if(this.mode==='classic'){this.mesh.visible=style!==9;return;}style=clamp(style|0,0,10);this.style=style;this.mesh.visible=style!==9;
  const compact=style>=4,bun=style===4||style===7,layers=compact?1:2,old=this.source,count=old.attributes.position.count;
  const ring=48,rows=12,bunCount=bun?(ring+1)*(rows+1):0,total=count*layers+bunCount;
  const g=old.clone();g.clearGroups();g.morphAttributes={};
  for(const [name,a] of Object.entries(old.attributes)){
   const values=new a.array.constructor(total*a.itemSize);
   for(let layer=0;layer<layers;layer++)values.set(a.array,layer*a.array.length);
   g.setAttribute(name,new THREE.BufferAttribute(values,a.itemSize,a.normalized));
  }
  const indices=[];for(let layer=0;layer<layers;layer++)for(const index of old.index.array)indices.push(index+layer*count);
  if(bun)for(let a=0;a<ring;a++)for(let b=0;b<rows;b++){const i=count*layers+a*(rows+1)+b;indices.push(i,i+1,i+rows+2,i,i+rows+2,i+rows+1);}
  g.setIndex(indices);g.setAttribute('v2HairCoord',new THREE.BufferAttribute(new Float32Array(total*2),2));
  if(this.mesh.geometry!==old)this.mesh.geometry.dispose();this.mesh.geometry=g;
  const attr=g.attributes.position,norm=g.attributes.normal,src=old.attributes.position,srcN=old.attributes.normal;
  let low=Infinity;
  for(let i=0;i<count*layers;i++){
   const j=i%count,x=src.getX(j),y=src.getY(j),z=src.getZ(j),w=smooth((1.665-y)/.17),layer=i>=count?.0016:0;
   let xx=x*(1+.32*w),yy=y,zz=-.045+(z+.045)*(1+.32*w);
   if(style===0||style===3)yy-=.22*smooth((1.58-y)/.18);
   if(style===1){
    yy-=.10*smooth((1.57-y)/.18);
    const bang=smooth((z-.008)/.055)*smooth((1.63-y)/.16)*(1-smooth((Math.abs(x)-.075)/.055));
    yy-=.010*bang;const curtain=smooth((z+.008)/.05)*smooth((1.635-y)/.10);xx=xx*(1-curtain)+Math.sign(x-.005)*Math.max(Math.abs(xx),.102+.012*w)*curtain;zz-=.025*curtain;xx+=Math.sin(y*43+Math.sign(x)*1.7)*.006*w;
   }
   if(style===2){yy+=.012*w;xx*=1+.08*w;}
   if(style===3){const back=smooth((1.59-y)/.23);xx*=1-.55*back;zz-=.11*back;}
   if(compact){
    // One actual card layer; compact cuts no longer retain the doubled long groom.
    const compression=style===8?.24:style===10?.41:style===5?.49:style===6?.70:.43;
    yy=1.650-(1.650-y)*compression;xx=x*(style===6?1.02:.96);zz=-.025+(z+.025)*(style===6?.94:.85);
    if(style===10)xx+=.009*w;
    if(bun){const lower=smooth((1.60-y)/.15);zz-=.018*lower;}
   }
   attr.setXYZ(i,xx+srcN.getX(j)*layer*w,yy+srcN.getY(j)*layer*w,zz+srcN.getZ(j)*layer*w);
   norm.setXYZ(i,srcN.getX(j),srcN.getY(j),srcN.getZ(j));
   low=Math.min(low,V().fromBufferAttribute(attr,i).applyMatrix4(this.refToHead).y);
  }
  if(bun){
   const center=new THREE.Vector3(0,style===7?1.663:1.545,style===7?-.077:-.141),base=count*layers;
   const si=g.attributes.skinIndex,sw=g.attributes.skinWeight,uv=g.attributes.uv;
   for(let a=0;a<=ring;a++)for(let b=0;b<=rows;b++){
    const u=a/ring*Math.PI*2,v=b/rows*Math.PI*2,major=style===7?.030:.029,tube=.014;
    const i=base+a*(rows+1)+b,r=major+tube*Math.cos(v);
    attr.setXYZ(i,center.x+r*Math.cos(u),center.y+r*Math.sin(u),center.z+tube*Math.sin(v));
    uv.setXY(i,.12+(a%6)/6*.17,b/rows);si.setXYZW(i,38,0,0,0);sw.setXYZW(i,1,0,0,0);
    low=Math.min(low,V().fromBufferAttribute(attr,i).applyMatrix4(this.refToHead).y);
   }
  }
  this.cardLayers=layers;this.compact=compact;
  attr.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
  const rootY=.028,span=Math.max(.13,rootY-low),samples=Array.from({length:CHAINS},()=>Array.from({length:LEVELS},()=>({sum:V(),n:0}))),coords=g.attributes.v2HairCoord;
  for(let i=0;i<attr.count;i++){
   const p=V().fromBufferAttribute(attr,i).applyMatrix4(this.refToHead),angle=(Math.atan2(p.x,p.z)+Math.PI)/(2*Math.PI)*CHAINS,t=clamp((rootY-p.y)/span,0,1)*(LEVELS-1);
   coords.setXY(i,angle,t);const sample=samples[Math.floor(angle)%CHAINS][Math.round(t)];sample.sum.add(p);sample.n++;
  }
  this.chains=[];
  for(let a=0;a<CHAINS;a++){
   const theta=(a+.5)/CHAINS*Math.PI*2-Math.PI,nodes=[];
   for(let j=0;j<LEVELS;j++){
    const sample=samples[a][j],rest=sample.n?sample.sum.divideScalar(sample.n):new THREE.Vector3(Math.sin(theta)*.115,rootY-j*span/(LEVELS-1),Math.cos(theta)*.115);
    const world=rest.clone().applyMatrix4(this.actor.bones.Head.matrixWorld);nodes.push({rest,p:world.clone(),prev:world.clone(),target:world.clone(),lambda:0});
   }
   this.chains.push(nodes);
  }
  coords.needsUpdate=true;this.reset();
 }
 installShader(shader){
  shader.uniforms.v2HairOffsets={value:this.uniform};shader.uniforms.v2HairCapsA={value:this.capsA};shader.uniforms.v2HairCapsB={value:this.capsB};shader.uniforms.v2HairCapCount=this.capCount;
  shader.vertexShader=`attribute vec2 v2HairCoord;
   varying vec3 vHairTangent;
   varying float vHairRoot;
   uniform vec3 v2HairOffsets[${COUNT}];
   uniform vec4 v2HairCapsA[${MAX_CAPS}];uniform vec4 v2HairCapsB[${MAX_CAPS}];uniform int v2HairCapCount;
   vec3 hairCurve(int chain,int j,float u){int base=chain*${LEVELS};vec3 a=v2HairOffsets[base+max(0,j-1)],b=v2HairOffsets[base+j],c=v2HairOffsets[base+j+1],d=v2HairOffsets[base+min(${LEVELS-1},j+2)];return .5*((2.0*b)+(-a+c)*u+(2.0*a-5.0*b+4.0*c-d)*u*u+(-a+3.0*b-3.0*c+d)*u*u*u);}
  `+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',`#include <skinning_vertex>
   float ha=mod(v2HairCoord.x,${CHAINS}.0);int ia=int(floor(ha));int ib=int(mod(float(ia)+1.0,${CHAINS}.0));
   float ht=clamp(v2HairCoord.y,0.0,${LEVELS-1}.0-0.001);int hj=int(floor(ht));float hf=fract(ht);
   vec3 da=hairCurve(ia,hj,hf);
   vec3 db=hairCurve(ib,hj,hf);
   float freeHair=smoothstep(0.0,0.50,ht);
   vec3 hp=(modelMatrix*vec4(transformed,1.0)).xyz+mix(da,db,fract(ha))*freeHair;
   // Guide interpolation alone lets cards pass between nodes. Project the final
   // rendered vertex against the same hand/body capsules, including fingers.
   if(freeHair>0.02){
    for(int hc=0;hc<${MAX_CAPS};hc++){
     if(hc>=v2HairCapCount)break;
     vec3 ab=v2HairCapsB[hc].xyz-v2HairCapsA[hc].xyz;
     float hu=clamp(dot(hp-v2HairCapsA[hc].xyz,ab)/max(dot(ab,ab),0.000001),0.0,1.0);
     vec3 center=v2HairCapsA[hc].xyz+hu*ab,hn=hp-center;float hd=length(hn),hr=v2HairCapsA[hc].w;
     if(hd<hr){vec3 outN=hd>0.000001?hn/hd:vec3(0.0,0.0,-1.0);hp+=outN*(hr-hd)*freeHair;}
    }
   }
   transformed=(inverse(modelMatrix)*vec4(hp,1.0)).xyz;
   vec3 hairAlong=hairCurve(ia,min(hj+1,${LEVELS-2}),hf)-hairCurve(ia,max(hj-1,0),hf);
   vHairTangent=normalize((modelViewMatrix*vec4(hairAlong,0.0)).xyz);
   vHairRoot=smoothstep(0.15,1.35,ht);`);
  shader.fragmentShader='varying vec3 vHairTangent;varying float vHairRoot;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec3 hairTuv=normalize(dFdx(vViewPosition)*dFdy(vMapUv.y)-dFdy(vViewPosition)*dFdx(vMapUv.y));
   vec3 hairT=normalize(length(vHairTangent)>0.04?vHairTangent:(length(hairTuv)>0.001?hairTuv:vec3(0.0,1.0,0.0)));
   vec3 hairV=normalize(-vViewPosition);
   float sinTV=sqrt(max(0.0,1.0-dot(hairT,hairV)*dot(hairT,hairV)));
   vec3 primary=vec3(0.78,0.70,0.62)*pow(sinTV,42.0);
   vec3 secondary=vec3(0.42,0.28,0.18)*pow(sinTV,7.0);
   outgoingLight+= (primary*0.32+secondary*0.18)*diffuseColor.rgb;
   outgoingLight*=mix(vec3(0.62,0.55,0.48),vec3(1.0),vHairRoot);
   #include <opaque_fragment>`);
 }
 reset(){this.ready=false;this.acc=0;this.previousCaps=[];this.uniform.forEach(v=>v.set(0,0,0));}
 tick(dt){
  if(!this.mesh||!dt)return;if(this.mode==='classic'){this.mesh.visible=this.actor.hairStyle!==9;return;}if(this.actor.hairStyle!==this.style)this.setStyle(this.actor.hairStyle);if(this.style===9)return;
  const wet=this.actor.h5Wetness?.hair||0;const head=this.actor.bones.Head,h=this.actor.shape.height,headPos=head.getWorldPosition(V()),flex=Math.min(.52,(this.actor.shape.hairMotion??.48))*(this.compact?.55:1)*.82;
  for(const chain of this.chains)for(const n of chain){n.target.copy(n.rest).applyMatrix4(head.matrixWorld);if(!this.ready||n.p.distanceTo(n.target)>.55*h){n.p.copy(n.target);n.prev.copy(n.target);}}
  const caps=[];
  for(const spec of this.hits){
   if(!['head','chest','arm','hand'].includes(spec.kind))continue;
   const bone=this.actor.bones[spec.name];if(!bone)continue;
   const a=new THREE.Vector3(...(spec.offset||[0,0,0])).applyMatrix4(bone.matrixWorld),b=spec.end&&this.actor.bones[spec.end]?this.actor.bones[spec.end].getWorldPosition(V()):a.clone();
   if(a.distanceTo(headPos)<.65*h)caps.push({a,b,r:spec.rad*h+.005*h,velocity:V(),hand:false,id:spec.name});
  }
  (this.actor.externalHands||[]).forEach((c,i)=>{if(c.a.distanceTo(headPos)<.65*h)caps.push({a:c.a.clone(),b:c.b.clone(),r:c.r+.006*h,velocity:c.velocity||V(),onContact:c.onContact,hand:true,id:'hand'+i});});
  // Prefer player fingers when both hands brush the same part of the hairstyle.
  caps.sort((a,b)=>Number(b.hand)-Number(a.hand)||a.a.distanceToSquared(headPos)-b.a.distanceToSquared(headPos));caps.splice(MAX_CAPS);
  // Body projection first, player contact last: a torso capsule must not undo
  // the visible response to the brushing hand.
  caps.sort((a,b)=>Number(a.hand)-Number(b.hand));
  this.capsules=caps;this.capCount.value=caps.length;
  caps.forEach((c,i)=>{this.capsA[i].set(c.a.x,c.a.y,c.a.z,c.r);this.capsB[i].set(c.b.x,c.b.y,c.b.z,0);});
  const old=new Map(this.previousCaps.map(c=>[c.id,c]));this.acc=Math.min(this.acc+dt,.05);const step=1/120,total=this.acc;
  const delta=V(),vel=V(),relative=V();
  while(this.acc+1e-9>=step){
   const alpha=clamp(1-(this.acc-step)/Math.max(total,step),0,1);
   // Interpolated colliders catch a hand that moves through a guide in one frame.
   const swept=caps.map(c=>{const p=old.get(c.id);return p&&p.a.distanceTo(c.a)<.25?{...c,a:p.a.clone().lerp(c.a,alpha),b:p.b.clone().lerp(c.b,alpha)}:c;});
   for(const chain of this.chains){
    chain[0].p.copy(chain[0].target);chain[0].prev.copy(chain[0].p);
    for(let j=1;j<LEVELS;j++){
     const n=chain[j];vel.subVectors(n.p,n.prev).multiplyScalar(Math.exp(-step*(5.2+4.5*(1-flex)+wet*5)));if(vel.length()>.022*h)vel.setLength(.022*h);
     n.prev.copy(n.p);n.p.add(vel);n.p.y-=(this.actor.world?.gravity??9.81)*step*step*(.55+wet*.12);
     n.p.lerp(n.target,1-Math.exp(-step*((j===1?8.4:j<4?3.1:1.7)*(1.2-flex*.5))));n.lambda=0;
    }
    for(let iter=0;iter<4;iter++){
     for(let j=1;j<LEVELS;j++){
      const a=chain[j-1],b=chain[j];delta.subVectors(b.p,a.p);const length=delta.length(),rest=a.target.distanceTo(b.target),compliance=(.0000003+flex*.000002)/(step*step),wa=j===1?0:1;
      if(length>1e-8){const dl=(-(length-rest)-compliance*b.lambda)/(wa+1+compliance);b.lambda+=dl;delta.multiplyScalar(dl/length);b.p.add(delta);if(wa)a.p.sub(delta);}
      delta.subVectors(b.p,b.target);const bound=h*(.035+.14*flex)*(j/(LEVELS-1));if(delta.length()>bound)b.p.copy(b.target).add(delta.setLength(bound));
     }
     for(let j=1;j<LEVELS;j++){
      const n=chain[j];
      for(const c of swept)if(projectHairPoint(n.p,c)){
       if(c.hand&&iter===3){
        c.onContact?.('hair',c.velocity.length(),.003);
        vel.subVectors(n.p,n.prev).divideScalar(step);relative.copy(vel).sub(c.velocity);
        relative.addScaledVector(normal,-Math.min(0,relative.dot(normal))).multiplyScalar(.45);
        vel.copy(c.velocity).add(relative);if(vel.length()>2.5)vel.setLength(2.5);n.prev.copy(n.p).addScaledVector(vel,-step);
       }
      }
      n.p.y=Math.max(this.actor.baseY+.014*h,n.p.y);
     }
    }
   }
   this.acc-=step;
  }
  for(let i=0;i<CHAINS;i++)for(let j=0;j<LEVELS;j++)this.uniform[i*LEVELS+j].subVectors(this.chains[i][j].p,this.chains[i][j].target);
  this.previousCaps=caps.map(c=>({...c,a:c.a.clone(),b:c.b.clone()}));this.ready=true;
 }
}
