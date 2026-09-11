import * as T from 'three';
import {hash,noise,smooth,clamp} from './TerrainHeightfield.js';
export const GRASS_PRESETS=Object.freeze({quest:{near:1200,far:600,radius:15},balanced:{near:1600,far:900,radius:19},desktop:{near:2400,far:1600,radius:24}});
export function bladeClump(near=true){
  const p=[],uv=[],index=[],count=near?8:3,segments=near?3:1;
  for(let b=0;b<count;b++){
    const angle=b*2.399,height=.19+hash(b,2)*.19,width=.008+hash(b,4)*.006,lean=.045+hash(b,9)*.095,base=p.length/3;
    for(let k=0;k<=segments;k++){
      const t=k/segments,w=width*Math.pow(1-t,.8),bend=lean*t*t,ox=Math.cos(angle)*.075,oz=Math.sin(angle)*.075;
      for(const sign of [-1,1]){p.push(ox+Math.cos(angle)*w*sign-Math.sin(angle)*bend,height*t,oz+Math.sin(angle)*w*sign+Math.cos(angle)*bend);uv.push((sign+1)/2,t);}
    }
    for(let k=0;k<segments;k++){const a=base+k*2;index.push(a,a+1,a+2);if(k<segments-1)index.push(a+1,a+3,a+2);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
}
function material(clock,viewer,biome){
  const m=new T.MeshStandardMaterial({color:biome==='jungle'?0x789351:0x91a75c,roughness:.85,side:T.DoubleSide});
  m.onBeforeCompile=s=>{
    s.uniforms.grassTime=clock;s.uniforms.grassViewer=viewer;
    s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>
      uniform float grassTime;uniform vec3 grassViewer;varying vec2 bladeUV;varying float grassRootShade;varying float grassTint;
    `).replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 root=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
      bladeUV=uv;float tip=uv.y*uv.y;
      float wave=sin(grassTime*1.65+dot(root.xz,vec2(.62,.41)))+.38*sin(grassTime*3.1+root.x*.93);
      transformed.x+=wave*.035*tip; transformed.z+=wave*.018*tip;
      vec2 away=root.xz-grassViewer.xz;float distanceToPlayer=length(away);
      vec2 bend=away/max(.01,distanceToPlayer)*(1.-smoothstep(.2,.72,distanceToPlayer));
      // World bend projected into this clump's yaw basis (uniform instance scaling).
      vec3 bendWorld=vec3(bend.x,0.,bend.y)*.16*tip;
      transformed.x+=dot(bendWorld,normalize(instanceMatrix[0].xyz));
      transformed.z+=dot(bendWorld,normalize(instanceMatrix[2].xyz));
      transformed.y-=length(bend)*.075*tip;
      grassRootShade=mix(.43,1.,smoothstep(0.,.68,uv.y));
      grassTint=fract(sin(dot(root.xz,vec2(12.9898,78.233)))*43758.5453);
    `);
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 bladeUV;varying float grassRootShade;varying float grassTint;')
      .replace('#include <color_fragment>',`#include <color_fragment>
        float vein=exp(-abs(bladeUV.x-.5)*19.);
        diffuseColor.rgb*=grassRootShade*mix(.76,1.14,grassTint)*(1.+vein*.13);
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.10,1.02,.65),pow(bladeUV.y,6.)*.38);
      `).replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        // Thin-leaf fill, deliberately bounded; regular scene lights still provide the primary lighting.
        reflectedLight.indirectDiffuse+=diffuseColor.rgb*.08*bladeUV.y;
      `);
  };
  m.customProgramCacheKey=()=>`quest-grass-1-${biome}`;return m;
}
export class QuestGrass {
  constructor(field,{root,preset='quest',exclude=()=>false}={}){
    this.field=field;this.options={...GRASS_PRESETS[preset]};if(!this.options.near)throw new Error('Unknown grass preset');
    this.exclude=exclude;this.root=new T.Group();this.root.name='Terrain grass';root?.add(this.root);
    this.time={value:0};this.viewer={value:new T.Vector3()};this.material=material(this.time,this.viewer,field.options.biome);
    this.density=1;this.lastCell='';this.dirty=true;this.rebuildClock=1;this.meshes=[];this.candidates=[];this.dummy=new T.Object3D();
    for(const near of [true,false]){
      const cap=this.options[near?'near':'far'],mesh=new T.InstancedMesh(bladeClump(near),this.material,cap);
      mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.raycast=()=>{};mesh.name=near?'Near grass · curved blades':'Far grass · simple blades';this.root.add(mesh);this.meshes.push(mesh);
    }
    this.off=field.onChange(r=>{const v=this.viewer.value;if(!r.radius||Math.hypot(r.x-v.x,r.z-v.z)<r.radius+this.options.radius){this.dirty=true;this.updateRoots(r);}});
  }
  setDensity(d){this.density=clamp(Number.isFinite(d)?d:1,0,1);this.dirty=true;}
  refresh(){this.dirty=true;this.lastCell='';}
  updateRoots(r){
    for(const mesh of this.meshes){const a=mesh.instanceMatrix.array;let changed=false;
      for(let i=0;i<mesh.count;i++){const k=i*16,x=a[k+12],z=a[k+14];if(r.radius&&Math.hypot(x-r.x,z-r.z)>r.radius+this.field.cell*2)continue;
        a[k+13]=(this.field.heightAt(x,z)??a[k+13])-.008;changed=true;
      }
      if(changed){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();if(mesh.boundingSphere)mesh.boundingSphere.radius+=.4;}
    }
  }
  startBuild(){
    const f=this.field,v=this.viewer.value,r=this.options.radius,seed=f.options.seed;
    // Stable world-cell placement: walking reuses roots instead of randomizing a disc every frame.
    const spacing=.34,minX=Math.floor((v.x-r)/spacing),maxX=Math.ceil((v.x+r)/spacing),minZ=Math.floor((v.z-r)/spacing),maxZ=Math.ceil((v.z+r)/spacing);
    this.job={minX,maxX,minZ,maxZ,i:minX,j:minZ,v:v.clone(),r,seed,spacing,buckets:[[],[]]};
  }
  stepBuild(){
    const job=this.job;if(!job)return;const {minX,maxX,maxZ,v,r,seed,spacing,buckets}=job,f=this.field;
    const begin=performance.now();let operations=0;
    while(job.j<=maxZ){
      if(++operations%64===0&&performance.now()-begin>1.2)return;
      const i=job.i,j=job.j;if(++job.i>maxX){job.i=minX;job.j++;}
      const x=(i+.12+hash(i,j,seed)*.76)*spacing,z=(j+.12+hash(i,j,seed+1)*.76)*spacing,d=Math.hypot(x-v.x,z-v.z);
      if(d>r||!f.contains(x,z))continue;
      const y=f.heightAt(x,z),n=f.normalAt(x,z);
      if(n.y<.80||this.exclude(x,z,y)||f.options.biome==='beach'&&(z<-3||hash(i,j,9)>.35))continue;
      const patch=noise(x*.23,z*.23,seed+10);if(hash(i,j,seed+11)>.56+patch*.37)continue;
      const near=d<r*.48,priority=near?d+hash(i,j,44)*2:hash(i,j,45);
      buckets[near?0:1].push({x,y,z,d,i,j,priority});
    }
    this.job=null;
    this.candidates=buckets;
    for(let b=0;b<2;b++){
      const mesh=this.meshes[b],list=buckets[b];list.sort((a,b)=>a.priority-b.priority);
      const cap=Math.round(this.options[b?'far':'near']*this.density),count=Math.min(cap,list.length);
      for(let k=0;k<count;k++){
        const a=list[k],s=.76+hash(a.i,a.j,seed+5)*.62;
        // Continuous scale fade at the render radius; no alpha blending or fragment discard.
        const fade=1-smooth(r*.79,r,a.d);
        this.dummy.position.set(a.x,(f.heightAt(a.x,a.z)??a.y)-.008,a.z);this.dummy.rotation.set(0,hash(a.i,a.j,seed+6)*Math.PI*2,0);this.dummy.scale.setScalar(s*fade);this.dummy.updateMatrix();mesh.setMatrixAt(k,this.dummy.matrix);
      }
      mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.computeBoundingBox();
      if(mesh.boundingSphere)mesh.boundingSphere.radius+=.4;
      if(mesh.boundingBox)mesh.boundingBox.expandByScalar(.4);
    }
  }
  tick(dt,viewer){
    this.time.value+=dt;this.viewer.value.copy(viewer);this.rebuildClock+=dt;
    const key=Math.floor(viewer.x/.7)+'/'+Math.floor(viewer.z/.7);
    if(!this.job&&(this.dirty||key!==this.lastCell)&&this.rebuildClock>=.12){this.lastCell=key;this.dirty=false;this.rebuildClock=0;this.startBuild();}
    this.stepBuild();
  }
  dispose(){this.off();this.root.removeFromParent();for(const m of this.meshes)m.geometry.dispose();this.material.dispose();}
}
