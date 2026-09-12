import * as T from 'three';
import {installCombat,ARMOR_PRESETS} from './human5-combat.js?v=19.3.0';
import {installPetRefinement} from './human5-pets.js?v=19.3.0';
import {installNPCBehavior,NPC_ROLES,NPC_MODES,FOLLOWER_ORDERS} from './human5-npc-behavior.js?v=19.3.0';
import {installNavigation} from './human5-navigation.js?v=19.3.0';
import {wrapMethod} from './human5-common.js?v=19.3.0';

export function installGameplay(ctx){const {world,mira,props,dogs,camera,scene,wardrobe}=ctx;if(world.h5Gameplay)return world.h5Gameplay;
 const combat=installCombat(ctx),pets=installPetRefinement(ctx),npcs=installNPCBehavior({...ctx,combat}),navigation=installNavigation(world),restores=[];let ui=null,fetchPet=null;
 const point=ray=>{if(!fetchPet)return false;const a=fetchPet;fetchPet=null;return pets.fetch(a,ray);};
 restores.push(wrapMethod(props,'desktop',old=>function(ray){if(!this.held.get('desktop')){if(fetchPet)return point(ray);if(npcs.consumePoint(ray))return true;}return old.call(this,ray);}));
 restores.push(wrapMethod(props,'trigger',old=>function(i){if(!this.held.get(i)){if(fetchPet)return point(props.ray(i));if(npcs.consumePoint(props.ray(i)))return true;}return old.call(this,i);}));
 const api={combat,pets,npcs,navigation,ARMOR_PRESETS,NPC_ROLES,NPC_MODES,FOLLOWER_ORDERS,order:'follow',armor:'none',playerArmor:'none',petIndex:0,
  fetch(pet=api.pet()){fetchPet=pet;props.status='Point at an object, then trigger: pet fetch';return !!pet;},
  pet(){const list=dogs.list();return list[api.petIndex%Math.max(1,list.length)]||null;},
  tick(dt){combat.tick(dt);npcs.tick(dt);pets.tick(dt);if(!ui)makeUI();},
  snapshot(){return {combat:combat.snapshot(),npcs:npcs.snapshot(),mouthGrips:[...pets.pets.values()].map(s=>({name:s.pet.displayName,held:s.held?.type||null}))};},
  dispose(){restores.reverse().forEach(f=>f());pets.dispose();npcs.dispose();combat.dispose();navigation.dispose();ui?.remove();delete world.h5Gameplay;}
 };world.h5Gameplay=api;
 function makeUI(){const root=document.getElementById('ui');if(!root)return;ui=document.createElement('details');ui.style.cssText='padding:12px';const title=document.createElement('summary');title.textContent='NPCs · followers · armor · pets';ui.append(title);
  const select=(label,values,change)=>{const l=document.createElement('label');l.textContent=label;const s=document.createElement('select');for(const [id,name]of values){const o=document.createElement('option');o.value=id;o.textContent=name;s.append(o);}s.onchange=()=>change(s.value);l.append(s);ui.append(l);return s;};
  const button=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{try{fn();}catch(e){props.status=e.message;}};ui.append(b);};
  select('Role',Object.entries(NPC_ROLES).map(([k,v])=>[k,v.name]),v=>npcs.role=v);select('Behavior',NPC_MODES.map(v=>[v,v]),v=>npcs.mode=v);select('Spawn location',['here','house','woods','city'].map(v=>[v,v]),v=>npcs.location=v);button('SPAWN NPC',()=>npcs.spawn());
  button('SELECT NEXT NPC',()=>{const a=mira.actors;mira.select(a[(a.indexOf(mira.selected)+1)%a.length]);});
  select('Follower order',FOLLOWER_ORDERS.map(v=>[v,v]),v=>api.order=v);button('APPLY TO SELECTED NPC',()=>npcs.command(mira.selected,api.order));
  select('NPC armor',Object.entries(ARMOR_PRESETS).map(([k,v])=>[k,v.name]),v=>api.armor=v);button('EQUIP SELECTED NPC ARMOR',()=>combat.equip(mira.selected,api.armor));
  button('TOGGLE SELECTED NPC INVINCIBILITY',()=>combat.setInvincible(mira.selected,!mira.selected?.h5Invincible));button('TOGGLE ALL NPC INVINCIBILITY',()=>combat.allInvincible=!combat.allInvincible);
  select('Player armor',Object.entries(ARMOR_PRESETS).map(([k,v])=>[k,v.name]),v=>api.playerArmor=v);button('EQUIP PLAYER ARMOR',()=>combat.equip('player',api.playerArmor));button('RESTORE PLAYER HEALTH',()=>combat.heal('player'));
  const petBreeds=dogs.breeds||{};select('Pet breed',Object.entries(petBreeds).map(([id,b])=>[id,b.name]),v=>api.petBreed=v);button('SPAWN BREED',()=>{const id=api.petBreed||'labrador';dogs.spawn({species:petBreeds[id].species,breed:id});});button('REMOVE SELECTED PET',()=>dogs.despawn(api.pet()));
  button('PET FETCH: THEN POINT AT OBJECT',()=>api.fetch());button('PET DROP',()=>pets.release(api.pet()));button('PET FOLLOW',()=>api.pet()?.setFollow(true));root.append(ui);
 }
 return api;
}
