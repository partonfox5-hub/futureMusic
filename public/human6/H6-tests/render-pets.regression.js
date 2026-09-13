import * as T from 'three';
import {Car} from '../mira-v2-car.js?v=20.3.0';
import {RigidBatches} from '../modules/human5-batching.js?v=20.3.0';
import {DogModel} from '../src/dog/Dog.js?v=20.3.0';
import {PET_BREEDS,buildPetAppearance} from '../src/dog/PetAppearance.js?v=20.3.0';
import {DogPaws} from '../src/dog/DogPaws.js?v=20.3.0';
import {DogTail} from '../src/dog/DogTail.js?v=20.3.0';

/** Exercise render optimizations through picking, damage, articulation and pet IK. */
export function run(H){
 const results=[],assert=(v,m)=>{if(!v)throw Error(m);};
 const test=(name,fn)=>{try{results.push({name,pass:true,evidence:fn()});}catch(e){results.push({name,pass:false,error:e.message});}};
 test('Rigid materials retain separate PBR values and live lights',()=>{
  const scene=new T.Scene(),root=new T.Group(),world={pickables:[]};scene.add(root);const batch=new RigidBatches(world),parts=[];
  for(let i=0;i<3;i++){const mat=new T.MeshStandardMaterial({color:[0xff0000,0x00ff00,0x0000ff][i],roughness:[.2,.8,.4][i],metalness:[.9,0,.3][i],emissive:0xffaa00,emissiveIntensity:i});const m=new T.Mesh(new T.BoxGeometry(.3,.3,.3),mat);m.position.x=i;root.add(m);parts.push(m);}
  try{batch.add(root);let entry=batch.entries.get(root);assert(entry.groups.length===1,'Materials still split');const surface=entry.groups[0].mesh.geometry.attributes.h6Surface;assert(Math.abs(surface.getX(0)-.2)<1e-5,'Roughness lost');assert(Math.abs(surface.getY(0)-.9)<1e-5,'Metalness lost');
   parts[0].material.emissiveIntensity=3;batch.tick();entry=batch.entries.get(root);assert(entry.groups[0].mesh.geometry.attributes.h6Emission.getX(0)>2.9,'Light state stale');
   const ray=new T.Raycaster(new T.Vector3(1,0,2),new T.Vector3(0,0,-1));scene.updateMatrixWorld(true);const hits=ray.intersectObjects(world.pickables);assert(hits[0]?.object===parts[1],'Picking no longer resolves original object');
   parts[1].position.x=4;batch.tick();scene.updateMatrixWorld(true);assert(!ray.intersectObjects(world.pickables).length,'Moved source left phantom collision');
   scene.attach(parts[1]);batch.tick();assert(parts[1].layers.isEnabled(0),'Detached damage debris invisible');
   const replacement=new T.Mesh(new T.BoxGeometry(.2,.2,.2),parts[0].material);root.add(replacement);batch.add(root);assert(replacement.layers.isEnabled(31)&&!replacement.layers.isEnabled(0),'Replacement geometry bypassed batch');return {draws:1,sourceParts:3,picking:true,liveEmission:true,detachedDebris:true,replacement:true};
  }finally{batch.clear();for(const p of parts){p.geometry.dispose();p.material.dispose();}}
 });
 test('Car collision dents hit the hidden original surface',()=>{
  const scene=new T.Scene(),parts=[];for(const x of [3,0]){const geometry=new T.BoxGeometry(.3,.3,.3);geometry.translate(x,0,0);const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());mesh.layers.set(31);scene.add(mesh);parts.push({mesh,broken:false});}scene.updateMatrixWorld(true);let struck=null;const car={parts,damage(hit){struck=hit.object;}};
  try{Car.prototype.dentAt.call(car,new T.Vector3(0,0,.15),new T.Vector3(0,0,1),20,1);assert(struck===parts[1].mesh,'Dent fell back to the wrong panel origin');return {originalSurface:true};}finally{for(const p of parts){p.mesh.geometry.dispose();p.mesh.material.dispose();}}
 });
 test('Vehicle wheel batch follows its actual rolling pivot',()=>{
  H.performanceController.beforeFrame(.3);const car=H.props.cars()[0],wheel=car.wheels[0],batch=H.performanceController.batches.entries.get(wheel.spin);assert(batch?.groups.length,'No wheel spin batch');const mesh=batch.groups[0].mesh,p=new T.Vector3(.02,.10,.05),before=p.clone(),q=wheel.spin.quaternion.clone();try{car.group.updateMatrixWorld(true);mesh.localToWorld(before);wheel.spin.rotation.x+=.75;car.group.updateMatrixWorld(true);mesh.localToWorld(p);assert(p.distanceTo(before)>.025,'Wheel spokes frozen');return {pivot:'spin',movement:p.distanceTo(before)};}finally{wheel.spin.quaternion.copy(q);}
 });
 test('Upgraded food bags still tear and reveal their opening',()=>{
  H.performanceController.beforeFrame(.3);const bag=H.world.movables.find(g=>g.userData.h5Bag)?.userData.h5Bag;assert(bag,'No upgraded food bag');const batches=H.performanceController.batches;assert(batches.entries.get(bag.root)?.groups.length,'Replacement bag was never batched');assert(bag.tab.layers.isEnabled(0),'Tear tab hidden');bag.open();batches.tick();assert(bag.item.torn&&!bag.top.visible&&bag.flap.visible&&bag.mouth.visible,'Opening failed');const entry=batches.entries.get(bag.root);assert(entry.groups.some(g=>g.sources.includes(bag.mouth)),'Opening not represented in batch');return {torn:bag.item.torn,opening:true,tabIndependent:true};
 });
 test('All six pet breeds keep valid skinning and four floor contacts',()=>{
  const evidence=[];for(const [id,b]of Object.entries(PET_BREEDS)){const m=new DogModel(b.species,b);m.breedId=id;buildPetAppearance(m);m.root.scale.setScalar(b.scale);const paws=new DogPaws(m,{floorHeight:()=>0}),tail=new DogTail(m);const floor=new T.Vector3();
   try{for(let i=0;i<20;i++){paws.tick(0,'idle',0);tail.tick(1/60,i/60,.15);m.root.updateMatrixWorld(true);}m.skeleton.update();assert([...m.skeleton.boneMatrices].every(Number.isFinite),id+' invalid skeleton');let maxError=0;for(const leg of paws.legs){leg.foot.getWorldPosition(floor);maxError=Math.max(maxError,Math.abs(floor.y-leg.home.y*b.scale));}assert(maxError<.018,id+' floating feet '+maxError);const pos=m.body.geometry.attributes.position,weights=m.body.geometry.attributes.skinWeight;assert([...pos.array].every(Number.isFinite),id+' invalid surface');for(let i=0;i<weights.count;i++){const sum=weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i);assert(Math.abs(sum-1)<.012,id+' skin weights');}evidence.push({breed:id,maxFootError:maxError,vertices:pos.count});}finally{m.dispose();}
  }return evidence;
 });
 return {passed:results.filter(r=>r.pass).length,total:results.length,questHardwareTested:false,results};
}
