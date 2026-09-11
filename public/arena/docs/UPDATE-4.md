# NetKnight WebVR 4.0 — Obsidian arsenal update

This update keeps the existing arena, controls, progression, companions and original media, and implements the requested combat, presentation and performance changes.

## Combat and creatures

| System | Version 4 behavior |
|---|---|
| Player sword | Black obsidian blade, silver bevels, angular red inscriptions on both faces, dark gauntlet and silver fittings. Reach is 1.63 units. |
| Player laser | Red energy sheath around a pale core. Charges at the sword tip. Contacts emit fire, smoke, scorching and nearby red light. Golden power retains gold coloration. |
| Dark Knight | Larger mech silhouette, layered armor, helmet horns, reactor, hydraulic details, shield and articulated obsidian sword. Purple laser charges for 1.35 seconds, then fires for 1.65 seconds. The beam uses the actual sword-tip pose. Original transformation, mercy and warp rules remain. |
| Hover-camel | Health increases from 28 to 100. |
| Hydra | The first head starts at 60 HP. Each death multiplies that nest’s head health by 1.2 and schedules two heads for exactly 10 seconds later. Living heads keep their percentage of remaining health. |
| Hydra nest | With all heads dead, the 240-HP nest is vulnerable. Destroying it cancels regrowth permanently, removes the iris and collar, and leaves an open, irregular hole. The three nests are independent. |

Example head-health progression is **60 → 72 → 86.4 → 103.68**. New heads use the nest’s current health when they emerge. There is no eight-head ceiling. Dense groups reduce neck tessellation while retaining every head and its connected neck.

## World destruction and screens

Each breach creates six curved shell fragments at the damaged surface. Their texture coordinates retain the original wall location and orientation even as the fragments move. They have 42 HP, collide with the player, can be shot or lassoed, and drift without gravity or free-flight damping. Contact changes their motion. They are gameplay platforms, separate from short-lived cosmetic shards.

Damage contours combine several irregular lobes and tears. The same contour drives the visible wall mask and collision. Scorched rims expose the damaged material. Saving and loading preserves the contours, source-mapped fragments and nest regrowth deadlines. Ordinary wall breaches still require four contacts.

Each TV has its own reaction state. Characters wave at a player within 6.5 units on the screen’s front side; cars flash/beep and boats sound a horn. Incoming-projectile prediction checks trajectory, screen bounds and intervening arena walls up to 1.35 seconds ahead. Occupants run toward the edges over 0.7 seconds and become completely hidden. They stay hidden while a threat is present, then wait 2.8 seconds before returning. Misses and receding shots do not trigger evacuation. Shared animation frames keep these independent reactions inexpensive.

## Additional graphics realism pass

Reviewed the actual sword/mech meshes, Unity-derived wall palettes and screen animation canvases. Increased separation between the Knight’s armor and silver fittings, added hydraulic details, restored distinct interior pattern families instead of making every sector a checker, and added broadcast bands in the tunnels. The hub’s violet checker, teal cells, green circuitry, yellow/black hazard pattern, carbon, ice and rust families follow `NkTex`’s interior variants.

Replaced simple explosion rings with expanding turbulent fire clouds, drifting smoke, sparks and brief impact lighting. Contact fire follows moving targets. Laser sheaths, pale cores and impact lights provide depth without a full-screen bloom pass. Procedural fire/smoke textures were refined after inspecting their generated canvases. Smoke sorts back to front; fire uses additive blending. Two lights are reused and cast no shadows; the Performance preset disables their contribution.

The cannon charge now drives a continuous multi-oscillator hum: bass pitch, upper whine, filter cutoff, noise and level all rise with charge, and fade immediately on release or pause. Five synthesized digital impact sizes supplement the original recordings. Larger impacts have a longer, lower body and greater level. Important explosion sounds can take a voice from a quieter effect when the pool is full.

`previews/upgrade-model-review.png` is a CPU projection of the real model geometry. `upgrade-texture-review.png` and `explosion-atlas-review.png` show actual texture canvases. These are asset reviews, **not GPU screenshots**.

## Additional performance pass

- Long rays traverse the cells along their path instead of checking the whole enclosing box. Short projectile sweeps retain the cheaper box lookup.
- All visible TV faces use one instance batch. Only visible reaction tiles are redrawn, at approximately 8 Hz balanced or 5.6 Hz performance; paused scenes do not repaint unchanged tiles.
- Hull fragments share a batch and shader per source surface, while retaining individual source coordinates, current pose and collision.
- Dense/distant hydras use eight neck segments instead of 16–20. Neck capacity grows to keep every visible head connected.
- Fire/smoke share 256 reusable records, with 128 instances available per visual layer. Scorches have 48 slots. Smoke sorting, emission rates, event distance and short flash lifetimes bound the added work.
- Effect attachments cache target references, and batch growth preserves already-written instance transforms. Reused projectiles clear old charge/color/range fields.

Measured on the build host, using the same 1,800 long rays three times for each implementation:

| Measurement | Enclosing-box lookup | Cell traversal |
|---|---:|---:|
| Average complete ray workload | 76.91 ms | 28.43 ms |
| Candidate entities examined | 65,014 | 29,537 |

This workload ran **2.71× faster**, with **54.6% fewer candidates** and identical nearest-hit results for every ray. A separate 128-projectile screen-prediction workload measured 0.464 ms median and 1.011 ms at the 95th percentile per prediction update. These are CPU measurements from this host, **not Quest frame-rate measurements**. Raw results are in `validation/upgrade-performance.json`.

A 720-second AI/physics simulation, run after the feature changes and before the final ray traversal optimization, completed 43,200 steps with finite positions. It peaked at 1,157 entities and 119 projectiles. The recorded median was 1.437 ms per simulation step, p95 7.821 ms, p99 13.33 ms, and the largest host outlier 241.38 ms. See `validation/cpu-benchmark.json`; this scenario does not measure rendered frames.

## Validation boundary

42 automated checks cover retained game systems and the new hydra timing/health, nest permanence, save migration, screen greetings/evacuation, red laser contacts, mech blade/beam alignment, curved fragment collision/drift/destruction, effect bounds, dense hydra necks, mask/collision agreement and generated audio. The app lifecycle test covers desktop and simulated XR start, input, pause, saving/loading and exit.

**GPU rendering, shader execution, headset audio, tracking and physical Quest 3 performance remain unverified here.** The lifecycle suite uses renderer/XR adapters. The ZIP contains a complete static website and source, ready for hosting and a real Quest check. HTTPS, the VR button and hosting instructions remain included.
