/**
 * Fenrest VR: leather gloves on controller grips, squeeze to pick up
 * melee and brandish / swing them.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";
import { makeChargeRing, paintChargeRing, makeSpellAura, SPELLS } from "/games/fenrest/js/magic.js";

function leatherTex() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#6b3d24";
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const n = ((x * 13 + y * 7) % 11) / 11;
      g.fillStyle = `rgba(${40 + n * 50},${18 + n * 22},${8},0.35)`;
      if (((x * 3 + y * 5) % 4) === 0) g.fillRect(x, y, 1, 1);
    }
  }
  g.strokeStyle = "rgba(30,16,8,0.45)";
  g.lineWidth = 1;
  for (let i = 8; i < 128; i += 16) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 8, 128);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const LEATHER = leatherTex();

function mat(hex, map) {
  return new THREE.MeshBasicMaterial({ color: hex, map: map || null });
}

function addBox(parent, m, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

function addCyl(parent, m, x, y, z, rTop, rBot, h, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 8), m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

function finger(parent, leather, pad, x, z, len, curlRef) {
  const root = new THREE.Group();
  root.position.set(x, 0.01, z);
  const p1 = new THREE.Group();
  addCyl(p1, leather, 0, 0, -len * 0.28, 0.012, 0.014, len * 0.42, Math.PI / 2, 0, 0);
  const p2 = new THREE.Group();
  p2.position.set(0, 0, -len * 0.46);
  addCyl(p2, pad, 0, 0, -len * 0.16, 0.01, 0.011, len * 0.34, Math.PI / 2, 0, 0);
  p1.add(p2);
  root.add(p1);
  parent.add(root);
  curlRef.push({ p1, p2 });
  return root;
}

export function makeGlove(handedness) {
  const g = new THREE.Group();
  g.name = "fenrest-glove-" + handedness;
  const leather = mat(0x7a4a2c, LEATHER);
  const dark = mat(0x3a2214, LEATHER);
  const pad = mat(0x5a3220);
  const brass = mat(0xb08a4a);
  const sign = handedness === "left" ? -1 : 1;

  const cuff = addCyl(g, dark, 0, -0.02, 0.055, 0.038, 0.042, 0.07, Math.PI / 2, 0, 0);
  cuff.scale.set(1.05, 1, 0.85);
  addBox(g, leather, 0, -0.018, 0.0, 0.09, 0.038, 0.11);
  addBox(g, pad, 0, 0.006, -0.01, 0.082, 0.016, 0.07);
  addBox(g, dark, 0, 0.014, -0.02, 0.078, 0.01, 0.028);
  for (const sx of [-0.028, 0.028]) addBox(g, brass, sx, 0.012, 0.03, 0.01, 0.01, 0.01);

  const curls = [];
  const xs = [-0.032, -0.011, 0.011, 0.032];
  const lens = [0.075, 0.088, 0.084, 0.07];
  xs.forEach((x, i) => finger(g, leather, pad, x, -0.055, lens[i], curls));

  const thumb = new THREE.Group();
  thumb.position.set(sign * 0.048, -0.004, 0.01);
  thumb.rotation.set(0.35, sign * 0.7, sign * 0.35);
  addCyl(thumb, leather, 0, 0, -0.03, 0.013, 0.015, 0.055, Math.PI / 2, 0, 0);
  const tip = new THREE.Group();
  tip.position.set(0, 0, -0.055);
  addCyl(tip, pad, 0, 0, -0.02, 0.011, 0.012, 0.04, Math.PI / 2, 0, 0);
  thumb.add(tip);
  g.add(thumb);
  curls.push({ p1: thumb, p2: tip, thumb: true });

  g.rotation.set(-0.35, 0, sign * 0.12);
  g.position.set(sign * 0.01, -0.03, 0.02);
  g.userData.curls = curls;
  g.userData.handedness = handedness;
  return g;
}

function curlGlove(glove, amount) {
  const a = Math.max(0, Math.min(1, amount));
  for (const c of glove.userData.curls || []) {
    if (c.thumb) {
      c.p1.rotation.y = (glove.userData.handedness === "left" ? -1 : 1) * (0.7 + a * 0.35);
      c.p2.rotation.x = a * 0.5;
    } else {
      c.p1.rotation.x = a * 0.85;
      c.p2.rotation.x = a * 1.05;
    }
  }
}

export function makeHeldWeapon(defId) {
  const g = new THREE.Group();
  g.name = "held-" + defId;
  const oak = mat(0x6a4428);
  const dark = mat(0x2a1a10);
  const wrap = mat(0x4a3020);
  if (defId.startsWith("sword-")) {
    const blade =
      defId.includes("steel") ? mat(0xc5ced4) : defId.includes("iron") ? mat(0x8a9098) : mat(0xc47a3a);
    addCyl(g, wrap, 0, 0, 0.04, 0.014, 0.016, 0.12, Math.PI / 2, 0, 0);
    addBox(g, dark, 0, 0, -0.03, 0.12, 0.018, 0.022);
    addBox(g, blade, 0, 0, -0.42, 0.034, 0.01, 0.72);
    addBox(g, blade, 0, 0, -0.8, 0.02, 0.008, 0.08);
    g.userData.reach = 0.88;
    g.userData.melee = true;
    g.userData.sharp = true;
  } else if (defId.startsWith("axe-") || defId === "tool-axe") {
    addCyl(g, oak, 0, 0, -0.12, 0.014, 0.016, 0.42, Math.PI / 2, 0, 0);
    addBox(g, mat(0x6a6a62), 0.04, 0, -0.32, 0.16, 0.04, 0.12);
    g.userData.reach = 0.55;
    g.userData.melee = true;
    g.userData.tool = defId.includes("wood") || defId === "tool-axe" ? "axe" : "axe";
    g.userData.sharp = true;
  } else if (defId.startsWith("pickaxe") || defId === "tool-pickaxe") {
    addCyl(g, oak, 0, 0, -0.14, 0.013, 0.015, 0.46, Math.PI / 2, 0, 0);
    addBox(g, mat(0x7a7a82), 0, 0, -0.36, 0.22, 0.03, 0.06);
    addBox(g, mat(0x7a7a82), 0.1, 0, -0.36, 0.04, 0.03, 0.14);
    addBox(g, mat(0x7a7a82), -0.1, 0, -0.36, 0.04, 0.03, 0.14);
    g.userData.reach = 0.58;
    g.userData.melee = true;
    g.userData.tool = "pick";
    g.userData.sharp = true;
  } else if (defId.startsWith("spear-")) {
    addCyl(g, oak, 0, 0, -0.35, 0.01, 0.012, 0.9, Math.PI / 2, 0, 0);
    addBox(g, mat(0xe8dcc0), 0, 0, -0.84, 0.03, 0.03, 0.16);
    g.userData.reach = 1.05;
    g.userData.melee = true;
    g.userData.sharp = true;
  } else if (defId.startsWith("shield-")) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), mat(0x8a5a32));
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0.12, 0, -0.04);
    g.add(disc);
    addBox(g, oak, 0.12, 0, -0.04, 0.04, 0.28, 0.04);
    g.userData.reach = 0.35;
    g.userData.melee = true;
    g.userData.block = true;
  } else if (defId.startsWith("bow-")) {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 18, Math.PI), oak);
    bow.rotation.y = Math.PI / 2;
    bow.position.z = -0.12;
    g.add(bow);
    g.userData.reach = 0.4;
    g.userData.melee = false;
  } else if (String(defId).startsWith("spell-")) {
    addCyl(g, mat(0x3a2a58), 0, 0, -0.08, 0.016, 0.018, 0.28, Math.PI / 2, 0, 0);
    addBox(g, mat(0xc8e8ff), 0, 0, -0.24, 0.04, 0.04, 0.04);
    g.userData.reach = 0.4;
    g.userData.melee = false;
    g.userData.spell = defId;
  } else {
    addBox(g, oak, 0, 0, -0.06, 0.06, 0.06, 0.12);
    g.userData.reach = 0.3;
    g.userData.melee = true;
  }
  g.userData.defId = defId;
  const tipN = new THREE.Object3D();
  tipN.position.set(0, 0, -(g.userData.reach || 0.7));
  g.add(tipN);
  g.userData.tip = tipN;
  return g;
}

function squeezeOf(src) {
  const b = src?.gamepad?.buttons;
  if (!b) return 0;
  let v = 0;
  for (const idx of [1, 2]) {
    const g = b[idx];
    if (!g) continue;
    if (typeof g.value === "number") v = Math.max(v, g.value);
    if (g.pressed) v = Math.max(v, 1);
  }
  return v;
}

function haptic(src, amp, ms) {
  try {
    src?.gamepad?.hapticActuators?.[0]?.pulse?.(amp, ms);
  } catch {}
}

function triggerOf(src) {
  const b = src?.gamepad?.buttons?.[0];
  if (!b) return 0;
  if (typeof b.value === "number") return b.value;
  return b.pressed ? 1 : 0;
}

function btnPressed(src, idx) {
  const b = src?.gamepad?.buttons?.[idx];
  return !!(b && (b.pressed || (typeof b.value === "number" && b.value > 0.6)));
}

function stickClick(src) {
  return btnPressed(src, 3);
}

function xClick(src) {
  return btnPressed(src, 4);
}

function bodyRegion(foe, hitY) {
  const h = foe.scale?.y || 2;
  const top = foe.position.y + h * 0.5;
  const bot = foe.position.y - h * 0.5;
  const t = (hitY - bot) / Math.max(0.15, top - bot);
  if (t > 0.72) return "head";
  if (t < 0.32) return "lower";
  return "torso";
}

export function applyMeleeHit(foe, speed, shield, knock) {
  if (!foe?.userData) return false;
  const u = foe.userData;
  if (u.hitCool > 0) return false;
  const spd = Math.max(0.45, Math.min(3.6, speed / 2.2));
  let dmg = (shield ? 1.5 : 2.4) * spd;
  const region = u.lastRegion || "torso";
  if (region === "head") dmg *= 2;
  if (region === "lower") {
    u.lower = Math.max(0.25, (u.lower ?? 1) - 0.18 * spd);
  }
  if (region === "torso") {
    u.stamina = Math.max(0, (u.stamina ?? 1) - dmg * 0.5 * 0.08);
  }
  u.hp -= dmg;
  u.hitCool = 0.18;
  u.flash = 0.28;
  u.stagger = 0.38;
  if (knock) {
    u.kx = knock.x;
    u.kz = knock.z;
  }
  const mat = foe.material;
  if (mat && mat.color) {
    if (!u._baseColor) u._baseColor = mat.color.getHex();
    mat.color.setHex(0xff2a2a);
  }
  if (u.hp <= 0) foe.visible = false;
  return true;
}

export function attachVrHands({ scene, gl, heightAt, loot, foes, store, onCast, magic }) {
  if (!gl?.xr || !scene) return { tick() {} };

  const grip = [gl.xr.getControllerGrip(0), gl.xr.getControllerGrip(1)];
  const rays = [gl.xr.getController(0), gl.xr.getController(1)];
  grip.forEach((g) => scene.add(g));
  rays.forEach((g) => scene.add(g));

  const gloves = [makeGlove("left"), makeGlove("right")];
  grip[0].add(gloves[0]);
  grip[1].add(gloves[1]);

  const held = [null, null];
  const lastEquip = [null, null];
  const prevPos = [new THREE.Vector3(), new THREE.Vector3()];
  const tip = new THREE.Vector3();
  const gp = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const sample = new THREE.Vector3();
  const knock = new THREE.Vector3();
  let sources = [null, null];
  let prevSqueeze = [0, 0];
  let prevTrig = [0, 0];
  let prevStick = [false, false];
  let prevX = [false, false];
  const charge = [0, 0];
  const rings = [makeChargeRing(), makeChargeRing()];
  grip[0].add(rings[0]);
  grip[1].add(rings[1]);
  const auras = [null, null];
  const spiritMat = [];
  gloves.forEach((glv) => {
    glv.traverse((o) => {
      if (o.isMesh && o.material) {
        o.material = o.material.clone();
        spiritMat.push(o.material);
      }
    });
  });

  const onAdd = (ev) => {
    const src = ev.data;
    const idx = rays.indexOf(ev.target);
    if (idx < 0) return;
    sources[idx] = src;
    rays[idx].userData.fmSrc = src;
    const glove = src.handedness === "left" ? gloves[0] : gloves[1];
    gloves.forEach((g) => {
      if (g !== glove && g.parent === grip[idx]) grip[idx].remove(g);
    });
    if (glove) grip[idx].add(glove);
  };
  const onRemove = (ev) => {
    const i = rays.indexOf(ev.target);
    if (i >= 0) sources[i] = null;
  };
  rays.forEach((r) => {
    r.addEventListener("connected", onAdd);
    r.addEventListener("disconnected", onRemove);
  });

  function drop(i, fling, silent) {
    const h = held[i];
    if (!h) return;
    if (h.defId) lastEquip[i] = h.defId;
    if (auras[i]) {
      auras[i].removeFromParent();
      auras[i] = null;
    }
    if (h.grabbed) {
      const world = new THREE.Vector3();
      h.mesh.getWorldPosition(world);
      h.mesh.removeFromParent();
      (window.__FENREST_ROOT__ || scene).add(h.mesh);
      h.mesh.position.copy(world);
      if (typeof heightAt === "function") h.mesh.position.y = heightAt(world.x, world.z);
      h.mesh.userData.held = false;
      h.mesh.userData.grounded = true;
      h.mesh.userData.vy = 0;
      held[i] = null;
      if (!silent) store?.getState?.().setHud?.({ prompt: "Set down" });
      return;
    }
    h.mesh.removeFromParent();
    const world = new THREE.Vector3();
    h.mesh.getWorldPosition(world);
    if (h.loot) {
      h.loot.visible = true;
      h.loot.position.copy(world);
      h.loot.userData.grounded = false;
      h.loot.userData.vy = 0.8;
      if (fling) {
        h.loot.userData.vx = fling.x;
        h.loot.userData.vz = fling.z;
        h.loot.userData.vy = Math.max(0.6, fling.y);
      }
    }
    held[i] = null;
    if (!silent) store?.getState?.().setHud?.({ prompt: "Empty hand" });
  }

  function holsterToggle(i) {
    if (held[i]) {
      lastEquip[i] = held[i].defId || lastEquip[i];
      drop(i, null, true);
      store?.getState?.().setHud?.({ prompt: "Bare hand" });
      haptic(sources[i], 0.4, 24);
      return;
    }
    if (lastEquip[i]) {
      equipFromInventory(i, lastEquip[i]);
      store?.getState?.().setHud?.({ prompt: "Drew " + String(lastEquip[i]).replace(/-/g, " ") });
      haptic(sources[i], 0.55, 30);
    }
  }

  function grabWorld(i, obj) {
    if (held[i]) drop(i, null, true);
    grip[i].add(obj);
    obj.position.set(0, 0, -0.28);
    obj.userData.held = true;
    held[i] = { mesh: obj, loot: null, defId: obj.userData.kind || "prop", grabbed: true };
    haptic(sources[i], 0.6, 32);
    store?.getState?.().setHud?.({ prompt: "Dragging " + (obj.userData.label || "prop") });
  }

  function attachAura(i, defId) {
    if (auras[i]) {
      auras[i].removeFromParent();
      auras[i] = null;
    }
    const sp = SPELLS.find((s) => s.id === defId);
    if (!sp) return;
    const aura = makeSpellAura(sp.aura);
    (held[i]?.mesh || gloves[i === 0 ? 0 : 1] || grip[i]).add(aura);
    auras[i] = aura;
  }

  function grab(i, item) {
    if (held[i]) drop(i);
    const mesh = makeHeldWeapon(item.userData.defId);
    grip[i].add(mesh);
    item.visible = false;
    held[i] = { mesh, loot: item, defId: item.userData.defId };
    lastEquip[i] = item.userData.defId;
    try {
      store?.getState?.().addItem?.(item.userData.defId, 1);
    } catch {}
    attachAura(i, item.userData.defId);
    store?.getState?.().setHud?.({ prompt: "Grip holds " + String(item.userData.defId).replace("-", " ") });
    haptic(sources[i], 0.7, 40);
  }

  function equipFromInventory(i, defId) {
    if (held[i]) drop(i);
    const mesh = makeHeldWeapon(defId);
    grip[i].add(mesh);
    held[i] = { mesh, loot: null, defId };
    lastEquip[i] = defId;
    attachAura(i, defId);
  }

  function tick(dt) {
    if (!gl.xr.isPresenting) {
      gloves.forEach((g) => (g.visible = false));
      return;
    }
    gloves.forEach((g) => (g.visible = true));

    for (let i = 0; i < 2; i++) {
      if (!sources[i] && rays[i].userData.fmSrc) sources[i] = rays[i].userData.fmSrc;
      const sq = squeezeOf(sources[i]);
      curlGlove(gloves[i], sq);
      grip[i].getWorldPosition(gp);
      const moved = gp.clone().sub(prevPos[i]);
      const speed = moved.length() / Math.max(dt, 0.001);

      if (sq > 0.7 && prevSqueeze[i] <= 0.7) {
        let best = null;
        let bestD = 0.52;
        for (const it of loot || []) {
          if (!it.visible || it.userData?.held) continue;
          const d = it.position.distanceTo(gp);
          if (d < bestD) {
            bestD = d;
            best = it;
          }
        }
        if (best) grab(i, best);
        else if (!held[i]) {
          const gabs = window.__FENREST_GRABBABLES__ || [];
          let gBest = null;
          let gD = 0.7;
          for (const obj of gabs) {
            if (!obj.visible || obj.userData?.held || obj.userData?.broken) continue;
            const d = obj.position.distanceTo(gp);
            if (d < gD) {
              gD = d;
              gBest = obj;
            }
          }
          if (gBest) grabWorld(i, gBest);
        } else {
          const fling = moved.multiplyScalar(1 / Math.max(dt, 0.008));
          drop(i, fling);
        }
      }

      const stick = stickClick(sources[i]);
      if (stick && !prevStick[i]) holsterToggle(i);
      prevStick[i] = stick;

      const xBtn = xClick(sources[i]);
      if (xBtn && !prevX[i]) {
        window.__FENREST_ON_X__?.(gp.clone(), sources[i]?.handedness || (i === 0 ? "left" : "right"));
      }
      prevX[i] = xBtn;

      const h = held[i];
      const spellId = h?.mesh?.userData?.spell || (String(h?.defId || "").startsWith("spell-") ? h.defId : null);
      const trig = triggerOf(sources[i]);
      if (spellId) {
        if (trig > 0.35) {
          charge[i] = Math.min(1, charge[i] + dt * 0.72);
          paintChargeRing(rings[i], charge[i], "#ffd070");
        } else {
          if (prevTrig[i] > 0.35 && charge[i] > 0.08) {
            grip[i].getWorldDirection(dir);
            dir.multiplyScalar(-1);
            const origin = gp.clone();
            onCast?.(spellId, charge[i], origin, dir, i);
            haptic(sources[i], 0.6 + charge[i] * 0.4, 50);
          }
          charge[i] = 0;
          rings[i].visible = false;
        }
      } else {
        charge[i] = 0;
        rings[i].visible = false;
      }

      if (auras[i]?.userData?.halo) {
        auras[i].userData.t += dt;
        auras[i].userData.halo.rotation.z += dt * 2.4;
        auras[i].scale.setScalar(1 + Math.sin(auras[i].userData.t * 6) * 0.08);
      }

      const swinging = h?.mesh && h.mesh.userData.melee && (speed > 0.55 || trig > 0.55);
      if (swinging) {
        if (h.mesh.userData.tip) h.mesh.userData.tip.getWorldPosition(tip);
        else {
          const reach = h.mesh.userData.reach || 0.7;
          grip[i].getWorldDirection(tip);
          tip.multiplyScalar(-reach).add(gp);
        }
        const lists = [foes, window.__FENREST_ALLIES__, window.__FENREST_HITABLES__];
        knock.copy(tip).sub(gp);
        knock.y = 0;
        if (knock.lengthSq() < 0.0001) knock.set(1, 0, 0);
        knock.normalize().multiplyScalar(2.4 + speed * 0.35);
        let hitSomething = false;
        for (const list of lists) {
          for (const f of list || []) {
            if (!f || !f.visible) continue;
            const rad = 0.7 + (f.scale?.x || 1) * 0.55;
            let hit = false;
            for (let s = 0; s <= 5; s++) {
              sample.lerpVectors(gp, tip, s / 5);
              const dx = f.position.x - sample.x;
              const dy = f.position.y - sample.y;
              const dz = f.position.z - sample.z;
              if (dx * dx + dy * dy * 0.45 + dz * dz < rad * rad) {
                hit = true;
                break;
              }
            }
            if (!hit) continue;
            if (f.userData?.harvest) {
              window.__FENREST_ON_HARVEST__?.(f, h.mesh.userData, gp, speed);
              hitSomething = true;
              continue;
            }
            if (f.userData?.breakable) {
              window.__FENREST_ON_BREAK__?.(f, h.mesh.userData, knock);
              hitSomething = true;
              continue;
            }
            if (f.userData?.kind === "grass") {
              window.__FENREST_ON_GRASS__?.(f, h.mesh.userData);
              hitSomething = true;
              continue;
            }
            f.userData.lastRegion = f.userData.humanoid === false ? "torso" : bodyRegion(f, tip.y);
            if (applyMeleeHit(f, Math.max(speed, trig * 3), !!h.mesh.userData.block, knock)) {
              hitSomething = true;
              haptic(sources[i], 0.95, 28);
              store?.getState?.().setHud?.({
                prompt:
                  (h.mesh.userData.block ? "Shield bash " : "Hit ") +
                  (f.userData.lastRegion || "") +
                  (f.userData.lower < 0.9 ? " · crippled" : ""),
              });
            }
          }
        }
        if (hitSomething) window.__FENREST_ON_SWING__?.(gp, tip, h.mesh.userData);
      }
      prevPos[i].copy(gp);
      prevSqueeze[i] = sq;
      prevTrig[i] = trig;
    }
    const spirit = magic?.skies?.();
    spiritMat.forEach((m) => {
      m.transparent = true;
      m.opacity = spirit ? 0.28 : 1;
    });
  }

  return { tick, grip, gloves, equipFromInventory, held, lastEquip };
}
