import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

function visibleWithin(source,root){for(let o=source;o;o=o.parent){if(o===root)return true;if(!o.visible)return false;}return false;}
function topology(root){const nodes=new Map();root.traverse(o=>{if(!o.userData.h5Batch)nodes.set(o,o.parent);});return nodes;}
function topologyChanged(entry){let count=0,changed=false;entry.root.traverse(o=>{if(o.userData.h5Batch)return;count++;if(entry.nodes.get(o)!==o.parent)changed=true;});return changed||count!==entry.nodes.size;}
function attached(root){let o=root;while(o.parent)o=o.parent;return !!o.isScene;}
function storeTransform(a,i,m){m.position.toArray(a,i);m.quaternion.toArray(a,i+3);m.scale.toArray(a,i+7);}
function transformChanged(a,i,m){return a[i]!==m.position.x||a[i+1]!==m.position.y||a[i+2]!==m.position.z||a[i+3]!==m.quaternion.x||a[i+4]!==m.quaternion.y||a[i+5]!==m.quaternion.z||a[i+6]!==m.quaternion.w||a[i+7]!==m.scale.x||a[i+8]!==m.scale.y||a[i+9]!==m.scale.z;}
function installSurfaceChannels(m){
  m.roughness=1;m.metalness=1;
  m.onBeforeCompile=s=>{
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 h6Surface;attribute vec3 h6Emission;varying vec2 h6SurfaceValue;varying vec3 h6EmissionValue;').replace('#include <begin_vertex>','#include <begin_vertex>\nh6SurfaceValue=h6Surface;h6EmissionValue=h6Emission;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 h6SurfaceValue;varying vec3 h6EmissionValue;').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=h6SurfaceValue.x;').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=h6SurfaceValue.y;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance=h6EmissionValue;');
  };m.customProgramCacheKey=()=> 'h6-rigid-surface-channels-1';
}
/** Consolidate rigid pieces without flattening their PBR surface values. */
export class RigidBatches {
  constructor(world){this.world=world;this.entries=new Map();this.stats={rebuilds:0,sources:0,batches:0};}
  add(root){const existing=this.entries.get(root);if(existing){if(!topologyChanged(existing))return;this.release(existing);this.entries.delete(root);}root.updateWorldMatrix(true,true);const groups=new Map();
    root.traverse(mesh=>{for(let o=mesh;o&&o!==root;o=o.parent)if(o.userData.h5DynamicPart)return;const m=mesh.material;if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.isInstancedMesh||!m?.isMeshStandardMaterial||(m.isMeshPhysicalMaterial&&!root.userData.h6BatchGlass)||(m.transparent&&!root.userData.h6BatchGlass)||m.alphaTest||m.vertexColors||mesh.layers.mask===0x80000000||mesh.userData.h5Batch||mesh.userData.h5Cushion||mesh.userData.h5TearTab||mesh.customDepthMaterial)return;
      if(m.onBeforeCompile!==T.Material.prototype.onBeforeCompile||m.normalMap||m.roughnessMap||m.alphaMap||m.emissiveMap||m.metalnessMap||m.aoMap||m.bumpMap||m.displacementMap||m.lightMap||m.envMap)return;
      const key=[m.map?.uuid||'',m.side,m.envMapIntensity,m.flatShading,m.depthTest,m.toneMapped,m.dithering,m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits,m.transparent,m.opacity,m.depthWrite,m.isMeshPhysicalMaterial?JSON.stringify([m.clearcoat,m.clearcoatRoughness,m.transmission,m.thickness,m.ior]):'',mesh.castShadow,mesh.receiveShadow].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
    });
    const entry={root,groups:[],nodes:topology(root)};for(const sources of groups.values())if(sources.length>=2)entry.groups.push({sources,mesh:null,material:null,layers:sources.map(m=>m.layers.mask),visibility:new Uint8Array(sources.length),versions:new Int32Array(sources.length),colors:new Uint32Array(sources.length),surface:new Float32Array(sources.length*2),emission:new Float64Array(sources.length*4),transforms:new Float64Array(sources.length*10)});
    if(!entry.groups.length)return;this.entries.set(root,entry);this.rebuild(entry);
  }
  changed(entry){for(const g of entry.groups)for(let i=0;i<g.sources.length;i++){const m=g.sources[i];if(g.visibility[i]!==+visibleWithin(m,entry.root)||g.versions[i]!==m.geometry.attributes.position.version||g.colors[i]!==m.material.color.getHex()||Math.abs(g.surface[i*2]-m.material.roughness)>1e-6||Math.abs(g.surface[i*2+1]-m.material.metalness)>1e-6||g.emission[i*4]!==m.material.emissive.r||g.emission[i*4+1]!==m.material.emissive.g||g.emission[i*4+2]!==m.material.emissive.b||g.emission[i*4+3]!==m.material.emissiveIntensity||transformChanged(g.transforms,i*10,m))return true;}return false;}
  rebuild(entry){this.stats.rebuilds++;const root=entry.root;root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert();
    for(const group of entry.groups){const old=group.mesh;if(old){old.removeFromParent();old.geometry.dispose();this.world.pickables=this.world.pickables.filter(m=>m!==old);}group.mesh=null;
      const geometries=[],ranges=[];let start=0;
      for(const source of group.sources){if(!visibleWithin(source,root)){source.layers.mask=group.layers[group.sources.indexOf(source)];continue;}source.layers.set(31);let g=source.geometry.clone();if(g.index){const indexed=g;g=indexed.toNonIndexed();indexed.dispose();}
        for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
        if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));g.applyMatrix4(inv.clone().multiply(source.matrixWorld));
        const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3)source.material.color.toArray(colors,i);g.setAttribute('color',new T.BufferAttribute(colors,3));const surface=new Float32Array(g.attributes.position.count*2);for(let i=0;i<surface.length;i+=2){surface[i]=source.material.roughness;surface[i+1]=source.material.metalness;}g.setAttribute('h6Surface',new T.BufferAttribute(surface,2));const emission=new Float32Array(g.attributes.position.count*3),e=source.material.emissive,intensity=source.material.emissiveIntensity;for(let i=0;i<emission.length;i+=3){emission[i]=e.r*intensity;emission[i+1]=e.g*intensity;emission[i+2]=e.b*intensity;}g.setAttribute('h6Emission',new T.BufferAttribute(emission,3));g.clearGroups();
        const end=start+g.attributes.position.count/3;ranges.push({source,start,end});start=end;geometries.push(g);
      }
      if(!geometries.length)continue;const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!group.material){group.material=group.sources[0].material.clone();group.material.color.setHex(0xffffff);group.material.vertexColors=true;installSurfaceChannels(group.material);}
      const mesh=new T.Mesh(geometry,group.material);mesh.name='Rigid parts batch';mesh.userData.h5Batch=true;mesh.userData.furnRoot=root.userData.furniture?root:undefined;mesh.castShadow=group.sources[0].castShadow;mesh.receiveShadow=group.sources[0].receiveShadow;
      const raycast=T.Mesh.prototype.raycast;
      mesh.raycast=function(raycaster,out){const hits=[];raycast.call(this,raycaster,hits);for(const hit of hits){const range=ranges.find(r=>hit.faceIndex>=r.start&&hit.faceIndex<r.end);if(!range||!visibleWithin(range.source,root))continue;const original=range.source;hit.object=original;hit.faceIndex-=range.start;if(hit.face){const index=original.geometry.index,t=hit.faceIndex*3;hit.face.a=index?index.getX(t):t;hit.face.b=index?index.getX(t+1):t+1;hit.face.c=index?index.getX(t+2):t+2;}
          if(hit.face){hit.face={...hit.face,normal:hit.face.normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(mesh.matrixWorld)).applyMatrix3(new T.Matrix3().getNormalMatrix(original.matrixWorld.clone().invert())).normalize()};}out.push(hit);}};
      root.add(mesh);this.world.pickables.push(mesh);group.mesh=mesh;
    }for(const g of entry.groups)for(let i=0;i<g.sources.length;i++){const m=g.sources[i];g.visibility[i]=+visibleWithin(m,entry.root);g.versions[i]=m.geometry.attributes.position.version;g.colors[i]=m.material.color.getHex();g.surface[i*2]=m.material.roughness;g.surface[i*2+1]=m.material.metalness;m.material.emissive.toArray(g.emission,i*4);g.emission[i*4+3]=m.material.emissiveIntensity;storeTransform(g.transforms,i*10,m);}
  }
  tick(){for(const [root,e] of this.entries){if(!attached(root)){this.release(e);this.entries.delete(root);continue;}if(topologyChanged(e)){this.add(root);continue;}if(this.changed(e))this.rebuild(e);}this.stats.sources=0;this.stats.batches=0;for(const e of this.entries.values())for(const g of e.groups){this.stats.sources+=g.sources.length;if(g.mesh)this.stats.batches++;}}
  release(e){for(const g of e.groups){g.sources.forEach((m,i)=>m.layers.mask=g.layers[i]);if(g.mesh){g.mesh.removeFromParent();g.mesh.geometry.dispose();this.world.pickables=this.world.pickables.filter(m=>m!==g.mesh);}g.material?.dispose();}}
  clear(){for(const e of this.entries.values())this.release(e);this.entries.clear();}
}
