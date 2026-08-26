import {
  BIOMES,
  CELL,
  ENEMIES,
  FLAG_COLLAPSE,
  FLAG_CROUCH,
  FLAG_HOVER,
  FLAG_RUMBLE,
  FLAG_SLOPE,
  FLAG_SPIKE,
  FLAG_UNSTABLE,
  LIQ_LAVA,
  LIQ_NONE,
  LIQ_WATER,
  OBJECT_BY_ID,
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
} from "./config.js?v=zm11";
import { bakedMaps } from "./defaults.js?v=zm11";
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
  resizeMap,
  serialize,
  stampCrack,
  stampDisk,
  stampFlags,
  stampLayer,
  stampRect,
  stampSegment,
  uid,
  wallIsCrack,
  wallTexId,
} from "./map.js?v=zm11";
import { deleteMap, getMap, listMaps, saveMap, stashPreview } from "./store.js?v=zm11";
import { defaultNpc } from "./npcs.js?v=zm11";

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
let boulderSize = 1;
let boulderTrigger = 8;
let ridgeElev = 1;
let pendingUlti = null;

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
    if (map.flags && map.flags[i] & FLAG_RUMBLE) {
      ctx.strokeStyle = "rgba(200,160,80,0.55)";
      ctx.lineWidth = 0.07;
      ctx.strokeRect(x + 0.18, z + 0.18, 0.64, 0.64);
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
    if (map.flags && map.flags[i] & FLAG_HOVER) {
      ctx.strokeStyle = "rgba(120,200,255,0.9)";
      ctx.lineWidth = 0.1;
      ctx.strokeRect(x + 0.12, z + 0.12, 0.76, 0.76);
    }
    if (map.flags && map.flags[i] & FLAG_COLLAPSE) {
      ctx.fillStyle = "rgba(180,70,40,0.45)";
      ctx.fillRect(x + 0.2, z + 0.2, 0.6, 0.6);
    }
    if (map.flags && map.flags[i] & FLAG_SLOPE) {
      ctx.strokeStyle = "rgba(200,160,80,0.9)";
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.moveTo(x + 0.1, z + 0.85);
      ctx.lineTo(x + 0.9, z + 0.15);
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
    const texI = wallTexId(bw) || 1;
    ctx.fillStyle = WALL_TEX[(texI - 1) % WALL_TEX.length].swatch;
    ctx.fillRect(x + 0.15, z + 0.15, 0.7, 0.7);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 0.08;
    ctx.strokeRect(x + 0.15, z + 0.15, 0.7, 0.7);
    if (wallIsCrack(bw)) {
      ctx.strokeStyle = "rgba(20,12,8,0.9)";
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.moveTo(x + 0.22, z + 0.28);
      ctx.lineTo(x + 0.48, z + 0.55);
      ctx.lineTo(x + 0.4, z + 0.78);
      ctx.moveTo(x + 0.55, z + 0.22);
      ctx.lineTo(x + 0.82, z + 0.62);
      ctx.stroke();
    }
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
    const ox = o.x / CELL;
    const oz = o.z / CELL;
    const lit = !!(OBJECT_BY_ID[o.kind]?.light || /torch|lamp|light|chandelier|campfire/.test(o.kind || ""));
    if (lit) {
      ctx.fillStyle = "rgba(255, 210, 80, 0.35)";
      ctx.beginPath();
      ctx.arc(ox, oz, 0.72, 0, 6.28);
      ctx.fill();
      ctx.fillStyle = o.kind === "walllamp" ? "#dce8ff" : o.kind === "ceilinglight" ? "#f4f0e0" : o.kind === "chandelier" ? "#ffd090" : "#ffb040";
      ctx.beginPath();
      ctx.arc(ox, oz, 0.28, 0, 6.28);
      ctx.fill();
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.moveTo(ox, oz - 0.55);
      ctx.lineTo(ox, oz + 0.55);
      ctx.moveTo(ox - 0.55, oz);
      ctx.lineTo(ox + 0.55, oz);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#f0d080";
      ctx.fillRect(ox - 0.3, oz - 0.3, 0.6, 0.6);
    }
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
    ctx.fillStyle = s.enemy === "minotaur" ? "#8a4a18" : s.enemy === "sentrydrone" ? "#4ad0ff" : "#ff5a4a";
    ctx.beginPath();
    ctx.arc(s.x / CELL, s.z / CELL, s.enemy === "minotaur" ? 0.55 : 0.4, 0, 6.28);
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
    ctx.fillStyle = t.kind === "gun" ? "#c8a050" : "#c33";
    ctx.fillRect(t.x / CELL - 0.3, t.z / CELL - 0.3, 0.6, 0.6);
  }
  for (const a of map.arrows || []) {
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(a.x / CELL, a.z / CELL, 0.28, 0, 6.28);
    ctx.fill();
    ctx.strokeStyle = "#e8c070";
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.moveTo(a.x / CELL, a.z / CELL);
    ctx.lineTo(a.x / CELL - Math.sin(a.yaw || 0) * 1.1, a.z / CELL - Math.cos(a.yaw || 0) * 1.1);
    ctx.stroke();
  }
  for (const c of map.crushers) {
    ctx.strokeStyle = "#aaa";
    ctx.strokeRect(c.x / CELL - 0.4, c.z / CELL - 0.4, 0.8, 0.8);
  }
  for (let bi = 0; bi < (map.boulders || []).length; bi++) {
    const b = map.boulders[bi];
    const on = selected && selected.type === "boulder" && selected.i === bi;
    ctx.fillStyle = on ? "#c4a070" : "#8a7060";
    ctx.beginPath();
    ctx.arc(b.x / CELL, b.z / CELL, 0.32 + (b.size || 1) * 0.18, 0, 6.28);
    ctx.fill();
    ctx.strokeStyle = on ? "#ffe08a" : "#ffcc66";
    ctx.lineWidth = on ? 0.16 : 0.1;
    ctx.beginPath();
    ctx.moveTo(b.x / CELL, b.z / CELL);
    ctx.lineTo(b.x / CELL - Math.sin(b.yaw || 0) * 1.8, b.z / CELL - Math.cos(b.yaw || 0) * 1.8);
    ctx.stroke();
    ctx.strokeStyle = on ? "rgba(255,180,60,0.85)" : "rgba(200,80,40,0.5)";
    ctx.lineWidth = on ? 0.12 : 0.08;
    ctx.beginPath();
    ctx.arc(b.x / CELL, b.z / CELL, (b.trigger || 8) / CELL, 0, 6.28);
    ctx.stroke();
  }
  for (const v of map.vendors || []) {
    ctx.fillStyle = "#4ad";
    ctx.fillRect(v.x / CELL - 0.35, v.z / CELL - 0.35, 0.7, 0.7);
    ctx.fillStyle = "#ffe08a";
    ctx.fillRect(v.x / CELL - 0.12, v.z / CELL - 0.12, 0.24, 0.24);
  }
  for (const n of map.npcs || []) {
    ctx.fillStyle = "#d4a0ff";
    ctx.beginPath();
    ctx.arc(n.x / CELL, n.z / CELL, 0.32, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = "#ffe8c8";
    ctx.font = (8 / scale) * 1.2 + "px sans-serif";
    ctx.fillText((n.name || "NPC").slice(0, 10), n.x / CELL - 0.4, n.z / CELL - 0.45);
  }
  for (const r of map.ropes) {
    ctx.strokeStyle = r.kind === "chain" ? "#9aa2aa" : "#6a4424";
    ctx.lineWidth = r.kind === "chain" ? 0.14 : 0.08;
    ctx.beginPath();
    ctx.moveTo(r.x / CELL, r.z / CELL);
    ctx.lineTo(r.x / CELL, r.z / CELL + 0.7);
    ctx.stroke();
  }
  for (const rg of map.ridges || []) {
    ctx.strokeStyle = "#c4a070";
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(rg.x / CELL - 0.4, rg.z / CELL);
    ctx.lineTo(rg.x / CELL + 0.4, rg.z / CELL);
    ctx.stroke();
    ctx.fillStyle = "#ffe08a";
    ctx.fillRect(rg.x / CELL - 0.12, rg.z / CELL - 0.12, 0.24, 0.24);
  }
  for (const u of map.ultimatums || []) {
    ctx.fillStyle = "rgba(232,196,32,0.45)";
    for (const c of u.cells || []) ctx.fillRect(c.x + 0.15, c.z + 0.15, 0.7, 0.7);
    ctx.strokeStyle = "#e8c420";
    ctx.lineWidth = 0.1;
    ctx.strokeRect((u.cells?.[0]?.x || 0) + 0.1, (u.cells?.[0]?.z || 0) + 0.1, 0.8, 0.8);
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
  for (let i = (map.npcs || []).length - 1; i >= 0; i--) {
    if (Math.hypot(map.npcs[i].x - c.wx, map.npcs[i].z - c.wz) < 1.2) return { type: "npc", i };
  }
  for (let i = (map.boulders || []).length - 1; i >= 0; i--) {
    const b = map.boulders[i];
    const r = 0.7 + (b.size || 1) * 0.45;
    if (Math.hypot(b.x - c.wx, b.z - c.wz) < r) return { type: "boulder", i };
  }
  return null;
}

function onWall(gx, gz) {
  return !!(map.bwalls && map.bwalls[story] && map.bwalls[story][idx(map, gx, gz)]);
}

function snapArrow(c) {
  const gx = c.gx;
  const gz = c.gz;
  const dirs = [
    { yaw: 0, dx: 0, dz: -1 },
    { yaw: Math.PI, dx: 0, dz: 1 },
    { yaw: Math.PI / 2, dx: -1, dy: 0, dz: 0 },
    { yaw: -Math.PI / 2, dx: 1, dz: 0 },
  ];
  if (inBounds(map, gx, gz) && onWall(gx, gz)) {
    for (const d of dirs) {
      const nx = gx + (d.dx || 0);
      const nz = gz + (d.dz || 0);
      if (inBounds(map, nx, nz) && isCarved(map.cells[idx(map, nx, nz)])) {
        return { x: (gx + 0.5) * CELL, z: (gz + 0.5) * CELL, yaw: d.yaw };
      }
    }
  }
  if (inBounds(map, gx, gz) && isCarved(map.cells[idx(map, gx, gz)])) {
    for (const d of dirs) {
      const nx = gx - (d.dx || 0);
      const nz = gz - (d.dz || 0);
      if (inBounds(map, nx, nz) && !isCarved(map.cells[idx(map, nx, nz)])) {
        return { x: (nx + 0.5) * CELL, z: (nz + 0.5) * CELL, yaw: d.yaw };
      }
    }
  }
  return null;
}

canvas.addEventListener("pointerdown", (ev) => {
  if (ev.button === 1 || ev.button === 2) {
    canvas.setPointerCapture(ev.pointerId);
    canvas._pan = { x: ev.clientX - pan.x, y: ev.clientY - pan.y };
    return;
  }
  const c = cellFromEvent(ev);
  last = c;
  if (["dig", "erase", "sphere", "paint", "crouch", "spike", "sky", "elev", "water", "lava", "wall", "crack", "unstable", "rumble", "hover", "collapse", "slope", "ultimatum"].includes(tool)) {
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
    else if (objKind === "walllamp") {
      const snapped = snapArrow(c);
      pushUndo();
      if (snapped) {
        map.objects.push({ kind: "walllamp", x: snapped.x, z: snapped.z, s: objScale, rot: snapped.yaw });
        status("Wall lamp on wall");
      } else {
        map.objects.push({ kind: "walllamp", x: c.wx, z: c.wz, s: objScale, rot: 0 });
        status("Wall lamp");
      }
      selected = { type: "obj", i: map.objects.length - 1 };
    } else {
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
  } else if (tool === "rope" || tool === "chain") {
    pushUndo();
    map.ropes.push({ x: c.wx, z: c.wz, len: 4.5, kind: tool === "chain" ? "chain" : "rope" });
    status(tool === "chain" ? "Chain" : "Rope");
    draw();
  } else if (tool === "ridge") {
    const snapped = snapArrow(c);
    if (!snapped) {
      status("Place ridges on a wall or hall edge");
      return;
    }
    pushUndo();
    map.ridges = map.ridges || [];
    map.ridges.push({ x: snapped.x, z: snapped.z, yaw: snapped.yaw, elev: ridgeElev });
    status("Ridge at height " + ridgeElev);
    draw();
  } else if (tool === "minotaur" || tool === "drone") {
    pushUndo();
    const enemy = tool === "minotaur" ? "minotaur" : "sentrydrone";
    map.spawners.push({ x: c.wx, z: c.wz, enemy, interval: 9999, radius: enemy === "minotaur" ? 28 : 10, maxAlive: 1 });
    selected = { type: "spawner", i: map.spawners.length - 1 };
    status(tool === "minotaur" ? "Minotaur" : "Sentry drone");
    draw();
  } else if (tool === "turret" || tool === "gunturret") {
    pushUndo();
    map.turrets.push({ x: c.wx, z: c.wz, kind: tool === "gunturret" ? "gun" : "flame" });
    status(tool === "gunturret" ? "Gun turret" : "Flame turret");
    draw();
  } else if (tool === "arrow") {
    const snapped = snapArrow(c);
    if (!snapped) {
      status("Place on a wall or the side of carved dungeon space");
      return;
    }
    pushUndo();
    map.arrows = map.arrows || [];
    map.arrows.push(snapped);
    status("Arrow trap");
    draw();
  } else if (tool === "crusher") {
    pushUndo();
    map.crushers.push({ x: c.wx, z: c.wz });
    draw();
  } else if (tool === "boulder") {
    const hit = hitAt(c);
    if (hit && hit.type === "boulder") {
      selected = hit;
      const b = map.boulders[hit.i];
      boulderSize = b.size || 1;
      boulderTrigger = b.trigger || 8;
      if ($("bsize")) $("bsize").value = String(boulderSize);
      if ($("bsize-v")) $("bsize-v").textContent = boulderSize.toFixed(2);
      if ($("btrig")) $("btrig").value = String(boulderTrigger);
      if ($("btrig-v")) $("btrig-v").textContent = boulderTrigger.toFixed(1);
      drawing = true;
      status("Selected — drag to change roll direction");
    } else {
      pushUndo();
      map.boulders = map.boulders || [];
      map.boulders.push({ x: c.wx, z: c.wz, yaw: 0, trigger: boulderTrigger, size: boulderSize });
      selected = { type: "boulder", i: map.boulders.length - 1 };
      drawing = true;
      status("Boulder set — drag to aim roll direction");
    }
    draw();
  } else if (tool === "vendor") {
    pushUndo();
    map.vendors = map.vendors || [];
    map.vendors.push({ x: c.wx, z: c.wz });
    status("Vending machine");
    draw();
  } else if (tool === "npc") {
    const hit = hitAt(c);
    if (hit && hit.type === "npc") {
      selected = hit;
      fillNpcForm();
      status("Editing " + (map.npcs[hit.i].name || "NPC"));
    } else {
      pushUndo();
      map.npcs = map.npcs || [];
      map.npcs.push(defaultNpc(c.wx, c.wz));
      selected = { type: "npc", i: map.npcs.length - 1 };
      fillNpcForm();
      status("NPC placed — set name and dialogue");
    }
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
  } else if (tool === "rumble") {
    stampFlags(map, c.x, c.z, brush, FLAG_RUMBLE, true);
  } else if (tool === "hover") {
    stampDisk(map, c.x, c.z, brush, shape, tex, false);
    stampFlags(map, c.x, c.z, brush, FLAG_HOVER, true);
    stampLayer(map.elev, map, c.x, c.z, brush, elev);
  } else if (tool === "slope") {
    stampDisk(map, c.x, c.z, brush, SHAPE_FLAT, tex, false);
    stampFlags(map, c.x, c.z, brush, FLAG_SLOPE, true);
  } else if (tool === "ultimatum") {
    const gx = Math.floor(c.x);
    const gz = Math.floor(c.z);
    if (!inBounds(map, gx, gz)) return;
    map.ultimatums = map.ultimatums || [];
    if (!pendingUlti) {
      pendingUlti = { id: uid("u"), cells: [] };
      map.ultimatums.push(pendingUlti);
    }
    if (!pendingUlti.cells.some((p) => p.x === gx && p.z === gz)) pendingUlti.cells.push({ x: gx, z: gz });
    refreshUltiList();
  } else if (tool === "collapse") {
    stampDisk(map, c.x, c.z, brush, shape, tex, false);
    stampFlags(map, c.x, c.z, brush, FLAG_COLLAPSE, true);
    const gx = Math.floor(c.x), gz = Math.floor(c.z);
    if (inBounds(map, gx, gz) && map.flags[idx(map, gx, gz)] & FLAG_HOVER) {
      stampFlags(map, c.x, c.z, brush, FLAG_HOVER, true);
    }
  } else if (tool === "sky") {
    stampDisk(map, c.x, c.z, brush, shape, tex, false);
    stampLayer(map.sky, map, c.x, c.z, brush, skyKind);
  } else if (tool === "elev") stampLayer(map.elev, map, c.x, c.z, brush, elev);
  else if (tool === "water") stampLayer(map.liquid, map, c.x, c.z, brush, LIQ_WATER);
  else if (tool === "lava") stampLayer(map.liquid, map, c.x, c.z, brush, LIQ_LAVA);
  else if (tool === "wall") stampLayer(map.bwalls[story], map, c.x, c.z, Math.max(0.6, brush * 0.45), wtex);
  else if (tool === "crack") stampCrack(map.bwalls[story], map, c.x, c.z, Math.max(0.6, brush * 0.45), wtex);
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
      stampFlags(map, c.x, c.z, brush, FLAG_SPIKE | FLAG_CROUCH | FLAG_UNSTABLE | FLAG_RUMBLE | FLAG_COLLAPSE | FLAG_HOVER | FLAG_SLOPE, false);
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
  if (tool === "boulder" && selected && selected.type === "boulder") {
    const b = map.boulders[selected.i];
    if (b) {
      b.yaw = Math.atan2(b.x - c.wx, b.z - c.wz);
      draw();
    }
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
  if (["dig", "erase", "sphere", "paint", "crouch", "spike", "sky", "elev", "water", "lava", "wall", "crack", "unstable", "rumble", "hover", "collapse", "slope", "ultimatum"].includes(tool)) {
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
  if (tool === "ultimatum" && pendingUlti && pendingUlti.cells.length) {
    status("Ultimatum door " + pendingUlti.id.slice(0, 6) + " — use the list to place its recovery key");
    refreshUltiList();
  }
  pendingUlti = null;
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

function optSlot(op, i, prefix) {
  op = op || { text: "", reply: "", options: [] };
  const nest = (op.options || []).slice(0, 3);
  while (nest.length < 3) nest.push({ text: "", reply: "", options: [] });
  return `<div class="npc-opt" data-i="${i}" data-p="${prefix}">
    <label>Player choice ${i + 1}</label>
    <input data-k="text" type="text" maxlength="80" value="${(op.text || "").replace(/"/g, "&quot;")}" />
    <label>NPC reply</label>
    <textarea data-k="reply" rows="2" maxlength="240">${(op.reply || "").replace(/</g, "&lt;")}</textarea>
    ${nest.map((n, j) => `<label>Then ${j + 1}</label>
      <input data-k="ntext" data-j="${j}" type="text" maxlength="80" value="${(n.text || "").replace(/"/g, "&quot;")}" placeholder="follow-up choice" />
      <textarea data-k="nreply" data-j="${j}" rows="2" maxlength="240" placeholder="follow-up reply">${(n.reply || "").replace(/</g, "&lt;")}</textarea>`).join("")}
  </div>`;
}

function fillNpcForm() {
  const host = $("npc-opts");
  const n = selected?.type === "npc" ? map.npcs[selected.i] : null;
  if ($("npc-name")) $("npc-name").value = n?.name || "";
  if ($("npc-open")) $("npc-open").value = n?.opener || "";
  if (!host) return;
  const opts = (n?.options || []).slice(0, 3);
  while (opts.length < 3) opts.push({ text: "", reply: "", options: [] });
  host.innerHTML = opts.map((op, i) => optSlot(op, i, "")).join("");
  host.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", readNpcForm));
  if ($("npc-name") && !$("npc-name")._wired) {
    $("npc-name")._wired = true;
    $("npc-name").addEventListener("input", readNpcForm);
    $("npc-open").addEventListener("input", readNpcForm);
  }
}

function readNpcForm() {
  if (selected?.type !== "npc") return;
  const n = map.npcs[selected.i];
  if (!n) return;
  n.name = ($("npc-name")?.value || "Wanderer").slice(0, 32);
  n.opener = ($("npc-open")?.value || "").slice(0, 240);
  const boxes = [...document.querySelectorAll("#npc-opts .npc-opt")];
  n.options = boxes.map((box) => {
    const text = box.querySelector('[data-k="text"]')?.value || "";
    const reply = box.querySelector('[data-k="reply"]')?.value || "";
    const nest = [];
    box.querySelectorAll('[data-k="ntext"]').forEach((inp) => {
      const j = +inp.dataset.j;
      const ta = box.querySelector(`[data-k="nreply"][data-j="${j}"]`);
      nest[j] = { text: inp.value || "", reply: ta?.value || "", options: [] };
    });
    return { text, reply, options: nest.filter((o) => o.text || o.reply) };
  }).filter((o) => o.text || o.reply);
  draw();
}

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
    spike: "Spike pits. Jump them or die. Ceiling rises so you can vault them.",
    unstable: "Paint a ceiling that collapses around anyone who walks under it.",
    boulder: "Click to place, drag to aim. Click an existing boulder and drag to change direction. Size and activation radius sliders edit the selected boulder.",
    minotaur: "Place a minotaur. Walks slowly until it sees you, then roars and charges.",
    chain: "Hanging chain. Same grip as rope, metal clink, looks like links.",
    slope: "Paint a stripe between two elevation levels. The ramp is calculated from those heights and the distance.",
    ridge: "Wall ledge. Set elevation, snap to a wall. Grip to stick, triggers to inch across.",
    ultimatum: "Draw across a hallway. After the player passes, lab doors slam shut. Place a recovery key from the list.",
    gunturret: "Machine-gun turret. Same tracking as flame, 30% more range, 5 second reload.",
    drone: "Place a flying sentry drone. It weaves through vertical space and fires lasers.",
    rumble: "Paint invisible rumble tiles. Walking over them shakes the camera and controllers.",
    hover: "Short floating slabs. Set elevation, then paint. Open air under them so you can walk beneath.",
    collapse: "Collapsing floor. Rumbles, then drops into a bottomless pit that kills. Paint over a hover slab for a collapsing platform.",
    arrow: "Wall dart trap. Snaps to building walls or the sides of carved halls. 3s cooldown.",
    vendor: "Vending machine. Player presses E to buy weapons, ammo, and powerups with coins.",
    npc: "Place a talking NPC. Set their name, opening line, and up to 3 player replies (each with a nested follow-up).",
    stairs: "Place only where 1st+2nd or 2nd+3rd stories both have enclosed floors.",
    ladder: "Place only where consecutive stories both have enclosed floors.",
    sky: "Open courtyard — grass floor, courtyard walls, real sky (no cave lid).",
    elev: "Raise or lower the floor by player-heights.",
    water: "Water layer on top of height.",
    lava: "Lava layer — it burns. Ceiling rises so you can jump it.",
    start: "Click spawn, drag to face.",
    wall: "Draw building walls. Enclosed rooms get floors and roofs.",
    crack: "Paint damaged, cracked wall segments. Psyblast shatters them into debris.",
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
if ($("bsize")) {
  $("bsize").addEventListener("input", () => {
    boulderSize = +$("bsize").value;
    $("bsize-v").textContent = boulderSize.toFixed(2);
    if (selected?.type === "boulder" && map.boulders[selected.i]) {
      map.boulders[selected.i].size = boulderSize;
      draw();
    }
  });
}
if ($("btrig")) {
  $("btrig").addEventListener("input", () => {
    boulderTrigger = +$("btrig").value;
    $("btrig-v").textContent = boulderTrigger.toFixed(1);
    if (selected?.type === "boulder" && map.boulders[selected.i]) {
      map.boulders[selected.i].trigger = boulderTrigger;
      draw();
    }
  });
}
if ($("ridge-elev")) {
  $("ridge-elev").addEventListener("input", () => {
    ridgeElev = +$("ridge-elev").value;
    if ($("ridge-v")) $("ridge-v").textContent = String(ridgeElev);
  });
}

function refreshUltiList() {
  const host = $("ulti-list");
  if (!host) return;
  const list = map.ultimatums || [];
  host.innerHTML = list.length
    ? list.map((u, i) => `<div class="row"><span>Door ${i + 1}</span><button type="button" data-ukey="${u.id}">Place recovery key</button></div>`).join("")
    : "<p class='hint'>No ultimatum doors yet.</p>";
  host.querySelectorAll("[data-ukey]").forEach((b) => {
    b.addEventListener("click", () => {
      pendingKey = b.dataset.ukey;
      setTool("key");
      if ($("key-hint")) $("key-hint").textContent = "Click to drop the recovery key for door " + b.dataset.ukey.slice(0, 6);
      status("Place recovery key for " + b.dataset.ukey.slice(0, 6));
    });
  });
}
if ($("msize")) {
  $("msize").addEventListener("input", () => {
    const n = +$("msize").value;
    if ($("msize-v")) $("msize-v").textContent = n + "×" + n;
  });
  $("msize").addEventListener("change", () => {
    const n = +$("msize").value;
    if (n === map.w && n === map.h) return;
    pushUndo();
    map = resizeMap(map, n, n);
    if ($("msize-v")) $("msize-v").textContent = map.w + "×" + map.h;
    fit();
    status("Map size " + map.w + "×" + map.h);
  });
}
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
  if ($("bsize-v")) $("bsize-v").textContent = boulderSize.toFixed(2);
  if ($("bsize")) $("bsize").value = String(boulderSize);
  if ($("btrig-v")) $("btrig-v").textContent = boulderTrigger.toFixed(1);
  if ($("btrig")) $("btrig").value = String(boulderTrigger);
  if ($("ridge-v")) $("ridge-v").textContent = String(ridgeElev);
  refreshUltiList();
  $("sp-int-v").textContent = spawnInterval.toFixed(1) + "s";
  $("sp-rad-v").textContent = spawnRadius.toFixed(1);
  $("sp-max-v").textContent = String(spawnMax);
  $("map-name").value = map.name;
  if ($("msize")) {
    $("msize").value = String(map.w);
    if ($("msize-v")) $("msize-v").textContent = map.w + "×" + map.h;
  }
}

$("map-name").addEventListener("input", () => (map.name = $("map-name").value || "Untitled"));
$("save").addEventListener("click", async () => {
  map.name = $("map-name").value || "Untitled";
  const r = await saveMap(map);
  if (r.remote) status("Saved r" + (map.rev || r.body?.rev || "") + " to Zoom — play and headset will load this version");
  else if (r.ok) status("Saved r" + (map.rev || "") + " on this device only — Save again so the headset sees it");
  else status("Save failed (" + (r.status || "offline") + "). Headset will keep the old version.");
  refreshList();
});
$("play").addEventListener("click", () => {
  stashPreview(map);
  const q = map.id ? "?map=" + encodeURIComponent(map.id) + (map.rev ? "&r=" + map.rev : "") + "&preview=1" : "?map=preview";
  location.href = routes().play + q;
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
      else if (selected.type === "npc") map.npcs.splice(selected.i, 1);
      else if (selected.type === "boulder") map.boulders.splice(selected.i, 1);
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
