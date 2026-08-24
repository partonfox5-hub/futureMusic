/** Buildings, liquids, skyboxes, traps, doors, portals, ropes. */
import * as THREE from "three";
import {
  CELL,
  EYE,
  FLAG_SPIKE,
  PORTAL_COLORS,
  STORY_H,
  STORIES,
  WALL_TEX,
} from "./config.js";
import { cellI, idx, inBounds, isCarved } from "./map.js";

function mat(hex, extra) {
  return new THREE.MeshLambertMaterial({ color: hex, ...extra });
}

function wallMat(id) {
  const pal = {
    castle: [0x8a8078, 0x5a5048],
    manor: [0x6a4a38, 0xc4b49a],
    metal: [0x6a7078, 0x9aa0a8],
    siding: [0xc8b898, 0x8a7a62],
    straw: [0xc4a050, 0x8a7030],
    cabin: [0x8a5a32, 0x5a3818],
    space: [0x2a3848, 0x4ad0ff],
  }[id] || [0x888, 0x444];
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  g.fillStyle = "#" + pal[0].toString(16).padStart(6, "0");
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = "#" + pal[1].toString(16).padStart(6, "0");
  if (id === "castle" || id === "manor") {
    for (let y = 0; y < 32; y += 8) {
      const o = (y / 8) % 2 ? 4 : 0;
      for (let x = -8; x < 32; x += 16) g.fillRect(x + o + 1, y + 1, 14, 6);
    }
  } else if (id === "siding" || id === "cabin") {
    for (let y = 0; y < 32; y += 4) g.fillRect(0, y, 32, 1);
  } else if (id === "space") {
    g.fillRect(0, 8, 32, 1);
    g.fillRect(0, 24, 32, 1);
  } else {
    for (let i = 0; i < 20; i++) g.fillRect((i * 7) % 32, (i * 11) % 32, 3, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: t });
}

const WMAT = {};
function wmat(id) {
  return (WMAT[id] ||= wallMat(id));
}

export function makeSky(kind) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  if (kind === 1) {
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, "#7ec8ff");
    grd.addColorStop(1, "#d8ecff");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#fff8e0";
    g.beginPath();
    g.arc(200, 50, 28, 0, 6.28);
    g.fill();
  } else if (kind === 2) {
    g.fillStyle = "#060814";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#e8e8ff";
    for (let i = 0; i < 80; i++) g.fillRect((i * 37) % 256, (i * 91) % 256, 2, 2);
    g.fillStyle = "#d0d8e8";
    g.beginPath();
    g.arc(40, 40, 18, 0, 6.28);
    g.fill();
  } else {
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, "#6aa0c8");
    grd.addColorStop(0.45, "#4a8a50");
    grd.addColorStop(1, "#1a3a18");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function enclosedFloors(map, story) {
  const w = map.w;
  const h = map.h;
  const wall = map.bwalls[story];
  const floor = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      if (wall[i] || seen[i]) continue;
      const q = [x, z];
      seen[i] = 1;
      const pts = [];
      let border = false;
      while (q.length) {
        const cz = q.pop();
        const cx = q.pop();
        if (cx === 0 || cz === 0 || cx === w - 1 || cz === h - 1) border = true;
        pts.push(cx, cz);
        const n = [cx - 1, cz, cx + 1, cz, cx, cz - 1, cx, cz + 1];
        for (let k = 0; k < 8; k += 2) {
          const nx = n[k];
          const nz = n[k + 1];
          if (!inBounds(map, nx, nz)) {
            border = true;
            continue;
          }
          const j = nz * w + nx;
          if (seen[j] || wall[j]) continue;
          seen[j] = 1;
          q.push(nx, nz);
        }
      }
      if (!border && pts.length > 4) {
        for (let p = 0; p < pts.length; p += 2) floor[pts[p + 1] * w + pts[p]] = 1;
      }
    }
  }
  return floor;
}

function openingAt(map, x, z, story) {
  return (map.openings || []).find((o) => o.x === x && o.z === z && (o.story || 0) === story);
}

export function buildWorld(map, dungeon, scene) {
  const group = new THREE.Group();
  group.name = "world";
  const extras = { crushers: [], turrets: [], ropes: [], portals: [], doors: [], windows: [], liquids: [], spikes: [] };

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
          const texId = WALL_TEX[(tid - 1) % WALL_TEX.length].id;
          const wm = wmat(texId);
          if (!open) {
            const box = new THREE.Mesh(new THREE.BoxGeometry(CELL, STORY_H - 0.05, CELL), wm);
            box.position.set((x + 0.5) * CELL, yBase + STORY_H * 0.5, (z + 0.5) * CELL);
            group.add(box);
          } else {
            addOpening(group, extras, open, x, z, yBase, wm);
          }
        }
        if (floors[i]) {
          const fl = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.12, CELL), wmat("cabin"));
          fl.position.set((x + 0.5) * CELL, yBase + 0.06, (z + 0.5) * CELL);
          group.add(fl);
          const roof = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.1, CELL), wmat("cabin"));
          roof.position.set((x + 0.5) * CELL, yBase + STORY_H - 0.05, (z + 0.5) * CELL);
          group.add(roof);
        }
      }
    }
  }

  for (const r of map.ropes || []) {
    const y0 = ((map.elev && map.elev[cellI(map, r.x, r.z)]) || 0) * EYE;
    const len = r.len || 4.5;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 6), mat(0x6a4424));
    mesh.position.set(r.x, y0 + len * 0.5 + 1.2, r.z);
    group.add(mesh);
    extras.ropes.push({ x: r.x, z: r.z, y0: y0 + 1.2, len, mesh });
  }

  for (const t of map.turrets || []) {
    const y0 = ((map.elev && map.elev[cellI(map, t.x, t.z)]) || 0) * EYE;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.5, 8), mat(0x444)));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.55), mat(0x8a2020, { emissive: 0x3a0800 }));
    head.position.y = 0.45;
    g.add(head);
    g.position.set(t.x, y0, t.z);
    group.add(g);
    extras.turrets.push({ x: t.x, z: t.z, y: y0 + 0.5, mesh: g, head, cool: 0.4 });
  }

  for (const c of map.crushers || []) {
    const y0 = ((map.elev && map.elev[cellI(map, c.x, c.z)]) || 0) * EYE;
    const top = y0 + (map.hallH || 4.2);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.4), mat(0x5a5854, { emissive: 0x221108 }));
    mesh.position.set(c.x, y0 + 0.4, c.z);
    group.add(mesh);
    extras.crushers.push({ x: c.x, z: c.z, y0, top, mesh, t: Math.random() * 6 });
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

  map._floors = [0, 1, 2].map((s) => enclosedFloors(map, s));
  dungeon.add(group);
  scene.add(group);
  return extras;
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

function addOpening(group, extras, open, x, z, yBase, wm) {
  const px = (x + 0.5) * CELL;
  const pz = (z + 0.5) * CELL;
  const h = STORY_H;
  const doorH = open.type === "window" ? h * 0.45 : h * 0.78;
  const yOff = open.type === "window" ? yBase + h * 0.55 : yBase + doorH * 0.5;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.12, CELL), wm);
  frame.position.set(px, yBase + h - 0.06, pz);
  group.add(frame);
  if (open.type === "arch") {
    const sides = new THREE.Mesh(new THREE.BoxGeometry(0.18, doorH, CELL), wm);
    sides.position.set(px - CELL * 0.4, yBase + doorH * 0.5, pz);
    group.add(sides);
    const sides2 = sides.clone();
    sides2.position.x = px + CELL * 0.4;
    group.add(sides2);
    return;
  }
  if (open.type === "window") {
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(CELL * 0.7, doorH, 0.06),
      mat(0x88ccee, { transparent: true, opacity: 0.35, emissive: 0x224466 }),
    );
    glass.position.set(px, yOff, pz);
    glass.userData.window = true;
    group.add(glass);
    extras.windows.push({ mesh: glass, hp: 2, x: px, z: pz, y: yOff });
    return;
  }
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(CELL * 0.72, doorH, 0.08),
    mat(open.locked ? 0x5a3020 : 0x6a4428),
  );
  door.position.set(px, yBase + doorH * 0.5, pz);
  group.add(door);
  extras.doors.push({
    mesh: door,
    x: px,
    z: pz,
    y: yBase,
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
    const fl = map._floors[s];
    if (fl && fl[idx(map, gx, gz)]) {
      const fy = s * STORY_H + 0.12;
      if (fy <= y + 0.4 && fy > best) best = fy;
    }
  }
  return best;
}

export function tickWorld(extras, dt, player, foes, onHit, scene) {
  for (const c of extras.crushers) {
    c.t += dt;
    const u = (Math.sin(c.t * 1.1) + 1) * 0.5;
    const y = c.y0 + 0.35 + u * Math.max(0.6, c.top - c.y0 - 0.8);
    c.mesh.position.y = y;
    if (Math.hypot(player.x - c.x, player.z - c.z) < 0.85) {
      if (player.y < y + 0.35 && player.y > c.y0 + 0.2 && u > 0.55) onHit(40, "crushed");
    }
  }
  for (const t of extras.turrets) {
    t.cool -= dt;
    const dx = player.x - t.x;
    const dz = player.z - t.z;
    const d = Math.hypot(dx, dz) || 1;
    t.head.rotation.y = Math.atan2(dx, dz);
    if (d < 14 && t.cool <= 0) {
      t.cool = 0.18;
      spawnFlame(scene, t.x, t.y, t.z, dx / d, dz / d, extras);
    }
  }
  extras._flames = extras._flames || [];
  for (let i = extras._flames.length - 1; i >= 0; i--) {
    const f = extras._flames[i];
    f.life -= dt;
    f.mesh.position.addScaledVector(f.dir, 11 * dt);
    if (f.mesh.position.distanceTo(new THREE.Vector3(player.x, player.y, player.z)) < 0.7) {
      onHit(4, "burned");
      f.life = 0;
    }
    if (f.life <= 0) {
      f.mesh.removeFromParent();
      extras._flames.splice(i, 1);
    }
  }
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
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat(0xff6622, { emissive: 0xff3300 }));
  m.position.set(x, y, z);
  scene.add(m);
  extras._flames = extras._flames || [];
  extras._flames.push({ mesh: m, dir: new THREE.Vector3(dx, 0.05, dz), life: 0.7 });
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
      d.mesh.rotation.y = 1.4;
      d.mesh.position.x += 0.4;
      return d.keyId;
    }
  }
  return null;
}

export function breakWindows(extras, origin, dir, range) {
  for (const w of extras.windows) {
    if (w.broken) continue;
    const dx = w.x - origin.x;
    const dy = w.y - origin.y;
    const dz = w.z - origin.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > range) continue;
    if ((dx * dir.x + dz * dir.z) / (d || 1) < 0.45) continue;
    w.hp--;
    if (w.hp <= 0) {
      w.broken = true;
      w.mesh.visible = false;
    }
  }
}
