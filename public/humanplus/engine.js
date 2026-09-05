import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "three/addons/webxr/XRHandModelFactory.js";
import { audioReady, rallyTone, laserTone } from "./audio.js";
import {
  PETS, pets, ofSpecies, customGene, spawnPet, spawnFood, spawnPortal,
  applyHat, rallyPets, strokePet, shootRay, tickWorld,
} from "./critters.js";
import { createWorldMenu, geneFromState, fillDomHud } from "./menu.js";

const ASSET = "/human2/assets/mira.glb?v=5";
const TEXROOT = "/human2/assets/tex/";
const MAP_FILE = {
  Std_Skin_Head: ["head.jpg", "head_n.jpg"],
  Std_Skin_Body: ["body.jpg", "body_n.jpg"],
  Std_Skin_Arm: ["arm.jpg", "arm_n.jpg"],
  Std_Skin_Leg: ["leg.jpg", "leg_n.jpg"],
  Std_Nails: ["nails.jpg", null],
  Std_Eye_L: ["eye_l.jpg", "eye_l_n.jpg"],
  Std_Eye_R: ["eye_r.jpg", "eye_r_n.jpg"],
  Std_Eyelash: ["lash.png", null],
  Default_Material_Transparency: ["hair.png", null],
};
const MORPH = [
  "Mouth_Smile_L", "Mouth_Smile_R", "Mouth_Frown_L", "Mouth_Frown_R",
  "Mouth_Dimple_L", "Mouth_Dimple_R", "Mouth_Stretch_L", "Mouth_Stretch_R",
  "Mouth_Pucker_Up_L", "Mouth_Pucker_Up_R", "Mouth_Funnel_Up_L", "Mouth_Funnel_Up_R",
  "Mouth_Press_L", "Mouth_Press_R", "Mouth_Shrug_Upper",
  "Eye_Blink_L", "Eye_Blink_R", "Eye_Wide_L", "Eye_Wide_R",
  "Eye_Squint_L", "Eye_Squint_R",
  "Eye_L_Look_L", "Eye_R_Look_L", "Eye_L_Look_R", "Eye_R_Look_R",
  "Eye_L_Look_Up", "Eye_R_Look_Up", "Eye_L_Look_Down", "Eye_R_Look_Down",
  "Jaw_Open", "Jaw_Forward", "V_Open", "V_Tight_O", "V_Wide", "V_Lip_Open",
  "Brow_Raise_Inner_L", "Brow_Raise_Inner_R", "Brow_Raise_Outer_L", "Brow_Raise_Outer_R",
  "Brow_Drop_L", "Brow_Drop_R", "Brow_Compress_L", "Brow_Compress_R",
  "Cheek_Raise_L", "Cheek_Raise_R", "Cheek_Puff_L", "Cheek_Puff_R",
  "Nose_Sneer_L", "Nose_Sneer_R",
];
const FINGER_ROWS = ["Index", "Mid", "Ring", "Pinky"];
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
renderer.toneMappingExposure = 1.12;
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

scene.add(new THREE.HemisphereLight(0xfff3e4, 0x3a3028, 0.85));
const key = new THREE.DirectionalLight(0xfff0d8, 1.5);
key.position.set(1.4, 3.2, 2.8);
scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
} catch (e) {
  console.warn("env", e);
}

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(10, 48),
  new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.92, transparent: true, opacity: 0.55 })
);
floor.rotation.x = -Math.PI / 2;
floor.name = "ground";
floor.receiveShadow = false;
scene.add(floor);
const floorHit = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 24),
  new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
);
floorHit.rotation.x = -Math.PI / 2;
floorHit.position.y = 0.001;
floorHit.name = "ground";
scene.add(floorHit);

const blob = new THREE.Mesh(
  new THREE.CircleGeometry(0.28, 24),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
);
blob.rotation.x = -Math.PI / 2;
blob.position.y = 0.012;
scene.add(blob);

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

const avatar = new THREE.Group();
avatar.position.set(-0.9, 0, -0.2);
scene.add(avatar);
let miraRoot = null;
let baseScale = 1;
const bones = {};
const bindQ = {};
const bindPos = {};
const bindS = {};
const extra = {};
let skeleton = null;
let ready = false;
let morphMeshes = [];
let walkT = 0;
let blinkT = 2;
let exprT = 4;
let blinkHold = 0;
const want = Object.fromEntries(MORPH.map((n) => [n, 0]));
const cur = { ...want };
const shape = { height: 1, waist: 1, breast: 1, butt: 1, thigh: 1, gap: 0 };

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _w2 = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const texLoader = new THREE.TextureLoader();
const texCache = {};

function loadMap(file, srgb) {
  if (!file) return null;
  if (texCache[file]) return texCache[file];
  const t = texLoader.load(TEXROOT + file + "?v=5", undefined, undefined, (err) => console.warn("tex fail", file, err));
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  t.flipY = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  texCache[file] = t;
  return t;
}
function isHairMat(m, o) {
  const n = ((m && m.name) || "") + " " + (o.name || "");
  return /transp|hair/i.test(n) && !/eyelash/i.test(n);
}
function isLashMat(m, o) {
  const n = ((m && m.name) || "") + " " + (o.name || "");
  return /eyelash/i.test(n);
}
function mapSpec(m, o) {
  const name = (m && m.name) || "";
  if (MAP_FILE[name]) return MAP_FILE[name];
  const n = name + " " + ((o && o.name) || "");
  if (/eyelash/i.test(n)) return MAP_FILE.Std_Eyelash;
  if (/transp|hair/i.test(n)) return MAP_FILE.Default_Material_Transparency;
  if (/Skin_Head/i.test(n)) return MAP_FILE.Std_Skin_Head;
  if (/Skin_Body/i.test(n)) return MAP_FILE.Std_Skin_Body;
  if (/Skin_Arm/i.test(n)) return MAP_FILE.Std_Skin_Arm;
  if (/Skin_Leg/i.test(n)) return MAP_FILE.Std_Skin_Leg;
  if (/Nails/i.test(n)) return MAP_FILE.Std_Nails;
  if (/Eye_L/i.test(n) && !/cornea/i.test(n)) return MAP_FILE.Std_Eye_L;
  if (/Eye_R/i.test(n) && !/cornea/i.test(n)) return MAP_FILE.Std_Eye_R;
  return null;
}
function applySkin(root) {
  const hairMeshes = [];
  root.traverse((o) => {
    if (o.isBone) {
      bones[o.name] = o;
      bindQ[o.name] = o.quaternion.clone();
      bindPos[o.name] = o.position.clone();
      bindS[o.name] = o.scale.clone();
    }
    if (o.isSkinnedMesh && o.skeleton && !skeleton) skeleton = o.skeleton;
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m && /cornea/i.test(m.name || ""))) o.visible = false;
    for (const m of mats) {
      if (!m) continue;
      const hair = isHairMat(m, o);
      const lash = isLashMat(m, o);
      const spec = mapSpec(m, o);
      if (spec) {
        m.map = loadMap(spec[0], true);
        if (spec[1]) {
          m.normalMap = loadMap(spec[1], false);
          m.normalScale.set(1.15, 1.15);
        }
      }
      if (m.map) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.flipY = false;
        m.map.anisotropy = 8;
        m.map.needsUpdate = true;
      }
      if (m.normalMap) {
        m.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
        m.normalMap.flipY = false;
        m.normalMap.needsUpdate = true;
      }
      m.metalness = 0;
      m.color.set(0xffffff);
      m.roughness = hair ? 0.38 : (lash ? 0.55 : (/eye/i.test(m.name || "") ? 0.18 : 0.48));
      m.side = hair || lash ? THREE.DoubleSide : THREE.FrontSide;
      m.transparent = false;
      m.depthWrite = true;
      m.alphaTest = 0;
      if (hair) m.alphaTest = QUEST ? 0.28 : 0.22;
      if (lash) m.alphaTest = 0.35;
      m.needsUpdate = true;
      if (hair) hairMeshes.push(o);
    }
    if (o.morphTargetDictionary) morphMeshes.push(o);
    o.frustumCulled = false;
  });
  const head = bones.Head;
  if (head) {
    for (const h of hairMeshes) {
      if (h.parent === head) continue;
      if (h.isSkinnedMesh) continue;
      head.attach(h);
    }
  }
}
function restoreBind() {
  for (const n in bindQ) {
    const b = bones[n];
    if (!b) continue;
    b.quaternion.copy(bindQ[n]);
    if (bindPos[n]) b.position.copy(bindPos[n]);
    if (bindS[n]) b.scale.copy(bindS[n]);
  }
  for (const k of Object.keys(extra)) delete extra[k];
}
function addE(name, x, y, z) {
  const e = extra[name] || (extra[name] = { x: 0, y: 0, z: 0 });
  e.x += x; e.y += y; e.z += z;
}
function applyExtras() {
  for (const n in extra) {
    const b = bones[n];
    const q0 = bindQ[n];
    if (!b || !q0) continue;
    const e = extra[n];
    _e.set(e.x, e.y, e.z, "XYZ");
    _q.setFromEuler(_e);
    b.quaternion.copy(q0).multiply(_q);
  }
}
function applyShape() {
  if (miraRoot) miraRoot.scale.setScalar(baseScale * shape.height);
  const sc = (n, x, y, z) => {
    const b = bones[n];
    if (!b || !bindS[n]) return;
    b.scale.set(bindS[n].x * x, bindS[n].y * y, bindS[n].z * z);
  };
  sc("Waist", shape.waist, 1, shape.waist);
  sc("Spine01", 0.85 + shape.waist * 0.15, 1, 0.85 + shape.waist * 0.15);
  sc("L_Breast", shape.breast, shape.breast, shape.breast);
  sc("R_Breast", shape.breast, shape.breast, shape.breast);
  sc("L_Glute", shape.butt, shape.butt, shape.butt);
  sc("R_Glute", shape.butt, shape.butt, shape.butt);
  sc("L_Thigh", shape.thigh, 1, shape.thigh);
  sc("R_Thigh", shape.thigh, 1, shape.thigh);
}
function tickMorphs(dt) {
  for (const n of MORPH) cur[n] = THREE.MathUtils.damp(cur[n], want[n], 9, dt);
  for (const mesh of morphMeshes) {
    const d = mesh.morphTargetDictionary;
    const inf = mesh.morphTargetInfluences;
    if (!d || !inf) continue;
    for (const n of MORPH) if (n in d) inf[d[n]] = cur[n];
  }
}
function clearWant() { for (const n of MORPH) want[n] = 0; }
function face(kind) {
  clearWant();
  if (kind === "happy") {
    want.Mouth_Smile_L = want.Mouth_Smile_R = 0.78;
    want.Cheek_Raise_L = want.Cheek_Raise_R = 0.45;
  } else if (kind === "frown") {
    want.Mouth_Frown_L = want.Mouth_Frown_R = 0.68;
    want.Brow_Drop_L = want.Brow_Drop_R = 0.4;
  } else if (kind === "surprise") {
    want.Brow_Raise_Inner_L = want.Brow_Raise_Inner_R = 0.5;
    want.Eye_Wide_L = want.Eye_Wide_R = 0.45;
    want.Jaw_Open = 0.18;
  }
}
function tickExpr(dt) {
  blinkT -= dt;
  if (blinkHold > 0) {
    blinkHold -= dt;
    want.Eye_Blink_L = want.Eye_Blink_R = 1;
    if (blinkHold <= 0) want.Eye_Blink_L = want.Eye_Blink_R = 0;
  } else if (blinkT <= 0) {
    blinkHold = 0.09;
    blinkT = 2.2 + Math.random() * 3.2;
  }
  if (hitReact.exprT > 0) { hitReact.exprT -= dt; return; }
  exprT -= dt;
  if (exprT <= 0) {
    exprT = 5 + Math.random() * 5;
    face(["neutral", "happy", "frown", "surprise"][(Math.random() * 4) | 0]);
  }
}
const soft = [
  { name: "L_Breast", x: 0, z: 0, vx: 0, vz: 0, stiff: 16, damp: 5.2, max: 0.42, grav: 0.64 },
  { name: "R_Breast", x: 0, z: 0, vx: 0, vz: 0, stiff: 16, damp: 5.2, max: 0.42, grav: 0.64 },
  { name: "L_Glute", x: 0, z: 0, vx: 0, vz: 0, stiff: 24, damp: 7.6, max: 0.26, grav: 0.3 },
  { name: "R_Glute", x: 0, z: 0, vx: 0, vz: 0, stiff: 24, damp: 7.6, max: 0.26, grav: 0.3 },
];
const prevHip = new THREE.Vector3();
let hipReady = false;
const hitReact = { lookYaw: 0, lookPitch: 0, lookT: 0, flinchX: 0, flinchY: 0, flinchZ: 0, headKickX: 0, headKickY: 0, exprT: 0, knockX: 0, knockZ: 0 };
const _nA = new THREE.Vector3();
const _nB = new THREE.Vector3();
const _nAB = new THREE.Vector3();
const _nQ = new THREE.Vector3();
const _nA0 = new THREE.Vector3();
const _nB0 = new THREE.Vector3();
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vHit = new THREE.Vector3();
const _vRel = new THREE.Vector3();
const _nrm = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _toHit = new THREE.Vector3();
let nEndsReady = false;
const hitCool = {};

function tickRest() {
  addE("L_Upperarm", 0, 0, -0.95);
  addE("R_Upperarm", 0, 0, 0.95);
  addE("L_Forearm", 0.22, 0, 0);
  addE("R_Forearm", 0.22, 0, 0);
}
function tickFingers(curl) {
  for (const side of ["L_", "R_"]) {
    for (const row of FINGER_ROWS) {
      addE(side + row + "1", curl * 0.42, 0, 0);
      addE(side + row + "2", curl * 0.7, 0, 0);
      addE(side + row + "3", curl * 0.55, 0, 0);
    }
    const tSign = side === "L_" ? 1 : -1;
    addE(side + "Thumb1", 0.2, curl * 0.35, 0.45 * tSign);
    addE(side + "Thumb2", curl * 0.45, 0, 0);
    addE(side + "Thumb3", curl * 0.35, 0, 0);
  }
}
function tickWalk(moving) {
  if (!moving) return;
  const t = walkT;
  const swing = Math.sin(t) * 0.38;
  addE("L_Thigh", swing, 0, 0);
  addE("R_Thigh", -swing, 0, 0);
  addE("L_Calf", -Math.max(0, Math.sin(t)) * 0.7, 0, 0);
  addE("R_Calf", -Math.max(0, -Math.sin(t)) * 0.7, 0, 0);
  addE("Hip", Math.sin(t * 2) * 0.015, Math.sin(t) * 0.03, 0);
}
function tickIdle(t) {
  addE("Hip", 0, Math.sin(t * 0.65) * 0.02, Math.sin(t * 0.5) * 0.015);
}
function tickSoft(dt, moving) {
  const hip = bones.Hip;
  if (hip) hip.getWorldPosition(_w);
  let ax = 0, az = 0;
  if (hip && hipReady) {
    ax = (_w.x - prevHip.x) / Math.max(dt, 1 / 120);
    az = (_w.z - prevHip.z) / Math.max(dt, 1 / 120);
  }
  if (hip) { prevHip.copy(_w); hipReady = true; }
  const drive = moving ? 1 : 0.4;
  const step = Math.min(dt, 1 / 60);
  for (const s of soft) {
    if (!bones[s.name] || !bindQ[s.name]) continue;
    const side = s.name.startsWith("R_") ? -1 : 1;
    s.vx += ((-ax * 0.11 * drive + Math.sin(walkT) * 0.7 * drive * side) - s.x * s.stiff - s.vx * s.damp) * step;
    s.vz += ((-az * 0.11 * drive + Math.cos(walkT * 2) * 0.38 * drive + s.grav) - s.z * s.stiff - s.vz * s.damp) * step;
    s.x = THREE.MathUtils.clamp(s.x + s.vx * step, -s.max, s.max);
    s.z = THREE.MathUtils.clamp(s.z + s.vz * step, -s.max * 0.65, s.max);
    addE(s.name, s.z, 0, s.x);
  }
}
function tickBreathe(t) {
  const b = Math.sin(t * 1.55) * 0.026;
  addE("Spine02", b, 0, 0);
}
function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function tickGaze(dt, moving) {
  const cam = XR_ON() ? renderer.xr.getCamera() : camera;
  cam.getWorldPosition(_v);
  const dx = _v.x - avatar.position.x;
  const dz = _v.z - avatar.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05 && hitReact.lookT <= 0) return;
  const yawWorld = Math.atan2(dx, dz);
  if (!moving && hitReact.lookT <= 0) avatar.rotation.y = THREE.MathUtils.damp(avatar.rotation.y, yawWorld, 3.2, dt);
  let yaw = THREE.MathUtils.clamp(wrapPi(yawWorld - avatar.rotation.y), -0.55, 0.55);
  let pitch = THREE.MathUtils.clamp((_v.y - 1.48) * 0.18, -0.22, 0.22);
  if (hitReact.lookT > 0) {
    const k = Math.min(1, hitReact.lookT * 2.4);
    yaw = THREE.MathUtils.lerp(yaw, hitReact.lookYaw, k);
    pitch = THREE.MathUtils.lerp(pitch, hitReact.lookPitch, k);
  }
  want.Eye_L_Look_L = want.Eye_R_Look_L = Math.max(0, -yaw) * 1.35;
  want.Eye_L_Look_R = want.Eye_R_Look_R = Math.max(0, yaw) * 1.35;
  addE("Head", pitch * 0.4 + hitReact.headKickX, yaw * 0.32 + hitReact.headKickY, 0);
  addE("NeckTwist02", pitch * 0.14, yaw * 0.12, 0);
}
const noodle = new THREE.Group();
noodle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 1.18, 18), new THREE.MeshStandardMaterial({ color: 0x3ec1f0, roughness: 0.62 })));
noodle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 18), new THREE.MeshStandardMaterial({ color: 0xffef7a }))).children[1].position.y = 0.55;
noodle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 18), new THREE.MeshStandardMaterial({ color: 0xffef7a }))).children[2].position.y = -0.55;
noodle.position.set(0.55, 0.9, 0.35);
scene.add(noodle);
const noodleVel = new THREE.Vector3();
let noodleHeld = null;
const NLEN = 1.18;
const NRAD = 0.04;

const ctrl0 = renderer.xr.getController(0);
const ctrl1 = renderer.xr.getController(1);
scene.add(ctrl0);
scene.add(ctrl1);
const grip0 = renderer.xr.getControllerGrip(0);
const grip1 = renderer.xr.getControllerGrip(1);
scene.add(grip0);
scene.add(grip1);
try {
  const cf = new XRControllerModelFactory();
  grip0.add(cf.createControllerModel(grip0));
  grip1.add(cf.createControllerModel(grip1));
} catch (e) { console.warn("ctrl model", e); }
try {
  const hf = new XRHandModelFactory();
  const h0 = renderer.xr.getHand(0);
  const h1 = renderer.xr.getHand(1);
  h0.add(hf.createHandModel(h0, "mesh"));
  h1.add(hf.createHandModel(h1, "mesh"));
  scene.add(h0);
  scene.add(h1);
} catch (e) { console.warn("hand model", e); }

function makeLaser() {
  const g = new THREE.Group();
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -8)]),
    new THREE.LineBasicMaterial({ color: 0xff4068, transparent: true, opacity: 0.55 })
  );
  g.add(line);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc0d0 }));
  dot.position.z = -1.2;
  g.add(dot);
  g.userData.dot = dot;
  return g;
}
const laser0 = makeLaser();
const laser1 = makeLaser();
ctrl0.add(laser0);
ctrl1.add(laser1);

function tryGrab(ctrl) {
  ctrl.getWorldPosition(_v);
  if (_v.distanceTo(noodle.position) < 0.38) noodleHeld = ctrl;
}
ctrl0.addEventListener("selectstart", () => onSelect(ctrl0));
ctrl1.addEventListener("selectstart", () => onSelect(ctrl1));
ctrl0.addEventListener("selectend", () => { if (noodleHeld === ctrl0) noodleHeld = null; });
ctrl1.addEventListener("selectend", () => { if (noodleHeld === ctrl1) noodleHeld = null; });
ctrl0.addEventListener("squeezestart", () => toggleMenu());
ctrl1.addEventListener("squeezestart", () => toggleMenu());

const BODY_HIT = [
  { name: "Head", rad: 0.13, kind: "head" },
  { name: "NeckTwist02", rad: 0.09, kind: "head" },
  { name: "Spine02", rad: 0.17, kind: "chest" },
  { name: "Spine01", rad: 0.15, kind: "belly" },
  { name: "L_Breast", rad: 0.135, kind: "breast" },
  { name: "R_Breast", rad: 0.135, kind: "breast" },
  { name: "Hip", rad: 0.16, kind: "hip" },
  { name: "L_Glute", rad: 0.13, kind: "glute" },
  { name: "R_Glute", rad: 0.13, kind: "glute" },
  { name: "L_Thigh", rad: 0.11, kind: "thigh" },
  { name: "R_Thigh", rad: 0.11, kind: "thigh" },
];
function sampleNoodle(p) {
  noodle.updateMatrixWorld();
  _nA.set(0, -NLEN * 0.5, 0).applyMatrix4(noodle.matrixWorld);
  _nB.set(0, NLEN * 0.5, 0).applyMatrix4(noodle.matrixWorld);
  _nAB.subVectors(_nB, _nA);
  const ab2 = _nAB.lengthSq() || 1e-8;
  _w2.subVectors(p, _nA);
  const t = THREE.MathUtils.clamp(_w2.dot(_nAB) / ab2, 0, 1);
  _nQ.copy(_nA).addScaledVector(_nAB, t);
  return t;
}
function noodleVelAt(t, invDt) {
  _vA.subVectors(_nA, _nA0).multiplyScalar(invDt);
  _vB.subVectors(_nB, _nB0).multiplyScalar(invDt);
  _vHit.copy(_vA).lerp(_vB, t);
  return _vHit;
}
function applyStrike(hit, nrm, closing, glance, pos) {
  const mag = Math.min(5.2, closing * 1.05 + glance * 0.35);
  if (mag < 0.12) return;
  const now = performance.now();
  if ((hitCool[hit.name] || 0) > now - 55) return;
  hitCool[hit.name] = now;
  const jx = nrm.x * mag * 2.8;
  const jz = nrm.z * mag * 2.8;
  for (const s of soft) {
    let wgt = 0;
    if (s.name === hit.name) wgt = 1;
    else if (hit.kind === "chest" && s.name.includes("Breast")) wgt = 0.9;
    else if (hit.kind === "breast" && s.name.includes("Breast")) wgt = s.name[0] === hit.name[0] ? 1 : 0.48;
    else if (hit.kind === "hip" && s.name.includes("Glute")) wgt = 0.78;
    else if (hit.kind === "glute" && s.name.includes("Glute")) wgt = s.name[0] === hit.name[0] ? 1 : 0.42;
    if (wgt > 0) { s.vx += jx * wgt; s.vz += jz * wgt; }
  }
  _toHit.copy(pos).sub(avatar.position);
  let lookYaw = wrapPi(Math.atan2(_toHit.x, _toHit.z) - avatar.rotation.y);
  if (hit.kind === "head" && mag > 0.85) lookYaw = -lookYaw * 0.45;
  hitReact.lookYaw = THREE.MathUtils.clamp(lookYaw * Math.min(1.1, mag * 0.75), -0.75, 0.75);
  hitReact.lookPitch = THREE.MathUtils.clamp(-nrm.y * mag * 0.28, -0.4, 0.32);
  hitReact.lookT = 0.5 + Math.min(0.9, mag * 0.28);
  hitReact.flinchX += THREE.MathUtils.clamp(-nrm.z * mag * 0.16, -0.38, 0.38);
  hitReact.knockX += nrm.x * mag * 0.11;
  hitReact.knockZ += nrm.z * mag * 0.11;
  if (mag > 0.7) { hitReact.exprT = 0.42; face("surprise"); }
}
function tickHitReact(dt) {
  const decay = Math.exp(-dt * 6.2);
  hitReact.flinchX *= decay; hitReact.flinchY *= decay; hitReact.flinchZ *= decay;
  hitReact.headKickX *= decay; hitReact.headKickY *= decay;
  hitReact.lookT = Math.max(0, hitReact.lookT - dt);
  addE("Spine02", hitReact.flinchX, hitReact.flinchY * 0.55, hitReact.flinchZ);
  avatar.position.x += hitReact.knockX * dt;
  avatar.position.z += hitReact.knockZ * dt;
  const kd = Math.exp(-dt * 5.4);
  hitReact.knockX *= kd; hitReact.knockZ *= kd;
}
function tickNoodle(dt) {
  const holdingKey = keys.KeyF || keys.Mouse0;
  if (!XR_ON() && holdingKey && controls && controls.isLocked) {
    camera.getWorldPosition(_v);
    camera.getWorldDirection(_w);
    noodle.position.copy(_v).addScaledVector(_w, 0.85);
    noodle.quaternion.copy(camera.quaternion);
    noodle.rotateX(-Math.PI * 0.5);
    noodleHeld = "desk";
  } else if (noodleHeld && noodleHeld !== "desk") {
    noodleHeld.getWorldPosition(_v);
    noodleHeld.getWorldQuaternion(_q);
    noodle.position.copy(_v);
    noodle.quaternion.copy(_q);
    noodle.rotateX(-Math.PI * 0.5);
  } else {
    if (noodleHeld === "desk" && !holdingKey) noodleHeld = null;
    noodleVel.y -= 6.5 * dt;
    noodle.position.addScaledVector(noodleVel, dt);
    if (noodle.position.y < NLEN * 0.5) {
      noodle.position.y = NLEN * 0.5;
      noodleVel.y *= -0.25;
      noodleVel.x *= 0.7;
      noodleVel.z *= 0.7;
    }
  }
  noodle.updateMatrixWorld();
  _nA.set(0, -NLEN * 0.5, 0).applyMatrix4(noodle.matrixWorld);
  _nB.set(0, NLEN * 0.5, 0).applyMatrix4(noodle.matrixWorld);
  const invDt = 1 / Math.max(dt, 1 / 120);
  if (!nEndsReady) { _nA0.copy(_nA); _nB0.copy(_nB); nEndsReady = true; return; }
  _vA.subVectors(_nA, _nA0).multiplyScalar(invDt);
  _vB.subVectors(_nB, _nB0).multiplyScalar(invDt);
  noodleVel.copy(_vA).add(_vB).multiplyScalar(0.5);
  if (ready) {
    for (const hit of BODY_HIT) {
      const bone = bones[hit.name];
      if (!bone) continue;
      bone.getWorldPosition(_w);
      const t = sampleNoodle(_w);
      const d = _w.distanceTo(_nQ);
      const min = hit.rad + NRAD;
      if (d >= min || d < 1e-5) continue;
      _nrm.subVectors(_w, _nQ).multiplyScalar(1 / d);
      const push = min - d;
      noodleVelAt(t, invDt);
      _vRel.copy(_vHit);
      const closing = -_vRel.dot(_nrm);
      _tan.copy(_vRel).addScaledVector(_nrm, closing);
      if (!noodleHeld) {
        noodle.position.addScaledVector(_nrm, -push * 0.85);
        noodleVel.addScaledVector(_nrm, -Math.max(closing, 0) * 0.55 - push * 6);
      }
      if (closing > 0.28 || (noodleHeld && closing > 0.18)) {
        applyStrike(hit, _nrm, Math.max(closing, push * 8), _tan.length(), _nQ);
      }
    }
  }
  _nA0.copy(_nA);
  _nB0.copy(_nB);
}

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
const playerPos = new THREE.Vector3();
const miraPos = new THREE.Vector3();
const handPrev = [new THREE.Vector3(), new THREE.Vector3()];
const handReady = [false, false];

function getCam() {
  return XR_ON() ? renderer.xr.getCamera() : camera;
}
function placeAhead(dist, lift) {
  const cam = getCam();
  cam.getWorldPosition(_v);
  cam.getWorldDirection(_fwd);
  _fwd.y = 0;
  if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1);
  _fwd.normalize();
  const p = _v.clone().addScaledVector(_fwd, dist);
  p.y = lift ?? 0.02;
  return p;
}
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
  if (hit) {
    aimPoint.copy(hit.point);
    aimPoint.y = 0.02;
    return aimPoint;
  }
  const t = (_v.y > 0.05) ? (_v.y / Math.max(0.05, -_fwd.y)) : 1.2;
  if (_fwd.y < -0.02 && t > 0 && t < 12) {
    aimPoint.copy(_v).addScaledVector(_fwd, t);
    aimPoint.y = 0.02;
    return aimPoint;
  }
  return placeAhead(1.3, 0.02);
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
  if (action.type === "tab") {
    refreshDom();
    return;
  }
  if (action.type === "cycle" || action.type === "legs-toggle") {
    refreshDom();
    return;
  }
  if (action.type === "summon") {
    const g = ofSpecies(action.species);
    const p = PETS.find((x) => x.id === action.species);
    if (p) g.likes = p.likes;
    spawnPet(g, aimOnFloor().clone(), scene);
    setHint("Summoned " + g.name + " — listen for its call. Stroke the top of its head to pet.");
    return;
  }
  if (action.type === "summon-build") {
    const g = customGene(geneFromState(worldMenu.state));
    spawnPet(g, aimOnFloor().clone(), scene);
    setHint("Built " + g.name + " is on the floor ahead.");
    return;
  }
  if (action.type === "food") {
    const p = aimOnFloor().clone();
    p.y = 0.55;
    spawnFood(action.id, p, scene);
    setHint(action.id + " dropped — it will bounce and sit on the floor. Pets walk to food they like.");
    return;
  }
  if (action.type === "portal") {
    spawnPortal(aimOnFloor().clone(), scene);
    setHint("Dark portal placed. Horde creatures will crawl out. Trigger = laser.");
    return;
  }
  if (action.type === "hat") {
    let best = null, bd = 4;
    getCam().getWorldPosition(_v);
    for (const p of pets) {
      if (!p.alive) continue;
      const d = p.root.position.distanceTo(_v);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) {
      applyHat(best, action.id);
      setHint("Hat on " + best.g.name);
    } else setHint("Summon a pet first, then give it a hat.");
  }
}

function refreshDom() {
  if (hudEl && hudEl.style.display !== "none") fillDomHud(hudEl, worldMenu.state, act);
}
if (hudEl) {
  hudEl.style.display = "none";
  fillDomHud(hudEl, worldMenu.state, act);
}

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
  tryGrab(ctrl);
  if (noodleHeld === ctrl) return;
  const action = menuRay(ctrl);
  if (action) { act(action); return; }
  fireLaser(ctrl);
}

function faceMenu() {
  if (!XR_ON()) {
    worldMenu.group.visible = false;
    return;
  }
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
    setHint("Mic on — speak to rally pets to you (short range, one call).");
  } catch (e) {
    setHint("Mic blocked — allow microphone to voice-call pets. " + (e.message || ""));
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
    getCam().getWorldPosition(playerPos);
    rallyPets(playerPos, 0.95);
    rallyTone();
    rallyCool = 2.6;
    setHint("Voice rally — pets coming to you.");
  }
  voiceHigh = talking;
}

function tickPetting(dt) {
  const hands = [grip0, grip1];
  for (let i = 0; i < 2; i++) {
    const g = hands[i];
    g.getWorldPosition(_v);
    _v.y += 0.02;
    let vel = 0;
    if (handReady[i]) vel = _v.distanceTo(handPrev[i]) / Math.max(dt, 1 / 90);
    else handReady[i] = true;
    handPrev[i].copy(_v);
    strokePet(_v, vel, scene);
  }
  try {
    for (const h of [renderer.xr.getHand(0), renderer.xr.getHand(1)]) {
      const joints = h.joints;
      const tip = joints && (typeof joints.get === "function"
        ? (joints.get("index-finger-tip") || joints.get("wrist"))
        : (joints["index-finger-tip"] || joints["wrist"]));
      if (!tip || !tip.getWorldPosition) continue;
      tip.getWorldPosition(_v);
      strokePet(_v, 0.2, scene);
    }
  } catch (_) { /* no joints */ }
}

const clock = new THREE.Clock();
banner("LOADING HUMANPLUS…");
new GLTFLoader().load(
  ASSET,
  (gltf) => {
    const root = gltf.scene;
    applySkin(root);
    root.updateMatrixWorld(true);
    if (skeleton) skeleton.update();
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;
    baseScale = 1.68 / Math.max(size.y, 0.2);
    root.scale.setScalar(baseScale);
    miraRoot = root;
    avatar.add(root);
    ready = true;
    if (loadEl) loadEl.remove();
    banner("HUMANPLUS · FOOD tab · BUILD then SUMMON · PORTAL on the floor · speak to rally · stroke to pet");
    face("happy");
  },
  (x) => {
    if (x.total && loadEl) loadEl.textContent = "LOADING  " + Math.round((x.loaded / x.total) * 100) + "%";
  },
  (e) => { banner("LOAD FAILED — " + (e && e.message ? e.message : "glb")); console.error(e); }
);

function desktopMove(dt) {
  if (!controls || !controls.isLocked) return;
  const sp = (keys.ShiftLeft ? 2.4 : 1.4) * dt;
  if (keys.KeyW) controls.moveForward(sp);
  if (keys.KeyS) controls.moveForward(-sp);
  if (keys.KeyA) controls.moveRight(-sp);
  if (keys.KeyD) controls.moveRight(sp);
}
let miraWalk = 1.2;
function miraWander(dt) {
  if (!ready) return false;
  miraWalk -= dt;
  if (miraWalk < 0) {
    miraWalk = 3 + Math.random() * 4;
    avatar.userData.dest = new THREE.Vector3(-0.9 + (Math.random() - 0.5) * 1.6, 0, -0.2 + (Math.random() - 0.5) * 1.6);
  }
  const dest = avatar.userData.dest;
  if (!dest) return false;
  const to = dest.clone().sub(avatar.position);
  to.y = 0;
  if (to.length() < 0.12) return false;
  to.normalize();
  avatar.position.addScaledVector(to, dt * 0.35);
  avatar.rotation.y = THREE.MathUtils.damp(avatar.rotation.y, Math.atan2(to.x, to.z), 4, dt);
  return true;
}

addEventListener("keydown", (e) => {
  if (e.code === "KeyM") toggleMenu();
  if (e.code === "KeyV") {
    getCam().getWorldPosition(playerPos);
    rallyPets(playerPos, 0.95);
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

let fpsFrames = 0, fpsLast = performance.now();
function tickStats() {
  if (!statsEl) return;
  fpsFrames++;
  const now = performance.now();
  if (now - fpsLast < 400) return;
  const fps = (fpsFrames * 1000) / (now - fpsLast);
  fpsFrames = 0;
  fpsLast = now;
  statsEl.textContent = `HUMANPLUS  ${fps.toFixed(0)} fps`;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  desktopMove(dt);
  const moving = miraWander(dt);
  walkT += dt * (moving ? 7.4 : 1.7);
  tickNoodle(dt);
  if (ready) {
    tickExpr(dt);
    restoreBind();
    applyShape();
    tickRest();
    tickBreathe(clock.elapsedTime);
    if (moving) tickWalk(true);
    else tickIdle(clock.elapsedTime);
    tickSoft(dt, moving);
    tickGaze(dt, moving);
    tickHitReact(dt);
    tickFingers(noodleHeld ? 0.8 : 0.08);
    applyExtras();
    tickMorphs(dt);
    if (skeleton) skeleton.update();
    blob.position.x = avatar.position.x;
    blob.position.z = avatar.position.z;
    avatar.getWorldPosition(miraPos);
  }
  getCam().getWorldPosition(playerPos);
  aimOnFloor(XR_ON() ? ctrl0 : null);
  reticle.position.x = aimPoint.x;
  reticle.position.z = aimPoint.z;
  reticle.visible = worldMenu.state.tab === "PORTAL" || worldMenu.state.tab === "FOOD" || worldMenu.state.tab === "BUILD" || worldMenu.state.tab === "PETS";
  tickWorld(dt, {
    scene,
    playerPos,
    miraPos,
    floorY: 0,
    onHitMira: () => { hitReact.exprT = 0.4; face("surprise"); hitReact.flinchX += 0.18; },
  });
  tickPetting(dt);
  tickVoice(dt);
  faceMenu();
  tickStats();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);

async function enterXr() {
  if (!navigator.xr) {
    banner("WebXR not available — use Quest Browser or Desktop look");
    return;
  }
  try {
    audioReady();
    if (QUEST) renderer.xr.setFramebufferScaleFactor(0.85);
    let session;
    try {
      session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["hand-tracking", "hit-test", "unbounded"],
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
    session.addEventListener("end", () => {
      scene.background = new THREE.Color(0x6b5e52);
      renderer.setClearColor(0x6b5e52, 1);
      floor.material.opacity = 0.55;
      if (hudEl) hudEl.style.display = "block";
    });
  } catch (e) {
    banner(String(e.message || e));
  }
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
