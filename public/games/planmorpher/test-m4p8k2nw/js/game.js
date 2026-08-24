import * as THREE from "three";
import { XRButton } from "three/addons/webxr/XRButton.js";
import {
  ENTITY_SCALE,
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
  makePeg,
  setSurfaceLod,
  setSkyDormant,
  worldContaining,
  confineToAtmos,
  ejectNearPlanet,
} from "/games/shared/world-core.js";

const canvas = document.getElementById("c");
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
  { id: "beasts", name: "Life", hint: "Open the bestiary, then plant a species on the crust." },
  { id: "bolt", name: "Lightning", hint: "Strike the surface." },
  { id: "storm", name: "Weather", hint: "Spin the climate of the nearest world." },
  { id: "grove", name: "Grove", hint: "A miracle of trees rising from the soil." },
  { id: "form", name: "Form", hint: "Set your deity: Fearsome, Divine, or Inspiring." },
];

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
const MAX_LIFE = 48;
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
    this.vel = new THREE.Vector3().randomDirection().multiplyScalar(0.15);
    this.paint = makePaint();
    this.trees = [];
    this.life = [];
    this.huts = [];
    this.ufos = [];
    this.fires = [];
    this.craters = [];
    this.groundDetail = [];
    this.detailReady = false;
    this.surfaceLod = false;
    this.ageIndex = 0;
    this.stores = { wood: 0, stone: 0, food: 0 };
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const uniforms = planetUniforms(seed, hsl(this.vegH, 0.45, 0.32), hsl(this.seaH, 0.55, 0.32), this.paint.tex, tpl, this.seaLevel);
    this.uni = uniforms;
    const segs = 56;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segs, 40), new THREE.ShaderMaterial({ uniforms, vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG }));
    this.mesh.scale.setScalar(radius);
    this.mesh.userData.world = this;
    this.group.add(this.mesh);
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
    this.atmosShell = makeAtmosShell(radius, this);
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

  setSea(v) {
    this.seaLevel = THREE.MathUtils.clamp(v, 0.18, 0.82);
    this.uni.uSea.value = this.seaLevel;
  }

  stage(dt) {
    if (!this.born) return;
    this.age = Math.min(BIRTH, this.age + dt);
    const t = this.age / BIRTH;
    const molten = t < 0.22 ? 1 - t / 0.22 : 0;
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
    this.clouds.material.uniforms.uAlpha.value = Math.max(clouds * 0.85, this.storm * 0.35);
    this.clouds.material.uniforms.uTime.value += dt;
    this.clouds.rotation.y += dt * (0.08 + this.storm * 0.12);
    this.rain.material.opacity = rain * (0.35 + this.storm * 0.4);
    this.rain.visible = rain > 0.03 && !this.surfaceLod;
    this.group.position.addScaledVector(this.vel, dt);
    this.vel.multiplyScalar(0.985);
    this.tickFires(dt);
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
    if (this.trees.length > 70) return;
    const n = normal.clone().normalize();
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
    this.group.add(g);
    this.trees.push(g);
    g.userData.peg = this.addPegAt(n, 0x2f7a3a);
    startRise(g, n, this.radius * 0.86, this.radius * 1.015, ENTITY_SCALE);
    g.visible = this.surfaceLod;
    return g;
  }

  hutStyle() {
    return BUILD_AGES[this.ageIndex] || BUILD_AGES[0];
  }

  buildHutMesh(g, style) {
    while (g.children.length) g.remove(g.children[0]);
    const s = style.scale * ENTITY_SCALE;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.028 * s, 0.032 * s, 0.04 * s, style.id === "paleo" ? 5 : 8), new THREE.MeshBasicMaterial({ color: style.wall }));
    wall.position.y = 0.02 * s;
    g.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.04 * s, 6), new THREE.MeshBasicMaterial({ color: style.roof }));
    roof.position.y = 0.05 * s;
    g.add(roof);
    if (this.ageIndex >= 2) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.012 * s, 0.018 * s, 0.004), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }));
      door.position.set(0, 0.012 * s, 0.032 * s);
      g.add(door);
    }
    if (this.ageIndex >= 4) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.01 * s, 0.012 * s, 0.07 * s, 6), new THREE.MeshBasicMaterial({ color: 0x8a8a90 }));
      tower.position.set(0.03 * s, 0.04 * s, 0);
      g.add(tower);
    }
  }

  addHut(normal) {
    if (this.huts.length > 16) return;
    const n = normal.clone().normalize();
    const g = new THREE.Group();
    this.buildHutMesh(g, this.hutStyle());
    g.userData.kind = "hut";
    g.userData.stores = 0;
    g.userData.hp = 40 + this.ageIndex * 18;
    g.userData.maxHp = g.userData.hp;
    this.group.add(g);
    this.huts.push(g);
    g.userData.peg = this.addPegAt(n, 0xc4b48a);
    startRise(g, n, this.radius * 0.88, this.radius * 1.02, ENTITY_SCALE);
    g.visible = this.surfaceLod;
    return g;
  }

  restyleHuts() {
    const st = this.hutStyle();
    for (const h of this.huts) {
      if (h.userData.dead) continue;
      this.buildHutMesh(h, st);
      h.userData.hp = 40 + this.ageIndex * 18;
      h.userData.maxHp = h.userData.hp;
    }
  }

  tryAdvanceAge() {
    const next = BUILD_AGES[this.ageIndex + 1];
    if (!next) return;
    if (this.stores.wood >= next.wood && this.stores.stone >= next.stone && this.stores.food >= next.food && this.huts.length >= 2) {
      this.ageIndex++;
      this.stores.wood = Math.max(0, this.stores.wood - next.wood * 0.4);
      this.stores.stone = Math.max(0, this.stores.stone - next.stone * 0.4);
      this.restyleHuts();
      hudStatus.textContent = this.template.name + " enters the " + this.hutStyle().name + " age.";
    }
  }

  addCreature(def, normal) {
    if (this.life.length >= MAX_LIFE) return null;
    const n = normal.clone().normalize();
    const map = sprTex(def.file, def.sheet).clone();
    map.needsUpdate = true;
    if (def.sheet) {
      map.repeat.set(0.25, 0.25);
      map.offset.set(0, 0.75);
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
    const sc = (this.radius * 0.55 + 0.55) * ENTITY_SCALE;
    s.scale.set(def.w * sc, def.h * sc, 1);
    s.center.set(0.5, 0);
    s.userData = {
      def,
      n,
      hunger: 0.2,
      wood: 0,
      stone: 0,
      food: 0,
      age: 0,
      frame: 0,
      t: Math.random() * 4,
      heading: Math.random() * 6.28,
      home: null,
      dead: false,
      hp: def.hp || 24,
      maxHp: def.hp || 24,
      inspireT: 0,
      sawGod: false,
      screamT: 0,
      aweT: 0,
      ackT: 0,
    };
    this.group.add(s);
    this.life.push(s);
    s.userData.s1w = def.w * sc;
    s.userData.s1h = def.h * sc;
    const land = isLand(this, n);
    const r1 = this.radius * (land ? 1.02 : 0.995);
    startRise(s, n, this.radius * 0.9, r1, 1);
    const pegCol = def.kind === "human" ? 0xe8d0a8 : def.diet === "meat" ? 0xaa3333 : 0x88aa66;
    s.userData.peg = this.addPegAt(n, pegCol);
    s.visible = this.surfaceLod;
    return s;
  }

  addUfo() {
    if (this.ufos.length > 3) return;
    const u = makeUfo();
    u.userData.a = Math.random() * 6.28;
    this.group.add(u);
    this.ufos.push(u);
  }

  ensureDetail() {
    if (this.detailReady || this.uni.uLand.value < 0.4) return;
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
    if (c.material) {
      c.material.color.set(u.hp <= 0 ? 0x888888 : 0xff3355);
      u.tintT = 0.35;
    }
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

  tickLife(dt, godN, formId) {
    for (const t of this.trees) {
      tickRise(t, dt);
      if (t.userData.n && t.userData.rise >= 1) {
        const dry = isLand(this, t.userData.n);
        sitRadial(t, t.userData.n, this.radius * (dry ? 1.015 : 0.97));
        t.visible = this.surfaceLod && dry;
        if (t.userData.peg) {
          sit(t.userData.peg, this, t.userData.n, dry ? 1.018 : 0.97);
          t.userData.peg.visible = !this.surfaceLod && dry;
        }
      }
    }
    for (const h of this.huts) {
      tickRise(h, dt);
      if (h.userData.n && h.userData.rise >= 1) {
        const dry = isLand(this, h.userData.n);
        sitRadial(h, h.userData.n, this.radius * (dry ? 1.02 : 0.97));
        h.visible = this.surfaceLod && dry;
        if (h.userData.peg) {
          sit(h.userData.peg, this, h.userData.n, dry ? 1.018 : 0.97);
          h.userData.peg.visible = !this.surfaceLod && dry;
        }
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
      if (u.tintT > 0) {
        u.tintT -= dt;
        if (u.tintT <= 0 && c.material) c.material.color.set(0xffffff);
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
      const buff = u.inspireT > 0 ? 1.45 : 1;
      const spd = def.spd * (land ? 1 : 0.38) * (this.radius * 0.12) * buff;
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
      if (formId === "fearsome" && godClose) {
        /* flee already steered */
      } else if (def.diet === "plant") {
        const tree = nearestDot(this.trees, u.n);
        if (tree && tree.userData.n.dot(u.n) > 0.96) {
          tree.userData.food -= dt * 0.8;
          u.hunger = Math.max(0, u.hunger - dt * 0.4);
          if (tree.userData.food <= 0) {
            if (tree.userData.peg) this.group.remove(tree.userData.peg);
            this.group.remove(tree);
            this.trees = this.trees.filter((x) => x !== tree);
          }
        } else if (tree) steerToward(u, tree.userData.n, dt * 1.4);
      } else if (def.diet === "meat") {
        const prey = this.life.find((o) => o !== c && !o.userData.dead && o.userData.def.diet !== "meat" && o.userData.n.dot(u.n) > 0.3);
        if (prey) {
          steerToward(u, prey.userData.n, dt * 2.2);
          if (prey.userData.n.dot(u.n) > 0.995) {
            const dmg = 14 * (u.inspireT > 0 ? 1.5 : 1);
            this.hurtLife(prey, dmg);
            u.hunger = 0;
          }
        }
      } else if (def.kind === "human") {
        const threat = this.life.find((o) => o.userData.def.diet === "meat" && o.userData.n.dot(u.n) > 0.97);
        if (threat && !(formId === "divine" && godClose)) steerToward(u, threat.userData.n, -dt * 2.5);
        else if (!(formId === "divine" && godClose) && !(formId === "inspire" && u.ackT > 0)) {
          const gather = 0.7 * buff;
          const tree = nearestDot(this.trees, u.n);
          const rock = nearestKind(this.groundDetail, u.n, "rock");
          const bush = nearestKind(this.groundDetail, u.n, "bush");
          if (tree && u.wood < 4) {
            steerToward(u, tree.userData.n, dt * 1.6);
            if (tree.userData.n.dot(u.n) > 0.985) {
              u.wood += dt * gather;
              u.food += dt * 0.2 * buff;
              u.hunger = Math.max(0, u.hunger - dt * 0.2);
              tree.userData.food -= dt * 0.4;
              tree.userData.wood -= dt * 0.3;
            }
          } else if (rock && u.stone < 3 && this.ageIndex >= 1) {
            steerToward(u, rock.userData.n, dt * 1.4);
            if (rock.userData.n.dot(u.n) > 0.985) {
              u.stone += dt * 0.45 * buff;
              rock.userData.stone -= dt * 0.4;
              if (rock.userData.stone <= 0) {
                this.group.remove(rock);
                this.groundDetail = this.groundDetail.filter((x) => x !== rock);
              }
            }
          } else if (bush && u.food < 2) {
            steerToward(u, bush.userData.n, dt * 1.3);
            if (bush.userData.n && bush.userData.n.dot(u.n) > 0.985) {
              u.food += dt * 0.5 * buff;
              u.hunger = Math.max(0, u.hunger - dt * 0.25);
            }
          } else if (u.wood >= 3 && this.huts.length < 10) {
            this.addHut(u.n);
            this.stores.wood += u.wood;
            this.stores.stone += u.stone;
            this.stores.food += u.food;
            u.wood = 0;
            u.stone = 0;
            u.food = 0;
            this.tryAdvanceAge();
          } else if (this.huts[0]) {
            steerToward(u, this.huts[0].userData.n, dt);
            if (this.huts[0].userData.n.dot(u.n) > 0.98) {
              this.stores.wood += u.wood;
              this.stores.stone += u.stone;
              this.stores.food += u.food;
              u.wood = u.stone = u.food = 0;
              this.tryAdvanceAge();
            }
          }
        }
      }
      if (u.hunger > 1.6) {
        this.hurtLife(c, 999);
        continue;
      }
      const axis = new THREE.Vector3().crossVectors(u.n, new THREE.Vector3(Math.cos(u.heading), 0, Math.sin(u.heading)));
      if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
      axis.normalize();
      u.n.applyAxisAngle(axis, spd * dt);
      u.n.normalize();
      const r = this.radius * (land ? 1.02 : 0.992);
      sitRadial(c, u.n, r);
      if (u.peg) sit(u.peg, this, u.n, 1.018);
      if (u.def.sheet && c.material.map) {
        const f = Math.floor(performance.now() * 0.006 + u.age) % 4;
        c.material.map.offset.x = f * 0.25;
      }
      if (c.userData.s1w) c.scale.set(c.userData.s1w, c.userData.s1h * (land ? 1 : 0.72), 1);
    }
    for (const u of this.ufos) {
      u.userData.a += dt * 0.35;
      const r = this.radius * 1.55;
      u.position.set(Math.cos(u.userData.a) * r, Math.sin(u.userData.a * 0.7) * this.radius * 0.4, Math.sin(u.userData.a) * r);
      u.lookAt(0, 0, 0);
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

function makeBestiary() {
  const g = new THREE.Group();
  g.visible = false;
  const hits = [];
  SPECIES.forEach((s, i) => {
    const col = 2;
    const x = (i % col) * 0.11 - 0.05;
    const y = 0.16 - Math.floor(i / col) * 0.055;
    const pl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.048),
      new THREE.MeshBasicMaterial({ map: labelTex(s.name), transparent: true, side: THREE.DoubleSide, depthTest: false }),
    );
    pl.position.set(x, y, 0.02);
    pl.userData.species = s.id;
    g.add(pl);
    hits.push(pl);
  });
  g.position.set(0.22, 0.08, 0.08);
  return { group: g, hits };
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

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 280);
const rig = new THREE.Group();
rig.position.set(0, 1.5, 8);
scene.add(rig);
rig.add(camera);
const sky = makeSky();
scene.add(sky);
scene.add(new THREE.HemisphereLight(0x8899aa, 0x110800, 0.7));
const sun = new THREE.DirectionalLight(0xffe6c8, 0.9);
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
const bestiary = makeBestiary();
ctrl.g0.add(bestiary.group);
const formPick = makeFormPicker();
ctrl.g0.add(formPick.group);
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

function setPower(i) {
  power = (i + POWERS.length) % POWERS.length;
  hudPower.textContent = POWERS[power].name;
  hudHint.textContent = POWERS[power].hint;
  bestiary.group.visible = POWERS[power].id === "beasts";
  formPick.group.visible = POWERS[power].id === "form";
  palette.gems.forEach((g) => {
    if (g.userData.power != null && g.geometry?.type === "IcosahedronGeometry") {
      g.scale.setScalar(g.userData.power === power ? 1.45 : 1);
    }
  });
}
setPower(0);

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
}

function applyPower(w, point, normal, uv, hold) {
  if (!w) return;
  const id = POWERS[power].id;
  if (id === "select" || id === "form") return;
  if (id === "rain") {
    w.uni.uLand.value = Math.min(1, w.uni.uLand.value + 0.12);
    w.storm = Math.min(1, w.storm + 0.08);
    w.clouds.material.uniforms.uAlpha.value = Math.min(1, w.clouds.material.uniforms.uAlpha.value + 0.2);
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
  else if (id === "raise" && uv) paintAt(w.paint, uv, 18, 3);
  else if (id === "lower" && uv) paintAt(w.paint, uv, -18, 3);
  else if (id === "beasts" && normal) {
    w.addCreature(pickSpecies, normal);
    hudStatus.textContent = "A " + pickSpecies.name + " climbs into being.";
  } else if (id === "grove" && normal) {
    for (let i = 0; i < 5; i++) {
      const n = normal.clone().normalize();
      n.add(_v2.set((Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.22)).normalize();
      w.addTree(n);
    }
  } else if (id === "bolt" && point) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([ctrl[1].getWorldPosition(_v).clone(), point.clone()]),
      new THREE.LineBasicMaterial({ color: 0xcfe9ff, transparent: true }),
    );
    scene.add(line);
    bolts.push({ mesh: line, t: 0.18 });
    w.storm = Math.min(1, w.storm + 0.05);
  } else if (id === "storm") {
    w.storm = hold ? Math.min(1, w.storm + 0.4) : 0.85;
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
  const speed = lockedWorld ? 1.6 : 3.2;
  camera.getWorldDirection(_v);
  _v.y = 0;
  if (_v.lengthSq() < 0.0001) _v.set(0, 0, -1);
  _v.normalize();
  _v2.crossVectors(_v, new THREE.Vector3(0, 1, 0)).normalize();
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
  rig.position.add(_v.multiplyScalar(fz * speed * dt));
  rig.position.add(_v2.multiplyScalar(fx * speed * dt));
  rig.position.y += fy * speed * dt;
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

function pokeUi(origin, dir) {
  _ray.set(origin, dir);
  if (bestiary.group.visible) {
    const bh = _ray.intersectObjects(bestiary.hits, false);
    if (bh[0]?.object?.userData?.species) {
      pickSpecies = SPECIES.find((s) => s.id === bh[0].object.userData.species) || pickSpecies;
      hudStatus.textContent = "Placing " + pickSpecies.name;
      hudHint.textContent = "Point at a world to raise a " + pickSpecies.name + " from the crust.";
      return true;
    }
  }
  if (formPick.group.visible) {
    const fh = _ray.intersectObjects(formPick.hits, false);
    if (fh[0]?.object?.userData?.form) {
      setForm(fh[0].object.userData.form);
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

function fire(origin, dir, holding, justPressed, dt) {
  if (justPressed && pokeUi(origin, dir)) return;
  const id = POWERS[power].id;
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
  if (id === "forge") {
    if (holding && !growing) startGrow(origin.clone().add(dir.clone().multiplyScalar(0.4)));
    if (holding && growing) holdGrow(origin.clone().add(dir.clone().multiplyScalar(0.55 + growing.radius)), dt);
    if (!holding && growing) releaseGrow(dir);
    return;
  }
  const continuous = id === "rain" || id === "raise" || id === "lower" || id === "storm";
  if (continuous && !holding) return;
  if (!continuous && !justPressed) return;
  const hit = hitWorld(origin, dir);
  const w = hit?.object?.userData?.world || nearestWorld(origin, 8);
  if (!w) return;
  const n = hit?.face?.normal
    ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
    : dir.clone().negate();
  applyPower(w, hit?.point || origin.clone().add(dir.clone().multiplyScalar(2)), n, hit?.uv, holding);
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
  w.ensureDetail();
  setSurfaceLod(w, true);
  camera.near = 0.02;
  camera.far = 80;
  camera.updateProjectionMatrix();
  hudHint.textContent = "Lower sky. The void sleeps. Press X to return to the galaxy map.";
}
function leaveSurface() {
  if (!lockedWorld) return;
  setSurfaceLod(lockedWorld, false);
  setSkyDormant(sky, false);
  camera.near = 0.05;
  camera.far = 280;
  camera.updateProjectionMatrix();
  lockedWorld = null;
  hudHint.textContent = POWERS[power].hint;
}
function ejectOut() {
  if (!lockedWorld) return;
  camera.getWorldPosition(_v);
  const w = lockedWorld;
  leaveSurface();
  ejectNearPlanet(rig, w, _v);
}

function tickMeteors(dt) {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.position.addScaledVector(m.userData.vel, dt);
    const w = m.userData.target;
    if (w && m.position.distanceTo(w.group.position) < w.radius * 1.04) {
      const n = m.position.clone().sub(w.group.position).normalize();
      const water = isOcean(w, n);
      w.crater(n, water ? 0.85 : 1.35);
      boomSfx(water);
      burst(w, n, 0xff5511, water ? 10 : 22, 2.8);
      burst(w, n, water ? 0xcfe4f4 : 0xffee66, water ? 28 : 12, water ? 1.1 : 1.6);
      scene.remove(m);
      meteors.splice(i, 1);
    }
  }
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
    p.userData.life -= dt;
    p.position.addScaledVector(p.userData.vel, dt);
    if (p.material.opacity != null) p.material.opacity = Math.max(0, p.userData.life * 2);
    if (p.userData.flash) p.scale.addScalar(dt * 8);
    if (p.userData.life <= 0) {
      scene.remove(p);
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
  if (!lockedWorld) {
    const w = worldContaining(worlds, head, 0);
    if (w && w.born && w.uni.uLand.value > 0.35) enterSurface(w);
  } else {
    confineToAtmos(rig, head, lockedWorld);
    if (!lockedWorld.surfaceLod) setSurfaceLod(lockedWorld, true);
  }

  const gpR = xrGamepad(1);
  const gpL = xrGamepad(0);
  const rTrig = xr ? trigger(gpR) : mouse.down;
  const aBtn = !!(gpR?.buttons?.[4]?.pressed);
  const xBtn = !!(gpL?.buttons?.[4]?.pressed);
  const bBtn = !!(gpR?.buttons?.[5]?.pressed);
  const yBtn = !!(gpL?.buttons?.[5]?.pressed);

  if (xr) {
    const { o, d } = rightRay();
    fire(o, d, rTrig, rTrig && !pressed.t1, dt);
    pressed.t1 = rTrig;
    if (aBtn && !pressed.a) tryOpenMenuFromA();
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
  const lockTxt = lockedWorld ? " · in " + lockedWorld.template.name + " sky" : "";
  hudStatus.textContent = worlds.length
    ? `${worlds.length} world${worlds.length > 1 ? "s" : ""} · ${lives} lives · ${pickSpecies.name}${lockTxt}`
    : "Hold Forge to shape the first sphere.";
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
  for (let i = 0; i < 14; i++) selected.addTree(new THREE.Vector3().randomDirection());
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

