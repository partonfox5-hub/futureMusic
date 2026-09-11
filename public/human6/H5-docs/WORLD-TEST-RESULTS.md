# World-stage test results

Automated world regression passed on 11 September 2026 in Chromium/SwiftShader, mono 960×600, on the Quest code branch. This is not a Quest headset measurement.

Checks: restaurant, penthouse, elevatorCarry, weather, terrainEdits, treeCutPersistence, waterHydro, sceneLifecycle.

Resident cells stayed at 9 during the recorded route. The home area contained 610 detailed trees, and the city inspection loaded 3 interiors. Terrain edits and a felled tree survived traveling away and returning. Elevator tests transported the camera to floor 7 and verified platform collision height. No JavaScript/shader errors were recorded.

| Broad view | Draw calls, including requested shadow work | Triangles |
|---|---:|---:|
| homeRender | 885 | 577580 |
| penthouseRender | 817 | 458510 |
| cityRender | 986 | 574588 |

These are broad elevated inspection views; they are expensive and do not prove the target. A separate normal-height street-view diagnostic before the final static-batching refinements measured 403 calls without shadows and 517 with a forced shadow refresh. Compare identical cameras and shadow cadence before drawing conclusions.

The broad-view run also tested far forest silhouettes; their final primitive was changed from an octahedron to a grounded cone after visual review. That small geometry-only change is not included in the table above. Do not use the table as an exact triangle count for the final cone variant.

The near-idle `openWorld.tick` microbenchmark has insufficient timing resolution to establish a meaningful frame budget: its p50/p95 rounded to zero and maximum was about 0.1 ms. It excludes scene rendering, actor/contact/prop simulation, startup generation and cell-load spikes. Initial/full cell completion costs and moving-player performance remain separate measurements.

The row generator limits its continuous work to a nominal 2.2 ms on Quest; final mesh/forest commitment, grid reconstruction, shader compilation and city-interior creation can still cause hitches. This is an explicit remaining performance risk for the final pass. Run the on-device protocol in `QUEST-TEST-PROTOCOL.md`, adding city streets, elevator, penthouse views and travel across cell boundaries.
