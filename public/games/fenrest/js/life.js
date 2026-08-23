/**
 * Fenrest living world: grass fields, dinosaurs, turtles, furniture,
 * harvestable trees/ore, pushable boulders, chessboards.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";
import { heightAt, inSettlement } from "/games/fenrest/js/world-grid.js?v=life1";

const SPR = "/games/fenrest/sprites/";
const TEX = {};
function spr(file) {
  if (!TEX[file]) {
    const t = new THREE.TextureLoader().load(SPR + file);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    TEX[file] = t;
  }
  return TEX[file];
}

function billboard(map, w, h) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
  m.scale.set(w, h, 1);
  return m;
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
  const height = hAt || heightAt;
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

  function placeSprite(file, x, z, w, h) {
    const s = billboard(spr(file), w, h);
    s.position.set(x, height(x, z) + h * 0.45, z);
    root.add(s);
    return s;
  }

  function spawnGrassField(cx, cz, count = 28, spread = 16) {
    for (let i = 0; i < count; i++) {
      const x = cx + (Math.random() - 0.5) * spread;
      const z = cz + (Math.random() - 0.5) * spread;
      if (inSettlement(x, z)) continue;
      const g = placeSprite("grass-tall.png", x, z, 1.4 + Math.random() * 0.6, 1.8 + Math.random() * 0.7);
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
      hp: 2,
      wander: Math.random() * 6.28,
      spd: 0.7 + Math.random() * 0.4,
      t: Math.random() * 8,
    };
    turtles.push(s);
    foes.push(s);
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

  function spawnBeast(kind, x, z) {
    const def = {
      trex: { file: "trex.png", w: 3.6, h: 3.2, hp: 22, spd: 2.2, dmg: 0.16, aggro: 14, humanoid: false },
      raptor: { file: "raptor.png", w: 1.8, h: 1.4, hp: 8, spd: 4.4, dmg: 0.09, aggro: 11, humanoid: false },
      mammoth: { file: "mammoth.png", w: 3.4, h: 2.6, hp: 28, spd: 1.6, dmg: 0.12, aggro: 7, humanoid: false },
    }[kind];
    const s = placeSprite(def.file, x, z, def.w, def.h);
    s.userData = {
      foe: true,
      kind,
      def: { spd: def.spd, dmg: def.dmg, spell: null },
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
    };
    beasts.push(s);
    foes.push(s);
    return s;
  }

  function makeTree(x, z) {
    const g = new THREE.Group();
    const y0 = height(x, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.4, 6), oakMat());
    trunk.position.y = 1.2;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.15, 8, 6), leafMat());
    crown.position.y = 2.6;
    g.add(trunk, crown);
    g.position.set(x, y0, z);
    g.userData = { harvest: "tree", hp: 8, maxHp: 8, label: "oak", wood: 3 };
    root.add(g);
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
    const s = billboard(spr(def.file), 1.15, 2.05);
    s.position.set(x, height(x, z) + 1.0, z);
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
    };
    root.add(s);
    npcs.push(s);
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
  spawnBeast("trex", 28, -22);
  spawnBeast("trex", -34, 18);
  spawnBeast("raptor", 22, 18);
  spawnBeast("raptor", 24, 21);
  spawnBeast("raptor", -18, -24);
  spawnBeast("mammoth", -26, 8);
  spawnBeast("mammoth", 32, 12);
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * 6.28;
    const r = 10 + Math.random() * 28;
    makeTree(Math.cos(a) * r, Math.sin(a) * r + 6);
  }
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
    -3.2,
    1.4,
  );
  spawnNpc(
    { file: "guard.png", name: "Calder Voss", role: "watchman", species: "human", lore: "Walks the palisade at dusk. Suspicious of raptors and of poets." },
    3.6,
    -1.2,
  );
  spawnNpc(
    { file: "woman.png", name: "Sela Hayward", role: "herder", species: "human", lore: "Tends sheep on the crown fields and plays creature chess in the square." },
    1.2,
    5.4,
  );
  spawnNpc(
    { file: "human.png", name: "Bram Mill", role: "woodcutter", species: "human", lore: "Sells oak and advice. Prefers an axe to a sermon." },
    -5.4,
    2.8,
  );
  spawnNpc(
    { file: "lizard.png", name: "Issk", role: "marsh scout", species: "lizardfolk", lore: "Marsh tongue. Hunts reed-eels." },
    12.4,
    9.2,
  );

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
      b.position.y = height(b.position.x, b.position.z);
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
      tu.position.y = height(tu.position.x, tu.position.z) + tu.scale.y * 0.45;
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
      const dx = head.x - b.position.x;
      const dz = head.z - b.position.z;
      const d = Math.hypot(dx, dz) || 1;
      if (u.flash > 0) {
        u.flash -= dt;
        if (b.material?.color) b.material.color.setHex(u.flash > 0 ? 0xff2a2a : 0xffffff);
      }
      if (u.stagger > 0) {
        u.stagger -= dt;
        b.position.x += (u.kx || 0) * dt;
        b.position.z += (u.kz || 0) * dt;
      } else if (d < u.aggro) {
        const spd = u.def.spd * (u.lower ?? 1);
        b.position.x += (dx / d) * spd * dt;
        b.position.z += (dz / d) * spd * dt;
        u.cool = (u.cool || 0) - dt;
        if (d < 2.1 && u.cool <= 0) {
          u.cool = 1.1;
          const st = store.getState();
          store.getState().setHud({ hp: Math.max(0, (st.hp ?? 1) - u.def.dmg) });
        }
      } else {
        u.wander += dt * 0.4;
        b.position.x += Math.cos(u.wander) * 0.5 * dt;
        b.position.z += Math.sin(u.wander) * 0.5 * dt;
      }
      b.position.y = height(b.position.x, b.position.z) + b.scale.y * 0.42;
    }
    for (const n of npcs) {
      n.position.y = height(n.position.x, n.position.z) + n.scale.y * 0.48;
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
    }
    pushBoulders(head, dt);
    tickDebris(dt);
    window.__FENREST_GRABBABLES__ = grab.filter((g) => g.visible && !g.userData.broken);
    window.__FENREST_HITABLES__ = hitables.filter((g) => g.visible);
  }

  const api = { tick, grass, turtles, beasts, npcs, boards, cutGrass, stompTurtle };
  window.__FENREST_LIFE__ = api;
  return api;
}

export function bootLife() {
  const t = setInterval(() => {
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
