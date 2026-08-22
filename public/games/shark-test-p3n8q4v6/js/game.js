import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const CELL = 156;
const FLOOR = 0;
const CEIL = 92;
const TORP_SPEED = 39.6;
const TORP_CD = 0.546;
const SUB_SPD = 9.35;
const YT_MAX = 540;
const SHARK_HITS = 30;
const WHALE_HP = 10;
const KRAKEN_HP = 10;
const MAX_FUEL = 100;
const MAX_TORP = 16;
const RADIO_YT_VOL = 4;
const RADIO_LOCAL_VOL = 0.038;

const keys = new Set();
const mouse = { lock: false, dragging: false, lx: 0, ly: 0 };
let yaw = 0;
let pitch = 0;
let lookYaw = 0;
let lookPitch = 0.08;
let mode = "pilot";
let worldMode = "sea";
let running = false;
let dead = false;
let xrOn = false;
let hull = 100;
let oxygen = 100;
let sharkHp = SHARK_HITS;
let sharkHits = 0;
let sharkSpeedMul = 1;
let sharkState = "patrol";
let sharkTimer = 14;
let sharkFace = 0;
let retreatT = 0;
let sharkSinkT = 0;
let grabbed = false;
let grabT = 0;
let grabber = null;
let cine = null;
let msgT = 0;
let msg = "";
let repairHold = 0;
let fireCd = 0;
let speed = 0;
let fuel = MAX_FUEL;
let torpAmmo = 8;
let torpSide = 1;
const bodyVel = new THREE.Vector3();
const wishVel = new THREE.Vector3();
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

const texLoader = new THREE.TextureLoader();
function loadTex(url) {
  const t = texLoader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
const sharkTex = loadTex("/games/shark/tex/shark-skin.jpg");
const whaleTex = loadTex("/games/shark/tex/whale-skin.jpg");
const torpTex = loadTex("/games/shark/tex/torpedo-metal.jpg");

function skinMat(hex, extra) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.55,
    metalness: 0.06,
    ...extra,
  });
}

function attachSwim(mat, opts) {
  opts = opts || {};
  const u = {
    uTime: { value: 0 },
    uAmp: { value: opts.amp != null ? opts.amp : 0.42 },
    uPhase: { value: opts.phase || 0 },
    uFreq: { value: opts.freq != null ? opts.freq : 0.42 },
    uSpeed: { value: opts.speed != null ? opts.speed : 3.8 },
    uLat: { value: opts.lat != null ? opts.lat : 1 },
    uVert: { value: opts.vert != null ? opts.vert : 0.12 },
  };
  u._baseAmp = u.uAmp.value;
  mat.userData.swim = u;
  mat.onBeforeCompile = function (shader) {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime; uniform float uAmp; uniform float uPhase; uniform float uFreq; uniform float uSpeed; uniform float uLat; uniform float uVert;"
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nfloat along = transformed.x;\nfloat env = smoothstep(8.2, -1.5, along);\nfloat wave = sin(along * uFreq - uTime * uSpeed + uPhase) * uAmp * env;\ntransformed.z += wave * uLat;\ntransformed.y += wave * uVert;"
      );
  };
  mat.customProgramCacheKey = function () {
    return "swimflex-v1";
  };
  return u;
}

function tickSwim(root, t, ampMul) {
  const list = root.userData && root.userData.swimList;
  if (!list) return;
  for (let i = 0; i < list.length; i++) {
    list[i].uTime.value = t;
    if (ampMul != null) list[i].uAmp.value = list[i]._baseAmp * ampMul;
  }
}

function latheBody(pts, segs, mat) {
  const geo = new THREE.LatheGeometry(pts, segs);
  geo.rotateZ(-Math.PI / 2);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function finShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(w * 0.18, h);
  s.quadraticCurveTo(w * 0.02, h * 0.55, -w * 0.92, h * 0.1);
  s.lineTo(0, 0);
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.04,
    bevelSegments: 3,
    steps: 4,
  });
}

function markDetach(mesh, name) {
  mesh.userData.detach = true;
  mesh.userData.part = name;
  return mesh;
}

function bindParts(g) {
  const parts = [];
  g.traverse((o) => {
    if (o.isMesh && o.userData.detach) parts.push(o);
  });
  g.userData.parts = parts;
}

function makeSharkGeom() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  inner.rotation.y = -Math.PI / 2;
  const skin = skinMat(0xffffff, { map: sharkTex, roughness: 0.62, emissive: 0x0a1014, emissiveMap: sharkTex });
  const bellyMat = skinMat(0xffffff, { map: sharkTex, roughness: 0.7 });
  const profile = [
    new THREE.Vector2(0.03, 9.5),
    new THREE.Vector2(0.22, 9.15),
    new THREE.Vector2(0.48, 8.75),
    new THREE.Vector2(0.78, 8.2),
    new THREE.Vector2(1.12, 7.55),
    new THREE.Vector2(1.48, 6.85),
    new THREE.Vector2(1.82, 6.05),
    new THREE.Vector2(2.08, 5.15),
    new THREE.Vector2(2.24, 4.2),
    new THREE.Vector2(2.34, 3.15),
    new THREE.Vector2(2.38, 2.05),
    new THREE.Vector2(2.36, 0.95),
    new THREE.Vector2(2.3, 0.0),
    new THREE.Vector2(2.18, -1.05),
    new THREE.Vector2(2.0, -2.15),
    new THREE.Vector2(1.78, -3.25),
    new THREE.Vector2(1.52, -4.35),
    new THREE.Vector2(1.24, -5.4),
    new THREE.Vector2(0.96, -6.4),
    new THREE.Vector2(0.7, -7.3),
    new THREE.Vector2(0.44, -8.1),
    new THREE.Vector2(0.22, -8.7),
    new THREE.Vector2(0.07, -9.2),
  ];
  inner.add(latheBody(profile, 96, skin));
  const under = latheBody(
    [
      new THREE.Vector2(0.05, 6.6),
      new THREE.Vector2(0.7, 5.6),
      new THREE.Vector2(1.2, 4.4),
      new THREE.Vector2(1.5, 2.6),
      new THREE.Vector2(1.58, 0.6),
      new THREE.Vector2(1.48, -1.4),
      new THREE.Vector2(1.2, -3.2),
      new THREE.Vector2(0.75, -5.0),
      new THREE.Vector2(0.08, -6.4),
    ],
    64,
    bellyMat
  );
  under.position.y = -0.55;
  inner.add(under);
  const jaw = markDetach(new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.46, 1.85, 12, 4, 10), skin), "jaw");
  jaw.position.set(7.15, -1.18, 0);
  inner.add(jaw);
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.35 });
  for (let i = 0; i < 14; i++) {
    const tth = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 10), toothMat);
    tth.rotation.z = Math.PI;
    tth.position.set(0.95, 0.22, -0.7 + i * 0.105);
    jaw.add(tth);
  }
  const dorsal = markDetach(new THREE.Mesh(finShape(1.9, 3.55), skin), "dorsal");
  dorsal.rotation.x = Math.PI / 2;
  dorsal.position.set(0.35, 2.08, -0.08);
  inner.add(dorsal);
  const rearFin = markDetach(new THREE.Mesh(finShape(0.85, 1.55), skin), "keel");
  rearFin.rotation.x = Math.PI / 2;
  rearFin.position.set(-4.2, 1.18, -0.08);
  inner.add(rearFin);
  const tail = markDetach(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 5.4, 16, 6), skin), "tail");
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-8.35, 0.2, 0);
  inner.add(tail);
  const fluke = markDetach(new THREE.Mesh(new THREE.ConeGeometry(1.85, 2.55, 20), skin), "fluke");
  fluke.rotation.z = Math.PI / 2;
  fluke.position.set(-0.85, 0, 0);
  tail.add(fluke);
  const pecL = markDetach(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 1.85, 8, 2, 6), skin), "pecL");
  pecL.position.set(2.1, -0.72, 1.05);
  pecL.rotation.y = 0.18;
  inner.add(pecL);
  const pecR = markDetach(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 1.85, 8, 2, 6), skin), "pecR");
  pecR.position.set(2.1, -0.72, -1.05);
  pecR.rotation.y = -0.18;
  inner.add(pecR);
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < 5; i++) {
      const gill = markDetach(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.78, 0.05, 2, 4, 2), skin), "gill");
      gill.position.set(4.45 - i * 0.2, 0.16, s * 1.88);
      gill.rotation.y = s * 0.16;
      inner.add(gill);
    }
  }
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0x111111 })
  );
  eye.position.set(7.35, 0.5, 0.98);
  inner.add(eye);
  inner.add(eye.clone().translateZ(-1.96));
  g.userData.tail = tail;
  g.userData.jaw = jaw;
  g.userData.skin = skin;
  g.userData.pec = pecL;
  g.userData.hp = SHARK_HITS;
  g.userData.kind = "shark";
  g.userData.swimList = [
    attachSwim(skin, { amp: 0.55, freq: 0.38, speed: 4.2, lat: 1, vert: 0.1, phase: 0 }),
    attachSwim(bellyMat, { amp: 0.48, freq: 0.38, speed: 4.2, lat: 1, vert: 0.1, phase: 0.15 }),
  ];
  bindParts(g);
  return g;
}

function makeWhaleGeom() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  inner.rotation.y = -Math.PI / 2;
  const skin = skinMat(0xffffff, { map: whaleTex, roughness: 0.48, emissive: 0x080c12, emissiveMap: whaleTex });
  const pale = skinMat(0xffffff, { map: whaleTex, roughness: 0.55 });
  const profile = [
    new THREE.Vector2(0.18, 9.5),
    new THREE.Vector2(0.85, 8.85),
    new THREE.Vector2(1.5, 8.05),
    new THREE.Vector2(2.05, 7.05),
    new THREE.Vector2(2.42, 5.85),
    new THREE.Vector2(2.65, 4.5),
    new THREE.Vector2(2.74, 3.05),
    new THREE.Vector2(2.76, 1.5),
    new THREE.Vector2(2.68, 0.0),
    new THREE.Vector2(2.5, -1.55),
    new THREE.Vector2(2.22, -3.15),
    new THREE.Vector2(1.85, -4.7),
    new THREE.Vector2(1.4, -6.15),
    new THREE.Vector2(0.95, -7.4),
    new THREE.Vector2(0.5, -8.4),
    new THREE.Vector2(0.12, -9.2),
  ];
  inner.add(latheBody(profile, 80, skin));
  const head = markDetach(new THREE.Mesh(new THREE.SphereGeometry(2.55, 48, 36), skin), "head");
  head.scale.set(1.45, 0.88, 0.9);
  head.position.x = 7.1;
  inner.add(head);
  const belly = latheBody(
    [
      new THREE.Vector2(0.1, 5.5),
      new THREE.Vector2(0.9, 4.5),
      new THREE.Vector2(1.55, 3.2),
      new THREE.Vector2(1.82, 1.4),
      new THREE.Vector2(1.78, -0.4),
      new THREE.Vector2(1.45, -2.4),
      new THREE.Vector2(0.85, -4.2),
      new THREE.Vector2(0.1, -5.5),
    ],
    64,
    pale
  );
  belly.position.y = -0.45;
  inner.add(belly);
  const tail = markDetach(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 5.7, 16, 6), skin), "tail");
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-8.4, 0.1, 0);
  inner.add(tail);
  const fluke = markDetach(new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.45, 5.5, 2, 4, 16), skin), "fluke");
  fluke.position.set(-0.2, 0, 0);
  tail.add(fluke);
  const flipL = markDetach(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 2.05, 8, 2, 8), skin), "flipL");
  flipL.position.set(1.4, -1.35, 1.15);
  inner.add(flipL);
  const flipR = markDetach(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 2.05, 8, 2, 8), skin), "flipR");
  flipR.position.set(1.4, -1.35, -1.15);
  inner.add(flipR);
  const blow = markDetach(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.35, 16), skin), "blow");
  blow.position.set(5.6, 1.55, 0);
  inner.add(blow);
  g.userData.tail = tail;
  g.userData.flip = flipL;
  g.userData.hp = WHALE_HP;
  g.userData.kind = "whale";
  g.userData.swimList = [
    attachSwim(skin, { amp: 0.62, freq: 0.28, speed: 2.4, lat: 0.22, vert: 1, phase: Math.random() * 4 }),
    attachSwim(pale, { amp: 0.55, freq: 0.28, speed: 2.4, lat: 0.22, vert: 1, phase: 0.2 }),
  ];
  g.scale.setScalar(2.15);
  bindParts(g);
  return g;
}

function makeKrakenGeom() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const skin = new THREE.MeshStandardMaterial({
    color: 0x4a2440,
    roughness: 0.52,
    metalness: 0.08,
    emissive: 0x1a0812,
  });
  const mantle = new THREE.Mesh(new THREE.SphereGeometry(3.15, 48, 36), skin);
  mantle.scale.set(1.12, 1.32, 1.12);
  inner.add(mantle);
  const crown = markDetach(new THREE.Mesh(new THREE.SphereGeometry(1.7, 32, 24), skin), "crown");
  crown.position.y = 2.55;
  inner.add(crown);
  const beak = markDetach(
    new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.05, 16), new THREE.MeshStandardMaterial({ color: 0xc4a070, roughness: 0.4 })),
    "beak"
  );
  beak.position.set(0, -0.35, 1.85);
  beak.rotation.x = Math.PI / 2;
  inner.add(beak);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xc8ff6a });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), eyeMat);
    eye.position.set(s * 1.15, 1.35, 2.15);
    inner.add(eye);
  }
  const tentacles = [];
  for (let i = 0; i < 8; i++) {
    const arm = new THREE.Group();
    const ang = (i / 8) * Math.PI * 2;
    arm.position.set(Math.cos(ang) * 1.55, -1.55, Math.sin(ang) * 1.55);
    let parent = arm;
    const segs = [];
    for (let s = 0; s < 7; s++) {
      const r0 = Math.max(0.07, 0.4 - s * 0.048);
      const r1 = Math.max(0.05, 0.34 - s * 0.048);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1.52, 12), skin);
      if (s === 0) {
        seg.position.y = -0.7;
      } else {
        seg.position.y = -1.42;
      }
      parent.add(seg);
      segs.push(seg);
      parent = seg;
    }
    inner.add(arm);
    tentacles.push({ arm, segs, ang, base: arm.position.clone() });
  }
  g.userData.tentacles = tentacles;
  g.userData.hp = KRAKEN_HP;
  g.userData.kind = "kraken";
  g.userData.skin = skin;
  g.userData.grabCd = 4 + Math.random() * 8;
  g.scale.setScalar(1.7);
  bindParts(g);
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

const cam = new THREE.PerspectiveCamera(80, innerWidth / innerHeight, 0.08, 900);
cam.rotation.order = "YXZ";

const UnderwaterShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uWet: { value: 1 },
  },
  vertexShader:
    "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
  fragmentShader: [
    "uniform sampler2D tDiffuse; uniform float uTime; uniform float uWet; varying vec2 vUv;",
    "void main(){",
    "vec2 uv=vUv;",
    "float cau=sin(uv.x*38.0+uTime*0.7)+sin(uv.y*29.0-uTime*0.55+uv.x*8.0);",
    "vec2 chroma=vec2(0.0022,0.0)*uWet;",
    "float r=texture2D(tDiffuse, uv+chroma).r;",
    "float g=texture2D(tDiffuse, uv).g;",
    "float b=texture2D(tDiffuse, uv-chroma).b;",
    "vec3 c=vec3(r,g,b);",
    "c *= 1.0 + cau * 0.055 * uWet;",
    "c = mix(c, c*vec3(0.42,0.78,1.05), 0.38*uWet);",
    "c = mix(c, vec3(dot(c,vec3(0.3,0.5,0.2))), -0.12*uWet);",
    "float vig=smoothstep(1.05,0.22,length(uv-0.5));",
    "c *= mix(1.0, vig, 0.5*uWet);",
    "gl_FragColor=vec4(c,1.0);",
    "}",
  ].join("\n"),
};
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, cam));
const underPass = new ShaderPass(UnderwaterShader);
composer.addPass(underPass);
composer.addPass(new OutputPass());

const sub = new THREE.Group();
sub.position.set(0, 22, 0);
scene.add(sub);

const cockpit = new THREE.Group();
sub.add(cockpit);
cam.position.set(0, 0.18, 0.04);
cockpit.add(cam);

const evaDummy = new THREE.Group();
scene.add(evaDummy);

(function buildCockpit() {
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a2228, metalness: 0.65, roughness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9ec8dc,
    metalness: 0.2,
    roughness: 0.06,
    transparent: true,
    opacity: 0.075,
    side: THREE.DoubleSide,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.52, 48, 32), glassMat);
  dome.renderOrder = 2;
  sub.add(dome);
  sub.userData.dome = dome;
  const equator = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.035, 10, 48), metal);
  equator.rotation.x = Math.PI / 2;
  equator.position.y = -0.22;
  sub.add(equator);
  for (let i = 0; i < 2; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.014, 8, 40), metal);
    rib.rotation.y = Math.PI / 4 + (i * Math.PI) / 2;
    sub.add(rib);
  }
  const deck = new THREE.Mesh(new THREE.CircleGeometry(1.35, 32), metal);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = -0.58;
  cockpit.add(deck);
  const dash = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.12, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x1a2228, metalness: 0.65, roughness: 0.35, emissive: 0x0a1812 })
  );
  dash.position.set(0, -0.5, -0.62);
  cockpit.add(dash);
})();

const wheel = new THREE.Group();
wheel.position.set(0, -0.38, -0.58);
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
fireBtn.position.set(0.42, -0.42, -0.55);
cockpit.add(fireBtn);

const exterior = new THREE.Group();
sub.add(exterior);
(function buildExterior() {
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2a3840, metalness: 0.75, roughness: 0.38 });
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 2.4), hullMat);
  keel.position.set(0, -0.72, 0.15);
  exterior.add(keel);
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.22, 12), hullMat);
  hatch.position.set(0, -0.62, 0.55);
  exterior.add(hatch);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.07, 0.5), hullMat);
  fin.position.set(0, -0.55, 1.15);
  exterior.add(fin);
  const prop = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.05, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.8 })
  );
  prop.position.set(0, -0.35, 1.55);
  exterior.add(prop);
  exterior.userData.prop = prop;
  for (const s of [-1, 1]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.85, 12), hullMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(s * 1.05, -0.38, -1.2);
    sub.add(tube);
  }
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
const ambient = new THREE.AmbientLight(0x0c1820, 0.28);
const hemi = new THREE.HemisphereLight(0x152838, 0x080604, 0.22);
scene.add(ambient);
scene.add(hemi);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(960, 64),
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
    const r = 28 + Math.random() * 420;
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
    const r = 44 + (i % 3) * 48;
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
    const r = 16 + Math.random() * 320;
    k.position.set(Math.cos(ang) * r, 3, Math.sin(ang) * r);
    k.userData.ph = Math.random() * 6;
    scene.add(k);
    kelp.push(k);
  }
  for (let i = 0; i < 7; i++) {
    const p = new THREE.PointLight(0x1a6658, 1.4, 18);
    const ang = (i / 7) * 6.28;
    p.position.set(Math.cos(ang) * (60 + i * 16), 2.5, Math.sin(ang) * (60 + i * 16));
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
  w.position.set((i - 1) * 96, 16 + i * 7, -80 - i * 44);
  scene.add(w);
});

const krakens = [makeKrakenGeom(), makeKrakenGeom()];
krakens.forEach((k, i) => {
  k.position.set(i ? -70 : 80, 14 + i * 6, i ? 90 : -110);
  scene.add(k);
});

const chunks = [];
function spawnChunk(mesh, kick) {
  if (!mesh || !mesh.visible) return;
  mesh.updateWorldMatrix(true, false);
  const mat = mesh.material && mesh.material.clone ? mesh.material.clone() : mesh.material;
  const c = new THREE.Mesh(mesh.geometry, mat);
  mesh.matrixWorld.decompose(c.position, c.quaternion, c.scale);
  c.userData.v = new THREE.Vector3((Math.random() - 0.5) * 9, 3 + Math.random() * 6, (Math.random() - 0.5) * 9);
  if (kick) c.userData.v.add(kick);
  c.userData.spin = new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4);
  c.userData.life = 18;
  scene.add(c);
  chunks.push(c);
  mesh.visible = false;
  if (chunks.length > 48) {
    const old = chunks.shift();
    scene.remove(old);
  }
}

function blowChunk(creature) {
  const parts = (creature.userData.parts || []).filter((p) => p.visible);
  if (!parts.length) return;
  const part = parts[(Math.random() * parts.length) | 0];
  const kick = new THREE.Vector3().subVectors(part.getWorldPosition(tmp), creature.position).normalize().multiplyScalar(4);
  spawnChunk(part, kick);
}

function blowAll(creature) {
  (creature.userData.parts || []).forEach((p) => {
    if (p.visible) spawnChunk(p);
  });
}

function updateChunks(dt) {
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    c.userData.life -= dt;
    c.userData.v.y -= 4.4 * dt;
    c.userData.v.multiplyScalar(0.985);
    c.position.addScaledVector(c.userData.v, dt);
    c.rotation.x += c.userData.spin.x * dt;
    c.rotation.y += c.userData.spin.y * dt;
    c.rotation.z += c.userData.spin.z * dt;
    if (c.position.y < FLOOR + 0.45) {
      c.position.y = FLOOR + 0.45;
      c.userData.v.x *= 0.35;
      c.userData.v.z *= 0.35;
      c.userData.v.y = 0;
      c.userData.spin.multiplyScalar(0.7);
    }
  }
}

function resetParts(creature) {
  creature.userData.dead = false;
  creature.traverse((o) => {
    if (o.isMesh) o.visible = true;
  });
}

function sinkBody(creature, dt, rate) {
  creature.position.y = Math.max(FLOOR + 1.4, creature.position.y - (rate || 6.5) * dt);
  creature.rotation.z = THREE.MathUtils.damp(creature.rotation.z || 0, 1.15, 1.2, dt);
}

const torpMatShared = new THREE.MeshStandardMaterial({
  map: torpTex,
  color: 0xffffff,
  metalness: 0.65,
  roughness: 0.35,
  emissive: 0x332200,
  emissiveIntensity: 0.45,
});
const torpBodyGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.72, 10);
torpBodyGeo.rotateX(Math.PI / 2);
const torpNoseGeo = new THREE.ConeGeometry(0.08, 0.22, 10);
torpNoseGeo.rotateX(Math.PI / 2);
const torpFinGeo = new THREE.BoxGeometry(0.02, 0.16, 0.12);

function makeTorpedoMesh(scale) {
  const s = scale || 1;
  const g = new THREE.Group();
  const body = new THREE.Mesh(torpBodyGeo, torpMatShared);
  g.add(body);
  const nose = new THREE.Mesh(torpNoseGeo, torpMatShared);
  nose.position.z = -0.46;
  g.add(nose);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(torpFinGeo, torpMatShared);
    fin.position.z = 0.28;
    fin.rotation.z = (i * Math.PI) / 2;
    fin.position.x = Math.cos((i * Math.PI) / 2) * 0.08;
    fin.position.y = Math.sin((i * Math.PI) / 2) * 0.08;
    g.add(fin);
  }
  g.scale.setScalar(s);
  return g;
}

function makePickupMesh(kind) {
  const g = new THREE.Group();
  if (kind === "o2") {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.72, 16),
      new THREE.MeshStandardMaterial({ color: 0x3a6a88, emissive: 0x1a88aa, metalness: 0.5, roughness: 0.35 })
    );
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xc8d0d8, metalness: 0.7 })
    );
    cap.position.y = 0.42;
    g.add(tank);
    g.add(cap);
  } else if (kind === "fuel") {
    const can = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.55, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xc8a020, emissive: 0x664400, metalness: 0.4, roughness: 0.4 })
    );
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.03, 8, 12, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 })
    );
    handle.position.y = 0.32;
    handle.rotation.x = Math.PI / 2;
    g.add(can);
    g.add(handle);
  } else {
    const t = makeTorpedoMesh(1.15);
    t.rotation.y = Math.PI / 2;
    g.add(t);
  }
  g.userData.kind = kind;
  return g;
}

const pickups = [];
function spawnPickup(kind) {
  const m = makePickupMesh(kind);
  const ang = Math.random() * 6.28;
  const r = 8 + Math.random() * 70;
  const midWater = Math.random() > 0.22;
  const y = midWater ? FLOOR + 8 + Math.random() * 52 : FLOOR + 1.15 + Math.random() * 2.2;
  m.userData.baseY = y;
  m.position.set(sub.position.x + Math.cos(ang) * r, y, sub.position.z + Math.sin(ang) * r);
  scene.add(m);
  pickups.push(m);
}
for (let i = 0; i < 12; i++) spawnPickup("o2");
for (let i = 0; i < 8; i++) spawnPickup("fuel");
for (let i = 0; i < 8; i++) spawnPickup("torp");

const torps = [];
for (let i = 0; i < 12; i++) {
  const m = makeTorpedoMesh(1);
  m.visible = false;
  m.userData.v = new THREE.Vector3();
  m.userData.life = 0;
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

const bubFx = [];
const bubMat = new THREE.MeshBasicMaterial({ color: 0x9eefff, transparent: true, opacity: 0.72 });
for (let i = 0; i < 160; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), bubMat);
  m.visible = false;
  m.userData.v = new THREE.Vector3();
  m.userData.life = 0;
  scene.add(m);
  bubFx.push(m);
}
function bubbleBurst(pos, n) {
  burst(pos, 10);
  let used = 0;
  const count = n == null ? 42 : n;
  bubFx.forEach((s) => {
    if (s.userData.life > 0 || used >= count) return;
    used += 1;
    s.visible = true;
    s.position.copy(pos);
    const big = Math.random() > 0.72;
    s.scale.setScalar((big ? 2.4 : 0.9) + Math.random() * (big ? 4.2 : 2.2));
    s.userData.v.set((Math.random() - 0.5) * 10, 3 + Math.random() * 9, (Math.random() - 0.5) * 10);
    s.userData.life = 1.1 + Math.random() * 0.9;
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

const starFarPos = new Float32Array(900 * 3);
for (let i = 0; i < 900; i++) {
  const r = 50 + Math.random() * 240;
  const th = Math.random() * Math.PI * 2;
  const ph = Math.acos(2 * Math.random() - 1);
  starFarPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
  starFarPos[i * 3 + 1] = r * Math.cos(ph);
  starFarPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
}
const starFarGeo = new THREE.BufferGeometry();
starFarGeo.setAttribute("position", new THREE.BufferAttribute(starFarPos, 3));
const starFar = new THREE.Points(
  starFarGeo,
  new THREE.PointsMaterial({ color: 0xf4f7ff, size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.9 })
);
starFar.visible = false;
scene.add(starFar);

function applyWorldMode(m) {
  worldMode = m === "space" ? "space" : "sea";
  const space = worldMode === "space";
  scene.background = new THREE.Color(space ? 0x000005 : 0x010308);
  scene.fog = space ? new THREE.FogExp2(0x000000, 0.0022) : new THREE.FogExp2(0x031018, 0.015);
  renderer.toneMappingExposure = space ? 0.62 : 0.92;
  if (typeof underPass !== "undefined") underPass.uniforms.uWet.value = space ? 0 : 1;
  kelp.forEach((k) => {
    k.visible = !space;
  });
  starFar.visible = space;
  bubbles.material.color.setHex(space ? 0xffffff : 0x88c0c8);
  bubbles.material.opacity = space ? 0.8 : 0.35;
  bubbles.material.size = space ? 0.07 : 0.12;
  floor.material.color.setHex(space ? 0x08080c : 0x161410);
  cellWalls.traverse((o) => {
    if (o.material && o.material.color) o.material.color.setHex(space ? 0x101828 : 0x0c241c);
  });
  cellHelper.material.color.setHex(space ? 0x334466 : 0x14332a);
  fill.color.setHex(space ? 0x445577 : 0x4a7a5a);
  ambient.color.setHex(space ? 0x101018 : 0x0c1820);
  ambient.intensity = space ? 0.22 : 0.28;
  hemi.color.setHex(space ? 0x1a2840 : 0x152838);
  document.body.classList.toggle("space-mode", space);
}

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
  on: true,
  master: null,
  hissGain: null,
  trackTitle: "STANDBY",
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

function makeReverbIR(ctx) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * 4.8);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.1);
    }
  }
  return buf;
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
  g.gain.value = 0.035;
  audio.hissGain = g;
  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start();
}

function radioFilter(ctx, node) {
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 920;
  lp.Q.value = 0.55;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 140;
  const dist = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 128 - 1;
    curve[i] = Math.tanh(x * 1.15) * 0.7;
  }
  dist.curve = curve;
  const conv = ctx.createConvolver();
  conv.buffer = makeReverbIR(ctx);
  const delay = ctx.createDelay(1.2);
  delay.delayTime.value = 0.34;
  const delay2 = ctx.createDelay(1.8);
  delay2.delayTime.value = 0.62;
  const fb = ctx.createGain();
  fb.gain.value = 0.46;
  const echoLp = ctx.createBiquadFilter();
  echoLp.type = "lowpass";
  echoLp.frequency.value = 680;
  const dry = ctx.createGain();
  dry.gain.value = 0.07;
  const wet = ctx.createGain();
  wet.gain.value = 0.78;
  const master = ctx.createGain();
  master.gain.value = audio.on ? 0.42 : 0;
  audio.master = master;
  node.connect(hp);
  hp.connect(lp);
  lp.connect(dist);
  dist.connect(dry);
  dry.connect(master);
  dist.connect(delay);
  delay.connect(echoLp);
  echoLp.connect(delay2);
  delay2.connect(fb);
  fb.connect(delay);
  echoLp.connect(conv);
  conv.connect(wet);
  wet.connect(master);
  master.connect(ctx.destination);
}

function localTrackName(src) {
  const raw = decodeURIComponent(String(src).split("/").pop() || "TAPE");
  return raw.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "TAPE";
}

function setTrackLabel(name) {
  audio.trackTitle = name || "STANDBY";
  const shown = audio.on ? audio.trackTitle : "RADIO OFF";
  const el = document.getElementById("radio-now");
  const hud = document.getElementById("hud-track");
  if (el) el.textContent = shown;
  if (hud) hud.textContent = shown;
}

function setRadioOn(on) {
  audio.on = on;
  if (audio.master) audio.master.gain.value = on ? 0.42 : 0;
  if (audio.el) audio.el.volume = on ? RADIO_LOCAL_VOL : 0;
  if (audio.ytPlayer) {
    try {
      if (on) {
        audio.ytPlayer.unMute?.();
        audio.ytPlayer.setVolume?.(RADIO_YT_VOL);
      } else {
        audio.ytPlayer.mute?.();
        audio.ytPlayer.setVolume?.(0);
      }
    } catch (e) {}
  }
  setTrackLabel(audio.trackTitle);
}

function toggleRadio() {
  setRadioOn(!audio.on);
  setMsg(audio.on ? "RADIO ON" : "RADIO OFF", 1.1);
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
  audio.el.volume = audio.on ? RADIO_LOCAL_VOL : 0;
  audio.el.play().catch(() => {});
  if (audio.ctx && !audio.src) {
    audio.src = audio.ctx.createMediaElementSource(audio.el);
    radioFilter(audio.ctx, audio.src);
  }
  setTrackLabel(localTrackName(audio.tracks[audio.i]));
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
    setTrackLabel("NO SHORT SIGNAL");
    return;
  }
  audio.i = ((i % audio.yt.length) + audio.yt.length) % audio.yt.length;
  if (audio.skipped.has(audio.i)) return playYt(audio.i + 1);
  await loadYtApi();
  if (!window.YT || !window.YT.Player) {
    setTrackLabel("NO SIGNAL");
    return;
  }
  const id = audio.yt[audio.i];
  const onPlaying = (player) => {
    const d = player.getDuration();
    if (d >= YT_MAX) {
      audio.skipped.add(audio.i);
      playYt(audio.i + 1);
    } else {
      let title = id;
      try {
        const data = player.getVideoData && player.getVideoData();
        if (data && data.title) title = data.title;
      } catch (e) {}
      try {
        player.setVolume?.(audio.on ? RADIO_YT_VOL : 0);
        if (!audio.on) player.mute?.();
      } catch (e) {}
      setTrackLabel(title);
    }
  };
  if (!audio.ytPlayer) {
    audio.ytPlayer = new YT.Player("yt", {
      width: 1,
      height: 1,
      videoId: id,
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: (e) => {
          try {
            e.target.setVolume(audio.on ? RADIO_YT_VOL : 0);
            if (!audio.on) e.target.mute();
          } catch (err) {}
          e.target.playVideo();
        },
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
  setTrackLabel("TUNING…");
  try {
    const r = await fetch("/api/shark/radio");
    const j = await r.json();
    if (j.source === "local" && j.tracks.length) {
      audio.tracks = j.tracks;
      playLocal(0);
    } else {
      audio.yt = j.videos || [];
      if (audio.yt.length) playYt(0);
      else setTrackLabel("NO SIGNAL");
    }
  } catch (e) {
    setTrackLabel("NO SIGNAL");
  }
}

function fire() {
  if (mode !== "pilot" || fireCd > 0 || hull <= 0 || !running || dead) return;
  if (torpAmmo <= 0) {
    setMsg("NO TORPEDOES", 1.1);
    return;
  }
  const t = torps.find((x) => x.userData.life <= 0);
  if (!t) return;
  headingFrom(yaw);
  torpSide *= -1;
  tmp2.copy(sub.position).add(tmp.copy(right).multiplyScalar(1.12 * torpSide));
  tmp2.y -= 0.35;
  tmp2.add(tmp.copy(forward).multiplyScalar(1.35));
  t.position.copy(tmp2);
  t.userData.v.copy(forward).multiplyScalar(TORP_SPEED);
  tmp3.copy(t.position).add(t.userData.v);
  t.lookAt(tmp3);
  t.userData.life = 3.6;
  t.visible = true;
  torpAmmo -= 1;
  fireCd = TORP_CD;
  sfx(140, 0.18, "sawtooth", 0.05);
  sfx(420, 0.12, "square", 0.03);
}

function hideCine() {
  const el = document.getElementById("cinematic");
  if (el) {
    el.hidden = true;
    el.classList.remove("win", "eat");
  }
  cine = null;
}

function startCine(kind, title, sub) {
  dead = true;
  running = false;
  grabbed = false;
  grabber = null;
  cine = { kind, t: 0 };
  if (kind === "win") {
    if (cam.parent) cam.parent.remove(cam);
    scene.add(cam);
    exterior.visible = true;
    cockpit.visible = false;
  }
  if (document.pointerLockElement) document.exitPointerLock();
  const el = document.getElementById("cinematic");
  if (el) {
    el.hidden = false;
    el.classList.remove("win", "eat");
    el.classList.add(kind);
  }
  const t = document.getElementById("cine-title");
  const s = document.getElementById("cine-sub");
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
  document.getElementById("dead").hidden = true;
}

function die(reason, kind) {
  if (dead) return;
  if (kind === "eat") {
    startCine("eat", "SHARK ATTACK", reason || "Taken in the open. The cell has teeth.");
    return;
  }
  dead = true;
  running = false;
  document.getElementById("dead-reason").textContent = reason;
  document.getElementById("dead").hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
}

function updateCine(dt) {
  if (!cine) return;
  cine.t += dt;
  if (cine.kind === "win") {
    const t = cine.t;
    const orbit = 18 + Math.min(10, t * 3);
    const ang = t * 0.35;
    cam.position.set(
      shark.position.x + Math.cos(ang) * orbit,
      shark.position.y + 6 + Math.sin(t * 0.4) * 2,
      shark.position.z + Math.sin(ang) * orbit
    );
    cam.lookAt(shark.position);
  } else if (cine.kind === "eat") {
    cam.position.set(0, 0.12, 0.02);
    shake = 0.9;
    if (shark.userData.jaw) shark.userData.jaw.rotation.x = 0.15 + Math.sin(cine.t * 14) * 0.35;
  }
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
  const prey = mode === "eva" ? evaDummy.position : sub.position;
  cellHelper.position.copy(sub.position);
  cellWalls.position.copy(sub.position);
  if (sharkState === "dead") {
    sinkBody(shark, dt, 7.2);
    sharkSinkT += dt;
    tickSwim(shark, performance.now() * 0.001, 0.15);
    if (sharkSinkT > 2.8 && !cine) {
      startCine("win", "SHARK SLAYER", "The giant is meat on the floor of a sea with no surface.");
    }
    return;
  }
  sharkTimer -= dt;
  if (retreatT > 0) {
    retreatT -= dt;
    sharkState = "retreat";
    if (retreatT <= 0) {
      sharkState = "patrol";
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
    want = wallPoint(sharkFace, t * 1.4, prey.y + 3);
    if (shark.position.distanceTo(prey) < 22) {
      sharkState = "attack";
      setSharkMood();
      setMsg(mode === "eva" ? "SHARK INBOUND — GET INSIDE" : "SHARK INBOUND — FIRE", 2.2);
      shake = 0.2;
    }
  } else {
    want = tmp.copy(prey);
    want.y += 0.4;
    if (shark.position.distanceTo(prey) < 11) {
      if (mode === "eva") {
        burst(prey, 16);
        die("Taken in the open. The cell has teeth.", "eat");
        return;
      }
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
  const base = sharkState === "attack" ? 24 : sharkState === "hunt" ? 13 : sharkState === "retreat" ? 16 : 8.5;
  const spd = base * 0.85 * sharkSpeedMul;
  if (dist > 0.08) {
    tmp3.copy(shark.position).add(tmp2);
    shark.lookAt(tmp3);
    shark.position.add(tmp2.multiplyScalar(Math.min(1, (spd * dt) / dist)));
  }
  const nowt = performance.now() * 0.001;
  const wag = Math.sin(nowt * 8) * (sharkState === "attack" ? 0.55 : 0.32);
  if (shark.userData.tail && shark.userData.tail.visible) shark.userData.tail.rotation.y = wag;
  if (shark.userData.jaw && shark.userData.jaw.visible) shark.userData.jaw.rotation.x = sharkState === "attack" ? 0.5 : 0.08;
  if (shark.userData.pec && shark.userData.pec.visible) shark.userData.pec.rotation.z = Math.sin(nowt * 4.1) * 0.16;
  tickSwim(shark, nowt, sharkState === "attack" ? 1.55 : sharkState === "hunt" ? 1.2 : 1);
}

function whaleAi(dt) {
  whales.forEach((w, i) => {
    if (w.userData.dead) {
      sinkBody(w, dt, 5.4);
      return;
    }
    const t = performance.now() * 0.00006 + i * 2.1;
    const cx = sub.position.x + Math.cos(t) * (116 + i * 32);
    const cz = sub.position.z + Math.sin(t * 0.82) * (128 + i * 24);
    const wy = 11 + Math.sin(t * 1.6) * 7 + i * 3;
    tmp.set(cx, wy, cz);
    w.position.lerp(tmp, Math.min(1, 0.297 * dt));
    tmp2.set(cx + Math.cos(t + 0.2) * 4, wy, cz + Math.sin(t + 0.2) * 4);
    w.lookAt(tmp2);
    const nowt = performance.now() * 0.001;
    const flap = Math.sin(nowt * 2.35 + i) * 0.38;
    if (w.userData.tail && w.userData.tail.visible) w.userData.tail.rotation.z = flap;
    if (w.userData.flip && w.userData.flip.visible) w.userData.flip.rotation.z = Math.sin(nowt * 2.35 + i + 0.6) * 0.22;
    tickSwim(w, nowt + i * 0.7, 1);
  });
}

function releaseGrab() {
  grabbed = false;
  grabT = 0;
  if (grabber) grabber.userData.grabCd = 6 + Math.random() * 8;
  grabber = null;
}

function krakenAi(dt) {
  const prey = mode === "eva" ? evaDummy.position : sub.position;
  const nowt = performance.now() * 0.001;
  krakens.forEach((k, i) => {
    if (k.userData.dead) {
      if (grabber === k) releaseGrab();
      sinkBody(k, dt, 5.8);
      return;
    }
    const tents = k.userData.tentacles || [];
    tents.forEach((arm, ai) => {
      const grabPose = grabbed && grabber === k;
      arm.arm.rotation.x = (grabPose ? 1.05 : 0.42) + Math.sin(nowt * (grabPose ? 3.2 : 1.4) + ai) * (grabPose ? 0.22 : 0.38);
      arm.arm.rotation.z = Math.sin(nowt * 0.9 + ai * 0.7) * 0.25;
      arm.segs.forEach((seg, s) => {
        seg.rotation.x = (grabPose ? 0.38 : 0.12) + Math.sin(nowt * 2.2 + s + ai) * (grabPose ? 0.28 : 0.16);
        seg.rotation.z = Math.sin(nowt * 1.6 + s * 0.4) * 0.14;
      });
    });
    if (grabbed && grabber === k) {
      tmp.copy(prey);
      k.position.lerp(tmp.set(prey.x, prey.y + 2.2, prey.z), Math.min(1, 1.8 * dt));
      return;
    }
    k.userData.grabCd = Math.max(0, (k.userData.grabCd || 0) - dt);
    const t = nowt * 0.11 + i * 2.4;
    tmp.set(
      sub.position.x + Math.cos(t) * (70 + i * 40),
      12 + Math.sin(t * 1.3) * 8,
      sub.position.z + Math.sin(t * 0.8) * (80 + i * 28)
    );
    k.position.lerp(tmp, Math.min(1, 0.22 * dt));
    tmp2.copy(tmp).add(new THREE.Vector3(Math.cos(t + 0.4), 0, Math.sin(t + 0.4)));
    k.lookAt(tmp2);
    if (!grabbed && k.userData.grabCd <= 0 && k.position.distanceTo(prey) < 16) {
      grabbed = true;
      grabber = k;
      grabT = 3 + Math.random() * 12;
      setMsg("KRAKEN HAS YOU — " + grabT.toFixed(0) + "s", 2.4);
      shake = 0.4;
      sfx(70, 0.4, "sawtooth", 0.1);
    }
  });
  if (grabbed) {
    grabT -= dt;
    if (grabT <= 0) {
      setMsg("THE ARMS SLACK", 1.6);
      releaseGrab();
    } else if (Math.floor(grabT * 2) !== Math.floor((grabT + dt) * 2)) {
      setMsg("HELD " + Math.ceil(grabT) + "s", 0.4);
    }
  }
}

function updateTorps(dt) {
  fireCd = Math.max(0, fireCd - dt);
  torps.forEach((t) => {
    if (t.userData.life <= 0) return;
    t.userData.life -= dt;
    t.position.add(tmp.copy(t.userData.v).multiplyScalar(dt));
    let hit = false;
    if (sharkState !== "dead" && t.position.distanceTo(shark.position) < 14) {
      t.userData.life = 0;
      t.visible = false;
      bubbleBurst(t.position, 48);
      hit = true;
      sharkHp = Math.max(0, sharkHp - 1);
      sharkHits += 1;
      blowChunk(shark);
      sfx(90, 0.2, "triangle", 0.08);
      if (sharkHits > 0 && sharkHits % 3 === 0) {
        sharkSpeedMul *= 1.05;
        setMsg("IT QUICKENS — HP " + sharkHp, 1.6);
      } else {
        setMsg("HIT " + sharkHp + " / " + SHARK_HITS, 1.1);
      }
      if (sharkHp <= 0) {
        shark.userData.dead = true;
        sharkState = "dead";
        sharkSinkT = 0;
        blowAll(shark);
        bubbleBurst(shark.position, 70);
        setMsg("THE GIANT FALLS", 3);
      } else if (sharkState === "attack") {
        sharkState = "hunt";
        setSharkMood();
      }
    }
    if (!hit) {
      for (let w = 0; w < whales.length; w++) {
        const wh = whales[w];
        if (wh.userData.dead || wh.userData.hp <= 0) continue;
        if (t.position.distanceTo(wh.position) < 12) {
          t.userData.life = 0;
          t.visible = false;
          bubbleBurst(t.position, 42);
          hit = true;
          wh.userData.hp -= 1;
          blowChunk(wh);
          setMsg("WHALE " + wh.userData.hp + " / " + WHALE_HP, 1.1);
          if (wh.userData.hp <= 0) {
            wh.userData.dead = true;
            blowAll(wh);
            bubbleBurst(wh.position, 55);
            setMsg("WHALE SINKS", 2);
          }
          break;
        }
      }
    }
    if (!hit) {
      for (let r = 0; r < krakens.length; r++) {
        const kr = krakens[r];
        if (kr.userData.dead || kr.userData.hp <= 0) continue;
        if (t.position.distanceTo(kr.position) < 13) {
          t.userData.life = 0;
          t.visible = false;
          bubbleBurst(t.position, 44);
          kr.userData.hp -= 1;
          blowChunk(kr);
          setMsg("KRAKEN " + kr.userData.hp + " / " + KRAKEN_HP, 1.1);
          if (kr.userData.hp <= 0) {
            kr.userData.dead = true;
            if (grabber === kr) releaseGrab();
            blowAll(kr);
            bubbleBurst(kr.position, 55);
            setMsg("KRAKEN SINKS", 2);
          }
          break;
        }
      }
    }
    if (t.userData.life <= 0) t.visible = false;
  });
}

function updatePickups() {
  const p = mode === "eva" ? evaDummy.position : sub.position;
  const rXz = mode === "eva" ? 4.2 : 11.5;
  const rY = mode === "eva" ? 3.4 : 8.5;
  for (let i = pickups.length - 1; i >= 0; i--) {
    const tk = pickups[i];
    tk.rotation.y += 0.035;
    const baseY = tk.userData.baseY != null ? tk.userData.baseY : FLOOR + 0.55;
    tk.position.y = baseY + Math.sin(performance.now() * 0.002 + i) * 0.22;
    const dx = p.x - tk.position.x;
    const dy = p.y - tk.position.y;
    const dz = p.z - tk.position.z;
    if (dx * dx + dz * dz > rXz * rXz || Math.abs(dy) > rY) continue;
    const kind = tk.userData.kind;
    scene.remove(tk);
    pickups.splice(i, 1);
    if (kind === "fuel") {
      fuel = clamp(fuel + 84, 0, MAX_FUEL);
      setMsg("FUEL ++", 1);
    } else if (kind === "torp") {
      torpAmmo = Math.min(MAX_TORP, torpAmmo + 3);
      setMsg("TORPEDOES +", 1);
    } else {
      oxygen = clamp(oxygen + 76, 0, 100);
      setMsg("O2 ++", 1);
    }
    sfx(520, 0.12, "sine", 0.05);
    spawnPickup(kind);
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
  bubFx.forEach((s) => {
    if (s.userData.life <= 0) return;
    s.userData.life -= dt;
    s.position.add(tmp.copy(s.userData.v).multiplyScalar(dt));
    s.userData.v.y += 3.5 * dt;
    s.userData.v.multiplyScalar(0.98);
    if (s.userData.life <= 0) s.visible = false;
  });
  const arr = bubbleGeo.attributes.position.array;
  const space = worldMode === "space";
  for (let i = 0; i < bubbleCount; i++) {
    if (space) {
      arr[i * 3] += Math.sin(performance.now() * 0.0003 + i) * dt * 1.2;
      arr[i * 3 + 1] += Math.cos(performance.now() * 0.00025 + i * 0.7) * dt * 0.8;
    } else {
      arr[i * 3 + 1] += dt * (0.4 + (i % 5) * 0.12);
    }
    const dy = arr[i * 3 + 1] - sub.position.y;
    const dx = arr[i * 3] - sub.position.x;
    const dz = arr[i * 3 + 2] - sub.position.z;
    if (dy > 32 || dy < -28 || dx * dx + dz * dz > 70 * 70) {
      arr[i * 3] = sub.position.x + (Math.random() - 0.5) * 50;
      arr[i * 3 + 1] = sub.position.y + (space ? (Math.random() - 0.5) * 40 : -18);
      arr[i * 3 + 2] = sub.position.z + (Math.random() - 0.5) * 50;
    }
  }
  bubbleGeo.attributes.position.needsUpdate = true;
  if (starFar.visible) starFar.position.copy(sub.position);
  kelp.forEach((k) => {
    k.rotation.z = Math.sin(performance.now() * 0.001 + k.userData.ph) * 0.18;
  });
}

function drawMap() {
  const c = document.getElementById("minimap");
  const g = c.getContext("2d");
  const w = (c.width = 168);
  const h = (c.height = 168);
  g.fillStyle = worldMode === "space" ? "#05070e" : "#03110c";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = worldMode === "space" ? "#3a5080" : "#1c5a40";
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
  const blips = [
    { p: shark.position, c: "#e8d27a" },
    ...whales.map((w) => ({ p: w.position, c: "#9ad0e8" })),
    ...krakens.map((k) => ({ p: k.position, c: "#e070a0" })),
  ];
  blips.forEach((b) => {
    const dx = (b.p.x - sub.position.x) * scale;
    const dz = (b.p.z - sub.position.z) * scale;
    if (dx * dx + dz * dz > 76 * 76) return;
    g.fillStyle = b.c;
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
  const fi = document.getElementById("fueli");
  const ti = document.getElementById("torpi");
  if (fi) fi.style.width = fuel + "%";
  if (ti) ti.textContent = String(torpAmmo);
  const fb = document.getElementById("fuelb");
  if (fb) fb.className = "bar" + (fuel < 25 ? " bad" : fuel < 50 ? " warn" : "");
  document.getElementById("mode").textContent = mode === "pilot" ? "PILOT" : "EVA";
  document.getElementById("sstat").textContent = sharkState.toUpperCase();
  const ski = document.getElementById("shki");
  const skb = document.getElementById("shkb");
  if (ski) ski.style.width = (sharkHp / SHARK_HITS) * 100 + "%";
  if (skb) skb.className = "bar" + (sharkHp <= 8 ? " bad" : sharkHp <= 16 ? " warn" : "");
  document.getElementById("msg").textContent = msgT > 0 ? msg : "";
  const rw = document.getElementById("repair-wrap");
  if (rw) {
    const show = mode === "eva" && hull < 100 && repairHold > 0;
    rw.hidden = !show;
    if (show) document.getElementById("repi").style.width = Math.min(100, (repairHold / 3) * 100) + "%";
  }
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
  setMsg(hull < 100 ? "EVA — HOLD R NEAR THE HULL TO PATCH" : "EVA — F NEAR HATCH TO RE-ENTER", 3);
}

function enterPilot() {
  if (mode === "pilot") return;
  mode = "pilot";
  evaDummy.remove(cam);
  cockpit.add(cam);
  cam.position.set(0, 0.18, 0.04);
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
  if (mode === "pilot") enterEva();
  else if (mode === "eva" && evaDummy.position.distanceTo(sub.position) < 3.1) enterPilot();
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
  let baseSpd = mode === "pilot" ? SUB_SPD : SUB_SPD * 0.25;
  if (mode === "pilot" && hull < 100) baseSpd *= 0.5;
  if (mode === "pilot" && fuel <= 0) baseSpd *= 0.22;
  const spd = baseSpd;
  const move = { ax: 0, az: 0, ay: 0 };

  if (grabbed) {
    bodyVel.multiplyScalar(Math.max(0, 1 - 6 * dt));
    speed = bodyVel.length();
  } else if (xrOn) readXrMove(dt, move);
  else {
    if (keys.has("KeyW") || keys.has("ArrowUp")) move.az -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) move.az += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) move.ax -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) move.ax += 1;
    if (keys.has("ShiftLeft") || keys.has("ShiftRight")) move.ay -= 1;
    if (keys.has("Tab")) move.ay += 1;
    if (mode === "pilot") {
      const turn = wrapPi(lookYaw - yaw);
      yaw += turn * Math.min(1, 3.4 * dt);
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

  if (grabbed && grabber) {
    bodyVel.set(0, 0, 0);
    tmp.set(grabber.position.x, grabber.position.y - 1.4, grabber.position.z);
    body.position.lerp(tmp, Math.min(1, 4 * dt));
    speed = 0;
  } else {
    wishVel.copy(forward).multiplyScalar(-move.az * spd);
    wishVel.add(tmp2.copy(right).multiplyScalar(move.ax * spd));
    wishVel.y = move.ay * spd * 0.72;
    const thrusting = wishVel.lengthSq() > 0.04;
    const k = thrusting ? 16 : 1.55;
    bodyVel.lerp(wishVel, 1 - Math.exp(-k * dt));
    tmp.copy(bodyVel).multiplyScalar(dt);
    body.position.add(tmp);
    speed = bodyVel.length();
    if (mode === "pilot" && speed > 0.6) fuel = Math.max(0, fuel - dt * 2.8);
  }
  body.position.y = clamp(body.position.y, FLOOR + 2.2, CEIL);

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
      cam.position.y = 0.18 + (Math.random() - 0.5) * shake * 0.08;
    } else {
      cam.position.set(0, 0.18, 0.04);
    }
  } else {
    cam.rotation.set(lookPitch, lookYaw, 0);
    if (keys.has("KeyR") && hull < 100 && evaDummy.position.distanceTo(sub.position) < 3.2) {
      repairHold += dt;
      setMsg("PATCHING " + Math.min(99, Math.floor((repairHold / 3) * 100)) + "%", 0.25);
      if (repairHold > 3) {
        hull = 100;
        crack.visible = false;
        repairHold = 0;
        setMsg("HULL SEALED — F TO RE-ENTER", 2);
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
  krakenAi(dt);
  updateTorps(dt);
  updatePickups();
  updateFx(dt);
  updateChunks(dt);
  drawMap();
  hud();
}

let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  if (cine) {
    const cdt = Math.min(0.05, dt);
    if (sharkState === "dead") sinkBody(shark, cdt, 7.2);
    updateChunks(cdt);
    updateFx(cdt);
    updateCine(cdt);
  } else step(dt);
  underPass.uniforms.uTime.value = now * 0.001;
  if (renderer.xr.isPresenting) renderer.render(scene, cam);
  else composer.render();
});

function applyLook(dx, dy) {
  lookYaw -= dx * 0.00165;
  lookPitch -= dy * 0.00165;
  lookPitch = clamp(lookPitch, -1.15, 1.15);
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Tab") e.preventDefault();
  keys.add(e.code);
  if (e.code === "KeyF" && !e.repeat) tryToggleEva();
  if (e.code === "KeyR" && !e.repeat && mode === "pilot") toggleRadio();
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
  hideCine();
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

function boot(nextMode) {
  if (nextMode) applyWorldMode(nextMode);
  running = true;
  dead = false;
  hideCine();
  document.getElementById("start").style.display = "none";
  document.getElementById("dead").hidden = true;
  canvas.requestPointerLock?.();
  ensureAudio();
  startRadio();
}

function resetGame() {
  hideCine();
  hull = 100;
  oxygen = 100;
  fuel = MAX_FUEL;
  torpAmmo = 8;
  bodyVel.set(0, 0, 0);
  sharkHp = SHARK_HITS;
  sharkHits = 0;
  sharkSpeedMul = 1;
  sharkState = "patrol";
  sharkTimer = 14;
  retreatT = 0;
  sharkSinkT = 0;
  shake = 0;
  grabbed = false;
  grabT = 0;
  grabber = null;
  if (cam.parent !== cockpit && cam.parent !== evaDummy) {
    if (cam.parent) cam.parent.remove(cam);
    cockpit.add(cam);
    cam.position.set(0, 0.18, 0.04);
    cam.rotation.set(0, 0, 0);
  }
  if (mode === "eva") enterPilot();
  sub.position.set(0, 22, 0);
  yaw = 0;
  pitch = 0.08;
  lookYaw = 0;
  lookPitch = 0.08;
  crack.visible = false;
  shark.position.set(CELL * 0.92, 22, 0);
  shark.rotation.set(0, 0, 0);
  resetParts(shark);
  shark.userData.hp = SHARK_HITS;
  whales.forEach((w, i) => {
    resetParts(w);
    w.userData.hp = WHALE_HP;
    w.userData.dead = false;
    w.rotation.set(0, 0, 0);
    w.position.set((i - 1) * 96, 16 + i * 7, -80 - i * 44);
  });
  krakens.forEach((k, i) => {
    resetParts(k);
    k.userData.hp = KRAKEN_HP;
    k.userData.dead = false;
    k.userData.grabCd = 5 + i * 4;
    k.rotation.set(0, 0, 0);
    k.position.set(i ? -70 : 80, 14 + i * 6, i ? 90 : -110);
  });
  while (chunks.length) {
    const c = chunks.pop();
    scene.remove(c);
  }
  setSharkMood();
  document.getElementById("dead").hidden = true;
  running = true;
  dead = false;
  canvas.requestPointerLock?.();
}

document.getElementById("go-sea").addEventListener("click", () => boot("sea"));
document.getElementById("go-space").addEventListener("click", () => boot("space"));
document.getElementById("again").addEventListener("click", resetGame);
const cineAgain = document.getElementById("cine-again");
if (cineAgain) cineAgain.addEventListener("click", resetGame);

document.querySelectorAll("#touch [data-code]").forEach((btn) => {
  const down = (e) => {
    e.preventDefault();
    keys.add(btn.dataset.code);
    if (btn.dataset.code === "KeyF") tryToggleEva();
    if (btn.dataset.code === "KeyR" && mode === "pilot") toggleRadio();
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
  composer.setSize(innerWidth, innerHeight);
});

window.__controlsTest = {
  getYaw: () => yaw,
  getSpeed: () => speed,
  getPos: () => ({ x: sub.position.x, y: sub.position.y, z: sub.position.z }),
  getHull: () => hull,
  getMode: () => mode,
  getWorld: () => worldMode,
  getFuel: () => fuel,
  getAmmo: () => torpAmmo,
  setHull: (v) => {
    hull = clamp(v, 0, 100);
    crack.visible = hull < 100;
  },
  getShark: () => sharkState,
  getSharkHp: () => sharkHp,
  getGrabbed: () => grabbed,
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
