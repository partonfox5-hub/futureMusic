import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

const LS = "horde.lb.v1";
const SPAWN_MIN = 52;
const SPAWN_MAX = 78;
const MAX_LIVE = 72;
const COLORS = [0xff3355, 0x33ddaa, 0xffcc22, 0x6688ff, 0xff66dd, 0x44e0ff, 0xff8822];
const DAY_LEN = 720;
const HEARTS = 5;
const MAX_HP0 = HEARTS * 2;

const WEPS = {
  pistol: { id: "pistol", name: "Pistol", dmg: 1, rpm: 3.2, mag: 12, speed: 62, spread: 0.012, pellets: 1, cost: 0, reload: 10 },
  smg: { id: "smg", name: "SMG", dmg: 1, rpm: 9.5, mag: 28, speed: 70, spread: 0.045, pellets: 1, cost: 90, reload: 6.2 },
  shotgun: { id: "shotgun", name: "Scattergun", dmg: 1, rpm: 1.15, mag: 6, speed: 48, spread: 0.14, pellets: 7, cost: 140, reload: 8.4 },
  rail: { id: "rail", name: "Rail", dmg: 3, rpm: 1.4, mag: 4, speed: 160, spread: 0, pellets: 1, hitscan: true, cost: 220, reload: 12 },
  thunder: { id: "thunder", name: "Thunder", dmg: 2, rpm: 0.7, mag: 3, speed: 40, spread: 0, pellets: 1, spell: true, aoe: 4.2, cost: 160, reload: 9.2 },
  nova: { id: "nova", name: "Nova", dmg: 3, rpm: 0.45, mag: 2, speed: 36, spread: 0, pellets: 1, spell: true, aoe: 6.4, cost: 280, reload: 11.4 },
  plasma: { id: "plasma", name: "Plasma beam", dmg: 4, rpm: 3.6, mag: 18, speed: 140, spread: 0, pellets: 1, hitscan: true, pierce: 2, cost: 650, reload: 8.5 },
  ripple: { id: "ripple", name: "Ripple ray", dmg: 2, rpm: 1.6, mag: 8, speed: 22, spread: 0.08, pellets: 11, pierce: 3, ripple: true, cost: 1400, reload: 9.8 },
  gravity: { id: "gravity", name: "Zero-point gun", dmg: 2, rpm: 8, mag: 40, speed: 40, spread: 0, pellets: 1, gravity: true, cost: 1800, reload: 7.5 },
  nuke: { id: "nuke", name: "Mini nuke", dmg: 8, rpm: 0.32, mag: 1, speed: 18, spread: 0, pellets: 1, aoe: 12, nuke: true, cost: 2800, reload: 16 },
  tank: { id: "tank", name: "Cyber tank", dmg: 6, rpm: 0.48, mag: 4, speed: 28, spread: 0.01, pellets: 1, aoe: 7.5, tank: true, cost: 4500, reload: 14 },
};

const SHOP = [
  { kind: "wep", id: "pistol", name: "Pistol", cost: 0, blurb: "Starter iron. 10s reload." },
  { kind: "wep", id: "smg", name: "SMG", cost: 90, blurb: "Fast fire. Reloads quicker than the pistol." },
  { kind: "wep", id: "shotgun", name: "Scattergun", cost: 140, blurb: "Seven pellets. Close range." },
  { kind: "wep", id: "rail", name: "Rail", cost: 220, blurb: "Hitscan. Tears several limbs." },
  { kind: "wep", id: "thunder", name: "Thunder spell", cost: 160, blurb: "Blast a sphere. Uses ammo." },
  { kind: "wep", id: "nova", name: "Nova spell", cost: 280, blurb: "Wide shock. Uses ammo." },
  { kind: "wep", id: "plasma", name: "Plasma beam", cost: 650, blurb: "Hot hitscan. Tears through two foes." },
  { kind: "drone", id: "drone", name: "Gun drone", cost: 420, blurb: "Hovers and fires a pistol. 2 hearts." },
  { kind: "ball", id: "ball-s", name: "Guard orb", cost: 280, blurb: "Small forcefield. 4 hearts.", hp: 8 },
  { kind: "ball", id: "ball-m", name: "Aegis orb", cost: 620, blurb: "Stout forcefield. 8 hearts.", hp: 16 },
  { kind: "ball", id: "ball-l", name: "Bulwark orb", cost: 1100, blurb: "Heavy forcefield. 16 hearts.", hp: 32 },
  { kind: "wep", id: "ripple", name: "Ripple ray", cost: 1400, blurb: "Swarm of colored rings. Pierce 3." },
  { kind: "wep", id: "gravity", name: "Zero-point gun", cost: 1800, blurb: "Grab a foe. Slam others with it." },
  { kind: "wep", id: "nuke", name: "Mini nuke", cost: 2800, blurb: "One slow shell. A wide crater." },
  { kind: "wep", id: "tank", name: "Cyber tank", cost: 4500, blurb: "Drive it. Fire artillery." },
  { kind: "up", id: "jump", name: "Jump height", cost: 40, blurb: "+28% jump", key: "jump", add: 0.28 },
  { kind: "up", id: "speed", name: "Move speed", cost: 45, blurb: "+16% run", key: "speed", add: 0.16 },
  { kind: "up", id: "hp", name: "Heart", cost: 50, blurb: "+1 max heart and heal", key: "maxHp", add: 2 },
  { kind: "up", id: "reload", name: "Reload speed", cost: 40, blurb: "Faster Y reload", key: "reload", add: 0.22 },
  { kind: "up", id: "magnet", name: "Coin magnet", cost: 55, blurb: "Pull loot from farther", key: "magnet", add: 1.4 },
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
let announcing = 0;
let fireCd = 0;
let reloadT = 0;
let reloadMax = 0;
let hurtT = 0;
let iFrame = 0;
let yaw = 0;
let jumpQueued = false;
let ammoT = 0;
let healthT = 18;
let owned = new Set(["pistol"]);
let stats = { speed: 1, jump: 1, maxHp: MAX_HP0, reload: 1, magnet: 2.4 };
let player = { x: 0, y: 1.6, z: 0, vx: 0, vy: 0, vz: 0, hp: MAX_HP0, grounded: true, coins: 0, ammo: 48, mag: 12, wep: "pistol" };
let mobs = [];
let debris = [];
let loot = [];
let shots = [];
let drones = [];
let balls = [];
let meteors = [];
let craters = [];
let grabMob = null;
let tankMesh = null;
let tankYaw = 0;
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
    if (id === "smg") {
      laserTone(2100, 320, 0.07, 0.11);
      noise(0.05, 0.09, 1400);
      beep("sine", 90, 0.05, 0.06, 50);
    } else if (id === "shotgun") {
      laserTone(900, 90, 0.16, 0.14);
      noise(0.12, 0.16, 280);
      beep("sine", 70, 0.14, 0.1, 36);
    } else if (id === "rail") {
      laserTone(2800, 110, 0.28, 0.16, "square");
      noise(0.16, 0.14, 220);
      beep("sine", 160, 0.22, 0.1, 70);
    } else if (id === "thunder" || id === "nova") {
      laserTone(720, 55, 0.26, 0.15);
      noise(0.2, 0.16, 140);
      beep("sine", 64, 0.24, 0.1, 32);
    } else if (id === "nuke" || id === "tank") {
      noise(0.22, 0.18, 140);
      beep("sine", 70, 0.28, 0.12, 32);
    } else if (id === "ripple") {
      laserTone(900, 220, 0.16, 0.1);
    } else if (id === "plasma") {
      laserTone(2400, 180, 0.14, 0.14, "square");
    } else {
      laserTone(1550, 140, 0.12, 0.13);
      noise(0.08, 0.12, 420);
      beep("sine", 110, 0.09, 0.08, 48);
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
};

function heightAt(x, z) {
  let h =
    Math.sin(x * 0.031) * 1.55 +
    Math.cos(z * 0.027) * 1.25 +
    Math.sin(x * 0.019 + z * 0.017) * 0.95 +
    Math.sin(x * 0.0075 + z * 0.0095) * 2.15;
  for (const c of craters) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < c.r) {
      const k = 1 - d / c.r;
      h -= c.depth * k * k;
    }
  }
  return h;
}

function lerpC(a, b, t) {
  t = clamp(t, 0, 1);
  return a.clone().lerp(b, t);
}

function skyPalette(t) {
  const nightZ = new THREE.Color(0x050816);
  const nightH = new THREE.Color(0x0c1230);
  const dawnZ = new THREE.Color(0x6a8cbc);
  const dawnH = new THREE.Color(0xffb080);
  const mornZ = new THREE.Color(0x8eb8e0);
  const mornH = new THREE.Color(0xc8dce8);
  const noonZ = new THREE.Color(0x5aa4e8);
  const noonH = new THREE.Color(0xd8ecff);
  const duskZ = new THREE.Color(0x2a1848);
  const duskH = new THREE.Color(0xff6a3a);
  const sunsetZ = new THREE.Color(0x3a2060);
  const sunsetH = new THREE.Color(0xff8844);
  let zen, hor, fog, sunI, moonI, hemiI, ground;
  const wrap = (x) => (x + 1) % 1;
  const band = (a, b) => {
    const d = wrap(b - a);
    const x = wrap(t - a);
    if (x > d) return -1;
    return d < 1e-6 ? 1 : x / d;
  };
  let k;
  if ((k = band(0.88, 1.0)) >= 0 || (k = band(0.0, 0.12)) >= 0) {
    zen = nightZ.clone(); hor = nightH.clone(); sunI = 0.02; moonI = 0.55; hemiI = 0.22; ground = new THREE.Color(0x12141c);
  } else if ((k = band(0.12, 0.20)) >= 0) {
    zen = lerpC(nightZ, dawnZ, k); hor = lerpC(nightH, dawnH, k); sunI = 0.15 + k * 0.35; moonI = 0.35 * (1 - k); hemiI = 0.35 + k * 0.3; ground = lerpC(new THREE.Color(0x12141c), new THREE.Color(0x3a2a22), k);
  } else if ((k = band(0.20, 0.32)) >= 0) {
    zen = lerpC(dawnZ, mornZ, k); hor = lerpC(dawnH, mornH, k); sunI = 0.5 + k * 0.4; moonI = 0.08; hemiI = 0.7 + k * 0.25; ground = lerpC(new THREE.Color(0x3a2a22), new THREE.Color(0x8a8478), k);
  } else if ((k = band(0.32, 0.58)) >= 0) {
    zen = lerpC(mornZ, noonZ, Math.min(1, k * 1.4)); hor = lerpC(mornH, noonH, Math.min(1, k * 1.4)); sunI = 0.95; moonI = 0; hemiI = 1.12; ground = new THREE.Color(0xb8b2a6);
  } else if ((k = band(0.58, 0.70)) >= 0) {
    zen = lerpC(noonZ, sunsetZ, k); hor = lerpC(noonH, sunsetH, k); sunI = 0.85 - k * 0.25; moonI = k * 0.12; hemiI = 1.0 - k * 0.25; ground = lerpC(new THREE.Color(0xb8b2a6), new THREE.Color(0x6a4030), k);
  } else if ((k = band(0.70, 0.80)) >= 0) {
    zen = lerpC(sunsetZ, duskZ, k); hor = lerpC(sunsetH, duskH, k); sunI = 0.45 - k * 0.35; moonI = 0.15 + k * 0.25; hemiI = 0.7 - k * 0.3; ground = lerpC(new THREE.Color(0x6a4030), new THREE.Color(0x2a2038), k);
  } else {
    k = band(0.80, 0.88);
    zen = lerpC(duskZ, nightZ, k < 0 ? 1 : k); hor = lerpC(duskH, nightH, k < 0 ? 1 : k); sunI = 0.08; moonI = 0.45 + (k < 0 ? 0 : k) * 0.1; hemiI = 0.32; ground = new THREE.Color(0x16141e);
  }
  fog = hor.clone();
  return { zen, hor, fog, sunI, moonI, hemiI, ground };
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
        if (uMoonI > 0.25 && vP.y > 0.1) {
          float n = fract(sin(dot(vP.xy * 80.0, vec2(12.9898,78.233))) * 43758.5453);
          stars = step(0.992, n) * (uMoonI - 0.25);
        }
        col += vec3(stars);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(160, 32, 20), skyMat);
  scene.add(skyMesh);
  sunBall = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c2 }));
  moonBall = new THREE.Mesh(new THREE.SphereGeometry(3.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdce6f4 }));
  scene.add(sunBall, moonBall);
}

function tickSky(dt) {
  dayT = (dayT + dt / DAY_LEN) % 1;
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
  if (sun) {
    sun.position.copy(sunDir).multiplyScalar(60);
    sun.intensity = pal.sunI * 0.85;
    sun.color.set(pal.sunI > 0.4 ? 0xfff2d8 : 0xffc090);
  }
  if (moonLight) {
    moonLight.position.copy(moonDir).multiplyScalar(50);
    moonLight.intensity = pal.moonI * 0.35;
  }
  if (hemi) {
    hemi.intensity = pal.hemiI;
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
  const tipCol = id === "nova" ? 0xff66aa : id === "rail" ? 0x66eeff : 0x44ddff;
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
  player.mag = Math.min(player.mag, wep().mag);
  reloadT = 0;
  reloadMax = 0;
  if (!player.tank && tankMesh) tankMesh.visible = false;
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
    pos.setY(i, heightAt(wx, wz));
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
  g.userData = {
    len, thick, rubber, hp: 1, live: true, mesh, pad, asLeg, form,
    dmg, run, fly, phase: rng() * Math.PI * 2,
  };
  return g;
}

function limbCountForWave(w) {
  const maxN = Math.min(15, 4 + w);
  const avg = 2.4 + w * 0.42;
  if (w >= 6 && rng() < Math.min(0.16, 0.03 + w * 0.01)) return maxN;
  const n = Math.round(avg + (rng() - 0.5) * (1.6 + w * 0.18));
  return clamp(n, 2, maxN);
}

function mobScaleForWave(w) {
  if (w >= 4 && rng() < Math.min(0.14, 0.025 + w * 0.008)) return 2.2 + rng() * (1.2 + w * 0.08);
  const spread = 0.08 + w * 0.035;
  return clamp(1 + (rng() - 0.5) * 2 * spread, 0.72, 1.35 + w * 0.03);
}

function makeMob(w, ang, dist) {
  const n = limbCountForWave(w);
  const bodyScale = mobScaleForWave(w);
  const group = new THREE.Group();
  const coreR = (0.22 + rng() * 0.18) * Math.min(1.4, 0.75 + bodyScale * 0.25);
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
  let wingsPlaced = 0;
  for (let i = 0; i < n; i++) {
    const leg = i < Math.min(2, n);
    let form = pickLimbForm(w, leg);
    if (form === "wing") wingsPlaced++;
    if (!leg && wingsPlaced === 0 && i === n - 1 && rng() < Math.min(0.45, 0.12 + w * 0.03)) form = "wing";
    const limb = makeLimb(w, leg, form);
    const lyaw = leg ? (i === 0 ? 0.35 : -0.35) + (rng() - 0.5) * 0.4 : rng() * Math.PI * 2;
    const pitch = limb.userData.form === "wing"
      ? -0.15 + rng() * 0.3
      : leg ? 0.15 + rng() * 0.25 : -0.4 + rng() * 1.3;
    limb.rotation.order = "YXZ";
    limb.userData.baseYaw = lyaw;
    limb.userData.basePitch = pitch;
    limb.rotation.y = lyaw;
    limb.rotation.x = pitch;
    const attach = coreR * 0.7;
    const isWing = limb.userData.form === "wing";
    limb.position.set(
      Math.sin(lyaw) * attach * (leg ? 0.6 : 1.05),
      isWing ? coreR * 0.35 : (leg ? -coreR * 0.2 : (rng() - 0.3) * coreR),
      Math.cos(lyaw) * attach * (leg ? 0.6 : 1.05),
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
  return {
    mesh: group,
    core,
    limbs,
    hpLimbs: n,
    x, z, y: walkH,
    spd: (1.55 + w * 0.08) * boost * runMul / Math.max(1, Math.sqrt(bodyScale)),
    boost,
    bodyScale,
    bob: rng() * 6,
    hitR: (0.7 + coreR) * bodyScale,
    hitCd: 0,
    dodgeY: 0,
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
  const dw = diffWave();
  const count = Math.pow(2, dw - 1);
  pending = count;
  waveLeft = count;
  announcing = 2.6;
  showBanner("WAVE " + wave);
  applyPlanetTex(false);
  sfx.wave();
  dripSpawn();
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

function dripSpawn() {
  while (pending > 0 && mobs.filter((m) => m.alive).length < MAX_LIVE) {
    const ang = rng() * Math.PI * 2;
    const dist = SPAWN_MIN + rng() * (SPAWN_MAX - SPAWN_MIN);
    mobs.push(makeMob(diffWave(), ang, dist));
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
  dripSpawn();
  for (const m of mobs) {
    if (!m.alive) continue;
    if (m.hitCd > 0) m.hitCd -= dt;
    const dx = player.x - m.x;
    const dz = player.z - m.z;
    const dist = Math.hypot(dx, dz) || 1;
    const liveLimbs = m.limbs.filter((l) => l.userData.live);
    const liveLegs = liveLimbs.filter((l) => l.userData.asLeg || l.userData.form === "bug");
    const gait = liveLimbs.length ? liveLimbs : m.limbs;
    const wings = liveLimbs.filter((l) => l.userData.form === "wing");
    const nW = wings.length;
    const runMul = liveLimbs.length
      ? liveLimbs.reduce((s, l) => s + (l.userData.run || 1), 0) / liveLimbs.length
      : 0.35;
    const dodge = incomingDodge(m);
    let vx = (dx / dist) * m.spd * runMul;
    let vz = (dz / dist) * m.spd * runMul;
    if (dodge.threat) {
      const mag = Math.hypot(dodge.dodgeX, dodge.dodgeZ) || 1;
      const dodgeScale = 0.2 + 0.8 * Math.min(1, (diffWave() - 1) / 99);
      const agility = (1.2 + nW * 1.4 + (m.bodyScale < 1.4 ? 0.8 : 0.15)) * dodgeScale;
      vx += (dodge.dodgeX / mag) * agility;
      vz += (dodge.dodgeZ / mag) * agility;
    }
    m.x += vx * dt;
    m.z += vz * dt;
    m.bob += dt * (4 + m.spd + nW * 2);
    const sample = (liveLegs[0] || gait[0]).userData;
    const lift = (0.38 + sample.len * 0.38) * (m.bodyScale || 1);
    const groundY = heightAt(m.x, m.z) + lift;
    let hover = groundY;
    if (nW === 1) {
      const scrape = 0.5 + 0.5 * Math.sin(m.bob * 0.65 + m.x * 0.05);
      hover = groundY + 0.08 + scrape * 0.95;
    } else if (nW >= 2) {
      const ceil = 0.85 + (nW - 1) * 1.15 + wings.reduce((s, l) => s + (l.userData.fly || 1), 0) * 0.25;
      hover = groundY + ceil + Math.sin(m.bob * 0.9) * 0.35;
    }
    if (dodge.threat && nW) {
      const dodgeScale = 0.2 + 0.8 * Math.min(1, (diffWave() - 1) / 99);
      hover += dodge.dodgeY * (0.4 + nW * 0.55) * dodgeScale;
    }
    const climb = nW ? 2.2 + nW * 1.1 : 8;
    m.y += (hover - m.y) * Math.min(1, dt * climb);
    if (m.y < groundY) m.y = groundY;
    for (const limb of m.limbs) {
      if (!limb.userData.live) continue;
      const u = limb.userData;
      if (u.form === "wing") {
        limb.rotation.z = Math.sin(m.bob * (7 + nW) + u.phase) * (0.55 + nW * 0.08);
        limb.rotation.x = u.basePitch + Math.sin(m.bob * 1.4 + u.phase) * 0.12;
      } else if (u.form === "tentacle") {
        limb.rotation.x = u.basePitch + Math.sin(m.bob * 2.6 + u.phase) * 0.85;
        limb.rotation.z = Math.sin(m.bob * 1.8 + u.phase) * 0.45;
        if (u.mesh) u.mesh.scale.y = 1 + Math.sin(m.bob * 4 + u.phase) * u.rubber;
      } else if (u.form === "bug") {
        limb.rotation.x = u.basePitch + Math.sin(m.bob * 7.2 + u.phase) * 0.72;
        limb.rotation.z = Math.sin(m.bob * 3.4 + u.phase) * 0.18;
      } else if (u.form === "spike") {
        limb.rotation.x = u.basePitch + Math.sin(m.bob * 2.4 + u.phase) * 0.2;
      } else {
        const swing = Math.sin(m.bob * 2.2 + u.phase) * (u.asLeg || liveLegs.length === 0 ? 0.55 : 0.25);
        limb.rotation.x = u.basePitch + swing;
        if (u.mesh) u.mesh.scale.y = 1 + Math.sin(m.bob * 5 + u.phase) * u.rubber;
      }
    }
    syncMob(m);
    const reach = 0.85 + m.hitR * 0.35;
    if (dist < reach && m.hitCd <= 0 && iFrame <= 0) {
      const dmg = liveLimbs.reduce((mx, l) => Math.max(mx, l.userData.dmg || 1), 1);
      damage(dmg);
      m.hitCd = 0.9;
      m.x -= (dx / dist) * 1.6;
      m.z -= (dz / dist) * 1.6;
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
  camera.getWorldDirection(tmp);
  tmp.y = 0;
  if (tmp.lengthSq() < 1e-6) tmp.set(0, 0, -1);
  tmp.normalize();
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
  radarCtx.beginPath(); radarCtx.arc(128, 128, 70, 0, Math.PI * 2); radarCtx.stroke();
  radarCtx.beginPath(); radarCtx.moveTo(128, 10); radarCtx.lineTo(128, 246); radarCtx.stroke();
  radarCtx.beginPath(); radarCtx.moveTo(10, 128); radarCtx.lineTo(246, 128); radarCtx.stroke();
  const fwd = facingXZ();
  const rx = -fwd.z, rz = fwd.x;
  const range = 48;
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
  hudCtx.fillText("AMMO " + player.mag + " / " + player.ammo, 16, 108);
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
  hudCtx.fillText("Y reload         X shop", 16, 248);
  hudCtx.fillText("Gold flag = waypoint  +50 ◎", 16, 276);
  hudCtx.fillStyle = "#d4af37";
  hudCtx.font = "600 16px Outfit, sans-serif";
  hudCtx.fillText("Look at radar  ·  red = horde", 16, 304);
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
  $("ammo").textContent = player.mag + " / " + player.ammo;
  $("wep").textContent = wep().name;
  $("coins").textContent = String(player.coins | 0);
  $("wave").textContent = String(wave);
  paintHud3d();
}

function makeFlagMesh() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.1, 6), mat(0x3a342c));
  pole.position.y = 1.55;
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 0.82),
    new THREE.MeshLambertMaterial({ color: 0xffe066, side: THREE.DoubleSide, emissive: 0xffaa22, emissiveIntensity: 1.35 }),
  );
  cloth.position.set(0.68, 2.55, 0);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff3a0 }));
  ball.position.y = 3.12;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.position.y = 2.55;
  const light = new THREE.PointLight(0xffee88, 3.2, 18, 1.4);
  light.position.y = 2.6;
  g.add(pole, cloth, ball, glow, light);
  g.userData.cloth = cloth;
  g.userData.glow = glow;
  return g;
}

function placeFlag() {
  if (flag?.mesh) flag.mesh.removeFromParent();
  const ang = rng() * Math.PI * 2;
  const dist = 22 + rng() * 22;
  const x = player.x + Math.cos(ang) * dist;
  const z = player.z + Math.sin(ang) * dist;
  const mesh = makeFlagMesh();
  mesh.position.set(x, heightAt(x, z), z);
  scene.add(mesh);
  flag = { mesh, x, z };
}

function tickFlag(dt) {
  if (!flag) return;
  flag.mesh.position.y = heightAt(flag.x, flag.z);
  if (flag.mesh.userData.cloth) flag.mesh.userData.cloth.rotation.y = Math.sin(performance.now() * 0.003) * 0.25;
  if (flag.mesh.userData.glow) {
    const p = 0.85 + Math.sin(performance.now() * 0.006) * 0.35;
    flag.mesh.userData.glow.scale.setScalar(p);
  }
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

function paintOver3d() {
  if (!overCtx) return;
  const w = 1024, h = 512;
  overCtx.fillStyle = "#f7f4ee";
  overCtx.fillRect(0, 0, w, h);
  overCtx.fillStyle = "#d4af37";
  overCtx.font = "600 28px Outfit, sans-serif";
  overCtx.fillText("TAKEN BY THE HORDE", 48, 64);
  overCtx.fillStyle = "#111";
  overCtx.font = "700 96px Cinzel, serif";
  overCtx.fillText("DOWN", 48, 180);
  overCtx.font = "500 32px Outfit, sans-serif";
  overCtx.fillText("Wave " + wave + "  ·  " + (player.coins | 0) + " coins  ·  " + initials.join(""), 48, 250);
  overCtx.fillStyle = "#c42b2b";
  overCtx.font = "700 36px Outfit, sans-serif";
  overCtx.fillText("SHOOT THIS WINDOW TO RESTART", 48, 340);
  overCtx.fillStyle = "#6a655c";
  overCtx.font = "500 24px Outfit, sans-serif";
  overCtx.fillText("Point anywhere on this panel and pull the trigger.", 48, 400);
  overTex.needsUpdate = true;
}

function placeOver3d() {
  if (!overMesh || !overMesh.visible) return;
  camera.getWorldPosition(tmp);
  camera.getWorldDirection(tmp2);
  tmp2.y = 0;
  if (tmp2.lengthSq() < 1e-4) tmp2.set(0, 0, -1);
  tmp2.normalize();
  overMesh.position.copy(tmp).addScaledVector(tmp2, 1.7);
  overMesh.position.y = tmp.y + 0.05;
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
  shopOpen = false;
  $("shop").hidden = true;
  if (shopRoot) shopRoot.visible = false;
  const ini = initials.join("");
  const rows = loadLb();
  rows.push({ ini, wave, coins: player.coins | 0, t: Date.now() });
  rows.sort((a, b) => b.wave - a.wave || b.coins - a.coins);
  saveLb(rows);
  $("over-stats").textContent = "Wave " + wave + " · " + (player.coins | 0) + " coins · " + ini;
  paintLb();
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
  for (const b of balls) b.mesh.removeFromParent();
  for (const m of meteors) m.mesh.removeFromParent();
  if (tankMesh) tankMesh.removeFromParent();
  tankMesh = null;
  if (flag?.mesh) flag.mesh.removeFromParent();
  flag = null;
  mobs = []; debris = []; loot = []; shots = [];
  drones = []; balls = []; meteors = []; craters = [];
  grabMob = null;
  planetId = "";
  meteorT = 10;
  wave = 0;
  waveLeft = 0;
  pending = 0;
  ammoT = 3;
  healthT = 16;
  reloadT = 0;
  reloadMax = 0;
  owned = new Set(["pistol"]);
  stats = { speed: 1, jump: 1, maxHp: MAX_HP0, reload: 1, magnet: 2.4 };
  player = { x: 0, y: 1.6, z: 0, vx: 0, vy: 0, vz: 0, hp: MAX_HP0, grounded: true, coins: 0, ammo: 48, mag: 12, wep: "pistol", tank: false };
  tankYaw = 0;
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
  sfxUnlock();
  resetRun();
  $("start").hidden = true;
  $("over").hidden = true;
  running = true;
  spawnWave();
  placeFlag();
  if (!xrOn) controls.lock();
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

function fireFrom(origin, quat) {
  const def = wep();
  if (reloadT > 0) return;
  if (player.mag <= 0) {
    showBanner("RELOAD  Y");
    announcing = 0.8;
    return;
  }
  if (fireCd > 0) return;
  const dir0 = new THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize();
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
  sfx.shoot();
  const n = def.pellets || 1;
  const col = def.id === "nova" ? 0xff66aa : def.id === "thunder" ? 0x88aaff : def.id === "rail" || def.id === "plasma" ? 0x66f0ff : def.id === "ripple" ? 0xff66dd : def.id === "nuke" ? 0x66ff66 : 0x44ddff;
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
      rayKill(origin, dir, 56, def);
      const beam = makeBolt(col, def.id === "plasma" ? 0.07 : 0.045);
      beam.position.copy(origin).addScaledVector(dir, 8);
      beam.scale.set(def.id === "plasma" ? 2.1 : 1.4, def.id === "plasma" ? 2.1 : 1.4, 12);
      aimBolt(beam, dir);
      scene.add(beam);
      shots.push({ mesh: beam, life: 0.14, dummy: true });
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
      if (closest.distanceTo(w) < 0.28 + limb.userData.thick) hits.push({ t, m, limb });
    }
  }
  hits.sort((a, b) => a.t - b.t);
  const seen = new Set();
  let n = 0;
  for (const h of hits) {
    if (seen.has(h.m) && pierce <= 1) continue;
    if (seen.has(h.m)) continue;
    seen.add(h.m);
    const dmg = def.dmg || 1;
    for (let k = 0; k < dmg && h.limb.userData.live; k++) hitLimb(h.limb, h.m);
    n++;
    if (n >= pierce) break;
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
    if (!s.dummy && s.mesh.position) {
      s.mesh.position.addScaledVector(s.dir, s.speed * dt);
      if (s.dir && !s.ripple) aimBolt(s.mesh, s.dir);
      const hy = heightAt(s.mesh.position.x, s.mesh.position.z);
      if (s.mesh.position.y < hy - 0.15) {
        if (s.def?.aoe) aoeAt(s.mesh.position, s.def.aoe, s.def);
        s.life = 0;
      }
      let hit = false;
      for (const m of mobs) {
        if (!m.alive) continue;
        if (s.hitSet && s.hitSet.has(m)) continue;
        for (const limb of m.limbs) {
          if (!limb.userData.live) continue;
          const w = new THREE.Vector3();
          limb.getWorldPosition(w);
          if (w.distanceTo(s.mesh.position) < 0.32 + limb.userData.thick + (s.ripple ? 0.2 : 0)) {
            if (s.def?.aoe) aoeAt(s.mesh.position, s.def.aoe, s.def);
            else hitLimb(limb, m);
            if (s.hitSet) s.hitSet.add(m);
            hit = true;
            break;
          }
        }
        if (!hit) {
          const cw = new THREE.Vector3();
          m.core.getWorldPosition(cw);
          if (cw.distanceTo(s.mesh.position) < 0.36 + (s.ripple ? 0.2 : 0)) {
            if (s.def?.aoe) aoeAt(s.mesh.position, s.def.aoe, s.def);
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
        s.pierce = (s.pierce || 1) - 1;
        if (s.pierce <= 0 || s.def?.aoe) s.life = 0;
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
    if (Math.hypot(m.x - pos.x, m.z - pos.z) > r + 0.6) continue;
    const live = m.limbs.filter((l) => l.userData.live);
    for (let k = 0; k < (def.dmg || 2) && live.length; k++) {
      const l = live.pop();
      if (l) hitLimb(l, m);
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
  const dist = 12 + rng() * 70;
  const tx = player.x + Math.cos(ang) * dist;
  const tz = player.z + Math.sin(ang) * dist;
  const sx = tx + (rng() - 0.5) * 40;
  const sz = tz + (rng() - 0.5) * 40;
  const sy = 42 + rng() * 18;
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + rng() * 0.45, 0), mat(0x4a3a30, { emissive: 0x662200 }));
  mesh.position.set(sx, sy, sz);
  scene.add(mesh);
  const trail = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 1.6, 6),
    new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  mesh.add(trail);
  trail.position.y = 0.9;
  const dest = new THREE.Vector3(tx, heightAt(tx, tz), tz);
  const vel = dest.clone().sub(mesh.position).normalize().multiplyScalar(28 + rng() * 10);
  meteors.push({ mesh, vel, life: 4.5 });
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
    if (m.mesh.position.y <= hy + 0.4 || m.life <= 0) {
      const p = m.mesh.position.clone();
      p.y = hy;
      craterAt(p.x, p.z, 2.6 + rng() * 1.4, 1.6 + rng());
      aoeAt(p, 5.5, { dmg: 5 });
      dropLoot(p.x, p.y, p.z, 28 + ((rng() * 18) | 0));
      sfx.meteor();
      m.mesh.removeFromParent();
      meteors.splice(i, 1);
    }
  }
}

function craterAt(x, z, r, depth) {
  craters.push({ x, z, r, depth });
  if (craters.length > 28) craters.shift();
  applyTerrain(true);
}

function tickTank() {
  if (!player.tank) {
    if (tankMesh) { tankMesh.visible = false; }
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

function reload() {
  if (dead || !running) return;
  if (reloadT > 0) return;
  const cap = wep().mag;
  if (player.mag >= cap) return;
  if (player.ammo <= 0) {
    showBanner("NO AMMO");
    announcing = 0.9;
    return;
  }
  reloadMax = Math.max(0.35, (wep().reload || 10) / Math.max(0.35, stats.reload));
  reloadT = reloadMax;
  sfx.reload();
}

function finishReload() {
  const cap = wep().mag;
  const need = cap - player.mag;
  const take = Math.min(need, player.ammo);
  player.ammo -= take;
  player.mag += take;
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
  } else if (it.kind === "drone") {
    if (player.coins < it.cost) return false;
    if (!spawnDrone()) return false;
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
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "smg") {
    ctx.fillRect(-s * 0.34, -s * 0.08, s * 0.7, s * 0.16);
    ctx.fillRect(s * 0.1, -s * 0.22, s * 0.1, s * 0.14);
    ctx.fillRect(-s * 0.06, 0.04 * s, s * 0.1, s * 0.28);
  } else if (id === "shotgun") {
    ctx.fillRect(-s * 0.38, -s * 0.14, s * 0.72, s * 0.1);
    ctx.fillRect(-s * 0.38, 0.02 * s, s * 0.72, s * 0.1);
    ctx.fillRect(-s * 0.08, 0.08 * s, s * 0.12, s * 0.22);
  } else if (id === "rail") {
    ctx.fillRect(-s * 0.4, -s * 0.06, s * 0.8, s * 0.12);
    ctx.fillStyle = "#66e0ff";
    ctx.fillRect(-s * 0.1, -s * 0.12, s * 0.5, s * 0.08);
  } else if (id === "thunder" || id === "nova") {
    ctx.fillStyle = id === "nova" ? "#ff66aa" : "#88aaff";
    ctx.beginPath();
    ctx.arc(s * 0.12, 0, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(-s * 0.36, -s * 0.05, s * 0.4, s * 0.1);
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
  ctx.fillStyle = highlight ? "#111111" : "#f7f4ee";
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = highlight ? "#d4af37" : "#cfc8b8";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 154);
  drawShopIcon(ctx, it, 80, 80, 108);
  ctx.fillStyle = highlight ? "#f7f4ee" : "#111";
  ctx.font = "700 32px Outfit, sans-serif";
  ctx.fillText(it.name, 150, 58);
  ctx.font = "600 22px Outfit, sans-serif";
  ctx.fillStyle = highlight ? "#d4af37" : "#6a655c";
  const price = equipped ? "EQUIPPED" : have ? "OWNED — tap to equip" : it.cost + " ◎";
  ctx.fillText(price, 150, 92);
  ctx.font = "500 18px Outfit, sans-serif";
  ctx.fillText(it.blurb, 150, 122);
  return c;
}

function paintShop() {
  const host = $("shopgrid");
  if (!host) return;
  host.innerHTML = "";
  for (const it of SHOP) {
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
    const price = have ? "OWNED" : it.cost + "◎";
    wrap.innerHTML = `<b>${it.name}</b> · ${price}${equipped ? " · EQUIPPED" : ""}<small>${it.blurb}</small>`;
    b.appendChild(ico);
    b.appendChild(wrap);
    b.disabled = equipped || (!have && player.coins < it.cost);
    b.onclick = () => buy(it);
    host.appendChild(b);
  }
  $("shop-gold").textContent = String(player.coins | 0);
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
    new THREE.PlaneGeometry(1.72, 1.92),
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
  title.position.set(0, 0.8, 0.01);
  shopRoot.add(title);
  SHOP.forEach((it, i) => {
    const col = i % 3;
    const row = (i / 3) | 0;
    const c = paintShopCard(it, i, i === shopSel);
    const tex = new THREE.CanvasTexture(c);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    mesh.position.set((col - 1) * 0.52, 0.58 - row * 0.175, 0.02);
    mesh.userData.shopItem = it;
    mesh.userData.shopIndex = i;
    shopRoot.add(mesh);
    shopHits.push(mesh);
  });
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
  if (hitPanel(overMesh, origin, dir)) {
    $("over").hidden = true;
    if (overMesh) overMesh.visible = false;
    startRun();
    return true;
  }
  return false;
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
    if (overMesh) overMesh.visible = dead;
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
    reload: !!(left && left.bBtn && !left.bPrev),
    shop: !!(left && left.aBtn && !left.aPrev),
    right,
  };
}

function physics(dt, xr) {
  let wishX = 0, wishZ = 0;
  if (player.tank) {
    if (xrOn) {
      tankYaw -= (shopOpen ? 0 : xr.moveX) * 1.7 * dt;
      const fwd = shopOpen ? 0 : -xr.moveY;
      wishX = -Math.sin(tankYaw) * fwd;
      wishZ = -Math.cos(tankYaw) * fwd;
      if (Math.abs(xr.lookX) > 0.18) yaw -= xr.lookX * 2.05 * dt;
      rig.rotation.y = yaw;
      rig.position.set(player.x, player.y - 1.6, player.z);
    } else {
      if (keys.has("KeyA") || keys.has("ArrowLeft")) tankYaw += 1.8 * dt;
      if (keys.has("KeyD") || keys.has("ArrowRight")) tankYaw -= 1.8 * dt;
      let fwd = 0;
      if (keys.has("KeyW") || keys.has("ArrowUp")) fwd += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) fwd -= 1;
      wishX = -Math.sin(tankYaw) * fwd;
      wishZ = -Math.cos(tankYaw) * fwd;
      yaw = camera.rotation.y;
    }
  } else if (xrOn) {
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
    rig.position.set(player.x, player.y - 1.6, player.z);
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
  const spd = (player.tank ? 4.6 : 6.4) * stats.speed * (shopOpen ? 0.12 : 1);
  player.vx = wishX * spd;
  player.vz = wishZ * spd;
  if ((jumpQueued || xr.jump) && player.grounded && !player.tank) {
    player.vy = 7.2 * stats.jump;
    player.grounded = false;
    jumpQueued = false;
  }
  player.vy -= 22 * dt;
  player.x += player.vx * dt;
  player.z += player.vz * dt;
  player.y += player.vy * dt;
  const stand = heightAt(player.x, player.z) + 1.6;
  if (player.y <= stand) {
    player.y = stand;
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
  if (dead) {
    tryOverShot(xr);
    return;
  }
  if (shopOpen) {
    tryShopShot(xr);
    return;
  }
  const { origin, quat } = aimFromGun(xr);
  fireFrom(origin, quat);
}

function tickShopStick(dt, xr) {
  if (!shopOpen) return;
  shopStickLatch = Math.max(0, shopStickLatch - dt);
  if (xrOn) {
    if (xr.moveY > 0.55 && shopStickLatch <= 0) {
      shopSel = (shopSel + 1) % SHOP.length;
      shopStickLatch = 0.22;
      tintShopSel();
    } else if (xr.moveY < -0.55 && shopStickLatch <= 0) {
      shopSel = (shopSel + SHOP.length - 1) % SHOP.length;
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
  const xr = xrOn ? pollXr() : { moveX: 0, moveY: 0, lookX: 0, jump: false, fire: false, fireTap: false, reload: false, shop: false, right: null };
  if (!dead && xr.shop) toggleShop();
  if (!dead && xr.reload) reload();
  syncVrGun();
  syncWrist();
  syncReloadBar();
  tickShopStick(dt, xr);
  placeShop3d();
  if (dead) {
    placeOver3d();
    if (xrOn && xr.fireTap) doFire(xr);
  } else if (running) {
    physics(dt, xr);
    if (shopOpen) {
      if (xrOn && xr.fireTap) doFire(xr);
    } else {
      const firing = xr.fire || (!xrOn && (keys.has("Mouse1") || mouseDown));
      if (firing) doFire(xr);
      if (player.wep === "gravity") {
        const aim = aimFromGun(xr);
        tickGrab(dt, firing, aim.origin, aim.dir);
      } else grabMob = null;
      tickMobs(dt);
      tickShots(dt);
      tickDrones(dt);
      tickBalls(dt);
      tickMeteors(dt);
      tickTank();
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
  scene.fog = new THREE.Fog(0xe8e6e0, 28, 110);
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 280);
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
  oc.width = 1024; oc.height = 512;
  overCtx = oc.getContext("2d");
  overTex = new THREE.CanvasTexture(oc);
  overMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.78),
    new THREE.MeshBasicMaterial({ map: overTex, side: THREE.DoubleSide }),
  );
  overMesh.visible = false;
  scene.add(overMesh);

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
  if (e.code === "KeyR" || e.code === "KeyY") reload();
  if (e.code === "KeyX" || e.code === "Tab") { e.preventDefault(); toggleShop(); }
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
$("over").addEventListener("click", (e) => {
  if (!dead) return;
  if (e.target.closest("#to-menu")) return;
  $("over").hidden = true;
  startRun();
});
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
