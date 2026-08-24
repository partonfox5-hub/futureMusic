import * as THREE from "three";
import { XRButton } from "three/addons/webxr/XRButton.js";

const canvas = document.getElementById("c");
const hudHint = document.getElementById("hint");
const hudStatus = document.getElementById("status");
const startEl = document.getElementById("start");
const announceEl = document.getElementById("announce");

const BIRTH = 30;
const ATMOS = 1.22;
const COST = { scout: 100, settler: 250, miner: 80, tank: 150, heli: 180, warship: 600, cannon: 500 };
const HP = { scout: 40, settler: 55, miner: 35, tank: 70, heli: 50, warship: 200, cannon: 120, dome: 200, tower: 140, flag: 80 };
const SEA = 0.52;
const MAP = 22;
const START_MAT = 500;
const AI_NAMES = ["Vesper", "Kite", "Nadir", "Helion", "Rook"];
const PALETTE = [0x3ecf8e, 0xe85d4c, 0x4aa3ff, 0xf0c14a, 0xc86bff, 0xff8a3c];

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _n = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _ray = new THREE.Raycaster();

const PLANET_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec2 vUv;
uniform float uDisp; uniform float uSeed; uniform sampler2D uPaint; uniform float uLand;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))+uSeed)*43758.5453); }
float noise(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  float n000=hash(i), n100=hash(i+vec3(1,0,0)), n010=hash(i+vec3(0,1,0)), n110=hash(i+vec3(1,1,0));
  float n001=hash(i+vec3(0,0,1)), n101=hash(i+vec3(1,0,1)), n011=hash(i+vec3(0,1,1)), n111=hash(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y), mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z);
}
float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }
void main(){
  vUv = uv;
  vec3 nrm = normalize(position);
  float h = fbm(nrm*3.4);
  float paint = texture2D(uPaint, uv).r * 2.0 - 1.0;
  float disp = (h*2.0-1.0)*uDisp*uLand + paint*0.12*uLand;
  vec3 pos = nrm * (1.0 + disp);
  vN = normalMatrix * nrm;
  vP = pos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
}
`;
const PLANET_FRAG = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec2 vUv;
uniform float uMolten; uniform vec3 uVeg; uniform vec3 uOcean;
uniform float uLand; uniform float uStorm; uniform float uSeed;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))+uSeed)*43758.5453); }
float noise(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z);
}
float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }
void main(){
  vec3 n = normalize(vN);
  float h = fbm(normalize(vP)*3.4);
  float sea = 0.52;
  float landMask = smoothstep(sea, sea+0.07, h) * uLand;
  vec3 lava = mix(vec3(0.12,0.02,0.0), vec3(1.0,0.38,0.08), pow(h,1.4));
  lava += vec3(1.0,0.7,0.2)*pow(max(0.0, noise(normalize(vP)*18.0)-0.62),2.0)*2.2;
  vec3 rock = mix(vec3(0.18,0.16,0.15), vec3(0.38,0.32,0.28), h);
  vec3 dirt = mix(vec3(0.22,0.18,0.12), uVeg, smoothstep(0.55,0.78,h));
  vec3 ocean = mix(uOcean*0.45, uOcean, h);
  vec3 cool = mix(rock, mix(ocean, dirt, landMask), uLand);
  vec3 col = mix(lava, cool, 1.0-uMolten);
  float ndl = max(0.12, dot(n, normalize(vec3(0.4,0.7,0.3))));
  col *= ndl * (1.0 + uStorm*0.15);
  gl_FragColor = vec4(col, 1.0);
}
`;
const CLOUD_VERT = `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const CLOUD_FRAG = `
varying vec3 vP; uniform float uTime; uniform float uAlpha; uniform float uSeed; uniform float uStorm;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))+uSeed)*43758.5453); }
float noise(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z);
}
void main(){
  vec3 p = normalize(vP)*3.2 + vec3(uTime*0.07, 0.0, uTime*0.04);
  float n = noise(p)*0.6 + noise(p*2.2)*0.4;
  float a = smoothstep(0.42, 0.72, n) * uAlpha * (0.55 + uStorm*0.35);
  if(a<0.04) discard;
  gl_FragColor = vec4(vec3(0.92,0.95,1.0)*(1.0-uStorm*0.25), a);
}
`;

function hsl(h, s, l) {
  return new THREE.Color().setHSL((((h % 360) + 360) % 360) / 360, s, l);
}
function wrapPi(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
function mat(hex, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: hex, ...opts });
}

const audio = { ctx: null, master: null, t: 0 };
function ensureAudio() {
  if (audio.ctx) {
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    return;
  }
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);
  audio.ctx = ctx;
  audio.master = master;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 72;
  g.gain.value = 0.07;
  osc.connect(g);
  g.connect(master);
  osc.start();
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = "triangle";
  osc2.frequency.value = 108;
  g2.gain.value = 0.04;
  osc2.connect(g2);
  g2.connect(master);
  osc2.start();
  audio.drone = { osc, osc2, g, g2 };
}
function sfx(freq, dur, type = "square", vol = 0.08) {
  if (!audio.ctx) return;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audio.ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.4), audio.ctx.currentTime + dur);
  g.gain.setValueAtTime(vol, audio.ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + dur);
  o.connect(g);
  g.connect(audio.master);
  o.start();
  o.stop(audio.ctx.currentTime + dur + 0.02);
}
function tickMusic(t) {
  if (!audio.drone) return;
  audio.drone.osc.frequency.setTargetAtTime(68 + Math.sin(t * 0.07) * 8, audio.ctx.currentTime, 0.2);
  audio.drone.osc2.frequency.setTargetAtTime(102 + Math.sin(t * 0.11 + 1) * 14, audio.ctx.currentTime, 0.2);
}

function makePaint() {
  const s = 64;
  const data = new Uint8Array(s * s * 4);
  for (let i = 0; i < s * s; i++) {
    data[i * 4] = 128;
    data[i * 4 + 1] = 128;
    data[i * 4 + 2] = 128;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, s, s, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return { tex, data, s };
}
function paintAt(paint, uv, amount) {
  const x = ((Math.floor(uv.x * paint.s) % paint.s) + paint.s) % paint.s;
  const y = ((Math.floor(uv.y * paint.s) % paint.s) + paint.s) % paint.s;
  for (let j = -3; j <= 3; j++) {
    for (let i = -3; i <= 3; i++) {
      const xx = (x + i + paint.s) % paint.s;
      const yy = (y + j + paint.s) % paint.s;
      const k = (yy * paint.s + xx) * 4;
      const v = THREE.MathUtils.clamp(paint.data[k] + amount, 0, 255);
      paint.data[k] = v;
      paint.data[k + 1] = v;
      paint.data[k + 2] = v;
    }
  }
  paint.tex.needsUpdate = true;
}

function makeSpiritHand() {
  const g = new THREE.Group();
  const m = mat(0x9ee7ff, { transparent: true, opacity: 0.32, depthWrite: false });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), m);
  palm.scale.set(1.1, 0.55, 1.3);
  g.add(palm);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.055, 3, 5), m);
    f.position.set((i - 2) * 0.022, 0.02, -0.055);
    f.rotation.x = -0.35;
    g.add(f);
  }
  return g;
}
function makeSky() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(520, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uT: { value: 0 } },
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform float uT;
        float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
        void main(){
          vec3 n=normalize(vP);
          float stars = step(0.996, hash(floor(n*280.0)));
          float neb = pow(max(0.0, sin(n.x*2.2+n.y+uT*0.02)*0.5+0.5), 3.0);
          vec3 col = vec3(0.02,0.03,0.06) + vec3(0.25,0.12,0.35)*neb*0.35;
          col += vec3(0.85,0.92,1.0)*stars;
          gl_FragColor = vec4(col,1.0);
        }`,
    }),
  );
}

function engineGlow(hex) {
  const m = mat(hex);
  m.userData.pulse = true;
  m.userData.base = hex;
  return m;
}
function box(parent, m, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function modelScout(col) {
  const g = new THREE.Group();
  const hull = mat(col);
  const dark = mat(0x1a1e24);
  const glow = engineGlow(0x66f0ff);
  box(g, hull, 0, 0, 0.04, 0.08, 0.05, 0.28);
  box(g, dark, 0, 0.01, 0.14, 0.06, 0.03, 0.08);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), hull);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.22;
  g.add(nose);
  box(g, hull, 0.09, 0, -0.02, 0.16, 0.012, 0.05);
  box(g, hull, -0.09, 0, -0.02, 0.16, 0.012, 0.05);
  const e1 = box(g, glow, 0.04, 0, -0.16, 0.03, 0.03, 0.06);
  const e2 = box(g, glow, -0.04, 0, -0.16, 0.03, 0.03, 0.06);
  g.userData.lights = [glow];
  g.userData.engines = [e1, e2];
  return g;
}
function modelSettler(col) {
  const g = new THREE.Group();
  const hull = mat(col);
  const metal = mat(0x8a9098);
  const glow = engineGlow(0xffc070);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), hull);
  body.scale.set(1, 0.7, 1.35);
  g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 6, 14), metal);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  for (const x of [-0.08, 0.08]) {
    const leg = box(g, metal, x, -0.1, 0.04, 0.02, 0.1, 0.02);
    void leg;
  }
  box(g, glow, 0, 0.02, -0.16, 0.08, 0.05, 0.07);
  g.userData.lights = [glow];
  return g;
}
function modelWarship(col) {
  const g = new THREE.Group();
  const hull = mat(col);
  const dark = mat(0x10141a);
  const glow = engineGlow(0xff5533);
  box(g, hull, 0, 0, 0, 0.28, 0.1, 0.72);
  box(g, dark, 0, 0.07, 0.12, 0.16, 0.06, 0.28);
  const prow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 4), hull);
  prow.rotation.x = Math.PI / 2;
  prow.position.z = 0.48;
  g.add(prow);
  box(g, hull, 0.22, 0, -0.05, 0.28, 0.02, 0.16);
  box(g, hull, -0.22, 0, -0.05, 0.28, 0.02, 0.16);
  box(g, glow, 0.08, 0, -0.4, 0.07, 0.07, 0.12);
  box(g, glow, -0.08, 0, -0.4, 0.07, 0.07, 0.12);
  box(g, glow, 0, 0.04, -0.42, 0.07, 0.07, 0.12);
  g.scale.setScalar(2.7);
  g.userData.lights = [glow];
  return g;
}
function modelMiner(col) {
  const g = new THREE.Group();
  const hull = mat(col);
  const bed = mat(0x5a4030);
  box(g, hull, 0, 0.05, 0.04, 0.12, 0.08, 0.14);
  box(g, bed, 0, 0.07, -0.08, 0.11, 0.06, 0.14);
  box(g, mat(0x222), 0.05, 0.02, 0.04, 0.04, 0.04, 0.16);
  box(g, mat(0x222), -0.05, 0.02, 0.04, 0.04, 0.04, 0.16);
  g.userData.lights = [];
  return g;
}
function modelTank(col) {
  const g = new THREE.Group();
  const hull = mat(col);
  box(g, hull, 0, 0.04, 0, 0.16, 0.06, 0.22);
  const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.05, 8), hull);
  tur.position.y = 0.09;
  g.add(tur);
  const gun = box(g, mat(0x333), 0, 0.1, 0.12, 0.02, 0.02, 0.16);
  g.userData.turret = tur;
  g.userData.gun = gun;
  g.userData.lights = [];
  return g;
}
function modelHeli(col) {
  const g = new THREE.Group();
  const hull = mat(col);
  box(g, hull, 0, 0.06, 0, 0.1, 0.07, 0.2);
  const rot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.008, 0.04), mat(0xccc));
  rot.position.y = 0.13;
  g.add(rot);
  box(g, hull, 0, 0.08, -0.14, 0.02, 0.02, 0.1);
  g.userData.rotor = rot;
  g.userData.lights = [engineGlow(0x88ffaa)];
  box(g, g.userData.lights[0], 0, 0.03, -0.12, 0.03, 0.02, 0.03);
  return g;
}
function modelCannon(col) {
  const g = new THREE.Group();
  const metal = mat(0x6a7078);
  const hull = mat(col);
  box(g, metal, 0, 0.04, 0, 0.14, 0.08, 0.14);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), hull);
  dish.position.y = 0.12;
  dish.rotation.x = Math.PI;
  g.add(dish);
  const glow = engineGlow(0x66ddff);
  box(g, glow, 0, 0.14, 0.02, 0.04, 0.08, 0.04);
  g.userData.lights = [glow];
  return g;
}
function modelDome(col) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9aa3ad));
  g.add(dome);
  box(g, mat(col), 0, 0.01, 0, 0.12, 0.02, 0.12);
  return g;
}
function modelTower(col) {
  const g = new THREE.Group();
  box(g, mat(0x7a828c), 0, 0.22, 0, 0.1, 0.44, 0.1);
  const win = engineGlow(0xffe08a);
  box(g, win, 0, 0.28, 0.052, 0.06, 0.22, 0.01);
  box(g, mat(col), 0, 0.46, 0, 0.12, 0.04, 0.12);
  g.userData.lights = [win];
  return g;
}
function modelFlag(col) {
  const g = new THREE.Group();
  box(g, mat(0xccc8b8), 0, 0.16, 0, 0.012, 0.32, 0.012);
  const cloth = box(g, mat(col), 0.06, 0.26, 0, 0.1, 0.07, 0.01);
  g.userData.cloth = cloth;
  return g;
}

function makeBar() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 10;
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  spr.scale.set(0.28, 0.045, 1);
  spr.userData.canvas = c;
  spr.userData.tex = tex;
  return spr;
}
function paintBar(spr, hp, max) {
  const g = spr.userData.canvas.getContext("2d");
  g.clearRect(0, 0, 64, 10);
  g.fillStyle = "rgba(0,0,0,0.65)";
  g.fillRect(0, 0, 64, 10);
  const t = Math.max(0, hp) / max;
  g.fillStyle = t > 0.45 ? "#6aaa3a" : t > 0.2 ? "#c4a050" : "#c4453a";
  g.fillRect(2, 2, Math.round(60 * t), 6);
  spr.userData.tex.needsUpdate = true;
}

function cardTex(title, cost, body) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const g = c.getContext("2d");
  g.fillStyle = "#141820";
  g.fillRect(0, 0, 256, 160);
  g.strokeStyle = "#c9b48a";
  g.strokeRect(6, 6, 244, 148);
  g.fillStyle = "#e6c56e";
  g.font = "bold 28px serif";
  g.fillText(title, 18, 44);
  g.fillStyle = "#9ee7ff";
  g.font = "22px sans-serif";
  g.fillText(cost + " mat", 18, 78);
  g.fillStyle = "#c8c4b8";
  g.font = "16px sans-serif";
  g.fillText(body, 18, 112);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function fract(x) {
  return x - Math.floor(x);
}
function hash3(x, y, z, seed) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed) * 43758.5453);
}
function noise3(px, py, pz, seed) {
  const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
  const fx = px - ix, fy = py - iy, fz = pz - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const n = (i, j, k) => hash3(ix + i, iy + j, iz + k, seed);
  const x00 = n(0, 0, 0) + (n(1, 0, 0) - n(0, 0, 0)) * ux;
  const x10 = n(0, 1, 0) + (n(1, 1, 0) - n(0, 1, 0)) * ux;
  const x01 = n(0, 0, 1) + (n(1, 0, 1) - n(0, 0, 1)) * ux;
  const x11 = n(0, 1, 1) + (n(1, 1, 1) - n(0, 1, 1)) * ux;
  const y0 = x00 + (x10 - x00) * uy;
  const y1 = x01 + (x11 - x01) * uy;
  return y0 + (y1 - y0) * uz;
}
function fbm3(x, y, z, seed) {
  let a = 0.5, s = 0, px = x, py = y, pz = z;
  for (let i = 0; i < 5; i++) {
    s += a * noise3(px, py, pz, seed);
    px *= 2.03;
    py *= 2.03;
    pz *= 2.03;
    a *= 0.5;
  }
  return s;
}

function sit(mesh, planet, n, alt) {
  const local = n.clone().multiplyScalar(planet.radius * alt);
  if (mesh.parent === planet.group) mesh.position.copy(local);
  else mesh.position.copy(planet.group.position).add(local);
  mesh.quaternion.setFromUnitVectors(_up, n);
}

class World {
  constructor(pos, radius, seed) {
    this.radius = radius;
    this.age = 0;
    this.born = true;
    this.seed = seed;
    this.vegH = 90 + Math.random() * 80;
    this.seaH = 190 + Math.random() * 40;
    this.storm = 0.12;
    this.paint = makePaint();
    this.mines = [];
    this.colonies = [];
    this.trees = [];
    this.critters = [];
    this.treeT = 1.2;
    this.lifeT = 2.4;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const uniforms = {
      uMolten: { value: 1 },
      uLand: { value: 0 },
      uDisp: { value: 0.09 },
      uSeed: { value: seed },
      uStorm: { value: 0.12 },
      uVeg: { value: hsl(this.vegH, 0.45, 0.32) },
      uOcean: { value: hsl(this.seaH, 0.55, 0.32) },
      uPaint: { value: this.paint.tex },
    };
    this.uni = uniforms;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.ShaderMaterial({ uniforms, vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG }));
    this.mesh.scale.setScalar(radius);
    this.mesh.userData.world = this;
    this.group.add(this.mesh);
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 24, 16),
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uSeed: { value: seed + 3 }, uStorm: { value: 0.12 } },
        vertexShader: CLOUD_VERT,
        fragmentShader: CLOUD_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.clouds.scale.setScalar(radius);
    this.group.add(this.clouds);
    this.atmos = new THREE.Mesh(
      new THREE.SphereGeometry(ATMOS, 32, 20),
      new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false }),
    );
    this.atmos.scale.setScalar(radius);
    this.atmos.userData.world = this;
    this.atmos.userData.kind = "atmos";
    this.group.add(this.atmos);
    this.atmosInner = new THREE.Mesh(
      new THREE.SphereGeometry(ATMOS * 0.985, 28, 18),
      new THREE.MeshBasicMaterial({ color: 0xb8e8ff, transparent: true, opacity: 0.07, side: THREE.FrontSide, depthWrite: false }),
    );
    this.atmosInner.scale.setScalar(radius);
    this.group.add(this.atmosInner);
    this.atmosRing = new THREE.Mesh(
      new THREE.TorusGeometry(ATMOS, 0.012, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0.55 }),
    );
    this.atmosRing.scale.setScalar(radius);
    this.atmosRing.rotation.x = Math.PI / 2;
    this.group.add(this.atmosRing);
    this.atmosRing2 = this.atmosRing.clone();
    this.atmosRing2.rotation.x = 0.35;
    this.atmosRing2.rotation.y = 0.4;
    this.atmosRing2.material = this.atmosRing.material.clone();
    this.atmosRing2.material.opacity = 0.28;
    this.group.add(this.atmosRing2);
    this.rain = new THREE.Points(
      (() => {
        const geo = new THREE.BufferGeometry();
        const n = 80;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const u = Math.random() * 6.28;
          const v = Math.acos(2 * Math.random() - 1);
          arr[i * 3] = Math.sin(v) * Math.cos(u);
          arr[i * 3 + 1] = Math.cos(v);
          arr[i * 3 + 2] = Math.sin(v) * Math.sin(u);
        }
        geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        return geo;
      })(),
      new THREE.PointsMaterial({ color: 0x9ec8ff, size: 0.02, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true }),
    );
    this.rain.scale.setScalar(radius * 1.08);
    this.group.add(this.rain);
  }
  atmosR() {
    return this.radius * ATMOS;
  }
  mature() {
    return this.age >= BIRTH;
  }
  stage(dt) {
    this.age = Math.min(BIRTH, this.age + dt);
    const t = this.age / BIRTH;
    const molten = t < 0.22 ? 1 - t / 0.22 : 0;
    let land = 0;
    let clouds = 0;
    let rain = 0;
    if (t > 0.32) clouds = THREE.MathUtils.clamp((t - 0.32) / 0.22, 0, 1);
    if (t > 0.42 && t < 0.92) rain = THREE.MathUtils.clamp((t - 0.42) / 0.18, 0, 0.85) * (t < 0.78 ? 1 : 1 - (t - 0.78) / 0.14);
    if (t > 0.55) land = THREE.MathUtils.clamp((t - 0.55) / 0.28, 0, 1);
    this.uni.uMolten.value = molten;
    this.uni.uLand.value = land;
    this.uni.uStorm.value = this.storm;
    this.uni.uVeg.value.copy(hsl(this.vegH, 0.48, 0.32));
    this.uni.uOcean.value.copy(hsl(this.seaH, 0.58, 0.3));
    this.clouds.material.uniforms.uAlpha.value = clouds * 0.85;
    this.clouds.material.uniforms.uTime.value += dt;
    this.clouds.rotation.y += dt * 0.08;
    this.rain.material.opacity = rain * 0.4;
    this.rain.visible = rain > 0.02;
    this.atmos.material.opacity = 0.12 + land * 0.1;
    this.atmosInner.material.opacity = 0.05 + land * 0.06;
    this.atmosRing.material.opacity = 0.4 + Math.sin(this.age * 2) * 0.12;
    if (t >= 0.7 && !this.seededMines) this.seedMines();
    if (land > 0.4) this.growLife(dt);
  }
  heightOf(n) {
    const s = n.clone().multiplyScalar(3.4);
    return fbm3(s.x, s.y, s.z, this.seed);
  }
  isLand(n) {
    return this.uni.uLand.value > 0.35 && this.heightOf(n) > SEA;
  }
  isOcean(n) {
    return this.uni.uLand.value > 0.2 && this.heightOf(n) <= SEA;
  }
  randLandNormal() {
    for (let i = 0; i < 24; i++) {
      const n = new THREE.Vector3().randomDirection();
      if (this.isLand(n)) return n;
    }
    return new THREE.Vector3().randomDirection();
  }
  randOceanNormal() {
    for (let i = 0; i < 24; i++) {
      const n = new THREE.Vector3().randomDirection();
      if (this.isOcean(n)) return n;
    }
    return new THREE.Vector3().randomDirection();
  }
  seedMines() {
    this.seededMines = true;
    const n = 2 + ((this.seed * 3) % 3 | 0);
    for (let i = 0; i < n; i++) {
      const nor = this.randLandNormal();
      const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), mat(0xc4a050));
      this.group.add(marker);
      sit(marker, this, nor, 1.03);
      marker.userData.mine = true;
      marker.userData.normal = nor;
      marker.userData.world = this;
      marker.userData.stock = 999;
      this.mines.push({ mesh: marker, normal: nor, busy: null });
    }
  }
  landNormal(from) {
    return from.clone().sub(this.group.position).normalize();
  }
  growLife(dt) {
    this.treeT -= dt;
    if (this.treeT <= 0 && this.trees.length < Math.floor(18 + this.radius * 22)) {
      this.treeT = 0.45 + Math.random() * 0.8;
      this.plantTree(this.randLandNormal());
    }
    this.lifeT -= dt;
    if (this.lifeT <= 0 && this.critters.length < Math.floor(8 + this.radius * 10)) {
      this.lifeT = 1.1 + Math.random();
      const roll = Math.random();
      const kind = roll < 0.28 ? "deer" : roll < 0.46 ? "monkey" : roll < 0.72 ? "fish" : "whale";
      this.spawnCritter(kind);
    }
    for (const c of this.critters) {
      if (!c.mesh.parent) continue;
      const spd = c.spd * dt;
      const axis = c.n.clone().cross(_v.set(0, 1, 0.2).normalize());
      if (axis.lengthSq() < 0.0001) axis.set(1, 0, 0);
      axis.normalize();
      c.n.applyAxisAngle(axis, spd * (c.ocean ? 0.55 : 1));
      c.n.normalize();
      const wantOcean = c.ocean;
      const ok = wantOcean ? this.isOcean(c.n) : this.isLand(c.n);
      if (!ok) {
        c.n.applyAxisAngle(axis, -spd * 2.4);
        c.n.normalize();
        if ((wantOcean && !this.isOcean(c.n)) || (!wantOcean && !this.isLand(c.n))) {
          c.n.copy(wantOcean ? this.randOceanNormal() : this.randLandNormal());
        }
      }
      sit(c.mesh, this, c.n, c.alt);
    }
  }
  plantTree(n) {
    const g = new THREE.Group();
    const h = 0.045 + Math.random() * 0.04;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, h, 5), mat(0x5a3a22));
    trunk.position.y = h * 0.5;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.028 + Math.random() * 0.02, h * 1.4, 6), mat(0x2f7a3a));
    leaf.position.y = h * 1.15;
    g.add(trunk, leaf);
    this.group.add(g);
    sit(g, this, n, 1.0);
    this.trees.push(g);
  }
  spawnCritter(kind) {
    const ocean = kind === "fish" || kind === "whale";
    const n = ocean ? this.randOceanNormal() : this.randLandNormal();
    const g = new THREE.Group();
    if (kind === "deer") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.014, 0.032), mat(0x8a5a32));
      body.position.y = 0.02;
      g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.012), mat(0x6a4428));
      head.position.set(0, 0.03, 0.018);
      g.add(head);
    } else if (kind === "monkey") {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), mat(0x6a4a28));
      body.position.y = 0.018;
      g.add(body);
    } else if (kind === "fish") {
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.024, 5), mat(0x3aa0c8));
      body.rotation.x = Math.PI / 2;
      g.add(body);
    } else {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(0x4a5a68));
      body.scale.set(1.6, 0.7, 0.9);
      g.add(body);
    }
    this.group.add(g);
    const alt = ocean ? (kind === "whale" ? 1.015 : 1.008) : 1.0;
    sit(g, this, n, alt);
    this.critters.push({
      mesh: g,
      kind,
      n,
      ocean,
      alt,
      spd: kind === "whale" ? 0.08 : kind === "fish" ? 0.22 : kind === "monkey" ? 0.18 : 0.12,
    });
  }
}

const teams = [];
const worlds = [];
const units = [];
const shots = [];
const asteroids = [];
let playerTeam = null;
let selectedUnits = [];
let strategyOpen = false;
let cityMenu = null;
let lookYaw = 0;
let lookPitch = 0;
const keys = new Set();
const mouse = { x: 0, y: 0, down: false, right: false, locked: false };
let last = 0;
let announceT = 0;
let playerColor = PALETTE[0];
let aiChoice = "rand";
let running = false;

function teamById(id) {
  return teams.find((t) => t.id === id);
}
function playerCap(team) {
  let c = 0;
  for (const w of worlds) {
    for (const col of w.colonies) {
      if (col.team !== team.id) continue;
      if (col.flagDead || !col.flag) continue;
      c += col.domes * 1 + col.towers * 2;
    }
  }
  return Math.max(0, c);
}
function teamUnitCount(team) {
  return units.filter((u) => u.team === team.id && u.hp > 0).length;
}
function canAfford(team, kind) {
  return team.mat >= COST[kind] && (kind === "cannon" || teamUnitCount(team) < Math.max(3, playerCap(team) || 3));
}

function makeTeam(id, name, color, ai) {
  const t = { id, name, color, ai, mat: START_MAT, think: 0.4 + Math.random() };
  teams.push(t);
  return t;
}

function addHp(obj, hp) {
  const bar = makeBar();
  obj.add(bar);
  bar.position.y = 0.22;
  obj.userData.bar = bar;
  paintBar(bar, hp, hp);
  return bar;
}

function spawnUnit(kind, team, pos, planet, normal) {
  if (COST[kind] && team.mat < COST[kind]) return null;
  const cap = playerCap(team);
  const spaceStart = kind === "scout" || kind === "settler" || kind === "warship";
  if (!spaceStart && cap && teamUnitCount(team) >= cap) return null;
  if (kind === "warship" && cap && teamUnitCount(team) >= cap) return null;

  const makers = { scout: modelScout, settler: modelSettler, warship: modelWarship, miner: modelMiner, tank: modelTank, heli: modelHeli, cannon: modelCannon };
  const mesh = makers[kind](team.color);
  mesh.position.copy(pos);
  const u = {
    kind,
    team: team.id,
    mesh,
    hp: HP[kind],
    maxHp: HP[kind],
    planet: planet || null,
    normal: normal ? normal.clone() : null,
    cmd: null,
    cool: 0,
    cargo: 0,
    mine: null,
    state: "idle",
    vel: new THREE.Vector3(),
    selected: false,
  };
  mesh.userData.unit = u;
  addHp(mesh, u.hp);
  scene.add(mesh);
  units.push(u);
  if (COST[kind]) team.mat -= COST[kind];
  sfx(kind === "warship" ? 140 : 320, 0.12, "sawtooth", 0.06);
  return u;
}

function foundColony(team, planet, normal) {
  if (!planet.mature()) return null;
  if (planet.colonies.some((c) => c.team === team.id && c.flag && !c.flagDead)) return null;
  const col = {
    team: team.id,
    planet,
    normal: normal.clone(),
    domes: 0,
    towers: 0,
    growT: 60,
    trickle: 0,
    city: false,
    buildings: [],
    flag: null,
    flagDead: false,
  };
  const range = 0.55;
  const leftover = [];
  for (const old of planet.colonies) {
    if (old.flag && !old.flagDead) continue;
    for (const b of old.buildings) {
      const n = planet.landNormal(b.getWorldPosition(_v));
      if (n.dot(normal) > 1 - range) leftover.push(b);
    }
  }
  if (leftover.length) {
    for (const b of leftover) {
      b.userData.bldg.col = col;
      col.buildings.push(b);
      if (b.userData.bldg.kind === "dome") col.domes++;
      if (b.userData.bldg.kind === "tower") col.towers++;
    }
    for (const old of planet.colonies) {
      old.buildings = old.buildings.filter((b) => !leftover.includes(b));
    }
    col.city = col.towers > 0 || col.domes >= 8;
  }
  if (!col.buildings.some((b) => b.userData.bldg?.kind === "dome")) {
    const dome = modelDome(team.color);
    planet.group.add(dome);
    sit(dome, planet, normal, 1.02);
    dome.userData.bldg = { kind: "dome", hp: HP.dome, max: HP.dome, col, planet };
    addHp(dome, HP.dome);
    col.buildings.push(dome);
    col.domes++;
  }
  const flag = modelFlag(team.color);
  planet.group.add(flag);
  sit(flag, planet, normal, 1.08);
  flag.userData.flag = true;
  flag.userData.colony = col;
  flag.userData.bldg = { kind: "flag", hp: HP.flag, max: HP.flag, col, planet };
  addHp(flag, HP.flag);
  col.flag = flag;
  planet.colonies.push(col);
  sfx(220, 0.2, "triangle", 0.08);
  flashAnnounce(team.name + " planted a colony");
  return col;
}

function placeNear(col) {
  const n = col.normal.clone();
  n.x += (Math.random() - 0.5) * 0.35;
  n.y += (Math.random() - 0.5) * 0.35;
  n.z += (Math.random() - 0.5) * 0.35;
  return n.normalize();
}

function growColony(col) {
  if (col.flagDead || !col.flag) return;
  const planet = col.planet;
  if (col.domes + col.towers < 22) {
    const n = placeNear(col);
    const dome = modelDome(teamById(col.team).color);
    planet.group.add(dome);
    sit(dome, planet, n, 1.02);
    dome.userData.bldg = { kind: "dome", hp: HP.dome, max: HP.dome, col, planet };
    addHp(dome, HP.dome);
    col.buildings.push(dome);
    col.domes++;
  }
  if (col.domes >= 10) {
    const d = col.buildings.find((b) => b.userData.bldg?.kind === "dome");
    if (d) {
      const n = planet.landNormal(d.getWorldPosition(_v));
      planet.group.remove(d);
      col.buildings = col.buildings.filter((b) => b !== d);
      col.domes--;
      const tw = modelTower(teamById(col.team).color);
      planet.group.add(tw);
      sit(tw, planet, n, 1.02);
      tw.userData.bldg = { kind: "tower", hp: HP.tower, max: HP.tower, col, planet };
      addHp(tw, HP.tower);
      col.buildings.push(tw);
      col.towers++;
      if (!col.city) {
        col.city = true;
        flashAnnounce(teamById(col.team).name + " founded a city");
        sfx(180, 0.4, "sine", 0.1);
      }
    }
  }
}

function flashAnnounce(text) {
  announceEl.hidden = false;
  announceEl.textContent = text;
  announceT = 3.4;
}

function damage(target, amt) {
  if (target.hp != null) {
    target.hp -= amt;
    if (target.mesh?.userData.bar) paintBar(target.mesh.userData.bar, target.hp, target.maxHp);
    if (target.hp <= 0) killUnit(target);
    return;
  }
  const b = target.userData?.bldg;
  if (b) {
    b.hp -= amt;
    if (target.userData.bar) paintBar(target.userData.bar, b.hp, b.max);
    if (b.hp <= 0) destroyBldg(target);
  }
}
function killUnit(u) {
  if (u.dead) return;
  u.dead = true;
  u.hp = 0;
  scene.remove(u.mesh);
  sfx(90, 0.18, "sawtooth", 0.07);
}
function destroyBldg(mesh) {
  const b = mesh.userData.bldg;
  if (!b) return;
  const col = b.col;
  if (b.kind === "flag") {
    col.flagDead = true;
    col.flag = null;
    if (cityMenu === col) {
      cityMenu = null;
      cityGroup.visible = false;
    }
    mesh.parent?.remove(mesh);
    flashAnnounce("Colony flag lost — production halted");
    sfx(55, 0.35, "sawtooth", 0.09);
    return;
  }
  col.buildings = col.buildings.filter((x) => x !== mesh);
  if (b.kind === "dome") col.domes = Math.max(0, col.domes - 1);
  if (b.kind === "tower") col.towers = Math.max(0, col.towers - 1);
  mesh.parent?.remove(mesh);
  sfx(70, 0.25, "square", 0.07);
}

function fireShot(from, to, dmg, color, space) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(space ? 0.035 : 0.02, 6, 5), mat(color));
  m.position.copy(from);
  const dir = to.clone().sub(from);
  const dist = dir.length() || 1;
  dir.multiplyScalar(1 / dist);
  m.userData = { vel: dir.multiplyScalar(space ? 18 : 8), life: Math.min(2.4, dist / (space ? 18 : 8) + 0.05), dmg, space };
  scene.add(m);
  shots.push(m);
  sfx(space ? 160 : 420, 0.06, "square", 0.04);
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 640);
const rig = new THREE.Group();
rig.position.set(0, 1.4, 16);
scene.add(rig);
rig.add(camera);
const sky = makeSky();
scene.add(sky);
scene.add(new THREE.HemisphereLight(0x8899aa, 0x110800, 0.85));
const sun = new THREE.DirectionalLight(0xffe6c8, 0.7);
sun.position.set(8, 12, 4);
scene.add(sun);

const ctrl = {
  0: renderer.xr.getController(0),
  1: renderer.xr.getController(1),
  g0: renderer.xr.getControllerGrip(0),
  g1: renderer.xr.getControllerGrip(1),
};
Object.values(ctrl).forEach((c) => rig.add(c));
ctrl.g0.add(makeSpiritHand());
ctrl.g1.add(makeSpiritHand());
const laser = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -24)]),
  new THREE.LineBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0.55 }),
);
ctrl[1].add(laser);

function wristHud() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(0.22, 0.082, 1);
  spr.position.set(0, 0.07, 0.08);
  ctrl.g0.add(spr);
  return { canvas: c, tex, spr };
}
const wrist = wristHud();
function paintWrist() {
  if (!playerTeam) return;
  const g = wrist.canvas.getContext("2d");
  g.fillStyle = "#0c1016";
  g.fillRect(0, 0, 256, 96);
  g.strokeStyle = "#9ee7ff";
  g.strokeRect(4, 4, 248, 88);
  g.fillStyle = "#e6c56e";
  g.font = "bold 28px sans-serif";
  g.fillText("MAT  " + Math.floor(playerTeam.mat), 16, 40);
  g.fillStyle = "#c8c4b8";
  g.font = "18px sans-serif";
  const cap = playerCap(playerTeam);
  g.fillText("units " + teamUnitCount(playerTeam) + (cap ? " / " + cap : ""), 16, 70);
  wrist.tex.needsUpdate = true;
}

const stratGroup = new THREE.Group();
stratGroup.visible = false;
ctrl.g0.add(stratGroup);
stratGroup.position.set(0.18, 0.12, -0.05);
const stratCards = [];
function buildStratCards() {
  stratCards.length = 0;
  while (stratGroup.children.length) stratGroup.remove(stratGroup.children[0]);
  const kinds = ["scout", "settler"];
  if (playerTeam && worlds.some((w) => w.colonies.some((c) => c.team === playerTeam.id && c.city))) kinds.push("warship");
  kinds.forEach((k, i) => {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ map: cardTex(k.toUpperCase(), COST[k], k === "settler" ? "lands a colony" : k === "warship" ? "space bombard" : "void fighter"), side: THREE.DoubleSide }));
    pl.position.set(0, 0.12 - i * 0.12, 0);
    pl.userData.card = k;
    stratGroup.add(pl);
    stratCards.push(pl);
  });
}

const cityGroup = new THREE.Group();
cityGroup.visible = false;
scene.add(cityGroup);
const cityCards = [];
function showCityMenu(col) {
  if (col.flagDead || !col.flag) {
    flashAnnounce("No living flag — plant a new colony to claim these ruins");
    return;
  }
  cityMenu = col;
  cityGroup.visible = true;
  while (cityGroup.children.length) cityGroup.remove(cityGroup.children[0]);
  cityCards.length = 0;
  const kinds = ["miner", "tank", "heli"];
  if (col.city) kinds.push("warship", "cannon");
  const p = col.flag.getWorldPosition(_v).clone();
  cityGroup.position.copy(p).addScaledVector(col.normal, 0.35);
  kinds.forEach((k, i) => {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16), new THREE.MeshBasicMaterial({ map: cardTex(k.toUpperCase(), COST[k], k), side: THREE.DoubleSide }));
    pl.position.set((i - (kinds.length - 1) / 2) * 0.32, 0, 0);
    pl.lookAt(camera.getWorldPosition(_v2));
    pl.userData.card = k;
    pl.userData.city = col;
    cityGroup.add(pl);
    cityCards.push(pl);
  });
}

function xrGamepad(i) {
  const srcs = renderer.xr.getSession()?.inputSources;
  if (!srcs) return null;
  for (const s of srcs) {
    if (s.handedness === (i === 0 ? "left" : "right")) return s.gamepad;
  }
  return srcs[i]?.gamepad || null;
}
function stickXY(gp) {
  if (!gp?.axes) return { x: 0, y: 0 };
  const a = gp.axes;
  if (a.length >= 4) return { x: a[2] || 0, y: a[3] || 0 };
  return { x: a[0] || 0, y: a[1] || 0 };
}
const pressed = { a: false, y: false, lt: false, rt: false, rmb: false };

function rightRay() {
  ctrl[1].updateMatrixWorld();
  const o = ctrl[1].getWorldPosition(_v).clone();
  const d = new THREE.Vector3(0, 0, -1).applyQuaternion(ctrl[1].getWorldQuaternion(_q)).normalize();
  return { o, d };
}
function desktopRay() {
  if (mouse.locked) {
    camera.getWorldPosition(_v);
    camera.getWorldDirection(_v2);
    return { o: _v.clone(), d: _v2.clone() };
  }
  _ray.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
  return { o: _ray.ray.origin.clone(), d: _ray.ray.direction.clone() };
}

function hitPick(o, d) {
  _ray.set(o, d);
  _ray.far = 220;
  const meshes = [];
  for (const u of units) if (!u.dead) meshes.push(u.mesh);
  for (const w of worlds) {
    meshes.push(w.mesh, w.atmos);
    for (const c of w.colonies) {
      if (c.flag) meshes.push(c.flag);
      for (const b of c.buildings) meshes.push(b);
    }
    for (const m of w.mines) meshes.push(m.mesh);
  }
  if (strategyOpen) meshes.push(...stratCards);
  if (cityMenu) meshes.push(...cityCards);
  const hits = _ray.intersectObjects(meshes, true);
  return hits[0] || null;
}

function unitFromHit(h) {
  let o = h?.object;
  while (o) {
    if (o.userData?.unit) return o.userData.unit;
    o = o.parent;
  }
  return null;
}

function commandMove(o, d) {
  const hit = hitPick(o, d);
  const dest = hit?.point || o.clone().add(d.clone().multiplyScalar(12));
  let planet = hit?.object?.userData?.world;
  if (!planet && hit?.object) {
    let p = hit.object;
    while (p) {
      if (p.userData?.world) {
        planet = p.userData.world;
        break;
      }
      p = p.parent;
    }
  }
  for (const u of selectedUnits) {
    if (u.team !== playerTeam.id || u.dead) continue;
    u.cmd = { pos: dest.clone(), planet: planet || null, mine: hit?.object?.userData?.mine ? hit.object : null };
    u.state = "move";
  }
  sfx(500, 0.05, "sine", 0.04);
}

function trySelect(o, d, multi) {
  const hit = hitPick(o, d);
  if (!hit) {
    if (!multi) selectedUnits = [];
    return;
  }
  if (hit.object.userData?.card) {
    const k = hit.object.userData.card;
    const city = hit.object.userData.city;
    if (city) spawnFromCity(k, city);
    else spawnFromStrat(k, o, d);
    return;
  }
  let obj = hit.object;
  while (obj) {
    if (obj.userData?.flag && obj.userData.colony?.team === playerTeam.id) {
      showCityMenu(obj.userData.colony);
      return;
    }
    if (obj.userData?.bldg?.col?.team === playerTeam.id) {
      showCityMenu(obj.userData.bldg.col);
      return;
    }
    obj = obj.parent;
  }
  let worldObj = hit.object;
  while (worldObj) {
    if (worldObj.userData?.world) {
      const col = worldObj.userData.world.colonies.find((c) => c.team === playerTeam.id && !c.flagDead);
      if (col) {
        showCityMenu(col);
        return;
      }
      break;
    }
    worldObj = worldObj.parent;
  }
  const u = unitFromHit(hit);
  if (u && u.team === playerTeam.id) {
    if (!multi) selectedUnits = [];
    if (!selectedUnits.includes(u)) selectedUnits.push(u);
    sfx(640, 0.04, "square", 0.03);
    return;
  }
  if (!multi) selectedUnits = [];
}

function spawnFromStrat(kind, o, d) {
  if (!playerTeam) return;
  const pos = o.clone().add(d.clone().multiplyScalar(1.6));
  const u = spawnUnit(kind, playerTeam, pos, null, null);
  if (!u) flashAnnounce("Need materials or capacity");
  else {
    selectedUnits = [u];
    buildStratCards();
  }
}
function spawnFromCity(kind, col) {
  if (col.flagDead || !col.flag) return flashAnnounce("Colony flag is gone");
  const team = teamById(col.team);
  const n = col.normal;
  const pos = col.planet.group.position.clone().addScaledVector(n, col.planet.radius * (kind === "warship" ? ATMOS + 0.15 : kind === "heli" ? 1.08 : 1.04));
  if (kind === "cannon") {
    if (team.mat < COST.cannon) return flashAnnounce("Need materials");
    const m = modelCannon(team.color);
    col.planet.group.add(m);
    sit(m, col.planet, placeNear(col), 1.03);
    m.userData.bldg = { kind: "cannon", hp: HP.cannon, max: HP.cannon, col, planet: col.planet, cool: 0 };
    addHp(m, HP.cannon);
    col.buildings.push(m);
    team.mat -= COST.cannon;
    sfx(200, 0.15, "triangle", 0.06);
    return;
  }
  const planet = ["miner", "tank", "heli"].includes(kind) ? col.planet : null;
  const u = spawnUnit(kind, team, pos, planet, planet ? n.clone() : null);
  if (!u) flashAnnounce("Need materials or capacity");
}

function seedGalaxy() {
  const n = 3 + Math.floor(Math.random() * 8);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.35;
    const r = 9 + Math.random() * 11;
    const y = (Math.random() - 0.5) * 6.4;
    const rad = (0.45 + Math.random() * 1.15) * 1.5;
    const w = new World(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r - 4), rad, Math.random() * 90);
    scene.add(w.group);
    worlds.push(w);
  }
  const rocks = 5 + Math.floor(Math.random() * 8);
  for (let i = 0; i < rocks; i++) spawnAsteroid();
}

function spawnAsteroid() {
  const avgR = worlds.reduce((s, w) => s + w.radius, 0) / Math.max(1, worlds.length);
  const r = avgR * 0.2 * (0.65 + Math.random() * 0.7);
  const g = new THREE.Group();
  const lump = new THREE.Mesh(
    new THREE.DodecahedronGeometry(r, 0),
    mat(0x6a6460),
  );
  lump.scale.set(0.7 + Math.random() * 0.7, 0.45 + Math.random() * 0.5, 0.8 + Math.random() * 0.6);
  g.add(lump);
  const bump = new THREE.Mesh(new THREE.TetrahedronGeometry(r * 0.45, 0), mat(0x4a4644));
  bump.position.set((Math.random() - 0.5) * r, (Math.random() - 0.5) * r, (Math.random() - 0.5) * r);
  g.add(bump);
  const dist = 6 + Math.random() * MAP;
  g.position.set((Math.random() - 0.5) * dist * 2, (Math.random() - 0.5) * dist, (Math.random() - 0.5) * dist * 2 - 3);
  g.userData.asteroid = {
    spin: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3),
    vel: new THREE.Vector3((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.35),
  };
  scene.add(g);
  asteroids.push(g);
}

function startMatch() {
  running = true;
  startEl.style.display = "none";
  ensureAudio();
  seedGalaxy();
  playerTeam = makeTeam("you", "You", playerColor, false);
  const nAi = aiChoice === "rand" ? 1 + Math.floor(Math.random() * 5) : Number(aiChoice);
  const rest = PALETTE.filter((c) => c !== playerColor);
  for (let i = 0; i < nAi; i++) {
    makeTeam("ai" + i, AI_NAMES[i] || "Fleet " + (i + 1), rest[i % rest.length], true);
  }
  const origin = new THREE.Vector3(0, 1.2, 8.2);
  spawnUnit("scout", playerTeam, origin.clone().add(new THREE.Vector3(-0.5, 0, -0.4)), null, null);
  spawnUnit("scout", playerTeam, origin.clone().add(new THREE.Vector3(0.5, 0, -0.4)), null, null);
  spawnUnit("settler", playerTeam, origin.clone().add(new THREE.Vector3(0, 0.2, -0.8)), null, null);
  playerTeam.mat = START_MAT - COST.scout * 2 - COST.settler;
  for (const t of teams) {
    if (!t.ai) continue;
    const p = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 6 - 1);
    spawnUnit("scout", t, p.clone(), null, null);
    spawnUnit("settler", t, p.clone().add(new THREE.Vector3(0.4, 0, 0)), null, null);
    t.mat = START_MAT - COST.scout - COST.settler;
  }
  buildStratCards();
  flashAnnounce("Galaxy lit. " + nAi + " rival" + (nAi === 1 ? "" : "s") + " in the dark.");
}

function moveUnit(u, dt) {
  if (u.dead) return;
  const spd = u.kind === "warship" ? 1.6 : u.kind === "scout" ? 2.6 : u.kind === "heli" ? 1.4 : u.kind === "settler" ? 1.5 : 1.1;
  if (u.mesh.userData.rotor) u.mesh.userData.rotor.rotation.y += dt * 18;
  for (const m of u.mesh.userData.lights || []) {
    const pulse = 0.55 + Math.sin(performance.now() * 0.012 + u.hp) * 0.45;
    m.color.setHex(m.userData.base || 0x66f0ff);
    m.color.multiplyScalar(0.45 + pulse * 0.7);
  }
  if (u.cmd && u.cmd.pos) {
    if (u.kind === "miner" || u.kind === "tank" || u.kind === "heli") {
      const pl = u.cmd.planet || u.planet;
      if (pl) {
        u.planet = pl;
        const n = pl.landNormal(u.cmd.pos);
        if (!u.normal) u.normal = n.clone();
        u.normal.lerp(n, 1 - Math.exp(-spd * dt)).normalize();
        const alt = u.kind === "heli" ? THREE.MathUtils.lerp(1.04, ATMOS, 0.55) : 1.03;
        sit(u.mesh, pl, u.normal, alt);
        if (u.normal.dot(n) > 0.995) {
          if (u.kind === "miner" && u.cmd.mine) u.state = "mine";
          else u.state = "idle";
          if (u.kind !== "miner") u.cmd = null;
        }
        return;
      }
    }
    if (u.kind === "settler" && u.cmd.planet) {
      const pl = u.cmd.planet;
      const target = pl.group.position.clone().addScaledVector(pl.landNormal(u.cmd.pos), pl.radius * 1.04);
      snapAtmos(u, pl, dt);
      u.mesh.position.lerp(target, 1 - Math.exp(-spd * 0.6 * dt));
      u.mesh.lookAt(pl.group.position);
      if (u.mesh.position.distanceTo(target) < 0.22 && pl.mature()) {
        foundColony(teamById(u.team), pl, pl.landNormal(u.mesh.position));
        killUnit(u);
        return;
      }
      return;
    }
    _v.copy(u.cmd.pos).sub(u.mesh.position);
    const d = _v.length();
    if (d < 0.12) {
      u.cmd = null;
      u.state = "idle";
    } else {
      _v.multiplyScalar(1 / d);
      u.mesh.position.addScaledVector(_v, spd * dt);
      u.mesh.lookAt(u.mesh.position.clone().add(_v));
    }
  }
  if (u.kind === "scout" || u.kind === "warship" || u.kind === "settler") {
    let nearest = null;
    let nd = 1e9;
    for (const w of worlds) {
      const d = u.mesh.position.distanceTo(w.group.position);
      if (d < nd) {
        nd = d;
        nearest = w;
      }
    }
    if (nearest) snapAtmos(u, nearest, dt);
  }
}

function snapAtmos(u, pl, dt) {
  if (!pl || u.kind === "miner" || u.kind === "tank") return;
  const center = pl.group.position;
  const dist = u.mesh.position.distanceTo(center);
  const shell = pl.atmosR();
  const n = pl.landNormal(u.mesh.position);
  const was = u.atmosWorld === pl;
  if (!was && dist <= shell + 0.04) {
    u.atmosWorld = pl;
    const onto = center.clone().addScaledVector(n, shell);
    u.mesh.position.lerp(onto, 1 - Math.exp(-8 * dt));
    if (u.kind === "heli") u.planet = pl;
  } else if (was && dist > shell + 0.08) {
    const off = center.clone().addScaledVector(n, shell + 0.12);
    u.mesh.position.lerp(off, 1 - Math.exp(-10 * dt));
    if (dist > shell + 0.22) u.atmosWorld = null;
  } else if (was && dist < shell - 0.06 && (u.kind === "scout" || u.kind === "warship" || u.kind === "settler" || u.kind === "heli")) {
    const onto = center.clone().addScaledVector(n, shell);
    u.mesh.position.lerp(onto, 1 - Math.exp(-6 * dt));
  }
}

function combat(u, dt) {
  u.cool = Math.max(0, u.cool - dt);
  if (u.cool > 0 || u.dead) return;
  const team = u.team;
  const pos = u.mesh.position;
  let best = null;
  let bd = u.kind === "warship" ? 14 : u.kind === "scout" ? 4.5 : 1.6;
  const inAtmos = (w) => pos.distanceTo(w.group.position) <= w.atmosR() + 0.05;
  if (u.kind === "warship") {
    for (const w of worlds) {
      for (const c of w.colonies) {
        if (c.team === team) continue;
        for (const b of [...c.buildings, c.flag].filter(Boolean)) {
          if (b.userData?.bldg?.kind === "flag" && c.flagDead) continue;
          const d = pos.distanceTo(b.getWorldPosition(_v));
          if (d < bd) {
            bd = d;
            best = { type: "bldg", mesh: b };
          }
        }
      }
      for (const ou of units) {
        if (ou.dead || ou.team === team) continue;
        if (ou.planet === w && (ou.kind === "tank" || ou.kind === "heli" || ou.kind === "miner")) {
          const d = pos.distanceTo(ou.mesh.position);
          if (d < bd) {
            bd = d;
            best = { type: "unit", u: ou };
          }
        }
      }
    }
    for (const ou of units) {
      if (ou.dead || ou.team === team) continue;
      if (ou.kind === "scout" || ou.kind === "warship" || ou.kind === "settler") {
        const d = pos.distanceTo(ou.mesh.position);
        if (d < 5 && d < bd) {
          bd = d;
          best = { type: "unit", u: ou };
        }
      }
    }
  } else if (u.kind === "scout") {
    let atmosWorld = null;
    for (const w of worlds) if (inAtmos(w)) atmosWorld = w;
    if (atmosWorld) {
      for (const ou of units) {
        if (ou.dead || ou.team === team) continue;
        if (ou.planet === atmosWorld || (ou.kind === "heli" && ou.planet === atmosWorld) || ou.kind === "tank" || ou.kind === "miner") {
          if (ou.planet && ou.planet !== atmosWorld) continue;
          const d = pos.distanceTo(ou.mesh.position);
          if (d < bd) {
            bd = d;
            best = { type: "unit", u: ou };
          }
        }
      }
      for (const c of atmosWorld.colonies) {
        if (c.team === team) continue;
        for (const b of [...c.buildings, c.flag].filter(Boolean)) {
          if (b.userData?.bldg?.kind === "flag" && c.flagDead) continue;
          const d = pos.distanceTo(b.getWorldPosition(_v));
          if (d < bd) {
            bd = d;
            best = { type: "bldg", mesh: b };
          }
        }
      }
    }
    for (const ou of units) {
      if (ou.dead || ou.team === team) continue;
      if (ou.kind === "scout" || ou.kind === "warship" || ou.kind === "settler") {
        const d = pos.distanceTo(ou.mesh.position);
        if (d < 3.8 && d < bd) {
          bd = d;
          best = { type: "unit", u: ou };
        }
      }
    }
  } else if (u.kind === "tank" || u.kind === "heli") {
    if (!u.planet) return;
    for (const ou of units) {
      if (ou.dead || ou.team === team || ou.planet !== u.planet) continue;
      if (ou.kind === "tank" || ou.kind === "heli" || ou.kind === "miner") {
        const d = pos.distanceTo(ou.mesh.position);
        if (d < bd) {
          bd = d;
          best = { type: "unit", u: ou };
        }
      }
    }
    for (const c of u.planet.colonies) {
      if (c.team === team) continue;
      for (const b of [...c.buildings, c.flag].filter(Boolean)) {
        const d = pos.distanceTo(b.getWorldPosition(_v));
        if (d < bd) {
          bd = d;
          best = { type: "bldg", mesh: b };
        }
      }
    }
  }
  if (!best) return;
  const to = best.type === "unit" ? best.u.mesh.position.clone() : best.mesh.getWorldPosition(_v).clone();
  const col = teamById(team).color;
  fireShot(pos.clone(), to, u.kind === "warship" ? 18 : u.kind === "scout" ? 8 : 10, col, u.kind === "warship" || u.kind === "scout");
  u.cool = u.kind === "warship" ? 1.1 : 0.7;
}

function tickMiner(u, dt) {
  if (u.kind !== "miner" || u.dead) return;
  const team = teamById(u.team);
  const pl = u.planet;
  if (!pl) return;
  if (u.state === "idle") {
    const mine = pl.mines.find((m) => !m.busy);
    if (mine) {
      u.cmd = { pos: mine.mesh.getWorldPosition(new THREE.Vector3()), planet: pl, mine: mine.mesh };
      u.state = "move";
    }
    return;
  }
  if (u.state === "mine" && u.cmd?.mine) {
    u.cargo = Math.min(10, u.cargo + dt * 2.4);
    if (u.cargo >= 10) {
      const col = pl.colonies.find((c) => c.team === u.team && c.flag && !c.flagDead);
      if (col) {
        u.cmd = { pos: col.flag.getWorldPosition(new THREE.Vector3()), planet: pl };
        u.state = "haul";
      }
    }
    return;
  }
  if (u.state === "haul") {
    const col = pl.colonies.find((c) => c.team === u.team && c.flag && !c.flagDead);
    if (col && u.mesh.position.distanceTo(col.flag.getWorldPosition(_v)) < 0.2) {
      team.mat += Math.floor(u.cargo);
      u.cargo = 0;
      const mine = pl.mines.find((m) => !m.busy);
      if (mine) {
        u.cmd = { pos: mine.mesh.getWorldPosition(new THREE.Vector3()), planet: pl, mine: mine.mesh };
        u.state = "move";
      } else u.state = "idle";
    }
  }
}

function tickCannons(dt) {
  for (const w of worlds) {
    for (const c of w.colonies) {
      if (c.flagDead || !c.flag) continue;
      for (const b of c.buildings) {
        const d = b.userData.bldg;
        if (d?.kind !== "cannon") continue;
        d.cool = (d.cool || 0) - dt;
        if (d.cool > 0) continue;
        let targetW = null;
        for (const ow of worlds) {
          if (ow === w) continue;
          if (ow.colonies.some((oc) => oc.team !== c.team)) {
            targetW = ow;
            break;
          }
        }
        if (!targetW) continue;
        const from = b.getWorldPosition(_v).clone();
        const to = targetW.group.position.clone();
        const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0x66f0ff));
        bolt.position.copy(from);
        const dir = to.clone().sub(from).normalize();
        bolt.userData = { vel: dir.multiplyScalar(10), life: 8, planet: targetW, dmg: 45, crater: true };
        scene.add(bolt);
        shots.push(bolt);
        d.cool = 8;
        sfx(90, 0.3, "sawtooth", 0.08);
      }
    }
  }
}

function tickShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.position.addScaledVector(s.userData.vel, dt);
    s.userData.life -= dt;
    let hit = false;
    if (s.userData.crater && s.userData.planet) {
      const w = s.userData.planet;
      if (s.position.distanceTo(w.group.position) < w.radius * 1.06) {
        const n = w.landNormal(s.position);
        paintAt(w.paint, { x: 0.5 + n.x * 0.4, y: 0.5 + n.z * 0.4 }, -70);
        for (const c of w.colonies) {
          for (const b of [...c.buildings]) {
            if (b.getWorldPosition(_v).distanceTo(s.position) < w.radius * 0.35) damage(b, s.userData.dmg);
          }
        }
        hit = true;
      }
    } else {
      for (const u of units) {
        if (u.dead) continue;
        if (u.mesh.position.distanceTo(s.position) < 0.18) {
          damage(u, s.userData.dmg);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const w of worlds) {
          for (const c of w.colonies) {
            for (const b of [...c.buildings, c.flag].filter(Boolean)) {
              if (b.getWorldPosition(_v).distanceTo(s.position) < 0.16) {
                damage(b, s.userData.dmg);
                hit = true;
                break;
              }
            }
            if (hit) break;
          }
          if (hit) break;
        }
      }
    }
    if (hit || s.userData.life <= 0) {
      scene.remove(s);
      shots.splice(i, 1);
    }
  }
}

function tickColonies(dt) {
  for (const w of worlds) {
    for (const c of w.colonies) {
      if (c.flagDead || !c.flag) continue;
      if (c.city) {
        const t = teamById(c.team);
        if (t) t.mat += dt;
      }
      c.growT -= dt;
      if (c.growT <= 0) {
        c.growT = 60;
        growColony(c);
      }
      if (c.flag?.userData.cloth) c.flag.userData.cloth.rotation.y = Math.sin(performance.now() * 0.004) * 0.25;
    }
  }
}

function aiTick(dt) {
  for (const t of teams) {
    if (!t.ai) continue;
    t.think -= dt;
    if (t.think > 0) continue;
    t.think = 1.4 + Math.random();
    const mine = units.find((u) => u.team === t.id && u.kind === "settler" && !u.dead);
    const empty = worlds.find((w) => w.mature() && !w.colonies.some((c) => c.team === t.id && c.flag && !c.flagDead) && w.colonies.filter((c) => c.flag && !c.flagDead).length < 2);
    if (mine && empty && !mine.cmd) {
      mine.cmd = { pos: empty.group.position.clone(), planet: empty };
      mine.state = "move";
    }
    const col = worlds.flatMap((w) => w.colonies).find((c) => c.team === t.id);
    if (col && t.mat >= COST.miner && teamUnitCount(t) < Math.max(3, playerCap(t))) {
      spawnFromCity("miner", col);
    } else if (col && t.mat >= COST.tank) spawnFromCity("tank", col);
    const scout = units.find((u) => u.team === t.id && u.kind === "scout" && !u.dead && !u.cmd);
    if (scout) {
      const foe = units.find((u) => u.team !== t.id && !u.dead);
      if (foe) scout.cmd = { pos: foe.mesh.position.clone(), planet: foe.planet };
    }
  }
}

function moveRig(dt, xr) {
  const speed = 4.2;
  camera.getWorldDirection(_v);
  _v.y = 0;
  if (_v.lengthSq() < 0.0001) _v.set(0, 0, -1);
  _v.normalize();
  _v2.crossVectors(_v, _up).normalize();
  let fx = 0, fz = 0, fy = 0, yaw = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) fz += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) fz -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) fx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) fx += 1;
  if (keys.has("KeyQ") || keys.has("Space")) fy += 1;
  if (keys.has("KeyE") || keys.has("ShiftLeft")) fy -= 1;
  if (xr) {
    const l = xrGamepad(0);
    const r = xrGamepad(1);
    const ls = stickXY(l);
    const rs = stickXY(r);
    if (Math.abs(ls.x) > 0.15) fx += ls.x;
    if (Math.abs(ls.y) > 0.15) fz += -ls.y;
    if (Math.abs(rs.x) > 0.18) yaw -= rs.x * 1.4 * dt;
    if (Math.abs(rs.y) > 0.18) fy += -rs.y;
  }
  lookYaw += yaw;
  rig.rotation.y = lookYaw;
  if (!xr) {
    camera.rotation.x = lookPitch;
    camera.rotation.order = "YXZ";
  }
  rig.position.addScaledVector(_v, fz * speed * dt);
  rig.position.addScaledVector(_v2, fx * speed * dt);
  rig.position.y += fy * speed * dt;
}

function pulseSelect() {
  for (const u of units) {
    if (u.dead) continue;
    const on = selectedUnits.includes(u);
    if (on && !u.ring) {
      u.ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 16), mat(0x9ee7ff, { transparent: true, opacity: 0.85 }));
      u.ring.rotation.x = Math.PI / 2;
      u.mesh.add(u.ring);
    }
    if (u.ring) u.ring.visible = on;
    if (u.mesh.userData.bar) u.mesh.userData.bar.position.y = on ? 0.3 : 0.22;
  }
}

function loop(t) {
  const now = t * 0.001;
  const dt = Math.min(0.05, last ? now - last : 0.016);
  last = now;
  sky.material.uniforms.uT.value = now;
  if (!running) {
    renderer.render(scene, camera);
    return;
  }
  const xr = renderer.xr.isPresenting;
  moveRig(dt, xr);
  tickMusic(now);

  const gpR = xrGamepad(1);
  const gpL = xrGamepad(0);
  const aBtn = !!(gpR?.buttons?.[4]?.pressed || gpL?.buttons?.[4]?.pressed);
  const yBtn = !!(gpL?.buttons?.[5]?.pressed);
  const lt = !!(gpL?.buttons?.[0]?.pressed);
  const rt = !!(gpR?.buttons?.[0]?.pressed);
  const ray = xr ? rightRay() : desktopRay();

  if (xr) {
    if (yBtn && !pressed.y) {
      strategyOpen = !strategyOpen;
      stratGroup.visible = strategyOpen;
      if (strategyOpen) buildStratCards();
    }
    if (aBtn && !pressed.a) trySelect(ray.o, ray.d, lt);
    if (rt && !pressed.rt && selectedUnits.length) commandMove(ray.o, ray.d);
    pressed.y = yBtn;
    pressed.a = aBtn;
    pressed.rt = rt;
    pressed.lt = lt;
  }

  for (const w of worlds) w.stage(dt);
  for (const u of units) {
    if (u.dead) continue;
    moveUnit(u, dt);
    tickMiner(u, dt);
    combat(u, dt);
    if (u.mesh.userData.bar) {
      u.mesh.userData.bar.lookAt(camera.getWorldPosition(_v));
      paintBar(u.mesh.userData.bar, u.hp, u.maxHp);
    }
  }
  tickColonies(dt);
  tickCannons(dt);
  tickShots(dt);
  for (const a of asteroids) {
    const d = a.userData.asteroid;
    a.rotation.x += d.spin.x * dt;
    a.rotation.y += d.spin.y * dt;
    a.rotation.z += d.spin.z * dt;
    a.position.addScaledVector(d.vel, dt);
  }
  aiTick(dt);
  pulseSelect();
  paintWrist();
  if (cityMenu) {
    cityGroup.lookAt(camera.getWorldPosition(_v));
  }
  if (announceT > 0) {
    announceT -= dt;
    if (announceT <= 0) announceEl.hidden = true;
  }
  hudStatus.textContent = playerTeam
    ? `${worlds.length} worlds · ${Math.floor(playerTeam.mat)} mat · ${selectedUnits.length} selected`
    : "";
  for (let i = units.length - 1; i >= 0; i--) if (units[i].dead) units.splice(i, 1);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(loop);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (!running) return;
  if (e.code === "KeyY" || e.code === "Tab") {
    e.preventDefault();
    strategyOpen = !strategyOpen;
    stratGroup.visible = strategyOpen;
    if (strategyOpen) buildStratCards();
  }
  if (e.code === "Digit1") spawnFromStrat("scout", camera.getWorldPosition(new THREE.Vector3()), camera.getWorldDirection(new THREE.Vector3()));
  if (e.code === "Digit2") spawnFromStrat("settler", camera.getWorldPosition(new THREE.Vector3()), camera.getWorldDirection(new THREE.Vector3()));
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());
canvas.addEventListener("click", () => {
  if (startEl.style.display === "none") canvas.requestPointerLock?.();
});
document.addEventListener("pointerlockchange", () => {
  mouse.locked = document.pointerLockElement === canvas;
});
document.addEventListener("mousemove", (e) => {
  if (mouse.locked) {
    lookYaw -= e.movementX * 0.0025;
    lookPitch -= e.movementY * 0.0025;
    lookPitch = THREE.MathUtils.clamp(lookPitch, -1.2, 1.2);
    camera.rotation.set(lookPitch, 0, 0);
    rig.rotation.y = lookYaw;
  } else {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }
});
window.addEventListener("mousedown", (e) => {
  if (!running) return;
  if (e.button === 0) {
    const r = desktopRay();
    trySelect(r.o, r.d, e.shiftKey || keys.has("ShiftLeft"));
  }
  if (e.button === 2) {
    const r = desktopRay();
    commandMove(r.o, r.d);
  }
});
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("wheel", (e) => {
  camera.getWorldDirection(_v);
  rig.position.addScaledVector(_v, -Math.sign(e.deltaY) * 0.55);
});

const sw = document.getElementById("swatches");
PALETTE.forEach((hex, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "swatch" + (i === 0 ? " on" : "");
  b.style.background = "#" + hex.toString(16).padStart(6, "0");
  b.onclick = () => {
    playerColor = hex;
    [...sw.children].forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
  };
  sw.append(b);
});
document.getElementById("ai-count").onchange = (e) => {
  aiChoice = e.target.value;
};

function beginDesktop() {
  ensureAudio();
  startMatch();
  canvas.requestPointerLock?.();
}
document.getElementById("go-desk").onclick = beginDesktop;
document.getElementById("go-vr").onclick = async () => {
  ensureAudio();
  startMatch();
  const xr = navigator.xr;
  if (!xr?.requestSession) {
    beginDesktop();
    return;
  }
  try {
    const session = await xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor"] });
    await renderer.xr.setSession(session);
  } catch {
    try {
      const session = await xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
      await renderer.xr.setSession(session);
    } catch {
      /* desktop already running */
    }
  }
};
const btn = XRButton.createButton(renderer, { optionalFeatures: ["local-floor"] });
btn.style.display = "none";
document.body.append(btn);

window.__controlsTest = {
  getYaw: () => lookYaw,
  getSpeed: () => (keys.has("KeyW") ? 4.2 : 0),
  setKeys: (codes) => {
    keys.clear();
    (codes || []).forEach((c) => keys.add(c));
  },
};
