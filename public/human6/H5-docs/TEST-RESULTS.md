# Human5 17.0 validation results

Tested 11 September 2026. Automated regression passed. **Quest frame-rate, headset permission dialogs and microphone hardware remain untested.**

## Functional evidence

- Node/Three acceptance: swept torch contact, ignition, stuffing fuel, extinguishing, inert materials, bounded lights, layered furniture cuts, preserved food quantity and buoyancy signs.
- System regression: actual rug triangle removal/stretch tearing/cleanup, gravity-zero stability, rigid-batch hit identity, tissue strain bounds, five floor plans, automatic shifting, terrain support, zero-gravity vehicle motion, long-frame telemetry retention, microphone permission ownership/cancellation, local warmup, VAD/transcript delivery and shutdown.
- Damage regression: wheel/front impacts change steering, alignment, suspension and power; repair resets those states. A browser hit visibly changes original bumper vertices and Repair restores them.
- Optimized CPU skinning equals Three’s deformation in a posed weighted two-bone test to within 1e-6. It retains morph evaluation and uses the existing palette; unsupported attribute forms fall back to Three.
- Integrated browser: 5 houses / 11 bedrooms / 104 movables / 4 rugs / 2 cars; forward travel 3.249 m over the test’s 1.5 seconds; tire damage, mechanical repair, mattress support and four expression states. Scene round trip retained 5 houses, 4 rugs, both active cars and 184 registered fire surfaces.
- No JavaScript or shader errors were reported in that integrated run.

## Measured cost, with limits

Chromium 152 with SwiftShader, mono 960×600, simulated Quest user-agent branch. The CPU loop ran 160 fixed steps and measured the last 130; rendering was excluded. These numbers are local regression measurements, **not FPS and not a prediction for Snapdragon hardware**. Shared-host scheduling and short-run variance affect comparisons.

| CPU section | Median ms | p95 ms | Maximum ms |
|---|---:|---:|---:|
| upgrades | 0.4 | 0.9 | 3.5 |
| actors | 5.9 | 12.4 | 17.3 |
| water | 0.2 | 0.6 | 1.4 |
| props | 1.6 | 3.0 | 5.4 |
| pets | 0.6 | 3.0 | 3.7 |
| total | 8.8 | 18.0 | 26.0 |

Before the final contact/skeleton optimization, the same scripted CPU workload measured 14.8 ms median and 26.8 ms p95 total. The final run measured 8.8 ms and 18.0 ms respectively. The approximately 40.5% median reduction is observed locally; p95 still exceeds a 72 Hz full-frame budget even before rendering in this environment, so this evidence does not establish the headset target.

The controlled same-camera batching check reduced calls from **409 to 357** (12.7%) at the identical **166,956 triangles**. These counts describe that view, not every scene. An earlier comparison in `before-final-optimization.json` had an unsigned-layer-mask bug in the test’s restoration step; disregard its batching subsection. The final browser test fixes that issue. The earlier CPU measurements remain independent of that comparison.

At a different main-view sample including shadow work the renderer reported 479 calls and 238,755 triangles, with 514 geometries, 70 textures and 60 programs. Draw-count evidence is not a GPU timing measurement. GPU memory allocation and actual stereo timing still need the Quest protocol.

## Visual and feature limits

The cul-de-sac, cars and hair use procedural models. They are more functional and detailed than the source variants, but are not GTA-quality authored assets. The reference face/body fit is approximate; neither exact identity nor photographic expression matching was established. Close-up skin self-shadow reception is disabled by default after visible artifacts; the body tone blend trades some photo color detail for continuity. Active skin maps remain 2K, and no genuine 4K scan is supplied. Fire and tissue use bounded visual/physical approximations rather than fluid or anatomical simulation.

Screenshots in `test-results/` record the actual integrated build. They are evidence, not a separate photoreal preview. Read `RESEARCH.md` for the next asset and rendering steps and `QUEST-TEST-PROTOCOL.md` for the remaining release gate.
