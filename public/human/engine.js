import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const ASSET = "/human/assets/mira.glb?v=2";
const MORPH = [
  "Mouth_Smile_L", "Mouth_Smile_R", "Mouth_Frown_L", "Mouth_Frown_R",
  "Eye_Blink_L", "Eye_Blink_R", "Jaw_Open", "V_Open",
  "Brow_Raise_Inner_L", "Brow_Raise_Inner_R", "Brow_Drop_L", "Brow_Drop_R",
  "Cheek_Raise_L", "Cheek_Raise_R",
];

const loadEl = document.getElementById("load");
const hintEl = document.getElementById("hint");
const panel = document.getElementById("panel");
const ui = document.getElementById("ui");

function banner(msg) {
  if (loadEl) loadEl.textContent = msg;
  if (hintEl) hintEl.textContent = msg;
  console.warn(msg);
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
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
let ready = false;
let morphMeshes = [];
let hairMeshes = [];
const springs = { x: 0, z: 0, vx: 0, vz: 0 };
let walkT = 0;
let blinkT = 2;
let exprT = 4;
const want = Object.fromEntries(MORPH.map((n) => [n, 0]));
const cur = { ...want };

function applySkin(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const next = mats.map((m) => {
      const hair = !!(m && (m.transparent || /transp|eyelash|hair/i.test(m.name || o.name || "")));
      const lit = new THREE.MeshStandardMaterial({
        map: m && m.map ? m.map : null,
        color: 0xffffff,
        roughness: hair ? 0.55 : 0.48,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: hair,
        depthWrite: !hair,
        alphaTest: hair ? 0.12 : 0,
      });
      if (lit.map) lit.map.colorSpace = THREE.SRGBColorSpace;
      return lit;
    });
    o.material = next.length === 1 ? next[0] : next;
    if (o.morphTargetDictionary) morphMeshes.push(o);
    if (/hair/i.test(o.name || "")) hairMeshes.push(o);
    o.frustumCulled = false;
    o.castShadow = false;
  });
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

function tickWalk(dt, moving) {
  walkT += dt * (moving ? 7.2 : 1.6);
  const bob = moving ? Math.abs(Math.sin(walkT)) * 0.03 : Math.sin(walkT * 0.7) * 0.006;
  avatar.position.y = bob;
  const a = moving ? 1 : 0.15;
  springs.vx += (-springs.x * 18 - springs.vx * 5.5) * dt;
  springs.vz += (a * Math.sin(walkT) * 0.04 - springs.z * 22 - springs.vz * 6) * dt;
  springs.x += springs.vx * dt;
  springs.z += springs.vz * dt;
  for (const h of hairMeshes) {
    h.rotation.z = springs.x * 0.35;
    h.rotation.x = springs.z * 0.2;
  }
}

function lookAtPlayer() {
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const p = new THREE.Vector3();
  cam.getWorldPosition(p);
  const dx = p.x - avatar.position.x;
  const dz = p.z - avatar.position.z;
  if (dx * dx + dz * dz < 0.04) return;
  avatar.rotation.y = Math.atan2(dx, dz);
}

const clock = new THREE.Clock();
banner("LOADING MIRA…");
new GLTFLoader().load(
  ASSET,
  (gltf) => {
    const root = gltf.scene;
    applySkin(root);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    root.position.sub(center);
    root.position.y += size.y * 0.5;
    const h = Math.max(size.y, 0.2);
    root.scale.setScalar(1.68 / h);
    root.position.multiplyScalar(1.68 / h);
    avatar.add(root);
    marker.visible = false;
    ready = true;
    if (loadEl) loadEl.remove();
    banner("WASD · click Desktop look · she walks, looks, smiles");
    face("happy");
    console.log("mira size", size, "morphs", morphMeshes.map((m) => m.morphTargetDictionary));
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
  if (ready && !moving) lookAtPlayer();
  if (ready) {
    tickExpr(dt);
    tickMorphs(dt);
    tickWalk(dt, moving);
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
  } catch (e) {
    banner(String(e.message || e));
  }
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
