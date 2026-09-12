import {ANATOMY_ANCHOR as A} from './human5-anatomy-anchor.js?v=19.3.2';
import * as T from 'three';
import {V,clamp,wrapMethod} from './human5-common.js?v=19.3.0';

/** Match normals only at coincident, similarly oriented, compatibly skinned vertices. */
export function weldSkinNormals(actor){
  const buckets=new Map(),seen=new Set();let welded=0;
  for(const mesh of actor.skinMeshes||[]){
    const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
    if(seen.has(p))continue;seen.add(p);
    for(let i=0;i<p.count;i++){
      let dominant=-1,best=-1;for(let j=0;j<4;j++)if(sw?.array[i*4+j]>best){dominant=si.array[i*4+j];best=sw.array[i*4+j];}
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100000)).join('/')+'/'+dominant;
      if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({i,n});
    }
  }
  for(const list of buckets.values())if(list.length>1){
    const first=V().fromBufferAttribute(list[0].n,list[0].i),mean=V(),members=[];
    for(const row of list){const n=V().fromBufferAttribute(row.n,row.i);if(n.dot(first)>.65){mean.add(n);members.push(row);}}
    if(members.length<2)continue;mean.normalize();for(const {n,i} of members){n.setXYZ(i,mean.x,mean.y,mean.z);n.needsUpdate=true;welded++;}
  }return welded;
}

function skinCompile(shader,old,material,{detail=true}={}){
  old?.(shader);
  // GLSL defines smoothstep only for edge0 < edge1. The supplied skin shader
  // contains decreasing constant ranges; make those portable explicitly.
  shader.fragmentShader=shader.fragmentShader.replace(/smoothstep\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,([^)]*)\)/g,(s,a,b,x)=>Number(a)>Number(b)?'(1.0-smoothstep('+b+','+a+','+x+'))':s);
  // Remove four extra albedo blur samples. Proper UV/color seams are repaired
  // separately; blurring all limb albedo hides useful source detail.
  shader.fragmentShader=shader.fragmentShader.replace(/vec3 softAlbedo=\([^;]+;/,'vec3 softAlbedo=sampledDiffuseColor.rgb;');
  shader.fragmentShader=shader.fragmentShader.replace(/sampledDiffuseColor\.rgb=mix\(sampledDiffuseColor\.rgb,softAlbedo,[^;]+;/,'');
  // The supplied torso/limb atlases have different photographed exposure. Use a
  // continuous rest-space base below the jaw; retain facial identity and pore relief.
  shader.fragmentShader=shader.fragmentShader.replace('diffuseColor *= sampledDiffuseColor;', `
    float h5BodyTone=1.-smoothstep(1.38,1.48,v2RestPos.y);
    vec3 h5SkinBase=vec3(.53,.325,.237);
    float h5Variation=clamp(dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722))-.36,-.022,.022);
    vec2 h5Nac=(vec2(abs(v2RestPos.x),v2RestPos.y)-vec2(${A.x},${A.y}))/vec2(${A.rx},${A.ry});
    float h5Radius=length(h5Nac);
    float h5Edge=h5Radius*(1.+.025*sin(atan(h5Nac.y,h5Nac.x)*11.)+.018*sin(v2RestPos.x*791.));
    float h5Areola=(1.-smoothstep(.52,1.08,h5Edge))*smoothstep(.070,.088,v2RestPos.z);
    vec3 h5Anatomy=mix(h5SkinBase,vec3(.365,.183,.150),h5Areola*.84);
    float h5Chest=smoothstep(1.04,1.10,v2RestPos.y)*(1.-smoothstep(1.32,1.38,v2RestPos.y))*smoothstep(.02,.07,v2RestPos.z);
    h5Anatomy+=vec3(h5Variation)*(1.-h5Chest)*(1.-h5Areola*.45);
    sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,h5Anatomy,h5BodyTone);
    diffuseColor *= sampledDiffuseColor;`);
  shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb *= tone;', 'diffuseColor.rgb *= mix(tone,vec3(1.),1.-smoothstep(1.38,1.48,v2RestPos.y));');
  // Millimetre mesh already carries the chest feature. Suppress the atlas
  // normal so photographed relief cannot sit beside the original apex.
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`vec3 h5GeometryNormal=normal;
    #include <normal_fragment_maps>
    normal=normalize(mix(normal,h5GeometryNormal,h5Chest));`);
  if(!detail)return;
  // Stable rest-space pore relief through screen derivatives. No displaced
  // silhouette and no additional texture pass; fade below pixel footprint.
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+
    'vec3 h5P=v2RestPos*900.; float h5Foot=max(length(dFdx(h5P)),length(dFdy(h5P))); float h5Fade=1.-smoothstep(.5,1.8,h5Foot);\n'+
    'float h5Pore=sin(h5P.x)*sin(h5P.y*1.17)*sin(h5P.z*.93);\n'+
    'vec3 h5Q0=dFdx(-vViewPosition),h5Q1=dFdy(-vViewPosition); vec3 h5S=cross(h5Q1,normal),h5T=cross(normal,h5Q0); float h5D=dot(h5Q0,h5S);\n'+
    'normal=normalize(abs(h5D)*normal-sign(h5D)*(dFdx(h5Pore)*h5S+dFdy(h5Pore)*h5T)*0.000025*h5Fade);');
}

export function installSkinRefinement(actor,{detail=true,receiveShadow=true}={}){
  if(actor.h5Skin)return actor.h5Skin;const materials=new Map(),meshState=new Map(),restores=[];let shapeStamp=null;
  function install(){
    actor.seamsReady=true; // Rest-space color and welded normals own seam treatment.
    for(const mesh of actor.skinMeshes||[]){
      if(!meshState.has(mesh))meshState.set(mesh,mesh.receiveShadow);mesh.receiveShadow=receiveShadow;
      const m=mesh.material;if(Array.isArray(m))continue;
      const state=materials.get(m);if(state&&m.onBeforeCompile===state.wrapper)continue;
      const old=m.onBeforeCompile,key=m.customProgramCacheKey;
      const wrapper=s=>skinCompile(s,old,m,{detail});m.onBeforeCompile=wrapper;m.customProgramCacheKey=()=> (key?.call(m)||'')+'/h5-skin-anatomy-19-3-2/'+detail;m.needsUpdate=true;
      materials.set(m,{old,key,wrapper});
    }
  }
  install();restores.push(wrapMethod(actor,'applyLooks',old=>function(){const r=old.apply(this,arguments);install();return r;}));
  restores.push(wrapMethod(actor,'updateShapeGeometry',old=>function(){const r=old.apply(this,arguments);if(this.geomState!==shapeStamp){shapeStamp=this.geomState;weldSkinNormals(this);this.seamsReady=true;}return r;}));
  const api={install,dispose(){restores.reverse().forEach(f=>f());for(const [m,s] of materials)if(m.onBeforeCompile===s.wrapper){m.onBeforeCompile=s.old;m.customProgramCacheKey=s.key;m.needsUpdate=true;}for(const [m,value] of meshState)m.receiveShadow=value;actor.seamsReady=false;delete actor.h5Skin;}};actor.h5Skin=api;return api;
}

/** Load authored UV-compatible maps, with dimensions checked instead of relabeling. */
export async function loadSkinTextureSet(renderer,manifest,{ktx2Loader=null,maxResolution=4096}={}){
  const loader=new T.TextureLoader(),loaded={},warnings=[];
  try{
    for(const [slot,spec] of Object.entries(manifest)){
      const url=spec.url,compressed=/\.ktx2(?:\?|$)/i.test(url);
      if(compressed&&!ktx2Loader)throw new TypeError('Provide an r170 KTX2Loader with detectSupport(renderer) and transcoder path configured');
      const texture=await (compressed?ktx2Loader:loader).loadAsync(url);
      const w=texture.image?.width,h=texture.image?.height;if(!w||!h){texture.dispose();throw new Error('Missing texture dimensions: '+slot);}
      if(w>Math.min(maxResolution,renderer.capabilities.maxTextureSize)||h>Math.min(maxResolution,renderer.capabilities.maxTextureSize)){texture.dispose();throw new RangeError('Texture exceeds device or selected budget: '+slot);}
      if(spec.width&&w!==spec.width){texture.dispose();throw new Error(slot+' expected '+spec.width+' pixels, received '+w);}
      texture.colorSpace=spec.color?T.SRGBColorSpace:T.NoColorSpace;texture.flipY=false;texture.wrapS=T.RepeatWrapping;texture.wrapT=T.ClampToEdgeWrapping;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;loaded[slot]=texture;
      if(!compressed)warnings.push(slot+': uncompressed GPU allocation; PNG/JPEG download size is not GPU memory');
    }
  }catch(error){Object.values(loaded).forEach(t=>t.dispose());throw error;}
  return {textures:loaded,warnings,dispose(){Object.values(loaded).forEach(t=>t.dispose());}};
}
