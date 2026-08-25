import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

const LS = "horde.lb.v1";
const SPAWN_MIN = 52;
const SPAWN_MAX = 78;
const MAX_LIVE = 72;
const COLORS = [0xff3355, 0x33ddaa, 0xffcc22, 0x6688ff, 0xff66dd, 0x44e0ff, 0xff8822];

const WEPS = {
  pistol: { id: "pistol", name: "Pistol", dmg: 1, rpm: 3.2, mag: 12, speed: 62, spread: 0.012, pellets: 1, cost: 0 },
  smg: { id: "smg", name: "SMG", dmg: 1, rpm: 9.5, mag: 28, speed: 70, spread: 0.045, pellets: 1, cost: 90 },
  shotgun: { id: "shotgun", name: "Scattergun", dmg: 1, rpm: 1.15, mag: 6, speed: 48, spread: 0.14, pellets: 7, cost: 140 },
  rail: { id: "rail", name: "Rail", dmg: 3, rpm: 1.4, mag: 4, speed: 160, spread: 0, pellets: 1, hitscan: true, cost: 220 },
  thunder: { id: "thunder", name: "Thunder", dmg: 2, rpm: 0.7, mag: 3, speed: 40, spread: 0, pellets: 1, spell: true, aoe: 4.2, cost: 160 },
  nova: { id: "nova", name: "Nova", dmg: 3, rpm: 0.45, mag: 2, speed: 36, spread: 0, pellets: 1, spell: true, aoe: 6.4, cost: 280 },
};

const SHOP = [
  { kind: "wep", id: "pistol", name: "Pistol", cost: 0, blurb: "Starter iron. Re-equip free." },
  { kind: "wep", id: "smg", name: "SMG", cost: 90, blurb: "Fast fire. Chews limbs." },
  { kind: "wep", id: "shotgun", name: "Scattergun", cost: 140, blurb: "Seven pellets. Close range." },
  { kind: "wep", id: "rail", name: "Rail", cost: 220, blurb: "Hitscan. Tears several limbs." },
  { kind: "wep", id: "thunder", name: "Thunder spell", cost: 160, blurb: "Blast a sphere. Uses ammo." },
  { kind: "wep", id: "nova", name: "Nova spell", cost: 280, blurb: "Wide shock. Uses ammo." },
  { kind: "up", id: "jump", name: "Jump height", cost: 40, blurb: "+28% jump", key: "jump", add: 0.28 },
  { kind: "up", id: "speed", name: "Move speed", cost: 45, blurb: "+16% run", key: "speed", add: 0.16 },
  { kind: "up", id: "hp", name: "Health", cost: 50, blurb: "+25 max HP", key: "maxHp", add: 25 },
  { kind: "up", id: "reload", name: "Reload speed", cost: 40, blurb: "Faster X reload", key: "reload", add: 0.18 },
  { kind: "up", id: "magnet", name: "Coin magnet", cost: 55, blurb: "Pull loot from farther", key: "magnet", add: 1.4 },
];

const $ = (id) => document.getElementById(id);
const keys = new Set();
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const tmp3 = new THREE.Vector3();

let renderer, scene, camera, rig, clock, controls, hemi, sun;
let floorGroup, bannerSpr, bannerTex, bannerCtx;
let hudSpr, hudTex, hudCtx;
let shopMesh, shopTex, shopCtx;
let xrOn = false;
let hands = [];
let gunMesh = null;
let vrGun = null;
let running = false;
let dead = false;
let shopOpen = false;
let shopSel = 0;
let shopStickLatch = 0;
let wave = 0;
let waveLeft = 0;
let pending = 0;
let announcing = 0;
let fireCd = 0;
let reloadT = 0;
let hurtT = 0;
let yaw = 0;
let jumpQueued = false;
let ammoT = 0;
let owned = new Set(["pistol"]);
let stats = { speed: 1, jump: 1, maxHp: 100, reload: 1, magnet: 2.4 };
let player = { x: 0, y: 1.6, z: 0, vx: 0, vy: 0, vz: 0, hp: 100, grounded: true, coins: 0, ammo: 48, mag: 12, wep: "pistol" };
let mobs = [];
let debris = [];
let loot = [];
let shots = [];
let initials = ["A", "A", "A"];
let mouseDown = false;

function rng() { return Math.random(); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function wep() { return WEPS[player.wep] || WEPS.pistol; }

let ac;
function sfxUnlock() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    ac = ac || new C();
    if (ac.state === "suspended") ac.resume();
  } catch {}
}
function beep(type, f, d, v, slide) {
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, ac.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, ac.currentTime + d);
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(v, ac.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
  o.connect(g); g.connect(ac.destination);
  o.start(); o.stop(ac.currentTime + d + 0.02);
}
function noise(d, v, freq) {
  if (!ac) return;
  const n = (ac.sampleRate * d) | 0;
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(v, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
  src.connect(f); f.connect(g); g.connect(ac.destination);
  src.start();
}
const sfx = {
  shoot() { noise(0.07, 0.11, 700); beep("square", 180, 0.06, 0.05, 70); },
  chime() { beep("sine", 880, 0.12, 0.09, 1320); },
  hit() { noise(0.08, 0.09, 420); },
  boom() { noise(0.2, 0.14, 160); beep("sine", 70, 0.24, 0.1, 40); },
  reload() { beep("triangle", 240, 0.08, 0.05, 420); },
  buy() { beep("sine", 520, 0.1, 0.07, 780); },
  wave() { beep("sawtooth", 220, 0.28, 0.06, 110); beep("sine", 440, 0.3, 0.05, 220); },
  hurt() { beep("sawtooth", 140, 0.16, 0.08, 60); },
};

function loadLb() {
  try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch { return []; }
}
function saveLb(rows) {
  try { localStorage.setItem(LS, JSON.stringify(rows.slice(0, 10))); } catch {}
}
function paintLb() {
  const rows = loadLb();
  const html = rows.length
    ? rows.map((r, i) => `<li><span>${i + 1}. ${r.ini}</span><span>W${r.wave} · ${r.coins}◎</span></li>`).join("")
    : "<li><span>—</span><span>No scores yet</span></li>";
  if ($("lb")) $("lb").innerHTML = html;
  if ($("lb-over")) $("lb-over").innerHTML = html;
}

function mat(hex, extra) {
  return new THREE.MeshLambertMaterial({ color: hex, ...extra });
}

function makeGun(id) {
  const g = new THREE.Group();
  const iron = mat(0x2a2a30);
  const dark = mat(0x111114);
  const gold = mat(0xd4af37);
  const glow = mat(0x88aaff, { emissive: 0x2244aa });
  if (id === "smg") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.28), iron);
    body.position.set(0, 0.02, -0.1);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.1), dark);
    stock.position.set(0, 0, 0.08);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.05), iron);
    mag.position.set(0, -0.1, -0.02);
    g.add(body, stock, mag);
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.26);
  } else if (id === "shotgun") {
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.32, 8), iron);
    b1.rotation.x = Math.PI / 2;
    b1.position.set(-0.018, 0.02, -0.12);
    const b2 = b1.clone();
    b2.position.x = 0.018;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.05), dark);
    grip.position.set(0, -0.06, 0.04);
    g.add(b1, b2, grip);
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.28);
  } else if (id === "rail") {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.42), glow);
    rail.position.set(0, 0.03, -0.16);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.1), dark);
    stock.position.set(0, -0.02, 0.08);
    g.add(rail, stock);
    g.userData.muzzle = new THREE.Vector3(0, 0.03, -0.38);
  } else if (id === "thunder" || id === "nova") {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.28, 6), dark);
    staff.rotation.x = Math.PI / 2;
    staff.position.set(0, 0, -0.08);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(id === "nova" ? 0.06 : 0.045, 0), id === "nova" ? mat(0xff66aa, { emissive: 0x881144 }) : glow);
    orb.position.set(0, 0.02, -0.24);
    g.add(staff, orb);
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.28);
  } else {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.22), iron);
    slide.position.set(0, 0.02, -0.08);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.05), dark);
    bar.position.set(0, -0.06, 0.02);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.04), iron);
    mag.position.set(0, -0.1, -0.01);
    const bead = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.01), gold);
    bead.position.set(0, 0.06, -0.18);
    g.add(slide, bar, mag, bead);
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.2);
  }
  return g;
}

function equip(id) {
  player.wep = id;
  player.mag = Math.min(player.mag, wep().mag);
  const parentDesk = gunMesh?.parent || camera;
  const parentVr = vrGun?.parent;
  if (gunMesh) gunMesh.removeFromParent();
  gunMesh = makeGun(id);
  parentDesk.add(gunMesh);
  gunMesh.position.set(0.18, -0.14, -0.32);
  gunMesh.visible = !xrOn;
  if (vrGun) vrGun.removeFromParent();
  vrGun = makeGun(id);
  if (parentVr) {
    parentVr.add(vrGun);
    vrGun.position.set(0, -0.02, -0.08);
  }
}

function makeFloor() {
  floorGroup = new THREE.Group();
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "rgba(20,18,14,0.07)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(512, i * 64); ctx.stroke();
  }
  ctx.fillStyle = "rgba(30,28,24,0.05)";
  for (let i = 0; i < 70; i++) {
    const x = (i * 97) % 512;
    const y = (i * 53) % 512;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + (i % 5), 2 + (i % 3), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(180,170,150,0.35)";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 504);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(90, 90);
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    new THREE.MeshLambertMaterial({ map: tex, color: 0xffffff }),
  );
  mesh.rotation.x = -Math.PI / 2;
  floorGroup.add(mesh);
  scene.add(floorGroup);
}

function recenterFloor() {
  const gx = Math.round(player.x / 20) * 20;
  const gz = Math.round(player.z / 20) * 20;
  floorGroup.position.set(gx, 0, gz);
}

function limbColor(w) {
  const chance = w <= 1 ? 0 : Math.min(0.84, (w - 1) * 0.09);
  if (rng() > chance) return 0x0b0b0d;
  return COLORS[(rng() * COLORS.length) | 0];
}

function makeLimb(w, asLeg) {
  const len = asLeg ? 0.7 + rng() * 0.55 : 0.38 + rng() * 1.05;
  const thick = 0.055 + rng() * 0.14;
  const rubber = 0.03 + rng() * 0.14;
  const kind = rng();
  const col = limbColor(w);
  let geo;
  if (kind < 0.28) geo = new THREE.CapsuleGeometry(thick, Math.max(0.12, len - thick * 2), 3, 6);
  else if (kind < 0.52) geo = new THREE.CylinderGeometry(thick * (0.45 + rng() * 0.4), thick, len, 6);
  else if (kind < 0.76) geo = new THREE.BoxGeometry(thick * (1.1 + rng() * 0.6), len, thick * (0.7 + rng() * 0.5));
  else geo = new THREE.ConeGeometry(thick * 1.1, len, 5);
  const mesh = new THREE.Mesh(geo, mat(col));
  const g = new THREE.Group();
  mesh.position.y = -len * 0.5;
  g.add(mesh);
  const pad = new THREE.Mesh(new THREE.SphereGeometry(thick * (0.7 + rng() * 0.4), 6, 4), mat(col));
  pad.position.y = -len;
  g.add(pad);
  if (rng() < 0.45) {
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(thick * 0.5, thick * 0.5, thick * 0.5), mat(col));
    knuckle.position.y = -len * (0.3 + rng() * 0.4);
    knuckle.position.x = (rng() - 0.5) * thick;
    g.add(knuckle);
  }
  g.userData = { len, thick, rubber, hp: 1, live: true, mesh, pad, asLeg, phase: rng() * Math.PI * 2 };
  return g;
}

function makeMob(w, ang, dist) {
  const n = 2 + ((rng() * 4) | 0);
  const group = new THREE.Group();
  const coreR = 0.22 + rng() * 0.18;
  const coreKind = rng();
  const coreCol = 0x111114;
  const coreGeo = coreKind < 0.33
    ? new THREE.IcosahedronGeometry(coreR, 0)
    : coreKind < 0.66
      ? new THREE.DodecahedronGeometry(coreR, 0)
      : new THREE.SphereGeometry(coreR, 6, 5);
  const core = new THREE.Mesh(coreGeo, mat(coreCol));
  group.add(core);
  const limbs = [];
  for (let i = 0; i < n; i++) {
    const leg = i < 2;
    const limb = makeLimb(w, leg);
    const lyaw = leg ? (i === 0 ? 0.35 : -0.35) + (rng() - 0.5) * 0.4 : rng() * Math.PI * 2;
    const pitch = leg ? 0.15 + rng() * 0.25 : -0.4 + rng() * 1.3;
    limb.rotation.order = "YXZ";
    limb.userData.baseYaw = lyaw;
    limb.userData.basePitch = pitch;
    limb.rotation.y = lyaw;
    limb.rotation.x = pitch;
    const attach = coreR * 0.7;
    limb.position.set(
      Math.sin(lyaw) * attach * (leg ? 0.6 : 1),
      leg ? -coreR * 0.2 : (rng() - 0.3) * coreR,
      Math.cos(lyaw) * attach * (leg ? 0.6 : 1),
    );
    group.add(limb);
    limbs.push(limb);
  }
  const boostChance = Math.min(0.72, 0.04 + w * 0.045);
  const boost = rng() < boostChance ? 1.25 + w * 0.11 + rng() * w * 0.04 : 1;
  const x = player.x + Math.cos(ang) * dist;
  const z = player.z + Math.sin(ang) * dist;
  group.position.set(x, 0, z);
  scene.add(group);
  const walkH = 0.55 + limbs[0].userData.len * 0.35;
  return {
    mesh: group,
    core,
    limbs,
    hpLimbs: n,
    x, z, y: walkH,
    spd: (1.7 + w * 0.09) * boost,
    boost,
    bob: rng() * 6,
    hitR: 0.7 + coreR,
    alive: true,
  };
}

function syncMob(m) {
  m.mesh.position.set(m.x, m.y, m.z);
  const dx = player.x - m.x;
  const dz = player.z - m.z;
  m.mesh.rotation.y = Math.atan2(dx, dz);
}

function spawnWave() {
  wave += 1;
  const count = Math.pow(2, wave - 1);
  pending = count;
  waveLeft = count;
  announcing = 2.6;
  showBanner("WAVE " + wave);
  sfx.wave();
  dripSpawn();
  for (let i = 0; i < 1 + ((wave / 3) | 0); i++) {
    const ang = rng() * Math.PI * 2;
    const dist = 10 + rng() * 22;
    dropAmmo(player.x + Math.cos(ang) * dist, player.z + Math.sin(ang) * dist);
  }
}

function dripSpawn() {
  while (pending > 0 && mobs.filter((m) => m.alive).length < MAX_LIVE) {
    const ang = rng() * Math.PI * 2;
    const dist = SPAWN_MIN + rng() * (SPAWN_MAX - SPAWN_MIN);
    mobs.push(makeMob(wave, ang, dist));
    pending--;
  }
}

function showBanner(text) {
  $("msg").textContent = text;
  $("msg").classList.add("on");
  if (bannerCtx) {
    bannerCtx.clearRect(0, 0, 1024, 256);
    bannerCtx.fillStyle = "#111111";
    bannerCtx.font = "bold 140px Cinzel, serif";
    bannerCtx.textAlign = "center";
    bannerCtx.fillText(text, 512, 170);
    bannerTex.needsUpdate = true;
    bannerSpr.visible = true;
    bannerSpr.material.opacity = 1;
  }
}

function hideBanner() {
  $("msg").classList.remove("on");
  if (bannerSpr) bannerSpr.visible = false;
}

function placeBanner() {
  if (!bannerSpr?.visible) return;
  camera.getWorldPosition(tmp);
  camera.getWorldDirection(tmp2);
  tmp2.y *= 0.2;
  if (tmp2.lengthSq() < 1e-4) tmp2.set(0, 0, -1);
  tmp2.normalize();
  bannerSpr.position.copy(tmp).addScaledVector(tmp2, 6.5);
  bannerSpr.position.y += 1.15;
}

function dropLoot(x, y, z, n) {
  for (let i = 0; i < n; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), mat(0xd4af37, { emissive: 0x664400 }));
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x + (rng() - 0.5) * 0.5, y + 0.4, z + (rng() - 0.5) * 0.5);
    scene.add(coin);
    loot.push({ mesh: coin, kind: "coin", val: 1 + ((rng() * 3) | 0), vx: (rng() - 0.5) * 3, vy: 3 + rng() * 2, vz: (rng() - 0.5) * 3 });
  }
}

function dropAmmo(x, z) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.2), mat(0xc4a050));
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.22), mat(0x1a1a1e));
  const g = new THREE.Group();
  g.add(box, stripe);
  stripe.position.y = 0.02;
  g.position.set(x, 0.14, z);
  scene.add(g);
  loot.push({ mesh: g, kind: "ammo", val: 14 + ((rng() * 10) | 0), vx: 0, vy: 0, vz: 0, grounded: true });
}

function tickAmmoField(dt) {
  ammoT -= dt;
  if (ammoT > 0) return;
  ammoT = 7 + rng() * 9;
  const ang = rng() * Math.PI * 2;
  const dist = 8 + rng() * 24;
  dropAmmo(player.x + Math.cos(ang) * dist, player.z + Math.sin(ang) * dist);
}

function killMob(m, explode) {
  if (!m.alive) return;
  m.alive = false;
  waveLeft = Math.max(0, waveLeft - 1);
  for (const limb of m.limbs) {
    if (!limb.userData.live) continue;
    detachLimb(m, limb, explode ? 7 : 2.2);
  }
  if (explode) {
    sfx.boom();
    for (let i = 0; i < 8; i++) {
      const bit = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08 + rng() * 0.08, 0), mat(0x111114));
      bit.position.set(m.x + (rng() - 0.5) * 0.4, m.y + rng() * 0.4, m.z + (rng() - 0.5) * 0.4);
      scene.add(bit);
      debris.push({ mesh: bit, vx: (rng() - 0.5) * 8, vy: 3 + rng() * 5, vz: (rng() - 0.5) * 8, life: 0.9 + rng() * 0.5 });
    }
  }
  m.mesh.removeFromParent();
  dropLoot(m.x, m.y, m.z, 2 + ((rng() * 4) | 0) + (m.boost > 1.2 ? 2 : 0));
  if (rng() < 0.22) dropAmmo(m.x + (rng() - 0.5), m.z + (rng() - 0.5));
}

function detachLimb(m, limb, force) {
  if (!limb.userData.live) return;
  limb.userData.live = false;
  m.hpLimbs = Math.max(0, m.hpLimbs - 1);
  const wpos = new THREE.Vector3();
  limb.getWorldPosition(wpos);
  scene.attach(limb);
  limb.position.copy(wpos);
  debris.push({
    mesh: limb,
    vx: (rng() - 0.5) * force,
    vy: 2 + rng() * force * 0.4,
    vz: (rng() - 0.5) * force,
    life: 1.1 + rng() * 0.6,
    spin: (rng() - 0.5) * 8,
  });
  sfx.hit();
}

function hitLimb(limb, m) {
  detachLimb(m, limb, 5);
  if (m.hpLimbs <= 0) killMob(m, false);
}

function nearestLiveLimb(m, point) {
  let best = null;
  let bestD = 1e9;
  for (const limb of m.limbs) {
    if (!limb.userData.live) continue;
    limb.getWorldPosition(tmp3);
    const d = tmp3.distanceToSquared(point);
    if (d < bestD) { bestD = d; best = limb; }
  }
  return best;
}

function tickMobs(dt) {
  dripSpawn();
  for (const m of mobs) {
    if (!m.alive) continue;
    const dx = player.x - m.x;
    const dz = player.z - m.z;
    const dist = Math.hypot(dx, dz) || 1;
    const liveLimbs = m.limbs.filter((l) => l.userData.live);
    const liveLegs = liveLimbs.filter((l) => l.userData.asLeg);
    const gait = liveLimbs.length ? liveLimbs : m.limbs;
    m.x += (dx / dist) * m.spd * dt;
    m.z += (dz / dist) * m.spd * dt;
    m.bob += dt * (4 + m.spd);
    const sample = (liveLegs[0] || gait[0]).userData;
    const lift = 0.38 + sample.len * 0.38;
    m.y = lift + Math.sin(m.bob * 2) * 0.05;
    for (const limb of m.limbs) {
      if (!limb.userData.live) continue;
      const u = limb.userData;
      const swing = Math.sin(m.bob * 2.2 + u.phase) * (u.asLeg || liveLegs.length === 0 ? 0.55 : 0.25);
      limb.rotation.x = u.basePitch + swing;
      const rub = 1 + Math.sin(m.bob * 5 + u.phase) * u.rubber;
      u.mesh.scale.y = rub;
    }
    syncMob(m);
    if (dist < 1.05) {
      damage(16);
      killMob(m, true);
    }
  }
  mobs = mobs.filter((m) => m.alive);
  if (running && !dead && waveLeft <= 0 && pending <= 0 && wave > 0) {
    spawnWave();
  }
}

function tickDebris(dt) {
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.vy -= 18 * dt;
    d.mesh.position.x += d.vx * dt;
    d.mesh.position.y += d.vy * dt;
    d.mesh.position.z += d.vz * dt;
    d.mesh.rotation.x += (d.spin || 4) * dt;
    d.mesh.rotation.z += (d.spin || 3) * dt;
    if (d.mesh.position.y < 0.04) {
      d.mesh.position.y = 0.04;
      d.vy *= -0.2;
      d.vx *= 0.7;
      d.vz *= 0.7;
    }
    d.life -= dt;
    d.mesh.traverse((o) => {
      if (o.material) {
        if (!o.material.transparent) o.material.transparent = true;
        o.material.opacity = Math.max(0, d.life);
      }
    });
    if (d.life <= 0) {
      d.mesh.removeFromParent();
      debris.splice(i, 1);
    }
  }
}

function tickLoot(dt) {
  const mag = stats.magnet;
  for (let i = loot.length - 1; i >= 0; i--) {
    const c = loot[i];
    if (!c.grounded) {
      c.vy -= 16 * dt;
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.position.z += c.vz * dt;
      if (c.mesh.position.y <= 0.08) {
        c.mesh.position.y = 0.08;
        c.grounded = true;
        c.vy = 0;
      }
    } else {
      c.mesh.rotation.y += dt * 2;
      c.mesh.position.y = 0.1 + Math.sin(performance.now() * 0.004 + i) * 0.04;
    }
    const dx = player.x - c.mesh.position.x;
    const dz = player.z - c.mesh.position.z;
    const dy = player.y - 0.4 - c.mesh.position.y;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < mag + 0.4) {
      const pull = (mag + 0.8 - dist) * 6 * dt;
      c.mesh.position.x += (dx / (dist || 1)) * pull;
      c.mesh.position.z += (dz / (dist || 1)) * pull;
      c.mesh.position.y += (dy / (dist || 1)) * pull * 0.5;
    }
    if (dist < 0.85) {
      if (c.kind === "ammo") {
        player.ammo += c.val;
        sfx.reload();
      } else {
        player.coins += c.val;
        sfx.chime();
      }
      c.mesh.removeFromParent();
      loot.splice(i, 1);
    }
  }
}

function paintHud3d() {
  if (!hudCtx) return;
  hudCtx.clearRect(0, 0, 512, 128);
  hudCtx.fillStyle = "rgba(244,241,234,0.82)";
  hudCtx.fillRect(0, 0, 512, 128);
  hudCtx.fillStyle = "#111";
  hudCtx.font = "700 22px Outfit, sans-serif";
  hudCtx.fillText("HP " + Math.max(0, player.hp | 0), 16, 36);
  hudCtx.fillRect(16, 46, 200, 10);
  hudCtx.fillStyle = "#d4af37";
  hudCtx.fillRect(16, 46, 200 * clamp(player.hp / stats.maxHp, 0, 1), 10);
  hudCtx.fillStyle = "#111";
  hudCtx.fillText("AMMO " + player.mag + " / " + player.ammo, 16, 86);
  hudCtx.fillText("W" + wave + "  " + (player.coins | 0) + "◎  " + wep().name, 16, 114);
  hudTex.needsUpdate = true;
  if (hudSpr) hudSpr.visible = xrOn && running && !dead;
}

function hud() {
  $("hpv").textContent = Math.max(0, player.hp | 0);
  $("hpi").style.width = (100 * player.hp) / stats.maxHp + "%";
  $("ammo").textContent = player.mag + " / " + player.ammo;
  $("wep").textContent = wep().name;
  $("coins").textContent = String(player.coins | 0);
  $("wave").textContent = String(wave);
  paintHud3d();
}

function damage(n) {
  if (dead || !running) return;
  player.hp -= n;
  hurtT = 0.25;
  sfx.hurt();
  if (player.hp <= 0) gameOver();
}

function gameOver() {
  dead = true;
  running = false;
  shopOpen = false;
  $("shop").hidden = true;
  if (shopMesh) shopMesh.visible = false;
  const ini = initials.join("");
  const rows = loadLb();
  rows.push({ ini, wave, coins: player.coins | 0, t: Date.now() });
  rows.sort((a, b) => b.wave - a.wave || b.coins - a.coins);
  saveLb(rows);
  $("over-stats").textContent = "Wave " + wave + " · " + (player.coins | 0) + " coins · " + ini;
  paintLb();
  $("over").hidden = false;
  if (controls?.isLocked) controls.unlock();
}

function resetRun() {
  for (const m of mobs) m.mesh.removeFromParent();
  for (const d of debris) d.mesh.removeFromParent();
  for (const c of loot) c.mesh.removeFromParent();
  for (const s of shots) s.mesh.removeFromParent();
  mobs = []; debris = []; loot = []; shots = [];
  wave = 0;
  waveLeft = 0;
  pending = 0;
  ammoT = 3;
  owned = new Set(["pistol"]);
  stats = { speed: 1, jump: 1, maxHp: 100, reload: 1, magnet: 2.4 };
  player = { x: 0, y: 1.6, z: 0, vx: 0, vy: 0, vz: 0, hp: 100, grounded: true, coins: 0, ammo: 48, mag: 12, wep: "pistol" };
  dead = false;
  shopOpen = false;
  shopSel = 0;
  yaw = 0;
  if (xrOn && rig) {
    rig.position.set(0, 0, 0);
    rig.rotation.y = 0;
  } else {
    camera.position.set(0, 1.6, 0);
    if (rig) { rig.position.set(0, 0, 0); rig.rotation.y = 0; }
  }
  equip("pistol");
}

function startRun() {
  sfxUnlock();
  resetRun();
  $("start").hidden = true;
  $("over").hidden = true;
  running = true;
  spawnWave();
  if (!xrOn) controls.lock();
}

function fireFrom(origin, quat) {
  const def = wep();
  if (reloadT > 0) return;
  if (player.mag <= 0) {
    showBanner("RELOAD  X");
    announcing = 0.8;
    return;
  }
  if (fireCd > 0) return;
  fireCd = 1 / (def.rpm * (0.85 + stats.reload * 0.15));
  player.mag--;
  sfx.shoot();
  const n = def.pellets || 1;
  for (let i = 0; i < n; i++) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
    dir.x += (rng() - 0.5) * def.spread * 2;
    dir.y += (rng() - 0.5) * def.spread;
    dir.z += (rng() - 0.5) * def.spread * 2;
    dir.normalize();
    if (def.hitscan) {
      rayKill(origin, dir, 48, def);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([origin.clone(), origin.clone().addScaledVector(dir, 48)]),
        new THREE.LineBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.8 }),
      );
      scene.add(line);
      shots.push({ mesh: line, life: 0.08, dummy: true });
    } else if (def.aoe) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(def.id === "nova" ? 0xff66aa : 0x88aaff, { emissive: def.id === "nova" ? 0x881144 : 0x2244aa }));
      ball.position.copy(origin);
      scene.add(ball);
      shots.push({ mesh: ball, dir, speed: def.speed, life: 1.1, def, origin: origin.clone() });
    } else {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), mat(0xffee88, { emissive: 0xaa8800 }));
      ball.position.copy(origin);
      scene.add(ball);
      shots.push({ mesh: ball, dir, speed: def.speed, life: 0.9, def, origin: origin.clone() });
    }
  }
}

function rayKill(origin, dir, range, def) {
  let best = range;
  let hitM = null;
  let hitL = null;
  for (const m of mobs) {
    if (!m.alive) continue;
    for (const limb of m.limbs) {
      if (!limb.userData.live) continue;
      const w = new THREE.Vector3();
      limb.getWorldPosition(w);
      const to = w.clone().sub(origin);
      const t = to.dot(dir);
      if (t < 0 || t > best) continue;
      const closest = origin.clone().addScaledVector(dir, t);
      if (closest.distanceTo(w) < 0.28 + limb.userData.thick) {
        best = t;
        hitM = m;
        hitL = limb;
      }
    }
    const cw = new THREE.Vector3();
    m.core.getWorldPosition(cw);
    const to = cw.clone().sub(origin);
    const t = to.dot(dir);
    if (t > 0 && t < best) {
      const closest = origin.clone().addScaledVector(dir, t);
      if (closest.distanceTo(cw) < 0.32) {
        const limb = nearestLiveLimb(m, cw);
        if (limb) { best = t; hitM = m; hitL = limb; }
      }
    }
  }
  if (hitL) {
    const dmg = def.dmg || 1;
    for (let k = 0; k < dmg && hitL.userData.live; k++) hitLimb(hitL, hitM);
    if (def.dmg > 1 && hitM.alive) {
      const extra = hitM.limbs.filter((l) => l.userData.live);
      for (let k = 1; k < def.dmg && extra.length; k++) {
        const l = extra.pop();
        if (l) hitLimb(l, hitM);
      }
    }
  }
}

function tickShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.life -= dt;
    if (!s.dummy && s.mesh.position) {
      s.mesh.position.addScaledVector(s.dir, s.speed * dt);
      if (s.mesh.position.y < 0) s.life = 0;
      let hit = false;
      for (const m of mobs) {
        if (!m.alive) continue;
        for (const limb of m.limbs) {
          if (!limb.userData.live) continue;
          const w = new THREE.Vector3();
          limb.getWorldPosition(w);
          if (w.distanceTo(s.mesh.position) < 0.32 + limb.userData.thick) {
            if (s.def?.aoe) aoeAt(s.mesh.position, s.def.aoe, s.def);
            else hitLimb(limb, m);
            hit = true;
            break;
          }
        }
        if (!hit) {
          const cw = new THREE.Vector3();
          m.core.getWorldPosition(cw);
          if (cw.distanceTo(s.mesh.position) < 0.36) {
            if (s.def?.aoe) aoeAt(s.mesh.position, s.def.aoe, s.def);
            else {
              const limb = nearestLiveLimb(m, s.mesh.position);
              if (limb) hitLimb(limb, m);
            }
            hit = true;
          }
        }
        if (hit) break;
      }
      if (hit) s.life = 0;
    }
    if (s.life <= 0) {
      s.mesh.removeFromParent();
      shots.splice(i, 1);
    }
  }
}

function aoeAt(pos, r, def) {
  sfx.boom();
  for (const m of mobs) {
    if (!m.alive) continue;
    if (Math.hypot(m.x - pos.x, m.z - pos.z) > r + 0.6) continue;
    const live = m.limbs.filter((l) => l.userData.live);
    for (let k = 0; k < (def.dmg || 2) && live.length; k++) {
      const l = live.pop();
      if (l) hitLimb(l, m);
    }
  }
}

function reload() {
  const cap = wep().mag;
  if (player.mag >= cap) return;
  if (player.ammo <= 0) {
    showBanner("NO AMMO");
    announcing = 0.9;
    return;
  }
  const need = cap - player.mag;
  const take = Math.min(need, player.ammo);
  player.ammo -= take;
  player.mag += take;
  reloadT = Math.max(0.12, 0.38 / stats.reload);
  sfx.reload();
}

function buy(it) {
  if (it.kind === "wep") {
    if (owned.has(it.id)) {
      equip(it.id);
      sfx.buy();
      paintShop();
      paintShop3d();
      return true;
    }
    if (player.coins < it.cost) return false;
    player.coins -= it.cost;
    owned.add(it.id);
    equip(it.id);
  } else if (it.kind === "up") {
    if (player.coins < it.cost) return false;
    player.coins -= it.cost;
    stats[it.key] += it.add;
    if (it.key === "maxHp") player.hp = Math.min(stats.maxHp, player.hp + it.add);
  } else return false;
  sfx.buy();
  paintShop();
  paintShop3d();
  return true;
}

function paintShop() {
  const host = $("shopgrid");
  if (!host) return;
  host.innerHTML = "";
  for (const it of SHOP) {
    const equipped = it.kind === "wep" && player.wep === it.id;
    const have = it.kind === "wep" && owned.has(it.id);
    const b = document.createElement("button");
    const price = have ? "OWNED" : it.cost + "◎";
    b.innerHTML = `<b>${it.name}</b> · ${price}${equipped ? " · EQUIPPED" : ""}<small>${it.blurb}</small>`;
    b.disabled = equipped || (!have && player.coins < it.cost);
    b.onclick = () => buy(it);
    host.appendChild(b);
  }
  $("shop-gold").textContent = String(player.coins | 0);
}

function paintShop3d() {
  if (!shopCtx) return;
  const w = 1024, h = 1024;
  shopCtx.fillStyle = "#f7f4ee";
  shopCtx.fillRect(0, 0, w, h);
  shopCtx.fillStyle = "#d4af37";
  shopCtx.font = "600 28px Outfit, sans-serif";
  shopCtx.fillText("ARMORY", 48, 56);
  shopCtx.fillStyle = "#111";
  shopCtx.font = "700 64px Cinzel, serif";
  shopCtx.fillText("BUY", 48, 128);
  shopCtx.font = "500 28px Outfit, sans-serif";
  shopCtx.fillText("Gold  " + (player.coins | 0) + " ◎", 48, 176);
  shopCtx.fillText("Stick up/down · trigger buy · Y close", 48, 216);
  SHOP.forEach((it, i) => {
    const y = 250 + i * 64;
    const on = i === shopSel;
    shopCtx.fillStyle = on ? "#111" : "#e8e2d6";
    shopCtx.fillRect(40, y, 944, 58);
    shopCtx.fillStyle = on ? "#f7f4ee" : "#111";
    shopCtx.font = "600 28px Outfit, sans-serif";
    const have = it.kind === "wep" && owned.has(it.id);
    const mark = player.wep === it.id ? "  [ON]" : have ? "  [own]" : "  " + it.cost + "◎";
    shopCtx.fillText((on ? "> " : "  ") + it.name + mark, 56, y + 38);
  });
  shopTex.needsUpdate = true;
}

function placeShop3d() {
  if (!shopMesh || !shopMesh.visible) return;
  camera.getWorldPosition(tmp);
  camera.getWorldDirection(tmp2);
  tmp2.y = 0;
  if (tmp2.lengthSq() < 1e-4) tmp2.set(0, 0, -1);
  tmp2.normalize();
  shopMesh.position.copy(tmp).addScaledVector(tmp2, 1.85);
  shopMesh.position.y = tmp.y + 0.05;
  shopMesh.lookAt(tmp);
}

function toggleShop() {
  if (!running || dead) return;
  shopOpen = !shopOpen;
  if (shopOpen) {
    paintShop();
    paintShop3d();
    if (xrOn) {
      $("shop").hidden = true;
      if (shopMesh) shopMesh.visible = true;
    } else {
      $("shop").hidden = false;
      if (controls?.isLocked) controls.unlock();
    }
  } else {
    $("shop").hidden = true;
    if (shopMesh) shopMesh.visible = false;
    if (!xrOn && running && !dead) controls.lock();
  }
}

function attachXr() {
  renderer.xr.enabled = true;
  try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
  try { renderer.xr.setFramebufferScaleFactor(1); } catch {}
  const factory = new XRControllerModelFactory();
  hands = [];
  for (let i = 0; i < 2; i++) {
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(factory.createControllerModel(grip));
    scene.add(grip);
    const con = renderer.xr.getController(i);
    scene.add(con);
    const beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1.4)]),
      new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.35 }),
    );
    con.add(beam);
    const h = {
      i, grip, con, beam,
      trigger: false, triggerPrev: false, triggerValue: 0,
      aBtn: false, aPrev: false, bBtn: false, bPrev: false,
      handed: i === 0 ? "left" : "right",
      axes: [0, 0],
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
    };
    con.addEventListener("connected", (ev) => { h.handed = ev.data.handedness || h.handed; });
    hands.push(h);
  }
  vrGun = makeGun(player.wep);
  renderer.xr.addEventListener("sessionstart", () => {
    xrOn = true;
    if (controls?.isLocked) controls.unlock();
    camera.position.set(0, 0, 0);
    if (gunMesh) gunMesh.visible = false;
    $("vr-enter").textContent = "EXIT VR";
    $("start").hidden = true;
    if (shopMesh) shopMesh.visible = shopOpen;
  });
  renderer.xr.addEventListener("sessionend", () => {
    xrOn = false;
    if (gunMesh) gunMesh.visible = true;
    if (rig) { rig.rotation.y = 0; rig.position.set(0, 0, 0); }
    camera.position.set(player.x, player.y, player.z);
    $("vr-enter").textContent = "ENTER VR";
    if (shopMesh) shopMesh.visible = false;
    if (shopOpen) $("shop").hidden = false;
  });
}

function syncVrGun() {
  if (!xrOn || !vrGun) return;
  const right = hands.find((h) => h.handed === "right") || hands[1];
  if (right && vrGun.parent !== right.con) {
    right.con.add(vrGun);
    vrGun.position.set(0, -0.02, -0.08);
    vrGun.rotation.set(0, 0, 0);
  }
}

function pollXr() {
  const session = renderer.xr.getSession && renderer.xr.getSession();
  if (!session) return { moveX: 0, moveY: 0, lookX: 0, jump: false, fire: false, fireTap: false, reload: false, shop: false, right: null };
  for (const src of session.inputSources) {
    const h = hands.find((x) => x.handed === src.handedness) || (src.handedness === "left" ? hands[0] : hands[1]);
    const gp = src.gamepad;
    if (!gp || !h) continue;
    h.triggerPrev = h.trigger;
    h.aPrev = h.aBtn;
    h.bPrev = h.bBtn;
    h.triggerValue = gp.buttons[0] ? gp.buttons[0].value : 0;
    h.trigger = !!(gp.buttons[0] && (gp.buttons[0].pressed || h.triggerValue > 0.35));
    h.aBtn = !!(gp.buttons[4] && gp.buttons[4].pressed);
    h.bBtn = !!(gp.buttons[5] && gp.buttons[5].pressed);
    const ax = gp.axes || [];
    h.axes = [ax[2] != null ? ax[2] : ax[0] || 0, ax[3] != null ? ax[3] : ax[1] || 0];
    h.con.getWorldPosition(h.pos);
    h.con.getWorldQuaternion(h.quat);
  }
  const left = hands.find((h) => h.handed === "left") || hands[0];
  const right = hands.find((h) => h.handed === "right") || hands[1];
  return {
    moveX: left ? left.axes[0] : 0,
    moveY: left ? left.axes[1] : 0,
    lookX: right ? right.axes[0] : 0,
    jump: !!(right && right.aBtn && !right.aPrev),
    fire: !!(right && right.trigger),
    fireTap: !!(right && right.trigger && !right.triggerPrev),
    reload: !!(left && left.aBtn && !left.aPrev),
    shop: !!(left && left.bBtn && !left.bPrev),
    right,
  };
}

function physics(dt, xr) {
  let wishX = 0, wishZ = 0;
  if (xrOn) {
    camera.getWorldDirection(tmp);
    tmp.y = 0;
    if (tmp.lengthSq() < 1e-6) tmp.set(0, 0, -1);
    tmp.normalize();
    tmp2.set(-tmp.z, 0, tmp.x);
    const mx = shopOpen ? 0 : xr.moveX;
    const my = shopOpen ? 0 : xr.moveY;
    wishX = tmp.x * -my + tmp2.x * mx;
    wishZ = tmp.z * -my + tmp2.z * mx;
    if (Math.abs(xr.lookX) > 0.18) yaw -= xr.lookX * 2.05 * dt;
    rig.rotation.y = yaw;
    rig.position.set(player.x, 0, player.z);
  } else {
    let mx = 0, mz = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) mz -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) mz += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    const mag = Math.hypot(mx, mz);
    if (mag > 1) { mx /= mag; mz /= mag; }
    yaw = camera.rotation.y;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    wishX = mx * cy + mz * sy;
    wishZ = -mx * sy + mz * cy;
  }
  const mag = Math.hypot(wishX, wishZ);
  if (mag > 1) { wishX /= mag; wishZ /= mag; }
  const spd = 6.4 * stats.speed * (shopOpen ? 0.12 : 1);
  player.vx = wishX * spd;
  player.vz = wishZ * spd;
  if ((jumpQueued || xr.jump) && player.grounded) {
    player.vy = 7.2 * stats.jump;
    player.grounded = false;
    jumpQueued = false;
  }
  player.vy -= 22 * dt;
  player.x += player.vx * dt;
  player.z += player.vz * dt;
  player.y += player.vy * dt;
  if (player.y <= 1.6) {
    player.y = 1.6;
    player.vy = 0;
    player.grounded = true;
  }
  recenterFloor();
  if (!xrOn) {
    camera.position.set(player.x, player.y, player.z);
  }
}

function placeDesktopGun() {
  if (!gunMesh) {
    gunMesh = makeGun(player.wep);
    camera.add(gunMesh);
    gunMesh.position.set(0.18, -0.14, -0.32);
  }
  gunMesh.visible = !xrOn;
}

function doFire(xr) {
  if (shopOpen) return;
  const origin = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  if (xrOn && xr.right) {
    origin.copy(xr.right.pos);
    quat.copy(xr.right.quat);
    tmp.set(0, 0.02, -0.2).applyQuaternion(quat);
    origin.add(tmp);
  } else {
    camera.getWorldPosition(origin);
    origin.add(tmp.set(0.12, -0.08, -0.35).applyQuaternion(camera.quaternion));
    quat.copy(camera.quaternion);
  }
  fireFrom(origin, quat);
}

function tickShopStick(dt, xr) {
  if (!shopOpen) return;
  shopStickLatch = Math.max(0, shopStickLatch - dt);
  if (xrOn) {
    if (xr.moveY > 0.55 && shopStickLatch <= 0) {
      shopSel = (shopSel + 1) % SHOP.length;
      shopStickLatch = 0.22;
      paintShop3d();
    } else if (xr.moveY < -0.55 && shopStickLatch <= 0) {
      shopSel = (shopSel + SHOP.length - 1) % SHOP.length;
      shopStickLatch = 0.22;
      paintShop3d();
    }
    if (xr.fireTap) buy(SHOP[shopSel]);
  }
}

function loop() {
  const dt = Math.min(0.05, clock.getDelta() || 0.016);
  if (fireCd > 0) fireCd -= dt;
  if (reloadT > 0) reloadT -= dt;
  if (hurtT > 0) hurtT -= dt;
  if (announcing > 0) {
    announcing -= dt;
    placeBanner();
    if (bannerSpr) bannerSpr.material.opacity = clamp(announcing, 0, 1);
    if (announcing <= 0) hideBanner();
  }
  const xr = xrOn ? pollXr() : { moveX: 0, moveY: 0, lookX: 0, jump: false, fire: false, fireTap: false, reload: false, shop: false, right: null };
  if (xr.shop) toggleShop();
  if (xr.reload) reload();
  syncVrGun();
  tickShopStick(dt, xr);
  placeShop3d();
  if (running && !dead) {
    physics(dt, xr);
    if (!shopOpen) {
      if (xr.fire || (!xrOn && (keys.has("Mouse1") || mouseDown))) doFire(xr);
      tickMobs(dt);
      tickShots(dt);
      tickDebris(dt);
      tickLoot(dt);
      tickAmmoField(dt);
    }
    hud();
  }
  $("hurt").style.opacity = hurtT > 0 ? "0.35" : "0";
  renderer.render(scene, camera);
}

function init() {
  renderer = new THREE.WebGLRenderer({ canvas: $("c"), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0xe8e6e0, 1);
  renderer.xr.enabled = true;
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8e6e0, 28, 110);
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 240);
  camera.position.set(0, 1.6, 0);
  rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);
  clock = new THREE.Clock();
  hemi = new THREE.HemisphereLight(0xffffff, 0xbbb7b0, 1.15);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 0.55);
  sun.position.set(8, 18, 6);
  scene.add(sun);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff3d0 }));
  sunBall.position.set(40, 48, -30);
  scene.add(sunBall);
  makeFloor();
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 256;
  bannerCtx = c.getContext("2d");
  bannerTex = new THREE.CanvasTexture(c);
  bannerSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: bannerTex, transparent: true, depthTest: false }));
  bannerSpr.scale.set(8, 2, 1);
  bannerSpr.visible = false;
  scene.add(bannerSpr);

  const hc = document.createElement("canvas");
  hc.width = 512; hc.height = 128;
  hudCtx = hc.getContext("2d");
  hudTex = new THREE.CanvasTexture(hc);
  hudSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: hudTex, transparent: true, depthTest: false }));
  hudSpr.position.set(0, -0.22, -0.72);
  hudSpr.scale.set(0.72, 0.18, 1);
  hudSpr.visible = false;
  camera.add(hudSpr);

  const sc = document.createElement("canvas");
  sc.width = 1024; sc.height = 1024;
  shopCtx = sc.getContext("2d");
  shopTex = new THREE.CanvasTexture(sc);
  shopMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 1.35),
    new THREE.MeshBasicMaterial({ map: shopTex, transparent: true, side: THREE.DoubleSide }),
  );
  shopMesh.visible = false;
  scene.add(shopMesh);

  controls = new PointerLockControls(camera, renderer.domElement);
  attachXr();
  placeDesktopGun();
  renderer.setAnimationLoop(loop);
  paintLb();
  wireVr();
  $("c").addEventListener("click", () => {
    sfxUnlock();
    if (!$("start").hidden || dead || shopOpen) return;
    if (controls && !controls.isLocked && !xrOn) controls.lock();
  });
}

function wireVr() {
  const btn = $("vr-enter");
  const note = $("vr-note");
  if (!navigator.xr || !navigator.xr.isSessionSupported) {
    btn.disabled = true;
    btn.textContent = "VR: headset required";
    if (note) note.hidden = false;
    return;
  }
  navigator.xr.isSessionSupported("immersive-vr").then((ok) => {
    if (!ok) {
      btn.disabled = true;
      btn.textContent = "VR: headset required";
      return;
    }
    btn.onclick = async () => {
      sfxUnlock();
      if (renderer.xr.isPresenting) {
        try { await renderer.xr.getSession()?.end(); } catch {}
        return;
      }
      try {
        const gl = renderer.getContext();
        if (gl.makeXRCompatible) await gl.makeXRCompatible();
        const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
        await renderer.xr.setSession(session);
        if (!running) startRun();
      } catch (err) {
        if (note) {
          note.hidden = false;
          note.textContent = "Could not start VR: " + (err.message || "try Quest Browser");
        }
      }
    };
  });
}

addEventListener("resize", () => {
  if (renderer?.xr?.isPresenting) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
addEventListener("keydown", (e) => {
  sfxUnlock();
  keys.add(e.code);
  if (e.code === "Space") { e.preventDefault(); jumpQueued = true; }
  if (e.repeat) return;
  if (e.code === "KeyR" || e.code === "KeyX") reload();
  if (e.code === "KeyY" || e.code === "Tab") { e.preventDefault(); toggleShop(); }
  if (e.code === "Escape" && shopOpen) toggleShop();
  if (shopOpen && (e.code === "ArrowDown" || e.code === "KeyS")) {
    shopSel = (shopSel + 1) % SHOP.length;
    paintShop3d();
  }
  if (shopOpen && (e.code === "ArrowUp" || e.code === "KeyW")) {
    shopSel = (shopSel + SHOP.length - 1) % SHOP.length;
    paintShop3d();
  }
  if (shopOpen && (e.code === "Enter" || e.code === "Space")) buy(SHOP[shopSel]);
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("mousedown", (e) => { if (e.button === 0) mouseDown = true; });
addEventListener("mouseup", (e) => { if (e.button === 0) mouseDown = false; });

$("play").onclick = () => startRun();
$("again").onclick = () => { $("over").hidden = true; startRun(); };
$("to-menu").onclick = () => { $("over").hidden = true; $("start").hidden = false; resetRun(); };
$("shop-close").onclick = () => toggleShop();
document.querySelectorAll("[data-ini]").forEach((inp) => {
  inp.addEventListener("input", () => {
    const i = +inp.dataset.ini;
    const v = (inp.value || "A").toUpperCase().replace(/[^A-Z]/g, "A").slice(0, 1);
    inp.value = v;
    initials[i] = v || "A";
    const next = document.querySelector(`[data-ini="${i + 1}"]`);
    if (next && v) next.focus();
  });
});

init();
