import * as THREE from "three";

const canvas = document.getElementById("c");
const hudLine = document.getElementById("hud-line");
const hudHint = document.getElementById("hud-hint");
const startEl = document.getElementById("start");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 40);
const rig = new THREE.Group();
scene.add(rig);
rig.add(camera);
camera.position.set(0, 1.55, 0.4);

scene.add(new THREE.HemisphereLight(0xfff2dc, 0x1a2230, 1.1));
const sun = new THREE.DirectionalLight(0xffe6b8, 0.7);
sun.position.set(2, 6, 3);
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6, 48),
  new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.92, metalness: 0.05 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const reticle = new THREE.Mesh(
  new THREE.SphereGeometry(0.025, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xe6b35c })
);
scene.add(reticle);

const beam = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
  new THREE.LineBasicMaterial({ color: 0xe6b35c, transparent: true, opacity: 0.55 })
);
scene.add(beam);

const loader = new THREE.TextureLoader();
const cards = [];
const draw = [];
const hand = [];
const handVis = [];
const live = [];
let selected = 0;
let ready = false;
let stickLatch = 0;
const keys = {};
const mouse = { x: 0, y: 0, dx: 0, dy: 0, lock: false, lmb: false };

function pretty(id) {
  return id.replace(/^iridex_/, "").replace(/_/g, " ");
}
function guessElement(id) {
  id = id.toLowerCase();
  if (/ember|magma|solar/.test(id)) return "ember";
  if (/tide|frost|jelly/.test(id)) return "tide";
  if (/grove|moss|stag/.test(id)) return "grove";
  if (/void|owl/.test(id)) return "void";
  return "aether";
}
function guessRole(id) {
  id = id.toLowerCase();
  if (/standard|shiny/.test(id) && !/legendary|spectral|holo/.test(id)) return "spell";
  return "summon";
}
function elementColor(e) {
  return ({
    ember: 0xff6b2e,
    tide: 0x40b8ff,
    grove: 0x59d966,
    aether: 0xc78cff,
    void: 0xd9bf4d,
  })[e] || 0xd9bf4d;
}

function makeCardMesh(tex, w, h, tint = 0xffffff) {
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: tint, transparent: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return mesh;
}

function shuffleIntoDraw() {
  draw.length = 0;
  draw.push(...cards);
  for (let i = draw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [draw[i], draw[j]] = [draw[j], draw[i]];
  }
}
function fillHand(n = 5) {
  while (hand.length < n && draw.length) hand.push(draw.pop());
  if (selected >= hand.length) selected = Math.max(0, hand.length - 1);
}
function cycle(dir) {
  if (!hand.length) return;
  selected = (selected + dir + hand.length) % hand.length;
  rebuildHand();
}
function playSelected() {
  if (!hand.length) return null;
  const c = hand.splice(selected, 1)[0];
  fillHand();
  rebuildHand();
  return c;
}

function rebuildHand() {
  for (const m of handVis) scene.remove(m);
  handVis.length = 0;
  hand.forEach((c, i) => {
    const m = makeCardMesh(c.tex, 0.08, 0.112, i === selected ? 0xffffff : 0xb0b0b0);
    m.userData.card = c;
    scene.add(m);
    handVis.push(m);
  });
  const c = hand[selected];
  hudLine.textContent = c ? pretty(c.id) + " · " + c.role : "empty hand";
}

function layoutHand(now) {
  const xr = renderer.xr.isPresenting;
  const cam = xr ? renderer.xr.getCamera(camera) : camera;
  cam.updateMatrixWorld();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  cam.getWorldPosition(pos);
  cam.getWorldQuaternion(quat);
  const left = renderer.xr.getController(0);
  if (xr && left && left.visible) {
    pos.copy(left.position);
    quat.copy(left.quaternion);
    pos.add(new THREE.Vector3(0, 0.04, 0.08).applyQuaternion(quat));
  } else {
    pos.add(new THREE.Vector3(-0.18, -0.12, -0.38).applyQuaternion(quat));
  }
  const n = handVis.length;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) * 0.5) * 0.09;
    const z = i === selected ? 0.03 : 0;
    const m = handVis[i];
    m.position.copy(pos).add(new THREE.Vector3(x, 0, z).applyQuaternion(quat));
    m.quaternion.copy(quat);
    m.rotateX(-0.32);
    m.rotateY(Math.PI);
    const s = i === selected ? 1.18 : 1;
    m.scale.set(s, s, 1);
  }
}

function aim() {
  const right = renderer.xr.getController(1);
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, 0, -1);
  if (renderer.xr.isPresenting && right) {
    origin.copy(right.position);
    dir.set(0, 0, -1).applyQuaternion(right.quaternion);
  } else {
    camera.getWorldPosition(origin);
    camera.getWorldDirection(dir);
  }
  const hit = origin.clone().addScaledVector(dir, 2.4);
  const t = origin.y > 0.05 ? origin.y / Math.max(0.05, -dir.y) : 2;
  if (t > 0 && t < 8) {
    hit.copy(origin).addScaledVector(dir, t);
    hit.y = Math.max(0.02, hit.y);
  }
  return { origin, dir, hit };
}

function burst(pos, color) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
  );
  m.position.copy(pos);
  m.userData.life = 0.7;
  m.userData.kind = "burst";
  scene.add(m);
  live.push(m);
}

function playAt(hit, forceSpell) {
  const card = playSelected();
  if (!card) return;
  const spell = forceSpell || card.role === "spell";
  const mesh = makeCardMesh(card.tex, spell ? 0.22 : 0.42, spell ? 0.31 : 0.52);
  mesh.position.copy(hit);
  mesh.position.y += spell ? 0.15 : 0.55;
  mesh.userData.life = spell ? 1.1 : 32;
  mesh.userData.kind = spell ? "spell" : "summon";
  mesh.userData.base = mesh.position.clone();
  mesh.userData.t = 0;
  scene.add(mesh);
  live.push(mesh);
  if (spell) burst(mesh.position, elementColor(card.element));
}

function tickLive(dt) {
  camera.updateMatrixWorld();
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  for (let i = live.length - 1; i >= 0; i--) {
    const m = live[i];
    m.userData.t = (m.userData.t || 0) + dt;
    m.userData.life -= dt;
    if (m.userData.kind === "summon") {
      m.position.y = m.userData.base.y + 0.08 * Math.sin(m.userData.t * 2.2);
      const look = m.position.clone().sub(camPos); look.y = 0;
      if (look.lengthSq() > 0.0001) m.lookAt(m.position.clone().add(look));
    } else if (m.userData.kind === "spell") {
      const s = 0.4 + (2.2 - Math.max(0, m.userData.life)) * 0.9;
      m.scale.setScalar(s);
    } else if (m.userData.kind === "burst") {
      m.scale.setScalar(1 + (0.7 - m.userData.life) * 3);
      m.material.opacity = Math.max(0, m.userData.life);
    }
    if (m.userData.life <= 0) {
      scene.remove(m);
      live.splice(i, 1);
    }
  }
}

function desktopMove(dt) {
  if (renderer.xr.isPresenting) return;
  const speed = 1.8;
  const f = new THREE.Vector3();
  camera.getWorldDirection(f); f.y = 0; f.normalize();
  const r = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), f);
  r.y = 0; r.normalize();
  if (keys.KeyW) rig.position.addScaledVector(f, speed * dt);
  if (keys.KeyS) rig.position.addScaledVector(f, -speed * dt);
  if (keys.KeyA) rig.position.addScaledVector(r, -speed * dt);
  if (keys.KeyD) rig.position.addScaledVector(r, speed * dt);
  if (mouse.lock) {
    rig.rotation.y -= mouse.dx * 0.0025;
    camera.rotation.x -= mouse.dy * 0.0025;
    camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x));
    mouse.dx = mouse.dy = 0;
  }
}

function pollXrStick(now) {
  const session = renderer.xr.getSession();
  if (!session) return;
  for (const src of session.inputSources) {
    if (!src.gamepad || src.handedness !== "right") continue;
    const ax = src.gamepad.axes[2] ?? src.gamepad.axes[0] ?? 0;
    if (Math.abs(ax) > 0.55 && now > stickLatch) {
      cycle(ax > 0 ? 1 : -1);
      stickLatch = now + 0.22;
    }
    const grip = (src.gamepad.buttons[1] && src.gamepad.buttons[1].pressed) || false;
    src._iridexGrip = grip;
  }
}

async function loadDeck() {
  const res = await fetch("/games/iridex-cards/cards.json");
  const list = await res.json();
  await Promise.all(list.map((file) => new Promise((resolve) => {
    loader.load("/games/iridex-cards/cards/" + file, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const id = file.replace(/\.png$/i, "");
      cards.push({ id, file, tex, element: guessElement(id), role: guessRole(id) });
      resolve();
    }, undefined, resolve);
  })));
  shuffleIntoDraw();
  fillHand();
  rebuildHand();
  ready = true;
  hudHint.textContent = cards.length + " cards. Q/E or stick cycle. Click / trigger play. Shift or grip casts.";
}

function begin(mode) {
  startEl.hidden = true;
  if (mode === "desk") {
    canvas.requestPointerLock?.();
    return;
  }
  const kind = mode === "ar" ? "immersive-ar" : "immersive-vr";
  navigator.xr.requestSession(kind, { optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"] })
    .then((session) => renderer.xr.setSession(session))
    .catch(() => {
      if (kind === "immersive-ar") {
        navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] })
          .then((session) => renderer.xr.setSession(session))
          .catch(() => { startEl.hidden = false; });
      } else startEl.hidden = false;
    });
}

document.getElementById("go-vr").addEventListener("click", () => begin("vr"));
document.getElementById("go-ar").addEventListener("click", () => begin("ar"));
document.getElementById("go-desk").addEventListener("click", () => begin("desk"));

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyQ") cycle(-1);
  if (e.code === "KeyE") cycle(1);
  if (e.code === "Space") {
    e.preventDefault();
    const { hit } = aim();
    playAt(hit, e.shiftKey);
  }
  if (e.code === "KeyR") {
    shuffleIntoDraw();
    hand.length = 0;
    fillHand();
    rebuildHand();
  }
  if (e.code === "Escape") document.exitPointerLock?.();
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
window.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    mouse.lmb = true;
    if (startEl.hidden) canvas.requestPointerLock?.();
    if (ready && startEl.hidden) {
      const { hit } = aim();
      playAt(hit, keys.ShiftLeft || keys.ShiftRight);
    }
  }
});
window.addEventListener("mouseup", () => { mouse.lmb = false; });
window.addEventListener("mousemove", (e) => {
  mouse.dx += e.movementX;
  mouse.dy += e.movementY;
  mouse.lock = document.pointerLockElement === canvas;
});
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const ctrlR = renderer.xr.getController(1);
ctrlR.addEventListener("selectstart", () => {
  if (!ready) return;
  const { hit } = aim();
  const session = renderer.xr.getSession();
  let grip = false;
  if (session) {
    for (const src of session.inputSources) {
      if (src.handedness === "right" && src.gamepad && src.gamepad.buttons[1]) {
        grip = src.gamepad.buttons[1].pressed;
      }
    }
  }
  playAt(hit, grip);
});
scene.add(renderer.xr.getController(0));
scene.add(ctrlR);

renderer.xr.addEventListener("sessionstart", () => { camera.position.set(0, 0, 0); startEl.hidden = true; });
renderer.xr.addEventListener("sessionend", () => { camera.position.set(0, 1.55, 0.4); startEl.hidden = false; });

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  const now = clock.elapsedTime;
  desktopMove(dt);
  pollXrStick(now);
  if (ready) {
    const { origin, hit } = aim();
    reticle.position.copy(hit);
    beam.geometry.setFromPoints([origin, hit]);
    layoutHand(now);
    tickLive(dt);
  }
  renderer.render(scene, camera);
});

loadDeck();
