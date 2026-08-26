/** WebXR hands: grip pickup, trigger fire/jetpack, A jump, Y/menu pack, stick-click skate. */
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

export function attachXr(renderer, scene, onSession) {
  renderer.xr.enabled = true;
  try {
    renderer.xr.setReferenceSpaceType("local-floor");
  } catch {}
  try {
    renderer.xr.setFramebufferScaleFactor(1);
  } catch {}
  renderer.xr.addEventListener("sessionstart", () => {
    try {
      renderer.setPixelRatio(1);
    } catch {}
    if (typeof onSession === "function") onSession(true);
  });
  renderer.xr.addEventListener("sessionend", () => {
    try {
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    } catch {}
    if (typeof onSession === "function") onSession(false);
    syncVrButtons(false);
  });
  const factory = new XRControllerModelFactory();
  const hands = [];
  for (let i = 0; i < 2; i++) {
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(factory.createControllerModel(grip));
    scene.add(grip);
    const con = renderer.xr.getController(i);
    scene.add(con);
    const beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -4.8)]),
      new THREE.LineBasicMaterial({ color: 0xe8dcc0, transparent: true, opacity: 0.35 }),
    );
    con.add(beam);
    hands.push({
      i,
      grip,
      con,
      beam,
      held: null,
      squeeze: false,
      squeezePrev: false,
      trigger: false,
      triggerPrev: false,
      triggerValue: 0,
      squeezeValue: 0,
      stick: false,
      stickPrev: false,
      aBtn: false,
      aPrev: false,
      bBtn: false,
      bPrev: false,
      menuBtn: false,
      menuPrev: false,
      axes: [0, 0],
      handed: i === 0 ? "left" : "right",
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      prev: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
    });
    con.addEventListener("connected", (ev) => {
      hands[i].handed = ev.data.handedness || hands[i].handed;
    });
  }
  wireVrButton(renderer);
  return hands;
}

export function xrSupported() {
  return !!(navigator.xr && navigator.xr.isSessionSupported);
}

function vrButtons() {
  return [document.getElementById("vr-enter"), document.getElementById("hud-vr")].filter(Boolean);
}

function syncVrButtons(presenting) {
  for (const btn of vrButtons()) {
    btn.disabled = false;
    btn.textContent = presenting ? "EXIT VR" : "ENTER VR";
  }
}

export async function startVr(renderer) {
  const gl = renderer.getContext();
  if (gl && gl.makeXRCompatible) await gl.makeXRCompatible();
  renderer.xr.enabled = true;
  try {
    renderer.xr.setReferenceSpaceType("local-floor");
  } catch {}
  let session;
  try {
    session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
  } catch {
    session = await navigator.xr.requestSession("immersive-vr");
  }
  await renderer.xr.setSession(session);
  session.addEventListener("end", () => syncVrButtons(false));
  syncVrButtons(true);
  return session;
}

export function wireVrButton(renderer) {
  const note = document.getElementById("vr-note");
  const btns = vrButtons();
  if (!btns.length) return;
  const unsupported = () => {
    for (const btn of btns) {
      btn.disabled = true;
      btn.textContent = "VR: headset required";
    }
    if (note) {
      note.hidden = false;
      note.textContent = "On a PC this is desktop mode. Open this page in Meta Quest Browser (in the headset) to enter VR.";
    }
  };
  if (!navigator.xr || !navigator.xr.isSessionSupported) {
    unsupported();
    return;
  }
  navigator.xr.isSessionSupported("immersive-vr").then((ok) => {
    if (!ok) {
      unsupported();
      return;
    }
    for (const btn of btns) {
      btn.disabled = false;
      btn.textContent = renderer.xr.isPresenting ? "EXIT VR" : "ENTER VR";
      btn.onclick = async () => {
        if (renderer.xr.isPresenting) {
          try {
            await renderer.xr.getSession()?.end();
          } catch {}
          return;
        }
        btn.disabled = true;
        try {
          await startVr(renderer);
        } catch (err) {
          btn.disabled = false;
          if (note) {
            note.hidden = false;
            note.textContent = "Could not start VR: " + (err && err.message ? err.message : "try Meta Quest Browser");
          }
        }
      };
    }
    if (note) note.hidden = true;
  }).catch(unsupported);
}

export function tickXr(renderer, hands, dt) {
  const session = renderer.xr.getSession && renderer.xr.getSession();
  const on = renderer.xr.isPresenting;
  if (session) {
    for (const src of session.inputSources) {
      const h = hands.find((x) => x.handed === src.handedness) || (src.handedness === "left" ? hands[0] : hands[1]);
      const gp = src.gamepad;
      if (!gp || !h) continue;
      h.triggerPrev = h.trigger;
      h.squeezePrev = h.squeeze;
      h.aPrev = h.aBtn;
      h.bPrev = h.bBtn;
      h.menuPrev = h.menuBtn;
      h.triggerValue = gp.buttons[0] ? gp.buttons[0].value : 0;
      const trig = !!(gp.buttons[0] && (gp.buttons[0].pressed || h.triggerValue > 0.22));
      if (trig && !h.trigger) h._trigAt = performance.now();
      h.trigger = trig;
      h.squeezeValue = gp.buttons[1] ? gp.buttons[1].value : 0;
      h.squeeze = !!(gp.buttons[1] && (gp.buttons[1].pressed || h.squeezeValue > 0.18));
      h.stickPrev = h.stick;
      h.stick = !!(gp.buttons[3] && gp.buttons[3].pressed);
      h.gp = gp;
      h.aBtn = !!(gp.buttons[4] && gp.buttons[4].pressed);
      h.bBtn = !!(gp.buttons[5] && gp.buttons[5].pressed);
      h.menuBtn = !!(
        (gp.buttons[2] && gp.buttons[2].pressed) ||
        (gp.buttons[6] && gp.buttons[6].pressed) ||
        (gp.buttons[16] && gp.buttons[16].pressed)
      );
      const ax = gp.axes || [];
      h.axes = [ax[2] != null ? ax[2] : ax[0] || 0, ax[3] != null ? ax[3] : ax[1] || 0];
    }
  }
  for (const h of hands) {
    h.con.getWorldPosition(h.pos);
    h.con.getWorldQuaternion(h.quat);
    h.vel.copy(h.pos).sub(h.prev).multiplyScalar(dt > 1e-4 ? 1 / dt : 0);
    h.prev.copy(h.pos);
  }
  const left = hands.find((h) => h.handed === "left") || hands[0];
  const right = hands.find((h) => h.handed === "right") || hands[1];
  let dash = false;
  if (left && right && left.trigger && right.trigger) {
    const dtTrig = Math.abs((left._trigAt || 0) - (right._trigAt || 0));
    if (dtTrig < 140 && (!left.triggerPrev || !right.triggerPrev)) dash = true;
  }
  const lx = left ? left.axes[0] : 0;
  const ly = left ? left.axes[1] : 0;
  const mag = Math.hypot(lx, ly);
  return {
    on,
    left,
    right,
    dash,
    skate: mag > 0.88,
    jet: !!(left && left.stick),
    lookX: right ? right.axes[0] : 0,
    lookY: right ? right.axes[1] : 0,
    moveX: left ? left.axes[0] : 0,
    moveY: left ? left.axes[1] : 0,
    jump: !!(right && right.aBtn),
    jumpTap: !!(right && right.aBtn && !right.aPrev),
    menu: !!(left && ((left.menuBtn && !left.menuPrev) || (left.bBtn && !left.bPrev))),
    reload: !!(right && right.stick && !right.stickPrev),
    psy: !!(left && left.trigger && !left.triggerPrev),
    psyHeld: !!(left && left.triggerValue > 0.38),
    psyRelease: !!(left && left.triggerPrev && !left.trigger),
    psyMode: !!(left && left.aBtn && !left.aPrev),
    saberToggle: !!(right && right.bBtn && !right.bPrev),
    squeezeOn: !!(
      (left && left.squeezeValue > 0.2) ||
      (right && right.squeezeValue > 0.2)
    ),
    squeezeOff: !!(
      left &&
      right &&
      left.squeezeValue < 0.12 &&
      right.squeezeValue < 0.12
    ),
  };
}
