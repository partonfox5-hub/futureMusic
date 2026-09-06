import {Car} from './mira-v2-car.js?v=h3.3';
import {Restraints} from './mira-v2-restraints.js?v=h3.3';
import {Injuries} from './mira-v2-injuries.js?v=h3.3';
import {Props,WEAPONS} from './mira-v2-props.js?v=h3.3';
import {RoomLight} from './mira-v2-light.js?v=h3.3';
import {draft,saveDraft,spawnOptions,OUTFITS,clothingItems} from './mira-v2-catalog.js?v=h3.3';
import {MiraWorld,SCENES} from './mira-v2-world.js?v=h3.3';
import {Wardrobe,GARMENTS} from './mira-v2-wardrobe.js?v=h3.3';
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createVRMenu } from "./mira-vr-menu.js?v=h3.3";
import { EMOTION_NAMES, IDLE_NAMES, WALK_NAMES } from "./mira-v2-features.js?v=h3.3";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createMiraSystem, SLIDERS, FACE_TYPES, HAIR_COLORS } from "./mira-v2.js?v=h3.3";
import { DEFAULT_PERSONA, miraChat, miraSpeak, startMic, unlockVoice } from "./mira-voice-v2.js?v=h3.3";

import {V2_EXTRA_SLIDERS,FACE_PRESETS,HAIR_STYLES,ACTIVITY_MODES,shapeSliders} from './mira-v2-controls.js?v=h3.3';

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

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
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
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 80);
camera.position.set(0, 1.45, 2.6);
camera.lookAt(0, 0.95, 0);
rig.add(camera);
scene.add(new THREE.HemisphereLight(0xf5f8ff, 0x82766d, 0.72));
const key = new THREE.DirectionalLight(0xfff4ee, 1.65);
key.position.set(1.4, 3.2, 2.8);
key.castShadow=true;key.shadow.mapSize.set(QUEST?1024:2048,QUEST?1024:2048);
key.shadow.camera.left=-2.5;key.shadow.camera.right=2.5;key.shadow.camera.top=2.7;key.shadow.camera.bottom=-1.0;
key.shadow.camera.near=.1;key.shadow.camera.far=9;key.shadow.bias=-.0001;key.shadow.normalBias=.010;
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
document.getElementById("desk").onclick = () => { if(ui)ui.style.display="none"; orbit.enabled=true; };
document.getElementById("firstPerson").onclick=()=>{orbit.enabled=false;if(ui)ui.style.display="none";controls?.lock();};
controls?.addEventListener('unlock',()=>{orbit.enabled=true;});
document.getElementById("enter").onclick = ()=>enterXr(false);
document.getElementById("enterAR").onclick=()=>enterXr(true);


const mira = createMiraSystem({ scene, renderer, camera, xrOn: XR_ON, rig });
const world=new MiraWorld(scene,mira);mira.setEnvironment(world);floor.visible=false;const wardrobe=new Wardrobe(scene,mira,mira.contacts,world);mira.setWardrobe(wardrobe);
const props=new Props({scene,system:mira,world,wardrobe,camera,renderer,rig});world.interactions=props;props.restraints=new Restraints(props);props.injuries=new Injuries(props);props.vehicle=new Car(props,{orbit,keys,controls});
const roomLight=new RoomLight(scene,renderer,rig);
let voiceSessionStart=()=>{},voiceSessionEnd=()=>{};
banner("LOADING HUMAN 3…");
mira.load(
  (x) => { if (x.total && loadEl) loadEl.textContent = "LOADING  " + Math.round((x.loaded / x.total) * 100) + "%"; },
  () => {
    if (loadEl) loadEl.remove();
    banner("Drag to orbit · wheel to zoom · Grab body or Shift-drag · VR: left stick move, right stick turn, A jump, Y menu");
    syncHud();document.dispatchEvent(new Event("mira:ready"));
    if (new URLSearchParams(location.search).has("debug")) window.human3 = { mira, scene, renderer, camera, rig, keys, orbit, world, wardrobe, props };
  },
  (e) => { banner("LOAD FAILED — " + (e && e.message ? e.message : "glb")); console.error(e); }
);

let grabMode=false, desktopGrab=null;
const virtualGrip=new THREE.Object3D();scene.add(virtualGrip);
const pickRay=new THREE.Raycaster(),mouse=new THREE.Vector2(),dragPlane=new THREE.Plane();
function pointerRay(e){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);pickRay.setFromCamera(mouse,camera);}
renderer.domElement.addEventListener('pointerdown',e=>{
 if(XR_ON()||(!grabMode&&!e.shiftKey)||e.button!==0)return;
 pointerRay(e);const meshes=[];
 for(const a of mira.actors)a.root.traverse(o=>{if(o.isSkinnedMesh&&!/hair|eyes|teeth/.test(o.name)){o.computeBoundingSphere();meshes.push(o);}});
 const hit=pickRay.intersectObjects(meshes,false)[0];if(!hit)return;
 const a=mira.actors.find(a=>{let o=hit.object;while(o){if(o===a.root)return true;o=o.parent;}return false;});
 if(!a)return;const region=a.nearestHit(hit.point,.13);if(!region)return;
 virtualGrip.position.copy(hit.point);a.beginGrab(virtualGrip,region,hit.point);desktopGrab=a;mira.select(a);syncHud();
 dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.point);
 orbit.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);e.stopImmediatePropagation();e.preventDefault();
},true);
renderer.domElement.addEventListener('pointermove',e=>{if(!desktopGrab)return;pointerRay(e);const p=pickRay.ray.intersectPlane(dragPlane,new THREE.Vector3());if(p)virtualGrip.position.copy(p);});
function releaseDesktop(){if(desktopGrab)desktopGrab.endGrab(virtualGrip);desktopGrab=null;orbit.enabled=!grabMode&&!XR_ON();}
renderer.domElement.addEventListener('pointerup',releaseDesktop);renderer.domElement.addEventListener('pointercancel',releaseDesktop);addEventListener('blur',releaseDesktop);
// A click commands movement; a drag remains orbit, and Shift-drag remains grab.
let groundClick=null;
renderer.domElement.addEventListener('pointerdown',e=>{groundClick=!XR_ON()&&!grabMode&&!e.shiftKey&&e.button===0?{x:e.clientX,y:e.clientY,id:e.pointerId,t:performance.now()}:null;});
renderer.domElement.addEventListener('pointerup',e=>{const c=groundClick;groundClick=null;if(!c||c.id!==e.pointerId||Math.hypot(c.x-e.clientX,c.y-e.clientY)>5||performance.now()-c.t>650)return;pointerRay(e);const result=mira.pointCommand(pickRay.ray);if(result)syncHud();});
renderer.domElement.addEventListener('pointercancel',()=>groundClick=null);
renderer.domElement.addEventListener('pointerdown',e=>{if(XR_ON()||e.shiftKey||grabMode||e.button!==0)return;pointerRay(e);if(props.desktop(pickRay.ray)){groundClick=null;e.preventDefault();e.stopImmediatePropagation();}},true);
document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='KeyQ')props.drop('desktop');if(e.code==='KeyE'){props.vehicle.driving?props.vehicle.exit():props.vehicle.enter();}});
const clothHandle=new THREE.Object3D();let clothPointer=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(XR_ON()||e.shiftKey||grabMode||e.button!==0)return;pointerRay(e);if(wardrobe.begin(pickRay.ray,clothHandle,'desktop')){clothPointer=e.pointerId;orbit.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();}},true);
renderer.domElement.addEventListener('pointermove',e=>{if(clothPointer!==e.pointerId)return;pointerRay(e);wardrobe.move('desktop',pickRay.ray);});
renderer.domElement.addEventListener('pointerup',e=>{if(clothPointer!==e.pointerId)return;pointerRay(e);wardrobe.end('desktop',pickRay.ray);clothPointer=null;orbit.enabled=true;groundClick=null;e.stopImmediatePropagation();},true);
renderer.domElement.addEventListener('pointercancel',()=>{wardrobe.cancel('desktop');clothPointer=null;orbit.enabled=true;});
function spawnVersion(version){
 const a=selected(),n=mira.actors.length;try{const p=new THREE.Vector3(n===0?0:(n%2?-.8:.8),0,0);
  mira.spawn({version,position:p,shape:a?{...a.shape}:undefined,faceType:version==='v2'?(a?.version==='v2'?a.faceType:1):a?.faceType||0,hairColor:a?.hairColor||0,hairStyle:a?.hairStyle||0});syncHud();
 }catch(e){banner(e.message);}
}
function frameActor(face){const a=selected();if(!a)return;const c=a.group.position.clone();c.y+=(face?1.5:1.0)*a.shape.height;orbit.target.copy(c);camera.position.copy(c).add(new THREE.Vector3(0,face?.015:.18,face?.53:2.6));camera.lookAt(c);orbit.update();}
function syncHud(){
 const a=selected(),el=document.getElementById('actorSelect');el.replaceChildren();mira.actors.forEach((a,i)=>el.add(new Option(`${a.displayName||'Mira'} ${i+1} · ${a.version.toUpperCase()}`,String(i))));el.value=String(mira.actors.indexOf(a));
 if(!a)return;document.getElementById('persona').value=a.personality||DEFAULT_PERSONA;document.getElementById('wearBtn').disabled=a.version!=='v2';for(const s of shapeSliders(SLIDERS,a)){const input=document.getElementById('s_'+s.key);if(input){input.min=s.min;input.max=s.max;input.value=a.shape[s.key]??s.value;}}for(const s of V2_EXTRA_SLIDERS){const input=document.getElementById('s_'+s.key);if(input)input.disabled=a.version!=='v2';}
 faceLab.textContent=a.version==='v2'?(FACE_PRESETS[a.faceType]?.name||'Natural'):FACE_TYPES[a.faceType].name;hairLab.textContent=HAIR_COLORS[a.hairColor].name;
 for(const id of ['idlePose','expression','testBalance','faceSmile','faceSurprise'])document.getElementById(id).disabled=a.version!=='v2';
 document.getElementById('hairStyle').disabled=a.version!=='v2';document.getElementById('hairStyle').value=String(a.hairStyle||0);document.getElementById('activity').disabled=a.version!=='v2';document.getElementById('activity').value=a.autonomy?'auto':a.mode;
 document.getElementById('walkStyle').value=String(a.gait);
 document.getElementById('idlePose').value=String(['auto',...IDLE_NAMES].indexOf(a.idleChoice||'auto'));
 document.getElementById('expression').value=String(['context',...EMOTION_NAMES].indexOf(a.expressionOverride||'context'));
}
function copyConfiguration(){const a=selected();if(!a)return;Object.assign(draft,{bodyType:a.bodyType||'female',faceType:a.faceType,hairStyle:a.hairStyle||0,hairColor:a.hairColor,shape:{...a.shape}});saveDraft();dispatchEvent(new Event('mira:draft'));}
function spawnConfigured(){if(!mira.ready)return;const n=mira.actors.length,p=new THREE.Vector3(n%2?-.8:.8,0,0),a=mira.spawn(spawnOptions(p));for(const id of clothingItems())wardrobe.equip(a,GARMENTS.find(g=>g.id===id));syncHud();}
const vrMenu=createVRMenu({spawnConfigured,copyConfiguration,scene,renderer,camera,system:mira,spawn:spawnVersion,onSync:syncHud,world,wardrobe,props});props.menu=vrMenu;

function selected() { return mira.selected; }

function bindHud() {
 document.getElementById('enterCar').onclick=()=>props.vehicle.enter();document.getElementById('exitCar').onclick=()=>props.vehicle.exit();document.getElementById('repairCar').onclick=()=>props.vehicle.reset();document.getElementById('mirrorOn').onchange=e=>props.vehicle.mirrorEnabled=e.target.checked;

 document.getElementById('placeLink').onclick=()=>props.restraints.start();document.getElementById('cancelLink').onclick=()=>props.restraints.cancel();document.getElementById('linkMode').onchange=e=>props.restraints.mode=e.target.value;document.getElementById('linkSelect').onchange=e=>props.restraints.selected=props.restraints.links.find(l=>l.id===Number(e.target.value));document.getElementById('linkLength').oninput=e=>props.restraints.setLength(e.target.value);document.getElementById('linkStrength').oninput=e=>props.restraints.setStrength(e.target.value);document.getElementById('cutLink').onclick=()=>props.restraints.cut();document.getElementById('removeLink').onclick=()=>props.restraints.remove();document.getElementById('injuryEnabled').onchange=e=>props.injuries.enabled=e.target.checked;document.getElementById('allowSever').onchange=e=>props.injuries.allowSever=e.target.checked;document.getElementById('healActor').onclick=()=>props.injuries.heal(selected());

 const weaponSelect=document.getElementById('weaponSelect');weaponSelect.replaceChildren(...Object.entries(WEAPONS).map(([id,w])=>new Option(w.name,id)));document.getElementById('equipWeapon').onclick=()=>props.equip(weaponSelect.value);document.getElementById('dropWeapon').onclick=()=>props.drop('desktop');document.getElementById('resetHouse').onclick=()=>world.setScene('Living room');
 document.getElementById("spawnNpc").onclick=spawnConfigured;document.getElementById("copyNpc").onclick=copyConfiguration;document.getElementById("foveation").oninput=e=>renderer.xr.setFoveation(Number(e.target.value));document.getElementById("hapticGain").oninput=e=>mira.hands.haptics.gain=Number(e.target.value);
 const sceneSelect=document.getElementById('sceneSelect');sceneSelect.replaceChildren(...SCENES.map(x=>new Option(x,x)));sceneSelect.value=world.name;sceneSelect.onchange=()=>{world.setScene(sceneSelect.value);world.obstacle(-3.3,2.4,1.3,.6,0,2);};
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
  document.getElementById('faceSmile').onclick=()=>selected()?.playFaceReference?.('smile');
  document.getElementById('faceSurprise').onclick=()=>selected()?.playFaceReference?.('surprise');
  document.getElementById('testBalance').onclick=()=>selected()?.knockDown?.(new THREE.Vector3(.2,0,-1));
  document.getElementById('viewFace').onclick=()=>frameActor(true);
  document.getElementById('viewBody').onclick=()=>frameActor(false);
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
  let painSpeakId=0;
  mira.painSpeech=(actor,text)=>{
    const id=++painSpeakId;
    addChat(actor?.displayName||'mira', text);
    const voice=actor?.bodyType==='male'?'am_adam':(document.getElementById('ttsVoice')?.value||'af_heart');
    unlockVoice();
    miraSpeak(text,{
      voice,
      onStatus:msg=>{const el=document.getElementById('ttsStatus');if(el)el.textContent=msg;},
      onStart(d){if(id===painSpeakId)actor.setSpeechDuration(d);},
      onAmp(amp,t,d){if(id===painSpeakId)actor.setSpeechAmp(amp,t,d);},
      onEnd(){if(id===painSpeakId)actor.endSpeech();},
      onError(){if(id===painSpeakId)actor.endSpeech();},
    }).catch(()=>{if(id===painSpeakId)actor.endSpeech();});
  };
  async function converse(text) {
    if (!text || talking) return;
    talking = true;
    banner("heard: " + text);
    addChat("you", text);
    const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
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

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _turnOffset = new THREE.Vector3(), _turnedOffset = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const _locQ = new THREE.Quaternion();
let locVx = 0, locVz = 0, locVy = 0, locYaw = 0, jumpHeld = false;
function stickAxes(gp) {
  if (!gp?.axes) return { x: 0, y: 0 };
  const a = gp.axes;
  if (a.length >= 4) return { x: a[2] || 0, y: a[3] || 0 };
  if (a.length >= 2) return { x: a[0] || 0, y: a[1] || 0 };
  return { x: 0, y: 0 };
}
function analog2(x, y, dead = 0.08) {
  const m = Math.hypot(x, y);
  if (m < dead) return { x: 0, y: 0 };
  const n = Math.min(1, (m - dead) / (1 - dead));
  const g = n * n * (3 - 2 * n);
  const s = g / m;
  return { x: x * s, y: y * s };
}
function analog1(x, dead = 0.08) {
  const ax = Math.abs(x);
  if (ax < dead) return 0;
  const n = Math.min(1, (ax - dead) / (1 - dead));
  return Math.sign(x) * n * n * (3 - 2 * n);
}
function applyYaw(angle) {
  if (!angle) return;
  const cam = renderer.xr.getCamera();
  cam.getWorldPosition(_turnOffset).sub(rig.position);
  _turnedOffset.copy(_turnOffset).applyAxisAngle(_up, angle);
  rig.position.add(_turnOffset).sub(_turnedOffset);
  rig.rotation.y += angle;
}
function resetLocomotion() {
  locVx = 0; locVz = 0; locVy = 0; locYaw = 0; jumpHeld = false;
  if (rig.position.y) rig.position.y = 0;
}
function tickLocomotion(dt) {
  if (!XR_ON()) { resetLocomotion(); return; }
  const driving = !!props.vehicle.driving;
  const blocked = driving || vrMenu.isOpen;
  const session = renderer.xr.getSession();
  let mx = 0, mz = 0, yaw = 0, wantJump = false;
  if (session && !blocked) {
    const cam = renderer.xr.getCamera();
    _fwd.set(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(_locQ));
    _fwd.y = 0;
    if (_fwd.lengthSq() > 1e-6) {
      _fwd.normalize();
      _right.set(-_fwd.z, 0, _fwd.x);
    } else {
      _fwd.set(0, 0, -1);
      _right.set(1, 0, 0);
    }
    let idx = 0, sawRight = false, aDown = false;
    for (const src of session.inputSources) {
      idx += 1;
      if (src.hand || !src.gamepad) continue;
      const hand = src.handedness || "";
      const isRight = hand === "right" || (hand !== "left" && idx === 2);
      const st = stickAxes(src.gamepad);
      if (!isRight) {
        const a = analog2(st.x, st.y);
        mx += a.x;
        mz += a.y;
      } else {
        sawRight = true;
        yaw += analog1(st.x);
        aDown = !!(src.gamepad.buttons?.[4]?.pressed);
      }
    }
    if (sawRight) {
      if (aDown && !jumpHeld) wantJump = true;
      jumpHeld = aDown;
    } else {
      jumpHeld = false;
    }
  }
  const grounded = rig.position.y <= 0.012;
  const speed = grounded ? 1.7 : 1.15;
  const targetVx = blocked ? 0 : (_fwd.x * -mz + _right.x * mx) * speed;
  const targetVz = blocked ? 0 : (_fwd.z * -mz + _right.z * mx) * speed;
  const targetYaw = blocked ? 0 : -yaw * 2.45;
  const blendMove = 1 - Math.exp(-dt * (grounded ? 10 : 6));
  const blendYaw = 1 - Math.exp(-dt * 12);
  locVx += (targetVx - locVx) * blendMove;
  locVz += (targetVz - locVz) * blendMove;
  locYaw += (targetYaw - locYaw) * blendYaw;
  if (wantJump && grounded && !blocked) locVy = 4.55;
  locVy -= 15 * dt;
  rig.position.x += locVx * dt;
  rig.position.z += locVz * dt;
  rig.position.y += locVy * dt;
  if (rig.position.y <= 0) {
    rig.position.y = 0;
    locVy = 0;
  }
  applyYaw(locYaw * dt);
}

function desktopMove(dt) {
  if(props.vehicle.driving)return;
  if (XR_ON()) return;
  if (!controls || !controls.isLocked) return;
  const sp = (keys.ShiftLeft ? 2.4 : 1.4) * dt;
  if (keys.KeyW) controls.moveForward(sp);
  if (keys.KeyS) controls.moveForward(-sp);
  if (keys.KeyA) controls.moveRight(-sp);
  if (keys.KeyD) controls.moveRight(sp);
}

const clock = new THREE.Clock();
let fpsFrames = 0, fpsLast = performance.now();
function tick(time,frame) {
 roomLight.tick(frame);
  const rawDt = clock.getDelta();
  if (rawDt > 0.12 && mira.ready) mira.resetPhysics();
  const dt = Math.min(rawDt, 0.05);
  desktopMove(dt);
  if(!XR_ON()&&orbit.enabled)orbit.update();
  vrMenu.tick();
  tickLocomotion(dt);
  if(XR_ON()&&!props.vehicle.driving){const eye=renderer.xr.getCamera().getWorldPosition(new THREE.Vector3()),before=eye.clone();world.project(eye,.18,rig.position.y,1.6,dt);rig.position.add(eye.sub(before));}
  if (mira.ready) {mira.tick(dt, clock.elapsedTime, keys);props.tick(dt);}
  const propStatus=document.getElementById("propStatus");if(propStatus&&propStatus.textContent!==props.status)propStatus.textContent=props.status;
  const ls=document.getElementById('linkSelect'),stamp=props.restraints.links.map(l=>l.id+':'+l.broken).join('/');if(ls.dataset.stamp!==stamp){ls.replaceChildren(new Option('Select link',''),...props.restraints.links.map(l=>new Option('Link '+l.id+(l.broken?' · cut':''),l.id)));ls.dataset.stamp=stamp;}ls.value=props.restraints.selected?.id||'';if(document.activeElement?.id!=='linkLength')document.getElementById('linkLength').value=props.restraints.selected?.length||1;if(document.activeElement?.id!=='linkStrength')document.getElementById('linkStrength').value=props.restraints.selected?.strength||30;document.getElementById('linkStatus').textContent=props.restraints.status;
  document.getElementById('carStatus').textContent=props.vehicle.driving?Math.round(props.vehicle.velocity.length()*3.6)+' km/h · '+props.vehicle.status:props.vehicle.status;
  fpsFrames++;
  const now = performance.now();
  if (statsEl && now - fpsLast > 400) {
    const fps = (fpsFrames * 1000) / (now - fpsLast);
    fpsFrames = 0;
    fpsLast = now;
    statsEl.textContent = `MIRA  ${fps.toFixed(0)} fps  ·  ${mira.actors.length} actors  ·  ${renderer.info.render.calls} calls`;
    const a=selected();document.getElementById("emoLab").textContent=a?.emotion?`${a.emotion.name.toUpperCase()} · ${a.balance.state}`:"V1";
  }
  props.vehicle.renderMirror();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);

async function enterXr(passthroughMode=false) {
  if (!navigator.xr) { banner("WebXR not available — use Quest Browser or Desktop look"); return; }
  try {
    unlockVoice();
    const xrDetail = Number(document.getElementById("quality").value) || 0.9;
    renderer.xr.setFramebufferScaleFactor(xrDetail);
    renderer.shadowMap.enabled=xrDetail>=.85;
    let session, passthrough = passthroughMode;
    renderer.xr.setReferenceSpaceType("local-floor");
    session = await navigator.xr.requestSession(passthrough?"immersive-ar":"immersive-vr", { requiredFeatures: ["local-floor"], optionalFeatures: passthrough?["light-estimation"]:[] });
    if (controls && controls.isLocked) controls.unlock();
    orbit.enabled=false;
    rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
    resetLocomotion();
    await renderer.xr.setSession(session);if(passthrough)roomLight.start(session);
    voiceSessionStart();world.root.visible=!passthrough;floor.visible=passthrough;
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    if (typeof renderer.xr.setFoveation === "function") renderer.xr.setFoveation(Number(document.getElementById("foveation").value));
    mira.resetPhysics();
    if (ui) ui.style.display = "none";
    session.addEventListener("end", () => {
      props.vehicle.exit();voiceSessionEnd();world.root.visible=true;floor.visible=false;
      resetLocomotion();
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
    try {
      const rates = session.supportedFrameRates;
      const desired=Number(document.getElementById("xrRate").value)||72;if(rates&&rates.includes(desired))await session.updateTargetFrameRate(desired);
    } catch (err) { console.warn("framerate", err); }
  } catch (e) { banner(String(e.message || e)); }
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
