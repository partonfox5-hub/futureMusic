import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const ASSET = "/human2/assets/mira.glb?v=1";
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

const hemi = new THREE.HemisphereLight(0xfff3e4, 0x3a3028, 0.55);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff0d8, 1.35);
key.position.set(1.4, 3.2, 2.8);
scene.add(key);
const fill = new THREE.AmbientLight(0xffffff, 0.22);
scene.add(fill);
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
} catch (e) {
  console.warn("env", e);
}

const PRESETS = {
  1: () => { key.color.set(0xfff0d8); key.intensity = 1.35; hemi.intensity = 0.55; renderer.toneMappingExposure = 1.12; },
  2: () => { key.color.set(0xe8f0ff); key.intensity = 1.05; hemi.intensity = 0.7; renderer.toneMappingExposure = 1.0; },
  3: () => { key.color.set(0xffdcc8); key.intensity = 0.7; hemi.intensity = 0.35; renderer.toneMappingExposure = 0.92; },
};

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
addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Digit1") PRESETS[1]();
  if (e.code === "Digit2") PRESETS[2]();
  if (e.code === "Digit3") PRESETS[3]();
});
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

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

function isHairMat(m, o) {
  const n = ((m && m.name) || "") + " " + (o.name || "");
  return /transp|eyelash|hair/i.test(n) || !!(m && m.alphaMap);
}

function wrapSkin(m) {
  if (!m || m.userData.wrapped) return;
  m.userData.wrapped = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    if (typeof prev === "function") prev(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_fragment_end>",
      `#include <lights_fragment_end>
       reflectedLight.indirectDiffuse += diffuseColor.rgb * 0.10;`
    );
  };
  m.needsUpdate = true;
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
      if (!m) return m;
      const hair = isHairMat(m, o);
      if (hair && !QUEST && THREE.MeshPhysicalMaterial) {
        const phys = new THREE.MeshPhysicalMaterial({
          map: m.map || null,
          color: 0xffffff,
          roughness: 0.4,
          metalness: 0,
          anisotropy: 0.65,
          side: THREE.DoubleSide,
          transparent: false,
          depthWrite: true,
          alphaTest: 0.4,
        });
        if (phys.map) phys.map.colorSpace = THREE.SRGBColorSpace;
        phys.name = m.name || "hair";
        return phys;
      }
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
      if (m.normalMap) {
        m.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
        m.normalScale.set(1.1, 1.1);
      }
      m.metalness = 0;
      if (m.roughness == null || m.roughness === 1) m.roughness = hair ? 0.42 : 0.48;
      m.side = hair ? THREE.DoubleSide : THREE.FrontSide;
      m.depthWrite = true;
      if (hair) {
        m.transparent = false;
        m.alphaTest = QUEST ? 0.48 : 0.4;
        m.alphaHash = !QUEST;
      } else if (!/eye|cornea|tooth|teeth/i.test(m.name || "")) {
        wrapSkin(m);
      }
      m.needsUpdate = true;
      return m;
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
    want.Eye_Squint_L = want.Eye_Squint_R = 0.12;
  } else if (kind === "frown") {
    want.Mouth_Frown_L = want.Mouth_Frown_R = 0.68;
    want.Brow_Drop_L = want.Brow_Drop_R = 0.4;
    want.Brow_Compress_L = want.Brow_Compress_R = 0.25;
    want.Nose_Sneer_L = want.Nose_Sneer_R = 0.12;
  } else if (kind === "surprise") {
    want.Brow_Raise_Inner_L = want.Brow_Raise_Inner_R = 0.5;
    want.Brow_Raise_Outer_L = want.Brow_Raise_Outer_R = 0.35;
    want.Eye_Wide_L = want.Eye_Wide_R = 0.45;
    want.Jaw_Open = 0.18;
    want.V_Lip_Open = 0.15;
  } else if (kind === "pucker") {
    want.Mouth_Pucker_Up_L = want.Mouth_Pucker_Up_R = 0.55;
    want.Mouth_Funnel_Up_L = want.Mouth_Funnel_Up_R = 0.25;
    want.Mouth_Press_L = want.Mouth_Press_R = 0.15;
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

function tickWalk(moving) {
  if (!moving) return;
  const t = walkT;
  const swing = Math.sin(t) * 0.36;
  addE("L_Thigh", swing, 0, 0);
  addE("R_Thigh", -swing, 0, 0);
  addE("L_Calf", Math.max(0, -Math.sin(t)) * 0.4, 0, 0);
  addE("R_Calf", Math.max(0, Math.sin(t)) * 0.4, 0, 0);
  addE("L_Foot", Math.sin(t + 0.5) * -0.1, 0, 0);
  addE("R_Foot", Math.sin(t + Math.PI + 0.5) * -0.1, 0, 0);
  addE("L_Upperarm", 0, 0, -swing * 0.5);
  addE("R_Upperarm", 0, 0, -swing * 0.5);
  addE("L_Forearm", Math.max(0, Math.sin(t + Math.PI)) * 0.18, 0, 0);
  addE("R_Forearm", Math.max(0, Math.sin(t)) * 0.18, 0, 0);
  addE("Hip", Math.sin(t * 2) * 0.02, Math.sin(t) * 0.045, 0);
  addE("Spine02", 0, Math.sin(t) * 0.035, 0);
}

function tickIdle(t) {
  addE("Hip", 0, Math.sin(t * 0.65) * 0.025, Math.sin(t * 0.5) * 0.018);
  addE("L_Clavicle", Math.sin(t * 0.8) * 0.03, 0, Math.sin(t * 0.9) * 0.025);
  addE("R_Clavicle", Math.sin(t * 0.8 + 0.7) * 0.03, 0, Math.sin(t * 0.9 + 1) * 0.025);
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
  if (!moving) {
    avatar.rotation.y = THREE.MathUtils.damp(avatar.rotation.y, yawWorld, 3.2, dt);
  }
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
  addE("Spine02", pitch * 0.06, yaw * 0.07, 0);
  addE("L_Eye", pitch * 0.5, yaw * 0.55, 0);
  addE("R_Eye", pitch * 0.5, yaw * 0.55, 0);
}

const clock = new THREE.Clock();
banner("LOADING MIRA PASS 2…");
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
    root.scale.setScalar(1.68 / h);
    avatar.add(root);
    marker.visible = false;
    ready = true;
    if (loadEl) loadEl.remove();
    banner("PASS 2 · WASD · 1/2/3 lights · eyes lead gaze");
    face("happy");
    const dict = morphMeshes[0] && morphMeshes[0].morphTargetDictionary;
    console.log("pass2 bones", Object.keys(bones).length, "morphs", dict && Object.keys(dict).length, "size", size);
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
  statsEl.textContent = `PASS 2  ${fps.toFixed(0)} fps  tris ${inf.triangles}  calls ${inf.calls}`;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  desktopMove(dt);
  const moving = miraWander(dt);
  walkT += dt * (moving ? 7.4 : 1.7);
  if (ready) {
    tickExpr(dt);
    restoreBind();
    tickBreathe(clock.elapsedTime);
    if (moving) tickWalk(true);
    else tickIdle(clock.elapsedTime);
    tickGaze(dt, moving);
    tickSoft(dt, moving);
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
