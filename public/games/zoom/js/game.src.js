import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { BIOMES, CELL, EYE, FLAG_RUMBLE, LIQ_LAVA, LIQ_WATER, PICKUP_BY_ID, SHOP, WEAPON_BY_ID, WEAPONS, routes } from "./config.js?v=zm3";
import { bakedMaps, storyMaps } from "./defaults.js?v=zm3";
import { biomeOf, cellI, countCarved, ensureLayers, firstCarved, floorY, sdf3 } from "./map.js?v=zm3";
import { buildDungeon, prepareSdf } from "./mesh.js?v=zm3";
import { makeProp, spawnFrom, strikeFoes, tickFoes } from "./props.js?v=zm3";
import { getMap, listMaps } from "./store.js?v=zm3";
import { makeProc } from "./proc.js?v=zm3";
import { buildingFloorY, buildWorld, climbSupport, hurtBreakables, hurtTurrets, impulseBoulders, layoutRope, makeSky, smashGlass, spawnRipple, tickRubble, tickWorld, tryUnlock, wallBlocked } from "./world.js?v=zm3";
import { addBurnDecal, addSaberMark, fireWeapon, hurtFoe, makeDualSaber, makeKeyModel, makePickup, makeWeapon, setKillHook, tickBurns, tickShots } from "./weapons.js?v=zm3";
import { tickRobots } from "./robots.js?v=zm3";
import { attachXr, tickXr } from "./xr.js?v=zm3";
import { loadStoryPsy, lootForEnemy, makeWristGold, paintWristGold, saveStoryPsy, showerLoot, tickLoot } from "./loot.js?v=zm3";
import { sfx, sfxUnlock } from "./sfx.js?v=zm3";
import { makeNpc, nearNpc, tickNpcPose } from "./npcs.js?v=zm3";

const $ = (id) => document.getElementById(id);
const keys = new Set();
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const lookEuler = new THREE.Euler();

let renderer, scene, camera, clock, controls, hands, stage;
let map, sdf2, dungeon, extras;
let player = { x: 0, y: 1.6, z: 0, vx: 0, vy: 0, vz: 0, hp: 100, grounded: false, crouch: false, skate: false, fuel: 0, shield: 0, coins: 0, jumps: 2, dashT: 0, dashCd: 0, haste: 0, rage: 0, psy: 20 };
let jumpQueued = false;
let coyote = 0;
let foes = [];
let spawners = [];
let torchLights = [];
let pickups = [];
let shots = [];
let burns = [];
let lootBits = [];
let inv = [];
let physBodies = [];
let wristGold = null;
let xrPresenting = false;
let vrMenuOpen = false;
let vrMenu = null;
let vrMenuHover = -1;
let held = null;
let mag = 0;
let fireCd = 0;
let swingT = 0;
let rope = null;
let running = false;
let dead = false;
let hurtT = 0;
let yaw = 0;
let yawOffset = 0;
let xrYaw = null;
let viewWep, flashlight;
let dualSaber = null;
let saberOn = false;
let sheathed = false;
let ownedWeps = [];
let loadoutSlot = 0;
let handWep = null;
let ropeSqueeze = false;
let ropeCd = 0;
let camShake = 0;
let rumbleCd = 0;
let psyCd = 0;
let psyWaves = [];
let psyCharge = 0;
let psyCharging = false;
let psyMode = "blast";
let runMode = "story";
let customStart = { psy: 20, gold: 0 };
let carpetOn = false;
let carpetMesh = null;
let blackHole = null;
let holeBeam = null;
let lobby = null;
let psyChargeMesh = null;
let talk = null;
let npcs = [];
let wasInWater = false;
let saberPrevTips = [null, null];
let animId = 0;
let skyMesh = null;
let lastDeath = "the crawl";
let hemi, amb, sun;
let caveFog = null;
let skyTex = null;
let outdoor = false;

function setMsg(t) {
  $("msg").textContent = t || "";
  $("msg").hidden = !t;
}
function hudBars() {
  $("hpi").style.width = Math.max(0, player.hp) + "%";
  $("hpv").textContent = Math.max(0, player.hp | 0);
  const cap = Math.max(6, player.fuel);
  $("fueli").style.width = Math.min(100, (player.fuel / cap) * 100) + "%";
  $("fuelv").textContent = player.fuel.toFixed(1);
  const def = held && WEAPON_BY_ID[held];
  $("wep").textContent = def ? def.name : "unarmed";
  $("ammo").textContent = def && def.slot === "gun" ? mag + " / " + def.mag : "";
  $("mode").textContent =
    (player.skate ? "SKATE " : "") +
    (player.crouch ? "CROUCH " : "") +
    (player.fuel > 0 ? "JET " : "") +
    (player.dashT > 0 ? "DASH " : "") +
    (player.haste > 0 ? "HASTE " : "") +
    "PSY " + (player.psy | 0) + " " + psyMode.toUpperCase() + " " +
    (saberOn ? "SABER " : sheathed ? "HANDS " : "");
  if ($("goldv")) $("goldv").textContent = String(player.coins | 0);
  if ($("psyv")) $("psyv").textContent = String(player.psy | 0);
  if ($("psyi")) $("psyi").style.width = Math.min(100, ((player.psy || 20) / 1000) * 100) + "%";
  paintWristGold(wristGold, player.coins, player.psy);
}

function drawMinimap() {
  const c = $("mini");
  if (!c || !map) return;
  const g = c.getContext("2d");
  const s = c.width / map.w;
  g.fillStyle = "#080706";
  g.fillRect(0, 0, c.width, c.height);
  for (let z = 0; z < map.h; z++) {
    for (let x = 0; x < map.w; x++) {
      const b = map.cells[z * map.w + x];
      if (b & 1) {
        g.fillStyle = BIOMES[(b >> 3) & 15]?.swatch || "#888";
        g.fillRect(x * s, z * s, s + 0.4, s + 0.4);
      }
    }
  }
  g.fillStyle = "#fff56a";
  g.beginPath();
  g.arc((player.x / CELL) * s, (player.z / CELL) * s, 2.4, 0, 6.28);
  g.fill();
}

function rememberWeapon(id) {
  if (!id || !WEAPON_BY_ID[id]) return;
  if (!ownedWeps.includes(id)) ownedWeps.push(id);
}

function attachHandWep(xr, id) {
  if (handWep) {
    handWep.removeFromParent();
    handWep = null;
  }
  if (!id || saberOn) return;
  if (xr && xr.on && xr.right && xr.right.con) {
    handWep = makeWeapon(id);
    xr.right.con.add(handWep);
    handWep.position.set(0, 0, -0.07);
    handWep.rotation.set(-0.12, 0, 0);
  }
}

function setHeld(id) {
  held = id;
  mag = WEAPON_BY_ID[id]?.mag || 0;
  if (viewWep) {
    viewWep.removeFromParent();
    viewWep = null;
  }
  if (id) {
    viewWep = makeWeapon(id);
    viewWep.position.set(0.22, -0.18, -0.42);
    camera.add(viewWep);
    viewWep.visible = !xrPresenting;
  }
  hudBars();
}

function initThree() {
  if (renderer) return;
  const canvas = $("c");
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
    xrCompatible: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x3a342c, 1);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.06, 480);
  clock = new THREE.Clock();
  controls = new PointerLockControls(camera, $("c"));
  scene.add(controls.object);
  xrYaw = new THREE.Group();
  scene.add(xrYaw);
  hemi = new THREE.HemisphereLight(0xc8c0b0, 0x2a2018, 0.7);
  amb = new THREE.AmbientLight(0x3a342c, 0.5);
  sun = new THREE.DirectionalLight(0xfff2d0, 0);
  sun.position.set(48, 90, 22);
  scene.add(hemi, amb, sun);
  flashlight = new THREE.SpotLight(0xffe6c0, 2.2, 16, 0.5, 0.45, 1.4);
  flashlight.target.position.set(0, 0, -4);
  camera.add(flashlight);
  camera.add(flashlight.target);
  camera.add(new THREE.PointLight(0xffcc88, 0.3, 4.2));
  wristGold = makeWristGold();
  camera.add(wristGold);
  stage = new THREE.Group();
  stage.name = "stage";
  scene.add(stage);
  hands = attachXr(renderer, scene, onXrSession);
  renderer.setAnimationLoop(loop);
  setKillHook((f) => {
    const kinds = lootForEnemy(f.userData.def);
    const root = stage || scene;
    let fy = f.position.y - (f.userData.baseH || 1.6) * 0.5;
    if (map && sdf2) {
      const g = floorY(f.position.x, f.position.z, map, sdf2);
      if (g > -500) fy = g;
    }
    showerLoot(root, lootBits, f.position.x, f.position.y, f.position.z, kinds, fy);
  });
  $("c").addEventListener("click", () => {
    sfxUnlock();
    if (!$("start").hidden || dead || !$("inv").hidden || ($("shop") && !$("shop").hidden)) return;
    if (!controls.isLocked) controls.lock();
    else primary();
  });
  addEventListener("resize", () => {
    if (renderer.xr && renderer.xr.isPresenting) return;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function onXrSession(on) {
  xrPresenting = !!on;
  if (on) {
    if (scene) {
      scene.fog = null;
      scene.background = new THREE.Color(0x6a90b4);
    }
    if (hemi) hemi.intensity = 1.35;
    if (amb) amb.intensity = 0.9;
    if (sun) sun.intensity = Math.max(sun.intensity, 0.6);
    renderer.setClearColor(0x6a90b4, 1);
    if ($("start")) $("start").hidden = true;
    if ($("hud")) $("hud").hidden = !!running;
    if (xrYaw) {
      xrYaw.add(camera);
      if (hands) {
        for (const h of hands) {
          xrYaw.add(h.grip);
          xrYaw.add(h.con);
        }
      }
    }
    const leftGrip = (hands || []).find((h) => h.handed === "left") || (hands && hands[0]);
    if (wristGold && leftGrip) {
      wristGold.removeFromParent();
      wristGold.position.set(0.02, -0.05, 0.1);
      wristGold.scale.set(0.38, 0.075, 1);
      leftGrip.grip.add(wristGold);
    }
    applyXrStage();
    if (!running) {
      ensureLobby();
      if (lobby) lobby.visible = true;
    }
  } else {
    if (xrYaw && camera) {
      scene.add(controls.object || camera);
      xrYaw.rotation.y = 0;
    }
    if (hands) {
      for (const h of hands) {
        scene.add(h.grip);
        scene.add(h.con);
      }
    }
    if (wristGold) {
      wristGold.removeFromParent();
      wristGold.position.set(-0.22, -0.26, -0.42);
      wristGold.scale.set(0.28, 0.07, 1);
      if (camera) camera.add(wristGold);
    }
    if (stage) {
      stage.rotation.y = 0;
      stage.position.set(0, 0, 0);
    }
  }
}

function applyXrStage() {
  if (!xrPresenting || !stage) return;
  const eye = player.crouch ? 0.9 : EYE;
  const floor = (player.y || EYE) - eye;
  stage.rotation.y = 0;
  stage.position.set(-(player.x || 0), -floor, -(player.z || 0));
  if (xrYaw) xrYaw.rotation.y = yawOffset;
  if (camShake > 0 && camera) {
    camera.position.x += (Math.random() - 0.5) * camShake * 0.045;
    camera.position.y += (Math.random() - 0.5) * camShake * 0.03;
  }
}

function clearWorld() {
  if (dungeon) {
    dungeon.removeFromParent();
    dungeon.traverse((o) => o.geometry && o.geometry.dispose());
    dungeon = null;
  }
  for (const L of torchLights) L.removeFromParent();
  torchLights = [];
  for (const f of foes) f.removeFromParent();
  foes = [];
  for (const p of pickups) p.removeFromParent();
  pickups = [];
  for (const L of lootBits) L.mesh.removeFromParent();
  lootBits = [];
  shots = [];
  extras = null;
  physBodies = [];
}

function placeWorld() {
  for (const o of map.objects || []) {
    const g = makeProp(o.kind, o.s || 1);
    const y = Math.max(0, floorY(o.x, o.z, map, sdf2));
    g.position.set(o.x, y, o.z);
    dungeon.add(g);
    if (g.userData.phys) physBodies.push(g);
    if (g.userData.lightColor) {
      const L = new THREE.PointLight(g.userData.lightColor, 1.1, 8, 2);
      L.position.set(o.x, y + 1.1, o.z);
      stage.add(L);
      torchLights.push(L);
    }
  }
  for (const p of map.pickups || []) {
    const g = makePickup(p.kind);
    const y = Math.max(-20, floorY(p.x, p.z, map, sdf2));
    g.position.set(p.x, y + 0.35, p.z);
    stage.add(g);
    pickups.push(g);
  }
  for (const k of map.keys || []) {
    const g = new THREE.Group();
    g.add(makeKeyModel());
    g.userData.pickup = "key";
    g.userData.keyId = k.id;
    const y = Math.max(-20, floorY(k.x, k.z, map, sdf2));
    g.position.set(k.x, y + 0.45, k.z);
    stage.add(g);
    pickups.push(g);
  }
  extras = buildWorld(map, dungeon, stage);
  npcs = [];
  for (const n of map.npcs || []) {
    const mesh = makeNpc(n);
    const y = Math.max(0, floorY(n.x, n.z, map, sdf2));
    mesh.position.set(n.x, y, n.z);
    mesh.rotation.y = n.yaw || 0;
    dungeon.add(mesh);
    npcs.push({ ...n, mesh, x: n.x, z: n.z, y });
  }
}

function placePlayer() {
  let x = map.start?.x;
  let z = map.start?.z;
  yaw = map.start?.yaw || 0;
  if (x == null || floorY(x, z, map, sdf2) < -500) {
    const f = firstCarved(map);
    if (!f) return false;
    x = f.x;
    z = f.z;
  }
  const y = floorY(x, z, map, sdf2);
  player.x = x;
  player.z = z;
  player.y = (y < 0 ? 1.2 : y) + EYE;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.hp = 100;
  player.grounded = true;
  player.crouch = false;
  player.fuel = 0;
  player.shield = 0;
  player.coins = runMode === "story" ? 0 : (customStart.gold | 0);
  player.jumps = 2;
  player.dashT = 0;
  player.dashCd = 0;
  player.haste = 0;
  player.rage = 0;
  player.psy = runMode === "story" ? loadStoryPsy() : Math.max(0, Math.min(1000, customStart.psy | 0));
  psyCharge = 0;
  psyCharging = false;
  psyMode = "blast";
  carpetOn = false;
  if (carpetMesh) carpetMesh.visible = false;
  if (blackHole) {
    blackHole.mesh.removeFromParent();
    blackHole = null;
  }
  talk = null;
  if ($("talk")) $("talk").hidden = true;
  inv = [];
  ownedWeps = [];
  loadoutSlot = 0;
  if (handWep) {
    handWep.removeFromParent();
    handWep = null;
  }
  setHeld(null);
  saberOn = false;
  if (dualSaber) dualSaber.removeFromParent();
  for (const w of psyWaves) w.mesh.removeFromParent();
  psyWaves = [];
  camera.position.set(player.x, player.y, player.z);
  camera.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, "YXZ"));
  applyXrStage();
  return true;
}

async function enterMap(id) {
  setMsg("Carving the dark…");
  initThree();
  await new Promise((r) => setTimeout(r, 30));
  clearWorld();
  let m = id === "proc" ? makeProc() : storyMaps().find((x) => x.id === id) || bakedMaps().find((x) => x.id === id);
  if (!m) m = await getMap(id);
  if (!m) {
    setMsg("Map missing.");
    return;
  }
  map = ensureLayers(m);
  if (countCarved(map) === 0 && !(map.spheres && map.spheres.length) && !(map.bwalls && map.bwalls[0].some(Boolean))) {
    setMsg("This map is solid rock.");
    return;
  }
  sdf2 = prepareSdf(map);
  const built = buildDungeon(map, sdf2);
  dungeon = built.group;
  stage.add(dungeon);
  const b = biomeOf(map, map.start?.x || 0, map.start?.z || 0);
  caveFog = new THREE.FogExp2(b.fog, 0.018);
  scene.background = new THREE.Color(b.fog);
  scene.fog = caveFog;
  if (skyMesh) {
    scene.remove(skyMesh);
    skyMesh = null;
  }
  skyTex = null;
  outdoor = false;
  const skyKind = (map.sky || []).find((v) => v) || 0;
  if (skyKind) {
    skyTex = makeSky(skyKind);
    scene.background = skyTex;
    scene.fog = null;
    outdoor = true;
    if (sun) sun.intensity = 1.35;
    if (hemi) {
      hemi.color.setHex(0xd8e8ff);
      hemi.groundColor.setHex(0x3a5a28);
      hemi.intensity = 1.15;
    }
    if (amb) amb.intensity = 0.55;
    renderer.toneMappingExposure = 1.65;
  } else {
    if (sun) sun.intensity = 0;
    if (hemi) {
      hemi.color.setHex(0xc8c0b0);
      hemi.groundColor.setHex(0x2a2018);
      hemi.intensity = 0.7;
    }
    if (amb) amb.intensity = 0.5;
    renderer.toneMappingExposure = 1.5;
  }
  placeWorld();
  spawners = (map.spawners || []).map((s) => ({ ...s, _t: 0.3, _alive: 0 }));
  for (const s of spawners) {
    const e = spawnFrom(s, map, sdf2, foes);
    if (e) {
      stage.add(e);
      s._alive++;
    }
  }
  if (!placePlayer()) {
    setMsg("No walkable space.");
    return;
  }
  $("start").hidden = true;
  if (lobby) lobby.visible = false;
  $("hud").hidden = false;
  if ($("hud-vr")) $("hud-vr").hidden = false;
  $("dead").hidden = true;
  $("titlemap").textContent = map.name;
  running = true;
  dead = false;
  hudBars();
  setMsg("");
  clock.getDelta();
  window.__ZOOM__ = { map, player, dungeon, scene, camera, sdf2, foes, renderer };
}

function gunMuzzle() {
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, 0, -1);
  const right = (hands || []).find((h) => h.handed === "right") || (hands && hands[1]);
  if (xrPresenting && right && right.con) {
    origin.copy(right.pos);
    dir.copy(tmp.set(0, 0, -1).applyQuaternion(right.quat));
    origin.addScaledVector(dir, 0.12);
  } else {
    camera.getWorldPosition(origin);
    dir.applyQuaternion(camera.quaternion);
    origin.addScaledVector(dir, 0.45);
    origin.y -= 0.08;
  }
  if (stage && xrPresenting) {
    const tip = origin.clone().add(dir);
    origin.copy(stage.worldToLocal(origin.clone()));
    dir.copy(stage.worldToLocal(tip).sub(origin)).normalize();
  }
  return { origin, dir };
}

function primary() {
  const def = held && WEAPON_BY_ID[held];
  if (!def) {
    swingT = 0.28;
    const dir = tmp.set(0, 0, -1).applyQuaternion(camera.quaternion);
    strikeFoes(foes, camera.getWorldPosition(tmp2), dir, 2.2, 12);
    if (extras) {
      const origin = camera.getWorldPosition(tmp2);
      smashAt(origin, dir, 2.4, 12);
    }
    sfx("swing");
    return;
  }
  if (def.slot === "melee") {
    if (swingT > 0) return;
    swingT = def.rate || 0.35;
    const dir = tmp.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.getWorldPosition(tmp2);
    strikeFoes(foes, origin, dir, def.reach || 2.2, def.dmg * (player.rage > 0 ? 1.5 : 1));
    smashAt(origin, dir, def.reach || 2.2, def.dmg);
    sfx("swing");
    return;
  }
  if (fireCd > 0) return;
  if (mag <= 0) {
    setMsg("Empty — R reload (or A/X on the other hand in VR)");
    return;
  }
  mag--;
  fireCd = 1 / (def.rpm || 2);
  const muzzle = gunMuzzle();
  fireWeapon(def, muzzle.origin, muzzle.dir, stage || scene, shots);
  sfx("gun");
  hudBars();
}

function smashAt(origin, dir, reach, dmg) {
  if (!extras) return;
  const tip = origin.clone().addScaledVector(dir, Math.min(1.4, reach * 0.55));
  const bits = smashGlass(extras, tip, Math.max(1.1, reach * 0.45), stage || scene);
  for (const b of bits) if (b.userData.phys) physBodies.push(b);
  if (bits.length) sfx("glass");
  if (hurtTurrets(extras, tip, dmg || 12, 1.6)) sfx("hit");
  if (impulseBoulders(extras, tip, dir, 7 + (dmg || 10) * 0.12, 1.8)) sfx("boom");
}

function damage(n, why) {
  if (dead) return;
  if (player.shield > 0) n *= 0.45;
  player.hp -= n;
  hurtT = 0.2;
  lastDeath = why || "the crawl";
  hudBars();
  if (player.hp <= 0) die(lastDeath);
}

function die(why) {
  setMsg("You were " + (why || "taken") + " — back at spawn.");
  player.hp = 100;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.shield = 0;
  dead = false;
  running = true;
  rope = null;
  if ($("dead")) $("dead").hidden = true;
  let x = map?.start?.x;
  let z = map?.start?.z;
  if (x == null || (map && floorY(x, z, map, sdf2) < -500)) {
    const f = firstCarved(map);
    if (f) {
      x = f.x;
      z = f.z;
    }
  }
  if (x != null) {
    const y = floorY(x, z, map, sdf2);
    player.x = x;
    player.z = z;
    player.y = (y < 0 ? 1.2 : y) + EYE;
    player.grounded = true;
    player.jumps = 2;
  }
  hudBars();
}

function takePickup(p) {
  const kind = p.userData.pickup;
  const def = PICKUP_BY_ID[kind];
  if (kind === "key") {
    inv.push({ id: "key", keyId: p.userData.keyId, name: "Key " + p.userData.keyId });
    setMsg("Picked up a key");
    sfx("key");
  } else if (kind === "jetpack" || kind === "fuel") {
    player.fuel += def?.fuel || 6;
    setMsg("Fuel +" + (def?.fuel || 6) + "s");
  } else if (kind === "ammo") {
    const def = held && WEAPON_BY_ID[held];
    if (def && def.slot === "gun") {
      mag = def.mag;
      setMsg("Ammo refilled");
    } else {
      inv.push({ id: "ammo", name: "Ammo crate", cat: "item" });
      setMsg("Ammo crate");
    }
  } else if (WEAPON_BY_ID[kind]) {
    rememberWeapon(kind);
    if (!held) { sheathed = false; setHeld(kind); }
    else inv.push({ id: kind, name: WEAPON_BY_ID[kind].name, cat: "weapon" });
    setMsg(WEAPON_BY_ID[kind].name);
    sfx("wep");
  } else {
    inv.push({ id: kind, name: def?.name || kind, cat: "item" });
    setMsg(def?.name || kind);
  }
  p.visible = false;
  p.userData.taken = true;
  hudBars();
}

function useItem(it) {
  if (it.id === "medkit") {
    player.hp = Math.min(100, player.hp + 40);
    setMsg("Healed");
  } else if (it.id === "lantern") {
    flashlight.intensity = 4.2;
    flashlight.distance = 24;
    setMsg("Lantern lit");
  } else if (it.id === "shield") {
    player.shield = 12;
    setMsg("Shield up");
  } else if (it.id === "bomb") {
    for (const f of foes) {
      if (f.visible && f.position.distanceTo(camera.position) < 6) {
        f.userData.hp = 0;
        f.visible = false;
      }
    }
    setMsg("Blast");
  } else if (it.id === "ammo") {
    const def = held && WEAPON_BY_ID[held];
    if (def && def.slot === "gun") mag = def.mag;
    setMsg("Ammo refilled");
  } else if (WEAPON_BY_ID[it.id]) {
    if (held) inv.push({ id: held, name: WEAPON_BY_ID[held].name, cat: "weapon" });
    setHeld(it.id);
  }
  hudBars();
}

function renderInv() {
  const host = $("inv-list");
  host.innerHTML = "";
  if (!inv.length) host.innerHTML = "<p>Empty pack.</p>";
  inv.forEach((it, i) => {
    const b = document.createElement("button");
    b.textContent = it.name || it.id;
    b.addEventListener("click", () => {
      useItem(it);
      inv.splice(i, 1);
      renderInv();
    });
    host.appendChild(b);
  });
}

function physics(dt, xr) {
  const look = lookEuler.setFromQuaternion(camera.quaternion, "YXZ");
  yaw = look.y;
  if (xr && xr.on && Math.abs(xr.lookX) > 0.14) {
    yawOffset -= xr.lookX * dt * 1.85;
  }
  if (xrYaw && xrPresenting) xrYaw.rotation.y = yawOffset;
  const forward = tmp.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = tmp2.set(Math.cos(yaw), 0, -Math.sin(yaw));
  let wx = 0;
  let wz = 0;
  if (xr && xr.on) {
    camera.getWorldDirection(tmp);
    tmp.y = 0;
    if (tmp.lengthSq() < 1e-6) tmp.set(0, 0, -1);
    tmp.normalize();
    forward.copy(tmp);
    right.set(-forward.z, 0, forward.x);
    wx += forward.x * -(xr.moveY || 0) + right.x * (xr.moveX || 0);
    wz += forward.z * -(xr.moveY || 0) + right.z * (xr.moveX || 0);
    player.skate = xr.skate;
    player.crouch = !!(xr.crouch || keys.has("KeyC"));
    if (xr.skate && Math.hypot(wx, wz) < 0.12) {
      wx += forward.x;
      wz += forward.z;
    }
    if (xr.jumpTap || (xr.jump && player.grounded && player.vy <= 0.05)) jumpQueued = true;
  } else {
    if (keys.has("KeyW") || keys.has("ArrowUp")) {
      wx += forward.x;
      wz += forward.z;
    }
    if (keys.has("KeyS") || keys.has("ArrowDown")) {
      wx -= forward.x;
      wz -= forward.z;
    }
    if (keys.has("KeyD") || keys.has("ArrowRight")) {
      wx += right.x;
      wz += right.z;
    }
    if (keys.has("KeyA") || keys.has("ArrowLeft")) {
      wx -= right.x;
      wz -= right.z;
    }
    player.skate = keys.has("KeyQ");
    player.crouch = keys.has("KeyC");
  }
  if (xr && xr.dash && player.dashCd <= 0) {
    player.dashT = 2;
    player.dashCd = 15;
    setMsg("Dash");
  } else if (keys.has("KeyV") && player.dashCd <= 0 && player.dashT <= 0) {
    player.dashT = 2;
    player.dashCd = 15;
    setMsg("Dash");
  }
  if (player.dashT > 0) player.dashT = Math.max(0, player.dashT - dt);
  if (player.dashCd > 0) player.dashCd = Math.max(0, player.dashCd - dt);
  if (player.haste > 0) player.haste = Math.max(0, player.haste - dt);
  if (player.rage > 0) player.rage = Math.max(0, player.rage - dt);
  const len = Math.hypot(wx, wz);
  let spd = player.crouch ? 1.54 : keys.has("ShiftLeft") || keys.has("ShiftRight") ? 5.04 : 3.22;
  if (carpetOn) spd = 3.22 * 2.25;
  if (player.skate && !carpetOn) spd *= 2.5;
  if (player.haste > 0) spd *= 1.45;
  if (player.dashT > 0) spd *= 4;
  if (len > 0) {
    wx = (wx / len) * spd;
    wz = (wz / len) * spd;
  } else {
    wx = 0;
    wz = 0;
  }
  const airborne = !player.grounded && !carpetOn && !rope;
  if (airborne) {
    if (len > 0.12) {
      const cur = Math.hypot(player.vx, player.vz);
      const nx = player.vx + wx * 10 * dt;
      const nz = player.vz + wz * 10 * dt;
      const nlen = Math.hypot(nx, nz) || 1;
      const cap = Math.max(cur, spd);
      player.vx = (nx / nlen) * Math.min(nlen, cap);
      player.vz = (nz / nlen) * Math.min(nlen, cap);
    }
    wx = player.vx;
    wz = player.vz;
  } else {
    player.vx = wx;
    player.vz = wz;
  }
  const eye = player.crouch ? 0.9 : EYE;
  const bodyY = player.y - eye * 0.4;
  function blocked(x, y, z) {
    if (wallBlocked(map, x, z, y)) return true;
    return sdf3(x, y, z, map, sdf2) > -0.2;
  }
  function walkOk(x, y, z) {
    const r = 0.32;
    const samples = [
      [x, y, z],
      [x, player.y - 0.22, z],
      [x, y + 0.35, z],
      [x + r, y, z],
      [x - r, y, z],
      [x, y, z + r],
      [x, y, z - r],
      [x + r * 0.7, y, z + r * 0.7],
      [x - r * 0.7, y, z + r * 0.7],
      [x + r * 0.7, y, z - r * 0.7],
      [x - r * 0.7, y, z - r * 0.7],
    ];
    for (const [sx, sy, sz] of samples) {
      if (blocked(sx, sy, sz)) return false;
    }
    return true;
  }
  const GRAV = 24;
  const jet = player.fuel > 0 && !rope && !carpetOn && (
    keys.has("KeyF") ||
    (keys.has("Space") && !player.grounded && !jumpQueued) ||
    (xr && xr.on && xr.jump && !player.grounded)
  );

  if (!rope) {
    const nx = player.x + wx * dt;
    const nz = player.z + wz * dt;
    const okX = walkOk(nx, bodyY, player.z);
    const okZ = walkOk(player.x, bodyY, nz);
    const okBoth = walkOk(nx, bodyY, nz);
    if (okBoth) {
      player.x = nx;
      player.z = nz;
      if (!airborne) {
        player.vx = wx;
        player.vz = wz;
      }
    } else if (okX) {
      player.x = nx;
      if (!airborne) player.vx = wx;
      player.vz *= 0.12;
    } else if (okZ) {
      player.z = nz;
      if (!airborne) player.vz = wz;
      player.vx *= 0.12;
    } else {
      player.vx *= 0.08;
      player.vz *= 0.08;
    }
    if (blocked(player.x, bodyY, player.z)) {
      const push = [[0.28, 0], [-0.28, 0], [0, 0.28], [0, -0.28], [0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22]];
      for (const [px, pz] of push) {
        if (walkOk(player.x + px, bodyY, player.z + pz)) {
          player.x += px;
          player.z += pz;
          break;
        }
      }
    }
  }

  if (rope) {
    if (!keys.has("KeyE")) rope._waitE = false;
    const letGo =
      jumpQueued ||
      (keys.has("KeyE") && !rope._waitE) ||
      (ropeSqueeze && xr && xr.squeezeOff) ||
      (xr && xr.jet);
    if (letGo) {
      player.vy += 5.6;
      player.vx += wx * 0.55;
      player.vz += wz * 0.55;
      layoutRope(rope, rope.x, rope.y0, rope.z);
      rope = null;
      ropeSqueeze = false;
      ropeCd = 0.28;
      player.grounded = false;
      jumpQueued = false;
      sfx("release");
      setMsg("");
    } else {
      const ax = rope.x;
      const ay = rope.top;
      const az = rope.z;
      const L = rope.hang || Math.min(2.7, rope.len - 0.1);
      player.vx += wx * 4.4 * dt;
      player.vz += wz * 4.4 * dt;
      player.vy -= GRAV * dt;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.z += player.vz * dt;
      let dx = player.x - ax;
      let dy = player.y - ay;
      let dz = player.z - az;
      let dist = Math.hypot(dx, dy, dz) || 0.001;
      player.x = ax + (dx / dist) * L;
      player.y = ay + (dy / dist) * L;
      player.z = az + (dz / dist) * L;
      dx /= dist;
      dy /= dist;
      dz /= dist;
      const vr = player.vx * dx + player.vy * dy + player.vz * dz;
      player.vx = (player.vx - vr * dx) * 0.994;
      player.vy = player.vy - vr * dy;
      player.vz = (player.vz - vr * dz) * 0.994;
      player.grounded = false;
      const hx = player.x;
      const hy = player.y - 0.35;
      const hz = player.z;
      layoutRope(rope, hx, hy, hz);
    }
  } else {
    if (jumpQueued && !(xr && xr.on && xr.jet && player.fuel > 0 && !player.grounded)) {
      if (coyote > 0) player.jumps = 2;
      if (player.jumps > 0) {
        player.vy = player.jumps === 2 ? 9.62 : 8.4;
        player.jumps -= 1;
        player.grounded = false;
        coyote = 0;
        jumpQueued = false;
        if (Math.hypot(player.vx, player.vz) < 0.4 && Math.hypot(wx, wz) > 0.4) {
          player.vx = wx;
          player.vz = wz;
        }
      }
    }
    if (carpetOn) {
      let lift = 0;
      if (keys.has("Space") || keys.has("KeyR") || jumpQueued) lift += 1;
      if (keys.has("KeyC") || keys.has("ControlLeft")) lift -= 1;
      if (xr && xr.on) {
        if (Math.abs(xr.lookY || 0) > 0.18) lift += -(xr.lookY);
        else if (xr.jump) lift += 1;
      }
      player.vy = lift * 4.8;
      jumpQueued = false;
    } else if (jet) {
      player.vy += 26 * dt;
      player.fuel = Math.max(0, player.fuel - dt);
      if (player.vy > 9) player.vy = 9;
    } else player.vy -= GRAV * dt;
    const prevY = player.y;
    const steps = Math.max(1, Math.ceil(Math.abs(player.vy * dt) / 0.1));
    const stepY = (player.vy * dt) / steps;
    for (let s = 0; s < steps; s++) {
      player.y += stepY;
      if (player.vy > 0 && blocked(player.x, player.y + 0.12, player.z)) {
        player.vy = 0;
        break;
      }
      if (player.vy < 0 && sdf3(player.x, player.y - eye + 0.08, player.z, map, sdf2) > -0.04) {
        player.vy = 0;
        break;
      }
    }
    if (player.vy > 0 && blocked(player.x, player.y + 0.12, player.z)) player.vy = 0;
    player._prevY = prevY;
    if (extras && ropeCd <= 0) {
      const wantGrab = keys.has("KeyE") || (xr && xr.squeezeOn);
      for (const r of extras.ropes) {
        let near = Math.hypot(player.x - r.x, player.z - r.z) < 1.65 && player.y < r.top + 0.45 && player.y > r.y0 - 1.15;
        if (!near && xr && xr.on && stage) {
          for (const h of [xr.left, xr.right]) {
            if (!h || !h.pos) continue;
            const p = stage.worldToLocal(h.pos.clone());
            if (Math.hypot(p.x - r.x, p.z - r.z) < 1.25 && p.y < r.top + 0.3 && p.y > r.y0 - 0.8) near = true;
          }
        }
        const close = Math.hypot(player.x - r.x, player.z - r.z) < 1.05;
        if (near && (wantGrab || (!player.grounded && close))) {
          rope = r;
          rope.hang = Math.min(Math.max(0.75, r.top - player.y), r.len - 0.08);
          rope._waitE = keys.has("KeyE");
          ropeSqueeze = !!(xr && xr.squeezeOn);
          jumpQueued = false;
          layoutRope(rope, player.x, player.y - 0.35, player.z);
          sfx("grab");
          setMsg("Swinging — move to pump, jump or release grip to leap");
          break;
        }
      }
    }
  }
  const fy = floorY(player.x, player.z, map, sdf2, Math.max(player.y + 2, 6));
  const bf = buildingFloorY(map, player.x, player.z, player.y);
  let ground = -999;
  if (fy > -500) ground = fy;
  if (bf > -500) ground = Math.max(ground, bf);
  const climb = extras ? climbSupport(extras, player) : null;
  if (climb && !rope) {
    if (climb.kind === "ladder") {
      const up = keys.has("KeyW") || keys.has("ArrowUp") || (xr && xr.moveY < -0.2);
      const down = keys.has("KeyS") || keys.has("ArrowDown") || (xr && xr.moveY > 0.2);
      player.vy = 0;
      if (up) player.y += 3.4 * dt;
      if (down) player.y -= 3.4 * dt;
      player.y = Math.max(climb.y0 + eye, Math.min(climb.y1 + eye, player.y));
      player.x += (climb.x - player.x) * Math.min(1, dt * 8);
      player.z += (climb.z - player.z) * Math.min(1, dt * 8);
      player.grounded = true;
      coyote = 0.16;
      if (jumpQueued) {
        player.vy = 6.2;
        player.grounded = false;
        jumpQueued = false;
        coyote = 0;
      }
    } else {
      const c = Math.cos(climb.yaw || 0);
      const s = Math.sin(climb.yaw || 0);
      const along = (player.x - climb.x) * s + (player.z - climb.z) * c;
      const run = 1.15;
      const t = Math.max(0, Math.min(1, along / run + 0.5));
      ground = Math.max(ground, climb.y0 + t * (climb.y1 - climb.y0));
    }
  }
  const prevFeet = (player._prevY != null ? player._prevY : player.y) - eye;
  const feet = player.y - eye;
  if (!rope && ground > -500) {
    if (carpetOn) {
      if (feet < ground + 0.04) {
        player.y = ground + eye;
        if (player.vy < 0) player.vy = 0;
      }
      player.grounded = feet <= ground + 0.2;
      coyote = 0.16;
    } else {
      const crossed = prevFeet >= ground - 0.08 && feet <= ground + 0.38;
      const buried = feet < ground + 0.02;
      if ((crossed || buried) && player.vy <= 0.2) {
        player.y = ground + eye;
        if (player.vy < 0) player.vy = 0;
        player.grounded = true;
        player.jumps = 2;
        coyote = 0.16;
      } else if (!(climb && climb.kind === "ladder")) {
        player.grounded = false;
        coyote = Math.max(0, coyote - dt);
      }
    }
  } else if (!rope && !(climb && climb.kind === "ladder")) {
    player.grounded = false;
    coyote = Math.max(0, coyote - dt);
  }
  if (player.y < -18) die("fell");

  const ci = cellI(map, player.x, player.z);
  const feetY = player.y - eye;
  if (map.flags && map.flags[ci] & 1 && player.grounded && feetY < ground + 0.4) die("impaled");
  let inLava = map.liquid && map.liquid[ci] === LIQ_LAVA;
  if (!inLava && extras?.liquids) {
    for (const L of extras.liquids) {
      if (L.kind === LIQ_LAVA && Math.hypot(player.x - L.x, player.z - L.z) < CELL * 0.62 && feetY < L.y + 0.45) {
        inLava = true;
        break;
      }
    }
  }
  if (inLava) die("burned in lava");
  if (map.flags && map.flags[ci] & FLAG_RUMBLE) triggerRumble(xr);
  if (camShake > 0) camShake = Math.max(0, camShake - dt * 4.2);
  if (rumbleCd > 0) rumbleCd -= dt;
  if (ropeCd > 0) ropeCd -= dt;
  let inWater = map.liquid && map.liquid[ci] === LIQ_WATER;
  if (!inWater && extras?.liquids) {
    for (const L of extras.liquids) {
      if (L.kind === LIQ_WATER && Math.hypot(player.x - L.x, player.z - L.z) < CELL * 0.62 && feetY < L.y + 0.35) {
        inWater = true;
        break;
      }
    }
  }
  if (inWater && player.grounded) {
    player.vx *= 0.85;
    player.vz *= 0.85;
  }
  if (inWater && !wasInWater) {
    sfx("splash");
    const L = (extras?.liquids || []).find((q) => q.kind === LIQ_WATER && Math.hypot(player.x - q.x, player.z - q.z) < CELL);
    spawnRipple(extras, player.x, L ? L.y : feetY, player.z);
  }
  wasInWater = !!inWater;
  player._prevY = player.y;

  if (tryUnlock(extras || { doors: [] }, player, inv.filter((i) => i.id === "key").map((i) => i.keyId))) setMsg("Unlocked");

  if (!xrPresenting) {
    if (stage) stage.position.set(0, 0, 0);
    camera.position.set(player.x, player.y, player.z);
  }
  if (viewWep) viewWep.visible = !xrPresenting;
  if (viewWep && swingT > 0) {
    const a = Math.sin((1 - swingT / 0.4) * Math.PI);
    viewWep.rotation.x = -a * 0.8;
  } else if (viewWep) viewWep.rotation.x = 0;
}

function tickPhys(dt, xr) {
  const eye = player.crouch ? 0.9 : EYE;
  const pr = 0.32;
  for (const g of physBodies) {
    const p = g.userData.phys;
    if (!p || p.held) continue;
    p.vy -= 18 * dt;
    const fy = floorY(g.position.x, g.position.z, map, sdf2);
    g.position.x += p.vx * dt;
    g.position.z += p.vz * dt;
    g.position.y += p.vy * dt;
    if (fy > -500 && g.position.y <= fy + 0.02) {
      g.position.y = fy;
      if (p.vy < 0) p.vy *= -0.18;
      p.vx *= 0.82;
      p.vz *= 0.82;
    }
    if (sdf3(g.position.x, g.position.y + p.h * 0.4, g.position.z, map, sdf2) > -0.12) {
      p.vx *= -0.35;
      p.vz *= -0.35;
      g.position.x -= p.vx * dt * 2;
      g.position.z -= p.vz * dt * 2;
    }
    const dx = g.position.x - player.x;
    const dz = g.position.z - player.z;
    const dist = Math.hypot(dx, dz);
    const min = p.r + pr;
    if (dist < min && dist > 1e-4) {
      const nx = dx / dist;
      const nz = dz / dist;
      const push = min - dist;
      g.position.x += nx * push * 0.7;
      g.position.z += nz * push * 0.7;
      const impulse = 2.8 / Math.max(2, p.mass);
      p.vx += nx * impulse + player.vx * 0.45;
      p.vz += nz * impulse + player.vz * 0.45;
      player.x -= nx * push * 0.25;
      player.z -= nz * push * 0.25;
    }
    p.vx *= 0.985;
    p.vz *= 0.985;
  }
  for (let i = 0; i < physBodies.length; i++) {
    for (let j = i + 1; j < physBodies.length; j++) {
      const a = physBodies[i];
      const b = physBodies[j];
      const pa = a.userData.phys;
      const pb = b.userData.phys;
      if (!pa || !pb || pa.held || pb.held) continue;
      const dx = b.position.x - a.position.x;
      const dz = b.position.z - a.position.z;
      const dist = Math.hypot(dx, dz);
      const min = pa.r + pb.r;
      if (dist < min && dist > 1e-4) {
        const nx = dx / dist;
        const nz = dz / dist;
        const push = (min - dist) * 0.5;
        a.position.x -= nx * push;
        a.position.z -= nz * push;
        b.position.x += nx * push;
        b.position.z += nz * push;
      }
    }
  }
}

function grabNearest(h) {
  let best = null;
  let bd = 0.55;
  for (const g of physBodies) {
    const p = g.userData.phys;
    if (!p || p.held) continue;
    g.getWorldPosition(tmp);
    const d = h.pos.distanceTo(tmp);
    if (d < bd) {
      bd = d;
      best = g;
    }
  }
  for (const p of pickups) {
    if (!p.visible || p.userData.taken) continue;
    p.getWorldPosition(tmp);
    const d = h.pos.distanceTo(tmp);
    if (d < Math.min(bd, 0.5)) {
      bd = d;
      best = p;
    }
  }
  return best;
}

function worldDrop(mesh, pos, vel) {
  const parent = dungeon || stage || scene;
  parent.attach(mesh);
  const p = mesh.userData.phys;
  if (p) {
    p.held = false;
    p.vx = vel.x;
    p.vy = vel.y;
    p.vz = vel.z;
  }
}

function paintVrMenu() {
  if (!vrMenu) {
    vrMenu = new THREE.Group();
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x120e0c, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
    );
    vrMenu.add(plate);
    vrMenu.userData.labels = [];
    scene.add(vrMenu);
  }
  for (const L of vrMenu.userData.labels) L.removeFromParent();
  vrMenu.userData.labels = [];
  const lines = ["PACK", ...inv.slice(0, 6).map((it) => it.name || it.id), "RESUME"];
  lines.forEach((text, i) => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = i === vrMenuHover ? "#d4b070" : "#1a1410";
    g.fillRect(0, 0, 512, 64);
    g.fillStyle = i === vrMenuHover ? "#1a1008" : "#e8dcc0";
    g.font = "28px serif";
    g.fillText(text, 18, 42);
    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.08),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }),
    );
    m.position.set(0, 0.34 - i * 0.1, 0.01);
    m.userData.menuI = i;
    vrMenu.add(m);
    vrMenu.userData.labels.push(m);
  });
  vrMenu.userData.lines = lines;
}

function toggleVrMenu() {
  vrMenuOpen = !vrMenuOpen;
  if (!vrMenuOpen) {
    if (vrMenu) vrMenu.visible = false;
    $("inv").hidden = true;
    return;
  }
  $("inv").hidden = false;
  renderInv();
  paintVrMenu();
  vrMenu.visible = true;
  const dir = tmp.set(0, 0, -1).applyQuaternion(camera.quaternion);
  vrMenu.position.copy(camera.position).addScaledVector(dir, 1.35);
  vrMenu.quaternion.copy(camera.quaternion);
  setMsg("Pack — point and trigger. Y again to close.");
}

function tickVrMenu(xr) {
  if (!vrMenuOpen || !vrMenu || !xr.right) return;
  const ray = new THREE.Raycaster(xr.right.pos, tmp.set(0, 0, -1).applyQuaternion(xr.right.quat));
  const hits = ray.intersectObjects(vrMenu.userData.labels || [], false);
  const next = hits[0] ? hits[0].object.userData.menuI : -1;
  if (next !== vrMenuHover) {
    vrMenuHover = next;
    paintVrMenu();
  }
  if (xr.right.trigger && !xr.right.triggerPrev && vrMenuHover >= 0) {
    const lines = vrMenu.userData.lines || [];
    const label = lines[vrMenuHover];
    if (label === "RESUME" || label === "PACK") toggleVrMenu();
    else {
      const it = inv[vrMenuHover - 1];
      if (it) {
        useItem(it);
        inv.splice(vrMenuHover - 1, 1);
        renderInv();
        paintVrMenu();
      }
    }
  }
}

function tickPickups(xr, dt = 0.016) {
  const eye = player.crouch ? 0.9 : EYE;
  const handsList = xr && xr.on ? [xr.left, xr.right].filter(Boolean) : [];
  for (const p of pickups) {
    if (!p.visible || p.userData.taken) continue;
    p.rotation.y += 0.03;
    const dx = p.position.x - player.x;
    const dy = p.position.y - (player.y - eye * 0.45);
    const dz = p.position.z - player.z;
    const dist = Math.hypot(dx, dz);
    const magR = 1.85;
    if (dist < magR && dist > 0.12) {
      const pull = (magR - dist) * 8 * dt;
      p.position.x -= (dx / dist) * pull;
      p.position.z -= (dz / dist) * pull;
    }
    let hit = dist < 0.95 && Math.abs(dy) < 1.35;
    if (!hit) {
      p.getWorldPosition(tmp);
      for (const h of handsList) {
        if (h.pos.distanceTo(tmp) < 0.32) {
          hit = true;
          break;
        }
      }
    }
    if (hit) takePickup(p);
  }
}

function flingAt(pos, dir, radius, force, slam, hitSet) {
  const r = radius;
  for (const f of foes) {
    if (!f.visible || f.userData.hp <= 0) continue;
    if (hitSet && hitSet.has(f)) continue;
    const d = f.position.distanceTo(pos);
    if (d > r + (f.userData.hitR || 0.7)) continue;
    if (hitSet) hitSet.add(f);
    const u = f.userData;
    const n = f.position.clone().sub(pos);
    if (n.lengthSq() < 1e-6) n.copy(dir);
    n.y += 0.45;
    n.normalize();
    n.addScaledVector(dir, 0.55).normalize();
    u.flung = true;
    u.vx = n.x * force;
    u.vy = Math.max(4.5, n.y * force * 0.7);
    u.vz = n.z * force;
    u.slam = slam;
    hurtFoe(f, Math.max(4, slam * 0.25), dir);
  }
  for (const g of physBodies) {
    const p = g.userData.phys;
    if (!p || p.held) continue;
    if (hitSet && hitSet.has(g)) continue;
    if (g.position.distanceTo(pos) > r + (p.r || 0.4)) continue;
    if (hitSet) hitSet.add(g);
    const n = g.position.clone().sub(pos);
    if (n.lengthSq() < 1e-6) n.copy(dir);
    n.y += 0.5;
    n.normalize();
    p.vx = n.x * force * 0.9;
    p.vy = Math.max(3.5, n.y * force * 0.65);
    p.vz = n.z * force * 0.9;
    p.slam = slam;
  }
  if (extras) {
    if (hurtTurrets(extras, pos, Math.max(10, slam * 0.7), r + 0.9)) sfx("hit");
    const glass = smashGlass(extras, pos, r + 0.85, stage || scene);
    for (const b of glass) if (b.userData.phys) physBodies.push(b);
    if (glass.length) sfx("glass");
    if (impulseBoulders(extras, pos, dir, 9 + slam * 0.2, r + 1.1)) sfx("boom");
    const bits = hurtBreakables(extras, map, pos, r + 0.55, 1, stage || scene);
    for (const b of bits) {
      if (b.userData.phys) physBodies.push(b);
      else if (b.userData.flash) psyWaves.push({ mesh: b, dir: new THREE.Vector3(), speed: 0, life: 0.2, r: 0, hit: new Set(), dummy: true });
    }
  }
}

function orientPsyRing(ring, dir) {
  const d = dir.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  let xAxis = new THREE.Vector3().crossVectors(d, up);
  if (xAxis.lengthSq() < 1e-6) xAxis.set(1, 0, 0);
  xAxis.normalize();
  const yAxis = new THREE.Vector3().crossVectors(xAxis, d).normalize();
  ring.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, d));
}

function unlockedPsyModes() {
  const m = ["blast"];
  if ((player.psy | 0) >= 100) m.push("beam");
  if ((player.psy | 0) >= 150) m.push("carpet");
  if ((player.psy | 0) >= 200) m.push("tide");
  if ((player.psy | 0) >= 250) m.push("hole");
  return m;
}

function psyLabel(mode) {
  if (mode === "beam") return "beam";
  if (mode === "carpet") return "magic carpet";
  if (mode === "tide") return "tidal wave";
  if (mode === "hole") return "mini black hole";
  return "rings";
}

function cyclePsyMode() {
  const m = unlockedPsyModes();
  const i = Math.max(0, m.indexOf(psyMode));
  psyMode = m[(i + 1) % m.length];
  carpetOn = psyMode === "carpet";
  sfx("cycle");
  setMsg("Psy: " + psyLabel(psyMode));
}

function tickPsyInput(xr, dt) {
  const holding = (xr && xr.on && xr.psyHeld && !xr.dash) || keys.has("KeyX");
  const released = (xr && xr.on && xr.psyRelease) || (!holding && psyCharging);
  if (talk) return;
  if (psyMode === "carpet" && (player.psy | 0) >= 150) {
    if (blackHole) dissipateHole(false);
    if (holeBeam) holeBeam.visible = false;
    carpetOn = true;
    psyCharging = false;
    psyCharge = 0;
    if (psyChargeMesh) psyChargeMesh.visible = false;
    tickCarpet(dt, xr);
    return;
  }
  carpetOn = false;
  if (carpetMesh) carpetMesh.visible = false;
  if (psyMode === "hole" && (player.psy | 0) >= 250) {
    tickBlackHole(xr, dt, holding, released);
    return;
  }
  if (blackHole) {
    dissipateHole(true);
  }
  if (holeBeam) holeBeam.visible = false;
  if (psyMode === "beam" && (player.psy | 0) >= 100) {
    if (holding && psyCd <= 0) firePsy(xr, 0);
    psyCharging = false;
    psyCharge = 0;
    if (psyChargeMesh) psyChargeMesh.visible = false;
    return;
  }
  if (holding) {
    if (!psyCharging) sfx("charge");
    psyCharging = true;
    psyCharge = Math.min(3, psyCharge + dt);
    const { origin, dir } = psyAim(xr);
    if (!psyChargeMesh) {
      psyChargeMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.02, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
      );
      (stage || scene).add(psyChargeMesh);
    }
    psyChargeMesh.visible = true;
    const k = 0.4 + (psyCharge / 3) * 1.4;
    psyChargeMesh.scale.setScalar(k);
    psyChargeMesh.position.copy(origin).addScaledVector(dir, 0.25);
    orientPsyRing(psyChargeMesh, dir);
  } else if (released && psyCharging) {
    const ch = psyCharge;
    psyCharging = false;
    psyCharge = 0;
    if (psyChargeMesh) psyChargeMesh.visible = false;
    firePsy(xr, ch);
  } else {
    psyCharging = false;
    psyCharge = 0;
    if (psyChargeMesh) psyChargeMesh.visible = false;
  }
}

function psyAim(xr) {
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, 0, -1);
  const hand = xr && xr.on && xr.left;
  if (hand) {
    origin.copy(hand.pos);
    dir.copy(tmp.set(0, 0, -1).applyQuaternion(hand.quat));
  } else {
    camera.getWorldPosition(origin);
    dir.applyQuaternion(camera.quaternion);
  }
  if (stage && xrPresenting) {
    const worldTip = origin.clone().add(dir);
    origin.copy(stage.worldToLocal(origin.clone()));
    const p2 = stage.worldToLocal(worldTip);
    dir.copy(p2.sub(origin)).normalize();
  }
  return { origin, dir };
}

function tickCarpet(dt, xr) {
  const eye = player.crouch ? 0.9 : EYE;
  if (!carpetMesh) {
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1.7, 2.4, 10, 14);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    g.add(mesh);
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.88, 24),
      new THREE.MeshBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    rim.rotation.x = -Math.PI / 2;
    g.add(rim);
    (stage || scene).add(g);
    carpetMesh = g;
    carpetMesh.userData.plane = mesh;
  }
  carpetMesh.visible = true;
  const t = performance.now() * 0.003;
  const pos = carpetMesh.userData.plane.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 4.2 + t * 3.4) * 0.05 + Math.cos(y * 3.1 + t * 2.6) * 0.04);
  }
  pos.needsUpdate = true;
  carpetMesh.position.set(player.x, player.y - eye + 0.08, player.z);
  carpetMesh.rotation.y = yaw;
}

function holeTarget(xr) {
  const { origin, dir } = psyAim(xr);
  let hit = origin.clone().addScaledVector(dir, 18);
  for (let s = 0.4; s < 18; s += 0.25) {
    const p = origin.clone().addScaledVector(dir, s);
    if (wallBlocked(map, p.x, p.z, p.y) || sdf3(p.x, p.y, p.z, map, sdf2) > -0.08) {
      hit = origin.clone().addScaledVector(dir, Math.max(0.6, s - 0.2));
      break;
    }
  }
  return { origin, dir, hit };
}

function tickBlackHole(xr, dt, holding, released) {
  const { origin, dir, hit } = holeTarget(xr);
  if (!holeBeam) {
    holeBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 16, 6),
      new THREE.MeshBasicMaterial({ color: 0x66eeff, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    (stage || scene).add(holeBeam);
  }
  holeBeam.visible = true;
  holeBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  holeBeam.position.copy(origin).addScaledVector(dir, 8);
  if (holding) {
    if (!blackHole) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 18, 14),
        new THREE.MeshBasicMaterial({ color: 0x050308, transparent: true, opacity: 0.92 }),
      );
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 0.42, 28),
        new THREE.MeshBasicMaterial({ color: 0xaa66ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      mesh.add(halo);
      (stage || scene).add(mesh);
      blackHole = { mesh, halo, r: 0.2, t: 0, warp: [] };
    }
    blackHole.t += dt;
    blackHole.r = Math.min(3.4, 0.25 + blackHole.t * 0.85);
    blackHole.mesh.position.copy(hit);
    blackHole.mesh.scale.setScalar(blackHole.r / 0.2);
    blackHole.halo.rotation.z += dt * 3.2;
    suckEnemies(blackHole, dt);
    warpWalls(blackHole, dt);
    if (blackHole.t >= 4.2) dissipateHole(true);
  } else if (blackHole && (released || !holding)) {
    dissipateHole(blackHole.t > 0.35);
  }
}

function suckEnemies(hole, dt) {
  const p = hole.mesh.position;
  for (const f of foes) {
    if (!f.visible || f.userData.hp <= 0) continue;
    const d = f.position.distanceTo(p);
    if (d > hole.r * 2.8 + 1.2) continue;
    const pull = Math.max(0.4, hole.r * 2.2 - d);
    f.position.lerp(p, Math.min(1, dt * pull * 0.9));
    f.rotation.y += dt * (8 + hole.r * 4);
    f.userData.hp -= (6 + hole.r * 4) * dt;
    f.userData.flash = 0.1;
    if (f.userData.hp <= 0) {
      f.visible = false;
    }
  }
}

function warpWalls(hole, dt) {
  if (!extras) return;
  extras._warp = extras._warp || [];
  if (extras._warp.length < 14) {
    const bit = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.7, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x442266, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    (stage || scene).add(bit);
    extras._warp.push(bit);
  }
  const p = hole.mesh.position;
  extras._warp.forEach((b, i) => {
    const a = i * 0.7 + performance.now() * 0.002;
    const rad = hole.r * 1.8 + 0.6;
    b.position.set(p.x + Math.cos(a) * rad, p.y + Math.sin(a * 1.7) * 0.4, p.z + Math.sin(a) * rad);
    b.lookAt(p);
    b.scale.y = 1.2 + hole.r * 0.4;
  });
}

function shockReach(ox, oz, tx, tz, maxR) {
  if (!map) return false;
  const sx = Math.floor(ox / CELL);
  const sz = Math.floor(oz / CELL);
  const gx = Math.floor(tx / CELL);
  const gz = Math.floor(tz / CELL);
  const seen = new Set();
  const q = [[sx, sz, 0]];
  seen.add(sx + "," + sz);
  while (q.length) {
    const [x, z, d] = q.shift();
    if (x === gx && z === gz) return true;
    if (d >= maxR) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      const k = nx + "," + nz;
      if (seen.has(k) || nx < 0 || nz < 0 || nx >= map.w || nz >= map.h) continue;
      if (!(map.cells[nz * map.w + nx] & 1)) continue;
      seen.add(k);
      q.push([nx, nz, d + 1]);
    }
  }
  return false;
}

function dissipateHole(explode) {
  if (holeBeam) holeBeam.visible = false;
  if (!blackHole) return;
  const p = blackHole.mesh.position.clone();
  const r = blackHole.r;
  blackHole.mesh.removeFromParent();
  blackHole = null;
  if (extras?._warp) {
    for (const b of extras._warp) b.removeFromParent();
    extras._warp = [];
  }
  if (!explode) return;
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(r * 1.4, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  flash.position.copy(p);
  (stage || scene).add(flash);
  psyWaves.push({ mesh: flash, dir: new THREE.Vector3(), speed: 0, life: 0.28, r: r * 2, hit: new Set(), dummy: true });
  const reach = Math.max(6, r * 5);
  for (const f of foes) {
    if (!f.visible || f.userData.hp <= 0) continue;
    if (!shockReach(p.x, p.z, f.position.x, f.position.z, Math.ceil(reach / CELL))) continue;
    const d = f.position.distanceTo(p);
    if (d > reach) continue;
    const n = f.position.clone().sub(p);
    n.y += 0.4;
    n.normalize();
    f.userData.flung = true;
    f.userData.vx = n.x * (10 + r * 3);
    f.userData.vy = 6 + r;
    f.userData.vz = n.z * (10 + r * 3);
    f.userData.slam = 18 + r * 6;
    f.userData.hp -= 22 + r * 8;
  }
  flingAt(p, new THREE.Vector3(0, 1, 0), reach, 14 + r * 4, 20 + r * 5, new Set());
  sfx("boom");
  setMsg("Neutrino burst");
  camShake = Math.min(1.8, camShake + 1.2);
}

function effectivePsy(charge) {
  const p = Math.max(20, Math.min(1000, player.psy || 20));
  const mul = 1 + 2 * Math.max(0, Math.min(1, charge / 3));
  return p * mul;
}

function firePsy(xr, charge = 0) {
  if (psyCd > 0) return;
  const p = effectivePsy(charge);
  const scale = p / 100;
  const originDir = psyAim(xr);
  const origin = originDir.origin;
  const dir = originDir.dir;
  psyCd = Math.max(0.14, 0.55 * (80 / p));
  if (psyMode === "beam" && (player.psy | 0) >= 100) {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04 * scale, 0.02 * scale, 9 * Math.min(2.4, 0.7 + scale), 8),
      new THREE.MeshBasicMaterial({ color: 0x99eeff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    beam.position.copy(origin).addScaledVector(dir, 4.5 * Math.min(1.2, 0.5 + scale * 0.3));
    (stage || scene).add(beam);
    psyWaves.push({ mesh: beam, dir: dir.clone(), speed: 0, life: 0.12, r: 0.35 * scale, hit: new Set(), dummy: false, slam: 8 + p * 0.06, force: 6 + scale * 4, beam: true });
    sfx("psy");
    setMsg("Psybeam");
    return;
  }
  if (psyMode === "tide" && (player.psy | 0) >= 200) {
    const disc = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.55 * scale, 28),
      new THREE.MeshBasicMaterial({ color: 0x66a0ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.copy(origin);
    disc.position.y -= 0.2;
    (stage || scene).add(disc);
    psyWaves.push({ mesh: disc, dir: new THREE.Vector3(0, 0, 0), speed: 0, life: 0.7, r: 0.6 * scale, hit: new Set(), dummy: false, slam: 12 + p * 0.08, force: 10 + scale * 5, tide: true, grow: 9 * scale });
    sfx("psy");
    setMsg("Psionic tide");
    return;
  }
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry((0.18 + i * 0.05) * scale, 0.024 * Math.max(0.35, scale), 8, 28),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0x66eeff : 0xb388ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.scale.set(0.42 * scale, 1.55 * scale, 1);
    ring.position.copy(origin).addScaledVector(dir, 0.12 + i * 0.09);
    orientPsyRing(ring, dir);
    (stage || scene).add(ring);
    psyWaves.push({
      mesh: ring,
      dir: dir.clone(),
      speed: (12 + i * 1.2) * (0.55 + scale * 0.45),
      life: 0.58,
      r: (0.38 + i * 0.08) * scale,
      hit: new Set(),
      slam: 8 + p * 0.07,
      force: 6 + scale * 4,
      s0: 0.42 * scale,
      s1: 1.55 * scale,
    });
  }
  sfx("psy");
  setMsg(charge >= 2.7 ? "Charged psyblast" : "Psyblast");
}

function tickPsy(dt) {
  for (let i = psyWaves.length - 1; i >= 0; i--) {
    const w = psyWaves[i];
    w.life -= dt;
    w.r += dt * 3.6;
    w.mesh.position.addScaledVector(w.dir, w.speed * dt);
    if (w.mesh.material) w.mesh.material.opacity = Math.max(0, w.life * 1.6);
    if (w.dummy) {
      w.mesh.scale.addScalar(dt * 6);
    } else if (w.tide) {
      w.r += dt * (w.grow || 8);
      const s = Math.max(0.2, w.r);
      w.mesh.scale.set(s, s, 1);
      flingAt(w.mesh.position, new THREE.Vector3(0, 1, 0), w.r, w.force || 10, w.slam || 14, w.hit);
    } else if (w.beam) {
      flingAt(w.mesh.position, w.dir, w.r + 0.4, w.force || 8, w.slam || 12, w.hit);
    } else {
      const grow = 1 + (0.58 - w.life) * 1.8;
      w.mesh.scale.set((w.s0 || 0.42) * grow, (w.s1 || 1.55) * grow, 1);
      flingAt(w.mesh.position, w.dir, w.r, w.force || 9.5, w.slam || 14, w.hit);
    }
    if (extras && !w.dummy) {
      const bits = hurtBreakables(extras, map, w.mesh.position, (w.r || 0.5) + 0.45, 1, stage || scene, w.hit);
      for (const b of bits) if (b.userData?.phys) physBodies.push(b);
    }
    if (w.life <= 0) {
      w.mesh.removeFromParent();
      psyWaves.splice(i, 1);
    }
  }
}

function pulseHands(xr, mag, ms) {
  for (const h of [xr?.left, xr?.right]) {
    const gp = h?.gp;
    if (!gp) continue;
    try {
      if (gp.hapticActuators && gp.hapticActuators[0]) gp.hapticActuators[0].pulse(mag, ms);
      else if (gp.vibrationActuator) gp.vibrationActuator.playEffect("dual-rumble", { duration: ms, strongMagnitude: mag, weakMagnitude: mag * 0.6 });
    } catch {}
  }
}

function triggerRumble(xr) {
  if (rumbleCd > 0) return;
  rumbleCd = 0.45;
  camShake = Math.min(1.6, camShake + 1.15);
  pulseHands(xr, 0.95, 220);
  if (extras && stage) {
    const y0 = player.y + 1.6;
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.12 + Math.random() * 0.18, 0.08 + Math.random() * 0.16, 0.1 + Math.random() * 0.14),
        new THREE.MeshLambertMaterial({ color: 0x5a5248 }),
      );
      m.position.set(player.x + (Math.random() - 0.5) * 1.4, y0 + Math.random() * 0.5, player.z + (Math.random() - 0.5) * 1.4);
      m.userData.vy = -1.2;
      m.userData.floor = player.y - (player.crouch ? 0.9 : EYE) + 0.05;
      m.userData.falling = true;
      stage.add(m);
      extras.caveins = extras.caveins || [];
      extras.caveins.push(m);
    }
  }
  setMsg("The floor shudders");
}

function placeRumble() {
  if (!map?.flags) return;
  const ci = cellI(map, player.x, player.z);
  if (ci < 0) return;
  map.flags[ci] |= FLAG_RUMBLE;
  setMsg("Rumble tile set");
}

function loadoutRing() {
  const weps = ownedWeps.slice();
  for (const it of inv) {
    if (WEAPON_BY_ID[it.id] && !weps.includes(it.id)) weps.push(it.id);
  }
  if (held && WEAPON_BY_ID[held] && !weps.includes(held)) weps.unshift(held);
  return ["__saber__", ...weps, "__empty__"];
}

function applyLoadout(slot, xr) {
  const ring = loadoutRing();
  loadoutSlot = ((slot % ring.length) + ring.length) % ring.length;
  const id = ring[loadoutSlot];
  if (saberOn && id !== "__saber__") toggleSaber(xr);
  if (id === "__saber__") {
    sheathed = false;
    if (!saberOn) toggleSaber(xr);
    attachHandWep(xr, null);
    if (viewWep) viewWep.visible = false;
    sfx("cycle");
    return;
  }
  if (id === "__empty__") {
    sheathed = true;
    setHeld(null);
    attachHandWep(xr, null);
    sfx("cycle");
    setMsg("Empty-handed — rumble tiles");
    return;
  }
  sheathed = false;
  setHeld(id);
  attachHandWep(xr, id);
  sfx("cycle");
  setMsg(WEAPON_BY_ID[id].name);
}

function cycleLoadout(xr) {
  const ring = loadoutRing();
  let cur = 0;
  if (saberOn) cur = ring.indexOf("__saber__");
  else if (sheathed || !held) cur = ring.indexOf("__empty__");
  else {
    const i = ring.indexOf(held);
    cur = i >= 0 ? i : 0;
  }
  applyLoadout(cur + 1, xr);
}

function toggleSaber(xr) {
  saberOn = !saberOn;
  if (saberOn) {
    if (!dualSaber) dualSaber = makeDualSaber();
    if (xr && xr.on && xr.right) {
      xr.right.con.add(dualSaber);
      dualSaber.position.set(0, 0, 0);
    } else {
      camera.add(dualSaber);
      dualSaber.position.set(0.28, -0.16, -0.45);
    }
    if (viewWep) viewWep.visible = false;
    saberPrevTips = [null, null];
    setMsg("Dual saber");
  } else {
    if (dualSaber) dualSaber.removeFromParent();
    if (viewWep && !xrPresenting) viewWep.visible = true;
    setMsg("Saber sheathed");
  }
}

function tickSaber(xr, dt) {
  if (!saberOn || !dualSaber) return;
  const tips = dualSaber.userData.tips || [];
  dualSaber.updateMatrixWorld(true);
  const host = xr && xr.on && xr.right ? xr.right.con : dualSaber;
  for (let i = 0; i < tips.length; i++) {
    const local = new THREE.Vector3(0, 0, tips[i].z);
    const world = host.localToWorld ? host.localToWorld(local.clone()) : dualSaber.localToWorld(local.clone());
    const mapP = stage && xrPresenting ? stage.worldToLocal(world.clone()) : world.clone();
    const prev = saberPrevTips[i];
    if (prev) {
      const mid = mapP.clone().add(prev).multiplyScalar(0.5);
      const move = mapP.clone().sub(prev);
      if (move.length() > 0.02) {
        strikeFoes(foes, mid, move.clone().normalize(), 0.85, 16);
        if (sdf3(mapP.x, mapP.y, mapP.z, map, sdf2) > -0.08 || wallBlocked(map, mapP.x, mapP.z, mapP.y)) {
          addSaberMark(stage || scene, burns, mapP, move, tips[i].color);
        }
        smashAt(mapP, move, 1.2, 16);
        for (const f of foes) {
          if (!f.visible || f.userData.hp <= 0) continue;
          if (f.position.distanceTo(mapP) < 0.55 + (f.userData.hitR || 0.5)) {
            hurtFoe(f, 12, move);
            addSaberMark(stage || scene, burns, mapP, move, tips[i].color);
          }
        }
      }
    }
    saberPrevTips[i] = mapP.clone();
  }
}

function xrGrab(xr) {
  if (!xr.on) return;
  if (xr.menu) toggleVrMenu();
  if (vrMenuOpen) {
    tickVrMenu(xr);
    return;
  }
  if (xr.saberToggle) cycleLoadout(xr);
  if (xr.dash) return;
  if (xr.psy || xr.psyHeld) return;
  if (xr.reload) {
    const def = held && WEAPON_BY_ID[held];
    if (def && def.slot === "gun") {
      mag = def.mag;
      setMsg("Reloaded");
      hudBars();
    } else if (nearVendor()) openShop();
  }
  for (const h of [xr.left, xr.right]) {
    if (!h) continue;
    if (h.squeeze && !h.squeezePrev) {
      const n = nearNpc(npcs, player);
      if (n && !grabNearest(h)) {
        openTalk(n);
        continue;
      }
      const target = grabNearest(h);
      if (target && target.userData.phys) {
        target.userData.phys.held = true;
        h.con.attach(target);
        h.held = { kind: "phys", mesh: target };
        setMsg("Holding " + (target.userData.kind || "object"));
      } else if (target && target.userData.pickup) {
        const kind = target.userData.pickup;
        takePickup(target);
        if (WEAPON_BY_ID[kind] && (!held || sheathed)) {
          sheathed = false;
          setHeld(kind);
          attachHandWep(xr, kind);
        }
      } else {
        for (const p of pickups) {
          if (!p.visible) continue;
          if (h.pos.distanceTo(p.position) < 0.38) {
            const kind = p.userData.pickup;
            takePickup(p);
            if (WEAPON_BY_ID[kind] && (!held || sheathed)) {
              sheathed = false;
              setHeld(kind);
              attachHandWep(xr, kind);
            }
          }
        }
      }
    }
    if (!h.squeeze && h.squeezePrev && h.held) {
      if (h.held.kind === "phys" && h.held.mesh) {
        worldDrop(h.held.mesh, h.pos, h.vel);
      } else if (h.held.mesh) {
        h.held.mesh.removeFromParent();
        if (h.held.id) {
          const drop = makePickup(h.held.id);
          drop.position.copy(stage && xrPresenting ? stage.worldToLocal(h.pos.clone()) : h.pos);
          (stage || scene).add(drop);
          pickups.push(drop);
        }
      }
      h.held = null;
    }
    if (h.held && h.held.id && WEAPON_BY_ID[h.held.id]?.slot === "melee" && h.vel.length() > 4) {
      const at = stage && xrPresenting ? stage.worldToLocal(h.pos.clone()) : h.pos;
      const dir = h.vel.clone().normalize();
      strikeFoes(foes, at, dir, 1.4, WEAPON_BY_ID[h.held.id].dmg);
      smashAt(at, dir, 1.5, WEAPON_BY_ID[h.held.id].dmg);
    }
    if (h.held && h.held.id && WEAPON_BY_ID[h.held.id]?.slot === "gun" && h === xr.right && h.trigger && !h.triggerPrev) {
      setHeld(h.held.id);
      primary();
    }
  }
  if (saberOn) return;
  if (sheathed && xr.right && xr.right.trigger && !xr.right.triggerPrev) {
    placeRumble();
    return;
  }
  if (xr.right && xr.right.trigger && !xr.right.triggerPrev && held) primary();
}

function loop(time) {
  const dt = Math.min(0.05, clock.getDelta() || 0.016);
  if (swingT > 0) swingT -= dt;
  if (fireCd > 0) fireCd -= dt;
  if (hurtT > 0) hurtT -= dt;
  if (player.shield > 0) player.shield -= dt;
  $("hurt").style.opacity = hurtT > 0 ? String(Math.min(0.5, hurtT * 2)) : "0";
  const xr = hands && renderer ? tickXr(renderer, hands, dt) : { on: false };
  if (running && !dead) {
    physics(dt, xr);
    tickPhys(dt, xr);
    xrGrab(xr);
    tickFoes(foes, dt, player, map, sdf2, damage);
    tickRobots(foes, dt, player, map, sdf2, damage, stage || scene, shots, fireWeapon);
    tickShots(shots, dt, foes, extras, damage, (p, c) => addBurnDecal(stage || scene, burns, p, c), sdf3, map, sdf2);
    tickBurns(burns, dt);
    tickLoot(lootBits, dt, player, (L) => {
      if (L && L.id === "psyorb") {
        const before = player.psy | 0;
        player.psy = Math.min(1000, (player.psy || 0) + 1);
        if (runMode === "story") saveStoryPsy(player.psy);
        sfx("orb");
        if (before < 100 && player.psy >= 100) setMsg("Psybeam unlocked — hold X / cycle with G");
        else if (before < 150 && player.psy >= 150) setMsg("Magic carpet unlocked — cycle with G");
        else if (before < 200 && player.psy >= 200) setMsg("Psionic tide unlocked");
        else if (before < 250 && player.psy >= 250) setMsg("Mini black hole unlocked — hold X");
        else setMsg("Psypower " + (player.psy | 0));
      } else {
        player.coins = (player.coins | 0) + (typeof L === "number" ? L : L.value || 0);
      }
    });
    if (extras) {
      tickWorld(extras, dt, player, foes, damage, stage || scene, camera, map, sdf2);
      tickRubble(extras, dt);
      if (extras._warn) {
        setMsg(extras._warn);
        extras._warn = "";
      }
      if (extras.physQueue && extras.physQueue.length) {
        for (const m of extras.physQueue) physBodies.push(m);
        extras.physQueue.length = 0;
      }
    }
    if (map && map.sky) {
      const inSky = !!map.sky[cellI(map, player.x, player.z)];
      if (inSky) {
        scene.fog = null;
        if (skyTex) scene.background = skyTex;
        if (sun) sun.intensity = 1.55;
        if (hemi) hemi.intensity = 1.2;
        renderer.toneMappingExposure = 1.7;
      } else if (outdoor) {
        scene.fog = caveFog;
        scene.background = caveFog ? caveFog.color : scene.background;
        if (sun) sun.intensity = 0.15;
        if (hemi) hemi.intensity = 0.7;
        renderer.toneMappingExposure = 1.45;
      }
    }
    for (const s of spawners) {
      s._t -= dt;
      if (s._t <= 0 && (s._alive || 0) < (s.maxAlive || 3)) {
        s._t = s.interval || 6;
        const e = spawnFrom(s, map, sdf2, foes);
        if (e) {
          stage.add(e);
          s._alive++;
        }
      }
    }
    tickPickups(xr, dt);
    for (const n of npcs) tickNpcPose(n.mesh, performance.now() * 0.001);
    tickPsy(dt);
    tickSaber(xr, dt);
    if (psyCd > 0) psyCd = Math.max(0, psyCd - dt);
    if (xr && xr.on && xr.psyMode) cyclePsyMode();
    if (xr && xr.on && xr.dash) {
      psyCharging = false;
      psyCharge = 0;
    } else {
      tickPsyInput(xr, dt);
    }
    if (psyMode === "carpet" && (player.psy | 0) >= 150) {
      carpetOn = true;
      tickCarpet(dt, xr);
    }
    drawMinimap();
    hudBars();
  } else if (xrPresenting) {
    ensureLobby();
    tickLobby(xr);
  }
  if (xrPresenting) applyXrStage();
  if (renderer && scene) renderer.render(scene, camera);
}

function panelTex(title, lines, w = 512, h = 320) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#141018";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#c4a060";
  g.lineWidth = 8;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.strokeStyle = "#44d8ff";
  g.lineWidth = 2;
  g.strokeRect(16, 16, w - 32, h - 32);
  g.fillStyle = "#e8d090";
  g.font = "bold 36px serif";
  g.textAlign = "center";
  g.fillText(title, w / 2, 64);
  g.fillStyle = "#c8e8f0";
  g.font = "22px serif";
  (lines || []).forEach((ln, i) => g.fillText(ln, w / 2, 110 + i * 32));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ensureLobby() {
  if (lobby) {
    lobby.visible = true;
    return;
  }
  initThree();
  lobby = new THREE.Group();
  lobby.name = "lobby";
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(8, 32),
    new THREE.MeshLambertMaterial({ color: 0x3a2a18, emissive: 0x102028, emissiveIntensity: 0.35 }),
  );
  floor.rotation.x = -Math.PI / 2;
  lobby.add(floor);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.2, 8), new THREE.MeshLambertMaterial({ color: 0xc4a060 }));
    col.position.set(Math.cos(a) * 5.2, 1.6, Math.sin(a) * 5.2);
    lobby.add(col);
  }
  const story = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: panelTex("STORY", ["Sanctum of First Thought", "Psionics persist", "Gold does not"]) }));
  story.position.set(-1.2, 1.5, -2.4);
  story.userData.lobby = "story";
  const custom = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: panelTex("CUSTOM", ["Your maps", "Set start psy / gold", "Map maker on desktop"]) }));
  custom.position.set(1.2, 1.5, -2.4);
  custom.userData.lobby = "custom";
  lobby.add(story, custom);
  lobby.userData.hits = [story, custom];
  scene.add(lobby);
}

function tickLobby(xr) {
  if (!lobby || !lobby.visible) return;
  const hand = xr && xr.right;
  if (!hand || !hand.trigger || hand.triggerPrev) return;
  const origin = hand.pos.clone();
  const dir = tmp.set(0, 0, -1).applyQuaternion(hand.quat);
  const ray = new THREE.Raycaster(origin, dir, 0.05, 8);
  const hits = ray.intersectObjects(lobby.userData.hits, false);
  const hit = hits[0];
  if (!hit) return;
  const kind = hit.object.userData.lobby;
  if (kind === "story") {
    runMode = "story";
    const m = storyMaps()[0];
    if (m) enterMap(m.id);
  } else if (kind === "custom") {
    runMode = "custom";
    customStart.psy = Math.max(0, Math.min(1000, +($("custom-psy")?.value || 20)));
    customStart.gold = Math.max(0, Math.min(99999, +($("custom-gold")?.value || 0)));
    const baked = bakedMaps()[0];
    if (baked) enterMap(baked.id);
  }
}

function cardCanvas(m) {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 160;
  const g = c.getContext("2d");
  g.fillStyle = "#120e0c";
  g.fillRect(0, 0, 160, 160);
  const s = 160 / m.w;
  for (let z = 0; z < m.h; z++) {
    for (let x = 0; x < m.w; x++) {
      const b = m.cells[z * m.w + x];
      if (b & 1) {
        g.fillStyle = BIOMES[(b >> 3) & 15]?.swatch || "#888";
        g.fillRect(x * s, z * s, s + 0.5, s + 0.5);
      }
    }
  }
  return c.toDataURL();
}

function fillCards(host, maps, mode) {
  if (!host) return;
  host.innerHTML = "";
  for (const m of maps) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "card";
    el.innerHTML = `<img alt="" /><span>${m.name}</span>`;
    el.querySelector("img").src = cardCanvas(m);
    el.addEventListener("click", () => {
      runMode = mode;
      if (mode === "custom") {
        customStart.psy = Math.max(0, Math.min(1000, +($("custom-psy")?.value || 20)));
        customStart.gold = Math.max(0, +($("custom-gold")?.value || 0));
      }
      enterMap(m.id);
    });
    host.appendChild(el);
  }
}

function setMenuTab(which) {
  runMode = which === "custom" ? "custom" : "story";
  if ($("tab-story")) $("tab-story").classList.toggle("on", which === "story");
  if ($("tab-custom")) $("tab-custom").classList.toggle("on", which === "custom");
  if ($("story-pane")) $("story-pane").hidden = which !== "story";
  if ($("custom-pane")) $("custom-pane").hidden = which !== "custom";
}

async function showList() {
  initThree();
  if ($("story-psy")) $("story-psy").textContent = String(loadStoryPsy());
  fillCards($("story-maps"), storyMaps(), "story");
  const baked = bakedMaps();
  let extra = [];
  try {
    extra = await listMaps();
  } catch {}
  const seen = new Set(baked.map((m) => m.id));
  const all = baked.concat(extra.filter((m) => !seen.has(m.id)));
  fillCards($("maps"), all, "custom");
  if ($("to-maps")) $("to-maps").href = routes().maps;
  setMenuTab("story");
  const q = new URLSearchParams(location.search).get("map");
  if (q === "proc") {
    runMode = "custom";
    enterMap("proc");
  } else if (q) {
    runMode = storyMaps().some((m) => m.id === q) ? "story" : "custom";
    enterMap(q);
  }
}

addEventListener("keydown", (e) => {
  sfxUnlock();
  keys.add(e.code);
  if (e.code === "Space") e.preventDefault();
  if (e.repeat) return;
  if (e.code === "Space") jumpQueued = true;
  if (e.code === "KeyI" || e.code === "Tab") {
    e.preventDefault();
    if ($("start") && !$("start").hidden) return;
    const hide = !$("inv").hidden;
    $("inv").hidden = hide;
    if (!hide) renderInv();
  }
  if (e.code === "KeyB") cycleLoadout(hands && renderer ? { on: xrPresenting, right: hands.find((h) => h.handed === "right") } : { on: false });
  if (e.code === "KeyG") cyclePsyMode();
  if (e.code === "KeyR") {
    const def = held && WEAPON_BY_ID[held];
    if (def && def.slot === "gun") {
      mag = def.mag;
      setMsg("Reloaded");
      hudBars();
    }
  }
  if (e.code === "KeyE") {
    if (talk) { closeTalk(); return; }
    const n = nearNpc(npcs, player);
    if (n) { openTalk(n); return; }
    tryUnlock(extras || { doors: [] }, player, inv.filter((i) => i.id === "key").map((i) => i.keyId));
    if (nearVendor()) openShop();
  }
  if (e.code === "Escape" && $("shop") && !$("shop").hidden) $("shop").hidden = true;
  const num = e.code.match(/^Digit([1-8])$/);
  if (num) {
    const w = WEAPONS[+num[1] - 1];
    if (w && (held === w.id || inv.some((i) => i.id === w.id))) setHeld(w.id);
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
$("again").addEventListener("click", () => {
  $("dead").hidden = true;
  if (map) enterMap(map.id.startsWith("proc") ? "proc" : map.id);
});
$("dead-menu").addEventListener("click", () => {
  $("dead").hidden = true;
  $("hud").hidden = true;
  if ($("hud-vr")) $("hud-vr").hidden = true;
  $("start").hidden = false;
  running = false;
  if ($("story-psy")) $("story-psy").textContent = String(loadStoryPsy());
  if (lobby) lobby.visible = xrPresenting;
  clearWorld();
});
if ($("go-proc")) $("go-proc").addEventListener("click", () => {
  runMode = "custom";
  customStart.psy = Math.max(0, Math.min(1000, +($("custom-psy")?.value || 20)));
  customStart.gold = Math.max(0, +($("custom-gold")?.value || 0));
  enterMap("proc");
});
if ($("tab-story")) $("tab-story").addEventListener("click", () => setMenuTab("story"));
if ($("tab-custom")) $("tab-custom").addEventListener("click", () => setMenuTab("custom"));
$("inv-close").addEventListener("click", () => ($("inv").hidden = true));
if ($("shop-close")) $("shop-close").addEventListener("click", () => ($("shop").hidden = true));

function openTalk(n, node) {
  talk = { npc: n, node: node || { opener: n.opener, options: n.options || [] } };
  sfx("talk");
  const host = $("talk");
  if (!host) return;
  host.hidden = false;
  $("talk-name").textContent = n.name || "NPC";
  $("talk-line").textContent = talk.node.opener || talk.node.reply || "";
  const box = $("talk-opts");
  box.innerHTML = "";
  const opts = (talk.node.options || []).filter((o) => o.text).slice(0, 3);
  opts.forEach((op) => {
    const b = document.createElement("button");
    b.textContent = op.text;
    b.onclick = () => {
      const next = { opener: op.reply, reply: op.reply, options: op.options || [] };
      if ((op.options || []).some((x) => x.text)) openTalk(n, next);
      else {
        $("talk-line").textContent = op.reply || "";
        box.innerHTML = "";
        const done = document.createElement("button");
        done.textContent = "Leave";
        done.onclick = closeTalk;
        box.appendChild(done);
      }
    };
    box.appendChild(b);
  });
  if (!opts.length) {
    const done = document.createElement("button");
    done.textContent = "Leave";
    done.onclick = closeTalk;
    box.appendChild(done);
  }
  try { controls.unlock(); } catch {}
}

function closeTalk() {
  talk = null;
  if ($("talk")) $("talk").hidden = true;
  if (running && !dead && !xrPresenting) try { controls.lock(); } catch {}
}

function nearVendor() {
  if (!extras || !extras.vendors) return null;
  for (const v of extras.vendors) {
    if (Math.hypot(player.x - v.x, player.z - v.z) < 2.4) return v;
  }
  return null;
}

function openShop() {
  const host = $("shop-list");
  if (!host) return;
  try {
    controls.unlock();
  } catch {}
  host.innerHTML = "";
  $("shop-gold").textContent = String(player.coins | 0);
  SHOP.forEach((it) => {
    const b = document.createElement("button");
    b.textContent = it.name + " — " + it.cost + "◎";
    b.addEventListener("click", () => buyItem(it));
    host.appendChild(b);
  });
  $("shop").hidden = false;
}

function buyItem(it) {
  if ((player.coins | 0) < it.cost) {
    setMsg("Not enough gold");
    return;
  }
  player.coins -= it.cost;
  saveGold(player.coins);
  if (it.kind === "weapon") {
    rememberWeapon(it.id);
    if (!held) setHeld(it.id);
    else inv.push({ id: it.id, name: it.name, cat: "weapon" });
    setMsg("Bought " + it.name);
  } else if (it.kind === "ammo" || it.id === "ammo") {
    const def = held && WEAPON_BY_ID[held];
    if (def && def.slot === "gun") mag = def.mag;
    else inv.push({ id: "ammo", name: "Ammo crate", cat: "item" });
    setMsg("Ammo");
  } else if (it.id === "haste") {
    player.haste = 20;
    setMsg("Haste");
  } else if (it.id === "rage") {
    player.rage = 20;
    setMsg("Rage");
  } else if (it.id === "heal") {
    player.hp = 100;
    setMsg("Healed");
  } else {
    useItem({ id: it.id, name: it.name });
  }
  hudBars();
  if ($("shop-gold")) $("shop-gold").textContent = String(player.coins | 0);
}

showList();
