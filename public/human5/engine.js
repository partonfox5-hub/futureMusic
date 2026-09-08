import {Builder,FURNITURE,SURFACES} from './mira-v2-builder.js?v=13.0';
import {SmoothLocomotion} from './mira-v2-locomotion.js?v=13.3';
import {Car} from './mira-v2-car.js?v=13.2';
import {Restraints} from './mira-v2-restraints.js?v=12.4';
import { createDogSystem } from './mira-v2-dog.js?v=13.3';
import {Injuries} from './mira-v2-injuries.js?v=12.9';
import {Props,WEAPONS} from './mira-v2-props.js?v=13.3';
import {syncFurniture} from './mira-v2-furniture.js?v=13.0';
import {installWater} from './mira-v2-water.js?v=13.3';
import {createFloraSystem} from './mira-v2-flora.js?v=13.3';
import {RoomLight} from './mira-v2-light.js?v=11.0';
import {draft,saveDraft,spawnOptions,OUTFITS,clothingItems} from './mira-v2-catalog.js?v=11.0';
import {MiraWorld,SCENES} from './mira-v2-world.js?v=13.3';
import {Wardrobe,GARMENTS} from './mira-v2-wardrobe.js?v=11.2';
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createVRMenu } from "./mira-vr-menu.js?v=13.3";
import { snapshot, savePreset, loadPreset, applyPreset, listPresets, lastPresetName, downloadPreset } from "./mira-v2-preset.js?v=11.5";
import { unlockSfx } from "./mira-v2-sfx.js?v=11.0";
import { EMOTION_NAMES, IDLE_NAMES, WALK_NAMES, ATTENTION_MODES } from "./mira-v2-features.js?v=13.3";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createMiraSystem, SLIDERS, FACE_TYPES, HAIR_COLORS } from "./mira-v2.js?v=13.3";
import { DEFAULT_PERSONA, miraChat, miraSpeak, startMic, unlockVoice } from "./mira-voice-v2.js?v=12.3";

import {V2_EXTRA_SLIDERS,FACE_PRESETS,HAIR_STYLES,ACTIVITY_MODES,ATTENTION_LABELS,shapeSliders} from './mira-v2-controls.js?v=12.9';

const QUEST = /OculusBrowser|Quest/i.test(navigator.userAgent);
const loadEl = document.getElementById("load");
const hintEl = document.getElementById("hint");
const ui = document.getElementById("ui");
const statsEl = document.getElementById("stats");
const faceLab = document.getElementById("faceLab");
const hairLab = document.getElementById("hairLab");

function banner(msg) {
  if (loadEl) loadEl.textContent = msg;
  if (hintEl) hintEl.textContent = msg;
}

// Quest: skip MSAA (tiled Adreno pays a full extra render pass). Spend that budget on framebuffer scale instead.
const renderer = new THREE.WebGLRenderer({ antialias: !QUEST, alpha: true, powerPreference: "high-performance" });
const XR_ON = () => renderer.xr.isPresenting;
renderer.setPixelRatio(Math.min(devicePixelRatio, QUEST ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
if (QUEST) renderer.xr.setFramebufferScaleFactor(0.9);
renderer.setClearColor(0x6b5e52, 1);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6b5e52);
const rig = new THREE.Group();
scene.add(rig);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 450);
camera.position.set(0, 1.45, 2.6);
camera.lookAt(0, 0.95, 0);
rig.add(camera);
scene.add(new THREE.HemisphereLight(0xf5f8ff, 0x82766d, 0.72));
const key = new THREE.DirectionalLight(0xfff4ee, 1.65);
key.position.set(1.4, 3.2, 2.8);
key.castShadow=true;key.shadow.mapSize.set(QUEST?1024:2048,QUEST?1024:2048);
key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=8;key.shadow.camera.bottom=-4;
key.shadow.camera.near=.1;key.shadow.camera.far=28;key.shadow.bias=-.0001;key.shadow.normalBias=.010;
scene.add(key);
// Broad photographic key/fill balance. V2 skin avoids
// low-resolution self-shadow acne; the floor retains contact shadows.
const fill=new THREE.DirectionalLight(0xe7efff,.72);fill.position.set(-2.5,2.2,2.0);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffeee3,.55);rim.position.set(.8,2.5,-2);scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.08));
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.65;
  room.dispose(); pmrem.dispose();
} catch (e) { console.warn("env", e); }

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(8, 48),
  new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow=true;
scene.add(floor);

let controls = null;
try { controls = new PointerLockControls(camera, renderer.domElement); } catch (e) { banner("look: " + e.message); }
const keys = {};
addEventListener("keydown", (e) => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; keys[e.code] = true; });
addEventListener("keyup", (e) => { keys[e.code] = false; });
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0,1.02,0);orbit.enableDamping=true;orbit.minDistance=.35;orbit.maxDistance=8;orbit.maxPolarAngle=Math.PI*.94;
orbit.update();
document.getElementById("desk").onclick = () => { unlockSfx(); if(ui)ui.style.display="none"; orbit.enabled=true; };
document.getElementById("firstPerson").onclick=()=>{unlockSfx();orbit.enabled=false;if(ui)ui.style.display="none";controls?.lock();};
controls?.addEventListener('unlock',()=>{orbit.enabled=true;});
document.getElementById("enter").onclick = ()=>{unlockSfx();enterXr({arFirst:true});};
document.getElementById("enterAR").onclick=()=>enterXr({ar:true});
document.getElementById("enterVrSharp")?.addEventListener("click",()=>{unlockSfx();enterXr({sharp:true});});


const mira = createMiraSystem({ scene, renderer, camera, xrOn: XR_ON, rig });
const world=new MiraWorld(scene,mira);mira.setEnvironment(world);floor.visible=false;const wardrobe=new Wardrobe(scene,mira,mira.contacts,world);mira.setWardrobe(wardrobe);
const props=new Props({scene,system:mira,world,wardrobe,camera,renderer,rig});world.interactions=props;props.restraints=new Restraints(props);props.injuries=new Injuries(props);
const carBlue=new Car(props,{orbit,keys,controls,color:0x1e4f8a,name:'Blue car'});
const carRed=new Car(props,{orbit,keys,controls,color:0xb42222,name:'Red car'});
props.vehicle=carBlue;props.vehicles=[carBlue,carRed];
const dogs=createDogSystem({scene,mira,system:mira,world,props,camera,renderer,THREE});props.dogs=dogs;
const water=installWater({scene,world,camera,renderer,props,mira,THREE,syncFurniture,rig});
world.waterSystem=water;props.water=water;
const flora=createFloraSystem({scene,mira,system:mira,world,props,camera,renderer,THREE});
props.flora=flora;
function ensureYardPond(){
 if(!water||world.name==='Beach'){if(props._yardPond){props._yardPond.despawn?.();props._yardPond=null;}return;}
 if(props._yardPond && props._pondScene===world.name)return;
 if(props._yardPond){props._yardPond.despawn?.();props._yardPond=null;}
 const x=12.4,z=1.8,y=(Number(world.floorHeight?.(new THREE.Vector3(x,0,z)))||0)+.32;
 props._yardPond=water.spawnBody({kind:'pond',center:[x,y,z],radius:2.3,depth:.32});
 props._pondScene=world.name;
}
ensureYardPond();
const builder=new Builder(world,wardrobe,props);props.builder=builder;
const roomLight=new RoomLight(scene,renderer,rig);
let voiceSessionStart=()=>{},voiceSessionEnd=()=>{};
banner("LOADING HUMAN 5…");
mira.load(
  (x) => { if (x.total && loadEl) loadEl.textContent = "LOADING  " + Math.round((x.loaded / x.total) * 100) + "%"; },
  () => {
    if (loadEl) loadEl.remove();
    banner("Drag to orbit · wheel to zoom · Grab body or Shift-drag · VR: Y menu, right B ball");
    syncHud();document.dispatchEvent(new Event("mira:ready"));
    dogs.spawnDefault();
    if (new URLSearchParams(location.search).has("debug")) window.human2 = { mira, scene, renderer, camera, rig, keys, orbit, world, wardrobe, props, dogs, water, flora };
  },
  (e) => { banner("LOAD FAILED — " + (e && e.message ? e.message : "glb")); console.error(e); }
);

let grabMode=false, desktopGrab=null, desktopFurn=false;
const virtualGrip=new THREE.Object3D();scene.add(virtualGrip);
const pickRay=new THREE.Raycaster(),mouse=new THREE.Vector2(),dragPlane=new THREE.Plane();
function pointerRay(e){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);pickRay.setFromCamera(mouse,camera);}
renderer.domElement.addEventListener('pointerdown',e=>{
 if(XR_ON()||(!grabMode&&!e.shiftKey)||e.button!==0)return;
 pointerRay(e);const meshes=[];
 for(const a of mira.actors)a.root.traverse(o=>{if(o.isSkinnedMesh&&!/hair|eyes|teeth/.test(o.name)){o.computeBoundingSphere();meshes.push(o);}});
 for(const d of props.dogs?.list?.()||[])d.root.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingSphere();meshes.push(o);}});
 const hit=pickRay.intersectObjects(meshes,false)[0];
 if(hit){
  const a=mira.actors.find(a=>{let o=hit.object;while(o){if(o===a.root)return true;o=o.parent;}return false;});
  if(a){const region=a.nearestHit(hit.point,.13);if(region){virtualGrip.position.copy(hit.point);a.beginGrab(virtualGrip,region,hit.point);desktopGrab=a;mira.select(a);syncHud();dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.point);orbit.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);e.stopImmediatePropagation();e.preventDefault();return;}}
  const dog=(props.dogs?.list?.()||[]).find(d=>{let o=hit.object;while(o){if(o===d.root)return true;o=o.parent;}return false;});
  if(dog){const region=dog.nearestHit(hit.point,.16);if(region){virtualGrip.position.copy(hit.point);dog.beginGrab(virtualGrip,region,hit.point);desktopGrab=dog;dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.point);orbit.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);e.stopImmediatePropagation();e.preventDefault();return;}}
 }
 if(props.grabFurnitureFromRay(pickRay.ray,virtualGrip,'desktop')){desktopFurn=true;const p=virtualGrip.position;dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),p);orbit.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);e.stopImmediatePropagation();e.preventDefault();}
},true);
renderer.domElement.addEventListener('pointermove',e=>{if(builder.active&&!XR_ON())pointerRay(e);if(!desktopGrab&&!desktopFurn)return;pointerRay(e);const p=pickRay.ray.intersectPlane(dragPlane,new THREE.Vector3());if(p)virtualGrip.position.copy(p);});
function releaseDesktop(){if(desktopGrab)desktopGrab.endGrab(virtualGrip);desktopGrab=null;if(desktopFurn)props.releaseFurniture('desktop');desktopFurn=false;orbit.enabled=!grabMode&&!XR_ON();}
renderer.domElement.addEventListener('pointerup',releaseDesktop);renderer.domElement.addEventListener('pointercancel',releaseDesktop);addEventListener('blur',releaseDesktop);
// A click commands movement; a drag remains orbit, and Shift-drag remains grab.
let groundClick=null;
renderer.domElement.addEventListener('pointerdown',e=>{groundClick=!XR_ON()&&!grabMode&&!e.shiftKey&&e.button===0?{x:e.clientX,y:e.clientY,id:e.pointerId,t:performance.now()}:null;});
renderer.domElement.addEventListener('pointerup',e=>{const c=groundClick;groundClick=null;if(!c||c.id!==e.pointerId||Math.hypot(c.x-e.clientX,c.y-e.clientY)>5||performance.now()-c.t>650)return;pointerRay(e);const result=mira.pointCommand(pickRay.ray);if(result)syncHud();});
renderer.domElement.addEventListener('pointercancel',()=>groundClick=null);
renderer.domElement.addEventListener('pointerdown',e=>{if(XR_ON()||e.shiftKey||grabMode||e.button!==0)return;pointerRay(e);if(props.desktop(pickRay.ray)){groundClick=null;e.preventDefault();e.stopImmediatePropagation();}},true);
function activeCar(){return props.cars().find(c=>c.driving)||props.vehicle;}
function nearestCar(){const p=camera.getWorldPosition(new THREE.Vector3());return props.cars().slice().sort((a,b)=>a.group.position.distanceToSquared(p)-b.group.position.distanceToSquared(p))[0]||props.vehicle;}
document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='KeyQ')props.drop('desktop');if(e.code==='Escape')builder.stop();if(e.code==='KeyE'){const c=activeCar();c.driving?c.exit():nearestCar().enter();}});
const clothHandle=new THREE.Object3D();let clothPointer=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(XR_ON()||e.shiftKey||grabMode||e.button!==0)return;pointerRay(e);if(wardrobe.begin(pickRay.ray,clothHandle,'desktop')){clothPointer=e.pointerId;orbit.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();}},true);
renderer.domElement.addEventListener('pointermove',e=>{if(clothPointer!==e.pointerId)return;pointerRay(e);wardrobe.move('desktop',pickRay.ray);});
renderer.domElement.addEventListener('pointerup',e=>{if(clothPointer!==e.pointerId)return;pointerRay(e);wardrobe.end('desktop',pickRay.ray);clothPointer=null;orbit.enabled=true;groundClick=null;e.stopImmediatePropagation();},true);
renderer.domElement.addEventListener('pointercancel',()=>{wardrobe.cancel('desktop');clothPointer=null;orbit.enabled=true;});
function spawnVersion(version){
 const a=selected(),n=mira.actors.length;try{const p=new THREE.Vector3((n%3)*.85-.85,0,-((n/3)|0)*.9);
  mira.spawn({version,position:p,shape:a?{...a.shape}:undefined,faceType:version==='v2'?(a?.version==='v2'?a.faceType:1):a?.faceType||0,hairColor:a?.hairColor||0,hairStyle:a?.hairStyle||0,eyeDetail:a?.eyeDetail||'advanced',hairDetail:a?.hairDetail||'advanced',attentionMode:a?.attentionMode||'attentive'});syncHud();
 }catch(e){banner(e.message);}
}
function frameActor(face){const a=selected();if(!a)return;const c=a.group.position.clone();c.y+=(face?1.5:1.0)*a.shape.height;orbit.target.copy(c);camera.position.copy(c).add(new THREE.Vector3(0,face?.015:.18,face?.53:2.6));camera.lookAt(c);orbit.update();}
function syncHud(){
 const a=selected(),el=document.getElementById('actorSelect');el.replaceChildren();mira.actors.forEach((a,i)=>el.add(new Option(`${a.displayName||'Mira'} ${i+1} · ${a.version.toUpperCase()}`,String(i))));el.value=String(mira.actors.indexOf(a));
 if(!a)return;document.getElementById('persona').value=a.personality||DEFAULT_PERSONA;document.getElementById('wearBtn').disabled=a.version!=='v2';for(const s of shapeSliders(SLIDERS,a)){const input=document.getElementById('s_'+s.key);if(input){input.min=s.min;input.max=s.max;input.value=a.shape[s.key]??s.value;}}for(const s of V2_EXTRA_SLIDERS){const input=document.getElementById('s_'+s.key);if(input)input.disabled=a.version!=='v2';}
 faceLab.textContent=a.version==='v2'?(FACE_PRESETS[a.faceType]?.name||'Natural'):FACE_TYPES[a.faceType].name;hairLab.textContent=HAIR_COLORS[a.hairColor].name;
 for(const id of ['idlePose','expression','testBalance','faceSmile','faceSurprise'])document.getElementById(id).disabled=a.version!=='v2';
 document.getElementById('eyeDetail').disabled=document.getElementById('hairDetail').disabled=a.version!=='v2';document.getElementById('eyeDetail').value=a.eyeDetail||'classic';document.getElementById('hairDetail').value=a.hairDetail||'classic';document.getElementById('visualStatus').textContent=a.visualStatus?.()||'Original V1 appearance';document.getElementById('hairStyle').disabled=a.version!=='v2'||a.hairDetail==='classic';document.getElementById('hairStyle').value=String(a.hairStyle||0);document.getElementById('activity').disabled=a.version!=='v2';document.getElementById('activity').value=a.autonomy?'auto':a.mode;
 document.getElementById('walkStyle').value=String(a.gait);
 document.getElementById('idlePose').value=String(['auto',...IDLE_NAMES].indexOf(a.idleChoice||'auto'));
 const att=document.getElementById('attentionMode');if(att){att.disabled=a.version!=='v2';att.value=a.attentionMode||'attentive';}
 document.getElementById('expression').value=String(['context',...EMOTION_NAMES].indexOf(a.expressionOverride||'context'));
}
function copyConfiguration(){const a=selected();if(!a)return;Object.assign(draft,{bodyType:a.bodyType||'female',faceType:a.faceType,hairStyle:a.hairStyle||0,hairColor:a.hairColor,eyeDetail:a.eyeDetail||'classic',hairDetail:a.hairDetail||'classic',shape:{...a.shape}});saveDraft();dispatchEvent(new Event('mira:draft'));}
function spawnConfigured(){if(!mira.ready)return;const n=mira.actors.length,p=new THREE.Vector3((n%3)*.85-.85,0,-((n/3)|0)*.9),a=mira.spawn(spawnOptions(p));if(a&&selected()?.attentionMode)a.attentionMode=selected().attentionMode;for(const id of clothingItems())wardrobe.equip(a,GARMENTS.find(g=>g.id===id));syncHud();}
function captureScene(){return snapshot({mira,world,wardrobe,props,camera,orbit});}
function refreshPresetSelect(){const el=document.getElementById('presetSelect');if(!el)return;const names=listPresets(),cur=el.value||lastPresetName();el.replaceChildren(...(names.length?names:['Slot 1']).map(n=>new Option(n,n)));if([...el.options].some(o=>o.value===cur))el.value=cur;}
function persistScene(name){unlockSfx();const n=savePreset(name||document.getElementById('presetName')?.value||lastPresetName(),captureScene());const nameEl=document.getElementById('presetName');if(nameEl)nameEl.value=n;refreshPresetSelect();const sel=document.getElementById('presetSelect');if(sel)sel.value=n;const st=document.getElementById('presetStatus');if(st)st.textContent='Saved '+n+' · '+mira.actors.length+' NPC'+(mira.actors.length===1?'':'s');return n;}
function restoreScene(name){unlockSfx();const n=name||document.getElementById('presetSelect')?.value||lastPresetName();const data=loadPreset(n);const msg=applyPreset(data,{mira,world,wardrobe,props,camera,orbit,syncHud});const st=document.getElementById('presetStatus');if(st)st.textContent=msg;const nameEl=document.getElementById('presetName');if(nameEl)nameEl.value=n;refreshPresetSelect();return msg;}
const vrMenu=createVRMenu({spawnConfigured,copyConfiguration,scene,renderer,camera,system:mira,spawn:spawnVersion,onSync:syncHud,world,wardrobe,props,saveScene:()=>persistScene(lastPresetName()),loadScene:()=>restoreScene(lastPresetName())});props.menu=vrMenu;

function selected() { return mira.selected; }

function bindHud() {
 document.getElementById('enterCar').onclick=()=>nearestCar().enter();document.getElementById('exitCar').onclick=()=>activeCar().exit();document.getElementById('carGear')?.addEventListener('click',()=>activeCar().cycleGear());document.getElementById('repairCar').onclick=()=>{for(const c of props.cars())c.reset();};document.getElementById('mirrorOn').onchange=e=>{for(const c of props.cars())c.mirrorEnabled=e.target.checked;};

 document.getElementById('placeLink').onclick=()=>props.restraints.start();document.getElementById('cancelLink').onclick=()=>props.restraints.cancel();document.getElementById('linkMode').onchange=e=>props.restraints.mode=e.target.value;document.getElementById('linkSelect').onchange=e=>props.restraints.selected=props.restraints.links.find(l=>l.id===Number(e.target.value));document.getElementById('linkLength').oninput=e=>props.restraints.setLength(e.target.value);document.getElementById('cutLink').onclick=()=>props.restraints.cut();document.getElementById('removeLink').onclick=()=>props.restraints.remove();document.getElementById('injuryEnabled').onchange=e=>props.injuries.enabled=e.target.checked;document.getElementById('allowSever').onchange=e=>props.injuries.allowSever=e.target.checked;document.getElementById('healActor').onclick=()=>props.injuries.heal(selected());document.getElementById('clearBodies').onclick=()=>{const msg=props.injuries.clearBodies();const st=document.getElementById('linkStatus');if(st)st.textContent=msg;syncHud();};

 const weaponSelect=document.getElementById('weaponSelect');weaponSelect.replaceChildren(...Object.entries(WEAPONS).map(([id,w])=>new Option(w.name,id)));document.getElementById('equipWeapon').onclick=()=>props.equip(weaponSelect.value);document.getElementById('dropWeapon').onclick=()=>props.drop('desktop');document.getElementById('resetHouse').onclick=()=>world.setScene('Living room');
 const presetName=document.getElementById('presetName');if(presetName)presetName.value=lastPresetName();
 refreshPresetSelect();
 document.getElementById('savePreset').onclick=()=>persistScene(document.getElementById('presetName').value);
 document.getElementById('loadPreset').onclick=()=>restoreScene(document.getElementById('presetSelect').value);
 document.getElementById('downloadPreset').onclick=()=>{const n=document.getElementById('presetName').value||lastPresetName();downloadPreset(n,captureScene());document.getElementById('presetStatus').textContent='Downloaded '+n+'.json';};
 document.getElementById('presetFile').onchange=e=>{const file=e.target.files?.[0];if(!file)return;file.text().then(text=>{try{const data=JSON.parse(text);const n=savePreset(file.name.replace(/\.json$/i,''),data);document.getElementById('presetName').value=n;refreshPresetSelect();document.getElementById('presetSelect').value=n;document.getElementById('presetStatus').textContent=applyPreset(data,{mira,world,wardrobe,props,camera,orbit,syncHud});}catch(err){document.getElementById('presetStatus').textContent=err.message||'Invalid preset file';}});e.target.value='';};
 addEventListener('pointerdown',unlockSfx,{once:true});
 document.getElementById("spawnNpc").onclick=spawnConfigured;document.getElementById("copyNpc").onclick=copyConfiguration;document.getElementById("foveation")?.addEventListener("input",e=>{const v=Number(e.target.value);applyXrFoveation(v);if(XR_ON())setXrStatus({ffr:v});});document.getElementById("hapticGain").oninput=e=>mira.hands.haptics.gain=Number(e.target.value);document.getElementById("quality")?.addEventListener("change",()=>{if(!XR_ON())return;const ffr=sessionFoveation();applyXrFoveation(ffr);setXrStatus({ffr});});
 const sceneSelect=document.getElementById('sceneSelect');sceneSelect.replaceChildren(...SCENES.map(x=>new Option(x,x)));sceneSelect.value=world.name;sceneSelect.onchange=()=>{world.setScene(sceneSelect.value);ensureYardPond();};
 document.getElementById('floraDensity')?.addEventListener('input',e=>flora?.setDensity(Number(e.target.value)));
 const wardrobeSelect=document.getElementById('wardrobeSelect');wardrobeSelect.replaceChildren(...GARMENTS.map(x=>new Option(x.name,x.id)));document.getElementById('wearBtn').onclick=()=>wardrobe.equip(selected(),GARMENTS.find(x=>x.id===wardrobeSelect.value));

  for(const slider of V2_EXTRA_SLIDERS){
    const container=document.getElementById(slider.section==='shape'?'placementControls':slider.section==='skin'?'skinControls':'tissueControls'),label=document.createElement('label'),input=document.createElement('input');label.htmlFor='s_'+slider.key;label.textContent=slider.label;input.id='s_'+slider.key;input.type='range';input.value=slider.value;container.append(label,input);
  }
  for (const s of [...SLIDERS,...V2_EXTRA_SLIDERS]) {
    const el = document.getElementById("s_" + s.key);
    if (!el) continue;
    el.min = s.min; el.max = s.max; el.step = s.step;
    if (el.value === "" || el.value == null) el.value = s.value;
    el.addEventListener("input", () => {
      const a = selected();
      if (a) a.shape[s.key] = parseFloat(el.value);
    });
  }
  const syncLabs = () => {
    const a = selected();
    if (!a) return;
    if (faceLab) faceLab.textContent = a.version==="v2" ? (FACE_PRESETS[a.faceType]?.name||"Natural") : FACE_TYPES[a.faceType].name;
    if (hairLab) hairLab.textContent = HAIR_COLORS[a.hairColor].name;
  };
  document.getElementById("facePrev").onclick = () => {
    const a = selected();
    if (!a) return;
    a.faceType = a.version==="v2" ? (a.faceType+FACE_PRESETS.length-1)%FACE_PRESETS.length : (a.faceType + FACE_TYPES.length - 1) % FACE_TYPES.length;
    a.applyLooks();
    syncLabs();
  };
  document.getElementById("faceNext").onclick = () => {
    const a = selected();
    if (!a) return;
    a.faceType = a.version==="v2" ? (a.faceType+1)%FACE_PRESETS.length : (a.faceType + 1) % FACE_TYPES.length;
    a.applyLooks();
    syncLabs();
  };
  document.getElementById("hairPrev").onclick = () => {
    const a = selected();
    if (!a) return;
    a.hairColor = (a.hairColor + HAIR_COLORS.length - 1) % HAIR_COLORS.length;
    a.applyLooks();
    syncLabs();
  };
  document.getElementById("hairNext").onclick = () => {
    const a = selected();
    if (!a) return;
    a.hairColor = (a.hairColor + 1) % HAIR_COLORS.length;
    a.applyLooks();
    syncLabs();
  };
  document.getElementById("spawnV1").onclick=()=>spawnVersion('v1');
  document.getElementById("spawnMira").onclick=()=>spawnVersion('v2');
  document.getElementById("spawnDog")?.addEventListener("click",()=>dogs.spawn());
  document.getElementById("actorSelect").onchange=e=>{mira.select(mira.actors[Number(e.target.value)]);syncHud();};
  document.getElementById("removeActor").onclick=()=>{if(selected())mira.remove(selected());syncHud();};
  for(const [id,values] of [['walkStyle',WALK_NAMES],['idlePose',['auto',...IDLE_NAMES]],['expression',['context',...EMOTION_NAMES]]]){
    const el=document.getElementById(id);el.replaceChildren(...values.map((name,i)=>new Option(name,String(i))));
    el.onchange=()=>{const a=selected();if(!a)return;const value=values[Number(el.value)];
      if(id==='walkStyle')a.gait=Number(el.value);
      if(id==='idlePose'&&a.version==='v2'){a.setIdlePose(value);}
      if(id==='expression'&&a.version==='v2'){a.expressionOverride=value==='context'?null:value;if(value!=='context')a.setEmotion(value,.85,{source:'manual'});}
    };
  }
  const styleSelect=document.getElementById('hairStyle');styleSelect.replaceChildren(...HAIR_STYLES.map((name,i)=>new Option(name,String(i))));styleSelect.onchange=()=>{const a=selected();if(a?.version==='v2')a.hairStyle=Number(styleSelect.value);};
  const activity=document.getElementById('activity'),labels=['Lively idle','Stand','Walk','Squats','Overhead stretch','Jumping jacks','March','Side steps','Dance','Alternating reaches','Heel raises'];activity.replaceChildren(...ACTIVITY_MODES.map((m,i)=>new Option(labels[i],m)));activity.onchange=()=>{const a=selected();if(a?.version==='v2')a.setMode(activity.value);};
  const att=document.getElementById('attentionMode');if(att){att.replaceChildren(...ATTENTION_MODES.map(m=>new Option(ATTENTION_LABELS[m]||m,m)));att.onchange=()=>{const a=selected();if(a?.version==='v2')a.attentionMode=att.value;};}
  document.getElementById('faceSmile').onclick=()=>selected()?.playFaceReference?.('smile');
  document.getElementById('faceSurprise').onclick=()=>selected()?.playFaceReference?.('surprise');
  document.getElementById('testBalance').onclick=()=>selected()?.knockDown?.(new THREE.Vector3(.2,0,-1));
  document.getElementById('viewFace').onclick=()=>{frameActor(true);if(XR_ON()){applyXrFoveation(0);setXrStatus({ffr:0});}};
  document.getElementById('viewBody').onclick=()=>{frameActor(false);if(XR_ON()){const ffr=sessionFoveation();applyXrFoveation(ffr);setXrStatus({ffr});}};
  document.getElementById('grabBody').onclick=e=>{grabMode=!grabMode;e.target.textContent=grabMode?'GRAB BODY: ON':'GRAB BODY';orbit.enabled=!grabMode;};
  syncHud();
  for (const button of document.querySelectorAll("[data-mode]")) button.onclick = () => {
    const actor = selected(); if (!actor) return;
    const mode = button.dataset.mode;
    actor.autoWander = mode === "wander";
    actor.dest = null; actor.feet = {};
    actor.setMode(mode === "idle" ? "idle" : mode);
  };
  const personaEl = document.getElementById("persona");
  if (personaEl) {
    personaEl.value = DEFAULT_PERSONA;
    mira.persona = DEFAULT_PERSONA;
    personaEl.addEventListener("input", () => { if(selected())selected().personality=personaEl.value; });
  }
  let micHandle = null;
  let talking = false;
  const micBtn = document.getElementById("micBtn");
  const chatIn = document.getElementById("chatIn");
  const sayBtn = document.getElementById("sayBtn");
  const chatLog = document.getElementById("chatLog");
  const emoLab = document.getElementById("emoLab");
  function addChat(who, text) {
    if (!chatLog) return;
    const line = document.createElement("div");
    line.style.margin = "0 0 6px";
    line.innerHTML = "<b style='color:#7eb6ff'>" + who + "</b> " + String(text || "").replace(/</g, "");
    chatLog.appendChild(line);
    while (chatLog.childNodes.length > 8) chatLog.removeChild(chatLog.firstChild);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  async function converse(text) {
    if (!text || talking) return;
    talking = true;
    banner("heard: " + text);
    addChat("you", text);
    const cam = camera;
    cam.getWorldPosition(_fwd);
    const actor = mira.nearestTo(_fwd, 2.6) || mira.selected;
    if (actor) {
      actor.setMode("talk");
      actor.lookAtPos = _fwd.clone();
      actor.talkT = 0.2;
    }
    try {
      const r = await miraChat(text, actor?.personality || DEFAULT_PERSONA, {conversationId:actor?.group.uuid});
      if (emoLab) emoLab.textContent = (r.emotion || "happy").toUpperCase();
      banner(r.text || "");
      document.getElementById("conversationStatus").textContent=r.source==="local fallback"?"Local replies · chat server unavailable":"Conversation connected";
      addChat("mira", r.text || "");
      if (actor) { actor.beginSpeech(r.text, r.emotion); actor.setEmotion?.(r.emotion,r.intensity??.7,{hold:12,source:r.source||"reply",valence:r.valence,arousal:r.arousal}); }
      await new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          if (actor) {
            actor.endSpeech();
            if (r.mode) { actor.setMode(r.mode); actor.autoWander=r.mode==="wander"; }
          }
          resolve();
        };
        miraSpeak(r.text, {voice:actor?.bodyType==='male'?'am_adam':document.getElementById('ttsVoice').value,onStatus:text=>document.getElementById('ttsStatus').textContent=text,
          onStart(dur) { if (actor) actor.setSpeechDuration(dur); },
          onAmp(amp, t, dur) { if (actor) actor.setSpeechAmp(amp, t, dur); },
          onEnd: done,
          onError(message){mira.voiceStatus=message;banner(message);},
        }).catch(done);
        setTimeout(done,240000);
      });
    } catch (e) {
      banner("voice: " + (e && e.message ? e.message : e));
      if (actor) actor.endSpeech();
    }
    talking = false;
  }
  async function onHeard(text) { await converse(text); }
  if (sayBtn && chatIn) {
    const send = () => {
      unlockVoice();const t = chatIn.value.trim();
      if (!t) return;
      chatIn.value = "";
      converse(t);
    };
    sayBtn.onclick = send;
    chatIn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }
  function enableVoice(){unlockVoice();if(micHandle)return;
      micBtn.textContent='STARTING VOICE';
      startVoiceInput();
    }
    function startVoiceInput(){

      const handle=startMic(onHeard,{
        isSpeaking:()=>talking,
        onLevel:level=>{const meter=document.getElementById('micLevel');if(meter)meter.value=level;},
        onStatus:({state,message})=>{
          mira.voiceStatus=message;
          const label=document.getElementById('micStatus');if(label)label.textContent=message;
          micBtn.textContent=state==='error'?'RETRY VOICE':state==='off'?'VOICE OFF':state==='starting'?'STARTING VOICE':'VOICE ON';
          if(state==='off'||state==='error'){micHandle=null;if(state==='error')banner(message);}
        }
      });
      if(micBtn.textContent!=='RETRY VOICE')micHandle=handle;
    }
  micBtn.onclick=()=>{if(micHandle){micHandle.stop();micHandle=null;}else enableVoice();};
  voiceSessionStart=()=>{enableVoice();setTimeout(async()=>{if(!XR_ON()||talking)return;const actor=selected();if(!actor)return;talking=true;const text="Hi! I'm "+(actor.displayName||"Mira")+". It's good to see you. What would you like to do today?";actor.beginSpeech(text,'happy');addChat('mira',text);let finished=false;const done=()=>{if(finished)return;finished=true;actor.endSpeech();talking=false;};miraSpeak(text,{voice:actor?.bodyType==='male'?'am_adam':document.getElementById('ttsVoice').value,onStatus:text=>document.getElementById('ttsStatus').textContent=text,onStart:d=>actor.setSpeechDuration(d),onAmp:(v,t,d)=>actor.setSpeechAmp(v,t,d),onEnd:done,onError:banner}).catch(done);setTimeout(done,240000);},1800);};
  voiceSessionEnd=()=>{micHandle?.stop();micHandle=null;};
  syncLabs();if(XR_ON())voiceSessionStart();
}

const locomotion = new SmoothLocomotion(rig,camera,world);
function tickLocomotion(dt) {
 if(XR_ON())locomotion.tick(dt,renderer.xr.getSession()?.inputSources||[],vrMenu.isOpen||props.driving());
}

function desktopMove(dt) {
  if(props.driving())return;
  if (XR_ON()) return;
  if (!controls || !controls.isLocked) return;
  const obj=controls.getObject?.()||camera;
  if(water?.playerSwimIntent({rig:obj,camera,dt,keys,blocked:vrMenu.isOpen||props.vehicle?.driving}).active)return;
  const sp = (keys.ShiftLeft ? 2.8 : 1.4) * dt;
  if (keys.KeyW) controls.moveForward(sp);
  if (keys.KeyS) controls.moveForward(-sp);
  if (keys.KeyA) controls.moveRight(-sp);
  if (keys.KeyD) controls.moveRight(sp);
  if(!water?.playerSubmerged(camera))obj.position.y=1.6+(world.floorHeight?.(obj.position)||0);
}

const clock = new THREE.Clock();
let fpsFrames = 0, fpsLast = performance.now();
function tick(time,frame) {
 if (XR_ON() && frame) {
   const pose=frame.getViewerPose(renderer.xr.getReferenceSpace());
   if(pose){camera.position.copy(pose.transform.position);camera.quaternion.copy(pose.transform.orientation);camera.updateWorldMatrix(true,false);}
 }
 roomLight.tick(frame);
  const rawDt = clock.getDelta();
  if (rawDt > 0.12 && mira.ready) { mira.resetPhysics(false); props.resetMotion(); }
  const dt = Math.min(rawDt, 0.05);
  desktopMove(dt);
  if(!XR_ON()&&orbit.enabled)orbit.update();
  vrMenu.tick();
  if(builder.active){if(XR_ON()){builder.tick(renderer.xr.getSession());builder.preview(props.ray(builder.controller));}else{if(controls?.isLocked)pickRay.setFromCamera(new THREE.Vector2(),camera);builder.preview(pickRay.ray);}}
  const buildStatus=document.getElementById('buildStatus');if(buildStatus)buildStatus.textContent=builder.status;
  tickLocomotion(dt);
  if(XR_ON()&&!props.driving()){const eye=camera.getWorldPosition(new THREE.Vector3()),before=eye.clone();world.project(eye,.18,.10,1.5);eye.x=THREE.MathUtils.clamp(eye.x,-world.extent,world.extent);eye.z=THREE.MathUtils.clamp(eye.z,-world.extent,world.extent);rig.position.add(eye.sub(before));}
  if (mira.ready) {
    ensureYardPond();
    if(water)for(const a of mira.actors)water.stepActor(a,dt);
    mira.tick(dt, clock.elapsedTime, keys);
    water?.tick(dt);
    props.tick(dt);
    flora?.tick(dt);
    dogs.tick(dt);
  }
  const propStatus=document.getElementById("propStatus");if(propStatus&&propStatus.textContent!==props.status)propStatus.textContent=props.status;
  const ls=document.getElementById('linkSelect'),stamp=props.restraints.links.map(l=>l.id+':'+l.broken).join('/');if(ls.dataset.stamp!==stamp){ls.replaceChildren(new Option('Select link',''),...props.restraints.links.map(l=>new Option('Link '+l.id+(l.broken?' · cut':''),l.id)));ls.dataset.stamp=stamp;}ls.value=props.restraints.selected?.id||'';if(document.activeElement?.id!=='linkLength'&&document.activeElement?.id!=='rpRange')document.getElementById('linkLength').value=props.restraints.selected?.length||1;document.getElementById('linkStatus').textContent=props.restraints.status;
  document.getElementById('carStatus').textContent=activeCar().status;
  fpsFrames++;
  const now = performance.now();
  if (statsEl && now - fpsLast > 400) {
    const fps = (fpsFrames * 1000) / (now - fpsLast);
    fpsFrames = 0;
    fpsLast = now;
    statsEl.textContent = `MIRA  ${fps.toFixed(0)} fps  ·  ${mira.actors.length} actors  ·  ${renderer.info.render.calls} calls`+(XR_ON()&&xrStatus?`  ·  ${xrStatus}`:'');
    const a=selected();document.getElementById("emoLab").textContent=a?.emotion?`${a.emotion.name.toUpperCase()} · ${a.balance.state}`:"V1";
  }
  activeCar().renderMirror();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);

let sharpMode=false, xrStatus='', xrHud={mode:'',scale:0.9,ffr:0.35,hz:null};
function xrQuality(){const v=Number(document.getElementById("quality")?.value);return Number.isFinite(v)?v:0.9;}
function sessionFoveation(){const scale=xrQuality();if(sharpMode||scale>=1.15)return 0;if(scale<=.8)return .65;return .35;}
function applyXrFoveation(value){if(typeof renderer.xr.setFoveation==="function")renderer.xr.setFoveation(value);const slider=document.getElementById("foveation");if(slider&&document.activeElement!==slider)slider.value=String(value);}
function setXrStatus(patch={}){Object.assign(xrHud,patch);if(!xrHud.mode){xrStatus='';return;}const hz=xrHud.hz==null?'—':xrHud.hz;xrStatus=`XR ${xrHud.mode}  scale ${Number(xrHud.scale).toFixed(2)}  ffr ${xrHud.ffr}  hz ${hz}`;if(hintEl)hintEl.textContent=xrStatus;}

async function enterXr(opts={}) {
  if (!navigator.xr) { banner("WebXR not available — use Quest Browser or Desktop look"); return; }
  const sharp=!!opts.sharp, wantAr=!!opts.ar, arFirst=!!opts.arFirst||wantAr;
  sharpMode=sharp;
  try {
    unlockVoice();unlockSfx();
    const xrDetail=xrQuality();
    renderer.xr.setFramebufferScaleFactor(xrDetail);
    renderer.shadowMap.enabled=xrDetail>=.85;
    renderer.xr.setReferenceSpaceType("local-floor");
    try{const grant=await navigator.mediaDevices.getUserMedia({audio:true});grant.getTracks().forEach(t=>t.stop());}catch(e){console.warn('mic preflight',e);}
    const req=(mode,optional)=>navigator.xr.requestSession(mode,{requiredFeatures:["local-floor"],optionalFeatures:optional});
    let session=null, passthrough=false;
    if(sharp){
      session=await req("immersive-vr",["microphone"]);
    }else{
      try{
        session=await req("immersive-ar",["light-estimation","microphone"]);
        passthrough=true;
      }catch(arErr){
        if(!arFirst&&wantAr)throw arErr;
        session=await req("immersive-vr",["microphone"]);
      }
    }
    if (controls && controls.isLocked) controls.unlock();
    orbit.enabled=false;
    rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
    await renderer.xr.setSession(session);if(passthrough)roomLight.start(session);
    voiceSessionStart();world.root.visible=!passthrough;floor.visible=passthrough;
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    const ffr=sessionFoveation();
    applyXrFoveation(ffr);
    mira.resetPhysics();
    if (ui) ui.style.display = "none";
    session.addEventListener("end", () => {
      sharpMode=false;xrHud.mode='';setXrStatus();
      for(const c of props.cars())if(c.driving)c.exit();voiceSessionEnd();world.root.visible=true;floor.visible=false;
      rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
      scene.background = new THREE.Color(world.name==='Beach'?0xaedced:world.name==='Jungle'?0x637f76:0xc2b5a3);
      renderer.setClearColor(0x6b5e52, 1);
      floor.material.opacity = 1; floor.material.transparent = false;
      if (ui) ui.style.display = "flex";
      mira.resetPhysics();
      camera.position.set(0, 1.45, 2.6);
      camera.lookAt(0, 0.95, 0);
      orbit.enabled=true;orbit.target.set(0,1.02,0);orbit.update();
    });
    scene.background = passthrough?null:new THREE.Color(world.name==='Beach'?0xaedced:world.name==='Jungle'?0x637f76:0xc2b5a3);
    renderer.setClearColor(passthrough ? 0x000000 : 0x6b5e52, passthrough ? 0 : 1);
    floor.material.opacity = passthrough ? 0.12 : 1;
    floor.material.transparent = passthrough;
    let hz=null;
    try {
      const rates=session.supportedFrameRates||[];
      const pick=[90,80,72].find(r=>rates.includes(r));
      if(pick){try{await session.updateTargetFrameRate(pick);hz=pick;}catch(err){console.warn("framerate",err);}}
    } catch (err) { console.warn("framerate", err); }
    xrHud={mode:sharp?'VR-SHARP':(passthrough?'AR':'VR'),scale:xrDetail,ffr,hz};
    setXrStatus(xrHud);
  } catch (e) { sharpMode=false; banner(String(e.message || e)); }
}

addEventListener("blur", () => { for (const k of Object.keys(keys)) keys[k] = false; });
addEventListener("keydown", (e) => { if (e.code === "Escape" && ui && !XR_ON()) ui.style.display = "flex"; });
document.addEventListener("visibilitychange", () => { if (mira.ready) mira.resetPhysics(); });
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Attach controls independently of asset loading.
bindHud();

// Desktop uses the same construction settings and validation as the Y panel.
const buildControls={buildKind:['Wall','Floor','Ceiling','Furniture'],buildSize:[1,2,3],buildSurface:Object.keys(SURFACES),buildFurniture:FURNITURE};
for(const [id,values] of Object.entries(buildControls)){const e=document.getElementById(id);e.replaceChildren(...values.map(v=>new Option(id==='buildSize'?v+'×'+v:String(v),String(v))));}
document.getElementById('buildKind').onchange=e=>{builder.setKind(e.target.value);document.getElementById('buildHeight').value=builder.height;document.getElementById('buildHeight').disabled=['Floor','Furniture'].includes(builder.kind);};
document.getElementById('buildSize').onchange=e=>builder.size=Number(e.target.value);
document.getElementById('buildSurface').onchange=e=>builder.surface=e.target.value;
document.getElementById('buildFurniture').onchange=e=>builder.furniture=e.target.value;
document.getElementById('buildHeight').onchange=e=>{builder.height=Math.round(THREE.MathUtils.clamp(Number(e.target.value)||0,0,6)/.6)*.6;e.target.value=builder.height;};
document.getElementById('buildRotate').onclick=()=>{builder.yaw=(builder.yaw+Math.PI/2)%(Math.PI*2);document.getElementById('buildRotate').textContent='ROTATE '+Math.round(builder.yaw*180/Math.PI)+'°';};
document.getElementById('buildStart').onclick=()=>builder.start();document.getElementById('buildStop').onclick=()=>builder.stop();document.getElementById('buildUndo').onclick=()=>builder.undo();

for(const [id,kind] of [['eyeDetail','eyes'],['hairDetail','hair']])document.getElementById(id).onchange=e=>{selected()?.setVisualDetail?.(kind,e.target.value);syncHud();};
