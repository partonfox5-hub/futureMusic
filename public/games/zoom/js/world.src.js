/** Buildings, liquids, skyboxes, traps, doors, portals, ropes. */
import * as THREE from "three";
import {
  CELL,
  EYE,
  FLAG_SPIKE,
  FLAG_UNSTABLE,
  PORTAL_COLORS,
  STORY_H,
  STORIES,
  WALL_TEX,
} from "./config.js?v=sw1";
import { cellI, climbHoleFloor, climbHoleRoof, enclosedFloors, idx, inBounds, sdf3, wallIsCrack, wallTexId } from "./map.js?v=sw1";

function mat(hex, extra) {
  return new THREE.MeshLambertMaterial({ color: hex, ...extra });
}

function wallMat(id, cracked) {
  const pal = {
    castle: [0x8a8078, 0x5a5048],
    manor: [0x6a4a38, 0xc4b49a],
    metal: [0x6a7078, 0x9aa0a8],
    siding: [0xc8b898, 0x8a7a62],
    straw: [0xc4a050, 0x8a7030],
    cabin: [0x8a5a32, 0x5a3818],
    space: [0x2a3848, 0x4ad0ff],
    cave: [0x6a5a48, 0x3a3028],
    granite: [0x7a7a78, 0x4a4a48],
    mossrock: [0x4a6040, 0x2a3820],
    ice: [0xa8d0e0, 0x6a98b0],
    crystal: [0x6a3eb0, 0xc8a0ff],
    sandstone: [0xc4a070, 0x8a6a40],
    dungeon: [0x5a5048, 0x2a2420],
  }[id] || [0x888, 0x444];
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  g.fillStyle = "#" + pal[0].toString(16).padStart(6, "0");
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = "#" + pal[1].toString(16).padStart(6, "0");
  if (id === "castle" || id === "manor" || id === "dungeon") {
    for (let y = 0; y < 32; y += 8) {
      const o = (y / 8) % 2 ? 4 : 0;
      for (let x = -8; x < 32; x += 16) g.fillRect(x + o + 1, y + 1, 14, 6);
    }
  } else if (id === "siding" || id === "cabin") {
    for (let y = 0; y < 32; y += 4) g.fillRect(0, y, 32, 1);
  } else if (id === "space") {
    g.fillRect(0, 8, 32, 1);
    g.fillRect(0, 24, 32, 1);
  } else if (id === "ice" || id === "crystal") {
    g.strokeStyle = "#" + pal[1].toString(16).padStart(6, "0");
    g.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo((i * 11) % 32, 0);
      g.lineTo(32, (i * 9) % 32);
      g.stroke();
    }
  } else {
    for (let i = 0; i < 28; i++) g.fillRect((i * 7) % 32, (i * 13) % 32, 4, 3);
  }
  if (cracked) {
    g.strokeStyle = "rgba(12,8,6,0.92)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(2, 6);
    g.lineTo(10, 14);
    g.lineTo(8, 22);
    g.lineTo(18, 28);
    g.moveTo(14, 2);
    g.lineTo(20, 12);
    g.lineTo(28, 10);
    g.lineTo(30, 24);
    g.moveTo(4, 28);
    g.lineTo(16, 18);
    g.stroke();
    g.fillStyle = "rgba(8,6,4,0.45)";
    g.fillRect(9, 12, 3, 8);
    g.fillRect(19, 8, 2, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: t });
}

const WMAT = {};
function wmat(id, cracked) {
  const key = id + (cracked ? ":c" : "");
  return (WMAT[key] ||= wallMat(id, cracked));
}

export function makeSky(kind) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 512);
  if (kind === 1) {
    grd.addColorStop(0, "#0b1a48");
    grd.addColorStop(0.28, "#3a7ad4");
    grd.addColorStop(0.48, "#8ec8f4");
    grd.addColorStop(0.58, "#d8ecff");
    grd.addColorStop(0.62, "#f0e2b0");
    grd.addColorStop(0.72, "#6a8a40");
    grd.addColorStop(1, "#3a5a28");
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle = "#fff4c0";
    g.beginPath();
    g.arc(780, 70, 52, 0, 6.28);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.72)";
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.ellipse(40 + i * 72, 150 + (i % 4) * 16, 70, 18, 0, 0, 6.28);
      g.fill();
    }
  } else if (kind === 2) {
    grd.addColorStop(0, "#010106");
    grd.addColorStop(0.45, "#0a1230");
    grd.addColorStop(0.58, "#1c2448");
    grd.addColorStop(0.64, "#2a2840");
    grd.addColorStop(1, "#08080c");
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle = "#e8e8ff";
    for (let i = 0; i < 280; i++) g.fillRect((i * 97) % 1024, (i * 53) % 280, 1 + (i % 2), 1 + (i % 2));
    g.fillStyle = "#f4f0d8";
    g.beginPath();
    g.arc(160, 64, 34, 0, 6.28);
    g.fill();
  } else {
    grd.addColorStop(0, "#2a5588");
    grd.addColorStop(0.38, "#5a9a68");
    grd.addColorStop(0.55, "#2a6a30");
    grd.addColorStop(0.7, "#163818");
    grd.addColorStop(1, "#0c1808");
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle = "rgba(18,52,16,0.72)";
    for (let i = 0; i < 18; i++) {
      g.beginPath();
      g.arc(i * 60, 310, 88, 0, 3.14, true);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.needsUpdate = true;
  return t;
}

function fireTex() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 96;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 78, 2, 32, 40, 34);
  grd.addColorStop(0, "rgba(255,255,230,1)");
  grd.addColorStop(0.18, "rgba(255,220,80,0.95)");
  grd.addColorStop(0.42, "rgba(255,120,16,0.85)");
  grd.addColorStop(0.7, "rgba(220,30,0,0.35)");
  grd.addColorStop(1, "rgba(20,0,0,0)");
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(32, 6);
  g.bezierCurveTo(48, 28, 56, 58, 32, 94);
  g.bezierCurveTo(8, 58, 16, 28, 32, 6);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function smokeTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  grd.addColorStop(0, "rgba(40,28,22,0.45)");
  grd.addColorStop(1, "rgba(20,16,12,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let FIRE_TEX = null;
let SMOKE_TEX = null;
function fireMat() {
  FIRE_TEX ||= fireTex();
  return new THREE.SpriteMaterial({ map: FIRE_TEX, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
}
function smokeMat() {
  SMOKE_TEX ||= smokeTex();
  return new THREE.SpriteMaterial({ map: SMOKE_TEX, transparent: true, depthWrite: false });
}

function hpSprite() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 10;
  const g = c.getContext("2d");
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  spr.scale.set(0.9, 0.14, 1);
  spr.userData.hpCanvas = c;
  spr.userData.hpCtx = g;
  return spr;
}

function paintHp(spr, hp, max) {
  const g = spr.userData.hpCtx;
  const c = spr.userData.hpCanvas;
  g.clearRect(0, 0, 64, 10);
  g.fillStyle = "#1a0808";
  g.fillRect(0, 0, 64, 10);
  g.fillStyle = "#33cc55";
  g.fillRect(2, 2, 60 * Math.max(0, hp / max), 6);
  g.strokeStyle = "#000";
  g.strokeRect(0.5, 0.5, 63, 9);
  spr.material.map.needsUpdate = true;
}

let FLUTE_MAT = null;
function fluteMat() {
  if (FLUTE_MAT) return FLUTE_MAT;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#e6ddd0";
  g.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 20; i++) {
    const x = i * 3.2;
    g.fillStyle = i % 2 ? "#cfc6b4" : "#efe8dc";
    g.fillRect(x, 0, 2.4, 128);
    g.fillStyle = "rgba(70,58,42,0.28)";
    g.fillRect(x, 0, 0.7, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  FLUTE_MAT = new THREE.MeshLambertMaterial({ map: t, color: 0xf0e8dc });
  return FLUTE_MAT;
}

function makeColumn() {
  const g = new THREE.Group();
  const marble = fluteMat();
  const shade = mat(0xd4c8b4);
  const dark = mat(0xb8aa94);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.16, 0.92), dark);
  plinth.position.y = 0.08;
  const plinth2 = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.78), shade);
  plinth2.position.y = 0.2;
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 8, 18), shade);
  torus.rotation.x = Math.PI / 2;
  torus.position.y = 0.3;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.55, 20), marble);
  shaft.position.y = 1.62;
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 6, 16), shade);
  neck.rotation.x = Math.PI / 2;
  neck.position.y = 2.9;
  const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.26, 0.16, 14), shade);
  echinus.position.y = 3.02;
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.12, 0.82), dark);
  abacus.position.y = 3.14;
  g.add(plinth, plinth2, torus, shaft, neck, echinus, abacus);
  g.userData.height = 3.22;
  return g;
}

function makeMetalTurret() {
  const g = new THREE.Group();
  const iron = mat(0x5a6168);
  const dark = mat(0x24282c);
  const steel = mat(0x9aa2aa);
  const rust = mat(0x6a4030);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 0.14, 10), dark);
  base.position.y = 0.07;
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.42), iron);
    leg.position.set(Math.sin(i * 2.094) * 0.28, 0.08, Math.cos(i * 2.094) * 0.28);
    leg.rotation.y = i * 2.094;
    g.add(leg);
  }
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.62, 10), iron);
  body.position.y = 0.46;
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.38, 8), rust);
  tank.position.set(-0.34, 0.42, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 6, 14), steel);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.78;
  const head = new THREE.Group();
  head.position.y = 0.88;
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.44), iron);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 0.78, 8), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.5;
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.18, 8), dark);
  shroud.rotation.x = Math.PI / 2;
  shroud.position.z = 0.88;
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.08, 8), dark);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.z = 0.98;
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.26), dark);
  box.position.set(0.3, -0.02, 0);
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), steel);
  rivet.position.set(0.18, 0.12, 0.2);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.16), dark);
  sight.position.set(0, 0.2, 0.12);
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 5, 10, Math.PI), rust);
  hose.rotation.z = Math.PI / 2;
  hose.position.set(-0.22, 0.02, 0.08);
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.12), dark);
  vent.position.set(0, 0.14, -0.18);
  head.add(housing, barrel, shroud, muzzle, box, rivet, sight, hose, vent);
  g.add(base, body, tank, ring, head);
  const hp = hpSprite();
  hp.position.y = 1.48;
  hp.scale.set(1.15, 0.18, 1);
  hp.renderOrder = 8;
  g.add(hp);
  g.userData.head = head;
  g.userData.hpBar = hp;
  g.userData.muzzle = muzzle;
  return g;
}

function makeStairs(h) {
  const g = new THREE.Group();
  const wood = mat(0x8a5a32);
  const n = Math.max(6, Math.round(h / 0.28));
  for (let i = 0; i < n; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.32), wood);
    const t = (i + 0.5) / n;
    step.position.set(0, t * h, (t - 0.5) * 1.1);
    g.add(step);
  }
  return g;
}

function makeLadder(h) {
  const g = new THREE.Group();
  const iron = mat(0x6a6860);
  const wood = mat(0x6a4424);
  const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h, 6), iron);
  r.position.set(-0.18, h * 0.5, 0);
  const l = r.clone();
  l.position.x = 0.18;
  g.add(r, l);
  const rungs = Math.max(5, Math.round(h / 0.32));
  for (let i = 0; i < rungs; i++) {
    const rg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), wood);
    rg.rotation.z = Math.PI / 2;
    rg.position.y = 0.2 + (i / (rungs - 1)) * (h - 0.4);
    g.add(rg);
  }
  return g;
}

function openingAt(map, x, z, story) {
  return (map.openings || []).find((o) => o.x === x && o.z === z && (o.story || 0) === story);
}

export function buildWorld(map, dungeon, scene) {
  const group = new THREE.Group();
  group.name = "world";
  const extras = { crushers: [], turrets: [], ropes: [], portals: [], doors: [], windows: [], liquids: [], spikes: [], climbs: [], caveins: [], unstables: [], horizon: null, boulders: [], vendors: [], crackedWalls: [], rumbles: [], root: group };

  const spikeGeo = new THREE.ConeGeometry(0.12, 0.7, 5);
  const spikeMat = mat(0x8a9098, { emissive: 0x222 });
  if (map.flags) {
    for (let z = 0; z < map.h; z++) {
      for (let x = 0; x < map.w; x++) {
        if (!(map.flags[idx(map, x, z)] & FLAG_SPIKE)) continue;
        const y0 = ((map.elev && map.elev[idx(map, x, z)]) || 0) * EYE - 1.45;
        for (let k = 0; k < 5; k++) {
          const s = new THREE.Mesh(spikeGeo, spikeMat);
          s.position.set((x + 0.2 + (k % 3) * 0.3) * CELL, y0 + 0.35, (z + 0.2 + Math.floor(k / 3) * 0.35) * CELL);
          group.add(s);
        }
        extras.spikes.push({ x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, y: y0 });
      }
    }
  }

  const waterM = mat(0x2a6aaa, { transparent: true, opacity: 0.55, emissive: 0x123050 });
  const lavaM = mat(0xff5511, { emissive: 0xff2200, transparent: true, opacity: 0.88 });
  if (map.liquid) {
    for (let z = 0; z < map.h; z++) {
      for (let x = 0; x < map.w; x++) {
        const liq = map.liquid[idx(map, x, z)];
        if (!liq) continue;
        const y0 = ((map.elev && map.elev[idx(map, x, z)]) || 0) * EYE;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL, CELL), liq === 2 ? lavaM : waterM);
        m.rotation.x = -Math.PI / 2;
        m.position.set((x + 0.5) * CELL, y0 + 0.12, (z + 0.5) * CELL);
        group.add(m);
        extras.liquids.push({ x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, kind: liq, y: y0 + 0.12 });
      }
    }
  }

  for (let story = 0; story < STORIES; story++) {
    const wall = map.bwalls && map.bwalls[story];
    if (!wall) continue;
    const floors = enclosedFloors(map, story);
    const yBase = story * STORY_H;
    for (let z = 0; z < map.h; z++) {
      for (let x = 0; x < map.w; x++) {
        const i = idx(map, x, z);
        const tid = wall[i];
        if (tid) {
          const open = openingAt(map, x, z, story);
          const texId = WALL_TEX[(wallTexId(tid) - 1) % WALL_TEX.length].id;
          const cracked = wallIsCrack(tid);
          const wm = wmat(texId, cracked);
          if (!open) {
            const box = new THREE.Mesh(new THREE.BoxGeometry(CELL, STORY_H - 0.05, CELL), wm);
            box.position.set((x + 0.5) * CELL, yBase + STORY_H * 0.5, (z + 0.5) * CELL);
            group.add(box);
            if (cracked) {
              extras.crackedWalls.push({
                mesh: box,
                gx: x,
                gz: z,
                story,
                tex: wallTexId(tid),
                yBase,
              });
            }
          } else {
            addOpening(group, extras, open, x, z, yBase, wm, map);
          }
        }
        if (floors[i]) {
          if (!climbHoleFloor(map, x, z, story)) {
            const fl = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.12, CELL), wmat("cabin"));
            fl.position.set((x + 0.5) * CELL, yBase + 0.06, (z + 0.5) * CELL);
            group.add(fl);
          }
          if (!climbHoleRoof(map, x, z, story)) {
            const roof = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.1, CELL), wmat("cabin"));
            roof.position.set((x + 0.5) * CELL, yBase + STORY_H - 0.05, (z + 0.5) * CELL);
            group.add(roof);
          }
        }
      }
    }
  }

  for (const r of map.ropes || []) {
    const y0 = ((map.elev && map.elev[cellI(map, r.x, r.z)]) || 0) * EYE;
    const len = r.len || 4.5;
    const top = y0 + (map.hallH || 4.2) - 0.15;
    const hang = Math.min(len, top - y0 - 0.2);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 10), mat(0x8a8680, { metalness: 0.4 }));
    hook.rotation.x = Math.PI / 2;
    hook.position.set(r.x, top + 0.04, r.z);
    group.add(hook);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8), mat(0x5a5854));
    plate.position.set(r.x, top + 0.08, r.z);
    group.add(plate);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.042, 1, 8), mat(0x6a4424));
    mesh.position.set(r.x, top - hang * 0.5, r.z);
    group.add(mesh);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0x4a3018));
    knot.position.set(r.x, top - hang, r.z);
    group.add(knot);
    const rec = { x: r.x, z: r.z, y0: top - hang, top, len: hang, mesh, knot, hook, restLen: hang };
    layoutRope(rec, r.x, top - hang, r.z);
    extras.ropes.push(rec);
  }

  for (const t of map.turrets || []) {
    const y0 = ((map.elev && map.elev[cellI(map, t.x, t.z)]) || 0) * EYE;
    const g = makeMetalTurret();
    g.position.set(t.x, y0, t.z);
    group.add(g);
    paintHp(g.userData.hpBar, 70, 70);
    const light = new THREE.PointLight(0xff6622, 0, 9, 2);
    light.position.set(t.x, y0 + 1.05, t.z);
    group.add(light);
    extras.turrets.push({
      x: t.x,
      z: t.z,
      y: y0 + 0.95,
      y0,
      mesh: g,
      head: g.userData.head,
      hpBar: g.userData.hpBar,
      muzzle: g.userData.muzzle,
      light,
      hp: 70,
      maxHp: 70,
      cool: 0.4,
    });
  }

  for (const c of map.crushers || []) {
    const y0 = ((map.elev && map.elev[cellI(map, c.x, c.z)]) || 0) * EYE;
    const top = y0 + (map.hallH || 4.2);
    const mesh = makeColumn();
    mesh.position.set(c.x, y0, c.z);
    group.add(mesh);
    const socket = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.95), mat(0x8a8074));
    socket.position.set(c.x, top - 0.08, c.z);
    group.add(socket);
    extras.crushers.push({ x: c.x, z: c.z, y0, top, mesh, t: Math.random() * 3.2, h: 3.22 });
  }

  for (const cl of map.climbs || []) {
    const from = cl.from || 0;
    const to = cl.to || from + 1;
    const y0 = from * STORY_H + 0.12;
    const y1 = to * STORY_H + 0.12;
    const g = cl.kind === "ladder" ? makeLadder(y1 - y0) : makeStairs(y1 - y0);
    const yaw = cl.yaw || 0;
    g.position.set(cl.x, y0, cl.z);
    g.rotation.y = yaw;
    group.add(g);
    extras.climbs.push({ kind: cl.kind, x: cl.x, z: cl.z, y0, y1, yaw, mesh: g });
  }

  if (map.flags) {
    const crackM = mat(0x2a2218, { transparent: true, opacity: 0.55 });
    for (let z = 0; z < map.h; z++) {
      for (let x = 0; x < map.w; x++) {
        const i = idx(map, x, z);
        if (!(map.flags[i] & FLAG_UNSTABLE)) continue;
        if (map.sky && map.sky[i]) continue;
        const y0 = ((map.elev && map.elev[i]) || 0) * EYE;
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.96, CELL * 0.96), crackM);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set((x + 0.5) * CELL, y0 + (map.hallH || 4.2) - 0.06, (z + 0.5) * CELL);
        group.add(ceil);
        extras.unstables.push({ i, mesh: ceil, x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, y0 });
      }
    }
  }

  let hasSky = false;
  if (map.sky) {
    for (let i = 0; i < map.sky.length; i++) if (map.sky[i]) {
      hasSky = true;
      break;
    }
  }
  if (hasSky) {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(220, 40),
      new THREE.MeshLambertMaterial({ color: 0x3a5a28 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((map.w * CELL) * 0.5, -0.4, (map.h * CELL) * 0.5);
    group.add(ground);
    extras.horizon = ground;
  }

  for (let i = 0; i < (map.portals || []).length; i++) {
    const p = map.portals[i];
    const col = PORTAL_COLORS[i % PORTAL_COLORS.length];
    extras.portals.push({
      a: addPortal(group, p.ax, p.az, map, col),
      b: addPortal(group, p.bx, p.bz, map, col),
      color: col,
      cool: 0,
    });
  }

  for (const b of map.boulders || []) {
    const y0 = ((map.elev && map.elev[cellI(map, b.x, b.z)]) || 0) * EYE;
    const mesh = makeBoulderMesh();
    mesh.position.set(b.x, y0 + 0.92, b.z);
    group.add(mesh);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 2.95, 24),
      mat(0xc44, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(b.x, y0 + 0.04, b.z);
    group.add(ring);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 8), mat(0xffcc66, { emissive: 0x664400 }));
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(b.x - Math.sin(b.yaw || 0) * 0.9, y0 + 0.7, b.z - Math.cos(b.yaw || 0) * 0.9);
    group.add(arrow);
    extras.boulders.push({
      x: b.x,
      z: b.z,
      y: y0 + 0.92,
      y0,
      yaw: b.yaw || 0,
      mesh,
      ring,
      vx: 0,
      vz: 0,
      rolling: false,
      speed0: 7.125,
      r: 0.92,
      trigger: b.trigger || 5.2,
    });
  }

  for (const v of map.vendors || []) {
    const y0 = ((map.elev && map.elev[cellI(map, v.x, v.z)]) || 0) * EYE;
    const g = makeVending();
    g.position.set(v.x, y0, v.z);
    group.add(g);
    extras.vendors.push({ x: v.x, z: v.z, y: y0, mesh: g });
  }

  map._floors = [0, 1, 2].map((s) => enclosedFloors(map, s));
  scene.add(group);
  return extras;
}

function makeVending() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.7, 0.7), mat(0x3a4250));
  body.position.y = 0.85;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.95, 0.06),
    mat(0x66ccff, { transparent: true, opacity: 0.35, emissive: 0x113344 }),
  );
  glass.position.set(0, 1.05, 0.34);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), mat(0xc4a050, { emissive: 0x3a2a08 }));
  slot.position.set(0.18, 0.32, 0.36);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.12), mat(0xffcc66, { emissive: 0xaa8800 }));
  lamp.position.set(0, 1.66, 0.28);
  g.add(body, glass, slot, lamp);
  return g;
}

function addPortal(group, x, z, map, col) {
  const y0 = ((map.elev && map.elev[cellI(map, x, z)]) || 0) * EYE;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 18), mat(col, { emissive: col }));
  ring.position.set(x, y0 + 1.2, z);
  group.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.64, 16), mat(col, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, emissive: col }));
  disc.position.copy(ring.position);
  group.add(disc);
  return { x, z, y: y0 + 1.2, mesh: ring };
}

function wallFacing(map, x, z, story) {
  const wall = map.bwalls && map.bwalls[story];
  if (!wall) return 0;
  const has = (gx, gz) => inBounds(map, gx, gz) && wall[idx(map, gx, gz)];
  const alongX = (has(x - 1, z) ? 1 : 0) + (has(x + 1, z) ? 1 : 0);
  const alongZ = (has(x, z - 1) ? 1 : 0) + (has(x, z + 1) ? 1 : 0);
  return alongZ > alongX ? Math.PI / 2 : 0;
}

function addOpening(group, extras, open, x, z, yBase, wm, map) {
  const px = (x + 0.5) * CELL;
  const pz = (z + 0.5) * CELL;
  const h = STORY_H;
  const doorH = open.type === "window" ? h * 0.45 : h * 0.78;
  const yOff = open.type === "window" ? yBase + h * 0.55 : yBase + doorH * 0.5;
  const yaw = wallFacing(map, x, z, open.story || 0);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.12, CELL), wm);
  frame.position.set(px, yBase + h - 0.06, pz);
  group.add(frame);
  const postW = 0.16;
  const post = new THREE.BoxGeometry(postW, doorH, CELL * 0.55);
  const p1 = new THREE.Mesh(post, wm);
  const p2 = new THREE.Mesh(post, wm);
  p1.position.set(px, yBase + doorH * 0.5, pz);
  p2.position.set(px, yBase + doorH * 0.5, pz);
  p1.rotation.y = yaw;
  p2.rotation.y = yaw;
  const side = CELL * 0.42;
  p1.translateX(-side);
  p2.translateX(side);
  group.add(p1, p2);
  if (open.type === "arch") return;
  if (open.type === "window") {
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(CELL * 0.68, doorH - 0.06, 0.04),
      mat(0xa8dff5, { transparent: true, opacity: 0.32, emissive: 0x226688, roughness: 0.08 }),
    );
    glass.position.set(px, yOff, pz);
    glass.rotation.y = yaw;
    glass.userData.window = true;
    group.add(glass);
    const barH = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.7, 0.045, 0.07), wm);
    barH.position.set(px, yOff, pz);
    barH.rotation.y = yaw;
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.045, doorH - 0.04, 0.07), wm);
    barV.position.set(px, yOff, pz);
    barV.rotation.y = yaw;
    group.add(barH, barV);
    extras.windows.push({ mesh: glass, hp: 1, x: px, z: pz, y: yOff, yaw, w: CELL * 0.68, h: doorH - 0.06 });
    return;
  }
  const hinge = new THREE.Group();
  hinge.position.set(px, yBase + doorH * 0.5, pz);
  hinge.rotation.y = yaw;
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(CELL * 0.7, doorH - 0.04, 0.07),
    mat(open.locked ? 0x4a2818 : 0x6a4428),
  );
  door.position.x = CELL * 0.35;
  hinge.add(door);
  if (open.locked) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.1), mat(0xc4a050, { emissive: 0x3a2a08 }));
    bar.position.set(CELL * 0.55, 0, 0.06);
    hinge.add(bar);
  }
  group.add(hinge);
  extras.doors.push({
    mesh: hinge,
    x: px,
    z: pz,
    y: yBase,
    yaw,
    locked: !!open.locked,
    keyId: open.keyId,
    open: false,
    story: open.story || 0,
    ref: open,
  });
}

export function wallBlocked(map, x, z, y) {
  if (!map.bwalls) return false;
  const gx = Math.floor(x / CELL);
  const gz = Math.floor(z / CELL);
  if (!inBounds(map, gx, gz)) return false;
  const story = Math.max(0, Math.min(STORIES - 1, Math.floor(y / STORY_H)));
  const i = idx(map, gx, gz);
  if (!map.bwalls[story][i]) return false;
  const open = openingAt(map, gx, gz, story);
  if (!open) return true;
  if (open.type === "arch" || open.type === "window") return false;
  if (open.locked && !open._unlocked) return true;
  return false;
}

export function buildingFloorY(map, x, z, y) {
  if (!map.bwalls) return -1;
  const gx = Math.floor(x / CELL);
  const gz = Math.floor(z / CELL);
  if (!inBounds(map, gx, gz)) return -1;
  let best = -1;
  if (!map._floors) map._floors = [0, 1, 2].map((s) => enclosedFloors(map, s));
  for (let s = 0; s < STORIES; s++) {
    if (climbHoleFloor(map, gx, gz, s)) continue;
    const fl = map._floors[s];
    if (fl && fl[idx(map, gx, gz)]) {
      const fy = s * STORY_H + 0.12;
      if (fy <= y + 0.4 && fy > best) best = fy;
    }
  }
  return best;
}

export function climbSupport(extras, player) {
  if (!extras || !extras.climbs) return null;
  for (const cl of extras.climbs) {
    const dx = player.x - cl.x;
    const dz = player.z - cl.z;
    const d = Math.hypot(dx, dz);
    if (cl.kind === "ladder") {
      if (d < 0.58 && player.y > cl.y0 - 0.5 && player.y < cl.y1 + 1.7) return cl;
    } else if (d < 1.05) {
      const c = Math.cos(cl.yaw || 0);
      const s = Math.sin(cl.yaw || 0);
      const along = dx * s + dz * c;
      const across = dx * c - dz * s;
      if (Math.abs(across) < 0.55 && Math.abs(along) < 0.85) return cl;
    }
  }
  return null;
}

export function tickWorld(extras, dt, player, foes, onHit, scene, camera, map, sdf2) {
  for (const c of extras.crushers) {
    c.t += dt;
    const T = 3.35;
    const p = (c.t % T) / T;
    let u;
    if (p < 0.36) u = p / 0.36;
    else if (p < 0.55) u = 1;
    else if (p < 0.68) u = 1 - Math.pow((p - 0.55) / 0.13, 1.6);
    else u = 0;
    const travel = Math.max(1.55, (c.top - c.y0) - 1.05);
    const goingDown = p >= 0.55 && p < 0.68;
    c.mesh.position.y = c.y0 + u * travel;
    const capY = c.mesh.position.y + c.h;
    const dist = Math.hypot(player.x - c.x, player.z - c.z);
    if (dist < 0.52 && player.y < capY && player.y > c.mesh.position.y + 0.15 && goingDown) {
      onHit(40, "crushed by a column");
    } else if (dist < 0.5 && player.y >= capY - 0.2 && player.y < capY + 1.65) {
      player.y = Math.max(player.y, capY + 1.55);
      if (capY + 1.65 > c.top - 0.1) onHit(50, "crushed by a column");
    }
  }
  const muz = new THREE.Vector3();
  for (const t of extras.turrets) {
    if (t.hp <= 0) {
      if (t.mesh.visible) t.mesh.visible = false;
      if (t.light) t.light.intensity = 0;
      continue;
    }
    t.cool -= dt;
    const dx = player.x - t.x;
    const dz = player.z - t.z;
    const d = Math.hypot(dx, dz) || 1;
    t.head.rotation.y = Math.atan2(dx, dz);
    if (t.hpBar && camera) t.hpBar.lookAt(camera.position);
    paintHp(t.hpBar, t.hp, t.maxHp);
    const firing = d < 18;
    if (t.light) t.light.intensity = firing ? 2.4 + Math.random() * 2.2 : 0.15;
    if (firing && t.cool <= 0) {
      t.cool = 0.032;
      if (t.muzzle) t.muzzle.getWorldPosition(muz);
      else muz.set(t.x, t.y, t.z);
      const root = extras.root;
      if (root?.worldToLocal) root.worldToLocal(muz);
      const hx = Math.sin(t.head.rotation.y);
      const hz = Math.cos(t.head.rotation.y);
      spawnFlame(scene, muz.x, muz.y, muz.z, hx, hz, extras);
    }
  }
  extras._flames = extras._flames || [];
  for (let i = extras._flames.length - 1; i >= 0; i--) {
    const f = extras._flames[i];
    f.life -= dt;
    f.mesh.position.addScaledVector(f.dir, (f.speed || 7) * dt);
    f.dir.y += dt * (f.smoke ? 2.6 : 1.4);
    f.dir.x += (Math.random() - 0.5) * dt * 1.4;
    f.dir.z += (Math.random() - 0.5) * dt * 1.4;
    const k = Math.max(0, f.life / (f.maxLife || 0.5));
    const sc = (f.s0 || 0.4) * (f.smoke ? 1.4 - k * 0.4 : 0.4 + k * 0.9);
    f.mesh.scale.set(sc * (f.sx || 1), sc * (f.sy || 1.6), 1);
    if (f.mesh.material) f.mesh.material.opacity = f.smoke ? 0.08 + k * 0.28 : 0.2 + k * 0.8;
    if (!f.smoke && f.mesh.position.distanceTo(new THREE.Vector3(player.x, player.y, player.z)) < 0.7 + sc * 0.45) {
      onHit(14 * dt * 8, "burned");
    }
    if (f.life <= 0) {
      f.mesh.removeFromParent();
      extras._flames.splice(i, 1);
    }
  }
  if (map) tickCaveIn(extras, dt, player, map, scene, onHit);
  if (map) tickBoulders(extras, dt, player, map, sdf2, onHit);
  for (const p of extras.portals) {
    p.cool = Math.max(0, p.cool - dt);
    p.a.mesh.rotation.y += dt * 1.4;
    p.b.mesh.rotation.y += dt * 1.4;
    if (p.cool > 0) continue;
    const da = Math.hypot(player.x - p.a.x, player.z - p.a.z);
    const db = Math.hypot(player.x - p.b.x, player.z - p.b.z);
    if (da < 0.7) {
      player.x = p.b.x + 0.9;
      player.z = p.b.z;
      p.cool = 1.1;
    } else if (db < 0.7) {
      player.x = p.a.x + 0.9;
      player.z = p.a.z;
      p.cool = 1.1;
    }
  }
}

function spawnFlame(scene, x, y, z, dx, dz, extras) {
  extras._flames = extras._flames || [];
  if (extras._flames.length > 90) {
    const old = extras._flames.shift();
    old.mesh.removeFromParent();
  }
  const n = 14 + (Math.random() * 8) | 0;
  for (let i = 0; i < n; i++) {
    const spr = new THREE.Sprite(fireMat());
    const s0 = 0.42 + Math.random() * 0.7;
    spr.scale.set(s0 * 0.85, s0 * 2.1, 1);
    const along = Math.random() * 0.35;
    spr.position.set(
      x + dx * along + (Math.random() - 0.5) * 0.16,
      y + Math.random() * 0.1,
      z + dz * along + (Math.random() - 0.5) * 0.16,
    );
    (extras.root || scene).add(spr);
    extras._flames.push({
      mesh: spr,
      dir: new THREE.Vector3(dx + (Math.random() - 0.5) * 0.42, 0.08 + Math.random() * 0.28, dz + (Math.random() - 0.5) * 0.42),
      speed: 9 + Math.random() * 7,
      life: 0.45 + Math.random() * 0.4,
      maxLife: 0.85,
      s0,
      sx: 0.85,
      sy: 2.2,
    });
  }
  if (Math.random() < 0.45) {
    const sm = new THREE.Sprite(smokeMat());
    const s0 = 0.5 + Math.random() * 0.4;
    sm.scale.setScalar(s0);
    sm.position.set(x + dx * 0.4, y + 0.1, z + dz * 0.4);
    (extras.root || scene).add(sm);
    extras._flames.push({
      mesh: sm,
      dir: new THREE.Vector3(dx * 0.3, 0.7, dz * 0.3),
      speed: 2.2,
      life: 0.7,
      maxLife: 0.7,
      s0,
      smoke: true,
    });
  }
}

export function hurtTurrets(extras, point, dmg, radius = 1.45) {
  let hit = false;
  const r = radius == null ? 1.45 : radius;
  for (const t of extras.turrets || []) {
    if (t.hp <= 0) continue;
    const dx = point.x - t.x;
    const dz = point.z - t.z;
    if (dx * dx + dz * dz > r * r) continue;
    if (Math.abs(point.y - t.y) > r + 0.85) continue;
    t.hp -= dmg;
    paintHp(t.hpBar, t.hp, t.maxHp);
    hit = true;
    if (t.hp <= 0) {
      t.hp = 0;
      t.mesh.visible = false;
      if (t.light) t.light.intensity = 0;
    }
  }
  return hit;
}

function makeBoulderMesh() {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(0.92, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const n = 0.86 + ((i * 17) % 13) * 0.018;
    pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n, pos.getZ(i) * n);
  }
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, mat(0x6a6054)));
  const moss = mat(0x3a5a32);
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 3) * 0.05, 6, 5), moss);
    p.position.set(Math.sin(a) * 0.62, (i % 2 ? 0.28 : -0.18), Math.cos(a) * 0.55);
    g.add(p);
  }
  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.08), mat(0x2a241c));
  crack.rotation.z = 0.4;
  crack.position.set(0.2, 0.05, 0.55);
  g.add(crack);
  return g;
}

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
export function layoutRope(r, x, y, z) {
  if (!r?.mesh) return;
  const dx = x - r.x;
  const dy = y - r.top;
  const dz = z - r.z;
  const len = Math.max(0.2, Math.hypot(dx, dy, dz));
  r.mesh.position.set((r.x + x) * 0.5, (r.top + y) * 0.5, (r.z + z) * 0.5);
  _dir.set(dx, dy, dz).normalize();
  r.mesh.quaternion.setFromUnitVectors(_up, _dir);
  r.mesh.scale.set(1, len, 1);
  if (r.knot) r.knot.position.set(x, y, z);
}

export function smashGlass(extras, point, radius, parent) {
  const out = [];
  if (!extras?.windows) return out;
  const r = radius || 1.2;
  for (const w of extras.windows) {
    if (w.broken) continue;
    const dx = w.x - point.x;
    const dy = w.y - point.y;
    const dz = w.z - point.z;
    if (dx * dx + dy * dy + dz * dz > r * r) continue;
    w.broken = true;
    w.hp = 0;
    if (w.mesh) w.mesh.visible = false;
    const host = parent || extras.root;
    if (!host) continue;
    for (let i = 0; i < 10; i++) {
      const bit = new THREE.Mesh(
        new THREE.BoxGeometry(0.08 + Math.random() * 0.14, 0.07 + Math.random() * 0.16, 0.02 + Math.random() * 0.03),
        mat(0xa8dff5, { transparent: true, opacity: 0.55, emissive: 0x226688 }),
      );
      bit.position.set(w.x + (Math.random() - 0.5) * 0.45, w.y + (Math.random() - 0.5) * 0.4, w.z + (Math.random() - 0.5) * 0.2);
      bit.rotation.set(Math.random(), w.yaw || 0, Math.random());
      host.add(bit);
      bit.userData.phys = {
        mass: 1.2,
        r: 0.1,
        h: 0.08,
        vx: (Math.random() - 0.5) * 7,
        vy: 2 + Math.random() * 4,
        vz: (Math.random() - 0.5) * 7,
        held: false,
        slam: 0,
      };
      bit.userData.kind = "glass";
      out.push(bit);
      extras.physQueue = extras.physQueue || [];
      extras.physQueue.push(bit);
    }
  }
  return out;
}

export function impulseBoulders(extras, point, dir, force, radius) {
  let n = 0;
  const r = radius || 1.6;
  const f = force || 7;
  for (const b of extras.boulders || []) {
    const dx = point.x - b.mesh.position.x;
    const dz = point.z - b.mesh.position.z;
    if (dx * dx + dz * dz > (r + b.r) * (r + b.r)) continue;
    if (Math.abs(point.y - b.y) > 1.7) continue;
    b.rolling = true;
    const nx = dir && dir.x != null ? dir.x : -dx;
    const nz = dir && dir.z != null ? dir.z : -dz;
    const len = Math.hypot(nx, nz) || 1;
    b.vx = (b.vx || 0) + (nx / len) * f;
    b.vz = (b.vz || 0) + (nz / len) * f;
    if (b.ring) b.ring.visible = false;
    n++;
  }
  return n;
}

function tickCaveIn(extras, dt, player, map, scene, onHit) {
  if (!map.flags) return;
  extras._unst = extras._unst || {};
  const moving = Math.hypot(player.vx || 0, player.vz || 0) > 0.45;
  const gi = Math.floor(player.x / CELL);
  const gz = Math.floor(player.z / CELL);
  let under = false;
  for (let z = gz - 2; z <= gz + 2; z++) {
    for (let x = gi - 2; x <= gi + 2; x++) {
      if (!inBounds(map, x, z)) continue;
      const i = idx(map, x, z);
      if (!(map.flags[i] & FLAG_UNSTABLE)) continue;
      if (map.collapsed && map.collapsed[i]) continue;
      under = true;
      if (moving && extras._unst[i] == null) extras._unst[i] = 0.25 + Math.random() * 1.75;
    }
  }
  extras._warn = under && Object.keys(extras._unst).length ? "The ceiling groans…" : extras._warn;
  for (const key of Object.keys(extras._unst)) {
    const i = +key;
    extras._unst[i] -= dt;
    if (extras._unst[i] > 0) continue;
    delete extras._unst[i];
    collapseCell(map, extras, scene, i, player, onHit);
    const w = map.w;
    const x = i % w;
    const z = (i / w) | 0;
    for (let oz = -2; oz <= 2; oz++) {
      for (let ox = -2; ox <= 2; ox++) {
        if (!ox && !oz) continue;
        if (Math.random() > 0.42) continue;
        const nx = x + ox;
        const nz = z + oz;
        if (!inBounds(map, nx, nz)) continue;
        const j = idx(map, nx, nz);
        if (map.flags[j] & FLAG_UNSTABLE && !(map.collapsed && map.collapsed[j])) collapseCell(map, extras, scene, j, player, onHit);
      }
    }
  }
}

function collapseCell(map, extras, scene, i, player, onHit) {
  if (!map.collapsed) map.collapsed = new Uint8Array(map.w * map.h);
  if (map.collapsed[i]) return;
  map.collapsed[i] = 1;
  const x = i % map.w;
  const z = (i / map.w) | 0;
  const y0 = ((map.elev && map.elev[i]) || 0) * EYE;
  const crack = (extras.unstables || []).find((u) => u.i === i);
  if (crack && crack.mesh) crack.mesh.visible = false;
  const rock = mat(0x5a5248);
  for (let k = 0; k < 7; k++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.35 + Math.random() * 0.45, 0.28 + Math.random() * 0.55, 0.3 + Math.random() * 0.4), rock);
    m.position.set((x + 0.15 + Math.random() * 0.7) * CELL, y0 + 2.5 + Math.random() * 0.8, (z + 0.15 + Math.random() * 0.7) * CELL);
    m.userData.vy = -2;
    m.userData.floor = y0 + 0.25 + Math.random() * 0.55;
    (extras.root || scene).add(m);
    extras.caveins.push(m);
  }
  if (player && onHit) {
    const d = Math.hypot(player.x - (x + 0.5) * CELL, player.z - (z + 0.5) * CELL);
    if (d < CELL * 0.85 && player.y < y0 + 3.2) onHit(18, "crushed by a cave-in");
  }
}

function tickBoulders(extras, dt, player, map, sdf2, onHit) {
  for (const b of extras.boulders || []) {
    const d = Math.hypot(player.x - b.mesh.position.x, player.z - b.mesh.position.z);
    if (!b.rolling && d < b.trigger) {
      b.rolling = true;
      const spd = b.speed0;
      b.vx = -Math.sin(b.yaw) * spd;
      b.vz = -Math.cos(b.yaw) * spd;
      if (b.ring) b.ring.visible = false;
    }
    if (!b.rolling) continue;
    const damp = Math.exp(-0.55 * dt);
    b.vx *= damp;
    b.vz *= damp;
    const nx = b.mesh.position.x + b.vx * dt;
    const nz = b.mesh.position.z + b.vz * dt;
    const y = b.y;
    const hitX = sdf2 ? sdf3(nx, y, b.mesh.position.z, map, sdf2) > -0.2 : false;
    const hitZ = sdf2 ? sdf3(b.mesh.position.x, y, nz, map, sdf2) > -0.2 : false;
    if (hitX) b.vx *= -0.62;
    else b.mesh.position.x = nx;
    if (hitZ) b.vz *= -0.62;
    else b.mesh.position.z = nz;
    if (wallBlocked(map, b.mesh.position.x + Math.sign(b.vx) * 0.5, b.mesh.position.z, y)) b.vx *= -0.62;
    if (wallBlocked(map, b.mesh.position.x, b.mesh.position.z + Math.sign(b.vz) * 0.5, y)) b.vz *= -0.62;
    const spd = Math.hypot(b.vx, b.vz);
    b.mesh.rotation.x += b.vz * dt * 1.4;
    b.mesh.rotation.z -= b.vx * dt * 1.4;
    if (spd < 0.35) {
      b.vx = 0;
      b.vz = 0;
    }
    const pd = Math.hypot(player.x - b.mesh.position.x, player.z - b.mesh.position.z);
    if (spd > 0.9 && pd < 0.85 + b.r * 0.55 && player.y < b.y + 1.4 && player.y > b.y - 1.0) {
      onHit(80, "crushed by a boulder");
    }
  }
}

export function tickRubble(extras, dt) {
  for (const m of extras.caveins || []) {
    if (!m.userData.falling && m.userData.falling !== false) m.userData.falling = true;
    if (m.position.y > m.userData.floor) {
      m.userData.vy = (m.userData.vy || 0) - 28 * dt;
      m.position.y += m.userData.vy * dt;
      m.rotation.x += dt * 2;
      if (m.position.y <= m.userData.floor) {
        m.position.y = m.userData.floor;
        m.userData.vy = 0;
      }
    }
  }
}

export function tryUnlock(extras, player, keys) {
  const have = new Set((keys || []).map((k) => k.id || k));
  for (const d of extras.doors) {
    if (!d.locked || d.open) continue;
    if (Math.hypot(player.x - d.x, player.z - d.z) > 1.6) continue;
    if (d.keyId && have.has(d.keyId)) {
      d.locked = false;
      d.open = true;
      if (d.ref) d.ref._unlocked = true;
      d.mesh.rotation.y = (d.yaw || 0) + 1.85;
      return d.keyId;
    }
  }
  return null;
}

export function breakWindows(extras, origin, dir, range, parent) {
  const out = [];
  if (!extras?.windows) return out;
  for (const w of extras.windows) {
    if (w.broken) continue;
    const dx = w.x - origin.x;
    const dy = w.y - origin.y;
    const dz = w.z - origin.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > range) continue;
    const aim = dir ? (dx * dir.x + dy * (dir.y || 0) + dz * dir.z) / (d || 1) : 1;
    if (aim < 0.28) continue;
    out.push(...smashGlass(extras, { x: w.x, y: w.y, z: w.z }, 0.4, parent));
  }
  return out;
}

export function shatterCracked(extras, map, pos, radius, parent) {
  const out = [];
  if (!extras?.crackedWalls) return out;
  const r2 = radius * radius;
  for (const w of extras.crackedWalls) {
    if (w.gone || !w.mesh) continue;
    const wx = (w.gx + 0.5) * CELL;
    const wy = w.yBase + STORY_H * 0.5;
    const wz = (w.gz + 0.5) * CELL;
    const dx = wx - pos.x;
    const dy = wy - pos.y;
    const dz = wz - pos.z;
    if (dx * dx + dy * dy + dz * dz > r2) continue;
    w.gone = true;
    w.mesh.visible = false;
    if (map.bwalls && map.bwalls[w.story]) map.bwalls[w.story][idx(map, w.gx, w.gz)] = 0;
    map._floors = null;
    const col = 0x6a5a48;
    for (let i = 0; i < 9; i++) {
      const bit = new THREE.Mesh(
        new THREE.BoxGeometry(0.18 + Math.random() * 0.22, 0.14 + Math.random() * 0.2, 0.16 + Math.random() * 0.2),
        mat(col),
      );
      bit.position.set(wx + (Math.random() - 0.5) * 0.5, wy + (Math.random() - 0.4) * 0.8, wz + (Math.random() - 0.5) * 0.5);
      bit.rotation.set(Math.random(), Math.random(), Math.random());
      parent.add(bit);
      bit.userData.phys = {
        mass: 4,
        r: 0.18,
        h: 0.2,
        vx: (Math.random() - 0.5) * 8,
        vy: 3 + Math.random() * 5,
        vz: (Math.random() - 0.5) * 8,
        held: false,
        slam: 0,
      };
      bit.userData.kind = "debris";
      out.push(bit);
    }
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 6),
      mat(0xffcc88, { transparent: true, opacity: 0.7, emissive: 0xffaa44 }),
    );
    flash.position.set(wx, wy, wz);
    flash.userData.flash = true;
    flash.userData.life = 0.22;
    parent.add(flash);
    out.push(flash);
  }
  return out;
}
