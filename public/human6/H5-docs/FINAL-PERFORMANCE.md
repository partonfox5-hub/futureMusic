# Human5 18.0 — measured performance and validation

The new release reduces rendering submissions and retains bounded interaction systems. It does **not** establish a 60/72 FPS Quest result. CPU changes are mixed, and the recorded city/first-visibility stalls remain material.

## Method

Fresh checkpoint-12 baseline, first feature pass, then final tree-LOD pass. Each run used Playwright 1.62.1 and Chromium with SwiftShader, a simulated Quest user agent, a 960×600 monoscopic viewport, a fixed Sustain tier, and 64 actual rendered frames in each of Home, Car, City and Forest. The browser runs were sequential. Dynamic NPC/physics behavior and software-renderer scheduling vary between runs; treat differences as diagnostic observations, not statistically controlled hardware estimates. “CPU” is elapsed main-thread frame work and can include renderer/driver work. The Chromium browser version is recorded by its user-agent/runtime where available; 1.62.1 identifies Playwright, not a Chromium release.

No GPU headset was attached. Software frame intervals, CPU time and draw counts cannot certify the Quest frame budget. Raw JSON reports include intervals, p50/p95/maxima, subsystem times, resources and streaming state. All runs used nine resident cells at each recorded destination.

## Whole-project results

CPU values are milliseconds, p50 / p95. Draw calls include views and shadow passes counted by the instrumented renderer.

| Scene | Baseline CPU | Final CPU | Baseline → final median calls | Baseline → final median triangles |
|---|---:|---:|---:|---:|
| Home | 41.6 / 78.9 | 44.7 / 88.6 | 348 → 319 | 385,973 → 534,300 |
| Car | 42.6 / 68.3 | 36.6 / 89.3 | 555 → 483 | 571,123 → 684,491 |
| City | 62.1 / 114.8 | 53.5 / 296.3 | 286 → 237 | 538,684 → 628,698 |
| Forest | 34.2 / 104.0 | 34.8 / 62.0 | 155 → 100 | 504,822 → 561,752 |

Home and Forest median CPU time did not improve. Car and City median CPU time improved in this run, but higher-percentile stalls are not uniformly better. Final CPU maxima were Home 3155.2 ms, Car 1908.8 ms, City 4059.7 ms, Forest 963.0 ms. These stalls are retained in the evidence; they are not hidden as warm-up exclusions.

## First-pass finding and correction

The first feature pass reduced calls but overbuilt the forest. Farther resident cells now use cheaper branched trunks and canopy geometry; nearby cells retain leaf cards/needle whorls. Pine cards use fewer subdivisions. Broadleaf/pine instances are packed instead of rendering zero-scale instances for the other tree type.

| Scene | First-pass median triangles | Final median triangles | Reduction from first pass |
|---|---:|---:|---:|
| Home | 697,616 | 534,300 | 23.4% |
| Car | 959,151 | 684,491 | 28.6% |
| City | 753,640 | 628,698 | 16.6% |
| Forest | 995,186 | 561,752 | 43.6% |

The final scene still uses more triangles than checkpoint 12, reflecting the new art. Direct cell tests reduced 27,200 → 7,966, 12,318 → 3,758, 27,000 → 7,972 triangles per sampled cell. Damage routing was checked after packing and after switching detail levels.

## Integration and stress evidence

- 157 application JavaScript modules parsed; 314 relative imports resolved in the source-integrity check.
- Six breeds simulated for 90 steps each. All inspected deformed vertices were finite and inside conservative culling bounds; each rig retains 28 bones. Twelve meshes per dog and fifteen per cat after compaction.
- All 27 rack garments have garment-shaped geometry; page counts are 6, 6, 6, 6, 3. Thirteen recorded audio clips decoded successfully in the integration test. The voice stress test reached three active voices and three queued, then canceled them without stale active voices.
- Forty season changes retained the expected winter/summer visibility behavior. Lamp tests retained exactly three slots, refreshed candidates 21 times over 144 simulated 72-Hz steps, followed a moved lamp, reused two environment textures, and followed an 85-metre shadow focus. Pool disposal removed its lights.
- Cash tests use the application’s blade ray-hit and desktop picking paths, single/12-note grips, throw velocity, water flotation, zero gravity, support sleep, limits and cleanup. The ordinary prop loop also verifies tied-bundle floor contact. Cash geometry refreshes instance ray-picking bounds as bills move.
- The car-wall stress test broke four Willow wall cells without an exception, with a finite final speed. This is a targeted regression; it is not proof against every collision scenario.
- Passing integration/stress/browser profiles reported no captured application or WebGL errors.

Cash limits: eight bundles; 32 notes per cut bundle; 192 loose notes; 12 per handful. Each note is 24 triangles, so the loose-note mesh tops out at 4,608 triangles in one draw. Held notes follow the display cadence; loose physics uses 30-Hz substeps. Sleeping notes recheck support periodically. These are approximations, not full cloth dynamics.

In the final cash-only stress sample, 60 ticks at the maximum loose-note count averaged 1.100 ms, p95 3.300 ms, maximum 4.500 ms on this workstation. This includes the idle half of the 60-Hz calls between 30-Hz physics steps. It excludes the main scene render and is not a headset estimate.

Vehicle entry test: enterSyncMs 0.3 ms, firstMirrorMs 147.3 ms, secondMirrorMs 5.8 ms. The first mirror render remains slower than the second even after initial preparation in this software renderer.

## Quest follow-up

Use the complete build over HTTPS. Start with the existing automatic or Sustain profile. After a warm session, export the built-in Performance report for: the starting house with Mira and pets, driving into the city, a forest walk with season changes, and a maximum cash throw. Include a longer session to expose sustained-load behavior. The menu reports the actual XR target rate; this build requests a supported session rate and cannot force an unsupported 60-Hz display mode.

Inspect actors/contact simulation and city construction first if CPU work dominates. Inspect foliage, shadow/view passes and render scale if GPU time dominates. City Activity can be toggled in the Performance menu for a controlled comparison. The current budgets, culling and reduced view cadence remain in place, but there is no evidence here that the whole project meets a Quest frame budget.
