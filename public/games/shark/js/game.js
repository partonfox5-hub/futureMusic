import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
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
const SHARK_HITS = 3;
const MAX_FUEL = 100;
const MAX_TORP = 16;

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
let sharkState = "patrol";
let sharkTimer = 14;
let sharkFace = 0;
let retreatT = 0;
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
let xrBaseRef = null;
let xrTrigger = false;
let xrGrip = false;
let xrTriggerPrev = false;
let xrFireArmed = true;
let xrHatchArmed = true;
const helmHands = [
  { squeeze: false, grabbing: false, lastAng: null, lastZ: null, handed: "", gamepad: null },
  { squeeze: false, grabbing: false, lastAng: null, lastZ: null, handed: "", gamepad: null },
];
let helmHeld = false;
let wheelSpin = 0;
let wheelMat = null;
const WHEEL_R = 0.28;
const _helmLocal = new THREE.Vector3();
const xrSeatPos = new THREE.Vector3();
const xrSeatQuat = new THREE.Quaternion();
const xrInvP = new THREE.Vector3();
const xrInvQ = new THREE.Quaternion();
const xrLocal = new THREE.Vector3();

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
  s.lineTo(w * 0.15, h);
  s.lineTo(-w, h * 0.12);
  s.lineTo(0, 0);
  return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, steps: 1 });
}

function makeSharkGeom() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  inner.rotation.y = -Math.PI / 2;
  const skin = skinMat(0xffffff, { map: sharkTex, roughness: 0.62, emissive: 0x0a1014, emissiveMap: sharkTex });
  const belly = skinMat(0xffffff, { map: sharkTex, roughness: 0.7 });
  const profile = [
    new THREE.Vector2(0.04, 9.3),
    new THREE.Vector2(0.42, 8.7),
    new THREE.Vector2(1.05, 7.6),
    new THREE.Vector2(1.75, 6.2),
    new THREE.Vector2(2.2, 4.4),
    new THREE.Vector2(2.32, 2.2),
    new THREE.Vector2(2.28, 0.2),
    new THREE.Vector2(2.05, -2.0),
    new THREE.Vector2(1.7, -4.2),
    new THREE.Vector2(1.25, -6.2),
    new THREE.Vector2(0.85, -7.6),
    new THREE.Vector2(0.42, -8.5),
    new THREE.Vector2(0.08, -9.15),
  ];
  inner.add(latheBody(profile, 48, skin));
  const under = latheBody(
    [
      new THREE.Vector2(0.05, 6.4),
      new THREE.Vector2(1.15, 4.8),
      new THREE.Vector2(1.55, 2.0),
      new THREE.Vector2(1.45, -1.2),
      new THREE.Vector2(1.05, -4.0),
      new THREE.Vector2(0.08, -6.2),
    ],
    32,
    belly
  );
  under.position.y = -0.55;
  inner.add(under);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 1.7, 6, 2, 4), skin);
  jaw.position.set(7.2, -1.15, 0);
  inner.add(jaw);
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.4 });
  for (let i = 0; i < 8; i++) {
    const tth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 6), toothMat);
    tth.rotation.z = Math.PI;
    tth.position.set(0.9, 0.22, -0.55 + i * 0.16);
    jaw.add(tth);
  }
  const dorsal = new THREE.Mesh(finShape(1.8, 3.4), skin);
  dorsal.rotation.x = Math.PI / 2;
  dorsal.position.set(0.4, 2.05, -0.05);
  inner.add(dorsal);
  const rearFin = new THREE.Mesh(finShape(0.8, 1.5), skin);
  rearFin.rotation.x = Math.PI / 2;
  rearFin.position.set(-4.2, 1.15, -0.05);
  inner.add(rearFin);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.2, 0.22, 2, 8, 1), skin);
  tail.position.set(-8.35, 0.2, 0);
  inner.add(tail);
  const fluke = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.4, 8), skin);
  fluke.rotation.z = Math.PI / 2;
  fluke.position.set(-9.1, 0.15, 0);
  tail.add(fluke);
  const pec = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 3.8, 3, 1, 4), skin);
  pec.position.set(2.1, -0.7, 0);
  inner.add(pec);
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < 4; i++) {
      const gill = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.06), skin);
      gill.position.set(4.4 - i * 0.22, 0.15, s * 1.85);
      gill.rotation.y = s * 0.15;
      inner.add(gill);
    }
  }
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0x111111 })
  );
  eye.position.set(7.35, 0.48, 0.95);
  inner.add(eye);
  inner.add(eye.clone().translateZ(-1.9));
  g.userData.tail = tail;
  g.userData.jaw = jaw;
  g.userData.skin = skin;
  g.userData.pec = pec;
  g.userData.swimList = [
    attachSwim(skin, { amp: 0.55, freq: 0.38, speed: 4.2, lat: 1, vert: 0.1, phase: 0 }),
    attachSwim(belly, { amp: 0.48, freq: 0.38, speed: 4.2, lat: 1, vert: 0.1, phase: 0.15 }),
  ];
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
    new THREE.Vector2(0.2, 9.4),
    new THREE.Vector2(1.4, 8.2),
    new THREE.Vector2(2.35, 6.4),
    new THREE.Vector2(2.7, 4.0),
    new THREE.Vector2(2.75, 1.2),
    new THREE.Vector2(2.55, -1.6),
    new THREE.Vector2(2.1, -4.4),
    new THREE.Vector2(1.45, -6.8),
    new THREE.Vector2(0.85, -8.2),
    new THREE.Vector2(0.12, -9.2),
  ];
  inner.add(latheBody(profile, 56, skin));
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.55, 32, 24), skin);
  head.scale.set(1.45, 0.88, 0.9);
  head.position.x = 7.1;
  inner.add(head);
  const belly = latheBody(
    [
      new THREE.Vector2(0.1, 5.5),
      new THREE.Vector2(1.6, 3.5),
      new THREE.Vector2(1.85, 0.5),
      new THREE.Vector2(1.4, -3.2),
      new THREE.Vector2(0.1, -5.5),
    ],
    32,
    pale
  );
  belly.position.y = -0.45;
  inner.add(belly);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.6, 0.28, 2, 8, 1), skin);
  tail.position.set(-8.4, 0.1, 0);
  inner.add(tail);
  const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.4, 5.4, 1, 2, 8), skin);
  fluke.position.set(-0.2, 0, 0);
  tail.add(fluke);
  const flip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 4.2, 4, 1, 6), skin);
  flip.position.set(1.4, -1.35, 0);
  inner.add(flip);
  const blow = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.35, 10), skin);
  blow.position.set(5.6, 1.55, 0);
  inner.add(blow);
  g.userData.tail = tail;
  g.userData.flip = flip;
  g.userData.hp = 2;
  g.userData.swimList = [
    attachSwim(skin, { amp: 0.62, freq: 0.28, speed: 2.4, lat: 0.22, vert: 1, phase: Math.random() * 4 }),
    attachSwim(pale, { amp: 0.55, freq: 0.28, speed: 2.4, lat: 0.22, vert: 1, phase: 0.2 }),
  ];
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
try {
  renderer.xr.setReferenceSpaceType("local");
} catch (e) {}
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
wheel.position.set(0, -0.14, -0.30);
cockpit.add(wheel);
(function buildWheel() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xc49a58, roughness: 0.45, metalness: 0.18, emissive: 0x2a1808, emissiveIntensity: 0.35 });
  wheelMat = mat;
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R, 0.055, 10, 28), mat));
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(WHEEL_R * 1.92, 0.032, 0.032), mat);
    spoke.rotation.z = (i * Math.PI) / 2;
    wheel.add(spoke);
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0xccc4a0, metalness: 0.8, emissive: 0x2a1808 })
  );
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  const grab = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 12, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  grab.userData.helmGrab = true;
  wheel.add(grab);
})();

const fireBtn = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.07, 0.055, 14),
  new THREE.MeshStandardMaterial({ color: 0xb02018, emissive: 0x501008, metalness: 0.4, roughness: 0.4 })
);
fireBtn.position.set(0.46, -0.4, -0.52);
fireBtn.rotation.x = 0.2;
cockpit.add(fireBtn);
const fireBtnRestY = fireBtn.position.y;

const hatchLever = new THREE.Group();
hatchLever.position.set(-0.46, -0.4, -0.5);
cockpit.add(hatchLever);
(function buildHatchLever() {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.04, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x2a3034, metalness: 0.6, roughness: 0.4 })
  );
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8),
    new THREE.MeshStandardMaterial({ color: 0xc8a020, metalness: 0.5, roughness: 0.35, emissive: 0x3a2a00 })
  );
  stick.position.y = 0.08;
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe0c040, emissive: 0x664400, metalness: 0.4 })
  );
  knob.position.y = 0.16;
  hatchLever.add(base, stick, knob);
})();

function paintVrPlaque(ctx, w, h) {
  ctx.fillStyle = "#1a1610";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#3a3224";
  ctx.fillRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = "#c9b48a";
  ctx.fillRect(18, 18, w - 36, h - 36);
  ctx.fillStyle = "#5c4030";
  ctx.fillRect(18, 18, w - 36, 64);
  ctx.fillStyle = "#f0e2c4";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("QUEST 3  ·  HELM", w / 2, 62);
  ctx.textAlign = "left";
  ctx.fillStyle = "#241c14";
  ctx.font = "28px sans-serif";
  const lines = [
    "PUT A HAND ON THE WHEEL to take the helm.",
    "Turn the wheel to steer.",
    "While holding: left stick also steers",
    "  and throttles. Right stick: depth.",
    "PUSH the red button to fire torpedoes.",
    "YELLOW lever — hatch (exit / re-enter).",
    "OUTSIDE: hold TRIGGER near the hull",
    "  to weld with the blowtorch.",
    "Let go of the wheel to coast.",
  ];
  lines.forEach((t, i) => ctx.fillText(t, 44, 118 + i * 40));
}

function makeDashScreen(w, h, draw) {
  const cnv = document.createElement("canvas");
  cnv.width = w;
  cnv.height = h;
  const ctx = cnv.getContext("2d");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry((w / h) * 0.36, 0.36),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide })
  );
  mesh.userData.ctx = ctx;
  mesh.userData.tex = tex;
  mesh.userData.cnv = cnv;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry((w / h) * 0.37, 0.37, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x2a2418, metalness: 0.4, roughness: 0.5 })
  );
  plate.position.z = 0.012;
  mesh.position.z = 0.024;
  const g = new THREE.Group();
  g.add(plate, mesh);
  g.userData.screen = mesh;
  return g;
}

const vrPanel = makeDashScreen(1024, 768, paintVrPlaque);
vrPanel.position.set(-0.58, -0.08, -0.78);
vrPanel.rotation.set(-0.18, 0.42, 0.08);
vrPanel.visible = false;
cockpit.add(vrPanel);

const vrGauges = makeDashScreen(768, 256, (ctx, w, h) => {
  ctx.fillStyle = "#0a100c";
  ctx.fillRect(0, 0, w, h);
});
vrGauges.position.set(0.06, -0.18, -0.7);
vrGauges.rotation.x = -0.28;
vrGauges.scale.set(1, 1, 1);
vrGauges.visible = false;
cockpit.add(vrGauges);

function paintVrGauges() {
  const screen = vrGauges.userData.screen;
  if (!screen) return;
  const ctx = screen.userData.ctx;
  const cnv = screen.userData.cnv;
  const w = cnv ? cnv.width : 768;
  const h = cnv ? cnv.height : 256;
  ctx.fillStyle = "#07110c";
  ctx.fillRect(0, 0, w, h);
  const rows = [
    ["O2", oxygen, 100, "#7dffb0"],
    ["HULL", hull, 100, hull < 34 ? "#e05040" : hull < 70 ? "#e8c040" : "#7dffb0"],
    ["FUEL", fuel, 100, fuel < 25 ? "#e05040" : "#7dffb0"],
  ];
  const barW = 300;
  rows.forEach((row, i) => {
    const y = 20 + i * 46;
    ctx.fillStyle = "#c8e8c0";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(row[0], 16, y + 18);
    ctx.fillStyle = "#122";
    ctx.fillRect(88, y, barW, 20);
    ctx.fillStyle = row[3];
    ctx.fillRect(88, y, barW * (row[1] / row[2]), 20);
    ctx.fillStyle = "#eef";
    ctx.fillText(Math.round(row[1]) + "%", 396, y + 18);
  });
  ctx.fillStyle = "#c8e8c0";
  ctx.font = "18px sans-serif";
  ctx.fillText("TORP  " + torpAmmo + "  " + (mode === "pilot" ? "PILOT" : "EVA") + "  " + sharkState.toUpperCase(), 16, 172);
  const radioShown = audio.on ? audio.trackTitle || "STANDBY" : "RADIO OFF";
  ctx.fillStyle = "#9ec8a8";
  ctx.font = "16px sans-serif";
  ctx.fillText("RADIO  " + radioShown, 16, 200);
  if (msgT > 0 && msg) {
    ctx.fillStyle = "#e8d27a";
    ctx.fillText(msg, 16, 228);
  }

  const cx = 636;
  const cy = 124;
  const rad = 108;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fillStyle = worldMode === "space" ? "#05070e" : "#03140f";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = worldMode === "space" ? "#3a5080" : "#1c5a40";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, rad * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(125,255,176,0.2)";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - rad, cy);
  ctx.lineTo(cx + rad, cy);
  ctx.moveTo(cx, cy - rad);
  ctx.lineTo(cx, cy + rad);
  ctx.strokeStyle = "rgba(125,255,176,0.12)";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, rad, sonarSweep, sonarSweep + 0.35);
  ctx.closePath();
  ctx.fillStyle = "rgba(125,255,176,0.08)";
  ctx.fill();
  ctx.strokeStyle = "rgba(125,255,176,0.4)";
  ctx.stroke();
  ctx.fillStyle = "#7dffb0";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx + 5, cy + 7);
  ctx.lineTo(cx - 5, cy + 7);
  ctx.fill();
  const scale = rad / (CELL * 1.12);
  const dx = shark.position.x - sub.position.x;
  const dz = shark.position.z - sub.position.z;
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  const localX = dx * cyaw - dz * syaw;
  const localZ = -dx * syaw - dz * cyaw;
  let px = localX * scale;
  let py = -localZ * scale;
  const len = Math.hypot(px, py);
  const maxR = rad - 8;
  if (len > maxR && len > 0.001) {
    const k = maxR / len;
    px *= k;
    py *= k;
  }
  ctx.fillStyle = sharkState === "attack" ? "#e05040" : sharkState === "hunt" ? "#e8a040" : "#e8d27a";
  ctx.beginPath();
  ctx.arc(cx + px, cy + py, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7dffb0";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SONAR", cx, cy + rad - 10);
  ctx.restore();

  screen.userData.tex.needsUpdate = true;
  if (xrOn) {
    vrGauges.visible = true;
    vrPanel.visible = true;
  }
}

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
  m.position.set(sub.position.x + Math.cos(ang) * r, FLOOR + 0.55, sub.position.z + Math.sin(ang) * r);
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
const bubMat = new THREE.MeshBasicMaterial({ color: 0x9eefff, transparent: true, opacity: 0.75 });
for (let i = 0; i < 48; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), bubMat);
  m.visible = false;
  m.userData.v = new THREE.Vector3();
  m.userData.life = 0;
  scene.add(m);
  bubFx.push(m);
}
function bubbleBurst(pos, n) {
  burst(pos, 6);
  let used = 0;
  bubFx.forEach((s) => {
    if (s.userData.life > 0 || used >= n) return;
    used += 1;
    s.visible = true;
    s.position.copy(pos);
    s.scale.setScalar(0.6 + Math.random() * 1.6);
    s.userData.v.set((Math.random() - 0.5) * 3, 2 + Math.random() * 5, (Math.random() - 0.5) * 3);
    s.userData.life = 0.7 + Math.random() * 0.5;
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
const grip0 = renderer.xr.getControllerGrip(0);
const grip1 = renderer.xr.getControllerGrip(1);
scene.add(ctrl0, ctrl1, grip0, grip1);
try {
  const xrModels = new XRControllerModelFactory();
  grip0.add(xrModels.createControllerModel(grip0));
  grip1.add(xrModels.createControllerModel(grip1));
} catch (e) {}
function makeTorch() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.014, 0.11, 8),
    new THREE.MeshStandardMaterial({ color: 0x33383c, metalness: 0.7, roughness: 0.35 })
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.z = -0.04;
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.028, 0.16, 8),
    new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.88 })
  );
  cone.rotation.x = -Math.PI / 2;
  cone.position.z = -0.16;
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.012, 0.1, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.95 })
  );
  core.rotation.x = -Math.PI / 2;
  core.position.z = -0.14;
  g.add(handle, cone, core);
  g.visible = false;
  g.userData.cone = cone;
  g.userData.core = core;
  return g;
}
const torch0 = makeTorch();
const torch1 = makeTorch();
ctrl0.add(torch0);
ctrl1.add(torch1);
[ctrl0, ctrl1].forEach((c) => {
  const gizmo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6),
    new THREE.MeshBasicMaterial({ color: 0x88ffcc })
  );
  gizmo.rotation.x = Math.PI / 2;
  gizmo.position.z = -0.05;
  c.add(gizmo);
});
[ctrl0, ctrl1].forEach((c, i) => {
  const hold = () => {
    helmHands[i].squeeze = true;
  };
  const release = () => {
    helmHands[i].squeeze = false;
  };
  c.addEventListener("squeezestart", hold);
  c.addEventListener("squeezeend", release);
  c.addEventListener("selectstart", hold);
  c.addEventListener("selectend", release);
  c.addEventListener("connected", (e) => {
    helmHands[i].handed = e.data?.handedness || "";
    helmHands[i].gamepad = e.data?.gamepad || null;
  });
  c.addEventListener("disconnected", () => {
    helmHands[i].squeeze = false;
    helmHands[i].grabbing = false;
    helmHands[i].gamepad = null;
    helmHands[i].lastAng = null;
    helmHands[i].lastZ = null;
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
  radioBusy: false,
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
  const len = Math.floor(rate * 2.6);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.35);
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
  lp.frequency.value = 2400;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 260;
  const dist = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 128 - 1;
    curve[i] = Math.tanh(x * 1.7) * 0.82;
  }
  dist.curve = curve;
  const conv = ctx.createConvolver();
  conv.buffer = makeReverbIR(ctx);
  const dry = ctx.createGain();
  dry.gain.value = 0.16;
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  const master = ctx.createGain();
  master.gain.value = audio.on ? 1 : 0;
  audio.master = master;
  node.connect(hp);
  hp.connect(lp);
  lp.connect(dist);
  dist.connect(dry);
  dry.connect(master);
  dist.connect(conv);
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
  if (audio.master) audio.master.gain.value = on ? 1 : 0;
  if (audio.el) audio.el.volume = on ? 0.14 : 0;
  if (audio.ytPlayer) {
    try {
      if (on) {
        audio.ytPlayer.unMute?.();
        audio.ytPlayer.setVolume?.(11);
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
  audio.el.volume = audio.on ? 0.14 : 0;
  if (audio.ctx && !audio.src) {
    audio.src = audio.ctx.createMediaElementSource(audio.el);
    radioFilter(audio.ctx, audio.src);
  }
  const tryPlay = () => audio.el.play().catch(() => {});
  if (audio.ctx && audio.ctx.state === "suspended") {
    audio.ctx.resume().then(tryPlay).catch(tryPlay);
  } else {
    tryPlay();
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
        player.setVolume?.(audio.on ? 11 : 0);
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
            e.target.setVolume(audio.on ? 11 : 0);
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

function kickRadio() {
  ensureAudio();
  if (audio.ctx) {
    audio.ctx.resume?.();
    try {
      const buf = audio.ctx.createBuffer(1, 1, 22050);
      const src = audio.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(audio.ctx.destination);
      src.start();
    } catch (e) {}
  }
  setRadioOn(true);
  if (audio.el && audio.on) {
    const tryPlay = () => audio.el.play().catch(() => {});
    if (audio.ctx && audio.ctx.state === "suspended") {
      audio.ctx.resume().then(tryPlay).catch(tryPlay);
    } else {
      tryPlay();
    }
  }
  if (!audio.tracks.length && !audio.yt.length) startRadio();
}

async function startRadio() {
  if (audio.radioBusy) return;
  if (audio.tracks.length) {
    playLocal(audio.i);
    return;
  }
  if (audio.yt.length) {
    playYt(audio.i);
    return;
  }
  audio.radioBusy = true;
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
  audio.radioBusy = false;
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
  const prey = mode === "eva" ? evaDummy.position : sub.position;
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
        die("Taken in the open.");
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
  const spd = (sharkState === "attack" ? 24 : sharkState === "hunt" ? 13 : sharkState === "retreat" ? 16 : 8.5) * 0.85;
  if (dist > 0.08) {
    tmp3.copy(shark.position).add(tmp2);
    shark.lookAt(tmp3);
    shark.position.add(tmp2.multiplyScalar(Math.min(1, (spd * dt) / dist)));
  }
  const nowt = performance.now() * 0.001;
  const wag = Math.sin(nowt * 8) * (sharkState === "attack" ? 0.55 : 0.32);
  if (shark.userData.tail) shark.userData.tail.rotation.y = wag;
  if (shark.userData.jaw) shark.userData.jaw.rotation.x = sharkState === "attack" ? 0.5 : 0.08;
  if (shark.userData.pec) shark.userData.pec.rotation.z = Math.sin(nowt * 4.1) * 0.16;
  tickSwim(shark, nowt, sharkState === "attack" ? 1.55 : sharkState === "hunt" ? 1.2 : 1);
}

function whaleAi(dt) {
  whales.forEach((w, i) => {
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
    if (w.userData.tail) w.userData.tail.rotation.z = flap;
    if (w.userData.flip) w.userData.flip.rotation.z = Math.sin(nowt * 2.35 + i + 0.6) * 0.22;
    tickSwim(w, nowt + i * 0.7, 1);
  });
}

function updateTorps(dt) {
  fireCd = Math.max(0, fireCd - dt);
  torps.forEach((t) => {
    if (t.userData.life <= 0) return;
    t.userData.life -= dt;
    t.position.add(tmp.copy(t.userData.v).multiplyScalar(dt));
    let hit = false;
    if (t.position.distanceTo(shark.position) < 14) {
      t.userData.life = 0;
      t.visible = false;
      bubbleBurst(t.position, 10);
      hit = true;
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
    if (!hit) {
      for (let w = 0; w < whales.length; w++) {
        const wh = whales[w];
        if (wh.userData.hp <= 0) continue;
        if (t.position.distanceTo(wh.position) < 12) {
          t.userData.life = 0;
          t.visible = false;
          bubbleBurst(t.position, 8);
          wh.userData.hp -= 1;
          setMsg("WHALE HIT", 1.1);
          if (wh.userData.hp <= 0) {
            bubbleBurst(wh.position, 12);
            setMsg("WHALE DRIVEN OFF", 2);
            const ang = Math.random() * 6.28;
            wh.position.set(sub.position.x + Math.cos(ang) * 180, 14 + Math.random() * 20, sub.position.z + Math.sin(ang) * 180);
            wh.userData.hp = 2;
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
  for (let i = pickups.length - 1; i >= 0; i--) {
    const tk = pickups[i];
    tk.rotation.y += 0.035;
    tk.position.y = FLOOR + 0.55 + Math.sin(performance.now() * 0.002 + i) * 0.12;
    if (p.distanceTo(tk.position) < 1.7) {
      const kind = tk.userData.kind;
      scene.remove(tk);
      pickups.splice(i, 1);
      if (kind === "fuel") {
        fuel = clamp(fuel + 42, 0, MAX_FUEL);
        setMsg("FUEL +", 1);
      } else if (kind === "torp") {
        torpAmmo = Math.min(MAX_TORP, torpAmmo + 3);
        setMsg("TORPEDOES +", 1);
      } else {
        oxygen = clamp(oxygen + 38, 0, 100);
        setMsg("O2 +", 1);
      }
      sfx(520, 0.12, "sine", 0.05);
      spawnPickup(kind);
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
  const fi = document.getElementById("fueli");
  const ti = document.getElementById("torpi");
  if (fi) fi.style.width = fuel + "%";
  if (ti) ti.textContent = String(torpAmmo);
  const fb = document.getElementById("fuelb");
  if (fb) fb.className = "bar" + (fuel < 25 ? " bad" : fuel < 50 ? " warn" : "");
  document.getElementById("mode").textContent = mode === "pilot" ? "PILOT" : "EVA";
  document.getElementById("sstat").textContent = sharkState.toUpperCase();
  document.getElementById("msg").textContent = msgT > 0 ? msg : "";
  const rw = document.getElementById("repair-wrap");
  if (rw) {
    const show = mode === "eva" && hull < 100 && repairHold > 0;
    rw.hidden = !show;
    if (show) document.getElementById("repi").style.width = Math.min(100, (repairHold / 3) * 100) + "%";
  }
  if (xrOn) paintVrGauges();
}

function nearWorld(obj, maxd) {
  obj.getWorldPosition(tmp);
  for (const c of [ctrl0, ctrl1, grip0, grip1]) {
    if (!c) continue;
    c.getWorldPosition(tmp2);
    if (tmp.distanceTo(tmp2) < maxd) return c;
  }
  return null;
}

function squeezeFromPad(gp) {
  if (!gp || !gp.buttons) return 0;
  let v = 0;
  for (let i = 1; i < Math.min(gp.buttons.length, 3); i++) {
    const b = gp.buttons[i];
    if (!b) continue;
    v = Math.max(v, b.pressed ? 1 : 0, b.value || 0);
  }
  return v;
}

function pollXrButtons() {
  xrTriggerPrev = xrTrigger;
  xrTrigger = false;
  xrGrip = false;
  const session = renderer.xr.getSession();
  if (!session) return;
  const padsByHand = { left: null, right: null, none: [] };
  for (const src of session.inputSources) {
    const gp = src.gamepad;
    if (!gp || !gp.buttons) continue;
    if (gp.buttons[0] && (gp.buttons[0].pressed || (gp.buttons[0].value || 0) > 0.45)) xrTrigger = true;
    if (squeezeFromPad(gp) > 0.12) xrGrip = true;
    if (src.handedness === "left") padsByHand.left = gp;
    else if (src.handedness === "right") padsByHand.right = gp;
    else padsByHand.none.push(gp);
  }
  const ctrls = [ctrl0, ctrl1];
  const grips = [grip0, grip1];
  for (let i = 0; i < 2; i++) {
    const h = helmHands[i];
    let gp = h.gamepad;
    if (h.handed === "left" && padsByHand.left) gp = padsByHand.left;
    else if (h.handed === "right" && padsByHand.right) gp = padsByHand.right;
    else if (!h.handed && padsByHand.none[i]) gp = padsByHand.none[i];
    const sq = squeezeFromPad(gp);
    const trig = gp?.buttons?.[0];
    h.padSqueeze = sq > 0.12;
    h.padTrigger = !!(trig && (trig.pressed || (trig.value || 0) > 0.45));
    h._ctrl = ctrls[i];
    h._grip = grips[i];
  }
  if (!xrGrip) xrGrip = helmHands.some((h) => h.squeeze || h.padSqueeze || h.padTrigger);
}

function syncXrSeat() {
  if (!xrOn || !xrBaseRef || !renderer.xr.isPresenting) return;
  const seat = mode === "pilot" ? cockpit : evaDummy;
  seat.updateMatrixWorld(true);
  xrSeatPos.set(0, mode === "pilot" ? 0.12 : 0, mode === "pilot" ? 0.02 : 0);
  seat.localToWorld(xrSeatPos);
  seat.getWorldQuaternion(xrSeatQuat);
  xrInvQ.copy(xrSeatQuat).invert();
  xrInvP.copy(xrSeatPos).applyQuaternion(xrInvQ).multiplyScalar(-1);
  if (typeof XRRigidTransform === "undefined") return;
  try {
    const t = new XRRigidTransform(
      { x: xrInvP.x, y: xrInvP.y, z: xrInvP.z },
      { x: xrInvQ.x, y: xrInvQ.y, z: xrInvQ.z, w: xrInvQ.w }
    );
    renderer.xr.setReferenceSpace(xrBaseRef.getOffsetReferenceSpace(t));
  } catch (e) {}
}

function setTorch(on) {
  const active = on && mode === "eva";
  [torch0, torch1].forEach((t, i) => {
    const c = i === 0 ? ctrl0 : ctrl1;
    const using = active && xrTrigger && nearWorld(sub, 3.4) === c;
    t.visible = !!(active && xrTrigger);
    if (t.visible) {
      const flicker = 0.85 + Math.random() * 0.35;
      t.userData.cone.scale.setScalar(flicker);
      t.userData.core.scale.set(1, flicker, 1);
    }
  });
  if (!xrTrigger) {
    torch0.visible = false;
    torch1.visible = false;
  }
}

function desktopCam(parent) {
  if (xrOn) return;
  if (cam.parent) cam.parent.remove(cam);
  parent.add(cam);
}

function enterEva() {
  if (mode === "eva") return;
  mode = "eva";
  evaDummy.position.copy(sub.position);
  evaDummy.position.x += 2.3;
  evaDummy.position.y += 0.5;
  evaDummy.quaternion.copy(sub.quaternion);
  desktopCam(evaDummy);
  if (!xrOn) {
    cam.position.set(0, 0, 0);
    cam.rotation.set(0, 0, 0);
  }
  lookYaw = yaw;
  lookPitch = 0;
  cockpit.visible = false;
  exterior.visible = true;
  helm.visible = true;
  setMsg(xrOn ? "EVA — HOLD TRIGGER NEAR THE HULL TO WELD" : "EVA — HOLD R NEAR THE HULL TO PATCH", 3);
}

function enterPilot() {
  if (mode === "pilot") return;
  mode = "pilot";
  desktopCam(cockpit);
  if (!xrOn) {
    cam.position.set(0, 0.18, 0.04);
    cam.rotation.set(0, 0, 0);
  }
  lookPitch = 0;
  lookYaw = yaw;
  pitch = 0;
  cockpit.visible = true;
  exterior.visible = false;
  helm.visible = false;
  torch0.visible = false;
  torch1.visible = false;
  setMsg("HATCH SEALED", 1.4);
}

function tryToggleEva() {
  if (!running || dead) return;
  if (mode === "pilot") enterEva();
  else if (mode === "eva" && evaDummy.position.distanceTo(sub.position) < 3.1) enterPilot();
}

function xrStick(src) {
  const a = src.gamepad && src.gamepad.axes;
  if (!a || !a.length) return null;
  if (a.length >= 4) {
    const mag01 = Math.abs(a[0] || 0) + Math.abs(a[1] || 0);
    const mag23 = Math.abs(a[2] || 0) + Math.abs(a[3] || 0);
    if (mag23 >= mag01) return { x: a[2] || 0, y: a[3] || 0 };
    return { x: a[0] || 0, y: a[1] || 0 };
  }
  return { x: a[0] || 0, y: a[1] || 0 };
}

function handPosNearWheel(h, out) {
  const ctrl = h._ctrl || (h === helmHands[0] ? ctrl0 : ctrl1);
  const grip = h._grip || (h === helmHands[0] ? grip0 : grip1);
  wheel.getWorldPosition(tmp3);
  ctrl.getWorldPosition(tmp);
  let best = tmp.distanceTo(tmp3);
  out.copy(tmp);
  if (grip) {
    grip.getWorldPosition(tmp2);
    const d = tmp2.distanceTo(tmp3);
    if (d < best) {
      best = d;
      out.copy(tmp2);
    }
  }
  return best;
}

function helmReach(h, grabbing) {
  const dist = handPosNearWheel(h, tmp);
  cockpit.updateMatrixWorld(true);
  _helmLocal.copy(tmp);
  cockpit.worldToLocal(_helmLocal);
  const dx = _helmLocal.x - wheel.position.x;
  const dy = _helmLocal.y - wheel.position.y;
  const dz = _helmLocal.z - wheel.position.z;
  const startR = 0.42;
  const keepR = 0.7;
  const r = grabbing ? keepR : startR;
  return {
    near: dist < r,
    ang: Math.atan2(dy, dx),
    z: dz,
    dist,
  };
}

function paintHelmHeld(on) {
  if (!wheelMat) return;
  wheelMat.emissive.setHex(on ? 0x6a3a10 : 0x2a1808);
  wheelMat.emissiveIntensity = on ? 0.85 : 0.35;
}

function readXrMove(dt, move) {
  if (!xrOn) return;
  pollXrButtons();
  const session = renderer.xr.getSession();
  if (mode === "eva" && session) {
    for (const src of session.inputSources) {
      const st = xrStick(src);
      if (!st) continue;
      if (src.handedness === "right") {
        if (Math.abs(st.y) > 0.18) move.ay -= st.y;
      } else {
        if (Math.abs(st.x) > 0.18) move.ax += st.x;
        if (Math.abs(st.y) > 0.18) move.az += st.y;
      }
    }
  }
  if (mode === "pilot") {
    let holding = false;
    let angDelta = 0;
    let angN = 0;
    let pull = 0;
    let pullN = 0;
    const wasHeld = helmHeld;
    const anyNear = !!nearWorld(wheel, 0.42);
    paintHelmHeld(anyNear || helmHeld);
    for (const h of helmHands) {
      const squeezing = h.squeeze || h.padSqueeze || h.padTrigger;
      const reach = helmReach(h, h.grabbing);
      if (reach.near) {
        h.grabbing = true;
      } else if (h.grabbing && squeezing && reach.dist < 0.85) {
        h.grabbing = true;
      } else {
        h.grabbing = false;
        h.lastAng = null;
        h.lastZ = null;
      }
      if (h.grabbing) {
        holding = true;
        if (h.lastAng != null) {
          angDelta += wrapPi(reach.ang - h.lastAng);
          angN++;
        }
        h.lastAng = reach.ang;
        if (h.lastZ != null) {
          pull += h.lastZ - reach.z;
          pullN++;
        }
        h.lastZ = reach.z;
      }
    }
    if (!holding && anyNear) holding = true;
    helmHeld = holding;
    xrGrab = holding ? wheel : null;
    paintHelmHeld(holding);

    if (holding) {
      ensureAudio();
      if (audio.ctx && audio.ctx.state === "suspended") audio.ctx.resume?.();
      if (audio.el && audio.el.paused && audio.on) audio.el.play().catch(() => {});
      if (!audio.tracks.length && !audio.yt.length && !audio.radioBusy) startRadio();

      if (angN > 0) {
        const d = angDelta / angN;
        yaw += d * 1.45;
        wheelSpin = wrapPi(wheelSpin + d);
      }
      if (!wasHeld) setMsg("HELM IN HAND — TURN TO STEER", 2.2);
      if (pullN > 0) {
        const pz = (pull / pullN) / Math.max(dt, 0.001);
        if (Math.abs(pz) > 0.35) move.az += clamp(-pz * 0.35, -1, 1);
      }

      let sx = 0;
      let sy = 0;
      let rsy = 0;
      let haveLeft = false;
      let haveRight = false;
      if (session) {
        for (const src of session.inputSources) {
          const st = xrStick(src);
          if (!st) continue;
          if (src.handedness === "left") {
            sx = st.x;
            sy = st.y;
            haveLeft = true;
          } else if (src.handedness === "right") {
            rsy = st.y;
            haveRight = true;
          } else if (!haveLeft) {
            sx = st.x;
            sy = st.y;
            haveLeft = true;
          }
        }
      }
      const dead = 0.16;
      if (Math.abs(sy) > dead) move.az += clamp(sy, -1, 1);
      if (Math.abs(sx) > dead) {
        yaw += -sx * 2.4 * dt;
        wheelSpin = wrapPi(wheelSpin - sx * 1.8 * dt);
      }
      if (haveRight && Math.abs(rsy) > dead) move.ay -= clamp(rsy, -1, 1);
      wheel.rotation.z = wheelSpin;
      wheel.rotation.x = THREE.MathUtils.damp(wheel.rotation.x, 0, 8, dt);
    } else {
      wheelSpin = THREE.MathUtils.damp(wheelSpin, 0, 5, dt);
      wheel.rotation.z = THREE.MathUtils.damp(wheel.rotation.z, 0, 5, dt);
      wheel.rotation.x = THREE.MathUtils.damp(wheel.rotation.x, 0, 8, dt);
    }

    const poking = !!nearWorld(fireBtn, 0.08);
    const aiming = !!nearWorld(fireBtn, 0.14);
    const pressed = poking || (aiming && xrTrigger);
    fireBtn.position.y = pressed ? fireBtnRestY - 0.028 : fireBtnRestY;
    fireBtn.material.emissive.setHex(pressed ? 0xff4018 : 0x501008);
    if (pressed && xrFireArmed) {
      fire();
      xrFireArmed = false;
    }
    if (!pressed) xrFireArmed = true;
    const onHatch = !holding && !!nearWorld(hatchLever, 0.15);
    if (onHatch && (xrTrigger || xrGrip) && xrHatchArmed) {
      xrHatchArmed = false;
      tryToggleEva();
    }
    if (!xrTrigger && !xrGrip) xrHatchArmed = true;
  } else {
    xrGrab = null;
    helmHeld = false;
    helmHands.forEach((h) => {
      h.grabbing = false;
      h.lastAng = null;
      h.lastZ = null;
    });
    paintHelmHeld(false);
    if (xrGrip && evaDummy.position.distanceTo(sub.position) < 3.1) {
      if (xrHatchArmed) {
        xrHatchArmed = false;
        tryToggleEva();
      }
    } else if (!xrGrip) xrHatchArmed = true;
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

  if (xrOn) readXrMove(dt, move);
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

  wishVel.copy(forward).multiplyScalar(-move.az * spd);
  wishVel.add(tmp2.copy(right).multiplyScalar(move.ax * spd));
  wishVel.y = move.ay * spd * 0.72;
  const thrusting = wishVel.lengthSq() > 0.04;
  const k = thrusting ? 16 : 1.55;
  bodyVel.lerp(wishVel, 1 - Math.exp(-k * dt));
  tmp.copy(bodyVel).multiplyScalar(dt);
  body.position.add(tmp);
  body.position.y = clamp(body.position.y, FLOOR + 2.2, CEIL);
  speed = bodyVel.length();
  if (mode === "pilot" && speed > 0.6) fuel = Math.max(0, fuel - dt * 2.8);

  if (mode === "pilot") {
    sub.rotation.y = yaw;
    if (!xrOn) cam.rotation.set(pitch, 0, 0);
    if (!xrGrab) {
      wheel.rotation.z = THREE.MathUtils.damp(wheel.rotation.z, move.ax * 0.45, 6, dt);
      wheel.rotation.x = THREE.MathUtils.damp(wheel.rotation.x, -pitch * 0.25, 6, dt);
    }
    if (exterior.userData.prop) exterior.userData.prop.rotation.z += speed * dt * 4;
    if (!xrOn) {
      if (shake > 0) {
        shake = Math.max(0, shake - dt);
        cam.position.x = (Math.random() - 0.5) * shake * 0.12;
        cam.position.y = 0.18 + (Math.random() - 0.5) * shake * 0.08;
      } else {
        cam.position.set(0, 0.18, 0.04);
      }
    } else if (shake > 0) shake = Math.max(0, shake - dt);
  } else {
    if (!xrOn) cam.rotation.set(lookPitch, lookYaw, 0);
    const welding = xrOn
      ? xrTrigger && hull < 100 && evaDummy.position.distanceTo(sub.position) < 3.2
      : keys.has("KeyR") && hull < 100 && evaDummy.position.distanceTo(sub.position) < 3.2;
    if (welding) {
      repairHold += dt;
      setMsg((xrOn ? "WELDING " : "PATCHING ") + Math.min(99, Math.floor((repairHold / 3) * 100)) + "%", 0.25);
      if (repairHold > 3) {
        hull = 100;
        crack.visible = false;
        repairHold = 0;
        setMsg(xrOn ? "HULL SEALED — SQUEEZE GRIP NEAR HATCH" : "HULL SEALED — F TO RE-ENTER", 2);
        sfx(300, 0.2, "sine", 0.06);
      }
    } else repairHold = 0;
    setTorch(welding);
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
  updatePickups();
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
  if (xrOn) syncXrSeat();
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
  xrGrab = null;
  helmHeld = false;
  wheelSpin = 0;
  helmHands.forEach((h) => {
    h.grabbing = false;
    h.lastAng = null;
    h.lastZ = null;
    h.padSqueeze = false;
  });
  xrFireArmed = true;
  xrHatchArmed = true;
  running = true;
  dead = false;
  document.getElementById("start").style.display = "none";
  document.getElementById("dead").hidden = true;
  document.body.classList.add("xr");
  vrPanel.visible = true;
  vrGauges.visible = true;
  if (cam.parent) cam.parent.remove(cam);
  scene.add(cam);
  try {
    renderer.xr.setFoveation(0.25);
  } catch (e) {}
  xrBaseRef = renderer.xr.getReferenceSpace();
  if (!xrBaseRef) {
    const s = renderer.xr.getSession();
    if (s && s.requestReferenceSpace) {
      s.requestReferenceSpace("local")
        .then((r) => {
          xrBaseRef = r;
        })
        .catch(() => {
          s.requestReferenceSpace("local-floor").then((r) => {
            xrBaseRef = r;
          });
        });
    }
  }
  kickRadio();
  setMsg("TOUCH THE WHEEL TO STEER", 3.2);
});
renderer.xr.addEventListener("sessionend", () => {
  xrOn = false;
  xrGrab = null;
  helmHeld = false;
  helmHands.forEach((h) => {
    h.squeeze = false;
    h.grabbing = false;
    h.padSqueeze = false;
    h.lastAng = null;
    h.lastZ = null;
  });
  xrBaseRef = null;
  document.body.classList.remove("xr");
  vrPanel.visible = false;
  vrGauges.visible = false;
  torch0.visible = false;
  torch1.visible = false;
  if (cam.parent) cam.parent.remove(cam);
  if (mode === "eva") {
    evaDummy.add(cam);
    cam.position.set(0, 0, 0);
  } else {
    cockpit.add(cam);
    cam.position.set(0, 0.18, 0.04);
  }
});

function ensureAudio() {
  if (!audio.ctx) {
    audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    startHiss(audio.ctx);
  }
  if (audio.ctx.state === "suspended") audio.ctx.resume?.();
}

function boot(nextMode) {
  if (nextMode) applyWorldMode(nextMode);
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
  fuel = MAX_FUEL;
  torpAmmo = 8;
  bodyVel.set(0, 0, 0);
  sharkHp = SHARK_HITS;
  sharkState = "patrol";
  sharkTimer = 14;
  retreatT = 0;
  shake = 0;
  if (mode === "eva") enterPilot();
  sub.position.set(0, 22, 0);
  yaw = 0;
  pitch = 0.08;
  lookYaw = 0;
  lookPitch = 0.08;
  crack.visible = false;
  shark.position.set(CELL * 0.92, 22, 0);
  setSharkMood();
  document.getElementById("dead").hidden = true;
  running = true;
  dead = false;
  canvas.requestPointerLock?.();
}

document.getElementById("go-sea").addEventListener("click", () => boot("sea"));
document.getElementById("go-space").addEventListener("click", () => boot("space"));
document.getElementById("again").addEventListener("click", resetGame);

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
  getXr: () => xrOn,
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
  getGrab: () => !!xrGrab,
};
