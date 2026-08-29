import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

const LS = "horde.lb.v1";
const SPAWN_MIN = 52;
const SPAWN_MAX = 78;
const MAX_LIVE = 72;
const COLORS = [0xff3355, 0x33ddaa, 0xffcc22, 0x6688ff, 0xff66dd, 0x44e0ff, 0xff8822];
const DAY_LEN = 504;
const HEARTS = 5;
const MAX_HP0 = HEARTS * 2;

const WEPS = {
  pistol: { id: "pistol", name: "Pistol", dmg: 1, rpm: 3.2, mag: 12, speed: 62, spread: 0.012, pellets: 1, cost: 0, reload: 8 },
  smg: { id: "smg", name: "SMG", dmg: 1, rpm: 9.5, mag: 28, speed: 70, spread: 0.045, pellets: 1, cost: 90, reload: 4.96 },
  ar: { id: "ar", name: "Assault rifle", dmg: 1, rpm: 7.4, mag: 40, speed: 156, spread: 0.016, pellets: 1, hitscan: true, pierce: 1, laser: true, cost: 170, reload: 6.4 },
  shotgun: { id: "shotgun", name: "Scattergun", dmg: 1, rpm: 1.15, mag: 6, speed: 48, spread: 0.14, pellets: 7, cost: 140, reload: 6.72 },
  rail: { id: "rail", name: "Rail", dmg: 6, rpm: 1.495, mag: 5, speed: 180, spread: 0, pellets: 1, hitscan: true, pierce: 8, cost: 220, reload: 9.6 },
  thunder: { id: "thunder", name: "Thunder", dmg: 8, rpm: 0.52, mag: 3, speed: 40, spread: 0, pellets: 1, spell: true, aoe: 10.8, lightning: true, knock: 2.8, cost: 160, reload: 7.36 },
  nova: { id: "nova", name: "Nova", dmg: 4, rpm: 0.38, mag: 3, speed: 18, spread: 0, pellets: 1, spell: true, aoe: 5.6, fireball: true, wall: true, knock: 1.8, cost: 280, reload: 9.12 },
  plasma: { id: "plasma", name: "Plasma beam", dmg: 99, rpm: 1, mag: 1, speed: 140, spread: 0, pellets: 1, hitscan: true, pierce: 99, beam: true, beamDur: 10, cost: 500, reload: 6.8 },
  ripple: { id: "ripple", name: "Ripple ray", dmg: 2, rpm: 1.6, mag: 8, speed: 22, spread: 0.08, pellets: 11, pierce: 3, ripple: true, cost: 1400, reload: 7.84 },
  gravity: { id: "gravity", name: "Zero-point gun", dmg: 2, rpm: 8, mag: 40, speed: 40, spread: 0, pellets: 1, gravity: true, cost: 1800, reload: 6 },
  nuke: { id: "nuke", name: "Mini nuke", dmg: 8, rpm: 0.32, mag: 1, speed: 18, spread: 0, pellets: 1, aoe: 12, nuke: true, cost: 2800, reload: 12.8 },
  tank: { id: "tank", name: "Cyber tank", dmg: 6, rpm: 0.48, mag: 6, speed: 28, spread: 0.01, pellets: 1, aoe: 7.5, tank: true, cost: 1500, reload: 8.8 },
  heli: { id: "heli", name: "Attack heli", dmg: 7, rpm: 1.6, mag: 10, speed: 52, spread: 0.012, pellets: 1, aoe: 5.4, heli: true, missile: true, cost: 2000, reload: 7.2 },
  terra: { id: "terra", name: "Terraform gun", dmg: 0, rpm: 9, mag: 90, speed: 0, spread: 0, pellets: 1, terra: true, cost: 500, reload: 3.8 },
  noodle: { id: "noodle", name: "Laser noodle", dmg: 2, rpm: 18, mag: 99, speed: 0, spread: 0, pellets: 1, noodle: true, cost: 8200, reload: 2.8 },
};

const SHOP = [
  { kind: "wep", id: "pistol", name: "Pistol", cost: 0, blurb: "Starter iron. 8s reload." },
  { kind: "wep", id: "smg", name: "SMG", cost: 90, blurb: "Fast fire. Reloads quicker than the pistol." },
  { kind: "wep", id: "ar", name: "Assault rifle", cost: 170, blurb: "Laser carbine. Tighter than the SMG, 40-round mag, 30% more reach." },
  { kind: "wep", id: "shotgun", name: "Scattergun", cost: 140, blurb: "Seven pellets. Close range." },
  { kind: "wep", id: "rail", name: "Rail", cost: 220, blurb: "Faster fat beam. Wide pierce — shreds several limbs and keeps going." },
  { kind: "wep", id: "thunder", name: "Thunder spell", cost: 160, blurb: "Lightning from the sky. Huge blast. No ammo — reloads for free." },
  { kind: "wep", id: "nova", name: "Nova spell", cost: 280, blurb: "Giant fireball and a wall of fire. No ammo — reloads for free." },
  { kind: "wep", id: "plasma", name: "Plasma beam", cost: 500, blurb: "Ten-second beam. Unmakes anything it touches." },
  { kind: "turret", id: "turret", name: "Stone turret", cost: 480, blurb: "WWII nest. 360° gun with a search beam that follows the rifle. Jump the roof." },
  { kind: "drone", id: "drone", name: "Gun drone", cost: 420, blurb: "Hovers and fires a pistol. 2 hearts." },
  { kind: "ball", id: "ball-s", name: "Guard orb", cost: 280, blurb: "Small forcefield. 4 hearts.", hp: 8 },
  { kind: "ball", id: "ball-m", name: "Aegis orb", cost: 620, blurb: "Stout forcefield. 8 hearts.", hp: 16 },
  { kind: "ball", id: "ball-l", name: "Bulwark orb", cost: 1100, blurb: "Heavy forcefield. 16 hearts.", hp: 32 },
  { kind: "wep", id: "ripple", name: "Ripple ray", cost: 1400, blurb: "Swarm of colored rings. Pierce 3." },
  { kind: "wep", id: "gravity", name: "Zero-point gun", cost: 1800, blurb: "Grab a foe. Slam others with it." },
  { kind: "wep", id: "nuke", name: "Mini nuke", cost: 2800, blurb: "One slow shell. A wide crater." },
  { kind: "wep", id: "terra", name: "Terraform gun", cost: 500, blurb: "Dig craters and trenches wherever you aim. Hold trigger." },
  { kind: "wep", id: "tank", name: "Cyber tank", cost: 1500, blurb: "Drive it. Fire artillery." },
  { kind: "wep", id: "heli", name: "Attack heli", cost: 2000, blurb: "Fly it. Trigger fires missiles. Search beam on." },
  { kind: "up", id: "jump", name: "Jump height", cost: 40, blurb: "+28% jump", key: "jump", add: 0.28 },
  { kind: "up", id: "speed", name: "Move speed", cost: 45, blurb: "+16% run", key: "speed", add: 0.16 },
  { kind: "up", id: "hp", name: "Heart", cost: 50, blurb: "+1 max heart and heal", key: "maxHp", add: 2 },
  { kind: "up", id: "reload", name: "Reload speed", cost: 40, blurb: "Faster Y reload", key: "reload", add: 0.22 },
  { kind: "up", id: "autoreload", name: "Auto reload", cost: 200, blurb: "Starts the reload for you. The bar still plays." },
  { kind: "up", id: "magnet", name: "Coin magnet", cost: 55, blurb: "Pull loot from farther", key: "magnet", add: 1.4 },
  { kind: "up", id: "flash", name: "Brighter lamp", cost: 30, blurb: "+15% flashlight. Stacks five times." },
  { kind: "up", id: "clip", name: "Bigger clip", cost: 150, blurb: "+33% mag. Spells gain +1 charge. Stacks three times." },
  { kind: "up", id: "night", name: "Shorter nights", cost: 50, blurb: "−10% night. Ten buys = no night. Bought in the dark? Next night." },
  { kind: "ammo", id: "ammo", name: "Ammo crate", cost: 28, blurb: "+40 reserve rounds. Buy as often as you like." },
  { kind: "bind", id: "bind", name: "Swap X / Y", cost: 0, blurb: "Shop on X and reload on Y, or the reverse." },
  { kind: "up", id: "sprint", name: "Sprint", cost: 85, blurb: "Click the left stick while moving. 3s burst, 10s rest." },
  { kind: "up", id: "sprintcd", name: "Longer wind", cost: 50, blurb: "−1s sprint cooldown. Ten buys = infinite sprint.", need: "sprint", needLabel: "Sprint" },
  { kind: "up", id: "wheelie", name: "Wheelies", cost: 140, blurb: "Needs sprint. 1.5× sprint speed. Hop to keep momentum.", need: "sprint", needLabel: "Sprint" },
  { kind: "up", id: "jump2", name: "Double jump", cost: 110, blurb: "Jump again in the air." },
  { kind: "up", id: "jump3", name: "Triple jump", cost: 190, blurb: "Needs double jump. A third hop.", need: "jump2", needLabel: "Double jump" },
  { kind: "bike", id: "bike", name: "Dirt bike", cost: 520, blurb: "Ride. Fast. You can still jump." },
  { kind: "wep", id: "noodle", name: "Laser noodle", cost: 8200, blurb: "A whip of light. Grows, shortens, carves a fence. Very dear." },
];

const PLANETS = [
  { id: "hills", name: "Green hills", file: "/games/horde/tex/hills.jpg" },
  { id: "mercury", name: "Mercury", file: "/games/horde/tex/mercury.jpg" },
  { id: "venus", name: "Venus", file: "/games/horde/tex/venus.jpg" },
  { id: "earth", name: "Earth", file: "/games/horde/tex/earth.jpg" },
  { id: "mars", name: "Mars", file: "/games/horde/tex/mars.jpg" },
  { id: "jupiter", name: "Jupiter", file: "/games/horde/tex/jupiter.jpg" },
  { id: "saturn", name: "Saturn", file: "/games/horde/tex/saturn.jpg" },
  { id: "uranus", name: "Uranus", file: "/games/horde/tex/uranus.jpg" },
  { id: "neptune", name: "Neptune", file: "/games/horde/tex/neptune.jpg" },
];

const $ = (id) => document.getElementById(id);
const keys = new Set();
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const tmp3 = new THREE.Vector3();

let renderer, scene, camera, rig, clock, controls, hemi, sun, moonLight;
let flashRig = null, flashLight = null, flashFill = null, flashOn = false;
let fx = [];
let skyFlash = 0;
let nightHinted = false;
let lastDark = 0;
let _fireTex = null;
let _boltGeo = null;
let floorGroup, terrainMesh, terrainGeo, terrainOx = 0, terrainOz = 0;
let bannerSpr, bannerTex, bannerCtx;
let hudTex, hudCtx, hudMesh;
let radarTex, radarCtx, radarMesh;
let wristRoot = null;
let shopRoot, shopHits = [];
let overMesh, overTex, overCtx;
let skyMesh, skyMat, sunBall, moonBall;
let dayT = 0.22;
let flag = null;
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
let dripTotal = 0;
let dripLeft = 0;
let dripElapsed = 0;
let announcing = 0;
let fireCd = 0;
let reloadT = 0;
let reloadMax = 0;
let hurtT = 0;
let iFrame = 0;
let yaw = 0;
let lastFwdX = 0;
let lastFwdZ = -1;
let jumpQueued = false;
let sprintQueued = false;
let ammoT = 0;
let healthT = 18;
let owned = new Set(["pistol"]);
let stats = { speed: 1, jump: 1, maxHp: MAX_HP0, reload: 1, magnet: 2.4, jumps: 1, sprint: 0, sprintCd: 10, sprintMul: 1, wheelie: 0, flash: 1, autoReload: 0 };
let player = { x: 0, y: 1.6, z: 0, vx: 0, vy: 0, vz: 0, hp: MAX_HP0, grounded: true, coins: 0, ammo: 48, mag: 12, wep: "pistol", tank: false, heli: false, jumpsLeft: 1, sprinting: false, sprintT: 0, sprintCdT: 0, mom: 0, pounding: false, bike: false };
let mobs = [];
let debris = [];
let loot = [];
let shots = [];
let eShots = [];
let drones = [];
let turrets = [];
let balls = [];
let meteors = [];
let craters = [];
let hexes = [];
let flagGen = 0;
let sprintBuys = 0;
let flashBuys = 0;
let clipBuys = 0;
let cryLast = [];
let nightCutsOwned = 0;
let nightCutsLive = 0;
let plasmaT = 0;
let plasmaMesh = null;
let plasmaGlow = null;
let cryT = 0;
let oofLock = 0;
let musicGain = null;
let musicNodes = [];
let bgmAudio = null;
let bgmList = [];
let bgmI = 0;
let bgmActive = false;
const MUSIC_VOL = 0.082;
const BGM_FILES = [
  "/games/horde/music/iron-pixel-oath.mp3",
  "/games/horde/music/pixel-crown-parade.mp3",
  "/games/horde/music/pixel-crown-parade-b.mp3",
  "/games/horde/music/pixel-pulse.mp3",
];
let meleePrev = new THREE.Vector3();
let meleeHave = false;
let meleeCd = 0;
let noodleMesh = null;
let bikeMesh = null;
let shopOnX = true;
try { shopOnX = localStorage.getItem("horde.shopx") !== "0"; } catch {}
const LS_BEST = "horde.bestWave";
let menuOpen = false;
let paused = false;
let menuHits = [];
const JUMP1 = 1.18;
let grabMob = null;
let tankMesh = null;
let tankYaw = 0;
let heliMesh = null;
let heliYaw = 0;
let planetId = "";
let meteorT = 14;
let initials = ["A", "A", "A"];
let mouseDown = false;
const _ray = new THREE.Raycaster();
const tmp4 = new THREE.Vector3();
const texLoader = new THREE.TextureLoader();

function diffWave() {
  return Math.min(Math.max(1, wave), 100);
}

function waveSizeMul(w) {
  return 1 + clamp((w - 1) / 99, 0, 1);
}

function waveSpeedMul(w) {
  return 1 + 0.005 * Math.max(0, w - 1);
}

function rng() { return Math.random(); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function wep() { return WEPS[player.wep] || WEPS.pistol; }
function isSpell(def = wep()) { return !!(def && def.spell); }
function shopCatalog() { return SHOP.filter((it) => it.kind !== "ammo" && it.kind !== "bind"); }
function ammoOffer() { return SHOP.find((it) => it.kind === "ammo"); }
function bindOffer() { return SHOP.find((it) => it.kind === "bind"); }
function shopSectionOf(it) {
  if (it.kind === "bike" || it.id === "tank" || it.id === "heli") return "vehicles";
  if (it.kind === "wep" && WEPS[it.id]?.spell) return "spells";
  if (it.kind === "wep") return "weapons";
  if (it.kind === "turret" || it.kind === "drone" || it.kind === "ball") return "defense";
  if (["jump", "speed", "hp", "reload", "autoreload", "sprint", "sprintcd", "wheelie", "jump2", "jump3"].includes(it.id)) return "movement";
  if (it.id === "clip") return "weapons";
  return "utility";
}
function magCap(def = wep()) {
  const n = clipBuys | 0;
  const base = def.mag || 1;
  if (def.spell) return base + n;
  return Math.max(1, Math.round(base * (1 + n * 0.33)));
}
const SHOP_SECTION_ORDER = [
  { id: "movement", title: "Movement" },
  { id: "weapons", title: "Weapons" },
  { id: "spells", title: "Spells" },
  { id: "vehicles", title: "Vehicles" },
  { id: "defense", title: "Defense" },
  { id: "utility", title: "Utility" },
];
function shopSections() {
  const catalog = shopCatalog();
  return SHOP_SECTION_ORDER.map((s) => ({
    ...s,
    items: catalog.filter((it) => shopSectionOf(it) === s.id),
  })).filter((s) => s.items.length);
}
function shopItemBySel(sel) {
  if (sel === -1) return ammoOffer();
  if (sel === -2) return bindOffer();
  return shopCatalog()[sel];
}
function ammoLabel() {
  if (isSpell()) return player.mag + " / ∞";
  return player.mag + " / " + player.ammo;
}

let ac;
const SFX_FILES = {
  die: [
    "/games/horde/sfx/die1.mp3",
    "/games/horde/sfx/die2.mp3",
    "/games/horde/sfx/die3.mp3",
  ],
  laser: [
    "/games/horde/sfx/laser1.mp3",
    "/games/horde/sfx/laser2.mp3",
  ],
  cry: [
    "/games/horde/sfx/cry1.mp3",
    "/games/horde/sfx/cry2.mp3",
    "/games/horde/sfx/cry3.mp3",
    "/games/horde/sfx/cry4.wav",
    "/games/horde/sfx/cry5.wav",
    "/games/horde/sfx/cry6.wav",
  ],
};
const sfxBank = { die: [], laser: [], cry: [] };
let sfxLoadStarted = false;

function playSample(buf, vol) {
  if (!ac || !buf) return false;
  try {
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(Math.max(0.0001, vol), ac.currentTime);
    src.connect(g);
    g.connect(ac.destination);
    src.start();
    return true;
  } catch {
    return false;
  }
}

function loadSfxBank() {
  if (!ac || sfxLoadStarted) return;
  sfxLoadStarted = true;
  Object.keys(SFX_FILES).forEach((kind) => {
    SFX_FILES[kind].forEach((url, i) => {
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((ab) => ac.decodeAudioData(ab.slice(0)))
        .then((buf) => { sfxBank[kind][i] = buf; })
        .catch(() => {});
    });
  });
}

function sfxUnlock() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    ac = ac || new C();
    if (ac.state === "suspended") ac.resume();
    loadSfxBank();
  } catch {}
}
function beep(type, f, d, v, slide) {
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, ac.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), ac.currentTime + d);
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
function laserTone(from, to, dur, vol, type) {
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const o2 = ac.createOscillator();
  const flt = ac.createBiquadFilter();
  const g = ac.createGain();
  o.type = type || "sawtooth";
  o2.type = "square";
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(50, to), t + dur);
  o2.frequency.setValueAtTime(from * 0.5, t);
  o2.frequency.exponentialRampToValueAtTime(Math.max(40, to * 0.45), t + dur);
  flt.type = "lowpass";
  flt.frequency.setValueAtTime(from * 1.8, t);
  flt.frequency.exponentialRampToValueAtTime(700, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(flt); o2.connect(flt); flt.connect(g); g.connect(ac.destination);
  o.start(t); o2.start(t);
  o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
}
const sfx = {
  shoot() {
    const id = player.wep;
    if (id === "pistol") {
      laserTone(1550, 140, 0.12, 0.13);
      noise(0.08, 0.12, 420);
      beep("sine", 110, 0.09, 0.08, 48);
      return;
    }
    const lasers = sfxBank.laser.filter(Boolean);
    if (id === "smg") {
      laserTone(2400 + rng() * 400, 280 + rng() * 80, 0.055, 0.12);
      laserTone(180, 70, 0.04, 0.07, "sine");
      noise(0.04, 0.1, 1600 + rng() * 400);
      beep("square", 70 + rng() * 30, 0.04, 0.05, 40);
    } else if (id === "ar") {
      if (lasers.length) playSample(lasers[(rng() * lasers.length) | 0], 0.38);
      laserTone(3200, 420, 0.09, 0.13, "square");
      beep("sine", 140, 0.08, 0.07, 60);
      noise(0.06, 0.08, 2200);
    } else if (id === "shotgun") {
      noise(0.16, 0.2, 220 + rng() * 80);
      noise(0.1, 0.12, 90);
      laserTone(720 + rng() * 180, 70, 0.18, 0.15);
      beep("sine", 58, 0.16, 0.12, 28);
      beep("triangle", 210, 0.08, 0.06, 80);
    } else if (id === "rail") {
      laserTone(3400, 90, 0.34, 0.18, "square");
      laserTone(900, 140, 0.22, 0.1, "sawtooth");
      noise(0.2, 0.16, 180);
      beep("sine", 190, 0.26, 0.11, 55);
    } else if (id === "thunder") {
      noise(0.32, 0.2, 70);
      noise(0.12, 0.1, 1400);
      beep("sawtooth", 62, 0.4, 0.13, 22);
      beep("square", 1900 + rng() * 400, 0.08, 0.09, 160);
    } else if (id === "nova") {
      laserTone(380, 55, 0.34, 0.16);
      laserTone(880, 120, 0.22, 0.09, "triangle");
      noise(0.26, 0.18, 95);
      beep("sine", 80, 0.3, 0.11, 32);
    } else if (id === "nuke") {
      noise(0.28, 0.22, 70);
      noise(0.18, 0.12, 40);
      beep("sine", 48, 0.36, 0.14, 22);
      beep("sawtooth", 90, 0.2, 0.08, 36);
    } else if (id === "tank") {
      noise(0.2, 0.18, 110);
      laserTone(420, 80, 0.2, 0.12);
      beep("sine", 64, 0.24, 0.12, 28);
    } else if (id === "heli") {
      noise(0.14, 0.14, 180);
      laserTone(980, 160, 0.16, 0.13);
      beep("square", 220, 0.1, 0.07, 90);
    } else if (id === "ripple") {
      laserTone(1100 + rng() * 500, 180, 0.18, 0.11, "triangle");
      beep("sine", 660, 0.12, 0.07, 220);
      noise(0.08, 0.06, 800);
    } else if (id === "plasma") {
      if (lasers.length) playSample(lasers[(rng() * lasers.length) | 0], 0.4);
      laserTone(2600, 140, 0.18, 0.16, "square");
      laserTone(420, 90, 0.22, 0.08, "sawtooth");
    } else if (id === "gravity") {
      beep("sine", 90, 0.22, 0.1, 40);
      laserTone(240, 80, 0.2, 0.1, "triangle");
      noise(0.12, 0.08, 160);
    } else if (id === "terra") {
      noise(0.1, 0.14, 90);
      beep("square", 70, 0.12, 0.08, 36);
    } else if (id === "noodle") {
      laserTone(1800 + rng() * 600, 400, 0.08, 0.1, "sine");
      beep("triangle", 920, 0.06, 0.06, 400);
    } else {
      laserTone(1700, 160, 0.11, 0.12);
      noise(0.07, 0.1, 500);
    }
  },
  chime() { beep("sine", 880, 0.12, 0.09, 1320); },
  hit() { noise(0.045, 0.07, 1600); beep("sine", 1900, 0.05, 0.045, 380); },
  boom() { noise(0.18, 0.12, 160); beep("sine", 90, 0.22, 0.08, 40); },
  reload() {
    noise(0.1, 0.09, 700);
    beep("square", 210, 0.14, 0.08, 90);
    beep("triangle", 160, 0.22, 0.07, 70);
    const t = ac && ac.currentTime;
    if (!ac) return;
    setTimeout(() => { if (ac) { beep("triangle", 380, 0.1, 0.06, 220); noise(0.06, 0.05, 1100); } }, 180);
    if (t) beep("sine", 520, 0.28, 0.05, 180);
  },
  buy() { beep("sine", 520, 0.1, 0.07, 780); },
  wave() { beep("sawtooth", 220, 0.28, 0.06, 110); beep("sine", 440, 0.3, 0.05, 220); },
  hurt() { beep("sawtooth", 140, 0.16, 0.08, 60); },
  heal() { beep("sine", 520, 0.12, 0.08, 880); beep("triangle", 1040, 0.16, 0.05, 1560); },
  flag() { beep("sine", 660, 0.12, 0.08, 990); beep("triangle", 1320, 0.18, 0.06, 1760); },
  meteor() { noise(0.4, 0.18, 90); beep("sawtooth", 80, 0.45, 0.12, 30); },
  thunder() {
    noise(0.32, 0.2, 70);
    beep("sawtooth", 58, 0.42, 0.14, 22);
    beep("square", 1800, 0.08, 0.07, 240);
    beep("sine", 90, 0.36, 0.1, 32);
  },
  cry(kind) {
    this.oof(kind);
  },
  groan() {
    noise(0.55, 0.12, 140);
    beep("sawtooth", 120, 0.7, 0.09, 48);
    beep("triangle", 90, 0.62, 0.07, 36);
    beep("sine", 70, 0.8, 0.06, 28);
  },
  snarl() {
    noise(0.22, 0.14, 220);
    beep("sawtooth", 310, 0.28, 0.11, 70);
    beep("square", 90, 0.32, 0.09, 36);
    beep("triangle", 180, 0.18, 0.07, 55);
  },
  screech() {
    beep("square", 1680, 0.22, 0.08, 420);
    beep("sawtooth", 920, 0.26, 0.09, 180);
    noise(0.16, 0.1, 2400);
    beep("sine", 640, 0.14, 0.06, 220);
  },
  chatter() {
    for (let i = 0; i < 4; i++) {
      const t = i * 45;
      setTimeout(() => {
        if (!ac) return;
        beep("square", 240 + i * 40, 0.06, 0.07, 90);
        noise(0.04, 0.05, 700);
      }, t);
    }
  },
  oof(kind) {
    const cries = sfxBank.cry.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
    if (cries.length && rng() < 0.72) {
      let pool = cries.filter((i) => !cryLast.includes(i));
      if (!pool.length) pool = cries.slice();
      const i = pool[(rng() * pool.length) | 0];
      cryLast.push(i);
      if (cryLast.length > 2) cryLast.shift();
      playSample(sfxBank.cry[i], 0.52);
      return;
    }
    const k = ((kind % 5) + 5) % 5;
    if (k === 0) this.groan();
    else if (k === 1) this.snarl();
    else if (k === 2) this.screech();
    else if (k === 3) this.chatter();
    else {
      beep("sawtooth", 210, 0.16, 0.09, 70);
      beep("sine", 140, 0.2, 0.07, 55);
      noise(0.08, 0.07, 280);
    }
  },
  impact() {
    noise(0.09, 0.14, 900);
    beep("square", 420, 0.08, 0.07, 90);
    beep("sine", 160, 0.12, 0.06, 55);
  },
  die() {
    const dies = sfxBank.die.filter(Boolean);
    if (dies.length) {
      playSample(dies[(rng() * dies.length) | 0], 0.55);
      return;
    }
    beep("sawtooth", 210, 0.28, 0.09, 55);
    beep("triangle", 140, 0.34, 0.07, 40);
    noise(0.2, 0.11, 180);
  },
};

function maybeOof() {
  if (oofLock > 0) return;
  oofLock = 15;
  sfx.oof((rng() * 5) | 0);
}

let musicBeat = 0;
let musicNext = 0;
let musicNoiseBuf = null;
let musicStyle = 0;
const MUSIC_STYLES = [
  {
    step: 0.125,
    bass: [55, 55, 65.41, 41.2, 55, 73.42, 65.41, 49],
    kick: [0, 8],
    snare: [4, 12],
    hat: "even",
    openHat: [6, 14],
    stab: [0, 10],
    notes: [220, 261.63, 293.66],
  },
  {
    step: 0.11,
    bass: [41.2, 49, 55, 61.74, 73.42, 55, 49, 36.71],
    kick: [0, 3, 8, 11],
    snare: [6, 14],
    hat: "all",
    openHat: [7, 15],
    stab: [4, 12],
    notes: [196, 233.08, 311.13],
  },
  {
    step: 0.136,
    bass: [82.41, 61.74, 55, 46.25, 82.41, 73.42, 55, 41.2],
    kick: [0, 6, 10],
    snare: [4, 8, 13],
    hat: "odd",
    openHat: [5, 13],
    stab: [2, 10],
    notes: [174.61, 220, 261.63],
  },
];
function pickMusicStyle(force) {
  if (force != null) musicStyle = force % MUSIC_STYLES.length;
  else {
    let next = (Math.random() * MUSIC_STYLES.length) | 0;
    if (next === musicStyle) next = (next + 1) % MUSIC_STYLES.length;
    musicStyle = next;
  }
}

function stopMusic() {
  for (const n of musicNodes) {
    try { n.stop?.(); } catch {}
    try { n.disconnect?.(); } catch {}
  }
  musicNodes = [];
  if (musicGain) {
    try { musicGain.disconnect(); } catch {}
    musicGain = null;
  }
  musicBeat = 0;
  musicNext = 0;
  bgmActive = false;
  if (bgmAudio) {
    try { bgmAudio.onended = null; bgmAudio.pause(); bgmAudio.src = ""; } catch {}
    bgmAudio = null;
  }
}

function musicNoise() {
  if (musicNoiseBuf) return musicNoiseBuf;
  const n = Math.floor(ac.sampleRate * 0.18);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  musicNoiseBuf = buf;
  return buf;
}

function shuffleBgm() {
  bgmList = BGM_FILES.slice();
  for (let i = bgmList.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const t = bgmList[i];
    bgmList[i] = bgmList[j];
    bgmList[j] = t;
  }
  bgmI = 0;
}

function playBgmTrack() {
  if (!bgmList.length) return false;
  try {
    if (bgmAudio) {
      try { bgmAudio.onended = null; bgmAudio.pause(); } catch {}
    }
    const el = new Audio(bgmList[bgmI % bgmList.length]);
    el.volume = MUSIC_VOL;
    el.preload = "auto";
    el.onended = () => {
      bgmI = (bgmI + 1) % bgmList.length;
      playBgmTrack();
    };
    el.play().catch(() => {});
    bgmAudio = el;
    bgmActive = true;
    return true;
  } catch {
    return false;
  }
}

function startMusic() {
  stopMusic();
  sfxUnlock();
  shuffleBgm();
  if (playBgmTrack()) return;
  if (!ac) return;
  const master = ac.createGain();
  master.gain.value = 0.042;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.knee.value = 12;
  comp.ratio.value = 3.2;
  comp.attack.value = 0.003;
  comp.release.value = 0.12;
  master.connect(comp);
  comp.connect(ac.destination);
  musicGain = master;
  musicNodes.push(master, comp);
  musicBeat = 0;
  musicNext = ac.currentTime + 0.04;
  pickMusicStyle();
}

function musicKick(t) {
  if (!ac || !musicGain) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(148, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
  g.gain.setValueAtTime(0.85, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g);
  g.connect(musicGain);
  o.start(t);
  o.stop(t + 0.22);
}

function musicSnare(t) {
  if (!ac || !musicGain) return;
  const src = ac.createBufferSource();
  src.buffer = musicNoise();
  const f = ac.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1800;
  f.Q.value = 0.7;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  src.connect(f);
  f.connect(g);
  g.connect(musicGain);
  src.start(t);
  src.stop(t + 0.14);
  const o = ac.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.12, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(og);
  og.connect(musicGain);
  o.start(t);
  o.stop(t + 0.12);
}

function musicHat(t, open) {
  if (!ac || !musicGain) return;
  const src = ac.createBufferSource();
  src.buffer = musicNoise();
  const f = ac.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = open ? 4200 : 6500;
  const g = ac.createGain();
  g.gain.setValueAtTime(open ? 0.07 : 0.045, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.09 : 0.035));
  src.connect(f);
  f.connect(g);
  g.connect(musicGain);
  src.start(t);
  src.stop(t + 0.1);
}

function musicBass(t, freq) {
  if (!ac || !musicGain) return;
  const o = ac.createOscillator();
  const o2 = ac.createOscillator();
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  o.type = "sawtooth";
  o2.type = "square";
  o.frequency.setValueAtTime(freq, t);
  o2.frequency.setValueAtTime(freq * 0.5, t);
  f.type = "lowpass";
  f.frequency.setValueAtTime(420, t);
  f.frequency.exponentialRampToValueAtTime(160, t + 0.2);
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(f);
  o2.connect(f);
  f.connect(g);
  g.connect(musicGain);
  o.start(t);
  o2.start(t);
  o.stop(t + 0.3);
  o2.stop(t + 0.3);
}

function musicStab(t, chord) {
  if (!ac || !musicGain) return;
  const notes = chord || [220, 261.63, 293.66];
  for (let i = 0; i < 3; i++) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sawtooth";
    o.frequency.value = notes[i];
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(f);
    f.connect(g);
    g.connect(musicGain);
    o.start(t);
    o.stop(t + 0.38);
  }
}

function tickMusic() {
  if (bgmActive) {
    if (bgmAudio && !bgmAudio.paused && running && !dead) {
      bgmAudio.volume = MUSIC_VOL;
    }
    return;
  }
  if (!ac || !musicGain || !running || dead) return;
  const now = ac.currentTime;
  const st = MUSIC_STYLES[musicStyle] || MUSIC_STYLES[0];
  const step = st.step;
  const bass = st.bass;
  while (musicNext < now + 0.22) {
    const s = musicBeat & 15;
    if (st.kick.includes(s)) musicKick(musicNext);
    if (st.snare.includes(s)) musicSnare(musicNext);
    const hatOn = st.hat === "all" ? true : st.hat === "odd" ? (s & 1) === 1 : (s & 1) === 0;
    if (hatOn) musicHat(musicNext, st.openHat.includes(s));
    if ((s & 1) === 0) musicBass(musicNext, bass[s >> 1]);
    if (st.stab.includes(s)) musicStab(musicNext, st.notes);
    musicBeat++;
    if ((musicBeat & 63) === 0) pickMusicStyle();
    musicNext += step;
  }
}

function hillsAt(x, z) {
  let h =
    Math.sin(x * 0.031) * 1.085 +
    Math.cos(z * 0.027) * 0.875 +
    Math.sin(x * 0.019 + z * 0.017) * 0.665 +
    Math.sin(x * 0.0075 + z * 0.0095) * 1.505;
  for (const c of craters) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < c.r) {
      const k = 1 - d / c.r;
      h -= c.depth * k * k;
    }
  }
  return h;
}

function inHex(x, z, p) {
  const dx = Math.abs(x - p.x);
  const dz = Math.abs(z - p.z);
  const r = p.r;
  if (dx > r * 0.866 || dz > r) return false;
  return dz <= r * 0.8660254 && (r * 0.8660254 - dx * 0.5) >= dz * 0.5;
}

function heightAt(x, z, y) {
  let h = hillsAt(x, z);
  for (const p of hexes) {
    if (!inHex(x, z, p)) continue;
    if (p.float) {
      if (y != null && y >= p.top - 0.45 && y <= p.top + 0.55) h = Math.max(h, p.top);
    } else {
      h = Math.max(h, p.top);
    }
  }
  for (const t of turrets) {
    if (Math.hypot(x - t.x, z - t.z) > t.r) continue;
    if (y != null && y < t.top - 0.5) continue;
    h = Math.max(h, t.top);
  }
  return h;
}

function lerpC(a, b, t) {
  t = clamp(t, 0, 1);
  return a.clone().lerp(b, t);
}

function skyPalette(t) {
  const nightZ = new THREE.Color(0x000104);
  const nightH = new THREE.Color(0x010308);
  const nightFog = new THREE.Color(0x010206);
  const dawnZ = new THREE.Color(0x6a8cbc);
  const dawnH = new THREE.Color(0xffb080);
  const mornZ = new THREE.Color(0x8eb8e0);
  const mornH = new THREE.Color(0xc8dce8);
  const noonZ = new THREE.Color(0x5aa4e8);
  const noonH = new THREE.Color(0xd8ecff);
  const duskZ = new THREE.Color(0x120814);
  const duskH = new THREE.Color(0xb43a18);
  const sunsetZ = new THREE.Color(0x3a2060);
  const sunsetH = new THREE.Color(0xff8844);
  let zen, hor, fog, sunI, moonSky, moonLit, hemiI, ground, fogNear, fogFar, dark;
  const wrap = (x) => (x + 1) % 1;
  const band = (a, b) => {
    const d = wrap(b - a);
    const x = wrap(t - a);
    if (x > d) return -1;
    return d < 1e-6 ? 1 : x / d;
  };
  let k;
  if ((k = band(0.88, 1.0)) >= 0 || (k = band(0.0, 0.12)) >= 0) {
    zen = nightZ.clone(); hor = nightH.clone(); fog = nightFog.clone();
    sunI = 0; moonSky = 0.98; moonLit = 0.025; hemiI = 0.016;
    ground = new THREE.Color(0x020206); fogNear = 3.2; fogFar = 22; dark = 1;
  } else if ((k = band(0.12, 0.20)) >= 0) {
    zen = lerpC(nightZ, dawnZ, k); hor = lerpC(nightH, dawnH, k); fog = lerpC(nightFog, dawnH, k);
    sunI = 0.04 + k * 0.46; moonSky = 0.95 * (1 - k); moonLit = 0.025 * (1 - k);
    hemiI = 0.018 + k * 0.5; ground = lerpC(new THREE.Color(0x020206), new THREE.Color(0x3a2a22), k);
    fogNear = 3.2 + k * 24; fogFar = 22 + k * 78; dark = 1 - k;
  } else if ((k = band(0.20, 0.32)) >= 0) {
    zen = lerpC(dawnZ, mornZ, k); hor = lerpC(dawnH, mornH, k); fog = hor.clone();
    sunI = 0.5 + k * 0.4; moonSky = 0.08; moonLit = 0.02; hemiI = 0.7 + k * 0.25;
    ground = lerpC(new THREE.Color(0x3a2a22), new THREE.Color(0x8a8478), k);
    fogNear = 28; fogFar = 110; dark = 0;
  } else if ((k = band(0.32, 0.58)) >= 0) {
    zen = lerpC(mornZ, noonZ, Math.min(1, k * 1.4)); hor = lerpC(mornH, noonH, Math.min(1, k * 1.4)); fog = hor.clone();
    sunI = 0.95; moonSky = 0; moonLit = 0; hemiI = 1.12; ground = new THREE.Color(0xb8b2a6);
    fogNear = 31; fogFar = 121; dark = 0;
  } else if ((k = band(0.58, 0.70)) >= 0) {
    zen = lerpC(noonZ, sunsetZ, k); hor = lerpC(noonH, sunsetH, k); fog = hor.clone();
    sunI = 0.85 - k * 0.25; moonSky = k * 0.12; moonLit = k * 0.03; hemiI = 1.0 - k * 0.25;
    ground = lerpC(new THREE.Color(0xb8b2a6), new THREE.Color(0x6a4030), k);
    fogNear = 31 - k * 4; fogFar = 121 - k * 12; dark = k * 0.12;
  } else if ((k = band(0.70, 0.80)) >= 0) {
    zen = lerpC(sunsetZ, duskZ, k); hor = lerpC(sunsetH, duskH, k); fog = hor.clone().multiplyScalar(0.72);
    sunI = 0.5 - k * 0.42; moonSky = 0.18 + k * 0.3; moonLit = 0.04 * (1 - k); hemiI = 0.68 - k * 0.42;
    ground = lerpC(new THREE.Color(0x6a4030), new THREE.Color(0x120810), k);
    fogNear = 26 - k * 10; fogFar = 100 - k * 40; dark = 0.2 + k * 0.45;
  } else {
    k = band(0.80, 0.88);
    if (k < 0) k = 1;
    zen = lerpC(duskZ, nightZ, k); hor = lerpC(duskH, nightH, k); fog = lerpC(new THREE.Color(0x3a140c), nightFog, k);
    sunI = 0.06 * (1 - k); moonSky = 0.5 + k * 0.48; moonLit = 0.04 * (1 - k) + 0.025 * k;
    hemiI = 0.22 * (1 - k) + 0.016 * k; ground = lerpC(new THREE.Color(0x120810), new THREE.Color(0x020206), k);
    fogNear = 14 - k * 10.8; fogFar = 52 - k * 30; dark = 0.65 + k * 0.35;
  }
  return { zen, hor, fog, sunI, moonI: moonSky, moonLit, hemiI, ground, fogNear, fogFar, dark };
}

function makeSky() {
  skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZen: { value: new THREE.Color(0x5aa4e8) },
      uHor: { value: new THREE.Color(0xd8ecff) },
      uNad: { value: new THREE.Color(0x8a8478) },
      uSunDir: { value: new THREE.Vector3(0.2, 0.9, 0.2) },
      uMoonDir: { value: new THREE.Vector3(-0.2, -0.9, -0.2) },
      uSunI: { value: 1 },
      uMoonI: { value: 0 },
    },
    vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uZen, uHor, uNad, uSunDir, uMoonDir;
      uniform float uSunI, uMoonI;
      varying vec3 vP;
      void main(){
        float h = vP.y * 0.5 + 0.5;
        vec3 col = mix(uNad, uHor, smoothstep(0.0, 0.48, h));
        col = mix(col, uZen, smoothstep(0.42, 1.0, h));
        float sun = pow(max(0.0, dot(normalize(vP), normalize(uSunDir))), 32.0) * uSunI;
        float sunG = pow(max(0.0, dot(normalize(vP), normalize(uSunDir))), 4.0) * uSunI * 0.35;
        float moon = pow(max(0.0, dot(normalize(vP), normalize(uMoonDir))), 80.0) * uMoonI;
        col += vec3(1.0, 0.86, 0.55) * (sun * 1.2 + sunG);
        col += vec3(0.75, 0.82, 1.0) * (moon * 1.4);
        float stars = 0.0;
        if (uMoonI > 0.28 && vP.y > 0.14) {
          vec3 sp = normalize(vP);
          float n = fract(sin(dot(sp * 37.0, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          float n2 = fract(sin(dot(sp * 71.0, vec3(39.346, 11.135, 73.217))) * 23421.631);
          stars = step(0.9972, n) * step(0.42, n2) * (uMoonI - 0.2) * 0.75;
        }
        col += vec3(stars);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(176, 32, 20), skyMat);
  scene.add(skyMesh);
  sunBall = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c2 }));
  moonBall = new THREE.Mesh(new THREE.SphereGeometry(3.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdce6f4 }));
  scene.add(sunBall, moonBall);
}

function tickSky(dt) {
  const darkNow = skyPalette(dayT).dark;
  if (lastDark <= 0.45 && darkNow > 0.45) nightCutsLive = nightCutsOwned;
  const cuts = nightCutsLive;
  if (cuts >= 10 && darkNow > 0.25) {
    dayT = 0.20;
  } else {
    const shorten = cuts <= 0 ? 1 : 1 / Math.max(0.05, 1 - 0.1 * Math.min(9, cuts));
    const nightSpeed = darkNow > 0.45 ? (1 / 0.7) * shorten : 1;
    dayT = (dayT + (dt / DAY_LEN) * nightSpeed) % 1;
  }
  const pal = skyPalette(dayT);
  const ang = (dayT - 0.25) * Math.PI * 2;
  const sunDir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0.22).normalize();
  const moonDir = sunDir.clone().multiplyScalar(-1);
  if (skyMat) {
    skyMat.uniforms.uZen.value.copy(pal.zen);
    skyMat.uniforms.uHor.value.copy(pal.hor);
    skyMat.uniforms.uNad.value.copy(pal.ground);
    skyMat.uniforms.uSunDir.value.copy(sunDir);
    skyMat.uniforms.uMoonDir.value.copy(moonDir);
    skyMat.uniforms.uSunI.value = pal.sunI;
    skyMat.uniforms.uMoonI.value = pal.moonI;
  }
  lastDark = pal.dark;
  if (running && !dead && pal.dark > 0.8 && !nightHinted) {
    nightHinted = true;
    showBanner(xrOn ? "NIGHT  ·  L TRIGGER LIGHT" : "NIGHT  ·  F FLASHLIGHT");
    announcing = 1.8;
  }
  if (pal.dark < 0.22) nightHinted = false;
  if (sun) {
    sun.position.copy(sunDir).multiplyScalar(60);
    sun.intensity = pal.sunI * 0.85 + skyFlash * 2.4;
    sun.color.set(pal.sunI > 0.4 ? 0xfff2d8 : 0xffc090);
  }
  if (moonLight) {
    moonLight.position.copy(moonDir).multiplyScalar(50);
    moonLight.intensity = pal.moonLit + skyFlash * 0.8;
  }
  if (hemi) {
    hemi.intensity = pal.hemiI + skyFlash * 3.4;
    hemi.color.copy(pal.zen);
    hemi.groundColor.copy(pal.ground);
  }
  if (sunBall) {
    sunBall.position.copy(sunDir).multiplyScalar(90);
    sunBall.visible = pal.sunI > 0.08;
    sunBall.scale.setScalar(0.7 + pal.sunI * 0.6);
  }
  if (moonBall) {
    moonBall.position.copy(moonDir).multiplyScalar(86);
    moonBall.visible = pal.moonI > 0.08;
  }
  if (skyMesh && camera) {
    camera.getWorldPosition(tmp4);
    skyMesh.position.copy(tmp4);
  }
  scene.fog.color.copy(pal.fog);
  scene.fog.near = pal.fogNear;
  scene.fog.far = pal.fogFar;
  renderer.setClearColor(pal.fog.getHex(), 1);
}

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
  } else if (id === "ar") {
    const laser = mat(0x44e8ff, { emissive: 0x116688 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.072, 0.34), iron);
    body.position.set(0, 0.03, -0.12);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.22, 8), laser);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.042, -0.32);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.055, 0.12), dark);
    stock.position.set(0, 0.01, 0.1);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.18, 0.05), iron);
    mag.position.set(0, -0.1, -0.04);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.16), gold);
    rail.position.set(0, 0.072, -0.16);
    g.add(body, barrel, stock, mag, rail);
    g.userData.muzzle = new THREE.Vector3(0, 0.042, -0.44);
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
  } else if (id === "thunder") {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.016, 0.3, 6), dark);
    staff.rotation.x = Math.PI / 2;
    staff.position.set(0, 0, -0.08);
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), mat(0x88aaff, { emissive: 0x2244cc }));
    orb.position.set(0, 0.02, -0.26);
    const prong = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 4), glow);
    prong.rotation.x = Math.PI / 2;
    prong.position.set(0, 0.02, -0.32);
    g.add(staff, orb, prong);
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.34);
  } else if (id === "nova") {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.3, 6), dark);
    staff.rotation.x = Math.PI / 2;
    staff.position.set(0, 0, -0.08);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0xff5511, { emissive: 0xaa2200 }));
    orb.position.set(0, 0.03, -0.26);
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    shell.position.copy(orb.position);
    g.add(staff, orb, shell);
    g.userData.muzzle = new THREE.Vector3(0, 0.03, -0.34);
  } else if (id === "plasma") {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.38, 8), mat(0x44eeff, { emissive: 0x116688 }));
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.02, -0.16);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.14), iron);
    core.position.set(0, 0, 0.04);
    g.add(tube, core);
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.36);
  } else if (id === "ripple") {
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6, 0, Math.PI * 2, 0, 1.2), mat(0xff66dd, { emissive: 0x661144 }));
    dish.rotation.x = Math.PI;
    dish.position.set(0, 0.02, -0.2);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.08), dark);
    grip.position.set(0, -0.05, 0.02);
    g.add(dish, grip);
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.28);
  } else if (id === "gravity") {
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.26), mat(0x66ffaa, { emissive: 0x114422 }));
    fork.position.set(0, 0.03, -0.12);
    const prong = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.12), mat(0xaaffdd, { emissive: 0x226644 }));
    prong.position.set(0, 0.06, -0.28);
    g.add(fork, prong);
    g.userData.muzzle = new THREE.Vector3(0, 0.04, -0.34);
  } else if (id === "nuke") {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.34, 8), iron);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.03, -0.12);
    const war = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(0x44aa44, { emissive: 0x113300 }));
    war.position.set(0, 0.03, -0.3);
    g.add(tube, war);
    g.userData.muzzle = new THREE.Vector3(0, 0.03, -0.34);
  } else if (id === "tank") {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.42, 8), iron);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.18);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.16), dark);
    box.position.set(0, 0, 0.04);
    g.add(barrel, box);
    g.userData.muzzle = new THREE.Vector3(0, 0.04, -0.4);
  } else if (id === "heli") {
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.1), dark);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.16, 6), iron);
    stick.position.set(0, 0.08, 0);
    g.add(grip, stick);
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.28);
  } else if (id === "terra") {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.28, 7), mat(0x8a6230, { emissive: 0x3a2208 }));
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.02, -0.12);
    const scoop = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 6), mat(0xc4a574));
    scoop.rotation.x = Math.PI / 2;
    scoop.position.set(0, 0.02, -0.3);
    g.add(tube, scoop);
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.36);
  } else if (id === "noodle") {
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.16, 8), dark);
    hilt.rotation.x = Math.PI / 2;
    hilt.position.set(0, 0, 0.02);
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 10), gold);
    guard.position.set(0, 0.01, -0.06);
    g.add(hilt, guard);
    g.userData.muzzle = new THREE.Vector3(0, 0.01, -0.1);
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
  const tipCol = id === "nova" ? 0xff6622 : id === "thunder" ? 0xaaccff : id === "rail" || id === "ar" ? 0x66eeff : 0x44ddff;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), new THREE.MeshBasicMaterial({ color: tipCol }));
  tip.position.copy(g.userData.muzzle);
  g.add(tip);
  const bar = new THREE.Group();
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.012, 0.012),
    new THREE.MeshBasicMaterial({ color: 0x111114, transparent: true, opacity: 0.85, depthTest: false }),
  );
  const fill = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.01, 0.01),
    new THREE.MeshBasicMaterial({ color: 0xd4af37, depthTest: false }),
  );
  fill.position.z = 0.001;
  bar.add(track, fill);
  bar.position.set(0, 0.09, -0.08);
  bar.visible = false;
  g.add(bar);
  g.userData.reloadBar = bar;
  g.userData.reloadFill = fill;
  return g;
}

function equip(id) {
  player.wep = id;
  player.tank = !!WEPS[id]?.tank;
  player.heli = !!WEPS[id]?.heli;
  player.mag = Math.min(player.mag, magCap());
  reloadT = 0;
  reloadMax = 0;
  if (player.tank || player.heli) player.bike = false;
  if (!player.tank && tankMesh) tankMesh.visible = false;
  if (!player.heli && heliMesh) heliMesh.visible = false;
  if (player.heli) player.y = Math.max(player.y, heightAt(player.x, player.z) + 3.4);
  const parentDesk = gunMesh?.parent || camera;
  const parentVr = vrGun?.parent;
  if (gunMesh) gunMesh.removeFromParent();
  gunMesh = makeGun(id);
  parentDesk.add(gunMesh);
  gunMesh.position.set(0.18, -0.14, -0.32);
  gunMesh.visible = !xrOn && !player.heli && !player.tank;
  if (vrGun) vrGun.removeFromParent();
  vrGun = makeGun(id);
  if (parentVr) {
    parentVr.add(vrGun);
    vrGun.position.set(0, -0.02, -0.08);
  }
}

const TSIZE = 180;
const TSEGS = 72;

function makeFloor() {
  floorGroup = new THREE.Group();
  terrainGeo = new THREE.PlaneGeometry(TSIZE, TSIZE, TSEGS, TSEGS);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainMesh = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
  );
  floorGroup.add(terrainMesh);
  scene.add(floorGroup);
  applyPlanetTex(true);
  applyTerrain(true);
}

function planetForWave(w) {
  const i = Math.floor(Math.max(0, (Math.min(w, 100) - 1) / 5)) % PLANETS.length;
  return PLANETS[i];
}

function applyPlanetTex(force) {
  const p = planetForWave(Math.max(1, wave || 1));
  if (!force && p.id === planetId) return;
  planetId = p.id;
  texLoader.load(p.file, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    if (terrainMesh.material.map) terrainMesh.material.map.dispose();
    terrainMesh.material.map = tex;
    terrainMesh.material.needsUpdate = true;
    if (hexTopMat) {
      hexTopMat.map = tex;
      hexTopMat.needsUpdate = true;
    }
  });
}

function applyTerrain(force) {
  const gx = Math.round(player.x / 14) * 14;
  const gz = Math.round(player.z / 14) * 14;
  if (!force && gx === terrainOx && gz === terrainOz) return;
  terrainOx = gx;
  terrainOz = gz;
  floorGroup.position.set(gx, 0, gz);
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const wx = gx + pos.getX(i);
    const wz = gz + pos.getZ(i);
    pos.setY(i, hillsAt(wx, wz));
  }
  pos.needsUpdate = true;
  terrainGeo.computeVertexNormals();
}

function recenterFloor() {
  applyTerrain(false);
}

function limbColor(w) {
  const chance = w <= 1 ? 0 : Math.min(0.84, (w - 1) * 0.09);
  if (rng() > chance) return 0x0b0b0d;
  return COLORS[(rng() * COLORS.length) | 0];
}

function pickLimbForm(w, asLeg) {
  const spikeChance = w < 5 ? 0 : Math.min(0.34, (w - 4) * 0.04);
  if (rng() < spikeChance) return "spike";
  const r = rng();
  if (asLeg) {
    if (r < 0.42) return "bug";
    if (r < 0.62) return "tentacle";
    return "club";
  }
  if (r < 0.28) return "wing";
  if (r < 0.55) return "tentacle";
  if (r < 0.78) return "bug";
  return "club";
}

function makeLimb(w, asLeg, forceForm) {
  const form = forceForm || pickLimbForm(w, asLeg);
  const col = limbColor(w);
  const g = new THREE.Group();
  let len, thick, rubber, dmg, run, fly, mesh, pad;
  rubber = 0.04 + rng() * 0.12;
  if (form === "wing") {
    len = 0.55 + rng() * 0.55;
    thick = 0.04 + rng() * 0.03;
    dmg = 1;
    run = 0.35;
    fly = 1 + rng() * 0.55;
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(len * 1.15, thick * 0.45, len * 0.55),
      mat(col, { transparent: true, opacity: 0.88 }),
    );
    mesh.position.set(len * 0.35, 0, 0);
    g.add(mesh);
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(thick * 0.35, thick * 0.2, len, 4), mat(col));
    rib.rotation.z = Math.PI / 2;
    rib.position.x = len * 0.28;
    g.add(rib);
    pad = new THREE.Mesh(new THREE.SphereGeometry(thick * 0.8, 5, 4), mat(col));
    pad.position.x = len * 0.7;
    g.add(pad);
  } else if (form === "tentacle") {
    len = 0.85 + rng() * 1.15;
    thick = 0.05 + rng() * 0.08;
    dmg = rng() < 0.35 ? 2 : 1;
    run = 0.7 + rng() * 0.4;
    fly = 0.15;
    const segs = 4;
    for (let s = 0; s < segs; s++) {
      const t = 1 - s / segs;
      const blob = new THREE.Mesh(
        new THREE.SphereGeometry(thick * (0.55 + t * 0.7), 6, 5),
        mat(col),
      );
      blob.position.y = -len * ((s + 0.5) / segs);
      g.add(blob);
      if (s === 0) mesh = blob;
    }
    pad = new THREE.Mesh(new THREE.SphereGeometry(thick * 0.45, 5, 4), mat(col));
    pad.position.y = -len;
    g.add(pad);
  } else if (form === "bug") {
    len = 0.65 + rng() * 0.55;
    thick = 0.028 + rng() * 0.04;
    dmg = 1;
    run = 1.35 + rng() * 0.55;
    fly = 0;
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(thick * 1.1, thick * 0.7, len * 0.55, 5), mat(col));
    upper.position.y = -len * 0.22;
    upper.rotation.z = 0.45;
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(thick * 0.7, thick * 0.25, len * 0.55, 5), mat(col));
    lower.position.set(thick * 1.2, -len * 0.7, 0);
    lower.rotation.z = -0.55;
    mesh = upper;
    pad = new THREE.Mesh(new THREE.ConeGeometry(thick * 0.7, thick * 1.6, 4), mat(col));
    pad.position.set(thick * 1.6, -len, 0);
    pad.rotation.z = Math.PI;
    g.add(upper, lower, pad);
  } else if (form === "spike") {
    len = 0.7 + rng() * 0.5;
    thick = 0.07 + rng() * 0.06;
    dmg = 4;
    run = 0.95;
    fly = 0;
    mesh = new THREE.Mesh(new THREE.ConeGeometry(thick * 1.15, len, 5), mat(col, { emissive: 0x330000 }));
    mesh.position.y = -len * 0.5;
    g.add(mesh);
    for (let k = 0; k < 3; k++) {
      const thorn = new THREE.Mesh(new THREE.ConeGeometry(thick * 0.35, len * 0.35, 4), mat(col));
      thorn.position.y = -len * (0.25 + k * 0.2);
      thorn.position.x = thick * (k % 2 ? 0.9 : -0.9);
      thorn.rotation.z = (k % 2 ? -1 : 1) * 0.9;
      g.add(thorn);
    }
    pad = new THREE.Mesh(new THREE.SphereGeometry(thick * 0.4, 5, 4), mat(col));
    pad.position.y = -len;
    g.add(pad);
  } else {
    len = asLeg ? 0.7 + rng() * 0.55 : 0.38 + rng() * 1.05;
    thick = 0.055 + rng() * 0.14;
    dmg = 1;
    run = 1;
    fly = 0;
    const kind = rng();
    let geo;
    if (kind < 0.28) geo = new THREE.CapsuleGeometry(thick, Math.max(0.12, len - thick * 2), 3, 6);
    else if (kind < 0.52) geo = new THREE.CylinderGeometry(thick * (0.45 + rng() * 0.4), thick, len, 6);
    else if (kind < 0.76) geo = new THREE.BoxGeometry(thick * (1.1 + rng() * 0.6), len, thick * (0.7 + rng() * 0.5));
    else geo = new THREE.ConeGeometry(thick * 1.1, len, 5);
    mesh = new THREE.Mesh(geo, mat(col));
    mesh.position.y = -len * 0.5;
    g.add(mesh);
    pad = new THREE.Mesh(new THREE.SphereGeometry(thick * (0.7 + rng() * 0.4), 6, 4), mat(col));
    pad.position.y = -len;
    g.add(pad);
    if (rng() < 0.45) {
      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(thick * 0.5, thick * 0.5, thick * 0.5), mat(col));
      knuckle.position.y = -len * (0.3 + rng() * 0.4);
      knuckle.position.x = (rng() - 0.5) * thick;
      g.add(knuckle);
    }
  }
  const joint = new THREE.Mesh(new THREE.SphereGeometry(Math.max(thick * 1.2, 0.045), 6, 5), mat(col));
  g.add(joint);
  g.userData = {
    len, thick, rubber, hp: 1, live: true, mesh, pad, asLeg, form, joint,
    dmg, run, fly, phase: rng() * Math.PI * 2,
    flourish: "none", flourishCd: rng() * 1.6, flourishT: 0, flourishDur: 1,
    flourishAmp: 1, flourishSpin: 1, baseRoll: 0,
  };
  return g;
}

function makeLimbChain(w, asLeg, forceForm) {
  const root = makeLimb(w, asLeg, forceForm);
  if (root.userData.form === "wing") return root;
  const extraChance = 0.18 + Math.min(0.4, w * 0.03);
  if (rng() > extraChance) return root;
  const extra = 1 + ((rng() * Math.min(2, 1 + w * 0.1)) | 0);
  let tip = root;
  let total = root.userData.len;
  let dmg = root.userData.dmg || 1;
  for (let i = 0; i < extra; i++) {
    const next = makeLimb(w, false, asLeg ? pickLimbForm(w, true) : null);
    next.position.set(0, -(tip.userData.len || 0.5), 0);
    next.rotation.set(0, 0, 0);
    tip.add(next);
    total += next.userData.len || 0.4;
    dmg = Math.max(dmg, next.userData.dmg || 1);
    tip = next;
  }
  root.userData.len = total;
  root.userData.dmg = dmg;
  root.userData.chain = extra + 1;
  return root;
}

function makeCore(coreR) {
  const g = new THREE.Group();
  const col = 0x111114;
  const hub = new THREE.Mesh(new THREE.SphereGeometry(coreR * 0.88, 8, 6), mat(col));
  g.add(hub);
  const kinds = ["shell", "torso", "squiggle", "skeletal", "thorny", "crystal", "blob", "disk"];
  const kind = kinds[(rng() * kinds.length) | 0];
  if (kind === "shell") {
    const a = new THREE.Mesh(new THREE.SphereGeometry(coreR * 1.2, 8, 6, 0, Math.PI * 2, 0, 1.45), mat(col));
    a.scale.y = 0.52;
    g.add(a);
  } else if (kind === "torso") {
    g.add(new THREE.Mesh(new THREE.CapsuleGeometry(coreR * 0.72, coreR * 1.05, 3, 7), mat(col)));
  } else if (kind === "squiggle") {
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(coreR * (0.32 + i * 0.07), 6, 5), mat(col));
      s.position.set(Math.sin(i * 1.2) * coreR * 0.38, (i - 2) * coreR * 0.26, Math.cos(i * 1.4) * coreR * 0.28);
      g.add(s);
    }
  } else if (kind === "skeletal") {
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(coreR * 0.07, coreR * 0.1, coreR * 1.7, 4), mat(col));
    g.add(spine);
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(coreR * (0.45 + i * 0.08), coreR * 0.055, 4, 8), mat(col));
      rib.rotation.x = Math.PI / 2;
      rib.position.y = (i - 1) * coreR * 0.32;
      g.add(rib);
    }
  } else if (kind === "thorny") {
    g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(coreR * 0.68, 0), mat(col)));
    for (let i = 0; i < 7; i++) {
      const th = new THREE.Mesh(new THREE.ConeGeometry(coreR * 0.12, coreR * 0.58, 4), mat(col));
      const a = (i / 7) * Math.PI * 2;
      th.position.set(Math.cos(a) * coreR * 0.55, (rng() - 0.5) * coreR * 0.5, Math.sin(a) * coreR * 0.55);
      th.lookAt(0, 0, 0);
      g.add(th);
    }
  } else if (kind === "crystal") {
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(coreR * 1.08, 0), mat(col)));
  } else if (kind === "disk") {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(coreR * 1.15, coreR * 1.15, coreR * 0.32, 8), mat(col)));
  } else {
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(coreR, 0), mat(col)));
  }
  g.userData.kind = kind;
  g.userData.coreR = coreR;
  return g;
}

function limbCountForWave(w) {
  const maxN = Math.min(15, 4 + w);
  const avg = 2.4 + w * 0.42;
  if (w >= 6 && rng() < Math.min(0.16, 0.03 + w * 0.01)) return maxN;
  const n = Math.round(avg + (rng() - 0.5) * (1.6 + w * 0.18));
  return clamp(n, 2, maxN);
}

function pickGait(n) {
  if (n >= 8 && rng() < 0.72) return 8;
  if (n >= 4 && rng() < 0.62) return 4;
  return 2;
}

function legYaw(i, nLegs) {
  if (nLegs === 2) return i === 0 ? 1.15 : -1.15;
  if (nLegs === 4) return [0.72, -0.72, 2.35, -2.35][i] || 0;
  return (i / nLegs) * Math.PI * 2 + 0.2;
}

function rollGiant(w) {
  return w >= 4 && rng() < Math.min(0.14, 0.025 + w * 0.008);
}

function giantMul() {
  return 2.35 + rng() * 0.9;
}

function mobScaleForWave(w) {
  const grow = waveSizeMul(w);
  if (rollGiant(w)) return { giant: true, scale: (2.2 + rng() * (1.2 + w * 0.08)) * grow };
  const spread = 0.08 + w * 0.035;
  return { giant: false, scale: clamp(1 + (rng() - 0.5) * 2 * spread, 0.72, 1.35 + w * 0.03) * grow };
}

function stampGiant(m) {
  const hits = m.giant ? 2 : 1;
  for (const l of m.limbs || []) {
    l.userData.maxHits = hits;
    l.userData.hits = 0;
  }
  return m;
}

function skipSpawnSlots(n) {
  let k = n;
  while (k > 0 && pending > 0) {
    pending--;
    waveLeft = Math.max(0, waveLeft - 1);
    k--;
  }
  while (k > 0 && dripLeft > 0) {
    dripLeft--;
    waveLeft = Math.max(0, waveLeft - 1);
    k--;
  }
}

function makeCentipede(w, ang, dist) {
  const group = new THREE.Group();
  const nSeg = 7 + ((rng() * 5) | 0) + Math.min(4, (w / 5) | 0);
  const coreR = 0.16 + rng() * 0.06;
  const col = 0x111114;
  const limbs = [];
  const segs = [];
  const spacing = coreR * 1.85;
  for (let i = 0; i < nSeg; i++) {
    const seg = new THREE.Group();
    const torso = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(coreR * (1.05 - i * 0.02), coreR * 1.15, 3, 6), mat(col));
    body.rotation.z = Math.PI / 2;
    torso.add(body);
    const plate = new THREE.Mesh(new THREE.SphereGeometry(coreR * 0.72, 6, 5), mat(col));
    plate.position.y = coreR * 0.15;
    torso.add(plate);
    torso.userData = { live: true, thick: coreR * 1.35, dmg: 2, len: coreR * 1.4, asLeg: false, form: "torso", run: 1.05, phase: i * 0.7, seg: i };
    seg.add(torso);
    limbs.push(torso);
    for (const side of [-1, 1]) {
      const leg = makeLimb(w, true, "bug");
      leg.userData.asLeg = true;
      leg.userData.legIndex = i * 2 + (side < 0 ? 0 : 1);
      leg.userData.baseYaw = side * 1.15;
      leg.userData.basePitch = 0.55;
      leg.userData.baseRoll = 0;
      leg.userData.seg = i;
      leg.rotation.order = "YXZ";
      leg.rotation.y = side * 1.15;
      leg.rotation.x = 0.55;
      leg.position.set(0, -coreR * 0.35, side * coreR * 0.85);
      seg.add(leg);
      limbs.push(leg);
    }
    seg.position.z = -i * spacing;
    group.add(seg);
    segs.push(seg);
  }
  const core = segs[0];
  const giant = rollGiant(w);
  let bodyScale = (1.05 + rng() * 0.45 + Math.min(0.8, w * 0.04)) * waveSizeMul(w) * 0.5;
  if (giant) bodyScale *= giantMul();
  group.scale.setScalar(bodyScale);
  const x = player.x + Math.cos(ang) * dist;
  const z = player.z + Math.sin(ang) * dist;
  const walkH = heightAt(x, z) + 0.42 * bodyScale;
  group.position.set(x, walkH, z);
  scene.add(group);
  return stampGiant({
    mesh: group,
    core,
    limbs,
    segs,
    hpLimbs: limbs.filter((l) => l.userData.live).length,
    x, z, y: walkH,
    spd: (1.35 + w * 0.07) * waveSpeedMul(w) / Math.sqrt(bodyScale),
    boost: 1.15,
    bodyScale,
    bob: rng() * 6,
    hitR: (0.55 + nSeg * 0.12) * bodyScale,
    hitCd: 0,
    dodgeY: 0,
    nLegs: nSeg * 2,
    alive: true,
    centipede: true,
    giant,
    rear: 0,
    heading: ang + Math.PI,
    ranged: false,
    fireCd: 0,
    orbit: rng() * 6,
    orbitR: 1.2,
    sepJit: 0.9,
    jabPhase: 0,
    jabLimb: null,
    slither: rng() * 6,
    threatCd: 1.5 + rng() * 4,
    threatPose: 0,
    threatT: 0,
    threatDur: 1,
  });
}

function makeSpider(w, ang, dist) {
  const group = new THREE.Group();
  const giant = rollGiant(w);
  let s = (0.82 + rng() * 0.35 + Math.min(0.55, w * 0.03)) * waveSizeMul(w);
  if (giant) s *= giantMul();
  const col = 0x111114;
  const coreR = 0.22 * s;
  const ceph = new THREE.Mesh(new THREE.SphereGeometry(coreR * 1.15, 8, 6), mat(col));
  ceph.scale.set(1.35, 0.55, 1.15);
  ceph.position.y = 0.16;
  group.add(ceph);
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(coreR * 1.35, 8, 6), mat(col));
  abdomen.scale.set(1.1, 0.72, 1.45);
  abdomen.position.set(0, 0.2, -coreR * 2.1);
  group.add(abdomen);
  const fangs = new THREE.Mesh(new THREE.ConeGeometry(coreR * 0.22, coreR * 0.55, 4), mat(col));
  fangs.rotation.x = Math.PI;
  fangs.position.set(0, 0.06, coreR * 1.15);
  group.add(fangs);
  const limbs = [];
  const yaws = [0.52, 1.05, 2.12, 2.62, -0.52, -1.05, -2.12, -2.62];
  for (let i = 0; i < 8; i++) {
    const leg = makeLimb(w, true, "bug");
    const lyaw = yaws[i];
    const pitch = 0.72 + rng() * 0.12;
    leg.rotation.order = "YXZ";
    leg.userData.asLeg = true;
    leg.userData.legIndex = i;
    leg.userData.baseYaw = lyaw;
    leg.userData.basePitch = pitch;
    leg.userData.baseRoll = 0;
    leg.rotation.y = lyaw;
    leg.rotation.x = pitch;
    const along = i % 4;
    leg.position.set(
      Math.sin(lyaw) * coreR * 1.15,
      0.02,
      Math.cos(lyaw) * coreR * 0.85 + (along < 2 ? coreR * 0.15 : -coreR * 0.35),
    );
    group.add(leg);
    limbs.push(leg);
  }
  for (const side of [-1, 1]) {
    const palp = makeLimb(w, false, "spike");
    palp.userData.asLeg = false;
    palp.userData.baseYaw = side * 0.45;
    palp.userData.basePitch = -0.35;
    palp.userData.baseRoll = 0;
    palp.rotation.order = "YXZ";
    palp.rotation.y = side * 0.45;
    palp.rotation.x = -0.35;
    palp.position.set(side * coreR * 0.55, 0.14, coreR * 0.85);
    group.add(palp);
    limbs.push(palp);
  }
  const bodyScale = s;
  group.scale.setScalar(1);
  const x = player.x + Math.cos(ang) * dist;
  const z = player.z + Math.sin(ang) * dist;
  const walkH = heightAt(x, z) + 0.28 * bodyScale;
  group.position.set(x, walkH, z);
  scene.add(group);
  return stampGiant({
    mesh: group,
    core: ceph,
    limbs,
    hpLimbs: limbs.filter((l) => l.userData.live).length,
    x, z, y: walkH,
    spd: (2.05 + w * 0.09) * waveSpeedMul(w) / Math.sqrt(bodyScale),
    boost: 1.2,
    bodyScale,
    bob: rng() * 6,
    hitR: (0.85 + coreR) * bodyScale,
    hitCd: 0,
    dodgeY: 0,
    nLegs: 8,
    alive: true,
    spider: true,
    giant,
    ranged: false,
    fireCd: 0,
    orbit: rng() * Math.PI * 2,
    orbitR: 0.8 + rng() * 2.2,
    sepJit: 0.7,
    jabPhase: 0,
    jabLimb: null,
    threatCd: 1.2 + rng() * 3.5,
    threatPose: 0,
    threatT: 0,
    threatDur: 1,
  });
}

function makeScuttler(w, ang, dist) {
  const group = new THREE.Group();
  const giant = rollGiant(w);
  let s = (0.82 + rng() * 0.35 + Math.min(0.55, w * 0.03)) * waveSizeMul(w) * 0.4;
  if (giant) s *= giantMul();
  const col = 0x161618;
  const coreR = 0.2 * s;
  const nLegs = 6 + ((rng() * 3) | 0);
  const ceph = new THREE.Mesh(new THREE.SphereGeometry(coreR * 1.05, 7, 5), mat(col));
  ceph.scale.set(1.25, 0.48, 1.05);
  ceph.position.y = 0.1;
  group.add(ceph);
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(coreR * 1.15, 7, 5), mat(col));
  abdomen.scale.set(1.05, 0.62, 1.35);
  abdomen.position.set(0, 0.12, -coreR * 1.9);
  group.add(abdomen);
  const limbs = [];
  for (let i = 0; i < nLegs; i++) {
    const side = i < nLegs / 2 ? 1 : -1;
    const along = i % (nLegs / 2);
    const lyaw = side * (0.45 + along * 0.55);
    const leg = makeLimb(w, true, "bug");
    leg.rotation.order = "YXZ";
    leg.userData.asLeg = true;
    leg.userData.legIndex = i;
    leg.userData.baseYaw = lyaw;
    leg.userData.basePitch = 0.78;
    leg.userData.baseRoll = 0;
    leg.rotation.y = lyaw;
    leg.rotation.x = 0.78;
    leg.position.set(Math.sin(lyaw) * coreR * 1.1, 0.01, Math.cos(lyaw) * coreR * 0.7);
    group.add(leg);
    limbs.push(leg);
  }
  const bodyScale = s;
  const x = player.x + Math.cos(ang) * dist;
  const z = player.z + Math.sin(ang) * dist;
  const walkH = heightAt(x, z) + 0.16 * bodyScale;
  group.position.set(x, walkH, z);
  scene.add(group);
  return stampGiant({
    mesh: group,
    core: ceph,
    limbs,
    hpLimbs: giant ? limbs.filter((l) => l.userData.live).length : 1,
    x, z, y: walkH,
    spd: (2.05 + w * 0.09) * 1.4 * waveSpeedMul(w) / Math.sqrt(Math.max(0.35, bodyScale)),
    boost: 1.25,
    bodyScale,
    bob: rng() * 6,
    hitR: (0.55 + coreR) * bodyScale,
    hitCd: 0,
    dodgeY: 0,
    nLegs,
    alive: true,
    spider: true,
    scuttler: true,
    giant,
    fragile: !giant,
    ranged: false,
    fireCd: 0,
    orbit: rng() * Math.PI * 2,
    orbitR: 0.5 + rng() * 1.6,
    sepJit: 0.55,
    jabPhase: 0,
    jabLimb: null,
    threatCd: 0.8 + rng() * 2.2,
    threatPose: 0,
    threatT: 0,
    threatDur: 0.7,
  });
}

function makeLeaper(w, ang, dist) {
  const sized = mobScaleForWave(w);
  const bodyScale = sized.scale * 0.92;
  const giant = sized.giant;
  const group = new THREE.Group();
  const coreR = (0.2 + rng() * 0.14) * Math.min(1.35, 0.75 + bodyScale * 0.25);
  const core = makeCore(coreR);
  group.add(core);
  const limbs = [];
  let wingsPlaced = 0;
  const nExtra = 1 + ((rng() * Math.min(3, 1 + w * 0.08)) | 0);
  const n = 2 + nExtra;
  for (let i = 0; i < n; i++) {
    const leg = i < 2;
    let form = leg ? "club" : pickLimbForm(w, false);
    if (leg && form === "wing") form = "club";
    if (form === "wing") wingsPlaced++;
    if (!leg && wingsPlaced === 0 && i === n - 1 && rng() < Math.min(0.5, 0.16 + w * 0.03)) form = "wing";
    const limb = makeLimbChain(w, leg, form);
    if (leg) {
      limb.scale.set(1.35, 1.45, 1.35);
      limb.userData.run = (limb.userData.run || 1) * 1.4;
      limb.userData.dmg = Math.max(2, limb.userData.dmg || 1);
      limb.userData.len *= 1.2;
    }
    const lyaw = leg ? (i === 0 ? -0.55 : 0.55) : rng() * Math.PI * 2;
    const isWing = limb.userData.form === "wing";
    const pitch = isWing ? -0.1 + rng() * 0.2 : leg ? 0.55 + rng() * 0.12 : -0.2 + rng() * 0.55;
    limb.rotation.order = "YXZ";
    limb.userData.baseYaw = lyaw;
    limb.userData.basePitch = pitch;
    limb.userData.baseRoll = 0;
    limb.userData.legIndex = i;
    limb.userData.asLeg = leg;
    limb.rotation.y = lyaw;
    limb.rotation.x = pitch;
    const attach = coreR * 0.95;
    limb.position.set(
      Math.sin(lyaw) * attach,
      isWing ? coreR * 0.45 : (leg ? -coreR * 0.58 : coreR * 0.14),
      Math.cos(lyaw) * attach,
    );
    group.add(limb);
    limbs.push(limb);
  }
  group.scale.setScalar(bodyScale);
  const x = player.x + Math.cos(ang) * dist;
  const z = player.z + Math.sin(ang) * dist;
  const walkH = heightAt(x, z) + (0.62 + (limbs[0].userData.len || 0.7) * 0.4) * bodyScale;
  group.position.set(x, walkH, z);
  scene.add(group);
  const runMul = limbs.reduce((s, l) => s + (l.userData.run || 1), 0) / n;
  return stampGiant({
    mesh: group,
    core,
    limbs,
    hpLimbs: n,
    x, z, y: walkH,
    spd: (1.7 + w * 0.09) * runMul * waveSpeedMul(w) / Math.max(1, Math.sqrt(bodyScale)),
    boost: 1,
    bodyScale,
    giant,
    bob: rng() * 6,
    hitR: (0.72 + coreR) * bodyScale,
    hitCd: 0,
    dodgeY: 0,
    nLegs: 2,
    alive: true,
    leaper: true,
    leapCd: 0.6 + rng() * 1.4,
    leaping: false,
    leapVx: 0, leapVy: 0, leapVz: 0,
    ranged: false,
    fireCd: 0,
    orbit: rng() * Math.PI * 2,
    orbitR: 1.1 + rng() * 2.4,
    sepJit: 0.7,
    jabPhase: 0,
    jabLimb: null,
    threatCd: 1.2 + rng() * 2.8,
    threatPose: 0,
    threatT: 0,
    threatDur: 0.8,
  });
}

function makeMob(w, ang, dist) {
  if (w >= 10 && rng() < Math.min(0.42, 0.14 + (w - 10) * 0.028)) return makeLeaper(w, ang, dist);
  if (w >= 3 && rng() < Math.min(0.2, 0.06 + w * 0.012)) return makeCentipede(w, ang, dist);
  if (w >= 1 && rng() < Math.min(0.22, 0.08 + w * 0.014)) return makeScuttler(w, ang, dist);
  if (w >= 2 && rng() < Math.min(0.18, 0.055 + w * 0.012)) return makeSpider(w, ang, dist);
  const n = limbCountForWave(w);
  const sized = mobScaleForWave(w);
  const bodyScale = sized.scale;
  const giant = sized.giant;
  const group = new THREE.Group();
  const coreR = (0.22 + rng() * 0.18) * Math.min(1.4, 0.75 + bodyScale * 0.25);
  const core = makeCore(coreR);
  group.add(core);
  const nLegs = pickGait(n);
  const limbs = [];
  let wingsPlaced = 0;
  for (let i = 0; i < n; i++) {
    const leg = i < nLegs;
    let form = pickLimbForm(w, leg);
    if (leg && form === "wing") form = "bug";
    if (form === "wing") wingsPlaced++;
    if (!leg && wingsPlaced === 0 && i === n - 1 && rng() < Math.min(0.45, 0.12 + w * 0.03)) form = "wing";
    const limb = makeLimbChain(w, leg, form);
    const lyaw = leg ? legYaw(i, nLegs) : rng() * Math.PI * 2;
    const isWing = limb.userData.form === "wing";
    const pitch = isWing ? -0.12 + rng() * 0.22 : leg ? 0.42 + rng() * 0.18 : -0.25 + rng() * 0.7;
    limb.rotation.order = "YXZ";
    limb.userData.baseYaw = lyaw;
    limb.userData.basePitch = pitch;
    limb.userData.baseRoll = 0;
    limb.userData.legIndex = i;
    limb.userData.asLeg = leg;
    limb.rotation.y = lyaw;
    limb.rotation.x = pitch;
    const attach = coreR * 0.92;
    limb.position.set(
      Math.sin(lyaw) * attach,
      isWing ? coreR * 0.42 : (leg ? -coreR * 0.52 : coreR * 0.12),
      Math.cos(lyaw) * attach,
    );
    group.add(limb);
    limbs.push(limb);
  }
  group.scale.setScalar(bodyScale);
  const boostChance = Math.min(0.72, 0.04 + w * 0.045);
  const boost = rng() < boostChance ? 1.25 + w * 0.11 + rng() * w * 0.04 : 1;
  const x = player.x + Math.cos(ang) * dist;
  const z = player.z + Math.sin(ang) * dist;
  const walkH = heightAt(x, z) + (0.55 + limbs[0].userData.len * 0.35) * bodyScale;
  group.position.set(x, walkH, z);
  scene.add(group);
  const runMul = limbs.reduce((s, l) => s + (l.userData.run || 1), 0) / n;
  return stampGiant({
    mesh: group,
    core,
    limbs,
    hpLimbs: n,
    x, z, y: walkH,
    spd: (1.55 + w * 0.08) * boost * runMul * waveSpeedMul(w) / Math.max(1, Math.sqrt(bodyScale)),
    boost,
    bodyScale,
    giant,
    bob: rng() * 6,
    hitR: (0.7 + coreR) * bodyScale,
    hitCd: 0,
    dodgeY: 0,
    nLegs,
    alive: true,
    ranged: w >= 10 && rng() < 0.16,
    shotShape: ["ball", "cube", "pyr", "spike"][(rng() * 4) | 0],
    fireCd: 0.8 + rng() * 1.8,
    orbit: rng() * Math.PI * 2,
    orbitR: 1.4 + rng() * 4.2,
    sepJit: 0.65 + rng() * 0.7,
    jabPhase: 0,
    jabLimb: null,
    threatCd: 1.8 + rng() * 4.2,
    threatPose: 0,
    threatT: 0,
    threatDur: 1,
  });
}

function syncMob(m) {
  m.mesh.position.set(m.x, m.y, m.z);
  const dx = player.x - m.x;
  const dz = player.z - m.z;
  m.mesh.rotation.y = m.centipede && m.heading != null ? m.heading : Math.atan2(dx, dz);
}

function loadBestWave() {
  let best = 0;
  try { best = Math.max(0, parseInt(localStorage.getItem(LS_BEST) || "0", 10) || 0); } catch {}
  for (const r of loadLb()) best = Math.max(best, r.wave | 0);
  return best;
}

function noteBestWave() {
  const best = loadBestWave();
  if (wave > best) {
    try { localStorage.setItem(LS_BEST, String(wave)); } catch {}
  }
  paintWaveButtons();
}

function unlockedStarts() {
  const best = loadBestWave();
  const out = [];
  for (let w = 5; w <= best; w += 5) out.push(w);
  return out;
}

function paintWaveButtons() {
  const waves = unlockedStarts();
  const fill = (id) => {
    const el = $(id);
    if (!el) return;
    el.innerHTML = "";
    el.hidden = !waves.length;
    for (const w of waves) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "wave-start";
      b.textContent = "Wave " + w + "  ·  +" + (w * 50) + "◎";
      b.onclick = (ev) => { ev.stopPropagation(); startRunFrom(w); };
      el.appendChild(b);
    }
  };
  fill("start-waves");
  fill("over-waves");
  const note = $("starts-note");
  if (note) note.hidden = !waves.length;
  const resume = $("resume");
  if (resume) resume.hidden = !paused;
}

function spawnWave() {
  wave += 1;
  noteBestWave();
  const dw = diffWave();
  const count = Math.max(1, Math.round(Math.pow(2, dw - 1) * 0.9 * 0.94));
  const half = Math.max(1, Math.ceil(count / 2));
  const later = Math.max(0, count - half);
  pending = half;
  dripTotal = 0;
  dripLeft = 0;
  dripElapsed = 0;
  waveLeft = count;
  announcing = 2.6;
  showBanner("WAVE " + wave);
  applyPlanetTex(false);
  sfx.wave();
  sfx.groan();
  dripSpawn(0);
  if (wave >= 5 && later > 0) {
    dripTotal = later;
    dripLeft = later;
    dripElapsed = 0;
  } else {
    pending += later;
    dripSpawn(0);
  }
  if (rng() < 0.22) {
    const ang = rng() * Math.PI * 2;
    const dist = 10 + rng() * 22;
    dropAmmo(player.x + Math.cos(ang) * dist, player.z + Math.sin(ang) * dist);
  }
  if (rng() < 0.28) {
    const ang = rng() * Math.PI * 2;
    const dist = 12 + rng() * 20;
    dropHealth(player.x + Math.cos(ang) * dist, player.z + Math.sin(ang) * dist);
  }
}

function dripSpawn(dt) {
  dt = dt || 0;
  if (dripLeft > 0) {
    dripElapsed += dt;
    const dripWin = 63.8;
    const released = Math.floor((Math.min(dripElapsed, dripWin) / dripWin) * dripTotal);
    const already = dripTotal - dripLeft;
    const more = Math.max(0, released - already);
    if (more > 0) {
      pending += more;
      dripLeft = Math.max(0, dripLeft - more);
    }
    if (dripElapsed >= 63.8 && dripLeft > 0) {
      pending += dripLeft;
      dripLeft = 0;
    }
  }
  while (pending > 0 && mobs.filter((m) => m.alive).length < MAX_LIVE) {
    const ang = rng() * Math.PI * 2;
    const dist = SPAWN_MIN + rng() * (SPAWN_MAX - SPAWN_MIN);
    const spawned = makeMob(diffWave(), ang, dist);
    mobs.push(spawned);
    pending--;
    if (spawned.giant) skipSpawnSlots(2);
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
  g.position.set(x, heightAt(x, z) + 0.16, z);
  scene.add(g);
  loot.push({ mesh: g, kind: "ammo", val: 14 + ((rng() * 10) | 0), vx: 0, vy: 0, vz: 0, grounded: true });
}

function dropHealth(x, z) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.26), mat(0xf4f1ea));
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.07), mat(0xc42b2b, { emissive: 0x400000 }));
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.07), mat(0xc42b2b, { emissive: 0x400000 }));
  const g = new THREE.Group();
  g.add(box, crossV, crossH);
  g.position.set(x, heightAt(x, z) + 0.18, z);
  scene.add(g);
  loot.push({ mesh: g, kind: "health", val: 4, vx: 0, vy: 0, vz: 0, grounded: true });
}

function tickAmmoField(dt) {
  ammoT -= dt;
  healthT -= dt;
  if (ammoT <= 0) {
    ammoT = 28 + rng() * 22;
    const ang = rng() * Math.PI * 2;
    const dist = 10 + rng() * 28;
    dropAmmo(player.x + Math.cos(ang) * dist, player.z + Math.sin(ang) * dist);
  }
  if (healthT <= 0) {
    healthT = 22 + rng() * 16;
    const ang = rng() * Math.PI * 2;
    const dist = 10 + rng() * 22;
    dropHealth(player.x + Math.cos(ang) * dist, player.z + Math.sin(ang) * dist);
  }
}

function killMob(m, explode) {
  if (!m.alive) return;
  m.alive = false;
  sfx.die();
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
  if (rng() < 0.06) dropAmmo(m.x + (rng() - 0.5), m.z + (rng() - 0.5));
  if (rng() < 0.08) dropHealth(m.x + (rng() - 0.5), m.z + (rng() - 0.5));
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
  if (!m.alive) return;
  if (m.fragile) {
    for (const l of m.limbs) {
      if (l.userData.live) detachLimb(m, l, 6);
    }
    killMob(m, false);
    return;
  }
  limb.userData.hits = (limb.userData.hits || 0) + 1;
  if (limb.userData.hits < (limb.userData.maxHits || 1)) {
    sfx.hit();
    return;
  }
  if (m.centipede && limb.userData.form === "torso") {
    const seg = limb.userData.seg;
    for (const l of m.limbs) {
      if (!l.userData.live) continue;
      if (l === limb || l.userData.seg === seg) detachLimb(m, l, 5);
    }
  } else {
    detachLimb(m, limb, 5);
  }
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

function pickLimbFlourish(u) {
  const r = rng();
  if (u.form === "wing") {
    if (r < 0.62) return "none";
    if (r < 0.84) return "hold";
    if (r < 0.94) return "swing";
    return "raise";
  }
  if (u.asLeg) {
    if (r < 0.42) return "none";
    if (r < 0.70) return "hold";
    if (r < 0.82) return "raise";
    if (r < 0.93) return "swing";
    return "whip";
  }
  if (r < 0.12) return "none";
  if (r < 0.54) return "hold";
  if (r < 0.72) return "raise";
  if (r < 0.88) return "swing";
  return "whip";
}

function flourishDur(kind) {
  if (kind === "hold") return 1.35 + rng() * 2.4;
  if (kind === "raise") return 0.42 + rng() * 0.7;
  if (kind === "swing") return 0.65 + rng() * 1.15;
  if (kind === "whip") return 0.28 + rng() * 0.55;
  return 0.3 + rng() * 0.85;
}

function resetChainPose(limb) {
  limb.traverse((ch) => {
    if (ch === limb || !ch.userData?.len) return;
    ch.rotation.x *= 0.55;
    ch.rotation.z *= 0.55;
  });
}

function overlayLimbFlourish(limb, m, dt) {
  const u = limb.userData;
  if (!u.live || u.form === "torso") return;
  u.flourishCd = (u.flourishCd || 0) - dt;
  if (!u.flourish || u.flourish === "none") {
    if (u.baseYaw != null) limb.rotation.y = u.baseYaw;
    resetChainPose(limb);
    if (u.flourishCd <= 0) {
      u.flourish = pickLimbFlourish(u);
      u.flourishT = 0;
      u.flourishDur = flourishDur(u.flourish);
      u.flourishAmp = 0.55 + rng() * 0.75;
      u.flourishSpin = (rng() < 0.5 ? -1 : 1) * (1.8 + rng() * 2.6);
      u.flourishCd = u.flourish === "none" ? 0.35 + rng() * 1.05 : 0.12 + rng() * 0.4;
    }
    return;
  }
  u.flourishT = (u.flourishT || 0) + dt;
  const dur = Math.max(0.08, u.flourishDur || 1);
  const t = u.flourishT / dur;
  const amp = u.flourishAmp || 0.8;
  const k = u.form === "wing" ? 0.45 : u.asLeg ? 0.62 : 1;
  const raiseX = (u.asLeg ? -0.92 : -1.42) * (0.7 + 0.45 * amp) * k;
  const yaw0 = u.baseYaw != null ? u.baseYaw : limb.rotation.y;
  const roll0 = u.baseRoll || 0;
  const endFlourish = (next) => {
    u.flourish = next || "none";
    u.flourishT = 0;
    u.flourishDur = flourishDur(u.flourish);
    u.flourishCd = 0.18 + rng() * 0.7;
  };
  if (u.flourish === "raise") {
    const ease = Math.sin(Math.min(1, t) * Math.PI * 0.5);
    limb.rotation.x = limb.rotation.x * (1 - ease) + raiseX * ease;
    limb.rotation.z = roll0 + Math.sin(m.bob * 2.1 + u.phase) * 0.1 * k;
    limb.rotation.y = yaw0;
    if (t >= 1) endFlourish(rng() < 0.68 ? "hold" : rng() < 0.45 ? "swing" : "none");
  } else if (u.flourish === "hold") {
    const blend = Math.min(1, u.flourishT * 5.5);
    limb.rotation.x = limb.rotation.x * (1 - blend) + (raiseX + Math.sin(m.bob * 1.35 + u.phase) * 0.08) * blend;
    limb.rotation.z = roll0 + Math.sin(m.bob * 1.7 + u.phase) * 0.14 * k;
    limb.rotation.y = yaw0 + Math.sin(m.bob * 0.7 + u.phase) * 0.09;
    if (t >= 1) {
      const r = rng();
      if (r < 0.42) endFlourish("hold");
      else if (r < 0.58) endFlourish("whip");
      else if (r < 0.76) endFlourish("swing");
      else endFlourish("none");
    }
  } else if (u.flourish === "swing") {
    const swing = Math.sin(u.flourishT * (3.8 + amp * 2.4)) * amp * k;
    limb.rotation.x = (u.basePitch || 0) * 0.28 + raiseX * 0.42 + swing * 0.7;
    limb.rotation.z = roll0 + swing * 0.95;
    limb.rotation.y = yaw0 + swing * 0.32;
    if (t >= 1) endFlourish(rng() < 0.4 ? "hold" : "none");
  } else if (u.flourish === "whip") {
    const w = Math.sin(u.flourishT * (11 + amp * 7) * (u.flourishSpin || 2));
    const w2 = Math.cos(u.flourishT * 13.5 + u.phase);
    limb.rotation.x = (u.basePitch || 0) + w * 1.22 * k * amp;
    limb.rotation.z = roll0 + w2 * 1.05 * k;
    limb.rotation.y = yaw0 + w * 0.62;
    limb.traverse((ch) => {
      if (ch === limb || !ch.userData?.len) return;
      ch.rotation.x = Math.sin(u.flourishT * 12.5 + (ch.userData.phase || 0)) * 0.62;
      ch.rotation.z = Math.cos(u.flourishT * 9.4 + (ch.userData.phase || 0)) * 0.48;
    });
    if (t >= 1) endFlourish(rng() < 0.32 ? "hold" : rng() < 0.4 ? "swing" : "none");
  } else {
    endFlourish("none");
  }
}

function incomingDodge(m) {
  let dodgeX = 0, dodgeZ = 0, dodgeY = 0, threat = 0;
  for (const s of shots) {
    if (s.dummy || !s.dir || !s.mesh) continue;
    const px = s.mesh.position.x, py = s.mesh.position.y, pz = s.mesh.position.z;
    const toX = m.x - px, toZ = m.z - pz, toY = m.y - py;
    const along = toX * s.dir.x + toY * s.dir.y + toZ * s.dir.z;
    if (along < 0.2 || along > 14) continue;
    const cx = px + s.dir.x * along;
    const cy = py + s.dir.y * along;
    const cz = pz + s.dir.z * along;
    const miss = Math.hypot(cx - m.x, cy - m.y, cz - m.z);
    if (miss > 1.8 + m.hitR) continue;
    threat += 1;
    dodgeX += -(s.dir.z);
    dodgeZ += s.dir.x;
    dodgeY += (cy < m.y ? 1.2 : -0.8);
  }
  return { dodgeX, dodgeZ, dodgeY, threat };
}

function tickMobs(dt) {
  dripSpawn(dt);
  for (const m of mobs) {
    if (!m.alive) continue;
    if (m.hitCd > 0) m.hitCd -= dt;
    const dx = player.x - m.x;
    const dz = player.z - m.z;
    const dist = Math.hypot(dx, dz) || 1;
    const liveLimbs = m.limbs.filter((l) => l.userData.live);
    const liveLegs = liveLimbs.filter((l) => l.userData.asLeg);
    const gait = liveLimbs.length ? liveLimbs : m.limbs;
    const wings = liveLimbs.filter((l) => l.userData.form === "wing");
    const nW = wings.length;
    const runMul = liveLimbs.length
      ? liveLimbs.reduce((s, l) => s + (l.userData.run || 1), 0) / liveLimbs.length
      : 0.35;
    const dodge = incomingDodge(m);
    const hold = Math.min(8, m.orbitR || 2);
    const ox = player.x + Math.cos(m.orbit + m.bob * 0.12) * hold * 0.35;
    const oz = player.z + Math.sin(m.orbit + m.bob * 0.12) * hold * 0.35;
    const tdx = ox - m.x;
    const tdz = oz - m.z;
    const td = Math.hypot(tdx, tdz) || 1;
    let vx = (tdx / td) * m.spd * runMul;
    let vz = (tdz / td) * m.spd * runMul;
    let sepX = 0, sepZ = 0;
    for (const o of mobs) {
      if (o === m || !o.alive) continue;
      const ddx = m.x - o.x;
      const ddz = m.z - o.z;
      const d2 = ddx * ddx + ddz * ddz;
      const minD = (m.hitR + o.hitR) * 1.35 * (m.sepJit || 1);
      if (d2 < 1e-4 || d2 > minD * minD) continue;
      const d = Math.sqrt(d2);
      const push = (minD - d) / minD;
      sepX += (ddx / d) * push;
      sepZ += (ddz / d) * push;
    }
    vx += sepX * (2.8 + m.spd * 0.35);
    vz += sepZ * (2.8 + m.spd * 0.35);
    if (m.centipede) {
      const closeK = dist < 9 ? clamp((9 - dist) / 7, 0, 1) : 0;
      m.slither = (m.slither || 0) + dt * (2.8 + closeK * 4.6);
      const side = Math.sin(m.slither) * (0.22 + closeK * 1.25);
      const px = -dz / dist;
      const pz = dx / dist;
      const rush = dist < 4.2 ? 1.4 : 1;
      vx = (dx / dist) * m.spd * runMul * rush + px * side * m.spd + sepX * 2.2;
      vz = (dz / dist) * m.spd * runMul * rush + pz * side * m.spd + sepZ * 2.2;
      m.heading = Math.atan2(dx, dz) + Math.sin(m.slither) * 0.55 * closeK;
    }
    if (dodge.threat) {
      const mag = Math.hypot(dodge.dodgeX, dodge.dodgeZ) || 1;
      const dodgeScale = 0.2 + 0.8 * Math.min(1, (diffWave() - 1) / 99);
      const agility = (1.2 + nW * 1.4 + (m.bodyScale < 1.4 ? 0.8 : 0.15)) * dodgeScale;
      vx += (dodge.dodgeX / mag) * agility;
      vz += (dodge.dodgeZ / mag) * agility;
    }
    const flyPow = wings.reduce((s, l) => s + (l.userData.fly || 1), 0);
    const insect = nW >= 2 && flyPow >= 1.55 && diffWave() >= 8;
    if (insect) {
      m.buzzT = (m.buzzT || rng() * 8) + dt;
      const ang = (m.orbit || 0) + m.buzzT * (2.1 + nW * 0.85 + flyPow * 0.4);
      const rad = 1.05 + Math.abs(Math.sin(m.buzzT * 3.4)) * (1.8 + nW * 0.35);
      const ix = player.x + Math.cos(ang) * rad;
      const iz = player.z + Math.sin(ang) * rad;
      vx = (ix - m.x) * (2.6 + flyPow * 0.45);
      vz = (iz - m.z) * (2.6 + flyPow * 0.45);
    }
    m.leapCd = Math.max(0, (m.leapCd || 0) - dt);
    if (m.leaper && m.leaping) {
      m.x += m.leapVx * dt;
      m.z += m.leapVz * dt;
      m.leapVy -= (nW ? 11 : 22) * dt;
      m.y += m.leapVy * dt;
      if (nW) {
        m.leapVx += (dx / dist) * 3.4 * dt;
        m.leapVz += (dz / dist) * 3.4 * dt;
      }
    } else {
      m.x += vx * dt;
      m.z += vz * dt;
    }
    m.bob += dt * (4 + m.spd + nW * 2);
    const sample = (liveLegs[0] || gait[0] || m.limbs[0]).userData;
    const lift = m.centipede
      ? (0.34 + (m.rear || 0) * 0.55) * (m.bodyScale || 1)
      : m.scuttler
        ? (0.14 + Math.max(0, Math.sin(m.bob * 11.5)) * 0.22) * (m.bodyScale || 1)
        : m.spider
        ? (0.22 + Math.abs(Math.sin(m.bob * 9.5)) * 0.05) * (m.bodyScale || 1)
        : (0.38 + (sample?.len || 0.5) * 0.38) * (m.bodyScale || 1);
    const groundY = heightAt(m.x, m.z) + lift;
    let hover = groundY;
    if (nW === 1) {
      const scrape = 0.5 + 0.5 * Math.sin(m.bob * 0.65 + m.x * 0.05);
      hover = groundY + 0.08 + scrape * 0.95;
    } else if (nW >= 2) {
      const ceil = 0.85 + (nW - 1) * 1.15 + flyPow * 0.25;
      hover = groundY + ceil + Math.sin(m.bob * 0.9) * 0.35;
    }
    if (insect) {
      hover = player.y + 0.35 + nW * 0.4
        + Math.sin((m.buzzT || m.bob) * 6.4) * (1.55 + flyPow * 0.35)
        + Math.sin((m.buzzT || m.bob) * 12.2) * 0.7;
      hover = Math.max(groundY + 0.35, hover);
    }
    if (dodge.threat && nW) {
      const dodgeScale = 0.2 + 0.8 * Math.min(1, (diffWave() - 1) / 99);
      hover += dodge.dodgeY * (0.4 + nW * 0.55) * dodgeScale;
    }
    if (m.leaper && m.leaping) {
      if (m.y <= groundY && m.leapVy <= 0) {
        m.y = groundY;
        m.leaping = false;
        m.leapCd = 1.6 + rng() * 2.2;
      }
    } else {
      const climb = nW ? 2.2 + nW * 1.1 : 8;
      m.y += (hover - m.y) * Math.min(1, dt * climb);
      if (m.y < groundY) m.y = groundY;
      const midLo = nW ? 3.4 : 4.2;
      const midHi = nW ? 16 : 12;
      if (m.leaper && m.leapCd <= 0 && dist > midLo && dist < midHi) {
        const roll = rng();
        let tx, tz;
        if (roll < 0.34) {
          tx = player.x + lastFwdX * 1.55;
          tz = player.z + lastFwdZ * 1.55;
        } else if (roll < 0.67) {
          tx = player.x - lastFwdX * 1.85;
          tz = player.z - lastFwdZ * 1.85;
        } else {
          tx = player.x;
          tz = player.z;
        }
        const dur = nW ? 0.52 : 0.72;
        m.leaping = true;
        m.leapVx = (tx - m.x) / dur;
        m.leapVz = (tz - m.z) / dur;
        m.leapVy = (nW ? 4.6 : 3.2) / dur * 0.55;
      }
    }
    m.threatCd = (m.threatCd || 2) - dt;
    if (!m.threatPose && m.threatCd <= 0) {
      if (rng() < 0.42) {
        m.threatPose = 1;
        m.threatT = 0;
        m.threatDur = 0.75 + rng() * 0.85;
      }
      m.threatCd = 2.2 + rng() * 4.8;
    }
    if (m.threatPose) {
      m.threatT = (m.threatT || 0) + dt;
      if (m.threatT >= m.threatDur) m.threatPose = 0;
    }
    const threatHold = m.threatPose
      ? (m.threatT < m.threatDur - 0.22 ? Math.min(1, m.threatT * 6) : Math.max(0, (m.threatDur - m.threatT) / 0.22))
      : 0;
    for (const limb of m.limbs) {
      if (!limb.userData.live) continue;
      const u = limb.userData;
      if (u.form === "wing") {
        const flap = insect ? (16 + nW * 5 + flyPow * 3) : (7 + nW);
        limb.rotation.z = Math.sin(m.bob * flap + u.phase) * (insect ? 0.92 : 0.55 + nW * 0.08);
        limb.rotation.x = u.basePitch + Math.sin(m.bob * (insect ? 4.2 : 1.4) + u.phase) * (insect ? 0.28 : 0.12);
      } else if (u.asLeg) {
        const nL = m.nLegs || 2;
        const freq = m.scuttler ? 14 : m.spider ? 8.4 : nL >= 8 ? 6.2 : nL === 4 ? 4.6 : 3.5;
        const amp = m.scuttler ? 0.95 : m.spider ? 0.72 : nL === 2 ? 0.62 : 0.4;
        const phase = m.spider || m.scuttler ? (u.legIndex || 0) * 0.85 + ((u.legIndex || 0) % 2) * Math.PI : (u.legIndex || 0) * Math.PI;
        limb.rotation.x = u.basePitch + Math.sin(m.bob * freq + phase) * amp;
        limb.rotation.z = Math.sin(m.bob * freq * 0.5 + phase) * (m.scuttler ? 0.32 : m.spider ? 0.22 : 0.1);
        if (u.baseYaw != null) limb.rotation.y = u.baseYaw;
      } else if (u.form === "tentacle") {
        limb.rotation.x = u.basePitch + Math.sin(m.bob * 2.6 + u.phase) * 0.45;
        limb.rotation.z = Math.sin(m.bob * 1.8 + u.phase) * 0.22;
      } else if (u.form === "bug") {
        limb.rotation.x = u.basePitch + Math.sin(m.bob * 5.2 + u.phase) * 0.4;
      } else if (u.form === "spike") {
        limb.rotation.x = u.basePitch + Math.sin(m.bob * 2.4 + u.phase) * 0.12;
      } else {
        limb.rotation.x = u.basePitch + Math.sin(m.bob * 2.2 + u.phase) * 0.2;
      }
      if (threatHold > 0.02 && u.form !== "torso" && limb !== m.jabLimb) {
        const raiseX = u.asLeg ? -1.08 : -1.58;
        limb.rotation.x = limb.rotation.x * (1 - threatHold) + raiseX * threatHold;
        limb.rotation.z = (limb.rotation.z || 0) + Math.sin(m.bob * 9 + (u.phase || 0)) * 0.1 * threatHold;
      } else if (limb !== m.jabLimb) overlayLimbFlourish(limb, m, dt);
    }
    if (m.centipede && m.segs) {
      m.rear = dist < 3.6 ? Math.min(1, (m.rear || 0) + dt * 2.4) : Math.max(0, (m.rear || 0) - dt * 1.5);
      const closeK = dist < 9 ? clamp((9 - dist) / 7, 0, 1) : 0;
      for (let i = 0; i < m.segs.length; i++) {
        const seg = m.segs[i];
        const wave = Math.sin(m.bob * 3.6 + i * 0.82) * 0.07;
        const up = m.rear * Math.max(0, 1 - i / 4.4) * 0.58;
        const weave = Math.sin((m.slither || m.bob) + i * 0.58) * (0.05 + closeK * 0.16);
        seg.position.y = wave + up;
        seg.position.x = weave;
        seg.rotation.x = -m.rear * Math.max(0, 0.72 - i * 0.13);
        seg.rotation.y = Math.cos((m.slither || m.bob) + i * 0.58) * 0.22 * (0.35 + closeK);
      }
    }
    syncMob(m);
    const reach = 0.95 + m.hitR * 0.32;
    const close = dist < reach + 0.55;
    if (close) {
      vx = (dx / dist) * m.spd * 1.6;
      vz = (dz / dist) * m.spd * 1.6;
      if (!m.jabLimb || !m.jabLimb.userData.live) {
        m.jabLimb = liveLimbs[(rng() * Math.max(1, liveLimbs.length)) | 0] || null;
        m.jabPhase = 0;
      }
      m.jabPhase = (m.jabPhase || 0) + dt * 3.8;
      const jab = Math.sin(Math.min(Math.PI, m.jabPhase * Math.PI));
      if (m.jabLimb?.userData.live) {
        m.jabLimb.rotation.x = (m.jabLimb.userData.basePitch || 0.35) + jab * 1.25;
        m.jabLimb.rotation.z = (m.jabLimb.userData.baseRoll || 0) + jab * 0.35;
      }
      if (m.jabPhase >= 0.42 && dist < reach && m.hitCd <= 0 && iFrame <= 0) {
        const dmg = (m.jabLimb?.userData.dmg || 1);
        damage(dmg);
        m.hitCd = 0.62;
        m.x -= (dx / dist) * 0.85;
        m.z -= (dz / dist) * 0.85;
      }
      if (m.jabPhase >= 1) {
        m.jabLimb = null;
        m.jabPhase = 0;
      }
    } else {
      m.jabLimb = null;
      m.jabPhase = 0;
    }
    if (m.ranged) {
      m.fireCd = (m.fireCd || 0) - dt;
      if (m.fireCd <= 0 && dist > 6 && dist < 34) {
        m.fireCd = 1.6 + rng() * 1.8;
        fireEnemyShot(m);
      }
    }
    const aheadH = heightAt(m.x + vx * 0.18, m.z + vz * 0.18, m.y);
    const hereH = heightAt(m.x, m.z, m.y);
    if (aheadH > hereH + 0.35) {
      m.y += Math.min(9 * dt, aheadH - hereH + 0.25);
    }
  }
  mobs = mobs.filter((m) => m.alive);
  if (running && !dead && waveLeft <= 0 && pending <= 0 && dripLeft <= 0 && wave > 0) {
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
    const floorY = heightAt(d.mesh.position.x, d.mesh.position.z) + 0.04;
    if (d.mesh.position.y < floorY) {
      d.mesh.position.y = floorY;
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

function eatLoot(c) {
  c.mesh.visible = false;
  c.mesh.removeFromParent();
  c.mesh.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
}

function tickLoot(dt) {
  const mag = stats.magnet;
  const bodyY = (xrOn ? heightAt(player.x, player.z) : player.y) + (xrOn ? 1.1 : -0.35);
  for (let i = loot.length - 1; i >= 0; i--) {
    const c = loot[i];
    const gnd = heightAt(c.mesh.position.x, c.mesh.position.z) + 0.12;
    if (!c.grounded) {
      c.vy -= 16 * dt;
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.position.z += c.vz * dt;
      if (c.mesh.position.y <= gnd) {
        c.mesh.position.y = gnd;
        c.grounded = true;
        c.vy = 0;
      }
    } else {
      c.mesh.rotation.y += dt * 2;
      c.mesh.position.y = gnd + Math.sin(performance.now() * 0.004 + i) * 0.04;
    }
    const dx = player.x - c.mesh.position.x;
    const dz = player.z - c.mesh.position.z;
    const dy = bodyY - c.mesh.position.y;
    const distXZ = Math.hypot(dx, dz);
    const dist = Math.hypot(dx, dy, dz);
    if (distXZ < mag + 0.5) {
      c.grounded = false;
      const pull = (mag + 1.2 - distXZ) * 8 * dt;
      c.mesh.position.x += (dx / (dist || 1)) * pull;
      c.mesh.position.z += (dz / (dist || 1)) * pull;
      c.mesh.position.y += (dy / (dist || 1)) * pull;
    }
    if (distXZ < 0.95) {
      if (c.kind === "ammo") {
        player.ammo += c.val;
        sfx.reload();
      } else if (c.kind === "health") {
        player.hp = Math.min(stats.maxHp, player.hp + c.val);
        sfx.heal();
      } else {
        player.coins += c.val;
        sfx.chime();
      }
      eatLoot(c);
      loot.splice(i, 1);
    }
  }
}

function facingXZ() {
  lookFlat();
  return tmp;
}

/** Camera forward on the ground plane. Ignores pitch so WASD never flips when you look up or down. */
function lookFlat() {
  camera.getWorldDirection(tmp);
  tmp.y = 0;
  if (tmp.lengthSq() < 1e-6) tmp.set(lastFwdX, 0, lastFwdZ);
  if (tmp.lengthSq() < 1e-6) tmp.set(0, 0, -1);
  tmp.normalize();
  lastFwdX = tmp.x;
  lastFwdZ = tmp.z;
  tmp2.set(-tmp.z, 0, tmp.x);
  if (!xrOn) yaw = Math.atan2(-tmp.x, -tmp.z);
  return tmp;
}

function paintRadar() {
  if (!radarCtx) return;
  const s = 256;
  radarCtx.clearRect(0, 0, s, s);
  radarCtx.fillStyle = "rgba(12,12,16,0.78)";
  radarCtx.beginPath();
  radarCtx.arc(128, 128, 122, 0, Math.PI * 2);
  radarCtx.fill();
  radarCtx.strokeStyle = "rgba(212,175,55,0.55)";
  radarCtx.lineWidth = 3;
  radarCtx.stroke();
  radarCtx.strokeStyle = "rgba(255,255,255,0.12)";
  radarCtx.lineWidth = 1;
  radarCtx.beginPath(); radarCtx.arc(128, 128, 42, 0, Math.PI * 2); radarCtx.stroke();
  radarCtx.beginPath(); radarCtx.arc(128, 128, 74, 0, Math.PI * 2); radarCtx.stroke();
  radarCtx.beginPath(); radarCtx.arc(128, 128, 104, 0, Math.PI * 2); radarCtx.stroke();
  radarCtx.beginPath(); radarCtx.moveTo(128, 10); radarCtx.lineTo(128, 246); radarCtx.stroke();
  radarCtx.beginPath(); radarCtx.moveTo(10, 128); radarCtx.lineTo(246, 128); radarCtx.stroke();
  const fwd = facingXZ();
  const rx = -fwd.z, rz = fwd.x;
  const range = 72;
  const plot = (x, z, color, size, diamond) => {
    const dx = x - player.x, dz = z - player.z;
    const lx = dx * rx + dz * rz;
    const lz = dx * fwd.x + dz * fwd.z;
    const px = 128 + (lx / range) * 110;
    const py = 128 - (lz / range) * 110;
    if (Math.hypot(px - 128, py - 128) > 118) return;
    radarCtx.fillStyle = color;
    if (diamond) {
      radarCtx.beginPath();
      radarCtx.moveTo(px, py - size);
      radarCtx.lineTo(px + size, py);
      radarCtx.lineTo(px, py + size);
      radarCtx.lineTo(px - size, py);
      radarCtx.closePath();
      radarCtx.fill();
    } else {
      radarCtx.beginPath();
      radarCtx.arc(px, py, size, 0, Math.PI * 2);
      radarCtx.fill();
    }
  };
  for (const m of mobs) {
    if (m.alive) plot(m.x, m.z, "#ff3344", 4, false);
  }
  for (const t of turrets) plot(t.x, t.z, "#c8b070", 6, true);
  if (flag) plot(flag.x, flag.z, "#d4af37", 7, true);
  radarCtx.fillStyle = "#f4f1ea";
  radarCtx.beginPath();
  radarCtx.moveTo(128, 118);
  radarCtx.lineTo(123, 136);
  radarCtx.lineTo(133, 136);
  radarCtx.closePath();
  radarCtx.fill();
  radarTex.needsUpdate = true;
}

function drawHeart(ctx, x, y, s, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 0.05, s * 0.05, -s * 0.55, -s * 0.15, -s * 0.5, -s * 0.5);
  ctx.bezierCurveTo(-s * 0.48, -s * 0.85, -s * 0.08, -s * 0.82, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.08, -s * 0.82, s * 0.48, -s * 0.85, s * 0.5, -s * 0.5);
  ctx.bezierCurveTo(s * 0.55, -s * 0.15, s * 0.05, s * 0.05, 0, s * 0.35);
  ctx.closePath();
  if (fill === 1) {
    ctx.fillStyle = "#c42b2b";
    ctx.fill();
  } else if (fill === 0.5) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#c42b2b";
    ctx.fillRect(-s, -s, s, s * 2);
    ctx.restore();
    ctx.strokeStyle = "#c42b2b";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#8a4038";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function paintHud3d() {
  if (!hudCtx) return;
  hudCtx.clearRect(0, 0, 512, 320);
  hudCtx.fillStyle = "rgba(244,241,234,0.88)";
  hudCtx.fillRect(0, 0, 512, 320);
  hudCtx.fillStyle = "#111";
  hudCtx.font = "700 22px Outfit, sans-serif";
  hudCtx.fillText("HEALTH", 16, 28);
  const maxH = Math.round(stats.maxHp / 2);
  const hp = Math.max(0, player.hp);
  for (let i = 0; i < maxH; i++) {
    const left = hp - i * 2;
    const fill = left >= 2 ? 1 : left === 1 ? 0.5 : 0;
    drawHeart(hudCtx, 28 + i * 38, 62, 26, fill);
  }
  hudCtx.fillStyle = "#111";
  hudCtx.font = "700 24px Outfit, sans-serif";
  hudCtx.fillText((isSpell() ? "SPELL " : "AMMO ") + ammoLabel(), 16, 108);
  hudCtx.fillText("W" + wave + "   " + (player.coins | 0) + " ◎   " + wep().name, 16, 142);
  if (reloadT > 0 && reloadMax > 0) {
    hudCtx.fillStyle = "#d4af37";
    hudCtx.fillRect(16, 154, 240 * (1 - reloadT / reloadMax), 8);
    hudCtx.strokeStyle = "#111";
    hudCtx.strokeRect(16, 154, 240, 8);
  }
  hudCtx.fillStyle = "#6a655c";
  hudCtx.font = "600 18px Outfit, sans-serif";
  hudCtx.fillText("L stick move     R stick turn", 16, 192);
  hudCtx.fillText("R trigger laser  A jump", 16, 220);
  hudCtx.fillText((shopOnX ? "Y reload         X shop" : "X reload         Y shop") + "  B guns", 16, 248);
  hudCtx.fillText("L trigger flashlight", 16, 276);
  hudCtx.fillStyle = "#d4af37";
  hudCtx.font = "600 16px Outfit, sans-serif";
  hudCtx.fillText("Gold flag waypoint  ·  red = horde", 16, 304);
  hudTex.needsUpdate = true;
}

function syncWrist() {
  if (!wristRoot) return;
  if (!xrOn || !running || dead) {
    wristRoot.visible = false;
    return;
  }
  const left = hands.find((h) => h.handed === "left") || hands[0];
  if (left && wristRoot.parent !== left.grip) {
    left.grip.add(wristRoot);
    wristRoot.position.set(0.02, -0.02, 0.08);
    wristRoot.rotation.set(-Math.PI / 2.05, 0, 0.12);
  }
  wristRoot.visible = true;
  paintRadar();
}

function heartGlyphs() {
  const maxH = Math.round(stats.maxHp / 2);
  const hp = Math.max(0, player.hp);
  let s = "";
  for (let i = 0; i < maxH; i++) {
    const left = hp - i * 2;
    s += left >= 2 ? "♥" : left === 1 ? "❥" : "♡";
  }
  return s;
}

function hud() {
  if ($("hpv")) $("hpv").textContent = heartGlyphs();
  if ($("hpi")) $("hpi").style.width = (100 * player.hp) / stats.maxHp + "%";
  $("ammo").textContent = ammoLabel();
  $("wep").textContent = wep().name;
  $("coins").textContent = String(player.coins | 0);
  $("wave").textContent = String(wave);
  paintHud3d();
}

function makeFlagMesh() {
  const g = new THREE.Group();
  const col = COLORS[(rng() * COLORS.length) | 0];
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.1, 6), mat(0x3a342c));
  pole.position.y = 1.55;
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 0.82),
    new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 1.35 }),
  );
  cloth.position.set(0.68, 2.55, 0);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: col }));
  ball.position.y = 3.12;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 10),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.position.y = 2.55;
  const light = new THREE.PointLight(col, 3.2, 18, 1.4);
  light.position.y = 2.6;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 1.15, 92, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  beam.position.y = 48;
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.16, 110, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  core.position.y = 56;
  g.add(pole, cloth, ball, glow, light, beam, core);
  g.userData.cloth = cloth;
  g.userData.glow = glow;
  g.userData.beam = beam;
  g.userData.core = core;
  g.userData.light = light;
  return g;
}

function placeFlag() {
  const ox = flag ? flag.x : player.x;
  const oz = flag ? flag.z : player.z;
  if (flag?.mesh) flag.mesh.removeFromParent();
  flagGen++;
  const ang = rng() * Math.PI * 2;
  const dist = Math.min(222, 36 + flagGen * 15 + rng() * 27);
  const x = ox + Math.cos(ang) * dist;
  const z = oz + Math.sin(ang) * dist;
  const mesh = makeFlagMesh();
  mesh.position.set(x, heightAt(x, z, 4), z);
  scene.add(mesh);
  flag = { mesh, x, z };
}

function tickFlag(dt) {
  if (!flag) return;
  flag.mesh.position.y = heightAt(flag.x, flag.z);
  if (flag.mesh.userData.cloth) flag.mesh.userData.cloth.rotation.y = Math.sin(performance.now() * 0.003) * 0.25;
  const night = clamp(lastDark, 0, 1);
  if (flag.mesh.userData.glow) {
    const p = 0.85 + Math.sin(performance.now() * 0.006) * 0.35;
    flag.mesh.userData.glow.scale.setScalar(p);
    if (flag.mesh.userData.glow.material) flag.mesh.userData.glow.material.opacity = 0.22 + night * 0.5;
  }
  if (flag.mesh.userData.beam?.material) flag.mesh.userData.beam.material.opacity = 0.16 + night * 0.58;
  if (flag.mesh.userData.core?.material) flag.mesh.userData.core.material.opacity = 0.32 + night * 0.55;
  if (flag.mesh.userData.light) flag.mesh.userData.light.intensity = 3.2 + night * 24;
  if (Math.hypot(player.x - flag.x, player.z - flag.z) < 2.1) {
    player.coins += 50;
    sfx.flag();
    showBanner("NEW WAYPOINT");
    announcing = 2.4;
    placeFlag();
  }
}

function damage(n) {
  if (dead || !running) return;
  player.hp -= n;
  hurtT = 0.28;
  iFrame = 0.55;
  sfx.hurt();
  if (player.hp <= 0) gameOver();
}

function addMenuHit(x, y, w, h, kind, waveN) {
  menuHits.push({ x, y, w, h, kind, wave: waveN || 1 });
}

function drawMenuBtn(ctx, x, y, w, h, label, fill, ink) {
  ctx.fillStyle = fill || "#1a1a1e";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.fillStyle = ink || "#f4f1ea";
  ctx.font = "700 26px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function paintMenu3d(kind) {
  if (!overCtx) return;
  const w = 1024, h = 768;
  menuHits = [];
  overCtx.fillStyle = "#f7f4ee";
  overCtx.fillRect(0, 0, w, h);
  const waves = unlockedStarts();
  if (kind === "over") {
    overCtx.fillStyle = "#d4af37";
    overCtx.font = "600 26px Outfit, sans-serif";
    overCtx.fillText("TAKEN BY THE HORDE", 40, 48);
    overCtx.fillStyle = "#111";
    overCtx.font = "700 72px Cinzel, serif";
    overCtx.fillText("DOWN", 40, 128);
    overCtx.font = "500 26px Outfit, sans-serif";
    overCtx.fillText("Wave " + wave + "  ·  " + (player.coins | 0) + " ◎  ·  " + initials.join(""), 40, 172);
    drawMenuBtn(overCtx, 40, 200, 460, 64, "NEW GAME  ·  WAVE 1", "#1a1a1e", "#f4f1ea");
    addMenuHit(40, 200, 460, 64, "start", 1);
  } else {
    overCtx.fillStyle = "#d4af37";
    overCtx.font = "600 26px Outfit, sans-serif";
    overCtx.fillText("THE HORDE", 40, 48);
    overCtx.fillStyle = "#111";
    overCtx.font = "700 64px Cinzel, serif";
    overCtx.fillText("MAIN MENU", 40, 118);
    overCtx.font = "500 22px Outfit, sans-serif";
    overCtx.fillStyle = "#6a655c";
    overCtx.fillText("Shoot a start. Jump-in waves pay +50 ◎ per wave.", 40, 158);
    drawMenuBtn(overCtx, 40, 184, 420, 60, "NEW GAME  ·  WAVE 1", "#1a1a1e", "#f4f1ea");
    addMenuHit(40, 184, 420, 60, "start", 1);
    if (paused) {
      drawMenuBtn(overCtx, 480, 184, 280, 60, "RESUME", "#d4af37", "#111");
      addMenuHit(480, 184, 280, 60, "resume", 0);
    }
  }
  const top = kind === "over" ? 284 : 264;
  if (waves.length) {
    overCtx.fillStyle = "#6a655c";
    overCtx.font = "600 20px Outfit, sans-serif";
    overCtx.fillText("UNLOCKED STARTS", 40, top);
    const cols = 4, bw = 230, bh = 52, gap = 12;
    waves.forEach((wv, i) => {
      const c = i % cols;
      const r = (i / cols) | 0;
      const x = 40 + c * (bw + gap);
      const y = top + 16 + r * (bh + gap);
      drawMenuBtn(overCtx, x, y, bw, bh, "W" + wv + "  +" + (wv * 50) + "◎", "#111", "#d4af37");
      addMenuHit(x, y, bw, bh, "start", wv);
    });
  } else {
    overCtx.fillStyle = "#8a8680";
    overCtx.font = "500 20px Outfit, sans-serif";
    overCtx.fillText("Reach wave 5 to unlock skip starts.", 40, top + 8);
  }
  overTex.needsUpdate = true;
}

function paintOver3d() {
  paintMenu3d("over");
}

function placeOver3d() {
  if (!overMesh || !overMesh.visible) return;
  camera.getWorldPosition(tmp);
  camera.getWorldDirection(tmp2);
  tmp2.y = 0;
  if (tmp2.lengthSq() < 1e-4) tmp2.set(0, 0, -1);
  tmp2.normalize();
  overMesh.position.copy(tmp).addScaledVector(tmp2, 1.85);
  overMesh.position.y = tmp.y + 0.02;
  overMesh.lookAt(tmp);
}

function hitPanel(mesh, origin, dir) {
  if (!mesh || !mesh.visible) return false;
  _ray.set(origin, dir);
  _ray.far = 8;
  const hits = _ray.intersectObject(mesh, true);
  return hits.length > 0;
}

function gameOver() {
  dead = true;
  running = false;
  paused = false;
  menuOpen = false;
  stopMusic();
  shopOpen = false;
  $("shop").hidden = true;
  if (shopRoot) shopRoot.visible = false;
  noteBestWave();
  const ini = initials.join("");
  const rows = loadLb();
  rows.push({ ini, wave, coins: player.coins | 0, t: Date.now() });
  rows.sort((a, b) => b.wave - a.wave || b.coins - a.coins);
  saveLb(rows);
  $("over-stats").textContent = "Wave " + wave + " · " + (player.coins | 0) + " coins · " + ini;
  paintLb();
  paintWaveButtons();
  paintOver3d();
  if (xrOn) {
    $("over").hidden = true;
    if (overMesh) overMesh.visible = true;
  } else {
    $("over").hidden = false;
    if (overMesh) overMesh.visible = false;
    if (controls?.isLocked) controls.unlock();
  }
}

function resetRun() {
  for (const m of mobs) m.mesh.removeFromParent();
  for (const d of debris) d.mesh.removeFromParent();
  for (const c of loot) c.mesh.removeFromParent();
  for (const s of shots) s.mesh.removeFromParent();
  for (const d of drones) d.mesh.removeFromParent();
  for (const t of turrets) t.mesh.removeFromParent();
  for (const b of balls) b.mesh.removeFromParent();
  for (const m of meteors) m.mesh.removeFromParent();
  for (const s of eShots) s.mesh.removeFromParent();
  if (tankMesh) tankMesh.removeFromParent();
  tankMesh = null;
  if (heliMesh) { heliMesh.removeFromParent(); heliMesh = null; }
  if (bikeMesh) { bikeMesh.removeFromParent(); bikeMesh = null; }
  if (noodleMesh) { noodleMesh.removeFromParent(); noodleMesh = null; }
  if (flag?.mesh) flag.mesh.removeFromParent();
  flag = null;
  for (const f of fx) f.mesh.removeFromParent();
  fx = [];
  skyFlash = 0;
  clearHexes();
  mobs = []; debris = []; loot = []; shots = []; eShots = [];
  drones = []; turrets = []; balls = []; meteors = []; craters = [];
  grabMob = null;
  planetId = "";
  meteorT = 10;
  wave = 0;
  waveLeft = 0;
  pending = 0;
  dripTotal = 0;
  dripLeft = 0;
  dripElapsed = 0;
  ammoT = 3;
  healthT = 16;
  reloadT = 0;
  reloadMax = 0;
  flagGen = 0;
  sprintBuys = 0;
  flashBuys = 0;
  clipBuys = 0;
  cryLast = [];
  nightCutsOwned = 0;
  nightCutsLive = 0;
  plasmaT = 0;
  if (plasmaMesh) plasmaMesh.visible = false;
  if (plasmaGlow) plasmaGlow.visible = false;
  cryT = 0;
  oofLock = 0;
  meleeHave = false;
  meleeCd = 0;
  stopMusic();
  hexSpawnCd = 0;
  owned = new Set(["pistol"]);
  stats = { speed: 1, jump: 1, maxHp: MAX_HP0, reload: 1, magnet: 2.4, jumps: 1, sprint: 0, sprintCd: 10, sprintMul: 1, wheelie: 0, flash: 1, autoReload: 0 };
  player = { x: 0, y: 1.6, z: 0, vx: 0, vy: 0, vz: 0, hp: MAX_HP0, grounded: true, coins: 0, ammo: 48, mag: 12, wep: "pistol", tank: false, heli: false, jumpsLeft: 1, sprinting: false, sprintT: 0, sprintCdT: 0, mom: 0, pounding: false, bike: false };
  tankYaw = 0;
  heliYaw = 0;
  dead = false;
  shopOpen = false;
  shopSel = 0;
  yaw = 0;
  if (overMesh) overMesh.visible = false;
  if (shopRoot) shopRoot.visible = false;
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
  startRunFrom(1);
}

function startRunFrom(startWave) {
  startWave = Math.max(1, startWave | 0);
  sfxUnlock();
  resetRun();
  menuOpen = false;
  paused = false;
  $("start").hidden = true;
  $("over").hidden = true;
  if (overMesh) overMesh.visible = false;
  running = true;
  if (startWave > 1) {
    wave = startWave - 1;
    player.coins = startWave * 50;
    applyPlanetTex(true);
  }
  startMusic();
  spawnWave();
  placeFlag();
  for (let i = 0; i < 4; i++) spawnHexCluster();
  player.y = hillsAt(player.x, player.z) + 1.6;
  player.grounded = true;
  if (!xrOn) controls.lock();
}

function openMainMenu() {
  menuOpen = true;
  shopOpen = false;
  $("shop").hidden = true;
  if (shopRoot) shopRoot.visible = false;
  if (running && !dead) {
    paused = true;
    running = false;
    stopMusic();
  }
  if (dead) {
    dead = false;
    paused = false;
    resetRun();
  }
  paintWaveButtons();
  paintMenu3d("main");
  if (xrOn) {
    $("start").hidden = true;
    $("over").hidden = true;
    if (overMesh) overMesh.visible = true;
  } else {
    $("start").hidden = false;
    $("over").hidden = true;
    if (overMesh) overMesh.visible = false;
    if (controls?.isLocked) controls.unlock();
  }
}

function resumeRun() {
  if (!paused) return;
  menuOpen = false;
  paused = false;
  running = true;
  $("start").hidden = true;
  $("over").hidden = true;
  if (overMesh) overMesh.visible = false;
  startMusic();
  if (!xrOn) controls.lock();
}

function toggleMainMenu() {
  if (menuOpen && paused) resumeRun();
  else if (menuOpen && !paused && !running && !dead) return;
  else openMainMenu();
}

function makeBolt(color, thick) {
  const g = new THREE.Group();
  const len = 1.35;
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(thick * 0.55, thick * 0.22, len, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  core.rotation.x = Math.PI / 2;
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(thick * 2.2, thick * 0.9, len, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.rotation.x = Math.PI / 2;
  const halo = new THREE.Mesh(
    new THREE.CylinderGeometry(thick * 3.6, thick * 1.6, len * 0.92, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  halo.rotation.x = Math.PI / 2;
  g.add(halo, glow, core);
  return g;
}

function aimBolt(mesh, dir) {
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
}

function fireTex() {
  if (_fireTex) return _fireTex;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, "#140000");
  g.addColorStop(0.16, "#7a0a00");
  g.addColorStop(0.38, "#ee2200");
  g.addColorStop(0.6, "#ff7a12");
  g.addColorStop(0.82, "#ffd24a");
  g.addColorStop(1, "#fff6d0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = `rgba(255,${90 + ((Math.random() * 150) | 0)},${18 + ((Math.random() * 80) | 0)},${0.12 + Math.random() * 0.48})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + Math.random() * 10, 8 + Math.random() * 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = `rgba(255,255,${180 + ((Math.random() * 70) | 0)},0.45)`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 100, 1 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  _fireTex = new THREE.CanvasTexture(c);
  _fireTex.wrapS = _fireTex.wrapT = THREE.RepeatWrapping;
  _fireTex.colorSpace = THREE.SRGBColorSpace;
  return _fireTex;
}

function boltSeg(g, a, b, thick, color, opacity) {
  if (!_boltGeo) _boltGeo = new THREE.CylinderGeometry(1, 1, 1, 5);
  const d = b.clone().sub(a);
  const L = Math.max(0.05, d.length());
  const mesh = new THREE.Mesh(
    _boltGeo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(thick, L, thick);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.add(mesh);
}

function zigzagPts(from, to, n, jag) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = from.clone().lerp(to, u);
    if (i > 0 && i < n) {
      p.x += (rng() - 0.5) * jag * (0.35 + u);
      p.z += (rng() - 0.5) * jag * (0.35 + u);
      p.y += (rng() - 0.5) * jag * 0.32;
    }
    pts.push(p);
  }
  return pts;
}

function makeLightningBolt(from, to) {
  const g = new THREE.Group();
  const main = zigzagPts(from, to, 12, 2.6);
  for (let i = 0; i < main.length - 1; i++) {
    boltSeg(g, main[i], main[i + 1], 0.1, 0xffffff, 1);
    boltSeg(g, main[i], main[i + 1], 0.24, 0x88bbff, 0.48);
    boltSeg(g, main[i], main[i + 1], 0.48, 0x4466ff, 0.18);
  }
  const nBranch = 3 + ((rng() * 3) | 0);
  for (let b = 0; b < nBranch; b++) {
    const i = 2 + ((rng() * (main.length - 4)) | 0);
    const start = main[i];
    const end = start.clone();
    end.x += (rng() - 0.5) * 7;
    end.z += (rng() - 0.5) * 7;
    end.y -= 5 + rng() * 9;
    const br = zigzagPts(start, end, 5, 1.35);
    for (let j = 0; j < br.length - 1; j++) {
      boltSeg(g, br[j], br[j + 1], 0.045, 0xddf0ff, 0.92);
      boltSeg(g, br[j], br[j + 1], 0.13, 0x6688ff, 0.32);
    }
  }
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 18),
    new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.copy(to);
  disc.position.y += 0.04;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 5.2, 22),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(to);
  ring.position.y += 0.08;
  g.add(disc, ring);
  return g;
}

function aimStrikePoint(origin, dir, maxR) {
  maxR = maxR || 44;
  let best = origin.clone().addScaledVector(dir, maxR);
  let bestT = maxR;
  for (const m of mobs) {
    if (!m.alive) continue;
    const to = new THREE.Vector3(m.x - origin.x, m.y - origin.y, m.z - origin.z);
    const t = to.dot(dir);
    if (t < 1.1 || t > bestT) continue;
    const closest = origin.clone().addScaledVector(dir, t);
    if (closest.distanceTo(new THREE.Vector3(m.x, m.y, m.z)) < 1.5 + m.hitR) {
      bestT = t;
      best.set(m.x, m.y, m.z);
    }
  }
  for (let t = 1.1; t < bestT; t += 0.42) {
    const p = origin.clone().addScaledVector(dir, t);
    const hy = heightAt(p.x, p.z);
    if (p.y <= hy + 0.32) {
      best.set(p.x, hy, p.z);
      bestT = t;
      break;
    }
  }
  best.y = heightAt(best.x, best.z);
  return best;
}

function strikeLightning(pos) {
  const from = pos.clone();
  from.y += 48 + rng() * 10;
  from.x += (rng() - 0.5) * 7;
  from.z += (rng() - 0.5) * 7;
  const mesh = makeLightningBolt(from, pos);
  scene.add(mesh);
  fx.push({ mesh, life: 0.3, kind: "bolt" });
  const from2 = from.clone().add(new THREE.Vector3((rng() - 0.5) * 5, 3, (rng() - 0.5) * 5));
  const to2 = pos.clone().add(new THREE.Vector3((rng() - 0.5) * 1.4, 0, (rng() - 0.5) * 1.4));
  to2.y = heightAt(to2.x, to2.z);
  const mesh2 = makeLightningBolt(from2, to2);
  scene.add(mesh2);
  fx.push({ mesh: mesh2, life: 0.2, kind: "bolt" });
  skyFlash = 0.24;
  aoeAt(pos, WEPS.thunder.aoe, WEPS.thunder);
  sfx.thunder();
}

function makeFireball() {
  const g = new THREE.Group();
  const tex = fireTex();
  const scroll = tex.clone();
  scroll.wrapS = scroll.wrapT = THREE.RepeatWrapping;
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 18, 14),
    new THREE.MeshBasicMaterial({ map: scroll, color: 0xffffff }),
  );
  const hot = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(1.12, 14, 12),
    new THREE.MeshBasicMaterial({ color: 0xff5511, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.22, 1),
    new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: false }),
  );
  g.add(glow, core, hot, shell);
  for (let i = 0; i < 16; i++) {
    const tongue = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.58 + rng() * 0.42, 5),
      new THREE.MeshBasicMaterial({ map: scroll, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2));
    tongue.position.copy(new THREE.Vector3(0, 0.95, 0).applyQuaternion(q));
    tongue.quaternion.copy(q);
    tongue.userData.flame = true;
    tongue.userData.phase = rng() * 6;
    tongue.userData.spin = rng() < 0.5 ? -1 : 1;
    g.add(tongue);
  }
  const light = new THREE.PointLight(0xff6622, 3.6, 11, 1.5);
  g.add(light);
  g.userData.scroll = scroll;
  g.userData.core = core;
  return g;
}

function spawnFireWall(pos, dir) {
  dir = dir.clone();
  dir.y = 0;
  if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
  dir.normalize();
  const g = new THREE.Group();
  const tex = fireTex();
  const n = 11;
  const width = 8.4;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1) - 0.5) * width;
    const h = 2.3 + rng() * 1.7;
    const matl = new THREE.MeshBasicMaterial({
      map: tex.clone(),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    matl.map.wrapS = matl.map.wrapT = THREE.RepeatWrapping;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.1 + rng() * 0.4, h), matl);
    plane.position.set(u, h * 0.48, (rng() - 0.5) * 0.4);
    plane.userData.flame = true;
    plane.userData.phase = rng() * 6;
    g.add(plane);
    const cross = plane.clone();
    cross.rotation.y = Math.PI * 0.5;
    cross.position.z += 0.06;
    g.add(cross);
  }
  const light = new THREE.PointLight(0xff5511, 4.4, 13, 1.45);
  light.position.y = 1.15;
  g.add(light);
  const hy = heightAt(pos.x, pos.z);
  g.position.set(pos.x, hy, pos.z);
  const look = pos.clone().add(dir);
  look.y = hy;
  g.lookAt(look);
  scene.add(g);
  fx.push({ mesh: g, kind: "firewall", dir, speed: 13.8, life: 1.5, hitCd: new Map(), width });
}

function spawnConflagration(pos) {
  const g = new THREE.Group();
  const tex = fireTex();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const matl = new THREE.MeshBasicMaterial({
      map: tex.clone(),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    matl.map.wrapS = matl.map.wrapT = THREE.RepeatWrapping;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.9 + rng() * 0.6), matl);
    plane.position.set(Math.cos(a) * 1.15, 0.95, Math.sin(a) * 1.15);
    plane.rotation.y = a;
    plane.userData.flame = true;
    plane.userData.phase = a;
    g.add(plane);
  }
  g.position.set(pos.x, heightAt(pos.x, pos.z), pos.z);
  scene.add(g);
  fx.push({ mesh: g, kind: "pool", life: 2.15, r: 3.5, hitCd: new Map() });
}

function detonateShot(s) {
  if (!s.def) return;
  if (s.def.aoe) aoeAt(s.mesh.position, s.def.aoe, s.def);
  if (s.def.missile) {
    const p = s.mesh.position;
    craterAt(p.x, p.z, 2.2, 1.15);
    spawnMeteorBlast(p, 1.5);
  }
  if (s.def.fireball) {
    spawnConflagration(s.mesh.position);
    spawnFireWall(s.mesh.position, s.dir || new THREE.Vector3(0, 0, -1));
  }
}

function tickFx(dt) {
  skyFlash = Math.max(0, skyFlash - dt * 2.6);
  const t = performance.now() * 0.001;
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    f.life -= dt;
    if (f.kind === "bolt") {
      f.mesh.traverse((ch) => {
        if (ch.material && ch.material.opacity != null) ch.material.opacity *= 0.84;
      });
    } else if (f.kind === "firewall") {
      f.mesh.position.addScaledVector(f.dir, f.speed * dt);
      f.mesh.position.y = heightAt(f.mesh.position.x, f.mesh.position.z);
      const look = f.mesh.position.clone().add(f.dir);
      look.y = f.mesh.position.y;
      f.mesh.lookAt(look);
      for (const [k, v] of f.hitCd) f.hitCd.set(k, v - dt);
      for (const ch of f.mesh.children) {
        if (ch.userData.flame) {
          ch.scale.y = 0.82 + Math.sin(t * 16 + (ch.userData.phase || 0)) * 0.24;
          if (ch.material?.map) ch.material.map.offset.y -= dt * 1.7;
        }
      }
      const half = (f.width || 8) * 0.5;
      for (const m of mobs) {
        if (!m.alive) continue;
        const dx = m.x - f.mesh.position.x;
        const dz = m.z - f.mesh.position.z;
        const along = dx * f.dir.x + dz * f.dir.z;
        const side = dx * -f.dir.z + dz * f.dir.x;
        if (along < -0.7 || along > 1.5 || Math.abs(side) > half) continue;
        if ((f.hitCd.get(m) || 0) > 0) continue;
        f.hitCd.set(m, 0.14);
        const live = m.limbs.filter((l) => l.userData.live);
        for (let k = 0; k < 2 && live.length; k++) {
          const l = live.pop();
          if (l) hitLimb(l, m);
        }
        m.x += f.dir.x * 0.62;
        m.z += f.dir.z * 0.62;
      }
    } else if (f.kind === "pool") {
      for (const [k, v] of f.hitCd) f.hitCd.set(k, v - dt);
      for (const ch of f.mesh.children) {
        if (ch.userData.flame) {
          ch.scale.y = 0.8 + Math.sin(t * 14 + (ch.userData.phase || 0)) * 0.22;
          if (ch.material?.map) ch.material.map.offset.y -= dt * 1.4;
        }
      }
      for (const m of mobs) {
        if (!m.alive) continue;
        if (Math.hypot(m.x - f.mesh.position.x, m.z - f.mesh.position.z) > (f.r || 3.2)) continue;
        if ((f.hitCd.get(m) || 0) > 0) continue;
        f.hitCd.set(m, 0.2);
        const live = m.limbs.filter((l) => l.userData.live);
        if (live[0]) hitLimb(live[0], m);
      }
    } else if (f.kind === "meteorblast") {
      const k = Math.max(0, f.life / 0.55);
      f.mesh.scale.setScalar(0.7 + (1 - k) * 2.4);
      f.mesh.traverse((ch) => {
        if (ch.material && ch.material.opacity != null) ch.material.opacity = k * 0.85;
        if (ch.isLight) ch.intensity = 14 * k;
      });
    }
    if (f.life <= 0) {
      f.mesh.removeFromParent();
      fx.splice(i, 1);
    }
  }
}

function toggleFlash() {
  flashOn = !flashOn;
  showBanner(flashOn ? "FLASHLIGHT ON" : "FLASHLIGHT OFF");
  announcing = 0.7;
}

function syncFlashlight() {
  if (!flashLight || !flashRig) return;
  if (xrOn) {
    const left = hands.find((h) => h.handed === "left") || hands[0];
    if (left?.con && flashRig.parent !== left.con) {
      left.con.add(flashRig);
      flashRig.position.set(0, 0, 0.03);
      flashRig.rotation.set(0, 0, 0);
    }
  } else if (camera && flashRig.parent !== camera) {
    camera.add(flashRig);
    flashRig.position.set(0.12, -0.08, -0.14);
  }
  const on = flashOn && !dead;
  const lamp = stats.flash || 1;
  flashLight.intensity = on ? (5 + lastDark * 18) * lamp : 0;
  flashLight.distance = 36 * lamp;
  if (flashFill) {
    flashFill.intensity = on ? (0.4 + lastDark * 1.1) * lamp : 0;
    flashFill.distance = 5.5 * lamp;
  }
  if (flashRig.userData.bulb) flashRig.userData.bulb.visible = on;
}

function fireFrom(origin, quat) {
  const def = wep();
  if (reloadT > 0) return;
  if (player.mag <= 0) {
    showBanner(isSpell(def) ? (shopOnX ? "RECHARGE  Y" : "RECHARGE  X") : (shopOnX ? "RELOAD  Y" : "RELOAD  X"));
    announcing = 0.8;
    return;
  }
  if (fireCd > 0) return;
  if (def.noodle) return;
  if (def.beam) {
    if (plasmaT > 0) return;
    fireCd = 0.2;
    player.mag--;
    plasmaT = def.beamDur || 10;
    sfx.shoot();
    return;
  }
  const dir0 = new THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize();
  if (def.terra) {
    fireCd = 1 / (def.rpm * (0.85 + stats.reload * 0.15));
    player.mag--;
    sfx.shoot();
    digAlong(origin, dir0);
    return;
  }
  if (def.gravity) {
    if (grabMob && grabMob.alive) return;
    fireCd = 1 / (def.rpm * (0.85 + stats.reload * 0.15));
    player.mag--;
    sfx.shoot();
    grabMob = grabAlongRay(origin, dir0, 18);
    return;
  }
  fireCd = 1 / (def.rpm * (0.85 + stats.reload * 0.15));
  player.mag--;
  if (def.lightning) {
    strikeLightning(aimStrikePoint(origin, dir0));
    return;
  }
  if (def.fireball) {
    sfx.shoot();
    const ball = makeFireball();
    ball.position.copy(origin);
    scene.add(ball);
    shots.push({ mesh: ball, dir: dir0.clone(), speed: def.speed, life: 2.7, def, pierce: 1, hitSet: new Set(), fireball: true });
    return;
  }
  sfx.shoot();
  const n = def.pellets || 1;
  const col = def.id === "rail" || def.id === "plasma" || def.id === "ar" ? 0x66f0ff : def.id === "ripple" ? 0xff66dd : def.id === "nuke" ? 0x66ff66 : 0x44ddff;
  for (let i = 0; i < n; i++) {
    const dir = dir0.clone();
    if (def.spread) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
      dir.addScaledVector(right, (rng() - 0.5) * def.spread * 2);
      dir.addScaledVector(up, (rng() - 0.5) * def.spread * 0.35);
    }
    dir.normalize();
    if (def.hitscan) {
      rayKill(origin, dir, def.id === "rail" ? 72 : def.id === "ar" ? 73 : 56, def);
      const rail = def.id === "rail";
      const ar = def.id === "ar";
      const beam = makeBolt(rail ? 0xe8f4ff : col, rail ? 0.2 : def.id === "plasma" ? 0.07 : ar ? 0.05 : 0.045);
      beam.position.copy(origin).addScaledVector(dir, rail ? 11 : ar ? 11.7 : 8);
      beam.scale.set(rail ? 5.25 : def.id === "plasma" ? 2.1 : ar ? 1.7 : 1.4, rail ? 5.25 : def.id === "plasma" ? 2.1 : ar ? 1.7 : 1.4, rail ? 18 : ar ? 18.2 : 12);
      aimBolt(beam, dir);
      scene.add(beam);
      shots.push({ mesh: beam, life: rail ? 0.22 : 0.14, dummy: true });
    } else if (def.missile) {
      const rocket = makeMissileMesh();
      rocket.position.copy(origin);
      aimBolt(rocket, dir);
      scene.add(rocket);
      shots.push({ mesh: rocket, dir, speed: def.speed, life: 2.3, def, pierce: 1, hitSet: new Set(), missile: true });
    } else if (def.ripple) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.12 + i * 0.03, 0.018, 6, 18),
        new THREE.MeshBasicMaterial({ color: COLORS[i % COLORS.length], transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      ring.position.copy(origin);
      aimBolt(ring, dir);
      scene.add(ring);
      shots.push({ mesh: ring, dir, speed: 16 + i * 0.7, life: 1.15, def, pierce: 3, hitSet: new Set(), ripple: true, phase: rng() * 6 });
    } else {
      const bolt = makeBolt(col, def.nuke ? 0.16 : def.aoe ? 0.09 : 0.032);
      bolt.position.copy(origin);
      aimBolt(bolt, dir);
      scene.add(bolt);
      shots.push({ mesh: bolt, dir, speed: def.speed * (def.aoe ? 1 : 1.35), life: def.nuke ? 2.4 : def.aoe ? 1.05 : 0.78, def, pierce: def.pierce || 1, hitSet: new Set() });
    }
  }
}

function grabAlongRay(origin, dir, range) {
  let best = null, bestT = range;
  for (const m of mobs) {
    if (!m.alive) continue;
    const to = new THREE.Vector3(m.x - origin.x, m.y - origin.y, m.z - origin.z);
    const t = to.dot(dir);
    if (t < 0.4 || t > bestT) continue;
    const closest = origin.clone().addScaledVector(dir, t);
    if (closest.distanceTo(new THREE.Vector3(m.x, m.y, m.z)) < 1.1 + m.hitR) {
      bestT = t;
      best = m;
    }
  }
  return best;
}

function rayKill(origin, dir, range, def) {
  const pierce = def.pierce || 1;
  const radMul = def.id === "rail" ? 1.25 : 1;
  const multiLimb = def.id === "rail";
  const hits = [];
  for (const m of mobs) {
    if (!m.alive) continue;
    for (const limb of m.limbs) {
      if (!limb.userData.live) continue;
      const w = new THREE.Vector3();
      limb.getWorldPosition(w);
      const to = w.clone().sub(origin);
      const t = to.dot(dir);
      if (t < 0 || t > range) continue;
      const closest = origin.clone().addScaledVector(dir, t);
      if (closest.distanceTo(w) < (0.28 + limb.userData.thick) * radMul) hits.push({ t, m, limb });
    }
  }
  hits.sort((a, b) => a.t - b.t);
  const seen = new Set();
  let n = 0;
  for (const h of hits) {
    if (!h.limb.userData.live) continue;
    if (seen.has(h.m) && !multiLimb) continue;
    if (!seen.has(h.m) && n >= pierce) break;
    const fresh = !seen.has(h.m);
    seen.add(h.m);
    const dmg = def.dmg || 1;
    for (let k = 0; k < dmg && h.limb.userData.live; k++) hitLimb(h.limb, h.m);
    if (fresh) {
      maybeOof();
      n++;
    }
  }
}

function tickShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.life -= dt;
    if (s.ripple && s.mesh.scale) {
      const pulse = 0.7 + Math.sin((s.phase || 0) + performance.now() * 0.012) * 0.55;
      s.mesh.scale.setScalar(pulse);
    }
    if (s.fireball) {
      s.mesh.rotation.x += dt * 2.2;
      s.mesh.rotation.y += dt * 3.4;
      s.mesh.rotation.z += dt * 1.1;
      const t = performance.now() * 0.001;
      s.mesh.scale.setScalar(1.04 + Math.sin(t * 9) * 0.08);
      if (s.mesh.userData.scroll) {
        s.mesh.userData.scroll.offset.y -= dt * 0.95;
        s.mesh.userData.scroll.offset.x += dt * 0.12;
      }
      for (const ch of s.mesh.children) {
        if (ch.userData.flame) {
          ch.rotation.z += dt * 8 * (ch.userData.spin || 1);
          ch.scale.setScalar(0.82 + Math.sin(t * 14 + ch.userData.phase) * 0.24);
        }
      }
    }
    if (!s.dummy && s.mesh.position) {
      s.mesh.position.addScaledVector(s.dir, s.speed * dt);
      if (s.dir && !s.ripple && !s.fireball) aimBolt(s.mesh, s.dir);
      const hy = heightAt(s.mesh.position.x, s.mesh.position.z);
      if (s.mesh.position.y < hy + (s.fireball ? 0.55 : -0.15)) {
        detonateShot(s);
        s.life = 0;
      }
      let hit = false;
      const prox = s.fireball ? 0.95 : 0.32;
      if (s.life > 0) {
      for (const m of mobs) {
        if (!m.alive) continue;
        if (s.hitSet && s.hitSet.has(m)) continue;
        for (const limb of m.limbs) {
          if (!limb.userData.live) continue;
          const w = new THREE.Vector3();
          limb.getWorldPosition(w);
          if (w.distanceTo(s.mesh.position) < prox + limb.userData.thick + (s.ripple ? 0.2 : 0)) {
            if (s.def?.aoe) detonateShot(s);
            else hitLimb(limb, m);
            if (s.hitSet) s.hitSet.add(m);
            hit = true;
            break;
          }
        }
        if (!hit) {
          const cw = new THREE.Vector3();
          m.core.getWorldPosition(cw);
          if (cw.distanceTo(s.mesh.position) < prox + 0.08 + (s.ripple ? 0.2 : 0)) {
            if (s.def?.aoe) detonateShot(s);
            else {
              const limb = nearestLiveLimb(m, s.mesh.position);
              if (limb) hitLimb(limb, m);
            }
            if (s.hitSet) s.hitSet.add(m);
            hit = true;
          }
        }
        if (hit) break;
      }
      if (hit) {
        maybeOof();
        s.pierce = (s.pierce || 1) - 1;
        if (s.pierce <= 0 || s.def?.aoe) s.life = 0;
      }
      }
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
    const d = Math.hypot(m.x - pos.x, m.z - pos.z);
    if (d > r + 0.6) continue;
    if (def?.lightning && d < r * 0.42) {
      killMob(m, true);
      continue;
    }
    const live = m.limbs.filter((l) => l.userData.live);
    let hits = def?.dmg || 2;
    if (def?.lightning) hits = Math.max(hits, 8);
    for (let k = 0; k < hits && live.length; k++) {
      const l = live.pop();
      if (l) hitLimb(l, m);
    }
    if (def?.knock && d > 0.01) {
      m.x += ((m.x - pos.x) / d) * def.knock;
      m.z += ((m.z - pos.z) / d) * def.knock;
    }
  }
}

function disintegrateAt(x, z, r) {
  sfx.boom();
  for (const m of mobs) {
    if (!m.alive) continue;
    if (Math.hypot(m.x - x, m.z - z) > r) continue;
    killMob(m, true);
  }
}

function fireEnemyShot(m) {
  const origin = new THREE.Vector3(m.x, m.y + 0.4, m.z);
  const target = new THREE.Vector3(player.x, player.y - 0.2, player.z);
  const dir = target.sub(origin).normalize();
  const shape = m.shotShape || "ball";
  let geo;
  if (shape === "cube") geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  else if (shape === "pyr") geo = new THREE.ConeGeometry(0.16, 0.32, 4);
  else if (shape === "spike") geo = new THREE.ConeGeometry(0.08, 0.4, 5);
  else geo = new THREE.SphereGeometry(0.14, 7, 6);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff3344 }));
  mesh.position.copy(origin);
  scene.add(mesh);
  eShots.push({ mesh, dir, speed: 13 + diffWave() * 0.12, life: 2.4, dmg: 1 });
}

function tickEshots(dt) {
  for (let i = eShots.length - 1; i >= 0; i--) {
    const s = eShots[i];
    s.life -= dt;
    s.mesh.position.addScaledVector(s.dir, s.speed * dt);
    s.mesh.rotation.x += dt * 4;
    s.mesh.rotation.y += dt * 3;
    const hy = heightAt(s.mesh.position.x, s.mesh.position.z, s.mesh.position.y);
    const hitP = s.mesh.position.distanceTo(new THREE.Vector3(player.x, player.y - 0.4, player.z)) < 0.72;
    if (hitP && iFrame <= 0) {
      sfx.impact();
      damage(s.dmg || 1);
      s.life = 0;
    } else if (s.mesh.position.y < hy - 0.1) {
      sfx.impact();
      s.life = 0;
    }
    if (s.life <= 0) {
      s.mesh.removeFromParent();
      eShots.splice(i, 1);
    }
  }
}

function tickCries(dt) {
  oofLock = Math.max(0, oofLock - dt);
}

let cliffMat = null;
let hexTopMat = null;
function hexMats() {
  if (cliffMat) return;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#8a6a4e";
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 18; i++) {
    g.fillStyle = i % 2 ? "#7a5a42" : "#9a7a5c";
    g.fillRect(0, i * 7, 128, 5);
    g.fillStyle = "#6a4e38";
    g.fillRect((i * 17) % 128, 0, 3, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  cliffMat = new THREE.MeshLambertMaterial({ map: tex, color: 0xcccccc });
  hexTopMat = new THREE.MeshLambertMaterial({ color: 0xc4d4a0 });
}

function hexClearance(x, z, r) {
  return Math.hypot(x - player.x, z - player.z) - (r || 0);
}

function addHex(x, z, r, steps, float) {
  if (hexClearance(x, z, r) < 14) return null;
  hexMats();
  const base = hillsAt(x, z);
  const rise = steps * JUMP1;
  const top = float ? base + rise + JUMP1 * 1.15 : base + rise;
  const h = float ? 0.38 : Math.max(0.5, top - base);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), [
    cliffMat,
    hexTopMat,
    cliffMat,
  ]);
  mesh.position.set(x, float ? top - h / 2 : base + h / 2, z);
  if (terrainMesh?.material?.map) {
    hexTopMat.map = terrainMesh.material.map;
    hexTopMat.needsUpdate = true;
  }
  scene.add(mesh);
  const p = { x, z, r, top, float, mesh, steps };
  hexes.push(p);
  return p;
}

let hexSpawnCd = 0;
function spawnHexCluster() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const ang = rng() * Math.PI * 2;
    const dist = 24 + rng() * 40;
    const cx = player.x + Math.cos(ang) * dist;
    const cz = player.z + Math.sin(ang) * dist;
    const r = 3.2 + rng() * 2.4;
    if (hexClearance(cx, cz, r) < 20) continue;
    const roll = rng();
    if (roll < 0.12) {
      addHex(cx, cz, r * 0.85, 2 + ((rng() * 2) | 0), true);
      if (rng() < 0.4) addHex(cx + r * 1.8, cz + r * 0.4, r * 0.7, 3, true);
    } else if (roll < 0.42) {
      const len = Math.hypot(cx - player.x, cz - player.z) || 1;
      const dirx = (cx - player.x) / len;
      const dirz = (cz - player.z) / len;
      const steps = [1, 2, 3, 3];
      for (let i = 0; i < 4; i++) addHex(cx + dirx * i * r * 1.65, cz + dirz * i * r * 1.65, r * 0.9, steps[i], false);
    } else {
      const n = 1 + ((rng() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        addHex(cx + Math.cos(a) * r * 1.4, cz + Math.sin(a) * r * 1.4, r, 1 + ((rng() * 3) | 0), false);
      }
    }
    return;
  }
}

function ensureHexes(dt) {
  hexSpawnCd = Math.max(0, hexSpawnCd - (dt || 0.016));
  for (let i = hexes.length - 1; i >= 0; i--) {
    const p = hexes[i];
    if (Math.hypot(p.x - player.x, p.z - player.z) > 170) {
      p.mesh.removeFromParent();
      hexes.splice(i, 1);
    }
  }
  if (hexes.length < 10 && hexSpawnCd <= 0) {
    spawnHexCluster();
    hexSpawnCd = 1.4;
  }
}

function clearHexes() {
  for (const p of hexes) p.mesh.removeFromParent();
  hexes = [];
}

function makeBikeMesh() {
  const g = new THREE.Group();
  const iron = mat(0x2a2a30);
  const dark = mat(0x111114);
  const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12), dark);
  w1.rotation.z = Math.PI / 2;
  w1.position.set(0, 0.32, 0.55);
  const w2 = w1.clone();
  w2.position.z = -0.55;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.05), iron);
  frame.position.y = 0.42;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.32), mat(0x3a2418));
  seat.position.set(0, 0.52, -0.08);
  g.add(w1, w2, frame, seat);
  return g;
}

function ensurePlasmaMesh() {
  if (plasmaMesh) return;
  plasmaMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.045, 1, 10),
    new THREE.MeshBasicMaterial({ color: 0x88ffff, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  plasmaGlow = new THREE.PointLight(0x66f0ff, 10, 22, 1.3);
  scene.add(plasmaMesh, plasmaGlow);
}

function tickPlasma(dt, origin, quat) {
  if (player.wep !== "plasma" || plasmaT <= 0) {
    if (plasmaMesh) plasmaMesh.visible = false;
    if (plasmaGlow) plasmaGlow.visible = false;
    if (player.wep !== "plasma") plasmaT = 0;
    return;
  }
  plasmaT -= dt;
  if (plasmaT <= 0) {
    plasmaT = 0;
    if (plasmaMesh) plasmaMesh.visible = false;
    if (plasmaGlow) plasmaGlow.visible = false;
    return;
  }
  ensurePlasmaMesh();
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize();
  const range = 64;
  const mid = origin.clone().addScaledVector(dir, range * 0.5);
  plasmaMesh.visible = true;
  plasmaMesh.position.copy(mid);
  plasmaMesh.scale.set(1.15 + Math.sin(performance.now() * 0.02) * 0.2, range, 1.15);
  plasmaMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  if (plasmaGlow) {
    plasmaGlow.visible = true;
    plasmaGlow.position.copy(origin).addScaledVector(dir, 4);
    plasmaGlow.intensity = 8 + Math.sin(performance.now() * 0.018) * 3;
  }
  const end = origin.clone().addScaledVector(dir, range);
  for (const m of mobs) {
    if (!m.alive) continue;
    const p = new THREE.Vector3(m.x, m.y, m.z);
    const to = p.clone().sub(origin);
    const t = clamp(to.dot(dir), 0, range);
    const closest = origin.clone().addScaledVector(dir, t);
    if (closest.distanceTo(p) > 0.7 + (m.hitR || 0.6)) continue;
    killMob(m, true);
  }
}

function tickNoodle(dt, origin, quat, extend) {
  if (player.wep !== "noodle") {
    if (noodleMesh) noodleMesh.visible = false;
    return;
  }
  for (const m of mobs) {
    for (const l of m.limbs) {
      if (l.userData.noodleT > 0) l.userData.noodleT -= dt;
    }
  }
  if (!noodleMesh) {
    noodleMesh = new THREE.Group();
    for (let i = 0; i < 22; i++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.018, 1, 5),
        new THREE.MeshBasicMaterial({ color: 0x66f0ff, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      noodleMesh.add(seg);
    }
    scene.add(noodleMesh);
  }
  noodleMesh.visible = true;
  const t = performance.now() * 0.001;
  const len = (extend ? 14 : 4.2) + 6.5 + Math.sin(t * 0.85) * 5.5 + Math.sin(t * 1.7) * 3.2;
  const n = noodleMesh.children.length;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const sway = Math.sin(t * 5.2 + u * 7.4) * (0.25 + u * 1.9);
    const lift = Math.sin(t * 3.6 + u * 5.1) * u * 1.1;
    pts.push(origin.clone()
      .addScaledVector(dir, u * len)
      .addScaledVector(right, sway)
      .addScaledVector(up, lift));
  }
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const d = b.clone().sub(a);
    const L = d.length() || 0.01;
    const seg = noodleMesh.children[i];
    seg.position.copy(mid);
    seg.scale.set(1, L, 1);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    for (const m of mobs) {
      if (!m.alive) continue;
      if (Math.hypot(m.x - mid.x, m.z - mid.z) > 3.5 + m.hitR) continue;
      for (const limb of m.limbs) {
        if (!limb.userData.live) continue;
        limb.getWorldPosition(tmp3);
        if (tmp3.distanceTo(mid) < 0.42 + limb.userData.thick && (limb.userData.noodleT || 0) <= 0) {
          limb.userData.noodleT = 0.14;
          hitLimb(limb, m);
        }
      }
    }
  }
}

function spawnDrone() {
  if (drones.length >= 6) return false;
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(0x4a6a78, { emissive: 0x113344 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 12), mat(0x66eeff, { emissive: 0x226688 }));
  ring.rotation.x = Math.PI / 2;
  mesh.add(body, ring);
  scene.add(mesh);
  drones.push({ mesh, hp: 4, maxHp: 4, cool: 0, ang: rng() * 6, yOff: 1.4 + rng() * 0.4 });
  return true;
}

const TURRET_DECK = 2.22;
const TURRET_R = 1.82;

function makeTurretMesh(col) {
  hexMats();
  const g = new THREE.Group();
  const stone = mat(0x8a8478);
  const stone2 = mat(0x6a6458);
  const sand = mat(0x9a8864);
  const steel = mat(0x2a2e2c);
  const h = TURRET_DECK;
  const r = TURRET_R;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 8), [
    cliffMat || stone,
    stone2,
    cliffMat || stone,
  ]);
  wall.position.y = h * 0.5;
  const slit = new THREE.Mesh(new THREE.TorusGeometry(r * 0.92, 0.07, 5, 16), steel);
  slit.rotation.x = Math.PI / 2;
  slit.position.y = h * 0.62;
  const bags = new THREE.Mesh(new THREE.TorusGeometry(r * 0.84, 0.2, 6, 14), sand);
  bags.rotation.x = Math.PI / 2;
  bags.position.y = h - 0.14;
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, 0.18, 8), stone2);
  roof.position.y = h;
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 10), steel);
  hatch.position.y = h + 0.12;
  const gun = new THREE.Group();
  gun.position.y = h + 0.28;
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.2, 10), steel);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.05), steel);
  shield.position.set(0, 0.18, -0.26);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 1.22, 8), mat(0x1a1c1a));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.14, -0.78);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.048, 0.28, 8), steel);
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.set(0, 0.14, -0.38);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.1), mat(0x3a3224));
  box.position.set(0.18, 0.08, -0.08);
  gun.add(mount, shield, barrel, sleeve, box);
  const searchCol = 0xfff3c4;
  const search = new THREE.SpotLight(searchCol, 0, 120, Math.PI * 0.11, 0.28, 0.9);
  search.position.set(0, 0.14, -0.18);
  const searchTgt = new THREE.Object3D();
  searchTgt.position.set(0, 0.06, -90);
  gun.add(search, searchTgt);
  search.target = searchTgt;
  const searchCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 7.2, 78, 14, 1, true),
    new THREE.MeshBasicMaterial({
      color: searchCol, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  searchCone.rotation.x = Math.PI / 2;
  searchCone.position.set(0, 0.14, -39);
  const searchCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 1.35, 78, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  searchCore.rotation.x = Math.PI / 2;
  searchCore.position.set(0, 0.14, -39);
  gun.add(searchCone, searchCore);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 6), steel);
  mast.position.set(0.62, h + 0.62, 0.58);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshBasicMaterial({ color: col }));
  lamp.position.set(0.62, h + 1.22, 0.58);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 10, 8),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.position.copy(lamp.position);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 2.6, 88, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  beam.position.set(0.62, h + 45, 0.58);
  const sweep = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 26),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  sweep.position.copy(lamp.position);
  const light = new THREE.PointLight(col, 0, 32, 1.25);
  light.position.copy(lamp.position);
  g.add(wall, slit, bags, roof, hatch, gun, mast, lamp, glow, beam, sweep, light);
  g.userData.gun = gun;
  g.userData.beacon = { lamp, glow, beam, sweep, light };
  g.userData.search = { light: search, cone: searchCone, core: searchCore };
  return g;
}

function spawnTurret() {
  if (turrets.length >= 5) {
    showBanner("TOO MANY NESTS");
    announcing = 1.2;
    return false;
  }
  const x = player.x;
  const z = player.z;
  const base = hillsAt(x, z);
  const col = COLORS[(rng() * COLORS.length) | 0];
  const mesh = makeTurretMesh(col);
  mesh.position.set(x, base, z);
  scene.add(mesh);
  const top = base + TURRET_DECK;
  const t = { mesh, x, z, r: TURRET_R * 0.92, top, hp: 28, cool: 0, yaw: 0, col };
  turrets.push(t);
  player.y = top + 1.6;
  player.vy = 0;
  player.grounded = true;
  if (xrOn && rig) rig.position.set(player.x, player.y - 1.6, player.z);
  else camera.position.set(player.x, player.y, player.z);
  showBanner("NEST DROPPED  ·  DOUBLE JUMP THE ROOF");
  announcing = 1.5;
  return true;
}

function tickTurrets(dt) {
  for (let i = turrets.length - 1; i >= 0; i--) {
    const t = turrets[i];
    if (t.hp <= 0) {
      t.mesh.removeFromParent();
      turrets.splice(i, 1);
      continue;
    }
    const night = clamp(lastDark, 0, 1);
    const b = t.mesh.userData.beacon;
    if (b) {
      if (b.light) b.light.intensity = night * 16;
      if (b.glow?.material) b.glow.material.opacity = 0.12 + night * 0.55;
      if (b.beam?.material) b.beam.material.opacity = 0.08 + night * 0.52;
      if (b.sweep) {
        b.sweep.visible = night > 0.12;
        if (b.sweep.material) b.sweep.material.opacity = 0.08 + night * 0.42;
        b.sweep.rotation.y += dt * 1.15;
      }
    }
    const sr = t.mesh.userData.search;
    if (sr) {
      if (sr.light) sr.light.intensity = 5 + night * 46;
      if (sr.cone?.material) sr.cone.material.opacity = 0.07 + night * 0.48;
      if (sr.core?.material) sr.core.material.opacity = 0.1 + night * 0.58;
    }
    t.cool -= dt;
    let best = null, bd = 30;
    for (const m of mobs) {
      if (!m.alive) continue;
      const dist = Math.hypot(m.x - t.x, m.z - t.z);
      if (dist < 1.1 + m.hitR && (m.hitCd || 0) <= 0) {
        t.hp -= 1;
        m.hitCd = 0.55;
      }
      if (dist < bd) { bd = dist; best = m; }
    }
    const gun = t.mesh.userData.gun;
    if (best && gun) {
      const dx = best.x - t.x;
      const dz = best.z - t.z;
      const want = Math.atan2(dx, dz) + Math.PI;
      let dAng = want - t.yaw;
      while (dAng > Math.PI) dAng -= Math.PI * 2;
      while (dAng < -Math.PI) dAng += Math.PI * 2;
      t.yaw += dAng * Math.min(1, dt * 8);
      gun.rotation.y = t.yaw;
      const originAim = new THREE.Vector3();
      gun.getWorldPosition(originAim);
      originAim.y += 0.14;
      const pitch = -Math.atan2(best.y - originAim.y, Math.hypot(best.x - t.x, best.z - t.z));
      gun.rotation.x += (clamp(pitch, -0.55, 0.35) - gun.rotation.x) * Math.min(1, dt * 6);
      if (t.cool <= 0 && bd < 28) {
        t.cool = 0.09;
        const origin = originAim.clone();
        const dir = new THREE.Vector3(best.x - origin.x, best.y - origin.y, best.z - origin.z).normalize();
        const bolt = makeBolt(0xffcc66, 0.022);
        bolt.position.copy(origin);
        aimBolt(bolt, dir);
        scene.add(bolt);
        shots.push({ mesh: bolt, dir, speed: 78, life: 0.48, def: WEPS.smg, pierce: 1, hitSet: new Set() });
      }
    }
  }
}

function spawnBall(hp) {
  if (balls.length >= 5) return false;
  const r = hp >= 32 ? 0.55 : hp >= 16 ? 0.4 : 0.28;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 14, 12),
    new THREE.MeshBasicMaterial({ color: 0x66ddff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  scene.add(mesh);
  balls.push({ mesh, hp, maxHp: hp, r, ang: rng() * 6 });
  return true;
}

function makeTankMesh() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), mat(0x3a4a40, { emissive: 0x111 }));
  hull.position.y = 0.45;
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.28, 10), mat(0x2a332c));
  turret.position.y = 0.85;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 1.4, 8), mat(0x1a1e1a));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.88, -0.85);
  g.add(hull, turret, barrel);
  g.userData.turret = turret;
  return g;
}

function tickDrones(dt) {
  for (let i = drones.length - 1; i >= 0; i--) {
    const d = drones[i];
    if (d.hp <= 0) {
      d.mesh.removeFromParent();
      drones.splice(i, 1);
      continue;
    }
    d.ang += dt * 1.4;
    const ox = Math.cos(d.ang) * 1.35;
    const oz = Math.sin(d.ang) * 1.35;
    d.mesh.position.set(player.x + ox, player.y - 0.2 + d.yOff + Math.sin(d.ang * 2) * 0.1, player.z + oz);
    d.cool -= dt;
    d.hitCd = Math.max(0, (d.hitCd || 0) - dt);
    for (const m of mobs) {
      if (!m.alive) continue;
      if (Math.hypot(m.x - d.mesh.position.x, m.z - d.mesh.position.z) < 0.7 && d.hitCd <= 0) {
        d.hp -= 1;
        d.hitCd = 0.55;
        break;
      }
    }
    if (d.cool > 0) continue;
    let best = null, bd = 22;
    for (const m of mobs) {
      if (!m.alive) continue;
      const dist = Math.hypot(m.x - d.mesh.position.x, m.z - d.mesh.position.z);
      if (dist < bd) { bd = dist; best = m; }
    }
    if (!best) continue;
    d.cool = 0.32;
    const origin = d.mesh.position.clone();
    const dir = new THREE.Vector3(best.x - origin.x, best.y - origin.y, best.z - origin.z).normalize();
    const bolt = makeBolt(0x88ffaa, 0.02);
    bolt.position.copy(origin);
    aimBolt(bolt, dir);
    scene.add(bolt);
    shots.push({ mesh: bolt, dir, speed: 70, life: 0.55, def: WEPS.pistol, pierce: 1, hitSet: new Set() });
  }
}

function tickBalls(dt) {
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    if (b.hp <= 0) {
      b.mesh.removeFromParent();
      balls.splice(i, 1);
      continue;
    }
    b.ang += dt * 0.9;
    const rad = 1.1 + b.r;
    b.mesh.position.set(player.x + Math.cos(b.ang) * rad, player.y - 0.3, player.z + Math.sin(b.ang) * rad);
    b.mesh.material.opacity = 0.22 + 0.18 * (b.hp / b.maxHp);
    for (const m of mobs) {
      if (!m.alive) continue;
      if (Math.hypot(m.x - b.mesh.position.x, m.z - b.mesh.position.z) < b.r + m.hitR * 0.5) {
        b.hp -= 1;
        m.hitCd = 0.6;
        m.x += (m.x - player.x) * 0.04;
        m.z += (m.z - player.z) * 0.04;
        break;
      }
    }
  }
}

function tickGrab(dt, firing, origin, dir) {
  if (!grabMob || !grabMob.alive) { grabMob = null; return; }
  if (!firing || player.wep !== "gravity") { grabMob = null; return; }
  const dest = origin.clone().addScaledVector(dir, 4.2);
  grabMob.x += (dest.x - grabMob.x) * Math.min(1, dt * 8);
  grabMob.y += (dest.y - grabMob.y) * Math.min(1, dt * 8);
  grabMob.z += (dest.z - grabMob.z) * Math.min(1, dt * 8);
  for (const o of mobs) {
    if (!o.alive || o === grabMob) continue;
    if (Math.hypot(o.x - grabMob.x, o.z - grabMob.z) < 1.1 + o.hitR) {
      const live = o.limbs.filter((l) => l.userData.live);
      if (live[0]) hitLimb(live[0], o);
      grabMob.hitCd = 0.2;
    }
  }
}

function spawnMeteor() {
  const ang = rng() * Math.PI * 2;
  const dist = 14 + rng() * 72;
  const tx = player.x + Math.cos(ang) * dist;
  const tz = player.z + Math.sin(ang) * dist;
  const sx = tx + (rng() - 0.5) * 48;
  const sz = tz + (rng() - 0.5) * 48;
  const sy = 62 + rng() * 24;
  const rad = 3.2 + rng() * 2.8;
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 1), mat(0x4a3a30, { emissive: 0x662200 }));
  mesh.position.set(sx, sy, sz);
  scene.add(mesh);
  const trail = new THREE.Mesh(
    new THREE.ConeGeometry(rad * 0.38, rad * 2.4, 7),
    new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  mesh.add(trail);
  trail.position.y = rad * 1.15;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(rad * 1.18, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  mesh.add(glow);
  const dest = new THREE.Vector3(tx, heightAt(tx, tz), tz);
  const vel = dest.clone().sub(mesh.position).normalize().multiplyScalar(22 + rng() * 8);
  meteors.push({ mesh, vel, life: 6.5, rad });
}

function tickMeteors(dt) {
  meteorT -= dt;
  if (meteorT <= 0 && running && !dead && !shopOpen) {
    meteorT = 16 + rng() * 38;
    if (rng() < 0.72) spawnMeteor();
  }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.life -= dt;
    m.mesh.position.addScaledVector(m.vel, dt);
    m.mesh.rotation.x += dt * 4;
    const hy = heightAt(m.mesh.position.x, m.mesh.position.z);
    const rad = m.rad || 1;
    if (m.mesh.position.y <= hy + rad * 0.48 || m.life <= 0) {
      const p = m.mesh.position.clone();
      p.y = hy;
      craterAt(p.x, p.z, (rad * 1.55 + rng() * 1.2) * 0.7, (2.2 + rad * 0.45) * 0.7);
      spawnMeteorBlast(p, rad);
      aoeAt(p, 10.4 + rad * 1.85, { dmg: 8, knock: 3.4 });
      dropLoot(p.x, p.y, p.z, 28 + ((rng() * 18) | 0));
      sfx.meteor();
      m.mesh.removeFromParent();
      meteors.splice(i, 1);
    }
  }
}

function spawnMeteorBlast(pos, rad) {
  const r = (rad || 3) * 2.35;
  const g = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.55, 14, 12),
    new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const shock = new THREE.Mesh(
    new THREE.RingGeometry(r * 0.2, r * 0.85, 24),
    new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  shock.rotation.x = -Math.PI / 2;
  const flash = new THREE.PointLight(0xff8833, 14, r * 8, 1.2);
  g.add(ball, shock, flash);
  g.position.copy(pos);
  scene.add(g);
  fx.push({ mesh: g, kind: "meteorblast", life: 0.55, r0: r });
}

function craterAt(x, z, r, depth) {
  const last = craters[craters.length - 1];
  if (last && Math.hypot(last.x - x, last.z - z) < r * 0.4) {
    last.depth = Math.min(7.5, Math.max(last.depth, depth));
    last.r = Math.max(last.r, r);
  } else {
    craters.push({ x, z, r, depth });
    if (craters.length > 240) craters.shift();
  }
  applyTerrain(true);
}

function digAlong(origin, dir) {
  let hx = 0, hz = 0, found = false;
  for (let t = 0.5; t < 26; t += 0.4) {
    const px = origin.x + dir.x * t;
    const py = origin.y + dir.y * t;
    const pz = origin.z + dir.z * t;
    if (py <= hillsAt(px, pz) + 0.45) {
      hx = px; hz = pz; found = true;
      break;
    }
  }
  if (!found && dir.y < 0.42) {
    const t = 8 + Math.abs(dir.y) * 6;
    hx = origin.x + dir.x * t;
    hz = origin.z + dir.z * t;
    found = true;
  }
  if (!found) return;
  craterAt(hx, hz, 2.35, 1.7);
  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xc4a574, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  puff.position.set(hx, hillsAt(hx, hz) + 0.3, hz);
  scene.add(puff);
  fx.push({ mesh: puff, kind: "bolt", life: 0.22 });
}

function makeMissileMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.42, 6), mat(0x3a3a32, { emissive: 0x221100 }));
  body.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), mat(0xcc4422, { emissive: 0x661100 }));
  nose.rotation.x = Math.PI / 2;
  nose.position.z = -0.26;
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.18, 5),
    new THREE.MeshBasicMaterial({ color: 0xff8822, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  flame.rotation.x = -Math.PI / 2;
  flame.position.z = 0.28;
  g.add(body, nose, flame);
  return g;
}

function makeHeliMesh() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.55, 4, 8), mat(0x2c3328, { emissive: 0x111408 }));
  hull.rotation.z = Math.PI / 2;
  hull.position.y = 0.15;
  const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), mat(0x88aacc, { emissive: 0x113344 }));
  cabin.position.set(0, 0.22, -0.55);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 1.4), mat(0x242820));
  tail.position.set(0, 0.28, 1.15);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.28), mat(0x242820));
  fin.position.set(0, 0.48, 1.78);
  const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.5), mat(0x111114));
  skidL.position.set(-0.38, -0.42, 0);
  const skidR = skidL.clone();
  skidR.position.x = 0.38;
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.04, 0.14), mat(0x1a1a1c, { emissive: 0x222 }));
  rotor.position.y = 0.72;
  const rotor2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 3.4), mat(0x1a1a1c, { emissive: 0x222 }));
  rotor2.position.y = 0.72;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), mat(0x111114));
  mast.position.y = 0.52;
  const beam = new THREE.SpotLight(0xfff3c4, 32, 78, Math.PI * 0.17, 0.32, 1.05);
  beam.position.set(0, -0.2, -0.55);
  const tgt = new THREE.Object3D();
  tgt.position.set(0, -10, -24);
  beam.target = tgt;
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(3.6, 14, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  cone.rotation.x = Math.PI;
  cone.position.set(0, -6.8, -8);
  g.add(hull, cabin, tail, fin, skidL, skidR, rotor, rotor2, mast, beam, tgt, cone);
  g.userData.rotor = rotor;
  g.userData.rotor2 = rotor2;
  g.userData.beam = beam;
  return g;
}

function tickTank() {
  if (!player.tank) {
    if (tankMesh) tankMesh.visible = false;
    return;
  }
  if (!tankMesh) {
    tankMesh = makeTankMesh();
    scene.add(tankMesh);
  }
  tankMesh.visible = true;
  tankMesh.position.set(player.x, heightAt(player.x, player.z), player.z);
  tankMesh.rotation.y = tankYaw;
}

function tickHeli() {
  if (!player.heli) {
    if (heliMesh) heliMesh.visible = false;
    return;
  }
  if (!heliMesh) {
    heliMesh = makeHeliMesh();
    scene.add(heliMesh);
  }
  heliMesh.visible = true;
  const ground = heightAt(player.x, player.z);
  heliMesh.position.set(player.x, player.y - 1.85, player.z);
  heliMesh.rotation.y = heliYaw;
  const spin = performance.now() * 0.018;
  if (heliMesh.userData.rotor) heliMesh.userData.rotor.rotation.y = spin;
  if (heliMesh.userData.rotor2) heliMesh.userData.rotor2.rotation.y = -spin * 1.02;
  if (heliMesh.userData.beam) heliMesh.userData.beam.intensity = 26 + lastDark * 18;
}

function reload() {
  if (dead || !running) return;
  if (reloadT > 0) return;
  const def = wep();
  const cap = magCap(def);
  if (player.mag >= cap) return;
  if (!isSpell(def) && player.ammo <= 0) {
    showBanner("NO AMMO");
    announcing = 0.9;
    return;
  }
  reloadMax = Math.max(0.35, (def.reload || 10) / Math.max(0.35, stats.reload));
  reloadT = reloadMax;
  sfx.reload();
}

function finishReload() {
  const def = wep();
  const cap = magCap(def);
  if (isSpell(def)) {
    player.mag = cap;
  } else {
    const need = cap - player.mag;
    const take = Math.min(need, player.ammo);
    player.ammo -= take;
    player.mag += take;
  }
  reloadT = 0;
  reloadMax = 0;
  sfx.chime();
}

function syncReloadBar() {
  const guns = [gunMesh, vrGun];
  for (const g of guns) {
    if (!g?.userData?.reloadBar) continue;
    const on = reloadT > 0 && reloadMax > 0;
    g.userData.reloadBar.visible = on;
    if (!on) continue;
    const p = clamp(1 - reloadT / reloadMax, 0, 1);
    g.userData.reloadFill.scale.x = Math.max(0.04, p);
    g.userData.reloadFill.position.x = -0.07 * (1 - p);
  }
}

function prereqMet(it) {
  if (!it?.need) return true;
  if (it.need === "sprint") return !!stats.sprint;
  if (it.need === "jump2") return stats.jumps >= 2;
  return true;
}

function buy(it) {
  if (!prereqMet(it)) {
    showBanner("LOCKED — buy " + (it.needLabel || "the prerequisite") + " first");
    announcing = 1.4;
    return false;
  }
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
  } else if (it.kind === "ammo") {
    if (player.coins < it.cost) return false;
    player.coins -= it.cost;
    player.ammo += 40;
  } else if (it.kind === "bind") {
    shopOnX = !shopOnX;
    try { localStorage.setItem("horde.shopx", shopOnX ? "1" : "0"); } catch {}
    showBanner(shopOnX ? "SHOP X  ·  RELOAD Y" : "SHOP Y  ·  RELOAD X");
    announcing = 1.6;
  } else if (it.kind === "bike") {
    if (player.bike) return true;
    if (player.coins < it.cost) return false;
    player.coins -= it.cost;
    player.bike = true;
    player.tank = false;
    player.heli = false;
    if (player.wep === "tank" || player.wep === "heli") equip("pistol");
    player.bike = true;
  } else if (it.kind === "up") {
    if (it.id === "sprint") {
      if (stats.sprint) return true;
      if (player.coins < it.cost) return false;
      player.coins -= it.cost;
      stats.sprint = 1;
    } else if (it.id === "sprintcd") {
      if (!stats.sprint || sprintBuys >= 10) return false;
      if (player.coins < it.cost) return false;
      player.coins -= it.cost;
      sprintBuys++;
      stats.sprintCd = Math.max(0, 10 - sprintBuys);
    } else if (it.id === "wheelie") {
      if (!stats.sprint || stats.wheelie) return false;
      if (player.coins < it.cost) return false;
      player.coins -= it.cost;
      stats.wheelie = 1;
      stats.sprintMul = 1.5;
    } else if (it.id === "jump2") {
      if (stats.jumps >= 2) return true;
      if (player.coins < it.cost) return false;
      player.coins -= it.cost;
      stats.jumps = 2;
    } else if (it.id === "jump3") {
      if (stats.jumps < 2 || stats.jumps >= 3) return false;
      if (player.coins < it.cost) return false;
      player.coins -= it.cost;
      stats.jumps = 3;
    } else if (it.id === "flash") {
      if (flashBuys >= 5) return false;
      if (player.coins < it.cost) return false;
      player.coins -= it.cost;
      flashBuys++;
      stats.flash = 1 + flashBuys * 0.15;
      showBanner("LAMP +" + (flashBuys * 15) + "%");
      announcing = 1.1;
    } else if (it.id === "clip") {
      if (clipBuys >= 3) return false;
      if (player.coins < it.cost) return false;
      player.coins -= it.cost;
      const before = magCap();
      clipBuys++;
      const after = magCap();
      if (player.mag >= before) player.mag = after;
      showBanner("CLIP +" + (clipBuys * 33) + "%");
      announcing = 1.1;
    } else if (it.id === "autoreload") {
      if (stats.autoReload) return true;
      if (player.coins < it.cost) return false;
      player.coins -= it.cost;
      stats.autoReload = 1;
      showBanner("AUTO RELOAD");
      announcing = 1.1;
    } else if (it.id === "night") {
      if (nightCutsOwned >= 10) return false;
      if (player.coins < it.cost) return false;
      player.coins -= it.cost;
      nightCutsOwned++;
      const atNight = lastDark > 0.45;
      if (!atNight) nightCutsLive = nightCutsOwned;
      showBanner(nightCutsOwned >= 10
        ? (atNight ? "NO NIGHT — NEXT CYCLE" : "NO NIGHT")
        : ("NIGHT −" + (nightCutsOwned * 10) + "%" + (atNight ? "  ·  NEXT NIGHT" : "")));
      announcing = 1.4;
    } else {
      if (player.coins < it.cost) return false;
      player.coins -= it.cost;
      stats[it.key] += it.add;
      if (it.key === "maxHp") player.hp = Math.min(stats.maxHp, player.hp + it.add);
    }
  } else if (it.kind === "drone") {
    if (player.coins < it.cost) return false;
    if (!spawnDrone()) return false;
    player.coins -= it.cost;
  } else if (it.kind === "turret") {
    if (player.coins < it.cost) return false;
    if (!spawnTurret()) return false;
    player.coins -= it.cost;
  } else if (it.kind === "ball") {
    if (player.coins < it.cost) return false;
    if (!spawnBall(it.hp || 8)) return false;
    player.coins -= it.cost;
  } else return false;
  sfx.buy();
  paintShop();
  paintShop3d();
  return true;
}

function drawShopIcon(ctx, it, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#1a1a1e";
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.fillStyle = "#d4af37";
  const id = it.id;
  if (it.kind === "up") {
    if (id === "hp") {
      ctx.fillStyle = "#c42b2b";
      ctx.beginPath();
      ctx.moveTo(0, s * 0.22);
      ctx.bezierCurveTo(-s * 0.28, -s * 0.05, -s * 0.28, -s * 0.28, 0, -s * 0.12);
      ctx.bezierCurveTo(s * 0.28, -s * 0.28, s * 0.28, -s * 0.05, 0, s * 0.22);
      ctx.fill();
    } else if (id === "speed") {
      ctx.fillRect(-s * 0.3, -s * 0.08, s * 0.5, s * 0.16);
      ctx.beginPath();
      ctx.moveTo(s * 0.18, -s * 0.22);
      ctx.lineTo(s * 0.38, 0);
      ctx.lineTo(s * 0.18, s * 0.22);
      ctx.fill();
    } else if (id === "jump") {
      ctx.fillRect(-s * 0.08, -s * 0.3, s * 0.16, s * 0.5);
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, -s * 0.08);
      ctx.lineTo(0, -s * 0.32);
      ctx.lineTo(s * 0.22, -s * 0.08);
      ctx.fill();
    } else if (id === "reload") {
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0.4, Math.PI * 1.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.18, -s * 0.22);
      ctx.lineTo(s * 0.32, -s * 0.08);
      ctx.lineTo(s * 0.08, -s * 0.04);
      ctx.fill();
    } else if (id === "sprint" || id === "sprintcd" || id === "wheelie") {
      ctx.fillRect(-s * 0.32, -s * 0.08, s * 0.55, s * 0.16);
      ctx.beginPath();
      ctx.moveTo(s * 0.16, -s * 0.22);
      ctx.lineTo(s * 0.38, 0);
      ctx.lineTo(s * 0.16, s * 0.22);
      ctx.fill();
    } else if (id === "jump2" || id === "jump3") {
      ctx.fillRect(-s * 0.08, -s * 0.32, s * 0.16, s * 0.52);
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, -s * 0.1);
      ctx.lineTo(0, -s * 0.36);
      ctx.lineTo(s * 0.22, -s * 0.1);
      ctx.fill();
    } else if (id === "clip") {
      ctx.fillRect(-s * 0.16, -s * 0.28, s * 0.32, s * 0.56);
      ctx.fillStyle = "#1a1a1e";
      ctx.fillRect(-s * 0.1, -s * 0.2, s * 0.2, s * 0.4);
      ctx.fillStyle = "#d4af37";
      ctx.fillRect(-s * 0.06, s * 0.22, s * 0.12, s * 0.08);
    } else if (id === "flash") {
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.32);
      ctx.lineTo(s * 0.22, s * 0.08);
      ctx.lineTo(-s * 0.22, s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-s * 0.08, s * 0.1, s * 0.16, s * 0.2);
    } else if (id === "night") {
      ctx.fillStyle = "#c8d4f0";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1e";
      ctx.beginPath();
      ctx.arc(s * 0.1, -s * 0.04, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === "autoreload") {
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.26, 0.2, Math.PI * 1.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.16, -s * 0.2);
      ctx.lineTo(s * 0.3, -s * 0.02);
      ctx.lineTo(s * 0.04, 0);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "smg") {
    ctx.fillRect(-s * 0.34, -s * 0.08, s * 0.7, s * 0.16);
    ctx.fillRect(s * 0.1, -s * 0.22, s * 0.1, s * 0.14);
    ctx.fillRect(-s * 0.06, 0.04 * s, s * 0.1, s * 0.28);
  } else if (id === "ar") {
    ctx.fillRect(-s * 0.38, -s * 0.08, s * 0.78, s * 0.14);
    ctx.fillStyle = "#66e0ff";
    ctx.fillRect(s * 0.08, -s * 0.12, s * 0.34, s * 0.08);
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(-s * 0.06, 0.04 * s, s * 0.1, s * 0.3);
    ctx.fillRect(-s * 0.38, -s * 0.04, s * 0.14, s * 0.2);
  } else if (id === "shotgun") {
    ctx.fillRect(-s * 0.38, -s * 0.14, s * 0.72, s * 0.1);
    ctx.fillRect(-s * 0.38, 0.02 * s, s * 0.72, s * 0.1);
    ctx.fillRect(-s * 0.08, 0.08 * s, s * 0.12, s * 0.22);
  } else if (id === "rail") {
    ctx.fillRect(-s * 0.4, -s * 0.06, s * 0.8, s * 0.12);
    ctx.fillStyle = "#66e0ff";
    ctx.fillRect(-s * 0.1, -s * 0.12, s * 0.5, s * 0.08);
  } else if (id === "thunder") {
    ctx.fillStyle = "#c8e8ff";
    ctx.beginPath();
    ctx.moveTo(s * 0.02, -s * 0.32);
    ctx.lineTo(s * 0.18, -s * 0.04);
    ctx.lineTo(s * 0.04, -s * 0.04);
    ctx.lineTo(s * 0.2, s * 0.32);
    ctx.lineTo(-s * 0.02, s * 0.02);
    ctx.lineTo(s * 0.1, s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(-s * 0.36, -s * 0.05, s * 0.32, s * 0.1);
  } else if (id === "nova") {
    ctx.fillStyle = "#ff5511";
    ctx.beginPath();
    ctx.arc(s * 0.12, 0, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffee88";
    ctx.beginPath();
    ctx.arc(s * 0.12, 0, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(-s * 0.36, -s * 0.05, s * 0.32, s * 0.1);
  } else if (it.kind === "turret" || id === "turret") {
    ctx.fillStyle = "#8a8478";
    ctx.fillRect(-s * 0.32, -s * 0.02, s * 0.64, s * 0.34);
    ctx.fillStyle = "#6a6458";
    ctx.fillRect(-s * 0.28, -s * 0.12, s * 0.56, s * 0.12);
    ctx.fillStyle = "#2a2e2c";
    ctx.fillRect(-s * 0.06, -s * 0.22, s * 0.12, s * 0.18);
    ctx.fillRect(-s * 0.04, -s * 0.28, s * 0.38, s * 0.07);
    ctx.fillStyle = "#66e0ff";
    ctx.beginPath(); ctx.arc(s * 0.22, -s * 0.32, s * 0.07, 0, 7); ctx.fill();
  } else if (it.kind === "drone" || id === "drone") {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#66eeff"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2); ctx.stroke();
  } else if (it.kind === "ball") {
    ctx.strokeStyle = "#66ddff"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2); ctx.stroke();
  } else if (id === "tank") {
    ctx.fillRect(-s * 0.32, -s * 0.1, s * 0.64, s * 0.22);
    ctx.fillRect(-s * 0.08, -s * 0.06, s * 0.12, s * 0.4);
  } else if (id === "heli") {
    ctx.fillRect(-s * 0.28, -s * 0.06, s * 0.56, s * 0.16);
    ctx.fillRect(s * 0.08, -s * 0.02, s * 0.28, s * 0.08);
    ctx.fillRect(-s * 0.32, -s * 0.22, s * 0.64, s * 0.06);
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath(); ctx.arc(0, s * 0.18, s * 0.08, 0, 7); ctx.fill();
  } else if (id === "terra") {
    ctx.fillRect(-s * 0.08, -s * 0.28, s * 0.16, s * 0.36);
    ctx.fillRect(-s * 0.22, s * 0.04, s * 0.44, s * 0.16);
    ctx.fillStyle = "#c4a574";
    ctx.fillRect(-s * 0.18, s * 0.14, s * 0.36, s * 0.12);
  } else if (id === "ammo") {
    ctx.fillRect(-s * 0.22, -s * 0.18, s * 0.44, s * 0.4);
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(-s * 0.12, -s * 0.08, s * 0.24, s * 0.2);
  } else if (id === "bind") {
    ctx.font = "700 36px Outfit, sans-serif";
    ctx.fillText("X/Y", -s * 0.32, s * 0.12);
  } else if (id === "bike") {
    ctx.beginPath(); ctx.arc(-s * 0.18, s * 0.12, s * 0.14, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.2, s * 0.12, s * 0.14, 0, 7); ctx.fill();
    ctx.fillRect(-s * 0.22, -s * 0.08, s * 0.48, s * 0.1);
  } else if (id === "noodle") {
    ctx.strokeStyle = "#66f0ff";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, s * 0.2);
    ctx.quadraticCurveTo(0, -s * 0.4, s * 0.32, s * 0.1);
    ctx.stroke();
  } else {
    ctx.fillRect(-s * 0.28, -s * 0.1, s * 0.58, s * 0.18);
    ctx.fillRect(-s * 0.04, 0.06 * s, s * 0.1, s * 0.24);
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(s * 0.22, -s * 0.16, s * 0.06, s * 0.08);
  }
  ctx.restore();
}

function paintShopCard(it, i, highlight) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 160;
  const ctx = c.getContext("2d");
  const equipped = it.kind === "wep" && player.wep === it.id;
  const have = it.kind === "wep" && owned.has(it.id);
  const locked = !prereqMet(it);
  ctx.fillStyle = locked ? "#2a2a2e" : highlight ? "#111111" : "#f7f4ee";
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = highlight ? "#d4af37" : "#cfc8b8";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 154);
  drawShopIcon(ctx, it, 80, 80, 108);
  ctx.fillStyle = locked ? "#c8c4bc" : highlight ? "#f7f4ee" : "#111";
  ctx.font = "700 32px Outfit, sans-serif";
  ctx.fillText(it.name, 150, 58);
  ctx.font = "600 22px Outfit, sans-serif";
  ctx.fillStyle = highlight ? "#d4af37" : "#6a655c";
  let price = equipped ? "EQUIPPED" : have ? "OWNED — tap to equip" : it.cost + " ◎";
  if (it.kind === "ammo") price = it.cost + " ◎  ·  +40";
  if (it.kind === "bind") price = shopOnX ? "NOW: shop X, reload Y" : "NOW: shop Y, reload X";
  if (it.id === "sprint" && stats.sprint) price = "OWNED";
  if (it.id === "sprintcd") price = sprintBuys >= 10 ? "MAX — infinite sprint" : it.cost + " ◎  ·  " + sprintBuys + "/10";
  if (it.id === "flash") price = flashBuys >= 5 ? "MAX" : it.cost + " ◎  ·  " + flashBuys + "/5";
  if (it.id === "clip") price = clipBuys >= 3 ? "MAX" : it.cost + " ◎  ·  " + clipBuys + "/3";
  if (it.id === "night") price = nightCutsOwned >= 10 ? "MAX — no night" : it.cost + " ◎  ·  " + nightCutsOwned + "/10";
  if (it.id === "autoreload" && stats.autoReload) price = "OWNED";
  if (it.id === "wheelie" && stats.wheelie) price = "OWNED";
  if (it.id === "jump2" && stats.jumps >= 2) price = "OWNED";
  if (it.id === "jump3" && stats.jumps >= 3) price = "OWNED";
  if (it.kind === "bike" && player.bike) price = "OWNED";
  if (!prereqMet(it)) price = "LOCKED — buy " + (it.needLabel || "prereq") + " first";
  ctx.fillText(price, 150, 92);
  ctx.font = "500 18px Outfit, sans-serif";
  ctx.fillText(it.blurb, 150, 122);
  return c;
}

function paintAmmoOrb() {
  const orb = $("ammo-orb");
  if (!orb) return;
  const it = ammoOffer();
  if (!it) {
    orb.hidden = true;
    return;
  }
  orb.hidden = false;
  orb.disabled = player.coins < it.cost;
  const costEl = orb.querySelector(".ammo-orb-cost");
  if (costEl) costEl.textContent = it.cost + "◎";
  orb.onclick = () => buy(it);
}

function paintBindOrb() {
  const orb = $("bind-orb");
  if (!orb) return;
  const it = bindOffer();
  if (!it) {
    orb.hidden = true;
    return;
  }
  orb.hidden = false;
  const now = shopOnX ? "X shop" : "Y shop";
  const other = shopOnX ? "Y reload" : "X reload";
  const sub = orb.querySelector(".bind-orb-sub");
  if (sub) sub.textContent = now;
  orb.title = now + " · " + other;
  orb.onclick = () => buy(it);
}

function paintShop() {
  const host = $("shopgrid");
  if (!host) return;
  host.innerHTML = "";
  for (const sec of shopSections()) {
    const h = document.createElement("h3");
    h.className = "shop-cat";
    h.textContent = sec.title;
    host.appendChild(h);
    for (const it of sec.items) {
    const equipped = it.kind === "wep" && player.wep === it.id;
    const have = it.kind === "wep" && owned.has(it.id);
    const b = document.createElement("button");
    const ico = document.createElement("canvas");
    ico.width = ico.height = 128;
    ico.className = "shop-ico";
    const icx = ico.getContext("2d");
    icx.fillStyle = "#1a1a1e";
    icx.fillRect(0, 0, 128, 128);
    drawShopIcon(icx, it, 64, 64, 104);
    const wrap = document.createElement("span");
    wrap.className = "shop-copy";
    const locked = !prereqMet(it);
    const maxed = (it.id === "flash" && flashBuys >= 5)
      || (it.id === "clip" && clipBuys >= 3)
      || (it.id === "night" && nightCutsOwned >= 10)
      || (it.id === "autoreload" && stats.autoReload)
      || (it.id === "sprint" && stats.sprint)
      || (it.id === "sprintcd" && sprintBuys >= 10)
      || (it.id === "wheelie" && stats.wheelie)
      || (it.id === "jump2" && stats.jumps >= 2)
      || (it.id === "jump3" && stats.jumps >= 3);
    let price = locked ? "LOCKED" : have ? "OWNED" : it.cost + "◎";
    if (it.id === "flash") price = flashBuys >= 5 ? "MAX" : it.cost + "◎ · " + flashBuys + "/5";
    if (it.id === "clip") price = clipBuys >= 3 ? "MAX" : it.cost + "◎ · " + clipBuys + "/3";
    if (it.id === "night") price = nightCutsOwned >= 10 ? "MAX" : it.cost + "◎ · " + nightCutsOwned + "/10";
    if (it.id === "sprintcd") price = sprintBuys >= 10 ? "MAX" : it.cost + "◎ · " + sprintBuys + "/10";
    if (it.id === "autoreload" && stats.autoReload) price = "OWNED";
    wrap.innerHTML = `<b>${it.name}</b> · ${price}${equipped ? " · EQUIPPED" : ""}<small>${locked ? "Requires " + (it.needLabel || "another upgrade") + ". " : ""}${it.blurb}</small>`;
    b.appendChild(ico);
    b.appendChild(wrap);
    const canBind = it.kind === "bind";
    b.disabled = locked || equipped || maxed || (!have && !canBind && player.coins < it.cost);
    b.onclick = () => buy(it);
    host.appendChild(b);
    }
  }
  if ($("shop-gold")) $("shop-gold").textContent = String(player.coins | 0);
  paintAmmoOrb();
  paintBindOrb();
}

function rebuildShopCards() {
  if (!shopRoot) return;
  while (shopRoot.children.length) {
    const ch = shopRoot.children[0];
    shopRoot.remove(ch);
    ch.traverse((o) => {
      if (o.material?.map) o.material.map.dispose();
      if (o.material) o.material.dispose();
      if (o.geometry) o.geometry.dispose();
    });
  }
  shopHits = [];
  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(1.86, 2.32),
    new THREE.MeshBasicMaterial({ color: 0x1a1a1e, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  );
  backing.position.z = -0.02;
  shopRoot.add(backing);
  const titleC = document.createElement("canvas");
  titleC.width = 1024; titleC.height = 160;
  const tctx = titleC.getContext("2d");
  tctx.fillStyle = "#f7f4ee";
  tctx.fillRect(0, 0, 1024, 160);
  tctx.fillStyle = "#d4af37";
  tctx.font = "600 28px Outfit, sans-serif";
  tctx.fillText("ARMORY  ·  point and shoot a card to buy", 28, 48);
  tctx.fillStyle = "#111";
  tctx.font = "700 54px Cinzel, serif";
  tctx.fillText("BUY   " + (player.coins | 0) + " ◎", 28, 118);
  const titleTex = new THREE.CanvasTexture(titleC);
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.24),
    new THREE.MeshBasicMaterial({ map: titleTex, side: THREE.DoubleSide }),
  );
  title.position.set(0, 0.92, 0.01);
  shopRoot.add(title);
  const catalog = shopCatalog();
  let y = 0.74;
  for (const sec of shopSections()) {
    const hc = document.createElement("canvas");
    hc.width = 1024; hc.height = 64;
    const hx = hc.getContext("2d");
    hx.fillStyle = "#111114";
    hx.fillRect(0, 0, 1024, 64);
    hx.fillStyle = "#d4af37";
    hx.font = "700 36px Outfit, sans-serif";
    hx.fillText(sec.title.toUpperCase(), 24, 44);
    const htex = new THREE.CanvasTexture(hc);
    const hmesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.62, 0.07),
      new THREE.MeshBasicMaterial({ map: htex, side: THREE.DoubleSide }),
    );
    hmesh.position.set(0, y, 0.015);
    shopRoot.add(hmesh);
    y -= 0.085;
    sec.items.forEach((it, i) => {
      const col = i % 4;
      const row = (i / 4) | 0;
      const idx = catalog.indexOf(it);
      const c = paintShopCard(it, idx, idx === shopSel);
      const tex = new THREE.CanvasTexture(c);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.38, 0.118),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
      );
      mesh.position.set((col - 1.5) * 0.4, y - row * 0.128, 0.02);
      mesh.userData.shopItem = it;
      mesh.userData.shopIndex = idx;
      shopRoot.add(mesh);
      shopHits.push(mesh);
    });
    y -= Math.ceil(sec.items.length / 4) * 0.128 + 0.03;
  }
  const ammoIt = ammoOffer();
  if (ammoIt) {
    const ac = document.createElement("canvas");
    ac.width = ac.height = 256;
    const ax = ac.getContext("2d");
    ax.beginPath();
    ax.arc(128, 128, 122, 0, Math.PI * 2);
    ax.fillStyle = shopSel === -1 ? "#111111" : "#1a1a1e";
    ax.fill();
    ax.lineWidth = 10;
    ax.strokeStyle = "#d4af37";
    ax.stroke();
    drawShopIcon(ax, ammoIt, 128, 108, 96);
    ax.fillStyle = "#d4af37";
    ax.font = "700 28px Outfit, sans-serif";
    ax.textAlign = "center";
    ax.fillText("AMMO", 128, 188);
    ax.font = "600 22px Outfit, sans-serif";
    ax.fillText(ammoIt.cost + "◎  +40", 128, 216);
    const atex = new THREE.CanvasTexture(ac);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.11, 32),
      new THREE.MeshBasicMaterial({ map: atex, side: THREE.DoubleSide, transparent: true }),
    );
    disc.position.set(-0.16, -0.72, 0.03);
    disc.userData.shopItem = ammoIt;
    disc.userData.shopIndex = -1;
    shopRoot.add(disc);
    shopHits.push(disc);
  }
  const bindIt = bindOffer();
  if (bindIt) {
    const bc = document.createElement("canvas");
    bc.width = bc.height = 256;
    const bx = bc.getContext("2d");
    bx.beginPath();
    bx.arc(128, 128, 122, 0, Math.PI * 2);
    bx.fillStyle = shopSel === -2 ? "#111111" : "#1a1a1e";
    bx.fill();
    bx.lineWidth = 10;
    bx.strokeStyle = "#d4af37";
    bx.stroke();
    bx.fillStyle = "#d4af37";
    bx.font = "700 26px Outfit, sans-serif";
    bx.textAlign = "center";
    bx.fillText("BINDS", 128, 118);
    bx.font = "600 20px Outfit, sans-serif";
    bx.fillStyle = "#f4f1ea";
    bx.fillText(shopOnX ? "X shop" : "Y shop", 128, 150);
    bx.fillText(shopOnX ? "Y reload" : "X reload", 128, 178);
    const btex = new THREE.CanvasTexture(bc);
    const bdisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.11, 32),
      new THREE.MeshBasicMaterial({ map: btex, side: THREE.DoubleSide, transparent: true }),
    );
    bdisc.position.set(0.16, -0.72, 0.03);
    bdisc.userData.shopItem = bindIt;
    bdisc.userData.shopIndex = -2;
    shopRoot.add(bdisc);
    shopHits.push(bdisc);
  }
  tintShopSel();
}

function tintShopSel() {
  for (const m of shopHits) {
    if (m.material) m.material.color.setHex(m.userData.shopIndex === shopSel ? 0xffe08a : 0xffffff);
  }
}

function paintShop3d() {
  rebuildShopCards();
}

function placeShop3d() {
  if (!shopRoot || !shopRoot.visible) return;
  camera.getWorldPosition(tmp);
  camera.getWorldDirection(tmp2);
  tmp2.y = 0;
  if (tmp2.lengthSq() < 1e-4) tmp2.set(0, 0, -1);
  tmp2.normalize();
  shopRoot.position.copy(tmp).addScaledVector(tmp2, 1.7);
  shopRoot.position.y = tmp.y + 0.02;
  shopRoot.lookAt(tmp);
  if (xrOn && shopHits.length) {
    const right = hands.find((h) => h.handed === "right") || hands[1];
    if (right) {
      const { origin, dir } = aimFromGun({ right });
      _ray.set(origin, dir);
      _ray.far = 6;
      const hits = _ray.intersectObjects(shopHits, false);
      const idx = hits[0]?.object?.userData?.shopIndex;
      if (idx != null && idx !== shopSel) {
        shopSel = idx;
        tintShopSel();
      }
    }
  }
}

function aimFromGun(xr) {
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, 0, -1);
  const quat = new THREE.Quaternion();
  if (xrOn && vrGun?.parent) {
    vrGun.getWorldPosition(origin);
    vrGun.getWorldQuaternion(quat);
    if (vrGun.userData.muzzle) origin.add(tmp.copy(vrGun.userData.muzzle).applyQuaternion(quat));
    dir.set(0, 0, -1).applyQuaternion(quat);
  } else if (xrOn && xr?.right) {
    origin.copy(xr.right.pos);
    quat.copy(xr.right.quat);
    origin.add(tmp.set(0, 0, -0.12).applyQuaternion(quat));
    dir.set(0, 0, -1).applyQuaternion(quat);
  } else {
    camera.getWorldPosition(origin);
    quat.copy(camera.quaternion);
    dir.set(0, 0, -1).applyQuaternion(quat);
  }
  return { origin, dir, quat };
}

function tryShopShot(xr) {
  const { origin, dir } = aimFromGun(xr);
  _ray.set(origin, dir);
  _ray.far = 6;
  const hits = _ray.intersectObjects(shopHits, false);
  const obj = hits[0]?.object;
  if (obj?.userData?.shopItem) {
    shopSel = obj.userData.shopIndex;
    buy(obj.userData.shopItem);
    return true;
  }
  return false;
}

function tryOverShot(xr) {
  const { origin, dir } = aimFromGun(xr);
  if (!overMesh?.visible) return false;
  _ray.set(origin, dir);
  _ray.far = 8;
  const hits = _ray.intersectObject(overMesh, true);
  if (!hits.length) return false;
  const uv = hits[0].uv;
  if (uv && menuHits.length) {
    const x = uv.x * 1024;
    const y = (1 - uv.y) * 768;
    for (const hit of menuHits) {
      if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
        if (hit.kind === "resume") resumeRun();
        else startRunFrom(hit.wave || 1);
        return true;
      }
    }
    return true;
  }
  if (paused) resumeRun();
  else startRunFrom(1);
  return true;
}

function toggleShop() {
  if (!running || dead) return;
  shopOpen = !shopOpen;
  if (shopOpen) {
    paintShop();
    paintShop3d();
    if (xrOn) {
      $("shop").hidden = true;
      if (shopRoot) shopRoot.visible = true;
    } else {
      $("shop").hidden = false;
      if (controls?.isLocked) controls.unlock();
    }
  } else {
    $("shop").hidden = true;
    if (shopRoot) shopRoot.visible = false;
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
    rig.add(grip);
    const con = renderer.xr.getController(i);
    rig.add(con);
    const beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.2)]),
      new THREE.LineBasicMaterial({ color: 0x66e8ff, transparent: true, opacity: 0.55 }),
    );
    con.add(beam);
    const h = {
      i, grip, con, beam,
      trigger: false, triggerPrev: false, triggerValue: 0,
      aBtn: false, aPrev: false, bBtn: false, bPrev: false,
      stick: false, stickPrev: false,
      gripBtn: false, gripPrev: false,
      menuBtn: false, menuPrev: false,
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
    if (shopRoot) shopRoot.visible = shopOpen;
    if (!running && !dead) {
      menuOpen = true;
      paintMenu3d("main");
    }
    if (overMesh) overMesh.visible = dead || menuOpen;
  });
  renderer.xr.addEventListener("sessionend", () => {
    xrOn = false;
    if (gunMesh) gunMesh.visible = true;
    if (rig) { rig.rotation.y = 0; rig.position.set(0, 0, 0); }
    camera.position.set(player.x, player.y, player.z);
    $("vr-enter").textContent = "ENTER VR";
    if (shopRoot) shopRoot.visible = false;
    if (overMesh) overMesh.visible = false;
    if (shopOpen) $("shop").hidden = false;
    if (dead) $("over").hidden = false;
    else if (!running || menuOpen) $("start").hidden = false;
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
  if (!session) return { moveX: 0, moveY: 0, lookX: 0, lookY: 0, jump: false, fire: false, fireTap: false, reload: false, shop: false, lClick: false, rClick: false, flash: false, cycle: false, menu: false, right: null };
  for (const src of session.inputSources) {
    const h = hands.find((x) => x.handed === src.handedness) || (src.handedness === "left" ? hands[0] : hands[1]);
    const gp = src.gamepad;
    if (!gp || !h) continue;
    h.triggerPrev = h.trigger;
    h.aPrev = h.aBtn;
    h.bPrev = h.bBtn;
    h.stickPrev = h.stick;
    h.gripPrev = h.gripBtn;
    h.menuPrev = h.menuBtn;
    h.triggerValue = gp.buttons[0] ? gp.buttons[0].value : 0;
    h.trigger = !!(gp.buttons[0] && (gp.buttons[0].pressed || h.triggerValue > 0.35));
    h.aBtn = !!(gp.buttons[4] && gp.buttons[4].pressed);
    h.bBtn = !!(gp.buttons[5] && gp.buttons[5].pressed);
    h.stick = !!(gp.buttons[3] && gp.buttons[3].pressed);
    h.gripBtn = !!(gp.buttons[1] && gp.buttons[1].pressed);
    let menuDown = !!(gp.buttons[2] && gp.buttons[2].pressed);
    for (let bi = 7; bi < (gp.buttons.length || 0); bi++) {
      if (gp.buttons[bi] && gp.buttons[bi].pressed) menuDown = true;
    }
    h.menuBtn = menuDown;
    const ax = gp.axes || [];
    h.axes = [ax[2] != null ? ax[2] : ax[0] || 0, ax[3] != null ? ax[3] : ax[1] || 0];
    h.con.getWorldPosition(h.pos);
    h.con.getWorldQuaternion(h.quat);
  }
  const left = hands.find((h) => h.handed === "left") || hands[0];
  const right = hands.find((h) => h.handed === "right") || hands[1];
  const xTap = !!(left && left.aBtn && !left.aPrev);
  const yTap = !!(left && left.bBtn && !left.bPrev);
  const menuTap = !!(left && (
    (left.menuBtn && !left.menuPrev) ||
    (left.gripBtn && !left.gripPrev)
  ));
  return {
    moveX: left ? left.axes[0] : 0,
    moveY: left ? left.axes[1] : 0,
    lookX: right ? right.axes[0] : 0,
    lookY: right ? right.axes[1] : 0,
    jump: !!(right && right.aBtn && !right.aPrev),
    fire: !!(right && right.trigger),
    fireTap: !!(right && right.trigger && !right.triggerPrev),
    reload: shopOnX ? yTap : xTap,
    shop: shopOnX ? xTap : yTap,
    lClick: !!(left && left.stick && !left.stickPrev),
    rClick: !!(right && right.stick && !right.stickPrev),
    flash: !!(left && left.trigger && !left.triggerPrev),
    cycle: !!(right && right.bBtn && !right.bPrev),
    menu: menuTap,
    right,
  };
}

function physics(dt, xr) {
  let wishX = 0, wishZ = 0;
  if (player.tank || player.heli) {
    const turn = player.heli ? heliYaw : tankYaw;
    if (xrOn) {
      const next = turn - (shopOpen ? 0 : xr.moveX) * (player.heli ? 1.45 : 1.7) * dt;
      if (player.heli) heliYaw = next; else tankYaw = next;
      const fwd = shopOpen ? 0 : -xr.moveY;
      wishX = -Math.sin(next) * fwd;
      wishZ = -Math.cos(next) * fwd;
      if (Math.abs(xr.lookX) > 0.18) yaw -= xr.lookX * 2.05 * dt;
      rig.rotation.y = yaw;
      rig.position.set(player.x, player.y - 1.6, player.z);
    } else {
      let next = turn;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) next += (player.heli ? 1.5 : 1.8) * dt;
      if (keys.has("KeyD") || keys.has("ArrowRight")) next -= (player.heli ? 1.5 : 1.8) * dt;
      if (player.heli) heliYaw = next; else tankYaw = next;
      let fwd = 0;
      if (keys.has("KeyW") || keys.has("ArrowUp")) fwd += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) fwd -= 1;
      wishX = -Math.sin(next) * fwd;
      wishZ = -Math.cos(next) * fwd;
    }
  } else if (xrOn) {
    lookFlat();
    const mx = shopOpen ? 0 : xr.moveX;
    const my = shopOpen ? 0 : xr.moveY;
    wishX = tmp.x * -my + tmp2.x * mx;
    wishZ = tmp.z * -my + tmp2.z * mx;
    if (Math.abs(xr.lookX) > 0.18) yaw -= xr.lookX * 2.05 * dt;
    rig.rotation.y = yaw;
    rig.position.set(player.x, player.y - 1.6, player.z);
  } else {
    lookFlat();
    const fwd = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) + (keys.has("KeyS") || keys.has("ArrowDown") ? -1 : 0);
    const str = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) + (keys.has("KeyA") || keys.has("ArrowLeft") ? -1 : 0);
    wishX = tmp.x * fwd + tmp2.x * str;
    wishZ = tmp.z * fwd + tmp2.z * str;
  }
  const mag = Math.hypot(wishX, wishZ);
  if (mag > 1) { wishX /= mag; wishZ /= mag; }
  const moving = mag > 0.12;
  if (player.sprintCdT > 0) player.sprintCdT -= dt;
  if (stats.sprint && !player.tank && !player.heli && !shopOpen) {
    const inf = stats.sprintCd <= 0;
    if (inf) {
      if (xr.lClick || sprintQueued) { player.sprinting = !player.sprinting; sprintQueued = false; }
    } else if ((xr.lClick || sprintQueued) && player.sprintCdT <= 0 && moving) {
      player.sprinting = true;
      player.sprintT = 3;
      sprintQueued = false;
    } else sprintQueued = false;
  }
  if (player.sprinting) {
    if (!moving && stats.sprintCd > 0) player.sprinting = false;
    if (stats.sprintCd > 0) {
      player.sprintT -= dt;
      if (player.sprintT <= 0) {
        player.sprinting = false;
        player.sprintCdT = stats.sprintCd;
      }
    }
  }
  player.mom = Math.max(0, player.mom - dt * 0.35);
  let spd = (player.heli ? 12.2 : player.tank ? 4.6 : player.bike ? 9.4 : 6.4) * stats.speed * (shopOpen ? 0.12 : 1);
  if (player.sprinting) spd *= 1.7 * (stats.sprintMul || 1);
  spd *= 1 + player.mom;
  player.vx = wishX * spd;
  player.vz = wishZ * spd;
  const canJump = !player.tank && !player.heli && (player.grounded || player.jumpsLeft > 0);
  if ((jumpQueued || xr.jump) && canJump) {
    if (player.grounded) player.jumpsLeft = stats.jumps - 1;
    else player.jumpsLeft--;
    player.vy = 7.2 * stats.jump;
    player.grounded = false;
    jumpQueued = false;
    if (player.sprinting && stats.wheelie) player.mom = Math.min(0.9, player.mom + 0.16);
  }
  player.x += player.vx * dt;
  player.z += player.vz * dt;
  const stand = heightAt(player.x, player.z, player.y) + 1.6;
  if (player.heli) {
    let climb = 0;
    if (xrOn) {
      if (xr.jump) climb += 1;
      if (Math.abs(xr.lookY || 0) > 0.2) climb -= xr.lookY;
    } else {
      if (keys.has("Space") || keys.has("KeyQ")) climb += 1;
      if (keys.has("ShiftLeft") || keys.has("KeyE")) climb -= 1;
    }
    const floor = stand + 0.55;
    player.y += climb * 8.8 * dt;
    player.y = clamp(player.y, floor, floor + 26);
    player.vy = 0;
    player.grounded = false;
    jumpQueued = false;
  } else {
  const grav = player.pounding && !player.grounded ? 88 : 22;
  player.vy -= grav * dt;
  player.y += player.vy * dt;
  const wasAir = !player.grounded;
  if (player.y <= stand) {
    if (wasAir && player.pounding) {
      craterAt(player.x, player.z, 3.4, 1.8);
      disintegrateAt(player.x, player.z, 4.2);
      player.pounding = false;
    }
    if (wasAir && player.sprinting && stats.wheelie) player.mom = Math.min(0.9, player.mom + 0.2);
    player.y = stand;
    player.vy = 0;
    player.grounded = true;
    player.jumpsLeft = stats.jumps;
  } else {
    player.grounded = false;
  }
  }
  if (player.bike) {
    if (!bikeMesh) { bikeMesh = makeBikeMesh(); scene.add(bikeMesh); }
    bikeMesh.visible = true;
    bikeMesh.position.set(player.x, stand - 1.6, player.z);
    bikeMesh.rotation.y = yaw;
  } else if (bikeMesh) bikeMesh.visible = false;
  ensureHexes(dt);
  recenterFloor();
  if (!xrOn) {
    camera.position.set(player.x, player.y, player.z);
  }
}

function ownedGuns() {
  return Object.keys(WEPS).filter((id) => owned.has(id));
}

function cycleOwned() {
  const ids = ownedGuns();
  if (!ids.length) return;
  if (ids.length === 1) {
    if (player.wep !== ids[0]) equip(ids[0]);
    showBanner(wep().name.toUpperCase());
    announcing = 0.55;
    return;
  }
  let i = ids.indexOf(player.wep);
  if (i < 0) i = 0;
  equip(ids[(i + 1) % ids.length]);
  showBanner(wep().name.toUpperCase());
  announcing = 0.7;
}

function placeDesktopGun() {
  if (!gunMesh) {
    gunMesh = makeGun(player.wep);
    camera.add(gunMesh);
    gunMesh.position.set(0.18, -0.14, -0.32);
  }
  gunMesh.visible = !xrOn && !player.heli && !player.tank;
}

function tickMelee(dt) {
  meleeCd = Math.max(0, meleeCd - dt);
  const g = xrOn ? vrGun : gunMesh;
  if (!g || shopOpen || dead) {
    meleeHave = false;
    return;
  }
  g.updateMatrixWorld(true);
  const p = tmp4.setFromMatrixPosition(g.matrixWorld);
  if (!meleeHave) {
    meleePrev.copy(p);
    meleeHave = true;
    return;
  }
  const vel = tmp.copy(p).sub(meleePrev).multiplyScalar(dt > 1e-4 ? 1 / dt : 0);
  meleePrev.copy(p);
  const spd = vel.length();
  const tip = tmp2.copy(p).addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion())), 0.28);
  const need = xrOn ? 7.2 : 7.5;
  if (spd < need || meleeCd > 0) return;
  for (const m of mobs) {
    if (!m.alive) continue;
    const d = Math.hypot(m.x - tip.x, m.z - tip.z);
    if (d > m.hitR + 0.7) continue;
    if (Math.abs(m.y - tip.y) > 1.6) continue;
    const limb = nearestLiveLimb(m, tip);
    if (!limb) continue;
    const swings = Math.max(1, wep().dmg || 1);
    for (let k = 0; k < swings && limb.userData.live; k++) hitLimb(limb, m);
    meleeCd = 0.16;
    sfx.hit();
    break;
  }
}

function doFire(xr) {
  if (dead || menuOpen) {
    tryOverShot(xr);
    return;
  }
  if (shopOpen) {
    tryShopShot(xr);
    return;
  }
  const { origin, quat, dir } = aimFromGun(xr);
  const stand = heightAt(player.x, player.z, player.y) + 1.6;
  const airborne = !player.grounded && player.y > stand + 0.55;
  player.pounding = !!(airborne && !player.tank && !player.heli && dir.y < -0.62);
  fireFrom(origin, quat);
}

function tickShopStick(dt, xr) {
  if (!shopOpen) return;
  shopStickLatch = Math.max(0, shopStickLatch - dt);
  const n = shopCatalog().length;
  if (!n) return;
  if (xrOn) {
    if (xr.moveY > 0.55 && shopStickLatch <= 0) {
      shopSel = shopSel < 0 ? 0 : (shopSel + 1) % n;
      shopStickLatch = 0.22;
      tintShopSel();
    } else if (xr.moveY < -0.55 && shopStickLatch <= 0) {
      shopSel = shopSel < 0 ? n - 1 : (shopSel + n - 1) % n;
      shopStickLatch = 0.22;
      tintShopSel();
    }
  }
}

function loop() {
  const dt = Math.min(0.05, clock.getDelta() || 0.016);
  if (fireCd > 0) fireCd -= dt;
  if (reloadT > 0) {
    reloadT -= dt;
    if (reloadT <= 0) finishReload();
  } else if (running && !dead && !menuOpen && stats.autoReload && player.mag <= 0 && plasmaT <= 0) {
    reload();
  }
  if (hurtT > 0) hurtT -= dt;
  if (iFrame > 0) iFrame -= dt;
  if (!dead) tickSky(dt);
  if (announcing > 0) {
    announcing -= dt;
    placeBanner();
    if (bannerSpr) bannerSpr.material.opacity = clamp(announcing, 0, 1);
    if (announcing <= 0) hideBanner();
  }
  const xr = xrOn ? pollXr() : { moveX: 0, moveY: 0, lookX: 0, lookY: 0, jump: false, fire: false, fireTap: false, reload: false, shop: false, lClick: false, rClick: false, flash: false, cycle: false, menu: false, right: null };
  if (xr.menu) toggleMainMenu();
  if (!dead && !menuOpen && xr.shop) toggleShop();
  if (!dead && !menuOpen && xr.reload) reload();
  if (!dead && !menuOpen && (xr.cycle || xr.rClick)) cycleOwned();
  if (!dead && !menuOpen && xr.flash) toggleFlash();
  tickMusic();
  syncFlashlight();
  tickFx(dt);
  syncVrGun();
  syncWrist();
  syncReloadBar();
  tickShopStick(dt, xr);
  placeShop3d();
  if (dead || menuOpen) {
    placeOver3d();
    if (xrOn && xr.fireTap) doFire(xr);
  } else if (running) {
    physics(dt, xr);
    if (shopOpen) {
      if (xrOn && xr.fireTap) doFire(xr);
    } else {
      const firing = xr.fire || (!xrOn && (keys.has("Mouse1") || mouseDown));
      if (firing) doFire(xr);
      const aim = aimFromGun(xr);
      tickPlasma(dt, aim.origin, aim.quat);
      tickNoodle(dt, aim.origin, aim.quat, firing);
      if (player.wep === "gravity") {
        tickGrab(dt, firing, aim.origin, aim.dir);
      } else grabMob = null;
      tickMobs(dt);
      tickMelee(dt);
      tickShots(dt);
      tickEshots(dt);
      tickCries(dt);
      tickDrones(dt);
      tickTurrets(dt);
      tickBalls(dt);
      tickMeteors(dt);
      tickTank();
      tickHeli();
      tickDebris(dt);
      tickLoot(dt);
      tickAmmoField(dt);
      tickFlag(dt);
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
  scene.fog = new THREE.Fog(0xe8e6e0, 31, 121);
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 308);
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
  moonLight = new THREE.DirectionalLight(0x88aacc, 0.12);
  moonLight.position.set(-10, 8, -6);
  scene.add(moonLight);
  flashRig = new THREE.Group();
  flashLight = new THREE.SpotLight(0xfff1c8, 0, 36, Math.PI * 0.2, 0.42, 1.05);
  flashLight.position.set(0, 0, 0.02);
  const flashTgt = new THREE.Object3D();
  flashTgt.position.set(0, 0, -1);
  flashRig.add(flashLight, flashTgt);
  flashLight.target = flashTgt;
  flashFill = new THREE.PointLight(0xffe4b0, 0, 5.5, 2);
  flashFill.position.set(0, 0, 0.05);
  flashRig.add(flashFill);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff4d0 }),
  );
  bulb.position.set(0, 0, 0.02);
  bulb.visible = false;
  flashRig.add(bulb);
  flashRig.userData.bulb = bulb;
  camera.add(flashRig);
  flashRig.position.set(0.12, -0.08, -0.14);
  makeSky();
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
  hc.width = 512; hc.height = 320;
  hudCtx = hc.getContext("2d");
  hudTex = new THREE.CanvasTexture(hc);
  hudMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.138),
    new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, side: THREE.DoubleSide }),
  );
  hudMesh.position.set(0.07, 0, 0);
  const rc = document.createElement("canvas");
  rc.width = rc.height = 256;
  radarCtx = rc.getContext("2d");
  radarTex = new THREE.CanvasTexture(rc);
  radarMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.072, 32),
    new THREE.MeshBasicMaterial({ map: radarTex, transparent: true, depthTest: false, side: THREE.DoubleSide }),
  );
  radarMesh.position.set(-0.1, 0, 0);
  wristRoot = new THREE.Group();
  wristRoot.add(radarMesh, hudMesh);
  wristRoot.visible = false;

  shopRoot = new THREE.Group();
  shopRoot.visible = false;
  scene.add(shopRoot);

  const oc = document.createElement("canvas");
  oc.width = 1024; oc.height = 768;
  overCtx = oc.getContext("2d");
  overTex = new THREE.CanvasTexture(oc);
  overMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.28),
    new THREE.MeshBasicMaterial({ map: overTex, side: THREE.DoubleSide }),
  );
  overMesh.visible = false;
  scene.add(overMesh);

  controls = new PointerLockControls(camera, renderer.domElement);
  attachXr();
  placeDesktopGun();
  renderer.setAnimationLoop(loop);
  paintLb();
  paintWaveButtons();
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
        if (!running) openMainMenu();
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
  if (e.code === "KeyR") reload();
  if (e.code === "KeyY") { if (shopOnX) reload(); else toggleShop(); }
  if (e.code === "KeyX" || e.code === "Tab") {
    e.preventDefault();
    if (shopOnX) toggleShop();
    else reload();
  }
  if (e.code === "KeyQ" || e.code === "KeyC" || e.code === "KeyB") cycleOwned();
  if (e.code === "KeyF" || e.code === "KeyL") toggleFlash();
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") sprintQueued = true;
  if (e.code === "Escape") {
    if (shopOpen) toggleShop();
    else toggleMainMenu();
  }
  if (shopOpen && (e.code === "ArrowDown" || e.code === "KeyS")) {
    const n = shopCatalog().length;
    shopSel = shopSel < 0 ? 0 : (shopSel + 1) % n;
    paintShop3d();
  }
  if (shopOpen && (e.code === "ArrowUp" || e.code === "KeyW")) {
    const n = shopCatalog().length;
    shopSel = shopSel < 0 ? n - 1 : (shopSel + n - 1) % n;
    paintShop3d();
  }
  if (shopOpen && (e.code === "Enter" || e.code === "Space")) {
    const it = shopItemBySel(shopSel);
    if (it) buy(it);
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("mousedown", (e) => { if (e.button === 0) mouseDown = true; });
addEventListener("mouseup", (e) => { if (e.button === 0) mouseDown = false; });

$("play").onclick = () => startRunFrom(1);
$("again").onclick = () => { $("over").hidden = true; startRunFrom(1); };
if ($("resume")) $("resume").onclick = () => resumeRun();
$("over").addEventListener("click", (e) => {
  if (!dead) return;
  if (e.target.closest("#to-menu, #over-waves, .wave-start")) return;
  $("over").hidden = true;
  startRunFrom(1);
});
$("to-menu").onclick = () => { $("over").hidden = true; openMainMenu(); };
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
