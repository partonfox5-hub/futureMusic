import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createVRMenu } from "./mira-vr-menu.js?v=5";
import { EMOTION_NAMES, IDLE_NAMES, WALK_NAMES } from "./mira-v2-features.js?v=5";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createMiraSystem, SLIDERS, FACE_TYPES, HAIR_COLORS } from "./mira-v2.js?v=5";
import { DEFAULT_PERSONA, miraChat, miraSpeak, startMic } from "./mira-voice-v2.js?v=5";

import {V2_EXTRA_SLIDERS,FACE_PRESETS,HAIR_STYLES,ACTIVITY_MODES,shapeSliders} from './mira-v2-controls.js?v=5';

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
document.getElementById("enter").onclick = enterXr;


const mira = createMiraSystem({ scene, renderer, camera, xrOn: XR_ON, rig });
banner("LOADING HUMAN 2…");
mira.load(
  (x) => { if (x.total && loadEl) loadEl.textContent = "LOADING  " + Math.round((x.loaded / x.total) * 100) + "%"; },
  () => {
    if (loadEl) loadEl.remove();
    banner("Drag to orbit · wheel to zoom · Grab body or Shift-drag · VR: Y menu, right B ball");
    bindHud();
    if (new URLSearchParams(location.search).has("debug")) window.human2 = { mira, scene, renderer, camera, rig, keys, orbit };
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
function spawnVersion(version){
 const a=selected(),n=mira.actors.length;try{const p=new THREE.Vector3(n===0?0:(n%2?-.8:.8),0,0);
  mira.spawn({version,position:p,shape:a?{...a.shape}:undefined,faceType:version==='v2'?(a?.version==='v2'?a.faceType:1):a?.faceType||0,hairColor:a?.hairColor||0,hairStyle:a?.hairStyle||0});syncHud();
 }catch(e){banner(e.message);}
}
function frameActor(face){const a=selected();if(!a)return;const c=a.group.position.clone();c.y+=(face?1.5:1.0)*a.shape.height;orbit.target.copy(c);camera.position.copy(c).add(new THREE.Vector3(0,face?.015:.18,face?.53:2.6));camera.lookAt(c);orbit.update();}
function syncHud(){
 const a=selected(),el=document.getElementById('actorSelect');el.replaceChildren();mira.actors.forEach((a,i)=>el.add(new Option(`Mira ${i+1} · ${a.version.toUpperCase()}`,String(i))));el.value=String(mira.actors.indexOf(a));
 if(!a)return;for(const s of shapeSliders(SLIDERS,a)){const input=document.getElementById('s_'+s.key);if(input){input.min=s.min;input.max=s.max;input.value=a.shape[s.key]??s.value;}}for(const s of V2_EXTRA_SLIDERS){const input=document.getElementById('s_'+s.key);if(input)input.disabled=a.version!=='v2';}
 faceLab.textContent=a.version==='v2'?(FACE_PRESETS[a.faceType]?.name||'Natural'):FACE_TYPES[a.faceType].name;hairLab.textContent=HAIR_COLORS[a.hairColor].name;
 for(const id of ['idlePose','expression','testBalance','faceSmile','faceSurprise'])document.getElementById(id).disabled=a.version!=='v2';
 document.getElementById('hairStyle').disabled=a.version!=='v2';document.getElementById('hairStyle').value=String(a.hairStyle||0);document.getElementById('activity').disabled=a.version!=='v2';document.getElementById('activity').value=a.autonomy?'auto':a.mode;
 document.getElementById('walkStyle').value=String(a.gait);
 document.getElementById('idlePose').value=String(['auto',...IDLE_NAMES].indexOf(a.idleChoice||'auto'));
 document.getElementById('expression').value=String(['context',...EMOTION_NAMES].indexOf(a.expressionOverride||'context'));
}
const vrMenu=createVRMenu({scene,renderer,camera,system:mira,spawn:spawnVersion,onSync:syncHud});

function selected() { return mira.selected; }

function bindHud() {
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
    const el=document.getElementById(id);values.forEach((name,i)=>el.add(new Option(name,String(i))));
    el.onchange=()=>{const a=selected();if(!a)return;const value=values[Number(el.value)];
      if(id==='walkStyle')a.gait=Number(el.value);
      if(id==='idlePose'&&a.version==='v2'){a.idleChoice=value;a.idleT=0;}
      if(id==='expression'&&a.version==='v2'){a.expressionOverride=value==='context'?null:value;if(value!=='context')a.setEmotion(value,.85,{source:'manual'});}
    };
  }
  const styleSelect=document.getElementById('hairStyle');HAIR_STYLES.forEach((name,i)=>styleSelect.add(new Option(name,String(i))));styleSelect.onchange=()=>{const a=selected();if(a?.version==='v2')a.hairStyle=Number(styleSelect.value);};
  const activity=document.getElementById('activity'),labels=['Lively idle','Stand','Walk','Squats','Overhead stretch','Jumping jacks','March','Side steps','Dance','Alternating reaches','Heel raises'];ACTIVITY_MODES.forEach((m,i)=>activity.add(new Option(labels[i],m)));activity.onchange=()=>{const a=selected();if(a?.version==='v2')a.setMode(activity.value);};
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
    personaEl.addEventListener("input", () => { mira.persona = personaEl.value; });
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
    const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    cam.getWorldPosition(_fwd);
    const actor = mira.nearestTo(_fwd, 2.6) || mira.selected;
    if (actor) {
      actor.setMode("talk");
      actor.lookAtPos = _fwd.clone();
      actor.talkT = 0.2;
    }
    try {
      const r = await miraChat(text, personaEl ? personaEl.value : DEFAULT_PERSONA, {conversationId:actor?.group.uuid});
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
        miraSpeak(r.text, {
          onStart(dur) { if (actor) actor.setSpeechDuration(dur); },
          onAmp(amp, t, dur) { if (actor) actor.setSpeechAmp(amp, t, dur); },
          onEnd: done,
          onError(message){mira.voiceStatus=message;banner(message);},
        }).catch(done);
        setTimeout(done, Math.min(18000, 1600 + String(r.text || "").length * 85));
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
      const t = chatIn.value.trim();
      if (!t) return;
      chatIn.value = "";
      converse(t);
    };
    sayBtn.onclick = send;
    chatIn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }
  if (micBtn) {
    micBtn.onclick = () => {
      if(micHandle){micHandle.stop();micHandle=null;return;}
      micBtn.textContent='STARTING VOICE';
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
    };
  }
  syncLabs();
}

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _turnOffset = new THREE.Vector3(), _turnedOffset = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function stickAxes(gp) {
  if (!gp || !gp.axes) return null;
  const a = gp.axes;
  if (a.length >= 4 && (Math.abs(a[2]) > 0.02 || Math.abs(a[3]) > 0.02)) return { x: a[2], y: a[3] };
  if (a.length >= 2) return { x: a[0], y: a[1] };
  return null;
}
function tickLocomotion(dt) {
  if (!XR_ON() || vrMenu.isOpen) return;
  const session = renderer.xr.getSession();
  if (!session) return;
  const cam = renderer.xr.getCamera();
  cam.getWorldDirection(_fwd);
  _fwd.y = 0;
  if (_fwd.lengthSq() < 1e-6) return;
  _fwd.normalize();
  _right.set(-_fwd.z, 0, _fwd.x);
  const speed = 1.45;
  const turn = 2.15;
  let idx = 0;
  for (const src of session.inputSources) {
    const st = stickAxes(src.gamepad);
    idx += 1;
    if (!st) continue;
    let sx = st.x, sy = st.y;
    const hand = src.handedness || "";
    const isRight = hand === "right" || (hand !== "left" && idx === 2);
    if (!isRight) {
      if (Math.abs(sx) < 0.14) sx = 0;
      if (Math.abs(sy) < 0.14) sy = 0;
      rig.position.addScaledVector(_fwd, -sy * speed * dt);
      rig.position.addScaledVector(_right, sx * speed * dt);
    } else {
      if (Math.abs(sx) < 0.16) sx = 0;
      const angle = -sx * turn * dt;
      cam.getWorldPosition(_turnOffset).sub(rig.position);
      _turnedOffset.copy(_turnOffset).applyAxisAngle(_up, angle);
      rig.position.add(_turnOffset).sub(_turnedOffset);
      rig.rotation.y += angle;
    }
  }
}

function desktopMove(dt) {
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
function tick() {
  const rawDt = clock.getDelta();
  if (rawDt > 0.12 && mira.ready) mira.resetPhysics();
  const dt = Math.min(rawDt, 0.05);
  desktopMove(dt);
  if(!XR_ON()&&orbit.enabled)orbit.update();
  vrMenu.tick();
  tickLocomotion(dt);
  if (mira.ready) mira.tick(dt, clock.elapsedTime, keys);
  fpsFrames++;
  const now = performance.now();
  if (statsEl && now - fpsLast > 400) {
    const fps = (fpsFrames * 1000) / (now - fpsLast);
    fpsFrames = 0;
    fpsLast = now;
    statsEl.textContent = `MIRA  ${fps.toFixed(0)} fps  ·  ${mira.actors.length} actors  ·  ${renderer.info.render.calls} calls`;
    const a=selected();document.getElementById("emoLab").textContent=a?.emotion?`${a.emotion.name.toUpperCase()} · ${a.balance.state}`:"V1";
  }
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);

async function enterXr() {
  if (!navigator.xr) { banner("WebXR not available — use Quest Browser or Desktop look"); return; }
  try {
    const xrDetail = Number(document.getElementById("quality").value) || 0.9;
    renderer.xr.setFramebufferScaleFactor(xrDetail);
    renderer.shadowMap.enabled=xrDetail>=.85;
    let session, passthrough = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    try {
      session = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["local-floor"], optionalFeatures: [] });
    } catch {
      passthrough = false;
      session = await navigator.xr.requestSession("immersive-vr", { requiredFeatures: ["local-floor"], optionalFeatures: [] });
    }
    if (controls && controls.isLocked) controls.unlock();
    orbit.enabled=false;
    rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
    await renderer.xr.setSession(session);
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    if (typeof renderer.xr.setFoveation === "function") renderer.xr.setFoveation(xrDetail < 0.85 ? 0.65 : 0.35);
    mira.resetPhysics();
    if (ui) ui.style.display = "none";
    session.addEventListener("end", () => {
      rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
      scene.background = new THREE.Color(0x6b5e52);
      renderer.setClearColor(0x6b5e52, 1);
      floor.material.opacity = 1; floor.material.transparent = false;
      if (ui) ui.style.display = "flex";
      mira.resetPhysics();
      camera.position.set(0, 1.45, 2.6);
      camera.lookAt(0, 0.95, 0);
      orbit.enabled=true;orbit.target.set(0,1.02,0);orbit.update();
    });
    scene.background = passthrough ? null : new THREE.Color(0x6b5e52);
    renderer.setClearColor(passthrough ? 0x000000 : 0x6b5e52, passthrough ? 0 : 1);
    floor.material.opacity = passthrough ? 0.12 : 1;
    floor.material.transparent = passthrough;
    try {
      const rates = session.supportedFrameRates;
      if (rates && rates.includes(72)) await session.updateTargetFrameRate(72);
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
