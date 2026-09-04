import {
  CELL,
  STORIES,
  WALL_TEX,
  OBJECTS,
  SPAWN_KINDS,
  PICKUPS,
  FLAG_SPIKE,
  FLAG_HOVER,
  FLAG_COLLAPSE,
  FLAG_SLOPE,
  FLAG_UNSTABLE,
  FLAG_RUMBLE,
  LIQ_WATER,
  LIQ_LAVA,
  idx,
  inBounds,
  packWall,
  wallTexId,
  openingAt,
  worldX,
  worldZ,
  blankMap,
  serialize,
  deserialize,
  ensureLayers,
  enclosedFloors,
  stampDisk,
  listMaps,
  listMapsLocal,
  saveMap,
  deleteMap,
  stashPreview,
  cloneMap,
  hasFoundation,
  flagsAt,
  liquidAt,
  newMapId,
} from "./ow-map.js?v=h36";

const $ = (id) => document.getElementById(id);

let map = blankMap("New open world");
ensureLayers(map);
let tool = "wall";
let brush = 1.2;
let story = 0;
let wtex = 1;
let elev = 0;
let pickupKind = "smg";
let objKind = "torch";
let enemyId = "horde";
let spawnInterval = 8;
let spawnRadius = 12;
let spawnMax = 4;
let boulderSize = 1;
let boulderTrigger = 8;
let selected = null;
let drawing = false;
let last = null;
let pan = { x: 0, y: 0 };
let scale = 10;
let undo = [];
let pendingAim = null;

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
  return { x, z, wx: worldX(map, x), wz: worldZ(map, z), gx: Math.floor(x), gz: Math.floor(z) };
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

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.fillStyle = "#1a2418";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(pan.x, pan.y);
  ctx.scale(scale, scale);
  for (let z = 0; z < map.h; z++) {
    for (let x = 0; x < map.w; x++) {
      const i = idx(map, x, z);
      const fl = flagsAt(map, story)[i];
      const liq = liquidAt(map, story)[i];
      const wall = map.bwalls[story][i];
      const below = story > 0 && map.bwalls[story - 1][i];
      if (liq === LIQ_LAVA) ctx.fillStyle = "#ff5511";
      else if (liq === LIQ_WATER) ctx.fillStyle = "#2a6aaa";
      else if (fl & FLAG_SPIKE) ctx.fillStyle = "#c44";
      else if (fl & FLAG_HOVER) ctx.fillStyle = "#3a6a78";
      else if (fl & FLAG_COLLAPSE) ctx.fillStyle = "#8a3020";
      else if (fl & FLAG_SLOPE) ctx.fillStyle = "#c4a070";
      else if (fl & FLAG_UNSTABLE) ctx.fillStyle = "#6a3018";
      else if (fl & FLAG_RUMBLE) ctx.fillStyle = "#4a4038";
      else ctx.fillStyle = map.elev[i] ? "#3a4a30" : "#243024";
      ctx.fillRect(x, z, 1.02, 1.02);
      if (below && !wall) {
        ctx.fillStyle = "rgba(80,90,80,0.45)";
        ctx.fillRect(x + 0.2, z + 0.2, 0.6, 0.6);
      }
      if (wall) {
        ctx.fillStyle = WALL_TEX[(wallTexId(wall) - 1) % WALL_TEX.length].swatch;
        ctx.fillRect(x + 0.08, z + 0.08, 0.84, 0.84);
        const open = openingAt(map, x, z, story);
        if (open) {
          ctx.fillStyle = open.type === "window" ? "#88e0ff" : open.type === "arch" ? "#d4b070" : "#8a5a32";
          ctx.fillRect(x + 0.28, z + 0.28, 0.44, 0.44);
        }
      }
    }
  }
  const floors = enclosedFloors(map, story);
  ctx.fillStyle = "rgba(180,140,80,0.22)";
  for (let z = 0; z < map.h; z++) {
    for (let x = 0; x < map.w; x++) {
      if (floors[idx(map, x, z)]) ctx.fillRect(x + 0.15, z + 0.15, 0.7, 0.7);
    }
  }
  function mark(list, color, shape) {
    ctx.fillStyle = color;
    for (const o of list || []) {
      const gx = o.x / CELL + map.w * 0.5;
      const gz = o.z / CELL + map.h * 0.5;
      if (shape === "flag") {
        ctx.beginPath();
        ctx.moveTo(gx, gz - 0.35);
        ctx.lineTo(gx + 0.3, gz + 0.2);
        ctx.lineTo(gx - 0.3, gz + 0.2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(gx, gz, 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  mark(map.zoneFlags, "#4a9adf", "flag");
  mark(map.pickups, "#d4af37");
  mark(map.spawners, "#c44");
  mark(map.crushers, "#aaa");
  mark(map.boulders, "#6a5a48");
  mark(map.turrets, "#ff6622");
  mark(map.ropes, "#8a6230");
  mark(map.arrows, "#ffe08a");
  mark(map.climbs, "#c4a070");
  mark(map.objects, "#ffcc66");
  mark(map.ridges, "#888");
  const sx = map.start.x / CELL + map.w * 0.5;
  const sz = map.start.z / CELL + map.h * 0.5;
  ctx.fillStyle = "#7dffb0";
  ctx.beginPath();
  ctx.arc(sx, sz, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7dffb0";
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  ctx.moveTo(sx, sz);
  ctx.lineTo(sx - Math.sin(map.start.yaw || 0) * 1.1, sz - Math.cos(map.start.yaw || 0) * 1.1);
  ctx.stroke();
  ctx.restore();
}

function paintCell(gx, gz) {
  if (!inBounds(map, gx, gz)) return;
  const i = idx(map, gx, gz);
  if (tool === "elev") {
    map.elev[i] = elev;
    return;
  }
  if (tool !== "erase" && !hasFoundation(map, gx, gz, story)) return false;
  if (tool === "wall" || tool === "crack") {
    map.bwalls[story][i] = packWall(wtex, tool === "crack");
  } else if (tool === "erase") {
    map.bwalls[story][i] = 0;
    flagsAt(map, story)[i] = 0;
    liquidAt(map, story)[i] = 0;
    map.openings = map.openings.filter((o) => !(o.gx === gx && o.gz === gz && (o.story || 0) === story));
  } else if (tool === "water") liquidAt(map, story)[i] = LIQ_WATER;
  else if (tool === "lava") liquidAt(map, story)[i] = LIQ_LAVA;
  else if (tool === "spike") flagsAt(map, story)[i] |= FLAG_SPIKE;
  else if (tool === "hover") flagsAt(map, story)[i] |= FLAG_HOVER;
  else if (tool === "collapse") flagsAt(map, story)[i] |= FLAG_COLLAPSE;
  else if (tool === "slope") flagsAt(map, story)[i] |= FLAG_SLOPE;
  else if (tool === "unstable") flagsAt(map, story)[i] |= FLAG_UNSTABLE;
  else if (tool === "rumble") flagsAt(map, story)[i] |= FLAG_RUMBLE;
  return true;
}

function stamp(gx, gz) {
  if (["wall", "crack", "erase", "water", "lava", "elev", "spike", "hover", "collapse", "slope", "unstable", "rumble"].includes(tool)) {
    let blocked = 0;
    let painted = 0;
    stampDisk(map, gx, gz, brush, (x, z) => {
      const ok = paintCell(x, z);
      if (ok === false) blocked++;
      else painted++;
    });
    if (blocked && !painted && tool !== "erase" && tool !== "elev") {
      status("Needs foundation under elevation " + (story + 1) + " — enclose a room below first");
    }
  }
}

function placePoint(c, ev) {
  const wx = worldX(map, c.x);
  const wz = worldZ(map, c.z);
  if (tool === "start") {
    map.start = { x: wx, z: wz, yaw: map.start.yaw || 0 };
    pendingAim = { kind: "start" };
    status("Drag to face");
  } else if (tool === "flag") {
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.zoneFlags.push({ x: wx, z: wz, story });
    status("Flag at elevation " + (story + 1));
  } else if (tool === "pickup") {
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.pickups.push({ id: pickupKind, x: wx, z: wz, story });
    status("Pickup " + pickupKind + " @ " + (story + 1));
  } else if (tool === "spawner") {
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.spawners.push({ kind: enemyId, x: wx, z: wz, interval: spawnInterval, radius: spawnRadius, max: spawnMax, story });
    status("Spawner");
  } else if (tool === "object") {
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.objects.push({ id: objKind, x: wx, z: wz, story });
  } else if (tool === "rope" || tool === "chain") {
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.ropes.push({ x: wx, z: wz, kind: tool, len: 4.5, story });
  } else if (tool === "turret" || tool === "gunturret") {
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.turrets.push({ x: wx, z: wz, kind: tool === "gunturret" ? "gun" : "flame", story });
  } else if (tool === "crusher") {
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.crushers.push({ x: wx, z: wz, story });
  } else if (tool === "boulder") {
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.boulders.push({ x: wx, z: wz, yaw: 0, size: boulderSize, trigger: boulderTrigger, story });
    pendingAim = { kind: "boulder", i: map.boulders.length - 1 };
    status("Drag to aim roll");
  } else if (tool === "arrow") {
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.arrows.push({ x: wx, z: wz, yaw: 0, story });
    pendingAim = { kind: "arrow", i: map.arrows.length - 1 };
    status("Drag to aim");
  } else if (tool === "ridge") {
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.ridges.push({ x: wx, z: wz, elev: elev || 1, story });
  } else if (tool === "stairs" || tool === "ladder") {
    if (story >= STORIES - 1) { status("No elevation above 10"); return; }
    if (!hasFoundation(map, c.gx, c.gz, story)) { status("Needs foundation under elevation " + (story + 1)); return; }
    map.climbs.push({ kind: tool, x: wx, z: wz, from: story, to: story + 1, yaw: 0, story });
  } else if (tool === "window" || tool === "door" || tool === "arch") {
    if (!inBounds(map, c.gx, c.gz)) return;
    if (!map.bwalls[story][idx(map, c.gx, c.gz)]) {
      status("Snap onto a wall");
      return;
    }
    map.openings = map.openings.filter((o) => !(o.gx === c.gx && o.gz === c.gz && (o.story || 0) === story));
    map.openings.push({ gx: c.gx, gz: c.gz, story, type: tool });
    status(tool + " opening");
  } else {
    stamp(c.x, c.z);
  }
}

function onDown(ev) {
  if (ev.button === 2 || ev.button === 1) {
    canvas.dataset.pan = "1";
    canvas.dataset.px = ev.clientX;
    canvas.dataset.py = ev.clientY;
    return;
  }
  pushUndo();
  drawing = true;
  const c = cellFromEvent(ev);
  last = c;
  placePoint(c, ev);
  draw();
}
function onMove(ev) {
  const c = cellFromEvent(ev);
  $("xy").textContent = c.gx + ", " + c.gz + "  ·  E" + (story + 1);
  if (canvas.dataset.pan === "1") {
    pan.x += ev.clientX - +canvas.dataset.px;
    pan.y += ev.clientY - +canvas.dataset.py;
    canvas.dataset.px = ev.clientX;
    canvas.dataset.py = ev.clientY;
    draw();
    return;
  }
  if (pendingAim && drawing) {
    if (pendingAim.kind === "start") {
      map.start.yaw = Math.atan2(c.wx - map.start.x, c.wz - map.start.z);
    } else if (pendingAim.kind === "boulder") {
      const b = map.boulders[pendingAim.i];
      if (b) b.yaw = Math.atan2(c.wx - b.x, c.wz - b.z);
    } else if (pendingAim.kind === "arrow") {
      const a = map.arrows[pendingAim.i];
      if (a) a.yaw = Math.atan2(c.wx - a.x, c.wz - a.z);
    }
    draw();
    return;
  }
  if (!drawing) return;
  if (["wall", "crack", "erase", "water", "lava", "elev", "spike", "hover", "collapse", "slope", "unstable", "rumble"].includes(tool)) {
    stamp(c.x, c.z);
    draw();
  }
}
function onUp() {
  drawing = false;
  pendingAim = null;
  canvas.dataset.pan = "0";
}

function fillSelect(el, items, valKey = "id") {
  el.innerHTML = items.map((it) => `<option value="${it[valKey]}">${it.name}</option>`).join("");
}

function paintSaved(maps) {
  const host = $("saved");
  host.innerHTML = "";
  for (const m of maps) {
    const b = document.createElement("button");
    b.className = "saved";
    b.textContent = m.name + (m.id === map.id ? " ●" : "");
    b.onclick = () => {
      map = cloneMap(m);
      $("map-name").value = map.name;
      draw();
      status("Loaded " + map.name);
    };
    const del = document.createElement("button");
    del.textContent = "×";
    del.onclick = async (e) => {
      e.stopPropagation();
      await deleteMap(m.id);
      refreshSaved();
    };
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "4px";
    row.appendChild(b);
    row.appendChild(del);
    host.appendChild(row);
  }
}

async function refreshSaved() {
  paintSaved(listMapsLocal());
  try {
    paintSaved(await listMaps());
  } catch {}
}

function setStory(n) {
  story = Math.max(0, Math.min(STORIES - 1, n | 0));
  document.querySelectorAll("#elev-levels [data-elev]").forEach((b) => {
    b.classList.toggle("on", +b.dataset.elev === story);
  });
  if ($("elev-now")) $("elev-now").textContent = "Building at elevation " + (story + 1);
  draw();
}

function fillElevButtons() {
  const host = $("elev-levels");
  if (!host) return;
  host.innerHTML = "";
  for (let i = 0; i < STORIES; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.elev = String(i);
    b.textContent = String(i + 1);
    if (i === story) b.classList.add("on");
    b.onclick = () => setStory(i);
    host.appendChild(b);
  }
}

function wire() {
  fillSelect($("wtex"), WALL_TEX.map((t, i) => ({ id: String(i + 1), name: t.name })));
  fillSelect($("pickup"), PICKUPS);
  fillSelect($("sp-enemy"), SPAWN_KINDS);
  fillSelect($("obj"), OBJECTS);
  $("wtex").onchange = () => { wtex = +$("wtex").value; };
  $("pickup").onchange = () => { pickupKind = $("pickup").value; };
  $("sp-enemy").onchange = () => { enemyId = $("sp-enemy").value; };
  $("obj").onchange = () => { objKind = $("obj").value; };
  fillElevButtons();
  $("brush").oninput = () => { brush = +$("brush").value; $("brush-v").textContent = brush.toFixed(1); };
  $("elev").oninput = () => { elev = +$("elev").value; $("elev-v").textContent = String(elev); };
  $("sp-int").oninput = () => { spawnInterval = +$("sp-int").value; $("sp-int-v").textContent = spawnInterval.toFixed(1) + "s"; };
  $("sp-rad").oninput = () => { spawnRadius = +$("sp-rad").value; $("sp-rad-v").textContent = spawnRadius.toFixed(1); };
  $("sp-max").oninput = () => { spawnMax = +$("sp-max").value; $("sp-max-v").textContent = String(spawnMax); };
  $("bsize").oninput = () => { boulderSize = +$("bsize").value; $("bsize-v").textContent = boulderSize.toFixed(2); };
  $("btrig").oninput = () => { boulderTrigger = +$("btrig").value; $("btrig-v").textContent = boulderTrigger.toFixed(1); };
  $("map-name").oninput = () => { map.name = $("map-name").value || "Untitled"; };
  document.querySelectorAll("[data-tool]").forEach((b) => {
    b.onclick = () => {
      tool = b.dataset.tool;
      showPanels();
      status(tool);
    };
  });
  $("save").onclick = async () => {
    status("Saving…");
    await saveMap(map);
    await refreshSaved();
    status(map._saveError ? ("Saved here, server: " + map._saveError) : "Saved to server — refresh Horde, pick Open world");
  };
  if ($("save-as")) $("save-as").onclick = async () => {
    map.id = newMapId();
    map.rev = 0;
    status("Saving as new…");
    await saveMap(map);
    await refreshSaved();
    status(map._saveError ? ("Saved here, server: " + map._saveError) : "Saved as new — refresh Horde, pick Open world");
  };
  $("new").onclick = () => {
    pushUndo();
    map = blankMap("New open world");
    $("map-name").value = map.name;
    draw();
  };
  $("undo").onclick = doUndo;
  $("play").onclick = async () => {
    stashPreview(map);
    status("Saving…");
    await saveMap(map);
    location.href = "/horde?mode=open&map=" + encodeURIComponent(map.id);
  };
  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mousemove", onMove);
  addEventListener("mouseup", onUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const c = cellFromEvent(e);
    const old = scale;
    scale = Math.max(4, Math.min(40, scale * (e.deltaY > 0 ? 0.9 : 1.1)));
    pan.x = e.clientX - canvas.getBoundingClientRect().left - c.x * scale;
    pan.y = e.clientY - canvas.getBoundingClientRect().top - c.z * scale;
    if (Math.abs(scale - old) > 0.01) draw();
  }, { passive: false });
  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") { e.preventDefault(); doUndo(); }
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") { e.preventDefault(); saveMap(map); refreshSaved(); status("Saved"); }
  });
  addEventListener("resize", fit);
  showPanels();
  refreshSaved();
  fit();
}

wire();
