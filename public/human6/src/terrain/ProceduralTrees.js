import {seasons} from '../../modules/human5-seasons.js?v=19.1.0';
import * as T from 'three';
import {hash,noise} from './TerrainHeightfield.js';
function treeGeometry(pine=false,detail=true){
  const positions=[],normals=[],colors=[],index=[],foliage=[];
  const append=(g,position,scale,color,rotation=new T.Quaternion())=>{
    const mat=new T.Matrix4().compose(position,rotation,scale),nm=new T.Matrix3().getNormalMatrix(mat),v=new T.Vector3(),n=new T.Vector3(),c=new T.Color(color),offset=positions.length/3;
    for(let i=0;i<g.attributes.position.count;i++){
      v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(mat);n.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(nm).normalize();positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);
      const shade=.78+hash(i,offset,33)*.30;colors.push(c.r*shade,c.g*shade,c.b*shade);foliage.push(c.g>c.r?(pine?2:1):0);
    }
    if(g.index)for(const i of g.index.array)index.push(i+offset);else for(let i=0;i<g.attributes.position.count;i++)index.push(i+offset);g.dispose();
  };
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),q=new T.Quaternion();
  append(new T.CylinderGeometry(.045,.11,3.9,detail?6:4),v(0,1.92,0),v(1,1,1),0x665044);
  if(pine){
    for(let i=0;i<(detail?5:3);i++){const t=i/(detail?5:3);append(new T.ConeGeometry(1.1*(1-t*.6),1.8,detail?9:6),v(.08*Math.sin(i*2),2.1+t*2.5,.07*Math.cos(i)),v(1,1,1),i%2?0x42573c:0x526b45);}
  }else{
    const n=detail?6:3;
    for(let i=0;i<n;i++){
      const a=i*2.399,r=i===0?0:.65,h=3+hash(i,2)*.85;
      if(detail){q.setFromUnitVectors(v(0,1,0),v(Math.cos(a)*.55,.7,Math.sin(a)*.55).normalize());append(new T.CylinderGeometry(.025,.052,1.3,5),v(Math.cos(a)*.28,2.7,Math.sin(a)*.28),v(1,1,1),0x665044,q);}
      const g=new T.IcosahedronGeometry(.92,detail?1:0),p=g.attributes.position;
      for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j),s=.89+.22*noise(x*3+y,z*3,31);p.setXYZ(j,x*s,y*s,z*s);}g.computeVertexNormals();
      append(g,v(Math.cos(a)*r,h,Math.sin(a)*r),v(1.12,1.01,.95),i%2?0x506d35:0x648044);
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('h5TreeLeaf',new T.Float32BufferAttribute(foliage,1));g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(index);g.computeBoundingSphere();return g;
}
export class ProceduralTrees {
  constructor(field,{root,world,count=280,clearance=26,exclude=()=>false}={}){
    this.field=field;this.world=world;this.clearance=clearance;this.exclude=exclude;this.trees=[];this.obstacles=[];this.batches=[];this.last=new T.Vector3(Infinity,0,Infinity);this.clock=1;
    this.root=new T.Group();this.root.name='Default map trees';root?.add(this.root);
    this.material=new T.MeshStandardMaterial({vertexColors:true,roughness:.94});this.seasonUniform={value:1};this.offSeason=seasons.subscribe(mode=>{this.seasonUniform.value=['spring','summer','autumn','winter'].indexOf(mode);});this.material.onBeforeCompile=s=>{s.uniforms.h5TreeSeason=this.seasonUniform;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float h5TreeLeaf;varying float h5TreeLeafV;').replace('#include <begin_vertex>','#include <begin_vertex>\nh5TreeLeafV=h5TreeLeaf;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float h5TreeLeafV;uniform float h5TreeSeason;').replace('#include <color_fragment>',`#include <color_fragment>
if(h5TreeLeafV>.5&&h5TreeLeafV<1.5){if(h5TreeSeason>2.5)discard;if(h5TreeSeason>1.5)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.60,.22,.04),.84);if(h5TreeSeason<.5)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.32,.50,.17),.45);}`);};this.material.customProgramCacheKey=()=> 'h5-legacy-tree-seasons-1';
    const extent=field.half-18,seed=field.options.seed,grid=new Map(),spacing=9;
    for(let attempt=0;attempt<count*30&&this.trees.length<count;attempt++){
      const x=(hash(attempt,31,seed)*2-1)*extent,z=(hash(attempt,32,seed)*2-1)*extent;
      if(Math.max(Math.abs(x),Math.abs(z))<clearance||noise(x*.016,z*.016,seed)<.29)continue;
      const y=field.heightAt(x,z),normal=field.normalAt(x,z);
      if(normal.y<.77||exclude(x,z,y)||field.options.biome==='beach'&&z<0)continue;
      const ix=Math.floor(x/spacing),iz=Math.floor(z/spacing);let blocked=false;
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)for(const t of grid.get((ix+dx)+'/'+(iz+dz))||[])if(Math.hypot(x-t.x,z-t.z)<spacing)blocked=true;
      if(blocked)continue;
      const t={x,y,z,scale:1.2+hash(attempt,33,seed)*1.15,yaw:hash(attempt,34,seed)*Math.PI*2,pine:hash(attempt,35,seed)>.70};this.trees.push(t);
      const key=ix+'/'+iz;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(t);
      if(world?.obstacle){const o=world.obstacle(x,z,.22*t.scale,.22*t.scale,y,3.9*t.scale);o.terrainTree=true;t.obstacle=o;this.obstacles.push(o);}
    }
    for(const pine of [false,true])for(const detail of [false,true]){
      const mesh=new T.InstancedMesh(treeGeometry(pine,detail),this.material,this.trees.length||1);mesh.name=(pine?'Pines':'Broadleaf')+(detail?' near':' far');mesh.count=0;
      mesh.receiveShadow=true;mesh.castShadow=detail;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.raycast=()=>{};this.root.add(mesh);this.batches.push({pine,detail,mesh});
    }
    this.off=field.onChange(r=>{for(const t of this.trees)if(!r.radius||Math.hypot(t.x-r.x,t.z-r.z)<r.radius+field.cell*2){t.y=field.heightAt(t.x,t.z);if(t.obstacle)t.obstacle.y=t.y;}this.last.set(Infinity,0,Infinity);});
    this.tick(1,new T.Vector3());
  }
  tick(dt,viewer){
    this.clock+=dt;if(this.clock<.35||viewer.distanceToSquared(this.last)<16)return;this.clock=0;this.last.copy(viewer);
    const dummy=new T.Object3D();
    for(const b of this.batches){let n=0;for(const t of this.trees){const d=Math.hypot(viewer.x-t.x,viewer.z-t.z);if(t.pine!==b.pine||(d<48)!==b.detail)continue;
      dummy.position.set(t.x,t.y-.035,t.z);dummy.rotation.set(0,t.yaw,0);dummy.scale.set(t.scale,t.scale*(.88+hash(Math.round(t.x),Math.round(t.z),5)*.2),t.scale);dummy.updateMatrix();b.mesh.setMatrixAt(n++,dummy.matrix);
    }b.mesh.count=n;b.mesh.visible=n>0;b.mesh.instanceMatrix.needsUpdate=true;b.mesh.computeBoundingSphere();}
  }
  dispose(){this.offSeason();this.off();this.root.removeFromParent();for(const b of this.batches)b.mesh.geometry.dispose();this.material.dispose();for(const o of this.obstacles)this.world?.removeObstacle?.(o);}
}
