# Human6 20.2.0 — map streaming and rendering performance

The 4.224 km region now keeps a bounded area active, reuses recently visited terrain, and renders vegetation and roads according to each camera's view. The original 3×3 terrain neighborhood and its tree placement remain intact. Old world saves keep their terrain, tree, faction and building identities.

## Measured change

| View | Before draws | After draws | Draw reduction | Before triangles | After triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 309 | 231 | 25% | 674,620 | 544,645 |
| Car | 312 | 236 | 24% | 690,859 | 537,333 |
| Close Mira | 196 | 184 | 6% | 618,941 | 516,913 |
| Timberfall | 213 | 83 | 61% | 533,031 | 316,134 |
| Forest | 93 | 62 | 33% | 593,421 | 385,418 |
| Flight | 79 | 55 | 30% | 518,515 | 218,947 |

These are **single-camera structural diagnostics**, including an explicitly refreshed shadow map, in Chromium/SwiftShader with the Oculus user agent selecting Quest budgets. Both builds used the same seeded startup, viewport, camera route, fixed settling steps, and disabled adaptive quality. Small startup/actor-pose differences remain; this is not a statistical frame-time benchmark. The raw before/after JSON, draw attribution and camera coordinates are in `H6-tests/draw-counts-*.json`.

**Home ≤150 and Car ≤200 remain unmet in these snapshots. No Quest 3 frame-rate claim is made.** Stereo, mirrors, portals, menus and real GPU behavior require headset captures. The largest improvement is in the new town view; distant home interiors no longer keep drawing behind it. Flight also avoids close-up tree geometry and distant low plants.

## Why this scheme

Fewer state changes and larger batches reduce WebGL submission overhead. Merging everything into one world-sized mesh, however, prevents useful visibility rejection. The implementation combines spatial bins with a small number of material batches: bins choose the contents of a draw, rather than each bin necessarily becoming its own draw. This applies [MDN's batching guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) to the game's existing renderer.

[Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) supports repeated geometry/materials with per-instance transforms. The resident forest and understory now share their assets and combine compatible visible sources. Source identity remains separate for interaction. The implementation was checked against the locally installed **r170** renderer; it prepares buffers before Three builds its render list. It considers both XR eyes and prepares independent views for mirrors and portals.

Loading, simulation and drawing need different boundaries. [Epic's World Partition documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine) describes cells, streaming sources and loading priorities. Those concepts inform this game's player source, look-ahead source, and two portal reservations. This is an implementation choice for the current JavaScript engine, with no engine migration.

[NVIDIA's geometry clipmap chapter](https://developer.nvidia.com/gpugems/gpugems2/part-i-geometric-complexity/chapter-2-terrain-rendering-using-gpu-based-geometry) supports coarse distant coverage, local detail, and incremental updates. This build retains the existing coarse terrain instead of implementing a full clipmap renderer. Its mask and terrain edits now update persistent buffer ranges, so a cell transition or small crater does not recreate the entire distant index buffer.

## Current Quest budgets

Distances below are engineering defaults, not experimentally established Quest optima. Cell distances use the closest point on a cell's footprint, avoiding a large load jump caused by measuring only its center.

| System | Policy |
| --- | --- |
| Terrain identity | Existing 96 m cells; 2 m detailed ground grid |
| Core area | Original 3×3 neighborhood, normally nine cells |
| Activation cap | 16 normal cells; up to two portal cells and three burning-cell reservations |
| Retention | Keep eligible existing cells within 120 m of their footprint, subject to the cap |
| Reuse cache | Four detached cells, with rendering and collision unregistered |
| Travel prediction | 0.9 seconds ahead, capped at 96 m; a 32 m prefetch footprint |
| Teleports | Reset velocity prediction for jumps of 180 m or more between samples |
| Scan / construction | Scan every 0.20 s; terrain rows and forest candidates yield within a 2.2 ms cooperative slice |
| Tree detail | 22 m close geometry on Quest, also considering height above the canopy; coarse geometry farther away |
| Understory | Activate within 48 m of a cell footprint; retain to 72 m; remove at high flight altitude |
| Distant forest / roads | 192 m visibility bins, selected per camera against the 1,250 m fog depth; wide-FOV corners remain covered |
| New settlement interiors | Four detailed buildings/sites; 45 m house loading / 65 m unloading, 145 / 180 m landmarks; 12 m replacement hysteresis |
| Original city | Existing three-nearest selection now favors retained interiors by 12 m; existing permanent interiors/lift protections remain |

The construction budget is cooperative: a single row, completion step, geometry upload or garbage collection can exceed it. Building/landmark construction still completes one object at a time. The exported maximum build time exposes these spikes for further on-device tuning.

## Implemented changes

- Shared forest and understory geometry/materials, with instanced batches across visible cells. Tree rays use independent interaction proxies, so looking away or switching render LOD cannot make a nearby trunk unhittable.
- A bounded warm cache that restores existing geometry and exactly one collider per live tree. Wanted cached cells are protected before outgoing cells enter the cache. Terrain edits invalidate stale cached cells; felled trees and structural holes persist.
- Distant forest matrices are rebuilt only when visible bins, residency or season change. The final forest view selects a small portion of the 4,325 distant stand records. These records and other world metadata still exist in memory; active rendering no longer submits them all.
- Roads keep their material batches and persistent index buffers, selecting visible triangles instead of submitting the whole road network. A small remote terrain edit updated **25 of 17,689** coarse vertices in the regression fixture.
- Single-draw vehicle shadows from the actual panel geometry. Articulation and dents update affected ranges of a reusable position buffer; the extra mesh emits no color draw. Original source shadow flags are restored after each view.
- Correct shadow limits on actual house meshes, batched rack frames/hangers, inexpensive distant home silhouettes, and single-pass flat water. Close meshes and their interaction ownership remain available.
- Extended the existing Quest profiling controls to Timberfall, Forest and Flight. Reports include render calls by section, residency/cache counts, build counters, vegetation batches, road selection and vehicle shadow diagnostics. Adaptive quality stays fixed during a named capture.

## Keeping a still larger world affordable

Keep the active/cached caps independent of total world area. Add locations as indexed metadata; construct interiors near the player or a reserved view. Keep collision and active AI local, with saved state for inactive locations. Use coarse silhouettes beyond interaction range and preserve a coarse ground fallback while detail is queued.

Do not enlarge every loading radius when enlarging the map. At the same density, a doubled radius roughly quadruples the area considered. Raise travel look-ahead for a faster vehicle only if measured loading latency demands it. Keep a gap between load and unload decisions and a small cache to avoid rebuilding on reversals. Extremely small cells create more boundaries and bookkeeping; a single giant cell defeats culling.

This is **procedural geometry residency and rendering**, not HTTP asset streaming. Startup metadata, road source geometry and some inherited systems still scale with content. If the region grows substantially again, page those data/asset records too, and consider nested terrain LOD rings if coarse terrain becomes a measured cost. A worker, engine rewrite, texture-resolution reduction and framebuffer reduction were not introduced in this pass.

## Validation and headset procedure

**40/40 integration checks passed with no page or shader errors.** New checks cover border jitter, a 1.246 km simulated fast route, bounded queues/cache, geometry reuse, collision reactivation, tree persistence, cached terrain edits, both-eye visibility, remote camera selection, batch picking, moving/dented shadows, town hysteresis, road selection, and local coarse-terrain refresh. This is a bounded travel test, not a long headset memory/thermal soak.

On Quest 3, serve this build over HTTPS, enter XR, and use **Quest performance captures**. Record Home, Car and Close Mira, then Timberfall, Forest and Flight. Each named capture runs for 12 seconds; export the report. Keep framebuffer scale at **1.0**. Existing foveation profiles remain **0.67 / 0.8 / 1.0**. Compare total and per-section calls, CPU section times, available GPU times and delivered intervals before adjusting quality. Repeat with mirrors/portals enabled and disabled to locate auxiliary-view cost.

The Home/Car draw targets and sustained 72 Hz still require further work and hardware evidence. Large landmark build spikes, inherited transient allocations, texture compression, and sky/video compositor migration remain outside this completed pass. The optional menu layer and mesh fallback are preserved.
