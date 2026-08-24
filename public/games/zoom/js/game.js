import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { BIOMES, CELL, routes } from "./config.js";
import { bakedMaps } from "./defaults.js";
import { biomeOf, countCarved, firstCarved, floorY, sdf3 } from "./map.js";
import { buildDungeon, prepareSdf, yMax } from "./mesh.js";
import { makeProp, spawnFrom, strikeFoes, tickFoes } from "./props.js";
import { getMap, listMaps } from "./store.js";

const $ = (id) => document.getElementById(id);
const keys = new Set();
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const lookEuler = new THREE.Euler();

let renderer, scene, camera, clock, controls;
let map, sdf2, dungeon;
let player = { x: 0, y: 1.6, z: 0, vy: 0, hp: 100, grounded: false };
let foes = [];
let spawners = [];
let torchLights = [];
let hazards = [];
let running = false;
let dead = false;
let swingT = 0;
let hurtT = 0;
let yaw = 0;
let sword, flashlight, camLight;
let animId = 0;

function setMsg(t) {
  const el = $("msg");
  el.textContent = t;
  el.hidden = !t;
}

function hpBar() {
  $("hpi").style.width = Math.max(0, player.hp) + "%";
  $("hpv").textContent = Math.max(0, player.hp | 0);
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
        const t = (b >> 3) & 15;
        g.fillStyle = BIOMES[t] ? BIOMES[t].swatch : "#888";
        g.fillRect(x * s, z * s, s + 0.4, s + 0.4);
      }
    }
  }
  g.fillStyle = "#fff56a";
  g.beginPath();
  g.arc((player.x / CELL) * s, (player.z / CELL) * s, 2.4, 0, 6.28);
  g.fill();
  g.strokeStyle = "#fff56a";
  g.beginPath();
  g.moveTo((player.x / CELL) * s, (player.z / CELL) * s);
  g.lineTo((player.x / CELL) * s - Math.sin(yaw) * 6, (player.z / CELL) * s - Math.cos(yaw) * 6);
  g.stroke();
  g.fillStyle = "#ff4a3a";
  for (const f of foes) {
    if (!f.visible) continue;
    g.fillRect((f.position.x / CELL) * s - 1.2, (f.position.z / CELL) * s - 1.2, 2.4, 2.4);
  }
}

function makeSword() {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.72), new THREE.MeshStandardMaterial({ color: 0xc8d0d8, metalness: 0.7, roughness: 0.25 }));
  blade.position.set(0.18, -0.12, -0.55);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0xc4a050, metalness: 0.6, roughness: 0.35 }));
  guard.position.set(0.18, -0.12, -0.22);
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.18), new THREE.MeshStandardMaterial({ color: 0x4a3020 }));
  hilt.position.set(0.18, -0.12, -0.12);
  g.add(blade, guard, hilt);
  camera.add(g);
  return g;
}

function initThree() {
  if (renderer) return;
  const canvas = $("c");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;
  renderer.setClearColor(0x1a1814, 1);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.06, 80);
  clock = new THREE.Clock();
  controls = new PointerLockControls(camera, $("c"));
  scene.add(controls.object);
  scene.add(new THREE.HemisphereLight(0xc8c0b0, 0x2a2018, 0.7));
  scene.add(new THREE.AmbientLight(0x3a342c, 0.45));
  flashlight = new THREE.SpotLight(0xffe6c0, 2.4, 16, 0.52, 0.45, 1.4);
  flashlight.position.set(0, 0, 0);
  flashlight.target.position.set(0, 0, -4);
  camera.add(flashlight);
  camera.add(flashlight.target);
  camLight = new THREE.PointLight(0xffcc88, 0.35, 4.5);
  camera.add(camLight);
  sword = makeSword();
  $("c").addEventListener("click", () => {
    if (!$("start").hidden) return;
    if (dead) return;
    if (!controls.isLocked) controls.lock();
    else swing();
  });
  controls.addEventListener("lock", () => $("hint").classList.add("go"));
  controls.addEventListener("unlock", () => $("hint").classList.remove("go"));
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function clearWorld() {
  if (dungeon) {
    scene.remove(dungeon);
    dungeon.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    dungeon = null;
  }
  for (const L of torchLights) scene.remove(L);
  torchLights = [];
  for (const f of foes) scene.remove(f);
  foes = [];
  hazards = [];
}

function placeProps() {
  for (const o of map.objects) {
    const g = makeProp(o.kind, o.s || 1);
    const y = floorY(o.x, o.z, map, sdf2);
    g.position.set(o.x, y < 0 ? 0 : y, o.z);
    g.rotation.y = o.rot || 0;
    dungeon.add(g);
    if (g.userData.lightColor) {
      const L = new THREE.PointLight(g.userData.lightColor, 1.15, g.userData.lightDist || 8, 2);
      L.position.set(o.x, (y < 0 ? 0 : y) + 1.1, o.z);
      scene.add(L);
      torchLights.push(L);
    }
    if (g.userData.hazard) hazards.push({ x: o.x, z: o.z, dmg: g.userData.hazard, cool: 0 });
  }
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
  player.y = (y < 0 ? 1.2 : y) + 1.55;
  player.vy = 0;
  player.hp = 100;
  player.grounded = true;
  camera.position.set(player.x, player.y, player.z);
  camera.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, "YXZ"));
  return true;
}

async function enterMap(id) {
  setMsg("Carving the dark…");
  initThree();
  await new Promise((r) => setTimeout(r, 40));
  clearWorld();
  let m = bakedMaps().find((x) => x.id === id);
  if (!m) m = await getMap(id);
  if (!m) {
    setMsg("Map missing.");
    return;
  }
  map = m;
  if (countCarved(map) === 0 && !(map.spheres && map.spheres.length)) {
    setMsg("This map is solid rock. Dig it in the map maker first.");
    return;
  }
  sdf2 = prepareSdf(map);
  const built = buildDungeon(map, sdf2);
  dungeon = built.group;
  scene.add(dungeon);
  const b = biomeOf(map, map.start?.x || 0, map.start?.z || 0);
  scene.background = new THREE.Color(b.fog);
  scene.fog = new THREE.FogExp2(b.fog, 0.022);
  placeProps();
  spawners = (map.spawners || []).map((s) => ({ ...s, _t: 0.4 + Math.random(), _alive: 0 }));
  for (const s of spawners) {
    const n = Math.min(s.maxAlive || 2, 2);
    for (let i = 0; i < n; i++) {
      const e = spawnFrom(s, map, sdf2, foes);
      if (e) {
        scene.add(e);
        s._alive++;
      }
    }
  }
  if (!placePlayer()) {
    setMsg("No walkable space.");
    return;
  }
  $("start").hidden = true;
  $("hud").hidden = false;
  $("titlemap").textContent = map.name;
  running = true;
  dead = false;
  hpBar();
  setMsg("");
  clock.getDelta();
  if (!animId) loop();
  window.__ZOOM__ = { map, player, dungeon, scene, camera, sdf2, foes, spawners, renderer };
}

function swing() {
  if (swingT > 0 || dead) return;
  swingT = 0.32;
  const dir = tmp.set(0, 0, -1).applyQuaternion(camera.quaternion);
  dir.y = 0;
  dir.normalize();
  const origin = camera.getWorldPosition(tmp2);
  strikeFoes(foes, origin, dir, 2.45, 18);
}

function damage(n) {
  if (dead) return;
  player.hp -= n;
  hurtT = 0.22;
  hpBar();
  if (player.hp <= 0) {
    dead = true;
    running = false;
    controls.unlock();
    $("dead").hidden = false;
    $("dead-reason").textContent = "The crawl takes you.";
  }
}

function physics(dt) {
  const look = lookEuler.setFromQuaternion(camera.quaternion, "YXZ");
  yaw = look.y;
  const forward = tmp.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = tmp2.set(Math.cos(yaw), 0, -Math.sin(yaw));
  let wx = 0;
  let wz = 0;
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
  const len = Math.hypot(wx, wz);
  const spd = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 7.2 : 4.6) * (hurtT > 0 ? 0.7 : 1);
  if (len > 0) {
    wx = (wx / len) * spd * dt;
    wz = (wz / len) * spd * dt;
  }
  const eye = 1.55;
  const bodyY = player.y - 0.55;
  const footY = player.y - eye;
  function blocked(x, y, z) {
    return sdf3(x, y, z, map, sdf2) > -0.22;
  }
  if (!blocked(player.x + wx, bodyY, player.z) && !blocked(player.x + wx, footY + 0.3, player.z)) player.x += wx;
  if (!blocked(player.x, bodyY, player.z + wz) && !blocked(player.x, footY + 0.3, player.z + wz)) player.z += wz;
  if (player.grounded && keys.has("Space")) {
    player.vy = 5.4;
    player.grounded = false;
  }
  player.vy -= 18 * dt;
  player.y += player.vy * dt;
  const fy = floorY(player.x, player.z, map, sdf2);
  const want = (fy < 0 ? 0.2 : fy) + eye;
  if (player.y <= want && player.vy <= 0) {
    player.y = want;
    player.vy = 0;
    player.grounded = fy >= 0;
  } else player.grounded = false;
  if (blocked(player.x, player.y, player.z)) {
    player.y += 0.08;
  }
  camera.position.set(player.x, player.y, player.z);

  if (sword) {
    const k = swingT > 0 ? 1 - swingT / 0.32 : 0;
    const a = Math.sin(k * Math.PI);
    sword.rotation.x = -a * 0.9;
    sword.rotation.z = a * 0.5;
    sword.position.y = -a * 0.08;
  }
}

function tickSpawners(dt) {
  for (const s of spawners) {
    s._t -= dt;
    const cap = s.maxAlive || 3;
    if (s._t <= 0 && (s._alive || 0) < cap) {
      s._t = Math.max(0.6, s.interval || 6);
      const e = spawnFrom(s, map, sdf2, foes);
      if (e) {
        scene.add(e);
        s._alive = (s._alive || 0) + 1;
      }
    }
  }
}

function tickHazards(dt) {
  for (const h of hazards) {
    h.cool = Math.max(0, h.cool - dt);
    if (h.cool > 0) continue;
    if (Math.hypot(player.x - h.x, player.z - h.z) < 0.7) {
      h.cool = 0.8;
      damage(h.dmg);
    }
  }
}

function loop() {
  animId = requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  if (swingT > 0) swingT -= dt;
  if (hurtT > 0) hurtT -= dt;
  $("hurt").style.opacity = hurtT > 0 ? String(Math.min(0.55, hurtT * 2.2)) : "0";
  if (running && !dead) {
    physics(dt);
    tickFoes(foes, dt, player, map, sdf2, damage);
    tickSpawners(dt);
    tickHazards(dt);
    drawMinimap();
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
  g.fillStyle = "rgba(255,220,80,0.9)";
  for (const s2 of m.spheres || []) {
    g.beginPath();
    g.arc((s2.x / CELL / m.w) * 160, (s2.z / CELL / m.h) * 160, 3, 0, 6.28);
    g.fill();
  }
  return c.toDataURL();
}

async function showList() {
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
    if (q && (q === m.id || (q === "preview" && m.id === q))) {
      /* handled below */
    }
  }
  $("to-maps").href = routes().maps;
  if (q) enterMap(q);
}

addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "KeyM") location.href = routes().maps;
  if (e.code === "Escape" && dead) {
    $("dead").hidden = true;
    $("start").hidden = false;
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
$("again").addEventListener("click", () => {
  $("dead").hidden = true;
  if (map) enterMap(map.id);
});
$("dead-menu").addEventListener("click", () => {
  $("dead").hidden = true;
  $("hud").hidden = true;
  $("start").hidden = false;
  running = false;
  clearWorld();
});

showList();
