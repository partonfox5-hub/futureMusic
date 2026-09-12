# Human5 19.3.0 — checkpoint 18

Complete integrated project based on the saved 19.1 / checkpoint 16, including the separately saved 19.2 / checkpoint 17. Use the full project as a replacement deployment. The accompanying module overlay is for checksum-checked integration into a copy of checkpoint 16 or 17. Earlier patch files are historical; do not reapply them.

## Start and controls

Serve `human5/` at `/human5/index.html`; Quest requires your existing HTTPS setup. Do not open the HTML directly from disk. This release adds no game runtime dependency. Three.js remains 0.170.0 and runtime cache tags are 19.3.0.

| Action | Control / behavior |
|---|---|
| Default movement | Another +15% over checkpoint 16, retaining its earlier +30% increase. VR baseline is approximately 3.116 m/s. |
| Sprint | Left stick click; +50% for 10 seconds, then a 10-second cooldown. Release and press again to start another burst. Desktop Shift uses the same timing. |
| Jump | A on the right controller, once per press; desktop Space remains available. |
| Restraints | Right stick click with the right-hand pointer. Builder mode retains its own controls. |
| Portable lights | Y → GEAR → WEAPONS / TOOLS → TOOLS → Flashlight / Godlight. Spawn or equip; trigger toggles the held light. |
| Vehicle headlights | Dashboard button, GEAR → DRIVE control, or desktop vehicle control. Cycles AUTO / ON / OFF. |
| Interior light | Separate dashboard, drive-menu and desktop toggle. |
| Drawers | Point and trigger/click to toggle; grip the handle to slide it directly. |
| NPC routine | Default auto/wander; existing selected-NPC controls can set a different mode or follower behavior. |
| Performance evidence | WORLD → PERFORMANCE → EXPORT PERFORMANCE REPORT. |

Opening menus, entering a vehicle and builder interaction take priority over ordinary locomotion controls. Sprint is not an additional multiplier on an old trigger sprint.

## Interaction and appearance fixes

- Mattress grabbing preserves the object's world transform and visibility. Furniture contact correction uses actual oriented-world bounds and limits each correction, avoiding the previous large pickup displacement. Bed activity bindings are released when the mattress is grabbed.
- Nightstands now have a hollow case, two separate drawer boxes, constrained travel and damped motion. Clone metadata preserves their behavior. Unloaded drawer roots are discarded.
- Chest color and relief use one shared rest-space anchor; the legacy chest atlas normal contribution is suppressed to avoid a second relief image. Attachment compliance is increased by about 5.5%, a small softness adjustment retaining the existing gravity response. The shader compiles in the actual app; exact anatomical realism or photographic identity is not established.
- Dead NPCs leave the standing balance solver and use a bounded 21-node articulated solver with gravity, joint-length constraints, approximate flexion/separation bounds, hand pins, floor contact and sleep. Impacts wake the body. Hair on both renderers is hidden when the head is removed, and a static copy of the current groom follows the detached head. Healing restores the joint positions and hair lifecycle.

The ragdoll is a lightweight game approximation. It is not a full angular-joint, continuous self-collision or anatomical tissue solver; extreme poses and surface intersections remain possible. The captured collapse is included for review rather than presented as photographic realism.

## Portable and vehicle lighting

Flashlight and Godlight are grabbable tool models with glass lens details. Godlight uses exactly ten times the flashlight's source intensity, with a longer reach. They reuse the existing Quest fixture pool: two point lights and one spotlight, without adding shadow maps. Held lights receive priority, so other fixtures can lose their real illumination when the pool is occupied; emissive bulbs/lenses remain visible.

Vehicle headlight, taillight, brake and cabin emission follows the new controls. Player vehicles default to AUTO. Active NPC traffic enables headlights at night. Headlights and cabin lights compete in the same bounded pool; this is not a separate real spotlight for every visible car. Cached material references avoid traversing the lamp geometry every frame.

## Motion and daily activities

Human running has a separate faster cycle, longer strides, increased knee lift, bent arm swing, forward lean and a short flight phase. Default movement is walking, with a blended run for explicit followers catching up and urgent tasks. The test measured about 1.128 m/s walking and 2.501 m/s running. Dogs and cats have separate walk/run timing, foot phases, stride/lift and body motion; they retain the existing rigs and breed models.

Ordinary spawned NPCs default to wandering and using accessible seats, pianos, beds and nearby TV seating. Mattress activities use horizontal bed poses and existing occupancy/navigation. Explicit passive/still, hostile, traffic-pedestrian and follower instructions are preserved. Auto activity does not make every NPC follow the player merely because it notices them.

Urgency can seek an available extinguisher and approach/spray a fire, or seek an available weapon when threatened. It relies on objects and navigation already present. This does not add a new general-purpose combat planner or guarantee successful interaction with every furniture layout.

## Final performance pass

Rigid vehicle surfaces are batched per rigid parent; wheels, hinges, shifter, controls and lights remain separate. Original hit identity and triangle indices are preserved. Dents, material-color changes and hidden/detached parts invalidate the batches. Sleeping dead bodies skip ordinary pose work, with periodic support/gravity checks and wake conditions for grips, nearby hands and impacts. Empty restraint sets skip body-volume construction. Removed batches and streamed drawers clean up their references.

The existing lower Quest tree/bird populations, streamed cell limit, pose LOD, fixed light pool, adaptive foveation and throttled mirrors/portals remain in use. Read `FINAL-PERFORMANCE.md`: the final comparison is mixed, not proof of an overall speedup. **No sustained Quest 60/72 FPS claim is made.** The browser harness uses software rendering; hardware profiling remains required.

## Validation and integration

`H5-tests/checkpoint18-regression.cjs` runs the actual app and checks movement/sprint timing, jump edges, mattress pickup, drawers, lights, activity eligibility/bed pose, human and pet gait changes, ragdoll stability/hand pins and the sever/heal hair lifecycle. `batching-regression.cjs` tests ray identity, triangle routing, damage, hidden/detached geometry and cleanup with pinned Three.js. `final-stress.cjs` exercises the actual house-wall vehicle collision and then refreshes/render-checks the batches, alongside pet skin bounds, forest damage routing and bounded lighting/audio. `whole-project-profile.cjs` measures the real animation loop across Home, Car, City and Forest.

Raw evidence is in `H5-test-results/checkpoint18/`. Current source integrity resolves 331 relative imports across 167 ES modules. Browser runs are sequential. Existing older results are retained as history, not represented as fresh tests of this release.

New independent modules: `human5-sprint`, `human5-drawers`, `human5-ragdoll`, `human5-portable-lights`, `human5-activities`. The manifest lists every source change and cache-only replacement. Full project export is the authoritative integrated result.

Photo NPC Studio remains the separate Studio 2 source application from the preceding release. Its import bridge is preserved. This pass does not claim new photo/video reconstruction, a Windows EXE, new scanned assets, or improvements to every item in the historical wishlist.

---

# Human5 19.3.0 — final performance pass

12 September 2026. Features were integrated first, then a frozen pre-optimization copy was compared with the final performance changes. **Results are mixed. These runs do not establish sustained Quest 60/72 FPS or an overall speedup.**

## Test conditions

Actual engine animation loop; fixed Sustain tier; monoscopic 960×600 Chromium SwiftShader; simulated Quest user agent. Home, Car, City and Forest each record at least 64 frames. The two browser runs were sequential. These are single diagnostic runs, with unseeded NPC activity and cold shader/interior transitions. Active interiors differed between runs. They are not controlled hardware benchmarks or repeated statistical trials.

CPU work here includes synchronous renderer submission/blocking. Frame intervals under software rendering are not headset frame rates. The post-optimization profile uses the final performance code; the subsequent small ragdoll joint-limit adjustment affects dead bodies, which were not present in those living-NPC scenes. The final packaged code was then checked by the feature and collision regressions.

## Recorded frame work

Milliseconds, median / p95; lower is better.

| Location | Before final pass | After final pass |
|---|---:|---:|
| Home | 35.1 / 68.6 | 41.9 / 68.4 |
| Car | 49.2 / 107.9 | 54.5 / 90.2 |
| City | 62.8 / 109.7 | 61.5 / 280.6 |
| Forest | 41.3 / 100.1 | 34.9 / 65.7 |

Median CPU work improved in Forest and slightly in City; it increased in Home and Car. City p95 worsened substantially. Cold transitions, activity/interior differences and software rendering prevent attribution to a single optimization. These regressions are reported rather than hidden.

## Draw calls and resources

Draw calls are median / p95. Memory figures are object counts, not GPU bytes.

| Location | Calls before | Calls after | Geometries before → after | Textures before → after |
|---|---:|---:|---:|---:|
| Home | 317 / 412 | 315 / 406 | 698 → 650 | 73 → 73 |
| Car | 509 / 628 | 485 / 650 | 712 → 664 | 73 → 73 |
| City | 232 / 262 | 232 / 261 | 842 → 1051 | 118 → 118 |
| Forest | 92 / 117 | 92 / 114 | 841 → 1052 | 116 → 116 |

Median vehicle-view calls fell from 509 to 485 (about 4.7%), but p95 increased from 628 to 650. Home median calls changed only from 317 to 315. City and Forest medians were unchanged. City and Forest had more resident geometries after the pass; post-run city/forest snapshots included two/one active interiors versus zero before. All four snapshots stayed at nine resident cells. These snapshots do not constitute a long-session leak test.

## Changes retained

- Combine rigid vehicle surfaces per parent while keeping wheels, door/hood pivots, controls and lights independent. Preserve original ray-hit objects and face indices. Rebuild after dents, color changes, hidden components or detachments.
- Stop ordinary pose/contact work for sleeping corpses. Check support/gravity periodically and wake for impulses, grabs or nearby hands.
- Skip restraint body-volume work when there are no links; use a coarse vehicle ray rejection before collecting fine pickables.
- Reuse portable-light material lists and direct clock state. Reuse the existing two-point/one-spot pool; no additional per-vehicle shadow lights.
- Clean up detached batch roots and streamed drawer records. Preserve existing Quest population caps, streamed cells, distant pose rates, foveation and view/shadow refresh limits.

## Remaining costs

| Location | Actor work p50 / p95 (ms) | Render p50 / p95 (ms) | Peak frame work (ms) |
|---|---:|---:|---:|
| Home | 13.2 / 26.4 | 11.3 / 20.1 | 4482.1 |
| Car | 14.3 / 37.1 | 15.7 / 30.6 | 2844.2 |
| City | 19.2 / 39.2 | 14.1 / 42.3 | 4540.9 |
| Forest | 6.7 / 18.0 | 7.6 / 19.1 | 1398.2 |

The separate collision stress test broke 4 real house-wall sections and left finite vehicle motion (0.637 m/s), then refreshed batches and rendered successfully. Synchronous enter() took 0.4 ms, but the first mirror render took 201.4 ms versus 8.7 ms for the next one. A fast enter() call therefore does not establish that vehicle-entry hitching is solved.

Actor update time and shader/interior transition stalls remain concrete targets for device profiling. Further work should follow the headset CPU/GPU split rather than indiscriminately reducing texture or character quality.

## Verification

- 167 ES modules parsed; 331 local relative imports resolved.
- New control/interaction/lighting/activity/gait/ragdoll regression: no page or shader errors.
- Rigid-batch ray identity, original triangle routing, dents, hidden parts and detached-source cleanup: passed.
- Collision plus lighting caps, environment reuse, six pet rig bounds, forest LOD/damage mapping and audio pool: passed.
- Final real-animation-loop profile: all four locations completed; no page/shader errors; resident-cell cap held.

The ragdoll hand-pin test retained less than 1.5 mm maximum structural link error at the recorded final step. This is a numerical stability observation, not validation of human anatomy. Existing historical tests remain in the archive; they were not all rerun for this release.

## Quest follow-up procedure

1. Deploy the complete folder over HTTPS, reload the 19.3.0 modules and enter VR through the normal button. Record actual supported refresh rate and browser/device version.
2. Use the same route/settings with one Mira, default pets/population, day and night. Cover Home, Car, City and Forest; repeat vehicle entry, mirrors, wall impacts, close NPC handling and fire/wetness.
3. After 15 minutes of headset warm-up, export WORLD → PERFORMANCE reports at each location. Record target Hz, CPU/GPU p95 when GPU timing is available, delivered intervals, missed-frame fraction, tier, calls and resources. The report holds a rolling window of 720 samples; export separately for each location, not just once at the end.
4. Compare repeated routes on the same headset. At 72 Hz the frame budget is 13.89 ms; 60 Hz would be 16.67 ms. The runtime requests a refresh rate the session actually supports; JavaScript cannot force an unsupported rate or turn missed deadlines into real frames.
5. Diagnose whether CPU simulation, draw submission, fragment cost or transition compilation dominates before selecting another quality tradeoff. Keep central face detail where possible, using peripheral foveation, distant simulation and offscreen view frequency when their measured cost warrants it.

No physical Quest headset was available here, so the hardware acceptance step remains unverified.

## Raw evidence

- `H5-test-results/checkpoint18/pre-optimization/whole-application.json`
- `H5-test-results/checkpoint18/post-optimization/whole-application.json`
- `H5-test-results/checkpoint18/final-regression/report.json` and actual app captures
- `H5-test-results/checkpoint18/collision-stress/report.json`
- `H5-test-results/checkpoint18/source/source-integrity.json`

Earlier 19.1 measurements are preserved in `FINAL-PERFORMANCE-19_1-HISTORY.md`.
