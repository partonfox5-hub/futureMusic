/**
 * Dual Monsters — 5x5 Creature Chess minigame in New Eden (Quest VR).
 * Opposite the clock tower. Step onto a stand and pull trigger to duel.
 * B / Y (right or left button[5]/[4]) exits.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";
import { bindXrTick, gripPoints, readHead } from "/games/shared/vr-warp.js";

const SPR = "/games/character-chess/sprites/characters/";
const N = 5;
const TILE = 1.15;
const ORIGIN = { x: 0, z: 78 };
const UNITS = [
  { id: "emberpaw", hp: 8, atk: 3 },
  { id: "bitpup", hp: 7, atk: 2 },
  { id: "frostkit", hp: 7, atk: 3 },
  { id: "sparklet", hp: 6, atk: 4 },
  { id: "bloomlet", hp: 9, atk: 2 },
  { id: "tidrop", hp: 8, atk: 3 },
  { id: "pebblet", hp: 10, atk: 2 },
  { id: "sproutle", hp: 7, atk: 2 },
];

function waitApi() {
  return new Promise((res) => {
    const t = setInterval(() => {
      if (window.__starleap?.getScene) {
        clearInterval(t);
        res(window.__starleap);
      }
    }, 200);
    setTimeout(() => {
      clearInterval(t);
      res(window.__starleap || null);
    }, 25000);
  });
}

function tex(id) {
  const l = new THREE.TextureLoader();
  const t = l.load(SPR + id + ".png");
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function tileWorld(f, r) {
  const x = ORIGIN.x + (f - (N - 1) / 2) * TILE;
  const z = ORIGIN.z + ((N - 1) / 2 - r) * TILE;
  return { x, z };
}

function worldTile(x, z) {
  const f = Math.round((x - ORIGIN.x) / TILE + (N - 1) / 2);
  const r = Math.round((N - 1) / 2 - (z - ORIGIN.z) / TILE);
  if (f < 0 || r < 0 || f >= N || r >= N) return null;
  return { f, r };
}

function cardDef(i) {
  return UNITS[i % UNITS.length];
}

function makeStand(color, label) {
  const g = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: 0x3a342c });
  const gold = new THREE.MeshLambertMaterial({ color });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.28, 16), stone);
  base.position.y = 0.14;
  g.add(base);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.4, 10), gold);
  pillar.position.y = 1.35;
  g.add(pillar);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.05, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.3;
  g.add(disc);
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1a140e";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#e8d5a3";
  ctx.font = "700 42px serif";
  ctx.textAlign = "center";
  ctx.fillText(label, 256, 80);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  spr.position.set(0, 2.7, 0);
  spr.scale.set(2.4, 0.6, 1);
  g.add(spr);
  return g;
}

function burst(scene, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 }),
  );
  m.position.set(x, y, z);
  scene.add(m);
  const t0 = performance.now();
  const tick = () => {
    const k = (performance.now() - t0) / 420;
    if (k >= 1) {
      scene.remove(m);
      m.geometry.dispose();
      return;
    }
    m.scale.setScalar(1 + k * 6);
    m.material.opacity = 0.9 * (1 - k);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function boot() {
  const api = await waitApi();
  if (!api?.getScene) return;
  const scene = api.getScene();
  const group = new THREE.Group();
  group.name = "eden-dual-arena";
  scene.add(group);

  const floorMatA = new THREE.MeshLambertMaterial({ color: 0x2a2420 });
  const floorMatB = new THREE.MeshLambertMaterial({ color: 0x4a3a28 });
  const tiles = [];
  for (let r = 0; r < N; r++) {
    for (let f = 0; f < N; f++) {
      const { x, z } = tileWorld(f, r);
      const m = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.96, 0.12, TILE * 0.96), (f + r) % 2 ? floorMatA : floorMatB);
      m.position.set(x, 0.06, z);
      m.userData.tile = { f, r };
      group.add(m);
      tiles.push(m);
    }
  }
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(N * TILE + 1.6, 0.4, N * TILE + 1.6),
    new THREE.MeshLambertMaterial({ color: 0x1c1612 }),
  );
  rim.position.set(ORIGIN.x, -0.12, ORIGIN.z);
  group.add(rim);

  const pStand = makeStand(0xc9a227, "DUEL");
  pStand.position.set(ORIGIN.x, 0, ORIGIN.z + N * TILE * 0.5 + 2.4);
  group.add(pStand);
  const aStand = makeStand(0x7a3340, "RIVAL");
  aStand.position.set(ORIGIN.x, 0, ORIGIN.z - N * TILE * 0.5 - 2.4);
  group.add(aStand);

  const hl = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.48, 20),
    new THREE.MeshBasicMaterial({ color: 0xe8d56a, side: THREE.DoubleSide }),
  );
  hl.rotation.x = -Math.PI / 2;
  hl.visible = false;
  group.add(hl);

  const handGroup = new THREE.Group();
  scene.add(handGroup);

  const state = {
    on: false,
    turn: "p",
    ap: 2,
    selected: null,
    pieces: [],
    hand: [0, 1, 2, 3, 4].map((i) => ({ def: cardDef(i), mesh: null })),
    grabbing: null,
    aiHand: [5, 6, 7],
    msg: "Step on DUEL and pull trigger",
  };

  function occupied(f, r) {
    return state.pieces.find((p) => p.f === f && p.r === r && p.hp > 0);
  }

  function spawnPiece(def, owner, f, r) {
    const { x, z } = tileWorld(f, r);
    const map = tex(def.id);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true }));
    spr.position.set(x, 1.05, z);
    spr.scale.set(1.15, 1.15, 1);
    group.add(spr);
    burst(scene, x, 0.8, z);
    const piece = { def, owner, f, r, hp: def.hp, atk: def.atk, mesh: spr };
    state.pieces.push(piece);
    return piece;
  }

  function rebuildHand() {
    handGroup.clear();
    if (!state.on) return;
    state.hand.forEach((c, i) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.62),
        new THREE.MeshBasicMaterial({ map: tex(c.def.id), transparent: true, side: THREE.DoubleSide }),
      );
      m.position.set((i - 2) * 0.48, -0.22, -0.72);
      m.userData.card = c;
      c.mesh = m;
      handGroup.add(m);
    });
  }

  function legal(from, to) {
    if (!from || !to) return false;
    const df = Math.abs(from.f - to.f);
    const dr = Math.abs(from.r - to.r);
    if (df + dr === 0) return false;
    return df <= 1 && dr <= 1;
  }

  function doMove(piece, tile) {
    const hit = occupied(tile.f, tile.r);
    if (hit && hit.owner === piece.owner) return false;
    if (hit && hit.owner !== piece.owner) {
      hit.hp -= piece.atk;
      burst(scene, hit.mesh.position.x, 1, hit.mesh.position.z);
      if (hit.hp <= 0) {
        group.remove(hit.mesh);
        state.pieces = state.pieces.filter((p) => p !== hit);
      }
    } else {
      piece.f = tile.f;
      piece.r = tile.r;
      const w = tileWorld(tile.f, tile.r);
      piece.mesh.position.set(w.x, 1.05, w.z);
    }
    return true;
  }

  function spend() {
    state.ap -= 1;
    if (state.ap <= 0) {
      state.turn = state.turn === "p" ? "a" : "p";
      state.ap = 2;
      state.selected = null;
      if (state.turn === "a") setTimeout(aiTurn, 480);
    }
  }

  function aiTurn() {
    if (!state.on || state.turn !== "a") return;
    for (let k = 0; k < 2; k++) {
      const mine = state.pieces.filter((p) => p.owner === "a" && p.hp > 0);
      const yours = state.pieces.filter((p) => p.owner === "p" && p.hp > 0);
      if (mine.length < 2 && state.aiHand.length) {
        const id = state.aiHand.shift();
        const def = cardDef(id);
        let f = Math.floor(Math.random() * N);
        let r = 0;
        for (let n = 0; n < 12 && occupied(f, r); n++) f = (f + 1) % N;
        if (!occupied(f, r)) spawnPiece(def, "a", f, r);
        continue;
      }
      if (mine.length && yours.length) {
        const atk = mine[0];
        const tgt = yours[0];
        const tf = Math.max(0, Math.min(N - 1, atk.f + Math.sign(tgt.f - atk.f)));
        const tr = Math.max(0, Math.min(N - 1, atk.r + Math.sign(tgt.r - atk.r)));
        doMove(atk, { f: tf, r: tr });
      }
    }
    state.turn = "p";
    state.ap = 2;
    const pLeft = state.pieces.some((p) => p.owner === "p");
    const aLeft = state.pieces.some((p) => p.owner === "a");
    if (state.pieces.length && (!pLeft || !aLeft)) {
      state.msg = pLeft ? "You win — B to leave" : "Rival wins — B to leave";
    }
  }

  function enterDuel() {
    if (state.on) return;
    state.on = true;
    state.turn = "p";
    state.ap = 2;
    state.selected = null;
    state.pieces.forEach((p) => group.remove(p.mesh));
    state.pieces = [];
    state.hand = [0, 1, 2, 3, 4].map((i) => ({ def: cardDef(i), mesh: null }));
    state.aiHand = [5, 6, 7];
    state.msg = "Fling a card onto the field · trigger to select/move · B exits";
    rebuildHand();
    window.__EDEN_DUEL = true;
  }

  function exitDuel() {
    state.on = false;
    window.__EDEN_DUEL = false;
    handGroup.clear();
    state.pieces.forEach((p) => group.remove(p.mesh));
    state.pieces = [];
    hl.visible = false;
    state.msg = "Step on DUEL and pull trigger";
  }

  function triggerPressed(src) {
    const gp = src?.gamepad;
    if (!gp?.buttons) return false;
    return !!(gp.buttons[0]?.pressed || gp.buttons[1]?.pressed);
  }
  function exitPressed(src) {
    const gp = src?.gamepad;
    if (!gp?.buttons) return false;
    return !!(gp.buttons[4]?.pressed || gp.buttons[5]?.pressed);
  }

  let exitLatch = false;
  const ray = new THREE.Raycaster();
  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();

  function sessionSources(gl) {
    const s = gl?.xr?.getSession?.();
    return s?.inputSources ? [...s.inputSources] : [];
  }

  function pointerTile(gl, frame, src) {
    try {
      const ref = gl.xr.getReferenceSpace?.();
      if (!ref || !frame || !src?.targetRaySpace) return null;
      const pose = frame.getPose(src.targetRaySpace, ref);
      if (!pose) return null;
      const t = pose.transform;
      tmp.set(t.position.x, t.position.y, t.position.z);
      const o = t.orientation;
      const q = new THREE.Quaternion(o.x, o.y, o.z, o.w);
      dir.set(0, 0, -1).applyQuaternion(q);
      const planeY = 0.12;
      if (Math.abs(dir.y) < 0.02) return null;
      const k = (planeY - tmp.y) / dir.y;
      if (k < 0 || k > 12) return null;
      const hx = tmp.x + dir.x * k;
      const hz = tmp.z + dir.z * k;
      return worldTile(hx, hz);
    } catch {
      return null;
    }
  }

  function flingCard(card, tile) {
    if (!tile || occupied(tile.f, tile.r)) return;
    if (state.turn !== "p" || state.ap <= 0) return;
    spawnPiece(card.def, "p", tile.f, tile.r);
    state.hand = state.hand.filter((c) => c !== card);
    rebuildHand();
    spend();
  }

  function onSelect(gl, frame, src) {
    if (!state.on) {
      const glb = gl;
      const cam = api.getCamera?.();
      const player = api.getPlayer?.();
      const head = { x: 0, y: 1.6, z: 0 };
      readHead(glb, cam, player, head);
      const dx = head.x - pStand.position.x;
      const dz = head.z - pStand.position.z;
      if (Math.hypot(dx, dz) < 1.7) enterDuel();
      return;
    }
    const tile = pointerTile(gl, frame, src);
    if (state.grabbing) {
      if (tile) flingCard(state.grabbing, tile);
      state.grabbing = null;
      return;
    }
    if (!tile) return;
    const hit = occupied(tile.f, tile.r);
    if (state.selected && legal(state.selected, tile)) {
      if (doMove(state.selected, tile)) spend();
      state.selected = hit && hit.owner === "p" && hit.hp > 0 ? hit : null;
      return;
    }
    if (hit && hit.owner === "p") state.selected = hit;
    else state.selected = null;
  }

  function tick(gl, frame) {
    const vr = !!(api.vr?.() || gl?.xr?.isPresenting);
    const cam = api.getCamera?.();
    if (cam && state.on) {
      cam.updateWorldMatrix?.(true, false);
      handGroup.matrix.copy(cam.matrixWorld);
      handGroup.matrixAutoUpdate = false;
      handGroup.visible = true;
    } else {
      handGroup.visible = false;
    }
    if (state.selected) {
      const w = tileWorld(state.selected.f, state.selected.r);
      hl.position.set(w.x, 0.16, w.z);
      hl.visible = true;
    } else hl.visible = false;

    const srcs = sessionSources(gl);
    let wantExit = false;
    srcs.forEach((s) => {
      if (exitPressed(s)) wantExit = true;
    });
    if (wantExit && !exitLatch && state.on) exitDuel();
    exitLatch = wantExit;

    if (vr && frame && !state._boundSelect) {
      const sess = gl.xr.getSession?.();
      if (sess) {
        state._boundSelect = true;
        sess.addEventListener("select", (ev) => onSelect(gl, ev.frame || frame, ev.inputSource));
        sess.addEventListener("selectstart", (ev) => {
          if (!state.on) return;
          const src = ev.inputSource;
          // grab nearest hand card if pointing high
          try {
            const ref = gl.xr.getReferenceSpace?.();
            const pose = ev.frame?.getPose(src.targetRaySpace, ref);
            if (!pose) return;
            const y = pose.transform.position.y;
            if (y > 1.05 && state.hand.length) state.grabbing = state.hand[Math.floor(state.hand.length / 2)];
          } catch {}
        });
      }
    }
  }

  const gl = api.getRenderer?.();
  if (gl) bindXrTick(gl, (t, frame) => tick(gl, frame));
  const loop = () => {
    tick(gl, null);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot();
