# Human6 20.3.0 — loading and performance pass

The diagnostic cold start improved from **21.3 seconds to 9.8 seconds** (about 54% less time). This is a desktop Chromium/SwiftShader comparison with the Quest budget selected, a 1280 × 800 viewport, seeded randomness and local file serving. It is evidence about startup work, **not a Quest 3 loading-time or frame-rate guarantee**. No physical headset was available.

## Loading fixes

- A small bootstrap catches failures across the whole module graph. Missing game files now show an error, Retry, and Save Loading Report. Previously a dependency of the boot module could fail before its error handler existed.
- Three.js r170 and the required addons are included locally, with their license. Core startup was tested with all external hosts blocked. Optional voice services still use their existing connections when invoked.
- A generated module-preload manifest starts the static dependency graph together. Mira's download begins while the game initializes: **78 ms after navigation**, compared with **3,717 ms** in the baseline.
- The character transfer reports downloaded bytes, aborts after 30 seconds without progress, and has a 180-second overall limit. HTTP failures, empty files and invalid GLBs are rejected. Character decoding and visible-material preparation have deadlines too.
- Loading yields between initialization stages. A timer fallback permits progress when animation-frame callbacks are unavailable. Browsers commonly pause those callbacks in hidden tabs. [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- The world simulation and repeated world draws start after preparation. Entry controls become available when the first view is ready. Graphics-context loss exposes recovery controls.
- Shader preparation uses the actual initial visible objects. Three r170's compilation traversal includes hidden objects, so preparing the entire scene also prepared source meshes and distant content. The targeted list keeps the game's lighting and original mesh parents. Async compilation uses the API recommended by Three.js. [Three.js: WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
- Compulsory whole-scene mirror and car-seat renders were removed from startup. The baseline's first car-view preparation alone blocked for **8.4 seconds** in the software renderer.
- The old house, castle and terrain are no longer built and discarded before creating the neighborhood. All **19 furniture templates** are generated independently. This also fixes the table template accidentally containing the old couch and chair.

## Character payload

The runtime model omits embedded textures that `applySkin` immediately replaces with the game's existing appearance maps. Teeth textures remain embedded; the original authoring model is retained.

| Measure | Before | After |
|---|---:|---:|
| Runtime GLB bytes | 15,354,184 | 11,886,388 |
| Embedded images decoded | 23 | 2 |
| Verified geometry/morph accessors | 89 | 89 |

All retained accessor bytes match the original. The mesh, rig, morphs and external appearance-map resolutions are unchanged. The runtime model has a stable asset name, so a code-only cache-version update does not itself change its download URL.

## Runtime work

- Map terrain generation runs in small row batches; the current marker and labels remain available while its background finishes. Terrain edits invalidate the background. A stowed XR map performs no canvas redraws or texture uploads.
- Nearby grass generation uses a cooperative 1.2 ms Quest work budget and publishes complete patches. Terrain changes cancel stale work. Cuts survive rebuilding. Final buffer publication can exceed the work budget; the regression run measured a 2.1 ms maximum slice.
- Dry-ground water queries return before sampling the terrain again or allocating a current vector. River calculations avoid temporary per-segment objects. **2,220 terrain/water comparisons** matched the previous geography exactly.
- Desktop status fields update at a limited rate. The frame profiler no longer queries the current GPU timer synchronously on every frame; it owns its query lifecycle. Avoiding blocking WebGL queries follows the platform's performance guidance. [MDN: WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- The legacy noodle prop is hidden before the first cul-de-sac frame.
- The 96 m cell scheme, 3 × 3 core, travel prediction, bounded warm cache, portal/fire reservations, destruction persistence and view-specific batches remain in use. See `PERFORMANCE-20.2.0.md` for that design.

## Draw-count check

Single-view diagnostic draws, including a forced directional-shadow refresh:

| View | 20.2.0 reference | 20.3.0 |
|---|---:|---:|
| Home | 231 | 226 |
| Car | 236 | 223 |
| Close Mira | 184 | 201 |
| Timberfall | 83 | 82 |
| Forest | 62 | 62 |
| Flight | 55 | 55 |

These are snapshots, not sustained XR frame measurements. Removing pre-ready simulation changes initial pet positions and poses; the Close Mira capture now includes more visible cat parts and different shadow coverage. The underlying per-mesh evidence is included. Home and Car still exceed the earlier 150/200 draw targets. Additional reduction needs headset measurements and work on the remaining character, prop and shadow draws.

Individual geometry finalization, texture upload and driver work can still exceed a cooperative slice budget. First use of mirrors or portals can still incur driver preparation. Quest testing should include cold and warm startup, Home, driving, Close Mira, rapid travel and return visits before making refresh-rate or resolution claims.

## Validation and files

**61 distinct checks passed** across the 52-check combined integration run and the loading failure/recovery suite (shared checks counted once). Covered missing boot/Three/model files, invalid models, stalled transfers, restored-file retry, hidden-frame fallback, context loss, texture-free stowed map, grass rebuilds, both XR eyes, bounded residency, vehicle traction, multi-part destruction, torch movement, NPC combat, mounts, flight, factions, pets and structural persistence. Normal startup and integration runs reported no page or shader errors.

Raw evidence is in `H6-tests/`:

- `startup-before-20.2.0.json`, `startup-after-20.3.0.json`
- `loading-validation-20.3.0.json`, `integration-result-20.3.0.json`
- `draw-counts-after-20.3.0.json`, `performance-views-20.3.0/`
- `runtime-model-integrity.json`, `source-integrity-20.3.0.json`

Loading reports are available directly on the loading card. The normal performance export also includes the loading stages, map work and grass-build diagnostics.

## Running or updating this build

Upload the **complete `human6` folder**, including `vendor/`, `startup-modules.json` and the new runtime GLB. Serve `index.html` over HTTPS for Quest WebXR. For local desktop development, run `python3 -m http.server 8000` inside the folder and visit `http://localhost:8000/`. Opening the HTML through a `file:` URL is unsupported and now explains the problem.

No build step is needed to run the archive. If editing module dependencies, regenerate the preload manifest with `node --experimental-vm-modules tools/prepare-startup.cjs`. The optional `tools/prepare-runtime-model.py` recreates the runtime GLB from the retained authoring model and verifies its accessor bytes.
