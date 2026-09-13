import {onSceneView} from './human6-spatial-batches.js?v=20.2.0';
import * as T from 'three';
import {wrapMethod} from './human5-common.js?v=20.2.0';

/** One bounded instanced draw replaces transient mesh/material tracer creation. */
export function installTracerPool({scene,props,world}){
  const count=64,mesh=new T.InstancedMesh(new T.CylinderGeometry(.003,.003,1,5),new T.MeshBasicMaterial({vertexColors:false}),count),dummy=new T.Object3D(),direction=new T.Vector3(),up=new T.Vector3(0,1,0),color=new T.Color(),zero=new T.Matrix4().makeScale(0,0,0),ttl=new Float32Array(count);let cursor=0,revision=world.revision;
  mesh.name='Pooled combat tracers';mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);for(let i=0;i<count;i++)mesh.setMatrixAt(i,zero);
  const undo=wrapMethod(props,'beam',()=>function(a,b,tint,life=.04){const i=cursor++%count;direction.copy(b).sub(a);const length=direction.length();dummy.position.copy(a).lerp(b,.5);dummy.scale.set(1,Math.max(.001,length),1);dummy.quaternion.setFromUnitVectors(up,length>.00001?direction.multiplyScalar(1/length):up);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(tint));ttl[i]=Math.min(1,Math.max(.015,life));mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;});
  return {mesh,ttl,tick(dt){if(world.revision!==revision){revision=world.revision;ttl.fill(0);for(let i=0;i<count;i++)mesh.setMatrixAt(i,zero);mesh.instanceMatrix.needsUpdate=true;}let active=0;for(let i=0;i<count;i++){if(ttl[i]<=0)continue;ttl[i]-=dt;if(ttl[i]<=0){mesh.setMatrixAt(i,zero);mesh.instanceMatrix.needsUpdate=true;}else active++;}mesh.visible=active>0&&world.root.visible;},dispose(){undo();mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}};
}

/** Consolidate destructible wall panels per house. Hits and damaged cell
 * matrices still resolve to their original panel/instance, preserving holes. */
export function installWallBatches({world}){
  const entries=[],matrix=new T.Matrix4(),tint=new T.Color(),base=new T.Color();let revision=-1,due=0;
  function clear(){for(const e of entries){e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.dispose();world.pickables=world.pickables.filter(m=>m!==e.mesh);for(const s of e.sources)s.mesh.layers.mask=s.mask;if(e.house?.drawBatches)e.house.drawBatches.delete(e.mesh);}entries.length=0;}
  function build(){const groups=new Map();for(const p of world.fractures.parts){const m=p.mesh,h=m?.userData.h5House;if(!h||!m.isInstancedMesh||groups.get(h)?.has(m))continue;if(!groups.has(h))groups.set(h,new Set());groups.get(h).add(m);}
    for(const [house,set]of groups){const originals=[...set].filter(m=>m.userData.chunks&&m.material.customProgramCacheKey?.()==='mira-wall-ws-14.2');if(originals.length<2)continue;const sources=[],owners=[];let count=0;for(const m of originals){sources.push({mesh:m,start:count,version:-1,colorVersion:-1,color:-1,mask:m.layers.mask});for(let i=0;i<m.count;i++)owners.push({mesh:m,index:i});count+=m.count;m.layers.set(31);}
      const material=originals[0].material.clone();material.color.setHex(0xffffff);material.onBeforeCompile=originals[0].material.onBeforeCompile;material.customProgramCacheKey=originals[0].material.customProgramCacheKey;
      const mesh=new T.InstancedMesh(originals[0].geometry.clone(),material,count);mesh.name=house.name+' destructible wall batch';mesh.receiveShadow=true;world.root.add(mesh);world.pickables.push(mesh);
      const raycast=T.InstancedMesh.prototype.raycast;mesh.raycast=function(rc,hits){const start=hits.length;raycast.call(this,rc,hits);for(let i=start;i<hits.length;i++){const owner=owners[hits[i].instanceId];hits[i].object=owner.mesh;hits[i].instanceId=owner.index;}};
      if(!house.drawBatches)house.drawBatches=new Set();house.drawBatches.add(mesh);entries.push({mesh,sources,house});
    }
  }
  return {entries,tick(dt){if(revision!==world.revision){clear();revision=world.revision;build();}due-=dt;if(due>0)return;due=.10;
    for(const e of entries){let changed=false;e.mesh.castShadow=e.sources.some(s=>s.mesh.castShadow);for(const s of e.sources){const m=s.mesh,cv=m.instanceColor?.version||0,hex=m.material.color.getHex();if(s.version===m.instanceMatrix.version&&s.colorVersion===cv&&s.color===hex)continue;base.copy(m.material.color);for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);e.mesh.setMatrixAt(s.start+i,matrix);if(m.instanceColor)m.getColorAt(i,tint);else tint.setHex(0xffffff);tint.multiply(base);e.mesh.setColorAt(s.start+i,tint);}s.version=m.instanceMatrix.version;s.colorVersion=cv;s.color=hex;changed=true;}if(changed){e.mesh.instanceMatrix.needsUpdate=true;e.mesh.instanceColor.needsUpdate=true;e.mesh.computeBoundingSphere();}}
  },dispose:clear};
}

function homeRoofGeometry(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.5,-.5,-.5,.5,-.5,-.5,-.5,-.5,.5,.5,-.5,.5,-.5,.5,0,.5,.5,0],3));g.setIndex([0,4,1,1,4,5,4,2,5,5,2,3,0,2,4,1,5,3,0,1,2,2,1,3]);g.computeVertexNormals();return g;}

/** Cull subpixel movable details far outside interaction range. Restore before
 * simulation so authored visibility changes remain authoritative. */
export function installFarDetailCull({world,props,mira,camera}){
 const hidden=new Map(),p=new T.Vector3(),v=new T.Vector3(),dummy=new T.Object3D(),color=new T.Color();let proxy=null,roof=null,revision=-1;
 function silhouettes(){proxy?.removeFromParent();roof?.removeFromParent();for(const m of [proxy,roof])if(m){m.dispose();m.geometry.dispose();m.material.dispose();}const houses=world.neighborhood?.houses||[];proxy=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({roughness:.92}),Math.max(1,houses.length));roof=new T.InstancedMesh(homeRoofGeometry(),new T.MeshStandardMaterial({roughness:.94}),Math.max(1,houses.length));proxy.name='Distant home shells';roof.name='Distant home roofs';proxy.frustumCulled=roof.frustumCulled=false;world.scene.add(proxy,roof);proxy.count=roof.count=0;}
 const off=onSceneView(world.scene,view=>api.cull(view),-100);
 function restore(){for(const [g,visible]of hidden)if(g.parent)g.visible=visible;hidden.clear();}
 function hide(g){if(g?.visible&&!hidden.has(g)){hidden.set(g,true);g.visible=false;}}
 const api={restore,cull(view=camera){restore();if(revision!==world.revision){revision=world.revision;silhouettes();}view.getWorldPosition(p);let count=0;for(const g of world.movables||[]){const f=g.userData.furniture;if(f?.held!=null||f?.holds?.size||g.userData.dogItem?.owner)continue;g.getWorldPosition(v);if(v.distanceToSquared(p)>90*90)hide(g);}
   for(const h of world.neighborhood?.houses||[])if(h.bounds.distanceToPoint(p)>80)for(const g of h.contents)if(g.userData.furniture?.held==null&&!g.userData.furniture?.holds?.size)hide(g);
   for(const h of world.neighborhood?.houses||[]){const distance=h.bounds.distanceToPoint(p);if(distance<180)continue;for(const g of h.meshes)hide(g);for(const g of h.drawBatches||[])hide(g);if(distance>1250)continue;dummy.position.set(h.x,1.5,h.z);dummy.rotation.set(0,h.yaw,0);dummy.scale.set(h.w,3,h.d);dummy.updateMatrix();proxy.setMatrixAt(count,dummy.matrix);proxy.setColorAt(count,color.set(h.color));dummy.position.y=3.7;dummy.rotation.y=h.yaw;dummy.scale.set(h.w+.5,1.4,h.d+.5);dummy.updateMatrix();roof.setMatrixAt(count,dummy.matrix);roof.setColorAt(count,color.set(h.roof));count++;}
   for(const m of [proxy,roof]){m.count=count;m.visible=count>0&&world.root.visible;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
   const rack=props.wardrobe?.rack;if(rack&&!props.wardrobe.drags?.size&&rack.getWorldPosition(v).distanceToSquared(p)>70*70)hide(rack);
   for(const car of props.cars())if(!car.driving&&!car.playerRole&&car.group.position.distanceToSquared(p)>180*180)hide(car.group);
   for(const a of mira.actors)if(!a.held&&!a.grabs?.size&&a.group.position.distanceToSquared(p)>180*180)hide(a.group);
   for(const pet of props.dogs?.list?.()||[])if(pet.root.getWorldPosition(v).distanceToSquared(p)>100*100&&!pet._ai?.held)hide(pet.root);
 },dispose(){off();restore();for(const m of [proxy,roof])if(m){m.removeFromParent();m.dispose();m.geometry.dispose();m.material.dispose();}}};return api;
}
