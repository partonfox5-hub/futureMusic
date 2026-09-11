import * as T from 'three';
// Mira water 12.8: bounded visual streams, conserved 0D reservoirs, analytic waves.
// No render targets, external assets, runtime texture painting, or host monkey patches.
const G=9.81,RHO=998,TAU=Math.PI*2,clamp=T.MathUtils.clamp;
const QUEST=typeof navigator!=='undefined'&&/Quest|OculusBrowser/i.test(navigator.userAgent);
const vec=(p=[0,0,0])=>p?.isVector3?p.clone():new T.Vector3(...(Array.isArray(p)?p:[p.x||0,p.y||0,p.z||0]));
const finite=(v,d=0)=>Number.isFinite(v)?v:d;
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return !!o;};
const worldPos=o=>o.getWorldPosition(new T.Vector3());
function moveWorld(o,d){o.updateWorldMatrix(true,false);const p=worldPos(o).add(d);o.position.copy(o.parent?o.parent.worldToLocal(p):p);o.updateWorldMatrix(true,true);}
function boxOf(b){return b?.isBox3?b.clone():new T.Box3(vec(b?.min||[-.25,0,-.25]),vec(b?.max||[.25,.4,.25]));}
const WAVE_GLSL=`
uniform float waterTime; uniform int waterCount;
uniform vec4 waterWaves[6]; uniform vec2 waterPhase[6]; uniform mat4 waterInverse;
varying vec3 vWaterWorld;
void waterWave(vec2 p,out vec3 off,out vec3 n){
 off=vec3(0.0);vec3 tx=vec3(1.0,0.0,0.0),tz=vec3(0.0,0.0,1.0);
 for(int i=0;i<6;i++){if(i>=waterCount)break;
  vec2 d=waterWaves[i].xy;float a=waterWaves[i].z,k=waterWaves[i].w;
  float theta=k*dot(d,p)-sqrt(9.81*k)*waterTime+waterPhase[i].x;
  float s=sin(theta),c=cos(theta),q=waterPhase[i].y;
  off+=vec3(q*a*d.x*c,a*s,q*a*d.y*c);
  tx+=vec3(-q*a*k*d.x*d.x*s,a*k*d.x*c,-q*a*k*d.y*d.x*s);
  tz+=vec3(-q*a*k*d.x*d.y*s,a*k*d.y*c,-q*a*k*d.y*d.y*s);
 }n=normalize(cross(tz,tx));
}`;
function waveSet(kind,quest){
 const n=quest?3:6,amp=kind==='lake'?.12:kind==='river'?.03:kind==='puddle'?.001:.04;
 return Array.from({length:n},(_,i)=>{const a=.45+i*1.91;return {dx:Math.cos(a),dz:Math.sin(a),a:amp*Math.pow(.48,i)/1.91,k:TAU/((kind==='lake'?5:kind==='river'?1.6:1.4)*Math.pow(.64,i)),phase:i*2.17,q:.22};});
}
function waveAt(waves,x,z,time){let dx=0,dy=0,dz=0;for(const w of waves){const a=w.k*(w.dx*x+w.dz*z)-Math.sqrt(G*w.k)*time+w.phase,c=Math.cos(a);dy+=w.a*Math.sin(a);dx+=w.q*w.a*w.dx*c;dz+=w.q*w.a*w.dz*c;}return {dx,dy,dz};}
// Invert the Gerstner horizontal displacement, so queries match rendered X/Z.
function displacedHeight(b,x,z,time){let u=x,v=z;for(let i=0;i<5;i++){const o=waveAt(b.waves,u,v,time);u=x-o.dx;v=z-o.dz;}return b.baseY+waveAt(b.waves,u,v,time).dy;}
function riverGeometry(points,width,segments){
 const pos=[],uv=[],idx=[];let distance=0;
 for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],d=b.clone().sub(a).setY(0),len=d.length();if(len<1e-4)continue;d.divideScalar(len);const side=new T.Vector3(-d.z,0,d.x);
  const count=Math.max(2,Math.ceil(segments/(points.length-1)));
  for(let j=0;j<=count;j++){const p=a.clone().lerp(b,j/count);for(const s of [-1,1]){pos.push(p.x+side.x*width*.5*s,p.y,p.z+side.z*width*.5*s);uv.push((s+1)*.5,(distance+len*j/count)/width);}const r=pos.length/3-2;if(j>0)idx.push(r-2,r-1,r,r-1,r+1,r);}distance+=len;
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function openMaterial(b){
 const m=new T.MeshStandardMaterial({color:0x5a9caa,roughness:.24,metalness:.05,transparent:true,opacity:.76,depthWrite:false,side:T.DoubleSide});
 const waves=b.waves.map(w=>new T.Vector4(w.dx,w.dz,w.a,w.k)),phases=b.waves.map(w=>new T.Vector2(w.phase,w.q));while(waves.length<6){waves.push(new T.Vector4());phases.push(new T.Vector2());}
 b.uniforms={waterTime:{value:0},waterCount:{value:b.waves.length},waterWaves:{value:waves},waterPhase:{value:phases},waterInverse:{value:new T.Matrix4()},waterDepth:{value:b.depth},waterRound:{value:b.round?1:0},waterCenter:{value:new T.Vector2(b.center.x,b.center.z)},waterRadius:{value:b.radius},waterFlow:{value:new T.Vector2(b.flow,b.kind==='river'?1:0)}};
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,b.uniforms);
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\n'+WAVE_GLSL).replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
 vec3 waterOffset,waterNormal; vec3 waterBase=(modelMatrix*vec4(position,1.0)).xyz;
 waterWave(waterBase.xz,waterOffset,waterNormal);
 objectNormal=normalize(vec3(dot(modelMatrix[0].xyz,waterNormal),dot(modelMatrix[1].xyz,waterNormal),dot(modelMatrix[2].xyz,waterNormal)));`).replace('#include <begin_vertex>',`#include <begin_vertex>
 transformed+=(waterInverse*vec4(waterOffset,0.0)).xyz;vWaterWorld=waterBase+waterOffset;`);
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 vWaterWorld; uniform float waterTime,waterDepth,waterRound,waterRadius;uniform vec2 waterCenter,waterFlow;`).replace('#include <color_fragment>',`#include <color_fragment>
 if(waterRound>0.5 && distance(vWaterWorld.xz,waterCenter)>waterRadius)discard;
 vec3 absorb=exp(-vec3(1.6,.48,.30)*max(.015,waterDepth));
 diffuseColor.rgb=mix(vec3(.018,.095,.12),diffuseColor.rgb,absorb);
 float flowBands=sin(vWaterWorld.x*8.0+vWaterWorld.z*11.0-waterTime*waterFlow.x*8.0);
 diffuseColor.rgb*=1.0+waterFlow.y*.035*flowBands;`).replace('#include <opaque_fragment>',`float waterFresnel=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),5.0);
 outgoingLight+=vec3(.12,.20,.23)*waterFresnel;
 #include <opaque_fragment>`);
 };m.customProgramCacheKey=()=> 'mira-water-open-12.8';return m;
}
class Ripple {
 constructor(){this.w=16;this.h=24;this.data=new Float32Array(384);this.prev=new Float32Array(384);this.a=new Float32Array(384);this.b=new Float32Array(384);this.rhs=new Float32Array(384);this.texture=new T.DataTexture(this.data,16,24,T.RedFormat,T.FloatType);this.texture.minFilter=this.texture.magFilter=T.NearestFilter;this.texture.needsUpdate=true;this.energy=0;}
 hit(u,v,strength=.002){const x=clamp(Math.round(u*15),1,14),y=clamp(Math.round(v*23),1,22);this.data[y*16+x]=clamp(this.data[y*16+x]+strength,-.006,.006);this.energy=1;}
 step(){if(this.energy<.00001)return;const h=this.data,p=this.prev;this.a.set(h);for(let i=0;i<h.length;i++)this.rhs[i]=(2*h[i]-p[i])*.975;
  for(let n=0;n<5;n++){this.b.fill(0);for(let y=1;y<23;y++)for(let x=1;x<15;x++){const i=y*16+x;this.b[i]=(this.rhs[i]+.28*(this.a[i-1]+this.a[i+1]+this.a[i-16]+this.a[i+16]))/2.12;}[this.a,this.b]=[this.b,this.a];}
  p.set(h);h.set(this.a);this.energy=0;for(const v of h)this.energy=Math.max(this.energy,Math.abs(v));this.texture.needsUpdate=true;
 }
 sample(u,v){return this.data[clamp(Math.round(v*23),0,23)*16+clamp(Math.round(u*15),0,15)];}
 dispose(){this.texture.dispose();}
}
function basinMaterial(b){
 const m=new T.MeshStandardMaterial({color:0x74acb7,roughness:.2,metalness:.03,transparent:true,opacity:.64,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 b.uniforms={basinInverse:{value:new T.Matrix4()},basinMin:{value:b.box.min},basinMax:{value:b.box.max},basinRipple:{value:b.ripple?.texture||null},basinHasRipple:{value:!!b.ripple}};
 const sample=`uniform mat4 basinInverse;uniform vec3 basinMin,basinMax;uniform sampler2D basinRipple;uniform bool basinHasRipple;`;
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,b.uniforms);s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>\n${sample}\nvarying vec3 vBasinWorld;`).replace('#include <begin_vertex>',`#include <begin_vertex>
 vec3 basinWorld=(modelMatrix*vec4(position,1.0)).xyz;vec3 basinLocal=(basinInverse*vec4(basinWorld,1.0)).xyz;
 vec2 basinUV=(basinLocal.xz-basinMin.xz)/(basinMax.xz-basinMin.xz);
 if(basinHasRipple)transformed.y+=texture2D(basinRipple,clamp(basinUV,0.0,1.0)).r;
 vBasinWorld=(modelMatrix*vec4(transformed,1.0)).xyz;`);
 s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>\n${sample}\nvarying vec3 vBasinWorld;`).replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
 vec3 bp=(basinInverse*vec4(vBasinWorld,1.0)).xyz;
 if(any(lessThan(bp,basinMin))||any(greaterThan(bp,basinMax)))discard;`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 if(basinHasRipple){vec2 buv=(bp.xz-basinMin.xz)/(basinMax.xz-basinMin.xz);float hr=texture2D(basinRipple,buv+vec2(.0625,0.0)).r-texture2D(basinRipple,buv-vec2(.0625,0.0)).r;float hz=texture2D(basinRipple,buv+vec2(0.0,.041667)).r-texture2D(basinRipple,buv-vec2(0.0,.041667)).r;normal=normalize(normal+vec3(hr*12.0,hz*12.0,0.0));}`);
 };m.customProgramCacheKey=()=> 'mira-water-basin-12.8';return m;
}
export function createWaterSystem(ctx={}) {
 const scene=ctx.scene||ctx.world?.root||new T.Group(),world=ctx.world||{},quest=ctx.quest??QUEST;
 const caps={spouts:8,controls:8,basins:6,bodies:4,droplets:quest?256:512,ripples:2};
 const root=new T.Group();root.name='Mira_Water';scene.add(root);
 const spouts=[],controls=[],basins=[],bodies=[],holds=new Map();let serial=0,time=0,disposed=false,rippleClock=0,scanClock=0,slow=0,dropletCursor=0,revision=world.revision;
 const ownGeo=new Set(),ownMat=new Set(),adoptions=[],legacy=[],actorsSeen=new Set(),dogsSeen=new Set();
 const attached=o=>{for(let p=o;p;p=p.parent)if(p===scene)return true;return false;};
 const floor=(x,z)=>finite(world.floorHeight?.(new T.Vector3(x,0,z)),0);
 const geo=g=>(ownGeo.add(g),g),mat=m=>(ownMat.add(m),m);
 function mesh(g,m,parent=root){const o=new T.Mesh(geo(g),mat(m));o.castShadow=false;parent.add(o);return o;}
 const chrome=mat(new T.MeshStandardMaterial({color:0x909da1,roughness:.25,metalness:.8}));
 const dropMesh=new T.InstancedMesh(geo(new T.SphereGeometry(.012,quest?5:8,quest?4:6)),mat(new T.MeshStandardMaterial({color:0x8ec4d4,roughness:.15,transparent:true,opacity:.7,depthWrite:false})),caps.droplets);
 dropMesh.count=0;dropMesh.name='Mira_Water_Droplets';dropMesh.castShadow=false;dropMesh.frustumCulled=false;dropMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(dropMesh);
 const drops=Array.from({length:caps.droplets},()=>({p:new T.Vector3(),v:new T.Vector3(),life:0})),dummy=new T.Object3D();dummy.scale.setScalar(0);dummy.updateMatrix();for(let i=0;i<caps.droplets;i++)dropMesh.setMatrixAt(i,dummy.matrix);dropMesh.instanceMatrix.needsUpdate=true;
 function droplet(p,v,life=.6){const limit=slow>=30?Math.floor(caps.droplets*.5):caps.droplets;const d=drops[dropletCursor++%limit];d.p.copy(p);d.v.copy(v);d.life=life;}
 function splash(p,count=5){for(let i=0;i<count;i++){const a=i*2.399+time;droplet(p,new T.Vector3(Math.cos(a)*.35,.4+(i%3)*.13,Math.sin(a)*.35),.4);}}
 function updateDrops(dt){let count=0;for(let i=0;i<drops.length;i++){const d=drops[i];if(d.life<=0)continue;d.life-=dt;if(slow>=30&&i>=caps.droplets/2)d.life=0;d.v.y-=G*dt;d.p.addScaledVector(d.v,dt);if(d.p.y<=floor(d.p.x,d.p.z))d.life=0;if(d.life<=0)continue;dummy.position.copy(d.p);dummy.scale.setScalar(.3+Math.min(1,d.life*2));dummy.updateMatrix();dropMesh.setMatrixAt(count++,dummy.matrix);}dropMesh.count=count;if(count)dropMesh.instanceMatrix.needsUpdate=true;}
 function releaseTree(o){if(!o)return;const gs=new Set(),ms=new Set();o.traverse(m=>{if(m.isMesh){gs.add(m.geometry);for(const a of Array.isArray(m.material)?m.material:[m.material])ms.add(a);}});o.removeFromParent();for(const g of gs)if(ownGeo.delete(g))g.dispose();for(const m of ms)if(m!==chrome&&ownMat.delete(m))m.dispose();}
 function destroyMesh(o){if(!o)return;o.removeFromParent();if(ownGeo.delete(o.geometry))o.geometry.dispose();if(ownMat.delete(o.material))o.material.dispose();}
 function id(prefix,given){return given||`${prefix}-${++serial}`;}
 function bodySample(b,x,z){
  if(!visible(b.mesh)||b.sceneName!==world.name)return null;
  if(b.kind==='river'){let best=Infinity,tangent=new T.Vector3();for(let i=0;i<b.points.length-1;i++){const a=b.points[i],d=b.points[i+1].clone().sub(a).setY(0),l=d.lengthSq();if(l<1e-8)continue;const t=clamp(((x-a.x)*d.x+(z-a.z)*d.z)/l,0,1),p=a.clone().addScaledVector(d,t),dist=Math.hypot(x-p.x,z-p.z);if(dist<best){best=dist;tangent.copy(d).normalize();}}if(best>b.width*.5)return null;return {surface:displacedHeight(b,x,z,time),floor:Math.max(b.baseY-b.depth,floor(x,z)),current:tangent.multiplyScalar(b.flow)};}
  if(b.round&&Math.hypot(x-b.center.x,z-b.center.z)>b.radius)return null;
  if(b.adopted){const p=new T.Vector3(x,b.baseY,z).applyMatrix4(b.inverse);if(Math.abs(p.x)>b.width*.5||Math.abs(p.y)>b.length*.5)return null;}
  return {surface:displacedHeight(b,x,z,time),floor:Math.max(b.baseY-b.depth,floor(x,z)),current:new T.Vector3()};
 }
 function column(b,x,z){
  // Intersect a vertical world ray with the moving local AABB, including tilt.
  const o=new T.Vector3(x,0,z).applyMatrix4(b.inverse),d=new T.Vector3(0,1,0).transformDirection(b.inverse);const scale=new T.Vector3(0,1,0).applyMatrix3(new T.Matrix3().setFromMatrix4(b.inverse)).length();d.multiplyScalar(scale);
  let lo=-Infinity,hi=Infinity;for(const k of ['x','y','z']){if(Math.abs(d[k])<1e-8){if(o[k]<b.box.min[k]||o[k]>b.box.max[k])return null;}else{const a=(b.box.min[k]-o[k])/d[k],c=(b.box.max[k]-o[k])/d[k];lo=Math.max(lo,Math.min(a,c));hi=Math.min(hi,Math.max(a,c));}}return hi>=lo?{floor:lo,rim:hi}:null;
 }
 function basinSample(b,x,z,empty=false){if(!visible(b.group)||(!empty&&b.volume<=1e-8))return null;const c=column(b,x,z);if(!c)return null;let surface=Math.min(b.level,c.rim);if(b.ripple){const p=new T.Vector3(x,surface,z).applyMatrix4(b.inverse);surface=Math.min(c.rim,surface+b.ripple.sample((p.x-b.box.min.x)/(b.box.max.x-b.box.min.x),(p.z-b.box.min.z)/(b.box.max.z-b.box.min.z)));}return {surface,floor:c.floor,current:new T.Vector3()};}
 function sample(x,z,empty=false){let found=world.h5OpenWorld?.sampleWater(x,z)||null;for(const b of basins){const s=basinSample(b,x,z,empty);if(s&&(empty||s.surface>s.floor)&&(!found||s.surface>found.surface))found={...s,body:b};}for(const b of bodies){const s=bodySample(b,x,z);if(s&&(!found||s.surface>found.surface))found={...s,body:b};}return found;}
 function updateBasin(b){
  b.group.updateWorldMatrix(true,false);const elements=b.group.matrixWorld.elements,shown=visible(b.group);if(b.matrixStamp&&b.volumeStamp===b.volume&&elements.every((v,i)=>Math.abs(v-b.matrixStamp[i])<1e-8)){b.mesh.visible=b.volume>1e-8&&shown;return;}b.matrixStamp=elements.slice();b.volumeStamp=b.volume;b.inverse.copy(b.group.matrixWorld).invert();b.uniforms.basinInverse.value.copy(b.inverse);
  const bounds=new T.Box3(),rim=[];for(const x of [b.box.min.x,b.box.max.x])for(const z of [b.box.min.z,b.box.max.z]){const top=b.group.localToWorld(new T.Vector3(x,b.box.max.y,z)),bot=b.group.localToWorld(new T.Vector3(x,b.box.min.y,z));bounds.expandByPoint(top);bounds.expandByPoint(bot);rim.push(top);}
  const sc=b.group.getWorldScale(new T.Vector3());b.area=Math.max(.001,(b.box.max.x-b.box.min.x)*(b.box.max.z-b.box.min.z)*Math.abs(sc.x*sc.z));b.floorY=bounds.min.y;b.rimY=Math.min(...rim.map(p=>p.y));b.capacity=Math.max(0,(b.rimY-b.floorY)*b.area);
  b.level=Math.min(b.rimY,b.floorY+b.volume/b.area);const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());b.mesh.position.set(center.x,b.level,center.z);b.mesh.scale.set(size.x,1,size.z);b.mesh.visible=b.volume>1e-8&&visible(b.group);b.mesh.updateMatrixWorld();
  // Front rim wins ties; this sends the default tub spill into the room.
  b.spillPoint= b.group.localToWorld(new T.Vector3((b.box.min.x+b.box.max.x)*.5,b.box.max.y,b.box.max.z+.045));if(b.spillPoint.y>b.rimY+.005)b.spillPoint=rim.sort((a,c)=>a.y-c.y)[0].clone();
 }
 function addVolume(b,v,hit){if(!b||v<=0)return;b.volume+=v;if(hit&&b.ripple){const p=hit.clone().applyMatrix4(b.inverse);b.ripple.hit((p.x-b.box.min.x)/(b.box.max.x-b.box.min.x),(p.z-b.box.min.z)/(b.box.max.z-b.box.min.z));}}
 function spawnBody(opts={}){
  if(disposed||bodies.length>=caps.bodies)return null;const kind=['pond','lake','river','puddle'].includes(opts.kind)?opts.kind:'pond',center=vec(opts.center),radius=clamp(finite(opts.radius,kind==='lake'?8:2),.05,kind==='lake'?20:kind==='puddle'?1.2:4),depth=Math.max(.001,finite(opts.depth,.35));
  const b={id:id('water',opts.id),kind,center,radius,depth,baseY:center.y,flow:finite(opts.flow,.45),width:clamp(finite(opts.width,radius*2),.1,4),waves:waveSet(kind,quest),round:kind!=='river',sceneName:world.name,volume:finite(opts.volume,Math.PI*radius*radius*depth),inverse:new T.Matrix4()};
  if(kind==='river'){b.points=(opts.polyline||[[center.x-3,center.y,center.z],[center.x+3,center.y,center.z]]).map(vec);if(b.points.length<2)return null;b.baseY=center.y=b.points[0].y;for(const p of b.points)p.y=b.baseY;b.mesh=mesh(riverGeometry(b.points,b.width,quest?32:48),openMaterial(b));}
  else{const seg=kind==='lake'?40:kind==='puddle'?12:quest?28:32;b.mesh=mesh(new T.PlaneGeometry(radius*2,radius*2,seg,seg).rotateX(-Math.PI/2),openMaterial(b));b.mesh.position.copy(center);}
  b.mesh.name=`Mira_Water_${b.id}`;b.mesh.updateMatrixWorld();b.uniforms.waterInverse.value.copy(b.mesh.matrixWorld).invert();b.despawn=()=>{const i=bodies.indexOf(b);if(i<0)return;if(b.adopted){restoreBeach(b);}else destroyMesh(b.mesh);bodies.splice(i,1);};bodies.push(b);return b;
 }
 function restoreBeach(b){const a=adoptions.find(a=>a.body===b);if(!a)return;b.mesh.geometry=a.geometry;b.mesh.material=a.material;b.mesh.castShadow=a.castShadow;ownGeo.delete(a.newGeometry);a.newGeometry.dispose();ownMat.delete(a.newMaterial);a.newMaterial.dispose();adoptions.splice(adoptions.indexOf(a),1);}
 function adoptBeach(){const o=world.water;if(disposed||!o?.isMesh)return null;const old=bodies.find(b=>b.mesh===o);if(old)return old;if(bodies.length>=caps.bodies)return null;
  o.updateWorldMatrix(true,true);const center=worldPos(o),w=o.geometry.parameters?.width||48,l=o.geometry.parameters?.height||18;
  const b={id:id('beach'),kind:'lake',adopted:true,mesh:o,center,baseY:center.y,radius:24,width:w,length:l,depth:Math.max(.1,finite(ctx.beachDepth,1.6)),round:false,flow:0,waves:waveSet('lake',quest),sceneName:world.name,inverse:o.matrixWorld.clone().invert()};
  const g=geo(new T.PlaneGeometry(w,l,40,24)),m=mat(openMaterial(b));adoptions.push({body:b,geometry:o.geometry,material:o.material,castShadow:o.castShadow,newGeometry:g,newMaterial:m});o.geometry=g;o.material=m;o.castShadow=false;b.uniforms.waterInverse.value.copy(b.inverse);b.despawn=()=>{restoreBeach(b);const i=bodies.indexOf(b);if(i>=0)bodies.splice(i,1);};bodies.push(b);return b;
 }
 function hollowLegacy(group,type,box){
  if(!['Sink','Bathtub'].includes(type))return;const dims=type==='Sink'?[.70,.18,.62]:[1.2,.59,1.25],hidden=[];
  group.traverse(o=>{if(!o.isMesh||!o.geometry)return;o.geometry.computeBoundingBox();const d=o.geometry.boundingBox.getSize(new T.Vector3()).multiply(o.scale);if(Math.abs(d.x-dims[0])<.04&&Math.abs(d.z-dims[2])<.04)hidden.push(o);else if(Math.abs(d.x-(box.max.x-box.min.x))<.035&&d.y<.04)hidden.push(o);});
  // Only the shipped solid stand-ins are replaced; custom hollow meshes stay intact.
  if(hidden.length<2)return;const old=hidden.map(o=>[o,o.visible]);for(const o of hidden)o.visible=false;
  const shell=new T.Group();shell.name='Mira_Water_LegacyLiner';group.add(shell);const stone=mat(new T.MeshStandardMaterial({color:0xd6d8cf,roughness:.48})),s=box.getSize(new T.Vector3()),c=box.getCenter(new T.Vector3()),t=type==='Sink'?.055:.10;
  const wall=(size,p)=>{const o=mesh(new T.BoxGeometry(...size),stone,shell);o.position.copy(p);};wall([s.x+2*t,.06,s.z+2*t],new T.Vector3(c.x,box.min.y-.03,c.z));for(const sign of [-1,1]){wall([t,s.y,s.z+2*t],new T.Vector3(c.x+sign*(s.x+t)/2,c.y,c.z));wall([s.x,s.y,t],new T.Vector3(c.x,c.y,c.z+sign*(s.z+t)/2));}legacy.push({group,shell,old});
 }
 function bindBasin(group,opts={}){
  if(disposed||!group)return null;group.updateWorldMatrix(true,true);const old=basins.find(b=>b.group===group);if(old)return old;if(basins.length>=caps.basins)return null;
  const type=group.userData?.furniture?.id||group.name,fbox=boxOf(opts.localBox||group.userData?.furniture?.localBox||new T.Box3().setFromObject(group).applyMatrix4(group.matrixWorld.clone().invert()));let box;
  let spec=null;group.traverse(m=>{if(m.userData.h5BasinSpec)spec=m.userData.h5BasinSpec;});
  if(opts.innerBox||spec?.innerBox)box=boxOf(opts.innerBox||spec.innerBox);else if(type==='Sink'||type==='Bathtub'){const tub=type==='Bathtub',c=fbox.getCenter(new T.Vector3()),sx=tub?.91:.49,sz=tub?1.03:.43,rim=fbox.max.y;box=new T.Box3(new T.Vector3(c.x-sx/2,fbox.min.y+(tub?.09:.045),c.z-sz/2),new T.Vector3(c.x+sx/2,rim,c.z+sz/2));if(opts.hollowLegacy!==false)hollowLegacy(group,type,box);}
  else{box=fbox;box.min.add(new T.Vector3(.025,.025,.025));box.max.add(new T.Vector3(-.025,-.01,-.025));}
  if(box.isEmpty())return null;const b={id:id('basin',opts.id),kind:'basin',group,box,spec,inverse:new T.Matrix4(),volume:Math.max(0,finite(opts.volume)),capacity:0,level:0,rimY:0,overflow:0,overflowLost:0,drainRate:Math.max(0,finite(opts.drainRate)),plug:opts.plug!==false,ripple:basins.filter(b=>b.ripple).length<caps.ripples?new Ripple():null};
  b.mesh=mesh(new T.PlaneGeometry(1,1,16,24).rotateX(-Math.PI/2),basinMaterial(b));b.mesh.name=`Mira_Water_${b.id}`;b.setDrain=(r,plug=false)=>{b.drainRate=Math.max(0,finite(r));b.plug=plug;};basins.push(b);updateBasin(b);return b;
 }
 function spill(b,amount){b.overflow+=amount;const p=b.spillPoint;let puddle=b.puddle;if(!puddle||!bodies.includes(puddle)||puddle.center.distanceTo(new T.Vector3(p.x,puddle.center.y,p.z))>1.3){puddle=spawnBody({kind:'puddle',center:[p.x,floor(p.x,p.z)+.003,p.z+.08],radius:.06,depth:.003,volume:0});b.puddle=puddle;}if(puddle){puddle.volume+=amount;resizePuddle(puddle);}else b.overflowLost+=amount;splash(p,5);}
 function resizePuddle(b){b.volume=clamp(b.volume,0,Math.PI*1.2*1.2*.025);const radius=clamp(Math.sqrt(b.volume/(Math.PI*.008)),.05,1.2),ratio=radius/b.radius;b.mesh.scale.x*=ratio;b.mesh.scale.z*=ratio;b.radius=radius;b.depth=clamp(b.volume/(Math.PI*radius*radius),.001,.025);b.baseY=floor(b.center.x,b.center.z)+b.depth;b.center.y=b.baseY;b.mesh.position.y=b.baseY;b.uniforms.waterRadius.value=radius;b.uniforms.waterDepth.value=b.depth;}
 function spoutBy(v){return typeof v==='string'?spouts.find(s=>s.id===v):v;}
 function spawnSpout(opts={}){
  if(disposed||spouts.length>=caps.spouts)return null;const r=new T.Group();r.name='Mira_Water_Spout';root.add(r);r.position.copy(vec(opts.position));const direction=vec(opts.direction||[0,-1,0]).normalize();r.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),direction.lengthSq()?direction:new T.Vector3(0,-1,0));
  const nozzle=mesh(new T.CylinderGeometry(.022,.025,.08,8),chrome,r);nozzle.position.y=.04;
  const s={id:id('spout',opts.id),root:r,sceneName:world.name,rate:Math.max(0,finite(opts.rate,.00012)),open:clamp(finite(opts.open),0,1),basin:opts.basin,clock:1,emitClock:0,path:null,hit:null,emitted:0,delivered:0,lost:0};
  s.setRate=v=>{s.rate=clamp(finite(v),0,.02);return s;};s.setOpen=v=>{s.open=clamp(finite(v),0,1);return s;};s.bindBasin=b=>{s.basin=b;return s;};s.despawn=()=>{const i=spouts.indexOf(s);if(i<0)return;spouts.splice(i,1);releaseTree(r);destroyMesh(s.stream);};spouts.push(s);return s;
 }
 function trace(s){s.root.updateWorldMatrix(true,true);const start=worldPos(s.root),v=new T.Vector3(0,-1,0).applyQuaternion(s.root.getWorldQuaternion(new T.Quaternion())).multiplyScalar(.65),pts=[start.clone()];let hit=null;
  for(let j=1;j<=32;j++){const t=j*.035,p=start.clone().addScaledVector(v,t);p.y-=.5*G*t*t;const prev=pts[pts.length-1];let best=null;
   for(const b of basins){const c=basinSample(b,p.x,p.z,true);if(!c)continue;const y=Math.max(c.floor+.001,c.surface);if(prev.y>=y&&p.y<=y&&y<=b.rimY+.002&&(!best||y>best.y))best={b,y};}
   const open=sample(p.x,p.z);if(open&&open.body.kind!=='basin'&&prev.y>=open.surface&&p.y<=open.surface&&(!best||open.surface>best.y))best={b:open.body,y:open.surface};
   const fy=floor(p.x,p.z);if(prev.y>=fy&&p.y<=fy&&(!best||fy>best.y))best={b:null,y:fy};
   if(best){const f=clamp((prev.y-best.y)/Math.max(.00001,prev.y-p.y),0,1);p.lerpVectors(prev,p,f);p.y=best.y;pts.push(p);hit={body:best.b,p:p.clone()};break;}pts.push(p);
  }
  s.path=new T.CatmullRomCurve3(pts);s.hit=hit;const g=new T.TubeGeometry(s.path,8,clamp(.0035*Math.sqrt(s.rate*s.open/.00012),.001,.012),5,false);if(!s.stream){s.stream=mesh(g,new T.MeshStandardMaterial({color:0x9ed0da,roughness:.13,transparent:true,opacity:.62,depthWrite:false}));s.stream.name='Mira_Water_Stream';}else{ownGeo.delete(s.stream.geometry);s.stream.geometry.dispose();s.stream.geometry=geo(g);}s.stream.visible=true;
 }
 function spawnControl(opts={}){
  if(disposed||controls.length>=caps.controls)return null;const type=['lever','knob','button'].includes(opts.type)?opts.type:'lever',r=new T.Group();r.name='Mira_Water_Control';r.position.copy(vec(opts.position));root.add(r);if(opts.axis)r.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vec(opts.axis).normalize());
  const base=mesh(new T.CylinderGeometry(.035,.042,.018,12),chrome,r),pivot=new T.Group();r.add(pivot);const c={id:id('control',opts.id),root:r,sceneName:world.name,pivot,type,target:opts.target,value:0,latch:opts.latch!==false};
  if(type==='lever'){const stalk=mesh(new T.CylinderGeometry(.012,.014,.12,8),chrome,pivot);stalk.position.y=.06;}else{const handle=mesh(new T.CylinderGeometry(.033,.033,type==='knob'?.035:.025,12),chrome,pivot);handle.position.y=.026;const mark=mesh(new T.BoxGeometry(.009,.004,.025),new T.MeshStandardMaterial({color:0x224f65,roughness:.6}),pivot);mark.position.set(0,.046,.014);}
  c.setValue=v=>{c.value=clamp(finite(v),0,1);if(type==='lever')pivot.rotation.x=c.value*70*Math.PI/180;else if(type==='knob')pivot.rotation.y=c.value*1.5*Math.PI;else pivot.position.y=-.015*c.value;spoutBy(c.target)?.setOpen(c.value);return c;};c.setValue(opts.value||0);c.pickables=[];r.traverse(o=>{if(o.isMesh)c.pickables.push(o);});controls.push(c);return c;
 }
 function palm(i){const p=ctx.props?.system?.hands?.palmPos?.(i);if(p)return vec(p);const camera=ctx.renderer?.xr?.isPresenting?ctx.renderer.xr.getCamera(ctx.camera):ctx.camera;if(!camera)return null;return worldPos(camera).add(new T.Vector3(i===0?-.16:.16,-.16,-.35).applyQuaternion(camera.getWorldQuaternion(new T.Quaternion())));}
 function grip(i){if(disposed)return false;if(holds.has(i))return true;const p=palm(i);if(!p)return false;let best=null,dist=.08;for(const c of controls){if(!visible(c.root)||[...holds.values()].some(h=>h.c===c))continue;const grab=c.type==='lever'?c.pivot.localToWorld(new T.Vector3(0,.10,0)):c.pivot.localToWorld(new T.Vector3(0,.04,0));const d=p.distanceTo(grab);if(d<dist){dist=d;best=c;}}if(!best)return false;const local=best.root.worldToLocal(p.clone());holds.set(i,{c:best,start:local,previous:local.clone(),initial:best.value,angle:Math.atan2(local.x,local.z)});if(best.type==='button'&&best.latch)best.setValue(best.value>.5?0:1);return true;}
 function release(i){const h=holds.get(i);if(!h)return false;const c=h.c;if(c.type==='button'&&!c.latch)c.setValue(0);else if(c.value<.12||c.value>.88)c.setValue(c.value>.5?1:0);holds.delete(i);const hands=ctx.props?.system?.hands;if(typeof hands?.haptics==='function')hands.haptics(i,.18,25);return true;}
 function updateControls(){for(const [i,h] of holds){const p=palm(i);if(!p)continue;const q=h.c.root.worldToLocal(p);if(h.c.type==='lever'){h.c.setValue(Math.atan2(q.z,Math.max(.001,q.y))/(70*Math.PI/180));}else if(h.c.type==='knob'){const a=Math.atan2(q.x,q.z),d=Math.atan2(Math.sin(a-h.angle),Math.cos(a-h.angle));h.c.setValue(h.c.value+d/(1.5*Math.PI));h.angle=a;}else if(!h.c.latch)h.c.setValue(clamp((h.start.y-q.y)/.015,0,1));h.previous.copy(q);}}
 function click(ray=ctx.props?.ray){if(disposed||!ray)return false;const rc=ray.isRaycaster?ray:new T.Raycaster();if(!ray.isRaycaster){const r=ray.ray||ray;if(!r.origin||!r.direction)return false;rc.ray.copy(r);rc.far=4;}const hits=rc.intersectObjects(controls.filter(c=>visible(c.root)).flatMap(c=>c.pickables),false);if(!hits.length)return false;const c=controls.find(c=>c.pickables.includes(hits[0].object));c.setValue(c.value>.5?0:1);if(c.type==='button'&&!c.latch)c.desktopRelease=time+.15;return true;}
 function autoBindFurniture(){for(const g of world.movables||[]){const type=g.userData?.furniture?.id;if(type==='Sink')placeKitchenKit(system,g);else if(type==='Bathtub')placeBathKit(system,g);}return basins;}
 function tick(dt){if(disposed||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);time+=dt;slow=dt>1/50?Math.min(60,slow+1):Math.max(0,slow-1);updateControls();for(const c of controls)if(c.desktopRelease&&time>=c.desktopRelease){c.desktopRelease=0;c.setValue(0);}scanClock+=dt;if(scanClock>.75||revision!==world.revision){scanClock=0;revision=world.revision;cleanupRemoved();autoBindFurniture();if(world.water)adoptBeach();}
  for(const b of basins)updateBasin(b);
  for(const b of bodies)if(!b.adopted)b.mesh.visible=b.sceneName===world.name&&b.enabled!==false;
  for(const s of spouts){s.root.visible=s.sceneName===world.name;if(s.stream)s.stream.visible=s.root.visible&&s.open*s.rate>0;}for(const c of controls)c.root.visible=c.sceneName===world.name;
  const active=spouts.some(s=>s.open*s.rate>0&&visible(s.root))||basins.some(b=>b.volume>0)||bodies.some(b=>visible(b.mesh)&&b.sceneName===world.name)||drops.some(d=>d.life>0);
  if(!active)return;
  for(const s of spouts){const running=s.open*s.rate>0&&visible(s.root);if(s.stream)s.stream.visible=running;if(!running)continue;s.clock+=dt;if(s.clock>=1/15){s.clock%=1/15;trace(s);}const amount=s.rate*s.open*dt;s.emitted+=amount;
   if(s.hit?.body?.kind==='basin'){addVolume(s.hit.body,amount,s.hit.p);s.delivered+=amount;}else if(s.hit){s.delivered+=amount;if(s.hit.body?.kind==='puddle'){s.hit.body.volume+=amount;resizePuddle(s.hit.body);}else if(!s.hit.body){if(!s.puddle||!bodies.includes(s.puddle))s.puddle=spawnBody({kind:'puddle',center:[s.hit.p.x,s.hit.p.y+.003,s.hit.p.z],radius:.05,depth:.003,volume:0});if(s.puddle){s.puddle.volume+=amount;resizePuddle(s.puddle);}else s.lost+=amount;}}else s.lost+=amount;
   s.emitClock+=dt;if(s.emitClock>.065){s.emitClock%=.065;if(s.hit)splash(s.hit.p,4);const p=s.path?.getPoint(.65);if(p)droplet(p,new T.Vector3(0,-.6,0),.3);}
  }
  rippleClock+=dt;const rippleStep=rippleClock>=1/30;if(rippleStep)rippleClock%=1/30;
  for(const b of basins){b.volume=Math.max(0,b.volume-(!b.plug?b.drainRate*dt:0));if(b.volume>b.capacity){spill(b,b.volume-b.capacity);b.volume=b.capacity;}if(rippleStep)b.ripple?.step();updateBasin(b);}
  for(const b of [...bodies]){if(!b.adopted)b.mesh.visible=b.sceneName===world.name;if(b.kind==='puddle'){b.volume*=Math.exp(-dt*.02);if(b.volume<1e-7){b.despawn();continue;}resizePuddle(b);}b.mesh.updateWorldMatrix(true,false);b.uniforms.waterTime.value=time;b.uniforms.waterInverse.value.copy(b.mesh.matrixWorld).invert();if(b.adopted){b.inverse.copy(b.uniforms.waterInverse.value);b.baseY=worldPos(b.mesh).y;}}
  updateDrops(dt);tickFurniture(dt);
 }
 function cleanupRemoved(){for(const b of [...basins])if(!attached(b.group)){
   for(const s of [...spouts])if(s.basin===b)s.despawn();
   for(const c of [...controls]){let belongs=false;for(let p=c.root;p;p=p.parent)if(p===b.group)belongs=true;if(belongs){for(const [i,h] of holds)if(h.c===c)release(i);releaseTree(c.root);controls.splice(controls.indexOf(c),1);}}
   b.ripple?.dispose();destroyMesh(b.mesh);basins.splice(basins.indexOf(b),1);
   for(const l of [...legacy])if(l.group===b.group){releaseTree(l.shell);for(const [o,v] of l.old)o.visible=v;legacy.splice(legacy.indexOf(l),1);}
  }for(const b of [...bodies])if(b.adopted&&b.mesh!==world.water)b.despawn();}
 function contains(point){const p=vec(point),s=sample(p.x,p.z);return s&&p.y<=s.surface&&p.y>=s.floor-.02?{body:s.body,depth:Math.max(0,s.surface-s.floor),surfaceY:s.surface,submerged:Math.max(0,s.surface-p.y),floorY:s.floor}:null;}
 function heightAt(x,z){const s=sample(x,z);return Math.max(floor(x,z),s?.surface??-Infinity);}
 function floorUnderWater(x,z){const b=basins.map(b=>basinSample(b,x,z,true)).filter(Boolean).sort((a,b)=>b.floor-a.floor)[0];if(b)return b.floor;return floor(x,z);}
 // Hydro/swim implementation is below; no host locomotion or actor state is patched here.
 function dispose(){if(disposed)return;disposed=true;for(const i of [...holds.keys()])release(i);for(const b of [...bodies])if(b.adopted)restoreBeach(b);for(const b of basins)b.ripple?.dispose();for(const s of spouts)s.root.removeFromParent();for(const c of controls)c.root.removeFromParent();for(const l of legacy){l.shell.removeFromParent();for(const [o,v] of l.old)o.visible=v;}root.removeFromParent();for(const g of world.movables||[])if(g.userData?.furniture)delete g.userData.furniture.waterManaged;for(const a of actorsSeen){if(a.waterSwimming&&a.balance)a.balance.state='loose';a.waterSwimming=false;a.waterSpeedScale=1;}for(const d of dogsSeen){d.waterSwimming=false;const r=d.model?.root||d.root;if(r)r.userData.waterSwimming=false;}for(const g of ownGeo)g.dispose();for(const m of ownMat)m.dispose();spouts.length=controls.length=basins.length=bodies.length=0;if(ctx.props?.water===system)delete ctx.props.water;}
 const system={root,caps,spawnSpout,spawnControl,spawnBody,bindBasin,adoptBeach,autoBindFurniture,grip,release,click,tick,heightAt,surfaceY:heightAt,contains,floorUnderWater,dragAt:p=>{const c=contains(p);return c?clamp(c.submerged/.8,0,1):0;},hydroOf,applyHydro,ownsHydro,playerSubmerged,playerSwimIntent,stepActor,stepDog,list:()=>({spouts:[...spouts],controls:[...controls],basins:[...basins],bodies:[...bodies]}),dispose};
 function descriptor(target){
  const group=target?.isObject3D?target:target?.group||target?.model?.root||target?.root;
  const f=group?.userData?.furniture,kind=target?.kind||(f?'furniture':target?.model?'dog':target?.shape?'npc':'player');
  const p=group?worldPos(group):vec(target?.position),h=Math.max(.2,finite(target?.shape?.height,1)),custom=target?.water||{};let box,mass,volume;
  if(f){group.updateWorldMatrix(true,false);box=boxOf(f.localBox).applyMatrix4(group.matrixWorld);mass=finite(target.mass,finite(f.mass,20));volume=finite(target.volume,finite(f.volume,0));
   // 12.6 stores envelope volume but heavily discounts mass. Recover material
   // displacement from density only for those inconsistent legacy records.
   if(target.volume==null&&f.density>0&&volume*f.density>mass*2.5)volume=mass/f.density;
   if(volume<=0){const size=box.getSize(new T.Vector3());volume=size.x*size.y*size.z*finite(custom.fill,.35);}
  }else if(kind==='npc'){const height=finite(target.height,1.7*h);box=new T.Box3(p.clone().add(new T.Vector3(-.20*h,0,-.16*h)),p.clone().add(new T.Vector3(.20*h,height,.16*h)));mass=finite(target.mass,62*h**3);volume=finite(target.volume,.070*h**3);}
  else if(kind==='dog'){box=new T.Box3(p.clone().add(new T.Vector3(-.17,.14,-.42)),p.clone().add(new T.Vector3(.17,.62,.42)));mass=finite(target.mass,22);volume=finite(target.volume,.024);}
  else{const height=Math.max(.1,finite(target?.height,1.65));box=new T.Box3(p.clone().add(new T.Vector3(-.20,0,-.15)),p.clone().add(new T.Vector3(.20,height,.15)));mass=finite(target?.mass,72);volume=finite(target?.volume,.074);}
  if(custom.localBox&&group)box=boxOf(custom.localBox).applyMatrix4(group.matrixWorld);mass=Math.max(.05,mass);volume=Math.max(.00001,volume);
  return {target,group,f,kind,box,mass,volume,density:mass/volume,position:p};
 }
 function hydroOf(target){
  const d=descriptor(target),size=d.box.getSize(new T.Vector3()),center=d.box.getCenter(new T.Vector3()),s=sample(center.x,center.z);
  const submerged=s&&s.surface-s.floor>.05?clamp((s.surface-d.box.min.y)/Math.max(.05,size.y),0,1):0;
  const depth=s?Math.max(0,s.surface-s.floor):0,wet=!!s&&depth>.05&&submerged>0,velocity=vec(target?.velocity||d.f?.velocity||target?.waterVelocity),current=s?.current||new T.Vector3();
  const relative=velocity.clone().sub(current),coefficient=.5*RHO*.9*Math.max(.02,size.x*size.z),drag=relative.clone().multiplyScalar(-coefficient*relative.length()*submerged);
  if(submerged>.4){drag.x*=1.8;drag.z*=1.8;}const radiation=.55*Math.sqrt(G/Math.max(.1,size.y))*d.mass*submerged;drag.y-=radiation*relative.y;const force=wet?drag.add(new T.Vector3(0,(RHO*d.volume*submerged-d.mass)*G,0)):new T.Vector3();
  let mode=!wet?'air':d.density>RHO?'sink':'float';if(wet&&(d.kind==='npc'||d.kind==='player')&&depth<.28*size.y&&target?.alive!==false&&!target?.dead)mode='wade';if(wet&&target?.swimThrust&&vec(target.swimThrust).lengthSq()>0){force.add(vec(target.swimThrust));mode='swim';}
  return {...d,surfaceY:s?.surface??floor(center.x,center.z),floorY:s?.floor??floor(center.x,center.z),depth,submerged,force,mode,body:s?.body||null,current,coefficient,radiation,size,velocity};
 }
 function applyHydro(target,velocity,dt){
  const rec=hydroOf(target),before=velocity.clone();dt=clamp(finite(dt),0,.1);if(rec.mode==='air'||dt<=0)return {...rec,deltaV:new T.Vector3()};
  // Semi-implicit buoyancy, exact scalar quadratic-drag decay (no sign reversal).
  const acc=(RHO*rec.volume*rec.submerged-rec.mass)*G/rec.mass;
  velocity.y+=clamp(acc,-G,2*G)*dt;const thrust=target?.swimThrust?vec(target.swimThrust):new T.Vector3();velocity.addScaledVector(thrust,dt/rec.mass);
  const rel=velocity.clone().sub(rec.current),k=rec.coefficient*rec.submerged/rec.mass,speed=rel.length();
  rel.y/=1+k*speed*dt+rec.radiation*dt/rec.mass;const hf=rec.submerged>.4?1.8:1;rel.x/=1+k*speed*dt*hf;rel.z/=1+k*speed*dt*hf;velocity.copy(rec.current).add(rel);velocity.y=clamp(velocity.y,-2.4,2.4);
  return {...rec,deltaV:velocity.clone().sub(before)};
 }
 function held(group){const f=group?.userData?.furniture;if(f?.holds?.size||f?.held!=null)return true;for(const h of ctx.props?.furnHolds?.values?.()||[])if(h.group===group)return true;return false;}
 function ownsHydro(group){if(disposed||!group?.parent||!visible(group)||held(group)||basins.some(b=>b.group===group))return false;const h=hydroOf(group);return h.depth>.05&&h.submerged>0;}
 function sync(group){if(typeof ctx.syncFurniture==='function'){ctx.syncFurniture(world,group);return;}if(typeof ctx.props?.syncFurniture==='function'){ctx.props.syncFurniture(group);return;}const f=group.userData.furniture;if(!f?.obstacle)return;group.updateWorldMatrix(true,true);const box=boxOf(f.localBox).applyMatrix4(group.matrixWorld),size=box.getSize(new T.Vector3()),p=box.getCenter(new T.Vector3());Object.assign(f.obstacle,{x:p.x,z:p.z,y:box.min.y,w:size.x,d:size.z,h:size.y});world.grid=null;if(f.seat){f.seat.yaw=group.rotation.y;f.seat.position.set(p.x,Math.max(.42,p.y),p.z);f.seat.approach=group.localToWorld(new T.Vector3(0,0,1.02));}}
 function tickFurniture(dt){for(const group of world.movables||[]){const f=group?.userData?.furniture;if(!f)continue;f.waterManaged=ownsHydro(group);if(!f.waterManaged)continue;f.velocity??=new T.Vector3();const n=Math.ceil(dt/.025),step=dt/n;for(let j=0;j<n;j++){const h=applyHydro(group,f.velocity,step);moveWorld(group,f.velocity.clone().multiplyScalar(step));const after=descriptor(group);if(after.box.min.y<h.floorY){moveWorld(group,new T.Vector3(0,h.floorY-after.box.min.y,0));f.velocity.y=Math.max(0,f.velocity.y);}}
   const p=worldPos(group),before=p.clone();world.project?.(p,Math.max(.1,Math.min(.45,boxOf(f.localBox).getSize(new T.Vector3()).x*.35)),.02,1.6,f.obstacle);moveWorld(group,new T.Vector3(p.x-before.x,0,p.z-before.z));f.omega?.multiplyScalar(Math.exp(-dt*3));sync(group);
  }}
 const swimStates=new WeakMap();
 function liveCamera(camera=ctx.camera){return ctx.renderer?.xr?.isPresenting?ctx.renderer.xr.getCamera(camera):camera;}
 function playerSubmerged(camera=ctx.camera){const c=liveCamera(camera);if(!c)return false;const p=worldPos(c),s=sample(p.x,p.z),state=swimStates.get(c);if(!s||s.surface-s.floor<=.05){if(state){state.active=false;state.velocity.set(0,0,0);}return false;}const active=state?.active?p.y<=s.surface+.12&&p.y>=s.floor-.05:p.y<=s.surface-.10&&p.y>=s.floor-.05;const st=state||{active:false,velocity:new T.Vector3()};st.active=active;if(!active)st.velocity.set(0,0,0);swimStates.set(c,st);return active;}
 function axes(g){const a=g?.axes||[],i=a.length>=4?2:0;let x=finite(a[i]),y=finite(a[i+1]),length=Math.hypot(x,y);if(length<.14)return {x:0,y:0};const s=Math.min(1,(length-.14)/.86)/length;return {x:x*s,y:y*s};}
 function playerSwimIntent(options={}){
  const rig=options.rig||ctx.rig,camera=liveCamera(options.camera||ctx.camera),dt=clamp(finite(options.dt),0,.05);if(!camera||!rig)return {active:false,blocked:!!options.blocked};const active=playerSubmerged(camera),state=swimStates.get(camera)||{velocity:new T.Vector3()};
  const blocked=!!options.blocked||!!ctx.props?.vehicle?.driving;if(!active)return {active:false,blocked,velocity:state.velocity};if(blocked){state.velocity.set(0,0,0);return {active:true,blocked,velocity:state.velocity};}
  const eye=worldPos(camera),s=sample(eye.x,eye.z),sources=options.sources||ctx.renderer?.xr?.getSession?.()?.inputSources||[],left=[...sources].find(s=>s.handedness==='left'),right=[...sources].find(s=>s.handedness==='right'),stick=axes(left?.gamepad),turn=axes(right?.gamepad).x;
  const keys=options.keys||{},key=k=>keys instanceof Set?keys.has(k):!!keys[k],pressed=(s,i)=>!!s?.gamepad?.buttons?.[i]?.pressed;
  const fw=new T.Vector3(0,0,-1).applyQuaternion(camera.getWorldQuaternion(new T.Quaternion())),side=new T.Vector3(1,0,0).applyQuaternion(camera.getWorldQuaternion(new T.Quaternion())).setY(0).normalize();
  const forward=-stick.y+(key('KeyW')||key('w')?1:0)-(key('KeyS')||key('s')?1:0),strafe=stick.x+(key('KeyD')||key('d')?1:0)-(key('KeyA')||key('a')?1:0),up=(key('Space')||pressed(right,4)||pressed(right,3)||pressed(left,0)?1:0)-(key('KeyC')||key('ControlLeft')||key('ControlRight')?1:0);
  const move=fw.multiplyScalar(forward).addScaledVector(side,strafe).add(new T.Vector3(0,up,0));if(move.lengthSq()>1)move.normalize();
  // Swimming is a horizontal posture; use a 0.30 m vertical displacement envelope.
  const height=Math.min(.30,Math.max(.10,s.surface-s.floor-.02)),target={kind:'player',position:eye.clone().add(new T.Vector3(0,-height,0)),height,mass:finite(options.mass,72),volume:finite(options.volume,.074),velocity:options.velocity||state.velocity,swimThrust:move.clone().multiplyScalar(finite(options.mass,72)*3.8)};
  const velocity=options.velocity||state.velocity,hydro=applyHydro(target,velocity,dt),delta=velocity.clone().multiplyScalar(dt);delta.y=clamp(eye.y+delta.y,s.floor+.05,s.surface+.12)-eye.y;
  if((eye.y+delta.y<=s.floor+.05001&&velocity.y<0)||(eye.y+delta.y>=s.surface+.11999&&velocity.y>0))velocity.y=0;
  const projected=eye.clone().add(delta),before=projected.clone(),ignore=s.body.kind==='basin'?s.body.group.userData?.furniture?.obstacle:undefined;world.project?.(projected,.18,.10,1.5,ignore);delta.x+=projected.x-before.x;delta.z+=projected.z-before.z;
  if(Number.isFinite(world.extent)){delta.x=clamp(eye.x+delta.x,-world.extent,world.extent)-eye.x;delta.z=clamp(eye.z+delta.z,-world.extent,world.extent)-eye.z;}
  if(options.integrate!==false){moveWorld(rig,delta);const angle=-turn*2.15*dt;if(angle){const pivot=worldPos(camera),r=worldPos(rig),offset=r.clone().sub(pivot).applyAxisAngle(new T.Vector3(0,1,0),angle),p=pivot.clone().add(offset);rig.rotateOnWorldAxis(new T.Vector3(0,1,0),angle);moveWorld(rig,p.sub(worldPos(rig)));}rig.updateWorldMatrix(true,true);}
  return {active:true,blocked:false,move,delta,velocity,hydro,integrated:options.integrate!==false};
 }
 function stepActor(actor,dt){
  if(disposed||!actor?.group)return null;actorsSeen.add(actor);dt=clamp(finite(dt),0,.05);const h=hydroOf(actor),height=h.size.y,alive=!actor.dead&&actor.alive!==false,was=!!actor.waterSwimming;actor.waterSpeedScale=1;actor.waterBob=0;
  if(h.depth<=.05||h.mode==='air'||(alive&&h.depth<.28*height)){
   actor.waterSwimming=false;if(was&&actor.balance){actor.balance.state=alive&&h.depth<.55*height?'standing':'loose';actor.balance.airVel=actor.waterVelocity?.y||0;}
   if(h.submerged>0){actor.waterSpeedScale=1-.65*h.submerged;actor.waterBob=Math.sin(time*4)*.006*h.submerged;}return h;
  }
  actor.waterVelocity??=new T.Vector3(0,finite(actor.balance?.airVel),0);actor.waterSwimming=true;if(actor.balance)actor.balance.state='swimming';
  const rec=applyHydro(actor,actor.waterVelocity,dt);moveWorld(actor.group,actor.waterVelocity.clone().multiplyScalar(Math.min(.05,dt)));const after=descriptor(actor);if(after.box.min.y<rec.floorY){moveWorld(actor.group,new T.Vector3(0,rec.floorY-after.box.min.y,0));actor.waterVelocity.y=Math.max(0,actor.waterVelocity.y);if(alive&&rec.depth<.55*height){actor.waterSwimming=false;if(actor.balance)actor.balance.state='standing';}}
  actor.waterFaceUp=!alive&&rec.density<RHO;return rec;
 }
 function stepDog(dog,dt){if(disposed||!dog)return null;dogsSeen.add(dog);dt=clamp(finite(dt),0,.05);const r=dog?.model?.root||dog?.root;if(!r)return null;const target={...dog,kind:'dog',root:r},h=hydroOf(target);dog.waterSwimming=h.depth>.16&&h.submerged>0;r.userData.waterSwimming=dog.waterSwimming;if(!dog.waterSwimming)return h;dog.waterVelocity??=new T.Vector3();target.velocity=dog.waterVelocity;const rec=applyHydro(target,dog.waterVelocity,dt);moveWorld(r,dog.waterVelocity.clone().multiplyScalar(Math.min(.05,dt)));const p=worldPos(r);if(p.y<h.floorY){moveWorld(r,new T.Vector3(0,h.floorY-p.y,0));dog.waterVelocity.y=Math.max(0,dog.waterVelocity.y);}dog.waterPaddle=Math.sin(time*7);return rec;}

 return system;
}
export function installWater(ctx={}){if(ctx.props?.water)return ctx.props.water;const water=createWaterSystem(ctx);if(ctx.props)ctx.props.water=water;water.autoBindFurniture();water.adoptBeach();return water;}
function placeKit(system,group,type){if(!group)return null;const b=system.bindBasin(group);if(!b||b.kit)return b?.kit||null;const list=system.list();if(list.spouts.length>=system.caps.spouts||list.controls.length>=system.caps.controls)return null;
 const c=b.box.getCenter(new T.Vector3()),s=system.spawnSpout({basin:b,position:[0,0,0]}),control=system.spawnControl({type:'lever',target:s,position:[0,0,0]});group.add(s.root,control.root);s.root.position.copy(vec(b.spec?.spout||[c.x,b.box.max.y+.28,c.z]));control.root.position.copy(vec(b.spec?.control||[c.x+.15,b.box.max.y+.025,b.box.min.z-.025]));b.kit={spout:s,control,type};return b.kit;
}
export function placeKitchenKit(system,sinkGroup){return placeKit(system,sinkGroup,'kitchen');}
export function placeBathKit(system,tubGroup){return placeKit(system,tubGroup,'bath');}
