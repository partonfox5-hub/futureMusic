# Human6 20.1.0 — expansion build

This archive contains the complete runnable project. Serve the `human6` directory
with an HTTP server for desktop development, or HTTPS for Quest Browser/WebXR.
The entry point is `index.html`. Three.js remains pinned to 0.170.0 through the
existing import map. No build step or new package dependency is required.

See `RESUME-20.1.0.md` for the vehicle/torch fixes, persistent building destruction, roof flight collision and further pet/material work.

## Gameplay additions

- Infantry: weapon-handle attachment to the palm, two-arm aiming IK, muzzle-origin
  shots, line-of-sight obstruction, mobile bursts, flanking, shared target reports,
  suppression/cover choices, and existing magazine/reload behavior.
- Separate firearm accuracy, coordination, and melee skill controls (0–100%).
  Accuracy controls an accurate aiming attempt, not a guaranteed hit through cover.
- Melee: guard, readable windup, strike, recovery, stamina, circling/backsteps,
  weapon blocking/parries and counter windows. Existing player swing damage remains.
- Cached procedural weapon/impact sounds with distinct crack, body, mechanism,
  distance attenuation, stereo position, and material-sensitive impacts.
- Procedural spores: variable joint chains and limb forms, later limb growth,
  independently damaged limbs, rare woodland spawns from 19:00–05:00, and a cap of
  three live spores on Quest. Inspired by the supplied horde reference project.
- Wild horses and elephants with saddles, animated legs/head/tail/trunk, mounting,
  left auto-gripped reins, optional second rein hand, and a free right weapon hand.
- Self-replicating creeper fluid and source-fed lava simulate across the region;
  visible fluid instances stay local. The existing volcano now has an eruption
  action and timed lava sources. The Powers page also manages three procedural dragons.
- Flight, boost, high-speed landing shockwaves/craters, and targeted orbital strikes.
- Named map markers, player position, waypoints, colored territories, group creation,
  selected-NPC assignment, leadership, symmetric peace/war relations, and orders.
  Capture takes 25 seconds, accelerates with allies, and pauses when contested.
  Peaceful visitors cannot capture another group's territory.

## Larger region

The region is **4,224 × 4,224 metres**. Roads and trails connect the existing home
area to the new places. Most trips between nearby destinations are several hundred
metres: minutes on foot and shorter rides. Buildings use five footprints: cottage,
longhouse, L-shaped lodge, cross hall, and courtyard home.

| Settlement | Type | Style | Buildings | Map coordinates (x, z) |
|---|---|---|---:|---|
| Timberfall | Town | Timber frame | 12 | -560, -80 |
| Red Mesa | Town | Adobe | 10 | 520, 270 |
| Frostbridge | Town | Nordic timber | 14 | -610, -780 |
| Reedwater | Town | Thatch | 10 | -410, 670 |
| Civic City | City | Existing modern/brick city | 12 | 204, 40 |
| Sunspire | City | Mediterranean | 16 | 1190, 490 |

Additional named places: Echo Cave, Ember Cave, Mosslight Cave; Ancient Grove,
Silver Grove, Blossom Grove; Temple of Dawn; Eastwatch Fort, Lakewatch Fort;
and High Crown Fortress. All appear on the map and travel menu.

Distant buildings use instanced silhouettes. At most four new detailed buildings
or landmarks reside at once on Quest (seven on desktop); collision and interiors
stream together. Existing city/terrain streaming remains in use. Interiors include
open doorways, windows, and basic furnishings. These are procedural environments;
they are not hand-authored Skyrim/Fallout-quality art or quest content.

## Controls

| Action | Quest controllers | Desktop |
|---|---|---|
| Menu | Y / existing wrist menu | Existing panels |
| Combat percentages | Play → Combat, ±5% | Expansion sliders, 1% steps |
| Assign/lead groups | Play → Groups, select group and NPC | Group dropdown and assignment button |
| Mount/dismount | Grip saddle, or Mounts page; hold grip near saddle to dismount | E, same interaction as car |
| Ride | Push reins forward to go; pull back to brake; move sideways to steer | W/S and A/D |
| Second rein hand | Grip near left rein with an empty right hand | Not required |
| Mounted weapon | Right hand retains normal weapon grip/trigger | Normal weapon controls |
| Take off | Both controllers above head, then press Jump (right A) | F |
| Fly | Left stick forward/strafe; right stick X turn, Y altitude | WASD; Space up, C down |
| Flight boost | Left stick press | Left Shift |
| Land | Powers → Land now, or descend onto terrain | F, or descend with C |
| Orbital strike | Powers → Orbital; aim and trigger | Arm strike, then point/click; Escape cancels |
| Volcano/fluids | Powers → Dragons / powers | Expansion panel |
| Physical map | World → Map → Unfold; grip right edge and spread hands | M toggles minimap |
| Stow map | Map page → Stow | M |
| Waypoint | Map page → select territory → Mark | Click minimap |
| Capture territory | Enter with your group, or command Capture | Same |

Flight boost replaces the previous ground sprint boost. Raising hands alone does
not start flight: the jump-button edge is also required. The map requires a free
left hand; mount reins and flight take precedence. It is a hinged paper surface in
VR, with a live player marker, rather than a head-attached minimap.

## Visual corrections

Dog/cat surfaces now receive anatomical refinement, revised eyes, facial pads,
whiskers, coat shading, and distance-controlled guard-hair detail. Version 20.0.1
shortens cat lower legs with matching skin/bind updates, fills out the British
Shorthair torso, corrects scaled tail constraints, seats pupils above their irises,
and replaces three speckled coat shells with one area-sampled silhouette groom. These
remain procedural skinned models; close-up coat/eye appearance needs headset art
review and should not be described as photorealistic scanned animals.

Removed residual chest microdetail/roughness contributions that could create an
extra areola-like feature on Mira. Disabled the legacy floppy noodle's automatic
outdoor appearance—the likely cul-de-sac squiggle. It remains in the living room.
The Quest bird count is reduced from 18 to 9; desktop from 48 to 24.

## Optimization and verification

See `H6-tests/VALIDATION.md` and the included JSON evidence for measured scope.
The build has NOT been tested on physical Quest 3 hardware. No 72 Hz claim, no
"zero performance loss" claim, and no achieved Home/Car draw-budget claim is made.

Implemented: per-house destructible wall instancing with original damage/pick
ownership; static/window/wheel batching with per-vertex color, roughness, metalness and
emission; wheel batches under their rolling pivots; replacement-geometry detection
for upgraded food bags; pooled vectors/quaternions in pet foot IK; merged road ribbons; a 64-slot instanced
tracer pool; bounded wildlife/effect counts; 10/20/30 Hz distant actor simulation;
local terrain/interior residency; distant small-detail culling; lazily sampled fluid heights and budgeted fluid
work; pooled vectors in new continuous movement/render paths; default framebuffer
scale 1.0; foveation profiles 0.67/0.8/1.0. The existing single directional shadow
light remains; pooled point/spot fixtures do not cast shadow cubes.

An optional WebXR compositor quad presents the existing menu canvas. Unsupported
or rejected Layers APIs fall back to the mesh menu. The physical map retains its
hinges and world depth. Dynamic weather/sky and in-world displays remain in the
scene; Mira remains a normal 3D actor. KTX2/Basis texture conversion is not included.
Legacy simulation modules still contain transient allocations; this is not a
claim of zero allocations throughout the inherited engine.

Quest captures: stand at Home, in/near Car, and close to Mira; use Play → Combat →
LOG buttons or desktop "Quest performance captures." Record each for 12 seconds,
then Export performance report. Reports contain calls, CPU sections, frame
intervals, GPU timing when available, graphics renderer, and XR validity. Use
these headset records to distinguish draw-call pressure from fill/CPU work before
changing quality. Compositor menu support has a toggle in the profiling panel.

Reference APIs: [WebXR Layers](https://www.w3.org/TR/webxrlayers-1/),
[Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html).

World saves include groups, diplomacy, territory ownership, and fluids alongside
existing terrain/tree state. Use the existing scene/NPC save for character assets;
group roster restoration matches saved actors. Procedural wildlife repopulates on
scene changes. Very large floods slow their simulation rate to keep per-frame work
bounded. Craters do not excavate protected house/road/landmark foundations.
