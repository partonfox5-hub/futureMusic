/** Random dungeon generator. */
import { CELL, ENEMIES, PICKUPS, SHAPE_FLAT, SHAPE_OVAL, SHAPE_ROUND, SHAPE_SPHERE } from "./config.js";
import { addSphere, blankMap, pack, stampRect } from "./map.js";

function rand(a, b) {
  return a + Math.random() * (b - a);
}
function irand(a, b) {
  return (a + Math.floor(Math.random() * (b - a + 1))) | 0;
}

export function makeProc(seedName) {
  const m = blankMap(seedName || "Generated Delve");
  m.id = "proc-" + Math.random().toString(36).slice(2, 9);
  const rooms = [];
  const n = irand(6, 11);
  for (let i = 0; i < n; i++) {
    const w = irand(6, 14);
    const h = irand(6, 12);
    const x = irand(8, m.w - 16 - w);
    const z = irand(8, m.h - 16 - h);
    const shape = [SHAPE_FLAT, SHAPE_ROUND, SHAPE_OVAL, SHAPE_SPHERE][irand(0, 3)];
    const tex = irand(0, 8);
    rooms.push({ x, z, w, h, shape, tex });
    if (shape === SHAPE_SPHERE) {
      stampRect(m, x, z, x + w, z + h, 0.2, SHAPE_SPHERE, tex, false, false);
      addSphere(m, (x + w * 0.5) * CELL, (z + h * 0.5) * CELL, Math.min(w, h) * CELL * 0.42, tex);
    } else stampRect(m, x, z, x + w, z + h, 0.2, shape, tex, false, false);
  }
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    const ax = a.x + (a.w >> 1);
    const az = a.z + (a.h >> 1);
    const bx = b.x + (b.w >> 1);
    const bz = b.z + (b.h >> 1);
    const tex = a.tex;
    const shape = Math.random() < 0.5 ? SHAPE_ROUND : SHAPE_FLAT;
    stampRect(m, ax, az, bx, az, 1.1, shape, tex, false, false);
    stampRect(m, bx, az, bx, bz, 1.1, shape, tex, false, false);
  }
  const r0 = rooms[0];
  m.start = { x: (r0.x + 2) * CELL, z: (r0.z + 2) * CELL, yaw: 0 };
  const bots = ENEMIES.filter((e) => e.robot);
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    const enemy = bots[irand(0, bots.length - 1)] || ENEMIES[0];
    m.spawners.push({
      x: (r.x + r.w * 0.5) * CELL,
      z: (r.z + r.h * 0.5) * CELL,
      enemy: enemy.id,
      interval: rand(5, 12),
      radius: rand(6, 12),
      maxAlive: irand(2, 5),
    });
    const pk = PICKUPS[irand(0, PICKUPS.length - 1)];
    m.pickups.push({ kind: pk.id, x: (r.x + 2) * CELL, z: (r.z + 2) * CELL });
    if (Math.random() < 0.4) {
      m.turrets.push({ x: (r.x + r.w - 2) * CELL, z: (r.z + 2) * CELL });
    }
    if (Math.random() < 0.25) {
      m.ropes.push({ x: (r.x + r.w * 0.5) * CELL, z: (r.z + r.h - 2) * CELL, len: 4.2 });
    }
  }
  m.pickups.push({ kind: "jetpack", x: m.start.x + 2, z: m.start.z });
  m.pickups.push({ kind: "pistol", x: m.start.x + 1.4, z: m.start.z + 1.2 });
  m.updated = Date.now();
  return m;
}
