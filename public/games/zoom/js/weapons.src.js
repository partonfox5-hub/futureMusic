/** Weapon models, lasers/plasma, burn marks, pickups. */
import * as THREE from "three";
import { PICKUP_BY_ID, WEAPON_BY_ID, WEAPONS } from "./config.js?v=sw3";
import { hurtTurrets, impulseBoulders, smashGlass } from "./world.js?v=sw3";

function mat(hex, extra) {
  return new THREE.MeshLambertMaterial({ color: hex, ...extra });
}

export function makeWeapon(id) {
  const def = WEAPON_BY_ID[id];
  const g = new THREE.Group();
  g.userData.weapon = id;
  g.userData.def = def;
  const iron = mat(0x4a4e54);
  const dark = mat(0x2a2218);
  const glow = mat(def?.color || 0x66ccff, { emissive: def?.color || 0x66ccff });
  if (!def) {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.4), iron));
    return g;
  }
  if (def.slot === "melee") {
    if (def.saber) {
      const col = def.color || 0x3399ff;
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.18, 8), dark);
      hilt.rotation.x = Math.PI / 2;
      hilt.position.z = 0.06;
      g.add(hilt);
      const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.04, 8), mat(0x222, { emissive: 0x111 }));
      emitter.rotation.x = Math.PI / 2;
      emitter.position.z = -0.04;
      g.add(emitter);
      const blade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.012, 0.95, 8),
        mat(col, { emissive: col, transparent: true, opacity: 0.95 }),
      );
      blade.rotation.x = Math.PI / 2;
      blade.position.z = -0.54;
      g.add(blade);
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.006, 0.92, 6),
        mat(0xffffff, { emissive: 0xffffff }),
      );
      core.rotation.x = Math.PI / 2;
      core.position.z = -0.54;
      g.add(core);
      g.add(new THREE.PointLight(col, 0.7, 3.2));
    } else if (id === "whip") {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 6), dark);
      h.rotation.x = Math.PI / 2;
      g.add(h);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 1.4, 5), mat(0x3a2a18));
      cord.position.z = -0.85;
      cord.rotation.x = Math.PI / 2;
      g.add(cord);
    } else if (id === "katana") {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.92), mat(0xd0d8e0, { emissive: 0x334455 }));
      blade.position.z = -0.5;
      g.add(blade);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), mat(0x222)));
      const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.16), dark);
      hilt.position.z = 0.1;
      g.add(hilt);
    } else {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.72), mat(0xc8d0d8));
      blade.position.z = -0.42;
      g.add(blade);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.04), mat(0xc4a050)));
      const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.16), dark);
      hilt.position.z = 0.1;
      g.add(hilt);
    }
  } else if (id === "flamethrower") {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.55, 8), iron);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0x8a2020, { emissive: 0x3a0800 }));
    tank.position.set(0.08, -0.04, 0.05);
    g.add(tank);
  } else if (id === "bazooka") {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.7, 8), iron);
    tube.rotation.x = Math.PI / 2;
    g.add(tube);
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.16, 8), glow);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -0.4;
    g.add(nose);
  } else if (id === "shotgun") {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.55), iron);
    g.add(b);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6), glow);
    bar.rotation.x = Math.PI / 2;
    bar.position.z = -0.28;
    g.add(bar);
  } else {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.28), iron);
    g.add(b);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.22), glow);
    bar.position.z = -0.22;
    g.add(bar);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), dark);
    grip.position.set(0, -0.08, 0.04);
    g.add(grip);
  }
  return g;
}

export function makeDualSaber() {
  const g = new THREE.Group();
  const blue = mat(0x3a6aaa, { emissive: 0x123044 });
  const chrome = mat(0x8aa0b4, { emissive: 0x223040 });
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.22, 12), blue);
  hilt.rotation.x = Math.PI / 2;
  g.add(hilt);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 6, 12), chrome);
  band.rotation.y = Math.PI / 2;
  g.add(band);
  const emitterA = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), mat(0x1a2430, { emissive: 0x111 }));
  emitterA.rotation.x = Math.PI / 2;
  emitterA.position.z = -0.12;
  const emitterB = emitterA.clone();
  emitterB.position.z = 0.12;
  g.add(emitterA, emitterB);
  function blade(col, sign) {
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.01, 0.92, 8),
      mat(col, { emissive: col, transparent: true, opacity: 0.92 }),
    );
    b.rotation.x = Math.PI / 2;
    b.position.z = sign * 0.58;
    g.add(b);
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.005, 0.9, 6),
      mat(0xffffff, { emissive: 0xffffff }),
    );
    core.rotation.x = Math.PI / 2;
    core.position.z = sign * 0.58;
    g.add(core);
    g.add(new THREE.PointLight(col, 0.45, 2.6));
  }
  blade(0x33dd55, -1);
  blade(0xff3333, 1);
  g.userData.dualSaber = true;
  g.userData.tips = [
    { color: 0x33dd55, z: -1.04 },
    { color: 0xff3333, z: 1.04 },
  ];
  return g;
}

export function makeKeyModel() {
  const g = new THREE.Group();
  const gold = mat(0xe2c15a, { emissive: 0x5a3a08 });
  const dark = mat(0x8a6a28);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.028, 8, 18), gold);
  bow.rotation.y = Math.PI / 2;
  bow.position.y = 0.2;
  g.add(bow);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), gold);
  shaft.position.y = -0.02;
  g.add(shaft);
  const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.024), dark);
  bit1.position.set(0.045, -0.155, 0);
  g.add(bit1);
  const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.032, 0.024), dark);
  bit2.position.set(0.032, -0.11, 0);
  g.add(bit2);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), dark);
  collar.position.y = 0.12;
  g.add(collar);
  g.rotation.z = -0.55;
  g.rotation.y = 0.4;
  return g;
}

export function makePickup(kind) {
  const g = new THREE.Group();
  const def = PICKUP_BY_ID[kind];
  g.userData.pickup = kind;
  g.userData.cat = def?.cat || "item";
  if (kind === "key") {
    g.add(makeKeyModel());
  } else if (kind === "ammo") {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.22), mat(0x6a5a30)));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), mat(0xc4a050, { emissive: 0x3a2a08 })));
  } else if (WEAPON_BY_ID[kind]) {
    const w = makeWeapon(kind);
    w.scale.setScalar(1.15);
    g.add(w);
  } else if (kind === "jetpack" || kind === "fuel") {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.4, 8), mat(0x3a6aaa, { emissive: 0x123050 })));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(0x66ccff, { emissive: 0x2288cc })));
  } else if (kind === "medkit") {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.22), mat(0xcc3333)));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.06), mat(0xffffff)));
  } else if (kind === "lantern") {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 8), mat(0xffcc66, { emissive: 0xffaa22 })));
  } else if (kind === "shield") {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0x66aaff, { transparent: true, opacity: 0.7, emissive: 0x2244aa })));
  } else if (kind === "bomb") {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mat(0x333, { emissive: 0x551100 })));
  } else {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mat(0xc4a050)));
  }
  return g;
}

export function fireWeapon(def, origin, dir, scene, list) {
  const n = def.pellets || 1;
  const shots = [];
  for (let i = 0; i < n; i++) {
    const d = dir.clone();
    d.x += (Math.random() - 0.5) * (def.spread || 0) * 2;
    d.y += (Math.random() - 0.5) * (def.spread || 0);
    d.z += (Math.random() - 0.5) * (def.spread || 0) * 2;
    d.normalize();
    if (def.flame) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mat(0xff6622, { emissive: 0xff3300 }));
      m.position.copy(origin);
      scene.add(m);
      shots.push({ mesh: m, dir: d, speed: def.speed, life: 0.35, def, origin: origin.clone() });
    } else if (def.beam) {
      const len = 18;
      const geo = new THREE.BufferGeometry().setFromPoints([origin.clone(), origin.clone().addScaledVector(d, len)]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: def.color, transparent: true, opacity: 0.95 }));
      scene.add(line);
      shots.push({ mesh: line, dir: d, speed: 999, life: 0.08, def, hitscan: true, origin: origin.clone(), range: len });
    } else {
      const m = new THREE.Mesh(new THREE.SphereGeometry(def.splash ? 0.16 : 0.07, 6, 6), mat(def.color, { emissive: def.color }));
      m.position.copy(origin);
      scene.add(m);
      shots.push({ mesh: m, dir: d, speed: def.speed, life: 1.4, def, origin: origin.clone() });
    }
  }
  for (const s of shots) list.push(s);
  return shots;
}

export function tickShots(list, dt, foes, extras, onHit, addBurn, sdf3, map, sdf2) {
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    s.life -= dt;
    if (s.hitscan) {
      hitScan(s, foes, extras, onHit, addBurn);
      s.life = 0;
    } else if (s.mesh.position) {
      s.mesh.position.addScaledVector(s.dir, s.speed * dt);
      if (sdf3 && sdf3(s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, map, sdf2) > -0.05) {
        addBurn(s.mesh.position.clone(), s.def.color);
        s.life = 0;
      } else {
        splashOrHit(s, foes, extras, onHit, addBurn);
      }
    }
    if (s.life <= 0) {
      s.mesh.removeFromParent();
      if (s.mesh.geometry) s.mesh.geometry.dispose();
      list.splice(i, 1);
    }
  }
}

function hitScan(s, foes, extras, onHit, addBurn) {
  let best = s.range;
  let hitP = s.origin.clone().addScaledVector(s.dir, s.range);
  for (const f of foes) {
    if (!f.visible || f.userData.hp <= 0) continue;
    const dx = f.position.x - s.origin.x;
    const dy = f.position.y - s.origin.y;
    const dz = f.position.z - s.origin.z;
    const t = dx * s.dir.x + dy * s.dir.y + dz * s.dir.z;
    if (t < 0 || t > best) continue;
    const px = s.origin.x + s.dir.x * t;
    const py = s.origin.y + s.dir.y * t;
    const pz = s.origin.z + s.dir.z * t;
    if (Math.hypot(f.position.x - px, f.position.y - py, f.position.z - pz) < (f.userData.hitR || 0.8)) {
      best = t;
      hitP.set(px, py, pz);
      hurtFoe(f, s.def.dmg, s.dir);
    }
  }
  addBurn(hitP, s.def.color);
  if (extras) {
    hurtTurrets(extras, hitP, s.def.dmg, 1.5);
    smashGlass(extras, hitP, 1.1, extras.root);
    impulseBoulders(extras, hitP, s.dir, 8 + (s.def.dmg || 8) * 0.15, 1.8);
  }
}

function splashOrHit(s, foes, extras, onHit, addBurn) {
  for (const f of foes) {
    if (!f.visible || f.userData.hp <= 0) continue;
    const d = f.position.distanceTo(s.mesh.position);
    const r = s.def.splash || (s.def.flame ? 0.55 : 0.45);
    if (d < r + (f.userData.hitR || 0.6)) {
      hurtFoe(f, s.def.dmg, s.dir);
      if (s.def.splash) {
        addBurn(s.mesh.position.clone(), s.def.color);
        for (const f2 of foes) {
          if (f2 !== f && f2.visible && f2.position.distanceTo(s.mesh.position) < s.def.splash) hurtFoe(f2, s.def.dmg * 0.5, s.dir);
        }
      }
      if (!s.def.flame) s.life = 0;
    }
  }
  if (extras && s.mesh.position) {
    hurtTurrets(extras, s.mesh.position, s.def.dmg, 1.5);
    smashGlass(extras, s.mesh.position, 1.05, extras.root);
    impulseBoulders(extras, s.mesh.position, s.dir, 8 + (s.def.dmg || 8) * 0.15, 1.8);
  }
}

let killHook = null;
export function setKillHook(fn) {
  killHook = fn;
}

export function hurtFoe(f, dmg, dir) {
  const u = f.userData;
  const was = u.hp;
  u.hp -= dmg;
  u.flash = 0.18;
  u.recoil = 0.16;
  if (dir) {
    u.kx = (dir.x || 0) * 6;
    u.kz = (dir.z || 0) * 6;
  }
  if (f.material?.color) f.material.color.setHex(0xff3333);
  if (f.traverse) {
    f.traverse((o) => {
      if (o.material?.emissive) o.material.emissive.setHex(0xff2222);
    });
  }
  if (was > 0 && u.hp <= 0) {
    f.visible = false;
    if (u.spawner) u.spawner._alive = Math.max(0, (u.spawner._alive || 1) - 1);
    if (killHook) killHook(f);
  }
}

export function addBurnDecal(scene, list, pos, color) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 8),
    new THREE.MeshBasicMaterial({ color: color || 0x1a0a08, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  m.position.copy(pos);
  m.lookAt(pos.x, pos.y + 1, pos.z);
  scene.add(m);
  list.push({ mesh: m, life: 18 });
  if (list.length > 90) {
    const old = list.shift();
    old.mesh.removeFromParent();
  }
}

export function addSaberMark(scene, list, pos, dir, color) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.06, 0.38),
    new THREE.MeshBasicMaterial({ color: color || 0x66ffaa, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  m.position.copy(pos);
  const n = dir && dir.lengthSq() > 1e-6 ? dir.clone().normalize() : new THREE.Vector3(0, 1, 0);
  m.lookAt(pos.x + n.x, pos.y + n.y, pos.z + n.z);
  scene.add(m);
  list.push({ mesh: m, life: 22 });
  if (list.length > 120) {
    const old = list.shift();
    old.mesh.removeFromParent();
  }
}

export function tickBurns(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].life -= dt;
    if (list[i].life <= 0) {
      list[i].mesh.removeFromParent();
      list.splice(i, 1);
    } else if (list[i].mesh.material) list[i].mesh.material.opacity = Math.min(0.85, list[i].life / 8);
  }
}
