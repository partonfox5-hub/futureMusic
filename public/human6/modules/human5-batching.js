import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

function visibleWithin(source,root){for(let o=source;o;o=o.parent){if(o===root)return true;if(!o.visible)return false;}return false;}
function attached(root){let o=root;while(o.parent)o=o.parent;return !!o.isScene;}
/** Consolidate rigid, opaque pieces; ray hits still resolve to their original parts. */
export class RigidBatches {
  constructor(world){this.world=world;this.entries=new Map();this.stats={rebuilds:0,sources:0,batches:0};}
  add(root){if(this.entries.has(root))return;root.updateWorldMatrix(true,true);const groups=new Map();
    root.traverse(mesh=>{for(let o=mesh;o&&o!==root;o=o.parent)if(o.userData.h5DynamicPart)return;const m=mesh.material;if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.isInstancedMesh||!m?.isMeshStandardMaterial||m.isMeshPhysicalMaterial||m.transparent||m.alphaTest||m.vertexColors||m.emissive?.getHex()||mesh.layers.mask===(1<<31)||mesh.userData.h5Batch||mesh.userData.h5Cushion||mesh.customDepthMaterial)return;
      if(m.onBeforeCompile!==T.Material.prototype.onBeforeCompile||m.normalMap||m.roughnessMap||m.alphaMap||m.emissiveMap)return;
      const key=[m.map?.uuid||'',m.roughness,m.metalness,m.side,m.envMapIntensity,m.emissive.getHex(),mesh.castShadow,mesh.receiveShadow].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
    });
    const entry={root,groups:[]};for(const sources of groups.values())if(sources.length>=2)entry.groups.push({sources,mesh:null,material:null,layers:sources.map(m=>m.layers.mask),visibility:new Uint8Array(sources.length),versions:new Int32Array(sources.length),colors:new Uint32Array(sources.length)});
    if(!entry.groups.length)return;this.entries.set(root,entry);this.rebuild(entry);
  }
  changed(entry){for(const g of entry.groups)for(let i=0;i<g.sources.length;i++){const m=g.sources[i];if(g.visibility[i]!==+visibleWithin(m,entry.root)||g.versions[i]!==m.geometry.attributes.position.version||g.colors[i]!==m.material.color.getHex())return true;}return false;}
  rebuild(entry){this.stats.rebuilds++;const root=entry.root;root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert();
    for(const group of entry.groups){const old=group.mesh;if(old){old.removeFromParent();old.geometry.dispose();this.world.pickables=this.world.pickables.filter(m=>m!==old);}group.mesh=null;
      const geometries=[],ranges=[];let start=0;
      for(const source of group.sources){source.layers.set(31);if(!visibleWithin(source,root))continue;let g=source.geometry.clone();if(g.index){const indexed=g;g=indexed.toNonIndexed();indexed.dispose();}
        for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
        if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));g.applyMatrix4(inv.clone().multiply(source.matrixWorld));
        const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3)source.material.color.toArray(colors,i);g.setAttribute('color',new T.BufferAttribute(colors,3));g.clearGroups();
        const end=start+g.attributes.position.count/3;ranges.push({source,start,end});start=end;geometries.push(g);
      }
      if(!geometries.length)continue;const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!group.material){group.material=group.sources[0].material.clone();group.material.color.setHex(0xffffff);group.material.vertexColors=true;}
      const mesh=new T.Mesh(geometry,group.material);mesh.name='Rigid parts batch';mesh.userData.h5Batch=true;mesh.userData.furnRoot=root.userData.furniture?root:undefined;mesh.castShadow=group.sources[0].castShadow;mesh.receiveShadow=group.sources[0].receiveShadow;
      const raycast=T.Mesh.prototype.raycast;
      mesh.raycast=function(raycaster,out){const hits=[];raycast.call(this,raycaster,hits);for(const hit of hits){const range=ranges.find(r=>hit.faceIndex>=r.start&&hit.faceIndex<r.end);if(!range||!visibleWithin(range.source,root))continue;const original=range.source;hit.object=original;hit.faceIndex-=range.start;if(hit.face){const index=original.geometry.index,t=hit.faceIndex*3;hit.face.a=index?index.getX(t):t;hit.face.b=index?index.getX(t+1):t+1;hit.face.c=index?index.getX(t+2):t+2;}
          if(hit.face){hit.face={...hit.face,normal:hit.face.normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(mesh.matrixWorld)).applyMatrix3(new T.Matrix3().getNormalMatrix(original.matrixWorld.clone().invert())).normalize()};}out.push(hit);}};
      root.add(mesh);this.world.pickables.push(mesh);group.mesh=mesh;
    }for(const g of entry.groups)for(let i=0;i<g.sources.length;i++){const m=g.sources[i];g.visibility[i]=+visibleWithin(m,entry.root);g.versions[i]=m.geometry.attributes.position.version;g.colors[i]=m.material.color.getHex();}
  }
  tick(){for(const [root,e] of this.entries){if(!attached(root)){this.release(e);this.entries.delete(root);continue;}if(this.changed(e))this.rebuild(e);}this.stats.sources=0;this.stats.batches=0;for(const e of this.entries.values())for(const g of e.groups){this.stats.sources+=g.sources.length;if(g.mesh)this.stats.batches++;}}
  release(e){for(const g of e.groups){g.sources.forEach((m,i)=>m.layers.mask=g.layers[i]);if(g.mesh){g.mesh.removeFromParent();g.mesh.geometry.dispose();this.world.pickables=this.world.pickables.filter(m=>m!==g.mesh);}g.material?.dispose();}}
  clear(){for(const e of this.entries.values())this.release(e);this.entries.clear();}
}
