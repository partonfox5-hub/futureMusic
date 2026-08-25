/**
 * Stud-brick kit for Blockbuild. Procedural shapes (not a trademarked toy).
 * Units: 1 stud = 8mm. Brick = 3 plates tall.
 */
import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

export const STUD = 0.008;
export const PLATE = STUD * 0.4;
export const STUD_H = STUD * 0.22;
export const STUD_R = STUD * 0.3;
export const WALL = STUD * 0.16;

export const COLORS = [
  { id: "white", name: "White", hex: 0xf2f3f2 },
  { id: "black", name: "Black", hex: 0x1b2a34 },
  { id: "red", name: "Red", hex: 0xc91a09 },
  { id: "blue", name: "Blue", hex: 0x0055bf },
  { id: "yellow", name: "Yellow", hex: 0xf5cd2f },
  { id: "green", name: "Green", hex: 0x237841 },
  { id: "orange", name: "Orange", hex: 0xfe8a18 },
  { id: "brown", name: "Brown", hex: 0x583927 },
  { id: "tan", name: "Tan", hex: 0xe4cd9e },
  { id: "lime", name: "Lime", hex: 0xbbe90b },
  { id: "azur", name: "Azur", hex: 0x078bc9 },
  { id: "pink", name: "Pink", hex: 0xfc97ac },
  { id: "purple", name: "Purple", hex: 0x81007b },
  { id: "navy", name: "Navy", hex: 0x0d325b },
  { id: "tblue", name: "Clear blue", hex: 0x68bcc5, trans: true },
  { id: "tclear", name: "Clear", hex: 0xdce6ee, trans: true },
];

export const KINDS = [
  { id: "brick", name: "Brick" },
  { id: "plate", name: "Plate" },
  { id: "tile", name: "Tile" },
  { id: "slope", name: "Slope" },
  { id: "invslope", name: "Inv. slope" },
  { id: "cheese", name: "Cheese" },
  { id: "round", name: "Round" },
  { id: "cone", name: "Cone" },
  { id: "cylinder", name: "Cylinder" },
  { id: "arch", name: "Arch" },
  { id: "stairs", name: "Stairs" },
  { id: "jumper", name: "Jumper" },
  { id: "grille", name: "Grille" },
  { id: "corner", name: "Corner" },
  { id: "wedge", name: "Wedge" },
  { id: "window", name: "Window" },
  { id: "door", name: "Door" },
  { id: "log", name: "Log" },
  { id: "base", name: "Base" },
  { id: "bow", name: "Bow" },
  { id: "roof", name: "Roof" },
  { id: "dish", name: "Dish" },
  { id: "macaroni", name: "Macaroni" },
  { id: "pillar", name: "Pillar" },
  { id: "wheel", name: "Wheel" },
  { id: "invarch", name: "Inv. arch" },
  { id: "panel", name: "Panel" },
  { id: "fence", name: "Fence" },
  { id: "windshield", name: "Windscreen" },
  { id: "hinge", name: "Hinge" },
  { id: "sidestud", name: "Headlight" },
  { id: "technic", name: "Technic" },
  { id: "clip", name: "Clip" },
  { id: "antenna", name: "Antenna" },
  { id: "bar", name: "Bar" },
  { id: "bracket", name: "Bracket" },
  { id: "leaf", name: "Leaf" },
  { id: "flower", name: "Flower" },
  { id: "wing", name: "Wing" },
  { id: "fig", name: "Fig" },
];

export const DIMS = [
  { id: "1x1", w: 1, d: 1 },
  { id: "1x2", w: 1, d: 2 },
  { id: "1x3", w: 1, d: 3 },
  { id: "1x4", w: 1, d: 4 },
  { id: "1x6", w: 1, d: 6 },
  { id: "1x8", w: 1, d: 8 },
  { id: "2x2", w: 2, d: 2 },
  { id: "2x3", w: 2, d: 3 },
  { id: "2x4", w: 2, d: 4 },
  { id: "2x6", w: 2, d: 6 },
  { id: "2x8", w: 2, d: 8 },
  { id: "4x4", w: 4, d: 4 },
  { id: "6x6", w: 6, d: 6 },
  { id: "8x8", w: 8, d: 8 },
  { id: "16x16", w: 16, d: 16 },
];

const _geoCache = new Map();
const _matCache = new Map();

export function colorOf(id) {
  return COLORS.find((c) => c.id === id) || COLORS[0];
}
export function dimOf(id) {
  return DIMS.find((d) => d.id === id) || DIMS[8];
}
export function kindOf(id) {
  return KINDS.find((k) => k.id === id) || KINDS[0];
}

export function platesFor(kind, d = 2) {
  switch (kind) {
    case "plate":
    case "tile":
    case "jumper":
    case "grille":
    case "base":
    case "cheese":
    case "clip":
    case "dish":
    case "macaroni":
    case "leaf":
    case "flower":
    case "wing":
    case "bow":
      return 1;
    case "window":
    case "panel":
    case "antenna":
    case "pillar":
      return 6;
    case "door":
      return 9;
    case "stairs":
      return Math.max(3, d);
    case "arch":
    case "invarch":
    case "fence":
    case "windshield":
    case "hinge":
    case "roof":
      return 3;
    case "bar":
      return 8;
    case "wheel":
      return 2;
    case "fig":
      return 8;
    default:
      return 3;
  }
}

export function rotatedDims(w, d, rot) {
  const r = ((rot % 4) + 4) % 4;
  return r % 2 === 1 ? { bw: d, bd: w } : { bw: w, bd: d };
}

export function brickMaterial(col) {
  const key = col.id;
  if (_matCache.has(key)) return _matCache.get(key);
  const mat = new THREE.MeshLambertMaterial({
    color: col.hex,
    transparent: !!col.trans,
    opacity: col.trans ? 0.48 : 1,
    depthWrite: !col.trans,
  });
  _matCache.set(key, mat);
  return mat;
}

function studPositions(w, d, kind) {
  const none = new Set(["tile", "grille", "slope", "invslope", "cheese", "cone", "arch", "window", "door", "bow", "roof", "windshield", "antenna", "leaf", "flower", "fence", "panel", "bar", "wheel", "invarch"]);
  if (none.has(kind)) {
    if (kind === "dish" || kind === "macaroni" || kind === "pillar") return [{ i: (w - 1) / 2, j: (d - 1) / 2 }];
    if (kind === "slope" || kind === "cone" || kind === "arch" || kind === "bow" || kind === "roof" || kind === "windshield" || kind === "antenna" || kind === "leaf" || kind === "flower" || kind === "bar" || kind === "wheel") return [];
  }
  if (kind === "jumper" || kind === "dish" || kind === "macaroni" || kind === "pillar" || kind === "clip") return [{ i: (w - 1) / 2, j: (d - 1) / 2 }];
  const out = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.push({ i, j });
  return out;
}

function mergeGeos(geos) {
  const list = geos.filter(Boolean);
  if (!list.length) return new THREE.BoxGeometry(STUD, PLATE, STUD);
  if (list.length === 1) return list[0];
  for (const g of list) {
    if (!g.getAttribute("uv")) {
      const n = g.getAttribute("position").count;
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    if (!g.getAttribute("normal")) g.computeVertexNormals();
  }
  const m = BufferGeometryUtils.mergeGeometries(list, false);
  return m || list[0];
}

function boxAt(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function cylAt(r, h, x, y, z, axis = "y", segs = 8) {
  const g = new THREE.CylinderGeometry(r, r, h, segs);
  if (axis === "x") g.rotateZ(Math.PI / 2);
  if (axis === "z") g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

function wedgeGeo(w, h, d) {
  const hw = w / 2, hd = d / 2;
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([
    -hw, 0, -hd,  hw, 0, -hd,  hw, 0, hd,  -hw, 0, hd,
    -hw, h, -hd,  hw, h, -hd,
  ]);
  const idx = [
    0, 1, 2, 0, 2, 3,
    0, 4, 5, 0, 5, 1,
    1, 5, 2,
    3, 2, 5, 3, 5, 4,
    0, 3, 4,
  ];
  g.setAttribute("position", new THREE.BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function invWedgeGeo(w, h, d) {
  const hw = w / 2, hd = d / 2;
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([
    -hw, 0, -hd,  hw, 0, -hd,
    -hw, h, -hd,  hw, h, -hd,  hw, h, hd,  -hw, h, hd,
  ]);
  const idx = [
    2, 3, 4, 2, 4, 5,
    0, 1, 3, 0, 3, 2,
    1, 4, 3,
    0, 5, 4, 0, 4, 1,
    0, 2, 5,
  ];
  g.setAttribute("position", new THREE.BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function shapeSpec(dim, kindId) {
  const kind = kindId;
  let w = dim.w, d = dim.d;
  if (kind === "cheese" || kind === "macaroni" || kind === "leaf" || kind === "flower" || kind === "antenna" || kind === "bar" || kind === "clip") {
    w = 1; d = 1;
  }
  if (kind === "door") { w = Math.max(1, w); d = Math.max(2, Math.min(d, 4)); }
  if (kind === "window") { w = Math.max(1, w); d = Math.max(2, d); }
  if (kind === "stairs") { w = Math.max(4, w); d = Math.max(4, d); }
  if (kind === "arch" || kind === "invarch") { d = Math.max(3, d); w = Math.max(1, w); }
  if (kind === "base") { w = Math.max(8, w); d = Math.max(8, d); }
  if (kind === "cone" || kind === "round" || kind === "cylinder" || kind === "dish" || kind === "wheel" || kind === "pillar") {
    w = Math.max(1, w); d = w;
  }
  if (kind === "bow") { w = 1; d = Math.max(3, d); }
  if (kind === "fence") { w = 1; d = Math.max(4, d); }
  if (kind === "windshield") { w = Math.max(2, w); d = Math.max(2, d); }
  if (kind === "wing") { w = Math.max(2, w); d = Math.max(4, d); }
  if (kind === "panel") { w = 1; d = Math.max(2, d); }
  const h = platesFor(kind, d);
  const studs = studPositions(w, d, kind);
  return { w, d, h, kind, studs, dimId: dim.id };
}

function buildGeometry(spec) {
  const key = `${spec.kind}:${spec.w}x${spec.d}x${spec.h}`;
  if (_geoCache.has(key)) return _geoCache.get(key);
  const W = spec.w * STUD;
  const D = spec.d * STUD;
  const H = spec.h * PLATE;
  const geos = [];
  const k = spec.kind;

  if (k === "slope") {
    geos.push(wedgeGeo(W, H, D));
  } else if (k === "invslope") {
    geos.push(invWedgeGeo(W, H, D));
  } else if (k === "cheese") {
    geos.push(wedgeGeo(W, PLATE, D));
  } else if (k === "round" || k === "cylinder") {
    const r = W * 0.48;
    geos.push(cylAt(r, H, 0, H / 2, 0, "y", 12));
  } else if (k === "cone") {
    const r = W * 0.48;
    const g = new THREE.ConeGeometry(r, H, 10);
    g.translate(0, H / 2, 0);
    geos.push(g);
  } else if (k === "arch") {
    const t = WALL * 2.2;
    geos.push(boxAt(W, H, t, 0, H / 2, -D / 2 + t / 2));
    geos.push(boxAt(W, H, t, 0, H / 2, D / 2 - t / 2));
    geos.push(boxAt(W, t * 1.6, D, 0, H - t * 0.8, 0));
  } else if (k === "stairs") {
    const steps = spec.d;
    const stepH = H / steps;
    const stepD = D / steps;
    for (let s = 0; s < steps; s++) {
      const sh = (s + 1) * stepH;
      const sd = D - s * stepD;
      const z = -D / 2 + sd / 2;
      geos.push(boxAt(W, sh, sd, 0, sh / 2, z));
    }
  } else if (k === "window") {
    const t = WALL * 1.8;
    geos.push(boxAt(W, H, t, 0, H / 2, -D / 2 + t / 2));
    geos.push(boxAt(W, H, t, 0, H / 2, D / 2 - t / 2));
    geos.push(boxAt(W, t, D, 0, t / 2, 0));
    geos.push(boxAt(W, t, D, 0, H - t / 2, 0));
  } else if (k === "door") {
    const t = WALL * 1.8;
    geos.push(boxAt(W, H, t, 0, H / 2, -D / 2 + t / 2));
    geos.push(boxAt(W, H, t, 0, H / 2, D / 2 - t / 2));
    geos.push(boxAt(W, t, D, 0, H - t / 2, 0));
  } else if (k === "corner") {
    const t = W / 2;
    geos.push(boxAt(W, H, t, 0, H / 2, -D / 2 + t / 2));
    geos.push(boxAt(t, H, D, -W / 2 + t / 2, H / 2, 0));
  } else if (k === "wedge") {
    geos.push(wedgeGeo(W, H, D));
  } else if (k === "log") {
    geos.push(boxAt(W * 0.92, H, D, 0, H / 2, 0));
    for (let i = 0; i < spec.d; i++) {
      const z = (i + 0.5) * STUD - D / 2;
      geos.push(cylAt(W * 0.42, STUD * 0.9, 0, H / 2, z, "x", 8));
    }
  } else if (k === "grille") {
    geos.push(boxAt(W, H * 0.6, D, 0, H * 0.3, 0));
    for (let i = 0; i < spec.d; i++) {
      const z = (i + 0.5) * STUD - D / 2;
      geos.push(boxAt(W * 0.12, H, STUD * 0.2, 0, H / 2, z));
    }
  } else if (k === "bow") {
    const bow = new THREE.CylinderGeometry(D, D, W, 12, 1, false, 0, Math.PI / 2);
    bow.rotateZ(Math.PI / 2);
    bow.translate(0, 0, 0);
    geos.push(bow);
  } else if (k === "roof") {
    geos.push(wedgeGeo(W, H * 1.35, D));
  } else if (k === "dish") {
    const dish = new THREE.SphereGeometry(W * 0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.46);
    dish.translate(0, H * 0.15, 0);
    geos.push(dish);
  } else if (k === "macaroni") {
    const mac = new THREE.TorusGeometry(W * 0.42, W * 0.22, 8, 10, Math.PI / 2);
    mac.rotateX(Math.PI / 2);
    mac.translate(W * 0.2, H * 0.5, W * 0.2);
    geos.push(mac);
  } else if (k === "pillar") {
    geos.push(cylAt(W * 0.38, H, 0, H / 2, 0, "y", 10));
    geos.push(cylAt(W * 0.48, H * 0.12, 0, H * 0.06, 0, "y", 10));
    geos.push(cylAt(W * 0.48, H * 0.12, 0, H - H * 0.06, 0, "y", 10));
  } else if (k === "wheel") {
    const tire = new THREE.CylinderGeometry(W * 0.48, W * 0.48, W * 0.38, 14);
    tire.rotateZ(Math.PI / 2);
    tire.translate(0, H * 0.5, 0);
    geos.push(tire);
    geos.push(cylAt(W * 0.16, W * 0.46, 0, H * 0.5, 0, "x", 8));
  } else if (k === "invarch") {
    const t = WALL * 2.2;
    geos.push(boxAt(W, t * 1.4, D, 0, t * 0.7, 0));
    geos.push(boxAt(W, H, t, 0, H / 2, -D / 2 + t / 2));
    geos.push(boxAt(W, H, t, 0, H / 2, D / 2 - t / 2));
  } else if (k === "panel") {
    geos.push(boxAt(W * 0.28, H, D, 0, H / 2, 0));
  } else if (k === "fence") {
    const posts = Math.max(2, spec.d);
    for (let i = 0; i < posts; i++) {
      const z = (i / (posts - 1) - 0.5) * D;
      geos.push(boxAt(W * 0.28, H, STUD * 0.22, 0, H / 2, z));
    }
    geos.push(boxAt(W * 0.18, STUD * 0.18, D, 0, H * 0.35, 0));
    geos.push(boxAt(W * 0.18, STUD * 0.18, D, 0, H * 0.7, 0));
  } else if (k === "windshield") {
    const pane = boxAt(W, H * 0.16, D * 1.05, 0, H * 0.5, 0);
    pane.rotateX(-0.55);
    pane.translate(0, H * 0.2, 0);
    geos.push(pane);
    geos.push(boxAt(W, H * 0.18, D * 0.2, 0, H * 0.1, -D * 0.35));
  } else if (k === "hinge") {
    geos.push(boxAt(W, H * 0.55, D * 0.45, 0, H * 0.28, -D * 0.25));
    geos.push(boxAt(W, H * 0.55, D * 0.45, 0, H * 0.72, D * 0.25));
    geos.push(cylAt(STUD * 0.22, W * 0.9, 0, H * 0.5, 0, "x", 8));
  } else if (k === "sidestud") {
    geos.push(boxAt(W, H, D, 0, H / 2, 0));
    geos.push(cylAt(STUD_R, STUD_H, 0, H / 2, D / 2 + STUD_H / 2, "z", 7));
  } else if (k === "technic") {
    geos.push(boxAt(W, H, D, 0, H / 2, 0));
    const holes = Math.max(1, spec.d);
    for (let i = 0; i < holes; i++) {
      const z = (i + 0.5) * STUD - D / 2;
      geos.push(cylAt(STUD * 0.22, W * 1.05, 0, H * 0.5, z, "x", 8));
    }
  } else if (k === "clip") {
    geos.push(boxAt(W, H, D, 0, H / 2, 0));
    geos.push(boxAt(W * 0.22, H * 1.6, D * 0.22, -W * 0.35, H * 1.1, 0));
    geos.push(boxAt(W * 0.22, H * 1.6, D * 0.22, W * 0.35, H * 1.1, 0));
    geos.push(boxAt(W * 0.9, H * 0.22, D * 0.22, 0, H * 1.85, 0));
  } else if (k === "antenna") {
    geos.push(boxAt(W, PLATE, D, 0, PLATE / 2, 0));
    geos.push(cylAt(STUD * 0.08, H, 0, H / 2, 0, "y", 6));
  } else if (k === "bar") {
    geos.push(cylAt(STUD * 0.12, H, 0, H / 2, 0, "y", 6));
  } else if (k === "bracket") {
    geos.push(boxAt(W, H * 0.4, D, 0, H * 0.2, 0));
    geos.push(boxAt(W, H, D * 0.35, 0, H / 2, -D / 2 + D * 0.18));
  } else if (k === "leaf") {
    const leaf = new THREE.SphereGeometry(W * 0.7, 8, 6);
    leaf.scale(1.4, 0.18, 0.7);
    leaf.translate(0, H * 0.4, D * 0.15);
    geos.push(leaf);
    geos.push(cylAt(STUD * 0.08, H * 0.8, 0, H * 0.4, 0, "y", 5));
  } else if (k === "flower") {
    geos.push(cylAt(STUD * 0.08, H * 1.4, 0, H * 0.7, 0, "y", 5));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const petal = new THREE.SphereGeometry(STUD * 0.28, 6, 5);
      petal.translate(Math.cos(a) * STUD * 0.38, H * 1.35, Math.sin(a) * STUD * 0.38);
      geos.push(petal);
    }
    const bud = new THREE.SphereGeometry(STUD * 0.22, 6, 5);
    bud.translate(0, H * 1.35, 0);
    geos.push(bud);
  } else if (k === "wing") {
    geos.push(wedgeGeo(W, H * 0.7, D));
    geos.push(boxAt(W * 0.4, H, D * 0.25, 0, H / 2, -D / 2 + D * 0.12));
  } else {
    geos.push(boxAt(W, H, D, 0, H / 2, 0));
  }

  const noStud = new Set(["tile", "grille", "slope", "invslope", "cheese", "cone", "arch", "window", "door", "bow", "roof", "windshield", "antenna", "leaf", "flower", "fence", "panel", "bar", "wheel", "invarch", "technic"]);
  const manyStuds = spec.studs.length > 64;
  if (!manyStuds && !noStud.has(k)) {
    for (const s of spec.studs) {
      const x = (s.i + 0.5) * STUD - W / 2;
      const z = (s.j + 0.5) * STUD - D / 2;
      geos.push(cylAt(STUD_R, STUD_H, x, H + STUD_H / 2, z, "y", 7));
    }
  }

  const merged = mergeGeos(geos);
  merged.computeVertexNormals();
  _geoCache.set(key, merged);
  return merged;
}

export function makeBrickMesh(spec, col, ghost = false) {
  const geo = buildGeometry(spec);
  const mat = brickMaterial(col).clone();
  if (ghost) {
    mat.transparent = true;
    mat.opacity = 0.45;
    mat.depthWrite = false;
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.spec = spec;
  mesh.userData.col = col.id;
  mesh.userData.kind = "brick";
  return mesh;
}

export function aabbLocal(spec) {
  return {
    hx: (spec.w * STUD) / 2,
    hy: spec.h * PLATE,
    hz: (spec.d * STUD) / 2,
  };
}

export function gridToLocal(gx, gy, gz, spec, rot) {
  const { bw, bd } = rotatedDims(spec.w, spec.d, rot);
  return new THREE.Vector3(
    (gx + bw / 2) * STUD,
    gy * PLATE,
    (gz + bd / 2) * STUD,
  );
}

export function localToGrid(pos, spec, rot) {
  const { bw, bd } = rotatedDims(spec.w, spec.d, rot);
  const gx = Math.round(pos.x / STUD - bw / 2);
  const gz = Math.round(pos.z / STUD - bd / 2);
  const gy = Math.round(pos.y / PLATE);
  return { gx, gy, gz };
}

export function footStuds(spec, rot, gx, gz) {
  const r = ((rot % 4) + 4) % 4;
  const out = [];
  const studs = spec.studs.length ? spec.studs : (spec.kind === "tile" || spec.kind === "slope" || spec.kind === "cheese" || spec.kind === "cone" || spec.kind === "arch"
    ? []
    : null);
  const list = studs && studs.length
    ? studs
    : Array.from({ length: spec.w * spec.d }, (_, n) => ({ i: n % spec.w, j: Math.floor(n / spec.w) }));
  for (const s of list) {
    let i = s.i, j = s.j;
    const w = spec.w, d = spec.d;
    let x = i, z = j;
    if (r === 1) { x = j; z = w - 1 - i; }
    else if (r === 2) { x = w - 1 - i; z = d - 1 - j; }
    else if (r === 3) { x = d - 1 - j; z = i; }
    out.push({ x: gx + x, z: gz + z });
  }
  return out;
}

export function cellsOf(gx, gy, gz, spec, rot) {
  const { bw, bd } = rotatedDims(spec.w, spec.d, rot);
  const cells = [];
  for (let i = 0; i < bw; i++) {
    for (let j = 0; j < bd; j++) {
      cells.push({ x: gx + i, z: gz + j, y0: gy, y1: gy + spec.h });
    }
  }
  return cells;
}

export function randomSpec() {
  const dim = DIMS[Math.floor(Math.random() * 12)];
  const kinds = KINDS.filter((k) => k.id !== "fig" && k.id !== "base" && k.id !== "door");
  const kind = kinds[Math.floor(Math.random() * kinds.length)].id;
  return shapeSpec(dim, kind);
}
