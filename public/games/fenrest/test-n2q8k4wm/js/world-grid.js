/**
 * Fenrest overworld: expanded heightfield, chunk streaming (one cell at a time),
 * themed cities, roads, and solid ground underfoot.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";

export const CHUNK = 148;
export const GRID = 5;
export const WORLD = CHUNK * GRID;
export const HALF = WORLD / 2;

export const CITIES = [
  { id: "fenrest", name: "Fenrest", x: 0, z: 0, r: 50, theme: "thatch", major: false, lore: "A thatched fen village. The old crossing still remembers kings." },
  { id: "aurelia", name: "Aurelia", x: 0, z: -200, r: 46, theme: "roman", major: true, lore: "Marble forums and legion roads. The senate of the north." },
  { id: "kagehara", name: "Kagehara", x: -190, z: -90, r: 44, theme: "japanese", major: true, lore: "Cedar gates, paper lanterns, and a shogunate that never sleeps." },
  { id: "khemet", name: "Khemet-on-Sand", x: -190, z: 90, r: 44, theme: "egyptian", major: true, lore: "Obelisks drink the sun. The river is a god with many names." },
  { id: "osmanli", name: "Osmanli", x: 190, z: -90, r: 44, theme: "ottoman", major: true, lore: "Domes, bazaars, and a renaissance court of tulips and cannon." },
  { id: "brasshaven", name: "Brasshaven", x: 190, z: 90, r: 44, theme: "victorian", major: true, lore: "Gaslamps, brick stacks, and a queen of iron clocks." },
  { id: "aldermere", name: "Aldermere", x: 0, z: 200, r: 46, theme: "medieval", major: true, lore: "English stone keeps, market greens, and a motte that never fell." },
];

export const HAMLETS = [
  { name: "Via Post", x: 12, z: -108, r: 14, theme: "roman" },
  { name: "Torii Bend", x: -108, z: -48, r: 14, theme: "japanese" },
  { name: "Reed Oasis", x: -108, z: 48, r: 14, theme: "egyptian" },
  { name: "Tulip Gate", x: 108, z: -48, r: 14, theme: "ottoman" },
  { name: "Lampwick", x: 108, z: 48, r: 14, theme: "victorian" },
  { name: "Hayward", x: 14, z: 108, r: 14, theme: "medieval" },
  { name: "Fen Crossing", x: -36, z: -28, r: 10, theme: "thatch" },
  { name: "Sheepfold", x: 62, z: 154, r: 12, theme: "medieval" },
  { name: "Northwatch", x: 8, z: -286, r: 12, theme: "roman" },
  { name: "Cedar Post", x: -286, z: -36, r: 12, theme: "japanese" },
  { name: "Dunestone", x: -254, z: 168, r: 12, theme: "egyptian" },
  { name: "Saffron Rise", x: 262, z: -168, r: 12, theme: "ottoman" },
  { name: "Cogford", x: 288, z: 42, r: 12, theme: "victorian" },
  { name: "Motte End", x: 42, z: 288, r: 12, theme: "medieval" },
  { name: "Marshlamp", x: -72, z: 196, r: 12, theme: "thatch" },
];

export const LANDMARKS = [
  { kind: "watchtower", name: "East Watch", x: 72, z: -64, theme: "medieval" },
  { kind: "watchtower", name: "West Watch", x: -72, z: 64, theme: "roman" },
  { kind: "watchtower", name: "Ridge Watch", x: 168, z: 8, theme: "victorian" },
  { kind: "watchtower", name: "Gate Watch", x: -168, z: -8, theme: "japanese" },
  { kind: "watchtower", name: "Crown Watch", x: 6, z: 168, theme: "medieval" },
  { kind: "watchtower", name: "Mere Watch", x: -6, z: -168, theme: "roman" },
  { kind: "watchtower", name: "Far North", x: -40, z: -320, theme: "roman" },
  { kind: "watchtower", name: "Far South", x: 40, z: 320, theme: "medieval" },
  { kind: "stone", name: "Standing Stone", x: 36, z: 28 },
  { kind: "stone", name: "Old Menhir", x: -220, z: -220 },
  { kind: "stone", name: "Crown Circle", x: 220, z: 180 },
  { kind: "stone", name: "Fen Marker", x: -48, z: 40 },
];

const RAISED = [];

export function raiseTerrain(x, z, radius, amount) {
  RAISED.push({ x, z, r: radius, a: amount });
}

export function heightAt(x, z) {
  const n = Math.hypot(x, z);
  const r = Math.max(0, 1 - n / 58);
  const n2 = Math.sin(x * 0.021) * Math.cos(z * 0.019) * 0.7 + Math.sin(x * 0.007 + z * 0.009) * 0.45;
  let a = Math.max(0, n2 + 0.12) * 3.6 * (1 - r * 0.92);
  const edge = HALF - 18;
  if (Math.abs(x) > edge || Math.abs(z) > edge) {
    const ox = Math.max(0, Math.abs(x) - edge);
    const oz = Math.max(0, Math.abs(z) - edge);
    a += Math.min(14, (ox + oz) * 0.35);
  }
  for (const t of CITIES) {
    const d = Math.hypot(x - t.x, z - t.z);
    const rad = t.id === "fenrest" ? 52 : t.r;
    if (d < rad) {
      const plat = t.id === "fenrest" ? 0 : (heightAt.rawPlateau?.(t) ?? 0.4);
      a = THREE.MathUtils.lerp(a, plat, Math.max(0, 1 - d / rad));
    }
  }
  for (const h of HAMLETS) {
    const d = Math.hypot(x - h.x, z - h.z);
    if (d < h.r) a = THREE.MathUtils.lerp(a, 0.35, Math.max(0, 1 - d / h.r));
  }
  for (const p of RAISED) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r) a += p.a * (1 - d / p.r);
  }
  return a;
}

export function inSettlement(x, z) {
  for (const t of CITIES) if (Math.hypot(x - t.x, z - t.z) < t.r) return t;
  for (const h of HAMLETS) if (Math.hypot(x - h.x, z - h.z) < h.r) return h;
  return null;
}

export function chunkOf(x, z) {
  const cx = Math.floor((x + HALF) / CHUNK);
  const cz = Math.floor((z + HALF) / CHUNK);
  return {
    cx: Math.max(0, Math.min(GRID - 1, cx)),
    cz: Math.max(0, Math.min(GRID - 1, cz)),
  };
}

export function chunkOrigin(cx, cz) {
  return { x: cx * CHUNK - HALF, z: cz * CHUNK - HALF };
}

function tex(draw, w = 64, h = 64, wrap = 4) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(wrap, wrap);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const TEX = {
  dirt: tex((g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = 88 + ((x * 13 + y * 7) % 30);
        g.fillStyle = `rgb(${n},${n - 20},${n - 38})`;
        g.fillRect(x, y, 1, 1);
      }
  }, 32, 32, 10),
  grass: tex((g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = 70 + ((x * 9 + y * 5) % 40);
        g.fillStyle = `rgb(${n - 20},${n + 18},${n - 40})`;
        g.fillRect(x, y, 1, 1);
      }
  }, 32, 32, 8),
  stone: tex((g, w, h) => {
    g.fillStyle = "#8a8680";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#6a6660";
    for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1);
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 1, h);
  }, 32, 32, 6),
  sand: tex((g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = 180 + ((x * 3 + y * 11) % 28);
        g.fillStyle = `rgb(${n},${n - 30},${n - 90})`;
        g.fillRect(x, y, 1, 1);
      }
  }, 32, 32, 8),
  marble: tex((g, w, h) => {
    g.fillStyle = "#e8e0d4";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(180,170,160,0.5)";
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo(0, i * 8);
      g.lineTo(w, i * 8 + 4);
      g.stroke();
    }
  }, 32, 32, 3),
  plaster: tex((g, w, h) => {
    g.fillStyle = "#d8c8a0";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(160,140,100,0.3)";
    for (let i = 0; i < 20; i++) g.fillRect((i * 7) % w, (i * 11) % h, 4, 3);
  }, 32, 32, 4),
  brick: tex((g, w, h) => {
    g.fillStyle = "#4a281e";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      const o = (y / 8) % 2 ? 4 : 0;
      for (let x = -8; x < w; x += 16) {
        g.fillStyle = `rgb(${150 + (x % 6) * 3},${72},${48})`;
        g.fillRect(x + o + 1, y + 1, 14, 6);
      }
    }
  }, 32, 32, 4),
  thatch: tex((g, w, h) => {
    for (let y = 0; y < h; y++) {
      g.fillStyle = `rgb(${150 + (y % 4) * 8},${110 + (y % 3) * 6},${40})`;
      g.fillRect(0, y, w, 1);
    }
  }, 16, 32, 3),
  wood: tex((g, w, h) => {
    for (let y = 0; y < h; y++) {
      g.fillStyle = `rgb(${110 + (y % 7) * 6},${72},${36})`;
      g.fillRect(0, y, w, 1);
    }
  }, 32, 32, 2),
  tile: tex((g, w, h) => {
    g.fillStyle = "#3a6a58";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#2a4a40";
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) g.strokeRect(x, y, 8, 8);
  }, 32, 32, 4),
  iron: tex((g, w, h) => {
    g.fillStyle = "#5a5e64";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#8a9098";
    for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1);
  }, 32, 32, 3),
};

const THEME = {
  roman: { wall: TEX.marble, roof: TEX.tile, trim: 0xc4a050, ground: TEX.stone, wallC: 0xe8e0d0, roofC: 0x3a6a58 },
  japanese: { wall: TEX.plaster, roof: TEX.tile, trim: 0x6a2018, ground: TEX.dirt, wallC: 0xe8dcc0, roofC: 0x4a2018 },
  egyptian: { wall: TEX.sand, roof: TEX.stone, trim: 0xc4a050, ground: TEX.sand, wallC: 0xe0c070, roofC: 0x8a7a50 },
  ottoman: { wall: TEX.plaster, roof: TEX.tile, trim: 0x8a6a20, ground: TEX.stone, wallC: 0xd4c4a0, roofC: 0x3a6a4a },
  victorian: { wall: TEX.brick, roof: TEX.iron, trim: 0x2a2a28, ground: TEX.stone, wallC: 0x8a4a3a, roofC: 0x2a2824 },
  medieval: { wall: TEX.stone, roof: TEX.thatch, trim: 0x4a3020, ground: TEX.dirt, wallC: 0x8a8680, roofC: 0x6a4a28 },
  thatch: { wall: TEX.wood, roof: TEX.thatch, trim: 0x3a2a18, ground: TEX.grass, wallC: 0xc4b48a, roofC: 0x6a4a28 },
};

function box(mat, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function matMap(texMap, color) {
  return new THREE.MeshBasicMaterial({ map: texMap, color: color ?? 0xffffff });
}

function buildGroundChunk(cx, cz) {
  const segs = 72;
  const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const ox = cx * CHUNK - HALF + CHUNK / 2;
  const oz = cz * CHUNK - HALF + CHUNK / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox;
    const z = pos.getZ(i) + oz;
    pos.setY(i, heightAt(x, z));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, matMap(TEX.grass, 0x6a8a4a));
  mesh.position.set(ox, 0, oz);
  mesh.userData.ground = true;
  return mesh;
}

function roadSeg(parent, a, b, bounds) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  if (len < 1) return;
  const steps = Math.max(2, Math.floor(len / 12));
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const x0 = a.x + dx * t0;
    const z0 = a.z + dz * t0;
    const x1 = a.x + dx * t1;
    const z1 = a.z + dz * t1;
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    if (bounds && (mx < bounds.x || mx >= bounds.x + bounds.w || mz < bounds.z || mz >= bounds.z + bounds.d)) continue;
    const sl = Math.hypot(x1 - x0, z1 - z0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, sl + 0.2), matMap(TEX.dirt, 0x8a6a48));
    m.position.set(mx, (heightAt(x0, z0) + heightAt(x1, z1)) / 2 + 0.05, mz);
    m.rotation.y = Math.atan2(x1 - x0, z1 - z0);
    parent.add(m);
  }
}

function signpost(parent, x, z, label) {
  const y0 = heightAt(x, z);
  parent.add(box(matMap(TEX.wood), x, y0 + 1.1, z, 0.1, 2.2, 0.1));
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#5a3a18";
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#f0e2c4";
  g.font = "bold 26px serif";
  g.textAlign = "center";
  g.fillText(label, 128, 42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
  pl.position.set(x, y0 + 2.1, z);
  pl.userData.billboard = true;
  parent.add(pl);
}

function themedBuilding(g, x, z, theme, w, d, stories) {
  const pal = THEME[theme] || THEME.thatch;
  const y0 = heightAt(x, z);
  const h = 2.7 * stories;
  const wall = matMap(pal.wall, pal.wallC);
  const roof = matMap(pal.roof, pal.roofC);
  g.add(box(wall, x, y0 + h / 2, z, w, h, d));
  if (theme === "roman") {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, h + 0.4, 8), matMap(TEX.marble));
    col.position.set(x - w * 0.42, y0 + h / 2, z - d * 0.42);
    g.add(col);
    const ped = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.55, 1.1, 4), roof);
    ped.position.set(x, y0 + h + 0.55, z);
    ped.rotation.y = Math.PI / 4;
    g.add(ped);
  } else if (theme === "japanese") {
    const roofM = new THREE.Mesh(new THREE.BoxGeometry(w * 1.25, 0.18, d * 1.35), roof);
    roofM.position.set(x, y0 + h + 0.2, z);
    g.add(roofM);
    const peak = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.12, d * 0.5), roof);
    peak.position.set(x, y0 + h + 0.5, z);
    g.add(peak);
  } else if (theme === "egyptian") {
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.62, 2.2 + stories, 4), matMap(TEX.sand, 0xd4b060));
    pyr.position.set(x, y0 + h + 1.1, z);
    pyr.rotation.y = Math.PI / 4;
    g.add(pyr);
  } else if (theme === "ottoman") {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.38, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), roof);
    dome.position.set(x, y0 + h, z);
    g.add(dome);
    const min = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, h + 1.6, 8), matMap(pal.wall, pal.wallC));
    min.position.set(x + w * 0.45, y0 + (h + 1.6) / 2, z + d * 0.4);
    g.add(min);
  } else if (theme === "victorian") {
    g.add(box(wall, x, y0 + h / 2, z, w, h, d));
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.4, 6), matMap(TEX.brick));
    stack.position.set(x + w * 0.3, y0 + h + 1.2, z);
    g.add(stack);
    const roofM = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.2, d * 1.05), roof);
    roofM.position.set(x, y0 + h + 0.2, z);
    g.add(roofM);
  } else {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 1.5, 4), roof);
    cone.position.set(x, y0 + h + 0.75, z);
    cone.rotation.y = Math.PI / 4;
    g.add(cone);
  }
}

function buildCity(parent, city) {
  const pal = THEME[city.theme] || THEME.thatch;
  const g = new THREE.Group();
  g.name = "city-" + city.id;
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(city.r * 0.4, 24), matMap(pal.ground));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(city.x, heightAt(city.x, city.z) + 0.06, city.z);
  g.add(plaza);
  const layout = [
    [9, 5, 7, 6, 2],
    [-8, 6, 6, 6, 2],
    [7, -8, 6, 7, 2],
    [-7, -7, 7, 6, 1],
    [0, 12, 8, 6, city.major ? 3 : 1],
    [14, 0, 5, 5, 1],
    [-13, 2, 5, 5, 1],
  ];
  layout.forEach((L) => themedBuilding(g, city.x + L[0], city.z + L[1], city.theme, L[2], L[3], L[4]));
  if (city.theme === "roman") {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 10), matMap(TEX.marble));
      col.position.set(city.x + Math.cos(a) * 10, heightAt(city.x, city.z) + 2.1, city.z + Math.sin(a) * 10);
      g.add(col);
    }
  }
  if (city.theme === "egyptian") {
    const ob = new THREE.Mesh(new THREE.ConeGeometry(0.45, 7, 4), matMap(TEX.sand, 0xc4a050));
    ob.position.set(city.x, heightAt(city.x, city.z) + 3.6, city.z);
    g.add(ob);
  }
  if (city.theme === "japanese") {
    const torii = new THREE.Group();
    const y0 = heightAt(city.x, city.z);
    torii.add(box(matMap(TEX.wood, 0x8a2018), city.x, y0 + 2.2, city.z + city.r * 0.45, 0.22, 4.4, 0.22));
    torii.add(box(matMap(TEX.wood, 0x8a2018), city.x + 2.2, y0 + 2.2, city.z + city.r * 0.45, 0.22, 4.4, 0.22));
    torii.add(box(matMap(TEX.wood, 0x8a2018), city.x + 1.1, y0 + 4.4, city.z + city.r * 0.45, 3.2, 0.22, 0.4));
    g.add(torii);
  }
  signpost(g, city.x, city.z + city.r * 0.55, city.name.toUpperCase());
  const lore = document.createElement("canvas");
  lore.width = 512;
  lore.height = 96;
  const lg = lore.getContext("2d");
  lg.fillStyle = "rgba(20,12,8,0.7)";
  lg.fillRect(0, 0, 512, 96);
  lg.fillStyle = "#f0e2c4";
  lg.font = "18px serif";
  lg.textAlign = "center";
  lg.fillText(city.lore || "", 256, 55);
  const lt = new THREE.CanvasTexture(lore);
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.8), new THREE.MeshBasicMaterial({ map: lt, transparent: true, side: THREE.DoubleSide }));
  lp.position.set(city.x, heightAt(city.x, city.z) + 2.6, city.z + 4);
  lp.userData.billboard = true;
  g.add(lp);
  parent.add(g);
  return g;
}

function buildHamlet(parent, h) {
  const g = new THREE.Group();
  themedBuilding(g, h.x, h.z, h.theme, 5, 5, 1);
  themedBuilding(g, h.x + 6, h.z - 3, h.theme, 4, 4, 1);
  themedBuilding(g, h.x - 5, h.z + 4, h.theme, 3.6, 3.8, 1);
  signpost(g, h.x, h.z + 8, h.name);
  parent.add(g);
}

function watchtower(parent, x, z, theme) {
  const pal = THEME[theme] || THEME.medieval;
  const y0 = heightAt(x, z);
  const wall = matMap(pal.wall, pal.wallC);
  const roof = matMap(pal.roof, pal.roofC);
  parent.add(box(wall, x, y0 + 1.5, z, 3.4, 3.0, 3.4));
  parent.add(box(wall, x, y0 + 5.4, z, 2.2, 4.8, 2.2));
  parent.add(box(roof, x, y0 + 8.05, z, 2.7, 0.32, 2.7));
  for (const [dx, dz] of [
    [-1.05, -1.05],
    [1.05, -1.05],
    [-1.05, 1.05],
    [1.05, 1.05],
  ]) {
    parent.add(box(wall, x + dx, y0 + 8.5, z + dz, 0.5, 0.72, 0.5));
  }
}

function standingStone(parent, x, z) {
  const y0 = heightAt(x, z);
  const rock = matMap(TEX.stone, 0x9a968c);
  parent.add(box(rock, x, y0 + 2.2, z, 0.72, 4.4, 0.36));
  parent.add(box(rock, x + 1.5, y0 + 1.5, z + 0.7, 0.48, 3.0, 0.3));
  parent.add(box(rock, x - 1.3, y0 + 1.25, z - 0.55, 0.42, 2.5, 0.28));
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.12, 12), matMap(TEX.dirt, 0x6a5a40));
  ring.position.set(x, y0 + 0.08, z);
  parent.add(ring);
}

function buildLandmark(parent, lm) {
  const g = new THREE.Group();
  g.name = "landmark-" + (lm.name || lm.kind);
  if (lm.kind === "watchtower") watchtower(g, lm.x, lm.z, lm.theme);
  else standingStone(g, lm.x, lm.z);
  if (lm.name) signpost(g, lm.x, lm.z + 6, lm.name.toUpperCase());
  parent.add(g);
}

export function createChunkManager(root, opts = {}) {
  let current = { cx: -1, cz: -1 };
  const loaded = new THREE.Group();
  loaded.name = "fenrest-chunk";
  root.add(loaded);

  function clear() {
    while (loaded.children.length) {
      const ch = loaded.children[0];
      loaded.remove(ch);
      ch.traverse((o) => {
        o.geometry?.dispose?.();
      });
    }
  }

  function load(cx, cz) {
    clear();
    opts.onUnload?.(current.cx, current.cz);
    loaded.add(buildGroundChunk(cx, cz));
    const ox = cx * CHUNK - HALF;
    const oz = cz * CHUNK - HALF;
    const bounds = { x: ox, z: oz, w: CHUNK, d: CHUNK };
    const inChunk = (p) => p.x >= ox && p.x < ox + CHUNK && p.z >= oz && p.z < oz + CHUNK;
    CITIES.filter(inChunk).forEach((c) => buildCity(loaded, c));
    HAMLETS.filter(inChunk).forEach((h) => buildHamlet(loaded, h));
    LANDMARKS.filter(inChunk).forEach((lm) => buildLandmark(loaded, lm));
    const nodes = [...CITIES];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].id === "fenrest" || nodes[j].id === "fenrest" || (nodes[i].major && nodes[j].major)) {
          roadSeg(loaded, nodes[i], nodes[j], bounds);
        }
      }
    }
    for (const h of HAMLETS) {
      let best = CITIES[0];
      let bd = 1e9;
      for (const c of CITIES) {
        const d = Math.hypot(c.x - h.x, c.z - h.z);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      roadSeg(loaded, h, best, bounds);
    }
    opts.onChunk?.(cx, cz, { origin: { x: ox, z: oz }, group: loaded, bounds });
  }

  function tick(px, pz) {
    const c = chunkOf(px, pz);
    if (c.cx !== current.cx || c.cz !== current.cz) {
      current = c;
      load(c.cx, c.cz);
    }
    loaded.traverse((o) => {
      if (o.userData.billboard && o.isMesh) o.lookAt(px, o.position.y, pz);
    });
  }

  return { tick, loaded, current: () => current };
}

const LAST_FEET = { x: 0, z: 0, ok: false };

export function clampWalk(px, pz, nx, nz) {
  const dist = Math.hypot(nx - px, nz - pz);
  if (dist < 1e-5) return { x: nx, z: nz, blocked: false };
  const steps = Math.max(2, Math.ceil(dist / 0.32));
  let x = px;
  let z = pz;
  let hPrev = heightAt(px, pz);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cx = px + (nx - px) * t;
    const cz = pz + (nz - pz) * t;
    const h = heightAt(cx, cz);
    const ds = dist / steps;
    const slope = (h - hPrev) / ds;
    if (slope > 1.2 || h - hPrev > 0.58) return { x, z, blocked: true };
    x = cx;
    z = cz;
    hPrev = h;
  }
  return { x: nx, z: nz, blocked: false };
}

export function snapToGround(cam, dt) {
  if (!cam) return;
  const p = new THREE.Vector3();
  cam.getWorldPosition(p);
  const rig = cam.parent;
  if (LAST_FEET.ok) {
    const c = clampWalk(LAST_FEET.x, LAST_FEET.z, p.x, p.z);
    if (c.blocked && rig && rig !== cam) {
      rig.position.x += c.x - p.x;
      rig.position.z += c.z - p.z;
      p.x = c.x;
      p.z = c.z;
    }
  }
  LAST_FEET.x = p.x;
  LAST_FEET.z = p.z;
  LAST_FEET.ok = true;
  const gy = heightAt(p.x, p.z);
  const eye = 1.55;
  const dy = gy - (p.y - eye);
  if (!rig || rig === cam) {
    if (dy > 0.01) cam.position.y += dy;
    else cam.position.y += dy * Math.min(1, dt * 12);
    return;
  }
  if (dy > 0.01) rig.position.y += dy;
  else if (dy < -0.02) rig.position.y += dy * Math.min(1, dt * 12);
}
