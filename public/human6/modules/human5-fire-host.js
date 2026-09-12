import * as T from 'three';
import {FireSystem} from './human5-fire.js?v=19.3.0';
import {V,localBounds,wrapMethod,finiteDt} from './human5-common.js?v=19.3.0';

/** Adapter verified against human5 (3).zip, 16.2. Keeps its hearth and NPC duty API. */
export function upgradeHostFire(props,{lights=null,maxSurfaces=768}={}){
  const legacy=props.flames;if(!legacy)throw new TypeError('Call after the existing installFire(props)');
  if(legacy.h5)return legacy.h5;
  const world=props.world,byRoot=new Map(),byPart=new Map(),torches=new Map(),restores=[];
  let scanT=0,revision=world.revision,oldHearth=legacy.hearth;
  const waterAt=p=>{const s=props.water?.contains(p);return s?{height:s.surfaceY,density:1000}:null;};
  const fire=new FireSystem({scene:props.scene,world,maxSurfaces,waterAt,onBurn(f,dt){
    if(f.part){f.part.burning=f.burning;if(!f.part.broken)world.fractures.impact({object:f.part.mesh,instanceId:f.part.index,point:f.root.localToWorld(f.point.clone())},dt*7*f.spec.heat,new T.Vector3(0,1,0),'laser',0);}
    if(f.root.userData?.dogItem&&f.fuel<.8)f.root.userData.dogItem.torn=true;
  }});
  if(lights)lights.fire=fire;
  legacy.mesh.visible=false;legacy.lights.forEach(l=>{l.visible=false;l.intensity=0;});
  function registerRoot(root,material='wood'){
    if(!root?.parent)return null;if(byRoot.has(root))return byRoot.get(root);
    // Layered furniture registers individual fabric/foam surfaces itself.
    if(root.userData.h5Layered||root.userData.h5Bag)return null;
    if(fire.surfaces.size>=maxSurfaces)return null;
    const f=fire.register(root,{material});byRoot.set(root,f);return f;
  }
  function registerPart(part){
    if(byPart.has(part))return byPart.get(part);if(part.broken||part.mesh?.userData.furnRoot)return null;
    if(!['wood','plaster'].includes(part.kind)||fire.surfaces.size>=maxSurfaces)return null;
    // Plaster surfaces are intentionally not fuel. Exposed studs/wood burn.
    if(part.kind==='plaster')return null;
    const bounds=part.index!==undefined?new T.Box3().setFromCenterAndSize(part.p,part.size):localBounds(part.mesh);
    const f=fire.register(part.mesh,{material:'wood',bounds});f.part=part;byPart.set(part,f);return f;
  }
  function sync(){
    for(const [root,f] of byRoot)if(!root.parent){fire.unregister(f);byRoot.delete(root);}
    for(const [part,f] of byPart)if(part.broken||!part.mesh.parent){fire.unregister(f);byPart.delete(part);}
    for(const [item,s] of torches)if(!props.items.includes(item)){fire.removeTorch(s);torches.delete(item);}
    for(const item of props.items||[])if(item.id==='torch'&&!torches.has(item)){
      const s=fire.attachTorch(item.group,{wick:new T.Vector3(0,.03,-.44),height:.29,radius:.07,lit:true});torches.set(item,s);
    }
    for(const root of world.movables||[]){
      if(!root.parent)continue;const id=root.userData.furniture?.id||'',dog=root.userData.dogItem;
      if(dog){if(dog.type==='bag'||dog.type==='catbag')registerRoot(root,'paper');continue;}
      if(/Mattress|Clothes|Couch/.test(id))registerRoot(root,'fabric');
      else if(/Chair|Table|Bed|Nightstand|Firewood|Bookshelf|Dresser|Desk|Cabinet|Ottoman/.test(id))registerRoot(root,'wood');
    }
    for(const garment of props.wardrobe?.clothes||[])if(garment.mesh?.parent){const f=registerRoot(garment.mesh,'fabric');if(!f)continue;garment.h5Fuel=f;const mesh=garment.skinLOD?.active?garment.skinLOD.mesh:garment.mesh;f.root=mesh;
      if(mesh.isSkinnedMesh){mesh.computeBoundingBox();f.localBox.copy(mesh.boundingBox);}else{mesh.geometry.computeBoundingBox();f.localBox.copy(mesh.geometry.boundingBox);}f.localBox.getCenter(f.point);fire.updateSurface(f);
    }
    // Register wall cells near a real source, not every cell in five houses.
    const emitters=fire.emitters();
    for(const part of world.fractures?.parts||[]){if(part.broken||part.kind!=='wood'||byPart.has(part))continue;const p=part.index===undefined?part.mesh.getWorldPosition(V()):part.p;if(emitters.some(s=>s.position.distanceToSquared(p)<9))registerPart(part);}
    for(const [part,f] of byPart)if(!f.burning&&f.heat<.01&&!emitters.some(s=>s.position.distanceToSquared(f.box.getCenter(V()))<36)){fire.unregister(f);byPart.delete(part);}
  }
  function resolve(hit){
    const garment=hit.object?.userData.cloth;if(garment)return garment.h5Fuel||registerRoot(garment.mesh,'fabric');
    const cushion=hit.object?.userData.h5Cushion;if(cushion)return cushion.foam.visible?cushion.innerFuel:cushion.outerFuel;
    for(let o=hit.object;o;o=o.parent){if(o.userData.h5Bag?.fuel)return o.userData.h5Bag.fuel;if(byRoot.has(o))return byRoot.get(o);}
    const part=hit.object?.userData.chunks?.[hit.instanceId]||hit.object?.userData.piece;return part?registerPart(part):null;
  }
  const oldIgnite=legacy.ignite,oldSpray=legacy.spray,oldTick=legacy.tick;
  legacy.ignite=function(hit,fromTorch=true){
    if(!hit?.point)return false;
    if(fromTorch){const near=[...torches.values()].some(s=>s.lit&&s.p.distanceTo(hit.point)<s.height+.12);if(!near){props.status='Bring the torch flame into contact';return false;}}
    if(hit.object?.userData.hearth){
      if(!this.hearth?.logs.length){props.status='Fireplace needs logs first';return false;}
      this.hearth.lit=true;for(const log of this.hearth.logs){const f=registerRoot(log);if(f)fire.ignite(f);}return true;
    }
    const fuel=resolve(hit);const lit=fuel&&fire.ignite(fuel,hit.point);props.status=lit?'Material ignited':'This surface does not ignite';return !!lit;
  };
  legacy.spray=function(origin,direction){
    let n=0;for(const f of fire.surfaces.values()){
      const p=f.root.localToWorld(f.point.clone()),d=p.clone().sub(origin),length=d.length();
      if(length<3.4&&length>.001&&d.divideScalar(length).dot(direction)>.85&&!fire.blocked(origin,p,null,f.root)){fire.extinguish(f,.9);n++;}
    }
    for(const s of fire.sources){const d=s.p.clone().sub(origin),length=d.length();if(length<3.4&&length>.001&&d.divideScalar(length).dot(direction)>.85&&!fire.blocked(origin,s.p,null,s.root))s.lit=false;}
    if(this.hearth)this.hearth.lit=this.hearth.logs.some(log=>byRoot.get(log)?.burning);props.status=n?'Fire extinguished':'Spray missed';return n;
  };
  legacy.tick=function(dt){
    dt=finiteDt(dt);
    if(revision!==world.revision){revision=world.revision;this.clear();this.buildHearth(world);oldHearth=this.hearth;scanT=0;
      for(const [root,f] of byRoot){fire.unregister(f);}byRoot.clear();for(const f of byPart.values())fire.unregister(f);byPart.clear();
      for(const s of torches.values())fire.removeTorch(s);torches.clear();
    }
    if(!world.root.visible){fire.flames.count=0;return;}
    scanT-=dt;if(scanT<=0){scanT=.25;sync();}
    for(const root of world.movables||[])if(root.userData.firewood&&!root.userData.inHearth)this.tryLoadLog(root);
    if(this.hearth){this.hearth.lit=this.hearth.logs.some(log=>byRoot.get(log)?.burning);}
    fire.tick(dt,props.camera.getWorldPosition(V()));
    this.sites=[...fire.surfaces.values()].filter(f=>f.burning).map(f=>({p:f.root.localToWorld(f.point.clone()),kind:f.root.userData.inHearth?'hearth':'furn',heat:f.spec.heat,ref:f}));
    this.npcDuty(dt);this.mesh.visible=false;this.lights.forEach(l=>{l.visible=false;l.intensity=0;});
  };
  // Replaces the flame weapon's distant beam with a local relight/use action.
  restores.push(wrapMethod(props,'fire',old=>function(item,aim){
    if(item?.data?.kind!=='flame')return old.apply(this,arguments);
    sync();const source=torches.get(item);if(source){fire.setTorchLit(source,true);this.status='Torch lit · touch the flame to fuel';}return true;
  }));
  sync();
  const api={fire,legacy,resolve,scan:sync,dispose(){restores.reverse().forEach(f=>f());legacy.ignite=oldIgnite;legacy.spray=oldSpray;legacy.tick=oldTick;legacy.mesh.visible=true;fire.dispose();delete legacy.h5;}};
  legacy.h5=api;return api;
}
