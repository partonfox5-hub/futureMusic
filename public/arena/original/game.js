import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

const R = 42;
const keys = Object.create(null);
const mouse = { x: 0, y: 0, locked: false };
let yaw = 0, pitch = 0;
let power = 1000;
let score = 0;
let t0 = performance.now();
let playing = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x041018);
scene.fog = new THREE.FogExp2(0x041018, 0.012);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 200);
camera.position.set(0, 1.6, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const dummyVr = VRButton.createButton(renderer);
dummyVr.style.display = "none";
document.body.appendChild(dummyVr);

scene.add(new THREE.HemisphereLight(0x88ccff, 0x112233, 0.7));
const keyL = new THREE.PointLight(0x66ffaa, 40, 80);
keyL.position.set(0, 8, 0);
scene.add(keyL);
const rim = new THREE.PointLight(0xff6622, 18, 60);
rim.position.set(-12, -4, 10);
scene.add(rim);

function hullTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#143a88";
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      g.fillStyle = (x + y) % 2 ? "#1c4cb0" : "#0e2a66";
      g.fillRect(x * 32, y * 32, 32, 32);
      g.strokeStyle = "#3cf0ff";
      g.lineWidth = 1;
      g.strokeRect(x * 32 + 1, y * 32 + 1, 30, 30);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 12);
  return tex;
}

const hull = new THREE.Mesh(
  new THREE.SphereGeometry(R, 48, 32),
  new THREE.MeshStandardMaterial({
    map: hullTexture(),
    side: THREE.BackSide,
    roughness: 0.55,
    metalness: 0.25,
  })
);
scene.add(hull);

const globe = new THREE.Mesh(
  new THREE.SphereGeometry(7.5, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0x33ff77, wireframe: true, transparent: true, opacity: 0.85 })
);
scene.add(globe);
const tape = new THREE.Mesh(
  new THREE.TorusGeometry(8.2, 0.18, 8, 64),
  new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x114433, metalness: 0.8, roughness: 0.3 })
);
tape.rotation.x = Math.PI / 2.4;
scene.add(tape);

const vel = new THREE.Vector3();
const tmp = new THREE.Vector3();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

const drones = [];
function spawnDrone() {
  const m = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: 0xff3366, emissive: 0x660022, metalness: 0.6, roughness: 0.25 })
  );
  const u = Math.random() * Math.PI * 2;
  const v = (Math.random() - 0.5) * Math.PI;
  const rr = 10 + Math.random() * 22;
  m.position.set(Math.cos(u) * Math.cos(v) * rr, Math.sin(v) * rr, Math.sin(u) * Math.cos(v) * rr);
  m.userData.hp = 2;
  m.userData.spin = (Math.random() - 0.5) * 2;
  scene.add(m);
  drones.push(m);
}
for (let i = 0; i < 14; i++) spawnDrone();

const bolts = [];
function fire(origin, dir) {
  const b = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6),
    new THREE.MeshBasicMaterial({ color: 0xff3311 })
  );
  b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  b.position.copy(origin).addScaledVector(dir, 0.8);
  b.userData.dir = dir.clone().normalize();
  b.userData.life = 1.15;
  scene.add(b);
  bolts.push(b);
  power = Math.max(0, power - 2);
}

const factory = new XRControllerModelFactory();
function makeController(i) {
  const c = renderer.xr.getController(i);
  c.addEventListener("selectstart", () => {
    const d = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion);
    fire(c.getWorldPosition(tmp.clone()), d);
  });
  scene.add(c);
  const grip = renderer.xr.getControllerGrip(i);
  grip.add(factory.createControllerModel(grip));
  scene.add(grip);
  return c;
}
makeController(0);
makeController(1);

const powerEl = document.getElementById("power");
const scoreEl = document.getElementById("score");
function fmtTime() {
  const s = Math.floor((performance.now() - t0) / 1000);
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  return m + ":" + String(s % 60).padStart(2, "0");
}

addEventListener("keydown", (e) => { keys[e.code] = true; });
addEventListener("keyup", (e) => { keys[e.code] = false; });
addEventListener("mousemove", (e) => {
  if (!mouse.locked) return;
  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = Math.max(-1.35, Math.min(1.35, pitch));
});
addEventListener("mousedown", (e) => {
  if (!playing) return;
  if (e.button === 0 && mouse.locked) {
    camera.getWorldDirection(fwd);
    fire(camera.position, fwd);
  }
});
renderer.domElement.addEventListener("click", () => {
  if (playing) renderer.domElement.requestPointerLock();
});
document.addEventListener("pointerlockchange", () => {
  mouse.locked = document.pointerLockElement === renderer.domElement;
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function startDesk() {
  document.body.classList.add("playing");
  document.getElementById("start").style.display = "none";
  playing = true;
  t0 = performance.now();
  renderer.domElement.requestPointerLock();
}
function startVr() {
  document.body.classList.add("playing");
  document.getElementById("start").style.display = "none";
  playing = true;
  t0 = performance.now();
  dummyVr.click();
}
document.getElementById("go-desk").onclick = startDesk;
document.getElementById("go-vr").onclick = startVr;

function tickDesktop(dt) {
  if (renderer.xr.isPresenting) return;
  camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
  camera.getWorldDirection(fwd);
  right.crossVectors(fwd, up).normalize();
  const acc = 18;
  if (keys.KeyW) vel.addScaledVector(fwd, acc * dt);
  if (keys.KeyS) vel.addScaledVector(fwd, -acc * dt);
  if (keys.KeyA) vel.addScaledVector(right, -acc * dt);
  if (keys.KeyD) vel.addScaledVector(right, acc * dt);
  if (keys.Space) vel.y += acc * dt;
  if (keys.ControlLeft || keys.KeyC) vel.y -= acc * dt;
  vel.multiplyScalar(Math.max(0, 1 - 2.2 * dt));
  camera.position.addScaledVector(vel, dt);
  if (camera.position.length() > R - 2) {
    camera.position.setLength(R - 2);
    vel.multiplyScalar(0.4);
  }
}

function tickXr(dt) {
  if (!renderer.xr.isPresenting) return;
  const src = renderer.xr.getCamera();
  const gp = renderer.xr.getSession()?.inputSources || [];
  for (const s of gp) {
    const axes = s.gamepad && s.gamepad.axes;
    if (!axes || axes.length < 4) continue;
    const lx = axes[2] || axes[0] || 0;
    const ly = axes[3] || axes[1] || 0;
    src.getWorldDirection(fwd);
    right.crossVectors(fwd, up).normalize();
    vel.addScaledVector(right, lx * 16 * dt);
    vel.addScaledVector(fwd, -ly * 16 * dt);
  }
  vel.multiplyScalar(Math.max(0, 1 - 2.2 * dt));
  camera.position.addScaledVector(vel, dt);
  if (camera.position.length() > R - 2) camera.position.setLength(R - 2);
}

function tickWorld(dt) {
  globe.rotation.y += dt * 0.15;
  tape.rotation.z += dt * 0.4;
  for (const d of drones) {
    d.rotation.y += d.userData.spin * dt;
    tmp.copy(camera.position).sub(d.position);
    const dist = tmp.length();
    if (dist < 1.1) {
      power = Math.max(0, power - 40 * dt);
    } else {
      d.position.addScaledVector(tmp.normalize(), 1.6 * dt);
    }
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.position.addScaledVector(b.userData.dir, 48 * dt);
    b.userData.life -= dt;
    for (const d of drones) {
      if (d.visible && d.position.distanceTo(b.position) < 1.05) {
        d.userData.hp -= 1;
        b.userData.life = 0;
        if (d.userData.hp <= 0) {
          d.visible = false;
          score += 25;
          power = Math.min(1400, power + 18);
          setTimeout(() => {
            d.visible = true;
            d.userData.hp = 2;
            const u = Math.random() * Math.PI * 2;
            const v = (Math.random() - 0.5) * Math.PI;
            const rr = 16 + Math.random() * 18;
            d.position.set(Math.cos(u) * Math.cos(v) * rr, Math.sin(v) * rr, Math.sin(u) * Math.cos(v) * rr);
          }, 700);
        }
      }
    }
    if (b.userData.life <= 0 || b.position.length() > R) {
      scene.remove(b);
      bolts.splice(i, 1);
    }
  }
  power = Math.max(0, power - 4 * dt);
  const x = (power / 1000).toFixed(2);
  powerEl.textContent = `POWER ${Math.round(power)}/1000  x${x}`;
  scoreEl.textContent = `${fmtTime()} · ${score}`;
}

let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (playing) {
    tickDesktop(dt);
    tickXr(dt);
    tickWorld(dt);
  }
  renderer.render(scene, camera);
});
