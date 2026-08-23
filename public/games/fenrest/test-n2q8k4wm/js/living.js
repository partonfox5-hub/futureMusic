/**
 * Common living entity: hp / stamina / mana, hit flash, stagger,
 * delayed death fall + rising soul, health bars, home-region fences.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";

const souls = [];

export const SAFE = { x: 0, z: 0, r: 48 };

export const REGIONS = [
  { id: "home", name: "Fenrest Green", x: 0, z: 0, r: 48, hostiles: [] },
  { id: "wolves", name: "Crown Moors", x: 96, z: -36, r: 70, hostiles: ["wolf"] },
  { id: "raptors", name: "Reed Cut", x: -82, z: 68, r: 62, hostiles: ["raptor", "wolf"] },
  { id: "megafauna", name: "Old Heath", x: 76, z: 96, r: 72, hostiles: ["trex", "mammoth", "raptor"] },
  { id: "dragons", name: "Ash Spine", x: -104, z: -78, r: 80, hostiles: ["dragon"] },
  { id: "wild", name: "The Marches", x: 0, z: 0, r: 900, hostiles: ["wolf", "raptor", "bandit"] },
];

export function inSafeRegion(x, z) {
  return Math.hypot(x - SAFE.x, z - SAFE.z) < SAFE.r;
}

export function regionOf(x, z) {
  for (const r of REGIONS) {
    if (r.id === "wild") continue;
    if (Math.hypot(x - r.x, z - r.z) < r.r) return r;
  }
  return REGIONS[REGIONS.length - 1];
}

export function keepOutOfSafe(obj, dt) {
  if (!obj || inSafeRegion(obj.position.x, obj.position.z) === false) return;
  if (!obj.userData?.hostile && !obj.userData?.foe) return;
  if (obj.userData?.dead) return;
  const dx = obj.position.x - SAFE.x;
  const dz = obj.position.z - SAFE.z;
  const d = Math.hypot(dx, dz) || 0.001;
  const push = (SAFE.r + 2.4 - d) * 5.2 * dt;
  obj.position.x += (dx / d) * push;
  obj.position.z += (dz / d) * push;
}

export function livingDefaults(opts = {}) {
  const hp = opts.hp ?? 10;
  return {
    living: true,
    hostile: !!opts.hostile,
    friendly: !!opts.friendly,
    hp,
    maxHp: opts.maxHp ?? hp,
    stamina: opts.stamina ?? 1,
    maxStamina: opts.maxStamina ?? 1,
    mana: opts.mana ?? 0.4,
    maxMana: opts.maxMana ?? 1,
    flash: 0,
    stagger: 0,
    kx: 0,
    kz: 0,
    dying: false,
    dead: false,
    pendingDeath: false,
    fall: 0,
    soul: null,
    hitCool: 0,
  };
}

function barCanvas() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 24;
  return c;
}

export function attachVitals(obj) {
  if (!obj || obj.userData.bar) return obj;
  const c = barCanvas();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }),
  );
  const h = obj.scale?.y || 2;
  spr.scale.set(Math.max(1.05, (obj.scale?.x || 1) * 0.95), 0.22, 1);
  spr.position.set(0, (obj.isSprite ? h * 0.62 : h * 0.55) + 0.28, 0);
  spr.center.set(0.5, 0);
  obj.add(spr);
  obj.userData.bar = spr;
  obj.userData.barCanvas = c;
  obj.userData.barTex = tex;
  paintVitals(obj);
  return obj;
}

export function paintVitals(obj) {
  const u = obj?.userData;
  if (!u?.barCanvas) return;
  const g = u.barCanvas.getContext("2d");
  const w = 128;
  const h = 24;
  g.clearRect(0, 0, w, h);
  g.fillStyle = "rgba(8,6,4,0.78)";
  g.fillRect(0, 0, w, h);
  const hp = Math.max(0, u.hp ?? 0) / Math.max(1, u.maxHp ?? 1);
  const st = Math.max(0, u.stamina ?? 1) / Math.max(0.001, u.maxStamina ?? 1);
  const mn = Math.max(0, u.mana ?? 0) / Math.max(0.001, u.maxMana ?? 1);
  g.fillStyle = hp > 0.4 ? "#6aaa3a" : hp > 0.18 ? "#c4a050" : "#c4453a";
  g.fillRect(3, 3, Math.round(122 * hp), 8);
  g.fillStyle = "#c4a050";
  g.fillRect(3, 12, Math.round(122 * st), 4);
  g.fillStyle = "#5a8ad4";
  g.fillRect(3, 17, Math.round(122 * mn), 4);
  g.strokeStyle = "rgba(240,226,196,0.35)";
  g.strokeRect(0.5, 0.5, w - 1, h - 1);
  u.barTex.needsUpdate = true;
  if (u.bar) u.bar.visible = !(u.dead || u.dying);
}

export function knockFrom(attacker, victim, speed) {
  const ax = attacker?.x ?? attacker?.position?.x ?? 0;
  const az = attacker?.z ?? attacker?.position?.z ?? 0;
  const dx = victim.position.x - ax;
  const dz = victim.position.z - az;
  let d = Math.hypot(dx, dz);
  if (d < 0.05) {
    const a = Math.random() * Math.PI * 2;
    return { x: Math.cos(a) * (2.4 + speed * 0.4), z: Math.sin(a) * (2.4 + speed * 0.4) };
  }
  const jitter = (Math.random() - 0.5) * 0.95;
  const nx = dx / d;
  const nz = dz / d;
  const mag = 2.4 + speed * 0.55 + Math.random() * 1.6;
  return { x: (nx - nz * jitter) * mag, z: (nz + nx * jitter) * mag };
}

function collectMats(obj) {
  const mats = [];
  const skip = obj.userData?.bar;
  if (obj.material?.color) mats.push(obj.material);
  obj.traverse?.((o) => {
    if (o === obj || o === skip) return;
    if (o.userData?.soul || o.userData?.bar) return;
    if (o.material?.color && (o.isSprite || o.isMesh)) mats.push(o.material);
  });
  return mats;
}

function flashMats(obj, hex) {
  const mats = collectMats(obj);
  if (obj.userData._baseColors == null) {
    obj.userData._baseColors = mats.map((m) => m.color.getHex());
  }
  for (const m of mats) m.color.setHex(hex);
}

function restoreMats(obj) {
  const mats = collectMats(obj);
  const bases = obj.userData._baseColors;
  if (!bases) {
    for (const m of mats) m.color.setHex(0xffffff);
    return;
  }
  mats.forEach((m, i) => m.color.setHex(bases[i] ?? 0xffffff));
}

function startDeath(obj, knock, root) {
  const u = obj.userData;
  if (u.dying || u.dead) return;
  u.dying = true;
  u.pendingDeath = false;
  u.fall = 0;
  u.fallDir = (knock?.x || u.kx || 0) >= 0 ? 1 : -1;
  u._sy = obj.scale?.y || 2;
  u._sx = obj.scale?.x || 1;
  u._centerY = obj.center?.y ?? 0.5;
  if (u.bar) u.bar.visible = false;
  restoreMats(obj);

  const map = obj.material?.map;
  const parent = root || obj.parent;
  if (map && parent) {
    const soul = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map,
        color: 0x9a9a9a,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        depthTest: true,
      }),
    );
    if (obj.material?.offset) soul.material.offset.copy(obj.material.offset);
    soul.scale.set(u._sx * 0.9, u._sy * 0.9, 1);
    soul.position.copy(obj.position);
    soul.position.y += u._sy * 0.35;
    soul.userData = { soul: true, life: 2.4, maxLife: 2.4, vy: 0.62 };
    parent.add(soul);
    souls.push(soul);
    u.soul = soul;
  }
}

export function hurtLiving(obj, dmg, knock, root) {
  if (!obj?.userData) return false;
  const u = obj.userData;
  if (u.dead || u.dying) return false;
  if ((u.hitCool || 0) > 0) return false;
  if (u.hp == null) {
    const d = livingDefaults({
      hp: 8,
      hostile: !!(u.foe || u.hostile),
      friendly: !!(u.npc || u.ally || u.friendly),
    });
    for (const k of Object.keys(d)) if (u[k] == null) u[k] = d[k];
    u.living = true;
  }
  u.hp -= dmg;
  u.hitCool = 0.22;
  u.stagger = 0.4 + Math.random() * 0.2;
  u.flash = u.hp <= 0 ? u.stagger : 0.3;
  if (knock) {
    u.kx = knock.x + (Math.random() - 0.5) * 1.1;
    u.kz = knock.z + (Math.random() - 0.5) * 1.1;
  } else {
    const a = Math.random() * Math.PI * 2;
    const mag = 2.6 + Math.random() * 1.4;
    u.kx = Math.cos(a) * mag;
    u.kz = Math.sin(a) * mag;
  }
  flashMats(obj, 0xff2a2a);
  paintVitals(obj);
  if (u.hp <= 0) {
    u.pendingDeath = true;
    u._deathRoot = root || obj.parent;
  }
  return true;
}

export function tickLiving(obj, dt, heightAtFn) {
  const u = obj.userData;
  if (!u || (u.living !== true && u.hp == null)) return;
  u.hitCool = Math.max(0, (u.hitCool || 0) - dt);

  if (u.dead) {
    if (typeof heightAtFn === "function" && obj.isSprite) {
      obj.position.y = heightAtFn(obj.position.x, obj.position.z) + 0.05;
    }
    return;
  }

  if (u.flash > 0) {
    u.flash -= dt;
    if (u.flash <= 0) restoreMats(obj);
  }
  if (u.stagger > 0) {
    u.stagger -= dt;
    obj.position.x += (u.kx || 0) * dt;
    obj.position.z += (u.kz || 0) * dt;
    u.kx = (u.kx || 0) * (1 - dt * 4.2);
    u.kz = (u.kz || 0) * (1 - dt * 4.2);
  }

  if (u.pendingDeath && u.stagger <= 0 && !u.dying) {
    startDeath(obj, { x: u.kx, z: u.kz }, u._deathRoot);
  }

  if (u.dying) {
    u.fall = Math.min(1, (u.fall || 0) + dt * 2.2);
    if (obj.isSprite) {
      const gy = typeof heightAtFn === "function" ? heightAtFn(obj.position.x, obj.position.z) : obj.position.y;
      if (!u._feetLock) {
        obj.center.set(0.5, 0);
        u._feetLock = true;
      }
      obj.position.y = gy + 0.04;
      obj.material.rotation = (u.fallDir || 1) * u.fall * (Math.PI / 2);
      obj.scale.set(u._sx * (1 + u.fall * 0.12), Math.max(0.16, u._sy * (1 - u.fall * 0.78)), 1);
    } else {
      obj.rotation.x = u.fall * (Math.PI / 2) * (u.fallDir || 1);
    }
    obj.position.x += (u.kx || 0) * dt * 0.45;
    obj.position.z += (u.kz || 0) * dt * 0.45;
    if (u.fall >= 1) {
      u.dying = false;
      u.dead = true;
      u.foe = false;
      u.hostile = false;
      paintVitals(obj);
    }
    return;
  }

  if (typeof heightAtFn === "function") {
    const gy = heightAtFn(obj.position.x, obj.position.z);
    const h = obj.scale?.y || 2;
    if (obj.isSprite) {
      const cy = obj.center?.y ?? (u.feet ? 0 : 0.5);
      obj.position.y = gy + h * cy;
    } else if (!u.harvest) {
      obj.position.y = gy;
    }
  }
}

export function tickSouls(dt) {
  for (let i = souls.length - 1; i >= 0; i--) {
    const s = souls[i];
    s.userData.life -= dt;
    s.position.y += (s.userData.vy || 0.6) * dt;
    const t = Math.max(0, s.userData.life / (s.userData.maxLife || 2.4));
    s.material.opacity = 0.5 * t;
    if (s.userData.life <= 0) {
      s.removeFromParent();
      souls.splice(i, 1);
    }
  }
}

export function bindLiving(obj, opts = {}) {
  const u = obj.userData || (obj.userData = {});
  const d = livingDefaults(opts);
  for (const k of Object.keys(d)) {
    if (u[k] == null) u[k] = d[k];
  }
  u.living = true;
  u.hp = u.hp ?? opts.hp ?? 10;
  u.maxHp = u.maxHp ?? u.hp;
  if (opts.hostile != null) u.hostile = !!opts.hostile;
  if (opts.friendly != null) u.friendly = !!opts.friendly;
  attachVitals(obj);
  return obj;
}

export function markRegions(root, heightAtFn) {
  if (!root || root.userData._regionsMarked) return;
  root.userData._regionsMarked = true;
  const mk = (x, z, label, sub) => {
    const y0 = heightAtFn ? heightAtFn(x, z) : 0;
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.1, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x5a3a18 }),
    );
    post.position.set(x, y0 + 1.05, z);
    root.add(post);
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 96;
    const g = c.getContext("2d");
    g.fillStyle = "#4a3018";
    g.fillRect(0, 0, 320, 96);
    g.strokeStyle = "#e8d4a8";
    g.strokeRect(4, 4, 312, 88);
    g.fillStyle = "#f0e2c4";
    g.font = "bold 28px serif";
    g.textAlign = "center";
    g.fillText(label, 160, 42);
    if (sub) {
      g.font = "18px serif";
      g.fillStyle = "#d4c090";
      g.fillText(sub, 160, 72);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const pl = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.58),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true }),
    );
    pl.position.set(x, y0 + 2.15, z);
    pl.userData.billboard = true;
    root.add(pl);
  };
  for (const r of REGIONS) {
    if (r.id === "wild" || r.id === "home") continue;
    mk(r.x, r.z, r.name.toUpperCase(), "wilds — hostiles");
  }
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0.72, 0.72],
    [-0.72, 0.72],
    [0.72, -0.72],
    [-0.72, -0.72],
  ];
  for (const [dx, dz] of dirs) {
    mk(SAFE.x + dx * (SAFE.r - 1.2), SAFE.z + dz * (SAFE.r - 1.2), "FENREST GREEN", "no beasts past here");
  }
}
