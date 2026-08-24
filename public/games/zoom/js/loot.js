/** Coin/gem showers, chime, wrist gold counter. */
import * as THREE from "three";
import { LOOT } from "./config.js";

const LS = "zoom.gold";
const TEX = {};
const loader = new THREE.TextureLoader();

export function loadGold() {
  try {
    return Math.max(0, parseInt(localStorage.getItem(LS) || "0", 10) || 0);
  } catch {
    return 0;
  }
}
export function saveGold(n) {
  try {
    localStorage.setItem(LS, String(Math.max(0, n | 0)));
  } catch {}
}

function texOf(id) {
  const def = LOOT.find((l) => l.id === id);
  if (!def) return null;
  if (TEX[id]) return TEX[id];
  const t = loader.load(def.file);
  t.colorSpace = THREE.SRGBColorSpace;
  t.transparent = true;
  TEX[id] = t;
  return t;
}

function chime(value) {
  try {
    const ac = chime._ac || (chime._ac = new (window.AudioContext || window.webkitAudioContext)());
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    const hi = value >= 500 ? 1320 : value >= 100 ? 1046 : value >= 25 ? 880 : 740;
    o.frequency.setValueAtTime(hi, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(hi * 1.35, ac.currentTime + 0.08);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(value >= 100 ? 0.18 : 0.11, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.22);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.24);
  } catch {}
}

export function lootForEnemy(def) {
  const power = (def?.hp || 5) + (def?.dmg || 8);
  const drops = [];
  const coins = 4 + Math.floor(power * 0.7) + ((Math.random() * 5) | 0);
  for (let i = 0; i < coins; i++) drops.push("coin");
  const bars = Math.min(8, Math.floor(power / 12) + (Math.random() < power / 40 ? 1 : 0));
  for (let i = 0; i < bars; i++) drops.push("goldbar");
  if (power > 22 && Math.random() < Math.min(0.55, power / 80)) drops.push("ruby");
  if (power > 28 && Math.random() < Math.min(0.35, power / 120)) drops.push("ruby");
  if (power > 36 && Math.random() < Math.min(0.28, power / 160)) drops.push("diamond");
  if (power > 48 && Math.random() < Math.min(0.18, power / 220)) drops.push("chest");
  return drops;
}

export function showerLoot(scene, list, x, y, z, kinds) {
  for (const id of kinds) {
    const def = LOOT.find((l) => l.id === id);
    if (!def) continue;
    const mat = new THREE.SpriteMaterial({ map: texOf(id), transparent: true, depthWrite: false });
    const spr = new THREE.Sprite(mat);
    const s = def.scale || 0.35;
    spr.scale.set(s, s, 1);
    spr.position.set(x + (Math.random() - 0.5) * 0.2, y + 0.4 + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.2);
    scene.add(spr);
    const ang = Math.random() * Math.PI * 2;
    const sp = 2.4 + Math.random() * 4.2;
    list.push({
      mesh: spr,
      id,
      value: def.value,
      vx: Math.cos(ang) * sp,
      vy: 5.5 + Math.random() * 4.5,
      vz: Math.sin(ang) * sp,
      life: 8,
      taken: false,
      floor: y,
    });
  }
}

export function tickLoot(list, dt, player, onPickup) {
  const px = player.x;
  const py = player.y;
  const pz = player.z;
  for (let i = list.length - 1; i >= 0; i--) {
    const L = list[i];
    if (L.taken) continue;
    L.vy -= 18 * dt;
    L.mesh.position.x += L.vx * dt;
    L.mesh.position.y += L.vy * dt;
    L.mesh.position.z += L.vz * dt;
    L.vx *= 0.98;
    L.vz *= 0.98;
    if (L.mesh.position.y < L.floor + 0.18) {
      L.mesh.position.y = L.floor + 0.18;
      L.vy *= -0.35;
      L.vx *= 0.7;
      L.vz *= 0.7;
      if (Math.abs(L.vy) < 1.2) L.vy = 0;
    }
    L.mesh.material.rotation = (L.mesh.material.rotation || 0) + dt * 3;
    const d = Math.hypot(L.mesh.position.x - px, L.mesh.position.z - pz);
    const dy = Math.abs(L.mesh.position.y - (py - 0.6));
    if (d < 1.15 && dy < 1.4) {
      L.taken = true;
      chime(L.value);
      onPickup(L.value);
      L.mesh.removeFromParent();
      list.splice(i, 1);
      continue;
    }
    L.life -= dt;
    if (L.life <= 0) {
      L.mesh.removeFromParent();
      list.splice(i, 1);
    }
  }
}

export function makeWristGold() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(0.28, 0.07, 1);
  spr.position.set(-0.22, -0.26, -0.42);
  spr.renderOrder = 20;
  spr.userData.goldCanvas = c;
  spr.userData.goldCtx = g;
  spr.userData.goldTex = tex;
  return spr;
}

export function paintWristGold(spr, coins) {
  if (!spr) return;
  const g = spr.userData.goldCtx;
  const c = spr.userData.goldCanvas;
  g.clearRect(0, 0, 256, 64);
  g.fillStyle = "rgba(18,12,6,0.72)";
  g.beginPath();
  if (g.roundRect) g.roundRect(4, 8, 248, 48, 10);
  else g.rect(4, 8, 248, 48);
  g.fill();
  g.strokeStyle = "#d4b070";
  g.lineWidth = 3;
  g.strokeRect(6, 10, 244, 44);
  g.fillStyle = "#ffe08a";
  g.font = "bold 28px Cinzel, Georgia, serif";
  g.textAlign = "center";
  g.fillText("◎ " + (coins | 0), 128, 42);
  spr.userData.goldTex.needsUpdate = true;
}
