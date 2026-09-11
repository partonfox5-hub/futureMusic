import * as T from 'three';
import {V,wrapMethod} from './human5-common.js?v=19.1.0';
const corners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
function basis(array){const cols=[V(),V(),V()];for(let i=0;i<8;i++)for(let j=0;j<3;j++)cols[j].addScaledVector(V().fromArray(array,i*3),corners[i][j]/8);return new T.Matrix3().set(cols[0].x,cols[1].x,cols[2].x,cols[0].y,cols[1].y,cols[2].y,cols[0].z,cols[1].z,cols[2].z);}
/** Affine shape change about the centroid; the original soft bone owns translation. */
export function cageStrain(target,current){const a=basis(target);if(Math.abs(a.determinant())<1e-12)return new T.Matrix3().set(0,0,0,0,0,0,0,0,0);const f=basis(current).multiply(a.invert()),e=f.elements;
  e[0]-=1;e[4]-=1;e[8]-=1;const norm=Math.hypot(...e),gain=Math.min(1,.22/Math.max(1e-8,norm));for(let i=0;i<9;i++)e[i]*=gain;return f;
}
export function installTissueSurface(actor){
  const tissue=actor.realism?.tissue,surface=actor.surfaceFlesh;if(!tissue||!surface||actor.h5TissueSurface)return actor.h5TissueSurface;
  const strain=Array.from({length:4},()=>new T.Matrix3().set(0,0,0,0,0,0,0,0,0)),center=Array.from({length:4},V),restores=[],materialStates=new Map();
  const ripple=new Float32Array(4),phase={value:0},lastDelta=Array.from({length:4},V),delta=V(),target=V();let lastTime=null;
  const names=['L_Breast','R_Breast','L_Glute','R_Glute'];
  // Use actual soft-bone names rather than assuming numeric skin indices.
  const order=actor.soft.map(s=>s.name).slice(0,4);
  for(const m of actor.skinMeshes){const g=m.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;if(!si||!sw)continue;const w=new Float32Array(si.count*4);for(let i=0;i<si.count;i++)for(let j=0;j<4;j++){const index=order.indexOf(m.skeleton.bones[si.array[i*4+j]]?.name);if(index>=0)w[i*4+index]+=sw.array[i*4+j];}g.setAttribute('h5TissueWeight',new T.BufferAttribute(w,4));}
  const compile=shader=>{
    shader.uniforms.h5Strain={value:strain};shader.uniforms.h5Center={value:center};shader.uniforms.h5Ripple={value:ripple};shader.uniforms.h5TissueTime=phase;
    shader.vertexShader='attribute vec4 h5TissueWeight;uniform mat3 h5Strain[4];uniform vec3 h5Center[4];uniform float h5Ripple[4];uniform float h5TissueTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',`#include <skinning_vertex>
      vec3 h5World=(modelMatrix*vec4(transformed,1.)).xyz;vec3 h5Shape=vec3(0.);
      for(int i=0;i<4;i++){
        vec3 h5D=h5World-h5Center[i];float h5R=length(h5D);
        h5Shape+=h5TissueWeight[i]*h5Strain[i]*h5D;
        h5Shape+=h5TissueWeight[i]*h5Ripple[i]*(sin(h5R*92.-h5TissueTime*21.)*.72+sin(h5R*151.-h5TissueTime*29.)*.28)*exp(-h5R*3.)*h5D/max(.015,h5R);
      }
      float h5Length=length(h5Shape);h5Shape*=min(1.,.006/max(h5Length,.000001));
      transformed+=(inverse(mat3(modelMatrix))*h5Shape);`);
  };
  // Skin and matching shadow materials already call this host hook.
  restores.push(wrapMethod(surface,'installShader',old=>function(shader){const r=old.apply(this,arguments);compile(shader);return r;}));
  for(const mesh of actor.skinMeshes)for(const m of [mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial].filter(Boolean)){const key=m.customProgramCacheKey;materialStates.set(m,key);m.customProgramCacheKey=()=> (key?.call(m)||'')+'/h5-tissue-strain-18';m.needsUpdate=true;}
  const update=()=>{
    const time=actor.time||0,dt=lastTime===null?0:Math.min(.05,Math.max(0,time-lastTime));lastTime=time;phase.value=time;
    for(let j=0;j<order.length;j++){
      const c=tissue.clusters.find(c=>c.soft.name===order[j]);if(!c){strain[j].set(0,0,0,0,0,0,0,0,0);ripple[j]=0;continue;}
      strain[j].copy(cageStrain(c.cluster.target,c.cluster.p));center[j].fromArray(c.cluster.centroid());
      delta.copy(center[j]).sub(target.fromArray(c.cluster.centroid([],c.cluster.target)));
      if(dt>0){
        const speed=delta.distanceTo(lastDelta[j])/dt,amount=actor.h5Dynamics?.options.surfaceRipple||0;
        const excitation=Math.min(amount,speed*.012)*(actor.shape.bodySoftness??.5)*(c.soft.kind==='breast'?.8:1);
        ripple[j]=T.MathUtils.damp(ripple[j],excitation,excitation>ripple[j]?18:8,dt);
      }
      lastDelta[j].copy(delta);
    }
  };
  restores.push(wrapMethod(tissue,'writeBones',old=>function(){const r=old.apply(this,arguments);update();return r;}));
  const api={strain,center,ripple,dispose(){restores.reverse().forEach(f=>f());for(const [m,key] of materialStates){m.customProgramCacheKey=key;m.needsUpdate=true;}delete actor.h5TissueSurface;}};actor.h5TissueSurface=api;return api;
}
