/** Procedural colored robots with movement + attack styles. */
import * as THREE from "three";
import { CELL, ENEMIES, ENEMY_BY_ID } from "./config.js?v=zm12";
import { hurtFoe } from "./weapons.js?v=zm12";
import { addSphere, floorY, getShape, getTex, sdf3, stampDisk } from "./map.js?v=zm12";
import { wallBlocked } from "./world.js?v=zm12";
import { sfx } from "./sfx.js?v=zm12";

/** Doom-like kinematic chase: hold a heading, zigzag, flank, and dodge without becoming unhittable. */
export function doomSteer(u, dx, dz, dist, dt, baseSpd, player) {
  const spd = baseSpd * 1.24;
  u.aiT = (u.aiT || Math.random() * 8) + dt;
  u.moveT = (u.moveT || 0) - dt;
  u.bobT = (u.bobT || Math.random() * 6) + dt;
  u.flankSwap = (u.flankSwap || 0) - dt;
  if (!u.flankSign) u.flankSign = Math.random() < 0.5 ? 1 : -1;
  if (u.flankSwap <= 0) {
    if (Math.random() < 0.18) u.flankSign *= -1;
    u.flankSwap = 1.2 + Math.random() * 2.4;
  }
  const inv = dist || 1;
  const nx = dx / inv;
  const nz = dz / inv;
  const sx = -nz * u.flankSign;
  const sz = nx * u.flankSign;
  let facing = 0;
  if (player) {
    const fx = player.fwdX;
    const fz = player.fwdZ;
    if (fx != null && fz != null) facing = fx * -nx + fz * -nz;
  }
  if (u.moveT <= 0) {
    const roll = Math.random();
    if (dist < 2.35) u.mode = "circle";
    else if (dist < 7.5 && roll < 0.4) u.mode = "flank";
    else if (facing > 0.52 && roll < 0.26) u.mode = "dodge";
    else if (roll < 0.16) u.mode = "dash";
    else u.mode = "chase";
    u.moveT = u.mode === "dodge" ? 0.16 + Math.random() * 0.16
      : u.mode === "dash" ? 0.12 + Math.random() * 0.12
      : 0.2 + Math.random() * 0.36;
    const toward = Math.atan2(dx, dz);
    const zig = (Math.random() - 0.5) * 1.05;
    const cut = roll < 0.2 ? (Math.random() < 0.5 ? 1.15 : -1.15) : 0;
    u.headAng = toward + zig + cut;
  }
  const hx = Math.sin(u.headAng || 0);
  const hz = Math.cos(u.headAng || 0);
  let mx = 0;
  let mz = 0;
  if (u.mode === "circle") {
    const keep = dist < 1.28 ? -0.42 : dist > 2.05 ? 0.5 : 0.08;
    mx = sx * spd * 1.18 + nx * spd * keep;
    mz = sz * spd * 1.18 + nz * spd * keep;
  } else if (u.mode === "flank") {
    mx = (nx * 0.42 + sx * 0.95) * spd * 1.18;
    mz = (nz * 0.42 + sz * 0.95) * spd * 1.18;
  } else if (u.mode === "dodge") {
    mx = sx * spd * 1.62;
    mz = sz * spd * 1.62;
  } else if (u.mode === "dash") {
    mx = hx * spd * 1.78;
    mz = hz * spd * 1.78;
  } else {
    mx = hx * spd;
    mz = hz * spd;
  }
  u.floatY = Math.sin(u.bobT * 7.4) * 0.04 + Math.sin(u.bobT * 3.05) * 0.018;
  return { mx, mz, floatY: u.floatY };
}

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
  const thighs = [];
  const shins = [];
  const hooves = [];
  for (const sx of [-0.22, 0.22]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11 * s, 0.32 * s, 6, 12), hide);
    thigh.position.set(sx * s, 0.42 * s, 0);
    g.add(thigh);
    thighs.push(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.09 * s, 0.22 * s, 6, 12), hide);
    shin.position.set(sx * s, 0.16 * s, 0.03 * s);
    g.add(shin);
    shins.push(shin);
    const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 12, 10), mat(0x1a120c));
    hoof.scale.set(1, 0.55, 1.25);
    hoof.position.set(sx * s, 0.05 * s, 0.05 * s);
    g.add(hoof);
    hooves.push(hoof);
  }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32 * s, 0.42 * s, 8, 16), hide);
  torso.position.y = 1.18 * s;
  g.add(torso);
  const pec = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 14, 10), bronze);
  pec.scale.set(1.35, 0.55, 0.55);
  pec.position.set(0, 1.28 * s, 0.16 * s);
  g.add(pec);
  const arms = [];
  const fists = [];
  for (const sx of [-0.48, 0.48]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09 * s, 0.42 * s, 6, 12), hide);
    arm.position.set(sx * s, 1.12 * s, 0);
    g.add(arm);
    arms.push(arm);
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 12, 10), hide);
    fist.position.set(sx * s, 0.78 * s, 0.06 * s);
    g.add(fist);
    fists.push(fist);
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
    grounded: true, vy: 0, lvx: 0, lvz: 0, jumpCd: 0.4, anim: "idle", animT: 0,
    limbs: { s, hip, torso, head, thighs, shins, hooves, arms, fists },
  };
  return g;
}

function headroomAt(x, z, fy, map, sdf2, maxH) {
  let clear = 0.35;
  const cap = Math.max(1.2, maxH || 8);
  for (let h = 0.45; h <= cap; h += 0.22) {
    if (sdf3(x, fy + h, z, map, sdf2) > -0.1) break;
    clear = h;
  }
  return clear;
}

function digDungeonWall(map, wx, wy, wz, nx, nz) {
  const px = wx + nx * 0.7;
  const pz = wz + nz * 0.7;
  const gx = px / CELL;
  const gz = pz / CELL;
  const ix = Math.max(1, Math.min(map.w - 2, Math.round(gx)));
  const iz = Math.max(1, Math.min(map.h - 2, Math.round(gz)));
  const b = map.cells[iz * map.w + ix];
  const tex = getTex(b) || 1;
  const shape = getShape(b);
  stampDisk(map, gx, gz, 0.78, shape, tex, false);
  const s = addSphere(map, px, pz, 1.55, tex);
  if (s) s.cy = Math.max(0.95, wy);
  return { x: px, y: wy, z: pz };
}

function poseMinotaur(f, dt, moving) {
  const u = f.userData;
  const L = u.limbs;
  if (!L) return;
  const s = L.s || 1.85;
  u.animT = (u.animT || 0) + dt;
  const setLeg = (i, thighX, shinX, hoofZ) => {
    if (L.thighs[i]) L.thighs[i].rotation.x = thighX;
    if (L.shins[i]) L.shins[i].rotation.x = shinX;
    if (L.hooves[i]) L.hooves[i].position.z = 0.05 * s + hoofZ;
  };
  const setArm = (i, rotX, fistZ) => {
    if (L.arms[i]) L.arms[i].rotation.x = rotX;
    if (L.fists[i]) L.fists[i].position.z = 0.06 * s + fistZ;
  };
  if (L.hip) L.hip.position.y = 0.72 * s;
  if (L.torso) L.torso.rotation.x = 0;
  const anim = u.anim || "idle";
  if (anim === "jump") {
    const t = Math.min(1, u.animT / 0.22);
    const crouch = t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 0.65);
    const air = u.vy > 1 ? 1 : Math.max(0, 1 - Math.max(0, -u.vy) * 0.08);
    setLeg(0, 0.85 * crouch - 0.45 * air, 0.9 * crouch, 0.04);
    setLeg(1, 0.75 * crouch - 0.35 * air, 0.85 * crouch, 0.03);
    setArm(0, -0.95 * air - 0.2, 0.22 * air);
    setArm(1, -1.05 * air - 0.15, 0.2 * air);
    if (L.torso) L.torso.rotation.x = -0.22 * air;
    if (L.hip) L.hip.position.y = 0.72 * s - 0.12 * s * crouch;
  } else if (anim === "land") {
    const t = Math.min(1, u.animT / 0.32);
    const squash = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
    setLeg(0, 1.05 * squash, 0.95 * squash, -0.02);
    setLeg(1, 1.12 * squash, 1.0 * squash, -0.02);
    setArm(0, 0.45 * squash, -0.04);
    setArm(1, 0.55 * squash, -0.05);
    if (L.hip) L.hip.position.y = 0.72 * s - 0.2 * s * squash;
    if (L.torso) L.torso.rotation.x = 0.28 * squash;
    if (u.animT > 0.32) u.anim = moving ? "walk" : "idle";
  } else if (anim === "smash") {
    const t = Math.min(1, u.animT / 0.42);
    const wind = t < 0.28 ? t / 0.28 : 0;
    const slam = t >= 0.28 ? Math.min(1, (t - 0.28) / 0.18) : 0;
    setArm(0, 0.7 * wind - 1.35 * slam, 0.32 * slam);
    setArm(1, 0.85 * wind - 1.5 * slam, 0.36 * slam);
    if (L.torso) L.torso.rotation.x = -0.35 * slam;
    setLeg(0, 0.25, 0.1, 0);
    setLeg(1, 0.15, 0.08, 0);
    if (u.animT > 0.42) u.anim = moving ? "walk" : "idle";
  } else if (moving) {
    const run = u.running ? 1.35 : 0.7;
    const swing = Math.sin((u.phase || 0) * 9.2) * 0.62 * run;
    setLeg(0, swing, swing * 0.45, swing * 0.04);
    setLeg(1, -swing, -swing * 0.45, -swing * 0.04);
    setArm(0, -swing * 0.75, -swing * 0.05);
    setArm(1, swing * 0.75, swing * 0.05);
    if (L.torso) L.torso.rotation.x = -0.08 * run;
  } else {
    const b = Math.sin((u.phase || 0) * 2.2) * 0.04;
    setLeg(0, 0.05, 0, 0);
    setLeg(1, -0.04, 0, 0);
    setArm(0, 0.08 + b, 0);
    setArm(1, -0.06 - b, 0);
    if (L.torso) L.torso.rotation.x = b * 0.4;
  }
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

export function tickRobots(foes, dt, player, map, sdf2, onHit, scene, shots, fireWeapon, onSmash) {
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
      const fy = floorY(f.position.x, f.position.z, map, sdf2, undefined, f.position.y);
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
    const chasing = !!(u.aware || u.aggro);
    let mx = 0;
    let mz = 0;
    if (home && !chasing && Math.hypot(f.position.x - home.x, f.position.z - home.z) > Math.max(home.r || 8, 12)) {
      const hx = home.x - f.position.x;
      const hz = home.z - f.position.z;
      const hd = Math.hypot(hx, hz) || 1;
      f.position.x += (hx / hd) * u.def.spd * dt;
      f.position.z += (hz / hd) * u.def.spd * dt;
    } else {
      u.phase = (u.phase || 0) + dt;
      const spd = u.def.spd;
      const mv = u.def.move;
      if (mv === "charge") {
        let see = dist < 22;
        if (see && dist > 2.4) {
          const n = Math.max(2, Math.ceil(dist / 0.7));
          const sy = f.position.y + 1.05;
          for (let i = 1; i < n; i++) {
            const t = i / n;
            const sx = f.position.x + dx * t;
            const sz = f.position.z + dz * t;
            if (wallBlocked(map, sx, sz, sy)) {
              see = false;
              break;
            }
            if (sdf3(sx, sy, sz, map, sdf2) > 0.35) {
              see = false;
              break;
            }
          }
        }
        if (dist < 9) see = true;
        if (see) {
          if (!u.aggro) {
            u.aggro = true;
            if (u.def?.id === "minotaur" || u.def?.model === "minotaur") sfx("roar");
          }
          u.aware = true;
        } else if (u.aware && dist > 28) {
          u.aware = false;
          u.aggro = false;
        }
        if (u.aware) {
          const st = doomSteer(u, dx, dz, dist, dt, spd * 2.35, player);
          mx = st.mx;
          mz = st.mz;
          u.running = true;
        } else {
          u.running = false;
          mx = Math.cos(u.phase * 0.7) * spd * 0.85;
          mz = Math.sin(u.phase * 0.55) * spd * 0.85;
        }
      } else if (mv === "weave") {
        if (!u.baseY) u.baseY = f.position.y + 1.35;
        const st = doomSteer(u, dx, dz, dist, dt, spd, player);
        mx = st.mx * 0.55 + Math.cos(u.phase * 2.6) * spd * 0.85;
        mz = st.mz * 0.55 + Math.sin(u.phase * 3.4) * spd * 0.75;
        const wantY = u.baseY + Math.sin(u.phase * 2.1) * 1.35 + Math.cos(u.phase * 1.15) * 0.7;
        f.position.y += (wantY - f.position.y) * Math.min(1, dt * 3.2);
      } else if (mv === "patrol" && dist > 12) {
        mx = Math.cos(u.phase * 0.4) * spd * 0.4;
        mz = Math.sin(u.phase * 0.4) * spd * 0.4;
      } else if (mv === "hover") {
        const st = doomSteer(u, dx, dz, dist, dt, spd * 0.85, player);
        mx = st.mx;
        mz = st.mz;
        f.position.y += Math.sin(u.phase * 3) * 0.012;
      } else if (mv === "lunge") {
        if (u.phase % 2.2 < 0.45) {
          mx = (dx / dist) * spd * 2.4;
          mz = (dz / dist) * spd * 2.4;
        } else {
          const st = doomSteer(u, dx, dz, dist, dt, spd * 0.7, player);
          mx = st.mx;
          mz = st.mz;
        }
      } else {
        const st = doomSteer(u, dx, dz, dist, dt, spd, player);
        mx = st.mx;
        mz = st.mz;
      }
      const isMino = u.def.id === "minotaur" || u.def.model === "minotaur";
      if (isMino) {
        u.jumpCd = Math.max(0, (u.jumpCd || 0) - dt);
        const fy0 = floorY(f.position.x, f.position.z, map, sdf2, undefined, f.position.y);
        const grounded = u.grounded !== false && Math.abs((f.position.y) - (fy0 > -500 ? fy0 : f.position.y)) < 0.18;
        u.grounded = grounded;
        if (grounded && u.aware && u.jumpCd <= 0 && fy0 > -500) {
          const air = headroomAt(f.position.x, f.position.z, fy0, map, sdf2, map.hallH || 8);
          const playerAbove = py > f.position.y + 1.35;
          const pounce = dist > 3.1 && dist < 12;
          const want = (playerAbove && air > 1.35) || (pounce && air > 1.15 && Math.random() < dt * 1.8);
          if (want) {
            const hop = Math.max(0.45, air - 0.8);
            u.vy = Math.min(16.5, Math.sqrt(2 * 22 * hop) * 1.08);
            const leap = 4.8 + Math.min(11, hop * 2.6);
            u.lvx = (dx / dist) * leap;
            u.lvz = (dz / dist) * leap;
            u.grounded = false;
            u.anim = "jump";
            u.animT = 0;
            u.jumpCd = 1.15 + Math.random() * 0.55;
            sfx("roar");
          }
        }
      }
      let nx = f.position.x + mx * dt;
      let nz = f.position.z + mz * dt;
      if (isMino && !u.grounded) {
        nx = f.position.x + (mx * 0.35 + (u.lvx || 0)) * dt;
        nz = f.position.z + (mz * 0.35 + (u.lvz || 0)) * dt;
      }
      const by = f.position.y + 0.95;
      const okX = sdf3(nx, by, f.position.z, map, sdf2) < 0.08;
      const okZ = sdf3(f.position.x, by, nz, map, sdf2) < 0.08;
      if (okX) f.position.x = nx;
      if (okZ) f.position.z = nz;
      if (!okX || !okZ) {
        u.moveT = 0;
        if (isMino && u.aware && (u.anim === "smash" || u.running) && (u.digCd || 0) <= 0) {
          const bx = !okX ? Math.sign(nx - f.position.x) || dx / dist : dx / dist;
          const bz = !okZ ? Math.sign(nz - f.position.z) || dz / dist : dz / dist;
          const hx = f.position.x + bx * 1.2;
          const hz = f.position.z + bz * 1.2;
          const hy = f.position.y + 1.15;
          if (sdf3(hx, hy, hz, map, sdf2) > -0.08 || wallBlocked(map, hx, hz, hy)) {
            const dug = digDungeonWall(map, f.position.x, hy, f.position.z, bx, bz);
            u.digCd = 0.95;
            u.anim = "smash";
            u.animT = 0;
            if (onSmash) onSmash(dug);
          }
        }
      }
    }
    const isMino = u.def.id === "minotaur" || u.def.model === "minotaur";
    u.digCd = Math.max(0, (u.digCd || 0) - dt);
    if (u.def.move !== "hover" && u.def.move !== "weave" && !u.fly) {
      const fy = floorY(f.position.x, f.position.z, map, sdf2, undefined, f.position.y);
      if (isMino && !u.grounded) {
        u.vy = (u.vy || 0) - 24 * dt;
        const headY = f.position.y + (u.baseH || 2.1) * 0.92;
        if (u.vy > 0 && sdf3(f.position.x, headY, f.position.z, map, sdf2) > -0.06) u.vy = Math.min(u.vy, 0);
        f.position.y += u.vy * dt;
        u.lvx = (u.lvx || 0) * 0.995;
        u.lvz = (u.lvz || 0) * 0.995;
        if (fy > -500 && f.position.y <= fy) {
          const heavy = u.vy < -8;
          f.position.y = fy;
          u.grounded = true;
          u.vy = 0;
          u.lvx = 0;
          u.lvz = 0;
          u.anim = "land";
          u.animT = 0;
          if (heavy) sfx("melee");
        }
      } else if (fy > -500) f.position.y = fy + (u.floatY || 0);
    }
    f.lookAt(px, f.position.y, pz);
    if (isMino) poseMinotaur(f, dt, Math.hypot(mx || 0, mz || 0) > 0.08 || u.running);
    u.cool = Math.max(0, (u.cool || 0) - dt);
    const atk = u.def.attack;
    if (atk === "melee" && dist < 1.5 && u.cool <= 0) {
      u.cool = 0.85;
      sfx("melee");
      onHit(u.def.dmg, "a " + u.def.name);
      if (isMino) {
        u.anim = "smash";
        u.animT = 0;
        const nx = dx / dist;
        const nz = dz / dist;
        const hx = f.position.x + nx * 1.35;
        const hz = f.position.z + nz * 1.35;
        const hy = f.position.y + 1.2;
        if ((u.digCd || 0) <= 0 && (sdf3(hx, hy, hz, map, sdf2) > -0.1 || wallBlocked(map, hx, hz, hy))) {
          const dug = digDungeonWall(map, f.position.x, hy, f.position.z, nx, nz);
          u.digCd = 0.85;
          if (onSmash) onSmash(dug);
        }
      }
    } else if (atk !== "melee" && dist < 16 && u.cool <= 0 && fireWeapon) {
      u.cool = atk === "beam" ? 1.4 : atk === "burst" ? 0.9 : atk === "flame" ? 0.12 : 0.7;
      sfx(atk === "beam" ? "beam" : atk === "flame" ? "flame" : "gun");
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
