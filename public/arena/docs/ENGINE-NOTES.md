# Engine and implementation notes

The new `battlesphere-arena-webxr.zip` is the authoritative source. Its `game.js` and `index.html` match the earlier supplied production snapshot byte-for-byte. The unchanged original files are included.

The user's Mira reference, `human2-update11-eye-hair-options.zip`, was inspected for its camera/controller rig, `local-floor` reference space, direct immersive-session request, session lifecycle and pre-session framebuffer scale. No Mira character, physics, environment or identity assets were copied into this game. The existing Three.js 0.160.1 dependency is retained and vendored locally.

Simulation is separate from scene rendering. Gameplay advances in fixed 1/90-second steps with up to five substeps per frame. Long background gaps are discarded; tab hiding and XR visibility loss pause gameplay. Respawn timers use simulation time. The fixed small enemy count makes a linear swept-bolt-versus-drone scan inexpensive and avoids an unnecessary spatial-index system.

Four material-based instanced fleets replace the individual drone mesh hierarchy for rendering. Static hull pieces and rotor arcs are merged by material. Local muzzle models remain inexpensive individual meshes. Rendered detail is stylized procedural metal and emissive geometry; it is not a photogrammetric asset set.

The movement rig parents both the camera and XR controller target-ray spaces. Controller fire uses world position and quaternion. XR inputs resolve by handedness, and a neutral stick never falls back to unrelated touchpad axes. Snap and smooth turning pivot around the current tracked eye position. The sphere clamp corrects the rig against the tracked eye rather than writing into the XR camera's pose.

VR menu and HUD are ordinary scene textures/meshes compatible with the retained engine. HUD pose updates each XR frame; HUD text redraws at 10 Hz. Audio positions update at 20 Hz. Generated sound buffers are built once on the first gesture. The game uses up to 20 transient sound voices and four nearest-drone hum loops. No live video, external model downloads, real-time shadow maps or full-screen bloom buffers are used.

Quality selection changes geometry/effect visibility and foveation during VR. Framebuffer scale is configured only before starting a session, following [Three.js WebXRManager requirements](https://threejs.org/docs/pages/WebXRManager.html). The governor uses frame intervals with a warm-up and sustained-load thresholds; those intervals are a coarse signal, not GPU timer measurements.

Reference documentation checked:

- [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html)
- [MDN XRSystem.requestSession](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession)
- [MDN XRInputSource.gamepad](https://developer.mozilla.org/en-US/docs/Web/API/XRInputSource/gamepad)

All performance and device-verification limits are in `TEST-RESULTS.md`.
