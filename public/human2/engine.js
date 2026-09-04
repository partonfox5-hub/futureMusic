import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";


const ASSET = "/human2/assets/mira.glb?v=2";
const TEXROOT = "/human2/assets/tex/";
const MAP_FILE = {
  Std_Skin_Head: ["head.jpg", "head_n.jpg"],
  Std_Skin_Body: ["body.jpg", "body_n.jpg"],
  Std_Skin_Arm: ["arm.jpg", "arm_n.jpg"],
  Std_Skin_Leg: ["leg.jpg", "leg_n.jpg"],
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

function banner(msg) {
  if (loadEl) loadEl.textContent = msg;
  if (hintEl) hintEl.textContent = msg;
  console.warn(msg);
}

const renderer = new THREE.WebGLRenderer({ antialias: !QUEST, alpha: false, powerPreference: "high-performance" });
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
camera.position.set(0, 1.45, 2.6);
camera.lookAt(0, 0.95, 0);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xfff3e4, 0x3a3028, 0.85);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff0d8, 1.6);
key.position.set(1.4, 3.2, 2.8);
scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
} catch (e) {
  console.warn("env", e);
}

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(8, 48),
  new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const blob = new THREE.Mesh(
  new THREE.CircleGeometry(0.28, 24),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
);
blob.rotation.x = -Math.PI / 2;
blob.position.y = 0.012;
scene.add(blob);

let controls = null;
try {
  controls = new PointerLockControls(camera, renderer.domElement);
} catch (e) {
  banner("look controls: " + e.message);
}

const keys = {};
addEventListener("keydown", (e) => { keys[e.code] = true; });
addEventListener("keyup", (e) => { keys[e.code] = false; });

document.getElementById("desk").onclick = () => {
  if (ui) ui.style.display = "none";
  try { controls && controls.lock(); } catch (e) { banner(String(e.message || e)); }
};
document.getElementById("enter").onclick = enterXr;

const avatar = new THREE.Group();
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
const texLoader = new THREE.TextureLoader();
const texCache = {};

function loadMap(file, srgb) {
  if (!file) return null;
  if (texCache[file]) return texCache[file];
  const t = texLoader.load(TEXROOT + file, undefined, undefined, (err) => console.warn("tex fail", file, err));
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  t.flipY = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  texCache[file] = t;
  return t;
}

function isHairMat(m, o) {
  const n = ((m && m.name) || "") + " " + (o.name || "");
  return /transp|eyelash|hair/i.test(n);
}

function applySkin(root) {
  root.traverse((o) => {
    if (o.isBone) {
      bones[o.name] = o;
      bindQ[o.name] = o.quaternion.clone();
      bindPos[o.name] = o.position.clone();
      bindS[o.name] = o.scale.clone();
    }
    if (o.isSkinnedMesh && o.skeleton && !skeleton) skeleton = o.skeleton;
    if (!o.isMesh) return;
    if (/cornea/i.test(o.name) || (o.material && /cornea/i.test(o.material.name || ""))) {
      o.visible = false;
    }
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const next = mats.map((m) => {
      if (!m) return m;
      const name = m.name || "";
      const hair = isHairMat(m, o);
      const spec = MAP_FILE[name];
      const map = spec ? loadMap(spec[0], true) : (m.map || null);
      const nrm = spec && spec[1] ? loadMap(spec[1], false) : (m.normalMap || null);
      const lit = new THREE.MeshStandardMaterial({
        map,
        normalMap: nrm,
        color: 0xffffff,
        roughness: hair ? 0.45 : 0.5,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: false,
        depthWrite: true,
        alphaTest: hair ? (QUEST ? 0.48 : 0.38) : 0,
      });
      if (map) {
        map.colorSpace = THREE.SRGBColorSpace;
        map.flipY = false;
      }
      if (nrm) {
        nrm.colorSpace = THREE.LinearSRGBColorSpace;
        nrm.flipY = false;
        lit.normalScale.set(1.15, 1.15);
      }
      lit.name = name;
      if (/eye/i.test(name) && !/lash|lid/i.test(name)) {
        lit.roughness = 0.18;
        lit.metalness = 0.02;
      }
      return lit;
    });
    o.material = next.length === 1 ? next[0] : next;
    if (o.morphTargetDictionary) morphMeshes.push(o);
    o.frustumCulled = false;
    o.castShadow = false;
  });
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
  if (bones.L_Thigh && bindPos.L_Thigh) bones.L_Thigh.position.x = bindPos.L_Thigh.x + shape.gap * 0.045;
  if (bones.R_Thigh && bindPos.R_Thigh) bones.R_Thigh.position.x = bindPos.R_Thigh.x - shape.gap * 0.045;
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

function clearWant() {
  for (const n of MORPH) want[n] = 0;
}

function face(kind) {
  clearWant();
  if (kind === "happy") {
    want.Mouth_Smile_L = want.Mouth_Smile_R = 0.78;
    want.Mouth_Dimple_L = want.Mouth_Dimple_R = 0.25;
    want.Cheek_Raise_L = want.Cheek_Raise_R = 0.45;
  } else if (kind === "frown") {
    want.Mouth_Frown_L = want.Mouth_Frown_R = 0.68;
    want.Brow_Drop_L = want.Brow_Drop_R = 0.4;
  } else if (kind === "surprise") {
    want.Brow_Raise_Inner_L = want.Brow_Raise_Inner_R = 0.5;
    want.Eye_Wide_L = want.Eye_Wide_R = 0.45;
    want.Jaw_Open = 0.18;
  } else if (kind === "pucker") {
    want.Mouth_Pucker_Up_L = want.Mouth_Pucker_Up_R = 0.55;
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
  exprT -= dt;
  if (exprT <= 0) {
    exprT = 5 + Math.random() * 5;
    face(["neutral", "happy", "frown", "surprise", "pucker"][(Math.random() * 5) | 0]);
  }
}

const soft = [
  { name: "L_Breast", x: 0, z: 0, vx: 0, vz: 0, stiff: 24, damp: 7.0, max: 0.32, grav: 0.5 },
  { name: "R_Breast", x: 0, z: 0, vx: 0, vz: 0, stiff: 24, damp: 7.0, max: 0.32, grav: 0.5 },
  { name: "L_Glute", x: 0, z: 0, vx: 0, vz: 0, stiff: 32, damp: 9.2, max: 0.2, grav: 0.22 },
  { name: "R_Glute", x: 0, z: 0, vx: 0, vz: 0, stiff: 32, damp: 9.2, max: 0.2, grav: 0.22 },
];
const prevHip = new THREE.Vector3();
let hipReady = false;

function tickRest() {
  addE("L_Upperarm", 0.2, 0.15, -1.22);
  addE("R_Upperarm", 0.2, -0.15, 1.22);
  addE("L_Forearm", 0.35, 0, 0.08);
  addE("R_Forearm", 0.35, 0, -0.08);
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
  const swing = Math.sin(t) * 0.42;
  addE("L_Thigh", -swing, 0, 0);
  addE("R_Thigh", swing, 0, 0);
  addE("L_Calf", Math.max(0, Math.sin(t)) * 0.62, 0, 0);
  addE("R_Calf", Math.max(0, -Math.sin(t)) * 0.62, 0, 0);
  addE("L_Foot", Math.sin(t + 0.4) * 0.12, 0, 0);
  addE("R_Foot", Math.sin(t + Math.PI + 0.4) * 0.12, 0, 0);
  addE("L_Upperarm", Math.max(0, swing) * 0.25, 0, -swing * 0.35);
  addE("R_Upperarm", Math.max(0, -swing) * 0.25, 0, swing * 0.35);
  addE("L_Forearm", Math.max(0, -Math.sin(t)) * 0.4, 0, 0);
  addE("R_Forearm", Math.max(0, Math.sin(t)) * 0.4, 0, 0);
  addE("Hip", Math.sin(t * 2) * 0.02, Math.sin(t) * 0.04, 0);
  addE("Spine02", 0, Math.sin(t) * 0.03, 0);
}

function tickIdle(t) {
  addE("Hip", 0, Math.sin(t * 0.65) * 0.02, Math.sin(t * 0.5) * 0.015);
  addE("L_Clavicle", Math.sin(t * 0.8) * 0.025, 0, Math.sin(t * 0.9) * 0.02);
  addE("R_Clavicle", Math.sin(t * 0.8 + 0.7) * 0.025, 0, Math.sin(t * 0.9 + 1) * 0.02);
}

function tickSoft(dt, moving) {
  const hip = bones.Hip;
  if (hip) hip.getWorldPosition(_w);
  let ax = 0, az = 0;
  if (hip && hipReady) {
    ax = (_w.x - prevHip.x) / Math.max(dt, 1 / 120);
    az = (_w.z - prevHip.z) / Math.max(dt, 1 / 120);
  }
  if (hip) {
    prevHip.copy(_w);
    hipReady = true;
  }
  const drive = moving ? 1 : 0.4;
  const step = Math.min(dt, 1 / 60);
  for (const s of soft) {
    if (!bones[s.name] || !bindQ[s.name]) continue;
    const side = s.name.startsWith("R_") ? -1 : 1;
    const accX = -ax * 0.11 * drive + Math.sin(walkT) * 0.7 * drive * side;
    const accZ = -az * 0.11 * drive + Math.cos(walkT * 2) * 0.38 * drive + s.grav;
    s.vx += (accX - s.x * s.stiff - s.vx * s.damp) * step;
    s.vz += (accZ - s.z * s.stiff - s.vz * s.damp) * step;
    s.x += s.vx * step;
    s.z += s.vz * step;
    s.x = THREE.MathUtils.clamp(s.x, -s.max, s.max);
    s.z = THREE.MathUtils.clamp(s.z, -s.max * 0.65, s.max);
    addE(s.name, s.z, 0, s.x);
  }
}

function tickBreathe(t) {
  const b = Math.sin(t * 1.55) * 0.026;
  addE("Spine02", b, 0, 0);
  addE("Spine01", b * 0.4, 0, 0);
}

function tickGaze(dt, moving) {
  const cam = XR_ON() ? renderer.xr.getCamera() : camera;
  cam.getWorldPosition(_v);
  const dx = _v.x - avatar.position.x;
  const dz = _v.z - avatar.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) return;
  const yawWorld = Math.atan2(dx, dz);
  if (!moving) avatar.rotation.y = THREE.MathUtils.damp(avatar.rotation.y, yawWorld, 3.2, dt);
  let yaw = yawWorld - avatar.rotation.y;
  while (yaw > Math.PI) yaw -= Math.PI * 2;
  while (yaw < -Math.PI) yaw += Math.PI * 2;
  yaw = THREE.MathUtils.clamp(yaw, -0.55, 0.55);
  const pitch = THREE.MathUtils.clamp((_v.y - 1.48) * 0.18, -0.22, 0.22);
  want.Eye_L_Look_L = want.Eye_R_Look_L = Math.max(0, -yaw) * 1.35;
  want.Eye_L_Look_R = want.Eye_R_Look_R = Math.max(0, yaw) * 1.35;
  want.Eye_L_Look_Up = want.Eye_R_Look_Up = Math.max(0, -pitch) * 1.2;
  want.Eye_L_Look_Down = want.Eye_R_Look_Down = Math.max(0, pitch) * 1.2;
  addE("Head", pitch * 0.4, yaw * 0.32, 0);
  addE("NeckTwist02", pitch * 0.14, yaw * 0.12, 0);
  addE("L_Eye", pitch * 0.5, yaw * 0.55, 0);
  addE("R_Eye", pitch * 0.5, yaw * 0.55, 0);
}

const noodle = new THREE.Group();
noodle.add(new THREE.Mesh(
  new THREE.CylinderGeometry(0.038, 0.038, 1.18, 18),
  new THREE.MeshStandardMaterial({ color: 0x3ec1f0, roughness: 0.62, metalness: 0 })
));
noodle.add(new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.04, 0.08, 18),
  new THREE.MeshStandardMaterial({ color: 0xffef7a, roughness: 0.5 })
)).children[1].position.y = 0.55;
noodle.add(new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.04, 0.08, 18),
  new THREE.MeshStandardMaterial({ color: 0xffef7a, roughness: 0.5 })
)).children[2].position.y = -0.55;
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
scene.add(renderer.xr.getControllerGrip(0));
scene.add(renderer.xr.getControllerGrip(1));
function tryGrab(ctrl) {
  ctrl.getWorldPosition(_v);
  if (_v.distanceTo(noodle.position) < 0.38) noodleHeld = ctrl;
}
ctrl0.addEventListener("selectstart", () => tryGrab(ctrl0));
ctrl1.addEventListener("selectstart", () => tryGrab(ctrl1));
ctrl0.addEventListener("selectend", () => { if (noodleHeld === ctrl0) noodleHeld = null; });
ctrl1.addEventListener("selectend", () => { if (noodleHeld === ctrl1) noodleHeld = null; });

const BODY_HIT = [
  ["Head", 0.12], ["Spine02", 0.16], ["Hip", 0.16],
  ["L_Breast", 0.11], ["R_Breast", 0.11],
  ["L_Thigh", 0.1], ["R_Thigh", 0.1],
  ["L_Hand", 0.06], ["R_Hand", 0.06],
];

function closestPointOnNoodle(p) {
  noodle.updateMatrixWorld();
  const a = new THREE.Vector3(0, -NLEN * 0.5, 0).applyMatrix4(noodle.matrixWorld);
  const b = new THREE.Vector3(0, NLEN * 0.5, 0).applyMatrix4(noodle.matrixWorld);
  const ab = b.clone().sub(a);
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
  return a.addScaledVector(ab, t);
}

function tickNoodle(dt) {
  const holdingKey = keys.KeyF || keys.Mouse0;
  if (!XR_ON() && holdingKey && controls && controls.isLocked) {
    camera.getWorldPosition(_v);
    camera.getWorldDirection(_w);
    noodle.position.copy(_v).addScaledVector(_w, 0.85);
    noodle.quaternion.copy(camera.quaternion);
    noodle.rotateX(-Math.PI * 0.5);
    noodleVel.set(0, 0, 0);
    noodleHeld = "desk";
  } else if (noodleHeld && noodleHeld !== "desk") {
    noodleHeld.getWorldPosition(_v);
    noodleHeld.getWorldQuaternion(_q);
    noodle.position.copy(_v);
    noodle.quaternion.copy(_q);
    noodle.rotateX(-Math.PI * 0.5);
    noodleVel.set(0, 0, 0);
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

  for (const [bn, rad] of BODY_HIT) {
    const bone = bones[bn];
    if (!bone) continue;
    bone.getWorldPosition(_w);
    const q = closestPointOnNoodle(_w);
    const d = _w.distanceTo(q);
    const min = rad + NRAD;
    if (d < min && d > 1e-4) {
      const nrm = _w.clone().sub(q).multiplyScalar(1 / d);
      const push = (min - d);
      if (!noodleHeld) {
        noodle.position.addScaledVector(nrm, -push * 0.85);
        noodleVel.addScaledVector(nrm, -push * 8);
      }
      for (const s of soft) {
        if (s.name === bn || (bn === "Spine02" && s.name.includes("Breast"))) {
          s.vx += nrm.x * push * 14;
          s.vz += nrm.z * push * 14;
        }
      }
    }
  }
}

function handsNearNoodle() {
  let g = 0;
  for (const n of ["L_Hand", "R_Hand"]) {
    if (!bones[n]) continue;
    bones[n].getWorldPosition(_w);
    if (_w.distanceTo(noodle.position) < 0.28) g = 1;
  }
  return g;
}

const clock = new THREE.Clock();
banner("LOADING PASS 2…");
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
    banner("PASS 2 · F hold noodle · sliders on the right");
    face("happy");
    let mapped = 0;
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m && m.map && m.map.image) mapped++;
    });
    console.log("pass2 maps", mapped, "bones", Object.keys(bones).length);
  },
  (x) => {
    if (x.total && loadEl) loadEl.textContent = "LOADING PASS 2  " + Math.round((x.loaded / x.total) * 100) + "%";
  },
  (e) => {
    banner("LOAD FAILED — " + (e && e.message ? e.message : "glb"));
    console.error(e);
  }
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
    avatar.userData.dest = new THREE.Vector3((Math.random() - 0.5) * 3.2, 0, (Math.random() - 0.5) * 3.2);
  }
  const dest = avatar.userData.dest;
  if (!dest) return false;
  const to = dest.clone().sub(avatar.position);
  to.y = 0;
  if (to.length() < 0.12) return false;
  to.normalize();
  avatar.position.addScaledVector(to, dt * 0.55);
  avatar.rotation.y = THREE.MathUtils.damp(avatar.rotation.y, Math.atan2(to.x, to.z), 4, dt);
  return true;
}

let fpsFrames = 0;
let fpsLast = performance.now();
function tickStats() {
  if (!statsEl) return;
  fpsFrames++;
  const now = performance.now();
  if (now - fpsLast < 400) return;
  const fps = (fpsFrames * 1000) / (now - fpsLast);
  fpsFrames = 0;
  fpsLast = now;
  const inf = renderer.info.render;
  statsEl.textContent = `PASS 2  ${fps.toFixed(0)} fps  tris ${inf.triangles}`;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  desktopMove(dt);
  const moving = miraWander(dt);
  walkT += dt * (moving ? 7.4 : 1.7);
  if (ready) {
    tickExpr(dt);
    restoreBind();
    applyShape();
    tickRest();
    tickBreathe(clock.elapsedTime);
    if (moving) tickWalk(true);
    else tickIdle(clock.elapsedTime);
    tickGaze(dt, moving);
    const grasp = noodleHeld || handsNearNoodle() ? 0.85 : 0;
    tickFingers(0.22 + grasp * 0.7);
    tickSoft(dt, moving);
    applyExtras();
    tickMorphs(dt);
    if (skeleton) skeleton.update();
    tickNoodle(dt);
    blob.position.x = avatar.position.x;
    blob.position.z = avatar.position.z;
  }
  tickStats();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);

function bindSliders() {
  const map = [
    ["sHeight", "height"],
    ["sWaist", "waist"],
    ["sBreast", "breast"],
    ["sButt", "butt"],
    ["sThigh", "thigh"],
    ["sGap", "gap"],
  ];
  for (const [id, key] of map) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener("input", () => { shape[key] = parseFloat(el.value); });
  }
}
bindSliders();

addEventListener("mousedown", () => { keys.Mouse0 = true; });
addEventListener("mouseup", () => { keys.Mouse0 = false; });

async function enterXr() {
  if (!navigator.xr) {
    banner("WebXR not available — use Quest Browser or Desktop look");
    return;
  }
  try {
    if (QUEST) renderer.xr.setFramebufferScaleFactor(0.85);
    let session;
    try {
      session = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["local-floor"] });
    } catch {
      session = await navigator.xr.requestSession("immersive-vr", { requiredFeatures: ["local-floor"] });
    }
    await renderer.xr.setSession(session);
    renderer.xr.setReferenceSpaceType("local-floor");
    if (typeof renderer.xr.setFoveation === "function") renderer.xr.setFoveation(0.55);
    if (ui) ui.style.display = "none";
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    floor.material.opacity = 0.12;
    floor.material.transparent = true;
    try {
      const rates = session.supportedFrameRates;
      if (rates && rates.includes(72)) await session.updateTargetFrameRate(72);
    } catch (err) {
      console.warn("framerate", err);
    }
  } catch (e) {
    banner(String(e.message || e));
  }
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
