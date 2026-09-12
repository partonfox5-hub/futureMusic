import * as T from 'three';
import {makeTreeGeometry,makeTreeMaterial,random,SPECIES} from './TreeGeometry.js?v=19.3.0';
import {FallingLeaves} from './FallingLeaves.js?v=19.3.0';
export const FOREST_PRESETS=Object.freeze({quest:{near:28,mid:65,far:180,nearCount:6,midCount:24,leaves:48},quality:{near:40,mid:90,far:240,nearCount:12,midCount:40,leaves:80}});
// API-compatible replacement for the first terrain module's ProceduralTrees.
export class ProceduralTrees {
 constructor(field,{root,world,count=280,clearance=26,exclude=()=>false,preset='quest',fallingLeaves=true}={}){
  this.field=field;this.world=world;this.config={...(FOREST_PRESETS[preset]||FOREST_PRESETS.quest)};this.root=new T.Group();this.root.name='Seeded varied woodland';root?.add(this.root);this.trees=[];this.batches=[];this.obstacles=[];this.last=new T.Vector3(Infinity,0,Infinity);this.clock=1;this.material=makeTreeMaterial();this.geometries=[];
  const rnd=random(field.options.seed+903),spacing=8,grid=new Map(),extent=field.half-16;
  for(let attempt=0;attempt<count*40&&this.trees.length<count;attempt++){
   const x=(rnd()*2-1)*extent,z=(rnd()*2-1)*extent,y=field.heightAt(x,z),n=field.normalAt(x,z);
   if(y==null||Math.max(Math.abs(x),Math.abs(z))<clearance||n.y<.78||exclude(x,z,y)||(field.options.biome==='beach'&&z<0))continue;
   const gx=Math.floor(x/spacing),gz=Math.floor(z/spacing);let blocked=false;
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)for(const p of grid.get(`${gx+dx}/${gz+dz}`)||[])if(Math.hypot(x-p.x,z-p.z)<spacing)blocked=true;
   if(blocked)continue;
   const species=pickGroveSpecies(x,z,y,rnd,field.options.seed),variant=Math.floor(rnd()*2),age=.48+Math.pow(rnd(),.65)*.83,width=age*(.85+rnd()*.30);
   const tree={x,y,z,species,variant,yaw:rnd()*Math.PI*2,scale:age,scaleXYZ:new T.Vector3(width,age*(.90+rnd()*.22),width),lod:2,tips:[],obstacle:null};this.trees.push(tree);
   const key=`${gx}/${gz}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(tree);
   if(world?.obstacle){const radius=((SPECIES[species].kind==='oak'||SPECIES[species].kind==='maple')?.24:.18)*width;tree.obstacle=world.obstacle(x,z,radius*2,radius*2,y,SPECIES[species].height*age*.7);tree.obstacle.terrainTree=true;this.obstacles.push(tree.obstacle);}
  }
  for(let species=0;species<SPECIES.length;species++)for(let variant=0;variant<2;variant++)for(let lod=0;lod<3;lod++){
   const g=makeTreeGeometry(species,variant,lod),mesh=new T.InstancedMesh(g,this.material,Math.max(1,this.trees.length));this.geometries.push(g);mesh.count=0;mesh.name=`${SPECIES[species].name} ${variant} LOD${lod}`;mesh.receiveShadow=true;mesh.castShadow=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.raycast=()=>{};this.root.add(mesh);this.batches.push({species,variant,lod,mesh});
   if(lod===0)for(const t of this.trees)if(t.species===species&&t.variant===variant)t.tips=g.userData.tips;
  }
  this.leaves=new FallingLeaves(field,this.root,{capacity:fallingLeaves?this.config.leaves:0,seed:field.options.seed,rate:2});
  this.off=field.onChange(r=>{for(const t of this.trees)if(!r.radius||Math.hypot(t.x-r.x,t.z-r.z)<r.radius+field.cell*2){t.y=field.heightAt(t.x,t.z);if(t.obstacle)t.obstacle.y=t.y;}this.last.set(Infinity,0,Infinity);});this.tick(0,new T.Vector3());
 }
 tick(dt,viewer){
  if(!viewer)return;this.material.userData.time.value+=Math.min(.05,dt);this.leaves.tick(dt,viewer,this.trees);this.clock+=dt;
  if(this.clock<.3||viewer.distanceToSquared(this.last)<4)return;this.clock=0;this.last.copy(viewer);
  const c=this.config,sorted=this.trees.map(t=>({t,d:Math.hypot(t.x-viewer.x,t.z-viewer.z)})).sort((a,b)=>a.d-b.d);let near=0,mid=0;
  for(const {t,d} of sorted){t.lod=d>c.far?-1:d<c.near&&near<c.nearCount?(near++,0):d<c.mid&&mid<c.midCount?(mid++,1):2;}
  const o=new T.Object3D();this.stats={draws:0,triangles:0,near,mid,visible:0,particles:this.leaves.mesh.count};
  for(const b of this.batches){let n=0;for(const t of this.trees){if(t.species!==b.species||t.variant!==b.variant||t.lod!==b.lod)continue;o.position.set(t.x,t.y-.04,t.z);o.rotation.set(0,t.yaw,0);o.scale.copy(t.scaleXYZ);o.updateMatrix();b.mesh.setMatrixAt(n++,o.matrix);}b.mesh.count=n;b.mesh.visible=n>0;if(n){b.mesh.instanceMatrix.needsUpdate=true;b.mesh.computeBoundingSphere();b.mesh.boundingSphere.radius+=.5;this.stats.draws++;this.stats.triangles+=n*b.mesh.geometry.userData.triangles;this.stats.visible+=n;}}
 }
 dispose(){this.off?.();this.leaves.dispose();this.root.removeFromParent();for(const g of this.geometries)g.dispose();this.material.dispose();for(const o of this.obstacles)this.world?.removeObstacle?.(o);}
}
export {ProceduralTrees as RealisticTrees};

// Large single-species groves (~48 m cells) with a thin mixed edge and a few stray trees.
function pickGroveSpecies(x,z,y,rnd,seed){
 const GROVE=48,n=SPECIES.length,pine=SPECIES.findIndex(s=>s.kind==='pine');
 const gx=Math.floor(x/GROVE),gz=Math.floor(z/GROVE);
 const cell=(ix,iz)=>Math.floor(random((seed+90317+Math.imul(ix,73856093)+Math.imul(iz,19349663))>>>0)()*n);
 let species=cell(gx,gz);
 const fx=x/GROVE-gx,fz=z/GROVE-gz,ex=Math.min(fx,1-fx),ez=Math.min(fz,1-fz),edge=Math.min(ex,ez),BLEND=.22;
 if(edge<BLEND){const nx=fx<.5?gx-1:gx+1,nz=fz<.5?gz-1:gz+1,neighbor=ex<=ez?cell(nx,gz):cell(gx,nz);if(rnd()<(BLEND-edge)/BLEND*.48)species=neighbor;}
 if(rnd()<.07)species=Math.floor(rnd()*n);
 if(y>22&&pine>=0&&species!==pine&&rnd()<.16)species=pine;
 return species;
}
