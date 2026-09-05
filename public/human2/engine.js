import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createMiraSystem, SLIDERS, FACE_TYPES, HAIR_COLORS } from "./mira-core.js?v=12";
import { DEFAULT_PERSONA, miraChat, miraSpeak, startMic } from "./mira-voice.js?v=12";

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

const renderer = new THREE.WebGLRenderer({ antialias: !QUEST, alpha: false, powerPreference: "high-performance" });
const XR_ON = () => renderer.xr.isPresenting;
renderer.setPixelRatio(Math.min(devicePixelRatio, QUEST ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.96;
renderer.xr.enabled = true;
if (QUEST) renderer.xr.setFramebufferScaleFactor(0.85);
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
scene.add(new THREE.HemisphereLight(0xfff3e4, 0x3a3028, 0.72));
const key = new THREE.DirectionalLight(0xfff0d8, 0.95);
key.position.set(1.4, 3.2, 2.8);
scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.28));
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;
} catch (e) { console.warn("env", e); }

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(8, 48),
  new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

let controls = null;
try { controls = new PointerLockControls(camera, renderer.domElement); } catch (e) { banner("look: " + e.message); }
const keys = {};
addEventListener("keydown", (e) => { keys[e.code] = true; });
addEventListener("keyup", (e) => { keys[e.code] = false; });
document.getElementById("desk").onclick = () => {
  if (ui) ui.style.display = "none";
  try { controls && controls.lock(); } catch (e) { banner(String(e.message || e)); }
};
document.getElementById("enter").onclick = enterXr;
addEventListener("mousedown", () => { keys.Mouse0 = true; });
addEventListener("mouseup", () => { keys.Mouse0 = false; });

const mira = createMiraSystem({ scene, renderer, camera, xrOn: XR_ON, rig });
banner("LOADING PASS 2…");
mira.load(
  (x) => { if (x.total && loadEl) loadEl.textContent = "LOADING  " + Math.round((x.loaded / x.total) * 100) + "%"; },
  () => {
    if (loadEl) loadEl.remove();
    banner("HUMAN 2 · left stick move · Y spawn ball · grab noodle, Mira, or ball");
    bindHud();
  },
  (e) => { banner("LOAD FAILED — " + (e && e.message ? e.message : "glb")); console.error(e); }
);

function selected() { return mira.selected; }

function bindHud() {
  for (const s of SLIDERS) {
    const el = document.getElementById("s_" + s.key);
    if (!el) continue;
    el.addEventListener("input", () => {
      const a = selected();
      if (a) a.shape[s.key] = parseFloat(el.value);
    });
  }
  const syncLabs = () => {
    const a = selected();
    if (!a) return;
    if (faceLab) faceLab.textContent = FACE_TYPES[a.faceType].name;
    if (hairLab) hairLab.textContent = HAIR_COLORS[a.hairColor].name;
  };
  document.getElementById("facePrev").onclick = () => {
    const a = selected();
    if (!a) return;
    a.faceType = (a.faceType + FACE_TYPES.length - 1) % FACE_TYPES.length;
    a.applyLooks();
    syncLabs();
  };
  document.getElementById("faceNext").onclick = () => {
    const a = selected();
    if (!a) return;
    a.faceType = (a.faceType + 1) % FACE_TYPES.length;
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
  document.getElementById("spawnMira").onclick = () => {
    const src = selected();
    const shape = src ? { ...src.shape } : {};
    const n = mira.actors.length;
    try {
      mira.spawn({
        shape,
        faceType: src ? src.faceType : (n % FACE_TYPES.length),
        hairColor: (src ? src.hairColor + 1 : n) % HAIR_COLORS.length,
        gait: n % 4,
        position: new THREE.Vector3(n * 0.95, 0, 0),
      });
    } catch (e) {
      banner("spawn failed: " + (e && e.message ? e.message : e));
      console.error(e);
      return;
    }
    syncLabs();
    banner("Spawned Mira " + mira.actors.length + " — sliders edit the newest.");
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
  async function onHeard(text) {
    if (!text || talking) return;
    talking = true;
    banner("heard: " + text);
    const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    cam.getWorldPosition(_fwd);
    const actor = mira.nearestTo(_fwd, 2.6) || mira.selected;
    if (actor) {
      actor.setMode("talk");
      actor.lookAtPos = _fwd.clone();
      actor.talkT = 0.2;
    }
    try {
      const r = await miraChat(text, personaEl ? personaEl.value : DEFAULT_PERSONA);
      if (actor && r.mode) actor.setMode(r.mode);
      banner(r.text || "");
      await miraSpeak(r.text);
    } catch (e) {
      banner("voice: " + (e && e.message ? e.message : e));
    }
    talking = false;
  }
  if (micBtn) {
    micBtn.onclick = async () => {
      if (micHandle) {
        try { if (micHandle.stop) micHandle.stop(); else if (micHandle.abort) micHandle.abort(); } catch (_) {}
        micHandle = null;
        micBtn.textContent = "VOICE OFF";
        banner("Voice off");
        return;
      }
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        banner("Mic permission failed — allow microphone for Quest voice");
        return;
      }
      micHandle = startMic(onHeard);
      micBtn.textContent = "VOICE ON";
      banner("Voice on — speak near Mira");
    };
  }
  syncLabs();
}

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
function stickAxes(gp) {
  if (!gp || !gp.axes) return null;
  const a = gp.axes;
  if (a.length >= 4 && (Math.abs(a[2]) > 0.02 || Math.abs(a[3]) > 0.02)) return { x: a[2], y: a[3] };
  if (a.length >= 2) return { x: a[0], y: a[1] };
  return null;
}
function tickLocomotion(dt) {
  if (!XR_ON()) return;
  const session = renderer.xr.getSession();
  if (!session) return;
  const cam = renderer.xr.getCamera();
  cam.getWorldDirection(_fwd);
  _fwd.y = 0;
  if (_fwd.lengthSq() < 1e-6) return;
  _fwd.normalize();
  _right.set(_fwd.z, 0, -_fwd.x);
  const speed = 2.35;
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
      rig.rotation.y -= sx * turn * dt;
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
  const dt = Math.min(clock.getDelta(), 0.05);
  desktopMove(dt);
  tickLocomotion(dt);
  if (mira.ready) mira.tick(dt, clock.elapsedTime, keys);
  fpsFrames++;
  const now = performance.now();
  if (statsEl && now - fpsLast > 400) {
    const fps = (fpsFrames * 1000) / (now - fpsLast);
    fpsFrames = 0;
    fpsLast = now;
    statsEl.textContent = `HUMAN 2  ${fps.toFixed(0)} fps  mira ${mira.actors.length}`;
  }
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);

async function enterXr() {
  if (!navigator.xr) { banner("WebXR not available — use Quest Browser or Desktop look"); return; }
  try {
    if (QUEST) renderer.xr.setFramebufferScaleFactor(0.85);
    let session;
    try {
      session = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["local-floor"], optionalFeatures: ["hand-tracking"] });
    } catch {
      session = await navigator.xr.requestSession("immersive-vr", { requiredFeatures: ["local-floor"], optionalFeatures: ["hand-tracking"] });
    }
    await renderer.xr.setSession(session);
    renderer.xr.setReferenceSpaceType("local-floor");
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    if (typeof renderer.xr.setFoveation === "function") renderer.xr.setFoveation(0.55);
    if (ui) ui.style.display = "none";
    session.addEventListener("end", () => {
      camera.position.set(0, 1.45, 2.6);
      camera.lookAt(0, 0.95, 0);
    });
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    floor.material.opacity = 0.12;
    floor.material.transparent = true;
    try {
      const rates = session.supportedFrameRates;
      if (rates && rates.includes(72)) await session.updateTargetFrameRate(72);
    } catch (err) { console.warn("framerate", err); }
  } catch (e) { banner(String(e.message || e)); }
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
