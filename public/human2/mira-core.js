import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

export const ASSET = "/human2/assets/mira.glb?v=9";
export const TEXROOT = "/human2/assets/tex/";
export const TEXVER = "10";

export const FACE_TYPES = [
  { id: "natural", name: "Natural", file: "head.jpg" },
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
  { key: "height", label: "Height", min: 0.70, max: 1.38, step: 0.01, value: 1 },
  { key: "waist", label: "Waist", min: 0.48, max: 1.62, step: 0.01, value: 1 },
  { key: "hips", label: "Hips", min: 0.52, max: 1.75, step: 0.01, value: 1 },
  { key: "breast", label: "Breast", min: 0.38, max: 2.25, step: 0.01, value: 1 },
  { key: "butt", label: "Buttocks", min: 0.38, max: 2.25, step: 0.01, value: 1 },
  { key: "thigh", label: "Thigh", min: 0.48, max: 1.95, step: 0.01, value: 1 },
  { key: "gap", label: "Thigh gap", min: -1.6, max: 1.6, step: 0.01, value: 0 },
  { key: "arms", label: "Arms", min: 0.72, max: 1.38, step: 0.01, value: 1 },
];

const MAP_FILE = {
  Std_Skin_Head: ["head.jpg", "head_n.jpg"],
  Std_Skin_Body: ["body.jpg", "body_n.jpg"],
  Std_Skin_Arm: ["arm.jpg", "arm_n.jpg"],
  Std_Skin_Leg: ["leg.jpg", "leg_n.jpg"],
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
  { stride: 0.28, knee: 0.48, hipYaw: 0.04, arm: 0.22, bob: 0.01, sway: 0.024, freq: 5.1 },
  { stride: 0.34, knee: 0.58, hipYaw: 0.028, arm: 0.28, bob: 0.014, sway: 0.018, freq: 5.6 },
];
const BODY_HIT = [
  { name: "Head", rad: 0.13, kind: "head" },
  { name: "NeckTwist02", rad: 0.09, kind: "head" },
  { name: "Spine02", rad: 0.17, kind: "chest" },
  { name: "Spine01", rad: 0.15, kind: "belly" },
  { name: "L_Breast", rad: 0.135, kind: "breast" },
  { name: "R_Breast", rad: 0.135, kind: "breast" },
  { name: "Hip", rad: 0.16, kind: "hip" },
  { name: "L_Glute", rad: 0.13, kind: "glute" },
  { name: "R_Glute", rad: 0.13, kind: "glute" },
  { name: "L_Thigh", rad: 0.11, kind: "thigh" },
  { name: "R_Thigh", rad: 0.11, kind: "thigh" },
  { name: "L_Upperarm", rad: 0.075, kind: "arm" },
  { name: "R_Upperarm", rad: 0.075, kind: "arm" },
  { name: "L_Hand", rad: 0.06, kind: "hand" },
  { name: "R_Hand", rad: 0.06, kind: "hand" },
];

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _w2 = new THREE.Vector3();
const _n = new THREE.Vector3();
const texLoader = new THREE.TextureLoader();
const texCache = {};

function loadMap(file, srgb) {
  if (!file) return null;
  const key = file + (srgb ? "s" : "l");
  if (texCache[key]) return texCache[key];
  const t = texLoader.load(TEXROOT + file + "?v=" + TEXVER, undefined, undefined, (err) => console.warn("tex fail", file, err));
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  t.flipY = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 16;
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
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m && /cornea/i.test(m.name || ""))) o.visible = false;
    for (const m of mats) {
      if (!m) continue;
      const hair = isHairMat(m, o);
      const lash = isLashMat(m, o);
      const spec = mapSpec(m, o);
      if (spec) {
        m.map = loadMap(spec[0], true);
        if (spec[1]) {
          m.normalMap = loadMap(spec[1], false);
          m.normalScale.set(1.08, 1.08);
        }
      }
      if (m.map) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.flipY = false;
        m.map.anisotropy = 16;
        m.map.needsUpdate = true;
      }
      if (m.normalMap) {
        m.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
        m.normalMap.flipY = false;
        m.normalMap.anisotropy = 16;
        m.normalMap.needsUpdate = true;
      }
      m.metalness = 0;
      m.color.set(0xffffff);
      m.roughness = hair ? 0.38 : (lash ? 0.55 : (/eye/i.test(m.name || "") ? 0.18 : 0.72));
      m.side = hair || lash ? THREE.DoubleSide : THREE.FrontSide;
      m.transparent = false;
      m.depthWrite = true;
      m.alphaTest = 0;
      if (hair) m.alphaTest = QUEST ? 0.32 : 0.26;
      if (lash) m.alphaTest = 0.35;
      m.envMapIntensity = hair ? 0.35 : 0.18;
      m.needsUpdate = true;
      if (hair) hairMeshes.push(o);
    }
    o.frustumCulled = false;
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
  }
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
    this.shape = { height: 1, waist: 1, hips: 1, breast: 1, butt: 1, thigh: 1, gap: 0, arms: 1 };
    if (opts && opts.shape) Object.assign(this.shape, opts.shape);
    this.faceType = (opts && opts.faceType) || 0;
    this.hairColor = (opts && opts.hairColor) || 0;
    this.want = Object.fromEntries(MORPH.map((n) => [n, 0]));
    this.cur = { ...this.want };
    this.walkT = Math.random() * 4;
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
      { name: "L_Thigh", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kind: "thigh" },
      { name: "R_Thigh", x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kind: "thigh" },
    ];
    this.held = null;
    this.heldVel = new THREE.Vector3();
    this.idleKind = "rest";
    this.idleT = 2 + Math.random() * 2;
    this.idleDur = 2.4;
    this.gQuat = new THREE.Quaternion();
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
      b.quaternion.copy(q0).multiply(_q);
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
    this.blinkT -= dt;
    if (this.blinkHold > 0) {
      this.blinkHold -= dt;
      this.want.Eye_Blink_L = this.want.Eye_Blink_R = 1;
      if (this.blinkHold <= 0) this.want.Eye_Blink_L = this.want.Eye_Blink_R = 0;
    } else if (this.blinkT <= 0) {
      this.blinkHold = 0.09;
      this.blinkT = 2.2 + Math.random() * 3.2;
    }
    if (this.hitReact.exprT > 0) { this.hitReact.exprT -= dt; return; }
    this.exprT -= dt;
    if (this.exprT <= 0) {
      this.exprT = 5 + Math.random() * 5;
      exprFace(this.want, EXPR_CYCLE[(Math.random() * EXPR_CYCLE.length) | 0]);
    }
  }
  tickRest() {
    this.addE("L_Upperarm", 0, 0, -0.95);
    this.addE("R_Upperarm", 0, 0, 0.95);
    this.addE("L_Forearm", 0.22, 0, 0);
    this.addE("R_Forearm", 0.22, 0, 0);
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
    if (!moving) return;
    const g = GAIT[this.gait];
    const t = this.walkT;
    const swing = Math.sin(t) * g.stride;
    const liftL = Math.max(0, Math.sin(t));
    const liftR = Math.max(0, -Math.sin(t));
    this.addE("L_Thigh", swing, 0, 0);
    this.addE("R_Thigh", -swing, 0, 0);
    this.addE("L_Calf", -liftL * g.knee, 0, 0);
    this.addE("R_Calf", -liftR * g.knee, 0, 0);
    this.addE("L_Foot", -Math.sin(t + 0.4) * 0.08, 0, 0);
    this.addE("R_Foot", -Math.sin(t + Math.PI + 0.4) * 0.08, 0, 0);
    this.addE("L_Upperarm", swing * 0.42, 0, 0);
    this.addE("R_Upperarm", -swing * 0.42, 0, 0);
    this.addE("L_Forearm", -liftR * 0.28, 0, 0);
    this.addE("R_Forearm", -liftL * 0.28, 0, 0);
    this.addE("Hip", Math.sin(t * 2) * g.bob, Math.sin(t) * g.sway, Math.sin(t) * g.hipYaw);
    this.addE("Spine02", 0, Math.sin(t) * -0.04, 0);
    this.addE("Spine01", Math.sin(t * 2) * 0.012, 0, 0);
  }
  tickIdle(t, dt) {
    this.addE("Hip", 0, Math.sin(t * 0.65) * 0.018, Math.sin(t * 0.5) * 0.012);
    this.addE("L_Clavicle", Math.sin(t * 0.8) * 0.02, 0, Math.sin(t * 0.9) * 0.015);
    this.addE("R_Clavicle", Math.sin(t * 0.8 + 0.7) * 0.02, 0, Math.sin(t * 0.9 + 1) * 0.015);
    this.idleT -= dt;
    if (this.idleT <= 0) {
      const kinds = ["rest", "rest", "hairL", "hairR", "stretch", "hipShift", "lookHand"];
      this.idleKind = kinds[(Math.random() * kinds.length) | 0];
      this.idleDur = this.idleKind === "rest" ? 2.2 + Math.random() * 2 : 1.6 + Math.random() * 1.1;
      this.idleT = this.idleDur;
    }
    const u = 1 - Math.max(0, this.idleT) / Math.max(0.2, this.idleDur);
    const k = Math.sin(Math.min(1, u) * Math.PI);
    if (this.idleKind === "hairL") {
      this.addE("L_Upperarm", -0.85 * k, 0.15 * k, 0.55 * k);
      this.addE("L_Forearm", 0.9 * k, 0, 0.25 * k);
      this.addE("Head", 0.08 * k, 0.18 * k, 0);
    } else if (this.idleKind === "hairR") {
      this.addE("R_Upperarm", -0.85 * k, -0.15 * k, -0.55 * k);
      this.addE("R_Forearm", 0.9 * k, 0, -0.25 * k);
      this.addE("Head", 0.08 * k, -0.18 * k, 0);
    } else if (this.idleKind === "stretch") {
      this.addE("L_Upperarm", -0.55 * k, 0, 0.35 * k);
      this.addE("R_Upperarm", -0.55 * k, 0, -0.35 * k);
      this.addE("Spine02", -0.08 * k, 0, 0);
    } else if (this.idleKind === "hipShift") {
      this.addE("Hip", 0, 0.12 * k, 0.08 * k);
      this.addE("L_Thigh", 0.06 * k, 0, 0);
    } else if (this.idleKind === "lookHand") {
      this.addE("R_Upperarm", 0.45 * k, 0, -0.2 * k);
      this.addE("R_Forearm", 0.4 * k, 0, 0);
      this.addE("Head", 0.22 * k, -0.12 * k, 0);
    }
  }
  tickSoft(dt, moving) {
    const hip = this.bones.Hip;
    if (hip) hip.getWorldPosition(_w);
    let ax = 0, ay = 0, az = 0;
    if (hip && this.hipReady) {
      const inv = 1 / Math.max(dt, 1 / 120);
      ax = (_w.x - this.prevHip.x) * inv;
      ay = (_w.y - this.prevHip.y) * inv;
      az = (_w.z - this.prevHip.z) * inv;
    }
    if (hip) { this.prevHip.copy(_w); this.hipReady = true; }
    const b = Math.max(0.4, this.shape.breast);
    const g = Math.max(0.4, this.shape.butt);
    const th = Math.max(0.4, this.shape.thigh);
    const drive = moving ? 1 : 0.28;
    const step = Math.min(dt, 1 / 50);
    const visc = {
      breast: { stiff: 11.5, damp: 7.4, max: 0.22, mass: b, posK: 0.028, restY: -0.16 },
      glute: { stiff: 16, damp: 10.5, max: 0.14, mass: g, posK: 0.016, restY: -0.05 },
      thigh: { stiff: 22, damp: 13, max: 0.08, mass: th, posK: 0.01, restY: 0 },
    };
    for (const s of this.soft) {
      const bone = this.bones[s.name];
      if (!bone || !this.bindQ[s.name]) continue;
      const p = visc[s.kind] || visc.glute;
      const mass = p.mass;
      const stiff = p.stiff / Math.pow(mass, 0.35);
      const damp = p.damp * Math.sqrt(mass);
      const max = p.max * mass + 0.1;
      bone.getWorldQuaternion(this.gQuat);
      this.gQuat.invert();
      _n.set(0, -1, 0).applyQuaternion(this.gQuat);
      const grav = 6.8 * mass;
      const bounce = Math.sin(this.walkT * 2) * (s.kind === "breast" ? 0.85 : 0.35) * drive;
      const accX = -ax * 0.45 * drive + _n.x * grav + bounce * 0.15;
      const accY = -ay * 0.45 * drive + _n.y * grav + bounce * 0.2;
      const accZ = -az * 0.45 * drive + _n.z * grav + bounce;
      if (this.held && this.held.spring === s) {
        s.x = THREE.MathUtils.damp(s.x, this.held.tx, 10, dt);
        s.y = THREE.MathUtils.damp(s.y, this.held.ty, 10, dt);
        s.z = THREE.MathUtils.damp(s.z, this.held.tz, 10, dt);
        s.vx = 0; s.vy = 0; s.vz = 0;
      } else {
        const rx = 0, ry = p.restY * mass, rz = 0;
        s.vx += (accX - (s.x - rx) * stiff - s.vx * damp) * step;
        s.vy += (accY - (s.y - ry) * stiff - s.vy * damp) * step;
        s.vz += (accZ - (s.z - rz) * stiff - s.vz * damp) * step;
        s.x = THREE.MathUtils.clamp(s.x + s.vx * step, -max, max);
        s.y = THREE.MathUtils.clamp(s.y + s.vy * step, -max, max * 0.35);
        s.z = THREE.MathUtils.clamp(s.z + s.vz * step, -max * 0.55, max * 0.55);
        s.vx *= 0.995;
        s.vz *= 0.995;
      }
      this.addE(s.name, s.z * 0.45, s.y * 0.25, s.x * 0.45);
      if (this.bindPos[s.name] && s.kind !== "thigh") {
        const k = p.posK * mass;
        bone.position.x = this.bindPos[s.name].x + s.x * k;
        bone.position.y = this.bindPos[s.name].y + s.y * k;
        bone.position.z = this.bindPos[s.name].z + s.z * k;
      }
    }
  }
  tickGaze(dt, moving, camPos) {
    const dx = camPos.x - this.group.position.x;
    const dz = camPos.z - this.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05 && this.hitReact.lookT <= 0) return;
    const yawWorld = Math.atan2(dx, dz);
    if (!moving && this.hitReact.lookT <= 0) this.group.rotation.y = THREE.MathUtils.damp(this.group.rotation.y, yawWorld, 3.2, dt);
    let yaw = THREE.MathUtils.clamp(wrapPi(yawWorld - this.group.rotation.y), -0.55, 0.55);
    let pitch = THREE.MathUtils.clamp((camPos.y - 1.48) * 0.18, -0.22, 0.22);
    if (this.hitReact.lookT > 0) {
      const k = Math.min(1, this.hitReact.lookT * 2.4);
      yaw = THREE.MathUtils.lerp(yaw, this.hitReact.lookYaw, k);
      pitch = THREE.MathUtils.lerp(pitch, this.hitReact.lookPitch, k);
    }
    this.want.Eye_L_Look_L = this.want.Eye_R_Look_L = Math.max(0, -yaw) * 1.35;
    this.want.Eye_L_Look_R = this.want.Eye_R_Look_R = Math.max(0, yaw) * 1.35;
    this.addE("Head", pitch * 0.4 + this.hitReact.headKickX, yaw * 0.32 + this.hitReact.headKickY, 0);
    this.addE("NeckTwist02", pitch * 0.14, yaw * 0.12, 0);
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
    const jx = nrm.x * mag * 1.6;
    const jy = nrm.y * mag * 1.1;
    const jz = nrm.z * mag * 1.6;
    for (const s of this.soft) {
      let wgt = 0;
      if (s.name === hit.name) wgt = 1;
      else if (hit.kind === "chest" && s.kind === "breast") wgt = 0.95;
      else if (hit.kind === "breast" && s.kind === "breast") wgt = s.name[0] === hit.name[0] ? 1 : 0.55;
      else if (hit.kind === "belly" && s.kind === "breast") wgt = 0.5;
      else if (hit.kind === "hip" && s.kind === "glute") wgt = 0.85;
      else if (hit.kind === "glute" && s.kind === "glute") wgt = s.name[0] === hit.name[0] ? 1 : 0.48;
      if (wgt > 0) { s.vx += jx * wgt; s.vy += jy * wgt; s.vz += jz * wgt; }
    }
    _w.subVectors(pos, this.group.position);
    let lookYaw = wrapPi(Math.atan2(_w.x, _w.z) - this.group.rotation.y);
    if (hit.kind === "head" && mag > 0.7) lookYaw = -lookYaw * 0.45;
    this.hitReact.lookYaw = THREE.MathUtils.clamp(lookYaw * Math.min(1.1, mag * 0.75), -0.75, 0.75);
    this.hitReact.lookPitch = THREE.MathUtils.clamp(-nrm.y * mag * 0.28, -0.4, 0.32);
    this.hitReact.lookT = 0.28 + Math.min(0.35, mag * 0.12);
    if (hit.kind === "head" || hit.kind === "chest" || hit.kind === "belly") {
      this.hitReact.flinchX += THREE.MathUtils.clamp(-nrm.z * mag * 0.05, -0.07, 0.07);
    }
    this.hitReact.knockX += nrm.x * mag * 0.02;
    this.hitReact.knockZ += nrm.z * mag * 0.02;
    if (mag > 0.45) { this.hitReact.exprT = 0.4; exprFace(this.want, mag > 1.1 ? "angry" : "surprise"); }
  }
  collidePoint(pos, rad, vel, foam) {
    let hitAny = false;
    for (const hit of BODY_HIT) {
      const bone = this.bones[hit.name];
      if (!bone) continue;
      bone.getWorldPosition(_w);
      const scale = hit.kind === "breast" ? this.shape.breast : (hit.kind === "glute" ? this.shape.butt : 1);
      const min = hit.rad * (0.95 + 0.22 * scale) * this.shape.height + rad;
      const d = pos.distanceTo(_w);
      if (d >= min || d < 1e-5) continue;
      _n.subVectors(pos, _w).multiplyScalar(1 / d);
      const push = min - d;
      pos.addScaledVector(_n, push);
      const closing = vel ? -vel.dot(_n) : 0;
      if (vel) {
        const bounce = foam ? 0.08 : 0.35;
        vel.addScaledVector(_n, Math.max(closing, 0) * (1 + bounce) + push * (foam ? 2 : 8));
        vel.multiplyScalar(foam ? 0.72 : 0.9);
      }
      if (closing > 0.22) this.applyStrike(hit, _n, closing, vel ? vel.length() * 0.15 : 0, _w);
      else {
        for (const s of this.soft) {
          if (s.name !== hit.name && !(hit.kind === "chest" && s.kind === "breast") && !(hit.kind === "hip" && s.kind === "glute")) continue;
          s.vx += _n.x * push * 8;
          s.vy += _n.y * push * 6;
          s.vz += _n.z * push * 8;
        }
      }
      hitAny = true;
    }
    return hitAny;
  }
  nearestHit(worldPos, maxDist) {
    let best = null, bd = maxDist;
    for (const hit of BODY_HIT) {
      const bone = this.bones[hit.name];
      if (!bone) continue;
      bone.getWorldPosition(_w);
      const scale = hit.kind === "breast" ? this.shape.breast : (hit.kind === "glute" ? this.shape.butt : 1);
      const d = worldPos.distanceTo(_w) - hit.rad * scale * 0.5;
      if (d < bd) { bd = d; best = hit; }
    }
    return best;
  }
  beginGrab(ctrl, hit) {
    const bone = this.bones[hit.name];
    if (!bone) return;
    this.held = {
      ctrl, hit,
      spring: this.soft.find((s) => s.name === hit.name) || null,
      tx: 0, ty: 0, tz: 0,
      last: new THREE.Vector3(),
    };
    ctrl.getWorldPosition(this.held.last);
    this.miraWalk = 8;
    this.dest = null;
  }
  tickGrab(dt) {
    if (!this.held) return;
    const ctrl = this.held.ctrl;
    ctrl.getWorldPosition(_v);
    this.heldVel.copy(_v).sub(this.held.last).multiplyScalar(1 / Math.max(dt, 1 / 90));
    this.held.last.copy(_v);
    const bone = this.bones[this.held.hit.name];
    if (!bone) return;
    bone.getWorldPosition(_w);
    _n.copy(_v).sub(_w);
    if (this.held.spring) {
      this.group.getWorldQuaternion(_q);
      _q.invert();
      _w2.copy(_n).applyQuaternion(_q);
      this.held.tx = THREE.MathUtils.clamp(_w2.x * 9, -1.6, 1.6);
      this.held.ty = THREE.MathUtils.clamp(_w2.y * 7, -1.2, 1.2);
      this.held.tz = THREE.MathUtils.clamp(_w2.z * 9, -1.6, 1.6);
      this.group.position.x += _n.x * 0.12 * dt;
      this.group.position.z += _n.z * 0.12 * dt;
    } else {
      this.group.position.x += _n.x * 2.4 * dt;
      this.group.position.y = 0;
      this.group.position.z += _n.z * 2.4 * dt;
      this.hitReact.flinchX += THREE.MathUtils.clamp(-_n.z * 0.4 * dt, -0.25, 0.25);
      this.hitReact.knockX = this.heldVel.x * 0.15;
      this.hitReact.knockZ = this.heldVel.z * 0.15;
    }
  }
  endGrab() {
    if (!this.held) return;
    const v = this.heldVel;
    const mag = Math.min(4.2, v.length());
    if (this.held.spring) {
      this.held.spring.vx += v.x * 1.8;
      this.held.spring.vy += v.y * 1.2;
      this.held.spring.vz += v.z * 1.8;
    }
    this.hitReact.knockX += v.x * 0.08;
    this.hitReact.knockZ += v.z * 0.08;
    if (mag > 0.4) { this.hitReact.exprT = 0.35; exprFace(this.want, mag > 1.4 ? "surprise" : "happy"); }
    this.held = null;
  }
  wander(dt) {
    if (this.held) return false;
    this.miraWalk -= dt;
    if (this.miraWalk < 0) {
      this.miraWalk = 2.6 + Math.random() * 4.2;
      this.dest = new THREE.Vector3(this.group.position.x + (Math.random() - 0.5) * 2.4, 0, this.group.position.z + (Math.random() - 0.5) * 2.4);
      this.dest.x = THREE.MathUtils.clamp(this.dest.x, -2.4, 2.4);
      this.dest.z = THREE.MathUtils.clamp(this.dest.z, -2.4, 2.4);
    }
    if (!this.dest) return false;
    const to = this.dest.clone().sub(this.group.position);
    to.y = 0;
    if (to.length() < 0.12) return false;
    to.normalize();
    this.group.position.addScaledVector(to, dt * 0.52);
    this.group.rotation.y = THREE.MathUtils.damp(this.group.rotation.y, Math.atan2(to.x, to.z), 4, dt);
    return true;
  }
  tick(dt, camPos, tAbs) {
    const moving = this.wander(dt);
    const g = GAIT[this.gait];
    this.walkT += dt * (moving ? g.freq : 1.6);
    this.gaitSwitch -= moving ? dt : 0;
    if (this.gaitSwitch <= 0) {
      this.gait = this.gait ? 0 : 1;
      this.gaitSwitch = 2.4 + Math.random() * 2.2;
    }
    this.tickExpr(dt);
    this.restoreBind();
    this.applyShape();
    this.tickRest();
    this.addE("Spine02", Math.sin(tAbs * 1.55) * 0.026, 0, 0);
    if (moving) this.tickWalk(true);
    else this.tickIdle(tAbs, dt);
    this.tickGrab(dt);
    this.tickSoft(dt, moving);
    this.tickGaze(dt, moving, camPos);
    this.tickHitReact(dt);
    this.tickFingers(0.08);
    this.applyExtras();
    this.tickMorphs(dt);
    if (this.skeleton) this.skeleton.update();
  }
  worldPos(out) {
    this.group.getWorldPosition(out || _v);
    return out || _v;
  }
}

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
      const t = THREE.MathUtils.clamp(_v.copy(pos).sub(this.pts[i]).dot(_w) / (len * len), 0, 1);
      _n.copy(this.pts[i]).addScaledVector(_w, t);
      const d = pos.distanceTo(_n);
      if (d < bd) { bd = d; best = t < 0.5 ? i : i + 1; }
    }
    return best;
  }
  grabAt(pos) { return this.grabIndex(pos) >= 0; }
  tick(dt, actors, playerPos, holdPos, holdQuat, grabI) {
    const g = 2.15;
    const step = Math.min(dt, 1 / 50);
    const gi = (holdPos && grabI >= 0) ? grabI : -1;
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
      if (gi >= 0 && (i === gi || i === gi + 1 || i === gi - 1)) continue;
      const p = this.pts[i];
      const pr = this.prev[i];
      const vx = p.x - pr.x;
      const vy = p.y - pr.y;
      const vz = p.z - pr.z;
      pr.copy(p);
      p.x += vx * 0.84;
      p.y += vy * 0.84 - g * step * step;
      p.z += vz * 0.84;
    }
    for (let k = 0; k < 16; k++) {
      for (let i = 0; i < this.n - 1; i++) {
        const a = this.pts[i], b = this.pts[i + 1];
        _w.subVectors(b, a);
        const d = _w.length() || 1e-6;
        const diff = (d - this.rest) / d;
        const aHeld = gi >= 0 && (i === gi || i === gi + 1 || i === gi - 1);
        const bHeld = gi >= 0 && (i + 1 === gi || i + 1 === gi + 1 || i + 1 === gi - 1);
        if (aHeld && !bHeld) b.addScaledVector(_w, -diff);
        else if (bHeld && !aHeld) a.addScaledVector(_w, diff);
        else if (!aHeld && !bHeld) {
          a.addScaledVector(_w, diff * 0.5);
          b.addScaledVector(_w, -diff * 0.5);
        }
      }
      for (let i = 1; i < this.n - 1; i++) {
        if (gi >= 0 && (i === gi || i === gi + 1 || i === gi - 1)) continue;
        _w.subVectors(this.pts[i + 1], this.pts[i - 1]);
        _v.copy(this.pts[i - 1]).addScaledVector(_w, 0.5);
        this.pts[i].lerp(_v, 0.42);
      }
    }
    for (let i = 0; i < this.n; i++) {
      if (gi >= 0 && (i === gi || i === gi + 1 || i === gi - 1)) continue;
      const p = this.pts[i];
      if (p.y < this.rad) {
        p.y = this.rad;
        this.prev[i].y = p.y;
        this.prev[i].x = p.x * 0.25 + this.prev[i].x * 0.75;
        this.prev[i].z = p.z * 0.25 + this.prev[i].z * 0.75;
      }
      _v.subVectors(p, this.prev[i]);
      for (const actor of actors) actor.collidePoint(p, this.rad, _v, true);
      this.prev[i].copy(p).sub(_v);
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

class PlayerHands {
  constructor(renderer, parent) {
    this.ctrl = [renderer.xr.getController(0), renderer.xr.getController(1)];
    this.grip = [renderer.xr.getControllerGrip(0), renderer.xr.getControllerGrip(1)];
    this.squeeze = [0, 0];
    this.hands = [];
    this.handedness = ["none", "none"];
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8c4a4, roughness: 0.7 });
    for (let i = 0; i < 2; i++) {
      parent.add(this.ctrl[i]);
      parent.add(this.grip[i]);
      const h = new THREE.Group();
      // Parented to the *target ray* so -Z is always the pointing direction.
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.022, 0.08), skin);
      palm.position.set(0, -0.012, -0.05);
      h.add(palm);
      h.userData.fingers = [];
      const xs = [-0.022, -0.008, 0.008, 0.022];
      const lens = [0.032, 0.036, 0.034, 0.028];
      for (let f = 0; f < 4; f++) {
        const fg = new THREE.Group();
        fg.position.set(xs[f], -0.01, -0.09);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, lens[f]), skin);
        m.position.z = -lens[f] * 0.45;
        fg.add(m);
        h.add(fg);
        h.userData.fingers.push(fg);
      }
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.028), skin);
      thumb.position.set(0.038, -0.002, -0.04);
      thumb.rotation.y = 0.55;
      h.add(thumb);
      h.userData.thumb = thumb;
      h.userData.colliders = [palm];
      this.ctrl[i].add(h);
      this.hands.push(h);
      this.ctrl[i].addEventListener("connected", (ev) => {
        const hand = ev.data && ev.data.handedness;
        this.handedness[i] = hand || "none";
        h.scale.x = hand === "left" ? -1 : 1;
      });
      this.ctrl[i].addEventListener("squeezestart", () => { this.squeeze[i] = 1; });
      this.ctrl[i].addEventListener("squeezeend", () => { this.squeeze[i] = 0; });
    }
  }
  palmPos(i, out) {
    this.ctrl[i].getWorldPosition(out || _v);
    return out || _v;
  }
  tick(dt, actors) {
    for (let i = 0; i < 2; i++) {
      const curl = this.squeeze[i];
      const h = this.hands[i];
      for (const fg of h.userData.fingers) fg.rotation.x = curl * 0.85;
      h.userData.thumb.rotation.y = (h.scale.x < 0 ? -1 : 1) * (0.55 + curl * 0.4);
      this.ctrl[i].getWorldPosition(_v);
      _w.set(0, 0, 0);
      for (const actor of actors) actor.collidePoint(_v, 0.04, _w, true);
    }
  }
}

export function createMiraSystem({ scene, renderer, camera, xrOn, rig }) {
  const actors = [];
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
  const blobs = [];

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
    const cloned = cloneSkinned(template);
    cloned.traverse((o) => {
      if (!o.isMesh) return;
      if (Array.isArray(o.material)) o.material = o.material.map((m) => m && m.clone());
      else if (o.material) o.material = o.material.clone();
    });
    const actor = new MiraActor(cloned, baseScale, opts || {});
    const n = actors.length;
    if (!opts || !opts.position) actor.group.position.set((n % 3) * 0.85 - 0.85, 0, -((n / 3) | 0) * 0.9);
    scene.add(actor.group);
    actor.blob = addBlob();
    actors.push(actor);
    exprFace(actor.want, "happy");
    return actor;
  }

  function load(onProgress, onDone, onErr) {
    new GLTFLoader().load(
      ASSET,
      (gltf) => {
        template = gltf.scene;
        applySkin(template);
        template.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(template);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        template.position.x -= center.x;
        template.position.z -= center.z;
        template.position.y -= box.min.y;
        baseScale = 1.68 / Math.max(size.y, 0.2);
        template.scale.setScalar(baseScale);
        ready = true;
        spawn({ position: new THREE.Vector3(0, 0, 0) });
        if (onDone) onDone();
      },
      onProgress,
      onErr
    );
  }

  function trySelect(i) {
    const ctrl = hands.ctrl[i];
    ctrl.getWorldPosition(_v);
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
      const bone = actor.bones[hit.name];
      if (!bone) continue;
      bone.getWorldPosition(_w);
      const d = _v.distanceTo(_w);
      if (d < bd) { bd = d; bestA = actor; bestH = hit; }
    }
    if (bestA && bestH) bestA.beginGrab(ctrl, bestH);
  }
  function tryRelease(i) {
    if (noodleHeld === hands.ctrl[i]) { noodleHeld = null; noodleGrabI = -1; }
    for (const actor of actors) {
      if (actor.held && actor.held.ctrl === hands.ctrl[i]) actor.endGrab();
    }
  }
  hands.ctrl[0].addEventListener("selectstart", () => trySelect(0));
  hands.ctrl[1].addEventListener("selectstart", () => trySelect(1));
  hands.ctrl[0].addEventListener("selectend", () => tryRelease(0));
  hands.ctrl[1].addEventListener("selectend", () => tryRelease(1));

  function tick(dt, tAbs, keys) {
    const cam = xrOn() ? renderer.xr.getCamera() : camera;
    cam.getWorldPosition(camPos);
    let hold = null, hq = null;
    if (noodleHeld && noodleHeld !== "desk") {
      noodleHeld.getWorldPosition(holdPos);
      noodleHeld.getWorldQuaternion(_q);
      hold = holdPos;
      hq = _q;
    } else if (!xrOn() && keys && (keys.KeyF || keys.Mouse0)) {
      camera.getWorldPosition(_v);
      camera.getWorldDirection(_w);
      holdPos.copy(_v).addScaledVector(_w, 0.7);
      hq = camera.quaternion;
      hold = holdPos;
      noodleHeld = "desk";
      noodleGrabI = 0;
    } else if (noodleHeld === "desk") { noodleHeld = null; noodleGrabI = -1; }
    noodle.tick(dt, actors, camPos, hold, hq, noodleGrabI);
    hands.tick(dt, actors);
    for (let i = 0; i < actors.length; i++) {
      actors[i].tick(dt, camPos, tAbs);
      if (blobs[i]) {
        blobs[i].position.x = actors[i].group.position.x;
        blobs[i].position.z = actors[i].group.position.z;
      }
    }
  }

  return {
    load, spawn, tick, actors, noodle, hands,
    get ready() { return ready; },
    get selected() { return actors[actors.length - 1] || null; },
  };
}
