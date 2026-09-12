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
