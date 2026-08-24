import {
  BIOMES,
  CELL,
  ENEMIES,
  FLAG_CROUCH,
  FLAG_SPIKE,
  FLAG_UNSTABLE,
  LIQ_LAVA,
  LIQ_NONE,
  LIQ_WATER,
  OBJECTS,
  PICKUPS,
  PORTAL_COLORS,
  SHAPE_FLAT,
  SHAPE_OVAL,
  SHAPE_ROUND,
  SHAPE_SPHERE,
  SHAPES,
  WALL_TEX,
  routes,
} from "./config.js";
import { bakedMaps } from "./defaults.js";
import {
  addSphere,
  blankMap,
  canPlaceClimb,
  cloneMap,
  countCarved,
  deserialize,
  enclosedFloors,
  ensureLayers,
  eraseNear,
  flood,
  getShape,
  getTex,
  idx,
  inBounds,
  isCarved,
  paintDisk,
  serialize,
  stampDisk,
  stampFlags,
  stampLayer,
  stampRect,
  stampSegment,
} from "./map.js";
import { deleteMap, getMap, listMaps, saveMap, stashPreview } from "./store.js";

const $ = (id) => document.getElementById(id);

let map = blankMap("New delve");
ensureLayers(map);
let tool = "dig";
let shape = SHAPE_FLAT;
let tex = 1;
let brush = 2.2;
let objKind = "torch";
let pickupKind = "pistol";
let enemyId = "scout";
let spawnInterval = 6;
let spawnRadius = 8;
let spawnMax = 3;
let objScale = 1;
let elev = 0;
let skyKind = 1;
let story = 0;
let wtex = 1;
let selected = null;
let drawing = false;
let last = null;
let rectA = null;
let pan = { x: 0, y: 0 };
let scale = 8;
let undo = [];
let pendingPortal = null;
let pendingKey = null;
let climbFrom = 0;

const canvas = $("view");
const ctx = canvas.getContext("2d");

function pushUndo() {
  undo.push(JSON.stringify(serialize(map)));
  if (undo.length > 24) undo.shift();
}
function doUndo() {
  const raw = undo.pop();
  if (!raw) return;
  const id = map.id;
  const name = map.name;
  map = deserialize(JSON.parse(raw));
  map.id = id;
  map.name = name;
  selected = null;
  draw();
  status("Undid");
}
function status(t) {
  $("status").textContent = t;
}
function cellFromEvent(ev) {
  const r = canvas.getBoundingClientRect();
  const x = (ev.clientX - r.left - pan.x) / scale;
  const z = (ev.clientY - r.top - pan.y) / scale;
  return { x, z, wx: x * CELL, wz: z * CELL, gx: Math.floor(x), gz: Math.floor(z) };
}

function showPanels() {
  document.querySelectorAll(".pbox").forEach((el) => {
    const show = (el.dataset.show || "").split(",");
    el.hidden = !show.includes(tool);
  });
  document.querySelectorAll("[data-tool]").forEach((b) => b.classList.toggle("on", b.dataset.tool === tool));
}

function fit() {
  const wrap = $("stage");
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  scale = Math.min(w / map.w, h / map.h) * 0.92;
  pan.x = (w - map.w * scale) / 2;
  pan.y = (h - map.h * scale) / 2;
  draw();
}

function drawCell(x, z) {
  const i = idx(map, x, z);
  const b = map.cells[i];
  if (isCarved(b)) {
    ctx.fillStyle = BIOMES[getTex(b)]?.swatch || "#888";
    ctx.fillRect(x, z, 1.02, 1.02);
    const sh = getShape(b);
    ctx.save();
    ctx.translate(x + 0.5, z + 0.5);
    ctx.lineWidth = 0.08;
    if (sh === SHAPE_ROUND) {
      ctx.strokeStyle = "rgba(20,40,70,0.7)";
      ctx.beginPath();
      ctx.arc(0, 0, 0.38, 0, 6.28);
      ctx.stroke();
    } else if (sh === SHAPE_OVAL) {
      ctx.strokeStyle = "rgba(80,50,20,0.75)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.42, 0.26, 0.5, 0, 6.28);
      ctx.stroke();
    } else if (sh === SHAPE_SPHERE) {
      ctx.strokeStyle = "rgba(80,40,120,0.8)";
      ctx.beginPath();
      ctx.arc(0, 0, 0.22, 0, 6.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 0.4, 0, 6.28);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.strokeRect(-0.32, -0.32, 0.64, 0.64);
    }
    ctx.restore();
    if (map.flags && map.flags[i] & FLAG_SPIKE) {
      ctx.fillStyle = "#c44";
      ctx.beginPath();
      ctx.moveTo(x + 0.5, z + 0.15);
      ctx.lineTo(x + 0.78, z + 0.85);
      ctx.lineTo(x + 0.22, z + 0.85);
      ctx.fill();
    }
    if (map.flags && map.flags[i] & FLAG_CROUCH) {
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.moveTo(x + 0.15, z + 0.7);
      ctx.lineTo(x + 0.85, z + 0.7);
      ctx.stroke();
    }
    if (map.flags && map.flags[i] & FLAG_UNSTABLE) {
      ctx.strokeStyle = "rgba(180,90,40,0.85)";
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.moveTo(x + 0.1, z + 0.2);
      ctx.lineTo(x + 0.45, z + 0.55);
      ctx.lineTo(x + 0.35, z + 0.85);
      ctx.moveTo(x + 0.55, z + 0.15);
      ctx.lineTo(x + 0.9, z + 0.7);
      ctx.stroke();
    }
    if (map.sky && map.sky[i]) {
      ctx.fillStyle = "rgba(140,190,255,0.28)";
      ctx.fillRect(x, z, 1, 1);
    }
    const ev = map.elev && map.elev[i];
    if (ev) {
      ctx.fillStyle = ev > 0 ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
      ctx.fillRect(x, z, 1, Math.min(1, Math.abs(ev) * 0.12));
      if (scale > 7) {
        ctx.fillStyle = "#111";
        ctx.font = "0.45px sans-serif";
        ctx.fillText(String(ev), x + 0.12, z + 0.55);
      }
    }
  }
  if (map.liquid && map.liquid[i]) {
    ctx.fillStyle = map.liquid[i] === 2 ? "rgba(255,80,20,0.55)" : "rgba(40,110,200,0.5)";
    ctx.fillRect(x, z, 1, 1);
  }
  const bw = map.bwalls && map.bwalls[story] && map.bwalls[story][i];
  if (bw) {
    ctx.fillStyle = WALL_TEX[(bw - 1) % WALL_TEX.length].swatch;
    ctx.fillRect(x + 0.15, z + 0.15, 0.7, 0.7);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 0.08;
    ctx.strokeRect(x + 0.15, z + 0.15, 0.7, 0.7);
  }
}

function draw() {
  ensureLayers(map);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.fillStyle = "#0b0a09";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(pan.x, pan.y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#161310";
  ctx.fillRect(0, 0, map.w, map.h);
  for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) drawCell(x, z);
  for (const s of map.spheres) {
    ctx.beginPath();
    ctx.arc(s.x / CELL, s.z / CELL, s.r / CELL, 0, 6.28);
    ctx.strokeStyle = "rgba(200,160,255,0.85)";
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
  }
  for (const o of map.objects) {
    ctx.fillStyle = "#f0d080";
    ctx.fillRect(o.x / CELL - 0.3, o.z / CELL - 0.3, 0.6, 0.6);
  }
  for (const p of map.pickups) {
    ctx.fillStyle = "#88f";
    ctx.fillRect(p.x / CELL - 0.28, p.z / CELL - 0.28, 0.56, 0.56);
  }
  for (const k of map.keys) {
    ctx.fillStyle = "#ffd24a";
    ctx.beginPath();
    ctx.arc(k.x / CELL, k.z / CELL, 0.32, 0, 6.28);
    ctx.fill();
  }
  for (const s of map.spawners) {
    ctx.beginPath();
    ctx.arc(s.x / CELL, s.z / CELL, (s.radius || 8) / CELL, 0, 6.28);
    ctx.strokeStyle = "rgba(255,80,70,0.55)";
    ctx.lineWidth = 1.4 / scale;
    ctx.stroke();
    ctx.fillStyle = "#ff5a4a";
    ctx.beginPath();
    ctx.arc(s.x / CELL, s.z / CELL, 0.4, 0, 6.28);
    ctx.fill();
  }
  (map.portals || []).forEach((p, i) => {
    ctx.strokeStyle = "#" + PORTAL_COLORS[i % PORTAL_COLORS.length].toString(16).padStart(6, "0");
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.arc(p.ax / CELL, p.az / CELL, 0.45, 0, 6.28);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.bx / CELL, p.bz / CELL, 0.45, 0, 6.28);
    ctx.stroke();
  });
  for (const t of map.turrets) {
    ctx.fillStyle = "#c33";
    ctx.fillRect(t.x / CELL - 0.3, t.z / CELL - 0.3, 0.6, 0.6);
  }
  for (const c of map.crushers) {
    ctx.strokeStyle = "#aaa";
    ctx.strokeRect(c.x / CELL - 0.4, c.z / CELL - 0.4, 0.8, 0.8);
  }
  for (const r of map.ropes) {
    ctx.strokeStyle = "#6a4424";
    ctx.beginPath();
    ctx.moveTo(r.x / CELL, r.z / CELL);
    ctx.lineTo(r.x / CELL, r.z / CELL + 0.7);
    ctx.stroke();
  }
  for (const cl of map.climbs || []) {
    ctx.strokeStyle = cl.kind === "ladder" ? "#c8a070" : "#e2c070";
    ctx.lineWidth = 0.12;
    ctx.strokeRect(cl.x / CELL - 0.35, cl.z / CELL - 0.35, 0.7, 0.7);
    ctx.fillStyle = cl.kind === "ladder" ? "#8a6030" : "#d4b050";
    ctx.fillRect(cl.x / CELL - 0.18, cl.z / CELL - 0.18, 0.36, 0.36);
  }
  for (const o of map.openings) {
    ctx.strokeStyle = o.locked ? "#c4a050" : "#eee";
    ctx.strokeRect(o.x + 0.2, o.z + 0.2, 0.6, 0.6);
  }
  if (map.start) {
    ctx.fillStyle = "#7dffb0";
    ctx.beginPath();
    ctx.arc(map.start.x / CELL, map.start.z / CELL, 0.55, 0, 6.28);
    ctx.fill();
    const yaw = map.start.yaw || 0;
    ctx.strokeStyle = "#7dffb0";
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(map.start.x / CELL, map.start.z / CELL);
    ctx.lineTo(map.start.x / CELL - Math.sin(yaw) * 1.4, map.start.z / CELL - Math.cos(yaw) * 1.4);
    ctx.stroke();
  }
  if (rectA && last && (tool === "rect" || tool === "outline")) {
    ctx.strokeStyle = tool === "outline" ? "#9ad4ff" : "#ffe08a";
    ctx.lineWidth = 1.2 / scale;
    ctx.strokeRect(Math.min(rectA.x, last.x), Math.min(rectA.z, last.z), Math.abs(last.x - rectA.x), Math.abs(last.z - rectA.z));
  }
  ctx.restore();
}

function applyBrush(c, erase) {
  if (shape === SHAPE_SPHERE && !erase) {
    stampDisk(map, c.x, c.z, Math.max(1.2, brush * 0.85), SHAPE_SPHERE, tex, false);
    addSphere(map, c.wx, c.wz, brush * CELL * 0.9, tex);
  } else {
    stampDisk(map, c.x, c.z, brush, shape, tex, erase);
    if (erase) eraseNear(map, c.wx, c.wz, brush * CELL);
  }
}

function hitAt(c) {
  for (let i = map.spawners.length - 1; i >= 0; i--) {
    if (Math.hypot(map.spawners[i].x - c.wx, map.spawners[i].z - c.wz) < 1.2) return { type: "spawner", i };
  }
  for (let i = map.objects.length - 1; i >= 0; i--) {
    if (Math.hypot(map.objects[i].x - c.wx, map.objects[i].z - c.wz) < 1.1) return { type: "obj", i };
  }
  for (let i = (map.pickups || []).length - 1; i >= 0; i--) {
    if (Math.hypot(map.pickups[i].x - c.wx, map.pickups[i].z - c.wz) < 1.1) return { type: "pickup", i };
  }
  return null;
}

function onWall(gx, gz) {
  return !!(map.bwalls && map.bwalls[story] && map.bwalls[story][idx(map, gx, gz)]);
}

canvas.addEventListener("pointerdown", (ev) => {
  if (ev.button === 1 || ev.button === 2) {
    canvas.setPointerCapture(ev.pointerId);
    canvas._pan = { x: ev.clientX - pan.x, y: ev.clientY - pan.y };
    return;
  }
  const c = cellFromEvent(ev);
  last = c;
  if (["dig", "erase", "sphere", "paint", "crouch", "spike", "sky", "elev", "water", "lava", "wall", "unstable"].includes(tool)) {
    pushUndo();
    drawing = true;
    strokeAt(c, true);
    draw();
  } else if (tool === "rect" || tool === "outline") {
    pushUndo();
    rectA = c;
    drawing = true;
  } else if (tool === "fill") {
    pushUndo();
    const n = flood(map, c.x, c.z, shape, tex, false);
    status(n ? "Filled " + n + " cells" : "Need a closed outline first");
    draw();
  } else if (tool === "object") {
    const hit = hitAt(c);
    if (hit && hit.type === "obj") selected = hit;
    else {
      pushUndo();
      map.objects.push({ kind: objKind, x: c.wx, z: c.wz, s: objScale, rot: 0 });
      selected = { type: "obj", i: map.objects.length - 1 };
      status("Placed " + objKind);
    }
    draw();
  } else if (tool === "pickup") {
    pushUndo();
    map.pickups.push({ kind: pickupKind, x: c.wx, z: c.wz });
    status("Pickup: " + pickupKind);
    draw();
  } else if (tool === "spawner") {
    const hit = hitAt(c);
    if (hit && hit.type === "spawner") {
      selected = hit;
      const s = map.spawners[hit.i];
      $("sp-enemy").value = s.enemy;
      $("sp-int").value = s.interval;
      $("sp-rad").value = s.radius;
      $("sp-max").value = s.maxAlive;
      syncSliders();
    } else {
      pushUndo();
      map.spawners.push({ x: c.wx, z: c.wz, enemy: enemyId, interval: spawnInterval, radius: spawnRadius, maxAlive: spawnMax });
      selected = { type: "spawner", i: map.spawners.length - 1 };
      status("Spawner: " + enemyId);
    }
    draw();
  } else if (tool === "start") {
    pushUndo();
    map.start = { x: c.wx, z: c.wz, yaw: map.start?.yaw || 0 };
    drawing = true;
    status("Spawn set — drag to face");
    draw();
  } else if (tool === "rope") {
    pushUndo();
    map.ropes.push({ x: c.wx, z: c.wz, len: 4.5 });
    draw();
  } else if (tool === "turret") {
    pushUndo();
    map.turrets.push({ x: c.wx, z: c.wz });
    draw();
  } else if (tool === "crusher") {
    pushUndo();
    map.crushers.push({ x: c.wx, z: c.wz });
    draw();
  } else if (tool === "stairs" || tool === "ladder") {
    if (!canPlaceClimb(map, c.gx, c.gz, climbFrom)) {
      status("Need enclosed 1st+2nd or 2nd+3rd floors here");
      return;
    }
    pushUndo();
    const fl = enclosedFloors(map, climbFrom);
    const open = (x, z) => inBounds(map, x, z) && fl[idx(map, x, z)];
    const ox = (open(c.gx - 1, c.gz) ? 1 : 0) + (open(c.gx + 1, c.gz) ? 1 : 0);
    const oz = (open(c.gx, c.gz - 1) ? 1 : 0) + (open(c.gx, c.gz + 1) ? 1 : 0);
    map.climbs = map.climbs || [];
    map.climbs = map.climbs.filter((o) => Math.hypot(o.x - c.wx, o.z - c.wz) > CELL * 0.7);
    map.climbs.push({
      kind: tool === "ladder" ? "ladder" : "stairs",
      x: c.wx,
      z: c.wz,
      from: climbFrom,
      to: climbFrom + 1,
      yaw: ox > oz ? Math.PI / 2 : 0,
    });
    status((tool === "ladder" ? "Ladder" : "Stairs") + " " + (climbFrom + 1) + "↔" + (climbFrom + 2));
    draw();
  } else if (tool === "portal") {
    if (!pendingPortal) {
      pendingPortal = { ax: c.wx, az: c.wz };
      status("Portal A set — click exit");
    } else {
      pushUndo();
      map.portals.push({ ax: pendingPortal.ax, az: pendingPortal.az, bx: c.wx, bz: c.wz });
      pendingPortal = null;
      status("Portal pair placed");
      draw();
    }
  } else if (tool === "key") {
    pushUndo();
    const id = pendingKey || "k" + Math.random().toString(36).slice(2, 7);
    map.keys.push({ id, x: c.wx, z: c.wz });
    pendingKey = null;
    status("Key " + id + " placed");
    setTool("dig");
    draw();
  } else if (["door", "locked", "arch", "window"].includes(tool)) {
    if (!inBounds(map, c.gx, c.gz) || !onWall(c.gx, c.gz)) {
      status("Place that on a wall");
      return;
    }
    pushUndo();
    const open = { x: c.gx, z: c.gz, story, type: tool === "locked" ? "door" : tool, locked: tool === "locked" };
    if (tool === "locked") {
      open.keyId = "k" + Math.random().toString(36).slice(2, 7);
      pendingKey = open.keyId;
      map.openings.push(open);
      setTool("key");
      status("Locked door set — now place its key");
      $("key-hint").textContent = "Click to drop key " + open.keyId;
    } else {
      map.openings.push(open);
      status(tool + " on wall");
    }
    draw();
  }
});

function strokeAt(c, first) {
  if (tool === "paint") paintDisk(map, c.x, c.z, brush, tex);
  else if (tool === "crouch") {
    stampDisk(map, c.x, c.z, brush, SHAPE_FLAT, tex, false);
    stampFlags(map, c.x, c.z, brush, FLAG_CROUCH, true);
  } else if (tool === "spike") {
    stampDisk(map, c.x, c.z, brush, SHAPE_FLAT, tex, false);
    stampFlags(map, c.x, c.z, brush, FLAG_SPIKE, true);
  } else if (tool === "unstable") {
    stampDisk(map, c.x, c.z, brush, SHAPE_FLAT, tex, false);
    stampFlags(map, c.x, c.z, brush, FLAG_UNSTABLE, true);
  } else if (tool === "sky") {
    stampDisk(map, c.x, c.z, brush, shape, tex, false);
    stampLayer(map.sky, map, c.x, c.z, brush, skyKind);
  } else if (tool === "elev") stampLayer(map.elev, map, c.x, c.z, brush, elev);
  else if (tool === "water") stampLayer(map.liquid, map, c.x, c.z, brush, LIQ_WATER);
  else if (tool === "lava") stampLayer(map.liquid, map, c.x, c.z, brush, LIQ_LAVA);
  else if (tool === "wall") stampLayer(map.bwalls[story], map, c.x, c.z, Math.max(0.6, brush * 0.45), wtex);
  else if (tool === "dig" || tool === "erase" || tool === "sphere") {
    const prev = shape;
    if (tool === "sphere") shape = SHAPE_SPHERE;
    if (!first && last) stampSegment(map, last.x, last.z, c.x, c.z, brush, shape, tex, tool === "erase");
    else applyBrush(c, tool === "erase");
    if (tool === "sphere" && tool !== "erase") addSphere(map, c.wx, c.wz, brush * CELL * 0.9, tex);
    if (tool === "erase") {
      eraseNear(map, c.wx, c.wz, brush * CELL * 0.6);
      stampLayer(map.liquid, map, c.x, c.z, brush, LIQ_NONE);
      stampLayer(map.sky, map, c.x, c.z, brush, 0);
      stampFlags(map, c.x, c.z, brush, FLAG_SPIKE | FLAG_CROUCH | FLAG_UNSTABLE, false);
    }
    shape = prev;
  }
}

canvas.addEventListener("pointermove", (ev) => {
  if (canvas._pan) {
    pan.x = ev.clientX - canvas._pan.x;
    pan.y = ev.clientY - canvas._pan.y;
    draw();
    return;
  }
  const c = cellFromEvent(ev);
  $("xy").textContent = `${c.x.toFixed(1)}, ${c.z.toFixed(1)}`;
  if (!drawing) return;
  if (tool === "start" && map.start) {
    map.start.yaw = Math.atan2(map.start.x - c.wx, map.start.z - c.wz);
    draw();
    return;
  }
  if (tool === "rect" || tool === "outline") {
    last = c;
    draw();
    return;
  }
  if ((tool === "object" || tool === "spawner") && selected && ev.buttons === 1) {
    const p = selected.type === "obj" ? map.objects[selected.i] : map.spawners[selected.i];
    if (p) {
      p.x = c.wx;
      p.z = c.wz;
      draw();
    }
    return;
  }
  if (["dig", "erase", "sphere", "paint", "crouch", "spike", "sky", "elev", "water", "lava", "wall", "unstable"].includes(tool)) {
    strokeAt(c, false);
    last = c;
    draw();
  }
});

function endDraw() {
  canvas._pan = null;
  if (!drawing) return;
  drawing = false;
  if ((tool === "rect" || tool === "outline") && rectA && last) {
    stampRect(map, rectA.x, rectA.z, last.x, last.z, brush, shape, tex, false, tool === "outline");
  }
  rectA = null;
  last = null;
  draw();
}
canvas.addEventListener("pointerup", endDraw);
canvas.addEventListener("pointerleave", endDraw);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener(
  "wheel",
  (ev) => {
    ev.preventDefault();
    const c = cellFromEvent(ev);
    scale = Math.max(3, Math.min(28, scale * (ev.deltaY > 0 ? 0.9 : 1.1)));
    pan.x = ev.clientX - canvas.getBoundingClientRect().left - c.x * scale;
    pan.y = ev.clientY - canvas.getBoundingClientRect().top - c.z * scale;
    draw();
  },
  { passive: false },
);

function setTool(t) {
  tool = t;
  if (t === "sphere") shape = SHAPE_SPHERE;
  showPanels();
  const hints = {
    dig: "Paint carved space. Shape + texture apply to the stroke.",
    erase: "Erase carved space, traps, pickups, and overlays under the brush.",
    rect: "Drag a filled rectangle — a room.",
    outline: "Drag an outline — a hallway circuit.",
    sphere: "Stamp spherical chambers.",
    fill: "Bucket-fill a closed pocket.",
    paint: "Recolor existing carved cells.",
    crouch: "Low tunnels. Player must crouch (C) to pass.",
    spike: "Spike pits. Jump them or die.",
    unstable: "Paint a ceiling that collapses around anyone who walks under it.",
    stairs: "Place only where 1st+2nd or 2nd+3rd stories both have enclosed floors.",
    ladder: "Place only where consecutive stories both have enclosed floors.",
    sky: "Open courtyard — grass floor, courtyard walls, real sky (no cave lid).",
    elev: "Raise or lower the floor by player-heights.",
    water: "Water layer on top of height.",
    lava: "Lava layer — it burns.",
    start: "Click spawn, drag to face.",
    wall: "Draw building walls. Enclosed rooms get floors and roofs.",
    portal: "Two clicks make a colored pair.",
  };
  $("shape-hint").textContent = hints[t] || SHAPES.find((s) => s.id === shape)?.hint || "";
  status(t);
}

document.querySelectorAll("[data-tool]").forEach((b) => b.addEventListener("click", () => setTool(b.dataset.tool)));

function fillSelect(el, items, getId, getName) {
  if (!el) return;
  el.innerHTML = items.map((it) => `<option value="${getId(it)}">${getName(it)}</option>`).join("");
}
fillSelect($("shape"), SHAPES, (s) => String(s.id), (s) => s.name);
fillSelect($("biome"), BIOMES, (b) => String(BIOMES.indexOf(b)), (b) => b.name);
fillSelect($("obj"), OBJECTS, (o) => o.id, (o) => o.name);
fillSelect($("pickup"), PICKUPS, (p) => p.id, (p) => p.name);
fillSelect($("sp-enemy"), ENEMIES, (e) => e.id, (e) => e.name);
fillSelect($("wtex"), WALL_TEX, (w) => String(WALL_TEX.indexOf(w) + 1), (w) => w.name);

$("shape").value = String(shape);
$("biome").value = String(tex);
$("obj").value = objKind;
$("pickup").value = pickupKind;
$("sp-enemy").value = enemyId;

$("shape").addEventListener("change", () => (shape = +$("shape").value));
$("biome").addEventListener("change", () => (tex = +$("biome").value));
$("obj").addEventListener("change", () => (objKind = $("obj").value));
$("pickup").addEventListener("change", () => (pickupKind = $("pickup").value));
$("sp-enemy").addEventListener("change", () => {
  enemyId = $("sp-enemy").value;
  if (selected?.type === "spawner") map.spawners[selected.i].enemy = enemyId;
});
$("brush").addEventListener("input", () => {
  brush = +$("brush").value;
  $("brush-v").textContent = brush.toFixed(1);
});
$("hall").addEventListener("input", () => {
  map.hallH = +$("hall").value;
  $("hall-v").textContent = map.hallH.toFixed(1);
});
$("oscale").addEventListener("input", () => {
  objScale = +$("oscale").value;
  $("oscale-v").textContent = objScale.toFixed(2);
});
$("elev").addEventListener("input", () => {
  elev = +$("elev").value;
  $("elev-v").textContent = String(elev);
});
$("sky-kind").addEventListener("change", () => (skyKind = +$("sky-kind").value));
$("climb-span").addEventListener("change", () => (climbFrom = +$("climb-span").value));
$("story").addEventListener("change", () => {
  story = +$("story").value;
  draw();
});
$("wtex").addEventListener("change", () => (wtex = +$("wtex").value));
$("sp-int").addEventListener("input", () => {
  spawnInterval = +$("sp-int").value;
  $("sp-int-v").textContent = spawnInterval.toFixed(1) + "s";
  if (selected?.type === "spawner") map.spawners[selected.i].interval = spawnInterval;
});
$("sp-rad").addEventListener("input", () => {
  spawnRadius = +$("sp-rad").value;
  $("sp-rad-v").textContent = spawnRadius.toFixed(1);
  if (selected?.type === "spawner") map.spawners[selected.i].radius = spawnRadius;
  draw();
});
$("sp-max").addEventListener("input", () => {
  spawnMax = +$("sp-max").value;
  $("sp-max-v").textContent = String(spawnMax);
  if (selected?.type === "spawner") map.spawners[selected.i].maxAlive = spawnMax;
});

function syncSliders() {
  $("brush-v").textContent = brush.toFixed(1);
  $("hall-v").textContent = (map.hallH || 4.2).toFixed(1);
  $("hall").value = map.hallH || 4.2;
  $("oscale-v").textContent = objScale.toFixed(2);
  $("elev-v").textContent = String(elev);
  $("sp-int-v").textContent = spawnInterval.toFixed(1) + "s";
  $("sp-rad-v").textContent = spawnRadius.toFixed(1);
  $("sp-max-v").textContent = String(spawnMax);
  $("map-name").value = map.name;
}

$("map-name").addEventListener("input", () => (map.name = $("map-name").value || "Untitled"));
$("save").addEventListener("click", async () => {
  map.name = $("map-name").value || "Untitled";
  const r = await saveMap(map);
  status(r.remote ? "Saved to Zoom (all devices)" : "Saved on this device");
  refreshList();
});
$("play").addEventListener("click", () => {
  stashPreview(map);
  location.href = routes().play + "?map=preview";
});
$("new").addEventListener("click", () => {
  pushUndo();
  map = blankMap("New delve");
  selected = null;
  syncSliders();
  fit();
});
$("del").addEventListener("click", async () => {
  if (!confirm("Delete this map?")) return;
  await deleteMap(map.id);
  map = blankMap("New delve");
  refreshList();
  fit();
});

addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea, select")) return;
  if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
    e.preventDefault();
    doUndo();
  }
  if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
    e.preventDefault();
    $("save").click();
  }
  if (e.code === "Delete" || e.code === "Backspace") {
    if (selected) {
      pushUndo();
      if (selected.type === "obj") map.objects.splice(selected.i, 1);
      else if (selected.type === "spawner") map.spawners.splice(selected.i, 1);
      else if (selected.type === "pickup") map.pickups.splice(selected.i, 1);
      selected = null;
      draw();
    }
  }
});

BIOMES.forEach((b, i) => {
  const d = document.createElement("button");
  d.type = "button";
  d.className = "sw";
  d.title = b.name;
  d.style.background = b.swatch;
  d.addEventListener("click", () => {
    tex = i;
    $("biome").value = String(i);
    document.querySelectorAll(".sw").forEach((x) => x.classList.remove("on"));
    d.classList.add("on");
  });
  if (i === tex) d.classList.add("on");
  $("swatches").appendChild(d);
});

async function refreshList() {
  const host = $("saved");
  host.innerHTML = "";
  const baked = bakedMaps();
  let extra = [];
  try {
    extra = await listMaps();
  } catch {}
  const seen = new Set();
  const all = [...baked, ...extra].filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  for (const m of all) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "saved";
    b.textContent = m.name + (String(m.id).startsWith("baked") ? " (sample)" : "");
    b.addEventListener("click", async () => {
      const loaded = String(m.id).startsWith("baked") ? bakedMaps().find((x) => x.id === m.id) : await getMap(m.id);
      map = ensureLayers(loaded ? cloneMap(loaded) : cloneMap(m));
      if (String(m.id).startsWith("baked")) map.id = "m" + Math.random().toString(36).slice(2, 10);
      selected = null;
      syncSliders();
      fit();
    });
    host.appendChild(b);
  }
}

$("to-play").href = routes().play;
addEventListener("resize", fit);

(async () => {
  const q = new URLSearchParams(location.search).get("map");
  if (q) {
    const m = await getMap(q);
    if (m) map = ensureLayers(m);
  }
  syncSliders();
  setTool("dig");
  await refreshList();
  fit();
  status("Draw to dig. " + countCarved(map) + " cells open.");
})();
