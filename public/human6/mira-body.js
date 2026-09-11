/**
 * Mira NPC body pack — graphics + physics only.
 *
 * This is the surface Astra (and any passthrough host) should import.
 * It does not load the house, weapons, weather, cars, dogs, laundry, piano,
 * wardrobe, or voice. Those stay in engine.js.
 *
 * Usage:
 *   import {installMiraBody, enterPassthrough, startMiraBodyLoop} from './mira-body.js';
 *   const body = await installMiraBody({scene, renderer, camera, rig, xrOn});
 *   await enterPassthrough(body);
 *   startMiraBodyLoop(body);
 */
import * as THREE from 'three';
import {
  createMiraSystem, MiraActor, MiraActorV2,
  ASSET, TEXROOT, TEXVER, FACE_TYPES, HAIR_COLORS, SLIDERS
} from './mira-v2.js?v=18.0.0';
import {EMOTION_NAMES, IDLE_NAMES, WALK_NAMES, ATTENTION_MODES} from './mira-v2-features.js?v=18.0.0';
import {
  V2_EXTRA_SLIDERS, FACE_PRESETS, HAIR_STYLES, ACTIVITY_MODES, shapeSliders
} from './mira-v2-controls.js?v=18.0.0';
import {
  FaceDrive, TissueRig, SkinCrease, ContactMotion, XPBDCluster, signedVolume
} from './mira-v2-realism.js?v=18.0.0';
import {installSurfaceDamping} from './src/body/TissueRig.js';
import {blinkEnvelope} from './src/body/FaceDrive.js';
import {BOX_FACES, BOX_CORNERS, dampingRate} from './src/body/XPBDCluster.js';
import {SurfaceFlesh} from './mira-v2-tissue.js?v=18.0.0';
import {LivingEyes} from './mira-v2-eyes.js?v=18.0.0';
import {EnhanceEyes} from './mira-v2-tearline.js?v=18.0.0';
import {HairGuides, projectHairPoint} from './mira-v2-hair.js?v=18.0.0';
import {BodyContacts, BodySurface, bodyVolumes, projectVolume} from './mira-v2-contact.js?v=18.0.0';
import {ContactHaptics} from './mira-v2-haptics.js?v=18.0.0';
import {RoomLight} from './mira-v2-light.js?v=18.0.0';

export const MIRA_BODY = {
  glb: ASSET,
  texRoot: TEXROOT,
  texVer: TEXVER,
  three: '0.170.0',
  verts: 14164,
  morphs: 49,
  bones: 103,
  height: 1.68,
  files: [
    'mira-body.js',
    'mira-v2.js',
    'mira-v2-features.js',
    'mira-v2-controls.js',
    'mira-v2-realism.js',
    'mira-v2-tissue.js',
    'mira-v2-eyes.js',
    'mira-v2-tearline.js',
    'mira-v2-hair.js',
    'mira-v2-uv.js',
    'mira-v2-contact.js',
    'mira-v2-haptics.js',
    'mira-v2-social.js',
    'mira-v2-light.js',
    'src/body/FaceDrive.js',
    'src/body/TissueRig.js',
    'src/body/SkinCrease.js',
    'src/body/ContactMotion.js',
    'src/body/XPBDCluster.js',
    'assets/mira.glb',
    'assets/tex/'
  ]
};

export {
  createMiraSystem, MiraActor, MiraActorV2,
  ASSET, TEXROOT, TEXVER, FACE_TYPES, HAIR_COLORS, SLIDERS,
  EMOTION_NAMES, IDLE_NAMES, WALK_NAMES, ATTENTION_MODES,
  V2_EXTRA_SLIDERS, FACE_PRESETS, HAIR_STYLES, ACTIVITY_MODES, shapeSliders,
  FaceDrive, blinkEnvelope, TissueRig, installSurfaceDamping, SkinCrease, ContactMotion,
  XPBDCluster, signedVolume, BOX_FACES, BOX_CORNERS, dampingRate,
  SurfaceFlesh, LivingEyes, EnhanceEyes, HairGuides, projectHairPoint,
  BodyContacts, BodySurface, bodyVolumes, projectVolume, ContactHaptics, RoomLight
};
export {HUMAN5, ASTRA_RULES, briefFor, sessionPrompt} from './mira-context.js';

function faintFloor(){
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 48),
    new THREE.MeshStandardMaterial({color: 0xc4b49a, roughness: 0.92, metalness: 0, transparent: true, opacity: 1})
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.name = 'MiraBodyFloor';
  return mesh;
}

/**
 * Build a host that only has Mira: skinned CC3 body, wrapped-diffuse skin,
 * XPBD tissue, contact, eyes/hair, XR hands, and AR light estimation.
 */
export async function installMiraBody({
  scene, renderer, camera, rig, xrOn,
  floor = true,
  spawn = true
} = {}){
  if (!scene || !renderer || !camera) throw new TypeError('installMiraBody needs {scene, renderer, camera}');
  const parent = rig || scene;
  const xr = typeof xrOn === 'function' ? xrOn : () => renderer.xr.isPresenting;
  const system = createMiraSystem({scene, renderer, camera, xrOn: xr, rig: parent});
  const roomLight = new RoomLight(scene, renderer, parent);
  let ground = null;
  if (floor){
    ground = faintFloor();
    scene.add(ground);
  }
  await new Promise((resolve, reject) => {
    system.load(
      undefined,
      () => resolve(),
      err => reject(err || new Error('mira.glb failed to load'))
    );
  });
  if (spawn === false && system.actors[0]) system.remove(system.actors[0]);
  const api = {
    system, roomLight, floor: ground, scene, renderer, camera, rig: parent, xrOn: xr,
    get actor(){ return system.selected; },
    get actors(){ return system.actors; },
    get ready(){ return system.ready; },
    tick(dt, t, keys){ if (system.ready) system.tick(dt, t, keys); },
    resetPhysics(){ system.resetPhysics(); }
  };
  return api;
}

/** Enter Quest AR passthrough. Hides authored sky; keeps Mira + a faint floor. */
export async function enterPassthrough(body, {lightEstimation = true} = {}){
  if (!navigator.xr) throw new Error('WebXR not available');
  const {renderer, scene, camera, rig, roomLight, floor} = body;
  const optional = ['microphone'];
  if (lightEstimation) optional.push('light-estimation');
  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['local-floor'],
    optionalFeatures: optional
  });
  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(session);
  roomLight?.start(session);
  scene.background = null;
  renderer.setClearColor(0x000000, 0);
  if (floor?.material){
    floor.material.transparent = true;
    floor.material.opacity = 0.12;
  }
  if (rig){ rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); }
  camera.position.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);
  body.system.resetPhysics();
  session.addEventListener('end', () => {
    roomLight?.stop();
    scene.background = new THREE.Color(0x6b5e52);
    renderer.setClearColor(0x6b5e52, 1);
    if (floor?.material){
      floor.material.opacity = 1;
      floor.material.transparent = false;
    }
  });
  return session;
}

/** Desktop VR (no passthrough camera). */
export async function enterVR(body){
  if (!navigator.xr) throw new Error('WebXR not available');
  const {renderer, camera, rig} = body;
  const session = await navigator.xr.requestSession('immersive-vr', {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['microphone']
  });
  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(session);
  if (rig){ rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); }
  camera.position.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);
  body.system.resetPhysics();
  return session;
}

export function startMiraBodyLoop(body, {onFrame} = {}){
  const {renderer, scene, camera, system, roomLight, xrOn} = body;
  const clock = new THREE.Clock();
  const keys = {};
  const onDown = e => { keys[e.code] = true; };
  const onUp = e => { keys[e.code] = false; };
  addEventListener('keydown', onDown);
  addEventListener('keyup', onUp);
  renderer.setAnimationLoop((time, frame) => {
    if (xrOn() && frame){
      const space = renderer.xr.getReferenceSpace();
      const pose = space && frame.getViewerPose(space);
      if (pose){
        camera.position.copy(pose.transform.position);
        camera.quaternion.copy(pose.transform.orientation);
        camera.updateWorldMatrix(true, false);
      }
    }
    onFrame?.(time, frame);
    roomLight?.tick(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (system.ready) system.tick(dt, clock.elapsedTime, keys);
    renderer.render(scene, camera);
  });
  return {
    keys, clock,
    stop(){
      renderer.setAnimationLoop(null);
      removeEventListener('keydown', onDown);
      removeEventListener('keyup', onUp);
    }
  };
}
