import * as T from 'three';
import {TerrainHeightfield} from './src/terrain/TerrainHeightfield.js';
import {TerrainMesh} from './src/terrain/TerrainMesh.js';
import {QuestGrass} from './src/terrain/QuestGrass.js';
import {ProceduralTrees} from './src/trees/RealisticTrees.js';
import {TerrainGun,TERRAIN_WEAPONS,isTerrainGun,makeTerrainGun} from './src/terrain/TerrainGun.js';
import {DEFAULT_MAP,defaultMapOptions} from './src/terrain/DefaultMap.js';
export {TerrainHeightfield,TerrainMesh,QuestGrass,ProceduralTrees,TerrainGun,TERRAIN_WEAPONS,DEFAULT_MAP};

// Optional, reversible adapter for the supplied human5 (2).zip. No host imports.
export function installTerrainFeatures({world,props,WEAPONS,GUNS,weaponCatalogs=[],map:mapOverrides={},autoTick=true}={}){
  if(world?.terrainFeatures&&!world.terrainFeatures.disposed)return world.terrainFeatures;
  if(!world?.root||!props?.scene||!WEAPONS||!Array.isArray(GUNS))throw new TypeError('Pass {world,props,WEAPONS,GUNS} from the same engine module');
  const config=defaultMapOptions(mapOverrides),restores=[],catalogRestores=[],oldFloor=world.floorHeight.bind(world);
  let current=null,disposed=false,lastRevision=world.revision;const viewer=new T.Vector3(),oldGrass=new Map();
  function wrap(target,key,make){
    const own=Object.hasOwn(target,key),original=target[key],next=make(original);target[key]=next;
    restores.push(()=>{if(target[key]===next){if(own)target[key]=original;else delete target[key];}});
  }
  for(const catalog of new Set([WEAPONS,...weaponCatalogs]))for(const [id,data] of Object.entries(TERRAIN_WEAPONS)){
    const previous=catalog[id];catalog[id]={...data};const installed=catalog[id];
    catalogRestores.push(()=>{if(catalog[id]===installed){if(previous)catalog[id]=previous;else delete catalog[id];}});
  }
  const addedGuns=[];for(const id of Object.keys(TERRAIN_WEAPONS))if(!GUNS.includes(id)){GUNS.push(id);addedGuns.push(id);}
  function exclude(x,z,y){
    if(world.name==='Living room'&&Math.max(Math.abs(x),Math.abs(z))<config.pad+1)return true;
    if(world.name==='Beach'&&z<-4)return true;
    for(const b of world.waterBeds||[]){if(b.rect){if(z>=b.z0&&z<=b.z1)return true;}else if(Math.hypot(x-b.x,z-b.z)<b.r+.2)return true;}
    for(const f of world.floors||[])if(Math.abs(x-f.x)<f.w/2+.1&&Math.abs(z-f.z)<f.d/2+.1&&f.y+f.h>=y-.05&&f.y<y+2)return true;
    return (world.nearby?.({x,y,z},.12)||[]).some(o=>o.h>.08&&y<o.y+o.h+.1&&y+1>o.y&&Math.abs(x-o.x)<o.w/2+.15&&Math.abs(z-o.z)<o.d/2+.15);
  }
  function detach(){
    if(!current)return;const {mesh,field,grass,trees,legacy,off}=current;
    off?.();grass.dispose();trees.dispose();mesh.dispose();world.pickables=world.pickables.filter(o=>o!==mesh.root);field.listeners.clear();
    current=null;return legacy;
  }
  function populate(){
    if(disposed)return;lastRevision=world.revision;
    const legacy=world.terrain;
    const biome=world.name==='Beach'?'beach':world.name==='Jungle'?'jungle':config.biome;
    const fieldKeys=['seed','size','segments','pad','padBlend','mountainHeight','minHeight','maxHeight','biome','thermalPasses','protectPad'];
    const options=Object.fromEntries(fieldKeys.map(k=>[k,config[k]]));options.biome=biome;if(world.name!=='Living room')options.pad=3.4;
    const field=new TerrainHeightfield(options);
    for(const b of world.waterBeds||[])if(!b.rect)field.excavate(b.x,b.z,b.r,b.bed);
    const mesh=new TerrainMesh(field);legacy?.removeFromParent();world.root.add(mesh.root);world.terrain=mesh.root;world.pickables.push(mesh.root);
    world.extent=config.playableExtent;
    // Expand the existing boundary collision walls along with the playable bounds.
    for(const o of world.obstacles||[])if(o.object==null&&o.h===4){
      if(o.w<=.3&&Math.abs(o.x)>140){o.x=Math.sign(o.x)*(config.playableExtent+.2);o.d=config.playableExtent*2+1;}
      if(o.d<=.3&&Math.abs(o.z)>140){o.z=Math.sign(o.z)*(config.playableExtent+.2);o.w=config.playableExtent*2+1;}
    }
    // Preserve the original interactive trees; move those inside the house clearing outward.
    const anchors=[];
    for(let i=0;i<(world.trees||[]).length;i++){
      const tree=world.trees[i],g=tree.group;if(!g?.parent)continue;
      if(world.name==='Living room'&&Math.max(Math.abs(g.position.x),Math.abs(g.position.z))<config.treeClearance){const angle=i*2.399,r=config.treeClearance+11+(i%5)*4;g.position.x=Math.cos(angle)*r;g.position.z=Math.sin(angle)*r;}
      g.position.y=field.heightAt(g.position.x,g.position.z)??0;
      if(tree.obstacle){tree.obstacle.x=g.position.x;tree.obstacle.z=g.position.z;tree.obstacle.y=g.position.y;}
      anchors.push({group:g,tree,offset:0});
    }
    // Existing rocks, bushes and fixed outdoor scenery keep their original ground offset.
    for(const child of world.root.children){
      if(child===mesh.root||child===world.water||child.userData?.tree||child.userData?.furniture||!child.isMesh)continue;
      const p=child.position,ground=oldFloor(new T.Vector3(p.x,100,p.z));
      if(Math.max(Math.abs(p.x),Math.abs(p.z))<=config.pad||Math.abs(p.y-ground)>4)continue;
      const offset=p.y-ground;p.y=(field.heightAt(p.x,p.z)??ground)+offset;
      if(child.userData.obstacle)child.userData.obstacle.y+=p.y-(ground+offset);
      anchors.push({group:child,offset});
    }
    world.grid=null;
    const grass=new QuestGrass(field,{root:mesh.root,preset:config.grassPreset,exclude});
    const trees=new ProceduralTrees(field,{root:mesh.root,world,count:world.name==='Beach'?Math.round(config.treeCount*.35):config.treeCount,clearance:world.name==='Living room'?config.treeClearance:8,exclude,preset:/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'')?'quest':'quality'});
    const off=field.onChange(r=>{
      for(const a of anchors){const p=a.group.position;if(!a.group.parent||a.tree?.fallen)continue;
        if(r.radius&&Math.hypot(p.x-r.x,p.z-r.z)>r.radius+field.cell*2)continue;
        const h=field.heightAt(p.x,p.z);if(h==null)continue;const delta=h+a.offset-p.y;p.y+=delta;
        const obstacle=a.tree?.obstacle||a.group.userData.obstacle;if(obstacle)obstacle.y+=delta;
      }
      world.routes=new WeakMap(); // Discard cached paths after land changes.
    });
    current={field,mesh,grass,trees,legacy,off};props.flora?.populate?.();suppressOldGrass();
  }
  function suppressOldGrass(){const g=props.flora?.grass;if(g){if(!oldGrass.has(g))oldGrass.set(g,g.visible);g.visible=false;}}
  function floorHeight(p,zArg,maxStep){
    if(!current)return oldFloor(p,zArg,maxStep);
    const object=p&&typeof p==='object',x=object?p.x:p,z=object?p.z:zArg,y=object&&Number.isFinite(p.y)?p.y:0;
    const ground=current.field.heightAt(x||0,z||0);if(ground==null)return oldFloor(p,zArg,maxStep);
    const step=Number.isFinite(maxStep)?maxStep:object&&Number.isFinite(zArg)&&zArg>0&&zArg<=2?zArg:.42,candidates=[ground];
    for(const f of world.floors||[])if(Math.abs(x-f.x)<f.w/2+.01&&Math.abs(z-f.z)<f.d/2+.01)candidates.push(f.y+f.h);
    let stair=null;const pt=new T.Vector3(x||0,y,z||0);
    for(const group of world.stairs||[]){if(!group.parent)continue;const s=group.userData.stairs;if(!s)continue;const local=group.worldToLocal(pt.clone());if(Math.abs(local.x)<=s.width/2+.08&&local.z>=-.08&&local.z<=s.run+.12)stair=T.MathUtils.clamp(local.z/Math.max(.001,s.run),0,1)*s.rise;}
    if(stair!==null)return stair;
    const reachable=candidates.filter(h=>h<=y+step);return reachable.length?Math.max(...reachable):Math.min(...candidates);
  }
  const gun=new TerrainGun({props,getTerrain:()=>current,...config.brush});
  wrap(world,'floorHeight',()=>floorHeight);
  wrap(world,'setScene',original=>function(name){
    if(!['Living room','Jungle','Beach'].includes(name))return original.call(this,name);
    gun.cancel();const legacy=detach();legacy?.geometry?.dispose();legacy?.material?.dispose();const result=original.call(this,name);populate();return result;
  });
  wrap(world,'excavateWater',original=>function(x,z,r,bed){
    if(!current)return original.call(this,x,z,r,bed);
    this.waterBeds??=[];this.waterBeds=this.waterBeds.filter(b=>b.rect||Math.hypot(b.x-x,b.z-z)>.4);this.waterBeds.push({x,z,r,bed});current.field.excavate(x,z,r,bed);current.grass.refresh();
  });
  wrap(world,'projectSphere',original=>function(p,r){let hit=original.call(this,p,r);const h=current?.field.heightAt(p.x,p.z);if(h!=null&&p.y<h+r){p.y=h+r;hit=true;}return hit;});
  wrap(world,'command',original=>function(ray,actor){
    const hit=current?.mesh.raycast(ray,Math.max(48,this.extent*1.8));if(!hit)return original?.call(this,ray,actor);
    const rc=new T.Raycaster(ray.origin,ray.direction,0,hit.distance),block=rc.intersectObjects(this.pickables.filter(o=>o!==current.mesh.root),false).find(h=>h.object.visible&&!h.object.userData.chunks?.[h.instanceId]?.broken);
    if(block)return original?.call(this,ray,actor);return actor&&this.walk?.(actor,hit.point)?'walking':null;
  });
  wrap(props,'make',original=>function(id){return Object.hasOwn(TERRAIN_WEAPONS,id)?makeTerrainGun(id,this.scene):original.call(this,id);});
  wrap(props,'applyHoldPose',original=>function(item){return isTerrainGun(item)?gun.holdPose(item):original.call(this,item);});
  wrap(props,'hold',original=>function(item,key){const result=original.call(this,item,key);if(result&&isTerrainGun(item)){gun.states.delete(item);if(key==='desktop')gun.stopDesktop();}return result;});
  wrap(props,'drop',original=>function(key){const item=this.held.get(key);const result=original.call(this,key);if(isTerrainGun(item)){gun.states.delete(item);if(key==='desktop')gun.stopDesktop();}return result;});
  wrap(props,'equip',original=>function(id){
    if(!Object.hasOwn(TERRAIN_WEAPONS,id))return original.call(this,id);
    let item=this.items.find(i=>i.id===id&&i.holder==null);
    if(!item){item=this.make(id);this.items.push(item);}
    const right=this.system.hands.handedness.indexOf('right'),key=this.renderer.xr.isPresenting?(right>=0?right:0):'desktop';
    const held=this.hold(item,key);if(held)gun.setMode(item,TERRAIN_WEAPONS[id].terrainMode);return held;
  });
  wrap(props,'trigger',original=>function(i){if(isTerrainGun(this.held.get(i))&&!this.builder?.active&&!this.restraints?.placing)return true;return original.call(this,i);});
  wrap(props,'desktop',original=>function(ray){if(isTerrainGun(this.held.get('desktop'))&&!this.builder?.active&&!this.restraints?.placing)return gun.startDesktop(ray);return original.call(this,ray);});
  wrap(props,'fire',original=>function(item,aim){if(isTerrainGun(item))return true;return original.call(this,item,aim);});
  // Keep the host's existing pickup, squeeze-to-hold, drop and throwing lifecycles.
  wrap(props,'weaponHit',original=>function(ray){
    const candidate=original.call(this,ray);if(!isTerrainGun(candidate))return candidate;
    const rc=new T.Raycaster(ray.origin,ray.direction,0,8),hits=rc.intersectObjects(this.items.filter(i=>i.holder==null&&isTerrainGun(i)).map(i=>i.group),true);
    const h=hits.find(h=>h.object.visible);if(!h)return null;
    return this.items.find(i=>{let o=h.object;while(o){if(o===i.group)return true;o=o.parent;}return false;})||null;
  });
  if(autoTick)wrap(props,'tick',original=>function(dt){const result=original.call(this,dt);api.tick(dt);return result;});
  if(props.flora?.tick)wrap(props.flora,'tick',original=>function(dt){const result=original.call(this,dt);suppressOldGrass();return result;});
  const api={
    disposed:false,config,gun,get field(){return current?.field;},get mesh(){return current?.mesh;},get grass(){return current?.grass;},get trees(){return current?.trees;},
    heightAt:(x,z)=>current?.field.heightAt(x,z),normalAt:(x,z,out)=>current?.field.normalAt(x,z,out),
    sculpt:args=>current?.field.brush(args),raycast:(ray,max)=>current?.mesh.raycast(ray,max),
    save:()=>({format:'mira-terrain-scene-1',scene:world.name,terrain:current.field.serialize()}),
    restore:data=>{if(data?.format!=='mira-terrain-scene-1'||data.scene!==world.name)throw new Error('Load the matching host scene first');current.field.restore(data.terrain);},
    loadDefaultMap:()=>world.setScene('Living room'),
    tick(dt){
      if(disposed)return;if(world.revision!==lastRevision){const legacy=detach();legacy?.geometry?.dispose();legacy?.material?.dispose();populate();}
      if(!current)return;dt=T.MathUtils.clamp(Number.isFinite(dt)?dt:0,0,.05);
      props.camera.getWorldPosition(viewer);gun.tick(dt);current.mesh.tick(dt,viewer);
      if(world.root.visible){current.grass.tick(dt,viewer);current.trees.tick(dt,viewer);}suppressOldGrass();
    },
    dispose(){
      if(disposed)return;disposed=api.disposed=true;gun.dispose();const legacy=detach();
      for(const key of [...props.held.keys()])if(isTerrainGun(props.held.get(key)))props.drop(key);
      for(const item of props.items.filter(isTerrainGun)){item.group.removeFromParent();const mats=new Set();item.group.traverse(o=>{o.geometry?.dispose();if(o.material)mats.add(o.material);});for(const m of mats)m.dispose();}
      props.items=props.items.filter(i=>!isTerrainGun(i));
      for(const undo of restores.reverse())undo();for(const undo of catalogRestores.reverse())undo();for(const id of addedGuns){const i=GUNS.indexOf(id);if(i>=0)GUNS.splice(i,1);}
      for(const [g,visible] of oldGrass)if(g.parent)g.visible=visible;
      if(legacy){world.root.add(legacy);world.terrain=legacy;}delete world.terrainFeatures;if(props.terrainFeatures===api)delete props.terrainFeatures;
      // Rebuild the native scene to restore its original bounds, trees and anchors.
      world.setScene(world.name);
    }
  };
  world.terrainFeatures=props.terrainFeatures=api;populate();
  // Existing menu code enumerates this shared registry at draw time.
  const select=globalThis.document?.getElementById?.('weaponSelect');
  if(select)for(const [id,w] of Object.entries(TERRAIN_WEAPONS))if(![...select.options].some(o=>o.value===id))select.add(new Option(w.name,id));
  return api;
}
