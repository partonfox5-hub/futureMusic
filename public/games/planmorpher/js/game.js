import * as THREE from "three";
import { XRButton } from "three/addons/webxr/XRButton.js";

const canvas = document.getElementById("c");
const hudPower = document.getElementById("power-name");
const hudHint = document.getElementById("hint");
const hudStatus = document.getElementById("status");
const inspectEl = document.getElementById("inspect");
const startEl = document.getElementById("start");

const POWERS = [
  { id: "forge", name: "Forge", hint: "Hold to grow a molten world. Release to set it free." },
  { id: "rain", name: "Rain", hint: "Call clouds. Rain writes oceans faster." },
  { id: "meteor", name: "Meteors", hint: "Hurl fire into the crust." },
  { id: "ufo", name: "Visitors", hint: "Invite a saucer to orbit the world in range." },
  { id: "raise", name: "Uplift", hint: "Raise land where you point." },
  { id: "lower", name: "Subside", hint: "Sink crust back toward the sea." },
  { id: "life", name: "Life", hint: "Seed walking creatures on dry ground." },
  { id: "bolt", name: "Lightning", hint: "Strike the surface." },
  { id: "storm", name: "Weather", hint: "Spin the climate of the nearest world." },
  { id: "grove", name: "Grove", hint: "A miracle of trees." },
  { id: "gaze", name: "Gaze", hint: "Select a world to tint seas, forests, weather." },
];

const MAX_WORLDS = 8;
const BIRTH = 30;
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _n = new THREE.Vector3();
const _ray = new THREE.Raycaster();

const PLANET_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec2 vUv;
uniform float uDisp; uniform float uSeed; uniform sampler2D uPaint; uniform float uLand;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))+uSeed)*43758.5453); }
float noise(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  float n000=hash(i), n100=hash(i+vec3(1,0,0)), n010=hash(i+vec3(0,1,0)), n110=hash(i+vec3(1,1,0));
  float n001=hash(i+vec3(0,0,1)), n101=hash(i+vec3(1,0,1)), n011=hash(i+vec3(0,1,1)), n111=hash(i+vec3(1,1,1));
  float nx00=mix(n000,n100,f.x), nx10=mix(n010,n110,f.x), nx01=mix(n001,n101,f.x), nx11=mix(n011,n111,f.x);
  return mix(mix(nx00,nx10,f.y), mix(nx01,nx11,f.y), f.z);
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
uniform float uAge; uniform float uMolten; uniform vec3 uVeg; uniform vec3 uOcean;
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
  float spec = pow(max(0.0, dot(reflect(normalize(vec3(-0.3,-0.5,-0.2)), n), vec3(0,0,1))), 24.0) * (1.0-landMask) * uLand;
  col += spec * uOcean * 0.35;
  gl_FragColor = vec4(col, 1.0);
}
`;

const CLOUD_VERT = /* glsl */ `
varying vec3 vP;
void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const CLOUD_FRAG = /* glsl */ `
varying vec3 vP;
uniform float uTime; uniform float uAlpha; uniform float uSeed; uniform float uStorm;
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
  const c = new THREE.Color();
  c.setHSL(((h % 360) + 360) % 360 / 360, s, l);
  return c;
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
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return { tex, data, s };
}

function paintAt(paint, uv, amount) {
  const x = Math.floor(uv.x * paint.s) % paint.s;
  const y = Math.floor(uv.y * paint.s) % paint.s;
  const r = 2;
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
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
  const mat = new THREE.MeshBasicMaterial({
    color: 0x9ee7ff,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: 0x4ec4ff,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), mat);
  palm.scale.set(1.1, 0.55, 1.3);
  g.add(palm);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), glow);
  g.add(halo);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.055, 4, 6), mat);
    const t = (i - 2) * 0.022;
    f.position.set(t, 0.02, -0.055);
    f.rotation.x = -0.35;
    g.add(f);
  }
  return g;
}

function makeSky() {
  const geo = new THREE.SphereGeometry(220, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vP; uniform float uT;
      float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
      void main(){
        vec3 n=normalize(vP);
        float stars = step(0.996, hash(floor(n*280.0)));
        float neb = pow(max(0.0, sin(n.x*2.2+n.y+uT*0.02)*0.5+0.5), 3.0);
        vec3 col = vec3(0.02,0.03,0.06) + vec3(0.25,0.12,0.35)*neb*0.35 + vec3(0.55,0.18,0.08)*pow(neb,2.0)*0.12;
        col += vec3(0.85,0.92,1.0)*stars;
        gl_FragColor = vec4(col,1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function makeUfo() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xc5ccd8 }),
  );
  disc.scale.set(1, 0.28, 1);
  g.add(disc);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x7ad7ff, transparent: true, opacity: 0.55 }),
  );
  dome.position.y = 0.04;
  g.add(dome);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.012, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0x9ee7ff }),
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

class World {
  constructor(pos, radius, seed) {
    this.radius = radius;
    this.age = 0;
    this.born = false;
    this.seed = seed;
    this.vegH = 118;
    this.seaH = 205;
    this.storm = 0.15;
    this.vel = new THREE.Vector3().randomDirection().multiplyScalar(0.15);
    this.paint = makePaint();
    this.trees = [];
    this.life = [];
    this.ufos = [];
    this.rain = null;
    this.group = new THREE.Group();
    this.group.position.copy(pos);

    const uniforms = {
      uAge: { value: 0 },
      uMolten: { value: 1 },
      uLand: { value: 0 },
      uDisp: { value: 0.09 },
      uSeed: { value: seed },
      uStorm: { value: 0.15 },
      uVeg: { value: hsl(this.vegH, 0.45, 0.32) },
      uOcean: { value: hsl(this.seaH, 0.55, 0.32) },
      uPaint: { value: this.paint.tex },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat);
    this.mesh.scale.setScalar(radius);
    this.mesh.userData.world = this;
    this.group.add(this.mesh);
    this.uni = uniforms;

    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAlpha: { value: 0 },
          uSeed: { value: seed + 3 },
          uStorm: { value: 0.15 },
        },
        vertexShader: CLOUD_VERT,
        fragmentShader: CLOUD_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.clouds.scale.setScalar(radius);
    this.group.add(this.clouds);

    const rainGeo = new THREE.BufferGeometry();
    const count = 180;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = Math.sin(v) * Math.cos(u);
      arr[i * 3 + 1] = Math.cos(v);
      arr[i * 3 + 2] = Math.sin(v) * Math.sin(u);
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    this.rain = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: 0x9ec8ff, size: 0.025, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.rain.scale.setScalar(radius * 1.08);
    this.group.add(this.rain);
  }

  stage(dt) {
    if (!this.born) return;
    this.age = Math.min(BIRTH, this.age + dt);
    const t = this.age / BIRTH;
    const molten = t < 0.22 ? 1 - t / 0.22 : 0;
    let land = 0;
    let clouds = 0;
    let rain = 0;
    if (t > 0.32) clouds = THREE.MathUtils.clamp((t - 0.32) / 0.22, 0, 1);
    if (t > 0.42) rain = THREE.MathUtils.clamp((t - 0.42) / 0.18, 0, 0.85);
    if (t > 0.55) land = THREE.MathUtils.clamp((t - 0.55) / 0.28, 0, 1);
    this.uni.uAge.value = t;
    this.uni.uMolten.value = molten;
    this.uni.uLand.value = Math.max(land, this.uni.uLand.value);
    this.uni.uStorm.value = this.storm;
    this.uni.uVeg.value.copy(hsl(this.vegH, 0.48, 0.32));
    this.uni.uOcean.value.copy(hsl(this.seaH, 0.58, 0.3));
    this.clouds.material.uniforms.uAlpha.value = Math.max(clouds * 0.85, this.storm * 0.4);
    this.clouds.material.uniforms.uStorm.value = this.storm;
    this.clouds.material.uniforms.uTime.value += dt;
    this.clouds.rotation.y += dt * (0.08 + this.storm * 0.12);
    this.rain.material.opacity = rain * (0.35 + this.storm * 0.5);
    this.rain.rotation.y += dt * 0.2;
    this.group.position.addScaledVector(this.vel, dt);
    this.vel.multiplyScalar(0.985);
  }

  addTree(normal) {
    if (this.trees.length > 70) return;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.14, 6),
      new THREE.MeshBasicMaterial({ color: hsl(this.vegH, 0.55, 0.28) }),
    );
    placeOnSphere(cone, normal, this.radius * 1.02);
    this.group.add(cone);
    this.trees.push(cone);
  }

  addLife(normal) {
    if (this.life.length > 22) return;
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xe8d5a3 }),
    );
    placeOnSphere(body, normal, this.radius * 1.04);
    body.userData.n = normal.clone();
    body.userData.spin = (Math.random() - 0.5) * 0.6;
    this.group.add(body);
    this.life.push(body);
  }

  addUfo() {
    if (this.ufos.length > 3) return;
    const u = makeUfo();
    u.userData.a = Math.random() * Math.PI * 2;
    u.userData.inc = 0.35 + Math.random() * 0.5;
    this.group.add(u);
    this.ufos.push(u);
  }

  tickOrbits(dt) {
    for (const u of this.ufos) {
      u.userData.a += dt * 0.35;
      const r = this.radius * 1.55;
      u.position.set(
        Math.cos(u.userData.a) * r,
        Math.sin(u.userData.a * 0.7) * this.radius * 0.4,
        Math.sin(u.userData.a) * r,
      );
      u.lookAt(0, 0, 0);
    }
    for (const c of this.life) {
      const q = new THREE.Quaternion().setFromAxisAngle(c.userData.n, c.userData.spin * dt);
      c.userData.n.applyQuaternion(q);
      placeOnSphere(c, c.userData.n, this.radius * 1.04);
    }
  }
}

function placeOnSphere(mesh, n, r) {
  mesh.position.copy(n).multiplyScalar(r);
  mesh.lookAt(0, 0, 0);
  mesh.rotateX(Math.PI);
}

function makePalette() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 24),
    new THREE.MeshBasicMaterial({ color: 0x10141c, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  );
  plate.rotation.x = -Math.PI / 2;
  g.add(plate);
  const gems = [];
  POWERS.forEach((p, i) => {
    const a = (i / POWERS.length) * Math.PI * 2 - Math.PI / 2;
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.022, 0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(i / POWERS.length, 0.55, 0.55) }),
    );
    m.position.set(Math.cos(a) * 0.11, 0.02, Math.sin(a) * 0.11);
    m.userData.power = i;
    g.add(m);
    gems.push(m);
  });
  g.position.set(0, 0.05, 0.12);
  g.visible = true;
  return { group: g, gems };
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
const laser = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.4)]),
  new THREE.LineBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0.45 }),
);
ctrl[1].add(laser);

function setPower(i) {
  power = (i + POWERS.length) % POWERS.length;
  hudPower.textContent = POWERS[power].name;
  hudHint.textContent = POWERS[power].hint;
  palette.gems.forEach((g, n) => {
    g.scale.setScalar(n === power ? 1.45 : 1);
  });
}
setPower(0);

function nearestWorld(from, max = 6) {
  let best = null;
  let bd = max;
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

function applyPower(w, point, normal, uv, hold) {
  if (!w) return;
  const id = POWERS[power].id;
  if (id === "rain") {
    w.uni.uLand.value = Math.min(1, w.uni.uLand.value + 0.12);
    w.storm = Math.min(1, w.storm + 0.08);
    w.clouds.material.uniforms.uAlpha.value = Math.min(1, w.clouds.material.uniforms.uAlpha.value + 0.2);
  } else if (id === "meteor") {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff6a2a }),
    );
    camera.getWorldPosition(_v);
    m.position.copy(_v).add(_v2.set(0, 1.2, 0));
    m.userData.vel = point.clone().sub(m.position).normalize().multiplyScalar(6);
    m.userData.target = w;
    scene.add(m);
    meteors.push(m);
  } else if (id === "ufo") w.addUfo();
  else if (id === "raise" && uv) paintAt(w.paint, uv, 18);
  else if (id === "lower" && uv) paintAt(w.paint, uv, -18);
  else if (id === "life" && normal) w.addLife(normal.clone().normalize());
  else if (id === "grove" && normal) {
    for (let i = 0; i < 6; i++) {
      const n = normal.clone().normalize();
      n.x += (Math.random() - 0.5) * 0.2;
      n.y += (Math.random() - 0.5) * 0.2;
      n.z += (Math.random() - 0.5) * 0.2;
      n.normalize();
      w.addTree(n);
    }
  } else if (id === "bolt" && point) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([ctrl[1].getWorldPosition(_v).clone(), point.clone()]),
      new THREE.LineBasicMaterial({ color: 0xcfe9ff }),
    );
    scene.add(line);
    bolts.push({ mesh: line, t: 0.18 });
    w.storm = Math.min(1, w.storm + 0.05);
  } else if (id === "storm") {
    w.storm = hold ? Math.min(1, w.storm + 0.4) : 0.85;
  } else if (id === "gaze") {
    selected = w;
    inspectEl.hidden = false;
    document.getElementById("insp-name").textContent = `Sphere · radius ${w.radius.toFixed(2)}`;
    document.getElementById("veg").value = String(w.vegH);
    document.getElementById("sea").value = String(w.seaH);
    document.getElementById("wx").value = String(Math.round(w.storm * 100));
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
  growing.group.position.lerp(pos, 0.35);
}

function releaseGrow(away) {
  if (!growing) return;
  growing.born = true;
  growing.vel.copy(away).multiplyScalar(0.45);
  hudStatus.textContent = "A world begins. Thirty heartbeats to ocean and stone.";
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

const pressed = { t0: false, t1: false, b4: false, b5: false };
function trigger(gp) {
  return !!(gp?.buttons?.[0]?.pressed || gp?.buttons?.[1]?.pressed);
}

function moveRig(dt, xr) {
  const speed = 3.2;
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
  const f = _v.multiplyScalar(fz * speed * dt);
  const s = _v2.multiplyScalar(fx * speed * dt);
  rig.position.add(f).add(s);
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
  const ndc = new THREE.Vector2(mouse.x, mouse.y);
  _ray.setFromCamera(ndc, camera);
  return { o: _ray.ray.origin.clone(), d: _ray.ray.direction.clone() };
}

function pokePalette(origin, dir) {
  _ray.set(origin, dir);
  const hits = _ray.intersectObjects(palette.gems, false);
  if (hits[0]?.object?.userData?.power != null) {
    setPower(hits[0].object.userData.power);
    return true;
  }
  return false;
}

function fire(origin, dir, holding, justPressed, dt) {
  if (justPressed && pokePalette(origin, dir)) return;
  const id = POWERS[power].id;
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

function tickMeteors(dt) {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.position.addScaledVector(m.userData.vel, dt);
    const w = m.userData.target;
    if (w && m.position.distanceTo(w.group.position) < w.radius * 1.05) {
      const n = m.position.clone().sub(w.group.position).normalize();
      w.addTree(n);
      paintAt(w.paint, { x: 0.5 + n.x * 0.3, y: 0.5 + n.z * 0.3 }, -40);
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
}

function loop(t) {
  const now = t * 0.001;
  const dt = Math.min(0.05, last ? now - last : 0.016);
  last = now;
  const xr = renderer.xr.isPresenting;
  sky.material.uniforms.uT.value = now;
  moveRig(dt, xr);

  const gpR = xrGamepad(1);
  const gpL = xrGamepad(0);
  const rTrig = xr ? trigger(gpR) : mouse.down;
  if (xr) {
    const { o, d } = rightRay();
    fire(o, d, rTrig, rTrig && !pressed.t1, dt);
    pressed.t1 = rTrig;
    const b4 = !!(gpL?.buttons?.[4]?.pressed || gpR?.buttons?.[5]?.pressed);
    const b5 = !!(gpR?.buttons?.[4]?.pressed);
    if (b4 && !pressed.b4) setPower(power + 1);
    if (b5 && !pressed.b5) setPower(power - 1);
    pressed.b4 = b4;
    pressed.b5 = b5;
  } else if (mouse.down || growing || pressed.t1) {
    const { o, d } = desktopRay();
    fire(o, d, mouse.down, mouse.down && !pressed.t1, dt);
    pressed.t1 = mouse.down;
  }

  for (const w of worlds) {
    w.stage(dt);
    w.tickOrbits(dt);
  }
  tickMeteors(dt);
  hudStatus.textContent = worlds.length
    ? `${worlds.length} world${worlds.length > 1 ? "s" : ""} in the void`
    : "Hold to shape the first sphere.";

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
  if (e.code === "KeyR") setPower((power + 1) % POWERS.length);
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
window.addEventListener("mousedown", () => {
  mouse.down = true;
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
document.getElementById("sea").oninput = (e) => {
  if (selected) selected.seaH = Number(e.target.value);
};
document.getElementById("wx").oninput = (e) => {
  if (selected) selected.storm = Number(e.target.value) / 100;
};
document.getElementById("btn-grove").onclick = () => {
  if (!selected) return;
  for (let i = 0; i < 14; i++) {
    const n = new THREE.Vector3().randomDirection();
    selected.addTree(n);
  }
};
document.getElementById("btn-close").onclick = () => {
  inspectEl.hidden = true;
  selected = null;
};

function beginDesktop() {
  startEl.style.display = "none";
  canvas.requestPointerLock?.();
}

document.getElementById("go-desk").onclick = beginDesktop;
document.getElementById("go-vr").onclick = async () => {
  startEl.style.display = "none";
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
  getSpeed: () => (keys.has("KeyW") ? 3.2 : 0),
  setKeys: (codes) => {
    keys.clear();
    (codes || []).forEach((c) => keys.add(c));
  },
};
