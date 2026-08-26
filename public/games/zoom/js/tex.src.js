/** Procedural tileable biome textures. */
import * as THREE from "three";
import { BIOMES } from "./config.js?v=zm5";

function n2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function rgb(r, g, b) {
  r = Math.max(0, Math.min(255, r | 0));
  g = Math.max(0, Math.min(255, g | 0));
  b = Math.max(0, Math.min(255, b | 0));
  return `rgb(${r},${g},${b})`;
}

function paint(kind, which) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  const W = 64;
  const H = 64;
  const floor = which === "floor";

  if (kind === "arctic") {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = 190 + n2(x, y) * 40 + n2(x * 0.2, y * 0.2) * 20;
        g.fillStyle = rgb(v, v + 8, v + 22);
        g.fillRect(x, y, 1, 1);
      }
    }
    g.strokeStyle = "rgba(255,255,255,0.45)";
    g.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      g.beginPath();
      g.moveTo(n2(i, 2) * W, n2(i, 3) * H);
      g.lineTo(n2(i, 4) * W, n2(i, 5) * H);
      g.stroke();
    }
  } else if (kind === "stone") {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = 88 + n2(x, y) * 36 + n2(x * 0.15, y * 0.15) * 18;
        g.fillStyle = rgb(v, v - 4, v - 10);
        g.fillRect(x, y, 1, 1);
      }
    }
    g.fillStyle = "rgba(40,38,34,0.35)";
    for (let i = 0; i < 12; i++) g.fillRect((i * 17) % W, (i * 11) % H, 8, 1);
  } else if (kind === "space") {
    g.fillStyle = "#121820";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "#2a3848";
    g.lineWidth = 2;
    for (let y = 0; y < H; y += 16) g.strokeRect(0.5, y + 0.5, W - 1, 16);
    for (let x = 0; x < W; x += 16) g.strokeRect(x + 0.5, 0.5, 16, H - 1);
    g.fillStyle = "#4ad0ff";
    for (let y = 8; y < H; y += 16) g.fillRect(0, y, W, 1);
    g.fillStyle = "#7a8898";
    for (let i = 0; i < 20; i++) g.fillRect((i * 13) % W, (i * 7) % H, 2, 2);
  } else if (kind === "jungle") {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = n2(x, y);
        g.fillStyle = rgb(40 + v * 30, 70 + v * 50, 32 + v * 20);
        g.fillRect(x, y, 1, 1);
      }
    }
    g.strokeStyle = "rgba(30,70,20,0.7)";
    g.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo(n2(i, 1) * W, 0);
      g.quadraticCurveTo(n2(i, 2) * W, n2(i, 3) * H, n2(i, 4) * W, H);
      g.stroke();
    }
  } else if (kind === "doom") {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = 28 + n2(x, y) * 22;
        g.fillStyle = rgb(v + 18, v * 0.4, v * 0.3);
        g.fillRect(x, y, 1, 1);
      }
    }
    g.strokeStyle = "#ff4a18";
    g.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      g.moveTo(n2(i, 8) * W, n2(i, 9) * H);
      g.lineTo(n2(i, 10) * W, n2(i, 11) * H);
      g.stroke();
    }
  } else if (kind === "royal") {
    if (floor) {
      g.fillStyle = "#6a1218";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#8a2028";
      for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 3);
      g.fillStyle = "#d4b050";
      g.fillRect(0, 0, W, 2);
      g.fillRect(0, H - 2, W, 2);
    } else {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const v = 200 + n2(x * 0.4, y * 0.4) * 30;
          g.fillStyle = rgb(v, v - 8, v - 20);
          g.fillRect(x, y, 1, 1);
        }
      }
      g.strokeStyle = "#c4a050";
      g.lineWidth = 2;
      g.strokeRect(4, 4, W - 8, H - 8);
      g.fillStyle = "#c4a050";
      g.fillRect(30, 0, 4, H);
    }
  } else if (kind === "haunted") {
    if (floor) {
      g.fillStyle = "#2a2018";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#3a2a1c";
      for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 6, H);
      g.fillStyle = "#1a140e";
      for (let x = 6; x < W; x += 8) g.fillRect(x, 0, 1, H);
    } else {
      g.fillStyle = "#6a5a62";
      g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (n2(x, y) > 0.86) {
            g.fillStyle = rgb(90 + n2(x, y + 3) * 40, 80, 88);
            g.fillRect(x, y, 2, 2);
          }
        }
      }
      g.strokeStyle = "#3a2a30";
      g.lineWidth = 2;
      for (let y = 0; y < H; y += 16) g.strokeRect(0, y, W, 16);
    }
  } else if (kind === "mossy") {
    g.fillStyle = "#5a5850";
    g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 8) {
      const o = (y / 8) % 2 ? 4 : 0;
      for (let x = -8; x < W; x += 16) {
        const v = 90 + n2(x, y) * 40;
        g.fillStyle = rgb(v, v - 8, v - 16);
        g.fillRect(x + o + 1, y + 1, 14, 6);
      }
    }
    g.fillStyle = "rgba(50,110,40,0.55)";
    for (let i = 0; i < 40; i++) {
      g.fillRect((i * 19) % W, (i * 13) % H, 3 + (i % 3), 2);
    }
  } else if (kind === "crystal") {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = n2(x * 0.3, y * 0.3);
        g.fillStyle = rgb(60 + v * 80, 30 + v * 40, 110 + v * 100);
        g.fillRect(x, y, 1, 1);
      }
    }
    g.strokeStyle = "rgba(200,180,255,0.7)";
    g.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.moveTo(n2(i, 20) * W, n2(i, 21) * H);
      g.lineTo(n2(i, 22) * W, n2(i, 23) * H);
      g.lineTo(n2(i, 24) * W, n2(i, 25) * H);
      g.closePath();
      g.stroke();
    }
  } else if (kind === "lab") {
    g.fillStyle = "#122028";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "#2a8898";
    g.lineWidth = 1;
    for (let y = 0; y < H; y += 8) g.strokeRect(0.5, y + 0.5, W - 1, 8);
    g.fillStyle = "#44d8ff";
    for (let i = 0; i < 12; i++) g.fillRect((i * 11) % W, (i * 5) % H, 2, 2);
    g.fillStyle = "rgba(80,200,220,0.25)";
    g.fillRect(0, 20, W, 2);
    g.fillRect(0, 44, W, 1);
  } else if (kind === "temple") {
    g.fillStyle = "#6a4a28";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#c4a060";
    for (let y = 0; y < H; y += 16) {
      const o = (y / 16) % 2 ? 8 : 0;
      for (let x = -16; x < W; x += 32) g.fillRect(x + o + 1, y + 1, 30, 14);
    }
    g.fillStyle = "#e8d090";
    g.fillRect(0, 0, W, 2);
    g.fillRect(30, 0, 4, H);
    g.fillStyle = "rgba(180,40,40,0.35)";
    g.fillRect(8, 8, 16, 16);
  } else {
    g.fillStyle = "#666";
    g.fillRect(0, 0, W, H);
  }
  return c;
}

const CACHE = {};

export function biomeTexture(kind, which) {
  const key = kind + ":" + which;
  if (CACHE[key]) return CACHE[key];
  const c = paint(kind, which);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  CACHE[key] = t;
  return t;
}

export function biomeMaterial(kind, which) {
  const map = biomeTexture(kind, which);
  const mat = new THREE.MeshLambertMaterial({
    map,
    color: 0xffffff,
    side: THREE.DoubleSide,
    emissive: kind === "doom" ? 0x3a0800 : kind === "crystal" ? 0x2a1048 : kind === "space" ? 0x102030 : kind === "lab" ? 0x083040 : kind === "temple" ? 0x3a2810 : 0x1a1610,
    emissiveIntensity: 0.55,
  });
  return mat;
}

export function allMaterials() {
  return BIOMES.map((b) => ({
    id: b.id,
    wall: biomeMaterial(b.id, "wall"),
    floor: biomeMaterial(b.id, "floor"),
  }));
}
