/** WebXR hands: grip pickup, trigger fire/jetpack, A/X reload, stick-click skate. */
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

export function attachXr(renderer, scene) {
  renderer.xr.enabled = true;
  try {
    renderer.xr.setReferenceSpaceType("local-floor");
  } catch {}
  const factory = new XRControllerModelFactory();
  const hands = [];
  for (let i = 0; i < 2; i++) {
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(factory.createControllerModel(grip));
    scene.add(grip);
    const con = renderer.xr.getController(i);
    scene.add(con);
    hands.push({
      i,
      grip,
      con,
      held: null,
      squeeze: false,
      squeezePrev: false,
      trigger: false,
      triggerPrev: false,
      triggerValue: 0,
      stick: false,
      ax: false,
      axPrev: false,
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

export function wireVrButton(renderer) {
  const btn = document.getElementById("vr-enter");
  const note = document.getElementById("vr-note");
  if (!btn) return;
  const unsupported = () => {
    btn.disabled = true;
    btn.textContent = "VR: headset required";
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
    btn.disabled = false;
    btn.textContent = "ENTER VR";
    if (note) note.hidden = true;
    btn.onclick = async () => {
      try {
        const session = await navigator.xr.requestSession("immersive-vr", {
          optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
        });
        await renderer.xr.setSession(session);
      } catch (err) {
        if (note) {
          note.hidden = false;
          note.textContent = "Could not start VR: " + (err && err.message ? err.message : "try Meta Quest Browser");
        }
      }
    };
  }).catch(unsupported);
}

export function tickXr(renderer, hands, dt) {
  const session = renderer.xr.getSession && renderer.xr.getSession();
  const on = renderer.xr.isPresenting;
  if (session) {
    for (const src of session.inputSources) {
      const h = hands.find((x) => x.handed === src.handedness) || (src.handedness === "left" ? hands[0] : hands[1]);
      const gp = src.gamepad;
      if (!gp) continue;
      h.triggerPrev = h.trigger;
      h.squeezePrev = h.squeeze;
      h.axPrev = h.ax;
      h.triggerValue = gp.buttons[0] ? gp.buttons[0].value : 0;
      h.trigger = !!(gp.buttons[0] && gp.buttons[0].pressed);
      h.squeeze = !!(gp.buttons[1] && gp.buttons[1].pressed);
      h.stick = !!(gp.buttons[3] && gp.buttons[3].pressed);
      h.ax = !!(gp.buttons[4] && gp.buttons[4].pressed) || !!(gp.buttons[5] && gp.buttons[5].pressed);
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
  return {
    on,
    left,
    right,
    skate: !!(left && left.stick),
    jet: !!(left && left.triggerValue > 0.28),
    lookX: right ? right.axes[0] : 0,
    moveX: left ? left.axes[0] : 0,
    moveY: left ? left.axes[1] : 0,
  };
}
