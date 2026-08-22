/**
 * Fenrest realm expansion: towns, physics loot, stairs, encounters,
 * thunderbolt, VR portals to New Eden.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";
import { fenrestToBag, loadBag, mergeBagIntoList } from "/games/shared/realm-bag.js";

const TOWNS = [
  { id: "fenrest", name: "Fenrest", x: 0, z: 0, r: 42, style: "thatch", econ: "farms", skip: true },
  { id: "watchford", name: "Watchford", x: 8, z: -118, r: 28, style: "brick", econ: "military" },
  { id: "merehaven", name: "Merehaven", x: -108, z: -64, r: 26, style: "dock", econ: "caravan" },
  { id: "cinderforge", name: "Cinderforge", x: 112, z: -72, r: 28, style: "factory", econ: "factories" },
  { id: "goldmarket", name: "Goldmarket", x: -126, z: 18, r: 30, style: "market", econ: "square" },
  { id: "millreach", name: "Millreach", x: -88, z: 108, r: 26, style: "timber", econ: "factories" },
  { id: "harvestcrown", name: "Harvestcrown", x: 22, z: 128, r: 30, style: "farm", econ: "farms" },
  { id: "barracksend", name: "Barracks End", x: 118, z: 92, r: 26, style: "fort", econ: "military" },
  { id: "spireglass", name: "Spireglass", x: 132, z: 8, r: 26, style: "spire", econ: "district" },
];

const PAL = {
  thatch: { wall: 0xc4b48a, roof: 0x6a4a28, trim: 0x3a2a18, ground: 0x5a6a3a },
  brick: { wall: 0x8a4a3a, roof: 0x3a2a28, trim: 0x2a1a14, ground: 0x5a5048 },
  dock: { wall: 0x8a7a5a, roof: 0x3a4a5a, trim: 0x2a2018, ground: 0x4a5a52 },
  factory: { wall: 0x6a6460, roof: 0x2a2824, trim: 0x1a1814, ground: 0x4a4440 },
  market: { wall: 0xd4c4a0, roof: 0xb44a3a, trim: 0x5a3a22, ground: 0xc4b48a },
  timber: { wall: 0x8a5a32, roof: 0x4a3020, trim: 0x2a1810, ground: 0x5a4a32 },
  farm: { wall: 0xd8c8a4, roof: 0x7a9a4a, trim: 0x4a3a22, ground: 0x6a8a42 },
  fort: { wall: 0x5a5854, roof: 0x2a2a28, trim: 0x1a1a18, ground: 0x4a4844 },
  spire: { wall: 0xc8d0d8, roof: 0x4a3a6a, trim: 0x2a2040, ground: 0x8a8a9a },
};

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

function heightAt(x, z) {
  const n = Math.hypot(x, z);
  const r = Math.max(0, 1 - n / 36);
  const n2 = Math.sin(x * 0.028) * Math.cos(z * 0.031) * 0.55;
  let a = Math.max(0, n2 + 0.15) * 4.4 * (1 - r * 0.92);
  if (n > 70) a += (n - 70) * 0.08;
  return a;
}

function inTown(x, z) {
  for (const t of TOWNS) {
    if (Math.hypot(x - t.x, z - t.z) < t.r) return t;
  }
  return null;
}

function tex(draw, w = 64, h = 64, wrap = 4) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
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
  oak: tex((g, w, h) => {
    for (let y = 0; y < h; y++) {
      g.fillStyle = `rgb(${110 + (y % 7) * 6},${72 + (y % 5) * 4},${36})`;
      g.fillRect(0, y, w, 1);
    }
    g.fillStyle = "#5a3818";
    for (let x = 4; x < w; x += 11) g.fillRect(x, 0, 1, h);
  }, 32, 32, 2),
  linen: tex((g, w, h) => {
    g.fillStyle = "#d8c8a8";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = i % 2 ? "#c8b898" : "#e8d8b8";
      g.fillRect((i * 13) % w, (i * 7) % h, 3, 2);
    }
  }, 32, 32, 2),
  iron: tex((g, w, h) => {
    g.fillStyle = "#6a6e74";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#8a9098";
    for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1);
    g.fillStyle = "#4a4e54";
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 1, h);
  }, 32, 32, 3),
  brick: tex((g, w, h) => {
    g.fillStyle = "#5a3028";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      const o = (y / 8) % 2 ? 4 : 0;
      for (let x = -8; x < w; x += 16) {
        g.fillStyle = `rgb(${140 + (x % 5) * 4},${70 + (y % 3) * 4},${50})`;
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
  dirt: tex((g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = 90 + ((x * 13 + y * 7) % 28);
        g.fillStyle = `rgb(${n},${n - 22},${n - 40})`;
        g.fillRect(x, y, 1, 1);
      }
  }, 32, 32, 8),
};

function spriteCanvas(kind) {
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 96;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 48, 96);
  const blade = (col, guard) => {
    g.fillStyle = col;
    g.fillRect(22, 6, 6, 52);
    g.fillStyle = "#e8e8f0";
    g.fillRect(23, 8, 2, 46);
    g.fillStyle = guard;
    g.fillRect(16, 56, 16, 4);
    g.fillStyle = "#5a3a20";
    g.fillRect(21, 60, 6, 22);
    g.fillStyle = "#c4a050";
    g.fillRect(20, 80, 8, 6);
  };
  if (kind.startsWith("sword")) blade(kind.includes("steel") ? "#c8d0d8" : kind.includes("iron") ? "#9aa0a8" : "#c47a3a", "#c4a050");
  else if (kind.startsWith("shield")) {
    g.fillStyle = "#8a5a28";
    g.beginPath();
    g.ellipse(24, 48, 16, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#d4b070";
    g.beginPath();
    g.ellipse(24, 48, 8, 10, 0, 0, Math.PI * 2);
    g.fill();
  } else if (kind.startsWith("bow")) {
    g.strokeStyle = "#6a3a18";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(18, 48, 28, -1.1, 1.1);
    g.stroke();
    g.strokeStyle = "#ddd";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(22, 22);
    g.lineTo(22, 74);
    g.stroke();
  } else if (kind.startsWith("axe")) {
    g.fillStyle = "#5a3a18";
    g.fillRect(22, 18, 5, 62);
    g.fillStyle = "#b8c0c8";
    g.beginPath();
    g.moveTo(26, 18);
    g.lineTo(42, 32);
    g.lineTo(26, 40);
    g.fill();
  } else if (kind.startsWith("spell")) {
    g.fillStyle = "#3a2458";
    g.fillRect(12, 20, 24, 56);
    g.fillStyle = "#e8d48a";
    g.fillRect(14, 24, 20, 8);
    g.fillStyle = kind.includes("thunder") ? "#c8e8ff" : "#ffd070";
    g.fillRect(20, 40, 8, 20);
  } else {
    g.fillStyle = "#6a4a28";
    g.fillRect(20, 10, 8, 70);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SPRITE = {};
function spr(kind) {
  if (!SPRITE[kind]) SPRITE[kind] = spriteCanvas(kind);
  return SPRITE[kind];
}

function box(mat, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

export function buildStraightStairs(parent, x, y, z, yaw, steps = 10, w = 1.6, rise = 0.22, run = 0.34, mat) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const m = mat || new THREE.MeshBasicMaterial({ map: TEX.oak, color: 0xddccaa });
  for (let i = 0; i < steps; i++) {
    g.add(box(m, 0, rise * i + rise / 2, -run * i, w, rise, run + 0.02));
  }
  g.userData.kind = "stairs-straight";
  parent.add(g);
  return g;
}

export function buildSpiralStairs(parent, x, y, z, steps = 16, r = 1.15, rise = 0.24, mat) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const m = mat || new THREE.MeshBasicMaterial({ map: TEX.oak, color: 0xddccaa });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, steps * rise + 0.2, 8), new THREE.MeshBasicMaterial({ map: TEX.iron }));
  post.position.y = (steps * rise) / 2;
  g.add(post);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const t = box(m, Math.cos(a) * r * 0.55, rise * i + rise / 2, Math.sin(a) * r * 0.55, 0.85, rise, 0.42);
    t.rotation.y = -a;
    g.add(t);
  }
  g.userData.kind = "stairs-spiral";
  parent.add(g);
  return g;
}

export function buildLadder(parent, x, y, z, yaw, h = 4.2, mat) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const m = mat || new THREE.MeshBasicMaterial({ map: TEX.oak });
  g.add(box(m, -0.22, h / 2, 0, 0.06, h, 0.06));
  g.add(box(m, 0.22, h / 2, 0, 0.06, h, 0.06));
  const n = Math.max(4, Math.floor(h / 0.32));
  for (let i = 0; i < n; i++) g.add(box(m, 0, 0.2 + i * (h / n), 0, 0.5, 0.05, 0.05));
  g.userData.kind = "ladder";
  parent.add(g);
  return g;
}

function furniture(parent, x, y, z, kind) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (kind === "table") {
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), 0, 0.78, 0, 1.5, 0.08, 0.9));
    for (const s of [-1, 1])
      for (const t of [-1, 1]) g.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), s * 0.62, 0.38, t * 0.34, 0.08, 0.76, 0.08));
  } else if (kind === "bed") {
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), 0, 0.22, 0, 1.1, 0.16, 2.1));
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.linen }), 0, 0.38, 0, 1.0, 0.14, 1.9));
  } else if (kind === "bench") {
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), 0, 0.42, 0, 1.4, 0.08, 0.4));
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), -0.6, 0.2, 0, 0.08, 0.4, 0.4));
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), 0.6, 0.2, 0, 0.08, 0.4, 0.4));
  } else if (kind === "anvil") {
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.iron }), 0, 0.42, 0, 0.7, 0.28, 0.32));
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.iron }), 0, 0.16, 0, 0.35, 0.32, 0.28));
  } else if (kind === "crate") {
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), 0, 0.28, 0, 0.55, 0.55, 0.55));
  } else if (kind === "banner") {
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), 0, 1.2, 0, 0.08, 2.4, 0.08));
    g.add(box(new THREE.MeshBasicMaterial({ map: TEX.linen, color: 0xaa3333 }), 0.28, 1.7, 0, 0.5, 0.8, 0.04));
  }
  parent.add(g);
  return g;
}

function building(parent, x, z, pal, w, d, stories, roofKind) {
  const y0 = heightAt(x, z);
  const wall = new THREE.MeshBasicMaterial({ map: pal === PAL.brick ? TEX.brick : pal === PAL.fort ? TEX.iron : TEX.oak, color: pal.wall });
  const roofM = new THREE.MeshBasicMaterial({ map: TEX.thatch, color: pal.roof });
  const h = 2.6 * stories;
  parent.add(box(wall, x, y0 + h / 2, z, w, h, d));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 1.4 + stories * 0.2, roofKind === "spire" ? 8 : 4), roofM);
  roof.position.set(x, y0 + h + 0.7, z);
  if (roofKind !== "spire") roof.rotation.y = Math.PI / 4;
  parent.add(roof);
}

function stall(parent, x, z, pal) {
  const y0 = heightAt(x, z);
  const cloth = new THREE.MeshBasicMaterial({ map: TEX.linen, color: pal.roof });
  parent.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), x, y0 + 0.05, z, 2.2, 0.1, 1.6));
  parent.add(box(cloth, x, y0 + 1.55, z, 2.3, 0.08, 1.7));
  parent.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), x - 1.0, y0 + 0.8, z, 0.08, 1.5, 0.08));
  parent.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), x + 1.0, y0 + 0.8, z, 0.08, 1.5, 0.08));
}

function road(parent, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, len), new THREE.MeshBasicMaterial({ map: TEX.dirt, color: 0x8a6a48 }));
  const y = Math.min(heightAt(a.x, a.z), heightAt(b.x, b.z)) + 0.04;
  m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
  m.rotation.y = Math.atan2(dx, dz);
  parent.add(m);
}

function signpost(parent, x, z, label) {
  const y0 = heightAt(x, z);
  parent.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), x, y0 + 1.1, z, 0.1, 2.2, 0.1));
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#5a3a18";
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#f0e2c4";
  g.font = "bold 28px serif";
  g.textAlign = "center";
  g.fillText(label, 128, 42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
  pl.position.set(x, y0 + 2.05, z);
  parent.add(pl);
  return pl;
}

function buildTown(root, town) {
  if (town.skip) return;
  const pal = PAL[town.style] || PAL.thatch;
  const g = new THREE.Group();
  g.name = "town-" + town.id;
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(town.r * 0.42, 24), new THREE.MeshBasicMaterial({ map: TEX.dirt, color: pal.ground }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(town.x, heightAt(town.x, town.z) + 0.04, town.z);
  g.add(plaza);
  const layout = [
    [8, 4, 6, 5, 2],
    [-7, 5, 5.5, 5, 1],
    [6, -7, 5, 6, 2],
    [-6, -6, 6, 5, 1],
    [0, 10, 7, 5, town.econ === "military" ? 3 : 1],
  ];
  layout.forEach((L, i) => {
    building(g, town.x + L[0], town.z + L[1], pal, L[2], L[3], L[4], town.style === "spire" && i === 0 ? "spire" : "hip");
  });
  if (town.econ === "square" || town.econ === "district" || town.econ === "caravan") {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      stall(g, town.x + Math.cos(a) * 7.5, town.z + Math.sin(a) * 7.5, pal);
    }
  }
  if (town.econ === "farms") {
    for (let i = 0; i < 8; i++) {
      const fx = town.x + ((i % 4) - 1.5) * 5;
      const fz = town.z + 14 + Math.floor(i / 4) * 5;
      g.add(box(new THREE.MeshBasicMaterial({ color: 0x6a8a3a }), fx, heightAt(fx, fz) + 0.2, fz, 4.2, 0.4, 4.2));
    }
  }
  if (town.econ === "factories") {
    for (let i = 0; i < 3; i++) {
      const fx = town.x + i * 6 - 6;
      const fz = town.z + 12;
      g.add(box(new THREE.MeshBasicMaterial({ map: TEX.iron, color: pal.wall }), fx, heightAt(fx, fz) + 2.2, fz, 5, 4.4, 4));
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 5, 8), new THREE.MeshBasicMaterial({ map: TEX.brick }));
      stack.position.set(fx + 1.6, heightAt(fx, fz) + 6.4, fz);
      g.add(stack);
    }
  }
  if (town.econ === "military") {
    const wallM = new THREE.MeshBasicMaterial({ map: TEX.brick, color: pal.wall });
    for (const [dx, dz, w, d] of [
      [0, -12, 22, 1.4],
      [0, 12, 22, 1.4],
      [-11, 0, 1.4, 24],
      [11, 0, 1.4, 24],
    ]) {
      g.add(box(wallM, town.x + dx, heightAt(town.x, town.z) + 2.2, town.z + dz, w, 4.4, d));
    }
    buildStraightStairs(g, town.x + 8, heightAt(town.x, town.z), town.z + 10, 0, 12, 1.4, 0.2, 0.32);
    buildLadder(g, town.x - 9.2, heightAt(town.x, town.z), town.z, Math.PI / 2, 4.6);
  }
  if (town.style === "spire") {
    buildSpiralStairs(g, town.x, heightAt(town.x, town.z), town.z, 18, 1.2, 0.26);
  }
  if (town.style === "dock") {
    for (let i = 0; i < 5; i++) {
      g.add(box(new THREE.MeshBasicMaterial({ map: TEX.oak }), town.x - 14, heightAt(town.x, town.z) + 0.2, town.z - 6 + i * 3.2, 8, 0.2, 2.4));
    }
  }
  furniture(g, town.x + 2, heightAt(town.x, town.z), town.z + 1.4, "table");
  furniture(g, town.x + 2, heightAt(town.x, town.z), town.z + 2.4, "bench");
  signpost(g, town.x, town.z + town.r * 0.5, town.name.toUpperCase());
  root.add(g);
}

function makeLoot(defId, x, y, z) {
  const map = spr(defId);
  const mat = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(0.55, 1.1, 1);
  sp.position.set(x, y, z);
  sp.userData = {
    loot: true,
    defId,
    vx: (Math.random() - 0.5) * 1.4,
    vy: 1.2 + Math.random() * 1.6,
    vz: (Math.random() - 0.5) * 1.4,
    av: (Math.random() - 0.5) * 4,
    grounded: false,
  };
  return sp;
}

function tickLoot(items, dt, store) {
  const cam = window.__FENREST_CAM__;
  let px = 0;
  let pz = 0;
  if (cam) {
    cam.getWorldPosition(tmp);
    px = tmp.x;
    pz = tmp.z;
  }
  for (const it of items) {
    if (!it.visible) continue;
    const u = it.userData;
    if (!u.grounded) {
      u.vy -= 18 * dt;
      it.position.x += u.vx * dt;
      it.position.y += u.vy * dt;
      it.position.z += u.vz * dt;
      it.material.rotation += u.av * dt;
      const gy = heightAt(it.position.x, it.position.z) + 0.45;
      if (it.position.y <= gy) {
        it.position.y = gy;
        if (u.vy < -1) {
          u.vy *= -0.32;
          u.vx *= 0.6;
          u.vz *= 0.6;
        } else {
          u.grounded = true;
          u.vx = u.vz = u.vy = 0;
        }
      }
    }
    const d = Math.hypot(it.position.x - px, it.position.z - pz);
    if (d < 1.45 && store) {
      const ok = store.getState().addItem(u.defId, 1);
      if (ok !== false) {
        it.visible = false;
        store.getState().setHud({ prompt: "Took " + u.defId.replace("-", " ") });
      }
    }
  }
}

const ENEMY_KIND = [
  { id: "wolf", hp: 3, spd: 4.2, dmg: 0.06, sprite: "wolf.png", pack: [3, 5], rare: 0 },
  { id: "bandit", hp: 4, spd: 3.2, dmg: 0.07, sprite: "bandit.png", pack: [3, 4], rare: 0 },
  { id: "goblin", hp: 2, spd: 3.8, dmg: 0.05, sprite: "lizard.png", pack: [4, 6], rare: 0.15 },
  { id: "mage", hp: 5, spd: 2.4, dmg: 0.1, sprite: "human.png", pack: [1, 2], rare: 0.35, spell: "spark" },
  { id: "necromancer", hp: 7, spd: 2.1, dmg: 0.12, sprite: "innkeeper.png", pack: [1, 1], rare: 0.55, spell: "bolt" },
  { id: "spider", hp: 6, spd: 3.6, dmg: 0.09, sprite: "target.png", pack: [2, 4], rare: 0.3 },
  { id: "basilisk", hp: 10, spd: 2.6, dmg: 0.14, sprite: "lizard.png", pack: [1, 2], rare: 0.5 },
  { id: "alien", hp: 16, spd: 3.4, dmg: 0.18, sprite: "dragon.png", pack: [1, 1], rare: 0.82 },
];

function loadSpr(file) {
  const t = new THREE.TextureLoader().load("/games/fenrest/sprites/" + file);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const SPR_CACHE = {};
function enemySprite(file) {
  SPR_CACHE[file] ||= loadSpr(file);
  return SPR_CACHE[file];
}

function spawnPack(root, list, px, pz) {
  const pool = ENEMY_KIND.filter((k) => Math.random() > k.rare);
  const def = pool[Math.floor(Math.random() * pool.length)] || ENEMY_KIND[0];
  const n = def.pack[0] + Math.floor(Math.random() * (def.pack[1] - def.pack[0] + 1));
  const ang0 = Math.random() * 6.28;
  const dist = 14 + Math.random() * 10;
  for (let i = 0; i < n; i++) {
    const a = ang0 + i * 0.7;
    const x = px + Math.cos(a) * dist;
    const z = pz + Math.sin(a) * dist;
    if (inTown(x, z)) continue;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: enemySprite(def.sprite), transparent: true }));
    sp.scale.set(def.id === "spider" ? 1.6 : def.id === "basilisk" ? 2.2 : def.id === "alien" ? 2.4 : 1.2, def.id === "spider" ? 1.1 : 2.1, 1);
    sp.position.set(x, heightAt(x, z) + sp.scale.y * 0.45, z);
    sp.userData = { foe: true, def, hp: def.hp, cool: 0 };
    root.add(sp);
    list.push(sp);
  }
}

function tickFoes(list, dt, store, bolts, root) {
  const cam = window.__FENREST_CAM__;
  if (!cam) return;
  cam.getWorldPosition(tmp);
  const px = tmp.x;
  const py = tmp.y;
  const pz = tmp.z;
  for (const f of list) {
    if (!f.visible) continue;
    const u = f.userData;
    const dx = px - f.position.x;
    const dz = pz - f.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const spd = u.def.spd;
    f.position.x += (dx / d) * spd * dt;
    f.position.z += (dz / d) * spd * dt;
    f.position.y = heightAt(f.position.x, f.position.z) + f.scale.y * 0.45;
    u.cool -= dt;
    if (d < 1.6 && u.cool <= 0) {
      u.cool = u.def.spell ? 1.6 : 0.9;
      const st = store.getState();
      store.getState().setHud({ hp: Math.max(0, (st.hp ?? 1) - u.def.dmg) });
      if (u.def.spell) {
        const bolt = lightning(f.position.clone(), tmp.clone());
        root.add(bolt);
        bolts.push(bolt);
      }
    }
    for (const b of bolts) {
      if (b.userData.life > 0 && f.position.distanceTo(b.userData.hit) < 2.4) {
        u.hp -= 4;
      }
    }
    if (u.hp <= 0) {
      f.visible = false;
    }
  }
}

function lightning(from, to) {
  const g = new THREE.BufferGeometry();
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(from.x + (to.x - from.x) * t + (Math.random() - 0.5) * 0.7, from.y + (to.y - from.y) * t + (i > 0 && i < n ? (Math.random() - 0.5) * 1.4 : 0), from.z + (to.z - from.z) * t + (Math.random() - 0.5) * 0.7);
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xc8e8ff, transparent: true, opacity: 0.95 }));
  line.userData = { life: 0.28, hit: to.clone() };
  return line;
}

function hasThunder(store) {
  const s = store.getState();
  const inv = s.inventory || [];
  const eq = s.equip || {};
  const main = inv.find((i) => i.uid === eq.main);
  return main?.defId === "spell-thunderbolt";
}

function vrTriggerDown(gl) {
  const s = gl.xr.getSession && gl.xr.getSession();
  if (!s) return false;
  for (const src of s.inputSources) {
    if (src.handedness === "right" && src.gamepad?.buttons?.[0]?.pressed) return true;
  }
  return false;
}

function swirlTex() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { canvas: c, ctx: g, tex: t };
}

function paintSwirl(sw, time) {
  const g = sw.ctx;
  const w = 256;
  g.clearRect(0, 0, w, w);
  g.translate(128, 128);
  for (let i = 0; i < 18; i++) {
    g.rotate(0.35);
    g.strokeStyle = `hsla(${200 + i * 8 + time * 40}, 70%, ${50 + (i % 5) * 6}%, 0.7)`;
    g.lineWidth = 6;
    g.beginPath();
    g.arc(0, 0, 20 + i * 5.5, time + i, time + i + 1.4);
    g.stroke();
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  sw.tex.needsUpdate = true;
}

function makeMirrorPortal() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 8, 24), new THREE.MeshBasicMaterial({ color: 0xd4b070 }));
  const sw = swirlTex();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.08, 24), new THREE.MeshBasicMaterial({ map: sw.tex, transparent: true, side: THREE.DoubleSide }));
  g.add(frame, disc);
  g.userData.sw = sw;
  g.userData.portal = "neweden";
  return g;
}

function makeMcPortal() {
  const g = new THREE.Group();
  const obs = new THREE.MeshBasicMaterial({ color: 0x1a1218 });
  const inner = new THREE.MeshBasicMaterial({ color: 0x6a20a8, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
  const w = 2.2;
  const h = 3.2;
  g.add(box(obs, 0, h / 2, -0.12, 0.32, h, 0.32));
  g.add(box(obs, 0, h / 2, 0.12, 0.32, h, 0.32).translateX(0));
  const left = box(obs, -w / 2, h / 2, 0, 0.32, h, 0.32);
  const right = box(obs, w / 2, h / 2, 0, 0.32, h, 0.32);
  const top = box(obs, 0, h, 0, w + 0.32, 0.32, 0.32);
  const bot = box(obs, 0, 0.16, 0, w + 0.32, 0.32, 0.32);
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.3), inner);
  veil.position.y = h / 2;
  g.add(left, right, top, bot, veil);
  g.userData.portal = "fenrest";
  g.userData.veil = veil;
  return g;
}

function goPortal(to) {
  const st = window.__FENREST__?.store?.getState?.();
  if (st) fenrestToBag(st.inventory, st.gold);
  sessionStorage.setItem("fm-realm-warp", JSON.stringify({ from: "fenrest", at: Date.now() }));
  window.location.href = to === "neweden" ? "/neweden?portal=1" : "/fenrest?portal=1";
}

async function boot() {
  let tries = 0;
  while ((!window.__FENREST_SCENE__ || !window.__FENREST__) && tries < 80) {
    await new Promise((r) => setTimeout(r, 200));
    tries++;
  }
  const scene = window.__FENREST_SCENE__;
  const store = window.__FENREST__?.store;
  const gl = window.__FENREST_GL__;
  if (!scene) return;
  const root = new THREE.Group();
  root.name = "fenrest-realm";
  scene.add(root);

  if (store) {
    const bag = loadBag();
    const merged = mergeBagIntoList(store.getState().inventory, bag);
    if (merged.length !== store.getState().inventory.length) {
      store.setState({ inventory: merged });
    }
    if (!store.getState().inventory.some((i) => i.defId === "spell-thunderbolt")) {
      store.getState().addItem?.("spell-thunderbolt", 1);
    }
  }

  TOWNS.forEach((t) => buildTown(root, t));
  const hub = TOWNS[0];
  for (let i = 1; i < TOWNS.length; i++) road(root, hub, TOWNS[i]);
  road(root, TOWNS[1], TOWNS[2]);
  road(root, TOWNS[1], TOWNS[3]);
  road(root, TOWNS[4], TOWNS[5]);
  road(root, TOWNS[6], TOWNS[7]);
  road(root, TOWNS[7], TOWNS[8]);
  road(root, TOWNS[8], TOWNS[3]);

  const smithX = 16.2;
  const smithZ = -3.6;
  const smithY = heightAt(smithX, smithZ);
  furniture(root, smithX - 1.2, smithY, smithZ, "anvil");
  furniture(root, smithX + 1.6, smithY, smithZ - 1.2, "table");
  furniture(root, smithX + 1.6, smithY, smithZ - 0.2, "crate");
  furniture(root, 2.2, heightAt(1.6, -17.4), -16.2, "bed");
  furniture(root, 0.4, heightAt(1.6, -17.4), -16.8, "table");
  furniture(root, 0.4, heightAt(1.6, -17.4), -15.8, "bench");
  buildStraightStairs(root, 1.6, heightAt(1.6, -17.4), -19.4, Math.PI, 8, 1.3, 0.24, 0.32);
  buildLadder(root, -0.6, heightAt(0, -62), -50.5, 0, 8.4);
  buildSpiralStairs(root, 0, heightAt(0, -62) + 0.2, -66.2, 20, 1.35, 0.28);
  signpost(root, 14.4, 1.2, "SMITH — TAKE STEEL");

  const loot = [];
  const dropIds = ["sword-copper", "sword-iron", "sword-steel", "shield-wood", "bow-wood", "axe-stone", "spear-bone", "helm-iron", "spell-thunderbolt"];
  dropIds.forEach((id, i) => {
    const a = i * 0.7;
    const sp = makeLoot(id, smithX + Math.cos(a) * 1.8, smithY + 1.1, smithZ + Math.sin(a) * 1.6);
    root.add(sp);
    loot.push(sp);
  });
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * 6.28;
    const r = 4 + Math.random() * 6;
    const sp = makeLoot(dropIds[i % dropIds.length], smithX + Math.cos(a) * r, smithY + 0.9, smithZ + Math.sin(a) * r);
    root.add(sp);
    loot.push(sp);
  }

  const foes = [];
  const bolts = [];
  let encounterIn = 80 + Math.random() * 100;
  let trigPrev = false;
  const portalGroup = new THREE.Group();
  portalGroup.visible = false;
  const mirrors = [makeMirrorPortal(), makeMirrorPortal()];
  mirrors[0].position.set(6, heightAt(6, 8) + 1.4, 8);
  mirrors[1].position.set(-18, heightAt(-18, -8) + 1.4, -8);
  mirrors.forEach((p) => portalGroup.add(p));
  root.add(portalGroup);

  let last = performance.now();
  let warping = false;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const cam = window.__FENREST_CAM__;
    const st = store?.getState?.();
    const vr = !!(st?.vr || gl?.xr?.isPresenting);
    if (cam) {
      cam.getWorldPosition(tmp);
      tickLoot(loot, dt, store);
      tickFoes(foes, dt, store, bolts, root);
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.userData.life -= dt;
        if (b.userData.life <= 0) {
          root.remove(b);
          bolts.splice(i, 1);
        }
      }
      encounterIn -= dt;
      if (encounterIn <= 0) {
        encounterIn = 90 + Math.random() * 120;
        if (!inTown(tmp.x, tmp.z) && Math.random() < 0.38) {
          spawnPack(root, foes, tmp.x, tmp.z);
          store?.getState?.().setHud?.({ prompt: "Something moves in the grass." });
        }
      }
      const trig = vr && gl ? vrTriggerDown(gl) : false;
      if (vr && trig && !trigPrev && hasThunder(store) && (st.mp ?? 1) > 0.12) {
        cam.getWorldDirection(tmp2);
        const hit = tmp.clone().add(tmp2.multiplyScalar(14));
        hit.y = heightAt(hit.x, hit.z) + 0.4;
        const from = tmp.clone();
        from.y += 9;
        const bolt = lightning(from, hit);
        root.add(bolt);
        bolts.push(bolt);
        store.getState().setHud({ mp: Math.max(0, (st.mp ?? 1) - 0.18) });
        foes.forEach((f) => {
          if (f.visible && f.position.distanceTo(hit) < 3.2) f.userData.hp -= 6;
        });
      }
      trigPrev = trig;
      portalGroup.visible = vr;
      if (vr) {
        portalGroup.children.forEach((p) => {
          if (p.userData.sw) {
            paintSwirl(p.userData.sw, now * 0.001);
            p.lookAt(tmp.x, p.position.y, tmp.z);
          }
          if (!warping && p.position.distanceTo(tmp) < 1.55) {
            warping = true;
            goPortal("neweden");
          }
        });
      }
      root.traverse((o) => {
        if (o.userData?.kind === "sign" || (o.isMesh && o.material?.map && o.geometry?.type === "PlaneGeometry" && Math.abs((o.geometry.parameters?.width || 0) - 1.6) < 0.01)) {
          o.lookAt(tmp.x, o.position.y, tmp.z);
        }
      });
    }
    if (store && now % 4000 < 40) {
      const s = store.getState();
      fenrestToBag(s.inventory, s.gold);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot();
