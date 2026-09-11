import * as T from 'three';
export const FURNITURE=['Chair','Couch','Table','Bed','Mattress','Firewood','Nightstand','Kitchen counter','Refrigerator','Bathtub','Sink','Wall picture','Clothing rack','Staircase','Coffee table','TV stand','Bookshelf','Dresser','Desk','Side table','Ottoman','Floor lamp','Toilet','Cabinet','Bar stool','Microwave','Mirror','Bench','Barbell','Weight plate','Dumbbell'];
export const DENSITY={wood:600,cloth:160,stone:2200,metal:2700,glass:1200,plastic:900};
export const FURNITURE_MIX={
 Chair:{wood:.55,cloth:.45},
 Couch:{wood:.35,cloth:.65},
 Table:{wood:1},
 Bed:{wood:.85,cloth:.15},
 Mattress:{cloth:1},
 Firewood:{wood:1},
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
 Mirror:{wood:.4,glass:.6},
 Bench:{metal:.7,wood:.3},
 Barbell:{metal:1},
 'Weight plate':{metal:1},
 Dumbbell:{metal:1},
 Clothes:{cloth:1}
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
 const furn=prev||{id,mix,mass,volume,density,velocity:new T.Vector3(),spin:0,omega:new T.Vector3(),held:null,obstacle,floorY:group.position.y,health:['Chair','Couch','Mattress','Firewood'].includes(id)?24:id==='Bed'?40:80};
 furn.id=id;furn.mix=mix;furn.mass=mass;furn.volume=volume;furn.density=density;furn.obstacle=obstacle;if(furn.health==null)furn.health=['Chair','Couch','Mattress','Firewood'].includes(id)?24:id==='Bed'?40:80;
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
export function placeStairs(world,p,yaw=0,opts={}){
 const group=new T.Group();group.position.copy(p);group.rotation.y=yaw;world.root.add(group);
 const steps=opts.steps||16,rise=opts.rise||.1875,run=opts.run||.25,width=opts.width||1.08;
 const wood=world.mat(0x8a6848),dark=world.mat(0x5c4634),railMat=world.mat(0x4a372c);
 const totalRun=steps*run,totalRise=steps*rise;
 for(let i=0;i<steps;i++){
  const tread=new T.Mesh(new T.BoxGeometry(width,.038,run+.012),wood);
  tread.position.set(0,(i+1)*rise-.019,(i+.5)*run);tread.castShadow=tread.receiveShadow=true;group.add(tread);
  const riser=new T.Mesh(new T.BoxGeometry(width-.02,rise-.02,.022),dark);
  riser.position.set(0,i*rise+rise/2,i*run+.01);riser.castShadow=true;group.add(riser);
 }
 for(const sign of [-1,1]){
  const stringer=new T.Mesh(new T.BoxGeometry(.046,rise*.55,totalRun+.06),dark);
  stringer.position.set(sign*(width/2-.02),rise*.4,totalRun/2);stringer.castShadow=true;group.add(stringer);
  const pitch=Math.atan2(totalRise,totalRun);
  const rail=new T.Mesh(new T.BoxGeometry(.032,.04,Math.hypot(totalRun,totalRise)+.08),railMat);
  rail.position.set(sign*(width/2+.045),totalRise*.5+.86,totalRun/2);
  rail.rotation.x=-pitch;rail.castShadow=true;group.add(rail);
  for(let i=0;i<=steps;i+=2){
   const post=new T.Mesh(new T.CylinderGeometry(.012,.012,.92,6),railMat);
   post.position.set(sign*(width/2+.045),i*rise+.48,i*run);post.castShadow=true;group.add(post);
  }
 }
 const data={width,run:totalRun,rise:totalRise,steps,stepRun:run,stepRise:rise};
 group.userData.stairs=data;world.stairs??=[];world.stairs.push(group);
 group.traverse(m=>{if(m.isMesh){world.pickables.push(m);m.userData.stairs=data;}});
 return group;
}
export function placeFurniture(world,wardrobe,id,p,yaw=0){
 if(id==='Staircase')return placeStairs(world,p,yaw);
 if(id==='Chair'||id==='Couch'){
  const seat=world.chair(p.x,p.z,yaw,id==='Couch');return seat.group;
 }
 const source=id==='Clothing rack'?wardrobe.rack:world.furnitureTemplates.get(id);if(!source)return null;
 const group=cloneFurniture(source);group.position.copy(p);group.rotation.set(0,yaw,0);world.root.add(group);group.updateWorldMatrix(true,true);
 group.traverse(m=>{if(m.isMesh){
  if(m.userData.article)wardrobe.tokens.push(m);
  else world.fractures.register(m,m.material?.transparent||m.material?.transmission?'glass':['Sink','Bathtub','Toilet'].includes(id)?'stone':['Refrigerator','Microwave'].includes(id)?'metal':id==='Mirror'||id==='TV stand'&&m.material?.roughness<.2?'glass':'wood');
 }});
 tagMovable(world,group,id);
 const furn=group.userData.furniture;
 if(furn?.obstacle){const largest={v:-1,m:null};group.traverse(m=>{if(!m.isMesh)return;const size=new T.Box3().setFromObject(m).getSize(new T.Vector3()),v=size.x*size.y*size.z;if(v>largest.v){largest.v=v;largest.m=m;}});if(largest.m?.userData.piece)largest.m.userData.piece.obstacle=furn.obstacle;}
 return group;
}
