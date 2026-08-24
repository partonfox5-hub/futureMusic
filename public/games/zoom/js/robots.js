/** Procedural colored robots with movement + attack styles. */
import * as THREE from "three";
import { ENEMIES, ENEMY_BY_ID } from "./config.js";
import { hurtFoe } from "./weapons.js";
import { floorY, sdf3 } from "./map.js";

function mat(hex, extra) {
  return new THREE.MeshLambertMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.18, ...extra });
}

export function makeRobot(def) {
  const g = new THREE.Group();
  const s = def.size || 1;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.7 * s, 0.45 * s), mat(def.color));
  body.position.y = 0.55 * s;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38 * s, 0.28 * s, 0.38 * s), mat(def.color));
  head.position.y = 1.02 * s;
  g.add(head);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.06 * s, 0.06 * s), mat(0xffeedd, { emissive: 0xffcc88, emissiveIntensity: 0.8 }));
  eye.position.set(0, 1.04 * s, 0.2 * s);
  g.add(eye);
  if (def.move === "hover") {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.4 * s, 0.06, 10), mat(0x333));
    disc.position.y = 0.12 * s;
    g.add(disc);
  } else {
    for (const sx of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.4 * s, 0.1 * s), mat(0x222));
      leg.position.set(sx * s, 0.2 * s, 0);
      g.add(leg);
    }
  }
  g.userData = {
    foe: true,
    robot: true,
    def,
    kind: def.id,
    hp: def.hp,
    maxHp: def.hp,
    hitR: 0.45 * s,
    flash: 0,
    cool: 0,
    phase: Math.random() * 6.28,
    baseH: 1.2 * s,
  };
  return g;
}

export function spawnRobot(def, x, z, y, list, scene) {
  const r = makeRobot(def);
  r.position.set(x, y, z);
  scene.add(r);
  list.push(r);
  return r;
}

export function tickRobots(foes, dt, player, map, sdf2, onHit, scene, shots, fireWeapon) {
  const px = player.x;
  const py = player.y;
  const pz = player.z;
  for (const f of foes) {
    const u = f.userData;
    if (!u.robot || !f.visible || u.hp <= 0) continue;
    if (u.flash > 0) {
      u.flash -= dt;
      f.traverse((o) => {
        if (o.material?.color && u.flash <= 0) o.material.color.setHex(u.def.color);
        if (o.material?.emissive && u.flash <= 0) o.material.emissive.setHex(u.def.color);
      });
    }
    if (u.recoil > 0) {
      u.recoil -= dt;
      f.position.x += (u.kx || 0) * dt;
      f.position.z += (u.kz || 0) * dt;
      u.kx *= 0.85;
      u.kz *= 0.85;
      continue;
    }
    const dx = px - f.position.x;
    const dz = pz - f.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const home = u.home;
    if (home && Math.hypot(f.position.x - home.x, f.position.z - home.z) > home.r) {
      f.position.x += ((home.x - f.position.x) / dist) * u.def.spd * dt;
      f.position.z += ((home.z - f.position.z) / dist) * u.def.spd * dt;
    } else {
      u.phase = (u.phase || 0) + dt;
      let mx = 0;
      let mz = 0;
      const spd = u.def.spd;
      const mv = u.def.move;
      if (mv === "orbit") {
        mx = -dz / dist * spd * 0.8 + (dx / dist) * spd * 0.2;
        mz = dx / dist * spd * 0.8 + (dz / dist) * spd * 0.2;
      } else if (mv === "strafe") {
        mx = Math.cos(u.phase * 2) * spd + (dx / dist) * spd * 0.35;
        mz = Math.sin(u.phase * 2) * spd + (dz / dist) * spd * 0.35;
      } else if (mv === "lunge") {
        if (u.phase % 2.2 < 0.45) {
          mx = (dx / dist) * spd * 2.4;
          mz = (dz / dist) * spd * 2.4;
        } else {
          mx = (dx / dist) * spd * 0.2;
          mz = (dz / dist) * spd * 0.2;
        }
      } else if (mv === "hover") {
        mx = (dx / dist) * spd * 0.7;
        mz = (dz / dist) * spd * 0.7;
        f.position.y += Math.sin(u.phase * 3) * 0.01;
      } else if (mv === "patrol" && dist > 12) {
        mx = Math.cos(u.phase * 0.4) * spd * 0.4;
        mz = Math.sin(u.phase * 0.4) * spd * 0.4;
      } else {
        mx = (dx / dist) * spd;
        mz = (dz / dist) * spd;
      }
      const nx = f.position.x + mx * dt;
      const nz = f.position.z + mz * dt;
      if (sdf3(nx, f.position.y, f.position.z, map, sdf2) < -0.15) f.position.x = nx;
      if (sdf3(f.position.x, f.position.y, nz, map, sdf2) < -0.15) f.position.z = nz;
    }
    if (u.def.move !== "hover") {
      const fy = floorY(f.position.x, f.position.z, map, sdf2);
      if (fy >= 0) f.position.y = fy;
    }
    f.lookAt(px, f.position.y, pz);
    u.cool = Math.max(0, (u.cool || 0) - dt);
    const atk = u.def.attack;
    if (atk === "melee" && dist < 1.5 && u.cool <= 0) {
      u.cool = 0.85;
      onHit(u.def.dmg, "a " + u.def.name);
    } else if (atk !== "melee" && dist < 16 && u.cool <= 0 && fireWeapon) {
      u.cool = atk === "beam" ? 1.4 : atk === "burst" ? 0.9 : atk === "flame" ? 0.12 : 0.7;
      const origin = f.position.clone();
      origin.y += 0.8;
      const dir = new THREE.Vector3(dx, py - origin.y, dz).normalize();
      const fake = {
        color: u.def.color,
        dmg: u.def.dmg,
        pellets: atk === "burst" ? 3 : 1,
        spread: atk === "burst" ? 0.08 : 0.02,
        speed: atk === "flame" ? 16 : 36,
        beam: atk === "beam",
        flame: atk === "flame",
      };
      fireWeapon(fake, origin, dir, scene, shots);
    }
    if (u.hp <= 0) f.visible = false;
  }
}

export { ENEMY_BY_ID, ENEMIES };
