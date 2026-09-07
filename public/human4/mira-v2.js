import {restoreSurfaceUV} from './mira-v2-uv.js?v=h4.1';
import {BodyContacts} from './mira-v2-contact.js?v=h4.1';
import {MiraSocial} from './mira-v2-social.js?v=h4.1';
import {ContactHaptics} from './mira-v2-haptics.js?v=h4.1';
import { createV2Class, repairArmRestData } from "./mira-v2-features.js?v=h4.1";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

/* Human 2 realism pass, 2026-09-05. Keep Three.js pinned to r170.
 * Single-pass PBR + diffusion approximation; no extra eye-buffer passes.
 * Bone secondary motion is a bounded approximation, not a volumetric tissue model.
 * Research: developers.meta.com/horizon/documentation/web/webxr-perf-bp/
 * matthias-research.github.io/pages/publications/smallsteps.pdf
 * developer.nvidia.com/gpugems/gpugems/part-iii-materials/chapter-16-real-time-approximations-subsurface-scattering
 * threejs.org/docs/pages/MeshStandardMaterial.html
 * ?skin=0 disables wrapped skin diffuse; ?debug=1 exposes window.human2 for profiling.
 */
export const ASSET = new URL("./assets/mira.glb?v=13", import.meta.url).href;
export const TEXROOT = new URL("./assets/tex/", import.meta.url).href;
export const TEXVER = "r8";

export const FACE_TYPES = [
  { id: "natural", name: "Natural", file: "head.jpg" },
  { id: "portrait", name: "Portrait", file: "head_ref.jpg" },
  { id: "warm", name: "Warm", file: "head_warm.jpg" },
  { id: "cool", name: "Cool", file: "head_cool.jpg" },
  { id: "rosy", name: "Rosy", file: "head_rosy.jpg" },
];
export const HAIR_COLORS = [
  { id: "black", name: "Black", tint: 0xffffff },
  { id: "dark", name: "Dark brown", tint: 0xc4a080 },
  { id: "auburn", name: "Auburn", tint: 0xc45a28 },
  { id: "brunette", name: "Brunette", tint: 0x8a5a32 },
];
export const SLIDERS = [
  { key: "height", label: "Height", min: 0.72, max: 1.32, step: 0.01, value: 1 },
  { key: "waist", label: "Waist", min: 0.62, max: 1.48, step: 0.01, value: 1 },
  { key: "hips", label: "Hips", min: 0.68, max: 1.78, step: 0.01, value: 1 },
  { key: "breast", label: "Breast", min: 0.38, max: 2.35, step: 0.01, value: 1 },
  { key: "butt", label: "Buttocks", min: 0.52, max: 2.15, step: 0.01, value: 1 },
  { key: "thigh", label: "Thigh", min: 0.62, max: 1.88, step: 0.01, value: 1 },
  { key: "gap", label: "Thigh gap", min: -0.85, max: 0.85, step: 0.01, value: 0 },
  { key: "arms", label: "Arms", min: 0.62, max: 1.58, step: 0.01, value: 1 },
  { key: "jiggle", label: "Jiggle", min: 0, max: 3, step: 0.05, value: 1.75, physics: true },
];

const MAP_FILE = {
  Std_Skin_Head: ["head.jpg", "head_n.jpg", "head_r.jpg"],
  Std_Skin_Body: ["body.jpg", "body_n.jpg", "body_r.jpg"],
  Std_Skin_Arm: ["arm.jpg", "arm_n.jpg", "arm_r.jpg"],
  Std_Skin_Leg: ["leg.jpg", "leg_n.jpg", "leg_r.jpg"],
  Std_Nails: ["nails.jpg", null],
  Std_Eye_L: ["eye_l.jpg", "eye_l_n.jpg"],
  Std_Eye_R: ["eye_r.jpg", "eye_r_n.jpg"],
  Std_Eyelash: ["lash.png", null],
  Default_Material_Transparency: ["hair.png", null],
};
const MORPH = [
  "Mouth_Smile_L", "Mouth_Smile_R", "Mouth_Frown_L", "Mouth_Frown_R",
  "Mouth_Dimple_L", "Mouth_Dimple_R", "Mouth_Stretch_L", "Mouth_Stretch_R",
  "Mouth_Pucker_Up_L", "Mouth_Pucker_Up_R", "Mouth_Funnel_Up_L", "Mouth_Funnel_Up_R",
  "Mouth_Press_L", "Mouth_Press_R", "Mouth_Shrug_Upper",
  "Eye_Blink_L", "Eye_Blink_R", "Eye_Wide_L", "Eye_Wide_R",
  "Eye_Squint_L", "Eye_Squint_R",
  "Eye_L_Look_L", "Eye_R_Look_L", "Eye_L_Look_R", "Eye_R_Look_R",
  "Eye_L_Look_Up", "Eye_R_Look_Up", "Eye_L_Look_Down", "Eye_R_Look_Down",
  "Jaw_Open", "Jaw_Forward", "V_Open", "V_Tight_O", "V_Wide", "V_Lip_Open",
  "Brow_Raise_Inner_L", "Brow_Raise_Inner_R", "Brow_Raise_Outer_L", "Brow_Raise_Outer_R",
  "Brow_Drop_L", "Brow_Drop_R", "Brow_Compress_L", "Brow_Compress_R",
  "Cheek_Raise_L", "Cheek_Raise_R", "Cheek_Puff_L", "Cheek_Puff_R",
  "Nose_Sneer_L", "Nose_Sneer_R",
];
const FINGER_ROWS = ["Index", "Mid", "Ring", "Pinky"];
const QUEST = /OculusBrowser|Quest/i.test(navigator.userAgent);
const GAIT = [
  { stride: 0.28, knee: 0.48, hipYaw: 0.04, arm: 0.22, bob: 0.01, sway: 0.024, freq: 5.1, style: "ease" },
  { stride: 0.34, knee: 0.58, hipYaw: 0.028, arm: 0.28, bob: 0.014, sway: 0.018, freq: 5.6, style: "stride" },
  { stride: 0.22, knee: 0.4, hipYaw: 0.09, arm: 0.16, bob: 0.016, sway: 0.05, freq: 4.2, style: "sashay" },
  { stride: 0.4, knee: 0.68, hipYaw: 0.018, arm: 0.36, bob: 0.022, sway: 0.012, freq: 6.6, style: "power" },
];
const BALL_COLORS = [0xe23d3d, 0x3d8ae2, 0xe2c03d, 0x3dc46b, 0xe26ad2];
// Capsules follow both ends of each limb; radii are fitted to this 1.68 m rig.
const BODY_HIT = [
  { name: "Head", rad: 0.097, offset: [0, 0.065, 0.007], kind: "head" },
  { name: "NeckTwist01", end: "Head", rad: 0.045, kind: "head" },
  { name: "Spine02", end: "NeckTwist01", rad: 0.105, kind: "chest" },
  { name: "Spine01", end: "Spine02", rad: 0.092, kind: "belly" },
  { name: "Hip", end: "Spine01", rad: 0.11, kind: "hip" },
  { name: "L_Breast", rad: 0.042, offset: [0, -0.018, 0], kind: "breast" },
  { name: "R_Breast", rad: 0.042, offset: [0, -0.018, 0], kind: "breast" },
  { name: "L_Glute", rad: 0.059, kind: "glute" },
  { name: "R_Glute", rad: 0.059, kind: "glute" },
  ...["L", "R"].flatMap((side) => [
    { name: side + "_Thigh", end: side + "_Calf", rad: 0.067, kind: "thigh" },
    { name: side + "_Calf", end: side + "_Foot", rad: 0.045, kind: "leg" },
    { name: side + "_Foot", end: side + "_ToeBase", rad: 0.035, kind: "foot" },
    { name: side + "_Upperarm", end: side + "_Forearm", rad: 0.044, kind: "arm" },
    { name: side + "_Forearm", end: side + "_Hand", rad: 0.032, kind: "arm" },
    { name: side + "_Hand", rad: 0.045, kind: "hand" }
  ])
];

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _w2 = new THREE.Vector3();
const _n = new THREE.Vector3();
const texLoader = new THREE.TextureLoader();
const texCache = {};
let maxAnisotropy = 4;
const SKIN_DIFFUSION = new URLSearchParams(location.search).get("skin") !== "0";
function installSkinShader(m) {
  if (!SKIN_DIFFUSION || !/Skin_/i.test(m.name)) return;
  m.onBeforeCompile = (shader) => {
    // Energy-normalized wrapped diffuse lobes. Leave specular/normal detail intact.
    const chunk = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );",
      `float skinNL = dot( geometryNormal, directLight.direction );
       vec3 skinWrap = vec3( 0.28, 0.12, 0.06 );
       vec3 skinLobe = max( vec3( skinNL ) + skinWrap, vec3( 0.0 ) ) / pow( vec3( 1.0 ) + skinWrap, vec3( 2.0 ) );
       vec3 skinIrradiance = mix( irradiance, skinLobe * directLight.color, 0.38 );
       reflectedLight.directDiffuse += skinIrradiance * BRDF_Lambert( material.diffuseColor );`
    );
    shader.fragmentShader = shader.fragmentShader.replace("#include <lights_physical_pars_fragment>", chunk);
  };
  m.customProgramCacheKey = () => "human2-skin-r170-13";
}
const _cpA = new THREE.Vector3(), _cpB = new THREE.Vector3();
const _cpD = new THREE.Vector3(), _cpP = new THREE.Vector3(), _cpN = new THREE.Vector3();
const _contactN = new THREE.Vector3(), _contactP = new THREE.Vector3();
const _softV = new THREE.Vector3(), _softQ = new THREE.Quaternion(), _softScale = new THREE.Vector3();
const _ikA = new THREE.Vector3(), _ikB = new THREE.Vector3(), _ikC = new THREE.Vector3();
const _ikDir = new THREE.Vector3(), _ikBend = new THREE.Vector3(), _ikKnee = new THREE.Vector3();
const _ikQ = new THREE.Quaternion(), _ikParentQ = new THREE.Quaternion();
const _motion = new THREE.Vector3(), _handProbe = new THREE.Vector3(), _handVelocity = new THREE.Vector3();
function dampAngle(from, to, rate, dt) { return from + wrapPi(to - from) * (1 - Math.exp(-rate * dt)); }
function limitVector(v, max) { if (v.lengthSq() > max * max) v.setLength(max); return v; }


function loadMap(file, srgb) {
  if (!file) return null;
  const key = file + (srgb ? "s" : "l");
  if (texCache[key]) return texCache[key];
  const t = texLoader.load(TEXROOT + file + "?v=" + TEXVER, undefined, undefined, (err) => console.warn("tex fail", file, err));
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.flipY = false;
  t.wrapS = /^(head|body|arm|leg|nails|lash)/.test(file) ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = maxAnisotropy;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  texCache[key] = t;
  return t;
}


function isHairMat(m, o) {
  const n = ((m && m.name) || "") + " " + (o.name || "");
  return /transp|hair/i.test(n) && !/eyelash/i.test(n);
}
function isLashMat(m, o) {
  const n = ((m && m.name) || "") + " " + (o.name || "");
  return /eyelash/i.test(n);
}
function mapSpec(m, o) {
  const name = (m && m.name) || "";
  if (MAP_FILE[name]) return MAP_FILE[name];
  const n = name + " " + ((o && o.name) || "");
  if (/eyelash/i.test(n)) return MAP_FILE.Std_Eyelash;
  if (/transp|hair/i.test(n)) return MAP_FILE.Default_Material_Transparency;
  if (/Skin_Head/i.test(n)) return MAP_FILE.Std_Skin_Head;
  if (/Skin_Body/i.test(n)) return MAP_FILE.Std_Skin_Body;
  if (/Skin_Arm/i.test(n)) return MAP_FILE.Std_Skin_Arm;
  if (/Skin_Leg/i.test(n)) return MAP_FILE.Std_Skin_Leg;
  if (/Nails/i.test(n)) return MAP_FILE.Std_Nails;
  if (/Eye_L/i.test(n) && !/cornea/i.test(n)) return MAP_FILE.Std_Eye_L;
  if (/Eye_R/i.test(n) && !/cornea/i.test(n)) return MAP_FILE.Std_Eye_R;
  return null;
}
function applySkin(root) {
  const hairMeshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.visible = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      const hair = isHairMat(m, o), lash = isLashMat(m, o);
      const cornea = /cornea/i.test(m.name), eye = /Std_Eye_[LR]/i.test(m.name);
      const skin = /Skin_/i.test(m.name);
      const spec = mapSpec(m, o);
      if (spec) {
        m.map = loadMap(spec[0], true);
        m.normalMap = spec[1] ? loadMap(spec[1], false) : null;
        m.roughnessMap = spec[2] ? loadMap(spec[2], false) : null;
      }
      m.metalness = 0;
      m.metalnessMap = null;
      m.color.set(0xffffff);
      if (m.normalMap) {
        m.normalMap.colorSpace = THREE.NoColorSpace;
        m.normalScale.setScalar(eye ? 0.3 : 0.8);
      }
      m.roughness = skin ? 0.9 : hair ? 0.48 : lash ? 0.65 : eye ? 0.3 : 0.42;
      m.envMapIntensity = skin ? 0.65 : eye ? 1.0 : 0.55;
      m.side = hair || lash ? THREE.DoubleSide : THREE.FrontSide;
      m.transparent = false;
      m.opacity = 1;
      m.depthWrite = true;
      m.alphaTest = hair ? 0.3 : lash ? 0.32 : 0;
      m.alphaToCoverage = hair || lash;
      // Small, inexpensive specular shell; no screen-space transmission pass.
      // The eye's four materials share a mesh, so never hide the mesh here.
      if (cornea) {
        m.map = m.normalMap = m.roughnessMap = null;
        m.color.set(0x050505);
        m.roughness = 0.075;
        m.envMapIntensity = 1.4;
        m.transparent = true;
        m.opacity = 0.45;
        m.depthWrite = false;
        m.blending = THREE.AdditiveBlending;
      }
      installSkinShader(m);
      m.needsUpdate = true;
      if (hair) hairMeshes.push(o);
    }
    o.frustumCulled = false; // Bounds do not include all procedural poses.
  });
  return hairMeshes;
}

function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function exprFace(want, kind) {
  for (const n of MORPH) want[n] = 0;
  if (kind === "happy") {
    want.Mouth_Smile_L = want.Mouth_Smile_R = 0.78;
    want.Mouth_Dimple_L = want.Mouth_Dimple_R = 0.25;
    want.Cheek_Raise_L = want.Cheek_Raise_R = 0.45;
  } else if (kind === "frown") {
    want.Mouth_Frown_L = want.Mouth_Frown_R = 0.68;
    want.Brow_Drop_L = want.Brow_Drop_R = 0.4;
  } else if (kind === "surprise") {
    want.Brow_Raise_Inner_L = want.Brow_Raise_Inner_R = 0.5;
    want.Eye_Wide_L = want.Eye_Wide_R = 0.45;
    want.Jaw_Open = 0.18;
  } else if (kind === "pucker") {
    want.Mouth_Pucker_Up_L = want.Mouth_Pucker_Up_R = 0.55;
  } else if (kind === "angry") {
    want.Brow_Compress_L = want.Brow_Compress_R = 0.72;
    want.Brow_Drop_L = want.Brow_Drop_R = 0.55;
    want.Nose_Sneer_L = want.Nose_Sneer_R = 0.4;
    want.Mouth_Press_L = want.Mouth_Press_R = 0.55;
    want.Eye_Squint_L = want.Eye_Squint_R = 0.28;
  } else if (kind === "laugh") {
    want.Mouth_Smile_L = want.Mouth_Smile_R = 0.92;
    want.Cheek_Raise_L = want.Cheek_Raise_R = 0.7;
    want.Eye_Squint_L = want.Eye_Squint_R = 0.45;
    want.Jaw_Open = 0.28;
    want.Mouth_Dimple_L = want.Mouth_Dimple_R = 0.4;
    want.V_Wide = 0.35;
  } else if (kind === "tease" || kind === "flirty") {
    want.Mouth_Smile_L = 0.42;
    want.Mouth_Smile_R = 0.78;
    want.Mouth_Dimple_R = 0.35;
    want.Eye_Squint_L = 0.18;
    want.Eye_Squint_R = 0.28;
    want.Cheek_Raise_R = 0.4;
    want.Brow_Raise_Outer_R = 0.22;
  } else if (kind === "sad") {
    want.Mouth_Frown_L = want.Mouth_Frown_R = 0.58;
    want.Brow_Raise_Inner_L = want.Brow_Raise_Inner_R = 0.48;
    want.Brow_Drop_L = want.Brow_Drop_R = 0.22;
    want.Eye_Squint_L = want.Eye_Squint_R = 0.12;
  } else if (kind === "listening") {
    want.Mouth_Smile_L = want.Mouth_Smile_R = 0.16;
    want.Brow_Raise_Inner_L = want.Brow_Raise_Inner_R = 0.18;
    want.Eye_Wide_L = want.Eye_Wide_R = 0.08;
  }
}

const VISEME = {
  a: { jaw: 0.58, open: 0.48, wide: 0.22, o: 0, lip: 0.38, pucker: 0, press: 0 },
  e: { jaw: 0.3, open: 0.22, wide: 0.58, o: 0, lip: 0.26, pucker: 0, press: 0 },
  i: { jaw: 0.18, open: 0.12, wide: 0.72, o: 0, lip: 0.2, pucker: 0, press: 0 },
  o: { jaw: 0.44, open: 0.4, wide: 0, o: 0.68, lip: 0.42, pucker: 0.28, press: 0 },
  u: { jaw: 0.22, open: 0.16, wide: 0, o: 0.58, lip: 0.2, pucker: 0.48, press: 0 },
  m: { jaw: 0.02, open: 0, wide: 0, o: 0, lip: 0, pucker: 0, press: 0.88 },
  b: { jaw: 0.06, open: 0, wide: 0, o: 0, lip: 0, pucker: 0, press: 0.82 },
  p: { jaw: 0.05, open: 0, wide: 0, o: 0, lip: 0, pucker: 0, press: 0.84 },
  f: { jaw: 0.12, open: 0.06, wide: 0, o: 0, lip: 0.16, pucker: 0.42, press: 0.22 },
  w: { jaw: 0.16, open: 0.1, wide: 0, o: 0.32, lip: 0.12, pucker: 0.52, press: 0 },
  default: { jaw: 0.2, open: 0.14, wide: 0.12, o: 0, lip: 0.16, pucker: 0, press: 0 },
  rest: { jaw: 0.03, open: 0, wide: 0, o: 0, lip: 0, pucker: 0, press: 0 },
};
function buildVisemes(text) {
  const seq = [];
  for (const ch of String(text || "").toLowerCase()) {
    if (/\s/.test(ch)) seq.push("rest");
    else if ("aeiou".includes(ch)) seq.push(ch);
    else if ("mbp".includes(ch)) seq.push(ch);
    else if ("fv".includes(ch)) seq.push("f");
    else if (ch === "w" || ch === "q") seq.push("w");
    else if (/[a-z]/.test(ch)) seq.push("default");
  }
  return seq.length ? seq : ["default"];
}

const EXPR_CYCLE = ["neutral", "happy", "frown", "surprise", "pucker", "angry", "laugh"];

class MiraActor {
  constructor(cloned, baseScale, opts) {
    this.group = new THREE.Group();
    this.root = cloned;
    this.group.add(cloned);
    this.baseScale = baseScale;
    this.bones = {};
    this.bindQ = {};
    this.bindPos = {};
    this.bindS = {};
    this.extra = {};
    this.skeleton = null;
    this.morphMeshes = [];
    this.hairMats = [];
    this.headMats = [];
    this.shape = { height: 1, waist: 1, hips: 1, breast: 1, butt: 1, thigh: 1, gap: 0, arms: 1, jiggle: 1.75 };
    if (opts && opts.shape) Object.assign(this.shape, opts.shape);
    this.faceType = (opts && opts.faceType) || 0;
    this.hairColor = (opts && opts.hairColor) || 0;
    this.want = Object.fromEntries(MORPH.map((n) => [n, 0]));
    this.cur = { ...this.want };
    this.walkT = 0;
    this.speed = 0;
    this.moveVel = new THREE.Vector3();
    this.poseQ = {};
    this.poseAlpha = 1;
    this.softAccumulator = 0;
    this.feet = {};
    this.gazeYaw = this.gazePitch = 0;
    this.autoWander = true;
    this.gait = (opts && opts.gait) || 0;
    this.gaitSwitch = 2 + Math.random();
    this.blinkT = 1.5 + Math.random();
    this.blinkHold = 0;
    this.exprT = 3 + Math.random() * 4;
    this.miraWalk = 0.4 + Math.random();
    this.soft = [
      { name: "L_Breast", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kind: "breast" },
      { name: "R_Breast", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kind: "breast" },
      { name: "L_Glute", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kind: "glute" },
      { name: "R_Glute", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kind: "glute" },
    ];
    for (const tissue of this.soft) Object.assign(tissue, {
      anchor: new THREE.Vector3(), prevAnchor: new THREE.Vector3(),
      prevVelocity: new THREE.Vector3(), acceleration: new THREE.Vector3(),
      press: new THREE.Vector3(), pressT: 0, ready: false,
      px: 0, py: 0, pz: 0
    });
    this.held = null;
    this.heldVel = new THREE.Vector3();
    this.idleKind = "rest";
    this.idleT = 2 + Math.random() * 2;
    this.idleDur = 2.4;
    this.gQuat = new THREE.Quaternion();
    this.mode = "wander";
    this.lookAtPos = null;
    this.heldBall = null;
    this.ballCool = 2 + Math.random() * 3;
    this.talkT = 0;
    this.personality = opts && opts.personality ? opts.personality : "";
    this.baseY = 0;
    this.squash = {};
    this.socialT = 2 + Math.random() * 3;
    this.throwN = 0;
    this.dest = null;
    this.talkTarget = null;
    this.speech = null;
    this.prevHip = new THREE.Vector3();
    this.hipReady = false;
    this.hitReact = { lookYaw: 0, lookPitch: 0, lookT: 0, flinchX: 0, flinchY: 0, flinchZ: 0, headKickX: 0, headKickY: 0, exprT: 0, knockX: 0, knockZ: 0 };
    this.hitCool = {};
    cloned.traverse((o) => {
      if (o.isBone) {
        this.bones[o.name] = o;
        this.bindQ[o.name] = o.quaternion.clone();
        this.bindPos[o.name] = o.position.clone();
        this.bindS[o.name] = o.scale.clone();
      }
      if (o.isSkinnedMesh && o.skeleton && !this.skeleton) this.skeleton = o.skeleton;
      if (o.isMesh && o.morphTargetDictionary) this.morphMeshes.push(o);
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        if (isHairMat(m, o)) this.hairMats.push(m);
        if (/Skin_Head/i.test(m.name || "")) this.headMats.push(m);
      }
    });
    const head = this.bones.Head;
    if (head) {
      cloned.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (mats.some((m) => m && isHairMat(m, o)) && !o.isSkinnedMesh && o.parent !== head) head.attach(o);
      });
    }
    this.applyLooks();
    if (opts && opts.position) this.group.position.copy(opts.position);
  }
  applyLooks() {
    const face = FACE_TYPES[this.faceType] || FACE_TYPES[0];
    const hair = HAIR_COLORS[this.hairColor] || HAIR_COLORS[0];
    const map = loadMap(face.file, true);
    for (const m of this.headMats) {
      m.map = map;
      m.needsUpdate = true;
    }
    for (const m of this.hairMats) {
      m.color.setHex(hair.tint);
      m.needsUpdate = true;
    }
  }
  addE(name, x, y, z) {
    const e = this.extra[name] || (this.extra[name] = { x: 0, y: 0, z: 0 });
    e.x += x; e.y += y; e.z += z;
  }
  restoreBind() {
    for (const n in this.bindQ) {
      const b = this.bones[n];
      if (!b) continue;
      b.quaternion.copy(this.bindQ[n]);
      if (this.bindPos[n]) b.position.copy(this.bindPos[n]);
      if (this.bindS[n]) b.scale.copy(this.bindS[n]);
    }
    for (const k of Object.keys(this.extra)) delete this.extra[k];
  }
  applyShape() {
    const s = this.shape;
    for (const slider of SLIDERS) {
      const v = Number.isFinite(s[slider.key]) ? s[slider.key] : slider.value;
      s[slider.key] = THREE.MathUtils.clamp(v, slider.min, slider.max);
    }
    this.root.scale.setScalar(this.baseScale * s.height);
    const sc = (n, x, y, z) => {
      const b = this.bones[n];
      if (!b || !this.bindS[n]) return;
      b.scale.set(this.bindS[n].x * x, this.bindS[n].y * y, this.bindS[n].z * z);
    };
    sc("Waist", s.waist, 1, s.waist);
    sc("Spine01", 0.82 + s.waist * 0.18, 1, 0.82 + s.waist * 0.18);
    sc("Pelvis", s.hips, 1, s.hips);
    sc("Hip", 0.9 + s.hips * 0.1, 1, 0.9 + s.hips * 0.1);
    sc("L_Breast", s.breast, s.breast, s.breast);
    sc("R_Breast", s.breast, s.breast, s.breast);
    sc("L_Glute", s.butt, s.butt, s.butt);
    sc("R_Glute", s.butt, s.butt, s.butt);
    sc("L_Thigh", s.thigh, 1, s.thigh);
    sc("R_Thigh", s.thigh, 1, s.thigh);
    sc("L_Upperarm", s.arms, 1, s.arms);
    sc("R_Upperarm", s.arms, 1, s.arms);
    sc("L_Forearm", s.arms, 1, s.arms);
    sc("R_Forearm", s.arms, 1, s.arms);
    sc("L_Thumb1", 0.88, 0.88, 0.88);
    sc("R_Thumb1", 0.88, 0.88, 0.88);
    sc("L_Thumb2", 0.9, 0.9, 0.9);
    sc("R_Thumb2", 0.9, 0.9, 0.9);
    if (this.bones.L_Thigh && this.bindPos.L_Thigh) this.bones.L_Thigh.position.x = this.bindPos.L_Thigh.x + s.gap * 0.05;
    if (this.bones.R_Thigh && this.bindPos.R_Thigh) this.bones.R_Thigh.position.x = this.bindPos.R_Thigh.x - s.gap * 0.05;
  }
  applyExtras() {
    for (const n in this.extra) {
      const b = this.bones[n];
      const q0 = this.bindQ[n];
      if (!b || !q0) continue;
      const e = this.extra[n];
      _e.set(e.x, e.y, e.z, "XYZ");
      _q.setFromEuler(_e);
      _q.premultiply(q0);
      const prev = this.poseQ[n] || (this.poseQ[n] = _q.clone());
      prev.slerp(_q, this.poseAlpha);
      b.quaternion.copy(prev);
    }
  }
  tickMorphs(dt) {
    for (const n of MORPH) this.cur[n] = THREE.MathUtils.damp(this.cur[n], this.want[n], 9, dt);
    for (const mesh of this.morphMeshes) {
      const d = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;
      if (!d || !inf) continue;
      for (const n of MORPH) if (n in d) inf[d[n]] = this.cur[n];
    }
  }
  tickExpr(dt) {
    this.exprT -= dt;
    if (this.speech && this.speech.active) {
      this.hitReact.exprT = Math.max(this.hitReact.exprT, 0.2);
    } else if (this.hitReact.exprT > 0) this.hitReact.exprT -= dt;
    else if (this.exprT <= 0) {
      this.exprT = 7 + Math.random() * 6;
      exprFace(this.want, Math.random() < 0.75 ? "neutral" : "happy");
      for (const n of MORPH) this.want[n] *= 0.22;
    }
    this.blinkT -= dt;
    if (this.blinkT <= 0 && this.blinkHold <= 0) {
      this.blinkHold = 0.19;
      this.blinkT = 2.5 + Math.random() * 4;
    }
    let blink = 0;
    if (this.blinkHold > 0) {
      this.blinkHold = Math.max(0, this.blinkHold - dt);
      const elapsed = 0.19 - this.blinkHold;
      blink = elapsed < 0.055 ? elapsed / 0.055 : Math.max(0, 1 - (elapsed - 0.055) / 0.135);
      blink = THREE.MathUtils.smoothstep(blink, 0, 1);
    }
    this.want.Eye_Blink_L = this.want.Eye_Blink_R = blink;
    // Blink envelope must not be low-pass filtered until it fails to close.
    this.cur.Eye_Blink_L = this.cur.Eye_Blink_R = blink;
  }

  tickRest() {
    // Bind is T-pose. Z drops the arms in the coronal plane; X swings them
    // forward through the ribcage, so keep X tiny.
    this.addE("L_Upperarm", 0.02, 0.18, -0.55);
    this.addE("R_Upperarm", 0.02, -0.18, 0.55);
    this.addE("L_Forearm", 0.32, 0, 0.06);
    this.addE("R_Forearm", 0.32, 0, -0.06);
  }
  tickFingers(curl) {
    const c = 0.12 + curl * 0.25;
    for (const side of ["L_", "R_"]) {
      for (const row of FINGER_ROWS) {
        this.addE(side + row + "1", c * 0.22, 0, 0);
        this.addE(side + row + "2", c * 0.35, 0, 0);
        this.addE(side + row + "3", c * 0.28, 0, 0);
      }
    }
  }
  tickWalk(moving) {
    const amount = THREE.MathUtils.clamp(this.speed / 0.55, 0, 1);
    const phase = this.walkT;
    this.addE("L_Upperarm", -Math.sin(phase) * 0.15 * amount, 0, 0);
    this.addE("R_Upperarm", Math.sin(phase) * 0.15 * amount, 0, 0);
    this.addE("L_Forearm", 0.08 * (1 - Math.sin(phase)) * amount, 0, 0);
    this.addE("R_Forearm", 0.08 * (1 + Math.sin(phase)) * amount, 0, 0);
    this.addE("Hip", 0, Math.sin(phase) * 0.025 * amount, Math.sin(phase) * 0.018 * amount);
    this.addE("Spine02", 0, -Math.sin(phase) * 0.025 * amount, 0);
  }
  aimBone(bone, child, target) {
    bone.getWorldPosition(_ikA);
    child.getWorldPosition(_ikB);
    _ikB.sub(_ikA).normalize();
    _ikC.copy(target).sub(_ikA).normalize();
    _ikQ.setFromUnitVectors(_ikB, _ikC);
    bone.getWorldQuaternion(_ikParentQ);
    _ikQ.multiply(_ikParentQ);
    bone.parent.getWorldQuaternion(_ikParentQ).invert();
    bone.quaternion.copy(_ikParentQ.multiply(_ikQ));
    bone.updateWorldMatrix(false, true);
  }
  solveFeet(dt, moving) {
    const exercise = this.mode === "jumpingJacks" || this.mode === "stretch";
    if (exercise) { this.feet = {}; return; }
    const h = this.shape.height;
    let activeStep = Object.values(this.feet).some((f) => f.swing);
    for (const side of ["L", "R"]) {
      const thigh = this.bones[side + "_Thigh"], calf = this.bones[side + "_Calf"], foot = this.bones[side + "_Foot"];
      if (!thigh || !calf || !foot) continue;
      let f = this.feet[side];
      if (!f || Math.abs(f.height - h) > 0.005) {
        const pos = foot.getWorldPosition(new THREE.Vector3());
        f = this.feet[side] = { height: h, target: pos.clone(), start: pos.clone(), end: pos.clone(),
          swing: false, restQ: this.group.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(foot.getWorldQuaternion(new THREE.Quaternion())),
          local: this.group.worldToLocal(pos.clone()), ankleY: Math.max(0.035 * h, pos.y - this.group.position.y) };
      }
      const forward = _motion.set(0, 0, 1).applyQuaternion(this.group.quaternion);
      const behind = _ikDir.copy(f.target).sub(this.group.position).dot(forward);
      if (moving && !activeStep && behind < -0.085 * h && (!this.nextFoot || this.nextFoot === side)) {
        f.start.copy(f.target);
        f.duration = THREE.MathUtils.clamp(0.18 * h / Math.max(0.2, this.speed), 0.22, 0.45);
        _motion.set(side === "L" ? 0.085 * h : -0.085 * h, 0, this.speed * f.duration + 0.10 * h);
        this.group.localToWorld(_motion);
        f.end.copy(_motion); f.end.y = this.baseY + f.ankleY;
        f.progress = 0; f.swing = true; activeStep = true;
        f.phaseStart = side === "L" ? Math.PI : 0;
      }
      if (f.swing) {
        f.progress = Math.min(1, f.progress + dt / f.duration);
        const u = f.progress, smooth = u * u * u * (u * (u * 6 - 15) + 10);
        f.target.lerpVectors(f.start, f.end, smooth);
        f.target.y = this.baseY + f.ankleY + Math.sin(Math.PI * u) * 0.04 * h;
        this.walkT = f.phaseStart + u * Math.PI;
        if (u >= 1) { f.swing = false; this.nextFoot = side === "L" ? "R" : "L"; }
      } else f.target.y = this.baseY + f.ankleY;
      thigh.getWorldPosition(_ikA); calf.getWorldPosition(_ikB); foot.getWorldPosition(_ikC);
      const upper = _ikA.distanceTo(_ikB), lower = _ikB.distanceTo(_ikC);
      _ikDir.copy(f.target).sub(_ikA);
      if (_ikDir.length() > upper + lower + 0.12 * h) {
        // Tracking jumps/body drags recover a stance instead of stretching skin.
        f.target.copy(f.local); this.group.localToWorld(f.target);
        f.target.y = this.baseY + f.ankleY; f.swing = false;
        _ikDir.copy(f.target).sub(_ikA);
      }
      const distance = THREE.MathUtils.clamp(_ikDir.length(), Math.abs(upper - lower) + 0.001, (upper + lower) * 0.998);
      _ikDir.normalize();
      _ikBend.set(0, 0, 1).applyQuaternion(this.group.quaternion);
      _ikBend.addScaledVector(_ikDir, -_ikBend.dot(_ikDir)).normalize();
      const along = (upper * upper + distance * distance - lower * lower) / (2 * distance);
      _ikKnee.copy(_ikA).addScaledVector(_ikDir, along).addScaledVector(_ikBend, Math.sqrt(Math.max(0, upper * upper - along * along)));
      this.aimBone(thigh, calf, _ikKnee);
      this.aimBone(calf, foot, f.target);
      this.group.getWorldQuaternion(_ikQ).multiply(f.restQ);
      foot.parent.getWorldQuaternion(_ikParentQ).invert();
      foot.quaternion.copy(_ikParentQ.multiply(_ikQ));
      foot.updateWorldMatrix(false, true);
    }
  }

  tickIdle(t, dt) {
    this.addE("Hip", 0, Math.sin(t * 0.65) * 0.018, Math.sin(t * 0.5) * 0.012);
    this.addE("L_Clavicle", Math.sin(t * 0.8) * 0.02, 0, Math.sin(t * 0.9) * 0.015);
    this.addE("R_Clavicle", Math.sin(t * 0.8 + 0.7) * 0.02, 0, Math.sin(t * 0.9 + 1) * 0.015);
    this.idleT -= dt;
    if (this.idleT <= 0) {
      const kinds = ["rest", "rest", "hairL", "hairR", "stretch", "hipShift", "lookHand", "wave", "cheekRest", "akimbo", "shoulderLook"];
      this.idleKind = kinds[(Math.random() * kinds.length) | 0];
      this.idleDur = this.idleKind === "rest" ? 2.2 + Math.random() * 2 : 1.8 + Math.random() * 1.4;
      this.idleT = this.idleDur;
    }
    const u = 1 - Math.max(0, this.idleT) / Math.max(0.2, this.idleDur);
    const k = Math.sin(Math.min(1, u) * Math.PI);
    if (this.idleKind === "hairL") {
      this.addE("L_Upperarm", 0.04 * k, 0.48 * k, 1.12 * k);
      this.addE("L_Forearm", 0.95 * k, 0.08 * k, 0.22 * k);
      this.addE("Head", 0.08 * k, 0.18 * k, 0);
    } else if (this.idleKind === "hairR") {
      this.addE("R_Upperarm", 0.04 * k, -0.48 * k, -1.12 * k);
      this.addE("R_Forearm", 0.95 * k, -0.08 * k, -0.22 * k);
      this.addE("Head", 0.08 * k, -0.18 * k, 0);
    } else if (this.idleKind === "stretch") {
      this.addE("L_Upperarm", 0.04 * k, 0.08 * k, 1.22 * k);
      this.addE("R_Upperarm", 0.04 * k, -0.08 * k, -1.22 * k);
      this.addE("Spine02", -0.08 * k, 0, 0);
    } else if (this.idleKind === "hipShift") {
      this.addE("Hip", 0, 0.12 * k, 0.08 * k);
      this.addE("L_Thigh", 0.06 * k, 0, 0);
    } else if (this.idleKind === "lookHand") {
      this.addE("R_Upperarm", 0.12 * k, -0.12 * k, -0.45 * k);
      this.addE("R_Forearm", 0.55 * k, 0, 0);
      this.addE("Head", 0.22 * k, -0.12 * k, 0);
    } else if (this.idleKind === "wave") {
      this.addE("R_Upperarm", 0.04 * k, -0.28 * k, -1.28 * k);
      this.addE("R_Forearm", 0.45 * k, Math.sin(t * 9) * 0.45 * k, 0);
      this.addE("Head", 0, -0.08 * k, 0);
    } else if (this.idleKind === "cheekRest") {
      this.addE("L_Upperarm", 0.06 * k, 0.42 * k, 0.95 * k);
      this.addE("L_Forearm", 1.05 * k, 0, 0.18 * k);
      this.addE("Head", 0.12 * k, 0.22 * k, 0);
    } else if (this.idleKind === "akimbo") {
      this.addE("L_Upperarm", 0.06 * k, 0.22 * k, 0.18 * k);
      this.addE("R_Upperarm", 0.06 * k, -0.22 * k, -0.18 * k);
      this.addE("L_Forearm", 0.7 * k, 0, 0.1 * k);
      this.addE("R_Forearm", 0.7 * k, 0, -0.1 * k);
      this.addE("Hip", 0, 0.1 * k, 0.07 * k);
    } else if (this.idleKind === "shoulderLook") {
      this.addE("Head", 0.06 * k, 0.58 * k, 0);
      this.addE("NeckTwist02", 0, 0.18 * k, 0);
      this.addE("Spine02", 0, 0.2 * k, 0);
      this.addE("R_Upperarm", 0.04 * k, -0.1 * k, -0.22 * k);
    }
  }
  tickJumpingJacks(t) {
    const p = (Math.sin(t * 7.2) + 1) * 0.5;
    this.addE("L_Upperarm", 0.04 * p, 0.08 * p, 1.45 * p);
    this.addE("R_Upperarm", 0.04 * p, -0.08 * p, -1.45 * p);
    this.addE("L_Thigh", 0.08 * p, 0, 0.22 * p);
    this.addE("R_Thigh", 0.08 * p, 0, -0.22 * p);
    this.group.position.y = this.baseY + Math.abs(Math.sin(t * 7.2)) * 0.07;
  }
  tickAirSquats(t) {
    const p = (Math.sin(t * 3.15) + 1) * 0.5;
    this.addE("L_Thigh", 0.78 * p, 0, 0);
    this.addE("R_Thigh", 0.78 * p, 0, 0);
    this.addE("L_Calf", -1.05 * p, 0, 0);
    this.addE("R_Calf", -1.05 * p, 0, 0);
    this.addE("Hip", 0.18 * p, 0, 0);
    this.addE("Spine02", 0.14 * p, 0, 0);
    this.addE("L_Upperarm", 0.05 * p, 0.08 * p, 0.12 * p);
    this.addE("R_Upperarm", 0.05 * p, -0.08 * p, -0.12 * p);
    this.group.position.y = this.baseY;
  }
  tickStretch(t) {
    const p = (Math.sin(t * 1.55) + 1) * 0.5;
    this.addE("L_Upperarm", 0.04 * p, 0.08 * p, 1.28 * p);
    this.addE("R_Upperarm", 0.04 * p, -0.08 * p, -1.28 * p);
    this.addE("Spine02", -0.14 * p, 0, 0);
    this.addE("L_Forearm", 0.2 * p, 0, 0);
    this.addE("R_Forearm", 0.2 * p, 0, 0);
    this.group.position.y = this.baseY;
  }
  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode || "wander";
    this.modeT = 0;
    this.group.position.y = this.baseY;
    if (mode === "jumpingJacks" || mode === "airSquats" || mode === "stretch") this.talkT = 0;
  }
  beginSpeech(text, emotion) {
    const clean = String(text || "").trim();
    this.speech = {
      active: true,
      text: clean,
      emotion: emotion || "happy",
      t: 0,
      duration: Math.max(1.15, clean.split(/\s+/).length * 0.34),
      amp: 0.45,
      seq: buildVisemes(clean),
    };
    this.setMode("talk");
    exprFace(this.want, this.speech.emotion);
    this.hitReact.exprT = 8;
  }
  setSpeechDuration(d) {
    if (this.speech && d > 0.3) this.speech.duration = d;
  }
  setSpeechAmp(amp, t, dur) {
    if (!this.speech) return;
    this.speech.amp = THREE.MathUtils.clamp(amp, 0, 1);
    if (t != null) this.speech.t = Math.max(0, t);
    if (dur > 0.3) this.speech.duration = dur;
  }
  endSpeech() {
    if (this.speech) this.speech.active = false;
    this.hitReact.exprT = 0.7;
    this.exprT = 2.5;
  }
  tickSpeechFace(dt) {
    const sp = this.speech;
    if (!sp || !sp.active) return false;
    if (dt > 0) sp.t += dt;
    const blinkL = this.want.Eye_Blink_L, blinkR = this.want.Eye_Blink_R;
    exprFace(this.want, sp.emotion || "happy");
    this.want.Eye_Blink_L = blinkL;
    this.want.Eye_Blink_R = blinkR;
    const seq = sp.seq && sp.seq.length ? sp.seq : ["default"];
    const u = sp.duration > 1e-3 ? THREE.MathUtils.clamp(sp.t / sp.duration, 0, 0.999) : 0;
    const i = Math.min(seq.length - 1, Math.floor(u * seq.length));
    const v = VISEME[seq[i]] || VISEME.default;
    const amp = 0.28 + 0.72 * (sp.amp || 0.4);
    this.want.Jaw_Open = v.jaw * amp;
    this.want.V_Open = v.open * amp;
    this.want.V_Wide = Math.max(this.want.V_Wide || 0, v.wide * amp);
    this.want.V_Tight_O = v.o * amp;
    this.want.V_Lip_Open = v.lip * amp;
    this.want.Mouth_Pucker_Up_L = this.want.Mouth_Pucker_Up_R = v.pucker * amp;
    this.want.Mouth_Press_L = this.want.Mouth_Press_R = v.press * amp;
    if (v.press > 0.4) {
      this.want.Mouth_Smile_L *= 0.35;
      this.want.Mouth_Smile_R *= 0.35;
    }
    return true;
  }
  keepArmsClear() {
    const h = this.shape.height;
    const inv = this.group.matrixWorld.clone().invert();
    for (const side of ["L", "R"]) {
      const hand = this.bones[side + "_Hand"];
      const elbow = this.bones[side + "_Forearm"];
      if (!hand) continue;
      hand.getWorldPosition(_v).applyMatrix4(inv);
      const sign = side === "L" ? 1 : -1;
      const minX = 0.22 * h * (0.9 + 0.2 * this.shape.breast);
      if (sign * _v.x < minX) {
        const k = Math.min(0.55, (minX - sign * _v.x) * 4.5);
        this.addE(side + "_Upperarm", 0, sign * 0.12 * k, side === "L" ? k : -k);
      }
      if (_v.z > 0.07 * h && _v.y > 0.85 * h && _v.y < 1.45 * h && Math.abs(_v.x) < 0.3 * h) {
        const k = Math.min(0.45, (_v.z - 0.07 * h) * 5);
        this.addE(side + "_Upperarm", -k, 0, 0);
        this.addE(side + "_Forearm", -0.15 * k, 0, 0);
      }
      if (elbow) {
        elbow.getWorldPosition(_w).applyMatrix4(inv);
        if (sign * _w.x < minX * 0.75) {
          const k = Math.min(0.4, (minX * 0.75 - sign * _w.x) * 4);
          this.addE(side + "_Upperarm", 0, sign * 0.1 * k, side === "L" ? k : -k);
        }
      }
    }
  }
  jiggleAmt() {
    return THREE.MathUtils.clamp(Number(this.shape.jiggle), 0, 3);
  }
  limitSoft(s) {
    const j = this.jiggleAmt();
    const factor = this.shape.height * Math.sqrt(s.kind === "breast" ? this.shape.breast : this.shape.butt) * (0.4 + 0.85 * j);
    const limits = s.kind === "breast" ? [[-0.038, 0.038], [-0.012, 0.055], [-0.048, 0.04]] : [[-0.028, 0.028], [-0.032, 0.034], [-0.034, 0.016]];
    const vmax = 0.22 + 0.55 * j;
    for (let i = 0; i < 3; i++) {
      const axis = ["x", "y", "z"][i], velocity = "v" + axis;
      if (!Number.isFinite(s[axis]) || !Number.isFinite(s[velocity])) s[axis] = s[velocity] = 0;
      const lo = limits[i][0] * factor, hi = limits[i][1] * factor;
      s[axis] = THREE.MathUtils.clamp(s[axis], lo, hi);
      if ((s[axis] <= lo && s[velocity] < 0) || (s[axis] >= hi && s[velocity] > 0)) s[velocity] *= -0.25;
      s[velocity] = THREE.MathUtils.clamp(s[velocity], -vmax, vmax);
    }
  }
  resetPhysics() {
    this.softAccumulator = 0;
    for (const s of this.soft) {
      s.x = s.y = s.z = s.vx = s.vy = s.vz = s.px = s.py = s.pz = 0;
      s.ready = false; s.pressT = 0; s.press.set(0, 0, 0); s.acceleration.set(0, 0, 0);
    }
    this.held = null; this.heldVel.set(0, 0, 0); this.feet = {}; this.nextFoot = null;
  }
  tickSoft(dt) {
    if (!(dt > 0)) return;
    for (const s of this.soft) {
      const bone = this.bones[s.name];
      if (!bone) continue;
      // Measure the undeformed anchor after the current pose, including turns.
      s.anchor.copy(this.bindPos[s.name]).applyMatrix4(bone.parent.matrixWorld);
      _softV.copy(s.anchor).sub(s.prevAnchor);
      if (!s.ready || dt > 0.08 || _softV.lengthSq() > 0.0625) {
        s.prevVelocity.set(0, 0, 0); s.acceleration.set(0, 0, 0);
        s.x = s.y = s.z = s.vx = s.vy = s.vz = s.px = s.py = s.pz = 0;
        s.ready = true;
      } else {
        _softV.multiplyScalar(1 / dt);
        const vx = _softV.x, vy = _softV.y, vz = _softV.z;
        _softV.sub(s.prevVelocity).multiplyScalar(1 / dt);
        s.prevVelocity.set(vx, vy, vz);
        limitVector(_softV, 18);
        bone.parent.getWorldQuaternion(_softQ).invert();
        _softV.applyQuaternion(_softQ).multiplyScalar(-0.42 * (0.45 + this.jiggleAmt()));
        s.acceleration.lerp(_softV, 1 - Math.exp(-dt * 16));
      }
      s.prevAnchor.copy(s.anchor);
      s.pressT -= dt;
      if (s.pressT <= 0) s.press.multiplyScalar(Math.exp(-dt * 24));
    }
    const step = 1 / 120;
    this.softAccumulator = Math.min(this.softAccumulator + dt, step * 6);
    while (this.softAccumulator + 1e-9 >= step) {
      for (const s of this.soft) {
        if (!this.bones[s.name]) continue;
        s.px = s.x; s.py = s.y; s.pz = s.z;
        const size = s.kind === "breast" ? this.shape.breast : this.shape.butt;
        const j = this.jiggleAmt();
        const omega = 2 * Math.PI * (s.kind === "breast" ? 2.7 : 4.6) / Math.sqrt(Math.max(0.45, size));
        let stiffness = omega * omega;
        let damping = 2 * omega * ((s.kind === "breast" ? 0.32 : 0.48) / (0.38 + 0.42 * Math.max(0.15, j)));
        const held = this.held && this.held.spring === s;
        if (held) { stiffness = 900; damping = 55; }
        const restY = held || s.kind !== "breast" ? 0 : -0.01 * j * Math.sqrt(size);
        for (const axis of ["x", "y", "z"]) {
          const rest = axis === "y" ? restY : 0;
          const target = held ? this.held["t" + axis] : s.press[axis] + rest;
          // Backward-Euler spring: stable for stiff contacts and dropped frames.
          s["v" + axis] = (s["v" + axis] + step * (s.acceleration[axis] + stiffness * (target - s[axis]))) / (1 + damping * step + stiffness * step * step);
          s[axis] += step * s["v" + axis];
        }
        this.limitSoft(s);
      }
      this.softAccumulator -= step;
    }
    const alpha = THREE.MathUtils.clamp(this.softAccumulator / step, 0, 1);
    for (const s of this.soft) {
      const bone = this.bones[s.name]; if (!bone) continue;
      bone.parent.getWorldScale(_softScale);
      // Offsets are in metres in the parent's oriented frame, independent of scale.
      bone.position.copy(this.bindPos[s.name]);
      bone.position.x += THREE.MathUtils.lerp(s.px, s.x, alpha) / Math.max(0.01, Math.abs(_softScale.x));
      bone.position.y += THREE.MathUtils.lerp(s.py, s.y, alpha) / Math.max(0.01, Math.abs(_softScale.y));
      bone.position.z += THREE.MathUtils.lerp(s.pz, s.z, alpha) / Math.max(0.01, Math.abs(_softScale.z));
    }
  }

  tickGaze(dt, moving, camPos) {
    const head = this.bones.Head;
    const eyeHeight = this.group.position.y + 1.52 * this.shape.height;
    const dx = camPos.x - this.group.position.x, dz = camPos.z - this.group.position.z;
    const distance = Math.max(0.2, Math.hypot(dx, dz));
    const yaw = THREE.MathUtils.clamp(wrapPi(Math.atan2(dx, dz) - this.group.rotation.y), -0.9, 0.9);
    const pitch = THREE.MathUtils.clamp(-Math.atan2(camPos.y - eyeHeight, distance), -0.35, 0.35);
    this.gazeYaw = THREE.MathUtils.damp(this.gazeYaw, yaw, 7, dt);
    this.gazePitch = THREE.MathUtils.damp(this.gazePitch, pitch, 7, dt);
    this.addE("Head", this.gazePitch * 0.5 + this.hitReact.headKickX, this.gazeYaw * 0.5, 0);
    this.addE("NeckTwist02", this.gazePitch * 0.16, this.gazeYaw * 0.18, 0);
    this.want.Eye_L_Look_L = this.want.Eye_R_Look_L = Math.max(0, -this.gazeYaw) * 0.45;
    this.want.Eye_L_Look_R = this.want.Eye_R_Look_R = Math.max(0, this.gazeYaw) * 0.45;
    this.want.Eye_L_Look_Up = this.want.Eye_R_Look_Up = Math.max(0, -this.gazePitch) * 0.8;
    this.want.Eye_L_Look_Down = this.want.Eye_R_Look_Down = Math.max(0, this.gazePitch) * 0.8;
  }

  tickHitReact(dt) {
    const hr = this.hitReact;
    const decay = Math.exp(-dt * 6.2);
    hr.flinchX *= decay; hr.flinchY *= decay; hr.flinchZ *= decay;
    hr.headKickX *= decay; hr.headKickY *= decay;
    hr.lookT = Math.max(0, hr.lookT - dt);
    hr.flinchX = THREE.MathUtils.clamp(hr.flinchX, -0.1, 0.1);
    hr.flinchY = THREE.MathUtils.clamp(hr.flinchY, -0.08, 0.08);
    hr.flinchZ = THREE.MathUtils.clamp(hr.flinchZ, -0.08, 0.08);
    this.addE("Spine02", hr.flinchX * 0.55, hr.flinchY * 0.35, hr.flinchZ * 0.45);
    this.addE("Spine01", hr.flinchX * 0.25, 0, 0);
    this.group.position.x += THREE.MathUtils.clamp(hr.knockX, -1.2, 1.2) * dt;
    this.group.position.z += THREE.MathUtils.clamp(hr.knockZ, -1.2, 1.2) * dt;
    const kd = Math.exp(-dt * 5.4);
    hr.knockX *= kd; hr.knockZ *= kd;
  }
  applyStrike(hit, nrm, closing, glance, pos) {
    const mag = Math.min(1.8, closing * 0.55 + glance * 0.12);
    if (mag < 0.08) return;
    const now = performance.now();
    if ((this.hitCool[hit.name] || 0) > now - 80) return;
    this.hitCool[hit.name] = now;
    _w.subVectors(pos, this.group.position);
    let lookYaw = wrapPi(Math.atan2(_w.x, _w.z) - this.group.rotation.y);
    if (hit.kind === "head" && mag > 0.7) lookYaw = -lookYaw * 0.45;
    this.hitReact.lookYaw = THREE.MathUtils.clamp(lookYaw * Math.min(1.1, mag * 0.75), -0.75, 0.75);
    this.hitReact.lookPitch = THREE.MathUtils.clamp(-nrm.y * mag * 0.28, -0.4, 0.32);
    this.hitReact.lookT = 0.28 + Math.min(0.35, mag * 0.12);
    if (hit.kind === "head" || hit.kind === "chest" || hit.kind === "belly") {
      this.hitReact.flinchX += THREE.MathUtils.clamp(-nrm.z * mag * 0.05, -0.07, 0.07);
    }
    this.hitReact.knockX -= nrm.x * mag * 0.02;
    this.hitReact.knockZ -= nrm.z * mag * 0.02;
    if (mag > 0.45) { this.hitReact.exprT = 0.4; exprFace(this.want, mag > 1.1 ? "angry" : "surprise"); }
  }
  hitSegment(hit) {
    const bone = this.bones[hit.name];
    if (!bone) return 0;
    _cpA.set(...(hit.offset || [0, 0, 0])).applyMatrix4(bone.matrixWorld);
    if (hit.end && this.bones[hit.end]) _cpB.setFromMatrixPosition(this.bones[hit.end].matrixWorld);
    else _cpB.copy(_cpA);
    const shape = hit.kind === "breast" ? this.shape.breast : hit.kind === "glute" ? this.shape.butt : hit.kind === "thigh" ? this.shape.thigh : hit.kind === "arm" ? this.shape.arms : 1;
    return hit.rad * this.shape.height * Math.sqrt(shape);
  }
  contactSoft(hit, normal, push, closing) {
    for (const s of this.soft) {
      if (this.held && this.held.spring === s) continue;
      const weight = s.name === hit.name ? 1 : hit.kind === "chest" && s.kind === "breast" ? 0.25 : 0;
      if (!weight) continue;
      this.bones[s.name].parent.getWorldQuaternion(_softQ).invert();
      _softV.copy(normal).applyQuaternion(_softQ).multiplyScalar(-weight);
      s.press.copy(_softV).multiplyScalar(Math.min(push * 0.35, 0.005));
      s.pressT = 0.045;
      const impulse = Math.min(Math.max(0, closing) * 0.045, 0.12);
      s.vx += _softV.x * impulse; s.vy += _softV.y * impulse; s.vz += _softV.z * impulse;
      this.limitSoft(s);
    }
  }
  collidePoint(pos, rad, vel, foam, react = true) {
    let best = null, deepest = 0, bestClosing = 0;
    for (const hit of BODY_HIT) {
      const radius = this.hitSegment(hit); if (!radius) continue;
      _cpD.subVectors(_cpB, _cpA);
      _cpP.copy(pos).sub(_cpA);
      const u = THREE.MathUtils.clamp(_cpP.dot(_cpD) / Math.max(1e-10, _cpD.lengthSq()), 0, 1);
      _cpP.copy(_cpA).addScaledVector(_cpD, u);
      _cpN.copy(pos).sub(_cpP);
      const distance = _cpN.length(), minimum = radius + rad;
      if (distance >= minimum) continue;
      if (distance < 1e-7) _cpN.set(0, 0, 1).applyQuaternion(this.group.quaternion);
      else _cpN.multiplyScalar(1 / distance);
      const push = minimum - distance;
      const closing = vel ? Math.max(0, -vel.dot(_cpN)) : 0;
      pos.addScaledVector(_cpN, push + 0.00001);
      if (vel && closing > 0) vel.addScaledVector(_cpN, closing * (foam ? 1 : 1.35));
      // Positional projection contributes no artificial velocity/energy.
      if (push > deepest) {
        deepest = push; best = hit; bestClosing = closing;
        _contactN.copy(_cpN); _contactP.copy(_cpP);
      }
    }
    this.lastContact=best?{kind:best.kind,speed:bestClosing,depth:deepest}:null;
    if (best && react) {
      this.contactSoft(best, _contactN, deepest, bestClosing);
      if (bestClosing > 0.5) this.applyStrike(best, _contactN, bestClosing, 0, _contactP);
    }
    return !!best;
  }

  nearestHit(worldPos, maxDist) {
    let best = null, distance = maxDist;
    for (const hit of BODY_HIT) {
      const radius = this.hitSegment(hit); if (!radius) continue;
      _cpD.subVectors(_cpB, _cpA); _cpP.copy(worldPos).sub(_cpA);
      const u = THREE.MathUtils.clamp(_cpP.dot(_cpD) / Math.max(1e-10, _cpD.lengthSq()), 0, 1);
      _cpP.copy(_cpA).addScaledVector(_cpD, u);
      const d = worldPos.distanceTo(_cpP) - radius;
      if (d < distance) { distance = d; best = hit; }
    }
    this.lastHitDistance = distance;
    return best;
  }

  beginGrab(ctrl, hit) {
    const bone = this.bones[hit.name];
    if (!bone || this.held) return;
    this.held = { ctrl, hit, spring: this.soft.find((s) => s.name === hit.name) || null,
      tx: 0, ty: 0, tz: 0, last: new THREE.Vector3(), offset: new THREE.Vector3() };
    ctrl.getWorldPosition(this.held.last);
    this.held.offset.copy(this.held.last); bone.parent.worldToLocal(this.held.offset).sub(bone.position);
    this.heldVel.set(0, 0, 0);
    this.miraWalk = 8; this.dest = null;
  }

  tickGrab(dt) {
    if (!this.held || !(dt > 0)) return;
    const held = this.held, bone = this.bones[held.hit.name];
    held.ctrl.getWorldPosition(_softV);
    _motion.copy(_softV).sub(held.last);
    if (_motion.lengthSq() > 0.16) { this.endGrab(); return; }
    limitVector(_motion.multiplyScalar(1 / dt), 3);
    this.heldVel.lerp(_motion, 1 - Math.exp(-dt * 18));
    held.last.copy(_softV);
    if (held.spring) {
      bone.parent.worldToLocal(_softV).sub(held.offset).sub(this.bindPos[held.hit.name]);
      bone.parent.getWorldScale(_softScale); _softV.multiply(_softScale);
      // The grab preserves its initial contact point and uses the spring's frame.
      const target = { ...held.spring, x: _softV.x, y: _softV.y, z: _softV.z, vx: 0, vy: 0, vz: 0 };
      this.limitSoft(target);
      held.tx = target.x; held.ty = target.y; held.tz = target.z;
    } else {
      _motion.copy(held.offset).add(bone.position).applyMatrix4(bone.parent.matrixWorld);
      _softV.sub(_motion); _softV.y = 0; limitVector(_softV, 0.35);
      this.group.position.addScaledVector(_softV, 1 - Math.exp(-dt * 5));
    }
  }

  endGrab() {
    if (!this.held) return;
    if (this.held.spring) {
      const s = this.held.spring;
      this.bones[s.name].parent.getWorldQuaternion(_softQ).invert();
      limitVector(_softV.copy(this.heldVel).applyQuaternion(_softQ).multiplyScalar(0.1), 0.16);
      s.vx = _softV.x; s.vy = _softV.y; s.vz = _softV.z;
      this.limitSoft(s);
    }
    this.held = null;
    this.heldVel.set(0, 0, 0);
  }

  wander(dt) {
    const canMove = !this.held && this.autoWander && this.mode === "wander";
    if (canMove) {
      this.miraWalk -= dt;
      if (this.miraWalk < 0 && !this.dest) {
        this.miraWalk = 5 + Math.random() * 5;
        this.dest = new THREE.Vector3(THREE.MathUtils.clamp(this.group.position.x + (Math.random() - 0.5) * 1.6, -2.4, 2.4), 0,
          THREE.MathUtils.clamp(this.group.position.z + (Math.random() - 0.5) * 1.6, -2.4, 2.4));
      }
    }
    let targetSpeed = 0;
    if (canMove && this.dest) {
      _motion.copy(this.dest).sub(this.group.position); _motion.y = 0;
      const distance = _motion.length();
      if (distance < 0.06) this.dest = null;
      else {
        const desiredYaw = Math.atan2(_motion.x, _motion.z);
        const turn = Math.abs(wrapPi(desiredYaw - this.group.rotation.y));
        targetSpeed = Math.min(0.55 * this.shape.height, distance * 1.5) * Math.max(0.15, Math.cos(turn));
        this.group.rotation.y = dampAngle(this.group.rotation.y, desiredYaw, 3.5, dt);
      }
    }
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, 4.5, dt);
    if (this.speed < 0.008) this.speed = 0;
    this.moveVel.set(Math.sin(this.group.rotation.y), 0, Math.cos(this.group.rotation.y)).multiplyScalar(this.speed);
    this.group.position.addScaledVector(this.moveVel, dt);
    // Footstep state advances arm/gait phase after actual foot contact.
    return this.speed > 0.02;
  }

  tick(dt, camPos, tAbs) {
    this.modeT = (this.modeT || 0) + dt;
    if (["jumpingJacks", "airSquats", "stretch"].includes(this.mode) && this.modeT > 20) this.setMode("wander");
    this.ballCool = Math.max(0, (this.ballCool || 0) - dt);
    const moving = this.wander(dt);
    this.tickExpr(dt);
    const speaking = this.tickSpeechFace(dt);
    this.restoreBind(); this.applyShape(); this.tickRest();
    this.poseAlpha = 1 - Math.exp(-dt * 16);
    this.group.position.y = this.baseY - this.shape.height * (0.016 + 0.025 * Math.min(1, this.speed / 0.15));
    this.addE("Spine02", Math.sin(tAbs * 1.35) * 0.009, 0, 0);
    if (this.mode === "jumpingJacks") this.tickJumpingJacks(this.modeT);
    else if (this.mode === "airSquats") {
      this.tickAirSquats(this.modeT);
      this.group.position.y = this.baseY - (1 - Math.cos(this.modeT * 1.8)) * 0.095 * this.shape.height;
    } else if (this.mode === "stretch") this.tickStretch(this.modeT);
    else {
      this.tickWalk(moving);
      if (!moving) this.tickIdle(tAbs, dt);
      if (this.mode === "talk" || speaking) {
        this.addE("R_Upperarm", 0.04, -0.16, -0.55);
        this.addE("R_Forearm", 0.4 + Math.sin(tAbs * 5.2) * 0.22, 0, 0);
        this.addE("L_Upperarm", 0.03, 0.08, 0.08);
      }
      if (!speaking) this.want.Jaw_Open = 0;
    }
    this.tickGaze(dt, moving, this.lookAtPos || camPos);
    this.tickHitReact(dt); this.tickFingers(this.heldBall ? 0.75 : 0.08);
    this.applyExtras(); this.group.updateMatrixWorld(true);
    const poseA = this.poseAlpha;
    this.poseAlpha = 1;
    this.keepArmsClear(); this.applyExtras();
    this.poseAlpha = poseA;
    this.group.updateMatrixWorld(true);
    this.tickGrab(dt); this.group.updateMatrixWorld(true);
    this.solveFeet(dt, moving); this.group.updateMatrixWorld(true);
    this.tickSoft(dt); this.tickMorphs(dt);
    this.group.updateMatrixWorld(true);
    if (this.skeleton) this.skeleton.update();
  }

  worldPos(out) {
    this.group.getWorldPosition(out || _v);
    return out || _v;
  }
}

const MiraActorV2 = createV2Class(MiraActor, {loadMap, MORPH, BODY_HIT, installSkinShader, HAIR_COLORS, SLIDERS});
export { MiraActor, MiraActorV2 };

class FloppyNoodle {
  constructor(scene) {
    this.n = 8;
    this.rest = 0.14;
    this.rad = 0.04;
    this.pts = [];
    this.prev = [];
    this.grabI = -1;
    this.group = new THREE.Group();
    scene.add(this.group);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3ec1f0, roughness: 0.78, metalness: 0 });
    const cap = new THREE.MeshStandardMaterial({ color: 0xffef7a, roughness: 0.65 });
    this.segs = [];
    for (let i = 0; i < this.n; i++) {
      const p = new THREE.Vector3(0.55, 1.2 - i * this.rest, 0.45);
      this.pts.push(p);
      this.prev.push(p.clone());
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(this.rad, this.rest * 0.78, 4, 10), i === 0 || i === this.n - 1 ? cap : mat);
      this.group.add(mesh);
      this.segs.push(mesh);
    }
  }
  grabIndex(pos) {
    let best = -1, bd = 0.24;
    for (let i = 0; i < this.n; i++) {
      const d = this.pts[i].distanceTo(pos);
      if (d < bd) { bd = d; best = i; }
    }
    for (let i = 0; i < this.n - 1; i++) {
      _w.subVectors(this.pts[i + 1], this.pts[i]);
      const len = _w.length() || 1e-6;
      const t = THREE.MathUtils.clamp(_cpP.copy(pos).sub(this.pts[i]).dot(_w) / (len * len), 0, 1);
      _n.copy(this.pts[i]).addScaledVector(_w, t);
      const d = pos.distanceTo(_n);
      if (d < bd) { bd = d; best = t < 0.5 ? i : i + 1; }
    }
    return best;
  }
  grabAt(pos) { return this.grabIndex(pos) >= 0; }
  tick(dt, actors, playerPos, holdPos, holdQuat, grabI) {
    const g = 9.81;
    const step = Math.min(dt, 1 / 50);
    const gi = (holdPos && grabI >= 0) ? grabI : -1;
    const pin2 = gi >= 0 ? (gi + 1 < this.n ? gi + 1 : gi - 1) : -1;
    if (holdPos && holdQuat && gi >= 0) {
      this.pts[gi].copy(holdPos);
      this.prev[gi].copy(holdPos);
      _v.set(0, 0, -this.rest).applyQuaternion(holdQuat);
      const n1 = gi + 1 < this.n ? gi + 1 : gi - 1;
      if (n1 >= 0 && n1 < this.n) {
        this.pts[n1].copy(holdPos).add(_v);
        this.prev[n1].copy(this.pts[n1]);
      }
    }
    for (let i = 0; i < this.n; i++) {
      if (gi >= 0 && (i === gi || i === pin2)) continue;
      const p = this.pts[i];
      const pr = this.prev[i];
      const vx = p.x - pr.x;
      const vy = p.y - pr.y;
      const vz = p.z - pr.z;
      pr.copy(p);
      p.x += vx * Math.exp(-1.8 * step);
      p.y += vy * Math.exp(-1.8 * step) - g * step * step;
      p.z += vz * Math.exp(-1.8 * step);
    }
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < this.n - 1; i++) {
        const a = this.pts[i], b = this.pts[i + 1];
        _w.subVectors(b, a);
        const d = _w.length() || 1e-6;
        const diff = (d - this.rest) / d;
        const aHeld = gi >= 0 && (i === gi || i === pin2);
        const bHeld = gi >= 0 && (i + 1 === gi || i + 1 === pin2);
        if (aHeld && !bHeld) b.addScaledVector(_w, -diff);
        else if (bHeld && !aHeld) a.addScaledVector(_w, diff);
        else if (!aHeld && !bHeld) {
          a.addScaledVector(_w, diff * 0.5);
          b.addScaledVector(_w, -diff * 0.5);
        }
      }
      for (let i = 1; i < this.n - 1; i++) {
        if (gi >= 0 && (i === gi || i === pin2)) continue;
        _w.subVectors(this.pts[i + 1], this.pts[i - 1]);
        _v.copy(this.pts[i - 1]).addScaledVector(_w, 0.5);
        this.pts[i].lerp(_v, 0.08);
      }
    }
    for (let i = 0; i < this.n; i++) {
      const p = this.pts[i];
      if (p.y < this.rad) {
        p.y = this.rad;
        this.prev[i].y = p.y;
        this.prev[i].x = p.x * 0.25 + this.prev[i].x * 0.75;
        this.prev[i].z = p.z * 0.25 + this.prev[i].z * 0.75;
      }
      _v.subVectors(p, this.prev[i]).multiplyScalar(1 / step);
      for (const actor of actors) actor.collidePoint(p, this.rad, _v, true);
      limitVector(_v, 6);
      this.prev[i].copy(p).addScaledVector(_v, -step);
    }
    if (gi < 0 && playerPos && this.pts[0].distanceTo(playerPos) > 4.2) {
      _v.copy(playerPos);
      _v.y = 0.85;
      _v.x += 0.4;
      _v.z += 0.3;
      this.pts[0].lerp(_v, 0.03);
    }
    for (let i = 0; i < this.n; i++) {
      const mesh = this.segs[i];
      const a = this.pts[i];
      const b = this.pts[Math.min(i + 1, this.n - 1)];
      mesh.position.lerpVectors(a, b, 0.5);
      mesh.lookAt(b);
      mesh.rotateX(Math.PI / 2);
    }
  }
}

class RubberBall {
  constructor(scene, pos, color) {
    this.rad = 0.075;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.rad, 16, 12),
      new THREE.MeshStandardMaterial({ color: color || 0xe23d3d, roughness: 0.52, metalness: 0.02 })
    );
    this.mesh.position.copy(pos);
    this.vel = new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.8, (Math.random() - 0.5) * 0.4);
    this.held = null;
    scene.add(this.mesh);
  }
}

class PlayerHands {
  constructor(renderer,parent){
    this.renderer=renderer;this.active=[false,false];this.colliders=[];this.haptics=new ContactHaptics(renderer);
    this.ctrl=[renderer.xr.getController(0),renderer.xr.getController(1)];
    this.grip=[renderer.xr.getControllerGrip(0),renderer.xr.getControllerGrip(1)];
    this.squeeze=[0,0];this.hands=[];this.handedness=['none','none'];this.prevReady=[false,false];
    this.prevPos=[new THREE.Vector3(),new THREE.Vector3()];this.vel=[new THREE.Vector3(),new THREE.Vector3()];
    const skin=new THREE.MeshStandardMaterial({color:0xe8c4a4,roughness:.78,metalness:0});
    for(let i=0;i<2;i++){
      parent.add(this.ctrl[i],this.grip[i]);const h=new THREE.Group(),fallback=new THREE.Group();h.add(fallback);
      const palm=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),skin);palm.scale.set(.035,.014,.046);palm.position.set(0,-.012,-.052);fallback.add(palm);
      for(let j=0;j<5;j++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(j===4?.009:.007,j===4?.024:.045,3,8),skin);finger.rotation.x=Math.PI/2;finger.position.set(j===4?.039:(j-1.5)*.017,-.01,j===4?-.05:-.111);fallback.add(finger);}
      h.userData.fallback=fallback;h.userData.rigs={};this.grip[i].add(h);h.visible=false;this.hands.push(h);
      this.ctrl[i].addEventListener('connected',ev=>{this.handedness[i]=ev.data?.handedness||'none';this.active[i]=!ev.data?.hand;fallback.scale.x=this.handedness[i]==='left'?-1:1;});
      this.ctrl[i].addEventListener('disconnected',()=>{this.active[i]=false;this.prevReady[i]=false;h.visible=false;});
      this.ctrl[i].addEventListener('squeezestart',()=>this.squeeze[i]=1);
      this.ctrl[i].addEventListener('squeezeend',()=>this.squeeze[i]=0);
    }
  }
  installMesh(template){
    // Reuse the supplied textured, skinned anatomy rather than box fingers.
    // Only wrist/hand triangles render; the retained bone hierarchy supplies skinning.
    for(let i=0;i<2;i++)for(const side of ['L','R']){
      const root=restoreSurfaceUV(cloneSkinned(template)),bones={},bind={},remove=[];root.updateMatrixWorld(true);
      root.traverse(o=>{if(o.isBone){bones[o.name]=o;bind[o.name]=o.quaternion.clone();}});
      const wrist=bones[side+'_Hand'];if(!wrist)continue;
      const wristP=wrist.getWorldPosition(new THREE.Vector3()),wristQ=wrist.getWorldQuaternion(new THREE.Quaternion());
      let triangles=0;
      root.traverse(mesh=>{
        if(!mesh.isMesh)return;
        if(!mesh.isSkinnedMesh||!/body/.test(mesh.name)){remove.push(mesh);return;}
        const g=mesh.geometry,indices=[],allowed=new Set();
        mesh.skeleton.bones.forEach((b,j)=>{if(b.name===side+'_Hand'||new RegExp('^'+side+'_(Thumb|Index|Mid|Ring|Pinky)[1-3]$').test(b.name))allowed.add(j);});
        const weight=i=>{let w=0;for(let j=0;j<4;j++)if(allowed.has(g.attributes.skinIndex.array[i*4+j]))w+=g.attributes.skinWeight.array[i*4+j];return w;};
        for(let j=0;j<g.index.count;j+=3){const a=g.index.array[j],b=g.index.array[j+1],c=g.index.array[j+2];if(Math.min(weight(a),weight(b),weight(c))>.75)indices.push(a,b,c);}
        if(!indices.length){remove.push(mesh);return;}
        mesh.geometry=g.clone();mesh.geometry.setIndex(indices);mesh.geometry.morphAttributes={};mesh.geometry.clearGroups();
        repairArmRestData(mesh.geometry.attributes.position.array,mesh.geometry.attributes.normal.array,mesh.geometry.attributes.skinIndex.array,mesh.geometry.attributes.skinWeight.array,mesh.skeleton.bones.map(b=>b.name));
        mesh.morphTargetInfluences=undefined;mesh.morphTargetDictionary=undefined;
        mesh.material=mesh.material.clone();mesh.material.onBeforeCompile=()=>{};mesh.material.customProgramCacheKey=()=> 'mira-player-hand-r5';
        mesh.material.roughness=.76;mesh.material.roughnessMap=null;mesh.material.envMapIntensity=.35;mesh.material.metalness=0;mesh.material.aoMap=null;mesh.material.normalScale?.setScalar(.10);
        mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;mesh.geometry.computeVertexNormals();triangles+=indices.length/3;
      });
      remove.forEach(o=>o.removeFromParent());
      const palmSign=side==='L'?-1:1;
      const canonical=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,palmSign,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(-palmSign,0,0)));
      root.quaternion.copy(canonical).multiply(wristQ.invert());root.position.copy(wristP).applyQuaternion(root.quaternion).negate().add(new THREE.Vector3(0,-.008,-.014));
      root.visible=false;this.hands[i].add(root);this.hands[i].userData.rigs[side]={root,bones,bind,triangles};
    }
  }
  palmPos(i,out=new THREE.Vector3()){return this.grip[i].localToWorld(out.set(0,-.012,-.05));}
  tick(dt,actors){
    this.colliders.length=0;this.haptics.advance(dt);
    for(let i=0;i<2;i++){
      const h=this.hands[i];h.visible=this.renderer.xr.isPresenting&&this.active[i]&&this.grip[i].visible;
      if(!h.visible){this.prevReady[i]=false;this.vel[i].set(0,0,0);continue;}
      const side=this.handedness[i]==='left'?'L':'R',rig=h.userData.rigs[side];h.userData.fallback.visible=!rig;
      for(const [s,r] of Object.entries(h.userData.rigs))r.root.visible=s===side;
      if(rig){
        const curl=h.userData.curl=THREE.MathUtils.damp(h.userData.curl||.12,.12+this.squeeze[i]*.78,15,dt);
        for(const [f,name] of ['Index','Mid','Ring','Pinky'].entries())for(let j=1;j<=3;j++){
          const n=side+'_'+name+j,b=rig.bones[n];if(b)b.quaternion.copy(rig.bind[n]).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(j===1?-(f-1.5)*.025:0,0,(side==='L'?-1:1)*curl*[.55,1.05,.72][j-1]*(.88+f*.08))));
        }
        for(let j=1;j<=3;j++){const n=side+'_Thumb'+j,b=rig.bones[n];if(b)b.quaternion.copy(rig.bind[n]).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(j===1?.08:0,j===1?(side==='L'?.15:-.15):0,(side==='L'?-1:1)*curl*.45)));}
      }
      const p=this.palmPos(i,new THREE.Vector3()),reacted=new Set(),firstCollider=this.colliders.length;
      const report=(kind,speed,depth)=>this.haptics.contact(i,kind,speed,depth);
      const collide=(probe,r)=>{for(const actor of actors){const velocity=this.vel[i].clone(),point=probe.clone();const hit=actor.handContact?actor.handContact(point,r,velocity,!reacted.has(actor)):actor.collidePoint(point,r,velocity,true,!reacted.has(actor));if(hit){reacted.add(actor);const c=actor.lastContact;report(c?.kind||'skin',c?.speed||0,c?.depth||0);}}if(probe.y<r)report('prop',this.vel[i].length(),r-probe.y);};
      if(this.prevReady[i]&&p.distanceToSquared(this.prevPos[i])<.16){
        this.vel[i].lerp(limitVector(p.clone().sub(this.prevPos[i]).multiplyScalar(1/Math.max(dt,.001)),6),1-Math.exp(-dt*25));
        const n=Math.min(12,Math.max(1,Math.ceil(p.distanceTo(this.prevPos[i])/.025)));
        for(let k=1;k<=n;k++)collide(this.prevPos[i].clone().lerp(p,k/n),.032);
      }else this.vel[i].set(0,0,0);
      this.prevReady[i]=true;this.prevPos[i].copy(p);h.updateWorldMatrix(true,true);
      this.colliders.push({a:p.clone(),b:p.clone(),r:.035,velocity:this.vel[i],handIndex:i,onContact:report});
      if(rig){
        for(const row of ['Thumb','Index','Mid','Ring','Pinky'])for(let j=1;j<=3;j++){
          const a=rig.bones[side+'_'+row+j],b=rig.bones[side+'_'+row+(j+1)];if(a)this.colliders.push({a:a.getWorldPosition(new THREE.Vector3()),b:b?b.getWorldPosition(new THREE.Vector3()):a.localToWorld(new THREE.Vector3(0,row==='Pinky'?.013:.018,0)),r:row==='Thumb'?.01:.008,velocity:this.vel[i],handIndex:i,onContact:report});
        }
        rig.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
      }
      // Palms and every finger segment report contact, even without a grip.
      for(let j=firstCollider;j<this.colliders.length;j++){const c=this.colliders[j];collide(c.a,c.r);collide(c.b,c.r);}
    }
  }
}

export function createMiraSystem({ scene, renderer, camera, xrOn, rig }) {
  const actors = [];
  const social=new MiraSocial(actors);
  let template = null;
  let baseScale = 1;
  let ready = false;
  const parent = rig || scene;
  const noodle = new FloppyNoodle(scene);
  const hands = new PlayerHands(renderer, parent);
  let noodleHeld = null;
  let noodleGrabI = -1;
  const camPos = new THREE.Vector3();
  const holdPos = new THREE.Vector3();
  const holdQuaternion = new THREE.Quaternion();
  const blobs = [];
  const balls = [];
  let persona = "";
  let selectedActor = null;
  let uiHandlers = {};
  const yPrev = [false, false];
  let buttonSession=null;const secondaryState=new Map();
  const ballHeld = [null, null];

  function addBlob() {
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.012;
    scene.add(blob);
    blobs.push(blob);
    return blob;
  }

  function spawn(opts) {
    if (!template) return null;
    if (QUEST && actors.length >= 2) throw new Error("Quest quality limit: two actors. Reload to clear the scene.");
    const cloned = cloneSkinned(template);
    cloned.traverse((o) => {
      if (!o.isMesh) return;
      if (Array.isArray(o.material)) o.material = o.material.map((m) => m && m.clone());
      else if (o.material) o.material = o.material.clone();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) installSkinShader(m);
    });
    const version = opts?.version || "v2";
    const Actor = version === "v1" ? MiraActor : MiraActorV2;
    const actor = new Actor(cloned, baseScale, Object.assign({ personality: persona }, opts || {}));
    actor.version = version;
    const n = actors.length;
    if (!opts || !opts.position) actor.group.position.set((n % 3) * 0.85 - 0.85, 0, -((n / 3) | 0) * 0.9);
    scene.add(actor.group);
    actor.blob = addBlob();
    actors.push(actor);
    selectedActor = actor;
    exprFace(actor.want, "neutral");
    actor.tick(1 / 120, new THREE.Vector3(0, 1.55, 2.5), 0);
    return actor;
  }

  function load(onProgress, onDone, onErr) {
    maxAnisotropy = Math.min(QUEST ? 4 : 8, renderer.capabilities.getMaxAnisotropy());
    new GLTFLoader().load(
      ASSET,
      (gltf) => {
        template = gltf.scene;
        applySkin(template);
        hands.installMesh(template);
        template.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(template);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        baseScale = 1.68 / Math.max(size.y, 0.2);
        template.position.x -= center.x * baseScale;
        template.position.z -= center.z * baseScale;
        template.position.y -= box.min.y * baseScale;
        template.scale.setScalar(baseScale);
        ready = true;
        spawn({ position: new THREE.Vector3(0, 0, 0), version: "v2", faceType: 1 });
        if (onDone) onDone();
      },
      onProgress,
      onErr
    );
  }

  function spawnBall(pos, vel) {
    if (balls.length >= 8) {
      const old = balls.shift();
      if (old.held && old.held.kind === "mira" && old.held.actor) old.held.actor.heldBall = null;
      for (let i = 0; i < ballHeld.length; i++) if (ballHeld[i] === old) ballHeld[i] = null;
      scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose();
    }
    const p = (pos && pos.clone) ? pos.clone() : new THREE.Vector3(0, 1.2, -0.4);
    const b = new RubberBall(scene, p, BALL_COLORS[balls.length % BALL_COLORS.length]);
    if (vel) b.vel.copy(vel);
    balls.push(b);
    return b;
  }

  function nearestTo(pos, maxDist) {
    let best = null, bd = maxDist;
    for (const a of actors) {
      const d = Math.hypot(a.group.position.x - pos.x, a.group.position.z - pos.z);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  let environment=null,wardrobe=null;const contacts=new BodyContacts(actors);
  const commandRay=new THREE.Raycaster(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const targetMarker=new THREE.Mesh(new THREE.RingGeometry(.075,.10,32),new THREE.MeshBasicMaterial({color:0x98e4bc,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));targetMarker.rotation.x=-Math.PI/2;targetMarker.visible=false;scene.add(targetMarker);
  function floorTarget(ray){
    if(ray.direction.y>=-.025)return null;const p=ray.intersectPlane(groundPlane,new THREE.Vector3());
    return p&&ray.origin.distanceTo(p)<24&&Math.abs(p.x)<=(environment?.extent||3.8)&&Math.abs(p.z)<=(environment?.extent||3.8)?p:null;
  }
  function walkTo(point,actor=selectedActor){
    if(!actor||!point||!point.toArray().every(Number.isFinite)||Math.abs(point.x)>(environment?.extent||3.8)||Math.abs(point.z)>(environment?.extent||3.8)||actor.held||actor.balance&&actor.balance.state!=='standing')return false;
    social.cancel(actor);selectedActor=actor;
    if(environment&&actor.version==='v2')return environment.walk(actor,point);
    if(actor.walkTo)return actor.walkTo(point);
    actor.setMode('wander');actor.autoWander=true;actor.dest=point.clone().setY(0);actor.directedWalk=actor.dest.clone();actor.miraWalk=3600;return true;
  }
  function pointCommand(ray){
    commandRay.ray.copy(ray);const meshes=[];
    for(const a of actors)a.root.traverse(o=>{if(o.isSkinnedMesh&&/^body/.test(o.name)){o.computeBoundingSphere();meshes.push(o);}});
    const hit=commandRay.intersectObjects(meshes,false)[0],floor=floorTarget(ray);
    if(hit&&(!floor||hit.distance<ray.origin.distanceTo(floor))){let o=hit.object;while(o){const a=actors.find(a=>a.root===o);if(a){selectedActor=a;return 'selected';}o=o.parent;}}
    const sceneCommand=environment?.command(ray,selectedActor);if(sceneCommand)return sceneCommand;
    return floor&&walkTo(floor)?'walking':null;
  }
  function controllerFloorTarget(i){const ctrl=hands.ctrl[i],ray=new THREE.Ray(ctrl.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(0,0,-1).applyQuaternion(ctrl.getWorldQuaternion(new THREE.Quaternion())));return floorTarget(ray);}
  function trySelect(i, fromGrip = false) {
    if(!fromGrip){
      if(uiHandlers.onSelect?.(i))return;
      if(environment?.interactions?.trigger(i))return;
      const pointer=hands.ctrl[i],ray=new THREE.Ray(pointer.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(0,0,-1).applyQuaternion(pointer.getWorldQuaternion(new THREE.Quaternion())));if(wardrobe){const handle=new THREE.Object3D();if(wardrobe.begin(ray,handle,'xr'+i))return;}pointCommand(ray);return;
    }
    if(environment?.interactions?.grip(i))return;
    if (actors.some(a => a.grabs?.has(hands.grip[i]) || a.held?.ctrl === hands.grip[i])) return;
    const ctrl = hands.grip[i];
    ctrl.getWorldPosition(_v);
    let bestB = null, bdB = 0.16;
    for (const b of balls) {
      if (b.held) continue;
      const d = b.mesh.position.distanceTo(_v);
      if (d < bdB) { bdB = d; bestB = b; }
    }
    if (bestB) {
      if (bestB.held && bestB.held.kind === "mira" && bestB.held.actor) bestB.held.actor.heldBall = null;
      bestB.held = { kind: "player", ctrl, i };
      ballHeld[i] = bestB;
      return;
    }
    const ni = noodle.grabIndex(_v);
    if (ni >= 0) {
      noodleHeld = ctrl;
      noodleGrabI = ni;
      return;
    }
    let bestA = null, bestH = null, bd = 0.2;
    for (const actor of actors) {
      const hit = actor.nearestHit(_v, bd);
      if (!hit) continue;
      const d = actor.lastHitDistance;
      if (d < bd) { bd = d; bestA = actor; bestH = hit; }
    }
    if (bestA && bestH) { selectedActor = bestA; bestA.beginGrab(ctrl, bestH); }
  }
  function releaseCloth(i){if(!wardrobe?.drags.has('xr'+i))return;const c=hands.ctrl[i];wardrobe.end('xr'+i,new THREE.Ray(c.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(0,0,-1).applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion()))));}
  hands.ctrl.forEach((c,i)=>c.addEventListener('selectend',()=>releaseCloth(i)));
  function tryRelease(i) {
    environment?.interactions?.release(i);
    if (noodleHeld === hands.grip[i]) { noodleHeld = null; noodleGrabI = -1; }
    for (const actor of actors) {
      if (actor.grabs?.has(hands.grip[i])) actor.endGrab(hands.grip[i]);
      else if (actor.held && actor.held.ctrl === hands.grip[i]) actor.endGrab();
    }
    const b = ballHeld[i];
    if (b && b.held && b.held.kind === "player" && b.held.i === i) {
      limitVector(b.vel.copy(hands.vel[i]), 6);
      b.held = null;
      ballHeld[i] = null;
    }
  }
  hands.ctrl[0].addEventListener("selectstart", () => trySelect(0));
  hands.ctrl[1].addEventListener("selectstart", () => trySelect(1));
  for (let i = 0; i < 2; i++) {
    hands.ctrl[i].addEventListener("disconnected", () => tryRelease(i));
    hands.ctrl[i].addEventListener("squeezestart", () => { if (!uiHandlers.isOpen?.()) trySelect(i,true); });
    hands.ctrl[i].addEventListener("squeezeend", () => tryRelease(i));
  }

  function pollSpawnBalls(keys) {
    if (!xrOn()) {
      buttonSession=null;secondaryState.clear();
      if (keys && keys.KeyB && !yPrev[0]) {
        camera.getWorldPosition(_v);
        camera.getWorldDirection(_w);
        spawnBall(_v.clone().addScaledVector(_w, 0.55).setY(Math.max(1.05, _v.y - 0.1)), _w.clone().multiplyScalar(2.2).setY(1.1));
      }
      yPrev[0] = !!(keys && keys.KeyB);
      return;
    }
    const session = renderer.xr.getSession();
    if (!session) return;
    if(session!==buttonSession){buttonSession=session;secondaryState.clear();}
    const present=new Set();
    for(const src of session.inputSources){
      if(!src.gamepad||src.hand||!['left','right'].includes(src.handedness))continue;
      present.add(src);const pressed=!!src.gamepad.buttons?.[5]?.pressed;
      if(pressed&&!secondaryState.get(src)){
        if(src.handedness==='left')uiHandlers.onToggle?.();
        else{
          const index=hands.handedness.indexOf('right'),i=index<0?1:index,ctrl=hands.grip[i];
          ctrl.getWorldPosition(_v);_w.set(0,.15,-.35).applyQuaternion(ctrl.getWorldQuaternion(_q));
          spawnBall(_v.clone().add(_w),hands.vel[i].clone().multiplyScalar(.4).setY(1.15));
        }
      }
      secondaryState.set(src,pressed);
    }
    for(const src of secondaryState.keys())if(!present.has(src))secondaryState.delete(src);
  }

  function tickSocial(dt) {
    const TALK = 1.28;
    const SENSE = 3.35;
    for (const a of actors) {
      if(a.version==="v2")continue;
      a.socialT = (a.socialT || 0) - dt;
      if (!a.autoWander || a.directedWalk || (a.balance && a.balance.state !== "standing") || a.held || a.heldBall || a.mode === "jumpingJacks" || a.mode === "airSquats" || a.mode === "stretch") {
        if (a.mode !== "talk") a.lookAtPos = null;
        continue;
      }
      if (a.socialT > 0 && a.mode !== "talk") { a.lookAtPos = null; continue; }
      let best = null, bd = SENSE;
      const ap = a.group.position;
      const pd = Math.hypot(camPos.x - ap.x, camPos.z - ap.z);
      if (pd < bd) { bd = pd; best = { kind: "player", x: camPos.x, y: camPos.y, z: camPos.z, dist: pd }; }
      for (const o of actors) {
        if (o === a) continue;
        const d = Math.hypot(o.group.position.x - ap.x, o.group.position.z - ap.z);
        if (d < bd) { bd = d; best = { kind: "mira", actor: o, x: o.group.position.x, y: 1.52, z: o.group.position.z, dist: d }; }
      }
      if (!best) {
        if (a.mode === "talk") a.setMode("wander");
        a.lookAtPos = null;
        continue;
      }
      const look = new THREE.Vector3(best.x, best.kind === "player" ? camPos.y : 1.52, best.z);
      if (best.dist > TALK + 0.18) {
        if (a.mode === "talk") a.setMode("wander");
        a.lookAtPos = look;
        const dx = best.x - ap.x, dz = best.z - ap.z;
        const len = Math.hypot(dx, dz) || 1;
        const stop = TALK;
        a.dest = new THREE.Vector3(ap.x + (dx / len) * (len - stop), 0, ap.z + (dz / len) * (len - stop));
        a.miraWalk = Math.max(a.miraWalk, 1.4);
      } else {
        a.setMode("talk");
        a.lookAtPos = look;
        a.dest = null;
        a.talkT += dt;
        if (best.kind === "mira") {
          best.actor.setMode("talk");
          best.actor.lookAtPos = new THREE.Vector3(ap.x, 1.52, ap.z);
          best.actor.dest = null;
        }
        if (a.talkT > 4.5 + Math.random() * 4) {
          a.talkT = 0;
          a.setMode("wander");
          a.socialT = 5 + Math.random() * 7;
          a.lookAtPos = null;
        }
      }
    }
  }

  function tickBalls(dt) {
    const g = 9.81;
    for (const b of balls) {
      if (b.held && b.held.kind === "player") {
        b.held.ctrl.getWorldPosition(_v);
        b.held.ctrl.getWorldQuaternion(_q);
        _w.set(0, -0.02, -0.09).applyQuaternion(_q);
        b.mesh.position.copy(_v).add(_w);
        b.vel.copy(hands.vel[b.held.i] || _w.set(0, 0, 0));
        continue;
      }
      if (b.held && b.held.kind === "mira") {
        const a = b.held.actor;
        const hand = a.bones[b.held.hand] || a.bones.R_Hand;
        if (hand) {
          hand.getWorldPosition(_v);
          b.mesh.position.copy(_v);
          b.mesh.position.y += 0.03;
        }
        if (a.ballCool <= 0) {
          _n.set(camPos.x, 1.25, camPos.z);
          for (const o of actors) {
            if (o !== a) {
              _n.set(o.group.position.x, 1.38, o.group.position.z);
              break;
            }
          }
          _n.sub(b.mesh.position);
          const len = _n.length() || 1;
          _n.multiplyScalar(1 / len);
          _n.y += 0.38;
          b.vel.copy(_n).multiplyScalar(3.2 + Math.random() * 1.1);
          b.held = null;
          a.heldBall = null;
          a.throwN = (a.throwN || 0) + 1;
          if (a.throwN >= 3 + ((Math.random() * 4) | 0) || Math.random() < 0.2) {
            a.ballCool = 7 + Math.random() * 8;
            a.throwN = 0;
          } else a.ballCool = 0.35 + Math.random() * 0.25;
        }
        continue;
      }
      limitVector(b.vel, 6);
      b.vel.y -= g * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      if (b.mesh.position.y < b.rad) {
        b.mesh.position.y = b.rad;
        if (b.vel.y < 0) b.vel.y = -b.vel.y * 0.74;
        b.vel.x *= Math.exp(-dt * 3.5);
        b.vel.z *= Math.exp(-dt * 3.5);
        if (Math.abs(b.vel.y) < 0.35) b.vel.y = 0;
      }
      b.mesh.position.x = THREE.MathUtils.clamp(b.mesh.position.x, -4.2, 4.2);
      b.mesh.position.z = THREE.MathUtils.clamp(b.mesh.position.z, -4.2, 4.2);
      for (const a of actors) {
        a.collidePoint(b.mesh.position, b.rad, b.vel, false);
        if (a.heldBall || a.directedWalk || a.socialPair || a.ballCool > 1.2) continue;
        const hand = a.bones.R_Hand;
        if (!hand) continue;
        hand.getWorldPosition(_w);
        const d = b.mesh.position.distanceTo(_w);
        _n.copy(_w).sub(b.mesh.position);
        const closing = _n.lengthSq() > 1e-6 ? b.vel.dot(_n.normalize()) : 0;
        if (d < 0.22 && (closing > 0.35 || d < 0.11)) {
          b.held = { kind: "mira", actor: a, hand: "R_Hand" };
          a.heldBall = b;
          a.ballCool = 0.3 + Math.random() * 0.35;
          a.dest = null;
        }
      }
    }
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], c = balls[j];
        if (a.held || c.held) continue;
        _n.copy(c.mesh.position).sub(a.mesh.position);
        const d = _n.length();
        const min = a.rad + c.rad;
        if (d < min && d > 1e-5) {
          _n.multiplyScalar(1 / d);
          const push = (min - d) * 0.5;
          a.mesh.position.addScaledVector(_n, -push);
          c.mesh.position.addScaledVector(_n, push);
          const rel = c.vel.clone().sub(a.vel).dot(_n);
          if (rel < 0) {
            a.vel.addScaledVector(_n, rel);
            c.vel.addScaledVector(_n, -rel);
          }
        }
      }
    }
    for (const a of actors) {
      if (a.heldBall || a.held || a.mode === "jumpingJacks" || a.mode === "airSquats" || a.mode === "stretch" || a.ballCool > 2) continue;
      let best = null, bd = 1.85;
      if(a.directedWalk||a.socialPair)continue;
      for (const b of balls) {
        if (b.held) continue;
        const d = a.group.position.distanceTo(b.mesh.position);
        if (d < bd) { bd = d; best = b; }
      }
      if (!best) continue;
      if (bd > 0.42) {
        a.dest = best.mesh.position.clone();
        a.dest.y = 0;
        a.miraWalk = Math.max(a.miraWalk, 1.2);
      } else if (best.mesh.position.y < 0.38) {
        best.held = { kind: "mira", actor: a, hand: "R_Hand" };
        a.heldBall = best;
        a.ballCool = 0.28;
      }
    }
  }

  let physicsAccumulator = 0;
  function resetPhysics() {
    physicsAccumulator = 0;
    for (let i = 0; i < 2; i++) { tryRelease(i); hands.prevReady[i] = false; hands.vel[i].set(0, 0, 0); }
    for (const a of actors) a.resetPhysics();
    for (let i = 0; i < noodle.n; i++) noodle.prev[i].copy(noodle.pts[i]);
    for (const b of balls) b.vel.set(0, 0, 0);
  }
  function tick(dt, tAbs, keys) {
    const cam = xrOn() ? renderer.xr.getCamera() : camera;
    cam.getWorldPosition(camPos);
    pollSpawnBalls(keys);
    let hold = null, hq = null;
    if (noodleHeld && noodleHeld !== "desk") {
      noodleHeld.getWorldPosition(holdPos);
      noodleHeld.getWorldQuaternion(holdQuaternion);
      hold = holdPos;
      hq = holdQuaternion;
    } else if (!xrOn() && keys && keys.KeyF && !ballHeld[0]) {
      camera.getWorldPosition(_v);
      camera.getWorldDirection(_w);
      holdPos.copy(_v).addScaledVector(_w, 0.7);
      hq = camera.quaternion;
      hold = holdPos;
      noodleHeld = "desk";
      noodleGrabI = 0;
    } else if (noodleHeld === "desk") { noodleHeld = null; noodleGrabI = -1; }
    for(const a of actors)environment?.before(a);
    social.tick(dt);tickSocial(dt);
    hands.tick(dt, actors);
    for (let i = 0; i < actors.length; i++) {
      if(actors[i].version==="v2"){actors[i].externalHands=hands.colliders;actors[i].neighbors=actors;}
      actors[i].tick(dt, camPos, tAbs);
      if(actors[i].version==="v2")environment?.after(actors[i],dt);
      if (blobs[i]) {
        blobs[i].scale.setScalar(actors[i].shape.height);
        blobs[i].position.x = actors[i].group.position.x;
        blobs[i].position.z = actors[i].group.position.z;
      }
    }
    environment?.interactions?.restraints?.solve(dt);
    social.resolveContacts();contacts.tick();
    for(const a of actors)if(a.version==='v1'&&a.directedWalk&&!a.dest){a.directedWalk=null;a.autoWander=false;a.setMode('idle');}
    const goal=selectedActor?.directedWalk;targetMarker.visible=!!goal&&!uiHandlers.isOpen?.();if(goal)targetMarker.position.set(goal.x,.016,goal.z);
    for(let i=0;i<2;i++)if(wardrobe?.drags.has('xr'+i)){const c=hands.ctrl[i];wardrobe.move('xr'+i,new THREE.Ray(c.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(0,0,-1).applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion()))));}
    wardrobe?.tick(dt);environment?.tick(dt);
    hands.haptics.flush(hands.handedness);
    physicsAccumulator = Math.min(physicsAccumulator + dt, 0.05);
    while (physicsAccumulator + 1e-9 >= 1 / 120) {
      noodle.tick(1 / 120, actors, camPos, hold, hq, noodleGrabI);
      tickBalls(1 / 120);
      physicsAccumulator -= 1 / 120;
    }
  }

  return {
    resetPhysics, load, spawn, tick, spawnBall, nearestTo, actors, noodle, hands, balls, social, walkTo, pointCommand, floorTarget, controllerFloorTarget, contacts,
    setEnvironment(value){environment=value;},setWardrobe(value){wardrobe=value;},
    requestSocial(kind){return social.request(selectedActor,kind);},
    get persona() { return persona; },
    set persona(v) { persona = v || ""; },
    get ready() { return ready; },
    get selected() { return selectedActor || actors[actors.length - 1] || null; },
    select(actor) { if(actors.includes(actor)) selectedActor=actor; return selectedActor; },
    setUIHandlers(handlers) { uiHandlers=handlers||{}; },
    remove(actor) {
      const i=actors.indexOf(actor);if(i<0)return;
      social.cancel(actor);actor.endGrab();scene.remove(actor.group);scene.remove(blobs[i]);
      blobs[i].geometry.dispose();blobs[i].material.dispose();blobs.splice(i,1);
      if(actor.heldBall){actor.heldBall.held=null;actor.heldBall=null;}
      actor.root.traverse(o=>{if(!o.isMesh)return;if(actor.version==='v2')o.geometry.dispose();o.customDepthMaterial?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
      actors.splice(i,1);selectedActor=actors[actors.length-1]||null;
    },
  };
}
