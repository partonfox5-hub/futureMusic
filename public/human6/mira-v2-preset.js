import {GARMENTS} from './mira-v2-garments.js?v=19.1.0';
import {draft,saveDraft} from './mira-v2-catalog.js?v=19.1.0';
import * as THREE from 'three';
const STORE='mira.human2.presets.v1';
const LAST=STORE+'.last';
function readAll(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch{return {};}}
function writeAll(map){try{localStorage.setItem(STORE,JSON.stringify(map));}catch{}}
export function listPresets(){return Object.keys(readAll()).sort();}
export function lastPresetName(){try{return localStorage.getItem(LAST)||'Slot 1';}catch{return 'Slot 1';}}
export function deletePreset(name){const all=readAll();delete all[name];writeAll(all);}
export function snapshot({mira,world,wardrobe,props,camera,orbit}){
 const actors=mira.actors.map(a=>{
  const clothes=(wardrobe?.clothes||[]).filter(c=>c.actor===a&&!c.detached).map(c=>({id:c.style.id,color:c.style.color,slot:c.style.slot}));
  return {
   version:a.version||'v2',name:a.displayName||'Mira',bodyType:a.bodyType||'female',
   faceType:a.faceType||0,hairStyle:a.hairStyle||0,hairColor:a.hairColor||0,eyeDetail:a.eyeDetail||'classic',hairDetail:a.hairDetail||'classic',
   personality:a.personality||'',shape:{...(a.shape||{})},
   position:a.group.position.toArray(),yaw:a.group.rotation.y,
   mode:a.autonomy?'auto':a.mode,gait:a.gait||0,idleChoice:a.idleChoice||'auto',
   expression:a.expressionOverride||null,autoWander:!!a.autoWander,attentionMode:a.attentionMode||'attentive',
   dest:a.dest?a.dest.toArray():null,clothes
  };
 });
 const car=props?.vehicle;
 return {
  v:1,savedAt:Date.now(),scene:world.name,builds:world.builder?.snapshot()||[],selected:Math.max(0,mira.actors.indexOf(mira.selected)),
  camera:{position:camera.position.toArray(),target:orbit?.target.toArray()||[0,1,0]},
  draft:{name:draft.name,bodyType:draft.bodyType,faceType:draft.faceType,hairStyle:draft.hairStyle,hairColor:draft.hairColor,eyeDetail:draft.eyeDetail,hairDetail:draft.hairDetail,outfit:draft.outfit,persona:draft.persona,prompt:draft.prompt,shape:{...(draft.shape||{})},clothes:Array.isArray(draft.clothes)?[...draft.clothes]:undefined},
  actors,car:car?{position:car.group.position.toArray(),yaw:car.group.rotation.y}:null
 };
}
export function savePreset(name,data){const n=String(name||lastPresetName()||'Slot 1').slice(0,48)||'Slot 1';const all=readAll();all[n]=data;writeAll(all);try{localStorage.setItem(LAST,n);}catch{}return n;}
export function loadPreset(name){const n=name||lastPresetName();const data=readAll()[n]||null;if(data)try{localStorage.setItem(LAST,n);}catch{}return data;}
export function applyPreset(data,{mira,world,wardrobe,props,camera,orbit,syncHud}){
 if(!data||!mira?.ready)return 'No preset';
 if(data.draft){Object.assign(draft,{...data.draft,shape:{...(data.draft.shape||{})}});saveDraft();dispatchEvent(new Event('mira:draft'));}
 world.setScene(data.scene||'Living room');world.builder?.restore(data.builds);
 while(mira.actors.length)mira.remove(mira.actors[mira.actors.length-1]);
 if(wardrobe){for(const c of [...(wardrobe.clothes||[])])wardrobe.remove(c);}
 const list=Array.isArray(data.actors)?data.actors:[];
 let spawned=0,err='';
 for(const rec of list){
  try{
   const a=mira.spawn({
    version:rec.version||'v2',name:rec.name,bodyType:rec.bodyType,faceType:rec.faceType,
    hairStyle:rec.hairStyle,hairColor:rec.hairColor,eyeDetail:rec.eyeDetail,hairDetail:rec.hairDetail,personality:rec.personality,
    shape:rec.shape||{},position:new THREE.Vector3().fromArray(rec.position||[0,0,0])
   });
   a.group.rotation.y=rec.yaw||0;a.gait=rec.gait||0;a.personality=rec.personality||a.personality;
   if(rec.expression){a.expressionOverride=rec.expression;a.setEmotion?.(rec.expression,.8,{source:'manual'});}
   if(rec.idleChoice)a.setIdlePose?.(rec.idleChoice);
   if(rec.attentionMode)a.attentionMode=rec.attentionMode;
   if(rec.mode&&rec.mode!=='auto')a.setMode?.(rec.mode);else a.setMode?.('auto');
   if(rec.dest){a.dest=new THREE.Vector3().fromArray(rec.dest);a.autoWander=true;a.setMode?.('wander');}
   else if(rec.autoWander)a.autoWander=true;
   for(const c of rec.clothes||[]){const g=GARMENTS.find(x=>x.id===c.id);if(g)wardrobe.equip(a,{...g,color:c.color??g.color});}
   spawned++;
  }catch(e){err=e.message||'Spawn limit reached';break;}
 }
 if(mira.actors[data.selected])mira.select(mira.actors[data.selected]);
 const car=props?.vehicle;
 if(car&&data.car?.position){car.group.position.fromArray(data.car.position);car.group.rotation.y=data.car.yaw||0;car.syncCollider?.();}
 if(data.camera?.position)camera.position.fromArray(data.camera.position);
 if(data.camera?.target&&orbit){orbit.target.fromArray(data.camera.target);orbit.update();}
 const sceneSelect=document.getElementById('sceneSelect');if(sceneSelect)sceneSelect.value=world.name;
 syncHud?.();
 return 'Loaded '+spawned+' NPC'+(spawned===1?'':'s')+(err?' · '+err:'');
}
export function downloadPreset(name,data){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(name||'mira-scene')+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
