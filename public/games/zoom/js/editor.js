import {
  BIOMES,
  CELL,
  ENEMIES,
  OBJECTS,
  SHAPE_FLAT,
  SHAPE_SPHERE,
  SHAPES,
  routes,
} from "./config.js";
import { bakedMaps } from "./defaults.js";
import {
  addSphere,
  blankMap,
  cloneMap,
  countCarved,
  deserialize,
  eraseNear,
  flood,
  paintDisk,
  serialize,
  stampDisk,
  stampRect,
  stampSegment,
} from "./map.js";
import { deleteMap, getMap, listMaps, saveMap, stashPreview } from "./store.js";

const $ = (id) => document.getElementById(id);

let map = blankMap("New delve");
let tool = "dig";
let shape = SHAPE_FLAT;
let tex = 1;
let brush = 2.2;
let objKind = "torch";
let enemyId = "wolf";
let spawnInterval = 6;
let spawnRadius = 8;
let spawnMax = 3;
let objScale = 1;
let selected = null;
let drawing = false;
let last = null;
let rectA = null;
let pan = { x: 0, y: 0 };
let scale = 8;
let undo = [];

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
  return { x, z, wx: x * CELL, wz: z * CELL };
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

function draw() {
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
  for (let z = 0; z < map.h; z++) {
    for (let x = 0; x < map.w; x++) {
      const b = map.cells[z * map.w + x];
      if (b & 1) {
        const t = (b >> 3) & 15;
        ctx.fillStyle = BIOMES[t]?.swatch || "#888";
        ctx.fillRect(x, z, 1.02, 1.02);
      }
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1 / scale;
  if (scale > 6) {
    ctx.beginPath();
    for (let x = 0; x <= map.w; x += 8) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, map.h);
    }
    for (let z = 0; z <= map.h; z += 8) {
      ctx.moveTo(0, z);
      ctx.lineTo(map.w, z);
    }
    ctx.stroke();
  }
  for (const s of map.spheres) {
    ctx.beginPath();
    ctx.arc(s.x / CELL, s.z / CELL, s.r / CELL, 0, 6.28);
    ctx.strokeStyle = "rgba(200,160,255,0.85)";
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
  }
  for (const o of map.objects) {
    ctx.fillStyle = "#f0d080";
    ctx.fillRect(o.x / CELL - 0.35, o.z / CELL - 0.35, 0.7, 0.7);
  }
  for (const s of map.spawners) {
    ctx.beginPath();
    ctx.arc(s.x / CELL, s.z / CELL, (s.radius || 8) / CELL, 0, 6.28);
    ctx.strokeStyle = "rgba(255,80,70,0.55)";
    ctx.lineWidth = 1.4 / scale;
    ctx.stroke();
    ctx.fillStyle = "#ff5a4a";
    ctx.beginPath();
    ctx.arc(s.x / CELL, s.z / CELL, 0.45, 0, 6.28);
    ctx.fill();
  }
  if (map.start) {
    ctx.fillStyle = "#7dffb0";
    ctx.beginPath();
    ctx.arc(map.start.x / CELL, map.start.z / CELL, 0.55, 0, 6.28);
    ctx.fill();
  }
  if (selected) {
    const p = selected.type === "obj" ? map.objects[selected.i] : map.spawners[selected.i];
    if (p) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(p.x / CELL - 0.8, p.z / CELL - 0.8, 1.6, 1.6);
    }
  }
  if (rectA && last && (tool === "rect" || tool === "outline")) {
    ctx.strokeStyle = tool === "outline" ? "#9ad4ff" : "#ffe08a";
    ctx.lineWidth = 1.2 / scale;
    const x0 = Math.min(rectA.x, last.x);
    const z0 = Math.min(rectA.z, last.z);
    ctx.strokeRect(x0, z0, Math.abs(last.x - rectA.x), Math.abs(last.z - rectA.z));
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
  if (tool === "dig" || tool === "erase" || tool === "sphere") {
    pushUndo();
    drawing = true;
    const sh = tool === "sphere" ? SHAPE_SPHERE : shape;
    const prev = shape;
    if (tool === "sphere") shape = SHAPE_SPHERE;
    applyBrush(c, tool === "erase");
    shape = prev;
    draw();
  } else if (tool === "rect" || tool === "outline") {
    pushUndo();
    rectA = c;
    drawing = true;
  } else if (tool === "fill") {
    pushUndo();
    const n = flood(map, c.x, c.z, shape, tex, false);
    status(n ? "Filled " + n + " cells" : "Fill bounded by the world edge — draw a closed outline first");
    draw();
  } else if (tool === "paint") {
    pushUndo();
    drawing = true;
    paintDisk(map, c.x, c.z, brush, tex);
    draw();
  } else if (tool === "object") {
    const hit = hitAt(c);
    if (hit && hit.type === "obj") {
      selected = hit;
    } else {
      pushUndo();
      map.objects.push({ kind: objKind, x: c.wx, z: c.wz, s: objScale, rot: 0 });
      selected = { type: "obj", i: map.objects.length - 1 };
      status("Placed " + objKind);
    }
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
      map.spawners.push({
        x: c.wx,
        z: c.wz,
        enemy: enemyId,
        interval: spawnInterval,
        radius: spawnRadius,
        maxAlive: spawnMax,
      });
      selected = { type: "spawner", i: map.spawners.length - 1 };
      status("Spawner: " + enemyId);
    }
    draw();
  } else if (tool === "start") {
    pushUndo();
    map.start = { x: c.wx, z: c.wz, yaw: 0 };
    status("Player start set");
    draw();
  }
});

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
  if (tool === "paint") {
    paintDisk(map, c.x, c.z, brush, tex);
    last = c;
    draw();
  } else if (tool === "dig" || tool === "erase" || tool === "sphere") {
    const prev = shape;
    if (tool === "sphere") shape = SHAPE_SPHERE;
    if (last) stampSegment(map, last.x, last.z, c.x, c.z, brush, shape, tex, tool === "erase");
    else applyBrush(c, tool === "erase");
    if (tool === "sphere" && tool !== "erase") addSphere(map, c.wx, c.wz, brush * CELL * 0.9, tex);
    if (tool === "erase") eraseNear(map, c.wx, c.wz, brush * CELL * 0.6);
    shape = prev;
    last = c;
    draw();
  } else if (tool === "rect" || tool === "outline") {
    last = c;
    draw();
  } else if ((tool === "object" || tool === "spawner") && selected && ev.buttons === 1) {
    const p = selected.type === "obj" ? map.objects[selected.i] : map.spawners[selected.i];
    if (p) {
      p.x = c.wx;
      p.z = c.wz;
      draw();
    }
  }
});

function endDraw(ev) {
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
    const old = scale;
    scale = Math.max(3, Math.min(28, scale * (ev.deltaY > 0 ? 0.9 : 1.1)));
    pan.x = ev.clientX - canvas.getBoundingClientRect().left - c.x * scale;
    pan.y = ev.clientY - canvas.getBoundingClientRect().top - c.z * scale;
    if (Math.abs(scale - old) > 0.01) draw();
  },
  { passive: false },
);

function setTool(t) {
  tool = t;
  document.querySelectorAll("[data-tool]").forEach((b) => b.classList.toggle("on", b.dataset.tool === t));
  status(t);
}

document.querySelectorAll("[data-tool]").forEach((b) => {
  b.addEventListener("click", () => setTool(b.dataset.tool));
});

function fillSelect(el, items, getId, getName) {
  el.innerHTML = items.map((it) => `<option value="${getId(it)}">${getName(it)}</option>`).join("");
}

fillSelect($("shape"), SHAPES, (s) => String(s.id), (s) => s.name);
fillSelect($("biome"), BIOMES, (b, i) => String(BIOMES.indexOf(b)), (b) => b.name);
fillSelect($("obj"), OBJECTS, (o) => o.id, (o) => o.name);
fillSelect($("sp-enemy"), ENEMIES, (e) => e.id, (e) => e.name);

$("shape").value = String(shape);
$("biome").value = String(tex);
$("obj").value = objKind;
$("sp-enemy").value = enemyId;

$("shape").addEventListener("change", () => {
  shape = +$("shape").value;
  $("shape-hint").textContent = SHAPES.find((s) => s.id === shape)?.hint || "";
});
$("biome").addEventListener("change", () => (tex = +$("biome").value));
$("obj").addEventListener("change", () => (objKind = $("obj").value));
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
  $("sp-int-v").textContent = spawnInterval.toFixed(1) + "s";
  $("sp-rad-v").textContent = spawnRadius.toFixed(1);
  $("sp-max-v").textContent = String(spawnMax);
  $("map-name").value = map.name;
  $("shape-hint").textContent = SHAPES.find((s) => s.id === shape)?.hint || "";
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

$("play-unsaved").addEventListener("click", () => {
  stashPreview(map);
  location.href = routes().play + "?map=preview";
});

$("new").addEventListener("click", () => {
  pushUndo();
  map = blankMap("New delve");
  selected = null;
  syncSliders();
  fit();
  status("New map — draw to dig");
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
  if (e.code === "BracketLeft") {
    brush = Math.max(0.5, brush - 0.5);
    $("brush").value = brush;
    syncSliders();
  }
  if (e.code === "BracketRight") {
    brush = Math.min(16, brush + 0.5);
    $("brush").value = brush;
    syncSliders();
  }
  if (e.code === "Delete" || e.code === "Backspace") {
    if (selected) {
      pushUndo();
      if (selected.type === "obj") map.objects.splice(selected.i, 1);
      else map.spawners.splice(selected.i, 1);
      selected = null;
      draw();
    }
  }
  const mapKeys = { KeyD: "dig", KeyE: "erase", KeyR: "rect", KeyO: "outline", KeyG: "sphere", KeyF: "fill", KeyP: "paint" };
  if (mapKeys[e.code]) setTool(mapKeys[e.code]);
});

const swatches = $("swatches");
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
  swatches.appendChild(d);
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
    b.textContent = m.name + (m.id.startsWith("baked") ? " (sample)" : "");
    b.addEventListener("click", async () => {
      const loaded = m.id.startsWith("baked") ? bakedMaps().find((x) => x.id === m.id) : await getMap(m.id);
      map = loaded ? cloneMap(loaded) : cloneMap(m);
      if (m.id.startsWith("baked")) map.id = "m" + Math.random().toString(36).slice(2, 10);
      selected = null;
      syncSliders();
      fit();
      status("Loaded " + map.name);
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
    if (m) map = m;
  }
  syncSliders();
  setTool("dig");
  await refreshList();
  fit();
  status("Draw to dig. Fill a square for a room. Outline a square for a hallway circuit. " + countCarved(map) + " cells open.");
})();
