# Human6 20.2.0 validation

**40/40 browser integration checks passed; no page or shader errors.** Results are in `integration-result.json`. Chromium/SwiftShader and simulated controller input verify behavior and renderer integration. They do not establish Quest frame time, comfort or thermal stability.

The previous 25 feature/physics/rendering checks are retained. Fifteen additional checks cover bounded cell selection and portal/fire reservations; border jitter; fast travel and altitude LOD; warm geometry reuse and collision activation; tree picking at both LODs; tree persistence after eviction; cached terrain invalidation; XR eye union; batch hit ownership and live edits; remote-camera forest selection; articulated/dented vehicle shadows; town hysteresis; spatial road indices; local coarse-terrain updates; and exported diagnostics.

See `../PERFORMANCE-20.2.0.md` for the before/after draw table and research. Raw evidence: `draw-counts-before-20.1.0.json`, `draw-counts-after-20.2.0.json`, and `performance-views-20.2.0/`. These are fixed-camera structural comparisons with refreshed shadows and matched settings, not statistical Quest benchmarks. Startup pose can vary slightly. The older `desktop-draw-diagnostic.json` belongs to 20.1.0 and uses a different settling procedure; do not mix its figures into the comparison.

The original nine-cell neighborhood was retained after visual comparison. World identity and saved destruction are preserved. Four warm cells retain geometry while removing active collision and rendering. The fast-route test remains within configured budgets; it is not a long-duration headset soak.

## Reproduce

Serve the project, open `index.html?debug`, and wait for startup. Use a disposable scene because the tests exercise spawning, diplomacy, mounting, destruction and terrain edits.

```js
const H = window.human2;
const render = await import('./H6-tests/render-pets.regression.js');
const physics = await import('./H6-tests/vehicles-structures.regression.js');
const gameplay = await import('./H6-tests/runtime.integration.js');
const streaming = await import('./H6-tests/streaming-performance.regression.js');
console.table(render.run(H).results);
console.table(physics.run(H).results);
console.table((await gameplay.run(H)).results);
console.table((await streaming.run(H)).results);
```

Reload to resume the animation loop afterward. The optional desktop fixed-camera diagnostic is `await (await import('./H6-tests/draw-counts.js')).capture()`. It requires exiting XR and also pauses animation. For actual headset measurements, use the named in-game Quest capture controls and export their report.

```sh
node --experimental-vm-modules H5-tests/source-integrity.cjs
```

Home ≤150 / Car ≤200 have not been reached in the structural snapshots. Framebuffer scale remains 1.0. Physical Quest validation, thermal/memory soaking and tuning of remaining construction spikes are still needed.
