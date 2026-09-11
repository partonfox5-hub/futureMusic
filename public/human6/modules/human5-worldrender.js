import * as T from 'three';
import {WorldField,WORLD_SIZE,CELL_SIZE,hash2,LAKE,RIVER,OUTFLOW,cellKey} from './human5-worldfield.js?v=17.5.0';
import {createTerrainMaterial} from '../src/terrain/TerrainSurface.js';
const V=()=>new T.Vector3(),clamp=T.MathUtils.clamp;
function geometry(p,ids,uv=null,color=null){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ids);if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(color)g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.computeVertexNormals();g.computeBoundingSphere();return g;}
export function terrainMaterial(){return createTerrainMaterial('meadow');}
/** Generator yields after each row, permitting bounded main-thread build slices. */
export function* terrainCell(field,cx,cz,{n=48,material=null}={}){
 const p=[],ids=[],step=CELL_SIZE/n;
 for(let j=0;j<=n;j++){for(let i=0;i<=n;i++){const x=cx*CELL_SIZE+i*step,z=cz*CELL_SIZE+j*step;p.push(x,field.heightAt(x,z)??0,z);if(i<n&&j<n){const a=j*(n+1)+i,b=a+n+1;ids.push(a,b,a+1,a+1,b,b+1);}}yield;}
 const edges=[];for(let i=0;i<=n;i++)edges.push(i);for(let j=1;j<=n;j++)edges.push(j*(n+1)+n);for(let i=n-1;i>=0;i--)edges.push(n*(n+1)+i);for(let j=n-1;j>0;j--)edges.push(j*(n+1));const first=p.length/3;
 for(const a of edges)p.push(p[a*3],p[a*3+1]-2.5,p[a*3+2]);for(let i=0;i<edges.length;i++){const j=(i+1)%edges.length;ids.push(edges[i],first+i,edges[j],edges[j],first+i,first+j);}
 const geo=geometry(p,ids),normal=geo.attributes.normal;for(const a of edges){const v=field.normalAt(p[a*3],p[a*3+2]);normal.setXYZ(a,v.x,v.y,v.z);}const mesh=new T.Mesh(geo,material);mesh.name='Terrain cell '+cx+'/'+cz;mesh.receiveShadow=true;mesh.userData.h5Terrain=true;return mesh;
}
export function farTerrain(field,material){const n=132,step=WORLD_SIZE/n,p=[],faces=[];for(let j=0;j<=n;j++)for(let i=0;i<=n;i++)p.push(-field.half+i*step,field.heightAt(-field.half+i*step,-field.half+j*step)??0,-field.half+j*step);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;faces.push({key:cellKey(-field.half+(i+.5)*step,-field.half+(j+.5)*step),ids:[a,b,a+1,a+1,b,b+1]});}
 const geo=geometry(p,faces.flatMap(f=>f.ids)),mesh=new T.Mesh(geo,material);mesh.name='Persistent distant terrain';mesh.receiveShadow=true;mesh.raycast=()=>{};
 return {mesh,mask(keys){geo.setIndex(faces.filter(f=>!keys.has(f.key)).flatMap(f=>f.ids));},refresh(){const a=geo.attributes.position;for(let i=0;i<a.count;i++)a.setY(i,field.heightAt(a.getX(i),a.getZ(i))??0);a.needsUpdate=true;geo.computeVertexNormals();}};
}
function strip(points,width,heightAt){const p=[],ids=[],uv=[];let distance=0,previous=null;const samples=[];
 for(let s=0;s<points.length-1;s++){const a=points[s],b=points[s+1],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2);for(let i=0;i<n;i++){const t=i/n;samples.push([T.MathUtils.lerp(a[0],b[0],t),T.MathUtils.lerp(a[1],b[1],t),a[2]!=null?T.MathUtils.lerp(a[2],b[2],t):null]);}}samples.push(points.at(-1));
 for(let i=0;i<samples.length;i++){const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)],s=samples[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;if(previous)distance+=Math.hypot(s[0]-previous[0],s[1]-previous[1]);previous=s;
  for(const side of [-1,1]){const x=s[0]+side*nx*width/2,z=s[1]+side*nz*width/2;p.push(x,heightAt(x,z,s[2]),z);uv.push(side/2+.5,distance);}
  if(i<samples.length-1){const a=i*2;ids.push(a,a+1,a+2,a+2,a+1,a+3);}
 }const g=geometry(p,ids,uv);const n=g.attributes.normal;if(n.getY(Math.min(n.count-1,3))<0){const ids=g.index.array;for(let i=0;i<ids.length;i+=3)[ids[i],ids[i+1]]=[ids[i+1],ids[i]];g.index.needsUpdate=true;g.computeVertexNormals();}return g;
}
export function buildRoutes(field){const root=new T.Group();root.name='Connected roads and hiking trails';const owned=[],mat=(color)=>{const m=new T.MeshStandardMaterial({color,roughness:.94});owned.push(m);return m;},asphalt=mat(0x515858),trail=mat(0x8b7552),walk=mat(0xaaa69a);
 for(const route of field.routes){if(route.kind==='road'&&route.id!=='lake-road'){const m=new T.Mesh(strip(route.points,route.width+2.4,(x,z)=>field.heightAt(x,z)+.035),walk);m.receiveShadow=true;root.add(m);}const m=new T.Mesh(strip(route.points,route.width,(x,z)=>field.heightAt(x,z)+.055),route.kind==='road'?asphalt:trail);m.receiveShadow=true;root.add(m);}
 for(const b of field.blocks){const g=new T.BoxGeometry(b.w+3,.10,b.d+3),m=new T.Mesh(g,walk);m.position.set(b.x,b.y+.035,b.z);m.receiveShadow=true;root.add(m);const entry=[b.x,b.z+b.d/2+1.5],nearest=field.routeAt(...entry);if(nearest){const pts=[entry,[nearest.x,nearest.z]];const path=new T.Mesh(strip(pts,1.6,(x,z)=>field.heightAt(x,z)+.08),walk);path.receiveShadow=true;root.add(path);}}
 return {root,dispose(){root.traverse(m=>m.geometry?.dispose());owned.forEach(m=>m.dispose());root.removeFromParent();}};
}
export function createLandscapeWater(field){const root=new T.Group(),time={value:0};root.name='Lake, river and outflow';
 const material=new T.MeshStandardMaterial({color:0x4e9299,roughness:.22,metalness:.13,transparent:true,opacity:.78,depthWrite:false,side:T.DoubleSide});
 material.onBeforeCompile=s=>{s.uniforms.h5WaterTime=time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 h5WaterPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nh5WaterPoint=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float h5WaterTime;varying vec3 h5WaterPoint;').replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(sin(h5WaterPoint.x*1.7+h5WaterTime)*.035,0.,cos(h5WaterPoint.z*2.1-h5WaterTime)*.035));');};material.customProgramCacheKey=()=> 'h5-landscape-water-1';
 const p=[LAKE.x,LAKE.level,LAKE.z],ids=[];for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;p.push(LAKE.x+Math.sin(a)*LAKE.rx,LAKE.level,LAKE.z+Math.cos(a)*LAKE.rz);if(i<128)ids.push(0,i+1,i+2);}root.add(new T.Mesh(geometry(p,ids),material));
 for(const pts of [RIVER,OUTFLOW])root.add(new T.Mesh(strip(pts,pts===RIVER?12:15,(_x,_z,y)=>y),material));
 const lavaMat=new T.MeshStandardMaterial({color:0x601e05,emissive:0xe04305,emissiveIntensity:1.5,roughness:.67}),lava=new T.Mesh(new T.CircleGeometry(18,48),lavaMat);lava.rotation.x=-Math.PI/2;lava.position.set(665,field.heightAt(665,-565)+4,-565);root.add(lava);lava.userData.h5Lava=true;
 const smokeMat=new T.MeshBasicMaterial({color:0x686565,transparent:true,opacity:.2,depthWrite:false}),smoke=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),smokeMat,10);smoke.frustumCulled=false;root.add(smoke);const dummy=new T.Object3D();
 return {root,lava,tick(dt,viewer){time.value+=dt;lavaMat.emissiveIntensity=1.3+.16*Math.sin(time.value*2);smoke.visible=viewer.distanceToSquared(lava.position)<850*850;if(smoke.visible){for(let i=0;i<10;i++){const t=(time.value*.08+i/10)%1;dummy.position.copy(lava.position).add(new T.Vector3(t*15,4+t*75,Math.sin(i)*t*7));dummy.scale.setScalar(2+t*8);dummy.updateMatrix();smoke.setMatrixAt(i,dummy.matrix);}smoke.instanceMatrix.needsUpdate=true;}},dispose(){root.removeFromParent();root.traverse(m=>m.geometry?.dispose());material.dispose();lavaMat.dispose();smokeMat.dispose();}};
}
export function createForestCell(field,cx,cz,state,{quest=true}={}){
 const root=new T.Group();root.name='Forest '+cx+'/'+cz;const count=quest?100:170,trees=[],trunkMat=new T.MeshStandardMaterial({color:0x67533d,roughness:.95}),leafMat=new T.MeshStandardMaterial({color:0x48623c,roughness:1,vertexColors:false}),pineMat=new T.MeshStandardMaterial({color:0x35554a,roughness:1});
 const trunk=new T.InstancedMesh(new T.CylinderGeometry(.12,.21,1,7),trunkMat,count),broad=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),leafMat,count*2),pine=new T.InstancedMesh(new T.ConeGeometry(1,1,8),pineMat,count*2);root.add(trunk,broad,pine);for(const m of [trunk,broad,pine]){m.castShadow=m.receiveShadow=true;m.userData.h5Forest=trees;m.frustumCulled=true;}const dummy=new T.Object3D();let n=0;
 for(let i=0;i<count*3&&n<count;i++){const x=(cx+hash2(i,cx,cz*373+79))*CELL_SIZE,z=(cz+hash2(i,cz,cx*353+191))*CELL_SIZE,y=field.heightAt(x,z),route=field.routeAt(x,z);if(y===null||field.protected(x,z)||(x>52&&x<371&&z>-175&&z<145)||field.waterAt(x,z)||y>86||Math.hypot(x-665,z+565)<242||(route&&route.distance<route.route.width/2+3)||Math.max(Math.abs(x)/38,Math.abs(z)/44)<1.1)continue;
  const density=.4+.6*hash2(Math.floor(x/100),Math.floor(z/100),987);if(hash2(i,cx+cz,736)>density)continue;
  const id=cx+'/'+cz+'/'+i,kind=hash2(i,cz,99)>.55?'pine':'broad',height=6+hash2(i,cz,19)*7,tree={id,index:n,kind,x,y,z,height,health:state.damage.get(id)??110,dead:state.felled.has(id),fuel:null};trees.push(tree);
  dummy.position.set(x,y+height*.44,z);dummy.rotation.set(0,hash2(i,cz,32)*6.28,0);dummy.scale.set(tree.dead?0:1,height*.88,tree.dead?0:1);dummy.updateMatrix();trunk.setMatrixAt(n,dummy.matrix);
  for(let j=0;j<2;j++){dummy.position.set(x+(kind==='broad'?(j-.5)*1.8:0),y+height*(.70+j*.16),z);dummy.scale.set(tree.dead?0:kind==='pine'?2.7-j*.6:2.4,height*(kind==='pine'?.48:.32),tree.dead?0:kind==='pine'?2.7-j*.6:2.4);dummy.updateMatrix();(kind==='pine'?pine:broad).setMatrixAt(n*2+j,dummy.matrix);dummy.scale.setScalar(0);dummy.updateMatrix();(kind==='pine'?broad:pine).setMatrixAt(n*2+j,dummy.matrix);}
  n++;
 }
 trunk.count=n;broad.count=pine.count=n*2;for(const m of [trunk,broad,pine]){m.instanceMatrix.needsUpdate=true;m.computeBoundingBox();m.computeBoundingSphere();}broad.userData.h5Leaf=true;pine.userData.h5Leaf=true;
 const api={root,trees,trunk,broad,pine,remove(tree){tree.dead=true;state.felled.add(tree.id);dummy.scale.setScalar(0);dummy.position.set(0,0,0);dummy.updateMatrix();trunk.setMatrixAt(tree.index,dummy.matrix);for(const m of [broad,pine])for(let j=0;j<2;j++)m.setMatrixAt(tree.index*2+j,dummy.matrix);for(const m of [trunk,broad,pine])m.instanceMatrix.needsUpdate=true;},dispose(){root.removeFromParent();for(const m of [trunk,broad,pine]){m.geometry.dispose();m.material.dispose();}}};for(const t of trees)t.forest=api;return api;
}

/** Distant canopy stands: one unshadowed draw, replaced by resident tree geometry. */
export function createFarForest(field){const trees=[];for(let iz=0;iz<88;iz++)for(let ix=0;ix<88;ix++){
 const x=-field.half+(ix+.18+.64*hash2(ix,iz,921))*24,z=-field.half+(iz+.18+.64*hash2(ix,iz,217))*24,h=field.heightAt(x,z),r=field.routeAt(x,z);
 if(h===null||h>85||field.protected(x,z)||(x>52&&x<371&&z>-175&&z<145)||field.waterAt(x,z)||(r&&r.distance<r.route.width/2+7)||Math.hypot(x-665,z+565)<240||Math.max(Math.abs(x)/40,Math.abs(z)/48)<1.1||hash2(ix,iz,211)>.74)continue;
 trees.push({x,z,y:h,height:7+hash2(ix,iz,573)*5,key:cellKey(x,z),color:hash2(ix,iz,651)});
 }
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1}),mesh=new T.InstancedMesh(new T.ConeGeometry(1,1,7),material,trees.length),dummy=new T.Object3D(),color=new T.Color();mesh.name='Distant forest canopy';mesh.raycast=()=>{};
 const mask=keys=>{for(let i=0;i<trees.length;i++){const t=trees[i],hidden=keys.has(t.key);dummy.position.set(t.x,t.y+t.height*.5,t.z);dummy.scale.set(hidden?0:3.4,t.height,hidden?0:3.4);dummy.rotation.set(0,t.color*6.28,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.setRGB(.10+t.color*.04,.17+t.color*.05,.10+t.color*.025));}mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();};mask(new Set());
 return {mesh,mask,dispose(){mesh.removeFromParent();mesh.geometry.dispose();material.dispose();}};
}
