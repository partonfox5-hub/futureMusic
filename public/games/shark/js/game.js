import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

const CELL = 78;
const FLOOR = 0;
const CEIL = 92;
const TORP_SPEED = 44;
const YT_MAX = 540;
const SHARK_HITS = 3;

const keys = new Set();
const mouse = { lock: false, dragging: false, lx: 0, ly: 0 };
let yaw = 0;
let pitch = 0;
let lookYaw = 0;
let lookPitch = 0.16;
let mode = "pilot";
let running = false;
let dead = false;
let xrOn = false;
let hull = 100;
let oxygen = 100;
let sharkHp = SHARK_HITS;
let sharkState = "patrol";
let sharkTimer = 14;
let sharkFace = 0;
let retreatT = 0;
let msgT = 0;
let msg = "";
let repairHold = 0;
let fireCd = 0;
let speed = 0;
let shake = 0;
let sonarSweep = 0;
let huntPing = 0;
let xrGrab = null;
const xrPrev = new THREE.Vector3();

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const tmp3 = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

function setMsg(t, d) {
  msg = t;
  msgT = d ?? 2.4;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function wrapPi(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function headingFrom(y) {
  forward.set(-Math.sin(y), 0, -Math.cos(y));
  right.set(Math.cos(y), 0, -Math.sin(y));
}

function skinMat(hex, extra) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.72,
    metalness: 0.08,
    ...extra,
  });
}

function makeSharkGeom() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  inner.rotation.y = Math.PI / 2;
  const skin = skinMat(0x4a5560, { emissive: 0x0a1014 });
  const belly = skinMat(0x8a9098);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, 11, 6, 10), skin);
  body.rotation.z = Math.PI / 2;
  inner.add(body);
  const under = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 8, 4, 8), belly);
  under.rotation.z = Math.PI / 2;
  under.position.y = -0.7;
  inner.add(under);
  const head = new THREE.Mesh(new THREE.ConeGeometry(2.1, 4.2, 8), skin);
  head.rotation.z = -Math.PI / 2;
  head.position.x = 8.2;
  inner.add(head);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.8), skin);
  jaw.position.set(7.4, -1.1, 0);
  inner.add(jaw);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.4, 4), skin);
  fin.position.set(0.4, 2.6, 0);
  inner.add(fin);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.6, 2.8), skin);
  tail.position.x = -8.2;
  inner.add(tail);
  const pec = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 3.6), skin);
  pec.position.set(2.2, -0.6, 0);
  inner.add(pec);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x111111 })
  );
  eye.position.set(7.6, 0.5, 0.9);
  inner.add(eye);
  inner.add(eye.clone().translateZ(-1.8));
  g.userData.tail = tail;
  g.userData.jaw = jaw;
  g.userData.skin = skin;
  return g;
}

function makeWhaleGeom() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  inner.rotation.y = Math.PI / 2;
  const skin = skinMat(0x3d4a58, { emissive: 0x080c12 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(2.6, 12, 6, 10), skin);
  body.rotation.z = Math.PI / 2;
  inner.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 6), skin);
  head.scale.set(1.4, 0.9, 0.85);
  head.position.x = 7.4;
  inner.add(head);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.2, 3.2), skin);
  tail.position.x = -8.5;
  inner.add(tail);
  const flip = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 3.8), skin);
  flip.position.set(1.2, -1.4, 0);
  inner.add(flip);
  g.userData.tail = tail;
  g.scale.setScalar(2.15);
  return g;
}

function makeStatue() {
  const g = makeSharkGeom();
  g.scale.setScalar(0.55);
  g.traverse((o) => {
    if (o.isMesh) {
      o.material = new THREE.MeshStandardMaterial({ color: 0x6a645c, roughness: 0.95 });
    }
  });
  return g;
}

const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
document.getElementById("vr-slot").appendChild(VRButton.createButton(renderer));
if (navigator.xr && navigator.xr.isSessionSupported) {
  navigator.xr.isSessionSupported("immersive-vr").then((ok) => {
    if (!ok) document.getElementById("vr-slot").style.display = "none";
  });
} else {
  document.getElementById("vr-slot").style.display = "none";
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010308);
scene.fog = new THREE.FogExp2(0x031018, 0.015);

const cam = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 280);
cam.rotation.order = "YXZ";

const sub = new THREE.Group();
sub.position.set(0, 22, 0);
scene.add(sub);

const cockpit = new THREE.Group();
sub.add(cockpit);
cam.position.set(0, 0.32, 0.12);
cockpit.add(cam);

const evaDummy = new THREE.Group();
scene.add(evaDummy);

(function buildCockpit() {
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a2228, metalness: 0.65, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x0b0e12,
    metalness: 0.4,
    roughness: 0.5,
    side: THREE.BackSide,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), dark);
  shell.rotation.x = Math.PI;
  cockpit.add(shell);
  const dash = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.22, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1a2228, metalness: 0.65, roughness: 0.35, emissive: 0x0a1812 })
  );
  dash.position.set(0, -0.42, -0.85);
  cockpit.add(dash);
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.82, 24),
    new THREE.MeshStandardMaterial({
      color: 0x223344,
      transparent: true,
      opacity: 0.16,
      metalness: 0.9,
      roughness: 0.1,
      side: THREE.DoubleSide,
    })
  );
  glass.position.set(0, 0.22, -1.05);
  cockpit.add(glass);
})();

const wheel = new THREE.Group();
wheel.position.set(0, -0.22, -0.72);
cockpit.add(wheel);
(function buildWheel() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xc49a58, roughness: 0.45, metalness: 0.18, emissive: 0x2a1808 });
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24), mat));
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.02), mat);
    spoke.rotation.z = (i * Math.PI) / 2;
    wheel.add(spoke);
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.05, 10),
    new THREE.MeshStandardMaterial({ color: 0xccc4a0, metalness: 0.8 })
  );
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
})();

const fireBtn = new THREE.Mesh(
  new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12),
  new THREE.MeshStandardMaterial({ color: 0xb02018, emissive: 0x400000, metalness: 0.4, roughness: 0.4 })
);
fireBtn.position.set(0.48, -0.28, -0.7);
cockpit.add(fireBtn);

const exterior = new THREE.Group();
sub.add(exterior);
(function buildExterior() {
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2a3840, metalness: 0.75, roughness: 0.38 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 3.2, 6, 12), hullMat);
  body.rotation.x = Math.PI / 2;
  exterior.add(body);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.7, 8), hullMat);
  tower.position.set(0, 1.05, 0.15);
  exterior.add(tower);
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 12, 8),
    new THREE.MeshStandardMaterial({
      color: 0x1c2a32,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.5,
    })
  );
  nose.position.set(0, 0.05, -2.05);
  exterior.add(nose);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.55), hullMat);
  fin.position.set(0, -0.15, 1.35);
  exterior.add(fin);
  const prop = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.05, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.8 })
  );
  prop.position.set(0, 0, 2.05);
  exterior.add(prop);
  exterior.userData.prop = prop;
  exterior.visible = false;
})();

const crack = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 8, 8),
  new THREE.MeshBasicMaterial({ color: 0xff5533 })
);
crack.visible = false;
crack.position.set(0.95, -0.15, 0.35);
exterior.add(crack);

const lamp = new THREE.SpotLight(0xc8deff, 48, 78, 0.46, 0.42, 1.05);
lamp.position.set(0, 0.15, -1.6);
lamp.target.position.set(0, -6, -28);
sub.add(lamp);
sub.add(lamp.target);
const fill = new THREE.PointLight(0x4a7a5a, 2.4, 5);
fill.position.set(0, 0.12, -0.15);
cockpit.add(fill);
const dashLamp = new THREE.PointLight(0xffd8a0, 1.6, 2.8);
dashLamp.position.set(0, 0.02, -0.45);
cockpit.add(dashLamp);
const helm = new THREE.SpotLight(0xb8d4ff, 10, 24, 0.55, 0.45, 1.2);
helm.visible = false;
cam.add(helm);
helm.target.position.set(0, -0.2, -10);
cam.add(helm.target);
scene.add(new THREE.AmbientLight(0x0c1820, 0.28));
scene.add(new THREE.HemisphereLight(0x152838, 0x080604, 0.22));

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(480, 48),
  new THREE.MeshStandardMaterial({ color: 0x161410, roughness: 0.98 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = FLOOR;
scene.add(floor);

const kelp = [];
function scatterWorld() {
  const stone = new THREE.MeshStandardMaterial({ color: 0x5a564c, roughness: 0.9 });
  const rust = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.8, metalness: 0.3 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x1a4a44, emissive: 0x0a2a22, roughness: 0.7 });
  for (let i = 0; i < 32; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 14 + Math.random() * 210;
    const ruin = new THREE.Group();
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(1.6 + Math.random(), 4 + Math.random() * 8, 1.6 + Math.random()),
      Math.random() > 0.7 ? glow : stone
    );
    col.position.y = 3;
    ruin.add(col);
    if (Math.random() > 0.42) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.35, 6, 12, Math.PI), rust);
      arch.position.y = 5.2;
      ruin.add(arch);
    }
    ruin.position.set(Math.cos(ang) * r, FLOOR, Math.sin(ang) * r);
    ruin.rotation.y = Math.random() * 6;
    scene.add(ruin);
  }
  for (let i = 0; i < 10; i++) {
    const st = makeStatue();
    const ang = (i / 10) * Math.PI * 2;
    const r = 22 + (i % 3) * 24;
    st.position.set(Math.cos(ang) * r, FLOOR + 1.4, Math.sin(ang) * r);
    st.rotation.y = ang + Math.PI;
    scene.add(st);
  }
  for (let i = 0; i < 40; i++) {
    const k = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, 4 + Math.random() * 6, 5),
      new THREE.MeshStandardMaterial({ color: 0x163028, roughness: 0.9 })
    );
    const ang = Math.random() * 6.28;
    const r = 8 + Math.random() * 160;
    k.position.set(Math.cos(ang) * r, 3, Math.sin(ang) * r);
    k.userData.ph = Math.random() * 6;
    scene.add(k);
    kelp.push(k);
  }
  for (let i = 0; i < 7; i++) {
    const p = new THREE.PointLight(0x1a6658, 1.4, 18);
    const ang = (i / 7) * 6.28;
    p.position.set(Math.cos(ang) * (30 + i * 8), 2.5, Math.sin(ang) * (30 + i * 8));
    scene.add(p);
  }
}
scatterWorld();

const cellWalls = new THREE.Group();
scene.add(cellWalls);
(function buildCell() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0c241c,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const hx = CELL * 2;
  const hy = CELL * 1.4;
  const hz = CELL * 2;
  const faces = [
    { g: new THREE.PlaneGeometry(hz, hy), p: [CELL, 0, 0], r: [0, Math.PI / 2, 0] },
    { g: new THREE.PlaneGeometry(hz, hy), p: [-CELL, 0, 0], r: [0, -Math.PI / 2, 0] },
    { g: new THREE.PlaneGeometry(hx, hy), p: [0, 0, CELL], r: [0, 0, 0] },
    { g: new THREE.PlaneGeometry(hx, hy), p: [0, 0, -CELL], r: [0, Math.PI, 0] },
    { g: new THREE.PlaneGeometry(hx, hz), p: [0, hy / 2, 0], r: [-Math.PI / 2, 0, 0] },
    { g: new THREE.PlaneGeometry(hx, hz), p: [0, -hy / 2, 0], r: [Math.PI / 2, 0, 0] },
  ];
  faces.forEach((f) => {
    const m = new THREE.Mesh(f.g, mat);
    m.position.set(f.p[0], f.p[1], f.p[2]);
    m.rotation.set(f.r[0], f.r[1], f.r[2]);
    cellWalls.add(m);
  });
})();

const cellHelper = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL * 2, CELL * 1.4, CELL * 2)),
  new THREE.LineBasicMaterial({ color: 0x14332a, transparent: true, opacity: 0.28 })
);
scene.add(cellHelper);

const shark = makeSharkGeom();
shark.scale.setScalar(2.55);
shark.position.set(CELL * 0.92, 22, 0);
scene.add(shark);

const whales = [makeWhaleGeom(), makeWhaleGeom(), makeWhaleGeom()];
whales.forEach((w, i) => {
  w.position.set((i - 1) * 48, 16 + i * 7, -40 - i * 22);
  scene.add(w);
});

const tanks = [];
function spawnTank() {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.72, 10),
    new THREE.MeshStandardMaterial({
      color: 0x3a6a88,
      emissive: 0x1a5068,
      metalness: 0.5,
      roughness: 0.4,
    })
  );
  const light = new THREE.PointLight(0x3aa0c8, 1.6, 7);
  m.add(light);
  const ang = Math.random() * 6.28;
  const r = 9 + Math.random() * 36;
  m.position.set(
    sub.position.x + Math.cos(ang) * r,
    clamp(sub.position.y + (Math.random() - 0.5) * 12, 5, 48),
    sub.position.z + Math.sin(ang) * r
  );
  scene.add(m);
  tanks.push(m);
}
for (let i = 0; i < 8; i++) spawnTank();

const torps = [];
const torpGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.72, 8);
torpGeo.rotateX(Math.PI / 2);
const torpMat = new THREE.MeshStandardMaterial({ color: 0xc8b070, metalness: 0.7, emissive: 0x332200 });
for (let i = 0; i < 12; i++) {
  const m = new THREE.Mesh(torpGeo, torpMat);
  m.visible = false;
  m.userData.v = new THREE.Vector3();
  m.userData.life = 0;
  const glow = new THREE.PointLight(0xffcc66, 1.2, 6);
  m.add(glow);
  scene.add(m);
  torps.push(m);
}

const sparkGeo = new THREE.SphereGeometry(0.06, 4, 4);
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
const sparks = [];
for (let i = 0; i < 28; i++) {
  const m = new THREE.Mesh(sparkGeo, sparkMat);
  m.visible = false;
  m.userData.v = new THREE.Vector3();
  m.userData.life = 0;
  scene.add(m);
  sparks.push(m);
}

function burst(pos, n) {
  let used = 0;
  sparks.forEach((s) => {
    if (s.userData.life > 0 || used >= n) return;
    used += 1;
    s.visible = true;
    s.position.copy(pos);
    s.userData.v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(9);
    s.userData.life = 0.45 + Math.random() * 0.35;
  });
}

const bubbleCount = 140;
const bubblePos = new Float32Array(bubbleCount * 3);
for (let i = 0; i < bubbleCount; i++) {
  bubblePos[i * 3] = (Math.random() - 0.5) * 70;
  bubblePos[i * 3 + 1] = Math.random() * 60;
  bubblePos[i * 3 + 2] = (Math.random() - 0.5) * 70;
}
const bubbleGeo = new THREE.BufferGeometry();
bubbleGeo.setAttribute("position", new THREE.BufferAttribute(bubblePos, 3));
const bubbles = new THREE.Points(
  bubbleGeo,
  new THREE.PointsMaterial({ color: 0x88c0c8, size: 0.12, transparent: true, opacity: 0.35 })
);
scene.add(bubbles);

const ctrl0 = renderer.xr.getController(0);
const ctrl1 = renderer.xr.getController(1);
cockpit.add(ctrl0);
cockpit.add(ctrl1);
[ctrl0, ctrl1].forEach((c) => {
  const gizmo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6),
    new THREE.MeshBasicMaterial({ color: 0x88ffcc })
  );
  gizmo.rotation.x = Math.PI / 2;
  c.add(gizmo);
  c.addEventListener("selectstart", () => {
    if (!running || dead) return;
    fireBtn.getWorldPosition(tmp);
    c.getWorldPosition(tmp2);
    fire();
  });
  c.addEventListener("squeezestart", () => {
    wheel.getWorldPosition(tmp);
    if (c.getWorldPosition(tmp2).distanceTo(tmp) < 0.62) {
      xrGrab = c;
      xrPrev.copy(c.position);
    }
  });
  c.addEventListener("squeezeend", () => {
    if (xrGrab === c) xrGrab = null;
  });
});

const audio = {
  ctx: null,
  src: null,
  el: null,
  tracks: [],
  yt: [],
  ytPlayer: null,
  skipped: new Set(),
  i: 0,
};

function sfx(freq, dur, type, vol) {
  if (!audio.ctx) return;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type || "sine";
  o.frequency.setValueAtTime(freq, audio.ctx.currentTime);
  g.gain.setValueAtTime(vol || 0.07, audio.ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + dur);
  o.connect(g);
  g.connect(audio.ctx.destination);
  o.start();
  o.stop(audio.ctx.currentTime + dur);
}

function startHiss(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.035;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1400;
  bp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.value = 0.11;
  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start();
}

function radioFilter(ctx, node) {
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2700;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 280;
  const dist = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 128 - 1;
    curve[i] = Math.tanh(x * 1.7) * 0.82;
  }
  dist.curve = curve;
  node.connect(hp);
  hp.connect(lp);
  lp.connect(dist);
  dist.connect(ctx.destination);
}

function playLocal(i) {
  if (!audio.tracks.length) return;
  audio.i = ((i % audio.tracks.length) + audio.tracks.length) % audio.tracks.length;
  if (!audio.el) {
    audio.el = new Audio();
    audio.el.crossOrigin = "anonymous";
    audio.el.addEventListener("ended", () => playLocal(audio.i + 1));
  }
  audio.el.src = audio.tracks[audio.i];
  audio.el.play().catch(() => {});
  if (audio.ctx && !audio.src) {
    audio.src = audio.ctx.createMediaElementSource(audio.el);
    radioFilter(audio.ctx, audio.src);
  }
  document.getElementById("radio-now").textContent = "TAPE " + (audio.i + 1);
}

function loadYtApi() {
  return new Promise((res) => {
    if (window.YT && window.YT.Player) return res();
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    window.onYouTubeIframeAPIReady = () => res();
    document.head.appendChild(s);
    s.onerror = () => res();
  });
}

async function playYt(i) {
  if (!audio.yt.length) return;
  if (audio.skipped.size >= audio.yt.length) {
    document.getElementById("radio-now").textContent = "NO SHORT SIGNAL";
    return;
  }
  audio.i = ((i % audio.yt.length) + audio.yt.length) % audio.yt.length;
  if (audio.skipped.has(audio.i)) return playYt(audio.i + 1);
  await loadYtApi();
  if (!window.YT || !window.YT.Player) {
    document.getElementById("radio-now").textContent = "NO SIGNAL";
    return;
  }
  const id = audio.yt[audio.i];
  const onPlaying = (player) => {
    const d = player.getDuration();
    if (d >= YT_MAX) {
      audio.skipped.add(audio.i);
      playYt(audio.i + 1);
    } else {
      document.getElementById("radio-now").textContent = "YT · " + id;
    }
  };
  if (!audio.ytPlayer) {
    audio.ytPlayer = new YT.Player("yt", {
      width: 1,
      height: 1,
      videoId: id,
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: (e) => e.target.playVideo(),
        onError: () => {
          audio.skipped.add(audio.i);
          playYt(audio.i + 1);
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) onPlaying(e.target);
          if (e.data === YT.PlayerState.ENDED) playYt(audio.i + 1);
        },
      },
    });
  } else {
    audio.ytPlayer.loadVideoById(id);
  }
}

async function startRadio() {
  document.getElementById("radio-now").textContent = "TUNING…";
  try {
    const r = await fetch("/api/shark/radio");
    const j = await r.json();
    if (j.source === "local" && j.tracks.length) {
      audio.tracks = j.tracks;
      playLocal(0);
    } else {
      audio.yt = j.videos || [];
      if (audio.yt.length) playYt(0);
      else document.getElementById("radio-now").textContent = "NO SIGNAL";
    }
  } catch (e) {
    document.getElementById("radio-now").textContent = "NO SIGNAL";
  }
}

function fire() {
  if (mode !== "pilot" || fireCd > 0 || hull <= 0 || !running || dead) return;
  const t = torps.find((x) => x.userData.life <= 0);
  if (!t) return;
  cam.getWorldDirection(tmp);
  cam.getWorldPosition(tmp2);
  t.position.copy(tmp2).add(tmp.multiplyScalar(1.5));
  cam.getWorldDirection(t.userData.v);
  t.userData.v.multiplyScalar(TORP_SPEED);
  tmp3.copy(t.position).add(t.userData.v);
  t.lookAt(tmp3);
  t.userData.life = 3.4;
  t.visible = true;
  fireCd = 0.42;
  sfx(140, 0.18, "sawtooth", 0.05);
  sfx(420, 0.12, "square", 0.03);
}

function die(reason) {
  if (dead) return;
  dead = true;
  running = false;
  document.getElementById("dead-reason").textContent = reason;
  document.getElementById("dead").hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
}

function damage(n) {
  if (dead) return;
  if (hull <= 0) {
    die("The hull folds. The cell takes you.");
    return;
  }
  hull = clamp(hull - n, 0, 100);
  crack.visible = hull < 100;
  shake = 0.55;
  sfx(60, 0.5, "sawtooth", 0.12);
  setMsg(hull <= 0 ? "HULL DEAD — EXIT AND REPAIR" : "IMPACT — EXIT TO PATCH THE HULL", 3.2);
}

function setSharkMood() {
  if (!shark.userData.skin) return;
  const em =
    sharkState === "attack" ? 0x4a1808 : sharkState === "hunt" ? 0x2a1408 : 0x0a1014;
  shark.userData.skin.emissive.setHex(em);
}

function wallPoint(face, t, y) {
  const hx = CELL * 0.94;
  const hz = CELL * 0.94;
  const cx = sub.position.x;
  const cz = sub.position.z;
  const u = Math.sin(t) * 0.82;
  switch (face & 3) {
    case 0:
      return tmp.set(cx + hx, y, cz + u * hz);
    case 1:
      return tmp.set(cx - hx, y, cz + u * hz);
    case 2:
      return tmp.set(cx + u * hx, y, cz + hz);
    default:
      return tmp.set(cx + u * hx, y, cz - hz);
  }
}

function sharkAi(dt) {
  cellHelper.position.copy(sub.position);
  cellWalls.position.copy(sub.position);
  sharkTimer -= dt;
  if (retreatT > 0) {
    retreatT -= dt;
    sharkState = "retreat";
    if (retreatT <= 0) {
      sharkState = "patrol";
      sharkHp = SHARK_HITS;
      sharkTimer = 10 + Math.random() * 8;
      setSharkMood();
    }
  }
  if (sharkState === "patrol" && sharkTimer < 0) {
    sharkState = Math.random() > 0.4 ? "hunt" : "patrol";
    sharkTimer = sharkState === "hunt" ? 7 + Math.random() * 5 : 9 + Math.random() * 10;
    if (sharkState === "hunt") {
      setMsg("SONAR CONTACT — IT HAS YOUR SCENT", 2.6);
      sfx(880, 0.08, "sine", 0.05);
    }
    if (Math.random() > 0.5) sharkFace = (sharkFace + 1 + (Math.random() * 2) | 0) & 3;
    setSharkMood();
  }

  const t = performance.now() * 0.00018;
  const y = clamp(sub.position.y + Math.sin(t * 0.7) * 7, FLOOR + 8, CEIL - 8);
  let want;
  if (sharkState === "patrol" || sharkState === "retreat") {
    want = wallPoint(sharkFace, t, y);
  } else if (sharkState === "hunt") {
    huntPing -= dt;
    if (huntPing <= 0) {
      huntPing = 1.6;
      sfx(740, 0.06, "sine", 0.04);
    }
    want = wallPoint(sharkFace, t * 1.4, sub.position.y + 3);
    tmp3.copy(sub.position).sub(shark.position);
    if (shark.position.distanceTo(sub.position) < 22) {
      sharkState = "attack";
      setSharkMood();
      setMsg("SHARK INBOUND — FIRE", 2.2);
      shake = 0.2;
    }
  } else {
    want = tmp.copy(sub.position);
    want.y += 0.4;
    if (shark.position.distanceTo(sub.position) < 11) {
      burst(sub.position, 16);
      damage(34);
      sharkState = "patrol";
      sharkTimer = 11;
      sharkFace = (sharkFace + 1) & 3;
      setSharkMood();
    }
  }

  tmp2.copy(want).sub(shark.position);
  const dist = tmp2.length();
  const spd = sharkState === "attack" ? 24 : sharkState === "hunt" ? 13 : sharkState === "retreat" ? 16 : 8.5;
  if (dist > 0.08) {
    tmp3.copy(shark.position).add(tmp2);
    shark.lookAt(tmp3);
    shark.position.add(tmp2.multiplyScalar(Math.min(1, (spd * dt) / dist)));
  }
  const wag = Math.sin(performance.now() * 0.008) * (sharkState === "attack" ? 0.55 : 0.32);
  if (shark.userData.tail) shark.userData.tail.rotation.y = wag;
  if (shark.userData.jaw) shark.userData.jaw.rotation.x = sharkState === "attack" ? 0.5 : 0.08;
}

function whaleAi(dt) {
  whales.forEach((w, i) => {
    const t = performance.now() * 0.00007 + i * 2.1;
    const cx = sub.position.x + Math.cos(t) * (58 + i * 16);
    const cz = sub.position.z + Math.sin(t * 0.82) * (64 + i * 12);
    const wy = 11 + Math.sin(t * 1.6) * 7 + i * 3;
    tmp.set(cx, wy, cz);
    w.position.lerp(tmp, Math.min(1, 0.35 * dt));
    tmp2.set(cx + Math.cos(t + 0.2) * 4, wy, cz + Math.sin(t + 0.2) * 4);
    w.lookAt(tmp2);
    if (w.userData.tail) w.userData.tail.rotation.y = Math.sin(performance.now() * 0.004 + i) * 0.4;
  });
}

function updateTorps(dt) {
  fireCd = Math.max(0, fireCd - dt);
  torps.forEach((t) => {
    if (t.userData.life <= 0) return;
    t.userData.life -= dt;
    t.position.add(tmp.copy(t.userData.v).multiplyScalar(dt));
    if (t.position.distanceTo(shark.position) < 14) {
      t.userData.life = 0;
      t.visible = false;
      burst(t.position, 10);
      sharkHp -= 1;
      sfx(90, 0.2, "triangle", 0.08);
      setMsg("HIT " + sharkHp, 1.1);
      if (sharkHp <= 0) {
        sharkState = "retreat";
        retreatT = 26 + Math.random() * 18;
        sharkHp = SHARK_HITS;
        setSharkMood();
        setMsg("IT TURNS AWAY… FOR NOW", 3);
      } else if (sharkState === "attack") {
        sharkState = "hunt";
        setSharkMood();
      }
    }
    if (t.userData.life <= 0) t.visible = false;
  });
}

function updateTanks() {
  const p = mode === "eva" ? evaDummy.position : sub.position;
  for (let i = tanks.length - 1; i >= 0; i--) {
    const tk = tanks[i];
    tk.rotation.y += 0.02;
    tk.position.y += Math.sin(performance.now() * 0.002 + i) * 0.004;
    if (p.distanceTo(tk.position) < 1.7) {
      oxygen = clamp(oxygen + 38, 0, 100);
      scene.remove(tk);
      tanks.splice(i, 1);
      setMsg("O2 +", 1);
      sfx(520, 0.12, "sine", 0.05);
      spawnTank();
    }
  }
}

function updateFx(dt) {
  sparks.forEach((s) => {
    if (s.userData.life <= 0) return;
    s.userData.life -= dt;
    s.position.add(tmp.copy(s.userData.v).multiplyScalar(dt));
    s.userData.v.y += 2 * dt;
    if (s.userData.life <= 0) s.visible = false;
  });
  const arr = bubbleGeo.attributes.position.array;
  for (let i = 0; i < bubbleCount; i++) {
    arr[i * 3 + 1] += dt * (0.4 + (i % 5) * 0.12);
    if (arr[i * 3 + 1] > sub.position.y + 30) {
      arr[i * 3] = sub.position.x + (Math.random() - 0.5) * 50;
      arr[i * 3 + 1] = sub.position.y - 18;
      arr[i * 3 + 2] = sub.position.z + (Math.random() - 0.5) * 50;
    }
  }
  bubbleGeo.attributes.position.needsUpdate = true;
  kelp.forEach((k) => {
    k.rotation.z = Math.sin(performance.now() * 0.001 + k.userData.ph) * 0.18;
  });
}

function drawMap() {
  const c = document.getElementById("minimap");
  const g = c.getContext("2d");
  const w = (c.width = 168);
  const h = (c.height = 168);
  g.fillStyle = "#03110c";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#1c5a40";
  g.beginPath();
  g.arc(84, 84, 78, 0, Math.PI * 2);
  g.stroke();
  sonarSweep += 0.035;
  g.strokeStyle = "rgba(125,255,176,0.18)";
  g.beginPath();
  g.moveTo(84, 84);
  g.arc(84, 84, 78, sonarSweep, sonarSweep + 0.35);
  g.closePath();
  g.fillStyle = "rgba(125,255,176,0.05)";
  g.fill();
  const scale = 78 / (CELL * 1.12);
  g.save();
  g.translate(84, 84);
  g.rotate(-yaw);
  g.fillStyle = "#7dffb0";
  g.beginPath();
  g.moveTo(0, -7);
  g.lineTo(5, 6);
  g.lineTo(-5, 6);
  g.fill();
  g.restore();
  const blips = [shark.position, ...whales.map((w) => w.position)];
  g.fillStyle = "#e8d27a";
  blips.forEach((p) => {
    const dx = (p.x - sub.position.x) * scale;
    const dz = (p.z - sub.position.z) * scale;
    if (dx * dx + dz * dz > 76 * 76) return;
    g.beginPath();
    g.arc(84 + dx, 84 + dz, 4, 0, Math.PI * 2);
    g.fill();
  });
}

function hud() {
  document.getElementById("o2i").style.width = oxygen + "%";
  document.getElementById("huli").style.width = hull + "%";
  document.getElementById("o2b").className = "bar" + (oxygen < 25 ? " bad" : oxygen < 50 ? " warn" : "");
  document.getElementById("hulb").className = "bar" + (hull < 34 ? " bad" : hull < 70 ? " warn" : "");
  document.getElementById("mode").textContent = mode === "pilot" ? "PILOT" : "EVA";
  document.getElementById("sstat").textContent = sharkState.toUpperCase();
  document.getElementById("msg").textContent = msgT > 0 ? msg : "";
}

function parentControllers(to) {
  [ctrl0, ctrl1].forEach((c) => {
    if (c.parent) c.parent.remove(c);
    to.add(c);
  });
}

function enterEva() {
  if (mode === "eva") return;
  mode = "eva";
  cockpit.remove(cam);
  evaDummy.position.copy(sub.position);
  evaDummy.position.x += 2.3;
  evaDummy.position.y += 0.5;
  evaDummy.add(cam);
  cam.position.set(0, 0, 0);
  cam.rotation.set(0, 0, 0);
  lookYaw = yaw;
  lookPitch = 0;
  cockpit.visible = false;
  exterior.visible = true;
  helm.visible = true;
  parentControllers(evaDummy);
  setMsg("EVA — SWIM TO THE GLOW AND HOLD F", 3);
}

function enterPilot() {
  if (mode === "pilot") return;
  mode = "pilot";
  evaDummy.remove(cam);
  cockpit.add(cam);
  cam.position.set(0, 0.32, 0.12);
  cam.rotation.set(0, 0, 0);
  lookPitch = 0;
  lookYaw = yaw;
  pitch = 0;
  cockpit.visible = true;
  exterior.visible = false;
  helm.visible = false;
  parentControllers(cockpit);
  setMsg("HATCH SEALED", 1.4);
}

function tryToggleEva() {
  if (!running || dead) return;
  if (mode === "pilot" && hull < 100) enterEva();
  else if (mode === "eva" && evaDummy.position.distanceTo(sub.position) < 3.1 && hull >= 100) enterPilot();
}

function readXrMove(dt, move) {
  if (!xrOn) return;
  const session = renderer.xr.getSession();
  if (!session) return;
  for (const src of session.inputSources) {
    const a = src.gamepad && src.gamepad.axes;
    if (!a || a.length < 2) continue;
    const sx = a.length >= 4 ? a[2] : a[0];
    const sy = a.length >= 4 ? a[3] : a[1];
    if (Math.abs(sx) > 0.15) {
      if (src.handedness === "left") yaw -= sx * 1.6 * dt;
      else move.ax += sx;
    }
    if (Math.abs(sy) > 0.15) {
      if (src.handedness === "left") move.ay -= sy;
      else move.az += sy;
    }
  }
  if (xrGrab) {
    const d = tmp.copy(xrGrab.position).sub(xrPrev);
    yaw += d.x * 4.2;
    move.ay += d.y * 16;
    move.az -= d.z * 10;
    xrPrev.copy(xrGrab.position);
    wheel.rotation.z = -d.x * 6;
    wheel.rotation.x = d.y * 4;
  }
}

function step(dt) {
  if (!running) return;
  dt = Math.min(0.05, dt);
  const body = mode === "pilot" ? sub : evaDummy;
  const spd = mode === "pilot" ? (hull <= 0 ? 3.2 : 11) : 5.6;
  const move = { ax: 0, az: 0, ay: 0 };

  if (xrOn) readXrMove(dt, move);
  else {
    if (keys.has("KeyW") || keys.has("ArrowUp")) move.az -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) move.az += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) move.ax -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) move.ax += 1;
    if (keys.has("KeyQ")) move.ay -= 1;
    if (keys.has("KeyE")) move.ay += 1;
    if (mode === "pilot") {
      yaw = lookYaw;
      pitch = lookPitch;
    }
  }

  const hyaw = mode === "eva" ? lookYaw : yaw;
  headingFrom(hyaw);
  if (mode === "eva") {
    cam.getWorldDirection(forward);
    right.crossVectors(forward, up).normalize();
    if (right.lengthSq() < 0.001) right.set(1, 0, 0);
  }

  tmp.copy(forward).multiplyScalar(-move.az * spd * dt);
  tmp.add(tmp2.copy(right).multiplyScalar(move.ax * spd * dt));
  tmp.y += move.ay * spd * 0.72 * dt;
  body.position.add(tmp);
  body.position.y = clamp(body.position.y, FLOOR + 2.2, CEIL);
  speed = dt > 1e-5 ? tmp.length() / dt : 0;

  if (mode === "pilot") {
    sub.rotation.y = yaw;
    if (!xrOn) cam.rotation.set(pitch, 0, 0);
    else cam.rotation.set(0, 0, 0);
    if (!xrGrab) {
      wheel.rotation.z = THREE.MathUtils.damp(wheel.rotation.z, move.ax * 0.45, 6, dt);
      wheel.rotation.x = THREE.MathUtils.damp(wheel.rotation.x, -pitch * 0.25, 6, dt);
    }
    if (exterior.userData.prop) exterior.userData.prop.rotation.z += speed * dt * 4;
    if (shake > 0) {
      shake = Math.max(0, shake - dt);
      cam.position.x = (Math.random() - 0.5) * shake * 0.12;
      cam.position.y = 0.32 + (Math.random() - 0.5) * shake * 0.08;
    } else {
      cam.position.set(0, 0.32, 0.12);
    }
  } else {
    cam.rotation.set(lookPitch, lookYaw, 0);
    crack.getWorldPosition(tmp3);
    if (keys.has("KeyF") && evaDummy.position.distanceTo(tmp3) < 1.9 && hull < 100) {
      repairHold += dt;
      setMsg("PATCHING " + Math.min(99, Math.floor((repairHold / 3) * 100)) + "%", 0.25);
      if (repairHold > 3) {
        hull = 100;
        crack.visible = false;
        repairHold = 0;
        setMsg("HULL SEALED — RE-ENTER", 2);
        sfx(300, 0.2, "sine", 0.06);
      }
    } else repairHold = 0;
  }

  oxygen -= dt * (mode === "eva" ? 2.8 : 0.62);
  if (oxygen <= 0) {
    oxygen = 0;
    hull = Math.max(0, hull - dt * 10);
    setMsg("ANOXIA", 0.35);
    if (hull <= 0) die("No air. No surface. No more.");
  }
  msgT = Math.max(0, msgT - dt);
  sharkAi(dt);
  whaleAi(dt);
  updateTorps(dt);
  updateTanks();
  updateFx(dt);
  drawMap();
  hud();
}

let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  step(dt);
  renderer.render(scene, cam);
});

function applyLook(dx, dy) {
  lookYaw -= dx * 0.0022;
  lookPitch -= dy * 0.0022;
  lookPitch = clamp(lookPitch, -1.15, 1.15);
}

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "KeyF" && !e.repeat) tryToggleEva();
  if (e.code === "KeyR" && audio.tracks.length) playLocal(audio.i + 1);
  if (e.code === "KeyR" && audio.yt.length) playYt(audio.i + 1);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());
window.addEventListener("mousedown", (e) => {
  if (!running || dead) return;
  if (e.button === 0 && mode === "pilot") fire();
});
canvas.addEventListener("mousemove", (e) => {
  if (xrOn) return;
  if (mouse.lock) applyLook(e.movementX, e.movementY);
  else if (mouse.dragging) applyLook(e.movementX || e.clientX - mouse.lx, e.movementY || e.clientY - mouse.ly);
  mouse.lx = e.clientX;
  mouse.ly = e.clientY;
});
canvas.addEventListener("pointerdown", (e) => {
  if (!running) return;
  mouse.dragging = true;
  mouse.lx = e.clientX;
  mouse.ly = e.clientY;
  if (!mouse.lock && !xrOn) canvas.requestPointerLock?.();
});
window.addEventListener("pointerup", () => {
  mouse.dragging = false;
});
document.addEventListener("pointerlockchange", () => {
  mouse.lock = document.pointerLockElement === canvas;
});

renderer.xr.addEventListener("sessionstart", () => {
  xrOn = true;
  running = true;
  dead = false;
  document.getElementById("start").style.display = "none";
  document.getElementById("dead").hidden = true;
  ensureAudio();
  startRadio();
});
renderer.xr.addEventListener("sessionend", () => {
  xrOn = false;
});

function ensureAudio() {
  if (!audio.ctx) {
    audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    startHiss(audio.ctx);
  }
  audio.ctx.resume?.();
}

function boot() {
  running = true;
  dead = false;
  document.getElementById("start").style.display = "none";
  document.getElementById("dead").hidden = true;
  canvas.requestPointerLock?.();
  ensureAudio();
  startRadio();
}

function resetGame() {
  hull = 100;
  oxygen = 100;
  sharkHp = SHARK_HITS;
  sharkState = "patrol";
  sharkTimer = 14;
  retreatT = 0;
  shake = 0;
  if (mode === "eva") enterPilot();
  sub.position.set(0, 22, 0);
  yaw = 0;
  pitch = 0.16;
  lookYaw = 0;
  lookPitch = 0.16;
  crack.visible = false;
  shark.position.set(CELL * 0.92, 22, 0);
  setSharkMood();
  document.getElementById("dead").hidden = true;
  running = true;
  dead = false;
  canvas.requestPointerLock?.();
}

document.getElementById("go").addEventListener("click", boot);
document.getElementById("again").addEventListener("click", resetGame);

document.querySelectorAll("#touch [data-code]").forEach((btn) => {
  const down = (e) => {
    e.preventDefault();
    keys.add(btn.dataset.code);
    if (btn.dataset.code === "KeyF") tryToggleEva();
  };
  const up = (e) => {
    e.preventDefault();
    keys.delete(btn.dataset.code);
  };
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointerleave", up);
});
document.getElementById("touch-fire").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  fire();
});

window.addEventListener("resize", () => {
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

window.__controlsTest = {
  getYaw: () => yaw,
  getSpeed: () => speed,
  getPos: () => ({ x: sub.position.x, y: sub.position.y, z: sub.position.z }),
  getHull: () => hull,
  getMode: () => mode,
  getShark: () => sharkState,
  setYaw: (v) => {
    yaw = v;
    lookYaw = v;
  },
  setKeys: (codes) => {
    keys.clear();
    (codes || []).forEach((c) => keys.add(c));
  },
  fire,
  wrapPi,
};
