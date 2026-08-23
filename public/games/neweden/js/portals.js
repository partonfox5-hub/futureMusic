import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js";
import { loadBag, saveBag } from "/games/shared/realm-bag.js";
import { anyHitsPortal, bindXrTick, gripPoints, portalHit, readHead, warpAfterXr } from "/games/shared/vr-warp.js";

function box(mat, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function makeMcPortal() {
  const g = new THREE.Group();
  const obs = new THREE.MeshBasicMaterial({ color: 0x1a1218 });
  const inner = new THREE.MeshBasicMaterial({ color: 0x7a28c8, transparent: true, opacity: 0.78, side: THREE.DoubleSide });
  const w = 2.4;
  const h = 3.4;
  g.add(box(obs, -w / 2, h / 2, 0, 0.36, h, 0.36));
  g.add(box(obs, w / 2, h / 2, 0, 0.36, h, 0.36));
  g.add(box(obs, 0, h, 0, w + 0.36, 0.36, 0.36));
  g.add(box(obs, 0, 0.18, 0, w + 0.36, 0.36, 0.36));
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.4), inner);
  veil.position.y = h / 2;
  g.add(veil);
  g.userData.veil = veil;
  g.userData.portal = true;
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 16),
    new THREE.MeshBasicMaterial({ color: 0x5a20a0, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.03;
  g.add(pad);
  return g;
}

function waitStarleap() {
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
    }, 20000);
  });
}

function mergeWishLike(api, bag) {
  try {
    const names = [...(bag.items || []), ...(bag.spells || [])].map((i) => i.defId).slice(0, 12);
    sessionStorage.setItem("fm-eden-import", JSON.stringify(names));
  } catch {}
}

async function boot() {
  const api = await waitStarleap();
  if (!api?.getScene) return;
  const scene = api.getScene();
  const bag = loadBag();
  mergeWishLike(api, bag);
  const group = new THREE.Group();
  group.name = "eden-portals";
  group.visible = false;
  const spots = [
    [4, 0, 10],
    [-12, 0, -8],
    [18, 0, -20],
  ];
  const portals = spots.map(([x, y, z]) => {
    const p = makeMcPortal();
    p.position.set(x, y, z);
    group.add(p);
    return p;
  });
  scene.add(group);
  const head = { x: 0, y: 1.6, z: 0 };
  const hands = [];
  let warp = false;

  function presenting() {
    const gl = api.getRenderer?.();
    return !!(api.vr?.() || gl?.xr?.isPresenting);
  }

  function check() {
    const gl = api.getRenderer?.();
    const vr = presenting();
    group.visible = vr;
    if (!vr || warp) return;
    const cam = api.getCamera?.();
    const player = api.getPlayer?.();
    readHead(gl, cam, player, head);
    gripPoints(gl, THREE, hands);
    const pts = [head, ...hands];
    portals.forEach((p) => {
      if (p.userData.veil?.material) {
        p.userData.veil.material.opacity = 0.55 + Math.sin(performance.now() * 0.006) * 0.2;
      }
      if (!warp && (anyHitsPortal(p, pts, 1.55) || portalHit(p, head, 1.55))) {
        warp = true;
        try {
          const hud = api.getHud?.();
          saveBag({
            items: bag.items,
            spells: bag.spells,
            gold: hud?.purse ? Object.values(hud.purse).reduce((a, b) => a + (Number(b) || 0), 0) : bag.gold,
          });
        } catch {}
        sessionStorage.setItem("fm-realm-warp", JSON.stringify({ from: "neweden", at: Date.now() }));
        warpAfterXr(gl, "/fenrest?portal=1");
      }
    });
  }

  const gl = api.getRenderer?.();
  if (gl) bindXrTick(gl, check);
  const loop = () => {
    check();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot();
