import {T,V} from './math.js?v=4.0.0';
import {texture} from './textures.js?v=4.0.0';
import {chunkEdge} from './fracture.js?v=4.0.0';

// One curved shell mesh, instanced for all fragments from a given surface.
// Original pose samples the source wall; current pose moves the fragment.
function shellGeometry(){
 const p=[],norm=[],uv=[],index=[],n=40,rings=3;
 for(const bottom of [false,true]){
  const start=p.length/3;
  for(let ring=0;ring<=rings;ring++)for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=ring/rings*chunkEdge(a);p.push(Math.cos(a)*r,bottom?-1:0,Math.sin(a)*r);norm.push(0,bottom?-1:1,0);uv.push(i/n,ring/rings);}
  for(let r=0;r<rings;r++)for(let i=0;i<n;i++){const a=start+r*(n+1)+i,b=a+n+1;if(bottom)index.push(a,b,a+1,b,b+1,a+1);else index.push(a,a+1,b,b,a+1,b+1);}
 }
 const start=p.length/3;
 for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=chunkEdge(a);for(const y of [0,-1]){p.push(Math.cos(a)*r,y,Math.sin(a)*r);norm.push(Math.cos(a),0,Math.sin(a));uv.push(i/n,-y);}}
 for(let i=0;i<n;i++){const a=start+i*2;index.push(a,a+2,a+1,a+2,a+3,a+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);return g;
}
class HullBatch{
 constructor(scene,surface,source){
  this.scene=scene;this.surface=surface;this.source=source;this.capacity=0;this.count=0;
  const map=texture(surface.base);map.wrapS=map.wrapT=T.RepeatWrapping;
  this.material=new T.MeshStandardMaterial({map,metalness:.54,roughness:.52,side:T.DoubleSide});this.material.forceSinglePass=true;
  this.material.onBeforeCompile=shader=>{
   shader.uniforms.hullRadius={value:source.r};shader.uniforms.hullTube={value:source.len?1:0};shader.uniforms.hullLength={value:source.len||1};
   shader.vertexShader=`attribute vec3 sourcePosition; attribute vec4 sourceRotation; attribute float patchSize;
    uniform float hullRadius; uniform float hullTube; uniform float hullLength;
    vec3 rotateSource(vec4 q,vec3 p){return p+2.0*cross(q.xyz,cross(q.xyz,p)+q.w*p);}
    `+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
    if(abs(normal.y)>.5){objectNormal=normalize(vec3(position.x*patchSize/hullRadius,1.0,position.z*patchSize/hullRadius*(1.0-hullTube)))*normal.y;}`);
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
    vec2 xy=position.xz*patchSize;
    float rr=xy.x*xy.x+xy.y*xy.y*(1.0-hullTube);
    float layerR=hullRadius+position.y*.24;
    vec3 transformed=vec3(xy.x,sqrt(max(.01,layerR*layerR-rr))-hullRadius,xy.y);
    vec3 original=rotateSource(sourceRotation,transformed)+sourcePosition;
    if(hullTube>.5){vMapUv=vec2(atan(original.x,original.z)/6.2831853,.5+original.y/hullLength);}
    else{vec3 n=normalize(original);vMapUv=vec2(atan(n.z,-n.x)/6.2831853,1.0-acos(clamp(n.y,-1.0,1.0))/3.14159265);}
   `);
  };
  this.material.customProgramCacheKey=()=> 'netknight-source-shell-v4';this.resize(8);
 }
 resize(n){if(n<=this.capacity)return;this.capacity=2**Math.ceil(Math.log2(n));const previous=this.mesh;if(previous)this.scene.remove(previous);
  const geo=shellGeometry();for(const [name,size]of [['sourcePosition',3],['sourceRotation',4],['patchSize',1]])geo.setAttribute(name,new T.InstancedBufferAttribute(new Float32Array(this.capacity*size),size).setUsage(T.DynamicDrawUsage));
  this.mesh=new T.InstancedMesh(geo,this.material,this.capacity);this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.frustumCulled=false;if(previous){this.mesh.instanceMatrix.array.set(previous.instanceMatrix.array);for(const name of ['sourcePosition','sourceRotation','patchSize'])geo.attributes[name].array.set(previous.geometry.attributes[name].array);previous.geometry.dispose();previous.dispose();}this.scene.add(this.mesh);
 }
 add(e){this.resize(this.count+1);const i=this.count++,m=new T.Matrix4().compose(e.p,e.q,V(1,1,1)),p=e.source.origin.clone(),q=e.source.q.clone();
  if(e.source.type==='sphere')p.sub(this.source.c);else{p.sub(this.source.mid).applyQuaternion(this.source.inv);q.premultiply(this.source.inv);}
  this.mesh.setMatrixAt(i,m);const a=this.mesh.geometry.attributes;a.sourcePosition.setXYZ(i,p.x,p.y,p.z);a.sourceRotation.setXYZW(i,q.x,q.y,q.z,q.w);a.patchSize.setX(i,e.scale||1);
 }
 end(){this.mesh.count=this.count;this.mesh.visible=this.count>0;if(!this.count)return;this.mesh.instanceMatrix.needsUpdate=true;for(const name of ['sourcePosition','sourceRotation','patchSize'])this.mesh.geometry.attributes[name].needsUpdate=true;}
 dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.dispose();this.material.map.dispose();this.material.dispose();}
}
export class HullView{
 constructor(scene,world){this.scene=scene;this.world=world;this.batches=new Map();this.visible=0;}
 update(g){for(const b of this.batches.values())b.count=0;this.visible=0;
  for(const e of g.entities){if(!e.alive||e.type!=='hullChunk'||!e.source||e.p.distanceToSquared(g.player.p)>120*120)continue;
   const key=e.source.type+e.source.id;let batch=this.batches.get(key);
   if(!batch){const sphere=e.source.type==='sphere',surface=(sphere?this.world.shells:this.world.tubes)[e.source.id];batch=new HullBatch(this.scene,surface,sphere?surface.s:surface.t);this.batches.set(key,batch);}
   batch.add(e);this.visible++;
  }for(const b of this.batches.values())b.end();
 }
 dispose(){for(const b of this.batches.values())b.dispose();}
}
