import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const ASSET = "/human/assets/mira.glb?v=4";
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

scene.add(new THREE.HemisphereLight(0xfff3e4, 0x3a3028, 1.2));
const key = new THREE.DirectionalLight(0xfff0d8, 2.2);
key.position.set(1.4, 3.2, 2.8);
scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(8, 48),
  new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

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
    const next = mats.map((m) => {
      const hair = isHairMat(m, o);
      const lit = new THREE.MeshStandardMaterial({
        map: m && m.map ? m.map : null,
        color: 0xffffff,
        roughness: hair ? 0.42 : 0.48,
        metalness: 0,
        side: hair ? THREE.DoubleSide : THREE.FrontSide,
        transparent: false,
        depthWrite: true,
        alphaTest: hair ? 0.48 : 0,
        alphaHash: hair && !QUEST,
      });
      if (hair && !QUEST) lit.alphaTest = 0.35;
      if (lit.map) lit.map.colorSpace = THREE.SRGBColorSpace;
      lit.name = (m && m.name) || o.name || "";
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

const springs = {
  L_Breast: { x: 0, z: 0, vx: 0, vz: 0, stiff: 22, damp: 6.5, gain: 0.18 },
  R_Breast: { x: 0, z: 0, vx: 0, vz: 0, stiff: 22, damp: 6.5, gain: 0.18 },
  Head: { x: 0, z: 0, vx: 0, vz: 0, stiff: 14, damp: 5, gain: 0.08 },
};

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

function tickSprings(dt, moving) {
  const acc = moving ? 1 : 0.2;
  const driveX = Math.sin(walkT) * acc;
  const driveZ = Math.cos(walkT * 2) * acc;
  for (const name of ["L_Breast", "R_Breast", "Head"]) {
    const s = springs[name];
    const side = name === "R_Breast" ? -1 : 1;
    s.vx += (driveX * s.gain * side - s.x * s.stiff - s.vx * s.damp) * dt;
    s.vz += (driveZ * s.gain - s.z * s.stiff - s.vz * s.damp) * dt;
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    if (name === "Head") continue;
    const b = bones[name];
    const q0 = bindQ[name];
    if (!b || !q0) continue;
    _e.set(s.z, 0, s.x, "XYZ");
    _q.setFromEuler(_e);
    b.quaternion.copy(q0).multiply(_q);
  }
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
    banner("WASD · click Desktop look · skinned walk + hair cards");
    face("happy");
    console.log("mira bones", Object.keys(bones).length, "skel", !!skeleton, "size", size);
    console.log("has", ["Head", "L_Thigh", "L_Breast", "R_Breast"].map((n) => n + ":" + !!bones[n]).join(" "));
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
    tickWalk(dt, moving);
    if (!moving) headLookAt(dt);
    tickSprings(dt, moving);
    if (skeleton) skeleton.update();
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
    floor.material.opacity = 0.15;
    floor.material.transparent = true;
    if (QUEST) renderer.xr.setFramebufferScaleFactor(0.85);
  } catch (e) {
    banner(String(e.message || e));
  }
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
