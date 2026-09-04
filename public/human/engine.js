import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

const ASSET = "/human/assets/mira.glb";
const MORPH = [
  "Mouth_Smile_L", "Mouth_Smile_R", "Mouth_Frown_L", "Mouth_Frown_R",
  "Eye_Blink_L", "Eye_Blink_R", "Jaw_Open", "V_Open",
  "Brow_Raise_Inner_L", "Brow_Raise_Inner_R", "Brow_Drop_L", "Brow_Drop_R",
  "Cheek_Raise_L", "Cheek_Raise_R",
];

const loadEl = document.getElementById("load");
const hintEl = document.getElementById("hint");
const panel = document.getElementById("panel");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true;
renderer.setClearColor(0x000000, 0);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = null;
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 40);
camera.position.set(0, 1.6, 2.4);

const hemi = new THREE.HemisphereLight(0xfff4ea, 0x2a2420, 0.85);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffe6c8, 1.35);
key.position.set(2.2, 4.2, 3.4);
scene.add(key);
const fill = new THREE.PointLight(0x88aadd, 0.35, 8);
fill.position.set(-2, 1.6, 1.5);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6, 48),
  new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.92, transparent: true, opacity: 0.35 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.object);
const keys = {};
addEventListener("keydown", (e) => { keys[e.code] = true; });
addEventListener("keyup", (e) => { keys[e.code] = false; });

document.getElementById("desk").onclick = () => {
  panel.parentElement.hidden = true;
  controls.lock();
};
document.getElementById("enter").onclick = enterXr;

const factory = new XRControllerModelFactory();
for (const i of [0, 1]) {
  const grip = renderer.xr.getControllerGrip(i);
  grip.add(factory.createControllerModel(grip));
  scene.add(grip);
  scene.add(renderer.xr.getController(i));
}

let avatar = new THREE.Group();
avatar.position.set(0, 0, 0);
scene.add(avatar);
let morphMeshes = [];
let morphDict = {};
let hairMeshes = [];
const springs = { x: 0, z: 0, vx: 0, vz: 0 };
let walkT = 0;
let blinkT = 2;
let exprT = 3;
let expr = "neutral";
const want = Object.fromEntries(MORPH.map((n) => [n, 0]));
const cur = { ...want };

function applySkin(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map((m) => {
      const lit = new THREE.MeshPhysicalMaterial({
        map: m.map || null,
        normalMap: m.normalMap || null,
        roughness: 0.42,
        metalness: 0,
        sheen: 0.35,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color(0xc07060),
        clearcoat: 0.06,
        clearcoatRoughness: 0.6,
        transparent: m.transparent || m.name.includes("Transparency") || m.name.includes("Eyelash"),
        opacity: m.transparent ? 0.96 : 1,
        side: m.transparent ? THREE.DoubleSide : THREE.FrontSide,
        color: m.color || 0xffffff,
      });
      if (lit.map) lit.map.colorSpace = THREE.SRGBColorSpace;
      lit.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uSpring = { value: new THREE.Vector2() };
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", `#include <common>\nuniform float uTime; uniform vec2 uSpring;`)
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            float chest = smoothstep(1.05, 1.18, transformed.y) * (1.0 - smoothstep(1.38, 1.52, transformed.y));
            float side = smoothstep(0.04, 0.10, abs(transformed.x)) * (1.0 - smoothstep(0.16, 0.22, abs(transformed.x)));
            transformed.z += uSpring.y * chest * side * 0.9;
            transformed.x += uSpring.x * chest * side * 0.55;
            transformed.y += chest * side * abs(uSpring.y) * 0.12;
            `
          );
        lit.userData.shader = shader;
      };
      return lit;
    });
    if (o.morphTargetDictionary) {
      morphMeshes.push(o);
      Object.assign(morphDict, o.morphTargetDictionary);
    }
    if ((o.material[0] && o.material[0].transparent) || /hair/i.test(o.name)) hairMeshes.push(o);
    o.frustumCulled = false;
    o.castShadow = false;
  });
}

function setMorph(name, v) {
  if (name in want) want[name] = v;
}

function tickMorphs(dt) {
  for (const n of MORPH) cur[n] = THREE.MathUtils.damp(cur[n], want[n], 8, dt);
  for (const mesh of morphMeshes) {
    const d = mesh.morphTargetDictionary;
    const inf = mesh.morphTargetInfluences;
    if (!d || !inf) continue;
    for (const n of MORPH) {
      if (n in d) inf[d[n]] = cur[n];
    }
  }
}

function face(kind) {
  expr = kind;
  for (const n of MORPH) want[n] = 0;
  if (kind === "happy") {
    want.Mouth_Smile_L = want.Mouth_Smile_R = 0.82;
    want.Cheek_Raise_L = want.Cheek_Raise_R = 0.4;
  } else if (kind === "sad" || kind === "frown") {
    want.Mouth_Frown_L = want.Mouth_Frown_R = 0.7;
    want.Brow_Drop_L = want.Brow_Drop_R = 0.35;
  } else if (kind === "surprise") {
    want.Eye_Wide_L = want.Eye_Wide_R = 0.7;
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
    const pick = ["neutral", "happy", "frown", "surprise"][(Math.random() * 4) | 0];
    face(pick);
  }
}

function tickWalk(dt, moving) {
  walkT += dt * (moving ? 7.2 : 1.6);
  const bob = moving ? Math.abs(Math.sin(walkT)) * 0.03 : Math.sin(walkT * 0.7) * 0.006;
  avatar.position.y = bob;
  const a = moving ? 1 : 0.15;
  springs.vx += (-avatar.position.x * 0 - springs.x * 18 - springs.vx * 5.5) * dt;
  springs.vz += (a * Math.sin(walkT) * 0.04 - springs.z * 22 - springs.vz * 6) * dt;
  springs.x += springs.vx * dt;
  springs.z += springs.vz * dt;
  for (const mesh of morphMeshes) {
    const sh = mesh.material;
    const list = Array.isArray(sh) ? sh : [sh];
    for (const m of list) {
      if (m.userData.shader) {
        m.userData.shader.uniforms.uTime.value = walkT;
        m.userData.shader.uniforms.uSpring.value.set(springs.x, springs.z);
      }
    }
  }
  for (const h of hairMeshes) {
    h.rotation.z = springs.x * 0.4;
    h.rotation.x = springs.z * 0.25;
  }
}

function lookAtPlayer() {
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const p = new THREE.Vector3();
  cam.getWorldPosition(p);
  const t = avatar.position.clone();
  t.y = p.y;
  avatar.lookAt(t.x, avatar.position.y, t.z);
}

const clock = new THREE.Clock();
const loader = new GLTFLoader();
loader.load(
  ASSET,
  (gltf) => {
    const root = gltf.scene;
    root.rotation.y = Math.PI;
    const box = new THREE.Box3().setFromObject(root);
    const h = box.max.y - box.min.y;
    if (h > 0.2 && h < 4) {
      const s = 1.68 / h;
      root.scale.setScalar(s);
      root.position.y -= box.min.y * s;
    } else {
      root.scale.setScalar(1);
    }
    applySkin(root);
    avatar.add(root);
    loadEl.remove();
    hintEl.textContent = "WASD  ·  click look  ·  she walks, looks, smiles, blinks";
    face("happy");
  },
  (x) => {
    if (x.total) loadEl.textContent = "LOADING MIRA  " + Math.round((x.loaded / x.total) * 100) + "%";
  },
  (e) => {
    loadEl.textContent = "LOAD FAILED";
    console.error(e);
  }
);

function desktopMove(dt) {
  if (!controls.isLocked) return;
  const sp = (keys.ShiftLeft ? 2.4 : 1.4) * dt;
  if (keys.KeyW) controls.moveForward(sp);
  if (keys.KeyS) controls.moveForward(-sp);
  if (keys.KeyA) controls.moveRight(-sp);
  if (keys.KeyD) controls.moveRight(sp);
}

let miraWalk = 0;
function miraWander(dt) {
  miraWalk -= dt;
  if (miraWalk < 0) {
    miraWalk = 3 + Math.random() * 4;
    avatar.userData.dest = new THREE.Vector3((Math.random() - 0.5) * 3.5, 0, (Math.random() - 0.5) * 3.5);
  }
  const dest = avatar.userData.dest;
  if (!dest) return false;
  const to = dest.clone().sub(avatar.position);
  to.y = 0;
  if (to.length() < 0.12) return false;
  to.normalize();
  avatar.position.addScaledVector(to, dt * 0.55);
  const yaw = Math.atan2(to.x, to.z);
  avatar.rotation.y = THREE.MathUtils.damp(avatar.rotation.y, yaw, 4, dt);
  return true;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  desktopMove(dt);
  const moving = miraWander(dt);
  if (!moving) lookAtPlayer();
  tickExpr(dt);
  tickMorphs(dt);
  tickWalk(dt, moving);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);

async function enterXr() {
  if (!navigator.xr) {
    hintEl.textContent = "WebXR not available — use Quest Browser or desktop look";
    return;
  }
  try {
    let session;
    try {
      session = await navigator.xr.requestSession("immersive-ar", { requiredFeatures: ["local-floor"], optionalFeatures: ["bounded-floor", "hand-tracking"] });
    } catch {
      session = await navigator.xr.requestSession("immersive-vr", { requiredFeatures: ["local-floor"], optionalFeatures: ["bounded-floor"] });
    }
    await renderer.xr.setSession(session);
    renderer.xr.setReferenceSpaceType("local-floor");
    panel.parentElement.hidden = true;
    floor.material.opacity = 0.04;
  } catch (e) {
    hintEl.textContent = String(e.message || e);
  }
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
