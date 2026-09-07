import * as T from 'three';
export const FURNITURE=['Chair','Couch','Table','Bed','Nightstand','Kitchen counter','Refrigerator','Bathtub','Sink','Wall picture','Clothing rack'];
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
 world.furnitureTemplates??=new Map();if(world.furnitureTemplates.has(id))return;
 const group=new T.Group();for(const object of objects){const copy=cloneFurniture(object);copy.position.x-=x;copy.position.z-=z;group.add(copy);}
 world.furnitureTemplates.set(id,group);
}
export function placeFurniture(world,wardrobe,id,p,yaw=0){
 if(id==='Chair'||id==='Couch'){
  const seat=world.chair(p.x,p.z,yaw,id==='Couch');seat.group.traverse(m=>{if(m.isMesh)world.fractures.register(m,'wood');});return seat.group;
 }
 const source=id==='Clothing rack'?wardrobe.rack:world.furnitureTemplates.get(id);if(!source)return null;
 const group=cloneFurniture(source);group.position.copy(p);group.rotation.set(0,yaw,0);world.root.add(group);group.updateWorldMatrix(true,true);
 const bounds=new T.Box3().setFromObject(group),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const obstacle=world.obstacle(center.x,center.z,size.x,size.z,bounds.min.y,size.y,group);
 // Main body carries the collider. Decorative pieces can break independently.
 let largest=null,volume=-1;
 group.traverse(m=>{if(!m.isMesh)return;const size=new T.Box3().setFromObject(m).getSize(new T.Vector3()),v=size.x*size.y*size.z;if(v>volume){volume=v;largest=m;}
  if(m.userData.article)wardrobe.tokens.push(m);
  else world.fractures.register(m,['Sink','Bathtub'].includes(id)?'stone':id==='Refrigerator'?'metal':'wood');
 });
 if(largest?.userData.piece)largest.userData.piece.obstacle=obstacle;
 return group;
}
