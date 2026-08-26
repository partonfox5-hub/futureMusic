/** Zoom map packing, drawing stamps, 2D SDF. */
import {
  BIOMES,
  CELL,
  EYE,
  FLAG_COLLAPSE,
  FLAG_CROUCH,
  FLAG_HOVER,
  FLAG_SLOPE,
  FLAG_SPIKE,
  LIQ_LAVA,
  MAP_H,
  MAP_MAX,
  MAP_W,
  SHAPE_FLAT,
  SHAPE_OVAL,
  SHAPE_ROUND,
  SHAPE_SPHERE,
  STORIES,
  WALL_CRACK,
} from "./config.js?v=zm10";

export { CELL };

export function pack(carved, shape, tex) {
  return (carved ? 1 : 0) | ((shape & 3) << 1) | ((tex & 15) << 3);
}
export function wallTexId(v) {
  return v & 15;
}
export function wallIsCrack(v) {
  return !!(v & WALL_CRACK);
}
export function packWall(tex, crack) {
  const t = Math.max(1, tex & 15);
  return t | (crack ? WALL_CRACK : 0);
}
export function isCarved(b) {
  return (b & 1) !== 0;
}
export function getShape(b) {
  return (b >> 1) & 3;
}
export function getTex(b) {
  return (b >> 3) & 15;
}

function nid() {
  return "m" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function layers(w, h) {
  const n = w * h;
  return {
    elev: new Int8Array(n),
    liquid: new Uint8Array(n),
    sky: new Uint8Array(n),
    flags: new Uint8Array(n),
    bwalls: [new Uint8Array(n), new Uint8Array(n), new Uint8Array(n)],
  };
}

export function blankMap(name = "Untitled", w = MAP_W, h = MAP_H) {
  w = Math.max(16, Math.min(MAP_MAX, w | 0));
  h = Math.max(16, Math.min(MAP_MAX, h | 0));
  return {
    v: 2,
    id: nid(),
    name,
    w,
    h,
    hallH: 4.2,
    cells: new Uint8Array(w * h),
    ...layers(w, h),
    spheres: [],
    objects: [],
    spawners: [],
    pickups: [],
    keys: [],
    openings: [],
    portals: [],
    ropes: [],
    crushers: [],
    turrets: [],
    arrows: [],
    climbs: [],
    boulders: [],
    vendors: [],
    npcs: [],
    ridges: [],
    ultimatums: [],
    start: { x: (w * 0.5) * CELL, z: (h * 0.5) * CELL, yaw: 0 },
    updated: Date.now(),
  };
}

export function cloneMap(m) {
  return deserialize(serialize(m));
}

export function toB64(u8) {
  const bytes = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(s);
}

export function fromB64(s) {
  const bin = atob(s);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function arrB64(a) {
  if (!a) return "";
  return toB64(a instanceof Uint8Array ? a : new Uint8Array(a.buffer ? new Uint8Array(a.buffer, a.byteOffset, a.byteLength) : a));
}

function u8from(raw, n) {
  const a = typeof raw === "string" && raw ? fromB64(raw) : raw instanceof Uint8Array ? raw : new Uint8Array(raw || []);
  const o = new Uint8Array(n);
  o.set(a.subarray(0, n));
  return o;
}

function i8from(raw, n) {
  const u = u8from(raw, n);
  return new Int8Array(u.buffer, u.byteOffset, n);
}

export function serialize(map) {
  ensureLayers(map);
  return {
    v: 2,
    id: map.id,
    name: map.name,
    w: map.w,
    h: map.h,
    hallH: map.hallH,
    cells: toB64(map.cells),
    elev: arrB64(map.elev),
    liquid: arrB64(map.liquid),
    sky: arrB64(map.sky),
    flags: arrB64(map.flags),
    bwalls: (map.bwalls || []).map((b) => arrB64(b)),
    spheres: map.spheres || [],
    objects: map.objects || [],
    spawners: map.spawners || [],
    pickups: map.pickups || [],
    keys: map.keys || [],
    openings: map.openings || [],
    portals: map.portals || [],
    ropes: map.ropes || [],
    crushers: map.crushers || [],
    turrets: map.turrets || [],
    arrows: map.arrows || [],
    climbs: map.climbs || [],
    boulders: map.boulders || [],
    vendors: map.vendors || [],
    npcs: map.npcs || [],
    ridges: map.ridges || [],
    ultimatums: map.ultimatums || [],
    start: map.start,
    updated: map.updated || Date.now(),
    rev: map.rev || 0,
  };
}

export function ensureLayers(map) {
  const n = map.w * map.h;
  if (!map.elev || map.elev.length !== n) {
    const a = new Int8Array(n);
    if (map.elev) a.set(map.elev.subarray(0, n));
    map.elev = a;
  }
  if (!map.liquid || map.liquid.length !== n) map.liquid = u8from(map.liquid, n);
  if (!map.sky || map.sky.length !== n) map.sky = u8from(map.sky, n);
  if (!map.flags || map.flags.length !== n) map.flags = u8from(map.flags, n);
  if (!map.bwalls || map.bwalls.length < STORIES) {
    const bw = [];
    for (let s = 0; s < STORIES; s++) bw.push(u8from(map.bwalls && map.bwalls[s], n));
    map.bwalls = bw;
  }
  map.pickups ||= [];
  map.keys ||= [];
  map.openings ||= [];
  map.portals ||= [];
  map.ropes ||= [];
  map.crushers ||= [];
  map.turrets ||= [];
  map.arrows ||= [];
  map.climbs ||= [];
  map.boulders ||= [];
  map.vendors ||= [];
  map.npcs ||= [];
  map.ridges ||= [];
  map.ultimatums ||= [];
  if (!map.collapsed || map.collapsed.length !== n) map.collapsed = new Uint8Array(n);
  return map;
}

export function deserialize(raw) {
  const o = typeof raw === "string" ? JSON.parse(raw) : raw;
  const w = o.w || MAP_W;
  const h = o.h || MAP_H;
  const n = w * h;
  const cells = u8from(typeof o.cells === "string" || o.cells ? o.cells : [], n);
  return ensureLayers({
    v: 2,
    id: o.id || nid(),
    name: o.name || "Untitled",
    w,
    h,
    hallH: o.hallH || 4.2,
    cells,
    elev: i8from(o.elev, n),
    liquid: u8from(o.liquid, n),
    sky: u8from(o.sky, n),
    flags: u8from(o.flags, n),
    bwalls: [0, 1, 2].map((s) => u8from(o.bwalls && o.bwalls[s], n)),
    spheres: Array.isArray(o.spheres) ? o.spheres.map((s) => ({ ...s })) : [],
    objects: Array.isArray(o.objects) ? o.objects.map((x) => ({ ...x })) : [],
    spawners: Array.isArray(o.spawners) ? o.spawners.map((x) => ({ ...x })) : [],
    pickups: Array.isArray(o.pickups) ? o.pickups.map((x) => ({ ...x })) : [],
    keys: Array.isArray(o.keys) ? o.keys.map((x) => ({ ...x })) : [],
    openings: Array.isArray(o.openings) ? o.openings.map((x) => ({ ...x })) : [],
    portals: Array.isArray(o.portals) ? o.portals.map((x) => ({ ...x })) : [],
    ropes: Array.isArray(o.ropes) ? o.ropes.map((x) => ({ ...x })) : [],
    crushers: Array.isArray(o.crushers) ? o.crushers.map((x) => ({ ...x })) : [],
    turrets: Array.isArray(o.turrets) ? o.turrets.map((x) => ({ ...x })) : [],
    arrows: Array.isArray(o.arrows) ? o.arrows.map((x) => ({ ...x })) : [],
    climbs: Array.isArray(o.climbs) ? o.climbs.map((x) => ({ ...x })) : [],
    boulders: Array.isArray(o.boulders) ? o.boulders.map((x) => ({ ...x })) : [],
    vendors: Array.isArray(o.vendors) ? o.vendors.map((x) => ({ ...x })) : [],
    npcs: Array.isArray(o.npcs) ? o.npcs.map((x) => ({ ...x, options: Array.isArray(x.options) ? x.options.map((op) => ({ ...op, options: Array.isArray(op.options) ? op.options.map((n) => ({ ...n })) : [] })) : [] })) : [],
    ridges: Array.isArray(o.ridges) ? o.ridges.map((x) => ({ ...x })) : [],
    ultimatums: Array.isArray(o.ultimatums) ? o.ultimatums.map((x) => ({ ...x, cells: Array.isArray(x.cells) ? x.cells.map((c) => ({ ...c })) : [] })) : [],
    start: o.start ? { ...o.start } : { x: w * 0.5 * CELL, z: h * 0.5 * CELL, yaw: 0 },
    updated: o.updated || Date.now(),
    rev: o.rev || 0,
  });
}

export function idx(map, x, z) {
  return z * map.w + x;
}

export function inBounds(map, x, z) {
  return x >= 0 && z >= 0 && x < map.w && z < map.h;
}

export function worldToCell(x, z) {
  return { cx: x / CELL, cz: z / CELL };
}

export function cellToWorld(cx, cz) {
  return { x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL };
}

/** Stamp a disk of cells. cx/cz in cell units (float). */
export function stampDisk(map, cx, cz, radius, shape, tex, erase) {
  const r = Math.max(0.5, radius);
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(map.w - 1, Math.ceil(cx + r));
  const z0 = Math.max(0, Math.floor(cz - r));
  const z1 = Math.min(map.h - 1, Math.ceil(cz + r));
  const p = erase ? 0 : pack(1, shape, tex);
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dz = z + 0.5 - cz;
      if (dx * dx + dz * dz <= r2 + 0.15) map.cells[idx(map, x, z)] = p;
    }
  }
}

export function paintDisk(map, cx, cz, radius, tex) {
  const r = Math.max(0.5, radius);
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(map.w - 1, Math.ceil(cx + r));
  const z0 = Math.max(0, Math.floor(cz - r));
  const z1 = Math.min(map.h - 1, Math.ceil(cz + r));
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dz = z + 0.5 - cz;
      if (dx * dx + dz * dz > r2 + 0.15) continue;
      const i = idx(map, x, z);
      const b = map.cells[i];
      if (isCarved(b)) map.cells[i] = pack(1, getShape(b), tex);
    }
  }
}

export function stampSegment(map, x0, z0, x1, z1, radius, shape, tex, erase) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const step = Math.max(0.35, radius * 0.4);
  const n = Math.max(1, Math.ceil(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    stampDisk(map, x0 + dx * t, z0 + dz * t, radius, shape, tex, erase);
  }
}

export function stampRect(map, x0, z0, x1, z1, radius, shape, tex, erase, outline) {
  let ax = Math.min(x0, x1);
  let bx = Math.max(x0, x1);
  let az = Math.min(z0, z1);
  let bz = Math.max(z0, z1);
  if (outline) {
    const t = Math.max(0.5, radius);
    stampRect(map, ax, az, bx, az, t, shape, tex, erase, false);
    stampRect(map, ax, bz, bx, bz, t, shape, tex, erase, false);
    stampRect(map, ax, az, ax, bz, t, shape, tex, erase, false);
    stampRect(map, bx, az, bx, bz, t, shape, tex, erase, false);
    return;
  }
  const r = Math.max(0, radius - 0.5);
  ax = Math.max(0, Math.floor(ax - r));
  bx = Math.min(map.w - 1, Math.ceil(bx + r));
  az = Math.max(0, Math.floor(az - r));
  bz = Math.min(map.h - 1, Math.ceil(bz + r));
  const p = erase ? 0 : pack(1, shape, tex);
  for (let z = az; z <= bz; z++) {
    for (let x = ax; x <= bx; x++) map.cells[idx(map, x, z)] = p;
  }
}

/** Flood fill. If click is rock, carve connected rock that does not touch the map border (interior pockets). If click is carved, recolor that region. */
export function flood(map, sx, sz, shape, tex, erase) {
  sx = Math.floor(sx);
  sz = Math.floor(sz);
  if (!inBounds(map, sx, sz)) return 0;
  const start = map.cells[idx(map, sx, sz)];
  const startCarved = isCarved(start);
  if (erase && !startCarved) return 0;
  const wantCarve = !erase;
  const match = (b) => (wantCarve ? !isCarved(b) : isCarved(b) && getTex(b) === getTex(start) && getShape(b) === getShape(start));
  if (!match(start) && !(erase && startCarved)) return 0;

  const seen = new Uint8Array(map.w * map.h);
  const q = [sx, sz];
  seen[idx(map, sx, sz)] = 1;
  const pts = [];
  let hitBorder = false;
  while (q.length) {
    const z = q.pop();
    const x = q.pop();
    if (x === 0 || z === 0 || x === map.w - 1 || z === map.h - 1) hitBorder = true;
    pts.push(x, z);
    if (pts.length > 9000) break;
    const nbs = [x - 1, z, x + 1, z, x, z - 1, x, z + 1];
    for (let i = 0; i < 8; i += 2) {
      const nx = nbs[i];
      const nz = nbs[i + 1];
      if (!inBounds(map, nx, nz)) continue;
      const i2 = idx(map, nx, nz);
      if (seen[i2]) continue;
      if (!match(map.cells[i2])) continue;
      seen[i2] = 1;
      q.push(nx, nz);
    }
  }
  if (wantCarve && !startCarved && hitBorder) return 0;
  const p = erase ? 0 : pack(1, shape, tex);
  for (let i = 0; i < pts.length; i += 2) map.cells[idx(map, pts[i], pts[i + 1])] = p;
  return pts.length / 2;
}

export function addSphere(map, x, z, r, tex) {
  r = Math.max(1.2, r);
  const last = map.spheres[map.spheres.length - 1];
  if (last && Math.hypot(last.x - x, last.z - z) < r * 0.4 && Math.abs(last.r - r) < 0.4) return last;
  const s = { x, z, r, tex, cy: Math.max(1.15, r * 0.55) };
  map.spheres.push(s);
  return s;
}

export function eraseNear(map, x, z, r) {
  ensureLayers(map);
  map.spheres = map.spheres.filter((s) => Math.hypot(s.x - x, s.z - z) > r + s.r * 0.35);
  map.objects = map.objects.filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.spawners = map.spawners.filter((s) => Math.hypot(s.x - x, s.z - z) > r);
  map.pickups = map.pickups.filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.keys = map.keys.filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.ropes = map.ropes.filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.crushers = map.crushers.filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.turrets = map.turrets.filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.climbs = (map.climbs || []).filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.boulders = (map.boulders || []).filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.vendors = (map.vendors || []).filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.npcs = (map.npcs || []).filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.ridges = (map.ridges || []).filter((o) => Math.hypot(o.x - x, o.z - z) > r);
  map.ultimatums = (map.ultimatums || []).map((u) => {
    const cells = (u.cells || []).filter((c) => Math.hypot((c.x + 0.5) * CELL - x, (c.z + 0.5) * CELL - z) > r);
    return { ...u, cells };
  }).filter((u) => (u.cells && u.cells.length) || Math.hypot((u.x || 0) - x, (u.z || 0) - z) > r);
  map.openings = map.openings.filter((o) => Math.hypot((o.x + 0.5) * CELL - x, (o.z + 0.5) * CELL - z) > r);
  map.arrows = (map.arrows || []).filter((o) => Math.hypot(o.x - x, o.z - z) > r);
}

export function resizeMap(map, w, h) {
  w = Math.max(16, Math.min(MAP_MAX, w | 0));
  h = Math.max(16, Math.min(MAP_MAX, h | 0));
  if (w === map.w && h === map.h) return map;
  const next = blankMap(map.name, w, h);
  next.id = map.id;
  next.hallH = map.hallH;
  next.updated = Date.now();
  const cw = Math.min(map.w, w);
  const ch = Math.min(map.h, h);
  for (let z = 0; z < ch; z++) {
    for (let x = 0; x < cw; x++) {
      const i = z * map.w + x;
      const j = z * w + x;
      next.cells[j] = map.cells[i];
      if (map.elev) next.elev[j] = map.elev[i];
      if (map.liquid) next.liquid[j] = map.liquid[i];
      if (map.sky) next.sky[j] = map.sky[i];
      if (map.flags) next.flags[j] = map.flags[i];
      if (map.collapsed) next.collapsed[j] = map.collapsed[i];
      for (let s = 0; s < 3; s++) {
        if (map.bwalls && map.bwalls[s]) next.bwalls[s][j] = map.bwalls[s][i];
      }
    }
  }
  const inW = (x, z) => x >= 0 && z >= 0 && x < w * CELL && z < h * CELL;
  const copyList = (arr) => (arr || []).filter((o) => inW(o.x != null ? o.x : (o.ax || 0), o.z != null ? o.z : (o.az || 0)));
  next.spheres = copyList(map.spheres);
  next.objects = copyList(map.objects);
  next.spawners = copyList(map.spawners);
  next.pickups = copyList(map.pickups);
  next.keys = copyList(map.keys);
  next.ropes = copyList(map.ropes);
  next.crushers = copyList(map.crushers);
  next.turrets = copyList(map.turrets);
  next.arrows = copyList(map.arrows);
  next.climbs = copyList(map.climbs);
  next.boulders = copyList(map.boulders);
  next.vendors = copyList(map.vendors);
  next.npcs = copyList(map.npcs);
  next.ridges = copyList(map.ridges);
  next.ultimatums = (map.ultimatums || []).map((u) => ({
    ...u,
    cells: (u.cells || []).filter((c) => c.x >= 0 && c.z >= 0 && c.x < w && c.z < h),
  })).filter((u) => u.cells && u.cells.length);
  next.openings = (map.openings || []).filter((o) => o.x >= 0 && o.z >= 0 && o.x < w && o.z < h);
  next.portals = (map.portals || []).filter((p) => inW(p.ax, p.az) && inW(p.bx, p.bz));
  if (map.start && inW(map.start.x, map.start.z)) next.start = { ...map.start };
  else next.start = { x: w * 0.5 * CELL, z: h * 0.5 * CELL, yaw: 0 };
  return ensureLayers(next);
}

export function stampLayer(arr, map, cx, cz, radius, value) {
  ensureLayers(map);
  const r = Math.max(0.5, radius);
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(map.w - 1, Math.ceil(cx + r));
  const z0 = Math.max(0, Math.floor(cz - r));
  const z1 = Math.min(map.h - 1, Math.ceil(cz + r));
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dz = z + 0.5 - cz;
      if (dx * dx + dz * dz <= r2 + 0.15) arr[idx(map, x, z)] = value;
    }
  }
}

export function stampCrack(arr, map, cx, cz, radius, tex) {
  ensureLayers(map);
  const r = Math.max(0.5, radius);
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(map.w - 1, Math.ceil(cx + r));
  const z0 = Math.max(0, Math.floor(cz - r));
  const z1 = Math.min(map.h - 1, Math.ceil(cz + r));
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dz = z + 0.5 - cz;
      if (dx * dx + dz * dz > r2 + 0.15) continue;
      const i = idx(map, x, z);
      const cur = arr[i];
      arr[i] = packWall(wallTexId(cur) || tex || 1, true);
    }
  }
}

export function uid(prefix = "u") {
  return prefix + Math.random().toString(36).slice(2, 10);
}

function cellFloorY(map, i) {
  let y = ((map.elev && map.elev[i]) || 0) * EYE;
  if (map.flags && (map.flags[i] & FLAG_SPIKE) && !(map.flags[i] & FLAG_SLOPE)) y -= 1.45;
  return y;
}

/** Interpolate slope-cell heights from neighboring non-slope banks. */
export function bakeSlopes(map) {
  ensureLayers(map);
  const n = map.w * map.h;
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = cellFloorY(map, i);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (let z = 0; z < map.h; z++) {
    for (let x = 0; x < map.w; x++) {
      const i = z * map.w + x;
      if (!(map.flags[i] & FLAG_SLOPE)) continue;
      if (!isCarved(map.cells[i])) continue;
      let wsum = 0;
      let ysum = 0;
      for (const [dx, dz] of dirs) {
        for (let k = 1; k <= 28; k++) {
          const nx = x + dx * k;
          const nz = z + dz * k;
          if (!inBounds(map, nx, nz)) break;
          const j = nz * map.w + nx;
          if (!isCarved(map.cells[j])) continue;
          if (map.flags[j] & FLAG_SLOPE) continue;
          const d = k * (dx && dz ? 1.414 : 1);
          const w = 1 / (d * d);
          ysum += y[j] * w;
          wsum += w;
          break;
        }
      }
      if (wsum > 0) y[i] = ysum / wsum;
    }
  }
  map._slopeY = y;
  return y;
}

export function terrainY(map, wx, wz) {
  if (!map._slopeY || map._slopeY.length !== map.w * map.h) bakeSlopes(map);
  const gx = wx / CELL - 0.5;
  const gz = wz / CELL - 0.5;
  const x = Math.max(0, Math.min(map.w - 1.001, gx));
  const z = Math.max(0, Math.min(map.h - 1.001, gz));
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = Math.min(map.w - 1, x0 + 1);
  const z1 = Math.min(map.h - 1, z0 + 1);
  const tx = x - x0;
  const tz = z - z0;
  const Y = map._slopeY;
  const a = Y[z0 * map.w + x0];
  const b = Y[z0 * map.w + x1];
  const c = Y[z1 * map.w + x0];
  const d = Y[z1 * map.w + x1];
  return a * (1 - tx) * (1 - tz) + b * tx * (1 - tz) + c * (1 - tx) * tz + d * tx * tz;
}

export function slopeGrad(map, wx, wz) {
  const e = 0.22;
  return {
    gx: (terrainY(map, wx + e, wz) - terrainY(map, wx - e, wz)) / (2 * e),
    gz: (terrainY(map, wx, wz + e) - terrainY(map, wx, wz - e)) / (2 * e),
  };
}

export function stampFlags(map, cx, cz, radius, bit, on) {
  ensureLayers(map);
  const r = Math.max(0.5, radius);
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(map.w - 1, Math.ceil(cx + r));
  const z0 = Math.max(0, Math.floor(cz - r));
  const z1 = Math.min(map.h - 1, Math.ceil(cz + r));
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dz = z + 0.5 - cz;
      if (dx * dx + dz * dz > r2 + 0.15) continue;
      const i = idx(map, x, z);
      if (on) {
        map.flags[i] |= bit;
        if (!isCarved(map.cells[i])) map.cells[i] = pack(1, SHAPE_FLAT, 1);
      } else map.flags[i] &= ~bit;
    }
  }
}

export function cellI(map, x, z) {
  const gx = Math.max(0, Math.min(map.w - 1, Math.floor(x / CELL)));
  const gz = Math.max(0, Math.min(map.h - 1, Math.floor(z / CELL)));
  return gz * map.w + gx;
}

export function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Chamfer distance transform. Negative inside carved cells, in cell units. */
export function computeSdf(map) {
  const w = map.w;
  const h = map.h;
  const g = new Float32Array(w * h);
  const INF = 1e5;
  for (let i = 0; i < g.length; i++) g[i] = isCarved(map.cells[i]) ? INF : 0;
  const diag = 1.41421356;
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      if (x) g[i] = Math.min(g[i], g[i - 1] + 1);
      if (z) g[i] = Math.min(g[i], g[i - w] + 1);
      if (x && z) g[i] = Math.min(g[i], g[i - w - 1] + diag);
      if (x < w - 1 && z) g[i] = Math.min(g[i], g[i - w + 1] + diag);
    }
  }
  for (let z = h - 1; z >= 0; z--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = z * w + x;
      if (x < w - 1) g[i] = Math.min(g[i], g[i + 1] + 1);
      if (z < h - 1) g[i] = Math.min(g[i], g[i + w] + 1);
      if (x < w - 1 && z < h - 1) g[i] = Math.min(g[i], g[i + w + 1] + diag);
      if (x && z < h - 1) g[i] = Math.min(g[i], g[i + w - 1] + diag);
    }
  }
  const out = new Float32Array(w * h);
  const outd = new Float32Array(w * h);
  for (let i = 0; i < outd.length; i++) outd[i] = isCarved(map.cells[i]) ? 0 : INF;
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      if (x) outd[i] = Math.min(outd[i], outd[i - 1] + 1);
      if (z) outd[i] = Math.min(outd[i], outd[i - w] + 1);
      if (x && z) outd[i] = Math.min(outd[i], outd[i - w - 1] + diag);
      if (x < w - 1 && z) outd[i] = Math.min(outd[i], outd[i - w + 1] + diag);
    }
  }
  for (let z = h - 1; z >= 0; z--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = z * w + x;
      if (x < w - 1) outd[i] = Math.min(outd[i], outd[i + 1] + 1);
      if (z < h - 1) outd[i] = Math.min(outd[i], outd[i + w] + 1);
      if (x < w - 1 && z < h - 1) outd[i] = Math.min(outd[i], outd[i + w + 1] + diag);
      if (x && z < h - 1) outd[i] = Math.min(outd[i], outd[i + w - 1] + diag);
    }
  }
  for (let i = 0; i < out.length; i++) {
    out[i] = isCarved(map.cells[i]) ? -g[i] : outd[i];
  }
  return out;
}

function sampleField(field, w, h, gx, gz) {
  const x = Math.max(0, Math.min(w - 1.001, gx));
  const z = Math.max(0, Math.min(h - 1.001, gz));
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = Math.min(w - 1, x0 + 1);
  const z1 = Math.min(h - 1, z0 + 1);
  const tx = x - x0;
  const tz = z - z0;
  const a = field[z0 * w + x0];
  const b = field[z0 * w + x1];
  const c = field[z1 * w + x0];
  const d = field[z1 * w + x1];
  return a * (1 - tx) * (1 - tz) + b * tx * (1 - tz) + c * (1 - tx) * tz + d * tx * tz;
}

function cellAt(map, gx, gz) {
  const x = Math.max(0, Math.min(map.w - 1, Math.floor(gx)));
  const z = Math.max(0, Math.min(map.h - 1, Math.floor(gz)));
  return map.cells[z * map.w + x];
}

function roundExtrude(d2, y, hy, R, yScale, xScale) {
  const xs = d2 * xScale;
  const ys = (y - hy) * yScale;
  const qx = xs + R;
  const qy = Math.abs(ys) - (hy - R);
  const mx = Math.max(qx, 0);
  const my = Math.max(qy, 0);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(mx, my) - R;
}

/**
 * Signed distance: negative = empty (dug), positive = rock.
 * sdf2 is 2D field in cell units.
 */
export function sdf3(x, y, z, map, sdf2) {
  let dmin = 1e6;
  const spheres = map.spheres || [];
  const ci = cellI(map, x, z);
  const spike = map.flags && map.flags[ci] & FLAG_SPIKE;
  const crouch = map.flags && map.flags[ci] & FLAG_CROUCH;
  const hover = map.flags && map.flags[ci] & FLAG_HOVER;
  const sky = map.sky && map.sky[ci];
  const lava = map.liquid && map.liquid[ci] === LIQ_LAVA;
  const y0 = hover ? ((map.elev && map.elev[ci]) || 0) * EYE : terrainY(map, x, z);
  const floor = hover ? 0.05 : y0;
  for (let i = 0; i < spheres.length; i++) {
    const s = spheres[i];
    const cy = (s.cy != null ? s.cy : s.r * 0.55) + y0;
    let ds = Math.hypot(x - s.x, y - cy, z - s.z) - s.r;
    ds = Math.max(ds, floor + 0.06 - y);
    if (ds < dmin) dmin = ds;
  }
  const gx = x / CELL;
  const gz = z / CELL;
  if (gx < -1 || gz < -1 || gx > map.w + 1 || gz > map.h + 1) return dmin;
  const d2 = sampleField(sdf2, map.w, map.h, gx, gz) * CELL;
  const cell = cellAt(map, gx, gz);
  if (map.collapsed && map.collapsed[ci]) {
    const ly = y - floor;
    if (map.flags && map.flags[ci] & FLAG_COLLAPSE) {
      /* floor hole — open downward */
    } else if (ly >= -0.05 && ly < 2.15) return 0.4;
  }
  if (hover && (isCarved(cell) || d2 < CELL * 0.7)) {
    if (map.collapsed && map.collapsed[ci] && map.flags && map.flags[ci] & FLAG_COLLAPSE) {
      const dH = Math.max(d2, y - 80);
      if (dH < dmin) dmin = dH;
      return dmin;
    }
    const slabY = y0;
    const slabT = 0.2;
    let dH = Math.max(d2, 0.05 - y);
    const sdY = Math.abs(y - (slabY + slabT * 0.5)) - slabT * 0.5;
    if (d2 < 0 && sdY < 0) dH = -sdY;
    if (dH < dmin) dmin = dH;
    return dmin;
  }
  if (isCarved(cell) || d2 < CELL * 0.7) {
    const shape = getShape(cell);
    let H = crouch ? 1.22 : sky ? 40 : map.hallH || 4.2;
    if (!crouch && !sky) {
      if (spike) H += 1.45 + 2.6;
      else if (lava) H += 2.6;
    }
    const hy = H * 0.5;
    const ly = y - floor;
    let d3;
    if (sky) {
      d3 = Math.max(d2, 0.05 - ly);
    } else if (shape === SHAPE_FLAT || crouch) {
      if (map.collapsed && map.collapsed[ci] && map.flags && map.flags[ci] & FLAG_COLLAPSE) {
        d3 = Math.max(d2, ly - H - 0.05);
      } else {
        d3 = Math.max(d2, Math.abs(ly - hy) - hy, 0.05 - ly);
      }
    } else if (shape === SHAPE_OVAL) {
      const R = hy * 0.64;
      d3 = roundExtrude(d2, ly, hy, R, 1.28, 0.76);
      d3 += (hash3(x * 1.9, ly * 2.2, z * 1.6) - 0.5) * 0.62;
      d3 = Math.max(d3, 0.05 - ly);
    } else {
      const R = hy * 0.9;
      d3 = roundExtrude(d2, ly, hy, R, 1, 1);
      d3 = Math.max(d3, 0.05 - ly);
    }
    if (d3 < dmin) dmin = d3;
  }
  return dmin;
}

export function isEmptyAt(x, y, z, map, sdf2) {
  return sdf3(x, y, z, map, sdf2) < 0;
}

export function floorY(x, z, map, sdf2, ymax, atY) {
  const ci = cellI(map, x, z);
  if (ci >= 0 && map.collapsed && map.collapsed[ci] && map.flags && map.flags[ci] & FLAG_COLLAPSE) return -999;
  const elev = (map.elev && map.elev[ci]) || 0;
  const hover = map.flags && map.flags[ci] & FLAG_HOVER;
  if (hover) {
    const slabTop = elev * EYE + 0.2;
    const hint = atY != null ? atY : (ymax != null ? ymax - 2 : 0);
    if (hint > slabTop - 0.45) return slabTop;
    return 0.05;
  }
  if (map.flags && map.flags[ci] & FLAG_SLOPE) return terrainY(map, x, z);
  const y0 = terrainY(map, x, z);
  const sky = map.sky && map.sky[ci];
  const lava = map.liquid && map.liquid[ci] === LIQ_LAVA;
  const spikeHere = map.flags && map.flags[ci] & FLAG_SPIKE;
  let hall = sky ? 12 : map.hallH || 4.2;
  if (!sky) {
    if (spikeHere) hall += 1.45 + 2.6;
    else if (lava) hall += 2.6;
  }
  const top = y0 + Math.max(hall, ymax || 0, 2);
  let lastEmpty = false;
  for (let y = top; y > y0 - 0.5; y -= 0.06) {
    const empty = sdf3(x, y, z, map, sdf2) < 0;
    if (lastEmpty && !empty) return y + 0.06;
    lastEmpty = empty;
  }
  if (isCarved(map.cells[ci])) return y0;
  return -999;
}

export function firstCarved(map) {
  for (let z = 0; z < map.h; z++) {
    for (let x = 0; x < map.w; x++) {
      if (isCarved(map.cells[idx(map, x, z)])) return cellToWorld(x, z);
    }
  }
  return null;
}

export function biomeOf(map, x, z) {
  const gx = x / CELL;
  const gz = z / CELL;
  const t = getTex(cellAt(map, gx, gz));
  return BIOMES[Math.max(0, Math.min(BIOMES.length - 1, t))];
}

export function countCarved(map) {
  let n = 0;
  for (let i = 0; i < map.cells.length; i++) if (isCarved(map.cells[i])) n++;
  return n;
}

/** Interior floor mask for an enclosed building story (walls that don't leak to the map border). */
export function enclosedFloors(map, story) {
  ensureLayers(map);
  const w = map.w;
  const h = map.h;
  const wall = map.bwalls[story];
  const floor = new Uint8Array(w * h);
  if (!wall) return floor;
  const seen = new Uint8Array(w * h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      if (wall[i] || seen[i]) continue;
      const q = [x, z];
      seen[i] = 1;
      const pts = [];
      let border = false;
      while (q.length) {
        const cz = q.pop();
        const cx = q.pop();
        if (cx === 0 || cz === 0 || cx === w - 1 || cz === h - 1) border = true;
        pts.push(cx, cz);
        const n = [cx - 1, cz, cx + 1, cz, cx, cz - 1, cx, cz + 1];
        for (let k = 0; k < 8; k += 2) {
          const nx = n[k];
          const nz = n[k + 1];
          if (!inBounds(map, nx, nz)) {
            border = true;
            continue;
          }
          const j = nz * w + nx;
          if (seen[j] || wall[j]) continue;
          seen[j] = 1;
          q.push(nx, nz);
        }
      }
      if (!border && pts.length > 4) {
        for (let p = 0; p < pts.length; p += 2) floor[pts[p + 1] * w + pts[p]] = 1;
      }
    }
  }
  return floor;
}

/** Stairs/ladders only between consecutive enclosed stories (1↔2 or 2↔3). */
export function canPlaceClimb(map, gx, gz, from) {
  ensureLayers(map);
  const to = from + 1;
  if (from < 0 || to >= STORIES) return false;
  if (!inBounds(map, gx, gz)) return false;
  const a = enclosedFloors(map, from);
  const b = enclosedFloors(map, to);
  const i = idx(map, gx, gz);
  return !!(a[i] && b[i]);
}

export function climbAtCell(map, gx, gz) {
  return (map.climbs || []).find((c) => Math.floor(c.x / CELL) === gx && Math.floor(c.z / CELL) === gz);
}

/** Hole in this story's floor (upper landing of a climb). */
export function climbHoleFloor(map, gx, gz, story) {
  return (map.climbs || []).some((c) => {
    if (Math.floor(c.x / CELL) !== gx || Math.floor(c.z / CELL) !== gz) return false;
    const from = c.from || 0;
    const to = c.to || from + 1;
    return to === story;
  });
}

/** Hole in this story's roof (lower landing of a climb). */
export function climbHoleRoof(map, gx, gz, story) {
  return (map.climbs || []).some((c) => {
    if (Math.floor(c.x / CELL) !== gx || Math.floor(c.z / CELL) !== gz) return false;
    const from = c.from || 0;
    return from === story;
  });
}
