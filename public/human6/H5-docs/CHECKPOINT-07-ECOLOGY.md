# Human5 17.3 — Ecology, fishing and city activity

This checkpoint extends saved Checkpoint 06. It is a working procedural implementation; the rendered scene is not yet at the requested commercial-game art quality. No Quest hardware frame rate is claimed.

## Integration and controls

The full project ZIP is directly runnable with its original relative assets. Retain the pinned Three.js 0.170 import map. The module ZIP contains all 34 modules, scripts, prior research, tests and source manifests. From 17.2:

```sh
python integration/apply-ecology.py /path/to/17.2/human5 /path/to/new/17.3/human5
```

From the original upload use `apply-all-upgrades.py`. Scripts require a fresh destination, verify source anchors, and normalize local cache queries to 17.3.0. `H5-ECOLOGY.patch` and its SHA-256 manifest describe host changes.

PLAY → NATURE equips the fishing rod, restores selected NPC hair and toggles city activity. Hold the trigger while swinging the rod, release to cast, then push the holding-hand stick forward to reel. Desktop: mouse trigger and R to reel. Bait is automatic. A moving sharp weapon trims nearby grass and hair. Regrow resets the selected hairstyle's cuts.

## Implemented

- Seeded mixed grass clumps with geometric blade segments, height/color variation and wind. Nearby cutting shortens the actual instances. A bounded cut-height map survives cell streaming and region save/restore. Near-field budget: 1,700 Quest grass clumps, depending on eligible terrain. Ferns, stones and small flowers populate at most nine resident cells.
- Grass burns as a bounded patch through the shared fire system; weather wets the fuel. This is patch-level burning, not a separate physical simulation for every blade. Protected house/city parcels, water and roads exclude tall meadow grass.
- Both the new guide-based Mira hair and the host hair mesh accept spatial blade cuts. Triangle removal shortens the visible geometry; roots are preserved. Regrow restores original indices. Hair cuts remain in the session and are not yet included in durable NPC profiles.
- Thirty-six instanced birds on the Quest path, with separation/alignment/cohesion steering, wing beats, banking, height avoidance and nearby tree feeders. Birds can land, feed and flee an approaching player. Feeders are procedural and do not yet have a refillable food inventory.
- A grabbable fishing rod with guides, reel, float, hook, bait and visible line. Charged release and controller-tip motion determine a ballistic cast. Water fish can bite; reeling changes line length/tension. Successful catches become grabbable fish. Rod bending and fluid/line forces are simplified.
- Twenty-four virtual pedestrians and ten virtual traffic cars traverse the road graph. Nearby records become normal full NPCs and physical cars: at most two of each on the Quest path, within the overall NPC limit. Distant representations are simplified proxies. Pedestrians wear varied suits and use the existing body/gait/interaction system.
- Traffic uses lane offsets, following distances, player avoidance, intersection reservations and timed signals. Nearby cars use the same automatic drivetrain, collision damage and suspension as player cars. Damaged car shape and mechanical state persist across session streaming. Car sound sources are disposed on retirement and attenuated with distance.
- A new rural road branches toward the river. At rural stops, programmed drivers can park and spawn an NPC for fishing or a picnic. These outing branches are implemented but were not exercised in the browser regression. Traffic drivers are represented by records; an animated seated driver mesh is not yet shown inside each moving car.
- Road center markings, nearby signal poles and traffic heads. This is a bounded gameplay traffic model, not a complete traffic simulator or full four-way signal installation at every junction.

## Persistence and remaining work

Terrain, tree edits, weather and grass cuts are included in region save/restore. NPCs, haircuts, full furniture state and traffic are not yet a complete cross-session world save. Traffic and hair changes survive their documented session lifecycle only. Held/follower actors and player-entered cars are retained when their original ambient record would otherwise retire.

The next group includes character defaults/deletion and tissue refinements, weapon models/launchers/spells/scope/portal fixes, mirrors/showers/wetness, and the starting-house basement with playable arcade adapter and physical crate latch. A whole-project quality pass and final performance measurements follow. The separate laptop photo-to-NPC app begins after the final game checkpoint is saved.
