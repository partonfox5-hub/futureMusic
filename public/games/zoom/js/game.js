import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { BIOMES, CELL, EYE, LIQ_LAVA, LIQ_WATER, PICKUP_BY_ID, SHOP, WEAPON_BY_ID, WEAPONS, routes } from "./config.js";
import { bakedMaps } from "./defaults.js";
import { biomeOf, cellI, countCarved, ensureLayers, firstCarved, floorY, sdf3 } from "./map.js";
import { buildDungeon, prepareSdf } from "./mesh.js";
import { makeProp, spawnFrom, strikeFoes, tickFoes } from "./props.js";
import { getMap, listMaps } from "./store.js";
import { makeProc } from "./proc.js";
import { breakWindows, buildingFloorY, buildWorld, climbSupport, hurtTurrets, makeSky, shatterCracked, tickRubble, tickWorld, tryUnlock, wallBlocked } from "./world.js";
import { addBurnDecal, addSaberMark, fireWeapon, hurtFoe, makeDualSaber, makeKeyModel, makePickup, makeWeapon, setKillHook, tickBurns, tickShots } from "./weapons.js";
import { tickRobots } from "./robots.js";
import { attachXr, tickXr } from "./xr.js";
import { loadGold, lootForEnemy, makeWristGold, paintWristGold, saveGold, showerLoot, tickLoot } from "./loot.js";

const $ = (id) => document.getElementById(id);
const keys = new Set();
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const lookEuler = new THREE.Euler();

let renderer, scene, camera, clock, controls, hands, stage;
let map, sdf2, dungeon, extras;
let player = { x: 0, y: 1.6, z: 0, vx: 0, vy: 0, vz: 0, hp: 100, grounded: false, crouch: false, skate: false, fuel: 0, shield: 0, coins: 0, jumps: 2, dashT: 0, dashCd: 0, haste: 0, rage: 0 };
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
let viewWep, flashlight;
let dualSaber = null;
let saberOn = false;
let psyCd = 0;
let psyWaves = [];
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
    "PSY " +
    (saberOn ? "SABER " : "");
  if ($("goldv")) $("goldv").textContent = String(player.coins | 0);
  paintWristGold(wristGold, player.coins);
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
    showerLoot(root, lootBits, f.position.x, f.position.y, f.position.z, kinds);
  });
  $("c").addEventListener("click", () => {
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
    if ($("hud")) $("hud").hidden = false;
    if (wristGold && hands[0]) {
      wristGold.removeFromParent();
      wristGold.position.set(0, -0.06, 0.08);
      wristGold.scale.set(0.18, 0.045, 1);
      hands[0].grip.add(wristGold);
    }
    applyXrStage();
    if (!running) {
      const first = bakedMaps()[0];
      enterMap(first ? first.id : "proc");
    }
  } else if (wristGold) {
    wristGold.removeFromParent();
    wristGold.position.set(-0.22, -0.26, -0.42);
    wristGold.scale.set(0.28, 0.07, 1);
    if (camera) camera.add(wristGold);
    if (stage) stage.position.set(0, 0, 0);
  }
}

function applyXrStage() {
  if (!xrPresenting || !stage) return;
  const eye = player.crouch ? 0.9 : EYE;
  const floor = (player.y || EYE) - eye;
  const c = Math.cos(yawOffset);
  const s = Math.sin(yawOffset);
  stage.rotation.y = yawOffset;
  stage.position.set(
    -(player.x || 0) * c + (player.z || 0) * s,
    -floor,
    -(player.x || 0) * s - (player.z || 0) * c,
  );
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
  player.coins = loadGold();
  player.jumps = 2;
  player.dashT = 0;
  player.dashCd = 0;
  player.haste = 0;
  player.rage = 0;
  inv = [];
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
  let m = id === "proc" ? makeProc() : bakedMaps().find((x) => x.id === id);
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

function primary() {
  const def = held && WEAPON_BY_ID[held];
  if (!def) {
    swingT = 0.28;
    const dir = tmp.set(0, 0, -1).applyQuaternion(camera.quaternion);
    strikeFoes(foes, camera.getWorldPosition(tmp2), dir, 2.2, 12);
    return;
  }
  if (def.slot === "melee") {
    if (swingT > 0) return;
    swingT = def.rate || 0.35;
    const dir = tmp.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.getWorldPosition(tmp2);
    strikeFoes(foes, origin, dir, def.reach || 2.2, def.dmg * (player.rage > 0 ? 1.5 : 1));
    if (extras) {
      breakWindows(extras, origin, dir, def.reach || 2.2);
      hurtTurrets(extras, origin.clone().addScaledVector(dir, 1.1), def.dmg);
    }
    return;
  }
  if (fireCd > 0) return;
  if (mag <= 0) {
    setMsg("Empty — R reload (or A/X on the other hand in VR)");
    return;
  }
  mag--;
  fireCd = 1 / (def.rpm || 2);
  const origin = camera.getWorldPosition(tmp2).add(tmp.set(0, -0.08, -0.4).applyQuaternion(camera.quaternion));
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  fireWeapon(def, origin, dir, stage || scene, shots);
  hudBars();
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
  dead = true;
  running = false;
  try {
    controls.unlock();
  } catch {}
  $("dead").hidden = false;
  $("dead-reason").textContent = "You were " + (why || "taken") + ".";
}

function takePickup(p) {
  const kind = p.userData.pickup;
  const def = PICKUP_BY_ID[kind];
  if (kind === "key") {
    inv.push({ id: "key", keyId: p.userData.keyId, name: "Key " + p.userData.keyId });
    setMsg("Picked up a key");
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
    if (!held) setHeld(kind);
    else inv.push({ id: kind, name: WEAPON_BY_ID[kind].name, cat: "weapon" });
    setMsg(WEAPON_BY_ID[kind].name);
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
  if (xr && xr.on && Math.abs(xr.lookX) > 0.12) {
    const mag = Math.min(1, Math.abs(xr.lookX));
    yawOffset -= Math.sign(xr.lookX) * mag * mag * dt * 2.35;
  }
  const moveYaw = xr && xr.on ? yaw + yawOffset : yaw;
  const forward = tmp.set(-Math.sin(moveYaw), 0, -Math.cos(moveYaw));
  const right = tmp2.set(Math.cos(moveYaw), 0, -Math.sin(moveYaw));
  let wx = 0;
  let wz = 0;
  if (xr && xr.on) {
    wx += forward.x * -(xr.moveY || 0) + right.x * (xr.moveX || 0);
    wz += forward.z * -(xr.moveY || 0) + right.z * (xr.moveX || 0);
    player.skate = xr.skate;
    player.crouch = keys.has("KeyC");
    if (xr.jump) jumpQueued = true;
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
  let spd = player.crouch ? 2.2 : keys.has("ShiftLeft") || keys.has("ShiftRight") ? 7.2 : 4.6;
  if (player.skate && player.grounded) spd *= 2.5;
  if (player.haste > 0) spd *= 1.45;
  if (player.dashT > 0) spd *= 4;
  if (len > 0) {
    wx = (wx / len) * spd;
    wz = (wz / len) * spd;
  } else {
    wx = 0;
    wz = 0;
  }
  const eye = player.crouch ? 0.9 : EYE;
  const bodyY = player.y - eye * 0.4;
  function blocked(x, y, z) {
    if (wallBlocked(map, x, z, y)) return true;
    return sdf3(x, y, z, map, sdf2) > -0.18;
  }
  function walkOk(x, y, z) {
    if (wallBlocked(map, x, z, y)) return false;
    if (sdf3(x, y, z, map, sdf2) < -0.18 && sdf3(x, player.y - eye + 0.2, z, map, sdf2) < -0.18) return true;
    const below = floorY(x, z, map, sdf2, player.y + 3);
    return below > -500 && player.y - eye > below + 0.35;
  }
  const GRAV = 24;
  const jet = player.fuel > 0 && !rope && ((xr && xr.jet) || keys.has("KeyF") || (keys.has("Space") && !player.grounded && !jumpQueued));

  if (!rope) {
    const nx = player.x + wx * dt;
    const nz = player.z + wz * dt;
    if (walkOk(nx, bodyY, player.z)) {
      player.x = nx;
      player.vx = wx;
    } else player.vx *= 0.2;
    if (walkOk(player.x, bodyY, nz)) {
      player.z = nz;
      player.vz = wz;
    } else player.vz *= 0.2;
  }

  if (rope) {
    if (jumpQueued || (xr && xr.jet)) {
      player.vy += 5.2;
      player.vx += wx * 0.35;
      player.vz += wz * 0.35;
      rope = null;
      player.grounded = false;
      jumpQueued = false;
      setMsg("");
    } else {
      const ax = rope.x;
      const ay = rope.top;
      const az = rope.z;
      const L = rope.hang || Math.min(2.7, rope.len - 0.1);
      player.vx += wx * 2.8 * dt;
      player.vz += wz * 2.8 * dt;
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
      player.vx = (player.vx - vr * dx) * 0.992;
      player.vy = player.vy - vr * dy;
      player.vz = (player.vz - vr * dz) * 0.992;
      player.grounded = false;
    }
  } else {
    if (jumpQueued && !(xr && xr.on && xr.jet && player.fuel > 0)) {
      if (coyote > 0) player.jumps = 2;
      if (player.jumps > 0) {
        player.vy = player.jumps === 2 ? 9.62 : 8.4;
        player.jumps -= 1;
        player.grounded = false;
        coyote = 0;
        jumpQueued = false;
      }
    }
    if (jet) {
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
    if (extras) {
      for (const r of extras.ropes) {
        const horiz = Math.hypot(player.x - r.x, player.z - r.z);
        if (horiz < 0.9 && player.y < r.top && player.y > r.y0 - 0.2) {
          if (!player.grounded || keys.has("KeyE") || (xr && xr.left && xr.left.squeeze)) {
            rope = r;
            rope.hang = Math.min(Math.max(0.85, r.top - player.y), r.len - 0.12);
            jumpQueued = false;
            setMsg("Swinging — WASD to pump, Space to leap off");
            break;
          }
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
    const crossed = prevFeet >= ground - 0.08 && feet <= ground + 0.38;
    const buried = feet < ground + 0.02;
    if (crossed || buried) {
      player.y = ground + eye;
      if (player.vy < 0) player.vy = 0;
      player.grounded = true;
      player.jumps = 2;
      coyote = 0.16;
    } else if (!(climb && climb.kind === "ladder")) {
      player.grounded = false;
      coyote = Math.max(0, coyote - dt);
    }
  } else if (!rope && !(climb && climb.kind === "ladder")) {
    player.grounded = false;
    coyote = Math.max(0, coyote - dt);
  }
  if (!rope) {
    for (let i = 0; i < 10; i++) {
      const fy = player.y - eye + 0.12;
      if (sdf3(player.x, fy, player.z, map, sdf2) < -0.06) break;
      player.y += 0.08;
      player.vy = Math.max(0, player.vy);
    }
  }
  if (player.y < -18) die("fell");

  const ci = cellI(map, player.x, player.z);
  const feetY = player.y - eye;
  if (map.flags && map.flags[ci] & 1 && player.grounded && feetY < ground + 0.4) die("impaled");
  if (map.liquid && map.liquid[ci] === LIQ_LAVA) damage(18 * dt, "burned in lava");
  if (map.liquid && map.liquid[ci] === LIQ_WATER && player.grounded) {
    player.vx *= 0.85;
    player.vz *= 0.85;
  }

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

function tickPickups(xr) {
  const eye = player.crouch ? 0.9 : EYE;
  const handsList = xr && xr.on ? [xr.left, xr.right].filter(Boolean) : [];
  for (const p of pickups) {
    if (!p.visible || p.userData.taken) continue;
    p.rotation.y += 0.03;
    const dx = p.position.x - player.x;
    const dy = p.position.y - (player.y - eye * 0.45);
    const dz = p.position.z - player.z;
    let hit = Math.hypot(dx, dz) < 0.95 && Math.abs(dy) < 1.35;
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
    const bits = shatterCracked(extras, map, pos, r + 0.35, stage || scene);
    for (const b of bits) {
      if (b.userData.phys) physBodies.push(b);
      else if (b.userData.flash) psyWaves.push({ mesh: b, dir: new THREE.Vector3(), speed: 0, life: 0.2, r: 0, hit: new Set(), dummy: true });
    }
  }
}

function firePsy(xr) {
  if (psyCd > 0) return;
  psyCd = 0.42;
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, 0, -1);
  if (xr && xr.on && xr.right) {
    origin.copy(xr.right.pos);
    dir.copy(tmp.set(0, 0, -1).applyQuaternion(xr.right.quat));
  } else {
    camera.getWorldPosition(origin);
    dir.applyQuaternion(camera.quaternion);
  }
  if (stage && xrPresenting) {
    origin.copy(stage.worldToLocal(origin.clone()));
    const p2 = stage.worldToLocal(xr && xr.right ? xr.right.pos.clone().add(dir) : camera.position.clone().add(dir));
    dir.copy(p2.sub(origin)).normalize();
  }
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.16 + i * 0.04, 0.022, 8, 28),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0x66eeff : 0xb388ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.scale.set(1.45, 0.42, 1);
    ring.position.copy(origin).addScaledVector(dir, 0.15 + i * 0.08);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    (stage || scene).add(ring);
    psyWaves.push({ mesh: ring, dir: dir.clone(), speed: 11 + i * 1.4, life: 0.55, r: 0.35 + i * 0.08, hit: new Set() });
  }
  setMsg("Psyblast");
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
    } else {
      w.mesh.scale.set(1.45 + (0.55 - w.life) * 2.2, 0.42, 1 + (0.55 - w.life) * 1.4);
      flingAt(w.mesh.position, w.dir, w.r, 9.5, 14, w.hit);
    }
    if (w.life <= 0) {
      w.mesh.removeFromParent();
      psyWaves.splice(i, 1);
    }
  }
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
  if (xr.saberToggle) toggleSaber(xr);
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
      const target = grabNearest(h);
      if (target && target.userData.phys) {
        target.userData.phys.held = true;
        h.con.attach(target);
        h.held = { kind: "phys", mesh: target };
        setMsg("Holding " + (target.userData.kind || "object"));
      } else if (target && target.userData.pickup) {
        takePickup(target);
        if (WEAPON_BY_ID[target.userData.pickup]) {
          const w = makeWeapon(target.userData.pickup);
          h.con.add(w);
          h.held = { id: target.userData.pickup, mesh: w, kind: "wep" };
        }
      } else {
        for (const p of pickups) {
          if (!p.visible) continue;
          if (h.pos.distanceTo(p.position) < 0.38) {
            takePickup(p);
            if (WEAPON_BY_ID[p.userData.pickup]) {
              const w = makeWeapon(p.userData.pickup);
              h.con.add(w);
              h.held = { id: p.userData.pickup, mesh: w, kind: "wep" };
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
      strikeFoes(foes, at, h.vel.clone().normalize(), 1.4, WEAPON_BY_ID[h.held.id].dmg);
    }
    if (h.held && h.held.id && WEAPON_BY_ID[h.held.id]?.slot === "gun" && h.trigger && !h.triggerPrev) {
      setHeld(h.held.id);
      primary();
    }
  }
  if (xr.dash) return;
  if (saberOn) return;
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
    tickLoot(lootBits, dt, player, (n) => {
      player.coins = (player.coins | 0) + n;
      saveGold(player.coins);
    });
    if (extras) {
      tickWorld(extras, dt, player, foes, damage, stage || scene, camera, map, sdf2);
      tickRubble(extras, dt);
      if (extras._warn) {
        setMsg(extras._warn);
        extras._warn = "";
      }
      const origin = camera.getWorldPosition(tmp2);
      const dir = tmp.set(0, 0, -1).applyQuaternion(camera.quaternion);
      if (shots.length) breakWindows(extras, origin, dir, 18);
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
    tickPickups(xr);
    tickPsy(dt);
    tickSaber(xr, dt);
    if (psyCd > 0) psyCd = Math.max(0, psyCd - dt);
    if ((xr && xr.on && xr.psyHeld && psyCd <= 0) || keys.has("KeyX") && psyCd <= 0) firePsy(xr);
    drawMinimap();
    hudBars();
  }
  if (xrPresenting) applyXrStage();
  if (renderer && scene) renderer.render(scene, camera);
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

async function showList() {
  initThree();
  const host = $("maps");
  host.innerHTML = "";
  const baked = bakedMaps();
  let extra = [];
  try {
    extra = await listMaps();
  } catch {}
  const seen = new Set(baked.map((m) => m.id));
  const all = baked.concat(extra.filter((m) => !seen.has(m.id)));
  const q = new URLSearchParams(location.search).get("map");
  for (const m of all) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "card";
    el.innerHTML = `<img alt="" /><span>${m.name}</span>`;
    el.querySelector("img").src = cardCanvas(m);
    el.addEventListener("click", () => enterMap(m.id));
    host.appendChild(el);
  }
  $("to-maps").href = routes().maps;
  if (q === "proc") enterMap("proc");
  else if (q) enterMap(q);
}

addEventListener("keydown", (e) => {
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
  if (e.code === "KeyB") toggleSaber(hands && renderer ? { on: xrPresenting, right: hands.find((h) => h.handed === "right") } : { on: false });
  if (e.code === "KeyX") firePsy(hands && renderer ? { on: xrPresenting, right: hands.find((h) => h.handed === "right") } : { on: false });
  if (e.code === "KeyR") {
    const def = held && WEAPON_BY_ID[held];
    if (def && def.slot === "gun") {
      mag = def.mag;
      setMsg("Reloaded");
      hudBars();
    }
  }
  if (e.code === "KeyE") {
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
  clearWorld();
});
$("go-proc").addEventListener("click", () => enterMap("proc"));
$("inv-close").addEventListener("click", () => ($("inv").hidden = true));
if ($("shop-close")) $("shop-close").addEventListener("click", () => ($("shop").hidden = true));

function nearVendor() {
  if (!extras || !extras.vendors) return null;
  for (const v of extras.vendors) {
    if (Math.hypot(player.x - v.x, player.z - v.z) < 1.85) return v;
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
