/** Procedural colored robots with movement + attack styles. */
import * as THREE from "three";
import { ENEMIES, ENEMY_BY_ID } from "./config.js?v=zm3";
import { hurtFoe } from "./weapons.js?v=zm3";
import { floorY, sdf3 } from "./map.js?v=zm3";

function mat(hex, extra) {
  return new THREE.MeshLambertMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.18, ...extra });
}

function makeMinotaur(def) {
  const g = new THREE.Group();
  const s = def.size || 1.85;
  const hide = mat(0x4a2a12);
  const horn = mat(0xd8c8a0, { emissive: 0x332210, emissiveIntensity: 0.1 });
  const bronze = mat(0x8a6a30);
  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.38 * s, 16, 12), hide);
  hip.scale.set(1.15, 0.55, 0.85);
  hip.position.y = 0.72 * s;
  g.add(hip);
  for (const sx of [-0.22, 0.22]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11 * s, 0.32 * s, 6, 12), hide);
    thigh.position.set(sx * s, 0.42 * s, 0);
    g.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.09 * s, 0.22 * s, 6, 12), hide);
    shin.position.set(sx * s, 0.16 * s, 0.03 * s);
    g.add(shin);
    const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 12, 10), mat(0x1a120c));
    hoof.scale.set(1, 0.55, 1.25);
    hoof.position.set(sx * s, 0.05 * s, 0.05 * s);
    g.add(hoof);
  }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32 * s, 0.42 * s, 8, 16), hide);
  torso.position.y = 1.18 * s;
  g.add(torso);
  const pec = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 14, 10), bronze);
  pec.scale.set(1.35, 0.55, 0.55);
  pec.position.set(0, 1.28 * s, 0.16 * s);
  g.add(pec);
  for (const sx of [-0.48, 0.48]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09 * s, 0.42 * s, 6, 12), hide);
    arm.position.set(sx * s, 1.12 * s, 0);
    g.add(arm);
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 12, 10), hide);
    fist.position.set(sx * s, 0.78 * s, 0.06 * s);
    g.add(fist);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.2 * s, 0.16 * s, 16), hide);
  neck.position.y = 1.58 * s;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 18, 14), hide);
  head.scale.set(1.05, 0.9, 1.15);
  head.position.y = 1.78 * s;
  g.add(head);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 14, 10), hide);
  snout.scale.set(0.85, 0.7, 1.35);
  snout.position.set(0, 1.7 * s, 0.28 * s);
  g.add(snout);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06 * s, 0.018 * s, 10, 18), bronze);
  ring.position.set(0, 1.64 * s, 0.4 * s);
  g.add(ring);
  for (const sx of [-1, 1]) {
    const hn = new THREE.Mesh(new THREE.ConeGeometry(0.07 * s, 0.42 * s, 12), horn);
    hn.position.set(sx * 0.22 * s, 2.02 * s, -0.02 * s);
    hn.rotation.z = sx * -0.55;
    hn.rotation.x = -0.25;
    g.add(hn);
  }
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 10, 8), mat(0xff2200, { emissive: 0xff2200, emissiveIntensity: 0.9 }));
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.1 * s, 1.82 * s, 0.18 * s);
  eyeR.position.set(0.1 * s, 1.82 * s, 0.18 * s);
  g.add(eyeL, eyeR);
  g.userData = {
    foe: true, robot: true, def, kind: def.id, hp: def.hp, maxHp: def.hp,
    hitR: 0.7 * s, flash: 0, cool: 0, phase: Math.random() * 6.28, baseH: 2.1 * s, aggro: false,
  };
  return g;
}

function makeSentryDrone(def) {
  const g = new THREE.Group();
  const s = def.size || 1.05;
  const hull = mat(def.color);
  const dark = mat(0x1a2228);
  const glow = mat(0x44eeff, { emissive: 0x2288aa, emissiveIntensity: 1.1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 24, 18), hull);
  body.scale.set(1.15, 0.55, 1.15);
  body.position.y = 0.2 * s;
  g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34 * s, 0.04 * s, 12, 28), dark);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.2 * s;
  g.add(rim);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04 * s, 0.28 * s, 4, 10), dark);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(Math.cos(a) * 0.28 * s, 0.22 * s, Math.sin(a) * 0.28 * s);
    arm.rotation.y = -a;
    g.add(arm);
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.16 * s, 0.03, 18), glow);
    rotor.position.set(Math.cos(a) * 0.48 * s, 0.28 * s, Math.sin(a) * 0.48 * s);
    g.add(rotor);
  }
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.09 * s, 0.16 * s, 16), glow);
  eye.rotation.x = Math.PI / 2;
  eye.position.set(0, 0.18 * s, 0.28 * s);
  g.add(eye);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 16, 12, 0, 6.3, 0, 1.2), dark);
  dish.position.set(0, 0.38 * s, 0);
  g.add(dish);
  g.userData = {
    foe: true, robot: true, def, kind: def.id, hp: def.hp, maxHp: def.hp,
    hitR: 0.55 * s, flash: 0, cool: 0, phase: Math.random() * 6.28, baseH: 1.1 * s, fly: true,
  };
  return g;
}

export function makeRobot(def) {
  if (def.model === "minotaur" || def.id === "minotaur") return makeMinotaur(def);
  if (def.model === "drone" || def.id === "sentrydrone") return makeSentryDrone(def);
  const g = new THREE.Group();
  const s = def.size || 1;
  const col = mat(def.color);
  const dark = mat(0x222228);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26 * s, 0.38 * s, 8, 16), col);
  body.position.y = 0.58 * s;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 18, 14), col);
  head.position.y = 1.05 * s;
  g.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 16, 10), mat(0xffeedd, { emissive: 0xffcc88, emissiveIntensity: 0.9 }));
  visor.scale.set(1.15, 0.45, 0.55);
  visor.position.set(0, 1.06 * s, 0.14 * s);
  g.add(visor);
  if (def.move === "hover") {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * s, 0.4 * s, 0.07, 20), dark);
    disc.position.y = 0.1 * s;
    g.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3 * s, 0.03 * s, 10, 24), mat(def.color, { emissiveIntensity: 0.4 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12 * s;
    g.add(ring);
  } else {
    for (const sx of [-0.16, 0.16]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07 * s, 0.28 * s, 6, 12), dark);
      leg.position.set(sx * s, 0.22 * s, 0);
      g.add(leg);
    }
    for (const sx of [-0.32, 0.32]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055 * s, 0.28 * s, 6, 12), col);
      arm.position.set(sx * s, 0.62 * s, 0);
      g.add(arm);
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
    if (u.flung) {
      u.vy = (u.vy || 0) - 24 * dt;
      f.position.x += (u.vx || 0) * dt;
      f.position.y += u.vy * dt;
      f.position.z += (u.vz || 0) * dt;
      const fy = floorY(f.position.x, f.position.z, map, sdf2);
      if (fy > -500 && f.position.y <= fy + 0.2) {
        f.position.y = fy + 0.2;
        if (u.vy < -3 && u.slam) hurtFoe(f, u.slam, null);
        u.flung = false;
        u.vy = 0;
        u.slam = 0;
      }
      continue;
    }
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
      } else if (mv === "charge") {
        if (dist < 15) u.aggro = true;
        const run = u.aggro ? spd * 4.1 : spd * 0.55;
        mx = (dx / dist) * run;
        mz = (dz / dist) * run;
      } else if (mv === "weave") {
        if (!u.baseY) u.baseY = f.position.y + 1.35;
        mx = (dx / dist) * spd * 0.45 + Math.cos(u.phase * 2.6) * spd * 1.25;
        mz = (dz / dist) * spd * 0.45 + Math.sin(u.phase * 3.4) * spd * 1.15;
        const wantY = u.baseY + Math.sin(u.phase * 2.1) * 1.35 + Math.cos(u.phase * 1.15) * 0.7;
        f.position.y += (wantY - f.position.y) * Math.min(1, dt * 3.2);
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
    if (u.def.move !== "hover" && u.def.move !== "weave" && !u.fly) {
      const fy = floorY(f.position.x, f.position.z, map, sdf2);
      if (fy > -500) f.position.y = fy;
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
