# Final performance review — Human5 17.8

**Two requested final passes were performed. The application is not certified at 60/72 FPS on Quest.** The measurements below expose the remaining cost, including hitches. No Quest hardware, stereo session or headset microphone was available. Test environment: Chromium 143 with SwiftShader, simulated OculusBrowser user agent, 960×600 monoscopic view on a shared workstation. Random actor/activity state and scheduling vary between runs.

## Pass 1: isolate simulation costs

The same integrated simulation diagnostic samples 144 frames per location after warmup. It includes host actors, clothing, pets, world/AI, vehicles, fire, water and furniture but excludes final framebuffer presentation and some view/home/equipment work. It is not a complete-frame benchmark.

| Location | Before p50 / p95 / max, ms | After p50 / p95 / max, ms |
|---|---:|---:|
| Home | 10.0 / 17.6 / 47.5 | 8.2 / 13.2 / 20.3 |
| City | 17.9 / 42.0 / 237.8 | 12.0 / 21.1 / 48.1 |

Across those 144 frames, home contact work fell from 485.6 to 155.7 ms and city contact work from 770.1 to 184.4 ms. Fire work fell from 65.2 to 47.9 ms at home and 284.6 to 89.0 ms in the city. These are same-harness diagnostic observations, not a guaranteed speedup percentage. CPU profiles and raw reports are included in `test-results/performance-pass-1`.

## Pass 2: actual application loop

The real engine animation loop was exercised at home, while entering/driving a car, in the city and in the forest. The earlier 72-frame baseline reset the timing history before the controller's 90-sample decision gate; it therefore did not validate adaptation. The corrected final run records 112 frames at each location and confirms the controller moves to `sustain`. All four locations retained nine resident cells, no more than the two allowed extra pinned-view cells, and no browser errors. Vehicle enter/exit and source/profile/morph guards passed.

| Location | Synchronous transition, ms | Main-thread/frame p50 / p95 / max, ms | Delivered interval p50 / p95, ms | Median draw calls | Resident cells |
|---|---:|---:|---:|---:|---:|
| Home | 0.1 | 38.6 / 77.2 / 514.5 | 633.2 / 1883.3 | 460 | 9 |
| Car | 1.0 | 42.3 / 96.5 / 1147.1 | 850.0 / 1799.9 | 555 | 9 |
| City | 46.9 | 67.4 / 167.8 / 3728.3 | 633.3 / 1633.3 | 420 | 9 |
| Forest | 35.9 | 30.9 / 90.1 / 1243.9 | 466.7 / 1766.6 | 158 | 9 |

These software-renderer intervals are extremely slow and must not be converted into a claim about Quest speed. They also do not establish that the final scene fits a Quest frame budget. The final city run still has multi-second stalls and high submission cost. First-visible materials/geometry, detailed actor construction and city activity remain bottlenecks. Some second-pass p95/maxima are worse than the earlier 72-frame run; it would be misleading to claim a uniform whole-frame improvement. The simulation improvements are supported separately by Pass 1.

## Changes applied

- Quest starts in balanced mode; adaptive foveation, interior visibility, carpet pile and view/shadow update frequencies respond to measured load. Severe intervals over 250 ms remain in both evidence and control decisions. Synthetic 400 ms stalls verify a shift to sustain rather than accidentally upgrading detail.
- Contacts stay responsive near hands, the player and other interacting actors. Distant non-interacting self-contact runs at 24 Hz, with shared skeleton/palette data and existing triangle hierarchy. A 48-query comparison matched unpruned contact projections exactly in the regression.
- Fire keeps grid membership for stationary fuel. Movement across cells, exposure changes, depletion, detach and deletion update/remove entries. Tests prove moved fuel cannot be ignited through its old location and still ignites at its new location.
- A dropped rendered frame no longer resets all character and furniture physics. Visibility changes clear held keyboard input and consume stale clock time. Existing bounded timesteps avoid an unbounded catch-up loop.
- Body partitions with only tiny exported facial-channel residuals no longer allocate the entire 49-channel GPU morph atlas. Every head/expression channel is preserved. The conservative sum-of-absolute-channel residual is checked on each partition's used vertices; retained non-head differences are below 1 mm in bind-space source geometry, not a promise of submillimetre accuracy after all skinning/scaling. The body/arm/leg/nail measured bounds are approximately 0.335/0.843/0.017/0.015 mm. CPU shared morph data remains available to the head and contact system.
- The new skin shader/rest-space treatment and welded normals supersede the expensive legacy color-seam diffusion. That legacy construction step no longer runs for actors with the new skin refinement installed.
- Distant legacy two-layer hair draws one layer beyond 1.8 m. The new Mira groom remains guided and cuttable.
- Quest rear-view mirrors use 256×128 pixels, 32–55 m range by tier and reduced cadence. Grass/understory and birds are temporarily omitted only from that tiny view, with renderer/XR/visibility state restored in a `finally` block. Main-view nature remains visible. Other view surfaces retain their separate budgets.

## Vehicle regression

The final focused test enters the actual car in 1.0 ms of synchronous JavaScript. First mirror/cabin renders still take 162.7/152.3 ms in SwiftShader; second renders take 8.5/12.8 ms. Startup prepares the two default vehicle views, moving about 12.2 s of this particular software-renderer setup into loading. Newly spawned vehicles or changed visibility can still introduce first-use work. These numbers must not be advertised as headset entry latency.

The real Willow-wall collision test breaks four wall cells without the former missing-point exception, and the car remains finite. The remaining velocity after the regression sequence is approximately 0.64 m/s. Suspension, wheel alignment/steering damage, engine power loss, repair and zero-gravity support have numeric tests.

## Other release gates

All seven numeric suites pass: core acceptance, systems, world, gameplay, ecology, anatomy refinement and final performance regressions. The source-integrity check parses 149 JavaScript modules and resolves 301 relative imports. The final integrated browser stabilization test covers analog movement/release, cloth LOD/grip/cut/detach, exact contact queries, sink attachment/delivery, hidden droplet count, furniture settling and selected-X deletion cleanup. Character gravity/buoyancy/cuts/profile/live shader tests and final integration reproduction are saved alongside the complete project.

## Next useful performance evidence

Run `QUEST-TEST-PROTOCOL.md` on the actual Quest 3 over HTTPS, including warm startup, car entry/crashes, city traversal, close conversation and a thermal soak. Export reports while still in XR; the rolling buffer is 720 frames. Measure at the runtime-supported refresh rate (prefer 72 Hz where supported). A 60 FPS request cannot force a 60 Hz display mode. Use separate CPU/GPU measurements where the timer extension is available, and retain long frames. Prioritize first-visible shader/geometry construction and actor/pet cost if the hardware report confirms those bottlenecks.

The final character visual check also caught simultaneous legacy/new hair immediately after NPC-profile import. The replacement now hides the old mesh at installation, before the next animation frame.
The final crown-coordinate/first-frame visibility correction was validated after the timing run; it does not change draw or vertex counts. The complete-frame timings should be read with that small final visual change disclosed.
