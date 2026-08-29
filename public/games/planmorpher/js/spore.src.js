/** Horde-style modular spore creatures for Planmorpher. */
import * as THREE from "three";

export const SLOT_N = 10;
export const LS_KEY = "planmorpher.spores.v1";
export const REL_KEY = "planmorpher.spore-rel.v1";

export const CIV_AGES = [
  { id: "paleo", name: "Paleolithic", wood: 3, stone: 0, food: 0, wall: 0x8a6a44, roof: 0x5a3a22, scale: 0.82, kind: "hut" },
  { id: "neo", name: "Neolithic", wood: 8, stone: 2, food: 2, wall: 0xc4b48a, roof: 0x6a4a28, scale: 1, kind: "hut" },
  { id: "bronze", name: "Bronze", wood: 14, stone: 8, food: 4, wall: 0xb08a4a, roof: 0x7a4a18, scale: 1.12, kind: "hall" },
  { id: "iron", name: "Iron", wood: 20, stone: 16, food: 6, wall: 0x6a6e74, roof: 0x3a3c42, scale: 1.22, kind: "hall" },
  { id: "medieval", name: "Medieval", wood: 30, stone: 24, food: 10, wall: 0x8a7a62, roof: 0x6a2424, scale: 1.38, kind: "keep" },
  { id: "industrial", name: "Industrial", wood: 44, stone: 38, food: 16, wall: 0x5a5e64, roof: 0x2a2c30, scale: 1.55, kind: "factory" },
  { id: "modern", name: "Modern", wood: 62, stone: 54, food: 24, wall: 0xc8d0d8, roof: 0x3a4a5a, scale: 1.85, kind: "tower" },
  { id: "sky", name: "Skyscraper", wood: 88, stone: 76, food: 36, wall: 0x9aa8b8, roof: 0x88ccee, scale: 2.5, kind: "sky" },
  { id: "jetson", name: "Orbital age", wood: 120, stone: 96, food: 52, wall: 0xd4e8f8, roof: 0xff66aa, scale: 2.9, kind: "needle" },
];

export const PART_FORMS = ["club", "tentacle", "wing", "bug", "spike"];
export const TORSO_KINDS = ["torso", "blob", "shell", "disk"];
export const HEAD_KINDS = ["sphere", "crystal", "disk", "horn"];
export const SPORE_COLORS = [0x88cc44, 0x44c8aa, 0xe85d4c, 0x4aa3ff, 0xf0c14a, 0xc86bff, 0xff8a3c, 0x9ee7ff, 0xd4af37, 0xff66aa];

function mat(hex, extra) {
  return new THREE.MeshLambertMaterial({ color: hex, ...extra });
}

export function emptyDna(i) {
  const col = SPORE_COLORS[i % SPORE_COLORS.length];
  return {
    id: i,
    name: "Spore " + (i + 1),
    col,
    torso: "torso",
    head: "sphere",
    arms: [
      { form: "club", col },
      { form: "club", col },
    ],
    legs: [
      { form: "bug", col },
      { form: "bug", col },
    ],
  };
}

export function randomDna(i) {
  const d = emptyDna(i);
  d.col = SPORE_COLORS[(Math.random() * SPORE_COLORS.length) | 0];
  d.torso = TORSO_KINDS[(Math.random() * TORSO_KINDS.length) | 0];
  d.head = HEAD_KINDS[(Math.random() * HEAD_KINDS.length) | 0];
  const nArms = 1 + ((Math.random() * 3) | 0);
  const nLegs = 2 + ((Math.random() * 3) | 0);
  d.arms = [];
  d.legs = [];
  for (let k = 0; k < nArms; k++) d.arms.push({ form: PART_FORMS[(Math.random() * PART_FORMS.length) | 0], col: d.col });
  for (let k = 0; k < nLegs; k++) d.legs.push({ form: PART_FORMS[(Math.random() * 4) | 0], col: d.col });
  return d;
}

export function loadSlots() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { raw = null; }
  const slots = [];
  for (let i = 0; i < SLOT_N; i++) slots.push(raw && raw[i] ? { ...emptyDna(i), ...raw[i], id: i } : emptyDna(i));
  return slots;
}

export function saveSlots(slots) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(slots)); } catch {}
}

export function loadRelations() {
  try { return JSON.parse(localStorage.getItem(REL_KEY) || "{}"); } catch { return {}; }
}
export function saveRelations(rel) {
  try { localStorage.setItem(REL_KEY, JSON.stringify(rel)); } catch {}
}
export function relKey(a, b) {
  return a < b ? a + ":" + b : b + ":" + a;
}
export function isWar(rel, a, b) {
  if (a === b) return false;
  return rel[relKey(a, b)] === "war";
}
export function setWar(rel, a, b, war) {
  if (a === b) return;
  const k = relKey(a, b);
  if (war) rel[k] = "war";
  else delete rel[k];
  saveRelations(rel);
}

export function makeLimb(form, col, asLeg) {
  const g = new THREE.Group();
  const c = col || 0x88cc44;
  let len = asLeg ? 0.085 : 0.07;
  let thick = 0.014;
  if (form === "wing") {
    len = 0.08;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(len * 1.2, thick * 0.5, len * 0.55), mat(c, { transparent: true, opacity: 0.88 }));
    mesh.position.set(len * 0.4, 0, 0);
    g.add(mesh);
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(thick * 0.3, thick * 0.18, len, 4), mat(c));
    rib.rotation.z = Math.PI / 2;
    rib.position.x = len * 0.3;
    g.add(rib);
  } else if (form === "tentacle") {
    len = 0.1;
    for (let s = 0; s < 4; s++) {
      const t = 1 - s / 4;
      const blob = new THREE.Mesh(new THREE.SphereGeometry(thick * (0.7 + t * 0.8), 6, 5), mat(c));
      blob.position.y = -len * ((s + 0.5) / 4);
      g.add(blob);
    }
  } else if (form === "bug") {
    len = 0.09;
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(thick * 1.1, thick * 0.7, len * 0.5, 5), mat(c));
    upper.position.y = -len * 0.22;
    upper.rotation.z = 0.4;
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(thick * 0.7, thick * 0.22, len * 0.5, 5), mat(c));
    lower.position.set(thick * 1.1, -len * 0.7, 0);
    lower.rotation.z = -0.5;
    g.add(upper, lower);
  } else if (form === "spike") {
    len = 0.09;
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(thick * 1.3, len, 5), mat(c, { emissive: 0x330000 }));
    mesh.position.y = -len * 0.5;
    g.add(mesh);
  } else {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(thick, Math.max(0.03, len - thick * 2), 3, 6), mat(c));
    mesh.position.y = -len * 0.5;
    g.add(mesh);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(thick * 0.9, 6, 4), mat(c));
    pad.position.y = -len;
    g.add(pad);
  }
  g.userData.form = form;
  g.userData.len = len;
  g.userData.asLeg = !!asLeg;
  return g;
}

function makeTorso(kind, col) {
  const g = new THREE.Group();
  const c = col || 0x88cc44;
  if (kind === "blob") g.add(new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), mat(c)));
  else if (kind === "shell") {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8, 0, Math.PI * 2, 0, 1.5), mat(c));
    a.scale.y = 0.55;
    g.add(a);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), mat(c)));
  } else if (kind === "disk") {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.022, 10), mat(c));
    g.add(d);
  } else {
    g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.04, 4, 8), mat(c)));
  }
  return g;
}

function makeHead(kind, col) {
  const g = new THREE.Group();
  const c = col || 0x88cc44;
  if (kind === "crystal") g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.022), mat(c, { emissive: c, emissiveIntensity: 0.25 })));
  else if (kind === "disk") g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 8), mat(c)));
  else if (kind === "horn") {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), mat(c)));
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 5), mat(c));
    h.position.y = 0.028;
    g.add(h);
  } else g.add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat(c)));
  return g;
}

export function makeCreatureMesh(dna, scale = 1) {
  const root = new THREE.Group();
  const col = dna.col || 0x88cc44;
  const torso = makeTorso(dna.torso || "torso", col);
  torso.name = "torso";
  root.add(torso);
  if (dna.head) {
    const h = makeHead(dna.head, col);
    h.position.y = 0.055;
    h.name = "head";
    root.add(h);
  }
  const legs = dna.legs || [];
  legs.forEach((p, i) => {
    const limb = makeLimb(p.form || "bug", p.col || col, true);
    const a = (i / Math.max(1, legs.length)) * Math.PI * 2 + 0.2;
    limb.position.set(Math.cos(a) * 0.028, -0.04, Math.sin(a) * 0.028);
    limb.rotation.x = 0.25;
    limb.name = "leg" + i;
    root.add(limb);
  });
  const arms = dna.arms || [];
  arms.forEach((p, i) => {
    const limb = makeLimb(p.form || "club", p.col || col, false);
    const side = i % 2 === 0 ? 1 : -1;
    const row = (i / 2) | 0;
    limb.position.set(side * 0.038, 0.012 - row * 0.018, 0);
    limb.rotation.z = side * -0.9;
    limb.name = "arm" + i;
    root.add(limb);
  });
  root.scale.setScalar(scale);
  root.userData.dna = dna;
  return root;
}

export function civBlank() {
  return { ageIndex: 0, stores: { wood: 0, stone: 0, food: 0, gold: 0 }, bonus: 0, score: 0 };
}

export function civScore(civ, pop, buildings) {
  return (buildings || 0) * 12 + (pop || 0) * 8 + ((civ.stores.wood + civ.stores.stone + civ.stores.food + (civ.stores.gold || 0)) | 0) + (civ.bonus | 0);
}

export function ageOf(civ) {
  return CIV_AGES[Math.max(0, Math.min(CIV_AGES.length - 1, civ.ageIndex | 0))];
}

function box(parent, m, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function buildCivMesh(age, entityScale) {
  const g = new THREE.Group();
  const s = (age.scale || 1) * (entityScale || 0.5);
  const wall = new THREE.MeshLambertMaterial({ color: age.wall });
  const roof = new THREE.MeshLambertMaterial({ color: age.roof });
  const kind = age.kind || "hut";
  if (kind === "needle") {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01 * s, 0.018 * s, 0.22 * s, 8), wall);
    stem.position.y = 0.11 * s;
    g.add(stem);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.05 * s, 0.018 * s, 12), roof);
    disc.position.y = 0.2 * s;
    g.add(disc);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.022 * s, 8, 6), roof);
    cap.position.y = 0.24 * s;
    g.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04 * s, 0.004 * s, 6, 14), wall);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.16 * s;
    g.add(ring);
  } else if (kind === "sky") {
    for (let i = 0; i < 3; i++) {
      const tw = 0.028 * s * (1 - i * 0.12);
      const fl = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.08 * s, tw), wall);
      fl.position.set((i - 1) * 0.034 * s, 0.05 * s + i * 0.01 * s, 0);
      g.add(fl);
    }
    const roofM = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.01 * s, 0.04 * s), roof);
    roofM.position.y = 0.12 * s;
    g.add(roofM);
  } else if (kind === "tower") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.1 * s, 0.04 * s), wall);
    body.position.y = 0.05 * s;
    g.add(body);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.046 * s, 0.01 * s, 0.046 * s), roof);
    r.position.y = 0.106 * s;
    g.add(r);
  } else if (kind === "factory") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s, 0.045 * s, 0.05 * s), wall);
    body.position.y = 0.024 * s;
    g.add(body);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.01 * s, 0.07 * s, 6), wall);
    stack.position.set(0.02 * s, 0.06 * s, 0);
    g.add(stack);
  } else if (kind === "keep") {
    const keep = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.07 * s, 0.05 * s), wall);
    keep.position.y = 0.036 * s;
    g.add(keep);
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.038 * s, 0.04 * s, 4), roof);
    r.position.y = 0.09 * s;
    g.add(r);
  } else {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.028 * s, 0.032 * s, 0.04 * s, kind === "hall" ? 8 : 5), wall);
    cyl.position.y = 0.02 * s;
    g.add(cyl);
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.04 * s, 6), roof);
    r.position.y = 0.05 * s;
    g.add(r);
  }
  g.userData.kind = "hut";
  g.userData.ageId = age.id;
  return g;
}

export function modelScout(col) {
  const g = new THREE.Group();
  const hull = mat(col || 0x3ecf8e);
  const dark = mat(0x1a1e24);
  const glow = mat(0x66f0ff, { emissive: 0x66f0ff, emissiveIntensity: 0.6 });
  box(g, hull, 0, 0, 0.04, 0.08, 0.05, 0.28);
  box(g, dark, 0, 0.01, 0.14, 0.06, 0.03, 0.08);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), hull);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.22;
  g.add(nose);
  box(g, hull, 0.09, 0, -0.02, 0.16, 0.012, 0.05);
  box(g, hull, -0.09, 0, -0.02, 0.16, 0.012, 0.05);
  box(g, glow, 0.04, 0, -0.16, 0.03, 0.03, 0.06);
  box(g, glow, -0.04, 0, -0.16, 0.03, 0.03, 0.06);
  g.userData.kind = "scout";
  return g;
}

export function modelSettler(col) {
  const g = new THREE.Group();
  const hull = mat(col || 0xf0c14a);
  const metal = mat(0x8a9098);
  const glow = mat(0xffc070, { emissive: 0xffaa44, emissiveIntensity: 0.45 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), hull);
  body.scale.set(1, 0.7, 1.35);
  g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 6, 14), metal);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  box(g, metal, -0.08, -0.1, 0.04, 0.02, 0.1, 0.02);
  box(g, metal, 0.08, -0.1, 0.04, 0.02, 0.1, 0.02);
  box(g, glow, 0, 0.02, -0.16, 0.08, 0.05, 0.07);
  g.userData.kind = "settler";
  return g;
}

export function dnaIsAquatic(dna) {
  if (!dna) return false;
  if (dna.torso === "blob") return true;
  const parts = [...(dna.arms || []), ...(dna.legs || [])];
  return parts.some((p) => p && p.form === "tentacle");
}

export function modelTemple(col) {
  const g = new THREE.Group();
  const stone = mat(0xc4b48a);
  const gold = mat(col || 0xd4af37, { emissive: col || 0xd4af37, emissiveIntensity: 0.2 });
  const dark = mat(0x5a4a38);
  for (let i = 0; i < 4; i++) {
    const w = 0.24 - i * 0.04;
    const step = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, w), stone);
    step.position.y = 0.015 + i * 0.028;
    g.add(step);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const colm = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.16, 6), stone);
    colm.position.set(Math.cos(a) * 0.075, 0.22, Math.sin(a) * 0.075);
    g.add(colm);
  }
  const hall = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.09, 10), dark);
  hall.position.y = 0.2;
  g.add(hall);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), gold);
  dome.position.y = 0.29;
  g.add(dome);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 6), gold);
  spire.position.y = 0.38;
  g.add(spire);
  g.userData.kind = "temple";
  return g;
}

export function labelCanvas(text, w = 220, h = 48) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(8,10,16,0.88)";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#e8e4d8";
  g.font = "bold 18px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
