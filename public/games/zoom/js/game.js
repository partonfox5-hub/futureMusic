import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { BIOMES, CELL, EYE, LIQ_LAVA, LIQ_WATER, PICKUP_BY_ID, WEAPON_BY_ID, WEAPONS, routes } from "./config.js";
import { bakedMaps } from "./defaults.js";
import { biomeOf, cellI, countCarved, ensureLayers, firstCarved, floorY, sdf3 } from "./map.js";
import { buildDungeon, prepareSdf } from "./mesh.js";
import { makeProp, spawnFrom, strikeFoes, tickFoes } from "./props.js";
import { getMap, listMaps } from "./store.js";
import { makeProc } from "./proc.js";
import { breakWindows, buildingFloorY, buildWorld, climbSupport, hurtTurrets, makeSky, tickRubble, tickWorld, tryUnlock, wallBlocked } from "./world.js";
import { addBurnDecal, fireWeapon, makeKeyModel, makePickup, makeWeapon, tickBurns, tickShots } from "./weapons.js";
import { tickRobots } from "./robots.js";
import { attachXr, tickXr } from "./xr.js";

const $ = (id) => document.getElementById(id);
const keys = new Set();
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const lookEuler = new THREE.Euler();

let renderer, scene, camera, clock, controls, hands;
let map, sdf2, dungeon, extras;
let player = { x: 0, y: 1.6, z: 0, vx: 0, vy: 0, vz: 0, hp: 100, grounded: false, crouch: false, skate: false, fuel: 0, shield: 0 };
let jumpQueued = false;
let coyote = 0;
let foes = [];
let spawners = [];
let torchLights = [];
let pickups = [];
let shots = [];
let burns = [];
let inv = [];
let held = null;
let mag = 0;
let fireCd = 0;
let swingT = 0;
let rope = null;
let running = false;
let dead = false;
let hurtT = 0;
let yaw = 0;
let viewWep, flashlight;
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
  $("mode").textContent = (player.skate ? "SKATE " : "") + (player.crouch ? "CROUCH " : "") + (player.fuel > 0 ? "JET " : "");
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
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.setClearColor(0x1a1814, 1);
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
  hands = attachXr(renderer, scene);
  renderer.setAnimationLoop(loop);
  $("c").addEventListener("click", () => {
    if (!$("start").hidden || dead || !$("inv").hidden) return;
    if (!controls.isLocked) controls.lock();
    else primary();
  });
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function clearWorld() {
  if (dungeon) {
    scene.remove(dungeon);
    dungeon.traverse((o) => o.geometry && o.geometry.dispose());
    dungeon = null;
  }
  for (const L of torchLights) scene.remove(L);
  torchLights = [];
  for (const f of foes) scene.remove(f);
  foes = [];
  for (const p of pickups) scene.remove(p);
  pickups = [];
  shots = [];
  extras = null;
}

function placeWorld() {
  for (const o of map.objects || []) {
    const g = makeProp(o.kind, o.s || 1);
    const y = Math.max(0, floorY(o.x, o.z, map, sdf2));
    g.position.set(o.x, y, o.z);
    dungeon.add(g);
    if (g.userData.lightColor) {
      const L = new THREE.PointLight(g.userData.lightColor, 1.1, 8, 2);
      L.position.set(o.x, y + 1.1, o.z);
      scene.add(L);
      torchLights.push(L);
    }
  }
  for (const p of map.pickups || []) {
    const g = makePickup(p.kind);
    const y = Math.max(0, floorY(p.x, p.z, map, sdf2));
    g.position.set(p.x, y + 0.35, p.z);
    scene.add(g);
    pickups.push(g);
  }
  for (const k of map.keys || []) {
    const g = new THREE.Group();
    g.add(makeKeyModel());
    g.userData.pickup = "key";
    g.userData.keyId = k.id;
    const y = Math.max(0, floorY(k.x, k.z, map, sdf2));
    g.position.set(k.x, y + 0.45, k.z);
    scene.add(g);
    pickups.push(g);
  }
  extras = buildWorld(map, dungeon, scene);
}

function placePlayer() {
  let x = map.start?.x;
  let z = map.start?.z;
  yaw = map.start?.yaw || 0;
  if (x == null || floorY(x, z, map, sdf2) < 0) {
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
  inv = [];
  setHeld(null);
  camera.position.set(player.x, player.y, player.z);
  camera.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, "YXZ"));
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
  scene.add(dungeon);
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
      scene.add(e);
      s._alive++;
    }
  }
  if (!placePlayer()) {
    setMsg("No walkable space.");
    return;
  }
  $("start").hidden = true;
  $("hud").hidden = false;
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
    strikeFoes(foes, origin, dir, def.reach || 2.2, def.dmg);
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
  fireWeapon(def, origin, dir, scene, shots);
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
  if (xr && xr.on && Math.abs(xr.lookX) > 0.25) {
    yaw -= xr.lookX * dt * 1.8;
    camera.quaternion.setFromEuler(lookEuler.set(look.x, yaw, 0, "YXZ"));
  }
  const forward = tmp.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = tmp2.set(Math.cos(yaw), 0, -Math.sin(yaw));
  let wx = 0;
  let wz = 0;
  if (xr && xr.on) {
    wx += forward.x * -(xr.moveY || 0) + right.x * (xr.moveX || 0);
    wz += forward.z * -(xr.moveY || 0) + right.z * (xr.moveX || 0);
    player.skate = xr.skate;
    player.crouch = keys.has("KeyC");
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
  const len = Math.hypot(wx, wz);
  let spd = player.crouch ? 2.2 : keys.has("ShiftLeft") || keys.has("ShiftRight") ? 7.2 : 4.6;
  if (player.skate && player.grounded) spd *= 2.5;
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
  const GRAV = 24;
  const jet = player.fuel > 0 && !rope && ((xr && xr.jet) || keys.has("KeyF") || (keys.has("Space") && !player.grounded && !jumpQueued));

  if (!rope) {
    const nx = player.x + wx * dt;
    const nz = player.z + wz * dt;
    if (!blocked(nx, bodyY, player.z) && !blocked(nx, player.y - eye + 0.2, player.z)) {
      player.x = nx;
      player.vx = wx;
    } else player.vx *= 0.2;
    if (!blocked(player.x, bodyY, nz) && !blocked(player.x, player.y - eye + 0.2, nz)) {
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
    if (coyote > 0 && jumpQueued && !(xr && xr.on && xr.jet)) {
      player.vy = 7.4;
      player.grounded = false;
      coyote = 0;
      jumpQueued = false;
    }
    if (jet) {
      player.vy += 26 * dt;
      player.fuel = Math.max(0, player.fuel - dt);
      if (player.vy > 9) player.vy = 9;
    } else player.vy -= GRAV * dt;
    player.y += player.vy * dt;
    if (player.vy > 0 && blocked(player.x, player.y + 0.12, player.z)) player.vy = 0;
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
  const fy = floorY(player.x, player.z, map, sdf2);
  const bf = buildingFloorY(map, player.x, player.z, player.y);
  let ground = -1;
  if (fy >= 0) ground = fy;
  if (bf >= 0) ground = Math.max(ground, bf);
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
  if (!rope && ground >= 0 && player.y - eye <= ground + 0.08 && player.vy <= 0.4) {
    player.y = ground + eye;
    player.vy = 0;
    player.grounded = true;
    coyote = 0.12;
  } else if (!rope && !(climb && climb.kind === "ladder")) {
    player.grounded = false;
    coyote = Math.max(0, coyote - dt);
    if (coyote <= 0) jumpQueued = false;
  }
  if (player.y < -14) die("fell");

  const ci = cellI(map, player.x, player.z);
  const feetY = player.y - eye;
  if (map.flags && map.flags[ci] & 1 && player.grounded && feetY < ground + 0.4) die("impaled");
  if (map.liquid && map.liquid[ci] === LIQ_LAVA) damage(18 * dt, "burned in lava");
  if (map.liquid && map.liquid[ci] === LIQ_WATER && player.grounded) {
    player.vx *= 0.85;
    player.vz *= 0.85;
  }

  if (tryUnlock(extras || { doors: [] }, player, inv.filter((i) => i.id === "key").map((i) => i.keyId))) setMsg("Unlocked");

  camera.position.set(player.x, player.y, player.z);
  if (viewWep && swingT > 0) {
    const a = Math.sin((1 - swingT / 0.4) * Math.PI);
    viewWep.rotation.x = -a * 0.8;
  } else if (viewWep) viewWep.rotation.x = 0;
}

function tickPickups() {
  for (const p of pickups) {
    if (!p.visible || p.userData.taken) continue;
    p.rotation.y += 0.03;
    if (p.position.distanceTo(camera.position) < 1.35) takePickup(p);
  }
}

function xrGrab(xr) {
  if (!xr.on) return;
  for (const h of [xr.left, xr.right]) {
    if (!h) continue;
    if (h.squeeze && !h.squeezePrev) {
      for (const p of pickups) {
        if (!p.visible) continue;
        if (h.pos.distanceTo(p.position) < 0.38) {
          takePickup(p);
          if (WEAPON_BY_ID[p.userData.pickup]) {
            const w = makeWeapon(p.userData.pickup);
            h.con.add(w);
            h.held = { id: p.userData.pickup, mesh: w };
          }
        }
      }
    }
    if (!h.squeeze && h.squeezePrev && h.held) {
      h.held.mesh.removeFromParent();
      const drop = makePickup(h.held.id);
      drop.position.copy(h.pos);
      scene.add(drop);
      pickups.push(drop);
      h.held = null;
    }
    if (h.held && WEAPON_BY_ID[h.held.id]?.slot === "melee" && h.vel.length() > 4) {
      strikeFoes(foes, h.pos, h.vel.clone().normalize(), 1.4, WEAPON_BY_ID[h.held.id].dmg);
    }
    if (h.held && WEAPON_BY_ID[h.held.id]?.slot === "gun" && h.trigger && !h.triggerPrev) {
      const other = h === xr.left ? xr.right : xr.left;
      setHeld(h.held.id);
      primary();
    }
    if (h.ax && !h.axPrev) {
      const other = h === xr.left ? xr.right : xr.left;
      if (other && other.held && WEAPON_BY_ID[other.held.id]?.slot === "gun" && other.pos.distanceTo(h.pos) < 0.28) {
        mag = WEAPON_BY_ID[other.held.id].mag;
        setMsg("Reloaded");
        hudBars();
      }
    }
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
    xrGrab(xr);
    tickFoes(foes, dt, player, map, sdf2, damage);
    tickRobots(foes, dt, player, map, sdf2, damage, scene, shots, fireWeapon);
    tickShots(shots, dt, foes, extras, damage, (p, c) => addBurnDecal(scene, burns, p, c), sdf3, map, sdf2);
    tickBurns(burns, dt);
    if (extras) {
      tickWorld(extras, dt, player, foes, damage, scene, camera, map);
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
          scene.add(e);
          s._alive++;
        }
      }
    }
    tickPickups();
    drawMinimap();
    hudBars();
  }
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
  if (e.code === "KeyR") {
    const def = held && WEAPON_BY_ID[held];
    if (def && def.slot === "gun") {
      mag = def.mag;
      setMsg("Reloaded");
      hudBars();
    }
  }
  if (e.code === "KeyE") tryUnlock(extras || { doors: [] }, player, inv.filter((i) => i.id === "key").map((i) => i.keyId));
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
  $("start").hidden = false;
  running = false;
  clearWorld();
});
$("go-proc").addEventListener("click", () => enterMap("proc"));
$("inv-close").addEventListener("click", () => ($("inv").hidden = true));

showList();
