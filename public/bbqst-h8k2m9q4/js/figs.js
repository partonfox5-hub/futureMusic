import * as THREE from "three";
import { STUD, PLATE } from "./bricks.js";

export const FIG_HEADS = [
  { id: "smile", name: "Smile", skin: 0xf5cd2f, face: "smile" },
  { id: "grin", name: "Grin", skin: 0xf5cd2f, face: "grin" },
  { id: "cool", name: "Shades", skin: 0xf5cd2f, face: "cool" },
  { id: "wink", name: "Wink", skin: 0xf5cd2f, face: "wink" },
  { id: "sleep", name: "Sleepy", skin: 0xf5cd2f, face: "sleep" },
  { id: "alien", name: "Alien", skin: 0x9aca3e, face: "alien" },
  { id: "robot", name: "Robot", skin: 0x9ba3a9, face: "robot" },
  { id: "tan", name: "Tan", skin: 0xe4cd9e, face: "smile" },
  { id: "dark", name: "Deep", skin: 0x6a4a2a, face: "smile" },
  { id: "pale", name: "Pale", skin: 0xf4e4d0, face: "grin" },
];

export const FIG_TORSOS = [
  { id: "blue", name: "Blue shirt", col: 0x0055bf, accent: 0xffffff },
  { id: "red", name: "Red tee", col: 0xc91a09, accent: 0xf5cd2f },
  { id: "green", name: "Green", col: 0x237841, accent: 0xbbe90b },
  { id: "black", name: "Black jacket", col: 0x1b2a34, accent: 0xc91a09 },
  { id: "white", name: "White shirt", col: 0xf2f3f2, accent: 0x0055bf },
  { id: "orange", name: "Safety", col: 0xfe8a18, accent: 0x1b2a34 },
  { id: "purple", name: "Regal", col: 0x81007b, accent: 0xf5cd2f },
  { id: "stripe", name: "Stripes", col: 0x078bc9, accent: 0xffffff },
  { id: "overall", name: "Overalls", col: 0x0055bf, accent: 0xe4cd9e },
  { id: "armor", name: "Armor", col: 0x6a6e74, accent: 0xf5cd2f },
];

export const FIG_LEGS = [
  { id: "blue", name: "Blue pants", col: 0x0055bf },
  { id: "black", name: "Black pants", col: 0x1b2a34 },
  { id: "brown", name: "Brown pants", col: 0x583927 },
  { id: "tan", name: "Tan shorts", col: 0xe4cd9e },
  { id: "green", name: "Green pants", col: 0x237841 },
  { id: "red", name: "Red pants", col: 0xc91a09 },
  { id: "navy", name: "Navy", col: 0x0d325b },
  { id: "grey", name: "Grey", col: 0x9ba3a9 },
  { id: "white", name: "White", col: 0xf2f3f2 },
  { id: "purple", name: "Purple", col: 0x81007b },
];

/** Catalog outfits. Clothing prints + hats, labeled by job / look. */
export const FIG_PRESETS = [
  { id: "surfer", name: "Surfer", face: "cool", skin: 0xe4cd9e, torso: 0x078bc9, legs: 0xf5cd2f, hat: "hair", hatCol: 0x3a2414 },
  { id: "soldier", name: "Soldier", face: "smile", skin: 0xe4cd9e, torso: 0x4a5c32, legs: 0x3a4a28, hat: "helmet", hatCol: 0x4a5c32 },
  { id: "doctor", name: "Doctor", face: "smile", skin: 0xf4e4d0, torso: 0xf2f3f2, legs: 0x0d325b, hat: "mirror", hatCol: 0xf2f3f2 },
  { id: "fireman", name: "Fireman", face: "smile", skin: 0xe4cd9e, torso: 0xc91a09, legs: 0x1b2a34, hat: "firehelm", hatCol: 0xc91a09 },
  { id: "chef", name: "Chef", face: "grin", skin: 0xf5cd2f, torso: 0xf2f3f2, legs: 0x1b2a34, hat: "toque", hatCol: 0xf2f3f2 },
  { id: "astronaut", name: "Astronaut", face: "cool", skin: 0xf4e4d0, torso: 0xf2f3f2, legs: 0xf2f3f2, hat: "visor", hatCol: 0xd4a017 },
  { id: "pirate", name: "Pirate", face: "wink", skin: 0xe4cd9e, torso: 0x1b2a34, legs: 0x583927, hat: "bandana", hatCol: 0xc91a09 },
  { id: "ninja", name: "Ninja", face: "cool", skin: 0x6a4a2a, torso: 0x1b2a34, legs: 0x1b2a34, hat: "ninja", hatCol: 0x1b2a34 },
  { id: "wizard", name: "Wizard", face: "smile", skin: 0xf4e4d0, torso: 0x81007b, legs: 0x4a1050, hat: "pointy", hatCol: 0x4a1050 },
  { id: "cop", name: "Cop", face: "smile", skin: 0xe4cd9e, torso: 0x0d325b, legs: 0x1b2a34, hat: "cap", hatCol: 0x0d325b },
  { id: "builder", name: "Builder", face: "grin", skin: 0xe4cd9e, torso: 0xfe8a18, legs: 0x0055bf, hat: "hardhat", hatCol: 0xf5cd2f },
  { id: "athlete", name: "Athlete", face: "grin", skin: 0x6a4a2a, torso: 0xc91a09, legs: 0xf2f3f2, hat: "visorcap", hatCol: 0xc91a09 },
  { id: "scientist", name: "Scientist", face: "smile", skin: 0xf4e4d0, torso: 0xf2f3f2, legs: 0x9ba3a9, hat: "goggles", hatCol: 0x68bcc5 },
  { id: "knight", name: "Knight", face: "smile", skin: 0xf5cd2f, torso: 0x6a6e74, legs: 0x4a4e54, hat: "helm", hatCol: 0x8a8e94 },
  { id: "farmer", name: "Farmer", face: "smile", skin: 0xe4cd9e, torso: 0xc45c26, legs: 0x0055bf, hat: "straw", hatCol: 0xe8c44a },
  { id: "pilot", name: "Pilot", face: "cool", skin: 0xe4cd9e, torso: 0x0d325b, legs: 0x0d325b, hat: "headset", hatCol: 0x1b2a34 },
  { id: "diver", name: "Diver", face: "cool", skin: 0xe4cd9e, torso: 0x078bc9, legs: 0x1b2a34, hat: "diver", hatCol: 0x078bc9 },
  { id: "cowboy", name: "Cowboy", face: "grin", skin: 0xe4cd9e, torso: 0xc45c26, legs: 0x0055bf, hat: "stetson", hatCol: 0x583927 },
  { id: "artist", name: "Artist", face: "wink", skin: 0xf4e4d0, torso: 0x81007b, legs: 0x1b2a34, hat: "beret", hatCol: 0x1b2a34 },
  { id: "mechanic", name: "Mechanic", face: "smile", skin: 0xe4cd9e, torso: 0x0055bf, legs: 0x1b2a34, hat: "beanie", hatCol: 0x0d325b },
  { id: "nurse", name: "Nurse", face: "smile", skin: 0xf4e4d0, torso: 0xf2f3f2, legs: 0xf2f3f2, hat: "nurse", hatCol: 0xf2f3f2 },
  { id: "ranger", name: "Ranger", face: "smile", skin: 0xe4cd9e, torso: 0x237841, legs: 0x583927, hat: "boonie", hatCol: 0x3a5a28 },
];

const _faceCache = new Map();
const _printCache = new Map();

function hexCss(n) {
  return "#" + (n >>> 0).toString(16).padStart(6, "0");
}

function faceTex(kind) {
  if (_faceCache.has(kind)) return _faceCache.get(kind);
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#0000";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#1a1208";
  if (kind === "cool") {
    g.fillRect(14, 26, 36, 8);
    g.fillRect(18, 24, 12, 12);
    g.fillRect(34, 24, 12, 12);
  } else if (kind === "sleep") {
    g.strokeStyle = "#1a1208";
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(16, 28); g.quadraticCurveTo(22, 24, 28, 28); g.stroke();
    g.beginPath(); g.moveTo(36, 28); g.quadraticCurveTo(42, 24, 48, 28); g.stroke();
  } else if (kind === "wink") {
    g.beginPath(); g.arc(22, 28, 3, 0, 7); g.fill();
    g.fillRect(36, 26, 10, 3);
  } else if (kind === "alien") {
    g.fillStyle = "#081018";
    g.beginPath(); g.ellipse(20, 28, 6, 8, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(44, 28, 6, 8, 0, 0, 7); g.fill();
  } else if (kind === "robot") {
    g.fillStyle = "#9ee7ff";
    g.fillRect(16, 22, 12, 10);
    g.fillRect(36, 22, 12, 10);
  } else {
    g.beginPath(); g.arc(22, 28, 3.2, 0, 7); g.fill();
    g.beginPath(); g.arc(42, 28, 3.2, 0, 7); g.fill();
  }
  g.strokeStyle = "#1a1208";
  g.lineWidth = 3;
  g.beginPath();
  if (kind === "grin") {
    g.arc(32, 40, 10, 0.15, Math.PI - 0.15);
  } else if (kind === "alien") {
    g.arc(32, 46, 6, Math.PI, 0);
  } else if (kind !== "sleep" && kind !== "robot") {
    g.arc(32, 42, 8, 0.2, Math.PI - 0.2);
  }
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _faceCache.set(kind, t);
  return t;
}

function printTex(preset) {
  const key = preset ? preset.id : "plain";
  if (_printCache.has(key)) return _printCache.get(key);
  const c = document.createElement("canvas");
  c.width = 64; c.height = 80;
  const g = c.getContext("2d");
  const shirt = hexCss(preset?.torso ?? 0x0055bf);
  g.fillStyle = shirt;
  g.fillRect(0, 0, 64, 80);
  const id = preset?.id || "";
  if (id === "surfer") {
    g.fillStyle = "#f5cd2f";
    g.fillRect(0, 58, 64, 22);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(6, 42); g.quadraticCurveTo(32, 18, 58, 42); g.stroke();
    g.fillStyle = "#ffffff";
    g.beginPath(); g.arc(32, 36, 5, 0, 7); g.fill();
  } else if (id === "soldier") {
    g.fillStyle = "#3a4a28";
    g.beginPath(); g.arc(18, 22, 8, 0, 7); g.fill();
    g.beginPath(); g.arc(46, 40, 10, 0, 7); g.fill();
    g.beginPath(); g.arc(28, 52, 7, 0, 7); g.fill();
    g.fillStyle = "#2a3420";
    g.fillRect(8, 62, 48, 8);
    g.fillStyle = "#c9a227";
    g.fillRect(26, 18, 12, 16);
  } else if (id === "doctor") {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 64, 80);
    g.fillStyle = "#c91a09";
    g.fillRect(28, 18, 8, 36);
    g.fillRect(16, 32, 32, 8);
    g.fillStyle = "#0055bf";
    g.fillRect(8, 8, 14, 10);
  } else if (id === "fireman") {
    g.fillStyle = "#f5cd2f";
    g.fillRect(8, 10, 10, 56);
    g.fillRect(46, 10, 10, 56);
    g.fillStyle = "#1b2a34";
    g.beginPath(); g.arc(32, 36, 12, 0, 7); g.fill();
    g.fillStyle = "#f5cd2f";
    g.font = "bold 16px sans-serif";
    g.textAlign = "center";
    g.fillText("FD", 32, 42);
  } else if (id === "chef") {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 64, 80);
    g.fillStyle = "#1b2a34";
    g.fillRect(6, 58, 52, 10);
    g.fillStyle = "#c91a09";
    g.beginPath(); g.arc(32, 32, 10, 0, 7); g.fill();
    g.fillStyle = "#f5cd2f";
    g.fillRect(30, 18, 4, 28);
  } else if (id === "astronaut") {
    g.fillStyle = "#dce6ee";
    g.fillRect(0, 0, 64, 80);
    g.fillStyle = "#078bc9";
    g.fillRect(12, 16, 40, 28);
    g.fillStyle = "#f5cd2f";
    g.fillRect(20, 24, 24, 12);
    g.fillStyle = "#1b2a34";
    g.fillRect(8, 52, 48, 8);
    g.fillRect(28, 48, 8, 20);
  } else if (id === "pirate") {
    g.fillStyle = "#c91a09";
    g.fillRect(0, 50, 64, 8);
    g.fillStyle = "#e4cd9e";
    g.beginPath(); g.moveTo(32, 14); g.lineTo(50, 50); g.lineTo(14, 50); g.closePath(); g.fill();
    g.fillStyle = "#f5cd2f";
    g.beginPath(); g.arc(32, 40, 6, 0, 7); g.fill();
  } else if (id === "ninja") {
    g.fillStyle = "#1b2a34";
    g.fillRect(0, 0, 64, 80);
    g.fillStyle = "#c91a09";
    g.fillRect(8, 28, 48, 6);
    g.fillStyle = "#9ba3a9";
    g.fillRect(26, 44, 12, 18);
  } else if (id === "wizard") {
    g.fillStyle = "#f5cd2f";
    g.beginPath(); g.moveTo(32, 10); g.lineTo(50, 54); g.lineTo(14, 54); g.closePath(); g.fill();
    g.fillStyle = "#ffffff";
    g.beginPath(); g.arc(22, 22, 2.5, 0, 7); g.fill();
    g.beginPath(); g.arc(40, 30, 2, 0, 7); g.fill();
    g.beginPath(); g.arc(30, 40, 2.2, 0, 7); g.fill();
  } else if (id === "cop") {
    g.fillStyle = "#f2f3f2";
    g.fillRect(0, 8, 64, 10);
    g.fillStyle = "#c9a227";
    g.beginPath(); g.arc(32, 38, 12, 0, 7); g.fill();
    g.fillStyle = "#0d325b";
    g.font = "bold 14px sans-serif";
    g.textAlign = "center";
    g.fillStyle = "#1b2a34";
    g.fillText("PD", 32, 44);
  } else if (id === "builder") {
    g.fillStyle = "#1b2a34";
    g.fillRect(6, 8, 52, 10);
    g.fillRect(10, 8, 8, 50);
    g.fillStyle = "#f5cd2f";
    g.fillRect(22, 28, 20, 16);
    g.fillStyle = "#1b2a34";
    g.fillRect(0, 58, 64, 8);
  } else if (id === "athlete") {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 10, 64, 12);
    g.fillStyle = "#1b2a34";
    g.font = "bold 22px sans-serif";
    g.textAlign = "center";
    g.fillText("12", 32, 50);
  } else if (id === "scientist") {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 64, 80);
    g.fillStyle = "#68bcc5";
    g.beginPath(); g.arc(22, 34, 10, 0, 7); g.stroke();
    g.strokeStyle = "#68bcc5";
    g.lineWidth = 3;
    g.beginPath(); g.arc(22, 36, 8, 0, 7); g.stroke();
    g.beginPath(); g.arc(42, 36, 8, 0, 7); g.stroke();
    g.fillStyle = "#237841";
    g.fillRect(28, 52, 8, 16);
  } else if (id === "knight") {
    g.fillStyle = "#8a8e94";
    g.fillRect(10, 8, 44, 56);
    g.fillStyle = "#c9a227";
    g.fillRect(28, 12, 8, 48);
    g.fillStyle = "#4a4e54";
    g.fillRect(6, 20, 10, 28);
    g.fillRect(48, 20, 10, 28);
  } else if (id === "farmer") {
    g.fillStyle = "#c45c26";
    g.fillRect(0, 0, 64, 80);
    g.fillStyle = "#e4cd9e";
    g.fillRect(8, 8, 48, 18);
    g.fillStyle = "#237841";
    g.beginPath(); g.arc(32, 48, 10, 0, 7); g.fill();
  } else if (id === "pilot") {
    g.fillStyle = "#f2f3f2";
    g.fillRect(0, 8, 64, 10);
    g.fillStyle = "#c9a227";
    g.fillRect(18, 24, 28, 22);
    g.fillStyle = "#1b2a34";
    g.fillRect(24, 30, 16, 10);
  } else if (id === "diver") {
    g.fillStyle = "#f5cd2f";
    g.fillRect(10, 8, 8, 50);
    g.fillRect(46, 8, 8, 50);
    g.fillStyle = "#68bcc5";
    g.beginPath(); g.arc(32, 36, 12, 0, 7); g.fill();
  } else if (id === "cowboy") {
    g.fillStyle = "#e4cd9e";
    g.fillRect(8, 10, 48, 16);
    g.fillStyle = "#583927";
    g.fillRect(0, 50, 64, 12);
    g.fillStyle = "#c91a09";
    g.fillRect(26, 30, 12, 16);
  } else if (id === "artist") {
    g.fillStyle = "#fc97ac";
    g.fillRect(0, 50, 64, 8);
    g.fillStyle = "#f5cd2f";
    g.fillRect(12, 18, 10, 22);
    g.fillStyle = "#078bc9";
    g.fillRect(26, 18, 10, 22);
    g.fillStyle = "#237841";
    g.fillRect(40, 18, 10, 22);
  } else if (id === "mechanic") {
    g.fillStyle = "#1b2a34";
    g.fillRect(0, 50, 64, 12);
    g.fillStyle = "#9ba3a9";
    g.fillRect(20, 18, 24, 20);
    g.fillStyle = "#fe8a18";
    g.fillRect(8, 8, 16, 10);
  } else if (id === "nurse") {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 64, 80);
    g.fillStyle = "#fc97ac";
    g.fillRect(26, 16, 12, 36);
    g.fillRect(14, 28, 36, 12);
    g.fillStyle = "#078bc9";
    g.fillRect(0, 62, 64, 8);
  } else if (id === "ranger") {
    g.fillStyle = "#3a5a28";
    g.beginPath(); g.arc(20, 28, 9, 0, 7); g.fill();
    g.beginPath(); g.arc(44, 46, 8, 0, 7); g.fill();
    g.fillStyle = "#583927";
    g.fillRect(8, 60, 48, 8);
    g.fillStyle = "#e4cd9e";
    g.fillRect(26, 20, 12, 18);
  } else {
    g.fillStyle = "#ffffff";
    g.fillRect(20, 22, 24, 28);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = true;
  t.needsUpdate = true;
  _printCache.set(key, t);
  return t;
}

function lamb(hex) {
  return new THREE.MeshLambertMaterial({ color: hex });
}

function addHat(g, hat, col, headY, headR, skin) {
  if (!hat) return;
  const m = lamb(col);
  const skinM = lamb(skin);
  if (hat === "hair") {
    const a = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.55, 8, 6), m);
    a.position.set(-headR * 0.55, headY + headR * 0.55, 0);
    const b = a.clone();
    b.position.set(headR * 0.55, headY + headR * 0.5, -headR * 0.1);
    const c = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.7, 8, 6), m);
    c.position.set(0, headY + headR * 0.75, -headR * 0.15);
    g.add(a, b, c);
  } else if (hat === "helmet") {
    const h = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), m);
    h.position.y = headY + headR * 0.12;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.9, headR * 0.22, headR * 0.7), m);
    brim.position.set(0, headY - headR * 0.05, headR * 0.7);
    g.add(h, brim);
  } else if (hat === "firehelm") {
    const h = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), m);
    h.position.y = headY + headR * 0.1;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.18, headR * 0.7, headR * 1.6), lamb(0xf5cd2f));
    crest.position.set(0, headY + headR * 0.55, 0);
    g.add(h, crest);
  } else if (hat === "toque") {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.02, headR * 1.02, headR * 0.28, 10), m);
    band.position.y = headY + headR * 0.85;
    const puff = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.95, headR * 1.05, headR * 1.15, 10), m);
    puff.position.y = headY + headR * 1.55;
    g.add(band, puff);
  } else if (hat === "visor") {
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.18, 12, 10), m);
    bowl.position.y = headY + headR * 0.05;
    const vis = new THREE.Mesh(
      new THREE.SphereGeometry(headR * 1.05, 10, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.45),
      new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.55 }),
    );
    vis.position.y = headY;
    g.add(bowl, vis);
  } else if (hat === "bandana") {
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.05, headR * 1.05, headR * 0.35, 10), m);
    wrap.position.y = headY + headR * 0.7;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.25, headR * 0.9, headR * 0.08), m);
    tail.position.set(-headR * 0.7, headY + headR * 0.15, -headR * 0.7);
    tail.rotation.z = 0.5;
    g.add(wrap, tail);
  } else if (hat === "ninja") {
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.04, headR * 1.04, headR * 0.7, 10), m);
    wrap.position.y = headY + headR * 0.35;
    g.add(wrap);
  } else if (hat === "pointy") {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(headR * 1.15, headR * 2.4, 8), m);
    cone.position.y = headY + headR * 1.55;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.45, headR * 1.45, headR * 0.12, 10), m);
    brim.position.y = headY + headR * 0.45;
    g.add(cone, brim);
  } else if (hat === "cap" || hat === "visorcap") {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.02, headR * 1.08, headR * 0.55, 10), m);
    crown.position.y = headY + headR * 0.85;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.1, headR * 0.1, headR * 0.7), m);
    brim.position.set(0, headY + headR * 0.58, headR * 0.75);
    g.add(crown, brim);
  } else if (hat === "hardhat") {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), m);
    dome.position.y = headY + headR * 0.2;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.35, headR * 1.35, headR * 0.1, 12), m);
    brim.position.y = headY + headR * 0.05;
    g.add(dome, brim);
  } else if (hat === "goggles") {
    const band = new THREE.Mesh(new THREE.BoxGeometry(headR * 2.1, headR * 0.28, headR * 0.12), m);
    band.position.set(0, headY + headR * 0.15, headR * 0.95);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.32, headR * 0.32, headR * 0.2, 8), m);
    l.rotation.x = Math.PI / 2;
    l.position.set(-headR * 0.38, headY + headR * 0.15, headR * 1.05);
    const r = l.clone();
    r.position.x = headR * 0.38;
    g.add(band, l, r);
  } else if (hat === "helm") {
    const h = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.14, 10, 8), m);
    h.position.y = headY + headR * 0.05;
    const slit = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.3, headR * 0.16, headR * 0.2), lamb(0x1b2a34));
    slit.position.set(0, headY + headR * 0.05, headR * 1.05);
    g.add(h, slit);
  } else if (hat === "straw" || hat === "boonie" || hat === "stetson") {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.85, headR * 1.0, headR * 0.7, 10), m);
    crown.position.y = headY + headR * 1.05;
    const brimR = hat === "stetson" ? 1.7 : 1.55;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * brimR, headR * brimR, headR * 0.08, 12), m);
    brim.position.y = headY + headR * 0.7;
    g.add(crown, brim);
  } else if (hat === "headset") {
    const band = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.05, headR * 0.08, 6, 12, Math.PI), m);
    band.rotation.z = Math.PI;
    band.position.y = headY + headR * 0.2;
    const cup = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.32, 8, 6), m);
    cup.position.set(-headR * 1.05, headY, 0);
    const cupR = cup.clone();
    cupR.position.x = headR * 1.05;
    g.add(band, cup, cupR);
  } else if (hat === "diver") {
    const mask = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.5, headR * 0.7, headR * 0.25), new THREE.MeshLambertMaterial({ color: 0x1b2a34 }));
    mask.position.set(0, headY + headR * 0.1, headR * 0.95);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.2, headR * 0.45, headR * 0.08), new THREE.MeshLambertMaterial({ color: 0x68bcc5, transparent: true, opacity: 0.55 }));
    glass.position.set(0, headY + headR * 0.1, headR * 1.08);
    const snork = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.1, headR * 0.1, headR * 1.4, 6), lamb(0xf5cd2f));
    snork.position.set(headR * 0.9, headY + headR * 0.9, headR * 0.4);
    g.add(mask, glass, snork);
  } else if (hat === "beret") {
    const disk = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), m);
    disk.scale.set(1.15, 0.45, 1.15);
    disk.position.set(-headR * 0.15, headY + headR * 0.85, 0);
    g.add(disk);
  } else if (hat === "beanie") {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), m);
    cap.position.y = headY + headR * 0.15;
    g.add(cap);
  } else if (hat === "nurse") {
    const band = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.6, headR * 0.35, headR * 0.12), m);
    band.position.set(0, headY + headR * 0.85, headR * 0.2);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.18, headR * 0.28, headR * 0.06), lamb(0xc91a09));
    cross.position.set(0, headY + headR * 0.85, headR * 0.28);
    g.add(band, cross);
  } else if (hat === "mirror") {
    const band = new THREE.Mesh(new THREE.BoxGeometry(headR * 2.0, headR * 0.16, headR * 0.1), m);
    band.position.set(0, headY + headR * 0.45, 0);
    const mir = new THREE.Mesh(new THREE.CircleGeometry(headR * 0.28, 10), lamb(0xdce6ee));
    mir.position.set(-headR * 0.55, headY + headR * 0.45, headR * 1.02);
    g.add(band, mir);
  }
}

export function defaultFigConfig() {
  return { preset: 0, head: 0, torso: 0, legs: 0, presetId: FIG_PRESETS[0].id };
}

export function figFromPreset(idOrIndex) {
  let i = typeof idOrIndex === "number"
    ? idOrIndex
    : FIG_PRESETS.findIndex((p) => p.id === idOrIndex);
  if (i < 0) i = 0;
  const p = FIG_PRESETS[i % FIG_PRESETS.length];
  return { preset: i, head: 0, torso: 0, legs: 0, presetId: p.id };
}

export function presetOf(cfg) {
  if (!cfg) return FIG_PRESETS[0];
  if (cfg.presetId) {
    const p = FIG_PRESETS.find((x) => x.id === cfg.presetId);
    if (p) return p;
  }
  if (cfg.preset != null && FIG_PRESETS[cfg.preset]) return FIG_PRESETS[cfg.preset];
  return null;
}

export function makeFig(cfg, ghost = false) {
  const preset = presetOf(cfg);
  const head = preset
    ? { skin: preset.skin, face: preset.face, name: preset.name }
    : FIG_HEADS[(cfg.head || 0) % FIG_HEADS.length];
  const torso = preset
    ? { col: preset.torso, accent: 0xffffff, name: preset.name }
    : FIG_TORSOS[(cfg.torso || 0) % FIG_TORSOS.length];
  const legs = preset
    ? { col: preset.legs, name: preset.name }
    : FIG_LEGS[(cfg.legs || 0) % FIG_LEGS.length];
  const g = new THREE.Group();
  const op = ghost ? 0.5 : 1;
  const hipH = PLATE * 4;
  const torsoH = PLATE * 3.2;
  const headR = STUD * 0.72;

  const hipBoxH = hipH * 0.5;
  const hip = new THREE.Mesh(new THREE.BoxGeometry(STUD * 1.62, hipBoxH, STUD * 0.92), lamb(legs.col));
  hip.position.y = hipH - hipBoxH * 0.28;
  g.add(hip);
  const legH = hipH * 0.9;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(STUD * 0.74, legH, STUD * 0.84), lamb(legs.col));
  const legR = legL.clone();
  legL.position.set(-STUD * 0.44, legH * 0.5, 0);
  legR.position.set(STUD * 0.44, legH * 0.5, 0);
  g.add(legL, legR);

  const bod = new THREE.Mesh(new THREE.BoxGeometry(STUD * 1.55, torsoH, STUD * 0.85), lamb(torso.col));
  bod.position.y = hipH + torsoH * 0.46;
  g.add(bod);
  const print = new THREE.Mesh(
    new THREE.PlaneGeometry(STUD * 1.35, torsoH * 0.92),
    new THREE.MeshLambertMaterial({ map: printTex(preset || { id: "plain", torso: torso.col }), transparent: false }),
  );
  print.position.set(0, hipH + torsoH * 0.48, STUD * 0.44);
  g.add(print);

  const armL = new THREE.Mesh(new THREE.CylinderGeometry(STUD * 0.22, STUD * 0.22, torsoH * 0.95, 6), lamb(torso.col));
  const armR = armL.clone();
  armL.position.set(-STUD * 1.05, hipH + torsoH * 0.4, 0);
  armR.position.set(STUD * 1.05, hipH + torsoH * 0.4, 0);
  g.add(armL, armR);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(STUD * 0.28, 6, 5), lamb(head.skin));
  const handR = handL.clone();
  handL.position.set(-STUD * 1.05, hipH + 0.002, 0);
  handR.position.set(STUD * 1.05, hipH + 0.002, 0);
  g.add(handL, handR);

  const hd = new THREE.Mesh(new THREE.CylinderGeometry(headR, headR, headR * 1.7, 10), lamb(head.skin));
  hd.position.y = hipH + torsoH + headR * 0.95;
  g.add(hd);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(headR * 1.6, headR * 1.6),
    new THREE.MeshBasicMaterial({ map: faceTex(head.face), transparent: true, depthWrite: false }),
  );
  face.position.set(0, hipH + torsoH + headR * 0.9, headR * 1.02);
  g.add(face);
  const stud = new THREE.Mesh(new THREE.CylinderGeometry(STUD * 0.3, STUD * 0.3, STUD * 0.2, 8), lamb(head.skin));
  stud.position.y = hipH + torsoH + headR * 1.7 + STUD * 0.1;
  g.add(stud);

  const headY = hipH + torsoH + headR * 0.95;
  if (preset) addHat(g, preset.hat, preset.hatCol, headY, headR, head.skin);

  if (ghost) {
    g.traverse((o) => {
      if (o.material) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = op;
      }
    });
  }
  g.userData.kind = "fig";
  g.userData.cfg = { ...cfg, presetId: preset?.id || cfg.presetId };
  g.userData.height = hipH + torsoH + headR * 1.9;
  return g;
}

export function figFootOffset() {
  return STUD * 0.15;
}

function pickRoomPoint(room) {
  const pad = STUD * 2;
  const xmin = Math.min(room.xmin, room.xmax);
  const xmax = Math.max(room.xmin, room.xmax);
  const zmin = Math.min(room.zmin, room.zmax);
  const zmax = Math.max(room.zmin, room.zmax);
  return new THREE.Vector3(
    THREE.MathUtils.lerp(xmin + pad, xmax - pad, Math.random()),
    0,
    THREE.MathUtils.lerp(zmin + pad, zmax - pad, Math.random()),
  );
}

const ROOM_ACTS = {
  kitchen: ["cook", "sink", "pace"],
  living: ["sit", "pace", "window"],
  bedroom: ["sleep", "pace", "sit"],
  bath: ["sink", "pace"],
  dining: ["eat", "sit", "pace"],
  garden: ["wander", "look"],
  workshop: ["build", "pace"],
};

export function tickFig(fig, dt, heightAt, wanderR, rooms) {
  const u = fig.userData;
  if (u.held) return;
  const s = u.baseScale || fig.scale.x || 1;
  u.baseScale = s;
  const meltK = u.melt ? Math.max(0.05, 1 - u.melt) : 1;
  const bobWalk = 1 + Math.sin((u.walkT || 0) * 8.2) * 0.04;
  const applyScale = (walk) => {
    const by = walk ? bobWalk : 1;
    fig.scale.set(s * meltK, s * by * meltK, s * meltK);
  };

  if (u.toss) {
    applyScale(false);
    return;
  }

  if (!u.spd) u.spd = STUD * (4.2 + Math.random() * 1.8) * Math.sqrt(Math.max(0.35, s));

  u.actT = (u.actT || 0) - dt;
  u.pauseT = Math.max(0, (u.pauseT || 0) - dt);
  u.walkT = (u.walkT || 0) + dt;

  if (rooms && rooms.length && u.actT <= 0) {
    u.room = rooms[Math.floor(Math.random() * rooms.length)];
    const acts = ROOM_ACTS[u.room.type] || ["pace"];
    u.act = acts[Math.floor(Math.random() * acts.length)];
    u.actT = 6 + Math.random() * 8;
    u.dest = pickRoomPoint(u.room);
    u.pauseT = 0.2 + Math.random() * 0.5;
    u.sit = false;
    u.sleep = false;
    fig.rotation.x = 0;
  }

  if (u.pauseT > 0) {
    const y = heightAt(fig.position.x, fig.position.z);
    fig.position.y = THREE.MathUtils.damp(fig.position.y, y, 8, dt);
    if (u.sit) fig.rotation.x = THREE.MathUtils.damp(fig.rotation.x, 0.55, 6, dt);
    else if (u.sleep) fig.rotation.x = THREE.MathUtils.damp(fig.rotation.x, 1.35, 4, dt);
    else {
      fig.rotation.x = THREE.MathUtils.damp(fig.rotation.x, 0, 8, dt);
      fig.rotation.y += Math.sin(u.walkT * 1.6) * 0.55 * dt;
    }
    applyScale(false);
    return;
  }

  if (u.dest && Math.hypot(u.dest.x - fig.position.x, u.dest.z - fig.position.z) < STUD * 1.1 * Math.max(1, Math.sqrt(s))) {
    const busy = u.act && u.act !== "pace" && u.act !== "wander";
    u.pauseT = busy ? 1.8 + Math.random() * 3.2 : 0.7 + Math.random() * 1.8;
    u.sit = u.act === "sit" || u.act === "eat";
    u.sleep = u.act === "sleep";
    u.dest = null;
    applyScale(false);
    return;
  }

  if (!u.dest) {
    if (u.room) {
      u.dest = pickRoomPoint(u.room);
    } else {
      const a = Math.random() * Math.PI * 2;
      const r = (0.2 + Math.random() * 0.75) * wanderR;
      const ox = u.origin?.x || 0;
      const oz = u.origin?.z || 0;
      u.dest = new THREE.Vector3(
        THREE.MathUtils.clamp(ox + Math.cos(a) * r, ox - wanderR, ox + wanderR),
        0,
        THREE.MathUtils.clamp(oz + Math.sin(a) * r, oz - wanderR, oz + wanderR),
      );
    }
    u.walkT = 0;
  }

  const pos = fig.position;
  const dx = u.dest.x - pos.x;
  const dz = u.dest.z - pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = pos.x + (dx / len) * u.spd * dt;
  const nz = pos.z + (dz / len) * u.spd * dt;
  const y0 = heightAt(pos.x, pos.z);
  const y1 = heightAt(nx, nz);
  const step = y1 - y0;
  const maxStep = PLATE * 2.8 * s;
  if (step <= maxStep && step >= -PLATE * 8 * s) {
    pos.x = nx;
    pos.z = nz;
    pos.y = THREE.MathUtils.damp(pos.y, y1, 8, dt);
    const wantY = Math.atan2(dx, dz);
    fig.rotation.y = THREE.MathUtils.damp(fig.rotation.y, wantY, 8, dt);
    fig.rotation.x = THREE.MathUtils.damp(fig.rotation.x, 0, 8, dt);
    applyScale(true);
  } else {
    u.dest = null;
    u.pauseT = 0.4 + Math.random() * 0.6;
    applyScale(false);
  }
}
