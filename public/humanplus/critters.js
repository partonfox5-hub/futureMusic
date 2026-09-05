import * as THREE from "three";
import { summonTone, attackTone, eatTone, petTone, portalTone } from "./audio.js";

export const HEADS = ["chicken","ostrich","bear","turtle","beaver","cat","dog","tiger","bunny","frog","pig","duck","fox","owl","mouse","lizard"];
export const TORSOS = ["round","long","chubby","slim","shell","fluffy","barrel"];
export const LEGS = ["stubby","long","bird","paws","hoof","flipper"];
export const SIZES = ["tiny","small","medium","large","huge"];
export const PALETTE = [0x3aaa4a,0xf48ab0,0xf0c44a,0x4a88d4,0xe07a32,0x9b59b6,0xe74c3c,0x1abc9c,0x8d6e63,0xff8c42];

export const FOOD = [
  { id:"apple", name:"Apple", color:0xd43b32, hint:"Nibbit, pig, chicken, pipkin" },
  { id:"cookie", name:"Cookie", color:0xc48a3a, hint:"Almost every pet" },
  { id:"fish", name:"Fish", color:0x88c4e0, hint:"Cat, tiger, bear, owl, sparkle" },
  { id:"cupcake", name:"Cupcake", color:0xf4a0c4, hint:"Fluffo, sparkle, pipkin" },
  { id:"carrot", name:"Carrot", color:0xe07a32, hint:"Bunny, turtle, beaver, ostrich" },
  { id:"bone", name:"Bone", color:0xf4f1ea, hint:"Dog, fox, tiger, grumble" },
  { id:"berry", name:"Berry", color:0x7a3aad, hint:"Mouse, owl, frog, duck" },
  { id:"cheese", name:"Cheese", color:0xf0c44a, hint:"Mouse, dog, pig, beaver" },
];

export const PETS = [
  { id:"nibbit", name:"Nibbit", color:0x3aaa4a, likes:["cookie","apple","berry"], blurb:"Leaf hopper. Loves cookies." },
  { id:"fluffo", name:"Fluffo", color:0xf48ab0, likes:["cupcake","cookie"], blurb:"Round puff. Sits near you." },
  { id:"sparkle", name:"Sparkle", color:0xf0c44a, likes:["cookie","fish","cupcake"], blurb:"Sunny cat. Chases pals." },
  { id:"grumble", name:"Grumble", color:0x4a88d4, likes:["fish","bone","cheese"], blurb:"Blue grouch. Wants snacks." },
  { id:"pipkin", name:"Pipkin", color:0xe07a32, likes:["apple","cupcake","cookie"], blurb:"Orange fox. Proud." },
  { id:"chicken", name:"Chicken", color:0xf0c44a, likes:["cookie","apple"], blurb:"Peck attack." },
  { id:"ostrich", name:"Ostrich", color:0xc4a06a, likes:["apple","carrot"], blurb:"Tall kicker." },
  { id:"bear", name:"Bear", color:0x8d6e63, likes:["fish","cookie","berry"], blurb:"Swipe. Round ears." },
  { id:"turtle", name:"Turtle", color:0x5a8a4a, likes:["carrot","apple"], blurb:"Shell bash." },
  { id:"beaver", name:"Beaver", color:0x6a4a32, likes:["apple","carrot","cheese"], blurb:"Tail slap." },
  { id:"cat", name:"Cat", color:0xe07a32, likes:["fish","cupcake"], blurb:"Scratch." },
  { id:"dog", name:"Dog", color:0xd4a05a, likes:["bone","cookie","cheese"], blurb:"Bite. Floppy ears." },
  { id:"tiger", name:"Tiger", color:0xe07a32, likes:["fish","bone"], blurb:"Pounce." },
  { id:"bunny", name:"Bunny", color:0xf4e0d0, likes:["carrot","apple"], blurb:"Hop kick." },
  { id:"frog", name:"Frog", color:0x3aaa4a, likes:["cookie","fish","berry"], blurb:"Tongue shot." },
  { id:"pig", name:"Pig", color:0xf4a0b0, likes:["cookie","apple","cheese"], blurb:"Charge." },
  { id:"duck", name:"Duck", color:0xf0c44a, likes:["cookie","fish","berry"], blurb:"Wing buffet." },
  { id:"fox", name:"Fox", color:0xe07a32, likes:["cookie","bone"], blurb:"Snap." },
  { id:"owl", name:"Owl", color:0x8d6e63, likes:["fish","cookie","berry"], blurb:"Swoop." },
  { id:"mouse", name:"Mouse", color:0xc4b8aa, likes:["cookie","apple","cheese","berry"], blurb:"Nibble." },
  { id:"lizard", name:"Lizard", color:0x3aaa4a, likes:["cookie","fish"], blurb:"Tail whip." },
];

export const HATS = [
  { id:"tophat", name:"Top hat", color:0x1a1a1e },
  { id:"party", name:"Party hat", color:0xe04a88 },
  { id:"flower", name:"Flower crown", color:0x88cc55 },
  { id:"crown", name:"Tiny crown", color:0xd4af37 },
];

const SIZEV = { tiny:0.45, small:0.7, medium:1, large:1.4, huge:1.9 };
export function sizeVal(s) { return SIZEV[s] || 1; }

function mat(hex, opts={}) {
  return new THREE.MeshStandardMaterial({
    color: hex, roughness: opts.rough ?? 0.55, metalness: 0,
    transparent: !!opts.alpha, opacity: opts.alpha ?? 1, emissive: opts.emit || 0,
    emissiveIntensity: opts.emit ? 0.6 : 0,
  });
}
function add(parent, geo, hex, pos, scale, rot, opts) {
  const m = new THREE.Mesh(geo, mat(hex, opts));
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = false;
  parent.add(m);
  return m;
}

const sph = new THREE.SphereGeometry(0.5, 12, 10);
const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const cap = new THREE.CapsuleGeometry(0.35, 0.5, 4, 8);

export function ofSpecies(head) {
  const p = PETS.find((x) => x.id === head) || PETS[0];
  const g = { name: p.name, head, torso:"round", legs:"paws", legCount:4, arms:"none", tail:"bushy", size:1, color:p.color, accent:0x3a2a18, likes:p.likes, dark:false };
  const map = {
    chicken:{ torso:"round", legs:"bird", legCount:2, arms:"wings", tail:"bird", size:0.8 },
    ostrich:{ torso:"long", legs:"bird", legCount:2, arms:"wings", tail:"bird", size:1.55 },
    bear:{ torso:"chubby", legs:"paws", legCount:4, arms:"short", tail:"bushy", size:1.25 },
    turtle:{ torso:"shell", legs:"stubby", legCount:4, tail:"none", size:0.9 },
    beaver:{ torso:"barrel", legs:"stubby", legCount:4, arms:"short", tail:"paddle", size:1 },
    cat:{ torso:"slim", legs:"paws", tail:"curly", size:0.82 },
    dog:{ torso:"round", legs:"paws", tail:"bushy", size:1 },
    tiger:{ torso:"long", legs:"paws", tail:"bushy", size:1.22 },
    bunny:{ torso:"fluffy", legs:"stubby", legCount:2, tail:"bushy", size:0.72 },
    frog:{ torso:"round", legs:"stubby", legCount:2, arms:"short", tail:"none", size:0.68 },
    pig:{ torso:"chubby", legs:"stubby", tail:"curly", size:0.95 },
    duck:{ torso:"round", legs:"bird", legCount:2, arms:"wings", tail:"bird", size:0.76 },
    fox:{ torso:"slim", legs:"paws", tail:"bushy", size:0.9 },
    owl:{ torso:"round", legs:"bird", legCount:2, arms:"wings", tail:"none", size:0.85 },
    mouse:{ torso:"round", legs:"paws", tail:"curly", size:0.5 },
    lizard:{ torso:"long", legs:"stubby", tail:"dino", size:1.05 },
  };
  Object.assign(g, map[head] || {});
  return g;
}

export function customGene(parts) {
  const base = ofSpecies(parts.head || "cat");
  return Object.assign(base, {
    name: parts.name || ("Custom " + base.name),
    torso: parts.torso || base.torso,
    legs: parts.legs || base.legs,
    legCount: parts.legCount || base.legCount || 4,
    arms: parts.arms || base.arms,
    tail: parts.tail || base.tail,
    size: typeof parts.size === "number" ? parts.size : sizeVal(parts.size || "medium") * (base.size || 1),
    color: parts.color ?? base.color,
    accent: parts.accent ?? base.accent,
    likes: base.likes,
    dark: false,
  });
}

function headMesh(g, c, a, dark) {
  const h = new THREE.Group();
  h.name = "head";
  const eye = dark ? 0xff3048 : 0x111111;
  if (g.head === "ostrich") {
    add(h, cyl, c, [0, -0.08, 0.02], [0.05, 0.22, 0.05], [0.2, 0, 0]);
    add(h, sph, c, [0, 0.06, 0.05], [0.14, 0.14, 0.14]);
    add(h, box, a, [0, 0.04, 0.12], [0.04, 0.03, 0.08], [0.2, 0, 0]);
  } else if (g.head === "chicken" || g.head === "duck") {
    add(h, sph, c, [0, 0, 0], [0.16, 0.16, 0.16]);
    add(h, box, 0xf0c44a, [0, -0.02, 0.1], [0.05, 0.03, g.head === "duck" ? 0.1 : 0.07], [0.2, 0, 0]);
    if (g.head === "chicken") {
      add(h, box, 0xc43b32, [0, 0.1, 0], [0.02, 0.07, 0.05]);
      add(h, sph, 0xc43b32, [0, -0.05, 0.06], [0.04, 0.04, 0.04]);
    }
  } else if (g.head === "bear") {
    add(h, sph, c, [0, 0, 0], [0.2, 0.2, 0.2]);
    add(h, sph, c, [0, -0.02, 0.08], [0.1, 0.08, 0.08]);
    add(h, sph, c, [-0.08, 0.1, 0], [0.07, 0.07, 0.07]);
    add(h, sph, c, [0.08, 0.1, 0], [0.07, 0.07, 0.07]);
  } else if (g.head === "cat" || g.head === "tiger" || g.head === "fox") {
    add(h, sph, c, [0, 0, 0], [0.16, 0.16, 0.16]);
    add(h, sph, c, [0, -0.02, 0.08], [0.07, 0.05, 0.09]);
    add(h, box, c, [-0.06, 0.1, 0], [0.05, 0.09, 0.03], [0, 0, 0.3]);
    add(h, box, c, [0.06, 0.1, 0], [0.05, 0.09, 0.03], [0, 0, -0.3]);
    if (g.head === "tiger") {
      add(h, box, a, [-0.04, 0.02, 0.05], [0.02, 0.08, 0.02]);
      add(h, box, a, [0.04, 0.02, 0.05], [0.02, 0.08, 0.02]);
    }
  } else if (g.head === "dog") {
    add(h, sph, c, [0, 0, 0], [0.16, 0.16, 0.16]);
    add(h, cap, c, [0, -0.02, 0.09], [0.12, 0.1, 0.16], [Math.PI / 2, 0, 0]);
    add(h, box, a, [-0.08, 0.02, 0], [0.04, 0.1, 0.02], [0, 0, 0.4]);
    add(h, box, a, [0.08, 0.02, 0], [0.04, 0.1, 0.02], [0, 0, -0.4]);
  } else if (g.head === "bunny") {
    add(h, sph, c, [0, 0, 0], [0.15, 0.15, 0.15]);
    add(h, box, c, [-0.04, 0.14, 0], [0.035, 0.16, 0.03]);
    add(h, box, c, [0.04, 0.14, 0], [0.035, 0.16, 0.03]);
  } else if (g.head === "frog") {
    add(h, sph, c, [0, 0, 0], [0.2, 0.12, 0.18]);
    add(h, sph, c, [-0.07, 0.07, 0.05], [0.08, 0.08, 0.08]);
    add(h, sph, c, [0.07, 0.07, 0.05], [0.08, 0.08, 0.08]);
  } else if (g.head === "turtle") {
    add(h, sph, c, [0, 0, 0], [0.13, 0.1, 0.15]);
    add(h, box, a, [0, -0.01, 0.1], [0.05, 0.03, 0.06], [0.2, 0, 0]);
  } else if (g.head === "owl") {
    add(h, sph, c, [0, 0, 0], [0.2, 0.18, 0.18]);
    add(h, sph, 0xf4f1ea, [-0.05, 0.02, 0.08], [0.08, 0.08, 0.08]);
    add(h, sph, 0xf4f1ea, [0.05, 0.02, 0.08], [0.08, 0.08, 0.08]);
    add(h, box, 0xf0c44a, [0, -0.02, 0.11], [0.04, 0.03, 0.05]);
  } else {
    add(h, sph, c, [0, 0, 0], [0.16, 0.16, 0.16]);
    if (g.head === "pig") add(h, cyl, 0xf4a0b0, [0, -0.01, 0.09], [0.08, 0.04, 0.08], [Math.PI / 2, 0, 0]);
    if (g.head === "beaver") {
      add(h, box, 0xf4f1ea, [-0.02, -0.04, 0.08], [0.02, 0.04, 0.02]);
      add(h, box, 0xf4f1ea, [0.02, -0.04, 0.08], [0.02, 0.04, 0.02]);
    }
    if (g.head === "mouse") {
      add(h, sph, 0xf48ab0, [-0.07, 0.05, 0], [0.07, 0.07, 0.07]);
      add(h, sph, 0xf48ab0, [0.07, 0.05, 0], [0.07, 0.07, 0.07]);
    }
  }
  add(h, sph, eye, [-0.04, 0.03, 0.07], [0.035, 0.035, 0.035], null, { emit: dark ? 0xff2030 : 0 });
  add(h, sph, eye, [0.04, 0.03, 0.07], [0.035, 0.035, 0.035], null, { emit: dark ? 0xff2030 : 0 });
  if (dark) {
    add(h, box, a, [-0.05, 0.11, 0], [0.03, 0.08, 0.03]);
    add(h, box, a, [0.05, 0.11, 0], [0.03, 0.08, 0.03]);
  }
  return h;
}

export function assemble(g) {
  const root = new THREE.Group();
  const c = g.color;
  const a = g.accent || 0x3a2a18;
  const dark = !!g.dark;
  const col = dark ? 0x1a1020 : c;
  const acc = dark ? 0xc43050 : a;
  const body = new THREE.Group();
  body.position.y = 0.14;
  if (g.torso === "chubby") add(body, sph, col, [0, 0, 0], [0.28, 0.2, 0.26]);
  else if (g.torso === "slim") add(body, cap, col, [0, 0, 0], [0.18, 0.22, 0.18]);
  else if (g.torso === "long") add(body, cap, col, [0, 0, 0], [0.16, 0.28, 0.22]);
  else if (g.torso === "shell") {
    add(body, sph, col, [0, 0, 0], [0.18, 0.12, 0.2]);
    add(body, sph, acc, [0, 0.04, -0.02], [0.22, 0.14, 0.24]);
  } else if (g.torso === "fluffy") add(body, sph, col, [0, 0, 0], [0.26, 0.26, 0.26]);
  else if (g.torso === "barrel") add(body, cyl, col, [0, 0, 0], [0.22, 0.16, 0.22]);
  else add(body, sph, col, [0, 0, 0], [0.2, 0.16, 0.2]);
  root.add(body);
  const hd = headMesh(g, col, acc, dark);
  hd.position.set(0, 0.28, 0.04);
  root.add(hd);
  const nLegs = Math.max(2, g.legCount || 4);
  for (let i = 0; i < nLegs; i++) {
    const x = (i % 2 === 0 ? -1 : 1) * 0.07;
    const z = nLegs <= 2 ? 0.02 : (i < 2 ? 0.06 : -0.06);
    const leg = new THREE.Group();
    leg.position.set(x, 0.1, z);
    if (g.legs === "bird") add(leg, cyl, acc, [0, -0.06, 0], [0.025, 0.12, 0.025]);
    else add(leg, sph, col, [0, -0.05, 0], [0.06, 0.08, 0.06]);
    root.add(leg);
  }
  if (g.arms === "wings") {
    add(body, box, col, [-0.14, 0.04, 0], [0.12, 0.02, 0.08]);
    add(body, box, col, [0.14, 0.04, 0], [0.12, 0.02, 0.08]);
  } else if (g.arms === "short" || dark) {
    add(body, cap, col, [-0.12, -0.02, 0.02], [0.08, 0.1, 0.08]);
    add(body, cap, col, [0.12, -0.02, 0.02], [0.08, 0.1, 0.08]);
  }
  if (g.tail === "bushy") add(body, sph, acc, [0, -0.02, -0.14], [0.08, 0.08, 0.14]);
  else if (g.tail === "paddle") add(body, box, acc, [0, -0.04, -0.14], [0.12, 0.02, 0.12]);
  else if (g.tail && g.tail !== "none") add(body, cap, acc, [0, -0.02, -0.14], [0.06, 0.06, 0.16], [Math.PI / 2, 0, 0]);
  if (dark) {
    for (let i = 0; i < 4; i++) add(body, box, acc, [(i - 1.5) * 0.04, 0.1, -0.02], [0.02, 0.08, 0.02]);
  }
  const s = sizeVal(typeof g.size === "string" ? g.size : null) * (typeof g.size === "number" ? g.size : 1);
  root.scale.setScalar(0.55 * (typeof g.size === "number" ? g.size : s));
  return { root, head: hd, height: 0.32 * root.scale.y };
}

export function buildFood(id) {
  const g = new THREE.Group();
  g.userData.kind = "food";
  g.userData.id = id;
  if (id === "apple") {
    add(g, sph, 0xd43b32, [0, 0.04, 0], [0.08, 0.08, 0.08]);
    add(g, cyl, 0x3a5a28, [0, 0.09, 0], [0.012, 0.04, 0.012]);
  } else if (id === "cookie") add(g, cyl, 0xc48a3a, [0, 0.02, 0], [0.09, 0.025, 0.09]);
  else if (id === "fish") {
    add(g, cap, 0x88c4e0, [0, 0.03, 0], [0.05, 0.04, 0.12], [Math.PI / 2, 0, 0]);
    add(g, box, 0x88c4e0, [0, 0.03, -0.07], [0.01, 0.07, 0.05]);
  } else if (id === "cupcake") {
    add(g, cyl, 0xc48a6a, [0, 0.03, 0], [0.06, 0.04, 0.06]);
    add(g, sph, 0xf4a0c4, [0, 0.07, 0], [0.08, 0.06, 0.08]);
  } else if (id === "carrot") {
    add(g, cyl, 0xe07a32, [0, 0.05, 0], [0.035, 0.1, 0.035], [0.3, 0, 0]);
    add(g, sph, 0x3aaa4a, [0, 0.11, 0], [0.04, 0.04, 0.04]);
  } else if (id === "berry") {
    add(g, sph, 0x7a3aad, [0, 0.04, 0], [0.07, 0.07, 0.07]);
    add(g, sph, 0x5a1a7a, [-0.02, 0.05, 0.02], [0.04, 0.04, 0.04]);
    add(g, cyl, 0x3a5a28, [0, 0.08, 0], [0.01, 0.03, 0.01]);
  } else if (id === "cheese") {
    add(g, box, 0xf0c44a, [0, 0.035, 0], [0.1, 0.05, 0.08]);
    add(g, sph, 0xe0b43a, [-0.02, 0.04, 0.02], [0.03, 0.03, 0.03]);
  } else {
    add(g, cap, 0xf4f1ea, [0, 0.03, 0], [0.04, 0.03, 0.1], [Math.PI / 2, 0, 0]);
    add(g, sph, 0xf4f1ea, [0, 0.03, 0.07], [0.05, 0.05, 0.05]);
    add(g, sph, 0xf4f1ea, [0, 0.03, -0.07], [0.05, 0.05, 0.05]);
  }
  const sh = add(g, sph, 0x000000, [0, 0.002, 0], [0.1, 0.01, 0.1], null, { alpha: 0.28 });
  sh.material.depthWrite = false;
  g.userData.shadow = sh;
  return g;
}

export function buildHat(id) {
  const g = new THREE.Group();
  if (id === "tophat") {
    add(g, cyl, 0x1a1a1e, [0, 0.02, 0], [0.14, 0.02, 0.14]);
    add(g, cyl, 0x1a1a1e, [0, 0.08, 0], [0.08, 0.08, 0.08]);
  } else if (id === "party") add(g, cyl, 0xe04a88, [0, 0.06, 0], [0.02, 0.1, 0.1]);
  else if (id === "flower") {
    add(g, cyl, 0x3aaa4a, [0, 0.01, 0], [0.1, 0.015, 0.1]);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.256;
      add(g, sph, 0x88cc55, [Math.cos(a) * 0.06, 0.03, Math.sin(a) * 0.06], [0.04, 0.04, 0.04]);
    }
  } else {
    add(g, cyl, 0xd4af37, [0, 0.04, 0], [0.1, 0.04, 0.1]);
    add(g, box, 0xffe08a, [0, 0.09, 0], [0.04, 0.05, 0.04]);
  }
  return g;
}

export function buildPortal() {
  const g = new THREE.Group();
  const core = add(g, sph, 0x1a0820, [0, 0.55, 0], [0.32, 0.32, 0.32], null, { alpha: 0.85, emit: 0x5511aa });
  const ring = add(g, cyl, 0x7a20aa, [0, 0.55, 0], [0.5, 0.04, 0.5], [Math.PI / 2, 0, 0], { emit: 0x8822cc });
  g.userData.core = core;
  g.userData.ring = ring;
  g.userData.kind = "portal";
  g.userData.hp = 12;
  g.userData.spawn = 1.2;
  portalTone();
  return g;
}

export function randomDark() {
  const head = HEADS[(Math.random() * HEADS.length) | 0];
  const g = ofSpecies(head);
  g.dark = true;
  g.color = [0x1a1020, 0x2a0a18, 0x0e0e14, 0x241028][(Math.random() * 4) | 0];
  g.accent = 0x8a2040;
  g.name = "Dark " + g.name;
  g.arms = Math.random() < 0.5 ? "claws" : g.arms;
  g.tail = Math.random() < 0.4 ? "spike" : g.tail;
  g.likes = [];
  return g;
}

export const pets = [];
export const foods = [];
export const hats = [];
export const portals = [];
export const horde = [];
export const fx = [];

export function spawnPet(g, pos, scene) {
  const built = assemble(g);
  built.root.position.copy(pos);
  built.root.position.y = 0.02;
  scene.add(built.root);
  const pet = {
    g, ...built, hp: g.dark ? 7 : 10, mood: 0.6, goal: pos.clone(),
    think: Math.random(), flee: 0, atk: 0, eat: 0, petting: 0, hop: 0,
    vy: 0, likes: g.likes || [], dark: !!g.dark, alive: true,
  };
  (g.dark ? horde : pets).push(pet);
  summonTone(g.dark ? "horde" : g.head);
  return pet;
}

export function applyHat(pet, id) {
  if (!pet || !pet.head) return;
  if (pet.hat) pet.head.remove(pet.hat);
  const h = buildHat(id);
  h.position.set(0, 0.12, 0);
  pet.head.add(h);
  pet.hat = h;
}

export function spawnFood(id, pos, scene) {
  const m = buildFood(id);
  m.position.copy(pos);
  if (pos.y < 0.18) m.position.y = 0.35;
  scene.add(m);
  const f = {
    id, mesh: m,
    vy: 0.15, vx: (Math.random() - 0.5) * 0.35, vz: (Math.random() - 0.5) * 0.35,
    r: 0.045, alive: true, life: 120, spin: (Math.random() - 0.5) * 4, grounded: false,
  };
  foods.push(f);
  return f;
}

export function spawnPortal(pos, scene) {
  const m = buildPortal();
  m.position.set(pos.x, 0, pos.z);
  scene.add(m);
  portals.push(m);
  return m;
}

function floaty(tex) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(0.12, 0.12, 1);
  return s;
}

let heartTex, smileTex;
function makeEmoji(draw) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 64, 64);
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}
function ensureEmoji() {
  if (heartTex) return;
  heartTex = makeEmoji((g) => {
    g.fillStyle = "#ff4d6d";
    g.beginPath();
    g.moveTo(32, 54);
    g.bezierCurveTo(10, 38, 8, 18, 32, 22);
    g.bezierCurveTo(56, 18, 54, 38, 32, 54);
    g.fill();
  });
  smileTex = makeEmoji((g) => {
    g.fillStyle = "#ffd24a";
    g.beginPath(); g.arc(32, 32, 24, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#222";
    g.beginPath(); g.arc(24, 26, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(40, 26, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(32, 34, 12, 0.15, Math.PI - 0.15); g.strokeStyle = "#222"; g.lineWidth = 3; g.stroke();
  });
}

export function emitPetFx(pet, scene) {
  ensureEmoji();
  petTone();
  for (let i = 0; i < 3; i++) {
    const s = floaty(i % 2 ? heartTex : smileTex);
    const p = pet.root.position;
    s.position.set(p.x + (Math.random() - 0.5) * 0.1, p.y + pet.height + 0.08, p.z);
    s.userData.life = 0.7 + Math.random() * 0.3;
    s.userData.vy = 0.45 + Math.random() * 0.2;
    scene.add(s);
    fx.push(s);
  }
}

function nearestFood(pet) {
  let best = null, bd = 4;
  for (const f of foods) {
    if (!f.alive) continue;
    const d = pet.root.position.distanceTo(f.mesh.position);
    const pref = pet.likes.includes(f.id) ? 0.45 : 1;
    const w = d * pref;
    if (w < bd) { bd = w; best = f; }
  }
  return best;
}

function nearestFoe(pet) {
  const list = pet.dark ? pets : horde;
  let best = null, bd = 5;
  for (const o of list) {
    if (!o.alive) continue;
    const d = pet.root.position.distanceTo(o.root.position);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

export function rallyPets(origin, radius) {
  for (const p of pets) {
    if (!p.alive) continue;
    if (p.root.position.distanceTo(origin) < 8) {
      p.goal.copy(origin);
      p.goal.x += (Math.random() - 0.5) * radius;
      p.goal.z += (Math.random() - 0.5) * radius;
      p.think = 2.2;
      p.flee = 0;
    }
  }
}

export function strokePet(handPos, handVel, scene) {
  let did = false;
  for (const p of pets) {
    if (!p.alive) continue;
    const top = p.root.position.clone();
    top.y += p.height * 0.85;
    if (handPos.distanceTo(top) > 0.2) continue;
    if (handVel < 0.05) continue;
    p.petting = 0.55;
    p.mood = Math.min(1, p.mood + 0.05);
    if (Math.random() < 0.5) emitPetFx(p, scene);
    did = true;
  }
  return did;
}

export function hurt(target, dmg) {
  if (!target || !target.alive) return;
  target.hp -= dmg;
  if (target.hp > 0) return;
  target.alive = false;
  target.root.parent && target.root.parent.remove(target.root);
}

export function shootRay(origin, dir, scene) {
  const ray = new THREE.Raycaster(origin, dir, 0.05, 12);
  const hits = [];
  for (const p of portals) hits.push(p);
  for (const h of horde) if (h.alive) hits.push(h.root);
  const rec = ray.intersectObjects(hits, true);
  if (!rec.length) return null;
  const obj = rec[0].object;
  let cur = obj;
  while (cur) {
    if (cur.userData && cur.userData.kind === "portal") {
      cur.userData.hp -= 3;
      if (cur.userData.hp <= 0) {
        scene.remove(cur);
        const i = portals.indexOf(cur);
        if (i >= 0) portals.splice(i, 1);
      }
      return rec[0].point;
    }
    cur = cur.parent;
  }
  for (const h of horde) {
    if (!h.alive) continue;
    if (obj === h.root || h.root.getObjectById(obj.id)) {
      hurt(h, 3);
      attackTone("horde");
      return rec[0].point;
    }
  }
  return rec[0].point;
}

export function tickWorld(dt, ctx) {
  const { scene, playerPos, miraPos } = ctx;
  const groundY = ctx.floorY ?? 0;
  for (const f of foods) {
    if (!f.alive) continue;
    f.vy -= 9.8 * dt;
    f.mesh.position.x += f.vx * dt;
    f.mesh.position.z += f.vz * dt;
    f.mesh.position.y += f.vy * dt;
    f.mesh.rotation.y += f.spin * dt;
    const rest = groundY + f.r;
    if (f.mesh.position.y <= rest) {
      f.mesh.position.y = rest;
      if (f.vy < -0.55) {
        f.vy = -f.vy * 0.28;
        f.spin *= 0.6;
      } else {
        f.vy = 0;
        f.grounded = true;
      }
      f.vx *= 0.78;
      f.vz *= 0.78;
      f.spin *= 0.85;
      if (Math.abs(f.vx) < 0.03) f.vx = 0;
      if (Math.abs(f.vz) < 0.03) f.vz = 0;
      if (Math.abs(f.spin) < 0.2) f.spin = 0;
    }
    f.life -= dt;
    if (f.life <= 0) { f.alive = false; scene.remove(f.mesh); }
  }
  for (let i = foods.length - 1; i >= 0; i--) if (!foods[i].alive) foods.splice(i, 1);

  for (const p of [...pets, ...horde]) {
    if (!p.alive) continue;
    p.think -= dt; p.flee = Math.max(0, p.flee - dt); p.atk = Math.max(0, p.atk - dt);
    p.eat = Math.max(0, p.eat - dt); p.petting = Math.max(0, p.petting - dt);
    const pos = p.root.position;
    const foe = nearestFoe(p);
    const food = p.dark ? null : nearestFood(p);
    if (p.dark) {
      const prey = foe || { root: { position: miraPos || playerPos } };
      p.goal.copy(prey.root ? prey.root.position : prey);
    } else if (p.petting > 0) {
      /* stay */
    } else if (foe && pos.distanceTo(foe.root.position) < 4.2) p.goal.copy(foe.root.position);
    else if (food && pos.distanceTo(food.mesh.position) < 3.8) p.goal.copy(food.mesh.position);
    else if (p.think <= 0) {
      p.think = 1.4 + Math.random() * 2;
      p.goal.set(pos.x + (Math.random() - 0.5) * 2.2, 0, pos.z + (Math.random() - 0.5) * 2.2);
    }
    const to = p.goal.clone().sub(pos); to.y = 0;
    const dist = to.length();
    const spd = (p.dark ? 0.85 : 0.55 + p.mood * 0.25) * (p.eat > 0 ? 0.15 : 1) * (p.petting > 0 ? 0.05 : 1);
    if (dist > 0.08 && p.petting <= 0) {
      to.normalize();
      pos.addScaledVector(to, spd * dt);
      p.root.rotation.y = Math.atan2(to.x, to.z);
    }
    p.hop += dt * (8 + spd * 10);
    pos.y = groundY + 0.02 + Math.abs(Math.sin(p.hop)) * (p.g.head === "bunny" ? 0.06 : 0.03);
    if (!p.dark && food && pos.distanceTo(food.mesh.position) < 0.22 && food.alive) {
      const liked = p.likes.includes(food.id);
      p.mood = Math.min(1, p.mood + (liked ? 0.3 : 0.1));
      p.hp = Math.min(10, p.hp + (liked ? 2 : 0.6));
      p.eat = liked ? 0.5 : 0.25;
      food.alive = false;
      scene.remove(food.mesh);
      eatTone();
    }
    if (!p.alive) continue;
    if (foe && p.atk <= 0 && pos.distanceTo(foe.root.position) < 0.55) {
      p.atk = p.g.head === "cat" ? 0.5 : 1.1;
      hurt(foe, p.dark ? 1.1 : 1.6);
      attackTone(p.dark ? "horde" : p.g.head);
    } else if (p.dark && p.atk <= 0 && miraPos && pos.distanceTo(miraPos) < 0.55) {
      p.atk = 1.1;
      attackTone("horde");
      if (ctx.onHitMira) ctx.onHitMira(1);
    }
  }

  for (const portal of portals) {
    portal.userData.spawn -= dt;
    portal.userData.ring.rotation.y += dt * 1.6;
    const s = 0.28 + Math.sin(performance.now() * 0.004) * 0.03;
    portal.userData.core.scale.setScalar(s / 0.32);
    if (portal.userData.spawn <= 0) {
      portal.userData.spawn = 3.4 + Math.random();
      if (horde.filter((h) => h.alive).length < 8) {
        const pos = portal.position.clone();
        pos.x += (Math.random() - 0.5) * 0.4;
        pos.z += (Math.random() - 0.5) * 0.4;
        spawnPet(randomDark(), pos, scene);
      }
    }
  }

  for (let i = fx.length - 1; i >= 0; i--) {
    const s = fx[i];
    s.userData.life -= dt;
    s.position.y += s.userData.vy * dt;
    s.material.opacity = Math.max(0, s.userData.life);
    if (s.userData.life <= 0) { scene.remove(s); fx.splice(i, 1); }
  }
}
