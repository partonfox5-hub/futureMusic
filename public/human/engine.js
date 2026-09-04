import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const ASSET = "/human/assets/mira.glb?v=5";
const MORPH = [
  "Mouth_Smile_L", "Mouth_Smile_R", "Mouth_Frown_L", "Mouth_Frown_R",
  "Eye_Blink_L", "Eye_Blink_R", "Jaw_Open", "V_Open",
  "Brow_Raise_Inner_L", "Brow_Raise_Inner_R", "Brow_Drop_L", "Brow_Drop_R",
  "Cheek_Raise_L", "Cheek_Raise_R",
];
const QUEST = /OculusBrowser|Quest/i.test(navigator.userAgent);
const XR_ON = () => renderer.xr.isPresenting;

const loadEl = document.getElementById("load");
const hintEl = document.getElementById("hint");
const ui = document.getElementById("ui");

function banner(msg) {
  if (loadEl) loadEl.textContent = msg;
  if (hintEl) hintEl.textContent = msg;
  console.warn(msg);
}

const renderer = new THREE.WebGLRenderer({ antialias: !QUEST, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, QUEST ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.xr.enabled = true;
renderer.setClearColor(0x6b5e52, 1);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6b5e52);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 80);
camera.position.set(0, 1.45, 2.6);
camera.lookAt(0, 0.95, 0);
scene.add(camera);

scene.add(new THREE.HemisphereLight(0xfff3e4, 0x3a3028, 0.55));
const key = new THREE.DirectionalLight(0xfff0d8, 1.35);
key.position.set(1.4, 3.2, 2.8);
scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.22));
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
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

const marker = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 0.2),
  new THREE.MeshStandardMaterial({ color: 0xd4af37 })
);
marker.position.set(0, 0.1, 0);
scene.add(marker);

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

const bones = {};
const bindQ = {};
const bindPos = {};
let skeleton = null;
let ready = false;
let morphMeshes = [];
let walkT = 0;
let blinkT = 2;
let exprT = 4;
const want = Object.fromEntries(MORPH.map((n) => [n, 0]));
const cur = { ...want };

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _m = new THREE.Matrix4();

function isHairMat(m, o) {
  const n = ((m && m.name) || "") + " " + (o.name || "");
  return /transp|eyelash|hair/i.test(n) || !!(m && m.alphaMap);
}

function applySkin(root) {
  root.traverse((o) => {
    if (o.isBone) {
      bones[o.name] = o;
      bindQ[o.name] = o.quaternion.clone();
      bindPos[o.name] = o.position.clone();
    }
    if (o.isSkinnedMesh && o.skeleton && !skeleton) skeleton = o.skeleton;
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      const hair = isHairMat(m, o);
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
      if (m.normalMap) {
        m.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
        m.normalScale.set(1.05, 1.05);
      }
      m.metalness = 0;
      if (m.roughness == null || m.roughness === 1) m.roughness = hair ? 0.42 : 0.48;
      m.side = hair ? THREE.DoubleSide : THREE.FrontSide;
      m.depthWrite = true;
      if (hair) {
        m.transparent = false;
        m.alphaTest = QUEST ? 0.48 : 0.4;
        m.alphaHash = !QUEST;
      }
      m.needsUpdate = true;
    }
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
  }
}

function boneQ(name, x, y, z) {
  const b = bones[name];
  const q0 = bindQ[name];
  if (!b || !q0) return;
  _e.set(x, y, z, "XYZ");
  _q.setFromEuler(_e);
  b.quaternion.copy(q0).multiply(_q);
}

function tickMorphs(dt) {
  for (const n of MORPH) cur[n] = THREE.MathUtils.damp(cur[n], want[n], 8, dt);
  for (const mesh of morphMeshes) {
    const d = mesh.morphTargetDictionary;
    const inf = mesh.morphTargetInfluences;
    if (!d || !inf) continue;
    for (const n of MORPH) if (n in d) inf[d[n]] = cur[n];
  }
}

function face(kind) {
  for (const n of MORPH) want[n] = 0;
  if (kind === "happy") {
    want.Mouth_Smile_L = want.Mouth_Smile_R = 0.82;
    want.Cheek_Raise_L = want.Cheek_Raise_R = 0.4;
  } else if (kind === "frown") {
    want.Mouth_Frown_L = want.Mouth_Frown_R = 0.7;
    want.Brow_Drop_L = want.Brow_Drop_R = 0.35;
  } else if (kind === "surprise") {
    want.Brow_Raise_Inner_L = want.Brow_Raise_Inner_R = 0.55;
    want.Jaw_Open = 0.2;
  }
}

function tickExpr(dt) {
  blinkT -= dt;
  if (blinkT <= 0) {
    want.Eye_Blink_L = want.Eye_Blink_R = 1;
    blinkT = 2.4 + Math.random() * 3.5;
    setTimeout(() => { want.Eye_Blink_L = want.Eye_Blink_R = 0; }, 110);
  }
  exprT -= dt;
  if (exprT <= 0) {
    exprT = 5 + Math.random() * 5;
    face(["neutral", "happy", "frown", "surprise"][(Math.random() * 4) | 0]);
  }
}

const soft = [
  { name: "L_Breast", x: 0, z: 0, vx: 0, vz: 0, stiff: 26, damp: 7.2, max: 0.38, grav: 0.55 },
  { name: "R_Breast", x: 0, z: 0, vx: 0, vz: 0, stiff: 26, damp: 7.2, max: 0.38, grav: 0.55 },
  { name: "L_Glute", x: 0, z: 0, vx: 0, vz: 0, stiff: 34, damp: 9.0, max: 0.22, grav: 0.25 },
  { name: "R_Glute", x: 0, z: 0, vx: 0, vz: 0, stiff: 34, damp: 9.0, max: 0.22, grav: 0.25 },
];
const prevHip = new THREE.Vector3();
let hipReady = false;

function tickWalk(dt, moving) {
  walkT += dt * (moving ? 7.4 : 1.7);
  if (!moving) return;
  const t = walkT;
  const swing = Math.sin(t) * 0.38;
  boneQ("L_Thigh", swing, 0, 0);
  boneQ("R_Thigh", -swing, 0, 0);
  boneQ("L_Calf", Math.max(0, -Math.sin(t)) * 0.42, 0, 0);
  boneQ("R_Calf", Math.max(0, Math.sin(t)) * 0.42, 0, 0);
  boneQ("L_Foot", Math.sin(t + 0.5) * -0.12, 0, 0);
  boneQ("R_Foot", Math.sin(t + Math.PI + 0.5) * -0.12, 0, 0);
  boneQ("L_Upperarm", 0, 0, -swing * 0.55);
  boneQ("R_Upperarm", 0, 0, -swing * 0.55);
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
  const drive = moving ? 1 : 0.45;
  const step = Math.min(dt, 1 / 60);
  for (const s of soft) {
    if (!bones[s.name] || !bindQ[s.name]) continue;
    const side = s.name.startsWith("R_") ? -1 : 1;
    const accX = -ax * 0.12 * drive + Math.sin(walkT) * 0.85 * drive * side;
    const accZ = -az * 0.12 * drive + Math.cos(walkT * 2) * 0.45 * drive + s.grav;
    s.vx += (accX - s.x * s.stiff - s.vx * s.damp) * step;
    s.vz += (accZ - s.z * s.stiff - s.vz * s.damp) * step;
    s.x += s.vx * step;
    s.z += s.vz * step;
    s.x = THREE.MathUtils.clamp(s.x, -s.max, s.max);
    s.z = THREE.MathUtils.clamp(s.z, -s.max, s.max);
    boneQ(s.name, s.z, 0, s.x);
  }
}

function tickBreathe(t) {
  const b = Math.sin(t * 1.55) * 0.028;
  boneQ("Spine02", b, 0, 0);
  boneQ("Spine01", b * 0.45, 0, 0);
}

function headLookAt(dt) {
  const cam = XR_ON() ? renderer.xr.getCamera() : camera;
  cam.getWorldPosition(_v);
  const dx = _v.x - avatar.position.x;
  const dz = _v.z - avatar.position.z;
  if (dx * dx + dz * dz < 0.05) return;
  const yaw = Math.atan2(dx, dz);
  avatar.rotation.y = THREE.MathUtils.damp(avatar.rotation.y, yaw, 4, dt);
  const dy = _v.y - 1.45;
  const pitch = THREE.MathUtils.clamp(dy * 0.15, -0.18, 0.18);
  boneQ("Head", pitch, 0, 0);
}

const clock = new THREE.Clock();
banner("LOADING MIRA…");
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
    const h = Math.max(size.y, 0.2);
    const sc = 1.68 / h;
    root.scale.setScalar(sc);
    avatar.add(root);
    marker.visible = false;
    ready = true;
    if (loadEl) loadEl.remove();
    banner("WASD · click Desktop look · skin maps + soft tissue");
    face("happy");
    console.log("mira bones", Object.keys(bones).length, "skel", !!skeleton, "size", size);
    console.log("has", ["Head", "L_Thigh", "L_Breast", "R_Breast", "L_Glute", "R_Glute"].map((n) => n + ":" + !!bones[n]).join(" "));
  },
  (x) => {
    if (x.total && loadEl) loadEl.textContent = "LOADING MIRA  " + Math.round((x.loaded / x.total) * 100) + "%";
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

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  desktopMove(dt);
  const moving = miraWander(dt);
  if (ready) {
    tickExpr(dt);
    tickMorphs(dt);
    restoreBind();
    tickBreathe(clock.elapsedTime);
    tickWalk(dt, moving);
    if (!moving) headLookAt(dt);
    tickSoft(dt, moving);
    if (skeleton) skeleton.update();
    blob.position.x = avatar.position.x;
    blob.position.z = avatar.position.z;
  }
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);

async function enterXr() {
  if (!navigator.xr) {
    banner("WebXR not available — use Quest Browser or Desktop look");
    return;
  }
  try {
    let session;
    try {
      session = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["local-floor"] });
    } catch {
      session = await navigator.xr.requestSession("immersive-vr", { requiredFeatures: ["local-floor"] });
    }
    await renderer.xr.setSession(session);
    renderer.xr.setReferenceSpaceType("local-floor");
    if (ui) ui.style.display = "none";
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    floor.material.opacity = 0.12;
    floor.material.transparent = true;
    if (QUEST) renderer.xr.setFramebufferScaleFactor(0.85);
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
