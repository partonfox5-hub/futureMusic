/**
 * Fenrest VR: leather gloves on controller grips, squeeze to pick up
 * melee and brandish / swing them.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";

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
  } else if (defId.startsWith("axe-")) {
    addCyl(g, oak, 0, 0, -0.12, 0.014, 0.016, 0.42, Math.PI / 2, 0, 0);
    addBox(g, mat(0x6a6a62), 0.04, 0, -0.32, 0.16, 0.04, 0.12);
    g.userData.reach = 0.55;
    g.userData.melee = true;
  } else if (defId.startsWith("spear-")) {
    addCyl(g, oak, 0, 0, -0.35, 0.01, 0.012, 0.9, Math.PI / 2, 0, 0);
    addBox(g, mat(0xe8dcc0), 0, 0, -0.84, 0.03, 0.03, 0.16);
    g.userData.reach = 1.05;
    g.userData.melee = true;
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
  } else if (defId === "spell-thunderbolt") {
    addCyl(g, mat(0x3a2a58), 0, 0, -0.08, 0.016, 0.018, 0.28, Math.PI / 2, 0, 0);
    addBox(g, mat(0xc8e8ff), 0, 0, -0.24, 0.04, 0.04, 0.04);
    g.userData.reach = 0.4;
    g.userData.melee = false;
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

export function attachVrHands({ scene, gl, heightAt, loot, foes, store }) {
  if (!gl?.xr || !scene) return { tick() {} };

  const grip = [gl.xr.getControllerGrip(0), gl.xr.getControllerGrip(1)];
  const rays = [gl.xr.getController(0), gl.xr.getController(1)];
  grip.forEach((g) => scene.add(g));
  rays.forEach((g) => scene.add(g));

  const gloves = [makeGlove("left"), makeGlove("right")];
  grip[0].add(gloves[0]);
  grip[1].add(gloves[1]);

  const held = [null, null];
  const prevPos = [new THREE.Vector3(), new THREE.Vector3()];
  const tip = new THREE.Vector3();
  const gp = new THREE.Vector3();
  let sources = [null, null];
  let prevSqueeze = [0, 0];

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

  function drop(i, fling) {
    const h = held[i];
    if (!h) return;
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
    store?.getState?.().setHud?.({ prompt: "Dropped" });
  }

  function grab(i, item) {
    if (held[i]) drop(i);
    const mesh = makeHeldWeapon(item.userData.defId);
    grip[i].add(mesh);
    item.visible = false;
    held[i] = { mesh, loot: item, defId: item.userData.defId };
    try {
      store?.getState?.().addItem?.(item.userData.defId, 1);
    } catch {}
    store?.getState?.().setHud?.({ prompt: "Grip holds " + String(item.userData.defId).replace("-", " ") });
    haptic(sources[i], 0.7, 40);
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
        let bestD = 0.48;
        for (const it of loot || []) {
          if (!it.visible || it.userData?.held) continue;
          const d = it.position.distanceTo(gp);
          if (d < bestD) {
            bestD = d;
            best = it;
          }
        }
        if (best) grab(i, best);
        else if (held[i]) {
          const fling = moved.multiplyScalar(1 / Math.max(dt, 0.008));
          drop(i, fling);
        }
      }

      const h = held[i];
      if (h?.mesh && h.mesh.userData.melee && speed > 2.4) {
        if (h.mesh.userData.tip) h.mesh.userData.tip.getWorldPosition(tip);
        else {
          const reach = h.mesh.userData.reach || 0.7;
          grip[i].getWorldDirection(tip);
          tip.multiplyScalar(-reach).add(gp);
        }
        for (const f of foes || []) {
          if (!f.visible) continue;
          if (f.position.distanceTo(tip) < 1.15 || f.position.distanceTo(gp) < 0.7) {
            f.userData.hp -= 2.4 * Math.min(3, speed / 2);
            haptic(sources[i], 0.95, 28);
            if (f.userData.hp <= 0) f.visible = false;
          }
        }
      }
      prevPos[i].copy(gp);
      prevSqueeze[i] = sq;
    }
  }

  return { tick, grip, gloves };
}
