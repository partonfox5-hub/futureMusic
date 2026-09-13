import * as T from 'three';

const hooks=new WeakMap();
export function onSceneView(scene,fn,priority=0){let h=hooks.get(scene);if(!h){h={original:scene.onBeforeRender,list:new Map(),ordered:[]};h.callback=function(r,s,c,t){h.original.call(this,r,s,c,t);for(const f of h.ordered)f(c,r);};scene.onBeforeRender=h.callback;hooks.set(scene,h);}h.list.set(fn,priority);h.ordered=[...h.list.keys()].sort((a,b)=>h.list.get(a)-h.list.get(b));return ()=>{h.list.delete(fn);h.ordered=h.ordered.filter(f=>f!==fn);if(!h.list.size){if(scene.onBeforeRender===h.callback)scene.onBeforeRender=h.original;hooks.delete(scene);}};}


/** Frusta are prepared before Three r170 builds its render list. XR uses both
 * eyes; mirrors and portals get their own camera on every render invocation. */
export class ViewCells {
  constructor(){this.frusta=[new T.Frustum(),new T.Frustum()];this.matrix=new T.Matrix4();this.eye=new T.Vector3();this.projection=new T.Matrix4();this.count=0;this.radius=0;}
  set(camera,farLimit=Infinity){const cameras=camera.isArrayCamera?camera.cameras:[camera];this.count=cameras.length;this.radius=0;for(let i=0;i<this.count;i++){if(!this.frusta[i])this.frusta[i]=new T.Frustum();const c=cameras[i];this.projection.copy(c.projectionMatrix);const e=this.projection.elements;if(c.isPerspectiveCamera&&Number.isFinite(farLimit)){const near=e[14]/(e[10]-1),far=Math.max(near+.01,Math.min(c.far,farLimit));e[10]=-(far+near)/(far-near);e[14]=-2*far*near/(far-near);const tx=(1+Math.abs(e[8]))/Math.abs(e[0]),ty=(1+Math.abs(e[9]))/Math.abs(e[5]);this.radius=Math.max(this.radius,far*Math.sqrt(1+tx*tx+ty*ty));}else this.radius=Math.max(this.radius,c.far||1800);this.matrix.multiplyMatrices(this.projection,c.matrixWorldInverse);this.frusta[i].setFromProjectionMatrix(this.matrix);}this.eye.setFromMatrixPosition(camera.matrixWorld);}

  sees(box){for(let i=0;i<this.count;i++)if(this.frusta[i].intersectsBox(box))return true;return false;}
}

/** Combine compatible instanced cell meshes without merging their simulation.
 * Sources retain their own hit IDs; cold/warm cells never enter these draws.
 * Keep shadow casters even outside the main frustum so shadows cannot pop. */
export class CellBatches {
  constructor(scene,world,name,{pickable=true}={}){this.pickable=pickable;this.scene=scene;this.world=world;this.root=new T.Group();this.root.name=name;scene.add(this.root);this.sources=new Set();this.entries=new Map();this.view=new ViewCells();this.matrix=new T.Matrix4();this.color=new T.Color();this.stats={sources:0,draws:0,instances:0,uploads:0};this.off=onSceneView(scene,camera=>this.prepare(camera));}
  add(source){if(this.sources.has(source))return;source.userData.h6CellLayer=source.layers.mask;source.layers.set(31);this.sources.add(source);}
  remove(source){if(!this.sources.delete(source))return;source.layers.mask=source.userData.h6CellLayer;delete source.userData.h6CellLayer;}
  visible(source){for(let p=source;p;p=p.parent)if(!p.visible)return false;return !!source.parent;}
  prepare(camera){this.view.set(camera);const groups=new Map();for(const s of this.sources){if(!s.count||!this.visible(s))continue;if(!s.boundingBox)s.computeBoundingBox();const visible=this.view.sees(s.boundingBox);if(!visible&&!s.castShadow)continue;const key=s.geometry.uuid+'/'+s.material.uuid+'/'+ +s.castShadow;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
    this.stats.sources=0;this.stats.draws=0;this.stats.instances=0;
    for(const [key,e]of this.entries)if(!groups.has(key)){e.mesh.visible=false;e.signature='';}
    for(const [key,list]of groups){const count=list.reduce((n,s)=>n+s.count,0);let e=this.entries.get(key);if(!e||e.mesh.instanceMatrix.count<count){if(e)this.release(e);const source=list[0],mesh=new T.InstancedMesh(source.geometry,source.material,Math.max(256,2**Math.ceil(Math.log2(count))));mesh.name=this.root.name;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count*3).fill(1),3).setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;this.root.add(mesh);mesh.updateMatrixWorld(true);e={mesh,owners:[],signature:''};const entry=e,raycast=T.InstancedMesh.prototype.raycast;mesh.raycast=function(rc,out){const start=out.length;raycast.call(this,rc,out);for(let i=start;i<out.length;i++){const owner=entry.owners[out[i].instanceId];out[i].object=owner.source;out[i].instanceId=owner.index;}};if(this.pickable)this.world.pickables.push(mesh);else mesh.raycast=()=>{};this.entries.set(key,e);}
      const signature=list.map(s=>s.id+':'+s.count+':'+s.instanceMatrix.version+':'+(s.instanceColor?.version||0)).join(',');e.mesh.visible=true;e.mesh.count=count;
      if(e.signature!==signature){e.owners.length=0;let n=0;for(const s of list){e.mesh.instanceMatrix.array.set(s.instanceMatrix.array.subarray(0,s.count*16),n*16);if(s.instanceColor)e.mesh.instanceColor.array.set(s.instanceColor.array.subarray(0,s.count*3),n*3);else e.mesh.instanceColor.array.fill(1,n*3,(n+s.count)*3);for(let i=0;i<s.count;i++)e.owners.push({source:s,index:i});n+=s.count;}e.mesh.instanceMatrix.needsUpdate=true;e.mesh.instanceColor.needsUpdate=true;e.mesh.computeBoundingSphere();e.signature=signature;this.stats.uploads++;}
      this.stats.sources+=list.length;this.stats.draws++;this.stats.instances+=count;
    }
    // Geometry/season/LOD combinations are bounded by shared assets. Release
    // groups whose assets no longer have sources (e.g. a complete world reset).
    for(const [key,e]of this.entries)if(!groups.has(key)&&![...this.sources].some(s=>key===s.geometry.uuid+'/'+s.material.uuid+'/'+ +s.castShadow)){this.release(e);this.entries.delete(key);}
  }
  release(e){e.mesh.removeFromParent();e.mesh.dispose();this.world.pickables=this.world.pickables.filter(m=>m!==e.mesh);}
  dispose(){for(const s of [...this.sources])this.remove(s);for(const e of this.entries.values())this.release(e);this.entries.clear();this.root.removeFromParent();this.off();}
}

const afterHooks=new WeakMap();
export function afterSceneView(scene,fn){let h=afterHooks.get(scene);if(!h){h={original:scene.onAfterRender,list:new Set()};h.callback=function(r,s,c){h.original.call(this,r,s,c);for(const f of h.list)f(c,r);};scene.onAfterRender=h.callback;afterHooks.set(scene,h);}h.list.add(fn);return ()=>{h.list.delete(fn);if(!h.list.size){if(scene.onAfterRender===h.callback)scene.onAfterRender=h.original;afterHooks.delete(scene);}};}

/** Keep one draw per static material while submitting only visible spatial bins.
 * Geometry stays immutable; a persistent index buffer selects local triangles. */
export function spatialGeometry(mesh,scene,{size=192,far=1250}={}){
 const geometry=mesh.geometry,position=geometry.attributes.position,source=geometry.index?.array.slice()||Uint32Array.from({length:position.count},(_,i)=>i),buckets=new Map(),point=new T.Vector3(),view=new ViewCells();let signature=null;const stats={totalTriangles:source.length/3,visibleTriangles:0,testedBuckets:0,uploads:0};
 for(let i=0;i<source.length;i+=3){let x=0,z=0;for(let j=0;j<3;j++){x+=position.getX(source[i+j]);z+=position.getZ(source[i+j]);}const key=Math.floor(x/(3*size))+'/'+Math.floor(z/(3*size));if(!buckets.has(key))buckets.set(key,{key,indices:[],box:new T.Box3()});const b=buckets.get(key);for(let j=0;j<3;j++){b.indices.push(source[i+j]);point.fromBufferAttribute(position,source[i+j]);b.box.expandByPoint(point);}}
 for(const b of buckets.values())b.indices=source.constructor.from(b.indices);geometry.setIndex(new T.BufferAttribute(source.slice(),1).setUsage(T.DynamicDrawUsage));mesh.frustumCulled=false;
 function prepare(camera){view.set(camera,far);const radius=view.radius+size,selected=[];stats.testedBuckets=0;for(let z=Math.floor((view.eye.z-radius)/size);z<=Math.floor((view.eye.z+radius)/size);z++)for(let x=Math.floor((view.eye.x-radius)/size);x<=Math.floor((view.eye.x+radius)/size);x++){const b=buckets.get(x+'/'+z);if(!b)continue;stats.testedBuckets++;if(view.sees(b.box))selected.push(b);}
  const next=selected.map(b=>b.key).join(',');if(next===signature)return;signature=next;let n=0;for(const b of selected){geometry.index.array.set(b.indices,n);n+=b.indices.length;}geometry.setDrawRange(0,n);if(n){geometry.index.addUpdateRange(0,n);geometry.index.needsUpdate=true;stats.uploads++;}stats.visibleTriangles=n/3;
 }
 const off=onSceneView(scene,prepare);return {stats,dispose:off};
}
