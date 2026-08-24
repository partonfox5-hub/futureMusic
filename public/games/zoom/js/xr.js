/** WebXR hands: grip pickup, trigger fire/jetpack, A/X reload, stick-click skate. */
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

export function attachXr(renderer, scene) {
  renderer.xr.enabled = true;
  const btn = VRButton.createButton(renderer);
  btn.style.zIndex = "40";
  document.body.appendChild(btn);
  const factory = new XRControllerModelFactory();
  const hands = [];
  for (let i = 0; i < 2; i++) {
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(factory.createControllerModel(grip));
    scene.add(grip);
    const con = renderer.xr.getController(i);
    scene.add(con);
    const tmp = new THREE.Vector3();
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
      tmp,
    });
    con.addEventListener("connected", (ev) => {
      hands[i].handed = ev.data.handedness || hands[i].handed;
    });
  }
  return hands;
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
