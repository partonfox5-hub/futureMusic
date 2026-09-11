# Human5 19.1 — final performance review

11 September 2026 · baseline 18.0, first upgrade pass 19.0, final integrated code 19.1.

**The geometry/population reductions are confirmed. A sustained 60 FPS or 72 Hz result on Quest is not established.** Final CPU timing results are mixed, including regressions in several scenes. Do not treat these diagnostic runs as proof of an overall speedup.

Each run uses the real engine animation loop, a simulated Quest user agent, fixed Sustain quality, 960×600 monoscopic rendering and 64 recorded frames at each of Home, Car, City and Forest. Chromium uses SwiftShader. Browser runs were sequential. Startup, transitions, shader compilation and background activity can affect the samples; these are single runs, not repeated controlled trials.

CPU figures below are the application's recorded frame-work duration, including synchronous renderer submission/blocking. They are not isolated CPU microbenchmarks or GPU duration. A camera animation loop under software rendering is not equivalent to a stereo headset workload.

## Recorded work duration

Milliseconds, median / p95. Lower is better within the limitations above.

| Scene | 18.0 baseline | 19.0 first pass | 19.1 final pass |
|---|---:|---:|---:|
| Home | 41.4 / 80.3 | 39.6 / 70.3 | 42.2 / 81.4 |
| Car | 38.7 / 66.7 | 39.7 / 67.1 | 40.2 / 75.9 |
| City | 50.3 / 263.0 | 48.5 / 308.9 | 53.3 / 105.5 |
| Forest | 29.1 / 44.1 | 32.8 / 71.5 | 34.1 / 99.5 |

## Work submitted and resident trees

Draw calls and triangles are p95; tree counts are the scene snapshot. These measurements do not isolate a single change.

| Scene | Calls, baseline → final | Triangles, baseline → final | Trees, baseline → final |
|---|---:|---:|---:|
| Home | 417 → 412 | 679,220 → 606,696 | 610 → 441 |
| Car | 687 → 708 | 1,090,970 → 969,554 | 810 → 585 |
| City | 273 → 261 | 716,646 → 669,348 | 410 → 297 |
| Forest | 127 → 114 | 665,866 → 563,098 | 900 → 648 |

The final vehicle view submits more draw calls at p95 than the baseline despite fewer triangles. This is a remaining limit, not a performance win. Exact visible objects, transparent materials and view rendering matter in addition to triangle count.

## Implemented changes

- Quest near forest density: 100 → 72 trees per streamed forest cell, with lower far-forest occupancy. Existing seasonal display and damage routing remain.
- Quest birds: 36 → 18; feeder cap: six → four. The smaller flock also lowers pairwise neighbor work.
- Engine sound: shared procedural buffers, a four-voice cap, and disposal of parked/distant engine graphs.
- Eye illumination: one cached scene-light list shared across actors, replacing repeated scene traversal per actor.
- Rigid part batches: reuse stored visibility bytes instead of allocating flattened arrays and strings each tick; the damage visibility test confirms rebuilds still remove hidden parts.
- Eyelid ribbons reuse vector scratch objects. Two eye-detail draws replace four fixed cards; no extra scene transmission render.
- Hair remains two draws; crown normals update at a bounded rate. Upper crown motion is constrained while lower hair responds to hands.
- Pet fur adds at most two sparse close-range coat shells, reduces to one farther away, and hides beyond five metres. It has a cost near the player; no claim that higher pet quality is free.
- The day/night sky extends the existing sky draw, using a small precomputed noise texture for cloud structure. Environment maps remain a bounded approximation.

## Remaining measured costs

| Scene | Actor work p50 / p95 | Main render p50 / p95 | Peak whole-frame work |
|---|---:|---:|---:|
| Home | 12.6 / 25.5 ms | 10.8 / 16.6 ms | 101.6 ms |
| Car | 6.8 / 16.7 ms | 14.9 / 25.7 ms | 2068.1 ms |
| City | 17.8 / 28.9 ms | 12.3 / 27.5 ms | 3952.6 ms |
| Forest | 7.7 / 17.0 ms | 7.5 / 16.5 ms | 1406.8 ms |

Actor updates remain an important CPU target, especially in the city. Large outliers still occur around rendering and world/upgrade work. They warrant device traces before choosing the next optimization. The test did not show runaway resident-cell growth: the final snapshots stayed at nine cells. Geometry, texture and shader counts vary as interiors and views load; bounded snapshots alone are not a long-session leak test.

The final profile measured a 0.8 ms synchronous vehicle-entry call on this host. That excludes subsequent rendering. The separate stress test recorded a much larger first mirror render than the second, so a quick enter() call alone does not prove the reported entry hitch is gone. The corrected XR head placement is independently verified with a detached tracked camera and nonzero rig yaw.

## Gameplay and integration gates

- Actual car collision with a house wall: four wall cells broke, the car slowed, and the stress harness completed without a page/shader error. This covers the reproduced case, not all possible collision sequences.
- Actual first car entry through a mocked WebXR camera plus three additional rig/yaw transforms: numerical placement error below 0.00001 m. Physical Quest tracking still needs testing.
- Open-palm hair test: approximately 41.8 mm guide displacement; 1,865 tested scalp-region vertices stayed outside the defined proxy envelope. This verifies the proxy, not every head morph or every hairstyle.
- Skin relief, 24-minute day-cycle period, enlarged toy, and parked engine-voice cleanup passed the focused regression.
- Studio import and eye tests verify finite geometry, bounded displacement, animated lid details and preservation of 49 original expression channels.
- Source integrity: 162 ES modules parsed, 322 relative imports resolved. Browser tests compiled the modified shaders.

## Quest acceptance protocol

Use the complete 19.1 game over HTTPS, with a cleared reload of the new versioned modules. Start with one Mira and the default population. Enter VR through the normal button and record actual supported refresh rate, CPU/GPU time, dropped frames and adaptive tier. Test daylight and night, indoors, the city, the forest, repeated car entry/exit and a wall collision. Include simultaneous wetness, fire and close NPC interaction after the headset has warmed up. Compare the same route against 18.0 on the same device and browser.

A 60 Hz frame budget is 16.67 ms and a 72 Hz budget is 13.89 ms. A JavaScript cap cannot force a hardware refresh rate or compensate for missed frames. Preserve central face quality while reducing peripheral resolution/foveation, view-refresh frequency, distant actor simulation or population only when the capture identifies the actual bottleneck.

Meta's official workflow explains CPU/vertex/fragment diagnosis, device profiling and iteration: [WebXR performance optimization workflow](https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/). The shipped runtime already has adaptive controls; these tests do not replace hardware approval.

## Raw evidence

The complete ZIP includes `H5-test-results/checkpoint16/performance-baseline/whole-application.json`, `performance-pass-1/whole-application.json` and `performance-pass-2/whole-application.json`, with sample arrays, stage timing, draw counts, resources and errors. Focused regression results and the collision stress report are alongside them. The final profile used the release code before the final cache-version string changed from 18.0.0 to 19.1.0; the packaged runtime was subsequently import-checked and browser-tested with 19.1.0 URLs.
