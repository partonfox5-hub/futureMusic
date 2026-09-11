# Four implementation passes

## Pass 1 — graphics and sound foundation

Rebuilt the connected arena using the source sphere/tunnel/chamber data. Added directional sector palettes, paneled metal surfaces, cut-out portal masks, emissive tunnel rings, environment reflections and readable UI. Authored distinct procedural models for the plasma cannon, sword, enemy families, pets and scenery. Bundled the original 61 art/audio resources and the Three.js runtime locally.

Restored the source music playlist and sound recordings through spatial Web Audio voices. Music streams through a single media element. Effects use a compressor/limiter and bounded voice allocation.

## Pass 2 — creature, animation and presentation work

Hydra heads were built with broad reptilian skulls, brows, nostrils, horns, upper teeth, tongue/gums and a separate hinged lower jaw. A second pass moved the charge into the oral cavity and made the projectile origin use that same mouth position. A 1.05-second charge drives jaw opening, the visible orb and an ascending audio accent. Continuous tapered neck segments and joints connect the head to the nest; dorsal spines preserve the silhouette during coiling.

Added Knight cannon/blade morphing and limb/cape movement; trilobite ribs/legs/scythes; hornet rotors; pet limb/wing motion and independent head aim; cage shaking/cry cues; missile bodies and moving breakup debris. Arena displays now use curved, destructible ticker segments and an animated television atlas with a damaged-screen state. Original tutorial dialogue appears with its corresponding art.

`previews/hydra-geometry-review.png` is a CPU projection of the actual model geometry, used to inspect the jaw silhouette. It is not a screenshot of the WebGL renderer.

## Pass 3 — simulation performance

Introduced a spatial broad phase shared by combat, pickup, steering and collision queries. Static ring displays, windows, kennels, hatches and islands retain their spatial cells until they are created or destroyed; dynamic cells reuse their arrays. Added cached graph distances, slower distant AI decisions and cached pet target selection. Projectiles, particles, audio voices and drawing have explicit budgets.

CPU measurements on the build host, using the performance-pass test scenario:

| Measurement | Full scan / rebuild | Optimized |
|---|---:|---:|
| 1,600 ray queries against 904 entities | 178.71 ms | 21.34 ms |
| 600 collision-grid updates | 1,141.23 ms | 109.01 ms |
| Average candidate entities per ray | 904 | 15.4 |

All 1,600 nearest-hit results matched the reference scan. Candidate work fell **98.3%**. These compare implementations in this web port; they do not compare a Unity APK with a Quest browser.

A 720-second, 43,200-step CPU simulation completed with finite positions. Median simulation step was 1.222 ms, 95th percentile 5.003 ms and 99th percentile 7.352 ms on this host. The largest outlier was 155.773 ms. At most 1,144 entities and 116 projectiles were live in that scenario. Raw results are in `validation/cpu-benchmark.json`. These are CPU-only development measurements, not headset frame times.

## Pass 4 — rendering and runtime safeguards

Combined model pieces by material and used instance batches for repeated geometry and animated parts. Added distance-based visibility/detail, bounded geometric effect pools, shared television/ticker textures, and fixed-rate HUD/TV updates. Reduced beam geometry while expanding its instance capacity so every supported plasma stroke can remain visible.

World damage updates only the affected wall texture. A geometry test verifies that opening one hull hole changes one mask, and that subsequent unchanged frames update none. Shared geometries/materials and pooled buffers are retained; replaced world/model resources are disposed when loading or starting another run.

Balanced, High and Performance presets configure desktop pixel ratio and pre-session XR eye resolution. The runtime requests 72 Hz when offered, uses foveation, and reduces detail/TV update frequency when observed frame cadence degrades. It never changes the eye-buffer scale during an active XR session. Pausing clears trigger charges, held pause buttons are edge-triggered, and controller input is suppressed until release after resuming a menu.

## Validation boundary

The final code passes 25 automated gameplay/audio/geometry checks and the app lifecycle suite. The latter runs real game and Three.js scene modules with DOM, XR and renderer adapters. It verifies application transitions and valid scene data, not shader execution, visual quality, tracking or GPU performance. Its structural draw/triangle counts are scene inspection data, not measured headset submissions.

The environment could not render WebGL and no Quest was attached. An actual Quest 3 check is still required for visual appearance, controller alignment, frame timing, audio spatialization and comfort. The package is ready to host and test, with that limit stated explicitly.
