import * as THREE from "three";
import { XRButton } from "three/addons/webxr/XRButton.js";
import {
  ENTITY_SCALE,
  ATMOS,
  GOD_ATMOS,
  BUILD_AGES,
  FORMS,
  PLANET_VERT,
  PLANET_FRAG,
  CLOUD_VERT,
  CLOUD_FRAG,
  pickTemplate,
  rollSea,
  isLand,
  isOcean,
  sit,
  uvFromN,
  makePaint,
  paintAt,
  planetUniforms,
  makeAtmosShell,
  makeWaterShell,
  makePlanetSky,
  makePeg,
  setSurfaceLod,
  setAtmosMode,
  setSkyDormant,
  worldContaining,
  confineToAtmos,
  ejectNearPlanet,
  waterAlt,
  atmosR,
  heightOf,
  seaOf,
} from "/games/shared/world-core.js?v=pm4";
import {
  SLOT_N,
  CIV_AGES,
  PART_FORMS,
  TORSO_KINDS,
  HEAD_KINDS,
  SPORE_COLORS,
  LIFE_SKILLS,
  ADJECTIVES,
  emptyDna,
  randomDna,
  loadSlots,
  saveSlots,
  loadRelations,
  saveRelations,
  relKey,
  isWar,
  setWar,
  makeLimb,
  makeCreatureMesh,
  civBlank,
  civScore,
  ageOf,
  buildCivMesh,
  modelScout,
  modelSettler,
  modelDestroyer,
  modelExplosionOrb,
  labelCanvas,
  dnaIsAquatic,
  modelTemple,
  evenStats,
  zeroStats,
  spentPoints,
  setStat,
  inheritSkill,
  displayName,
  skillEff,
} from "./spore.js?v=pm4";

const canvas = document.getElementById("c");
const hudEl = document.getElementById("hud");
const hudPower = document.getElementById("power-name");
const hudForm = document.getElementById("form-name");
const hudHint = document.getElementById("hint");
const hudStatus = document.getElementById("status");
const inspectEl = document.getElementById("inspect");
const startEl = document.getElementById("start");

const POWERS = [
  { id: "select", name: "Select", hint: "No power. Point at a world and press A to open its menu." },
  { id: "forge", name: "Forge", hint: "Hold to grow a molten world. Release to set it free." },
  { id: "rain", name: "Rain", hint: "Call clouds. Rain writes oceans faster." },
  { id: "meteor", name: "Meteors", hint: "Hurl fire. Impacts crater, burn, and boom." },
  { id: "ufo", name: "Visitors", hint: "Invite a saucer to orbit the world in range." },
  { id: "raise", name: "Uplift", hint: "Raise land where you point." },
  { id: "lower", name: "Subside", hint: "Sink crust back toward the sea." },
  { id: "beasts", name: "Life", hint: "Opens the spore studio. Trigger any body part to swap it. Name the species and spend 100 life points on stats." },
  { id: "bolt", name: "Lightning", hint: "Strike the crust — burns, shocks life, and knocks ships." },
  { id: "laser", name: "Laser", hint: "Hold to cut. Damages ships and carves riverbeds through land." },
  { id: "scout", name: "Scout", hint: "Spawn a Planetry scout for the selected spore civ." },
  { id: "destroyer", name: "Mass Destroyer", hint: "A warship six times a scout. Its lasers crater worlds like meteors." },
  { id: "orb", name: "Explosion Orb", hint: "A planet-sized metal sphere. Its green superlaser unmakes anything it touches." },
  { id: "settler", name: "Settler", hint: "Spawn a settler. It orbits looking for land — never ocean — then founds a city." },
  { id: "storm", name: "Weather", hint: "Open weather: clouds, thunderstorm, snow, hail. Hold A or trigger to grow it in the sky." },
  { id: "grove", name: "Grove", hint: "Paint forests and berry bushes on land. Hold to raise them; they will not take on water." },
  { id: "boulder", name: "Boulder", hint: "Place stone. Creatures harvest rock and gold ore." },
  { id: "volcano", name: "Volcano", hint: "On land it oozes lava. In the ocean it builds rock land around the cone." },
  { id: "tornado", name: "Tornado", hint: "Spin a funnel that scuttles across the crust." },
  { id: "monolith", name: "Monolith", hint: "A slab of night. A spore civ that discovers it gains 100 civ score." },
  { id: "temple", name: "Temple", hint: "Raise a giant temple from the crust. Creatures in its lands may march around it." },
  { id: "form", name: "Form", hint: "Set your deity: Fearsome, Divine, or Inspiring." },
];

const WEATHERS = [
  { id: "clear", name: "Clear", hint: "Part the cloud banks." },
  { id: "clouds", name: "Clouds", hint: "Hold A or trigger to form and grow clouds inside the atmosphere." },
  { id: "rain", name: "Rain", hint: "Hold to call rain over the world." },
  { id: "thunder", name: "Thunderstorm", hint: "Storm clouds, rain, and lightning." },
  { id: "snow", name: "Snow", hint: "Snow falls through the sky." },
  { id: "hail", name: "Hail", hint: "Hard ice pelts the crust." },
];
let weatherMode = "clouds";
let groveAcc = 0;

const SPECIES = [
  { id: "human", name: "Human", file: "human.png", sheet: true, kind: "human", diet: "gather", w: 0.046, h: 0.08, spd: 0.55, hp: 28 },
  { id: "woman", name: "Settler", file: "woman.png", sheet: true, kind: "human", diet: "gather", w: 0.044, h: 0.078, spd: 0.5, hp: 26 },
  { id: "wolf", name: "Wolf", file: "wolf.png", sheet: true, kind: "animal", diet: "meat", w: 0.04, h: 0.07, spd: 0.85, hp: 22 },
  { id: "turtle", name: "Turtle", file: "turtle.png", sheet: false, kind: "animal", diet: "plant", w: 0.05, h: 0.042, spd: 0.22, hp: 30 },
  { id: "mammoth", name: "Mammoth", file: "mammoth.png", sheet: false, kind: "animal", diet: "plant", w: 0.12, h: 0.1, spd: 0.28, hp: 70 },
  { id: "raptor", name: "Raptor", file: "raptor.png", sheet: false, kind: "dino", diet: "meat", w: 0.09, h: 0.07, spd: 0.95, hp: 36 },
  { id: "trex", name: "T. rex", file: "trex.png", sheet: false, kind: "dino", diet: "meat", w: 0.14, h: 0.13, spd: 0.42, hp: 90 },
  { id: "dragon", name: "Dragon", file: "dragon.png", sheet: true, kind: "dino", diet: "meat", w: 0.11, h: 0.1, spd: 0.7, hp: 80 },
];

const MAX_WORLDS = 8;
const BIRTH = 30;
const MAX_LIFE = 96;
const CREATURE_SLOTS = loadSlots();
let selSlot = 0;
let warSlot = 1;
const relations = loadRelations();
const ships = [];
let lastLaserUv = null;
let laserHold = 0;
const SPR = "/games/fenrest/sprites/";
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _ray = new THREE.Raycaster();

function hsl(h, s, l) {
  return new THREE.Color().setHSL((((h % 360) + 360) % 360) / 360, s, l);
}

function makeSpiritHand() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0.32, depthWrite: false });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), mat);
  palm.scale.set(1.1, 0.55, 1.3);
  g.add(palm);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.055, 4, 6), mat);
    f.position.set((i - 2) * 0.022, 0.02, -0.055);
    f.rotation.x = -0.35;
    g.add(f);
  }
  g.userData.mat = mat;
  return g;
}
function makeSky() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(220, 32, 24),
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
function makeUfo() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xc5ccd8 }));
  disc.scale.set(1, 0.28, 1);
  g.add(disc);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7ad7ff, transparent: true, opacity: 0.55 }));
  dome.position.y = 0.04;
  g.add(dome);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 18), new THREE.MeshBasicMaterial({ color: 0x9ee7ff }));
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

const TEX = {};
function sprTex(file, sheet) {
  const key = file + (sheet ? ":s" : "");
  if (!TEX[key]) {
    const t = new THREE.TextureLoader().load(SPR + file);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = sheet ? THREE.NearestFilter : THREE.LinearFilter;
    t.minFilter = t.magFilter;
    if (sheet) {
      t.repeat.set(0.25, 0.25);
      t.offset.set(0, 0.75);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    }
    TEX[key] = t;
  }
  return TEX[key];
}
function labelTex(text) {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 36;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(8,10,16,0.82)";
  g.fillRect(0, 0, 160, 36);
  g.fillStyle = "#e8e4d8";
  g.font = "bold 15px sans-serif";
  g.textAlign = "center";
  g.fillText(text, 80, 24);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sitRadial(obj, n, r) {
  obj.position.copy(n).multiplyScalar(r);
  if (!obj.isSprite) obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
}
function startRise(obj, n, rBuried, rFinal, sFinal) {
  obj.userData.n = n.clone();
  obj.userData.rise = 0;
  obj.userData.r0 = rBuried;
  obj.userData.r1 = rFinal;
  obj.userData.s1 = sFinal || ENTITY_SCALE;
  obj.scale.setScalar(0.02);
  sitRadial(obj, n, rBuried);
}
function tickRise(obj, dt) {
  if (obj.userData.rise == null || obj.userData.rise >= 1) return;
  obj.userData.rise = Math.min(1, obj.userData.rise + dt * 1.35);
  const e = 1 - Math.pow(1 - obj.userData.rise, 3);
  sitRadial(obj, obj.userData.n, obj.userData.r0 + (obj.userData.r1 - obj.userData.r0) * e);
  if (obj.isSprite && obj.userData.s1w) obj.scale.set(obj.userData.s1w * e, obj.userData.s1h * e, 1);
  else obj.scale.setScalar(0.04 + (obj.userData.s1 - 0.04) * e);
}

function canPlant(w, n) {
  if ((w.uni?.uLand?.value ?? 1) < 0.06) return false;
  return heightOf(w, n) > seaOf(w) - 0.02;
}

function findPlantSpot(w, n, tries = 24) {
  const base = n.clone().normalize();
  if (canPlant(w, base) && !isOcean(w, base)) return base.clone();
  let best = null;
  let bh = -1;
  const sea = seaOf(w);
  for (let i = 0; i < tries; i++) {
    const spread = 0.1 + i * 0.045;
    const t = base.clone().add(_v2.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)).normalize();
    const h = heightOf(w, t);
    if (h > bh) {
      bh = h;
      best = t.clone();
    }
    if (h > sea) return t;
  }
  if (best && bh > sea - 0.07) {
    paintAt(w.paint, uvFromN(best), 40, 2);
    return best;
  }
  return null;
}

function seekHigherGround(w, n) {
  let best = n.clone().normalize();
  let bh = heightOf(w, best);
  const sea = seaOf(w);
  for (let i = 0; i < 12; i++) {
    const t = n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.24)).normalize();
    const h = heightOf(w, t);
    if (h > bh) {
      bh = h;
      best = t;
    }
  }
  if (bh <= sea) {
    for (let i = 0; i < 16; i++) {
      const t = new THREE.Vector3().randomDirection();
      if (heightOf(w, t) > sea) return t;
    }
  }
  return best;
}

function paintGrove(w, normal) {
  const want = 7;
  let planted = 0;
  for (let i = 0; i < want * 5 && planted < want; i++) {
    const n = normal.clone().normalize();
    n.add(_v2.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)).normalize();
    const spot = findPlantSpot(w, n, 20);
    if (!spot || isOcean(w, spot)) continue;
    if (Math.random() < 0.42) w.addBush(spot);
    else w.addTree(spot);
    planted++;
  }
}

function makeCloudPuff() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xf2f6fb, transparent: true, opacity: 0.78, depthWrite: false });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.25, 10, 8), mat);
    s.position.set((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.28, (Math.random() - 0.5) * 0.7);
    g.add(s);
  }
  g.userData.kind = "wxPuff";
  return g;
}

function raySphere(origin, dir, center, r) {
  const oc = origin.clone().sub(center);
  const b = oc.dot(dir);
  const c = oc.lengthSq() - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t0 = -b - s;
  const t1 = -b + s;
  const t = t0 > 0.04 ? t0 : (t1 > 0.04 ? t1 : null);
  if (t == null) return null;
  return origin.clone().addScaledVector(dir, t);
}

let actx = null;
function audio() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function boomSfx(water) {
  try {
    const ctx = audio();
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const e = 1 - i / len;
      d[i] = (Math.random() * 2 - 1) * e * e * (water ? 0.85 : 1);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = water ? 380 : 180;
    const g = ctx.createGain();
    g.gain.setValueAtTime(water ? 0.42 : 0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    src.start();
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(water ? 96 : 48, t);
    o.frequency.exponentialRampToValueAtTime(18, t + 0.32);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.45, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    o.connect(g2);
    g2.connect(ctx.destination);
    o.start();
    o.stop(t + 0.4);
  } catch {}
}
function screamSfx() {
  try {
    const ctx = audio();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(640, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.26);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(t + 0.28);
  } catch {}
}
function crumbleSfx() {
  try {
    const ctx = audio();
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.35);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    src.start();
  } catch {}
}

function sayOn(obj, text) {
  if (obj.userData.bubble) {
    obj.remove(obj.userData.bubble);
    obj.userData.bubble.material?.map?.dispose();
  }
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(8,10,16,0.88)";
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#f2e6c8";
  g.font = "22px sans-serif";
  g.textAlign = "center";
  g.fillText(text, 128, 40);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(0.22, 0.055, 1);
  s.position.set(0, 0.09, 0);
  s.center.set(0.5, 0);
  obj.add(s);
  obj.userData.bubble = s;
  obj.userData.bubbleT = 2.2;
}

class World {
  constructor(pos, radius, seed) {
    this.radius = radius;
    this.age = 0;
    this.born = false;
    this.seed = seed;
    const tpl = pickTemplate();
    this.template = tpl;
    this.tpl = tpl.id;
    this.freq = tpl.freq;
    this.ridges = tpl.ridges;
    this.arid = tpl.arid;
    this.ice = tpl.ice;
    this.seaLevel = rollSea(tpl);
    this.vegH = tpl.arid > 0.5 ? 42 : tpl.ice > 0.5 ? 190 : 90 + Math.random() * 70;
    this.seaH = tpl.ice > 0.5 ? 210 : 190 + Math.random() * 40;
    this.storm = 0.15;
    this.cloudCover = 0;
    this.wxMode = "clouds";
    this.wxPuffs = [];
    this.temples = [];
    this.keepCloudsOnLod = true;
    this.laserSteamT = 0;
    this.vel = new THREE.Vector3().randomDirection().multiplyScalar(0.15);
    this.paint = makePaint();
    this.trees = [];
    this.bushes = [];
    this.drops = [];
    this.lavas = [];
    this.marines = [];
    this.growAcc = 0;
    this.marineCd = 2;
    this.life = [];
    this.huts = [];
    this.civs = {};
    this.cities = [];
    this.ufos = [];
    this.fires = [];
    this.craters = [];
    this.groundDetail = [];
    this.boulders = [];
    this.volcanoes = [];
    this.tornadoes = [];
    this.monoliths = [];
    this.wrecks = [];
    this.carts = [];
    this.detailReady = false;
    this.surfaceLod = false;
    this.ageIndex = 0;
    this.stores = { wood: 0, stone: 0, food: 0 };
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const uniforms = planetUniforms(seed, hsl(this.vegH, 0.45, 0.32), hsl(this.seaH, 0.55, 0.32), this.paint.tex, tpl, this.seaLevel);
    this.uni = uniforms;
    const segs = 56;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, segs, 40),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: PLANET_VERT,
        fragmentShader: PLANET_FRAG,
        transparent: false,
        depthWrite: true,
        depthTest: true,
        side: THREE.FrontSide,
        toneMapped: false,
      }),
    );
    this.mesh.scale.setScalar(radius);
    this.mesh.userData.world = this;
    this.mesh.renderOrder = 0;
    this.group.add(this.mesh);
    this.uni.uShellWater.value = 1;
    this.atmosMul = GOD_ATMOS;
    this.water = makeWaterShell(radius, this.uni.uOcean.value, this.uni);
    this.water.visible = false;
    this.group.add(this.water);
    this.syncWater();
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uSeed: { value: seed + 3 }, uStorm: { value: 0.15 } },
        vertexShader: CLOUD_VERT,
        fragmentShader: CLOUD_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.clouds.scale.setScalar(radius);
    this.group.add(this.clouds);
    this.atmosShell = makeAtmosShell(radius, this, GOD_ATMOS);
    this.group.add(this.atmosShell);
    const rainGeo = new THREE.BufferGeometry();
    const arr = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      const u = Math.random() * 6.28;
      const v = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = Math.sin(v) * Math.cos(u);
      arr[i * 3 + 1] = Math.cos(v);
      arr[i * 3 + 2] = Math.sin(v) * Math.sin(u);
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    this.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x9ec8ff, size: 0.025, transparent: true, opacity: 0, depthWrite: false }));
    this.rain.scale.setScalar(radius * 1.08);
    this.group.add(this.rain);
  }

  syncWater() {
    if (!this.water) return;
    const a = waterAlt(this);
    this.water.scale.setScalar(this.radius * a);
    this.water.visible = this.uni.uLand.value > 0.2 && this.uni.uMolten.value < 0.65;
    if (this.water.material.uniforms?.uOcean) this.water.material.uniforms.uOcean.value.copy(this.uni.uOcean.value);
  }

  setSea(v) {
    this.seaLevel = THREE.MathUtils.clamp(v, 0.18, 0.82);
    this.uni.uSea.value = this.seaLevel;
    this.syncWater();
  }

  stage(dt) {
    if (!this.born) return;
    this.age = Math.min(BIRTH, this.age + dt);
    const t = this.age / BIRTH;
    const molten = t < 0.38 ? 1 - t / 0.38 : 0;
    let land = 0, clouds = 0, rain = 0;
    if (t > 0.32) clouds = THREE.MathUtils.clamp((t - 0.32) / 0.22, 0, 1);
    if (t > 0.42 && t < 0.92) rain = THREE.MathUtils.clamp((t - 0.42) / 0.18, 0, 0.85) * (t < 0.78 ? 1 : 1 - (t - 0.78) / 0.14);
    if (t > 0.55) land = THREE.MathUtils.clamp((t - 0.55) / 0.28, 0, 1);
    this.uni.uAge.value = t;
    this.uni.uMolten.value = molten;
    this.uni.uLand.value = Math.max(land, this.uni.uLand.value);
    this.uni.uStorm.value = this.storm;
    this.uni.uVeg.value.copy(hsl(this.vegH, 0.48, 0.32));
    this.uni.uOcean.value.copy(hsl(this.seaH, 0.58, 0.3));
    this.uni.uSea.value = this.seaLevel;
    this.syncWater();
    if (this.water?.material.uniforms?.uTime) this.water.material.uniforms.uTime.value += dt;
    const wxAlpha = Math.max(clouds * 0.85, this.storm * 0.35, this.cloudCover || 0);
    this.clouds.material.uniforms.uAlpha.value = wxAlpha;
    this.clouds.material.uniforms.uTime.value += dt;
    this.clouds.material.uniforms.uStorm.value = this.wxMode === "thunder" ? Math.max(this.storm, 0.65) : this.storm;
    this.clouds.rotation.y += dt * (0.08 + this.storm * 0.12);
    this.clouds.visible = true;
    const localPrecip = this.wxPuffs.some((p) => {
      const m = p.userData.mode;
      return m === "rain" || m === "thunder" || m === "snow" || m === "hail";
    });
    const precipOn = !localPrecip && (this.wxMode === "rain" || this.wxMode === "thunder" || this.wxMode === "snow" || this.wxMode === "hail" || rain > 0.03);
    this.rain.material.opacity = precipOn ? Math.max(rain * 0.35, this.storm * 0.4, (this.cloudCover || 0) * 0.45) : 0;
    this.rain.visible = this.rain.material.opacity > 0.03;
    if (this.wxMode === "snow") this.rain.material.color.setHex(0xeef6ff);
    else if (this.wxMode === "hail") this.rain.material.color.setHex(0xc5d0dc);
    else this.rain.material.color.setHex(0x9ec8ff);
    this.rain.material.size = this.wxMode === "hail" ? 0.04 : this.wxMode === "snow" ? 0.032 : 0.025;
    this.group.position.addScaledVector(this.vel, dt);
    this.vel.multiplyScalar(0.985);
    this.tickFires(dt);
    this.tickWx(dt);
  }

  growCloudAt(n, dt, mode) {
    const nn = n.clone().normalize();
    let puff = this.wxPuffs.find((p) => p.userData.n && p.userData.n.dot(nn) > 0.96);
    if (!puff && this.wxPuffs.length < 56) {
      puff = makeCloudPuff();
      puff.userData.n = nn.clone();
      puff.userData.grow = 0.2;
      puff.userData.alt = 1.14 + Math.random() * 0.22;
      this.group.add(puff);
      this.wxPuffs.push(puff);
    }
    if (puff) {
      puff.userData.n.lerp(nn, 0.15).normalize();
      puff.userData.grow = Math.min(2.2, (puff.userData.grow || 0.2) + dt * 0.7);
      if (mode) puff.userData.mode = mode;
      sitRadial(puff, puff.userData.n, this.radius * puff.userData.alt);
      puff.scale.setScalar(this.radius * 0.1 * puff.userData.grow);
    }
  }

  tickWx(dt) {
    for (let i = this.wxPuffs.length - 1; i >= 0; i--) {
      const p = this.wxPuffs[i];
      if ((p.userData.grow || 0) < 0.08 && this.wxMode === "clear") {
        this.group.remove(p);
        this.wxPuffs.splice(i, 1);
        continue;
      }
      if (p.userData.n) sitRadial(p, p.userData.n, this.radius * (p.userData.alt || 1.18));
      p.scale.setScalar(this.radius * 0.1 * (p.userData.grow || 1));
      p.rotation.y += dt * 0.12;
      p.visible = true;
      this.emitPrecip(p, dt);
      if (p.userData.mode === "thunder" && (p.userData.grow || 0) > 0.45 && Math.random() < dt * 0.38) {
        strikeLightning(this, null, p.userData.n, true);
      }
    }
    this.tickDrops(dt);
  }

  emitPrecip(puff, dt) {
    const mode = puff.userData.mode;
    if (mode !== "rain" && mode !== "thunder" && mode !== "snow" && mode !== "hail") return;
    if ((puff.userData.grow || 0) < 0.28) return;
    const rate = 16 * Math.min(2, puff.userData.grow || 1);
    puff.userData.dropT = (puff.userData.dropT || 0) + dt * rate;
    while (puff.userData.dropT >= 1 && this.drops.length < 220) {
      puff.userData.dropT -= 1;
      const n = puff.userData.n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.09)).normalize();
      if (n.dot(puff.userData.n) < 0.9) continue;
      const hail = mode === "hail";
      const snow = mode === "snow";
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(hail ? 0.012 : snow ? 0.009 : 0.006, 4, 3),
        new THREE.MeshBasicMaterial({
          color: hail ? 0xc5d0dc : snow ? 0xeef6ff : 0x9ec8ff,
          transparent: true,
          opacity: 0.88,
        }),
      );
      this.group.add(p);
      const alt = puff.userData.alt || 1.18;
      sitRadial(p, n, this.radius * alt);
      p.userData = { n, alt, life: 1.15, mode };
      this.drops.push(p);
    }
  }

  tickDrops(dt) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const p = this.drops[i];
      p.userData.life -= dt;
      p.userData.alt -= dt * (p.userData.mode === "hail" ? 0.85 : 0.62);
      sitRadial(p, p.userData.n, this.radius * p.userData.alt);
      if (p.material.opacity != null) p.material.opacity = Math.max(0, p.userData.life);
      if (p.userData.alt <= 1.02 || p.userData.life <= 0) {
        if (p.userData.mode === "rain" || p.userData.mode === "thunder") {
          paintAt(this.paint, uvFromN(p.userData.n), -4, 1);
        }
        this.group.remove(p);
        this.drops.splice(i, 1);
      }
    }
  }

  addPegAt(n, color) {
    const p = makePeg(color);
    this.group.add(p);
    sit(p, this, n, 1.018);
    p.scale.setScalar(ENTITY_SCALE);
    p.visible = !this.surfaceLod;
    return p;
  }

  addTree(normal) {
    if (this.trees.length > 115) return;
    const n = normal.clone().normalize();
    if (!canPlant(this, n) || isOcean(this, n)) return;
    const g = new THREE.Group();
    const veg = hsl(this.vegH, 0.55, 0.28);
    const dark = hsl(this.vegH, 0.5, 0.18);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.07, 5), new THREE.MeshBasicMaterial({ color: 0x5a3a22 }));
    trunk.position.y = 0.035;
    g.add(trunk);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.09, 6), new THREE.MeshBasicMaterial({ color: veg }));
    c1.position.y = 0.09;
    g.add(c1);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.07, 6), new THREE.MeshBasicMaterial({ color: dark }));
    c2.position.y = 0.14;
    g.add(c2);
    g.userData.food = 4;
    g.userData.wood = 3;
    g.userData.kind = "tree";
    g.userData.hp = 18;
    g.userData.age = 0;
    g.userData.growS = 0.28;
    this.group.add(g);
    this.trees.push(g);
    g.userData.peg = this.addPegAt(n, 0x2f7a3a);
    startRise(g, n, this.radius * 0.86, this.radius * 1.015, ENTITY_SCALE * 0.28);
    g.visible = this.surfaceLod;
    if (g.userData.peg) g.userData.peg.visible = !this.surfaceLod;
    return g;
  }

  addBush(normal) {
    if (this.bushes.length > 90) return;
    const n = normal.clone().normalize();
    if (!canPlant(this, n) || isOcean(this, n)) return;
    const g = new THREE.Group();
    const veg = hsl(this.vegH, 0.55, 0.3);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshLambertMaterial({ color: veg }));
    body.scale.set(1.15, 0.85, 1.15);
    g.add(body);
    for (let i = 0; i < 5; i++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 5, 4), new THREE.MeshBasicMaterial({ color: 0xc42a4a }));
      berry.position.set((Math.random() - 0.5) * 0.028, 0.01 + Math.random() * 0.016, (Math.random() - 0.5) * 0.028);
      g.add(berry);
    }
    g.userData.food = 3;
    g.userData.kind = "bush";
    g.userData.hp = 8;
    g.userData.age = 0;
    g.userData.growS = 0.35;
    this.group.add(g);
    this.bushes.push(g);
    g.userData.peg = this.addPegAt(n, 0x3a8a44);
    startRise(g, n, this.radius * 0.9, this.radius * 1.014, ENTITY_SCALE * 0.35);
    g.visible = this.surfaceLod;
    if (g.userData.peg) g.userData.peg.visible = !this.surfaceLod;
    return g;
  }

  hutStyle(sid) {
    const civ = this.civOf(sid != null ? sid : selSlot);
    return CIV_AGES[civ.ageIndex] || CIV_AGES[0];
  }

  civOf(sid) {
    const id = sid == null ? selSlot : sid;
    if (!this.civs[id]) this.civs[id] = civBlank();
    return this.civs[id];
  }

  popOf(sid) {
    return this.life.filter((c) => c.userData.speciesId === sid && !c.userData.dead).length;
  }

  buildHutMesh(g, style) {
    for (const ch of [...g.children]) g.remove(ch);
    const near = new THREE.Group();
    near.userData.keepLod = true;
    const kind = g.userData.building === "barracks" ? "barracks" : g.userData.building === "house" ? "house" : null;
    const mesh = buildCivMesh(style, ENTITY_SCALE, kind);
    while (mesh.children.length) near.add(mesh.children[0]);
    const far = new THREE.Group();
    far.userData.keepLod = true;
    const s = (style.scale || 1) * ENTITY_SCALE;
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.055 * s, 0.05 * s, 0.055 * s),
      new THREE.MeshBasicMaterial({ color: style.wall }),
    );
    cube.position.y = 0.025 * s;
    far.add(cube);
    near.visible = this.surfaceLod;
    far.visible = !this.surfaceLod;
    g.add(near, far);
    g.userData.lodNear = near;
    g.userData.lodFar = far;
  }

  addHut(normal, sid, building) {
    if (this.huts.length > 48) return;
    const n = normal.clone().normalize();
    if (isOcean(this, n) && !canPlant(this, n)) return;
    const species = sid == null ? selSlot : sid;
    const civ = this.civOf(species);
    const g = new THREE.Group();
    const soldiers = this.life.filter((c) => c.userData.speciesId === species && c.userData.role === "soldier").length;
    g.userData.building = building || (soldiers > 0 && Math.random() < 0.4 ? "barracks" : "house");
    this.buildHutMesh(g, CIV_AGES[civ.ageIndex] || CIV_AGES[0]);
    g.userData.kind = "hut";
    g.userData.speciesId = species;
    g.userData.stores = 0;
    g.userData.hp = 40 + civ.ageIndex * 18;
    g.userData.maxHp = g.userData.hp;
    this.group.add(g);
    this.huts.push(g);
    startRise(g, n, this.radius * 0.88, this.radius * 1.02, ENTITY_SCALE);
    g.visible = true;
    this.refreshCiv(species);
    return g;
  }

  restyleHuts(sid) {
    for (const h of this.huts) {
      if (h.userData.dead) continue;
      if (sid != null && h.userData.speciesId !== sid) continue;
      const st = this.hutStyle(h.userData.speciesId);
      this.buildHutMesh(h, st);
      h.userData.hp = 40 + (this.civOf(h.userData.speciesId).ageIndex) * 18;
      h.userData.maxHp = h.userData.hp;
    }
  }

  refreshCiv(sid) {
    const civ = this.civOf(sid);
    const b = this.huts.filter((h) => h.userData.speciesId === sid).length;
    civ.score = civScore(civ, this.popOf(sid), b);
    this.ageIndex = Math.max(this.ageIndex, civ.ageIndex);
    for (const city of this.cities) if (city.speciesId === sid) this.syncCity(city);
  }

  tryAdvanceAge(sid) {
    const civ = this.civOf(sid);
    const next = CIV_AGES[civ.ageIndex + 1];
    if (!next) return;
    const b = this.huts.filter((h) => h.userData.speciesId === sid).length;
    const boost = Math.min(0.45, (civ.research || 0) * 0.015);
    if (civ.stores.wood >= next.wood * (1 - boost) && civ.stores.stone >= next.stone * (1 - boost) && civ.stores.food >= next.food * (1 - boost) && b >= 2) {
      civ.ageIndex++;
      civ.stores.wood = Math.max(0, civ.stores.wood - next.wood * 0.35);
      civ.stores.stone = Math.max(0, civ.stores.stone - next.stone * 0.35);
      civ.research = Math.max(0, (civ.research || 0) * 0.35);
      this.restyleHuts(sid);
      this.refreshCiv(sid);
      hudStatus.textContent = displayName(CREATURE_SLOTS[sid]) + " enters the " + (CIV_AGES[civ.ageIndex].name) + " age.";
    }
  }

  addCreature(dnaOrDef, normal, opts = {}) {
    if (this.life.length >= MAX_LIFE) return null;
    const n = normal.clone().normalize();
    const dna = dnaOrDef && dnaOrDef.torso != null ? dnaOrDef : CREATURE_SLOTS[selSlot];
    const speciesId = opts.speciesId != null ? opts.speciesId : (dna.id != null ? dna.id : selSlot);
    const grow = opts.grow != null ? opts.grow : 1;
    const mesh = makeCreatureMesh(dna, 1);
    const sc = (this.radius * 0.55 + 0.55) * ENTITY_SCALE * 1.15;
    mesh.scale.setScalar(sc * grow);
    mesh.userData = {
      dna,
      speciesId,
      def: { kind: "spore", diet: "gather", spd: 0.52, hp: 32, name: displayName(dna) },
      n,
      hunger: 0.2,
      wood: 0,
      stone: 0,
      food: 0,
      gold: 0,
      age: 0,
      t: Math.random() * 4,
      heading: Math.random() * 6.28,
      home: null,
      dead: false,
      hp: 32,
      maxHp: 32,
      inspireT: 0,
      sawGod: false,
      screamT: 0,
      aweT: 0,
      ackT: 0,
      grow,
      growT: grow < 1 ? 0 : 1,
      mateCd: 8 + Math.random() * 20,
      sc,
      skill: opts.skill ? { ...opts.skill } : zeroStats(),
      role: "forager",
      buildT: 0,
    };
    this.group.add(mesh);
    this.life.push(mesh);
    const land = isLand(this, n);
    const r1 = this.radius * (land ? 1.02 : 0.995);
    startRise(mesh, n, this.radius * 0.9, r1, sc * grow);
    mesh.userData.peg = this.addPegAt(n, dna.col || 0x88cc44);
    mesh.visible = this.surfaceLod;
    this.refreshCiv(speciesId);
    return mesh;
  }

  foundCity(n, sid) {
    let base = n.clone().normalize();
    if (isOcean(this, base) || !canPlant(this, base)) {
      const land = findPlantSpot(this, base, 40);
      if (!land) {
        hudStatus.textContent = (CREATURE_SLOTS[sid]?.name || "Settlers") + " find no land to settle.";
        return null;
      }
      base = land;
    }
    this.addHut(base, sid);
    for (let i = 0; i < 4; i++) {
      const off = base.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.12)).normalize();
      this.addHut(off, sid);
    }
    const flag = this.addFlag(base, sid);
    const city = {
      n: base.clone(),
      speciesId: sid,
      range: 0.1,
      flag,
      ring: null,
      paint: null,
      carts: 0,
      age: 0,
    };
    city.ring = this.addTerritoryRing(city);
    city.paint = this.addTerritoryPaint(city);
    this.cities.push(city);
    this.refreshCiv(sid);
    this.syncCity(city);
    this.spawnCart(city);
    hudStatus.textContent = (CREATURE_SLOTS[sid]?.name || "Spore") + " founds a city.";
    return city;
  }

  addFlag(n, sid) {
    const col = CREATURE_SLOTS[sid]?.col || 0xc4b48a;
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0035, 0.0055, 0.14, 6),
      new THREE.MeshLambertMaterial({ color: 0xc8b48a }),
    );
    pole.position.y = 0.05;
    g.add(pole);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.055, 0.032),
      new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }),
    );
    cloth.position.set(0.028, 0.105, 0);
    g.add(cloth);
    g.userData.kind = "flag";
    g.userData.n = n.clone();
    g.userData.speciesId = sid;
    this.group.add(g);
    sit(g, this, n, 0.988);
    g.scale.setScalar(ENTITY_SCALE);
    g.visible = true;
    return g;
  }

  cityRange(city) {
    const civ = this.civOf(city.speciesId);
    const passive = Math.min(0.3, (city.age || 0) * 0.0034);
    return 0.09 + passive + Math.min(0.42, (civ.score || 0) * 0.0018 + (this.huts.filter((h) => h.userData.speciesId === city.speciesId).length) * 0.012);
  }

  addTerritoryRing(city) {
    const segs = 48;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(segs * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineDashedMaterial({
      color: CREATURE_SLOTS[city.speciesId]?.col || 0xe6c56e,
      dashSize: 0.018,
      gapSize: 0.012,
      transparent: true,
      opacity: 0.92,
    });
    const line = new THREE.LineLoop(geo, mat);
    line.userData.kind = "territory";
    this.group.add(line);
    return line;
  }

  addTerritoryPaint(city) {
    const geo = new THREE.CircleGeometry(1, 40);
    const col = new THREE.Color(CREATURE_SLOTS[city.speciesId]?.col || 0xe6c56e);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.userData.kind = "territoryPaint";
    this.group.add(mesh);
    return mesh;
  }

  syncCity(city) {
    city.range = this.cityRange(city);
    const n = city.n.clone().normalize();
    const tangent = new THREE.Vector3(0, 1, 0).cross(n);
    if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
    tangent.normalize();
    if (city.flag) {
      sit(city.flag, this, n, 0.988);
      city.flag.scale.setScalar(ENTITY_SCALE);
      city.flag.visible = true;
    }
    if (city.ring) {
      const segs = city.ring.geometry.attributes.position.count;
      const pos = city.ring.geometry.attributes.position.array;
      const ang = city.range;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const q = new THREE.Quaternion().setFromAxisAngle(n, a);
        const dir = n.clone().multiplyScalar(Math.cos(ang)).add(tangent.clone().applyQuaternion(q).multiplyScalar(Math.sin(ang))).normalize();
        pos[i * 3] = dir.x * this.radius * 1.012;
        pos[i * 3 + 1] = dir.y * this.radius * 1.012;
        pos[i * 3 + 2] = dir.z * this.radius * 1.012;
      }
      city.ring.geometry.attributes.position.needsUpdate = true;
      city.ring.computeLineDistances();
      city.ring.visible = true;
    }
    if (city.paint) {
      const r = Math.sin(city.range) * this.radius * 1.01;
      city.paint.scale.setScalar(r);
      sit(city.paint, this, n, 1.006);
      city.paint.visible = true;
    }
  }

  addBoulder(normal) {
    const n = normal.clone().normalize();
    const g = new THREE.Group();
    const rock = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.028, 0),
      new THREE.MeshLambertMaterial({ color: 0x6a6864 }),
    );
    g.add(rock);
    const gold = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.01, 0),
      new THREE.MeshBasicMaterial({ color: 0xd4af37 }),
    );
    gold.position.set(0.012, 0.01, 0.006);
    g.add(gold);
    g.userData.kind = "boulder";
    g.userData.n = n;
    g.userData.stone = 8;
    g.userData.gold = 3;
    g.userData.hp = 40;
    this.group.add(g);
    this.boulders.push(g);
    sit(g, this, n, 1.012);
    g.scale.setScalar(ENTITY_SCALE);
    g.visible = this.surfaceLod;
    g.userData.peg = this.addPegAt(n, 0x8a8680);
    return g;
  }

  addVolcano(normal) {
    const n = normal.clone().normalize();
    const ocean = isOcean(this, n);
    if (ocean) paintAt(this.paint, uvFromN(n), 120, 7);
    const g = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.09, 8),
      new THREE.MeshLambertMaterial({ color: 0x3a2a22 }),
    );
    cone.position.y = 0.03;
    g.add(cone);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff5511 }),
    );
    glow.position.y = 0.072;
    g.add(glow);
    g.userData.kind = "volcano";
    g.userData.n = n;
    g.userData.grow = 0.12;
    g.userData.t = 0;
    g.userData.oceanBorn = ocean;
    this.group.add(g);
    this.volcanoes.push(g);
    sit(g, this, n, 0.995);
    g.scale.setScalar(ENTITY_SCALE * 0.12);
    g.visible = true;
    return g;
  }

  addTornado(normal) {
    const n = normal.clone().normalize();
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.012 + i * 0.006, 0.0025, 6, 16),
        new THREE.MeshBasicMaterial({ color: 0xc8d4e0, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02 + i * 0.022;
      g.add(ring);
    }
    g.userData.kind = "tornado";
    g.userData.n = n;
    g.userData.heading = Math.random() * 6.28;
    g.userData.t = 0;
    this.group.add(g);
    this.tornadoes.push(g);
    sit(g, this, n, 1.02);
    g.scale.setScalar(ENTITY_SCALE);
    g.visible = true;
    return g;
  }

  addMonolith(normal) {
    const n = normal.clone().normalize();
    const g = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.11, 0.012),
      new THREE.MeshLambertMaterial({ color: 0x1a1c22, emissive: 0x142028, emissiveIntensity: 0.4 }),
    );
    g.userData.kind = "monolith";
    g.userData.n = n;
    g.userData.civ = 100;
    g.userData.found = {};
    this.group.add(g);
    this.monoliths.push(g);
    sit(g, this, n, 1.02);
    g.scale.setScalar(ENTITY_SCALE);
    g.visible = true;
    g.userData.peg = this.addPegAt(n, 0x334455);
    return g;
  }

  addWreck(normal, col) {
    const n = normal.clone().normalize();
    const g = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.08, 6),
      new THREE.MeshLambertMaterial({ color: col || 0x6a7080 }),
    );
    hull.rotation.z = 0.9;
    hull.position.y = 0.02;
    g.add(hull);
    const shard = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.008, 0.018),
      new THREE.MeshLambertMaterial({ color: 0x445566 }),
    );
    shard.position.set(0.02, 0.01, 0);
    shard.rotation.y = 0.4;
    g.add(shard);
    g.userData.kind = "wreck";
    g.userData.n = n;
    g.userData.civ = 25;
    g.userData.found = {};
    this.group.add(g);
    this.wrecks.push(g);
    sit(g, this, n, 1.01);
    g.scale.setScalar(ENTITY_SCALE);
    g.visible = this.surfaceLod;
    g.userData.peg = this.addPegAt(n, 0x8899aa);
    return g;
  }

  spawnCart(city) {
    if (!city) return null;
    const n = city.n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.04)).normalize();
    const g = new THREE.Group();
    const bed = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.014, 0.022), new THREE.MeshLambertMaterial({ color: 0x6a4a28 }));
    bed.position.y = 0.012;
    g.add(bed);
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.004, 8), new THREE.MeshLambertMaterial({ color: 0x2a2a28 }));
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * 0.012, 0.007, 0.01);
      g.add(w);
    }
    g.userData.kind = "cart";
    g.userData.n = n;
    g.userData.speciesId = city.speciesId;
    g.userData.wood = 0;
    g.userData.stone = 0;
    g.userData.food = 0;
    g.userData.heldBy = null;
    this.group.add(g);
    this.carts.push(g);
    city.carts = (city.carts || 0) + 1;
    sit(g, this, n, 1.016);
    g.scale.setScalar(ENTITY_SCALE);
    g.visible = this.surfaceLod;
    return g;
  }

  addUfo() {
    if (this.ufos.length > 3) return;
    const u = makeUfo();
    u.userData.a = Math.random() * 6.28 + this.ufos.length * 1.3;
    u.userData.r = this.radius * (1.48 + this.ufos.length * 0.16);
    u.userData.phase = this.ufos.length * 1.1;
    u.userData.hp = 40;
    u.userData.maxHp = 40;
    u.userData.fireCd = 0;
    u.userData.sep = new THREE.Vector3();
    this.group.add(u);
    this.ufos.push(u);
  }

  addTemple(normal) {
    const n = normal.clone().normalize();
    const g = modelTemple(CREATURE_SLOTS[selSlot]?.col);
    g.userData.kind = "temple";
    g.userData.n = n;
    g.userData.t = 0;
    this.group.add(g);
    this.temples.push(g);
    startRise(g, n, this.radius * 0.7, this.radius * 1.03, ENTITY_SCALE * 1.28);
    g.visible = true;
    hudStatus.textContent = "A temple rises from " + this.template.name + ".";
    return g;
  }

  ensureDetail() {
    if (this.detailReady) return;
    if (this.uni.uLand.value < 0.12) return;
    this.detailReady = true;
    const veg = hsl(this.vegH, 0.6, 0.32);
    const grassMap = sprTex("grass-tall.png", false);
    for (let i = 0; i < 48; i++) {
      const n = new THREE.Vector3().randomDirection();
      if (!isLand(this, n) || this.arid > 0.7) continue;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: grassMap, transparent: true, depthWrite: false }));
      const sc = 0.028 * ENTITY_SCALE * (0.7 + Math.random() * 0.6);
      s.scale.set(sc, sc * 1.3, 1);
      s.center.set(0.5, 0);
      this.group.add(s);
      sitRadial(s, n, this.radius * 1.012);
      s.userData.n = n;
      s.visible = this.surfaceLod;
      this.groundDetail.push(s);
    }
    for (let i = 0; i < 18; i++) {
      const n = new THREE.Vector3().randomDirection();
      if (!isLand(this, n) || this.ice > 0.7) continue;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), new THREE.MeshBasicMaterial({ color: veg }));
      b.scale.set(1.2, 0.7, 1);
      this.group.add(b);
      sit(b, this, n, 1.012);
      b.scale.multiplyScalar(ENTITY_SCALE);
      b.userData.n = n;
      b.userData.kind = "bush";
      b.userData.food = 2;
      b.visible = this.surfaceLod;
      this.groundDetail.push(b);
    }
    for (let i = 0; i < 16; i++) {
      const n = new THREE.Vector3().randomDirection();
      if (!isLand(this, n)) continue;
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.016 + Math.random() * 0.012, 0), new THREE.MeshBasicMaterial({ color: this.arid > 0.5 ? 0xc2a070 : 0x6a6864 }));
      this.group.add(r);
      sit(r, this, n, 1.01);
      r.scale.setScalar(ENTITY_SCALE);
      r.userData.n = n;
      r.userData.kind = "rock";
      r.userData.stone = 3;
      r.visible = this.surfaceLod;
      this.groundDetail.push(r);
    }
  }

  splash(n, death) {
    const count = death ? 14 : 8;
    for (let i = 0; i < count; i++) {
      const col = i % 2 ? (death ? 0x8a8a8a : 0xff2244) : 0xaa2020;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.01, 4, 3), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1 }));
      const pos = this.group.position.clone().addScaledVector(n, this.radius * 1.03);
      p.position.copy(pos);
      const dir = n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.7)).normalize();
      p.userData = { vel: dir.multiplyScalar((death ? 1.6 : 1.1) * (0.4 + Math.random())), life: 0.35 + Math.random() * 0.25 };
      scene.add(p);
      fx.push(p);
    }
  }

  crumbleHut(h) {
    const n = h.userData.n;
    crumbleSfx();
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.01, 0.01), new THREE.MeshBasicMaterial({ color: 0x6a5a44, transparent: true }));
      p.position.copy(this.group.position).addScaledVector(n, this.radius * 1.03);
      p.userData = { vel: n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.8)).normalize().multiplyScalar(0.7 + Math.random()), life: 0.7 };
      scene.add(p);
      fx.push(p);
    }
    if (h.userData.peg) this.group.remove(h.userData.peg);
    this.group.remove(h);
    this.huts = this.huts.filter((x) => x !== h);
  }

  hurtLife(c, dmg) {
    const u = c.userData;
    u.hp -= dmg;
    this.splash(u.n, u.hp <= 0);
    c.traverse((o) => {
      if (o.material?.color) {
        o.material = o.material.clone();
        o.material.color.set(u.hp <= 0 ? 0x888888 : 0xff3355);
      }
    });
    u.tintT = 0.35;
    if (u.hp <= 0) {
      if (u.peg) this.group.remove(u.peg);
      if (u.bubble) c.remove(u.bubble);
      this.group.remove(c);
      this.life = this.life.filter((x) => x !== c);
      return true;
    }
    return false;
  }

  addFire(n, water) {
    const count = water ? 22 : 10;
    for (let i = 0; i < count; i++) {
      const col = water ? 0xb8c4cc : i < 4 ? 0xffee66 : 0xff5511;
      const p = new THREE.Mesh(new THREE.SphereGeometry(water ? 0.03 : 0.018, 5, 4), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: water ? 0.55 : 0.9, depthWrite: false }));
      this.group.add(p);
      const nn = n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.04)).normalize();
      sitRadial(p, nn, this.radius * (water ? 1.04 : 1.025) + Math.random() * 0.02);
      p.userData = { n: nn, life: water ? 1.8 + Math.random() : 4 + Math.random() * 3, water, rise: water ? 0.12 : 0.04 };
      this.fires.push(p);
    }
  }

  addCrater(n, power) {
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.07 * power, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x1a120c }),
    );
    this.group.add(bowl);
    sit(bowl, this, n, 0.985);
    bowl.scale.setScalar(power * ENTITY_SCALE * 1.4);
    this.craters.push(bowl);
  }

  crater(n, power = 1) {
    paintAt(this.paint, uvFromN(n), -110 * power, Math.round(5 + power * 4));
    this.addCrater(n, power);
    const water = isOcean(this, n);
    this.addFire(n, water);
    for (let i = this.trees.length - 1; i >= 0; i--) {
      if (this.trees[i].userData.n && this.trees[i].userData.n.dot(n) > 0.9) {
        if (this.trees[i].userData.peg) this.group.remove(this.trees[i].userData.peg);
        this.group.remove(this.trees[i]);
        this.trees.splice(i, 1);
      }
    }
    for (let i = this.bushes.length - 1; i >= 0; i--) {
      if (this.bushes[i].userData.n && this.bushes[i].userData.n.dot(n) > 0.9) {
        if (this.bushes[i].userData.peg) this.group.remove(this.bushes[i].userData.peg);
        this.group.remove(this.bushes[i]);
        this.bushes.splice(i, 1);
      }
    }
    for (let i = this.life.length - 1; i >= 0; i--) {
      const c = this.life[i];
      if (c.userData.n && c.userData.n.dot(n) > 0.91) this.hurtLife(c, 220);
    }
    for (let i = this.huts.length - 1; i >= 0; i--) {
      const h = this.huts[i];
      if (h.userData.n && h.userData.n.dot(n) > 0.9) {
        h.userData.hp -= 200;
        if (h.userData.hp <= 0) this.crumbleHut(h);
      }
    }
    for (let i = this.groundDetail.length - 1; i >= 0; i--) {
      const g = this.groundDetail[i];
      if (g.userData.n && g.userData.n.dot(n) > 0.93) {
        this.group.remove(g);
        this.groundDetail.splice(i, 1);
      }
    }
  }

  tickFires(dt) {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const p = this.fires[i];
      p.userData.life -= dt;
      if (p.userData.n) {
        sitRadial(p, p.userData.n, this.radius * 1.02 + (4 - Math.min(4, p.userData.life)) * p.userData.rise);
      }
      if (p.material.opacity != null) p.material.opacity = Math.max(0, p.userData.life * (p.userData.water ? 0.3 : 0.22));
      if (p.userData.life <= 0) {
        this.group.remove(p);
        this.fires.splice(i, 1);
      }
    }
  }

  tickWildGrowth(dt) {
    if (!this.born || (this.uni.uLand.value || 0) < 0.35) return;
    this.growAcc = (this.growAcc || 0) + dt;
    if (this.growAcc < 3.2) return;
    this.growAcc = 0;
    if (this.trees.length < 88 && Math.random() < 0.5) {
      const n = new THREE.Vector3().randomDirection();
      if (isLand(this, n) && canPlant(this, n)) this.addTree(n);
    }
    if (this.bushes.length < 70 && Math.random() < 0.62) {
      const n = new THREE.Vector3().randomDirection();
      if (isLand(this, n) && canPlant(this, n)) this.addBush(n);
    }
  }

  spawnMarine() {
    if (this.marines.length > 10) return;
    let n = null;
    for (let i = 0; i < 22; i++) {
      const t = new THREE.Vector3().randomDirection();
      if (isOcean(this, t)) {
        n = t;
        break;
      }
    }
    if (!n) return;
    const kind = Math.random() < 0.42 ? "whale" : "dolphin";
    const g = new THREE.Group();
    const sil = new THREE.MeshBasicMaterial({ color: 0x0a1218, transparent: true, opacity: 0.82 });
    if (kind === "whale") {
      const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.006, 0.022), sil);
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.005, 0.018), sil);
      left.position.set(-0.03, 0, 0);
      left.rotation.z = 0.35;
      const right = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.005, 0.018), sil);
      right.position.set(0.03, 0, 0);
      right.rotation.z = -0.35;
      g.add(fluke, left, right);
    } else {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.04, 3, 6), sil);
      body.rotation.z = Math.PI / 2;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.018, 4), sil);
      fin.position.set(0, 0.012, 0);
      g.add(body, fin);
    }
    g.userData.kind = kind;
    g.userData.n = n;
    g.userData.t = 0;
    g.userData.heading = Math.random() * 6.28;
    this.group.add(g);
    this.marines.push(g);
    sitRadial(g, n, this.radius * 1.002);
    g.scale.setScalar(ENTITY_SCALE * (kind === "whale" ? 1.4 : 1));
    g.visible = true;
  }

  tickMarines(dt) {
    this.marineCd = (this.marineCd || 0) - dt;
    if (this.marineCd <= 0 && (this.uni.uLand.value || 0) > 0.28) {
      this.marineCd = 3.8 + Math.random() * 6;
      this.spawnMarine();
    }
    for (let i = this.marines.length - 1; i >= 0; i--) {
      const m = this.marines[i];
      m.userData.t += dt;
      const n = m.userData.n;
      if (m.userData.kind === "whale") {
        const t = m.userData.t;
        const lift = Math.max(0, Math.sin(t * 2.1) * 0.035);
        sitRadial(m, n, this.radius * (1.0 + lift));
        m.rotation.z = Math.sin(t * 3.2) * 0.4;
        if (t > 0.55 && t < 0.7 && !m.userData.splashed) {
          m.userData.splashed = true;
          this.addFire(n, true);
        }
        if (t > 2.8) {
          this.group.remove(m);
          this.marines.splice(i, 1);
        }
      } else {
        const t = m.userData.t;
        const u = t / 1.45;
        if (u >= 1) {
          this.group.remove(m);
          this.marines.splice(i, 1);
          continue;
        }
        const axis = new THREE.Vector3().crossVectors(n, new THREE.Vector3(Math.cos(m.userData.heading), 0, Math.sin(m.userData.heading)));
        if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
        n.applyAxisAngle(axis.normalize(), dt * 0.35);
        n.normalize();
        sitRadial(m, n, this.radius * (1.0 + Math.sin(u * Math.PI) * 0.07));
        m.rotation.x = Math.sin(u * Math.PI) * 0.6;
      }
    }
  }

  assignRoles(sid) {
    const pop = this.life.filter((c) => c.userData.speciesId === sid && !c.userData.dead && (c.userData.growT || 1) >= 1);
    const n = pop.length;
    if (!n) return;
    const civ = this.civOf(sid);
    const plan = [
      { id: "woodcutter", skill: "wood", count: Math.max(1, Math.ceil(n * 0.26)) },
      { id: "forager", skill: "food", count: Math.max(1, Math.ceil(n * 0.2)) },
      { id: "mason", skill: "stone", count: n >= 3 ? Math.max(1, Math.ceil(n * 0.16)) : 0 },
      { id: "builder", skill: "build", count: n >= 4 ? Math.max(1, Math.ceil(n * 0.12)) : 0 },
      { id: "researcher", skill: "research", count: n >= 6 && civ.ageIndex >= 1 ? Math.max(1, Math.ceil(n * 0.08)) : 0 },
      { id: "soldier", skill: "protect", count: n >= 7 && civ.ageIndex >= 2 ? Math.max(1, Math.ceil(n * 0.16)) : 0 },
      { id: "miner", skill: "stone", count: n >= 10 && civ.ageIndex >= 3 ? Math.max(1, Math.ceil(n * 0.08)) : 0 },
    ];
    const used = new Set();
    for (const role of plan) {
      const pool = pop.filter((c) => !used.has(c)).sort((a, b) => skillEff(b.userData, role.skill) - skillEff(a.userData, role.skill));
      for (let i = 0; i < role.count && i < pool.length; i++) {
        pool[i].userData.role = role.id;
        used.add(pool[i]);
      }
    }
    for (const c of pop) if (!used.has(c)) c.userData.role = "forager";
  }

  tickRoleWork(c, dt, buff) {
    const u = c.userData;
    const civ = this.civOf(u.speciesId);
    const gather = 0.7 * buff * (u.cart ? 2.2 : 1);
    const cap = u.cart ? 10 : 4;
    const tree = nearestDot(this.trees, u.n);
    const boulder = nearestDot(this.boulders, u.n);
    const rock = nearestKind(this.groundDetail, u.n, "rock");
    const bush = nearestDot(this.bushes, u.n) || nearestKind(this.groundDetail, u.n, "bush");
    const mono = nearestDot(this.monoliths.filter((m) => !m.userData.found[u.speciesId]), u.n);
    const wreck = nearestDot(this.wrecks.filter((m) => !m.userData.found[u.speciesId]), u.n);
    const home = this.huts.find((h) => h.userData.speciesId === u.speciesId) || this.huts[0];
    const city = this.cities.find((ct) => ct.speciesId === u.speciesId);
    const role = u.role || "forager";
    if (mono && mono.userData.n.dot(u.n) > 0.92) {
      steerToward(u, mono.userData.n, dt * 1.8);
      if (mono.userData.n.dot(u.n) > 0.988) {
        mono.userData.found[u.speciesId] = true;
        civ.bonus = (civ.bonus || 0) + (mono.userData.civ || 100);
        this.refreshCiv(u.speciesId);
        hudStatus.textContent = displayName(CREATURE_SLOTS[u.speciesId]) + " discovers a monolith (+100 civ).";
      }
      return;
    }
    if (wreck && wreck.userData.n.dot(u.n) > 0.92) {
      steerToward(u, wreck.userData.n, dt * 1.7);
      if (wreck.userData.n.dot(u.n) > 0.988) {
        wreck.userData.found[u.speciesId] = true;
        civ.bonus = (civ.bonus || 0) + (wreck.userData.civ || 25);
        this.refreshCiv(u.speciesId);
        hudStatus.textContent = displayName(CREATURE_SLOTS[u.speciesId]) + " scavenges a wreck (+25 civ).";
      }
      return;
    }
    const depositHome = () => {
      if (!home) return false;
      if (home.userData.n.dot(u.n) > 0.98) {
        civ.stores.wood += u.wood;
        civ.stores.stone += u.stone;
        civ.stores.food += u.food;
        civ.stores.gold = (civ.stores.gold || 0) + (u.gold || 0);
        u.wood = u.stone = u.food = 0;
        u.gold = 0;
        this.tryAdvanceAge(u.speciesId);
        if (city) {
          this.syncCity(city);
          if ((city.carts || 0) < 1 + Math.floor((civ.score || 0) / 80)) this.spawnCart(city);
        }
        return true;
      }
      steerToward(u, home.userData.n, dt);
      return false;
    };
    if (role === "woodcutter" && tree) {
      if (u.wood >= cap) { depositHome(); return; }
      steerToward(u, tree.userData.n, dt * 1.6 * skillEff(u, "wood"));
      if (tree.userData.n.dot(u.n) > 0.985) {
        u.wood += dt * gather * skillEff(u, "wood");
        u.food += dt * 0.12 * buff;
        u.hunger = Math.max(0, u.hunger - dt * 0.2);
        tree.userData.wood = Math.max(0.2, (tree.userData.wood || 3) - dt * 0.2);
        gainSkill(u, "wood", dt);
      }
      return;
    }
    if (role === "forager" && bush) {
      if (u.food >= cap) { depositHome(); return; }
      steerToward(u, bush.userData.n, dt * 1.45 * skillEff(u, "food"));
      if (bush.userData.n.dot(u.n) > 0.985) {
        u.food += dt * 0.55 * buff * skillEff(u, "food");
        u.hunger = Math.max(0, u.hunger - dt * 0.28);
        bush.userData.food = Math.max(0.1, (bush.userData.food || 3) - dt * 0.3);
        gainSkill(u, "food", dt);
      }
      return;
    }
    if ((role === "mason" || role === "miner") && (boulder || rock)) {
      if (u.stone >= cap) { depositHome(); return; }
      const src = boulder || rock;
      steerToward(u, src.userData.n, dt * 1.5 * skillEff(u, "stone"));
      if (src.userData.n.dot(u.n) > 0.985) {
        u.stone += dt * 0.5 * buff * skillEff(u, "stone");
        if (boulder && role === "miner") u.gold = (u.gold || 0) + dt * 0.22 * buff * skillEff(u, "stone");
        if (src.userData.stone != null) src.userData.stone -= dt * 0.35;
        if (src.userData.gold != null) src.userData.gold -= dt * 0.12;
        gainSkill(u, "stone", dt);
        if (boulder && (boulder.userData.stone || 0) <= 0 && (boulder.userData.gold || 0) <= 0) {
          if (boulder.userData.peg) this.group.remove(boulder.userData.peg);
          this.group.remove(boulder);
          this.boulders = this.boulders.filter((x) => x !== boulder);
        }
      }
      return;
    }
    if (role === "builder") {
      if (u.wood < 2 && tree) {
        steerToward(u, tree.userData.n, dt * 1.5);
        if (tree.userData.n.dot(u.n) > 0.985) {
          u.wood += dt * gather * skillEff(u, "wood");
          gainSkill(u, "wood", dt, 0.01);
        }
        return;
      }
      u.buildT = (u.buildT || 0) + dt * skillEff(u, "build");
      if (u.buildT > 3.6 && this.huts.filter((h) => h.userData.speciesId === u.speciesId).length < 18) {
        this.addHut(u.n, u.speciesId);
        u.buildT = 0;
        u.wood = Math.max(0, u.wood - 2);
        civ.stores.wood += 0.4;
        gainSkill(u, "build", 1, 0.35);
        this.tryAdvanceAge(u.speciesId);
        if (city) this.syncCity(city);
      }
      return;
    }
    if (role === "researcher" && home) {
      steerToward(u, home.userData.n, dt * 1.1);
      civ.research = (civ.research || 0) + dt * 0.4 * skillEff(u, "research");
      gainSkill(u, "research", dt);
      this.tryAdvanceAge(u.speciesId);
      return;
    }
    if (role === "soldier") {
      const prey = this.life.find((o) => o !== c && !o.userData.dead && (isWar(relations, u.speciesId, o.userData.speciesId) || o.userData.def.diet === "meat") && o.userData.n.dot(u.n) > 0.7);
      if (prey) {
        steerToward(u, prey.userData.n, dt * 2.2 * skillEff(u, "protect"));
        if (prey.userData.n.dot(u.n) > 0.993) {
          this.hurtLife(prey, (10 * dt + 2) * skillEff(u, "combat"));
          gainSkill(u, "combat", dt, 0.05);
          gainSkill(u, "protect", dt, 0.04);
        }
        return;
      }
      if (city) {
        u.heading += dt * 0.4;
        steerToward(u, city.n, dt * 0.4);
      }
      gainSkill(u, "protect", dt, 0.006);
      return;
    }
    if (tree && u.wood < cap) {
      steerToward(u, tree.userData.n, dt * 1.6);
      if (tree.userData.n.dot(u.n) > 0.985) {
        u.wood += dt * gather * skillEff(u, "wood");
        gainSkill(u, "wood", dt);
      }
    } else if (home) depositHome();
  }

  tickLife(dt, godN, formId) {
    this.tickWildGrowth(dt);
    this.tickMarines(dt);
    this.roleT = (this.roleT || 0) + dt;
    if (this.roleT > 2.4) {
      this.roleT = 0;
      const sids = new Set(this.life.map((c) => c.userData.speciesId));
      for (const sid of sids) this.assignRoles(sid);
    }
    for (let i = this.trees.length - 1; i >= 0; i--) {
      const t = this.trees[i];
      tickRise(t, dt);
      if (!t.userData.n) continue;
      if (isOcean(this, t.userData.n) || !canPlant(this, t.userData.n)) {
        if (t.userData.peg) this.group.remove(t.userData.peg);
        this.group.remove(t);
        this.trees.splice(i, 1);
        continue;
      }
      t.userData.age = (t.userData.age || 0) + dt;
      t.userData.growS = Math.min(1, 0.28 + t.userData.age / 70);
      if (t.userData.rise == null || t.userData.rise >= 1) {
        sitRadial(t, t.userData.n, this.radius * 1.015);
        t.scale.setScalar(ENTITY_SCALE * t.userData.growS);
        t.visible = this.surfaceLod;
        if (t.userData.peg) {
          sit(t.userData.peg, this, t.userData.n, 1.018);
          t.userData.peg.visible = !this.surfaceLod;
        }
      }
    }
    for (let i = this.bushes.length - 1; i >= 0; i--) {
      const t = this.bushes[i];
      tickRise(t, dt);
      if (!t.userData.n) continue;
      if (isOcean(this, t.userData.n) || !canPlant(this, t.userData.n)) {
        if (t.userData.peg) this.group.remove(t.userData.peg);
        this.group.remove(t);
        this.bushes.splice(i, 1);
        continue;
      }
      t.userData.age = (t.userData.age || 0) + dt;
      t.userData.growS = Math.min(1, 0.35 + t.userData.age / 55);
      if (t.userData.rise == null || t.userData.rise >= 1) {
        sitRadial(t, t.userData.n, this.radius * 1.014);
        t.scale.setScalar(ENTITY_SCALE * t.userData.growS);
        t.visible = this.surfaceLod;
        if (t.userData.peg) {
          sit(t.userData.peg, this, t.userData.n, 1.016);
          t.userData.peg.visible = !this.surfaceLod;
        }
      }
    }
    for (const h of this.huts) {
      tickRise(h, dt);
      if (h.userData.n && h.userData.rise >= 1) {
        const dry = isLand(this, h.userData.n);
        sitRadial(h, h.userData.n, this.radius * (dry ? 1.02 : 0.97));
        h.visible = dry;
        if (h.userData.lodNear) h.userData.lodNear.visible = this.surfaceLod && dry;
        if (h.userData.lodFar) h.userData.lodFar.visible = !this.surfaceLod && dry;
        if (h.userData.peg) h.userData.peg.visible = false;
      }
    }
    const nearGod = !!godN;
    for (const c of this.life) {
      tickRise(c, dt);
      if (c.userData.rise < 1) continue;
      const u = c.userData;
      const def = u.def;
      u.age += dt;
      u.hunger += dt * (def.diet === "meat" ? 0.08 : 0.05);
      u.t += dt;
      if (u.inspireT > 0) u.inspireT -= dt;
      if (u.screamT > 0) u.screamT -= dt;
      if (u.aweT > 0) u.aweT -= dt;
      if (u.ackT > 0) u.ackT -= dt;
      if (u.growT != null && u.growT < 1) {
        u.growT = Math.min(1, u.growT + dt / 60);
        u.grow = 0.5 + 0.5 * u.growT;
        const s = (u.sc || ENTITY_SCALE) * u.grow;
        c.scale.setScalar(s);
      }
      if (u.mateCd > 0) u.mateCd -= dt;
      if (u.tintT > 0) {
        u.tintT -= dt;
      }
      if (u.bubble) {
        u.bubbleT -= dt;
        if (u.bubbleT <= 0) {
          c.remove(u.bubble);
          u.bubble.material?.map?.dispose();
          u.bubble = null;
        }
      }
      const land = isLand(this, u.n);
      const aquatic = dnaIsAquatic(u.dna);
      const buff = u.inspireT > 0 ? 1.45 : 1;
      let wetMul = 1;
      if (!land) {
        wetMul = aquatic ? 0.72 : 0.28;
        if (!aquatic) {
          const dry = seekHigherGround(this, u.n);
          if (dry) steerToward(u, dry, dt * 3.2);
        }
      }
      const spd = def.spd * wetMul * (this.radius * 0.12) * buff * skillEff(u, "speed");
      u.usedSkill = null;
      const godClose = nearGod && godN.dot(u.n) > 0.88;

      if (formId && godClose && this.surfaceLod) {
        if (formId === "fearsome") {
          steerToward(u, godN, -dt * 3.2);
          if (u.screamT <= 0) {
            u.screamT = 1.6 + Math.random();
            screamSfx();
            sayOn(c, ["Aaaa!", "Run!", "A monster!", "Flee!"][Math.floor(Math.random() * 4)]);
          }
        } else if (formId === "divine") {
          steerToward(u, godN, dt * 2.4);
          if (u.aweT <= 0) {
            u.aweT = 3.2;
            sayOn(c, ["A god!", "Bless us!", "We are seen!", "A vision!"][Math.floor(Math.random() * 4)]);
          }
        } else if (formId === "inspire") {
          if (!u.sawGod) {
            u.sawGod = true;
            u.ackT = 1.15;
            sayOn(c, ["A sign!", "Forward!", "For the spirit!"][Math.floor(Math.random() * 3)]);
          }
          if (u.ackT > 0) steerToward(u, godN, dt * 2.0);
          if (u.inspireT <= 0) u.inspireT = 60;
        }
      }

      if (u.t > 2.2) {
        u.heading = Math.random() * 6.28;
        u.t = 0;
      }
      if (!u.rite && this.temples.length && Math.random() < dt * 0.14) {
        const city = this.cities.find((ct) => ct.speciesId === u.speciesId);
        const tem = this.temples.find((t) => {
          if (!t.userData.n) return false;
          if (city) return t.userData.n.dot(city.n) > Math.cos(Math.min(1.15, city.range + 0.1));
          return t.userData.n.dot(u.n) > 0.8;
        });
        if (tem) {
          u.rite = true;
          u.riteTemple = tem;
          u.riteAng = Math.random() * 6.28;
        }
      }
      if (u.rite && u.riteTemple && u.riteTemple.parent) {
        u.riteT = (u.riteT || 0) + dt;
        u.riteAng = (u.riteAng || 0) + dt * 0.65;
        const tn = u.riteTemple.userData.n;
        let tangent = new THREE.Vector3(0, 1, 0).cross(tn);
        if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
        tangent.normalize();
        const q = new THREE.Quaternion().setFromAxisAngle(tn, u.riteAng);
        const ring = 0.14;
        u.n.copy(tn).multiplyScalar(Math.cos(ring)).add(tangent.applyQuaternion(q).multiplyScalar(Math.sin(ring))).normalize();
        if (u.riteT > 16 + Math.random() * 18) {
          u.rite = false;
          u.riteTemple = null;
          u.riteT = 0;
        }
      } else if (!u.rite) {
        u.riteTemple = null;
      } else {
        u.rite = false;
        u.riteTemple = null;
      }
      if (u.growT >= 1 && u.mateCd <= 0 && this.life.length < MAX_LIFE) {
        for (const o of this.life) {
          if (o === c || o.userData.dead || o.userData.speciesId !== u.speciesId) continue;
          if ((o.userData.growT || 1) < 1 || o.userData.mateCd > 0) continue;
          if (o.userData.n.dot(u.n) > 0.945 && Math.random() < dt * 0.09) {
            u.mateCd = 38;
            o.userData.mateCd = 38;
            spawnHeart(this, u.n);
            this.addCreature(CREATURE_SLOTS[u.speciesId], u.n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.05)).normalize(), { speciesId: u.speciesId, grow: 0.5, skill: inheritSkill(u, o.userData) });
            break;
          }
        }
      }
      if (u.rite) {
        /* circle march around the temple */
      } else if (formId === "fearsome" && godClose) {
        /* flee already steered */
      } else if (def.diet === "plant") {
        const tree = nearestDot(this.trees, u.n);
        if (tree && tree.userData.n.dot(u.n) > 0.96) {
          tree.userData.food -= dt * 0.8;
          u.hunger = Math.max(0, u.hunger - dt * 0.4);
          if (tree.userData.food <= 0) {
            tree.userData.food = 0.01;
          }
        } else if (tree) steerToward(u, tree.userData.n, dt * 1.4);
      } else if (def.diet === "meat") {
        const prey = this.life.find((o) => o !== c && !o.userData.dead && o.userData.def.diet !== "meat" && o.userData.n.dot(u.n) > 0.3);
        if (prey) {
          steerToward(u, prey.userData.n, dt * 2.2 * skillEff(u, "combat"));
          if (prey.userData.n.dot(u.n) > 0.995) {
            const dmg = 14 * (u.inspireT > 0 ? 1.5 : 1) * skillEff(u, "combat");
            this.hurtLife(prey, dmg);
            gainSkill(u, "combat", dt, 0.08);
            u.hunger = 0;
          }
        }
      } else if (def.kind === "human" || def.kind === "spore") {
        const foe = this.life.find((o) => o !== c && !o.userData.dead && isWar(relations, u.speciesId, o.userData.speciesId) && o.userData.n.dot(u.n) > 0.92);
        if (foe && (u.role === "soldier" || !u.role)) {
          steerToward(u, foe.userData.n, dt * 2.1 * skillEff(u, "combat"));
          if (foe.userData.n.dot(u.n) > 0.993) {
            this.hurtLife(foe, (9 * dt + 2) * skillEff(u, "combat"));
            gainSkill(u, "combat", dt, 0.05);
            gainSkill(u, "protect", dt, 0.03);
          }
        }
        const mate = !foe && this.life.find((o) => o !== c && !o.userData.dead && o.userData.speciesId === u.speciesId && o.userData.growT >= 1 && o.userData.n.dot(u.n) > 0.9);
        if (mate && u.growT >= 1 && u.mateCd <= 0 && mate.userData.n.dot(u.n) > 0.988) {
          u.mateCd = 60;
          mate.userData.mateCd = 60;
          spawnHeart(this, u.n);
          if (Math.random() < 0.5) {
            this.addCreature(CREATURE_SLOTS[u.speciesId], u.n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.04)).normalize(), { speciesId: u.speciesId, grow: 0.5, skill: inheritSkill(u, mate.userData) });
          }
        } else if (mate && u.mateCd <= 8) steerToward(u, mate.userData.n, dt * 1.2);
        const threat = this.life.find((o) => o.userData.def.diet === "meat" && o.userData.n.dot(u.n) > 0.97);
        if (threat && u.role !== "soldier" && !(formId === "divine" && godClose)) steerToward(u, threat.userData.n, -dt * 2.5);
        else if (!foe && !(formId === "divine" && godClose) && !(formId === "inspire" && u.ackT > 0)) {
          this.tickRoleWork(c, dt, buff);
        }
      }
      if (u.skill) {
        for (const k of LIFE_SKILLS) {
          if (k === u.usedSkill) continue;
          const base = (u.dna && u.dna.stats && u.dna.stats[k]) || 0;
          u.skill[k] = Math.max(-base * 0.2, (u.skill[k] || 0) - dt * 0.001);
        }
      }
      if (u.hunger > 1.6) {
        this.hurtLife(c, 999);
        continue;
      }
      if (!u.rite && (land || aquatic)) {
        const axis = new THREE.Vector3().crossVectors(u.n, new THREE.Vector3(Math.cos(u.heading), 0, Math.sin(u.heading)));
        if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
        axis.normalize();
        u.n.applyAxisAngle(axis, spd * dt);
        u.n.normalize();
      }
      const r = this.radius * (land ? 1.02 : 0.992);
      sitRadial(c, u.n, r);
      if (u.peg) sit(u.peg, this, u.n, 1.018);
      if (u.cart) {
        u.cart.userData.n.copy(u.n);
        sit(u.cart, this, u.n, 1.016);
        u.cart.visible = this.surfaceLod;
      }
      c.visible = this.surfaceLod;
      if (u.peg) u.peg.visible = !this.surfaceLod;
      if (u.def.sheet && c.material?.map) {
        const f = Math.floor(performance.now() * 0.006 + u.age) % 4;
        c.material.map.offset.x = f * 0.25;
      }
      if (c.userData.s1w) c.scale.set(c.userData.s1w, c.userData.s1h * (land ? 1 : 0.72), 1);
      c.traverse((ch) => {
        if (ch.name && ch.name.startsWith("leg")) {
          ch.rotation.x = 0.22 + Math.sin(u.age * 9 + ch.position.x * 12) * 0.42;
          ch.rotation.z = Math.sin(u.age * 4.5 + ch.position.z) * 0.12;
        }
        if (ch.name && ch.name.startsWith("arm")) {
          ch.rotation.y = Math.sin(u.age * 6 + ch.position.x * 8) * 0.32;
          ch.rotation.z = (ch.position.x > 0 ? -0.9 : 0.9) + Math.sin(u.age * 5.2) * 0.18;
        }
        if (ch.name === "torso") ch.position.y = Math.sin(u.age * 7.5) * 0.004;
        if (ch.name === "head") ch.rotation.y = Math.sin(u.age * 2.4) * 0.18;
      });
    }
    for (let i = this.ufos.length - 1; i >= 0; i--) {
      const u = this.ufos[i];
      if (u.userData.dying) continue;
      u.userData.a += dt * 0.35;
      const r = u.userData.r || this.radius * 1.55;
      u.position.set(Math.cos(u.userData.a) * r, Math.sin(u.userData.a * 0.7 + (u.userData.phase || 0)) * this.radius * 0.4, Math.sin(u.userData.a) * r);
      if (u.userData.sep) {
        u.position.add(u.userData.sep);
        u.userData.sep.multiplyScalar(0.84);
      }
      u.lookAt(0, 0, 0);
    }
    this.tickHazards(dt);
    this.tickCivExpand(dt);
    for (const city of this.cities) this.syncCity(city);
  }

  tickCivExpand(dt) {
    const bySid = {};
    for (const city of this.cities) {
      city.age = (city.age || 0) + dt;
      const sid = city.speciesId;
      if (!bySid[sid]) bySid[sid] = [];
      bySid[sid].push(city);
    }
    for (const key of Object.keys(bySid)) {
      const sid = +key;
      const pop = this.popOf(sid);
      const nCities = bySid[sid].length;
      const civ = this.civOf(sid);
      civ.launchCd = Math.max(0, (civ.launchCd || 0) - dt);
      civ.scoutCd = Math.max(0, (civ.scoutCd || 0) - dt);
      this.tryAdvanceAge(sid);
      const need = [7, 14, 22, 32, 44][Math.min(nCities, 4)];
      if (pop >= need && nCities < 5 && civ.launchCd <= 0 && civ.ageIndex >= 1) {
        civ.launchCd = 48;
        const from = bySid[sid][0];
        const pos = this.group.position.clone().addScaledVector(from.n, this.radius * 1.42);
        let tangent = new THREE.Vector3().crossVectors(from.n, new THREE.Vector3(0, 1, 0));
        if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
        spawnShip("settler", pos, tangent.normalize(), this, sid);
        hudStatus.textContent = (CREATURE_SLOTS[sid]?.name || "Spore") + " sends settlers to found a new city.";
      }
      if (civ.ageIndex >= 5 && civ.launchCd <= 0 && pop >= 10) {
        const other = worlds.find((w) => w !== this && w.born && !w.cities.some((c) => c.speciesId === sid));
        if (other) {
          civ.launchCd = 90;
          const from = bySid[sid][0];
          const pos = this.group.position.clone().addScaledVector(from.n, this.radius * 1.52);
          const dir = other.group.position.clone().sub(pos).normalize();
          spawnShip("settler", pos, dir, other, sid);
          hudStatus.textContent = (CREATURE_SLOTS[sid]?.name || "Spore") + " launches a colony ship toward " + other.template.name + ".";
        }
      }
      if (civ.ageIndex >= 3 && civ.scoutCd <= 0 && pop >= 6) {
        const hasScout = ships.some((s) => !s.dead && s.kind === "scout" && s.speciesId === sid);
        if (!hasScout) {
          civ.scoutCd = 88;
          const from = bySid[sid][0];
          const pos = this.group.position.clone().addScaledVector(from.n, this.radius * 1.46);
          spawnShip("scout", pos, from.n.clone(), this, sid);
        }
      }
    }
  }

  tickHazards(dt) {
    for (const v of this.volcanoes) {
      v.userData.grow = Math.min(1, v.userData.grow + dt * 0.18);
      v.userData.t += dt;
      sit(v, this, v.userData.n, 0.995);
      v.scale.setScalar(ENTITY_SCALE * (0.35 + v.userData.grow * 1.1));
      v.visible = true;
      const oceanNow = isOcean(this, v.userData.n);
      if (v.userData.oceanBorn || oceanNow) {
        paintAt(this.paint, uvFromN(v.userData.n), 22, 3);
        if (v.userData.t % 0.9 < dt + 0.02) {
          const off = v.userData.n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.08)).normalize();
          paintAt(this.paint, uvFromN(off), 14, 2);
        }
      } else if (v.userData.grow > 0.28 && Math.random() < dt * 2.4 && this.lavas.length < 40) {
        const lava = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xff4411 }),
        );
        lava.scale.set(1.7, 0.32, 1.7);
        lava.userData.n = v.userData.n.clone();
        lava.userData.life = 7 + Math.random() * 5;
        this.group.add(lava);
        this.lavas.push(lava);
        sit(lava, this, lava.userData.n, 1.01);
      }
      if (v.userData.grow > 0.35 && (v.userData.t % 0.28) < dt + 0.02) {
        const p = new THREE.Mesh(
          new THREE.SphereGeometry(0.01, 5, 4),
          new THREE.MeshBasicMaterial({ color: Math.random() < 0.4 ? 0xffee66 : 0xff4411, transparent: true, opacity: 0.9 }),
        );
        this.group.add(p);
        const nn = v.userData.n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.04)).normalize();
        sitRadial(p, nn, this.radius * 1.05);
        p.userData = { n: nn, life: 1.4 + Math.random(), water: false, rise: 0.12 };
        this.fires.push(p);
        paintAt(this.paint, uvFromN(v.userData.n), v.userData.oceanBorn ? 8 : -8, 2);
        for (const c of this.life) {
          if (c.userData.n && c.userData.n.dot(v.userData.n) > 0.985) this.hurtLife(c, 8 * dt);
        }
      }
    }
    for (const t of this.tornadoes) {
      t.userData.t += dt;
      t.userData.heading += dt * 0.35;
      const axis = new THREE.Vector3().crossVectors(t.userData.n, new THREE.Vector3(Math.cos(t.userData.heading), 0, Math.sin(t.userData.heading)));
      if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
      t.userData.n.applyAxisAngle(axis.normalize(), dt * 0.22);
      t.userData.n.normalize();
      t.rotation.y += dt * 8;
      sit(t, this, t.userData.n, 1.02);
      t.visible = true;
      for (const c of this.life) {
        if (c.userData.n && c.userData.n.dot(t.userData.n) > 0.97) {
          steerToward(c.userData, t.userData.n, -dt * 2.4);
          this.hurtLife(c, 3 * dt);
        }
      }
    }
    for (const b of this.boulders) {
      if (b.userData.n) sit(b, this, b.userData.n, 1.012);
      b.visible = this.surfaceLod;
      if (b.userData.peg) b.userData.peg.visible = !this.surfaceLod;
    }
    for (const m of this.monoliths) {
      if (m.userData.n) sit(m, this, m.userData.n, 1.02);
      m.visible = this.surfaceLod;
      if (m.userData.peg) m.userData.peg.visible = !this.surfaceLod;
    }
    for (const w of this.wrecks) {
      if (w.userData.n) sit(w, this, w.userData.n, 1.01);
      w.visible = this.surfaceLod;
      if (w.userData.peg) w.userData.peg.visible = !this.surfaceLod;
    }
    for (const k of this.carts) {
      if (k.userData.n) sit(k, this, k.userData.n, 1.016);
      k.visible = this.surfaceLod;
    }
    for (const t of this.temples) {
      tickRise(t, dt);
      if (t.userData.n && (t.userData.rise == null || t.userData.rise >= 1)) sit(t, this, t.userData.n, 1.03);
      t.visible = true;
    }
    this.tickLavas(dt);
  }

  tickLavas(dt) {
    for (let i = this.lavas.length - 1; i >= 0; i--) {
      const lava = this.lavas[i];
      lava.userData.life -= dt;
      const n = lava.userData.n;
      let best = n;
      let bh = heightOf(this, n);
      for (let k = 0; k < 6; k++) {
        const t = n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.05)).normalize();
        const h = heightOf(this, t);
        if (h < bh) {
          bh = h;
          best = t;
        }
      }
      n.lerp(best, dt * 0.85).normalize();
      sit(lava, this, n, 1.01);
      lava.visible = true;
      paintAt(this.paint, uvFromN(n), -3, 1);
      for (const c of this.life) {
        if (c.userData.n && c.userData.n.dot(n) > 0.988) this.hurtLife(c, 14 * dt);
      }
      if (lava.userData.life <= 0) {
        this.group.remove(lava);
        this.lavas.splice(i, 1);
      }
    }
  }
}

function nearestDot(arr, n) {
  let best = null, bd = -1;
  for (const o of arr) {
    const d = o.userData.n ? o.userData.n.dot(n) : -1;
    if (d > bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}
function nearestKind(arr, n, kind) {
  let best = null, bd = -1;
  for (const o of arr) {
    if (o.userData.kind !== kind || !o.userData.n) continue;
    const d = o.userData.n.dot(n);
    if (d > bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}
function steerToward(u, targetN, k) {
  u.n.lerp(targetN, Math.max(-0.08, Math.min(0.08, k)));
  u.n.normalize();
}
function gainSkill(u, key, dt, rate = 0.018) {
  if (!u.skill) u.skill = zeroStats();
  const base = (u.dna && u.dna.stats && u.dna.stats[key]) || 0;
  const cap = 100 - base;
  u.skill[key] = Math.min(cap, (u.skill[key] || 0) + dt * rate);
  u.usedSkill = key;
}

function spawnHeart(world, n) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0xff6688,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  }));
  s.scale.set(0.06, 0.06, 1);
  world.group.add(s);
  sitRadial(s, n, world.radius * 1.06);
  s.userData = { vel: n.clone().multiplyScalar(0.18), life: 1.2, heart: true, n: n.clone(), world };
  fx.push(s);
}

const fx = [];
function burst(world, n, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
    const pos = world.group.position.clone().addScaledVector(n, world.radius * 1.02);
    p.position.copy(pos);
    const dir = n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.6)).normalize();
    p.userData = { vel: dir.multiplyScalar(speed * (0.4 + Math.random())), life: 0.45 + Math.random() * 0.35 };
    scene.add(p);
    fx.push(p);
  }
  const flash = new THREE.Mesh(new THREE.SphereGeometry(world.radius * 0.18, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.85, depthWrite: false }));
  flash.position.copy(world.group.position).addScaledVector(n, world.radius);
  flash.userData = { vel: new THREE.Vector3(), life: 0.22, flash: true };
  scene.add(flash);
  fx.push(flash);
}

function makePalette() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 28),
    new THREE.MeshBasicMaterial({ color: 0x10141c, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
  );
  plate.rotation.x = -Math.PI / 2;
  g.add(plate);
  const gems = [];
  POWERS.forEach((p, i) => {
    const a = (i / POWERS.length) * Math.PI * 2 - Math.PI / 2;
    const wrap = new THREE.Group();
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.016, 0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(i / POWERS.length, 0.55, 0.55) }),
    );
    m.userData.power = i;
    wrap.add(m);
    const lab = new THREE.Mesh(
      new THREE.PlaneGeometry(0.068, 0.018),
      new THREE.MeshBasicMaterial({ map: labelTex(p.name), transparent: true, depthTest: false, side: THREE.DoubleSide }),
    );
    lab.position.set(0, 0.01, 0.024);
    lab.userData.power = i;
    wrap.add(lab);
    wrap.position.set(Math.cos(a) * 0.185, 0.02, Math.sin(a) * 0.185);
    wrap.userData.power = i;
    g.add(wrap);
    gems.push(m, lab);
  });
  g.position.set(0, 0.06, 0.14);
  return { group: g, gems };
}

function makeStudio() {
  const g = new THREE.Group();
  g.visible = false;
  g.frustumCulled = false;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.62),
    new THREE.MeshBasicMaterial({ color: 0x10141c, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
  );
  g.add(board);
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.038),
    new THREE.MeshBasicMaterial({ map: labelCanvas("LIFE MAKER", 320, 48), transparent: true, side: THREE.DoubleSide }),
  );
  title.position.set(0, 0.27, 0.01);
  g.add(title);
  const hint = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.028),
    new THREE.MeshBasicMaterial({ map: labelCanvas("Trigger a body part to swap it", 420, 48), transparent: true, side: THREE.DoubleSide }),
  );
  hint.position.set(-0.08, 0.232, 0.01);
  g.add(hint);
  const hits = [];
  const preview = new THREE.Group();
  preview.position.set(-0.22, 0.02, 0.05);
  g.add(preview);
  const namePl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.03),
    new THREE.MeshBasicMaterial({ map: labelCanvas("Name", 280, 48), transparent: true, side: THREE.DoubleSide }),
  );
  namePl.position.set(-0.22, -0.14, 0.02);
  namePl.userData.studioAct = "name";
  g.add(namePl);
  hits.push(namePl);
  const adjPl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.03),
    new THREE.MeshBasicMaterial({ map: labelCanvas("Adjective", 280, 48), transparent: true, side: THREE.DoubleSide }),
  );
  adjPl.position.set(-0.22, -0.175, 0.02);
  adjPl.userData.studioAct = "adj";
  g.add(adjPl);
  hits.push(adjPl);
  const statRows = [];
  function paintStatRow(row) {
    const dna = CREATURE_SLOTS[selSlot];
    const v = (dna.stats && dna.stats[row.key]) || 0;
    row.lab.material.map?.dispose();
    row.lab.material.map = labelCanvas(row.key + " " + v, 200, 40);
    row.lab.material.needsUpdate = true;
  }
  LIFE_SKILLS.forEach((k, i) => {
    const y = 0.2 - i * 0.038;
    const lab = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.028),
      new THREE.MeshBasicMaterial({ map: labelCanvas(k, 200, 40), transparent: true, side: THREE.DoubleSide }),
    );
    lab.position.set(0.16, y, 0.012);
    const minus = new THREE.Mesh(new THREE.PlaneGeometry(0.028, 0.028), new THREE.MeshBasicMaterial({ map: labelCanvas("-", 64, 48), transparent: true, side: THREE.DoubleSide }));
    minus.position.set(0.27, y, 0.012);
    minus.userData.statDelta = { key: k, d: -1 };
    const plus = new THREE.Mesh(new THREE.PlaneGeometry(0.028, 0.028), new THREE.MeshBasicMaterial({ map: labelCanvas("+", 64, 48), transparent: true, side: THREE.DoubleSide }));
    plus.position.set(0.31, y, 0.012);
    plus.userData.statDelta = { key: k, d: 1 };
    g.add(lab, minus, plus);
    hits.push(minus, plus);
    statRows.push({ key: k, lab, minus, plus });
  });
  const leftPl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.028),
    new THREE.MeshBasicMaterial({ map: labelCanvas("Left 0", 220, 40), transparent: true, side: THREE.DoubleSide }),
  );
  leftPl.position.set(0.22, -0.12, 0.012);
  g.add(leftPl);
  function rebuildPreview() {
    while (preview.children.length) preview.remove(preview.children[0]);
    const m = makeCreatureMesh(CREATURE_SLOTS[selSlot], 1.35);
    preview.add(m);
    hits.length = 0;
    hits.push(namePl, adjPl, saveB, rndB, warB, clearB, addArm, addLeg);
    for (const row of statRows) {
      if (row.minus) hits.push(row.minus);
      if (row.plus) hits.push(row.plus);
    }
    m.traverse((o) => { if (o.isMesh) hits.push(o); });
    for (let i = 0; i < SLOT_N; i++) {
      const sl = g.children.find((ch) => ch.userData.saveSlot === i);
      if (sl) hits.push(sl);
    }
    namePl.material.map?.dispose();
    namePl.material.map = labelCanvas(CREATURE_SLOTS[selSlot].name || "Name", 280, 48);
    namePl.material.needsUpdate = true;
    const adj = (CREATURE_SLOTS[selSlot].adjectives || [])[0] || "Adjective";
    adjPl.material.map?.dispose();
    adjPl.material.map = labelCanvas(adj, 280, 48);
    adjPl.material.needsUpdate = true;
    statRows.forEach(paintStatRow);
    const left = 100 - spentPoints(CREATURE_SLOTS[selSlot].stats);
    leftPl.material.map?.dispose();
    leftPl.material.map = labelCanvas("Left " + left, 220, 40);
    leftPl.material.needsUpdate = true;
  }
  for (let i = 0; i < SLOT_N; i++) {
    const pl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.042, 0.028),
      new THREE.MeshBasicMaterial({ map: labelCanvas(String(i + 1), 80, 48), transparent: true, side: THREE.DoubleSide }),
    );
    pl.position.set(-0.34 + (i % 5) * 0.048, -0.22 - Math.floor(i / 5) * 0.034, 0.012);
    pl.userData.saveSlot = i;
    g.add(pl);
    hits.push(pl);
  }
  const saveB = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.028), new THREE.MeshBasicMaterial({ map: labelCanvas("SAVE", 160, 48), transparent: true, side: THREE.DoubleSide }));
  saveB.position.set(0.02, -0.22, 0.012);
  saveB.userData.studioAct = "save";
  const rndB = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.028), new THREE.MeshBasicMaterial({ map: labelCanvas("RANDOM", 160, 48), transparent: true, side: THREE.DoubleSide }));
  rndB.position.set(0.13, -0.22, 0.012);
  rndB.userData.studioAct = "random";
  const warB = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.028), new THREE.MeshBasicMaterial({ map: labelCanvas("WAR/PEACE", 220, 48), transparent: true, side: THREE.DoubleSide }));
  warB.position.set(0.26, -0.22, 0.012);
  warB.userData.studioAct = "war";
  const clearB = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.028), new THREE.MeshBasicMaterial({ map: labelCanvas("CLEAR PTS", 220, 48), transparent: true, side: THREE.DoubleSide }));
  clearB.position.set(0.22, -0.16, 0.012);
  clearB.userData.studioAct = "clear";
  const addArm = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.028), new THREE.MeshBasicMaterial({ map: labelCanvas("+ ARM", 160, 48), transparent: true, side: THREE.DoubleSide }));
  addArm.position.set(-0.08, -0.22, 0.012);
  addArm.userData.studioAct = "addArm";
  const addLeg = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.028), new THREE.MeshBasicMaterial({ map: labelCanvas("+ LEG", 160, 48), transparent: true, side: THREE.DoubleSide }));
  addLeg.position.set(-0.08, -0.254, 0.012);
  addLeg.userData.studioAct = "addLeg";
  g.add(saveB, rndB, warB, clearB, addArm, addLeg);
  hits.push(saveB, rndB, warB, clearB, addArm, addLeg);
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.01, 0.018, 28),
    new THREE.MeshBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false }),
  );
  glow.visible = false;
  glow.renderOrder = 20;
  g.add(glow);
  g.position.set(0.08, 0.36, -0.24);
  g.rotation.set(-0.35, 0.18, 0);
  rebuildPreview();
  return { group: g, hits, preview, rebuildPreview, sockets: [], glow, namePl, adjPl, leftPl, statRows };
}

function makeFormPicker() {
  const g = new THREE.Group();
  g.visible = false;
  const hits = [];
  FORMS.forEach((f, i) => {
    const pl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.042),
      new THREE.MeshBasicMaterial({ map: labelTex(f.name), transparent: true, side: THREE.DoubleSide, depthTest: false }),
    );
    pl.position.set(0.02, 0.12 - i * 0.05, 0.02);
    pl.userData.form = f.id;
    g.add(pl);
    hits.push(pl);
  });
  g.position.set(0.22, 0.08, 0.08);
  return { group: g, hits };
}

function makeWeatherPicker() {
  const g = new THREE.Group();
  g.visible = false;
  const hits = [];
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.036),
    new THREE.MeshBasicMaterial({ map: labelTex("Weather"), transparent: true, side: THREE.DoubleSide, depthTest: false }),
  );
  title.position.set(0.02, 0.16, 0.02);
  g.add(title);
  WEATHERS.forEach((w, i) => {
    const pl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.038),
      new THREE.MeshBasicMaterial({ map: labelTex(w.name), transparent: true, side: THREE.DoubleSide, depthTest: false }),
    );
    pl.position.set(0.02, 0.11 - i * 0.042, 0.02);
    pl.userData.weather = w.id;
    g.add(pl);
    hits.push(pl);
  });
  g.position.set(0.22, 0.1, 0.08);
  return { group: g, hits };
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x07080f, 1);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080f);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 280);
const rig = new THREE.Group();
rig.position.set(0, 1.5, 8);
scene.add(rig);
rig.add(camera);
const sky = makeSky();
scene.add(sky);
const planetSky = makePlanetSky();
planetSky.visible = false;
scene.add(planetSky);

function makeModeBadge() {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 112;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(0.62, 0.11, 1);
  s.position.set(0, 0.32, -0.92);
  s.visible = false;
  s.userData.ctx = c.getContext("2d");
  s.userData.canvas = c;
  s.userData.tex = tex;
  camera.add(s);
  return s;
}
const modeBadge = makeModeBadge();
function setModeBadge(title, sub) {
  if (!title) {
    modeBadge.visible = false;
    return;
  }
  const c = modeBadge.userData.canvas;
  const g = modeBadge.userData.ctx;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = "rgba(6, 14, 28, 0.82)";
  g.fillRect(10, 10, c.width - 20, c.height - 20);
  g.strokeStyle = "rgba(158, 231, 255, 0.9)";
  g.lineWidth = 4;
  g.strokeRect(10, 10, c.width - 20, c.height - 20);
  g.fillStyle = "#cfe9ff";
  g.font = "bold 36px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title, c.width / 2, 42);
  g.fillStyle = "#e6c56e";
  g.font = "22px sans-serif";
  g.fillText(sub || "", c.width / 2, 82);
  modeBadge.userData.tex.needsUpdate = true;
  modeBadge.visible = true;
}
function parentBadgeToHead() {
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;
  if (modeBadge.parent !== cam) cam.add(modeBadge);
}
const dyingUfos = [];
const hemi = new THREE.HemisphereLight(0x8899aa, 0x1a2838, 0.78);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6c8, 0.95);
sun.position.set(8, 12, 4);
scene.add(sun);

const worlds = [];
let growing = null;
let power = 0;
let selected = null;
let pickSpecies = SPECIES[0];
let deityForm = null;
let lockedWorld = null;
let lookYaw = 0;
let lookPitch = 0;
const keys = new Set();
const mouse = { x: 0, y: 0, down: false, locked: false };
let last = 0;
const meteors = [];
const bolts = [];

const ctrl = {
  0: renderer.xr.getController(0),
  1: renderer.xr.getController(1),
  g0: renderer.xr.getControllerGrip(0),
  g1: renderer.xr.getControllerGrip(1),
};
Object.values(ctrl).forEach((c) => rig.add(c));
const handL = makeSpiritHand();
const handR = makeSpiritHand();
ctrl.g0.add(handL);
ctrl.g1.add(handR);
const palette = makePalette();
ctrl.g0.add(palette.group);
const studio = makeStudio();
ctrl.g0.add(studio.group);
let heldPart = null;
const formPick = makeFormPicker();
ctrl.g0.add(formPick.group);
const weatherPick = makeWeatherPicker();
ctrl.g0.add(weatherPick.group);
const laser = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.8)]),
  new THREE.LineBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0.45 }),
);
ctrl[1].add(laser);

function formColor() {
  if (deityForm === "fearsome") return 0xff5533;
  if (deityForm === "divine") return 0xffe27a;
  if (deityForm === "inspire") return 0x7cffb0;
  return 0x9ee7ff;
}
function setForm(id) {
  deityForm = id;
  const f = FORMS.find((x) => x.id === id);
  hudForm.textContent = f ? "Form · " + f.name : "Form · unset";
  hudHint.textContent = f ? f.hint : POWERS[power].hint;
  const col = formColor();
  handL.userData.mat.color.setHex(col);
  handR.userData.mat.color.setHex(col);
}

function setWeather(id) {
  weatherMode = id;
  const w = WEATHERS.find((x) => x.id === id);
  hudPower.textContent = "Weather · " + (w?.name || id);
  hudHint.textContent = w?.hint || POWERS[power].hint;
  weatherPick.hits.forEach((h) => {
    h.scale.setScalar(h.userData.weather === id ? 1.14 : 1);
  });
  paintWeatherHtml();
}

function paintWeatherHtml() {
  const insp = document.getElementById("inspect");
  if (!insp) return;
  let host = document.getElementById("wx-grid");
  if (!host) {
    host = document.createElement("div");
    host.id = "wx-grid";
    host.className = "wx-grid";
    const wx = document.getElementById("wx");
    const label = wx?.closest("label");
    (label || insp).insertAdjacentElement("afterend", host);
  }
  host.innerHTML = "";
  WEATHERS.forEach((w) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = w.name;
    if (w.id === weatherMode) b.classList.add("on");
    b.onclick = () => setWeather(w.id);
    host.appendChild(b);
  });
  let tem = document.getElementById("btn-temple");
  if (!tem) {
    tem = document.createElement("button");
    tem.id = "btn-temple";
    tem.type = "button";
    tem.textContent = "Raise a temple";
    const grove = document.getElementById("btn-grove");
    (grove || insp).insertAdjacentElement(grove ? "afterend" : "beforeend", tem);
    tem.onclick = () => {
      if (!selected) return;
      const n = selected.cities[0]?.n || selected.life[0]?.userData.n || new THREE.Vector3(0, 1, 0);
      selected.addTemple(n);
    };
  }
}

function setPower(i) {
  power = (i + POWERS.length) % POWERS.length;
  hudPower.textContent = POWERS[power].name;
  hudHint.textContent = POWERS[power].hint;
  studio.group.visible = POWERS[power].id === "beasts";
  const stEl = document.getElementById("studio");
  if (stEl) stEl.hidden = POWERS[power].id !== "beasts";
  if (POWERS[power].id === "beasts") {
    paintStudioHtml();
    document.exitPointerLock?.();
  }
  formPick.group.visible = POWERS[power].id === "form";
  weatherPick.group.visible = POWERS[power].id === "storm";
  if (POWERS[power].id === "storm") {
    const w = WEATHERS.find((x) => x.id === weatherMode);
    hudPower.textContent = "Weather · " + (w?.name || "Clouds");
    hudHint.textContent = w?.hint || POWERS[power].hint;
    paintWeatherHtml();
  }
  palette.gems.forEach((g) => {
    if (g.userData.power != null && g.geometry?.type === "IcosahedronGeometry") {
      g.scale.setScalar(g.userData.power === power ? 1.45 : 1);
    }
  });
}
setPower(0);

function paintStudioHtml() {
  const host = document.getElementById("studio-slots");
  if (!host) return;
  host.innerHTML = "";
  CREATURE_SLOTS.forEach((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = (i + 1) + " " + displayName(d);
    if (i === selSlot) b.classList.add("on");
    b.onclick = () => {
      selSlot = i;
      studio.rebuildPreview();
      paintStudioHtml();
    };
    host.appendChild(b);
  });
  const rel = document.getElementById("studio-rel");
  if (rel) {
    const war = isWar(relations, selSlot, warSlot);
    rel.textContent = displayName(CREATURE_SLOTS[selSlot]) + (war ? " is at war with " : " is at peace with ") + displayName(CREATURE_SLOTS[warSlot]) + " (slot " + (warSlot + 1) + ")";
  }
  const civ = document.getElementById("studio-civ");
  if (civ) {
    const w = lockedWorld || worlds[0];
    const c = w ? w.civOf(selSlot) : civBlank();
    civ.textContent = "Civ score " + (c.score | 0) + " · " + (CIV_AGES[c.ageIndex] || CIV_AGES[0]).name;
  }
  const dna = CREATURE_SLOTS[selSlot];
  const nameEl = document.getElementById("studio-name");
  if (nameEl && nameEl.value !== dna.name) nameEl.value = dna.name || "";
  const adjEl = document.getElementById("studio-adj");
  if (adjEl) {
    const a = (dna.adjectives || []).join(", ");
    if (adjEl.value !== a) adjEl.value = a;
  }
  const statsHost = document.getElementById("studio-stats");
  if (statsHost) {
    const left = 100 - spentPoints(dna.stats);
    let html = `<p class="tiny">Life points left: <b id="lp-left">${left}</b>/100</p>`;
    LIFE_SKILLS.forEach((k) => {
      const v = (dna.stats && dna.stats[k]) || 0;
      html += `<div class="stat-row" data-stat="${k}"><span>${k}</span><button type="button" data-d="-1">−</button><em>${v}</em><button type="button" data-d="1">+</button></div>`;
    });
    statsHost.innerHTML = html;
    statsHost.querySelectorAll(".stat-row").forEach((row) => {
      const key = row.getAttribute("data-stat");
      row.querySelectorAll("button").forEach((b) => {
        b.onclick = () => {
          if (!dna.stats) dna.stats = evenStats();
          setStat(dna, key, (dna.stats[key] | 0) + Number(b.getAttribute("data-d")));
          studio.rebuildPreview();
          paintStudioHtml();
        };
      });
    });
  }
}

function nearestWorld(from, max = 6) {
  let best = null, bd = max;
  for (const w of worlds) {
    const d = from.distanceTo(w.group.position);
    if (d < bd + w.radius) {
      bd = d;
      best = w;
    }
  }
  return best;
}
function hitWorld(origin, dir) {
  _ray.set(origin, dir);
  const hits = [];
  for (const w of worlds) {
    const h = _ray.intersectObject(w.mesh, false);
    if (h[0]) hits.push(h[0]);
  }
  hits.sort((a, b) => a.distance - b.distance);
  return hits[0] || null;
}
function spawnWorld(pos, r) {
  if (worlds.length >= MAX_WORLDS) {
    hudStatus.textContent = "The void will hold no more spheres.";
    return null;
  }
  const w = new World(pos, r, Math.random() * 40);
  scene.add(w.group);
  worlds.push(w);
  return w;
}

function openPlanetMenu(w) {
  selected = w;
  inspectEl.hidden = false;
  document.getElementById("insp-name").textContent = `Sphere · radius ${w.radius.toFixed(2)} · sea ${Math.round(w.seaLevel * 100)}`;
  document.getElementById("insp-tpl").textContent = "Template · " + w.template.name;
  document.getElementById("insp-age").textContent = "Age · " + w.hutStyle().name;
  document.getElementById("sealevel").value = String(Math.round(w.seaLevel * 100));
  document.getElementById("veg").value = String(w.vegH);
  document.getElementById("oceanhue").value = String(w.seaH);
  document.getElementById("wx").value = String(Math.round(w.storm * 100));
  paintWeatherHtml();
}

function applyWeatherHold(w, origin, dir, n, dt) {
  w.wxMode = weatherMode;
  if (weatherMode === "clear") {
    w.storm = Math.max(0, w.storm - dt * 0.55);
    w.cloudCover = Math.max(0, (w.cloudCover || 0) - dt * 0.6);
    for (const p of w.wxPuffs) p.userData.grow = Math.max(0.05, (p.userData.grow || 1) - dt * 0.8);
    hudStatus.textContent = "The skies part over " + w.template.name + ".";
    return;
  }
  const hit = (origin && dir)
    ? (raySphere(origin, dir, w.group.position, w.radius * 1.28) || raySphere(origin, dir, w.group.position, atmosR(w, GOD_ATMOS) * 0.85))
    : null;
  let pn = n && n.clone ? n.clone().normalize() : new THREE.Vector3(0, 1, 0);
  if (hit) pn = hit.clone().sub(w.group.position).normalize();
  w.growCloudAt(pn, dt, weatherMode);
  w.cloudCover = Math.min(1, (w.cloudCover || 0) + dt * 0.35);
  if (weatherMode === "rain" || weatherMode === "thunder") {
    w.storm = Math.min(1, w.storm + dt * 0.45);
    w.uni.uLand.value = Math.min(1, w.uni.uLand.value + dt * 0.08);
  }
  if (weatherMode === "thunder") w.storm = Math.min(1, w.storm + dt * 0.2);
  if (weatherMode === "snow") {
    w.ice = Math.min(1, (w.ice || 0) + dt * 0.08);
    if (w.uni.uIce) w.uni.uIce.value = w.ice;
  }
  if (weatherMode === "hail") w.storm = Math.min(1, w.storm + dt * 0.22);
  const label = WEATHERS.find((x) => x.id === weatherMode)?.name || "Weather";
  hudStatus.textContent = label + " growing in the sky of " + w.template.name + ".";
}

function applyPower(w, point, normal, uv, hold, dt = 0.016, origin, dir) {
  if (!w) return;
  const id = POWERS[power].id;
  if (id === "select" || id === "form") return;
  if (id === "rain") {
    w.uni.uLand.value = Math.min(1, w.uni.uLand.value + 0.12);
    w.storm = Math.min(1, w.storm + 0.08);
    w.clouds.material.uniforms.uAlpha.value = Math.min(1, w.clouds.material.uniforms.uAlpha.value + 0.2);
    w.cloudCover = Math.min(1, (w.cloudCover || 0) + 0.15);
    w.wxMode = "rain";
    if (normal) w.growCloudAt(normal, hold ? dt : 0.25, "rain");
  } else if (id === "meteor") {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6a2a }));
    camera.getWorldPosition(_v);
    m.position.copy(_v).add(_v2.set(0, 1.2, 0));
    const dest = point.clone();
    m.userData.vel = dest.clone().sub(m.position).normalize().multiplyScalar(9);
    m.userData.target = w;
    m.userData.hit = dest;
    scene.add(m);
    meteors.push(m);
  } else if (id === "ufo") w.addUfo();
  else if (id === "raise" && uv) paintAt(w.paint, uv, 42, 4);
  else if (id === "lower" && uv) paintAt(w.paint, uv, -42, 4);
  else if (id === "beasts" && normal) {
    const dna = CREATURE_SLOTS[selSlot];
    w.addCreature(dna, normal, { speciesId: selSlot });
    hudStatus.textContent = displayName(dna) + " climbs into being. Civ " + (w.civOf(selSlot).score | 0);
  } else if (id === "scout") {
    spawnShip("scout", lastAim.o, lastAim.d, w);
  } else if (id === "destroyer") {
    spawnShip("destroyer", lastAim.o, lastAim.d, w);
  } else if (id === "orb") {
    spawnShip("orb", lastAim.o, lastAim.d, w);
  } else if (id === "settler") {
    spawnShip("settler", lastAim.o, lastAim.d, w);
  } else if (id === "grove" && normal) {
    paintGrove(w, normal);
  } else if (id === "boulder" && normal) {
    w.addBoulder(normal);
    hudStatus.textContent = "Stone and gold wait in the crust.";
  } else if (id === "volcano" && normal) {
    w.addVolcano(normal);
    hudStatus.textContent = isOcean(w, normal) ? "A volcano builds rock land in the sea." : "A volcano oozes lava across the crust.";
  } else if (id === "tornado" && normal) {
    w.addTornado(normal);
    hudStatus.textContent = "A funnel walks the sphere.";
  } else if (id === "monolith" && normal) {
    w.addMonolith(normal);
    hudStatus.textContent = "A monolith is set. Civs that find it gain 100 score.";
  } else if (id === "bolt" && (point || normal)) {
    strikeLightning(w, point, normal);
  } else if (id === "storm") {
    applyWeatherHold(w, origin, dir, normal, hold ? dt : 0.2);
  } else if (id === "temple" && normal) {
    w.addTemple(normal);
  }
}

function startGrow(pos) {
  if (POWERS[power].id !== "forge") return;
  if (growing) return;
  growing = spawnWorld(pos, 0.18);
  if (growing) growing.vel.set(0, 0, 0);
}
function holdGrow(pos, dt) {
  if (!growing) return;
  growing.radius = Math.min(2.35, growing.radius + dt * 0.55);
  growing.mesh.scale.setScalar(growing.radius);
  growing.clouds.scale.setScalar(growing.radius);
  growing.rain.scale.setScalar(growing.radius * 1.08);
  growing.syncWater?.();
  growing.atmosShell?.traverse((o) => {
    if (o.isMesh) o.scale.setScalar(growing.radius);
  });
  growing.group.position.lerp(pos, 0.35);
}
function releaseGrow(away) {
  if (!growing) return;
  growing.born = true;
  growing.vel.copy(away).multiplyScalar(0.45);
  hudStatus.textContent = growing.template.name + " begins. Sea " + Math.round(growing.seaLevel * 100) + ".";
  growing = null;
}

function xrGamepad(handIndex) {
  const srcs = renderer.xr.getSession()?.inputSources;
  if (!srcs) return null;
  for (const s of srcs) {
    if (s.handedness === (handIndex === 0 ? "left" : "right")) return s.gamepad;
  }
  return srcs[handIndex]?.gamepad || null;
}
const pressed = { t0: false, t1: false, a: false, x: false, b: false, y: false };
function trigger(gp) {
  return !!(gp?.buttons?.[0]?.pressed || gp?.buttons?.[1]?.pressed);
}
function moveRig(dt, xr) {
  const speed = lockedWorld ? 1.35 : 3.2;
  camera.getWorldDirection(_v);
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
    if (l?.axes?.length) {
      const ax = l.axes.length >= 4 ? l.axes[2] : l.axes[0];
      const ay = l.axes.length >= 4 ? l.axes[3] : l.axes[1];
      if (Math.abs(ax) > 0.15) fx += ax;
      if (Math.abs(ay) > 0.15) fz += -ay;
    }
    if (r?.axes?.length) {
      const ax = r.axes.length >= 4 ? r.axes[2] : r.axes[0];
      const ay = r.axes.length >= 4 ? r.axes[3] : r.axes[1];
      if (Math.abs(ax) > 0.18) yaw -= ax * 1.4 * dt;
      if (Math.abs(ay) > 0.18) fy += -ay;
    }
  }
  lookYaw += yaw;
  rig.rotation.y = lookYaw;
  if (!xr) {
    camera.rotation.x = lookPitch;
    camera.rotation.order = "YXZ";
  }
  if (lockedWorld) {
    const c = lockedWorld.group.position;
    _v3.copy(rig.position).sub(c);
    const r = Math.max(0.001, _v3.length());
    _v3.multiplyScalar(1 / r);
    camera.getWorldDirection(_v);
    const radial = _v.dot(_v3);
    _v.addScaledVector(_v3, -radial);
    if (_v.lengthSq() < 1e-6) _v.crossVectors(_v3, new THREE.Vector3(0, 1, 0));
    _v.normalize();
    _v2.crossVectors(_v3, _v).normalize();
    rig.position.addScaledVector(_v, fz * speed * dt);
    rig.position.addScaledVector(_v2, fx * speed * dt);
    const alt = THREE.MathUtils.clamp(r + fy * speed * dt, lockedWorld.radius * 1.09, lockedWorld.radius * GOD_ATMOS * 0.98);
    _v3.copy(rig.position).sub(c).normalize();
    rig.position.copy(c).addScaledVector(_v3, alt);
  } else {
    _v.y = 0;
    if (_v.lengthSq() < 0.0001) _v.set(0, 0, -1);
    _v.normalize();
    _v2.crossVectors(_v, new THREE.Vector3(0, 1, 0)).normalize();
    rig.position.add(_v.multiplyScalar(fz * speed * dt));
    rig.position.add(_v2.multiplyScalar(fx * speed * dt));
    rig.position.y += fy * speed * dt;
  }
}
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

function tickStudioAim() {
  if (!studio.glow) return;
  if (!studio.group.visible) {
    studio.glow.visible = false;
    return;
  }
  const xr = renderer.xr.isPresenting;
  const ray = xr ? rightRay() : desktopRay();
  _ray.set(ray.o, ray.d);
  const hits = _ray.intersectObjects(studio.hits, true);
  if (!hits[0]) {
    studio.glow.visible = false;
    return;
  }
  const local = studio.group.worldToLocal(hits[0].point.clone());
  studio.glow.position.copy(local);
  studio.glow.position.z += 0.006;
  studio.glow.visible = true;
  studio.glow.scale.setScalar(1 + Math.sin(performance.now() * 0.01) * 0.12);
}

function pokeUi(origin, dir) {
  _ray.set(origin, dir);
  if (studio.group.visible) {
    const bh = _ray.intersectObjects(studio.hits, true);
    let obj = bh[0]?.object;
    let ud = obj?.userData || {};
    while (obj && !ud.swap && !ud.statDelta && ud.studioAct == null && ud.saveSlot == null) {
      obj = obj.parent;
      ud = obj?.userData || {};
    }
    if (ud) {
      if (ud.swap) {
        const dna = CREATURE_SLOTS[selSlot];
        if (ud.swap === "torso") {
          dna.torso = TORSO_KINDS[(TORSO_KINDS.indexOf(dna.torso) + 1) % TORSO_KINDS.length];
          hudStatus.textContent = "Body is now " + dna.torso + ".";
        } else if (ud.swap === "head") {
          dna.head = HEAD_KINDS[(HEAD_KINDS.indexOf(dna.head) + 1) % HEAD_KINDS.length];
          hudStatus.textContent = "Head is now " + dna.head + ".";
        } else if (ud.swap === "arm") {
          const i = ud.swapIndex | 0;
          dna.arms = dna.arms || [];
          if (dna.arms[i]) dna.arms[i].form = PART_FORMS[(PART_FORMS.indexOf(dna.arms[i].form) + 1) % PART_FORMS.length];
          hudStatus.textContent = "Arm swapped.";
        } else if (ud.swap === "leg") {
          const i = ud.swapIndex | 0;
          dna.legs = dna.legs || [];
          if (dna.legs[i]) dna.legs[i].form = PART_FORMS[(PART_FORMS.indexOf(dna.legs[i].form) + 1) % PART_FORMS.length];
          hudStatus.textContent = "Leg swapped.";
        }
        studio.rebuildPreview();
        paintStudioHtml();
        return true;
      }
      if (ud.statDelta) {
        const dna = CREATURE_SLOTS[selSlot];
        if (!dna.stats) dna.stats = evenStats();
        setStat(dna, ud.statDelta.key, (dna.stats[ud.statDelta.key] | 0) + ud.statDelta.d);
        studio.rebuildPreview();
        paintStudioHtml();
        return true;
      }
      if (ud.saveSlot != null) {
        selSlot = ud.saveSlot;
        studio.rebuildPreview();
        paintStudioHtml();
        hudStatus.textContent = "Selected " + displayName(CREATURE_SLOTS[selSlot]);
        return true;
      }
      if (ud.studioAct === "save") {
        saveSlots(CREATURE_SLOTS);
        hudStatus.textContent = "Saved ten spores.";
        return true;
      }
      if (ud.studioAct === "random") {
        CREATURE_SLOTS[selSlot] = randomDna(selSlot);
        studio.rebuildPreview();
        paintStudioHtml();
        return true;
      }
      if (ud.studioAct === "war") {
        const war = !isWar(relations, selSlot, warSlot);
        setWar(relations, selSlot, warSlot, war);
        hudStatus.textContent = displayName(CREATURE_SLOTS[selSlot]) + (war ? " at war with " : " at peace with ") + displayName(CREATURE_SLOTS[warSlot]);
        paintStudioHtml();
        return true;
      }
      if (ud.studioAct === "clear") {
        CREATURE_SLOTS[selSlot].stats = zeroStats();
        studio.rebuildPreview();
        paintStudioHtml();
        hudStatus.textContent = "Life points cleared — they will be slow at everything.";
        return true;
      }
      if (ud.studioAct === "name") {
        const nouns = ["Spore", "Kin", "Walkers", "Choir", "Brood", "Folk", "Weavers", "Horde", "Tide", "Ash"];
        const cur = CREATURE_SLOTS[selSlot].name || "Spore";
        CREATURE_SLOTS[selSlot].name = nouns[(nouns.indexOf(cur) + 1) % nouns.length];
        studio.rebuildPreview();
        paintStudioHtml();
        return true;
      }
      if (ud.studioAct === "adj") {
        const dna = CREATURE_SLOTS[selSlot];
        const cur = (dna.adjectives && dna.adjectives[0]) || ADJECTIVES[0];
        dna.adjectives = [ADJECTIVES[(ADJECTIVES.indexOf(cur) + 1) % ADJECTIVES.length]];
        studio.rebuildPreview();
        paintStudioHtml();
        return true;
      }
      if (ud.studioAct === "addArm") {
        const dna = CREATURE_SLOTS[selSlot];
        dna.arms = dna.arms || [];
        if (dna.arms.length < 4) dna.arms.push({ form: PART_FORMS[0], col: dna.col });
        studio.rebuildPreview();
        return true;
      }
      if (ud.studioAct === "addLeg") {
        const dna = CREATURE_SLOTS[selSlot];
        dna.legs = dna.legs || [];
        if (dna.legs.length < 6) dna.legs.push({ form: "bug", col: dna.col });
        studio.rebuildPreview();
        return true;
      }
    }
  }
  if (formPick.group.visible) {
    const fh = _ray.intersectObjects(formPick.hits, false);
    if (fh[0]?.object?.userData?.form) {
      setForm(fh[0].object.userData.form);
      return true;
    }
  }
  if (weatherPick.group.visible) {
    const wh = _ray.intersectObjects(weatherPick.hits, false);
    if (wh[0]?.object?.userData?.weather) {
      setWeather(wh[0].object.userData.weather);
      return true;
    }
  }
  const hits = _ray.intersectObjects(palette.gems, false);
  if (hits[0]?.object?.userData?.power != null) {
    setPower(hits[0].object.userData.power);
    return true;
  }
  return false;
}

function originFromCam() {
  camera.getWorldPosition(_v);
  return _v.clone();
}
function dirFromCam() {
  camera.getWorldDirection(_v2);
  return _v2.clone();
}

function jaggedBoltPts(from, to, segs = 12) {
  const pts = [from.clone()];
  const dir = to.clone().sub(from);
  const len = dir.length();
  if (len < 1e-4) return [from.clone(), to.clone()];
  dir.multiplyScalar(1 / len);
  let perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
  if (perp.lengthSq() < 1e-6) perp.set(1, 0, 0);
  perp.normalize();
  const bit = new THREE.Vector3().crossVectors(dir, perp).normalize();
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const spread = (1 - Math.abs(t - 0.5) * 1.55) * len * 0.09;
    const p = from.clone().addScaledVector(dir, len * t);
    p.addScaledVector(perp, (Math.random() - 0.5) * 2 * spread);
    p.addScaledVector(bit, (Math.random() - 0.5) * 2 * spread);
    pts.push(p);
  }
  pts.push(to.clone());
  return pts;
}

function strikeLightning(w, point, normal, fromCloud) {
  const n = (normal || (point ? point.clone().sub(w.group.position).normalize() : new THREE.Vector3(0, 1, 0))).clone().normalize();
  const tip = w.group.position.clone().addScaledVector(n, w.radius * 1.02);
  let sky;
  if (fromCloud) {
    const puff = w.wxPuffs.find((p) => p.userData.n && p.userData.n.dot(n) > 0.88);
    sky = puff
      ? w.group.position.clone().addScaledVector(puff.userData.n, w.radius * (puff.userData.alt || 1.18))
      : w.group.position.clone().addScaledVector(n, w.radius * 1.22);
  } else {
    sky = w.group.position.clone().addScaledVector(n, w.radius * 2.2);
  }
  const pts = jaggedBoltPts(sky, tip, 14);
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0xcfe9ff, transparent: true }),
  );
  scene.add(line);
  bolts.push({ mesh: line, t: 0.28 });
  if (Math.random() < 0.55) {
    const mid = pts[(pts.length * 0.45) | 0].clone();
    const fork = jaggedBoltPts(mid, mid.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(w.radius * 0.22)), 6);
    const fLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(fork),
      new THREE.LineBasicMaterial({ color: 0xe8f6ff, transparent: true }),
    );
    scene.add(fLine);
    bolts.push({ mesh: fLine, t: 0.18 });
  }
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(w.radius * 0.12, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  flash.position.copy(tip);
  flash.userData = { vel: new THREE.Vector3(), life: 0.18, flash: true };
  scene.add(flash);
  fx.push(flash);
  boomSfx(isOcean(w, n));
  paintAt(w.paint, uvFromN(n), -40, 3);
  for (let i = w.life.length - 1; i >= 0; i--) {
    const c = w.life[i];
    if (c.userData.n && c.userData.n.dot(n) > 0.92) w.hurtLife(c, 28);
  }
  for (const u of w.ufos) {
    u.getWorldPosition(_v);
    if (_v.distanceTo(tip) < w.radius * 0.55) strikeUfo({ userData: { vel: n.clone().multiplyScalar(4) } }, u, w);
  }
  for (const sh of ships) {
    if (sh.dead) continue;
    if (sh.mesh.position.distanceTo(tip) < 0.7) damageShip(sh, 22);
  }
  w.storm = Math.min(1, w.storm + 0.12);
  hudStatus.textContent = "Lightning strikes " + w.template.name + ".";
}

function tickLaser(origin, dir, dt) {
  const far = origin.clone().addScaledVector(dir, 28);
  laser.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.8)]);
  laser.material.color.setHex(0xff3355);
  laser.material.opacity = 0.9;
  const hit = hitWorld(origin, dir);
  const beamEnd = hit?.point || far;
  for (const sh of ships) {
    if (sh.dead) continue;
    const d = distToSeg(sh.mesh.position, origin, beamEnd);
    if (d < 0.18) damageShip(sh, 28 * dt);
  }
  for (const w of worlds) {
    for (const u of w.ufos) {
      if (u.userData.dying) continue;
      u.getWorldPosition(_v);
      if (distToSeg(_v, origin, beamEnd) < 0.2) strikeUfo({ userData: { vel: dir.clone().multiplyScalar(3) } }, u, w);
    }
  }
  if (hit?.object?.userData?.world && hit.uv) {
    const w = hit.object.userData.world;
    const uv = hit.uv;
    const n = hit.face?.normal
      ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
      : dir.clone().negate();
    const ocean = isOcean(w, n);
    const prev = lastLaserUv && lastLaserUv.w === w ? lastLaserUv : null;
    if (ocean) {
      w.laserSteamT = (w.laserSteamT || 0) - dt;
      if (w.laserSteamT <= 0) {
        w.laserSteamT = 0.11;
        w.addFire(n, true);
      }
      paintAt(w.paint, uv, 18, 2);
      if (prev) {
        const steps = 3;
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          paintAt(w.paint, { x: prev.x + (uv.x - prev.x) * t, y: prev.y + (uv.y - prev.y) * t }, 12, 1);
        }
      }
      w.setSea(w.seaLevel - dt * 0.014);
      hudStatus.textContent = "The laser boils the sea — smoke and drought.";
    } else {
      paintAt(w.paint, uv, -22, 1);
      if (prev) {
        const steps = 4;
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          paintAt(w.paint, { x: prev.x + (uv.x - prev.x) * t, y: prev.y + (uv.y - prev.y) * t }, -18, 1);
        }
      }
    }
    lastLaserUv = { x: uv.x, y: uv.y, w };
    for (const c of w.life) {
      if (c.userData.n && c.userData.n.dot(n) > 0.97) w.hurtLife(c, 8 * dt);
    }
  }
}

function distToSeg(p, a, b) {
  const ab = b.clone().sub(a);
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / (ab.lengthSq() || 1), 0, 1);
  return a.clone().addScaledVector(ab, t).distanceTo(p);
}

function spawnShip(kind, pos, dir, planet, sid) {
  const speciesId = sid != null ? sid : selSlot;
  const col = CREATURE_SLOTS[speciesId]?.col || 0x88cc44;
  let mesh;
  if (kind === "settler") mesh = modelSettler(col);
  else if (kind === "destroyer") mesh = modelDestroyer(col);
  else if (kind === "orb") mesh = modelExplosionOrb();
  else mesh = modelScout(col);
  const p = pos.clone ? pos.clone() : originFromCam();
  const d = dir && dir.clone ? dir.clone().normalize() : dirFromCam();
  mesh.position.copy(p).addScaledVector(d, kind === "orb" ? 5.2 : 0.5);
  if (kind === "orb") {
    const sc = Math.max(1.35, (planet?.radius || 1.6) * 0.95);
    mesh.scale.setScalar(sc);
  }
  mesh.lookAt(mesh.position.clone().add(d));
  scene.add(mesh);
  const hp = kind === "orb" ? 520 : kind === "destroyer" ? 220 : kind === "scout" ? 40 : 55;
  const spd = kind === "orb" ? 0.35 : kind === "destroyer" ? 1.15 : kind === "scout" ? 2.6 : 1.5;
  ships.push({
    kind,
    mesh,
    vel: d.multiplyScalar(spd),
    hp,
    maxHp: hp,
    speciesId,
    planet: planet || null,
    fireCd: 0,
    dead: false,
    landN: null,
    scanT: 0,
    charge: 0,
  });
  const label = kind === "settler" ? "Settler" : kind === "destroyer" ? "Mass destroyer" : kind === "orb" ? "Explosion orb" : "Scout";
  hudStatus.textContent = label + " launched for " + displayName(CREATURE_SLOTS[speciesId]) + ".";
}

function fireHeavyLaser(from, dest, sh) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2244 }),
  );
  m.position.copy(from);
  const vel = dest.clone().sub(from);
  const dist = vel.length() || 1;
  vel.multiplyScalar(14 / dist);
  m.userData.vel = vel;
  m.userData.target = sh?.planet || null;
  m.userData.hit = dest;
  m.userData.heavy = true;
  m.userData.age = 0;
  scene.add(m);
  meteors.push(m);
}

function tickOrb(sh, dt) {
  sh.charge = (sh.charge || 0) + dt;
  let best = null;
  let bd = 1e9;
  for (const w of worlds) {
    const d = sh.mesh.position.distanceTo(w.group.position);
    if (d < bd) {
      bd = d;
      best = w;
    }
  }
  for (const o of ships) {
    if (o === sh || o.dead) continue;
    const d = sh.mesh.position.distanceTo(o.mesh.position);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  if (best) {
    const dest = best.group ? best.group.position : best.mesh.position;
    const to = dest.clone().sub(sh.mesh.position);
    if (to.lengthSq() > 1e-6) {
      to.normalize();
      sh.mesh.lookAt(sh.mesh.position.clone().add(to));
      sh.vel.lerp(to.multiplyScalar(0.28), 0.04);
    }
  }
  const glow = sh.mesh.userData.chargeGlow;
  if (glow?.material) {
    const t = Math.min(1, sh.charge / 3.2);
    glow.material.emissiveIntensity = 0.2 + t * 3.4;
    glow.scale.setScalar(1 + t * 1.6);
  }
  if (!sh.firing && sh.charge >= 3.2) {
    sh.firing = true;
    sh.fireT = 0;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.16, 90, 10),
      new THREE.MeshBasicMaterial({ color: 0x44ff66, transparent: true, opacity: 0.88 }),
    );
    beam.rotation.x = Math.PI / 2;
    beam.position.z = 45;
    sh.mesh.add(beam);
    sh.beam = beam;
  }
  if (sh.firing) {
    sh.fireT = (sh.fireT || 0) + dt;
    const origin = sh.mesh.position;
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(sh.mesh.quaternion);
    for (const w of worlds.slice()) {
      const toC = w.group.position.clone().sub(origin);
      const t = toC.dot(dir);
      if (t < 0.6) continue;
      const closest = origin.clone().addScaledVector(dir, t);
      if (closest.distanceTo(w.group.position) < w.radius * 1.08) shatterWorld(w);
    }
    for (const o of ships) {
      if (o === sh || o.dead) continue;
      const toC = o.mesh.position.clone().sub(origin);
      const t = toC.dot(dir);
      if (t < 0.4) continue;
      const closest = origin.clone().addScaledVector(dir, t);
      if (closest.distanceTo(o.mesh.position) < flyerRadius(o.kind) + 0.2) obliterateShip(o);
    }
    if (sh.fireT > 1.55) {
      sh.firing = false;
      sh.charge = 0;
      sh.fireT = 0;
      if (sh.beam) {
        sh.mesh.remove(sh.beam);
        sh.beam = null;
      }
    }
  }
}

function obliterateShip(sh) {
  if (!sh || sh.dead) return;
  sh.dead = true;
  const p = sh.mesh.position.clone();
  boomSfx(false);
  for (let i = 0; i < 22; i++) {
    const d = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.03, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x8899aa, transparent: true }),
    );
    d.position.copy(p);
    d.userData = { vel: new THREE.Vector3().randomDirection().multiplyScalar(2.4), life: 1.6 };
    scene.add(d);
    fx.push(d);
  }
  if (sh.beam) {
    sh.mesh.remove(sh.beam);
    sh.beam = null;
  }
  scene.remove(sh.mesh);
}

function shatterWorld(w) {
  if (!w || !w.group) return;
  const pos = w.group.position.clone();
  const r = w.radius;
  boomSfx(false);
  hudStatus.textContent = w.template.name + " is unmade in a hypernova.";
  const nova = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.45, 18, 14),
    new THREE.MeshBasicMaterial({ color: 0xccffee, transparent: true, opacity: 0.95, depthWrite: false }),
  );
  nova.position.copy(pos);
  nova.userData = { vel: new THREE.Vector3(), life: 0.9, flash: true, nova: true };
  scene.add(nova);
  fx.push(nova);
  for (let i = 0; i < 74; i++) {
    const s = 0.025 + Math.random() * 0.09;
    const p = new THREE.Mesh(
      new THREE.IcosahedronGeometry(s, 0),
      new THREE.MeshLambertMaterial({ color: Math.random() < 0.3 ? 0x8899aa : 0x6a5344 }),
    );
    p.position.copy(pos).add(new THREE.Vector3().randomDirection().multiplyScalar(r * (0.18 + Math.random() * 0.55)));
    p.userData = { vel: p.position.clone().sub(pos).normalize().multiplyScalar(1.5 + Math.random() * 3.4), life: 4.2 + Math.random() * 3 };
    scene.add(p);
    fx.push(p);
  }
  if (lockedWorld === w) {
    camera.getWorldPosition(_v);
    const dummy = { group: { position: pos }, radius: r, atmosMul: GOD_ATMOS };
    leaveSurface();
    ejectNearPlanet(rig, dummy, _v);
  }
  for (const sh of ships) {
    if (sh.planet === w) sh.planet = null;
    if (!sh.dead && sh.mesh.position.distanceTo(pos) < r * 2.4) obliterateShip(sh);
  }
  scene.remove(w.group);
  const ix = worlds.indexOf(w);
  if (ix >= 0) worlds.splice(ix, 1);
  if (selected === w) {
    inspectEl.hidden = true;
    selected = null;
  }
  if (growing === w) growing = null;
}

function damageShip(sh, dmg) {
  sh.hp -= dmg;
  sh.mesh.traverse((o) => {
    if (o.material?.color) o.material.color.offsetHSL(0, 0, -0.02);
  });
  if (sh.hp <= 0 && !sh.dead) {
    if (sh.beam) {
      sh.mesh.remove(sh.beam);
      sh.beam = null;
    }
    sh.dead = true;
    boomSfx(false);
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    flash.position.copy(sh.mesh.position);
    flash.userData = { vel: new THREE.Vector3(), life: 0.3, flash: true };
    scene.add(flash);
    fx.push(flash);
    crashShip(sh);
    scene.remove(sh.mesh);
  }
}

function crashShip(sh) {
  let planet = sh.planet;
  if (!planet) {
    let bd = 1e9;
    for (const w of worlds) {
      const d = sh.mesh.position.distanceTo(w.group.position);
      if (d < bd) {
        bd = d;
        planet = w;
      }
    }
    if (planet && bd > planet.radius * 1.35) planet = null;
  }
  if (!planet) return;
  const n = sh.mesh.position.clone().sub(planet.group.position);
  if (n.lengthSq() < 1e-8) n.set(0, 1, 0);
  n.normalize();
  planet.addWreck(n, CREATURE_SLOTS[sh.speciesId]?.col);
  hudStatus.textContent = "A ship wrecks on " + planet.template.name + ".";
}

function flyerRadius(kind) {
  if (kind === "orb") return 1.7;
  if (kind === "destroyer") return 1.15;
  if (kind === "settler") return 0.48;
  if (kind === "ufo") return 0.4;
  return 0.34;
}

function fireShipShot(fromPos, toPos, col, from) {
  const to = toPos.clone().sub(fromPos);
  const dist = to.length();
  if (dist < 1e-4) return;
  to.multiplyScalar(1 / dist);
  const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), new THREE.MeshBasicMaterial({ color: col || 0x66f0ff }));
  bolt.position.copy(fromPos);
  scene.add(bolt);
  fx.push({ mesh: bolt, vel: to.multiplyScalar(9), life: 0.85, shot: true, from });
}

function flyersHostile(a, b) {
  if (a.kind === "ufo" && b.kind !== "ufo") return true;
  if (b.kind === "ufo" && a.kind !== "ufo") return true;
  if (a.sh && b.sh) return isWar(relations, a.sh.speciesId, b.sh.speciesId);
  return false;
}

function applyFlyerPush(f, dir, mag) {
  if (f.sh) {
    f.sh.mesh.position.addScaledVector(dir, mag);
    if (f.sh.vel) f.sh.vel.addScaledVector(dir, mag * 2.4);
  } else if (f.mesh && f.world) {
    const worldPos = f.pos.clone().addScaledVector(dir, mag);
    f.world.group.worldToLocal(worldPos);
    const deltaLocal = worldPos.sub(f.mesh.position);
    if (!f.mesh.userData.sep) f.mesh.userData.sep = new THREE.Vector3();
    f.mesh.userData.sep.add(deltaLocal);
    f.mesh.position.add(deltaLocal);
  }
}

function nearestCombatTarget(fromPos, selfShip) {
  let target = null;
  let bd = 6.5;
  let ref = null;
  for (const w of worlds) {
    for (const u of w.ufos) {
      if (u.userData.dying) continue;
      u.getWorldPosition(_v);
      const d = fromPos.distanceTo(_v);
      if (d < bd) {
        bd = d;
        target = _v.clone();
        ref = { type: "ufo", u, w };
      }
    }
  }
  for (const o of ships) {
    if (o.dead || o === selfShip) continue;
    if (selfShip && !isWar(relations, selfShip.speciesId, o.speciesId)) continue;
    const d = fromPos.distanceTo(o.mesh.position);
    if (d < bd) {
      bd = d;
      target = o.mesh.position.clone();
      ref = { type: "ship", sh: o };
    }
  }
  return target ? { target, bd, ref } : null;
}

function orbitToward(sh, planet, radius, speed) {
  const center = planet.group.position;
  const rel = sh.mesh.position.clone().sub(center);
  if (rel.lengthSq() < 1e-8) rel.set(1, 0.2, 0);
  if (!sh.orbitAxis) {
    sh.orbitAxis = rel.clone().cross(new THREE.Vector3(0, 1, 0));
    if (sh.orbitAxis.lengthSq() < 1e-8) sh.orbitAxis.set(1, 0, 0);
    sh.orbitAxis.normalize();
  }
  rel.normalize();
  const tangent = new THREE.Vector3().crossVectors(sh.orbitAxis, rel);
  if (tangent.lengthSq() < 1e-8) tangent.crossVectors(rel, new THREE.Vector3(0, 0, 1));
  tangent.normalize();
  const desired = center.clone().addScaledVector(rel, radius);
  const toShell = desired.sub(sh.mesh.position);
  sh.vel.lerp(tangent.multiplyScalar(speed).addScaledVector(toShell, 1.5), 0.08);
}

function tickSettlerOrbit(sh, dt) {
  const planet = sh.planet;
  const center = planet.group.position;
  const rel = sh.mesh.position.clone().sub(center);
  if (rel.lengthSq() < 1e-8) rel.set(1, 0.2, 0);
  sh.scanT = (sh.scanT || 0) + dt;
  if (!sh.landN) {
    const n = rel.clone().normalize();
    if (sh.scanT > 0.18) {
      sh.scanT = 0;
      for (let i = 0; i < 10; i++) {
        const t = n.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.55)).normalize();
        if (isOcean(planet, t) || !canPlant(planet, t)) continue;
        const crowded = planet.cities.some((c) => c.n.dot(t) > 0.9);
        if (crowded) continue;
        sh.landN = t;
        break;
      }
    }
    orbitToward(sh, planet, planet.radius * 1.42, 1.55);
    return false;
  }
  if (isOcean(planet, sh.landN) || !canPlant(planet, sh.landN)) {
    sh.landN = null;
    return false;
  }
  const dest = center.clone().addScaledVector(sh.landN, planet.radius * 1.08);
  const to = dest.clone().sub(sh.mesh.position);
  const dist = to.length();
  if (dist < 0.18) {
    const city = planet.foundCity(sh.landN, sh.speciesId);
    if (!city) {
      sh.landN = null;
      return false;
    }
    sh.dead = true;
    scene.remove(sh.mesh);
    return true;
  }
  to.normalize();
  sh.vel.lerp(to.multiplyScalar(1.35), 0.1);
  return false;
}

function tickShipCombat(sh, dt) {
  const hit = nearestCombatTarget(sh.mesh.position, sh);
  if (!hit || hit.bd > 5.2) return false;
  if (sh.kind === "settler" && sh.landN) return false;
  const to = hit.target.clone().sub(sh.mesh.position).normalize();
  if (hit.bd < 1.15) sh.vel.lerp(to.clone().multiplyScalar(-2.1), 0.16);
  else sh.vel.lerp(to.multiplyScalar(sh.kind === "settler" ? 1.7 : 2.55), 0.1);
  if (hit.bd < 4.8 && sh.fireCd <= 0) {
    sh.fireCd = sh.kind === "settler" ? 0.7 : 0.42;
    fireShipShot(sh.mesh.position, hit.target, CREATURE_SLOTS[sh.speciesId]?.col || 0x66f0ff, sh);
  }
  return true;
}

function separateFlyers() {
  const items = [];
  for (const sh of ships) {
    if (sh.dead) continue;
    items.push({ kind: sh.kind, pos: sh.mesh.position, vel: sh.vel, mesh: sh.mesh, sh });
  }
  for (const w of worlds) {
    for (const u of w.ufos) {
      if (u.userData.dying) continue;
      const p = new THREE.Vector3();
      u.getWorldPosition(p);
      items.push({ kind: "ufo", pos: p, vel: null, mesh: u, world: w });
    }
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const minD = flyerRadius(a.kind) + flyerRadius(b.kind);
      const delta = a.pos.clone().sub(b.pos);
      let dist = delta.length();
      if (dist < 1e-5) {
        delta.set(1, 0, 0);
        dist = 1e-5;
      } else delta.multiplyScalar(1 / dist);
      if (dist >= minD) continue;
      const push = (minD - dist) * 0.58;
      applyFlyerPush(a, delta, push);
      applyFlyerPush(b, delta, -push);
      const hostile = flyersHostile(a, b);
      let closing = 0;
      if (a.vel && b.vel) closing = a.vel.clone().sub(b.vel).dot(delta);
      if (hostile && closing > 2.5 && dist < minD * 0.32) {
        if (a.sh) damageShip(a.sh, 999);
        if (b.sh) damageShip(b.sh, 999);
        if (a.kind === "ufo" && a.world) strikeUfo({ userData: { vel: delta.clone().multiplyScalar(3) } }, a.mesh, a.world);
        if (b.kind === "ufo" && b.world) strikeUfo({ userData: { vel: delta.clone().multiplyScalar(-3) } }, b.mesh, b.world);
      }
    }
  }
}

function tickUfoCombat(dt) {
  for (const w of worlds) {
    for (const u of w.ufos) {
      if (u.userData.dying) continue;
      u.userData.fireCd = Math.max(0, (u.userData.fireCd || 0) - dt);
      u.getWorldPosition(_v);
      let bd = 6;
      let target = null;
      for (const sh of ships) {
        if (sh.dead) continue;
        const d = _v.distanceTo(sh.mesh.position);
        if (d < bd) {
          bd = d;
          target = sh.mesh.position.clone();
        }
      }
      if (target && bd < 5.2 && u.userData.fireCd <= 0) {
        u.userData.fireCd = 0.55;
        fireShipShot(_v.clone(), target, 0x9ee7ff, { mesh: u, kind: "ufo" });
      }
    }
  }
}

function tickShips(dt) {
  for (const sh of ships) {
    if (sh.dead) continue;
    sh.fireCd = Math.max(0, sh.fireCd - dt);
    if (sh.kind === "orb") {
      tickOrb(sh, dt);
    } else if (sh.kind === "destroyer") {
      if (sh.planet) orbitToward(sh, sh.planet, atmosR(sh.planet, GOD_ATMOS) * 1.12, 1.35);
      tickShipCombat(sh, dt);
      if (sh.planet && sh.fireCd <= 0) {
        sh.fireCd = 1.7;
        const n = new THREE.Vector3().randomDirection();
        const dest = sh.planet.group.position.clone().addScaledVector(n, sh.planet.radius);
        fireHeavyLaser(sh.mesh.position.clone(), dest, sh);
      }
    } else if (sh.kind === "settler" && sh.planet) {
      tickSettlerOrbit(sh, dt);
      if (sh.dead) continue;
      if (!sh.landN) tickShipCombat(sh, dt);
    } else {
      const fighting = tickShipCombat(sh, dt);
      if (!fighting && sh.kind === "scout" && sh.planet) {
        orbitToward(sh, sh.planet, atmosR(sh.planet, ATMOS), 2.15);
      }
    }
    if (sh.dead) continue;
    sh.mesh.position.addScaledVector(sh.vel, dt);
    if (sh.planet && !sh.dead && sh.kind !== "orb" && !(sh.kind === "settler" && sh.landN)) {
      const d = sh.mesh.position.distanceTo(sh.planet.group.position);
      if (d < sh.planet.radius * 1.06) {
        damageShip(sh, 999);
        continue;
      }
    }
    if (sh.kind !== "orb" && sh.vel.lengthSq() > 1e-6) sh.mesh.lookAt(sh.mesh.position.clone().add(sh.vel));
  }
  separateFlyers();
  tickUfoCombat(dt);
}

let lastAim = { o: new THREE.Vector3(), d: new THREE.Vector3(0, 0, -1) };
function fire(origin, dir, holding, justPressed, dt) {
  lastAim.o.copy(origin);
  lastAim.d.copy(dir);
  if (justPressed && pokeUi(origin, dir)) return;
  const id = POWERS[power].id;
  if (id === "laser") {
    if (!holding) {
      lastLaserUv = null;
      laser.material.color.setHex(0x9ee7ff);
      laser.material.opacity = 0.45;
      return;
    }
    tickLaser(origin, dir, dt);
    return;
  }
  if (id === "select") {
    if (justPressed) {
      const hit = hitWorld(origin, dir);
      const w = hit?.object?.userData?.world;
      if (w) openPlanetMenu(w);
    }
    return;
  }
  if (id === "form") {
    if (justPressed) pokeUi(origin, dir);
    return;
  }
  if (id === "storm" && justPressed && weatherPick.group.visible) {
    if (pokeUi(origin, dir)) return;
  }
  if (id === "forge") {
    if (holding && !growing) startGrow(origin.clone().add(dir.clone().multiplyScalar(0.4)));
    if (holding && growing) holdGrow(origin.clone().add(dir.clone().multiplyScalar(0.55 + growing.radius)), dt);
    if (!holding && growing) releaseGrow(dir);
    return;
  }
  const continuous = id === "rain" || id === "raise" || id === "lower" || id === "storm" || id === "grove";
  if (id === "grove") {
    if (!holding) {
      groveAcc = 0;
      return;
    }
    groveAcc += dt;
    if (!justPressed && groveAcc < 0.09) return;
    groveAcc = 0;
  }
  if (continuous && !holding) return;
  if (!continuous && !justPressed) return;
  const hit = hitWorld(origin, dir);
  const w = hit?.object?.userData?.world || nearestWorld(origin, 8) || lockedWorld;
  if (!w) return;
  const n = hit?.face?.normal
    ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
    : (lockedWorld ? origin.clone().sub(w.group.position).normalize() : dir.clone().negate());
  applyPower(w, hit?.point || origin.clone().add(dir.clone().multiplyScalar(2)), n, hit?.uv, holding, dt, origin, dir);
}

function tryOpenMenuFromA() {
  if (POWERS[power].id !== "select") return;
  const xr = renderer.xr.isPresenting;
  const ray = xr ? rightRay() : desktopRay();
  const hit = hitWorld(ray.o, ray.d);
  const w = hit?.object?.userData?.world || nearestWorld(ray.o, 4);
  if (w) openPlanetMenu(w);
}

function enterSurface(w) {
  lockedWorld = w;
  setSkyDormant(sky, true);
  planetSky.visible = true;
  planetSky.position.copy(w.group.position);
  planetSky.scale.setScalar(Math.max(12, w.radius * 9));
  scene.background = new THREE.Color(0x4a7ab8);
  scene.fog = new THREE.FogExp2(0x6aa8d8, 0.032);
  hemi.intensity = 1.15;
  sun.intensity = 1.25;
  w.ensureDetail();
  setSurfaceLod(w, true);
  headPos();
  _v.copy(_v3);
  _v2.copy(_v).sub(w.group.position);
  const dist = _v2.length();
  if (_v2.lengthSq() < 1e-6) _v2.set(0, 1, 0);
  _v2.normalize();
  const rMin = w.radius * 1.12;
  const rMax = Math.max(rMin + 0.08, atmosR(w, GOD_ATMOS) * 0.96);
  const stay = THREE.MathUtils.clamp(dist || rMax, rMin, rMax);
  _v3.copy(_v).sub(rig.position);
  rig.position.copy(w.group.position).addScaledVector(_v2, stay).sub(_v3);
  camera.near = 0.02;
  camera.far = 90;
  camera.updateProjectionMatrix();
  hudEl.classList.add("atmo");
  setModeBadge("PLANET SKY", w.template.name + " · X to leave");
  hudHint.textContent = "Inside " + w.template.name + "'s atmosphere. Full spore models load on the crust. Press X to return to the galaxy.";
  hudStatus.textContent = "ATMOSPHERE · " + w.template.name + " · X leaves";
}
function leaveSurface() {
  if (!lockedWorld) return;
  setSurfaceLod(lockedWorld, false);
  setAtmosMode(lockedWorld, false);
  setSkyDormant(sky, false);
  planetSky.visible = false;
  scene.background = new THREE.Color(0x07080f);
  scene.fog = null;
  hemi.intensity = 0.78;
  sun.intensity = 0.95;
  camera.near = 0.05;
  camera.far = 280;
  camera.updateProjectionMatrix();
  lockedWorld = null;
  hudEl.classList.remove("atmo");
  setModeBadge(null);
  hudHint.textContent = POWERS[power].hint;
}
function ejectOut() {
  if (!lockedWorld) return;
  camera.getWorldPosition(_v);
  const w = lockedWorld;
  leaveSurface();
  ejectNearPlanet(rig, w, _v);
}

function explodeMeteor(m, world, n, water) {
  if (world && n) {
    const heavy = m.userData?.heavy;
    world.crater(n, (water ? 0.85 : 1.35) * (heavy ? 1.85 : 1));
    boomSfx(water);
    burst(world, n, 0xff5511, water ? 10 : 22, 2.8);
    burst(world, n, water ? 0xcfe4f4 : 0xffee66, water ? 28 : 12, water ? 1.1 : 1.6);
  } else {
    boomSfx(false);
    const p = m.position.clone();
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    flash.position.copy(p);
    flash.userData = { vel: new THREE.Vector3(), life: 0.28, flash: true };
    scene.add(flash);
    fx.push(flash);
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 4), new THREE.MeshBasicMaterial({ color: 0xff5511, transparent: true }));
      s.position.copy(p);
      s.userData = { vel: new THREE.Vector3().randomDirection().multiplyScalar(2.4), life: 0.45 };
      scene.add(s);
      fx.push(s);
    }
  }
  scene.remove(m);
}

function strikeUfo(meteor, ufo, world) {
  const wp = new THREE.Vector3();
  ufo.getWorldPosition(wp);
  if (ufo.parent) ufo.parent.remove(ufo);
  scene.add(ufo);
  ufo.position.copy(wp);
  ufo.userData.dying = true;
  ufo.userData.dieT = 3;
  ufo.userData.spin = new THREE.Vector3().randomDirection().multiplyScalar(9);
  ufo.userData.wvel = meteor.userData.vel.clone().multiplyScalar(0.4);
  ufo.userData.wvel.add(new THREE.Vector3().randomDirection().multiplyScalar(1.4));
  world.ufos = world.ufos.filter((x) => x !== ufo);
  dyingUfos.push(ufo);
  boomSfx(false);
  hudStatus.textContent = "Saucer struck — spinning out.";
  if (meteor && meteor.parent) meteor.parent.remove(meteor);
  else if (meteor) scene.remove(meteor);
}

function tickDyingUfos(dt) {
  for (let i = dyingUfos.length - 1; i >= 0; i--) {
    const u = dyingUfos[i];
    u.userData.dieT -= dt;
    u.rotation.x += u.userData.spin.x * dt;
    u.rotation.y += u.userData.spin.y * dt;
    u.rotation.z += u.userData.spin.z * dt;
    if (u.userData.wvel) u.position.addScaledVector(u.userData.wvel, dt);
    if (u.userData.dieT <= 0) {
      boomSfx(false);
      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.9, depthWrite: false }),
      );
      flash.position.copy(u.position);
      flash.userData = { vel: new THREE.Vector3(), life: 0.3, flash: true };
      scene.add(flash);
      fx.push(flash);
      for (let k = 0; k < 18; k++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), new THREE.MeshBasicMaterial({ color: k % 2 ? 0x9ee7ff : 0xff6a2a, transparent: true }));
        s.position.copy(u.position);
        s.userData = { vel: new THREE.Vector3().randomDirection().multiplyScalar(2.8), life: 0.5 };
        scene.add(s);
        fx.push(s);
      }
      scene.remove(u);
      dyingUfos.splice(i, 1);
    }
  }
}

function tickMeteors(dt) {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.position.addScaledVector(m.userData.vel, dt);
    m.userData.age = (m.userData.age || 0) + dt;
    let hit = false;
    for (const w of worlds) {
      for (const ufo of w.ufos) {
        if (ufo.userData.dying) continue;
        ufo.getWorldPosition(_v);
        if (m.position.distanceTo(_v) < 0.28) {
          strikeUfo(m, ufo, w);
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    if (hit) {
      meteors.splice(i, 1);
      continue;
    }
    for (const w of worlds) {
      const d = m.position.distanceTo(w.group.position);
      const waterR = w.radius * waterAlt(w) * 1.01;
      const crustR = w.radius * 1.08;
      if (d < Math.max(waterR, crustR)) {
        const n = m.position.clone().sub(w.group.position).normalize();
        const water = isOcean(w, n) || d < waterR && d > w.radius * 0.92;
        explodeMeteor(m, w, n, water);
        hit = true;
        break;
      }
    }
    if (hit) {
      meteors.splice(i, 1);
      continue;
    }
    if (m.userData.age > 8) {
      explodeMeteor(m, null, null, false);
      meteors.splice(i, 1);
    }
  }
  tickDyingUfos(dt);
  for (let i = bolts.length - 1; i >= 0; i--) {
    bolts[i].t -= dt;
    bolts[i].mesh.material.opacity = Math.max(0, bolts[i].t * 5);
    if (bolts[i].t <= 0) {
      scene.remove(bolts[i].mesh);
      bolts.splice(i, 1);
    }
  }
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i];
    const mesh = p.mesh || p;
    const ud = p.mesh ? p : p.userData;
    ud.life -= dt;
    if (ud.vel) mesh.position.addScaledVector(ud.vel, dt);
    if (mesh.material && mesh.material.opacity != null) mesh.material.opacity = Math.max(0, ud.life * 2);
    if (ud.flash && mesh.scale) mesh.scale.addScalar(dt * (ud.nova ? 16 : 8));
    if (ud.shot) {
      for (const sh of ships) {
        if (sh.dead || sh === ud.from) continue;
        if (ud.from?.mesh === sh.mesh) continue;
        if (mesh.position.distanceTo(sh.mesh.position) < 0.22) {
          damageShip(sh, 8);
          ud.life = 0;
        }
      }
      for (const w of worlds) {
        for (const u of w.ufos) {
          if (u.userData.dying) continue;
          if (ud.from?.mesh === u) continue;
          u.getWorldPosition(_v);
          if (mesh.position.distanceTo(_v) < 0.24) {
            u.userData.hp = (u.userData.hp || 40) - 8;
            if (u.userData.hp <= 0) strikeUfo({ userData: { vel: ud.vel || new THREE.Vector3() } }, u, w);
            ud.life = 0;
          }
        }
      }
    }
    if (ud.life <= 0) {
      mesh.removeFromParent();
      scene.remove(mesh);
      fx.splice(i, 1);
    }
  }
}

function headPos() {
  if (renderer.xr.isPresenting) {
    const cam = renderer.xr.getCamera(camera);
    cam.getWorldPosition(_v3);
    return _v3;
  }
  camera.getWorldPosition(_v3);
  return _v3;
}

function loop(t) {
  const now = t * 0.001;
  const dt = Math.min(0.05, last ? now - last : 0.016);
  last = now;
  const xr = renderer.xr.isPresenting;
  if (sky.visible) sky.material.uniforms.uT.value = now;
  moveRig(dt, xr);

  const head = headPos();
  parentBadgeToHead();
  if (!lockedWorld) {
    let near = null;
    let nd = 1e9;
    for (const w of worlds) {
      if (!w.born || w === growing) continue;
      const d = head.distanceTo(w.group.position);
      if (d < nd) {
        nd = d;
        near = w;
      }
    }
    const inside = worldContaining(worlds.filter((w) => w.born && w !== growing), head, 0.04, GOD_ATMOS);
    if (inside) {
      enterSurface(inside);
    } else if (near) {
      const shell = atmosR(near, GOD_ATMOS);
      const warnR = shell * 1.85 + 0.6;
      if (nd < warnR) {
        hudHint.textContent = "Approaching " + near.template.name + " atmosphere — cross the blue shell to load surface detail.";
      }
    }
  } else {
    confineToAtmos(rig, head, lockedWorld, GOD_ATMOS);
    lockedWorld.ensureDetail();
    if (lockedWorld.surfaceLod !== true) setSurfaceLod(lockedWorld, true);
    else setAtmosMode(lockedWorld, true);
    planetSky.position.copy(lockedWorld.group.position);
    planetSky.scale.setScalar(Math.max(12, lockedWorld.radius * 9));
  }
  tickStudioAim();

  const gpR = xrGamepad(1);
  const gpL = xrGamepad(0);
  const rTrig = xr ? trigger(gpR) : mouse.down;
  const aBtn = !!(gpR?.buttons?.[4]?.pressed);
  const xBtn = !!(gpL?.buttons?.[4]?.pressed);
  const bBtn = !!(gpR?.buttons?.[5]?.pressed);
  const yBtn = !!(gpL?.buttons?.[5]?.pressed);

  if (xr) {
    const { o, d } = rightRay();
    const weatherA = aBtn && POWERS[power].id === "storm";
    fire(o, d, rTrig || weatherA, (rTrig && !pressed.t1) || (weatherA && !pressed.a), dt);
    pressed.t1 = rTrig;
    if (aBtn && !pressed.a && POWERS[power].id !== "storm") tryOpenMenuFromA();
    if (xBtn && !pressed.x) ejectOut();
    if (bBtn && !pressed.b) setPower(power + 1);
    if (yBtn && !pressed.y) setPower(power - 1);
    pressed.a = aBtn;
    pressed.x = xBtn;
    pressed.b = bBtn;
    pressed.y = yBtn;
  } else if (mouse.down || growing || pressed.t1) {
    const { o, d } = desktopRay();
    fire(o, d, mouse.down, mouse.down && !pressed.t1, dt);
    pressed.t1 = mouse.down;
  }

  let godN = null;
  if (lockedWorld) {
    godN = head.clone().sub(lockedWorld.group.position).normalize();
  }
  let lives = 0;
  for (const w of worlds) {
    w.stage(dt);
    w.tickLife(dt, w === lockedWorld ? godN : null, w === lockedWorld ? deityForm : null);
    lives += w.life.length;
  }
  tickMeteors(dt);
  tickShips(dt);
  if (lockedWorld) {
    hudEl.classList.add("atmo");
    hudStatus.textContent = "ATMOSPHERE · " + lockedWorld.template.name + " · " + lives + " lives · full models · X leaves";
    hudHint.textContent = "Atmosphere of " + lockedWorld.template.name + ". Complete spore creatures are on the crust. Press X to leave.";
  } else {
    hudEl.classList.remove("atmo");
    hudStatus.textContent = worlds.length
      ? `${worlds.length} world${worlds.length > 1 ? "s" : ""} · ${lives} lives · ${displayName(CREATURE_SLOTS[selSlot])}`
      : "Hold Forge to shape the first sphere.";
  }
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
  const n = Number(e.key);
  if (n >= 1 && n <= 9) setPower(n - 1);
  if (e.code === "Digit0") setPower(9);
  if (e.code === "Minus") setPower(10);
  if (e.code === "Equal") setPower(11);
  if (e.code === "KeyR") setPower((power + 1) % POWERS.length);
  if (e.code === "KeyX") ejectOut();
  if (e.code === "KeyF") {
    if (POWERS[power].id !== "form") setPower(POWERS.findIndex((p) => p.id === "form"));
  }
  if (e.code === "BracketLeft") {
    selSlot = (selSlot + SLOT_N - 1) % SLOT_N;
    studio.rebuildPreview();
    paintStudioHtml();
  }
  if (e.code === "BracketRight") {
    selSlot = (selSlot + 1) % SLOT_N;
    studio.rebuildPreview();
    paintStudioHtml();
  }
  if (e.code === "KeyP") {
    const war = !isWar(relations, selSlot, warSlot);
    setWar(relations, selSlot, warSlot, war);
    paintStudioHtml();
  }
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
  if (e.button === 0) mouse.down = true;
});
window.addEventListener("mouseup", () => {
  mouse.down = false;
});
window.addEventListener("wheel", (e) => {
  camera.getWorldDirection(_v);
  rig.position.addScaledVector(_v, -Math.sign(e.deltaY) * 0.55);
});
document.getElementById("veg").oninput = (e) => {
  if (selected) selected.vegH = Number(e.target.value);
};
document.getElementById("oceanhue").oninput = (e) => {
  if (selected) selected.seaH = Number(e.target.value);
};
document.getElementById("sealevel").oninput = (e) => {
  if (!selected) return;
  selected.setSea(Number(e.target.value) / 100);
  document.getElementById("insp-name").textContent = `Sphere · radius ${selected.radius.toFixed(2)} · sea ${Math.round(selected.seaLevel * 100)}`;
};
document.getElementById("wx").oninput = (e) => {
  if (selected) selected.storm = Number(e.target.value) / 100;
};
document.getElementById("btn-grove").onclick = () => {
  if (!selected) return;
  for (let i = 0; i < 18; i++) {
    const n = new THREE.Vector3().randomDirection();
    const spot = findPlantSpot(selected, n, 22);
    if (!spot || isOcean(selected, spot)) continue;
    if (Math.random() < 0.42) selected.addBush(spot);
    else selected.addTree(spot);
  }
};
document.getElementById("btn-close").onclick = () => {
  inspectEl.hidden = true;
  selected = null;
};
function beginDesktop() {
  startEl.style.display = "none";
  audio();
  canvas.requestPointerLock?.();
}
function wireStudioHtml() {
  const parts = document.getElementById("studio-parts");
  if (parts) parts.hidden = true;
  const socks = document.querySelector(".studio-socks");
  if (socks) socks.hidden = true;
  if (document.getElementById("studio")?.dataset.ready) return;
  if (document.getElementById("studio")) document.getElementById("studio").dataset.ready = "1";
  const nameEl = document.getElementById("studio-name");
  if (nameEl) {
    nameEl.oninput = () => {
      CREATURE_SLOTS[selSlot].name = nameEl.value.slice(0, 28) || "Spore";
      studio.rebuildPreview();
    };
  }
  const adjEl = document.getElementById("studio-adj");
  if (adjEl) {
    adjEl.oninput = () => {
      CREATURE_SLOTS[selSlot].adjectives = adjEl.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
      studio.rebuildPreview();
    };
  }
  const clearB = document.getElementById("studio-clear");
  if (clearB) {
    clearB.onclick = () => {
      CREATURE_SLOTS[selSlot].stats = zeroStats();
      studio.rebuildPreview();
      paintStudioHtml();
      hudStatus.textContent = "Life points cleared — they will be slow at everything.";
    };
  }
  document.getElementById("studio-random").onclick = () => {
    CREATURE_SLOTS[selSlot] = randomDna(selSlot);
    studio.rebuildPreview();
    paintStudioHtml();
  };
  document.getElementById("studio-save").onclick = () => {
    saveSlots(CREATURE_SLOTS);
    hudStatus.textContent = "Saved ten spores.";
  };
  document.getElementById("studio-war").onclick = () => {
    const war = !isWar(relations, selSlot, warSlot);
    setWar(relations, selSlot, warSlot, war);
    paintStudioHtml();
  };
}
wireStudioHtml();
paintWeatherHtml();
document.getElementById("go-desk").onclick = beginDesktop;
document.getElementById("go-vr").onclick = async () => {
  startEl.style.display = "none";
  audio();
  const xr = navigator.xr;
  if (!xr?.requestSession) {
    beginDesktop();
    return;
  }
  try {
    const overlay = document.getElementById("hud");
    const session = await xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "dom-overlay"],
      domOverlay: overlay ? { root: overlay.parentElement } : undefined,
    });
    await renderer.xr.setSession(session);
  } catch {
    try {
      const session = await xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
      await renderer.xr.setSession(session);
    } catch {
      beginDesktop();
    }
  }
};
const btn = XRButton.createButton(renderer, { optionalFeatures: ["local-floor"] });
btn.style.display = "none";
document.body.append(btn);
window.__controlsTest = {
  getYaw: () => lookYaw,
  getSpeed: () => (keys.has("KeyW") ? (lockedWorld ? 1.6 : 3.2) : 0),
  setKeys: (codes) => {
    keys.clear();
    (codes || []).forEach((c) => keys.add(c));
  },
};
window.__pm = {
  worlds,
  get locked() { return lockedWorld; },
  spawnWorld,
  enterSurface,
  leaveSurface,
  rig,
  camera,
  scene,
  renderer,
  status: () => (hudStatus ? hudStatus.textContent : ""),
  hint: () => (hudHint ? hudHint.textContent : ""),
  placeTestWorld: (opts = {}) => {
    const r = opts.radius || 1.4;
    const pos = opts.pos || rig.position.clone().add(new THREE.Vector3(0, 0, -3.2));
    const w = spawnWorld(pos, r);
    if (!w) return null;
    w.born = true;
    w.age = opts.age != null ? opts.age : 0;
    w.vel.set(0, 0, 0);
    if (opts.land) {
      w.uni.uLand.value = 1;
      w.uni.uMolten.value = 0;
      w.age = BIRTH;
      w.syncWater();
    }
    return { name: w.template.name, radius: w.radius, molten: w.uni.uMolten.value, land: w.uni.uLand.value };
  },
};

