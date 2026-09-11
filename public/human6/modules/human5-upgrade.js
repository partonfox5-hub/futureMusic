import * as T from 'three';
import {tagMovable,placeFurniture} from '../mira-v2-furniture.js?v=17.2.0';
import {HouseDoors} from '../mira-v2-doors.js?v=17.2.0';
import {makeSurfaceMap} from '../mira-v2-walls.js?v=17.2.0';
import {SCENES} from '../mira-v2-world.js?v=17.2.0';
import {FixtureLights} from './human5-lighting.js?v=17.2.0';
import {upgradeHostFire} from './human5-fire-host.js?v=17.2.0';
import {FurnitureMaterials} from './human5-furniture.js?v=17.2.0';
import {TextileSystem} from './human5-textiles.js?v=17.2.0';
import {Neighborhood,NEIGHBORHOOD_NAME} from './human5-neighborhood.js?v=17.2.0';
import {installHumanDynamics,DYNAMICS_CONTROLS} from './human5-dynamics.js?v=17.2.0';
import {installSkinRefinement} from './human5-skin.js?v=17.2.0';
import {applyNPCProfile,exportNPCProfile} from './human5-npc-profile.js?v=17.2.0';
import {installVehicleRefinement} from './human5-vehicles.js?v=17.2.0';
import {installTissueSurface} from './human5-tissue-surface.js?v=17.2.0';
import {installReferenceIdentity,REFERENCE_EXPRESSIONS,REFERENCE_MIRA} from './human5-identity.js?v=17.2.0';
import {V,VERSION,wrapMethod,attachedTo} from './human5-common.js?v=17.2.0';

/** Single installation point, after legacy fire/water/props, before the render loop. */
export function installHuman5Upgrade({scene,renderer,camera,world,mira,props,wardrobe,water,quest=true,daylight=null,newMap=true}={}){
  if(world.h5Upgrade)return world.h5Upgrade;
  const lights=new FixtureLights(scene,{quest}),fireAdapter=upgradeHostFire(props,{lights}),fire=fireAdapter.fire;
  lights.occluded=(a,b,s,t)=>fire.blocked(a,b,s,t);
  const furniture=new FurnitureMaterials({world,tagMovable,fire,maxDebris:quest?18:32}),textiles=new TextileSystem({world,fire,maxTufts:quest?1200:2400});
  const unbindFurniture=furniture.bindProps(props),unbindTextiles=textiles.bindProps(props);
  const neighborhood=new Neighborhood({world,furniture,textiles,lights,fire,tagMovable,HouseDoors,makeSurfaceMap,placeFurniture,wardrobe}).install(SCENES);
  const actors=new Set(),vehicles=new Set(),restores=[];let identityAssigned=false,scanT=0,disposed=false,ui=null;
  const waterAt=(p,r=.035)=>{const s=water?.contains(p.clone().add(new T.Vector3(0,-r,0)));return s?{height:s.surfaceY,density:1000,velocity:V()}:null;};
  function attachActor(a){
    if(a.version!=='v2'||actors.has(a))return;actors.add(a);
    installSkinRefinement(a,{detail:false,receiveShadow:false});installHumanDynamics(a,{waterAt});installTissueSurface(a);
    for(const c of DYNAMICS_CONTROLS)a.shape[c.key]??=c.value;
    if(!identityAssigned&&a.bodyType!=='male'){installReferenceIdentity(a);Object.assign(a.shape,REFERENCE_MIRA.physics);identityAssigned=true;}
  }
  function updateUI(){if(ui)return;const container=document.getElementById('ui');if(!container)return;ui=document.createElement('details');ui.style.cssText='padding:12px;min-width:240px';const summary=document.createElement('summary');summary.textContent='Mira reference & material upgrades';ui.append(summary);
    const button=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;ui.append(b);return b;};
    button('USE REFERENCE MIRA',()=>{const a=mira.selected;if(a?.version==='v2'){attachActor(a);const id=a.h5Identity||installReferenceIdentity(a);id.setEnabled(true);}});
    const expressions=document.createElement('select');for(const key of Object.keys(REFERENCE_EXPRESSIONS)){const o=document.createElement('option');o.value=key;o.textContent=key.replace(/([A-Z])/g,' $1');expressions.append(o);}ui.append(expressions);
    button('PREVIEW EXPRESSION',()=>{const a=mira.selected;if(a?.version==='v2')(a.h5Identity||installReferenceIdentity(a,{enabled:false})).express(expressions.value);});
    button('BUILD CUL-DE-SAC',()=>world.setScene(NEIGHBORHOOD_NAME));
    const upload=document.createElement('input');upload.type='file';upload.accept='.json';upload.setAttribute('aria-label','Import NPC profile');const importStatus=document.createElement('div');
    upload.onchange=async()=>{try{const f=upload.files[0];if(!f)return;if(f.size>128000)throw new Error('NPC profile exceeds 128 KB');applyNPCProfile(mira.selected,JSON.parse(await f.text()));importStatus.textContent='NPC profile applied';}catch(e){importStatus.textContent=e.message;}};ui.append(upload,importStatus);
    button('EXPORT NPC PROFILE',()=>{try{const blob=new Blob([JSON.stringify(exportNPCProfile(mira.selected),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='character.h5npc.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}catch(e){importStatus.textContent=e.message;}});
    for(const control of DYNAMICS_CONTROLS){const label=document.createElement('label');label.textContent=control.label;const input=document.createElement('input');input.type='range';Object.assign(input,{min:control.min,max:control.max,step:control.step,value:control.value});input.oninput=()=>{if(mira.selected?.version==='v2'){mira.selected.shape[control.key]=+input.value;mira.selected.h5Dynamics?.set({[control.key]:+input.value});}};label.append(input);ui.append(label);}
    container.append(ui);
  }
  restores.push(wrapMethod(mira,'spawn',old=>function(){const a=old.apply(this,arguments);if(a)attachActor(a);return a;}));
  const api={version:VERSION,lights,fire,furniture,textiles,neighborhood,actors,daylight,
    beforeFrame(dt){if(disposed)return;for(const car of props.cars()){if(!vehicles.has(car)){vehicles.add(car);installVehicleRefinement(car);}}for(const a of mira.actors)attachActor(a);for(const a of actors){if(!mira.actors.includes(a)){a.h5TissueSurface?.dispose();a.h5Dynamics?.dispose();a.h5Skin?.dispose();actors.delete(a);}else a.h5Dynamics?.set(a.shape);}updateUI();
      const viewer=camera.getWorldPosition(V());daylight?.follow(viewer);textiles.pile.visible=world.root.visible;
      if(world.root.visible)textiles.tick(dt,viewer);lights.tick(dt,viewer);
      scanT-=dt;if(scanT<=0){scanT=.75;for(const root of world.movables||[])if(root.userData.dogItem)furniture.upgradePetBag(root);for(const f of lights.fixtures)if(!attachedTo(f.root,world.root))lights.remove(f);}
    },
    snapshot(){return {version:VERSION,scene:world.name,actors:[...actors].map(a=>({name:a.displayName,reference:!!a.h5Identity?.enabled,shape:{...a.shape},sculpt:a.h5Identity?{...a.h5Identity.sculpt}:null})),fire:{surfaces:fire.surfaces.size,sources:fire.sources.size},rugs:[...textiles.rugs].map(r=>({holes:r.faces.filter(f=>f.dead).length,triangles:r.mesh.geometry.index.count/3}))};},
    async useGeneratedFace(a=mira.selected){if(a?.version!=='v2')return;const map=await new T.TextureLoader().loadAsync(new URL('../assets/identity/head-reference-generated.png',import.meta.url).href);map.colorSpace=T.SRGBColorSpace;map.flipY=false;
      // Optional generated texture is 1254px, not a claimed 4K scan.
      if(a.h5Identity)a.h5Identity.dispose();installReferenceIdentity(a,{texture:map});return map;
    },
    dispose(){disposed=true;for(const car of vehicles)car.h5Vehicle?.dispose();unbindTextiles();unbindFurniture();neighborhood.dispose();restores.reverse().forEach(f=>f());for(const a of actors){a.h5Identity?.dispose();a.h5TissueSurface?.dispose();a.h5Dynamics?.dispose();a.h5Skin?.dispose();}textiles.dispose();furniture.dispose();lights.dispose();fireAdapter.dispose();ui?.remove();delete world.h5Upgrade;}
  };world.h5Upgrade=api;if(newMap)world.setScene(NEIGHBORHOOD_NAME);return api;
}
