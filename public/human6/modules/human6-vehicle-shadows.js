import * as T from 'three';
import {onSceneView,afterSceneView} from './human6-spatial-batches.js?v=20.2.0';

/** A single depth draw per vehicle, using its actual rendered panel geometry.
 * Door motion and CPU dents update only affected ranges of a persistent buffer.
 * Color, picking, and the independent moving parts remain on their own meshes. */
export function installVehicleShadows({scene,props}){
  const entries=new Map(),disabled=[],inverse=new T.Matrix4(),matrix=new T.Matrix4();
  const stats={vehicles:0,sourceDraws:0,shadowDraws:0,vertexUpdates:0};
  function restore(){for(const m of disabled)m.castShadow=true;disabled.length=0;}
  function release(e){e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.dispose();}
  function prepare(camera,renderer){restore();if(!renderer.shadowMap.enabled||!renderer.shadowMap.autoUpdate&&!renderer.shadowMap.needsUpdate)return;
    const cars=props.cars();for(const [car,e]of entries)if(!cars.includes(car)||!car.group.parent){release(e);entries.delete(car);}
    stats.vehicles=0;stats.sourceDraws=0;stats.shadowDraws=0;
    for(const car of cars){let visible=true;for(let p=car.group;p;p=p.parent)if(!p.visible)visible=false;if(!visible)continue;const sources=[];
      car.group.traverse(m=>{const mat=m.material;if(!m.isMesh||m.isSkinnedMesh||m.isInstancedMesh||m.userData.h6VehicleShadow||!m.castShadow||!m.layers.test(camera.layers)||Array.isArray(mat)||mat.alphaTest||mat.alphaMap||m.customDepthMaterial)return;for(let p=m;p&&p!==car.group;p=p.parent)if(!p.visible)return;sources.push(m);});
      if(sources.length<2)continue;let e=entries.get(car);const signature=sources.map(m=>m.id+':'+m.geometry.id).join(',');
      if(!e||e.signature!==signature){if(e)release(e);let offset=0;const ranges=sources.map(source=>{const geo=source.geometry,count=geo.index?.count??geo.attributes.position.count,r={source,start:offset,count,version:-1,transform:new Float64Array(16).fill(Infinity)};offset+=count;return r;});
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(offset*3),3).setUsage(T.DynamicDrawUsage));geo.setDrawRange(0,0);const material=new T.MeshBasicMaterial({side:T.DoubleSide,colorWrite:false,depthWrite:false}),mesh=new T.Mesh(geo,material);mesh.name='Vehicle depth batch';mesh.userData.h6VehicleShadow=true;mesh.userData.h5Batch=true;mesh.userData.h5DynamicPart=true;mesh.castShadow=true;mesh.onBeforeShadow=()=>geo.setDrawRange(0,offset);mesh.onAfterShadow=()=>geo.setDrawRange(0,0);mesh.onBeforeRender=()=>geo.setDrawRange(0,0);mesh.raycast=()=>{};car.group.add(mesh);mesh.updateMatrixWorld(true);e={mesh,ranges,signature};entries.set(car,e);
      }
      inverse.copy(car.group.matrixWorld).invert();const output=e.mesh.geometry.attributes.position;let dirty=false;
      for(const r of e.ranges){const source=r.source,a=source.geometry.attributes.position,idx=source.geometry.index;matrix.multiplyMatrices(inverse,source.matrixWorld);const m=matrix.elements;let changed=r.version!==a.version;for(let i=0;i<16;i++)if(Math.abs(m[i]-r.transform[i])>1e-6)changed=true;
        if(changed){for(let j=0;j<r.count;j++){const k=idx?idx.getX(j):j,x=a.getX(k),y=a.getY(k),z=a.getZ(k);output.setXYZ(r.start+j,m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]);}output.addUpdateRange(r.start*3,r.count*3);r.transform.set(m);r.version=a.version;dirty=true;stats.vertexUpdates+=r.count;}
        source.castShadow=false;disabled.push(source);
      }
      if(dirty){output.needsUpdate=true;e.mesh.geometry.computeBoundingSphere();}stats.vehicles++;stats.sourceDraws+=sources.length;stats.shadowDraws++;
    }
  }
  const offBefore=onSceneView(scene,prepare),offAfter=afterSceneView(scene,restore);
  return {entries,stats,dispose(){offBefore();offAfter();restore();for(const e of entries.values())release(e);entries.clear();}};
}
