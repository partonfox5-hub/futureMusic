/**
 * Fenrest living world: grass fields, dinosaurs, turtles, furniture,
 * harvestable trees/ore, pushable boulders, chessboards.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";
import { heightAt, inSettlement, CHUNK, keepAboveGround } from "/games/fenrest/test-h3n8q5wm/js/world-grid.js?v=town1";
import { restoreFlash, tickDeath, startDeath } from "/games/fenrest/test-h3n8q5wm/js/vr-hands.js?v=town1";

const SHEET4 = /^(wolf|dragon|bandit|human|woman|guard|innkeeper|lizard|lizardfolk)\.png$/i;

const SPR = "/games/fenrest/sprites/";
const TEX = {};
function spr(file, unique) {
  if (!TEX[file]) {
    const t = new THREE.TextureLoader().load(SPR + file, (tex) => {
      if (SHEET4.test(file)) {
        tex.repeat.set(0.25, 0.25);
        tex.offset.set(0, 0.75);
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
      }
    });
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = SHEET4.test(file) ? THREE.NearestFilter : THREE.LinearFilter;
    t.minFilter = t.magFilter;
    if (SHEET4.test(file)) {
      t.repeat.set(0.25, 0.25);
      t.offset.set(0, 0.75);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    }
    TEX[file] = t;
  }
  if (unique && SHEET4.test(file)) {
    const c = TEX[file].clone();
    c.repeat.set(0.25, 0.25);
    c.offset.set(0, 0.75);
    c.wrapS = c.wrapT = THREE.ClampToEdgeWrapping;
    c.needsUpdate = true;
    return c;
  }
  return TEX[file];
}

function billboard(map, w, h) {
  const m = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, color: 0xffffff }),
  );
  m.scale.set(w, h, 1);
  return m;
}

function stepSheet(sprite, dt, moving, dx, dz) {
  const map = sprite.material?.map;
  const u = sprite.userData;
  if (!map || !u?.sheet) return;
  u.animT = (u.animT || 0) + dt * (moving ? 8 : 2.2);
  const frame = Math.floor(u.animT) % 4;
  let row = 2;
  if (Math.abs(dx) > Math.abs(dz)) row = dx < 0 ? 1 : 2;
  else row = dz > 0 ? 0 : 3;
  map.repeat.set(0.25, 0.25);
  map.offset.set(frame * 0.25, 0.75 - row * 0.25);
}

function bobBeast(sprite, dt, moving) {
  const u = sprite.userData;
  u.walkT = (u.walkT || 0) + dt * (moving ? 6.4 : 1.7);
  const amp = moving ? 0.09 : 0.03;
  u.bob = Math.sin(u.walkT) * amp;
  if (sprite.material) sprite.material.rotation = Math.sin(u.walkT * 0.5) * (moving ? 0.12 : 0.04);
  const s = 1 + Math.sin(u.walkT * 2) * (moving ? 0.045 : 0.015);
  sprite.scale.x = (u.baseW || sprite.scale.x) * s;
}

function oakMat() {
  return new THREE.MeshBasicMaterial({ color: 0x6a4424 });
}
function leafMat() {
  return new THREE.MeshBasicMaterial({ color: 0x3a6a28 });
}
function stoneMat(c = 0x6a6860) {
  return new THREE.MeshBasicMaterial({ color: c });
}

function burst(root, list, x, y, z, color, n = 10, speed = 2.4) {
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color }));
    p.position.set(x, y, z);
    p.userData = {
      debris: true,
      vx: (Math.random() - 0.5) * speed,
      vy: 1.2 + Math.random() * 2.2,
      vz: (Math.random() - 0.5) * speed,
      life: 0.7 + Math.random() * 0.5,
    };
    root.add(p);
    list.push(p);
  }
}

function addResource(store, id, n) {
  try {
    store?.getState?.().addItem?.(id, n);
  } catch {}
}

export function installLife({ root, store, loot, foes, heightAt: hAt }) {
  if (window.__FENREST_LIFE__) return window.__FENREST_LIFE__;
  const height = hAt || heightAt;
  if (!foes) foes = window.__FENREST_FOES__ || [];
  if (window.__FENREST_FOES__ && foes !== window.__FENREST_FOES__) {
    const extra = foes;
    foes = window.__FENREST_FOES__;
    for (const f of extra) if (!foes.includes(f)) foes.push(f);
  } else {
    window.__FENREST_FOES__ = foes;
  }
  const grass = [];
  const turtles = [];
  const shells = [];
  const beasts = [];
  const furniture = [];
  const boulders = [];
  const trees = [];
  const ores = [];
  const boards = [];
  const debris = [];
  const npcs = [];
  const grab = [];
  const hitables = [];
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const scattered = new Set();

  function placeSprite(file, x, z, w, h, parent = root, unique = false) {
    const s = billboard(spr(file, unique), w, h);
    s.position.set(x, height(x, z) + h * 0.5, z);
    parent.add(s);
    return s;
  }

  function spawnGrassField(cx, cz, count = 28, spread = 16, parent = root) {
    for (let i = 0; i < count; i++) {
      const x = cx + (Math.random() - 0.5) * spread;
      const z = cz + (Math.random() - 0.5) * spread;
      if (inSettlement(x, z)) continue;
      const g = placeSprite("grass-tall.png", x, z, 1.4 + Math.random() * 0.6, 1.8 + Math.random() * 0.7, parent);
      g.userData = {
        kind: "grass",
        cut: false,
        phase: Math.random() * 6.28,
        baseH: g.scale.y,
      };
      grass.push(g);
      hitables.push(g);
    }
  }

  function cutGrass(g, tool) {
    if (!g || g.userData.cut) return;
    const sharp = tool?.sharp || tool?.tool === "axe" || String(tool?.defId || "").startsWith("sword") || String(tool?.defId || "").startsWith("spear");
    if (tool && !sharp && tool.tool !== "axe") {
      /* still allowed — any swing that reached here from melee path already filtered by grass kind */
    }
    g.userData.cut = true;
    g.material = new THREE.SpriteMaterial({ map: spr("grass-cut.png"), transparent: true, depthWrite: false });
    g.scale.y = g.userData.baseH * 0.28;
    g.position.y = height(g.position.x, g.position.z) + g.scale.y * 0.4;
    burst(root, debris, g.position.x, g.position.y + 0.4, g.position.z, 0x6aaa3a, 14, 3.2);
    addResource(store, "fiber", 1);
    store?.getState?.().setHud?.({ prompt: "Cut grass" });
  }

  function spawnTurtle(x, z) {
    const s = placeSprite("turtle.png", x, z, 1.1, 1.0);
    s.userData = {
      kind: "turtle",
      lifeBeast: true,
      hp: 2,
      maxHp: 2,
      wander: Math.random() * 6.28,
      spd: 0.7 + Math.random() * 0.4,
      t: Math.random() * 8,
      vy: 0,
      hitR: 1.15,
      hitH: 1.1,
    };
    turtles.push(s);
    foes.push(s);
    hitables.push(s);
    return s;
  }

  function stompTurtle(t, head) {
    if (!t.visible || t.userData.kind !== "turtle") return;
    t.visible = false;
    const sh = placeSprite("turtle-shell.png", t.position.x, t.position.z, 0.9, 0.7);
    const ang = Math.random() * Math.PI * 2;
    const spd = 6 + Math.random() * 4;
    sh.userData = {
      kind: "shell",
      vx: Math.cos(ang) * spd,
      vz: Math.sin(ang) * spd,
      life: 8,
    };
    shells.push(sh);
    hitables.push(sh);
    store?.getState?.().setHud?.({ prompt: "Shell skip!" });
    burst(root, debris, t.position.x, t.position.y, t.position.z, 0xd4a050, 6, 2);
  }

  function spawnBeast(kind, x, z, parent) {
    const def = {
      trex: { file: "trex.png", w: 3.6, h: 3.2, hp: 22, spd: 2.2, dmg: 0.16, aggro: 14, humanoid: false },
      raptor: { file: "raptor.png", w: 1.8, h: 1.4, hp: 8, spd: 4.4, dmg: 0.09, aggro: 11, humanoid: false },
      mammoth: { file: "mammoth.png", w: 3.4, h: 2.6, hp: 28, spd: 1.6, dmg: 0.12, aggro: 7, humanoid: false },
      wolf: { file: "wolf.png", w: 1.2, h: 2.1, hp: 3, spd: 4.2, dmg: 0.06, aggro: 12, humanoid: false },
      dragon: { file: "dragon.png", w: 2.4, h: 2.1, hp: 16, spd: 3.4, dmg: 0.18, aggro: 16, humanoid: false },
    }[kind];
    if (!def) return null;
    const s = placeSprite(def.file, x, z, def.w, def.h, parent || root, true);
    s.userData = {
      foe: true,
      kind,
      lifeBeast: true,
      sheet: SHEET4.test(def.file),
      def: { id: kind, spd: def.spd, dmg: def.dmg, spell: null },
      hp: def.hp,
      maxHp: def.hp,
      cool: 0,
      stamina: 1,
      lower: 1,
      humanoid: false,
      wander: Math.random() * 6.28,
      aggro: def.aggro,
      flash: 0,
      stagger: 0,
      vy: 0,
      baseH: def.h,
      baseW: def.w,
      _baseColor: 0xffffff,
      hitR: Math.max(1.35, def.w * 0.62),
      hitH: Math.max(1.4, def.h * 0.78),
    };
    beasts.push(s);
    foes.push(s);
    hitables.push(s);
    return s;
  }

  function makeTree(x, z, parent = root) {
    const g = new THREE.Group();
    const y0 = height(x, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.4, 6), oakMat());
    trunk.position.y = 1.2;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.15, 8, 6), leafMat());
    crown.position.y = 2.6;
    g.add(trunk, crown);
    g.position.set(x, y0, z);
    g.userData = { harvest: "tree", hp: 8, maxHp: 8, label: "oak", wood: 3 };
    parent.add(g);
    trees.push(g);
    hitables.push(g);
    return g;
  }

  function makeBoulder(x, z, ore) {
    const g = new THREE.Group();
    const y0 = height(x, z);
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(ore ? 0.7 : 0.85, 0),
      stoneMat(ore ? 0x8a6a40 : 0x6a6860),
    );
    rock.position.y = ore ? 0.55 : 0.6;
    g.add(rock);
    if (ore) {
      const vein = billboard(spr("ore-vein.png"), 1.3, 1.3);
      vein.position.y = 0.7;
      g.add(vein);
    }
    g.position.set(x, y0, z);
    g.userData = {
      harvest: ore ? "ore" : "boulder",
      pushable: true,
      hp: ore ? 10 : 12,
      maxHp: ore ? 10 : 12,
      mass: ore ? 2.2 : 3.4,
      vx: 0,
      vz: 0,
      label: ore ? "ore vein" : "boulder",
    };
    root.add(g);
    (ore ? ores : boulders).push(g);
    grab.push(g);
    hitables.push(g);
    return g;
  }

  function makeChair(x, z) {
    const g = new THREE.Group();
    const y0 = height(x, z);
    const wood = oakMat();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), wood);
    seat.position.y = 0.46;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.08), wood);
    back.position.set(0, 0.85, -0.24);
    for (const [sx, sz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.07), wood);
      leg.position.set(sx, 0.23, sz);
      g.add(leg);
    }
    g.add(seat, back);
    g.position.set(x, y0, z);
    g.userData = { breakable: true, kind: "furniture", label: "chair", hp: 3, parts: g.children.slice() };
    root.add(g);
    furniture.push(g);
    grab.push(g);
    hitables.push(g);
    return g;
  }

  function makeTable(x, z) {
    const g = new THREE.Group();
    const y0 = height(x, z);
    const wood = oakMat();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.7), wood);
    top.position.y = 0.74;
    g.add(top);
    for (const [sx, sz] of [[-0.5, -0.26], [0.5, -0.26], [-0.5, 0.26], [0.5, 0.26]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.08), wood);
      leg.position.set(sx, 0.37, sz);
      g.add(leg);
    }
    g.position.set(x, y0, z);
    g.userData = { breakable: true, kind: "furniture", label: "table", hp: 5, parts: g.children.slice() };
    root.add(g);
    furniture.push(g);
    grab.push(g);
    hitables.push(g);
    return g;
  }

  function makeCrate(x, z) {
    const g = new THREE.Group();
    const y0 = height(x, z);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), oakMat());
    box.position.y = 0.35;
    g.add(box);
    g.position.set(x, y0, z);
    g.userData = { breakable: true, kind: "furniture", label: "crate", hp: 4, parts: g.children.slice() };
    root.add(g);
    furniture.push(g);
    grab.push(g);
    hitables.push(g);
    return g;
  }

  function fracture(obj) {
    if (obj.userData.broken) return;
    obj.userData.broken = true;
    const parts = obj.userData.parts || obj.children.slice();
    parts.forEach((p) => {
      const w = new THREE.Vector3();
      p.getWorldPosition(w);
      obj.remove(p);
      root.add(p);
      p.position.copy(w);
      p.userData = {
        debris: true,
        vx: (Math.random() - 0.5) * 3.2,
        vy: 1.4 + Math.random() * 2,
        vz: (Math.random() - 0.5) * 3.2,
        rx: (Math.random() - 0.5) * 6,
        rz: (Math.random() - 0.5) * 6,
        life: 3.5,
      };
      debris.push(p);
    });
    obj.visible = false;
    burst(root, debris, obj.position.x, obj.position.y + 0.5, obj.position.z, 0x8a6a40, 8, 2.6);
    store?.getState?.().setHud?.({ prompt: "Smashed " + (obj.userData.label || "prop") });
  }

  function harvest(obj, tool, at, speed) {
    if (!obj?.userData?.harvest) return;
    const kind = obj.userData.harvest;
    const right =
      (kind === "tree" && tool?.tool === "axe") ||
      (kind === "ore" && tool?.tool === "pick") ||
      (kind === "boulder" && (tool?.tool === "pick" || tool?.tool === "axe"));
    const dmg = right ? 2.4 + speed * 0.4 : 0.7 + speed * 0.15;
    obj.userData.hp -= dmg;
    const col = kind === "tree" ? 0x5a3a18 : 0x8a8a80;
    burst(root, debris, obj.position.x, obj.position.y + 1.1, obj.position.z, col, right ? 12 : 5, right ? 3.4 : 1.6);
    store?.getState?.().setHud?.({
      prompt: (right ? "Good strike" : "Wrong tool — slow work") + " · " + kind,
    });
    if (obj.userData.hp <= 0) {
      obj.visible = false;
      if (kind === "tree") addResource(store, "wood", obj.userData.wood || 3);
      if (kind === "ore") {
        addResource(store, "ore-copper", 2);
        addResource(store, "ore-gold", 1);
      }
      if (kind === "boulder") addResource(store, "stone", 3);
      burst(root, debris, obj.position.x, obj.position.y + 1, obj.position.z, col, 16, 4);
    }
  }

  function makeBoard(x, z) {
    const g = new THREE.Group();
    const y0 = height(x, z);
    const wood = oakMat();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.4), wood);
    top.position.y = 0.72;
    g.add(top);
    const light = new THREE.MeshBasicMaterial({ color: 0xe8dcc0 });
    const dark = new THREE.MeshBasicMaterial({ color: 0x5a3a18 });
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const sq = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.15), (i + j) % 2 ? dark : light);
        sq.position.set(-0.52 + i * 0.15, 0.77, -0.52 + j * 0.15);
        g.add(sq);
      }
    }
    for (const [sx, sz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.1), wood);
      leg.position.set(sx, 0.36, sz);
      g.add(leg);
    }
    g.position.set(x, y0, z);
    g.userData = { kind: "chessboard", label: "creature chess" };
    root.add(g);
    boards.push(g);
    return g;
  }

  function spawnNpc(def, x, z) {
    const s = billboard(spr(def.file, true), 1.15, 2.05);
    s.position.set(x, height(x, z) + 1.02, z);
    const ear = canvasIcon("ear");
    const spk = canvasIcon("speak");
    ear.scale.set(0.28, 0.28, 1);
    spk.scale.set(0.32, 0.32, 1);
    ear.position.set(0.45, 1.15, 0);
    spk.position.set(0.45, 1.15, 0);
    ear.visible = false;
    spk.visible = false;
    s.add(ear, spk);
    s.userData = {
      npc: true,
      kind: "npc",
      foe: false,
      species: def.species,
      name: def.name,
      role: def.role,
      lore: def.lore,
      ear,
      speak: spk,
      listening: false,
      talking: false,
      follow: false,
      chess: false,
      hp: 10,
      maxHp: 10,
      stamina: 1,
      lower: 1,
      flash: 0,
      stagger: 0,
      humanoid: true,
      sheet: SHEET4.test(def.file),
      vy: 0,
      baseH: 2.05,
      baseW: 1.15,
      _baseColor: 0xffffff,
      hitR: 1.35,
      hitH: 1.55,
    };
    root.add(s);
    npcs.push(s);
    hitables.push(s);
    return s;
  }

  function canvasIcon(kind) {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d");
    g.clearRect(0, 0, 64, 64);
    if (kind === "ear") {
      g.fillStyle = "#f0c8a0";
      g.beginPath();
      g.ellipse(32, 32, 14, 22, 0.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#e0a070";
      g.beginPath();
      g.ellipse(34, 32, 7, 14, 0.3, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = "#d4b070";
      g.fillRect(12, 22, 16, 20);
      g.beginPath();
      g.moveTo(28, 22);
      g.lineTo(48, 10);
      g.lineTo(48, 54);
      g.lineTo(28, 42);
      g.closePath();
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  }

  // Seed world around Fenrest
  spawnGrassField(8, 14, 36, 22);
  spawnGrassField(-16, 10, 28, 18);
  spawnGrassField(18, -12, 22, 16);
  spawnGrassField(-6, 22, 20, 14);
  for (let i = 0; i < 6; i++) spawnTurtle(-10 + i * 4, 16 + (i % 3) * 3);
  spawnBeast("trex", 62, -48);
  spawnBeast("trex", -58, 52);
  spawnBeast("raptor", 54, 44);
  spawnBeast("raptor", 58, 50);
  spawnBeast("raptor", -52, -46);
  spawnBeast("mammoth", -64, 28);
  spawnBeast("mammoth", 70, 22);
  spawnBeast("wolf", 48, -38);
  spawnBeast("wolf", -50, 36);
  spawnBeast("wolf", 52, 32);
  spawnBeast("wolf", -56, -28);
  spawnBeast("dragon", 78, -56);
  spawnBeast("dragon", -72, 58);
  spawnBeast("raptor", 66, 8);
  spawnBeast("raptor", 50, 8);
  spawnBeast("raptor", -8, 50);
  spawnBeast("trex", -68, -54);
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * 6.28;
    const r = 50 + Math.random() * 28;
    const tx = Math.cos(a) * r;
    const tz = Math.sin(a) * r + 6;
    if (inSettlement(tx, tz)) continue;
    makeTree(tx, tz);
  }
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + Math.random() * 0.15;
    const r = 40 + Math.random() * 40;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (inSettlement(x, z)) continue;
    makeTree(x, z);
  }
  spawnGrassField(48, 36, 22, 18);
  spawnGrassField(-44, -28, 20, 16);
  spawnGrassField(8, 62, 18, 14);
  spawnGrassField(-56, 22, 16, 14);
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * 6.28;
    const r = 8 + Math.random() * 22;
    makeBoulder(Math.cos(a) * r + 4, Math.sin(a) * r - 4, false);
  }
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * 6.28;
    makeBoulder(Math.cos(a) * 18, Math.sin(a) * 18 + 8, true);
  }
  makeChair(-2.4, 3.2);
  makeChair(-1.4, 3.4);
  makeTable(-1.9, 2.4);
  makeCrate(2.2, 1.8);
  makeCrate(2.8, 2.1);
  makeBoard(4.5, 6.2);
  makeBoard(-7.5, 4.0);
  spawnNpc(
    { file: "innkeeper.png", name: "Mira Reed", role: "innkeeper", species: "human", lore: "Keeps the Fenrest hearth and knows every traveler's story." },
    -18,
    -14.5,
  );
  spawnNpc(
    { file: "guard.png", name: "Calder Voss", role: "watchman", species: "human", lore: "Walks the palisade at dusk. Suspicious of raptors and of poets." },
    18,
    8.4,
  );
  spawnNpc(
    { file: "woman.png", name: "Sela Hayward", role: "herder", species: "human", lore: "Tends sheep on the crown fields and plays creature chess in the square." },
    16,
    -16,
  );
  spawnNpc(
    { file: "human.png", name: "Bram Mill", role: "woodcutter", species: "human", lore: "Sells oak and advice. Prefers an axe to a sermon." },
    16,
    -4,
  );
  spawnNpc(
    { file: "lizard.png", name: "Issk", role: "marsh scout", species: "lizardfolk", lore: "Marsh tongue. Hunts reed-eels." },
    -6,
    18,
  );

  function hash32(n) {
    n |= 0;
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    return (n ^ (n >>> 16)) >>> 0;
  }

  function scatterChunk(cx, cz, info) {
    const key = cx + "," + cz;
    if (scattered.has(key)) return;
    scattered.add(key);
    const ox = info?.origin?.x ?? cx * CHUNK;
    const oz = info?.origin?.z ?? cz * CHUNK;
    const parent = info?.group || root;
    const mx = ox + CHUNK / 2;
    const mz = oz + CHUNK / 2;
    if (Math.hypot(mx, mz) < 32) return;
    let seed = hash32(cx * 73856093 ^ cz * 19349663);
    const rng = () => {
      seed = hash32(seed + 1);
      return seed / 4294967296;
    };
    const nTrees = 6 + ((rng() * 6) | 0);
    for (let i = 0; i < nTrees; i++) {
      const x = ox + 10 + rng() * (CHUNK - 20);
      const z = oz + 10 + rng() * (CHUNK - 20);
      if (inSettlement(x, z)) continue;
      if (Math.hypot(x, z) < 38) continue;
      makeTree(x, z, parent);
    }
    if (rng() > 0.35) {
      spawnGrassField(ox + CHUNK * 0.35 + rng() * CHUNK * 0.3, oz + CHUNK * 0.35 + rng() * CHUNK * 0.3, 12, 14, parent);
    }
  }

  function pruneScatter() {
    const drop = (arr) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (!arr[i].parent) arr.splice(i, 1);
      }
    };
    drop(trees);
    drop(grass);
    drop(hitables);
    drop(grab);
    for (let i = foes.length - 1; i >= 0; i--) {
      if (!foes[i].parent && foes[i].userData?.lifeBeast) foes.splice(i, 1);
    }
  }

  window.__FENREST_GRABBABLES__ = grab;
  window.__FENREST_HITABLES__ = hitables;
  window.__FENREST_CHESSBOARDS__ = boards;
  window.__FENREST_NPCS__ = npcs;
  window.__FENREST_ON_GRASS__ = (g, tool) => cutGrass(g, tool);
  window.__FENREST_ON_HARVEST__ = (obj, tool, at, speed) => harvest(obj, tool, at, speed);
  window.__FENREST_ON_BREAK__ = (obj) => {
    obj.userData.hp = (obj.userData.hp || 1) - 1;
    burst(root, debris, obj.position.x, obj.position.y + 0.4, obj.position.z, 0x8a6a40, 6, 2);
    if (obj.userData.hp <= 0) fracture(obj);
  };
  window.__FENREST_ON_X__ = (gp) => {
    let best = null;
    let bd = 1.6;
    for (const b of boards) {
      const d = Math.hypot(b.position.x - gp.x, b.position.z - gp.z);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    if (!best) return;
    const npc = npcs.find((n) => n.userData.chess || n.userData.follow);
    const q = new URLSearchParams({
      from: "fenrest",
      vr: "1",
      npc: npc?.userData?.name || "",
      role: npc?.userData?.role || "",
      species: npc?.userData?.species || "human",
    });
    sessionStorage.setItem(
      "fm-chess-npc",
      JSON.stringify({
        name: npc?.userData?.name || "",
        role: npc?.userData?.role || "",
        species: npc?.userData?.species || "human",
        lore: npc?.userData?.lore || "",
      }),
    );
    const gl = window.__FENREST_GL__;
    import("/games/shared/vr-warp.js").then((m) => m.warpAfterXr(gl, "/games/fenrest-chess/?from=fenrest&vr=1&" + q.toString()));
  };

  function tickDebris(dt) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const p = debris[i];
      const u = p.userData;
      u.life -= dt;
      u.vy -= 12 * dt;
      p.position.x += u.vx * dt;
      p.position.y += u.vy * dt;
      p.position.z += u.vz * dt;
      if (u.rx) p.rotation.x += u.rx * dt;
      if (u.rz) p.rotation.z += u.rz * dt;
      if (u.life <= 0 || p.position.y < height(p.position.x, p.position.z) - 0.4) {
        root.remove(p);
        debris.splice(i, 1);
      }
    }
  }

  function pushBoulders(head, dt) {
    for (const b of boulders) {
      if (!b.visible || b.userData.held) continue;
      const dx = b.position.x - head.x;
      const dz = b.position.z - head.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < 1.15) {
        const push = (1.15 - d) * 4.2;
        b.userData.vx += (dx / d) * push * dt * 8;
        b.userData.vz += (dz / d) * push * dt * 8;
      }
      const hands = window.__FENREST_HANDS__;
      if (hands?.grip) {
        for (const g of hands.grip) {
          g.getWorldPosition(tmp);
          const hd = Math.hypot(b.position.x - tmp.x, b.position.z - tmp.z);
          if (hd < 0.7) {
            b.userData.vx += (b.position.x - tmp.x) * dt * 18;
            b.userData.vz += (b.position.z - tmp.z) * dt * 18;
          }
        }
      }
      b.userData.vx *= 1 - dt * 2.4;
      b.userData.vz *= 1 - dt * 2.4;
      b.position.x += b.userData.vx * dt;
      b.position.z += b.userData.vz * dt;
      keepAboveGround(b, dt, 0.05, 22);
    }
  }

  function tick(dt, ctx) {
    const head = ctx?.head || window.__FENREST_HEAD__ || { x: 0, y: 1.6, z: 0 };
    const t = performance.now() * 0.001;
    for (const g of grass) {
      if (g.userData.cut) continue;
      g.material.rotation = Math.sin(t * 1.7 + g.userData.phase) * 0.22;
    }
    for (const tu of turtles) {
      if (!tu.visible) continue;
      const u = tu.userData;
      u.t -= dt;
      if (u.t <= 0) {
        u.wander = Math.random() * 6.28;
        u.t = 2 + Math.random() * 4;
      }
      tu.position.x += Math.cos(u.wander) * u.spd * dt;
      tu.position.z += Math.sin(u.wander) * u.spd * dt;
      keepAboveGround(tu, dt, tu.scale.y * 0.45, 16);
      const dx = head.x - tu.position.x;
      const dz = head.z - tu.position.z;
      const horiz = Math.hypot(dx, dz);
      const above = head.y > tu.position.y + 0.35;
      if (horiz < 0.7 && above) stompTurtle(tu, head);
    }
    for (let i = shells.length - 1; i >= 0; i--) {
      const sh = shells[i];
      const u = sh.userData;
      sh.position.x += u.vx * dt;
      sh.position.z += u.vz * dt;
      sh.position.y = height(sh.position.x, sh.position.z) + 0.35;
      u.life -= dt;
      sh.material.rotation += dt * 8;
      let hit = false;
      for (const o of [...furniture, ...boulders, ...trees]) {
        if (!o.visible) continue;
        if (Math.hypot(o.position.x - sh.position.x, o.position.z - sh.position.z) < 0.9) {
          hit = true;
          if (o.userData.breakable) fracture(o);
          burst(root, debris, sh.position.x, sh.position.y, sh.position.z, 0xc4a050, 10, 3);
          break;
        }
      }
      if (hit || u.life <= 0) {
        root.remove(sh);
        shells.splice(i, 1);
      }
    }
    for (const b of beasts) {
      if (!b.visible) continue;
      const u = b.userData;
      u.hitCool = Math.max(0, (u.hitCool || 0) - dt);
      if (u.hp <= 0 && !u.dying && !u.dead) startDeath(b);
      if (u.dying) {
        tickDeath(b, dt, height);
        continue;
      }
      restoreFlash(b, dt);
      const dx = head.x - b.position.x;
      const dz = head.z - b.position.z;
      const d = Math.hypot(dx, dz) || 1;
      let moving = false;
      let mx = 0;
      let mz = 0;
      if (u.stagger > 0) {
        u.stagger -= dt;
        b.position.x += (u.kx || 0) * dt;
        b.position.z += (u.kz || 0) * dt;
        mx = u.kx || 0;
        mz = u.kz || 0;
        moving = true;
      } else if (d < u.aggro) {
        const spd = (u.def?.spd ?? 2) * (u.lower ?? 1);
        mx = (dx / d) * spd;
        mz = (dz / d) * spd;
        b.position.x += mx * dt;
        b.position.z += mz * dt;
        moving = true;
        u.cool = (u.cool || 0) - dt;
        if (d < 2.1 && u.cool <= 0) {
          u.cool = 1.1;
          const st = store?.getState?.();
          if (st) store.getState().setHud({ hp: Math.max(0, (st.hp ?? 1) - (u.def?.dmg ?? 0.08)) });
        }
      } else {
        u.wander += dt * 0.4;
        mx = Math.cos(u.wander) * 0.5;
        mz = Math.sin(u.wander) * 0.5;
        b.position.x += mx * dt;
        b.position.z += mz * dt;
        moving = true;
      }
      if (u.sheet) stepSheet(b, dt, moving, mx, mz);
      else bobBeast(b, dt, moving);
      keepAboveGround(b, dt, (u.baseH || b.scale.y) * 0.48 + (u.bob || 0), 20);
    }
    for (const n of npcs) {
      if (!n.visible) continue;
      const nu = n.userData;
      nu.hitCool = Math.max(0, (nu.hitCool || 0) - dt);
      if (nu.hp <= 0 && !nu.dying && !nu.dead) startDeath(n);
      if (nu.dying) {
        tickDeath(n, dt, height);
        continue;
      }
      restoreFlash(n, dt);
      if (nu.stagger > 0) {
        nu.stagger -= dt;
        n.position.x += (nu.kx || 0) * dt;
        n.position.z += (nu.kz || 0) * dt;
        nu.kx = (nu.kx || 0) * (1 - dt * 3);
        nu.kz = (nu.kz || 0) * (1 - dt * 3);
      }
      if (n.userData.follow) {
        const dx = head.x - n.position.x;
        const dz = head.z - n.position.z;
        const d = Math.hypot(dx, dz) || 1;
        if (d > 1.6) {
          n.position.x += (dx / d) * 2.4 * dt;
          n.position.z += (dz / d) * 2.4 * dt;
        }
        if (n.userData.chess) {
          let nearest = boards[0];
          let bd = 1e9;
          for (const b of boards) {
            const dd = Math.hypot(b.position.x - n.position.x, b.position.z - n.position.z);
            if (dd < bd) {
              bd = dd;
              nearest = b;
            }
          }
          if (nearest && bd > 1.4) {
            const dx2 = nearest.position.x - n.position.x;
            const dz2 = nearest.position.z - n.position.z;
            const d2 = Math.hypot(dx2, dz2) || 1;
            n.position.x += (dx2 / d2) * 2.2 * dt;
            n.position.z += (dz2 / d2) * 2.2 * dt;
          }
        }
      }
      if (nu.sheet) stepSheet(n, dt, !!nu.follow, 0, 1);
      keepAboveGround(n, dt, (nu.baseH || n.scale.y) * 0.5, 18);
    }
    pushBoulders(head, dt);
    tickDebris(dt);
    window.__FENREST_GRABBABLES__ = grab.filter((g) => g.visible && !g.userData.broken);
    window.__FENREST_HITABLES__ = hitables;
  }

  const api = { tick, grass, turtles, beasts, npcs, boards, cutGrass, stompTurtle, scatterChunk, pruneScatter };
  window.__FENREST_LIFE__ = api;
  return api;
}

export function bootLife() {
  const t = setInterval(() => {
    if (window.__FENREST_LIFE__) {
      clearInterval(t);
      return;
    }
    if (!window.__FENREST_ROOT__ || !window.__FENREST__) return;
    clearInterval(t);
    installLife({
      root: window.__FENREST_ROOT__,
      store: window.__FENREST_STORE__ || window.__FENREST__.store,
      loot: window.__FENREST_LOOT__ || [],
      foes: window.__FENREST_FOES__ || [],
      heightAt,
    });
  }, 250);
}

bootLife();
