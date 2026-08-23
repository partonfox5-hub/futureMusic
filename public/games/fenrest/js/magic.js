/**
 * Fenrest magic + Hero Slayer unit catalog.
 * Charge-to-cast, unique auras, spawn spells, Join Skies RTS.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";
import { heightAt, raiseTerrain, inSettlement } from "/games/fenrest/js/world-grid.js";

const FX_FIRE = [0, 1, 2, 3].map((i) => "/games/character-chess/sprites/fx/fire/" + i + ".png");
const FX_ELEC = [0, 1, 2, 3].map((i) => "/games/character-chess/sprites/fx/electric/" + i + ".png");
const FX_ICE = "/games/character-chess/sprites/cards/trap_freeze.png";
const FX_METEOR = "/games/character-chess/sprites/cards/meteor.png";

export const HS_UNITS = [
  { id: "slime", name: "Slime", file: "slime.jpg", hp: 6, spd: 2.2, dmg: 0.05, scale: 0.7, humanoid: false, evil: true },
  { id: "goblin", name: "Goblin", file: "goblin.jpg", hp: 8, spd: 3.4, dmg: 0.07, scale: 0.9, humanoid: true, evil: true },
  { id: "skeleton", name: "Skeleton", file: "skeleton.jpg", hp: 9, spd: 2.8, dmg: 0.08, scale: 1.1, humanoid: true, evil: true },
  { id: "bat", name: "Bat", file: "bat.jpg", hp: 4, spd: 4.4, dmg: 0.04, scale: 0.6, humanoid: false, evil: true },
  { id: "ghost", name: "Ghost", file: "ghost.jpg", hp: 7, spd: 2.6, dmg: 0.06, scale: 1.0, humanoid: false, evil: true },
  { id: "cultist", name: "Cultist", file: "cultist.jpg", hp: 10, spd: 2.5, dmg: 0.09, scale: 1.1, humanoid: true, evil: true },
  { id: "vampire", name: "Vampire", file: "vampire.jpg", hp: 14, spd: 3.1, dmg: 0.12, scale: 1.15, humanoid: true, evil: true },
  { id: "harpy", name: "Harpy", file: "harpy.jpg", hp: 9, spd: 3.8, dmg: 0.08, scale: 1.2, humanoid: false, evil: true },
  { id: "ogre", name: "Ogre", file: "ogre.jpg", hp: 22, spd: 1.9, dmg: 0.16, scale: 1.8, humanoid: true, evil: true },
  { id: "troll_chief", name: "Troll Chief", file: "troll_chief.jpg", hp: 26, spd: 1.8, dmg: 0.18, scale: 2.0, humanoid: true, evil: true },
  { id: "bone_golem", name: "Bone Golem", file: "bone_golem.jpg", hp: 28, spd: 1.6, dmg: 0.17, scale: 2.2, humanoid: false, evil: true },
  { id: "lich", name: "Lich", file: "lich.jpg", hp: 18, spd: 2.2, dmg: 0.14, scale: 1.3, humanoid: true, evil: true },
  { id: "death_knight", name: "Death Knight", file: "death_knight.jpg", hp: 20, spd: 2.4, dmg: 0.15, scale: 1.4, humanoid: true, evil: true },
  { id: "dragon", name: "Dragon", file: "dragon.jpg", hp: 40, spd: 2.0, dmg: 0.22, scale: 2.8, humanoid: false, evil: true },
  { id: "frost_wyrm", name: "Frost Wyrm", file: "frost_wyrm.jpg", hp: 36, spd: 1.9, dmg: 0.2, scale: 2.6, humanoid: false, evil: true },
  { id: "abyss_hydra", name: "Abyss Hydra", file: "abyss_hydra.jpg", hp: 44, spd: 1.7, dmg: 0.24, scale: 3.0, humanoid: false, evil: true },
  { id: "demon_king", name: "Demon King", file: "demon_king.jpg", hp: 48, spd: 2.1, dmg: 0.26, scale: 2.4, humanoid: true, evil: true },
  { id: "angel", name: "Angel", file: "angel.jpg", hp: 16, spd: 3.0, dmg: 0.11, scale: 1.5, humanoid: true, evil: false },
  { id: "archangel", name: "Archangel", file: "archangel.jpg", hp: 22, spd: 2.9, dmg: 0.14, scale: 1.55, humanoid: true, evil: false },
  { id: "archer_imp", name: "Archer Imp", file: "archer_imp.jpg", hp: 7, spd: 3.3, dmg: 0.07, scale: 0.85, humanoid: true, evil: true },
  { id: "crimson_commander", name: "Crimson Commander", file: "crimson_commander.jpg", hp: 18, spd: 2.6, dmg: 0.13, scale: 1.4, humanoid: true, evil: true },
  { id: "corrupted_npc", name: "Corrupted", file: "corrupted_npc.jpg", hp: 11, spd: 2.7, dmg: 0.09, scale: 1.1, humanoid: true, evil: true },
];

export const SPELLS = [
  { id: "spell-fireball", name: "Fireball", color: 0xff6a20, aura: 0xff4400 },
  { id: "spell-thunderbolt", name: "Lightning Strike", color: 0xc8e8ff, aura: 0x88ddff },
  { id: "spell-freeze", name: "Freeze", color: 0x88ddff, aura: 0xaadfff },
  { id: "spell-raise-terrain", name: "Raise Terrain", color: 0xc4a050, aura: 0x8a6a30 },
  { id: "spell-meteor", name: "Meteor", color: 0xff3311, aura: 0xff2200 },
  { id: "spell-join-skies", name: "Join Skies", color: 0xd4b070, aura: 0xfff0c0 },
  ...HS_UNITS.map((u) => ({
    id: "spell-spawn-" + u.id,
    name: "Summon " + u.name,
    color: 0xaa66ff,
    aura: 0xcc88ff,
    spawn: u.id,
  })),
];

const TEXC = {};
function loadTex(url) {
  if (!TEXC[url]) {
    const t = new THREE.TextureLoader().load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    TEXC[url] = t;
  }
  return TEXC[url];
}

function hsTex(file) {
  return loadTex("/images/hero-slayer/" + file);
}

export function spawnHsUnit(root, list, def, x, z, friendly) {
  const h = 1.15 * def.scale;
  const w = 0.85 * def.scale;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: hsTex(def.file), transparent: true }));
  sp.scale.set(w, h, 1);
  sp.position.set(x, heightAt(x, z) + h * 0.5, z);
  sp.userData = {
    foe: !friendly,
    ally: !!friendly,
    humanoid: def.humanoid,
    def,
    hp: def.hp,
    maxHp: def.hp,
    stamina: 1,
    lower: 1,
    cool: 0,
    frozen: 0,
    cmd: null,
  };
  root.add(sp);
  list.push(sp);
  return sp;
}

function chargeTier(c) {
  if (c >= 0.95) return 3;
  if (c >= 0.66) return 2;
  if (c >= 0.33) return 1;
  return 0;
}

function lightning(from, to) {
  const g = new THREE.BufferGeometry();
  const pts = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(
      from.x + (to.x - from.x) * t + (Math.random() - 0.5) * 0.8,
      from.y + (to.y - from.y) * t + (i > 0 && i < n ? (Math.random() - 0.5) * 1.6 : 0),
      from.z + (to.z - from.z) * t + (Math.random() - 0.5) * 0.8,
    );
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xc8e8ff, transparent: true, opacity: 0.95 }));
  line.userData = { life: 0.35, hit: to.clone(), kind: "bolt" };
  return line;
}

function fxBurst(root, fx, url, x, y, z, scale, life) {
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: loadTex(url), transparent: true, depthWrite: false }));
  spr.position.set(x, y, z);
  spr.scale.set(scale, scale, 1);
  spr.userData = { life, kind: "fx" };
  root.add(spr);
  fx.push(spr);
}

export function createMagic({ root, foes, allies, store, gl, cam }) {
  const fx = [];
  const projectiles = [];
  let skies = false;
  let skiesY = 0;
  let selectA = null;
  let selected = [];
  const spirit = [];
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  function aimPoint(origin, dir, dist) {
    tmp.copy(origin).addScaledVector(dir, dist);
    tmp.y = heightAt(tmp.x, tmp.z) + 0.4;
    return tmp.clone();
  }

  function hitUnits(pos, r, dmg, freezeT) {
    const lists = [foes, allies];
    for (const list of lists) {
      for (const f of list) {
        if (!f.visible) continue;
        if (f.position.distanceTo(pos) < r) {
          applySpellHit(f, dmg, freezeT);
        }
      }
    }
  }

  function applySpellHit(f, dmg, freezeT) {
    f.userData.hp -= dmg;
    if (freezeT) f.userData.frozen = Math.max(f.userData.frozen || 0, freezeT);
    if (f.userData.hp <= 0) f.visible = false;
  }

  function cast(defId, charge, origin, dir) {
    const t = chargeTier(charge);
    const pow = 0.35 + charge * 1.8;
    const hit = aimPoint(origin, dir, 8 + charge * 18);
    if (defId === "spell-fireball") {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.18 + charge * 0.28, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xff5511 }),
      );
      ball.position.copy(origin);
      ball.userData = { vx: dir.x * (14 + charge * 10), vy: dir.y * 14 + 1.2, vz: dir.z * (14 + charge * 10), life: 1.6, kind: "fireball", pow, r: 1.4 + t };
      root.add(ball);
      projectiles.push(ball);
    } else if (defId === "spell-thunderbolt") {
      const from = origin.clone();
      from.y += 8 + t * 4;
      const bolt = lightning(from, hit);
      root.add(bolt);
      fx.push(bolt);
      FX_ELEC.forEach((u, i) => setTimeout(() => fxBurst(root, fx, u, hit.x, hit.y + 0.6, hit.z, 1.4 + t, 0.18), i * 40));
      hitUnits(hit, 2.4 + t * 1.4, 5 + pow * 6);
    } else if (defId === "spell-freeze") {
      fxBurst(root, fx, FX_ICE, hit.x, hit.y + 1.1, hit.z, 2.2 + t, 0.7);
      hitUnits(hit, 3 + t * 1.6, 2 + pow * 2, 1.8 + t * 1.4);
    } else if (defId === "spell-raise-terrain") {
      raiseTerrain(hit.x, hit.z, 4 + t * 3, 2.2 + charge * 4);
      const mound = new THREE.Mesh(
        new THREE.ConeGeometry(3.4 + t, 1.6 + charge * 3, 7),
        new THREE.MeshBasicMaterial({ color: 0x6a5a38 }),
      );
      mound.position.set(hit.x, heightAt(hit.x, hit.z) + 0.2, hit.z);
      mound.userData = { life: 40, kind: "fx" };
      root.add(mound);
      fx.push(mound);
    } else if (defId === "spell-meteor") {
      const met = new THREE.Sprite(new THREE.SpriteMaterial({ map: loadTex(FX_METEOR), transparent: true }));
      met.scale.set(1.6 + t, 1.6 + t, 1);
      met.position.set(hit.x, hit.y + 18, hit.z);
      met.userData = { kind: "meteor", tx: hit.x, ty: hit.y, tz: hit.z, life: 1.4, pow, t };
      root.add(met);
      projectiles.push(met);
    } else if (defId === "spell-join-skies") {
      skies = !skies;
      store?.getState?.().setHud?.({ prompt: skies ? "Join Skies — hold A to box, B to move" : "Returned to the field" });
    } else if (defId.startsWith("spell-spawn-")) {
      const id = defId.slice("spell-spawn-".length);
      const def = HS_UNITS.find((u) => u.id === id);
      if (def) {
        const n = 1 + t;
        for (let i = 0; i < n; i++) {
          spawnHsUnit(root, allies, def, hit.x + (Math.random() - 0.5) * 2, hit.z + (Math.random() - 0.5) * 2, true);
        }
      }
    }
    store?.getState?.().setHud?.({ mp: 1 });
  }

  function tickSkies(dt, gl) {
    const session = gl?.xr?.getSession?.();
    const cam = window.__FENREST_CAM__;
    if (!cam) return;
    if (skies) {
      skiesY = Math.min(48, skiesY + dt * 22);
      const rig = cam.parent;
      if (rig) rig.position.y = THREE.MathUtils.lerp(rig.position.y, skiesY, Math.min(1, dt * 3));
      cam.rotation.x = THREE.MathUtils.lerp(cam.rotation.x, -1.15, dt * 2);
      if (!session) return;
      for (const src of session.inputSources) {
        const gp = src.gamepad;
        if (!gp) continue;
        const a = gp.buttons[4]?.pressed || gp.buttons[5]?.pressed && src.handedness === "left";
        const b = gp.buttons[5]?.pressed && src.handedness === "right";
        const ax = gp.axes?.[2] || 0;
        const ay = gp.axes?.[3] || 0;
        if (rig) {
          rig.position.x += ax * dt * (18 + skiesY * 0.4);
          rig.position.z += ay * dt * (18 + skiesY * 0.4);
        }
        const ray = new THREE.Vector3();
        cam.getWorldDirection(ray);
        const ground = aimPoint(cam.getWorldPosition(tmp2), ray, 20);
        if (src.handedness === "right" && gp.buttons[4]?.pressed) {
          if (!selectA) selectA = ground.clone();
        } else if (selectA && src.handedness === "right") {
          const bxz = ground;
          selected = allies.filter((u) => {
            if (!u.visible) return false;
            const minx = Math.min(selectA.x, bxz.x);
            const maxx = Math.max(selectA.x, bxz.x);
            const minz = Math.min(selectA.z, bxz.z);
            const maxz = Math.max(selectA.z, bxz.z);
            return u.position.x >= minx && u.position.x <= maxx && u.position.z >= minz && u.position.z <= maxz;
          });
          store?.getState?.().setHud?.({ prompt: selected.length + " bound to your will" });
          selectA = null;
        }
        if (src.handedness === "right" && gp.buttons[5]?.pressed && selected.length) {
          selected.forEach((u) => {
            u.userData.cmd = { x: ground.x, z: ground.z };
          });
        }
      }
    } else {
      skiesY = Math.max(0, skiesY - dt * 24);
    }
  }

  function tick(dt, gl) {
    store?.getState?.().setHud?.({ mp: 1 });
    tickSkies(dt, gl);
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.userData.life -= dt;
      if (p.userData.kind === "fireball") {
        p.position.x += p.userData.vx * dt;
        p.position.y += p.userData.vy * dt;
        p.position.z += p.userData.vz * dt;
        p.userData.vy -= 12 * dt;
        const gy = heightAt(p.position.x, p.position.z);
        if (p.position.y <= gy + 0.3 || p.userData.life <= 0) {
          fxBurst(root, fx, FX_FIRE[2], p.position.x, gy + 0.8, p.position.z, 2 + p.userData.r, 0.35);
          hitUnits(p.position, 2 + p.userData.r, 4 + p.userData.pow * 5);
          root.remove(p);
          projectiles.splice(i, 1);
        }
      } else if (p.userData.kind === "meteor") {
        p.position.y -= 22 * dt;
        if (p.position.y <= p.userData.ty + 0.4) {
          fxBurst(root, fx, FX_FIRE[3], p.userData.tx, p.userData.ty + 1, p.userData.tz, 3.4 + p.userData.t, 0.5);
          hitUnits(new THREE.Vector3(p.userData.tx, p.userData.ty, p.userData.tz), 4.2 + p.userData.t, 8 + p.userData.pow * 8);
          root.remove(p);
          projectiles.splice(i, 1);
        }
      }
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      fx[i].userData.life -= dt;
      if (fx[i].userData.life <= 0) {
        root.remove(fx[i]);
        fx.splice(i, 1);
      }
    }
    for (const u of allies) {
      if (!u.visible) continue;
      const cmd = u.userData.cmd;
      if (cmd) {
        const dx = cmd.x - u.position.x;
        const dz = cmd.z - u.position.z;
        const d = Math.hypot(dx, dz) || 1;
        const spd = (u.userData.def.spd || 2) * (u.userData.lower ?? 1);
        if (d > 0.6) {
          u.position.x += (dx / d) * spd * dt;
          u.position.z += (dz / d) * spd * dt;
        } else u.userData.cmd = null;
      }
      u.position.y = heightAt(u.position.x, u.position.z) + u.scale.y * 0.5;
    }
  }

  function seedEvils() {
    const spots = [
      [40, -40],
      [-50, 30],
      [70, 70],
      [-80, -70],
      [20, 140],
      [-140, 20],
      [140, -20],
      [0, -140],
    ];
    const evils = HS_UNITS.filter((u) => u.evil);
    spots.forEach(([x, z], i) => {
      if (inSettlement(x, z)) return;
      const def = evils[i % evils.length];
      spawnHsUnit(root, foes, def, x, z, false);
    });
  }

  function grantAll() {
    if (!store?.getState?.().addItem) return;
    for (const s of SPELLS) {
      const inv = store.getState().inventory || [];
      if (!inv.some((i) => i.defId === s.id)) store.getState().addItem(s.id, 1);
    }
    store.getState().setHud?.({ mp: 1, prompt: "Every page of the book is yours. Magicka will not run dry." });
  }

  return { cast, tick, skies: () => skies, grantAll, seedEvils, SPELLS, chargeTier };
}

export function makeChargeRing() {
  const g = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(0.28, 0.28, 1);
  spr.position.set(0, 0.08, -0.12);
  g.add(spr);
  g.userData = { canvas, ctx, tex, spr };
  g.visible = false;
  return g;
}

export function paintChargeRing(ring, charge, color) {
  const { ctx, tex } = ring.userData;
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(20,20,20,0.55)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color || "#ffd070";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(64, 64, 48, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#fff8e0";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(Math.round(charge * 100) + "%", 64, 58);
  const t = charge >= 0.95 ? "IV" : charge >= 0.66 ? "III" : charge >= 0.33 ? "II" : "I";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(t, 64, 80);
  tex.needsUpdate = true;
  ring.visible = charge > 0.02;
}

export function makeSpellAura(color) {
  const g = new THREE.Group();
  const glow = new THREE.PointLight(color, 0.9, 1.6);
  glow.position.set(0, 0.02, -0.05);
  g.add(glow);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.012, 6, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }),
  );
  halo.rotation.x = Math.PI / 2;
  g.add(halo);
  g.userData.halo = halo;
  g.userData.t = 0;
  return g;
}
