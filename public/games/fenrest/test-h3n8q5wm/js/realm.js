/**
 * Fenrest realm expansion: towns, physics loot, stairs, encounters,
 * thunderbolt, VR portals to New Eden.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";
import { fenrestToBag, loadBag, mergeBagIntoList } from "/games/shared/realm-bag.js";
import { createVoicePair } from "/games/shared/voice-coop.js";
import { hatHex, mountChip, paintChip, peerId, rememberPeer } from "/games/shared/coop-hat.js";
import { anyHitsPortal, bindXrTick, gripPoints, portalHit, readHead, warpAfterXr } from "/games/shared/vr-warp.js";
import { attachVrHands, restoreFlash, tickDeath, startDeath } from "/games/fenrest/test-h3n8q5wm/js/vr-hands.js?v=town1";
import { heightAt as gridHeight, inSettlement, createChunkManager, snapToGround, keepAboveGround } from "/games/fenrest/test-h3n8q5wm/js/world-grid.js?v=town1";
import { createMagic } from "/games/fenrest/test-h3n8q5wm/js/magic.js?v=town1";
import { installLife } from "/games/fenrest/test-h3n8q5wm/js/life.js?v=town1";

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
  return gridHeight(x, z);
}

function inTown(x, z) {
  return inSettlement(x, z);
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
  } else if (kind.startsWith("pickaxe")) {
    g.fillStyle = "#5a3a18";
    g.fillRect(22, 16, 5, 66);
    g.fillStyle = "#8a9098";
    g.fillRect(12, 16, 24, 6);
    g.fillRect(10, 10, 6, 18);
    g.fillRect(32, 10, 6, 18);
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

function tickLoot(items, dt, store, opts = {}) {
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
      if (it.material && "rotation" in it.material) it.material.rotation += u.av * dt;
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
    if (!opts.vr && d < 1.45 && store) {
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

const SHEET4 = /^(wolf|dragon|bandit|human|woman|guard|innkeeper|lizard|lizardfolk)\.png$/i;

function loadSpr(file) {
  const t = new THREE.TextureLoader().load("/games/fenrest/sprites/" + file, (tex) => {
    if (SHEET4.test(file)) {
      tex.repeat.set(0.25, 0.25);
      tex.offset.set(0, 0.75);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
    }
  });
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  if (SHEET4.test(file)) {
    t.repeat.set(0.25, 0.25);
    t.offset.set(0, 0.75);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  }
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
    const map = enemySprite(def.sprite);
    const sheet = SHEET4.test(def.sprite);
    const matMap = sheet && map.clone ? map.clone() : map;
    if (sheet) {
      matMap.repeat.set(0.25, 0.25);
      matMap.offset.set(0, 0.75);
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: matMap, transparent: true, color: 0xffffff }));
    sp.scale.set(def.id === "spider" ? 1.6 : def.id === "basilisk" ? 2.2 : def.id === "alien" ? 2.4 : 1.2, def.id === "spider" ? 1.1 : 2.1, 1);
    sp.position.set(x, heightAt(x, z) + sp.scale.y * 0.5, z);
    const humanoid = ["bandit", "goblin", "mage", "necromancer"].includes(def.id);
    sp.userData = {
      foe: true,
      kind: def.id,
      def,
      hp: def.hp,
      maxHp: def.hp,
      cool: 0,
      stamina: 1,
      lower: 1,
      humanoid,
      sheet,
      flash: 0,
      stagger: 0,
      vy: 0,
      baseH: sp.scale.y,
      baseW: sp.scale.x,
      _baseColor: 0xffffff,
      hitR: Math.max(1.3, sp.scale.x * 0.7),
      hitH: Math.max(1.4, sp.scale.y * 0.8),
    };
    root.add(sp);
    list.push(sp);
    if (window.__FENREST_HITABLES__ && !window.__FENREST_HITABLES__.includes(sp)) window.__FENREST_HITABLES__.push(sp);
  }
}

function standY(f) {
  const gy = heightAt(f.position.x, f.position.z);
  if (f.userData?.feet || (f.center && f.center.y < 0.2)) return gy;
  return gy + (f.scale?.y || 2) * 0.45;
}

function tickFoes(list, dt, store, bolts, root) {
  const cam = window.__FENREST_CAM__;
  const hd = window.__FENREST_HEAD__;
  if (hd && Number.isFinite(hd.x)) {
    tmp.set(hd.x, hd.y, hd.z);
  } else if (cam) {
    cam.getWorldPosition(tmp);
  } else return;
  const px = tmp.x;
  const py = tmp.y;
  const pz = tmp.z;
  for (const f of list) {
    try {
      if (!f.visible) continue;
      const u = f.userData || {};
      if (u.lifeBeast || u.kind === "turtle" || u.kind === "trex" || u.kind === "raptor" || u.kind === "mammoth") continue;
      const dx = px - f.position.x;
      const dz = pz - f.position.z;
      const d = Math.hypot(dx, dz) || 1;
      u.hitCool = Math.max(0, (u.hitCool || 0) - dt);
      if (u.hp <= 0 && !u.dying && !u.dead) startDeath(f);
      if (u.dying) {
        tickDeath(f, dt, heightAt);
        continue;
      }
      restoreFlash(f, dt);
      if (u.frozen > 0) {
        u.frozen -= dt;
        keepAboveGround(f, dt, u.feet ? 0 : (u.baseH || f.scale.y) * 0.48, 18);
        continue;
      }
      if (u.stagger > 0) {
        u.stagger -= dt;
        f.position.x += (u.kx || 0) * dt;
        f.position.z += (u.kz || 0) * dt;
        u.kx = (u.kx || 0) * (1 - dt * 3);
        u.kz = (u.kz || 0) * (1 - dt * 3);
        keepAboveGround(f, dt, u.feet ? 0 : (u.baseH || f.scale.y) * 0.48, 18);
        continue;
      }
      const spd = (u.def?.spd ?? 2) * (u.lower ?? 1);
      f.position.x += (dx / d) * spd * dt;
      f.position.z += (dz / d) * spd * dt;
      keepAboveGround(f, dt, u.feet ? 0 : (u.baseH || f.scale.y) * 0.48, 18);
      u.cool = (u.cool || 0) - dt;
      if (d < 1.6 && u.cool <= 0) {
        u.cool = u.def?.spell ? 1.6 : 0.9;
        const st = store?.getState?.();
        if (st) store.getState().setHud({ hp: Math.max(0, (st.hp ?? 1) - (u.def?.dmg ?? 0.06)) });
        if (u.def?.spell) {
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
      if (u.hp <= 0 && !u.dying && !u.dead) startDeath(f);
    } catch (err) {
      console.warn("[fenrest-foe]", err);
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

function goPortal(to, gl) {
  const st = window.__FENREST__?.store?.getState?.();
  if (st) fenrestToBag(st.inventory, st.gold);
  sessionStorage.setItem("fm-realm-warp", JSON.stringify({ from: "fenrest", at: Date.now() }));
  const url = to === "neweden" ? "/neweden?portal=1&map=1" : "/fenrest?portal=1&map=1";
  warpAfterXr(gl || window.__FENREST_GL__, url);
}

function makePeerPuppet(slot, name) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.9, 4, 8),
    new THREE.MeshBasicMaterial({ color: 0x6b5344 }),
  );
  body.position.y = 1.05;
  const hex = hatHex(slot, slot === 1 ? "green" : "red");
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.045, 12),
    new THREE.MeshBasicMaterial({ color: hex }),
  );
  brim.position.y = 1.7;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshBasicMaterial({ color: hex }));
  crown.position.y = 1.84;
  g.add(body, brim, crown);
  g.userData.hatMats = [brim.material, crown.material];
  g.userData.slot = slot;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#f4efe4";
  ctx.font = "28px serif";
  ctx.textAlign = "center";
  ctx.fillText(String(name || "Wanderer").slice(0, 18), 128, 42);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(1.4, 0.35, 1);
  spr.position.y = 2.15;
  g.add(spr);
  return g;
}

function dyePuppetHat(g, slot, hat) {
  const hex = hatHex(slot, hat);
  (g.userData.hatMats || []).forEach((m) => m.color.setHex(hex));
  g.userData.slot = slot;
}

async function mmoPost(body) {
  const res = await fetch("/api/mmo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
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

  const coop = {
    selfId: peerId(),
    joined: false,
    snap: { cap: 2, peers: [], selfId: "", seq: 0 },
    puppets: new Map(),
    group: new THREE.Group(),
    voice: null,
    voiceStatus: "idle",
    chip: mountChip(),
    lastSend: 0,
    sending: false,
  };
  coop.group.name = "fenrest-coop";
  root.add(coop.group);
  rememberPeer(coop.selfId);
  window.addEventListener("beforeunload", () => {
    coop.voice?.close?.();
    if (coop.joined) mmoPost({ op: "leave", peer: coop.selfId }).catch(() => {});
  });

  async function coopJoin() {
    const st = store?.getState?.();
    if (!(st?.playing || st?.vr || st?.screen === "play")) return;
    if (coop.joining) return;
    if (Date.now() - (coop.lastJoinTry || 0) < 1500) return;
    coop.lastJoinTry = Date.now();
    coop.joining = true;
    try {
      const data = await mmoPost({
        op: "join",
        peer: coop.selfId,
        name: "Fenrest",
        fill: "none",
        realm: "fenrest",
        vr: !!(st?.vr || gl?.xr?.isPresenting),
        since: 0,
      });
      if (data?.ok === false && data.error) {
        coop.snap = data;
        paintChip(coop.chip, { humans: (data.peers || []).length, cap: 2, voice: "full", realm: "Fenrest" });
        return;
      }
      coop.joined = true;
      coop.snap = data;
      if (data.self) {
        coop.selfId = data.self;
        rememberPeer(data.self);
      }
      if (!coop.voice) {
        coop.voice = createVoicePair({
          selfId: coop.selfId,
          name: "Fenrest",
          onStatus: (s) => {
            coop.voiceStatus = s;
          },
        });
        const kick = () => coop.voice?.start?.();
        kick();
        window.addEventListener("pointerdown", kick, { once: true });
      }
    } catch {
      /* lobby unreachable */
    } finally {
      coop.joining = false;
    }
  }

  function syncPuppets(camPos) {
    const peers = (coop.snap.peers || []).filter((p) => p.id !== coop.selfId && !p.traveler);
    const keep = new Set();
    for (const p of peers) {
      if (p.realm && p.realm !== "fenrest") {
        const stale = coop.puppets.get(p.id);
        if (stale) {
          coop.group.remove(stale);
          coop.puppets.delete(p.id);
        }
        continue;
      }
      keep.add(p.id);
      let g = coop.puppets.get(p.id);
      if (!g) {
        g = makePeerPuppet(p.slot ?? 0, p.name);
        coop.group.add(g);
        coop.puppets.set(p.id, g);
      }
      dyePuppetHat(g, p.slot ?? 0, p.hat);
      const tx = p.x ?? 0;
      const tz = p.z ?? 0;
      const ty = (p.y ?? 0) > 0.2 ? p.y : heightAt(tx, tz);
      g.position.lerp(tmp2.set(tx, ty, tz), 0.35);
      if (typeof p.yaw === "number") g.rotation.y = p.yaw;
    }
    for (const [id, g] of coop.puppets) {
      if (!keep.has(id)) {
        coop.group.remove(g);
        coop.puppets.delete(id);
      }
    }
    const me = (coop.snap.peers || []).find((p) => p.id === coop.selfId);
    const humans = (coop.snap.peers || []).filter((p) => !p.traveler && !p.bot);
    paintChip(coop.chip, {
      humans: humans.length,
      cap: coop.snap.cap || 2,
      slot: me?.slot ?? 0,
      hat: me?.hat || "red",
      voice: coop.voiceStatus,
      realm: "Fenrest",
    });
  }

  if (store) {
    const bag = loadBag();
    const merged = mergeBagIntoList(store.getState().inventory, bag);
    if (merged.length !== store.getState().inventory.length) {
      store.setState({ inventory: merged });
    }
  }

  const chunks = createChunkManager(root, {
    onChunk(cx, cz, info) {
      window.__FENREST_LIFE__?.scatterChunk?.(cx, cz, info);
    },
    onUnload() {
      window.__FENREST_LIFE__?.pruneScatter?.();
    },
  });

  const smithX = 18;
  const smithZ = -6;
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
  const dropIds = [
    "sword-copper",
    "sword-iron",
    "sword-steel",
    "shield-wood",
    "bow-wood",
    "axe-stone",
    "spear-bone",
    "helm-iron",
    "spell-thunderbolt",
    "spell-fireball",
    "spell-freeze",
    "spell-raise-terrain",
    "spell-meteor",
    "spell-join-skies",
    "spell-spawn-goblin",
    "spell-spawn-skeleton",
    "spell-spawn-dragon",
    "axe-woodcutter",
    "pickaxe-iron",
  ];
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
  const allies = [];
  window.__FENREST_FOES__ = foes;
  window.__FENREST_ALLIES__ = allies;
  const bolts = [];
  const magic = createMagic({ root, foes, allies, store, gl, cam: window.__FENREST_CAM__ });
  magic.grantAll();
  magic.seedEvils();
  let encounterIn = 80 + Math.random() * 100;
  let trigPrev = false;
  const portalGroup = new THREE.Group();
  portalGroup.visible = false;
  const mirrors = [makeMirrorPortal(), makeMirrorPortal()];
  mirrors[0].position.set(6, heightAt(6, 8) + 1.45, 8);
  mirrors[1].position.set(-18, heightAt(-18, -8) + 1.45, -8);
  mirrors.forEach((p) => portalGroup.add(p));
  root.add(portalGroup);

  const hands = attachVrHands({
    scene,
    gl,
    heightAt,
    loot,
    foes,
    store,
    magic,
    onCast: (id, charge, origin, dir) => magic.cast(id, charge, origin, dir),
  });
  window.__FENREST_HANDS__ = hands;
  window.__FENREST_LOOT__ = loot;
  window.__FENREST_FOES__ = foes;
  window.__FENREST_ROOT__ = root;
  window.__FENREST_STORE__ = store;
  installLife({ root, store, loot, foes, heightAt });
  chunks.tick(0, 0);
  const head = { x: 0, y: 1.6, z: 0 };
  const gripPts = [];

  let last = performance.now();
  let warping = false;
  let lastHandT = 0;

  function stepHands(now) {
    if (!gl?.xr?.isPresenting) return;
    const hdt = Math.min(0.05, ((now - lastHandT) || 16) / 1000);
    if (now - lastHandT < 8) return;
    lastHandT = now;
    hands.tick(hdt);
  }

  function tryWarp(now) {
    const st = store?.getState?.();
    const vr = !!(st?.vr || gl?.xr?.isPresenting);
    portalGroup.visible = vr;
    if (vr && !tryWarp.hinted) {
      tryWarp.hinted = true;
      store?.getState?.().setHud?.({ prompt: "Squeeze grip to pick up steel. Walk into the mirror for New Eden." });
    }
    if (!vr || warping) return;
    const cam = window.__FENREST_CAM__;
    readHead(gl, cam, null, head);
    gripPoints(gl, THREE, gripPts);
    const pts = [head, ...gripPts];
    portalGroup.children.forEach((p) => {
      if (p.userData.sw) {
        paintSwirl(p.userData.sw, (now || performance.now()) * 0.001);
        p.lookAt(head.x, p.position.y, head.z);
      }
      if (!warping && (anyHitsPortal(p, pts, 1.6) || portalHit(p, head, 1.6))) {
        warping = true;
        goPortal("neweden", gl);
      }
    });
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const cam = window.__FENREST_CAM__;
    const st = store?.getState?.();
    const vr = !!(st?.vr || gl?.xr?.isPresenting);
    if (cam) {
      readHead(gl, cam, null, head);
      tmp.set(head.x, head.y, head.z);
      window.__FENREST_HEAD__ = head;
      tickLoot(loot, dt, store, { vr });
      tickFoes(foes, dt, store, bolts, root);
      magic.tick(dt, gl);
      try {
        window.__FENREST_LIFE__?.tick?.(dt, { head, gl, hands, store, cam });
      } catch (err) {
        console.warn("[fenrest-life]", err);
      }
      chunks.tick(tmp.x, tmp.z);
      snapToGround(cam, dt);
      store?.getState?.().setHud?.({ mp: 1 });
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
      tryWarp(now);
      stepHands(now);
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
    if (!coop.joined) coopJoin();
    else if (cam && now - coop.lastSend > 180 && !coop.sending) {
      coop.lastSend = now;
      coop.sending = true;
      const st = store?.getState?.();
      const vrNow = !!(st?.vr || gl?.xr?.isPresenting);
      mmoPost({
        op: "state",
        peer: coop.selfId,
        since: coop.snap.seq || 0,
        x: tmp.x,
        y: tmp.y,
        z: tmp.z,
        yaw: cam.rotation?.y || st?.yaw || 0,
        vx: 0,
        vz: 0,
        fp: true,
        realm: "fenrest",
        vr: vrNow,
      })
        .then((d) => {
          if (d?.ok !== false) coop.snap = d;
        })
        .catch(() => {})
        .finally(() => {
          coop.sending = false;
        });
    }
    if (cam) syncPuppets(tmp);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  if (gl) bindXrTick(gl, (t) => {
    tryWarp(t);
    stepHands(t);
  });
}

boot();
