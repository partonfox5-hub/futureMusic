/** Open-world runtime: 3D buildings, Zoom-style obstacles, pickups, zone flags. */
import * as THREE from "three";
import {
  CELL,
  STORY_H,
  STORIES,
  EYE,
  WALL_TEX,
  FLAG_SPIKE,
  FLAG_HOVER,
  FLAG_COLLAPSE,
  FLAG_SLOPE,
  FLAG_UNSTABLE,
  FLAG_RUMBLE,
  LIQ_WATER,
  LIQ_LAVA,
  PICKUPS,
  idx,
  inBounds,
  wallTexId,
  wallIsCrack,
  enclosedFloors,
  openingAt,
  worldX,
  worldZ,
  flagsAt,
  liquidAt,
} from "./ow-map.js?v=h36";

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
    lab: [0x1a3844, 0x44d8ff],
    temple: [0x8a6a38, 0xe8d090],
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
  } else if (id === "ice" || id === "crystal") {
    g.strokeStyle = "#" + pal[1].toString(16).padStart(6, "0");
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
    g.lineTo(18, 28);
    g.moveTo(14, 2);
    g.lineTo(30, 24);
    g.stroke();
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

function groundY(api, x, z) {
  return api.hillsAt(x, z);
}

function wallFacing(map, x, z, story) {
  const wall = map.bwalls && map.bwalls[story];
  if (!wall) return 0;
  const has = (gx, gz) => inBounds(map, gx, gz) && wall[idx(map, gx, gz)];
  const alongX = (has(x - 1, z) ? 1 : 0) + (has(x + 1, z) ? 1 : 0);
  const alongZ = (has(x, z - 1) ? 1 : 0) + (has(x, z + 1) ? 1 : 0);
  return alongZ > alongX ? 0 : Math.PI / 2;
}

function addOpening(group, extras, open, x, z, yBase, wm, map, gy) {
  const px = worldX(map, x);
  const pz = worldZ(map, z);
  const h = STORY_H;
  const doorH = open.type === "window" ? h * 0.45 : h * 0.78;
  const yOff = open.type === "window" ? yBase + h * 0.55 : yBase + doorH * 0.5;
  const yaw = wallFacing(map, x, z, open.story || 0);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.12, CELL * 0.55), wm);
  frame.position.set(px, yBase + h - 0.06, pz);
  frame.rotation.y = yaw;
  group.add(frame);
  const postW = 0.18;
  const post = new THREE.BoxGeometry(postW, doorH, CELL * 0.5);
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
  const sill = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.96, 0.1, CELL * 0.5), wm);
  sill.position.set(px, yBase + 0.05, pz);
  sill.rotation.y = yaw;
  group.add(sill);
  if (open.type === "window") {
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(CELL * 0.68, doorH - 0.06, 0.04),
      mat(0xa8dff5, { transparent: true, opacity: 0.32, emissive: 0x226688 }),
    );
    glass.position.set(px, yOff, pz);
    glass.rotation.y = yaw;
    group.add(glass);
    extras.windows.push({ mesh: glass, x: px, z: pz, y: yOff, yaw });
    extras.solids.push({ x: px, z: pz, w: CELL * 0.22, d: CELL * 0.22, y0: gy, y1: yBase + h, pass: "window" });
    return;
  }
  extras.doors.push({ x: px, z: pz, y: yBase, type: open.type, yaw });
}

function makeColumn() {
  const g = new THREE.Group();
  const dark = mat(0xb8aa94);
  const shade = mat(0xd4c8b4);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.16, 0.92), dark);
  plinth.position.y = 0.08;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.55, 16), shade);
  shaft.position.y = 1.62;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.12, 0.82), dark);
  cap.position.y = 3.14;
  g.add(plinth, shaft, cap);
  return g;
}

function makeFlameTurret() {
  const g = new THREE.Group();
  const iron = mat(0x5a6168);
  const dark = mat(0x24282c);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 0.14, 10), dark);
  base.position.y = 0.07;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.62, 10), iron);
  body.position.y = 0.46;
  const head = new THREE.Group();
  head.position.y = 0.88;
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.44), iron);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 0.78, 8), mat(0x9aa2aa));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.5;
  head.add(housing, barrel);
  g.add(base, body, head);
  g.userData.head = head;
  return g;
}

function makeGunTurret() {
  const g = new THREE.Group();
  const iron = mat(0x4a5058);
  const dark = mat(0x1c2024);
  const olive = mat(0x4a5a38);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.14, 10), dark);
  base.position.y = 0.07;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.7, 10), olive);
  body.position.y = 0.5;
  const head = new THREE.Group();
  head.position.y = 0.96;
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.42), iron);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.15, 8), mat(0xb8c0c8));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.72;
  head.add(housing, barrel);
  g.add(base, body, head);
  g.userData.head = head;
  return g;
}

function makeBoulderMesh() {
  const g = new THREE.Mesh(new THREE.IcosahedronGeometry(0.92, 1), mat(0x6a5a48, { emissive: 0x221808 }));
  g.castShadow = false;
  return g;
}

function makeChainMesh() {
  const g = new THREE.Group();
  const iron = mat(0x8a9098);
  for (let i = 0; i < 10; i++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 10), iron);
    link.position.y = -i * 0.14;
    link.rotation.y = (i % 2) * Math.PI * 0.5;
    g.add(link);
  }
  return g;
}

function makeStairs(h) {
  const g = new THREE.Group();
  const n = Math.max(4, Math.round(h / 0.28));
  const stepH = h / n;
  const wood = wmat("cabin", false);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.15, stepH * 0.7, 0.42), wood);
    s.position.set(0, i * stepH + stepH * 0.35, -i * 0.36);
    g.add(s);
  }
  return g;
}

function makeLadder(h) {
  const g = new THREE.Group();
  const iron = mat(0x4a4038);
  const L = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), iron);
  L.position.set(-0.22, h * 0.5, 0);
  const R = L.clone();
  R.position.x = 0.22;
  g.add(L, R);
  const rungs = Math.max(4, Math.round(h / 0.32));
  for (let i = 0; i < rungs; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), iron);
    r.position.y = 0.16 + i * (h / rungs);
    g.add(r);
  }
  return g;
}

function makePickupMesh(id) {
  const g = new THREE.Group();
  const gold = mat(0xd4af37, { emissive: 0x553300 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.42), gold);
  box.position.y = 0.22;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), mat(0x66e0ff, { emissive: 0x113344 }));
  gem.position.y = 0.48;
  g.add(box, gem);
  g.userData.spin = gem;
  return g;
}

function makeLight(kind) {
  const g = new THREE.Group();
  if (kind === "campfire") {
    const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.16, 8), mat(0x4a3018));
    logs.position.y = 0.08;
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.42, 6),
      new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    flame.position.y = 0.38;
    const lit = new THREE.PointLight(0xff7722, 6, 10, 1.4);
    lit.position.y = 0.5;
    g.add(logs, flame, lit);
  } else if (kind === "chandelier") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 16), mat(0xd4af37));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.6;
    const lit = new THREE.PointLight(0xffe8a0, 8, 14, 1.2);
    lit.position.y = 2.5;
    g.add(ring, lit);
  } else {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.55, 6), mat(0x4a3018));
    stick.position.y = 0.4;
    const fire = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa44 }),
    );
    fire.position.y = 0.72;
    const lit = new THREE.PointLight(0xffcc66, 5, 8, 1.5);
    lit.position.y = 0.72;
    g.add(stick, fire, lit);
  }
  return g;
}

function makeZoneFlag(col) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.1, 6), mat(0x3a342c));
  pole.position.y = 1.55;
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 0.82),
    new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.4 }),
  );
  cloth.position.set(0.68, 2.55, 0);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: col }));
  ball.position.y = 3.12;
  g.add(pole, cloth, ball);
  g.userData.cloth = cloth;
  g.userData.ball = ball;
  return g;
}

function paintFlag(mesh, hex) {
  if (mesh.userData.cloth?.material) {
    mesh.userData.cloth.material.color.setHex(hex);
    mesh.userData.cloth.material.emissive.setHex(hex);
  }
  if (mesh.userData.ball?.material) mesh.userData.ball.material.color.setHex(hex);
}

export function clearOpenWorld(extras) {
  if (!extras) return;
  if (extras.root) extras.root.removeFromParent();
  extras.root = null;
  extras.solids = [];
  extras.hovers = [];
  extras.spikes = [];
  extras.liquids = [];
  extras.crushers = [];
  extras.turrets = [];
  extras.arrows = [];
  extras.boulders = [];
  extras.ropes = [];
  extras.climbs = [];
  extras.ridges = [];
  extras.pickups = [];
  extras.zoneFlags = [];
  extras.spawners = [];
  extras.windows = [];
  extras.doors = [];
  extras.rumbles = [];
  extras.unstables = [];
}

export function buildOpenWorld(map, scene, api) {
  clearOpenWorld(api.ow);
  const group = new THREE.Group();
  group.name = "ow-world";
  const extras = {
    root: group,
    map,
    solids: [],
    hovers: [],
    spikes: [],
    liquids: [],
    crushers: [],
    turrets: [],
    arrows: [],
    darts: [],
    boulders: [],
    ropes: [],
    climbs: [],
    ridges: [],
    pickups: [],
    zoneFlags: [],
    spawners: [],
    windows: [],
    doors: [],
    rumbles: [],
    unstables: [],
    slopes: [],
  };

  const spikeGeo = new THREE.ConeGeometry(0.18, 0.95, 5);
  const spikeMat = mat(0xb8c0c8, { emissive: 0x4a2010 });
  const pitMat = mat(0x1a1210);

  function placeFlagsAt(story) {
  for (let z = 0; z < map.h; z++) {
    for (let x = 0; x < map.w; x++) {
      const i = idx(map, x, z);
      const gx = worldX(map, x);
      const gz = worldZ(map, z);
      const gy = groundY(api, gx, gz) + ((map.elev[i] || 0) * EYE) + story * STORY_H;
      const fl = flagsAt(map, story)[i] || 0;
      if (fl & FLAG_SPIKE) {
        const well = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.92, 1.2, CELL * 0.92), pitMat);
        well.position.set(gx, gy - 0.4, gz);
        group.add(well);
        for (let k = 0; k < 9; k++) {
          const s = new THREE.Mesh(spikeGeo, spikeMat);
          s.position.set(gx + ((k % 3) - 1) * CELL * 0.28, gy + 0.1, gz + (Math.floor(k / 3) - 1) * CELL * 0.28);
          group.add(s);
        }
        extras.spikes.push({ x: gx, z: gz, y: gy });
      }
      if (fl & FLAG_HOVER || fl & FLAG_COLLAPSE) {
        const hover = !!(fl & FLAG_HOVER);
        const thick = hover ? 0.22 : 0.1;
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(CELL * 0.92, thick, CELL * 0.92),
          hover ? mat(0x8a9aa8, { emissive: 0x223344 }) : mat(0x6a5040, { emissive: 0x331800 }),
        );
        const top = gy + thick;
        m.position.set(gx, top - thick * 0.5, gz);
        group.add(m);
        extras.hovers.push({
          mesh: m, x: gx, z: gz, y: top, hover, collapse: !!(fl & FLAG_COLLAPSE),
          rumble: 0, gone: false, r: CELL * 0.46,
        });
      }
      if (fl & FLAG_RUMBLE) extras.rumbles.push({ x: gx, z: gz, y: gy });
      if (fl & FLAG_UNSTABLE) {
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.96, CELL * 0.96), mat(0x2a2218, { transparent: true, opacity: 0.5 }));
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(gx, gy + STORY_H - 0.06, gz);
        group.add(ceil);
        extras.unstables.push({ mesh: ceil, x: gx, z: gz, y0: gy, t: 0, falling: false });
      }
      if (fl & FLAG_SLOPE) {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.16, CELL), mat(0x7a7468));
        ramp.position.set(gx, gy + 0.4, gz);
        ramp.rotation.x = -0.35;
        group.add(ramp);
        extras.slopes.push({ x: gx, z: gz, y: gy + 0.85, r: CELL * 0.55 });
      }
      const liq = liquidAt(map, story)[i];
      if (liq) {
        const col = liq === LIQ_LAVA ? 0xff5511 : 0x2a6aaa;
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(CELL, CELL),
          new THREE.MeshLambertMaterial({
            color: col, transparent: true, opacity: 0.72, emissive: liq === LIQ_LAVA ? 0xaa2200 : 0x113355,
          }),
        );
        m.rotation.x = -Math.PI / 2;
        m.position.set(gx, gy + 0.12, gz);
        group.add(m);
        extras.liquids.push({ x: gx, z: gz, kind: liq, y: gy + 0.12, mesh: m });
      }
    }
  }
  }
  for (let s = 0; s < STORIES; s++) placeFlagsAt(s);

  for (let story = 0; story < STORIES; story++) {
    const wall = map.bwalls[story];
    if (!wall) continue;
    const floors = enclosedFloors(map, story);
    for (let z = 0; z < map.h; z++) {
      for (let x = 0; x < map.w; x++) {
        const i = idx(map, x, z);
        const tid = wall[i];
        const gx = worldX(map, x);
        const gz = worldZ(map, z);
        const gy = groundY(api, gx, gz);
        const yBase = gy + story * STORY_H;
        if (tid) {
          const texId = WALL_TEX[(wallTexId(tid) - 1) % WALL_TEX.length].id;
          const cracked = wallIsCrack(tid);
          const wm = wmat(texId, cracked);
          const open = openingAt(map, x, z, story);
          if (!open) {
            const box = new THREE.Mesh(new THREE.BoxGeometry(CELL, STORY_H - 0.05, CELL), wm);
            box.position.set(gx, yBase + STORY_H * 0.5, gz);
            group.add(box);
            extras.solids.push({
              x: gx, z: gz, w: CELL * 0.48, d: CELL * 0.48,
              y0: yBase, y1: yBase + STORY_H, mesh: box, cracked, hp: cracked ? 3 : 8,
            });
          } else {
            addOpening(group, extras, open, x, z, yBase, wm, map, gy);
          }
        }
        if (floors[i]) {
          const fl = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.14, CELL), wmat("cabin", false));
          fl.position.set(gx, yBase + 0.07, gz);
          group.add(fl);
          extras.hovers.push({
            mesh: fl, x: gx, z: gz, y: yBase + 0.14, hover: true, collapse: false, rumble: 0, gone: false, r: CELL * 0.48, floor: true,
          });
          const roof = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.1, CELL), wmat("cabin", false));
          roof.position.set(gx, yBase + STORY_H - 0.05, gz);
          group.add(roof);
        }
      }
    }
  }

  function baseY(o) {
    return groundY(api, o.x, o.z) + ((o.story || 0) * STORY_H);
  }

  for (const r of map.ropes || []) {
    const y0 = baseY(r);
    const len = r.len || 4.5;
    const top = y0 + 4.2;
    const hang = Math.min(len, top - y0 - 0.2);
    const chain = r.kind === "chain";
    const mesh = chain ? makeChainMesh() : new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.042, hang, 8), mat(0x6a4424));
    if (!chain) mesh.position.set(r.x, top - hang * 0.5, r.z);
    else mesh.position.set(r.x, top, r.z);
    group.add(mesh);
    extras.ropes.push({ x: r.x, z: r.z, y0: top - hang, top, len: hang, kind: chain ? "chain" : "rope" });
  }

  for (const t of map.turrets || []) {
    const y0 = baseY(t);
    const kind = t.kind || "flame";
    const g = kind === "gun" ? makeGunTurret() : makeFlameTurret();
    g.position.set(t.x, y0, t.z);
    group.add(g);
    extras.turrets.push({
      x: t.x, z: t.z, y: y0 + 0.95, y0, kind, mesh: g, head: g.userData.head,
      hp: 70, cool: 0.4, range: kind === "gun" ? 23 : 16, mag: 24, reload: 0,
    });
  }

  for (const a of map.arrows || []) {
    const y0 = baseY(a);
    const yaw = a.yaw || 0;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.18), mat(0x4a4038));
    box.position.set(a.x, y0 + 1.15, a.z);
    box.rotation.y = yaw;
    group.add(box);
    extras.arrows.push({ x: a.x, z: a.z, y: y0 + 1.15, yaw, cool: 0, mesh: box });
  }

  for (const c of map.crushers || []) {
    const y0 = baseY(c);
    const top = y0 + 4.2;
    const mesh = makeColumn();
    mesh.scale.set(2, 2, 2);
    mesh.position.set(c.x, y0, c.z);
    group.add(mesh);
    extras.crushers.push({ x: c.x, z: c.z, y0, top, mesh, t: Math.random() * 2.8, h: 6.44, r: 1.05 });
  }

  for (const cl of map.climbs || []) {
    const from = cl.from || 0;
    const to = cl.to || from + 1;
    const y0 = groundY(api, cl.x, cl.z) + from * STORY_H + 0.12;
    const y1 = groundY(api, cl.x, cl.z) + to * STORY_H + 0.12;
    const g = cl.kind === "ladder" ? makeLadder(y1 - y0) : makeStairs(y1 - y0);
    g.position.set(cl.x, y0, cl.z);
    g.rotation.y = cl.yaw || 0;
    group.add(g);
    extras.climbs.push({ kind: cl.kind, x: cl.x, z: cl.z, y0, y1, yaw: cl.yaw || 0 });
  }

  for (const b of map.boulders || []) {
    const size = Math.max(0.4, Math.min(3, b.size || 1));
    const r = 0.92 * size;
    const y0 = baseY(b);
    const mesh = makeBoulderMesh();
    mesh.scale.setScalar(size);
    mesh.position.set(b.x, y0 + r, b.z);
    group.add(mesh);
    extras.boulders.push({
      x: b.x, z: b.z, y: y0 + r, yaw: b.yaw || 0, mesh, vx: 0, vz: 0, vy: 0,
      rolling: false, r, size, trigger: b.trigger || 8, hp: 4 + Math.round(size * 2),
    });
  }

  for (const rd of map.ridges || []) {
    const y0 = baseY(rd);
    const h = (rd.elev || 1) * EYE;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.4, 0.12, CELL * 1.2), mat(0x6a6058));
    slab.position.set(rd.x, y0 + h, rd.z);
    group.add(slab);
    extras.ridges.push({ x: rd.x, z: rd.z, y: y0 + h, h });
  }

  for (const o of map.objects || []) {
    const y0 = baseY(o);
    const g = makeLight(o.id);
    g.position.set(o.x, y0, o.z);
    group.add(g);
  }

  for (const p of map.pickups || []) {
    const y0 = baseY(p);
    const mesh = makePickupMesh(p.id);
    mesh.position.set(p.x, y0, p.z);
    group.add(mesh);
    const def = PICKUPS.find((k) => k.id === p.id) || { id: p.id, name: p.id, kind: "wep" };
    extras.pickups.push({ id: p.id, def, x: p.x, z: p.z, y: y0, mesh, taken: false });
  }

  for (const f of map.zoneFlags || []) {
    const y0 = baseY(f);
    const mesh = makeZoneFlag(0x8a8680);
    mesh.position.set(f.x, y0, f.z);
    group.add(mesh);
    extras.zoneFlags.push({ x: f.x, z: f.z, mesh, owner: "neutral", dwell: 0, captureCd: 0 });
  }

  for (const s of map.spawners || []) {
    extras.spawners.push({
      kind: s.kind || "horde",
      x: s.x, z: s.z,
      interval: Math.max(0.5, s.interval || 8),
      radius: s.radius || 10,
      max: s.max || 3,
      t: Math.random() * 2,
      live: 0,
    });
  }

  scene.add(group);
  api.ow = extras;
  return extras;
}

function near(ax, az, bx, bz, r) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz <= r * r;
}

export function owHeight(extras, x, z, y, h) {
  if (!extras) return h;
  for (const p of extras.hovers) {
    if (p.gone) continue;
    if (Math.hypot(x - p.x, z - p.z) > p.r) continue;
    if (p.hover) {
      if (y != null && y >= p.y - 0.5 && y <= p.y + 0.6) h = Math.max(h, p.y);
    } else h = Math.max(h, p.y);
  }
  for (const s of extras.slopes) {
    if (Math.hypot(x - s.x, z - s.z) < s.r) h = Math.max(h, s.y);
  }
  for (const c of extras.climbs) {
    if (Math.hypot(x - c.x, z - c.z) < 0.7) {
      const t = Math.max(0, Math.min(1, ((y || c.y0) - c.y0) / Math.max(0.2, c.y1 - c.y0)));
      h = Math.max(h, c.y0 + t * (c.y1 - c.y0));
    }
  }
  return h;
}

export function owPush(extras, x, z, y) {
  if (!extras) return { x, z };
  let nx = x, nz = z;
  for (const s of extras.solids) {
    if (s.hp != null && s.hp <= 0) continue;
    if (y != null && (y < s.y0 - 0.2 || y > s.y1 + 0.3)) continue;
    if (s.pass === "window" && y != null && y > s.y0 + 1.1 && y < s.y1 - 0.4) continue;
    const dx = nx - s.x;
    const dz = nz - s.z;
    if (Math.abs(dx) > s.w + 0.28 || Math.abs(dz) > s.d + 0.28) continue;
    if (Math.abs(dx) / (s.w + 0.28) > Math.abs(dz) / (s.d + 0.28)) nx = s.x + Math.sign(dx || 1) * (s.w + 0.3);
    else nz = s.z + Math.sign(dz || 1) * (s.d + 0.3);
  }
  return { x: nx, z: nz };
}

export function owHitSolid(extras, pos, r, dmg) {
  if (!extras) return false;
  let hit = false;
  for (const s of extras.solids) {
    if (s.hp == null || s.hp <= 0) continue;
    if (Math.abs(pos.x - s.x) > s.w + r || Math.abs(pos.z - s.z) > s.d + r) continue;
    if (pos.y < s.y0 - r || pos.y > s.y1 + r) continue;
    s.hp -= dmg || 1;
    hit = true;
    if (s.hp <= 0 && s.mesh) s.mesh.removeFromParent();
  }
  return hit;
}

export function tickOpenWorld(extras, dt, api) {
  if (!extras) return;
  const p = api.player;

  for (const c of extras.crushers) {
    c.t += dt * 1.15;
    const cycle = 2.8;
    const t = c.t % cycle;
    const slam = t < 0.45;
    const y = slam ? c.y0 + Math.max(0, 1 - t / 0.18) * (c.top - c.y0) : c.y0 + Math.min(1, (t - 0.45) / 1.6) * (c.top - c.y0);
    c.mesh.position.y = y;
    if (slam && t < 0.22) {
      if (near(p.x, p.z, c.x, c.z, c.r) && p.y < y + 2.2) api.damage(2);
      for (const m of api.mobs) {
        if (!m.alive) continue;
        if (near(m.x, m.z, c.x, c.z, c.r + m.hitR) && m.y < y + 2.2) api.crushMob(m);
      }
    }
  }

  for (const t of extras.turrets) {
    t.cool -= dt;
    if (t.reload > 0) { t.reload -= dt; continue; }
    let best = null, bd = t.range;
    const pd = Math.hypot(p.x - t.x, p.z - t.z);
    if (pd < bd) { bd = pd; best = { kind: "player", x: p.x, y: p.y, z: p.z }; }
    for (const m of api.mobs) {
      if (!m.alive) continue;
      const d = Math.hypot(m.x - t.x, m.z - t.z);
      if (d < bd) { bd = d; best = { kind: "mob", m, x: m.x, y: m.y, z: m.z }; }
    }
    if (!best) continue;
    if (t.head) t.head.lookAt(best.x, best.y, best.z);
    if (t.cool > 0) continue;
    if (t.kind === "gun") {
      t.mag--;
      if (t.mag <= 0) { t.reload = 5; t.mag = 24; continue; }
      t.cool = 0.12;
      api.trapShot(t.x, t.y, t.z, best.x, best.y, best.z, { dmg: 1, speed: 48, aoe: 0 });
    } else {
      t.cool = 0.35;
      api.trapFlame(t.x, t.y, t.z, best.x, best.y, best.z);
    }
  }

  for (const a of extras.arrows) {
    a.cool -= dt;
    const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw);
    const dx = p.x - a.x, dz = p.z - a.z;
    const along = dx * fx + dz * fz;
    const side = dx * -fz + dz * fx;
    if (a.cool <= 0 && along > 0.4 && along < 8 && Math.abs(side) < 0.7) {
      a.cool = 3;
      api.trapShot(a.x, a.y, a.z, a.x + fx * 8, a.y, a.z + fz * 8, { dmg: 1, speed: 36, aoe: 0, dart: true });
    }
  }

  for (const b of extras.boulders) {
    if (b.hp <= 0) continue;
    if (!b.rolling) {
      if (near(p.x, p.z, b.x, b.z, b.trigger)) {
        b.rolling = true;
        b.vx = -Math.sin(b.yaw) * 7.1;
        b.vz = -Math.cos(b.yaw) * 7.1;
      }
    } else {
      b.vy -= 16 * dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y += b.vy * dt;
      const hy = groundY(api, b.x, b.z) + b.r;
      if (b.y < hy) { b.y = hy; b.vy = 0; }
      b.mesh.position.set(b.x, b.y, b.z);
      b.mesh.rotation.x += dt * 4;
      if (near(p.x, p.z, b.x, b.z, b.r + 0.45)) api.damage(2);
      for (const m of api.mobs) {
        if (!m.alive) continue;
        if (near(m.x, m.z, b.x, b.z, b.r + m.hitR)) api.crushMob(m);
      }
    }
  }

  for (const s of extras.spikes) {
    if (near(p.x, p.z, s.x, s.z, CELL * 0.42) && p.y < s.y + 1.4) api.damage(1);
  }

  for (const l of extras.liquids) {
    if (l.kind !== LIQ_LAVA) continue;
    if (near(p.x, p.z, l.x, l.z, CELL * 0.45) && p.y < l.y + 1.2) api.damage(1);
  }

  for (const h of extras.hovers) {
    if (!h.collapse || h.gone) continue;
    if (near(p.x, p.z, h.x, h.z, h.r) && p.y < h.y + 1.2) {
      h.rumble += dt;
      h.mesh.position.x = h.x + Math.sin(h.rumble * 28) * 0.04;
      if (h.rumble > 0.85) {
        h.gone = true;
        h.mesh.removeFromParent();
        api.pitAt(h.x, h.z);
      }
    }
  }

  for (const u of extras.unstables) {
    if (u.falling) {
      u.t += dt;
      u.mesh.position.y -= dt * 9;
      if (u.t > 2) { u.mesh.visible = false; u.falling = false; }
      continue;
    }
    if (near(p.x, p.z, u.x, u.z, CELL * 0.5)) {
      u.t += dt;
      if (u.t > 0.4 + Math.random() * 1.4) u.falling = true;
    }
  }

  for (let i = extras.pickups.length - 1; i >= 0; i--) {
    const pk = extras.pickups[i];
    if (pk.taken) continue;
    if (pk.mesh.userData.spin) pk.mesh.userData.spin.rotation.y += dt * 2.2;
    pk.mesh.position.y = pk.y + 0.12 + Math.sin(performance.now() * 0.004) * 0.08;
    if (near(p.x, p.z, pk.x, pk.z, 1.15) && Math.abs(p.y - pk.y) < 2.2) {
      if (api.grantPickup(pk.def, "player")) {
        pk.taken = true;
        pk.mesh.removeFromParent();
      }
    } else {
      for (const m of api.mobs) {
        if (!m.alive || !m.army) continue;
        if (!near(m.x, m.z, pk.x, pk.z, 1.1)) continue;
        if (api.grantPickup(pk.def, m)) {
          pk.taken = true;
          pk.mesh.removeFromParent();
          break;
        }
      }
    }
  }

  const playerCol = api.teamColor();
  const armyCol = 0x3a7a32;
  const hordeCol = 0xff3355;
  for (const f of extras.zoneFlags) {
    if (f.mesh.userData.cloth) f.mesh.userData.cloth.rotation.y = Math.sin(performance.now() * 0.003) * 0.25;
    f.captureCd = Math.max(0, (f.captureCd || 0) - dt);
    const playerNear = near(p.x, p.z, f.x, f.z, 2.1);
    if (playerNear && f.owner !== "player" && f.captureCd <= 0) {
      f.owner = "player";
      f.captureCd = 0.6;
      paintFlag(f.mesh, playerCol);
      api.onFlagCapture(f, 25);
    }
    let foe = null;
    for (const m of api.mobs) {
      if (!m.alive || m.hired) continue;
      if (!api.isHostileToPlayer(m)) continue;
      if (near(m.x, m.z, f.x, f.z, 2.1)) { foe = m; break; }
    }
    if (foe && f.owner === "player") {
      f.dwell = (f.dwell || 0) + dt;
      if (f.dwell > 1.6) {
        f.owner = foe.army ? "army" : "horde";
        f.dwell = 0;
        paintFlag(f.mesh, foe.army ? armyCol : hordeCol);
        api.onFlagLost(f);
      }
    } else f.dwell = 0;
  }

  for (const s of extras.spawners) {
    s.t -= dt;
    if (s.t > 0) continue;
    s.t = s.interval;
    s.live = api.countNear(s.x, s.z, s.radius, s.kind);
    if (s.live >= s.max) continue;
    const ang = Math.random() * Math.PI * 2;
    const d = 1.5 + Math.random() * 2;
    api.spawnAt(s.kind, s.x + Math.cos(ang) * d, s.z + Math.sin(ang) * d);
  }

  for (const r of extras.ropes) {
    if (near(p.x, p.z, r.x, r.z, 0.55) && p.y > r.y0 - 0.4 && p.y < r.top + 0.4) {
      api.holdRope(r);
    }
  }
}

export function owShotHit(extras, pos) {
  if (!extras) return false;
  for (const s of extras.solids) {
    if (s.hp != null && s.hp <= 0) continue;
    if (Math.abs(pos.x - s.x) > s.w + 0.18 || Math.abs(pos.z - s.z) > s.d + 0.18) continue;
    if (pos.y < s.y0 - 0.18 || pos.y > s.y1 + 0.18) continue;
    if (s.pass === "window" && pos.y > s.y0 + 1.15 && pos.y < s.y1 - 0.35) continue;
    return true;
  }
  return false;
}
