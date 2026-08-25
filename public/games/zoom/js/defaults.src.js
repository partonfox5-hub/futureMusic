/** Baked maps so /zoom is playable before the first save. */
import { CELL, SHAPE_FLAT, SHAPE_OVAL, SHAPE_ROUND, SHAPE_SPHERE } from "./config.js?v=sw3";
import { addSphere, blankMap, stampDisk, stampRect } from "./map.js?v=sw3";

function startOn(m, cx, cz, yaw) {
  m.start = { x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL, yaw: yaw || 0 };
}

function spawner(m, cx, cz, enemy, interval, radius, maxAlive) {
  m.spawners.push({
    x: (cx + 0.5) * CELL,
    z: (cz + 0.5) * CELL,
    enemy,
    interval,
    radius,
    maxAlive: maxAlive || 3,
  });
}

function obj(m, kind, cx, cz, s, rot) {
  m.objects.push({
    kind,
    x: (cx + 0.5) * CELL,
    z: (cz + 0.5) * CELL,
    s: s || 1,
    rot: rot || 0,
  });
}

export function makeTheSquare() {
  const m = blankMap("The Square");
  m.id = "baked-square";
  m.hallH = 4.4;
  stampRect(m, 28, 28, 68, 68, 0.2, SHAPE_FLAT, 1, false, false);
  startOn(m, 32, 32, 0.4);
  obj(m, "torch", 30, 30, 1, 0);
  obj(m, "torch", 66, 30, 1, 0);
  obj(m, "torch", 30, 66, 1, 0);
  obj(m, "torch", 66, 66, 1, 0);
  obj(m, "crate", 36, 40, 1, 0.2);
  obj(m, "crate", 38, 41, 0.85, -0.4);
  obj(m, "barrel", 60, 36, 1, 0);
  obj(m, "chest", 48, 60, 1, Math.PI);
  obj(m, "pillar", 40, 48, 1, 0);
  obj(m, "pillar", 56, 48, 1, 0);
  obj(m, "altar", 48, 48, 1, 0);
  spawner(m, 60, 60, "wolf", 7, 10, 3);
  spawner(m, 36, 60, "skeleton", 9, 12, 2);
  m.updated = 1;
  return m;
}

export function makeTheCircuit() {
  const m = blankMap("The Circuit");
  m.id = "baked-circuit";
  m.hallH = 3.8;
  stampRect(m, 18, 18, 78, 78, 1.6, SHAPE_ROUND, 1, false, true);
  startOn(m, 18, 22, 0);
  obj(m, "torch", 18, 30, 1, 0);
  obj(m, "torch", 18, 50, 1, 0);
  obj(m, "torch", 18, 70, 1, 0);
  obj(m, "torch", 40, 18, 1, 0);
  obj(m, "torch", 60, 18, 1, 0);
  obj(m, "torch", 78, 40, 1, 0);
  obj(m, "torch", 78, 60, 1, 0);
  obj(m, "torch", 50, 78, 1, 0);
  obj(m, "banner", 48, 18, 1, 0);
  obj(m, "bones", 78, 48, 1, 0.5);
  spawner(m, 48, 18, "bandit", 8, 9, 2);
  spawner(m, 78, 48, "wolf", 6, 8, 3);
  spawner(m, 48, 78, "lizard", 8, 9, 2);
  spawner(m, 18, 48, "slime", 5, 7, 4);
  m.updated = 2;
  return m;
}

export function makeTheDelve() {
  const m = blankMap("The Delve");
  m.id = "baked-delve";
  m.hallH = 4.6;
  stampRect(m, 8, 10, 28, 28, 0.2, SHAPE_FLAT, 5, false, false);
  stampRect(m, 26, 16, 52, 20, 1.1, SHAPE_ROUND, 2, false, false);
  stampRect(m, 50, 8, 72, 30, 0.2, SHAPE_FLAT, 6, false, false);
  stampRect(m, 18, 26, 22, 52, 1.2, SHAPE_OVAL, 3, false, false);
  stampRect(m, 16, 50, 40, 72, 0.2, SHAPE_FLAT, 7, false, false);
  stampRect(m, 38, 58, 70, 62, 1.15, SHAPE_ROUND, 4, false, false);
  stampDisk(m, 78, 78, 4, SHAPE_SPHERE, 8, false);
  addSphere(m, (78 + 0.5) * CELL, (78 + 0.5) * CELL, 7.2, 8);
  stampRect(m, 68, 60, 78, 78, 1.3, SHAPE_OVAL, 8, false, false);
  startOn(m, 12, 14, 0.2);
  obj(m, "torch", 10, 12, 1, 0);
  obj(m, "torch", 26, 12, 1, 0);
  obj(m, "bookshelf", 10, 24, 1, 0.2);
  obj(m, "chair", 14, 20, 1, 0.8);
  obj(m, "table", 16, 20, 1, 0.2);
  obj(m, "coffin", 60, 12, 1, 1.2);
  obj(m, "banner", 64, 8, 1, 0);
  obj(m, "campfire", 20, 60, 1, 0);
  obj(m, "mushroom", 22, 64, 1, 0);
  obj(m, "mushroom", 24, 62, 0.7, 0.4);
  obj(m, "stalagmite", 18, 68, 1, 0);
  obj(m, "crystal", 78, 78, 1.4, 0);
  obj(m, "crystal", 76, 74, 0.8, 0.6);
  obj(m, "altar", 62, 20, 1, 0);
  obj(m, "cage", 54, 14, 1, 0);
  obj(m, "spikes", 40, 60, 1, 0);
  obj(m, "fountain", 30, 60, 1, 0);
  obj(m, "anvil", 68, 24, 1, 0.3);
  spawner(m, 20, 18, "bandit", 10, 8, 2);
  spawner(m, 62, 18, "wraith", 12, 10, 2);
  spawner(m, 24, 62, "lizardfolk", 8, 11, 3);
  spawner(m, 78, 78, "dragon", 16, 9, 1);
  spawner(m, 60, 60, "skeleton", 7, 10, 3);
  m.updated = 3;
  return m;
}

export function bakedMaps() {
  return [makeTheSquare(), makeTheCircuit(), makeTheDelve()];
}
