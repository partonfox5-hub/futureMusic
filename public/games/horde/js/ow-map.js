/** Horde open-world map format, catalogs, and local storage. */

export const CELL = 2;
export const MAP_W = 64;
export const MAP_H = 64;
export const STORY_H = 3.2;
export const STORIES = 3;
export const EYE = 1.6;
export const WALL_CRACK = 128;

export const FLAG_SPIKE = 1;
export const FLAG_HOVER = 2;
export const FLAG_COLLAPSE = 4;
export const FLAG_SLOPE = 8;
export const FLAG_UNSTABLE = 16;
export const FLAG_RUMBLE = 32;

export const LIQ_NONE = 0;
export const LIQ_WATER = 1;
export const LIQ_LAVA = 2;

export const WALL_TEX = [
  { id: "castle", name: "Castle", swatch: "#8a8680" },
  { id: "manor", name: "Manor", swatch: "#6a5040" },
  { id: "metal", name: "Metal", swatch: "#6a7078" },
  { id: "siding", name: "Siding", swatch: "#c4b090" },
  { id: "straw", name: "Straw hut", swatch: "#c4a050" },
  { id: "cabin", name: "Wood cabin", swatch: "#8a5a32" },
  { id: "space", name: "Space metal", swatch: "#3a5070" },
  { id: "cave", name: "Cavern rock", swatch: "#6a5a48" },
  { id: "granite", name: "Granite", swatch: "#7a7a78" },
  { id: "mossrock", name: "Moss cave", swatch: "#4a6a40" },
  { id: "ice", name: "Ice cave", swatch: "#a8d0e0" },
  { id: "crystal", name: "Crystal cave", swatch: "#7a4ec8" },
  { id: "sandstone", name: "Sandstone", swatch: "#c4a070" },
  { id: "dungeon", name: "Dungeon brick", swatch: "#5a5048" },
  { id: "lab", name: "Psychic lab", swatch: "#2a5a68" },
  { id: "temple", name: "Mystic temple", swatch: "#b09050" },
];

export const OBJECTS = [
  { id: "torch", name: "Torch" },
  { id: "campfire", name: "Campfire" },
  { id: "walllamp", name: "Wall lamp" },
  { id: "ceiling", name: "Ceiling light" },
  { id: "chandelier", name: "Chandelier" },
];

export const SPAWN_KINDS = [
  { id: "horde", name: "Horde creature" },
  { id: "army", name: "Army man" },
  { id: "mixed", name: "Mixed (either)" },
];

/** Buyable items that can be placed as pickups. Keep in sync with Horde SHOP. */
export const PICKUPS = [
  { id: "pistol", kind: "wep", name: "Pistol" },
  { id: "smg", kind: "wep", name: "SMG" },
  { id: "ar", kind: "wep", name: "Assault rifle" },
  { id: "shotgun", kind: "wep", name: "Scattergun" },
  { id: "rail", kind: "wep", name: "Rail" },
  { id: "thunder", kind: "wep", name: "Thunder spell" },
  { id: "nova", kind: "wep", name: "Nova spell" },
  { id: "plasma", kind: "wep", name: "Plasma beam" },
  { id: "ripple", kind: "wep", name: "Ripple ray" },
  { id: "gravity", kind: "wep", name: "Zero-point gun" },
  { id: "nuke", kind: "wep", name: "Mini nuke" },
  { id: "terra", kind: "wep", name: "Terraform gun" },
  { id: "tank", kind: "wep", name: "Cyber tank" },
  { id: "heli", kind: "wep", name: "Attack heli" },
  { id: "landship", kind: "wep", name: "Landship" },
  { id: "noodle", kind: "wep", name: "Laser noodle" },
  { id: "lsword", kind: "wep", name: "Laser sword" },
  { id: "turret", kind: "turret", name: "Stone turret" },
  { id: "drone", kind: "drone", name: "Gun drone" },
  { id: "armyman", kind: "troop", name: "Army man" },
  { id: "jeep", kind: "allyveh", name: "Army jeep" },
  { id: "humvee", kind: "allyveh", name: "Humvee" },
  { id: "tank-ai", kind: "allyveh", name: "Ally tank" },
  { id: "heli-ai", kind: "allyveh", name: "Ally heli" },
  { id: "landship-ai", kind: "allyveh", name: "Ally landship" },
  { id: "ball-s", kind: "ball", name: "Guard orb" },
  { id: "ball-m", kind: "ball", name: "Aegis orb" },
  { id: "ball-l", kind: "ball", name: "Bulwark orb" },
  { id: "jump", kind: "up", name: "Jump height" },
  { id: "speed", kind: "up", name: "Move speed" },
  { id: "hp", kind: "up", name: "Heart" },
  { id: "reload", kind: "up", name: "Reload speed" },
  { id: "autoreload", kind: "up", name: "Auto reload" },
  { id: "magnet", kind: "up", name: "Coin magnet" },
  { id: "flash", kind: "up", name: "Brighter lamp" },
  { id: "clip", kind: "up", name: "Bigger clip" },
  { id: "night", kind: "up", name: "Shorter nights" },
  { id: "ammo", kind: "ammo", name: "Ammo crate" },
  { id: "sprint", kind: "up", name: "Sprint" },
  { id: "sprintcd", kind: "up", name: "Longer wind" },
  { id: "wheelie", kind: "up", name: "Wheelies" },
  { id: "jump2", kind: "up", name: "Double jump" },
  { id: "jump3", kind: "up", name: "Triple jump" },
  { id: "bike", kind: "bike", name: "Dirt bike" },
  { id: "orbcannon", kind: "up", name: "Plasma orb cannon" },
  { id: "radar", kind: "up", name: "Radar ring" },
];

export const LS_MAPS = "horde.owmaps.v1";
export const LS_PREVIEW = "horde.ow.preview";

export function idx(map, x, z) {
  return (z | 0) * map.w + (x | 0);
}
export function inBounds(map, x, z) {
  return x >= 0 && z >= 0 && x < map.w && z < map.h;
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

function nid() {
  return "m" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function layers(w, h) {
  const n = w * h;
  return {
    elev: new Int8Array(n),
    liquid: new Uint8Array(n),
    flags: new Uint8Array(n),
    bwalls: [new Uint8Array(n), new Uint8Array(n), new Uint8Array(n)],
  };
}

function u8from(raw, n) {
  const o = new Uint8Array(n);
  if (!raw) return o;
  if (typeof raw === "string") {
    try {
      const a = JSON.parse(raw);
      for (let i = 0; i < Math.min(n, a.length); i++) o[i] = a[i] & 255;
      return o;
    } catch {
      return o;
    }
  }
  const src = raw.length != null ? raw : [];
  for (let i = 0; i < Math.min(n, src.length); i++) o[i] = src[i] & 255;
  return o;
}
function i8from(raw, n) {
  const o = new Int8Array(n);
  if (!raw) return o;
  const src = raw.length != null ? raw : [];
  for (let i = 0; i < Math.min(n, src.length); i++) o[i] = src[i] | 0;
  return o;
}

export function worldX(map, gx) {
  return (gx + 0.5 - map.w * 0.5) * CELL;
}
export function worldZ(map, gz) {
  return (gz + 0.5 - map.h * 0.5) * CELL;
}
export function gridX(map, x) {
  return Math.floor(x / CELL + map.w * 0.5);
}
export function gridZ(map, z) {
  return Math.floor(z / CELL + map.h * 0.5);
}

export function blankMap(name = "New open world", w = MAP_W, h = MAP_H) {
  w = Math.max(16, Math.min(128, w | 0));
  h = Math.max(16, Math.min(128, h | 0));
  return {
    v: 1,
    id: nid(),
    name,
    w,
    h,
    ...layers(w, h),
    openings: [],
    objects: [],
    spawners: [],
    pickups: [],
    zoneFlags: [],
    ropes: [],
    crushers: [],
    turrets: [],
    arrows: [],
    climbs: [],
    boulders: [],
    ridges: [],
    start: { x: 0, z: 0, yaw: 0 },
    updated: Date.now(),
    rev: 1,
  };
}

export function ensureLayers(map) {
  const n = map.w * map.h;
  if (!map.elev || map.elev.length !== n) map.elev = i8from(map.elev, n);
  if (!map.liquid || map.liquid.length !== n) map.liquid = u8from(map.liquid, n);
  if (!map.flags || map.flags.length !== n) {
    const f = u8from(map.flags, n);
    map.flags = f;
  }
  if (!map.bwalls || map.bwalls.length < STORIES) {
    const bw = [];
    for (let s = 0; s < STORIES; s++) bw.push(u8from(map.bwalls && map.bwalls[s], n));
    map.bwalls = bw;
  } else {
    for (let s = 0; s < STORIES; s++) {
      if (!map.bwalls[s] || map.bwalls[s].length !== n) map.bwalls[s] = u8from(map.bwalls[s], n);
    }
  }
  map.openings ||= [];
  map.objects ||= [];
  map.spawners ||= [];
  map.pickups ||= [];
  map.zoneFlags ||= [];
  map.ropes ||= [];
  map.crushers ||= [];
  map.turrets ||= [];
  map.arrows ||= [];
  map.climbs ||= [];
  map.boulders ||= [];
  map.ridges ||= [];
  if (!map.start) map.start = { x: 0, z: 0, yaw: 0 };
  return map;
}

export function serialize(map) {
  ensureLayers(map);
  return {
    v: 1,
    id: map.id,
    name: map.name,
    w: map.w,
    h: map.h,
    elev: Array.from(map.elev),
    liquid: Array.from(map.liquid),
    flags: Array.from(map.flags),
    bwalls: map.bwalls.map((b) => Array.from(b)),
    openings: map.openings || [],
    objects: map.objects || [],
    spawners: map.spawners || [],
    pickups: map.pickups || [],
    zoneFlags: map.zoneFlags || [],
    ropes: map.ropes || [],
    crushers: map.crushers || [],
    turrets: map.turrets || [],
    arrows: map.arrows || [],
    climbs: map.climbs || [],
    boulders: map.boulders || [],
    ridges: map.ridges || [],
    start: map.start,
    updated: map.updated || Date.now(),
    rev: map.rev || 0,
  };
}

export function deserialize(raw) {
  if (!raw) return blankMap();
  const w = raw.w || MAP_W;
  const h = raw.h || MAP_H;
  const map = {
    v: 1,
    id: raw.id || nid(),
    name: raw.name || "Untitled",
    w,
    h,
    elev: i8from(raw.elev, w * h),
    liquid: u8from(raw.liquid, w * h),
    flags: u8from(raw.flags, w * h),
    bwalls: [0, 1, 2].map((s) => u8from(raw.bwalls && raw.bwalls[s], w * h)),
    openings: raw.openings || [],
    objects: raw.objects || [],
    spawners: raw.spawners || [],
    pickups: raw.pickups || [],
    zoneFlags: raw.zoneFlags || [],
    ropes: raw.ropes || [],
    crushers: raw.crushers || [],
    turrets: raw.turrets || [],
    arrows: raw.arrows || [],
    climbs: raw.climbs || [],
    boulders: raw.boulders || [],
    ridges: raw.ridges || [],
    start: raw.start || { x: 0, z: 0, yaw: 0 },
    updated: raw.updated || Date.now(),
    rev: raw.rev || 0,
  };
  return map;
}

export function cloneMap(m) {
  return deserialize(serialize(m));
}

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

export function openingAt(map, x, z, story) {
  return (map.openings || []).find((o) => o.gx === x && o.gz === z && (o.story || 0) === story) || null;
}

export function stampDisk(map, gx, gz, r, fn) {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(gx - r));
  const x1 = Math.min(map.w - 1, Math.ceil(gx + r));
  const z0 = Math.max(0, Math.floor(gz - r));
  const z1 = Math.min(map.h - 1, Math.ceil(gz + r));
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - gx;
      const dz = z + 0.5 - gz;
      if (dx * dx + dz * dz > r2) continue;
      fn(x, z, idx(map, x, z));
    }
  }
}

export function listMaps() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_MAPS) || "[]");
    return raw.map((m) => deserialize(m)).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  } catch {
    return [];
  }
}

export function getMap(id) {
  if (id === "preview") {
    try {
      const raw = sessionStorage.getItem(LS_PREVIEW);
      if (raw) return deserialize(JSON.parse(raw));
    } catch {}
  }
  return listMaps().find((m) => m.id === id) || null;
}

export function saveMap(map) {
  ensureLayers(map);
  map.updated = Date.now();
  map.rev = (map.rev | 0) + 1;
  const all = listMaps().filter((m) => m.id !== map.id);
  all.unshift(map);
  localStorage.setItem(LS_MAPS, JSON.stringify(all.map((m) => serialize(m))));
  return map;
}

export function deleteMap(id) {
  const all = listMaps().filter((m) => m.id !== id);
  localStorage.setItem(LS_MAPS, JSON.stringify(all.map((m) => serialize(m))));
}

export function stashPreview(map) {
  sessionStorage.setItem(LS_PREVIEW, JSON.stringify(serialize(map)));
}

export function demoFort() {
  const map = blankMap("Demo fort", 64, 64);
  const wall = packWall(1, 0);
  function box(x0, z0, x1, z1, story) {
    for (let x = x0; x <= x1; x++) {
      map.bwalls[story][idx(map, x, z0)] = wall;
      map.bwalls[story][idx(map, x, z1)] = wall;
    }
    for (let z = z0; z <= z1; z++) {
      map.bwalls[story][idx(map, x0, z)] = wall;
      map.bwalls[story][idx(map, x1, z)] = wall;
    }
  }
  box(24, 24, 40, 40, 0);
  box(26, 26, 38, 38, 1);
  map.openings.push({ gx: 32, gz: 24, story: 0, type: "door" });
  map.openings.push({ gx: 24, gz: 32, story: 0, type: "window" });
  map.openings.push({ gx: 40, gz: 32, story: 0, type: "window" });
  map.openings.push({ gx: 32, gz: 40, story: 0, type: "arch" });
  map.bwalls[0][idx(map, 32, 24)] = wall;
  map.bwalls[0][idx(map, 24, 32)] = wall;
  map.bwalls[0][idx(map, 40, 32)] = wall;
  map.bwalls[0][idx(map, 32, 40)] = wall;
  map.zoneFlags.push({ x: worldX(map, 20), z: worldZ(map, 20) });
  map.zoneFlags.push({ x: worldX(map, 44), z: worldZ(map, 20) });
  map.zoneFlags.push({ x: worldX(map, 20), z: worldZ(map, 44) });
  map.zoneFlags.push({ x: worldX(map, 44), z: worldZ(map, 44) });
  map.pickups.push({ id: "smg", x: worldX(map, 32), z: worldZ(map, 30) });
  map.pickups.push({ id: "shotgun", x: worldX(map, 30), z: worldZ(map, 32) });
  map.pickups.push({ id: "ammo", x: worldX(map, 34), z: worldZ(map, 32) });
  map.pickups.push({ id: "tank", x: worldX(map, 28), z: worldZ(map, 28) });
  map.spawners.push({ kind: "horde", x: worldX(map, 16), z: worldZ(map, 32), interval: 8, radius: 12, max: 4 });
  map.spawners.push({ kind: "army", x: worldX(map, 48), z: worldZ(map, 32), interval: 10, radius: 12, max: 3 });
  stampDisk(map, 18, 18, 1.6, (x, z, i) => { map.flags[i] |= FLAG_SPIKE; });
  map.crushers.push({ x: worldX(map, 36), z: worldZ(map, 36) });
  map.boulders.push({ x: worldX(map, 22), z: worldZ(map, 36), yaw: 0.4, size: 1.2, trigger: 8 });
  map.turrets.push({ x: worldX(map, 38), z: worldZ(map, 26), kind: "flame" });
  map.turrets.push({ x: worldX(map, 26), z: worldZ(map, 38), kind: "gun" });
  map.ropes.push({ x: worldX(map, 32), z: worldZ(map, 22), kind: "rope", len: 4.5 });
  map.objects.push({ id: "campfire", x: worldX(map, 32), z: worldZ(map, 33) });
  map.start = { x: 0, z: 0, yaw: 0 };
  map.id = "demo-fort";
  return map;
}
