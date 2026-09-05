import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { audioReady, rallyTone, laserTone } from "./audio.js";
import {
  PETS, ofSpecies, customGene, spawnPet, spawnFood, spawnPortal,
  applyHat, rallyPets, strokePet, shootRay, pets,
} from "./critters.js";
import { createWorldMenu, geneFromState, fillDomHud } from "./menu.js";
import { createKernel } from "./kernel.js";
import { createMiraGameSystem, FACE_TYPES, HAIR_COLORS } from "./systems/mira-sys.js";
import { createCritterGameSystem } from "./systems/critter-sys.js";

const QUEST = /OculusBrowser|Quest/i.test(navigator.userAgent);
const loadEl = document.getElementById("load");
const hintEl = document.getElementById("hint");
const ui = document.getElementById("ui");
const statsEl = document.getElementById("stats");
const hudEl = document.getElementById("hud");

function banner(msg) {
  if (loadEl) loadEl.textContent = msg;
  if (hintEl) hintEl.textContent = msg;
}

const renderer = new THREE.WebGLRenderer({ antialias: !QUEST, alpha: true, powerPreference: "high-performance" });
const XR_ON = () => renderer.xr.isPresenting;
renderer.setPixelRatio(Math.min(devicePixelRatio, QUEST ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.xr.enabled = true;
if (QUEST) renderer.xr.setFramebufferScaleFactor(0.85);
renderer.setClearColor(0x6b5e52, 1);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6b5e52);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 80);
camera.position.set(0, 1.45, 2.8);
camera.lookAt(0, 0.9, 0);
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xfff3e4, 0x3a3028, 0.8));
const key = new THREE.DirectionalLight(0xfff0d8, 1.35);
key.position.set(1.4, 3.2, 2.8);
scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.32));
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
} catch (e) { console.warn("env", e); }

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(10, 48),
  new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.92, transparent: true, opacity: 0.55 })
);
floor.rotation.x = -Math.PI / 2;
floor.name = "ground";
scene.add(floor);
const floorHit = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 24),
  new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
);
floorHit.rotation.x = -Math.PI / 2;
floorHit.position.y = 0.001;
scene.add(floorHit);

let controls = null;
try { controls = new PointerLockControls(camera, renderer.domElement); } catch (e) { banner("look: " + e.message); }
const keys = {};
addEventListener("keydown", (e) => { keys[e.code] = true; });
addEventListener("keyup", (e) => { keys[e.code] = false; });
document.getElementById("desk").onclick = () => {
  if (ui) ui.style.display = "none";
  if (hudEl) hudEl.style.display = "block";
  try { controls && controls.lock(); } catch (e) { banner(String(e.message || e)); }
  startMic();
  audioReady();
};
document.getElementById("enter").onclick = enterXr;

const world = {
  scene, renderer, camera, keys,
  xrOn: XR_ON,
  playerPos: new THREE.Vector3(),
  miraPos: new THREE.Vector3(),
  floorY: 0,
  onHitMira: null,
};
const kernel = createKernel(world);
const miraSys = createMiraGameSystem();
const critterSys = createCritterGameSystem();
kernel.use(miraSys).use(critterSys);

world.onHitMira = () => {
  const a = world.mira && world.mira.selected;
  if (a) { a.hitReact.exprT = 0.4; a.hitReact.flinchX += 0.18; }
};

banner("LOADING HUMANPLUS…");
miraSys.load(world, {
  onProgress: (x) => { if (x.total && loadEl) loadEl.textContent = "LOADING  " + Math.round((x.loaded / x.total) * 100) + "%"; },
  onDone: () => {
    if (loadEl) loadEl.remove();
    banner("HUMANPLUS · FOOD · BUILD · PORTAL · MIRA spawn · speak to rally");
    if (world.mira && world.mira.selected) world.mira.selected.group.position.set(-0.9, 0, -0.2);
  },
}).catch((e) => banner("LOAD FAILED — " + (e && e.message ? e.message : "glb")));

const worldMenu = createWorldMenu();
scene.add(worldMenu.group);
let menuOn = true;
function toggleMenu() {
  menuOn = !menuOn;
  worldMenu.group.visible = menuOn;
}

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.08, 0.11, 24),
  new THREE.MeshBasicMaterial({ color: 0xaa44ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
);
reticle.rotation.x = -Math.PI / 2;
reticle.position.y = 0.02;
scene.add(reticle);

const raycaster = new THREE.Raycaster();
const aimPoint = new THREE.Vector3(0, 0, -1.4);
const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _q = new THREE.Quaternion();
const handPrev = [new THREE.Vector3(), new THREE.Vector3()];
const handReady = [false, false];

function getCam() { return XR_ON() ? renderer.xr.getCamera() : camera; }
function getCtrl(i) { return world.mira && world.mira.hands ? world.mira.hands.ctrl[i] : null; }

function aimOnFloor(ctrl) {
  if (ctrl) {
    ctrl.updateMatrixWorld();
    _v.set(0, 0, 0).applyMatrix4(ctrl.matrixWorld);
    _fwd.set(0, 0, -1).transformDirection(ctrl.matrixWorld);
  } else {
    getCam().getWorldPosition(_v);
    getCam().getWorldDirection(_fwd);
  }
  raycaster.set(_v, _fwd);
  const hit = raycaster.intersectObject(floorHit, false)[0] || raycaster.intersectObject(floor, false)[0];
  if (hit) { aimPoint.copy(hit.point); aimPoint.y = 0.02; return aimPoint; }
  if (_fwd.y < -0.02) {
    const t = _v.y / Math.max(0.05, -_fwd.y);
    if (t > 0 && t < 12) { aimPoint.copy(_v).addScaledVector(_fwd, t); aimPoint.y = 0.02; return aimPoint; }
  }
  getCam().getWorldPosition(_v);
  getCam().getWorldDirection(_fwd);
  _fwd.y = 0; _fwd.normalize();
  aimPoint.copy(_v).addScaledVector(_fwd, 1.3);
  aimPoint.y = 0.02;
  return aimPoint;
}

function setHint(s) {
  worldMenu.state.hint = s;
  worldMenu.paint();
  refreshDom();
  banner(s);
}

function act(action) {
  if (!action) return;
  worldMenu.apply(action);
  if (action.type === "tab" || action.type === "cycle" || action.type === "legs-toggle") { refreshDom(); return; }
  if (action.type === "summon") {
    const g = ofSpecies(action.species);
    const p = PETS.find((x) => x.id === action.species);
    if (p) g.likes = p.likes;
    kernel.spawn("pet", { gene: g, species: action.species, position: aimOnFloor().clone() });
    setHint("Summoned " + g.name);
    return;
  }
  if (action.type === "summon-build") {
    const g = customGene(geneFromState(worldMenu.state));
    kernel.spawn("build", { parts: geneFromState(worldMenu.state), position: aimOnFloor().clone() });
    setHint("Built " + g.name + " is on the floor ahead.");
    return;
  }
  if (action.type === "food") {
    const p = aimOnFloor().clone();
    p.y = 0.55;
    kernel.spawn("food", { food: action.id, position: p });
    setHint(action.id + " dropped — bounces and sits on the floor.");
    return;
  }
  if (action.type === "portal") {
    kernel.spawn("portal", { position: aimOnFloor().clone() });
    setHint("Dark portal placed. Horde will crawl out.");
    return;
  }
  if (action.type === "hat") {
    kernel.spawn("hat", { id: action.id });
    setHint("Hat on nearest pet.");
    return;
  }
  if (action.type === "mira-face") {
    const a = world.mira && world.mira.selected;
    if (!a) return;
    a.faceType = (a.faceType + action.dir + FACE_TYPES.length) % FACE_TYPES.length;
    a.applyLooks();
    setHint("Face: " + FACE_TYPES[a.faceType].name);
    return;
  }
  if (action.type === "mira-hair") {
    const a = world.mira && world.mira.selected;
    if (!a) return;
    a.hairColor = (a.hairColor + action.dir + HAIR_COLORS.length) % HAIR_COLORS.length;
    a.applyLooks();
    setHint("Hair: " + HAIR_COLORS[a.hairColor].name);
    return;
  }
  if (action.type === "mira-spawn") {
    const src = world.mira && world.mira.selected;
    const n = world.mira ? world.mira.actors.length : 0;
    kernel.spawn("mira", {
      shape: src ? { ...src.shape } : {},
      faceType: src ? (src.faceType + 1) % FACE_TYPES.length : n % FACE_TYPES.length,
      hairColor: (src ? src.hairColor + 1 : n) % HAIR_COLORS.length,
      gait: n % 2,
      position: aimOnFloor().clone(),
    });
    setHint("Spawned Mira " + (n + 1) + " with distinct face/hair.");
  }
}

function refreshDom() {
  if (hudEl && hudEl.style.display !== "none") fillDomHud(hudEl, worldMenu.state, act, world.mira);
}
if (hudEl) { hudEl.style.display = "none"; fillDomHud(hudEl, worldMenu.state, act); }

function menuRay(ctrl) {
  if (!menuOn) return null;
  if (ctrl) {
    ctrl.updateMatrixWorld();
    _v.set(0, 0, 0).applyMatrix4(ctrl.matrixWorld);
    _fwd.set(0, 0, -1).transformDirection(ctrl.matrixWorld);
    raycaster.set(_v, _fwd);
  }
  const rec = raycaster.intersectObject(worldMenu.mesh, false);
  if (!rec.length || !rec[0].uv) return null;
  return worldMenu.pickUV(rec[0].uv);
}

function fireLaser(ctrl) {
  if (ctrl) {
    ctrl.updateMatrixWorld();
    _v.set(0, 0, 0).applyMatrix4(ctrl.matrixWorld);
    _fwd.set(0, 0, -1).transformDirection(ctrl.matrixWorld);
  } else {
    getCam().getWorldPosition(_v);
    getCam().getWorldDirection(_fwd);
  }
  laserTone();
  shootRay(_v.clone(), _fwd.clone().normalize(), scene);
}

function onSelect(ctrl) {
  audioReady();
  if (world.mira && world.mira.noodle) {
    ctrl.getWorldPosition(_v);
    if (world.mira.noodle.grabAt(_v)) return;
  }
  const action = menuRay(ctrl);
  if (action) { act(action); return; }
  fireLaser(ctrl);
}

function wireXrSelect() {
  const h = world.mira && world.mira.hands;
  if (!h) return;
  h.ctrl[0].addEventListener("selectstart", () => onSelect(h.ctrl[0]));
  h.ctrl[1].addEventListener("selectstart", () => onSelect(h.ctrl[1]));
  h.ctrl[0].addEventListener("squeezestart", () => toggleMenu());
  h.ctrl[1].addEventListener("squeezestart", () => toggleMenu());
}
const wireWait = setInterval(() => {
  if (world.mira && world.mira.hands) { wireXrSelect(); clearInterval(wireWait); }
}, 200);

function faceMenu() {
  if (!XR_ON()) { worldMenu.group.visible = false; return; }
  worldMenu.group.visible = menuOn;
  if (!menuOn) return;
  const cam = getCam();
  cam.getWorldPosition(_v);
  cam.getWorldQuaternion(_q);
  _fwd.set(0, 0, -1).applyQuaternion(_q);
  worldMenu.group.position.copy(_v).addScaledVector(_fwd, 1.05);
  worldMenu.group.position.y -= 0.08;
  worldMenu.group.lookAt(_v);
  worldMenu.group.rotateY(Math.PI);
}

let mic = null, analyser = null, micData = null, rallyCool = 0, voiceHigh = false;
async function startMic() {
  if (mic || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const ctx = audioReady();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    mic = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.4;
    mic.connect(analyser);
    micData = new Uint8Array(analyser.fftSize);
    setHint("Mic on — speak to rally pets.");
  } catch (e) {
    setHint("Mic blocked — allow microphone to voice-call pets.");
  }
}
function tickVoice(dt) {
  rallyCool = Math.max(0, rallyCool - dt);
  if (!analyser || !micData) return;
  analyser.getByteTimeDomainData(micData);
  let sum = 0;
  for (let i = 0; i < micData.length; i++) {
    const v = (micData[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / micData.length);
  const talking = rms > 0.09;
  if (talking && !voiceHigh && rallyCool <= 0) {
    getCam().getWorldPosition(world.playerPos);
    world.emit("rally", { origin: world.playerPos.clone(), radius: 0.95 });
    rallyPets(world.playerPos, 0.95);
    rallyTone();
    rallyCool = 2.6;
    setHint("Voice rally — pets coming to you.");
  }
  voiceHigh = talking;
}

function tickPetting(dt) {
  const h = world.mira && world.mira.hands;
  if (!h) return;
  for (let i = 0; i < 2; i++) {
    h.grip[i].getWorldPosition(_v);
    _v.y += 0.02;
    let vel = 0;
    if (handReady[i]) vel = _v.distanceTo(handPrev[i]) / Math.max(dt, 1 / 90);
    else handReady[i] = true;
    handPrev[i].copy(_v);
    strokePet(_v, vel, scene);
  }
}

function desktopMove(dt) {
  if (!controls || !controls.isLocked) return;
  const sp = (keys.ShiftLeft ? 2.4 : 1.4) * dt;
  if (keys.KeyW) controls.moveForward(sp);
  if (keys.KeyS) controls.moveForward(-sp);
  if (keys.KeyA) controls.moveRight(-sp);
  if (keys.KeyD) controls.moveRight(sp);
}

addEventListener("keydown", (e) => {
  if (e.code === "KeyM") toggleMenu();
  if (e.code === "KeyV") {
    getCam().getWorldPosition(world.playerPos);
    rallyPets(world.playerPos, 0.95);
    rallyTone();
    setHint("Rally (V) — pets coming.");
  }
});
addEventListener("mousedown", (e) => {
  keys.Mouse0 = true;
  if (e.button !== 0) return;
  if (controls && controls.isLocked) return;
  const mouse = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const action = menuRay(null);
  if (action) act(action);
});
addEventListener("mouseup", () => { keys.Mouse0 = false; });

const clock = new THREE.Clock();
let fpsFrames = 0, fpsLast = performance.now();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  world.time = clock.elapsedTime;
  desktopMove(dt);
  getCam().getWorldPosition(world.playerPos);
  if (world.mira && world.mira.selected) world.mira.selected.group.getWorldPosition(world.miraPos);
  aimOnFloor(XR_ON() ? getCtrl(0) : null);
  reticle.position.x = aimPoint.x;
  reticle.position.z = aimPoint.z;
  reticle.visible = ["PORTAL", "FOOD", "BUILD", "PETS", "MIRA"].includes(worldMenu.state.tab);
  kernel.tick(dt);
  tickPetting(dt);
  tickVoice(dt);
  faceMenu();
  fpsFrames++;
  const now = performance.now();
  if (statsEl && now - fpsLast > 400) {
    const fps = (fpsFrames * 1000) / (now - fpsLast);
    fpsFrames = 0;
    fpsLast = now;
    statsEl.textContent = `HUMANPLUS  ${fps.toFixed(0)} fps`;
  }
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);

async function enterXr() {
  if (!navigator.xr) { banner("WebXR not available — use Quest Browser or Desktop look"); return; }
  try {
    audioReady();
    if (QUEST) renderer.xr.setFramebufferScaleFactor(0.85);
    let session;
    try {
      session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["hand-tracking", "hit-test"],
      });
    } catch {
      session = await navigator.xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["hand-tracking"],
      });
    }
    await renderer.xr.setSession(session);
    renderer.xr.setReferenceSpaceType("local-floor");
    if (typeof renderer.xr.setFoveation === "function") renderer.xr.setFoveation(0.55);
    if (ui) ui.style.display = "none";
    if (hudEl) hudEl.style.display = "none";
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    floor.material.opacity = 0.14;
    menuOn = true;
    worldMenu.group.visible = true;
    startMic();
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
