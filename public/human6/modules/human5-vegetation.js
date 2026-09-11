import {seasons} from './human5-seasons.js?v=18.0.0';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {hash2,CELL_SIZE} from './human5-worldfield.js?v=18.0.0';
import {V,wrapMethod,clamp,disposeTree} from './human5-common.js?v=18.0.0';

function grassGeometry(){const p=[],uv=[],idx=[];for(let blade=0;blade<9;blade++){const angle=blade*2.399,rad=.035*Math.sqrt(blade),x=Math.cos(angle)*rad,z=Math.sin(angle)*rad,start=p.length/3;for(let j=0;j<4;j++){const t=j/3,w=(1-t)*.019+.001,bend=t*t*.16;for(const side of [-1,1]){p.push(x+Math.cos(angle)*w*side+Math.sin(angle)*bend,t,z+Math.sin(angle)*w*side+Math.cos(angle)*bend);uv.push(side/2+.5,t);}}for(let j=0;j<3;j++){const a=start+j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function fernGeometry(){const parts=[];for(let f=0;f<7;f++){const yaw=f*Math.PI*2/7;for(let i=1;i<7;i++)for(const s of [-1,1]){const leaf=new T.PlaneGeometry(.09*(1-i/8),.17*(1-i/9));leaf.rotateZ(s*.7);leaf.rotateX(-Math.PI*.3);leaf.translate(s*.055,i*.06,.07+i*.055);leaf.rotateY(yaw);parts.push(leaf);}}const g=mergeGeometries(parts);parts.forEach(g=>g.dispose());return g;}
function flowerGeometry(){const parts=[];const tint=(g,c)=>{const color=new T.Color(c),a=[];for(let i=0;i<g.attributes.position.count;i++)a.push(color.r,color.g,color.b);g.setAttribute('color',new T.Float32BufferAttribute(a,3));parts.push(g);};const stem=new T.CylinderGeometry(.006,.009,.40,5);stem.translate(0,.20,0);tint(stem,0x5e7440);for(let i=0;i<6;i++){const angle=i*Math.PI/3,g=new T.CircleGeometry(.042,7);g.scale(.62,1,1);g.rotateX(-Math.PI/2);g.rotateY(angle);g.translate(Math.sin(angle)*.037,.41,Math.cos(angle)*.037);tint(g,0xe5d8aa);}const center=new T.CircleGeometry(.025,8);center.rotateX(-Math.PI/2);center.translate(0,.413,0);tint(center,0xc9a442);const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g;}
function plantMaterial(color,{wind=true}={}){const m=new T.MeshStandardMaterial({color,roughness:.98,side:T.DoubleSide});m.userData.time={value:0};m.onBeforeCompile=s=>{s.uniforms.h5PlantTime=m.userData.time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float h5PlantTime;');if(wind)s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec3 h5PlantBase=(instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
 float h5Wind=sin(h5PlantTime*1.8+h5PlantBase.x*.55+h5PlantBase.z*.4)*.018+sin(h5PlantTime*3.1+h5PlantBase.z)*.006;
 transformed.x+=h5Wind*position.y*position.y;transformed.z+=h5Wind*.45*position.y;`);};m.customProgramCacheKey=()=>`h5-plants-17.3-${wind}`;return m;}
export class GrassCuts {
 constructor(){this.heights=new Map();}
 key(x,z){return Math.floor(x/.45)+'/'+Math.floor(z/.45);}
 get(x,z,full){return Math.min(full,this.heights.get(this.key(x,z))??full);}
 cut(x,z,height){const k=this.key(x,z),v=clamp(height,.015,.65);if(this.heights.size>=16000&&!this.heights.has(k))return false;this.heights.set(k,Math.min(this.heights.get(k)??Infinity,v));return true;}
 serialize(){return [...this.heights];}
 restore(data){if(!Array.isArray(data)||data.length>16000)throw Error('Invalid grass state');const next=new Map();for(const [k,v]of data){if(!/^-?\d+\/-?\d+$/.test(k)||!Number.isFinite(v)||v<.015||v>.65)throw Error('Invalid grass cut');next.set(k,v);}this.heights=next;}
}
export function installVegetation({world,props,camera,upgrade,quest=true}={}){
 world.h5Seasons=seasons;
 const region=world.h5OpenWorld,root=new T.Group(),cuts=new GrassCuts(),clusters=new Map(),dummy=new T.Object3D(),restores=[];root.name='Living understory';world.scene.add(root);let time=0,scan=0,lastGrass='',fuel=null,grassRecords=[],grassByCell=new Map();const maxGrass=quest?1700:3200;
 const gm=plantMaterial(0xffffff),grass=new T.InstancedMesh(grassGeometry(),gm,maxGrass);grass.name='Cuttable mixed meadow';grass.frustumCulled=false;grass.count=0;grass.receiveShadow=true;grass.instanceMatrix.setUsage(T.DynamicDrawUsage);grass.userData.h5Grass=true;root.add(grass);
 function grassAt(p){return grassByCell.get(cuts.key(p.x,p.z));}
 grass.raycast=(rc,hits)=>{if(!grass.userData.h5RayCut)return;const ray=rc.ray,max=Math.min(rc.far,14);for(let d=Math.max(0,rc.near);d<max;d+=.12){const p=ray.at(d,V()),r=grassAt(p);if(!r)continue;const h=cuts.get(r.x,r.z,r.height);if(p.y>r.y&&p.y<r.y+h&&Math.hypot(p.x-r.x,p.z-r.z)<.16){hits.push({distance:d,point:p,object:grass,instanceId:r.i,face:{normal:new T.Vector3(0,1,0)}});return;}}};
 function eligible(x,z){const f=region.field,y=f.heightAt(x,z);if(y===null||y>93||f.waterAt(x,z)||f.protected(x,z))return false;const road=f.routeAt(x,z);return !road||road.distance>road.route.width*.5+.5;}
 function setGrass(r){const h=cuts.get(r.x,r.z,r.height);dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(0,r.yaw,0);dummy.scale.set(1,h,1);dummy.updateMatrix();grass.setMatrixAt(r.i,dummy.matrix);}
 function rebuildGrass(p){const cx=Math.floor(p.x/5.4)*5.4,cz=Math.floor(p.z/5.4)*5.4,k=cx+'/'+cz+'/'+region.field.revision;if(k===lastGrass||fuel?.burning)return;lastGrass=k;gm.color.setHex(0xffffff);grassRecords=[];grassByCell.clear();const step=.45,R=10.8;
  for(let z=cz-R;z<cz+R&&grassRecords.length<maxGrass;z+=step)for(let x=cx-R;x<cx+R&&grassRecords.length<maxGrass;x+=step){const a=Math.floor(x/step),b=Math.floor(z/step),random=hash2(a,b,118);if(random>.70||!eligible(x,z))continue;const xx=x+(hash2(a,b,121)-.5)*.18,zz=z+(hash2(a,b,124)-.5)*.18,patch=.5+.5*Math.sin(x*.7)*Math.cos(z*.6),height=.07+patch*.29+random*.10;const r={i:grassRecords.length,x:xx,z:zz,y:region.field.heightAt(xx,zz)+.002,height,yaw:random*20};grassRecords.push(r);grassByCell.set(cuts.key(xx,zz),r);setGrass(r);grass.setColorAt(r.i,new T.Color().setHSL(.20+random*.04,.27+random*.12,.46+random*.13));}
  grass.count=grassRecords.length;grass.instanceMatrix.needsUpdate=true;if(grass.instanceColor)grass.instanceColor.needsUpdate=true;grass.computeBoundingSphere();if(fuel){upgrade.fire.unregister(fuel);fuel=null;}if(grassRecords.length&&upgrade.fire.surfaces.size<upgrade.fire.maxSurfaces-4){const bounds=new T.Box3();for(const r of grassRecords){bounds.expandByPoint(new T.Vector3(r.x,r.y,r.z));bounds.expandByPoint(new T.Vector3(r.x,r.y+r.height,r.z));}fuel=upgrade.fire.register(grass,{material:'paper',bounds});}
 }
 function cutAt(point,radius=.22){let count=0;for(const r of grassRecords)if(Math.hypot(r.x-point.x,r.z-point.z)<radius&&point.y<r.y+cuts.get(r.x,r.z,r.height)){if(cuts.cut(r.x,r.z,point.y-r.y)){setGrass(r);count++;}}if(count)grass.instanceMatrix.needsUpdate=true;return count;}
 function cluster(cell){const r=new T.Group();r.name='Understory '+cell.key;root.add(r);const mats=[plantMaterial(0x36543b),new T.MeshStandardMaterial({color:0x7b7c6a,roughness:1}),plantMaterial(0xffffff)];const geos=[fernGeometry(),new T.IcosahedronGeometry(1,1),flowerGeometry()];mats[2].vertexColors=true;const meshes=geos.map((g,i)=>{const m=new T.InstancedMesh(g,mats[i],quest?44:72);m.count=0;m.castShadow=false;m.receiveShadow=true;r.add(m);return m;});
  for(let j=0;j<(quest?132:216);j++){const x=cell.x*CELL_SIZE+hash2(j,cell.z,753+cell.x)*CELL_SIZE,z=cell.z*CELL_SIZE+hash2(j,cell.x,183+cell.z)*CELL_SIZE;if(!eligible(x,z))continue;const type=j%3,m=meshes[type];if(m.count>=m.instanceMatrix.count)continue;const s=.55+hash2(j,cell.x,65)*1.6;dummy.position.set(x,region.field.heightAt(x,z)+(type===1?.12:0),z);dummy.rotation.set(type===1?.2:0,hash2(j,cell.z,89)*6.28,0);dummy.scale.set(type===1?s*.46:s,type===1?s*.23:s,type===1?s*.37:s);dummy.updateMatrix();m.setMatrixAt(m.count++,dummy.matrix);}
  for(const m of meshes){m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();}return {root:r,meshes,mats,dispose(){disposeTree(r);}};
 }
 restores.push(wrapMethod(props,'hit',old=>function(ray,max,ropes,opts={}){grass.userData.h5RayCut=['cut','sharp','laser'].includes(opts.kind);try{return old.apply(this,arguments);}finally{grass.userData.h5RayCut=false;}}));
 restores.push(wrapMethod(props,'impact',old=>function(hit,energy,dir,kind){if(hit.object?.userData.h5Grass){if(['cut','sharp','laser','bullet'].includes(kind))cutAt(hit.point,kind==='bullet'?.07:.24);return true;}if(['cut','sharp','laser'].includes(kind)&&energy>.8)cutAt(hit.point,.18);return old.apply(this,arguments);}));
 const api={root,grass,cuts,cutAt,clusters,
  tick(dt){time+=dt;root.visible=region.active&&world.root.visible;if(!root.visible)return;gm.userData.time.value=time;if(fuel){fuel.wet=clamp((world.weather?.state?.rain||0)*.7,0,1);if(fuel.burning){for(const r of grassRecords){cuts.cut(r.x,r.z,.015+fuel.fuel*r.height);setGrass(r);}grass.instanceMatrix.needsUpdate=true;gm.color.setHex(0x494c32);}}scan-=dt;if(scan<=0){scan=.35;const p=camera.getWorldPosition(V());rebuildGrass(p);if(!world.pickables.includes(grass))world.pickables.push(grass);for(const [k,c]of clusters)if(!region.cells.has(k)){c.dispose();clusters.delete(k);}let built=0;for(const [k,c]of region.cells)if(!clusters.has(k)&&built++<1)clusters.set(k,cluster(c));}
   for(const c of clusters.values())for(const m of c.mats)if(m.userData.time)m.userData.time.value=time;
  },
  save(){return {format:'human5.vegetation/1',grass:cuts.serialize()};},restore(data){if(data?.format!=='human5.vegetation/1')throw Error('Invalid vegetation state');cuts.restore(data.grass);lastGrass='';},
  snapshot(){return {cells:clusters.size,grassInstances:grass.count,cutCells:cuts.heights.size};},
  dispose(){if(fuel)upgrade.fire.unregister(fuel);restores.reverse().forEach(f=>f());world.pickables=world.pickables.filter(m=>m!==grass);for(const c of clusters.values())c.dispose();disposeTree(root);}
 };world.h5Vegetation=api;return api;
}
