# Validation record — 11 September 2026

## Executed and passing

- `node --test tests/*.test.mjs`: **16 passed, zero failed**. Covers original constants, drain/time, two-hit kills/rewards, nearest-only/swept collision, dead-drone contact and respawn, finite pools, bolt expiry, depletion/reset, XR axis selection, turning around the tracked head, controller world direction, tracked-eye boundary, sustained-load quality reduction and geometry batching. Audio checks cover finite, audible, unclipped generated samples and a bounded voice pool.
- `node --experimental-vm-modules tests/lifecycle.mjs`: passes actual application startup, desktop start/fire/pause/resume/reset, XR denial recovery, XR entry, controller fire, Y/B pause edge handling and XR exit. This uses real Three.js transforms with a **mock renderer and DOM**. It does not establish WebGL or physical-device correctness.
- `node tests/benchmark.mjs`: 108,000 steps at a fixed 90 Hz, representing 20 simulated minutes under approximately 30 shots/s and moving targets. Fixed capacity remains 96 bolts, 14 drones and 97 event slots. Power is replenished in this stress harness to keep it running. Node CPU timings are recorded in `cpu-benchmark.json`; they are not Quest frame rates or whole-app timings.
- All final JavaScript files pass `node --check`. Packaged runtime imports and local page references resolve. The media and original-source copies are retained.

## Structural rendering budget

Each authored drone contains 16 mesh pieces. Fourteen copies would require 224 mesh submissions. Merging by material and instancing the fleet produces **four mesh submissions** while preserving its triangles and silhouette.

The batched arena and live fleet contain 18 visible mesh objects and approximately 44,040 submitted triangles before the camera-dependent view, weapons, HUD and transient effects. This was counted from the Three.js scene, **not measured by a GPU**. Transparent passes, per-eye rendering and hardware behavior affect actual draw-call costs. In the lifecycle adapter, the final paused scene reports 26 objects/calls including test controller/effect objects; this is likewise a structural count, not a browser render measurement.

## Browser/device limitation

The game was opened in the available Chrome test browser. It refused to create a WebGL context and explicitly reported `GL_VENDOR = Disabled` / `GL_RENDERER = Disabled`. Consequently the real rendering path, custom shader compilation, image quality and browser audio playback were not exercised. A clear startup error is presented when a user's browser similarly cannot create a graphics context.

No physical Quest testing occurred. There is no measured 72/90 FPS claim, thermal-soak result or verified comfort claim. The bundled presets and 72 Hz request are engineering defaults that require headset measurement.

## First Quest check

1. Upload the complete playable folder to HTTPS. Open it in Quest Browser and enter VR.
2. Verify stereo rendering, controller visibility and a readable HUD. Rotate your head and controllers; the blasters should track their controllers.
3. Fly forward/back/left/right with the left stick. Turn with the right stick; rise/descend with its vertical axis. Move your head physically, then turn to check that turning pivots around your current eye position.
4. Shoot with both triggers. Confirm visible bolts, two-hit kills, score/power rewards and directional audio.
5. Open Y/B menu, wait, and resume. Power, drones and respawn timers must remain frozen during pause. Confirm controller-ray selection, restart, sound, quality, turn mode and exit.
6. Enable Performance display and play for at least 10–15 minutes. Start with Auto/Balanced. Try Performance if frame delivery is uneven; set Performance before re-entering VR to use the lower framebuffer scale.

These are the remaining device acceptance checks, not results claimed as completed.
