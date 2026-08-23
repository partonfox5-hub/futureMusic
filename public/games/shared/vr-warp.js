/** VR head pose, portal hit, and navigation that actually leaves an XR session. */

const _head = { x: 0, y: 0, z: 0 };
const _p = { x: 0, y: 0, z: 0 };

function fromWorld(obj, t) {
  if (!obj) return false;
  try {
    obj.updateWorldMatrix?.(true, false);
  } catch {}
  const e = obj.matrixWorld?.elements;
  if (e && e.length >= 14) {
    t.x = e[12];
    t.y = e[13];
    t.z = e[14];
    return Number.isFinite(t.x);
  }
  if (obj.position) {
    t.x = obj.position.x;
    t.y = obj.position.y;
    t.z = obj.position.z;
    return true;
  }
  return false;
}

export function readHead(gl, cam, player, out) {
  const t = out || _head;
  t.x = 0;
  t.y = 1.6;
  t.z = 0;
  let got = false;
  try {
    if (gl?.xr?.isPresenting) {
      const xrCam = gl.xr.getCamera?.();
      if (xrCam) got = fromWorld(xrCam, t);
      if (!got) {
        const cams = xrCam?.cameras;
        if (cams && cams[0]) got = fromWorld(cams[0], t);
      }
    }
  } catch {}
  if (!got) got = fromWorld(cam, t);
  if (player && Number.isFinite(player.x) && Number.isFinite(player.z)) {
    t.x = player.x;
    t.z = player.z;
    if (Number.isFinite(player.y)) t.y = player.y + 1.55;
  }
  return t;
}

function worldPos(obj, target) {
  if (fromWorld(obj, target)) return target;
  target.x = obj?.position?.x || 0;
  target.y = obj?.position?.y || 0;
  target.z = obj?.position?.z || 0;
  return target;
}

export function portalHit(obj, head, radius = 1.45) {
  if (!obj || !head) return false;
  obj.updateWorldMatrix?.(true, false);
  const veil = obj.userData?.veil;
  worldPos(veil || obj, _p);
  const dx = head.x - _p.x;
  const dz = head.z - _p.z;
  const horiz = Math.hypot(dx, dz);
  const dy = head.y - _p.y;
  return horiz < radius && dy > -1.2 && dy < 2.2;
}

export function gripPoints(gl, THREE, into) {
  const out = into || [];
  out.length = 0;
  if (!gl?.xr) return out;
  for (let i = 0; i < 2; i++) {
    const g = gl.xr.getControllerGrip?.(i) || gl.xr.getController?.(i);
    if (!g) continue;
    const v = new THREE.Vector3();
    g.getWorldPosition(v);
    out.push(v);
  }
  return out;
}

export function anyHitsPortal(obj, points, radius) {
  for (const p of points) {
    if (portalHit(obj, p, radius)) return true;
  }
  return false;
}

export function bindXrTick(gl, fn) {
  const hooked = new WeakSet();
  const attach = () => {
    const s = gl?.xr?.getSession?.();
    if (!s || hooked.has(s)) return;
    hooked.add(s);
    const step = (t, frame) => {
      if (!gl?.xr?.isPresenting) return;
      try {
        s.requestAnimationFrame(step);
      } catch {
        return;
      }
      try {
        fn(t, frame);
      } catch {}
    };
    try {
      s.requestAnimationFrame(step);
    } catch {}
  };
  try {
    gl?.xr?.addEventListener?.("sessionstart", attach);
  } catch {}
  const id = window.setInterval(attach, 400);
  attach();
  return () => window.clearInterval(id);
}

export async function warpAfterXr(gl, url) {
  try {
    const s = gl?.xr?.getSession?.();
    if (s) {
      await Promise.race([
        s.end(),
        new Promise((r) => setTimeout(r, 500)),
      ]);
    }
  } catch {}
  window.location.href = url;
}
