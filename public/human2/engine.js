import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";


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
    o.castShadow = false;
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
  if (hitReact.exprT > 0) {
    hitReact.exprT -= dt;
    return;
  }
  exprT -= dt;
  if (exprT <= 0) {
    exprT = 5 + Math.random() * 5;
    face(["neutral", "happy", "frown", "surprise", "pucker"][(Math.random() * 5) | 0]);
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
const hitReact = {
  lookYaw: 0, lookPitch: 0, lookT: 0,
  flinchX: 0, flinchY: 0, flinchZ: 0,
  headKickX: 0, headKickY: 0,
  exprT: 0,
  knockX: 0, knockZ: 0,
};
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
  // T-pose → hang at sides. Local Y is along the arm; rotate around Z only
  // so the limb goes down, not through the torso.
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
  // Local +X swings the limb toward +Z (forward). Knees only flex the other way:
  // negative X tucks the calf backward.
  addE("L_Thigh", swing, 0, 0);
  addE("R_Thigh", -swing, 0, 0);
  addE("L_Calf", -Math.max(0, Math.sin(t)) * 0.7, 0, 0);
  addE("R_Calf", -Math.max(0, -Math.sin(t)) * 0.7, 0, 0);
  addE("L_Foot", -Math.sin(t + 0.35) * 0.1, 0, 0);
  addE("R_Foot", -Math.sin(t + Math.PI + 0.35) * 0.1, 0, 0);
  addE("L_Upperarm", 0, 0, swing * 0.22);
  addE("R_Upperarm", 0, 0, swing * 0.22);
  addE("L_Forearm", -Math.max(0, -Math.sin(t)) * 0.35, 0, 0);
  addE("R_Forearm", -Math.max(0, Math.sin(t)) * 0.35, 0, 0);
  addE("Hip", Math.sin(t * 2) * 0.015, Math.sin(t) * 0.03, 0);
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
    if (Math.abs(s.x) >= s.max) s.vx *= 0.35;
    if (Math.abs(s.z) >= s.max * 0.65) s.vz *= 0.35;
    addE(s.name, s.z, 0, s.x);
  }
}

function tickBreathe(t) {
  const b = Math.sin(t * 1.55) * 0.026;
  addE("Spine02", b, 0, 0);
  addE("Spine01", b * 0.4, 0, 0);
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
  let yaw = wrapPi(yawWorld - avatar.rotation.y);
  yaw = THREE.MathUtils.clamp(yaw, -0.55, 0.55);
  let pitch = THREE.MathUtils.clamp((_v.y - 1.48) * 0.18, -0.22, 0.22);
  if (hitReact.lookT > 0) {
    const k = Math.min(1, hitReact.lookT * 2.4);
    yaw = THREE.MathUtils.lerp(yaw, hitReact.lookYaw, k);
    pitch = THREE.MathUtils.lerp(pitch, hitReact.lookPitch, k);
  }
  want.Eye_L_Look_L = want.Eye_R_Look_L = Math.max(0, -yaw) * 1.35;
  want.Eye_L_Look_R = want.Eye_R_Look_R = Math.max(0, yaw) * 1.35;
  want.Eye_L_Look_Up = want.Eye_R_Look_Up = Math.max(0, -pitch) * 1.2;
  want.Eye_L_Look_Down = want.Eye_R_Look_Down = Math.max(0, pitch) * 1.2;
  addE("Head", pitch * 0.4 + hitReact.headKickX, yaw * 0.32 + hitReact.headKickY, 0);
  addE("NeckTwist02", pitch * 0.14, yaw * 0.12, 0);
  addE("NeckTwist01", pitch * 0.08, yaw * 0.08, 0);
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
  { name: "L_Upperarm", rad: 0.075, kind: "arm" },
  { name: "R_Upperarm", rad: 0.075, kind: "arm" },
  { name: "L_Hand", rad: 0.06, kind: "hand" },
  { name: "R_Hand", rad: 0.06, kind: "hand" },
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
  const jy = nrm.y * mag * 1.6;
  for (const s of soft) {
    let wgt = 0;
    if (s.name === hit.name) wgt = 1;
    else if (hit.kind === "chest" && s.name.includes("Breast")) wgt = 0.9;
    else if (hit.kind === "breast" && s.name.includes("Breast")) wgt = s.name[0] === hit.name[0] ? 1 : 0.48;
    else if (hit.kind === "belly" && s.name.includes("Breast")) wgt = 0.42;
    else if (hit.kind === "hip" && s.name.includes("Glute")) wgt = 0.78;
    else if (hit.kind === "glute" && s.name.includes("Glute")) wgt = s.name[0] === hit.name[0] ? 1 : 0.42;
    else if (hit.kind === "thigh" && s.name.includes("Glute")) wgt = s.name[0] === hit.name[0] ? 0.55 : 0.22;
    else if (hit.kind === "head" && s.name.includes("Breast")) wgt = 0.18;
    if (wgt > 0) {
      s.vx += jx * wgt + glance * nrm.z * 0.4 * wgt;
      s.vz += jz * wgt + jy * 0.35 * wgt;
    }
  }

  _toHit.copy(pos).sub(avatar.position);
  let lookYaw = wrapPi(Math.atan2(_toHit.x, _toHit.z) - avatar.rotation.y);
  if (hit.kind === "head" && mag > 0.85) lookYaw = -lookYaw * 0.45;
  hitReact.lookYaw = THREE.MathUtils.clamp(lookYaw * Math.min(1.1, mag * 0.75), -0.75, 0.75);
  hitReact.lookPitch = THREE.MathUtils.clamp(-nrm.y * mag * 0.28 + (hit.kind === "head" ? -0.12 * mag : 0), -0.4, 0.32);
  hitReact.lookT = 0.5 + Math.min(0.9, mag * 0.28);
  hitReact.headKickX += THREE.MathUtils.clamp(-nrm.y * mag * 0.22, -0.35, 0.28);
  hitReact.headKickY += THREE.MathUtils.clamp(lookYaw * mag * 0.18, -0.45, 0.45);

  hitReact.flinchX += THREE.MathUtils.clamp(-nrm.z * mag * 0.16, -0.38, 0.38);
  hitReact.flinchY += THREE.MathUtils.clamp(lookYaw * mag * 0.12, -0.42, 0.42);
  hitReact.flinchZ += THREE.MathUtils.clamp(nrm.x * mag * 0.14, -0.32, 0.32);

  hitReact.knockX += nrm.x * mag * 0.11;
  hitReact.knockZ += nrm.z * mag * 0.11;

  if (mag > 0.7) {
    hitReact.exprT = 0.42 + Math.min(0.35, mag * 0.08);
    face("surprise");
    miraWalk = Math.max(miraWalk, 0.55);
    if (mag > 1.15) avatar.userData.dest = null;
  } else if (mag > 0.35) {
    want.Eye_Squint_L = want.Eye_Squint_R = Math.min(0.55, mag * 0.4);
    hitReact.exprT = Math.max(hitReact.exprT, 0.22);
  }
}

function tickHitReact(dt) {
  const decay = Math.exp(-dt * 6.2);
  hitReact.flinchX *= decay;
  hitReact.flinchY *= decay;
  hitReact.flinchZ *= decay;
  hitReact.headKickX *= decay;
  hitReact.headKickY *= decay;
  hitReact.lookT = Math.max(0, hitReact.lookT - dt);
  addE("Spine02", hitReact.flinchX, hitReact.flinchY * 0.55, hitReact.flinchZ);
  addE("Spine01", hitReact.flinchX * 0.65, hitReact.flinchY * 0.4, hitReact.flinchZ * 0.55);
  addE("Waist", hitReact.flinchX * 0.25, hitReact.flinchY * 0.2, 0);
  addE("Hip", hitReact.flinchX * 0.32, hitReact.flinchY * 0.22, 0);
  addE("L_Clavicle", hitReact.flinchX * 0.2, 0, hitReact.flinchZ * 0.25);
  addE("R_Clavicle", hitReact.flinchX * 0.2, 0, -hitReact.flinchZ * 0.25);
  avatar.position.x += hitReact.knockX * dt;
  avatar.position.z += hitReact.knockZ * dt;
  const kd = Math.exp(-dt * 5.4);
  hitReact.knockX *= kd;
  hitReact.knockZ *= kd;
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
  if (!nEndsReady) {
    _nA0.copy(_nA);
    _nB0.copy(_nB);
    nEndsReady = true;
    return;
  }
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
      if (hipReady) {
        _vRel.x -= (_w.x - prevHip.x) * invDt * 0.35;
        _vRel.z -= (_w.z - prevHip.z) * invDt * 0.35;
      }
      const closing = -_vRel.dot(_nrm);
      _tan.copy(_vRel).addScaledVector(_nrm, closing);
      const glance = _tan.length();

      if (!noodleHeld) {
        noodle.position.addScaledVector(_nrm, -push * 0.85);
        noodleVel.addScaledVector(_nrm, -Math.max(closing, 0) * 0.55 - push * 6);
      }

      const squash = push * 18;
      for (const s of soft) {
        let wgt = 0;
        if (s.name === hit.name) wgt = 1;
        else if (hit.kind === "chest" && s.name.includes("Breast")) wgt = 0.8;
        else if (hit.kind === "breast" && s.name.includes("Breast")) wgt = s.name[0] === hit.name[0] ? 1 : 0.35;
        else if (hit.kind === "glute" && s.name.includes("Glute")) wgt = s.name[0] === hit.name[0] ? 1 : 0.3;
        else if (hit.kind === "hip" && s.name.includes("Glute")) wgt = 0.5;
        if (wgt > 0) {
          s.vx += _nrm.x * squash * wgt;
          s.vz += _nrm.z * squash * wgt;
        }
      }
      if (closing > 0.28 || (noodleHeld && closing > 0.18)) {
        applyStrike(hit, _nrm, Math.max(closing, push * 8), glance, _nQ);
      }
    }
  }

  _nA0.copy(_nA);
  _nB0.copy(_nB);
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
    banner("PASS 2 · F hold noodle · swing to strike");
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
    const grasp = noodleHeld || handsNearNoodle() ? 0.75 : 0;
    tickFingers(0.08 + grasp * 0.75);
    applyExtras();
    tickMorphs(dt);
    if (skeleton) skeleton.update();
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
