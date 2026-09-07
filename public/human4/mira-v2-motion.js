import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ASSET = new URL('./assets/soldier.glb?v=h4.67', import.meta.url).href;
const SKIP_MODES = new Set(['airSquats', 'stretch', 'jumpingJacks', 'march', 'sideSteps', 'dance', 'reach', 'heelRaises']);
const hipPos = new THREE.Vector3();
const local = new THREE.Vector3();
const target = new THREE.Vector3();
const miraHip = new THREE.Vector3();
const groupQ = new THREE.Quaternion();
const parentQ = new THREE.Quaternion();
const ikA = new THREE.Vector3();
const ikB = new THREE.Vector3();
const ikC = new THREE.Vector3();
const ikDir = new THREE.Vector3();
const ikBend = new THREE.Vector3();
const ikKnee = new THREE.Vector3();
const hipQ = new THREE.Quaternion();
let pending = null, pack = null;

function shortName(n) {
  return String(n || '').replace(/^mixamorig:?/i, '');
}
function findClip(clips, re) {
  return clips.find((c) => re.test(c.name));
}
function gatherBones(root) {
  const bones = {};
  root.traverse((o) => {
    const key = shortName(o.name);
    if (key && !bones[key]) bones[key] = o;
    if (o.isMesh) o.visible = false;
  });
  return bones;
}
function ikLeg(actor, side, footTarget) {
  const thigh = actor.bones[side + '_Thigh'], calf = actor.bones[side + '_Calf'], foot = actor.bones[side + '_Foot'];
  if (!thigh || !calf || !foot || !actor.aimBone) return;
  thigh.getWorldPosition(ikA); calf.getWorldPosition(ikB); foot.getWorldPosition(ikC);
  const upper = ikA.distanceTo(ikB), lower = ikB.distanceTo(ikC);
  ikDir.copy(footTarget).sub(ikA);
  const distance = THREE.MathUtils.clamp(ikDir.length(), Math.abs(upper - lower) + 0.001, (upper + lower) * 0.998);
  ikDir.normalize();
  ikBend.set(0, 0, 1).applyQuaternion(actor.group.quaternion);
  ikBend.addScaledVector(ikDir, -ikBend.dot(ikDir)).normalize();
  const along = (upper * upper + distance * distance - lower * lower) / (2 * distance);
  ikKnee.copy(ikA).addScaledVector(ikDir, along).addScaledVector(ikBend, Math.sqrt(Math.max(0, upper * upper - along * along)));
  actor.aimBone(thigh, calf, ikKnee);
  actor.aimBone(calf, foot, footTarget);
  const rest = actor.feet[side]?.restQ;
  if (rest && foot.parent) {
    const q = actor.group.getWorldQuaternion(hipQ).multiply(rest);
    foot.parent.getWorldQuaternion(parentQ).invert();
    foot.quaternion.copy(parentQ.multiply(q));
    foot.updateWorldMatrix(false, true);
  }
}
export function warmMixamo() {
  if (pending) return pending;
  pending = new Promise((resolve) => {
    new GLTFLoader().load(ASSET, (gltf) => {
      const clips = gltf.animations || [];
      const idleClip = findClip(clips, /idle/i);
      const walkClip = findClip(clips, /walk/i);
      if (!idleClip || !walkClip) { pack = null; resolve(false); return; }
      const root = gltf.scene;
      root.visible = false;
      const bones = gatherBones(root);
      const mixer = new THREE.AnimationMixer(root);
      const idle = mixer.clipAction(idleClip);
      const walk = mixer.clipAction(walkClip);
      idle.play(); walk.play();
      idle.setLoop(THREE.LoopRepeat, Infinity);
      walk.setLoop(THREE.LoopRepeat, Infinity);
      mixer.update(0);
      root.updateMatrixWorld(true);
      const hipBind = bones.Hips ? bones.Hips.quaternion.clone() : new THREE.Quaternion();
      pack = { root, mixer, idle, walk, bones, hipBind, idleDur: idleClip.duration || 2, walkDur: walkClip.duration || 1 };
      if (typeof location !== 'undefined' && /debug/.test(location.search)) window.mixamoPack = pack;
      resolve(true);
    }, undefined, () => { pack = null; resolve(false); });
  });
  return pending;
}
export function applyMixamo(actor, dt, moving) {
  if (!pack || actor?.version !== 'v2' || !actor.bones?.Hip) return false;
  if (actor.seat || (actor.balance && actor.balance.state !== 'standing')) return false;
  if (SKIP_MODES.has(actor.mode)) return false;
  if ([...(actor.grabs?.values?.() || [])].some((g) => g.limb === 'leg')) return false;
  const hips = pack.bones.Hips, left = pack.bones.LeftFoot, right = pack.bones.RightFoot;
  if (!hips || !left || !right) return false;
  const turning = Math.abs(actor.yawDelta || 0) > 0.025;
  const walkW = THREE.MathUtils.clamp(Math.max(actor.locomo || 0, turning ? 0.55 : 0), 0, 1);
  const w = walkW;
  pack.idle.setEffectiveWeight(1 - w);
  pack.walk.setEffectiveWeight(w);
  pack.walk.timeScale = 1;
  pack.idle.time = (actor.time || 0) % pack.idleDur;
  const cadence = THREE.MathUtils.clamp((actor.speed || 0) / 0.85, 0.62, 1.4);
  pack.walk.time = ((actor.gaitPhase || 0) / Math.PI * 0.5 * cadence) % pack.walkDur;
  pack.mixer.update(0);
  pack.root.updateMatrixWorld(true);
  hips.getWorldPosition(hipPos);
  left.getWorldPosition(ikA); right.getWorldPosition(ikB);
  if (pack.plantY == null) pack.plantY = Math.min(ikA.y, ikB.y);
  const h = actor.shape.height;
  actor.group.updateMatrixWorld(true);
  actor.group.getWorldQuaternion(groupQ);
  actor.bones.Hip.getWorldPosition(miraHip);
  const sy = miraHip.y / Math.max(0.25, hipPos.y);
  if (!actor.feet) actor.feet = {};
  for (const [side, src] of [['L', left], ['R', right]]) {
    src.getWorldPosition(local);
    const lift = Math.max(0, local.y - pack.plantY) * sy;
    local.sub(hipPos);
    target.set(local.x * sy, 0, local.z * sy).applyQuaternion(groupQ);
    target.x += miraHip.x; target.z += miraHip.z;
    target.y = (actor.baseY || 0) + 0.038 * h + lift;
    let f = actor.feet[side];
    if (!f) {
      const foot = actor.bones[side + '_Foot'];
      f = actor.feet[side] = {
        height: h, target: target.clone(), start: target.clone(), end: target.clone(),
        swing: false,
        restQ: actor.group.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(foot.getWorldQuaternion(new THREE.Quaternion())),
        local: actor.group.worldToLocal(target.clone()), ankleY: 0.035 * h
      };
    }
    f.target.copy(target);
    f.swing = false;
    ikLeg(actor, side, f.target);
  }
  actor.mixamoDrive = true;
  return true;
}
