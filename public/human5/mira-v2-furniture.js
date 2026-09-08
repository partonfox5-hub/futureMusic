import * as T from 'three';
export const FURNITURE=['Chair','Couch','Table','Bed','Nightstand','Kitchen counter','Refrigerator','Bathtub','Sink','Wall picture','Clothing rack','Staircase','Coffee table','TV stand','Bookshelf','Dresser','Desk','Side table','Ottoman','Floor lamp','Toilet','Cabinet','Bar stool','Microwave','Mirror'];
export const DENSITY={wood:600,cloth:160,stone:2200,metal:2700,glass:1200,plastic:900};
export const FURNITURE_MIX={
 Chair:{wood:.55,cloth:.45},
 Couch:{wood:.35,cloth:.65},
 Table:{wood:1},
 Bed:{wood:.4,cloth:.6},
 Nightstand:{wood:1},
 'Kitchen counter':{wood:.25,stone:.75},
 Refrigerator:{metal:.85,plastic:.15},
 Bathtub:{stone:1},
 Sink:{stone:.8,metal:.2},
 'Wall picture':{wood:.55,glass:.45},
 'Clothing rack':{wood:.5,metal:.5},
 'Coffee table':{wood:.7,cloth:.3},
 'TV stand':{wood:.85,metal:.15},
 Bookshelf:{wood:1},
 Dresser:{wood:1},
 Desk:{wood:1},
 'Side table':{wood:1},
 Ottoman:{wood:.3,cloth:.7},
 'Floor lamp':{metal:.55,plastic:.45},
 Toilet:{stone:1},
 Cabinet:{wood:.8,metal:.2},
 'Bar stool':{wood:.7,metal:.3},
 Microwave:{metal:.9,plastic:.1},
 Mirror:{wood:.4,glass:.6}
};
export function blendedDensity(mix){
 let d=0,s=0;for(const [k,w] of Object.entries(mix||{})){d+=(DENSITY[k]||400)*w;s+=w;}return s>0?d/s:DENSITY.wood;
}
export function furnitureRoot(object){
 let o=object;while(o){if(o.userData?.furniture?.mass)return o;if(o.userData?.furnRoot)return o.userData.furnRoot;o=o.parent;}return null;
}
export function syncFurniture(world,group){
 const furn=group?.userData?.furniture;if(!furn||!group.parent)return;
 group.updateWorldMatrix(true,true);
 const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 const o=furn.obstacle;
 if(o){o.x=center.x;o.z=center.z;o.w=Math.max(.08,size.x);o.d=Math.max(.08,size.z);o.y=box.min.y;o.h=Math.max(.04,size.y);world.grid=null;}
 if(furn.seat){
  furn.seat.yaw=group.rotation.y;
  furn.seat.position.set(center.x,Math.max(.42,center.y),center.z);
  furn.seat.approach=group.localToWorld(new T.Vector3(0,0,1.02));
 }
}
export function tagMovable(world,group,id){
 if(!group)return null;
 world.movables??=[];
 group.updateWorldMatrix(true,true);
 const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 const mix={...(FURNITURE_MIX[id]||{wood:1})};
 const volume=Math.max(.02,size.x*size.y*size.z),density=blendedDensity(mix);
 // AABB over-counts empty space; 0.28 still keeps chairs/tables in a real kg range instead of foam.
 const mass=Math.min(160,Math.max(4,volume*density*.28));
 group.traverse(m=>{
  if(m.userData.obstacle&&m!==group){world.removeObstacle(m.userData.obstacle);delete m.userData.obstacle;}
  if(m.isMesh)m.userData.furnRoot=group;
 });
 if(group.userData.obstacle)world.removeObstacle(group.userData.obstacle);
 const obstacle=world.obstacle(center.x,center.z,Math.max(.08,size.x),Math.max(.08,size.z),box.min.y,Math.max(.04,size.y),null);
 obstacle.object=group;
 const prev=group.userData.furniture;
 const furn=prev||{id,mix,mass,volume,density,velocity:new T.Vector3(),spin:0,omega:new T.Vector3(),held:null,obstacle,floorY:group.position.y};
 furn.id=id;furn.mix=mix;furn.mass=mass;furn.volume=volume;furn.density=density;furn.obstacle=obstacle;
 if(!furn.velocity)furn.velocity=new T.Vector3();if(!furn.omega)furn.omega=new T.Vector3();
 if(!Number.isFinite(furn.floorY))furn.floorY=group.position.y;
 const inv=group.matrixWorld.clone().invert();
 furn.localBox=new T.Box3().setFromObject(group).applyMatrix4(inv);
 group.userData.furniture=furn;group.userData.obstacle=obstacle;
 group.traverse(m=>{if(m.userData.piece)m.userData.piece.obstacle=obstacle;});
 if(!world.movables.includes(group))world.movables.push(group);
 group.name=group.name||id;
 return furn;
}
function assembleMovable(world,id,objects,x,z){
 const live=[...objects].filter(o=>o&&o.parent);
 if(!live.length)return null;
 if(live.every(o=>o.parent?.userData?.furniture))return live[0].parent;
 const group=new T.Group();group.position.set(x,0,z);world.root.add(group);
 for(const object of live)group.attach(object);
 return tagMovable(world,group,id);
}
// Clone render data without serializing circular seat / destruction references.
export function cloneFurniture(source){
 const copy=source.isMesh?new T.Mesh(source.geometry.clone(),Array.isArray(source.material)?source.material.map(m=>m.clone()):source.material.clone()):new T.Group();
 copy.position.copy(source.position);copy.quaternion.copy(source.quaternion);copy.scale.copy(source.scale);
 copy.castShadow=source.castShadow;copy.receiveShadow=source.receiveShadow;
 if(source.userData.article)copy.userData.article=source.userData.article;
 for(const child of source.children)if(child.isMesh||child.isGroup)copy.add(cloneFurniture(child));
 return copy;
}
export function captureFurniture(world,id,objects,x,z){
 world.furnitureTemplates??=new Map();
 if(!world.furnitureTemplates.has(id)){
  const group=new T.Group();for(const object of objects){const copy=cloneFurniture(object);copy.position.x-=x;copy.position.z-=z;group.add(copy);}
  world.furnitureTemplates.set(id,group);
 }
 assembleMovable(world,id,objects,x,z);
}
export function placeStairs(world,p,yaw=0){
 const group=new T.Group();group.position.copy(p);group.rotation.y=yaw;world.root.add(group);
 const steps=10,rise=.18,run=.26,width=1.02,wood=world.mat(0x8a6848),dark=world.mat(0x5c4634);
 for(let i=0;i<steps;i++){
  const tread=new T.Mesh(new T.BoxGeometry(width,rise*.42,run),wood);tread.position.set(0,(i+.5)*rise,(i+.5)*run);tread.castShadow=tread.receiveShadow=true;group.add(tread);
  const riser=new T.Mesh(new T.BoxGeometry(width,rise,0.03),dark);riser.position.set(0,i*rise+rise/2,i*run);riser.castShadow=true;group.add(riser);
 }
 for(const sign of [-1,1]){
  const rail=new T.Mesh(new T.BoxGeometry(.05,steps*rise+.12,steps*run+.08),dark);
  rail.position.set(sign*(width/2+.04),(steps*rise)/2,(steps*run)/2);rail.castShadow=true;group.add(rail);
 }
 const totalRun=steps*run,totalRise=steps*rise;
 group.userData.stairs={width,run:totalRun,rise:totalRise,steps,stepRun:run,stepRise:rise};
 world.stairs??=[];world.stairs.push(group);
 group.traverse(m=>{if(m.isMesh){world.pickables.push(m);m.userData.stairs=group.userData.stairs;}});
 return group;
}
export function placeFurniture(world,wardrobe,id,p,yaw=0){
 if(id==='Staircase')return placeStairs(world,p,yaw);
 if(id==='Chair'||id==='Couch'){
  const seat=world.chair(p.x,p.z,yaw,id==='Couch');seat.group.traverse(m=>{if(m.isMesh)world.fractures.register(m,'wood');});return seat.group;
 }
 const source=id==='Clothing rack'?wardrobe.rack:world.furnitureTemplates.get(id);if(!source)return null;
 const group=cloneFurniture(source);group.position.copy(p);group.rotation.set(0,yaw,0);world.root.add(group);group.updateWorldMatrix(true,true);
 group.traverse(m=>{if(m.isMesh){
  if(m.userData.article)wardrobe.tokens.push(m);
  else world.fractures.register(m,['Sink','Bathtub','Toilet'].includes(id)?'stone':['Refrigerator','Microwave','TV stand'].includes(id)?'metal':id==='Mirror'?'glass':'wood');
 }});
 tagMovable(world,group,id);
 const furn=group.userData.furniture;
 if(furn?.obstacle){const largest={v:-1,m:null};group.traverse(m=>{if(!m.isMesh)return;const size=new T.Box3().setFromObject(m).getSize(new T.Vector3()),v=size.x*size.y*size.z;if(v>largest.v){largest.v=v;largest.m=m;}});if(largest.m?.userData.piece)largest.m.userData.piece.obstacle=furn.obstacle;}
 return group;
}
