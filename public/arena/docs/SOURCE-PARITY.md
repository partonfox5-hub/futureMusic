# Source comparison — updated for version 4

Source of truth: `net knight.zip`, Unity editor version **6000.5.10f1**, the C# under `Assets/NetKnight/Scripts`. The earlier small web demo is not the game implementation used by this port. Random placement is generated again from a saved JavaScript seed; it does not reproduce Unity's random-number stream.

## Map data

| Sphere | Center (x, y, z) | Radius |
|---|---|---:|
| Studio Hub | 0, 0, 0 | 45 |
| Knight Sector | 0, 8, 100 | 30 |
| Copper Network | 82, 20, 38 | 31.25 |
| Violet Array | -76, -24, 48 | 30 |
| Deep Relay | 48, -28, 118 | 27.5 |
| High Broadcast | -55, 42, 95 | 28.75 |
| Outer Circuit | 98, -12, -40 | 30 |
| Back Channel | -18, 22, -92 | 27.5 |

Using zero-based sphere indices, the eleven source links are `0–1, 0–2, 0–3, 0–6, 0–7, 1–4, 1–5, 2–4, 3–5, 6–7, 2–6`. Main tubes have radius 3.4. Side chambers branch from `0–1, 0–2, 1–4, 0–7`; their nominal size is 16 units. The lava plane is at y = −83.5, computed from the lowest sphere bottom minus 28.

Portal clearance is slightly enlarged to avoid seams between the analytic collision surface and the rendered wall mask. Wall openings use alpha-cut masks derived from the same directions/radii as collision. Sphere tessellation and decorative surfaces are rebuilt for the web.

## Active systems and their web implementations

| Unity system | Web implementation / retained behavior |
|---|---|
| `NkWorld` | All eight centers/radii, eleven main tunnels, four branch chambers; interior/exterior travel, hatches, lava, platforms, fragment belts, healing wells, damage openings and hydra nests. |
| `NkPlayer`, `NkInput` | Zero-gravity acceleration/braking, strafe, climb, turning, boost and wall kick. Head-yaw movement; snap or smooth turns. Right-stick climb uses world up for headset comfort. |
| `NkWeapons` | Tap/release plasma; charged plasma; held sword laser with finite fuel/cooldown; physical swing hits and bolt blocking; force pulse; multi-target lasso; drawn plasma. |
| `NkPlasma` | Drawn strokes become solid, movable, destructible capsule chains. Their lifetime scales with power. Continuous sweeps keep fast projectiles/player motion from skipping thin strokes. |
| `NkCombat`, `NkLoot` | Heart-first damage; power overflow damage; pickup power/score growth; regeneration to the collected peak; crates, barrels, pads, healing wells, missile pickups, gold blimp, hull fragments. Friendly shots do not injure pets. |
| `NkDrones` | All seven variants. Tough blue drones, green/red firing/movement differences, yellow shields, grey blinking, purple/missile dashes and missile-drone rockets. Hover-camel beam and trilobite flank/charge/retreat states are present. |
| `NkDarkKnight` | Dark Knight spawn, new mech/sword/purple-laser presentation, attacks, mercy, damage-triggered warp, White Knight transformation, and continuing White Knight hunt. Behavior history influences aggression/attack spacing. |
| `NkLemur` | Hull-clinging owl-lemurs and seeking rockets; migration toward the player's sector through the connection graph. |
| `NkHornet` | Exterior gunship packs, rotor/leg animation, paired fire and seeking rockets. |
| `NkHydraNest`, `NkHydraHead`, `NkHydraKennel` | Three timed nests; doors remain open once awakened; user-requested 60-HP initial head, two-head regrowth and compounded health; bite, plasma and beam attacks; crate swallowing; kennel vulnerability after heads die; permanent nest destruction. |
| `NkDecor`, `NkWindow` | Rare pet cages, cage cries/shaking; scrolling, breakable ring segments; five animated broadcast scene types with independent greetings, horns, incoming-shot detection and off-screen evacuation; damaged-screen cracks. |
| `NkStore`, `NkPet`, `NkMissile` | Eight pets with their distinct attack patterns; two seeking missiles in flight, 100 stored; optional restoration of the source's dormant coin shop. |
| `NkSave`, `NkBrain` | Browser saves, export/import, top ten scores, recent behavior history. Saves also retain generated world damage and entities. |
| `NkIntro`, `NkSplash`, `NkCredit` | Original comic/tutorial text and images and credits are available from the story menu. The timed, two-host Unity stage is presented as replayable panels in this version. |
| `NkSfx`, `NkBgm` | All 43 supplied WAVs and five music tracks retained. Spatial voice pooling, master limiting, new mouth-charge and species chirps, user sound controls. |
| `NkGfx`, `NkTex`, `NkQuestVisuals` | New procedural geometry, paneled materials, environment reflections, emissive trim, batching, distance detail and headset graphics settings. |
| `NkHud`, `NkMenu` | Desktop interface and ray-selectable headset menu; live hull/power/ammo/laser status, map/navigation, settings, saves and scores. |

## Source values checked explicitly

- Start: **20 hearts, 1000 energy**. Power multiplier `clamp(1 + (energy − 1000) × .001, .2, 4)`.
- No passive power drain and no plasma ammunition cost. Regeneration begins 4.5 seconds after damage, at 4 energy/second, up to the highest collected energy.
- Plasma full-charge time **7.170193 / power** seconds; tap damage **2.2 × power**, fully charged direct damage **48 × power**, before the enemy attack multiplier of 1.15. Full blast radius **13.5 × power**.
- Sword laser wind-up **1.50574 / power** seconds, **10 seconds fuel**, **8 / power** seconds recharge. Release retains unspent fuel. Range **55.2 × power**.
- Force pulse cooldown **3.2 seconds**, base radius **9.05**.
- Knight at **30 seconds**; hover-camel at **84**; trilobite at **116**; first drone rift at about **120**; hornet schedule starts after **480**, with the initial delay leading to about **488**.
- Dark Knight **100 HP**, White Knight **200 HP**. A defeated White Knight returns with **110 HP** and warps.
- Hydras in sectors 0/1/2 at **18 / 40 / 72 seconds**, **20 HP per head** and up to **8 heads** in Unity. **Version 4 overrides those two values** with 60 initial HP, +20% compounded per death and two replacements per death after 10 seconds. **240 HP kennels** remain vulnerable only with no living heads.
- Gold blimp has an **8-second collection lock** and grants **42 seconds** of golden power. It is a pickup, not an enemy.
- Fragment belts: **72 glyphs at the hub**, **22 at each other sphere**, **226 total**. Four randomly chosen healing spheres plus the hub if needed; well radii **10.8 hub / 8.4 elsewhere**.
- Cage placement attempts have **42% probability**, with one to three cages when successful. Cage HP is **22**. Eight pet types retain their source names and power values.

## Deliberate changes and practical limits

This is a new simulation rather than the Unity engine running in a browser. Rigid-body dynamics, collision shapes, steering, exact attack trajectories, debris and procedural prop layouts are approximations of the source behavior. Small recoil/attack animations and hydra neck motion are newly authored. The requested visible hydra mouth-charge phase is new.

The source's coin booth creation is commented out and loot converts coins to extra power fragments. The default follows that behavior. The optional next-run shop mode adds coin drops while keeping power fragments, then uses the source shop's items/prices. It is an explicit extra mode.

The original README advertises some stale controls and timings. Active code is used: Y controls the HUD; camel/trilobite timings are 84/116 seconds. The WebXR pause combination is left grip + X because the headset's system menu is not exposed as a game button. No separate staff weapon is equipped by the active `NkWeapons` path; the unused `NkStaff.cs` is retained as source reference, not advertised as an extra player weapon.

Rare-cage placement and supply replenishment retain their roles, with a bounded clustered web implementation rather than Unity's exact random sequence. Window content uses shared animation frames selected by each screen’s independent world-space reaction state. Tiny occupants move into the hidden frame after 0.7 seconds of evacuation and remain hidden while a threat persists, plus a 2.8-second safety interval. The original two-host stage choreography remains replaced by replayable story panels. Damage openings use a consistent four-hit threshold instead of the source's varying small random threshold. Player/foe collision volumes are analytic rather than every authored mesh triangle.

Visual effects and projectiles use finite pools. Gameplay projectiles are limited to 256 simultaneously, plasma drawing to eight strokes of 96 points, spark particles to 384, cosmetic shards to 96, volumetric-looking fire/smoke sprites to 256 combined, and contact scorch emitters to 48. Curved gameplay hull fragments are separate persistent entities and are not removed by the cosmetic shard budget. Dense hydra scenes reduce neck tessellation, rather than truncating head counts. Distant enemies use less frequent decisions; nearby movement/combat retains fixed simulation steps. Scores saturate at JavaScript's safe integer limit to preserve valid save data. These constraints keep resource growth manageable; they are not a claim of measured Quest frame rate.

## Requested version 4 deviations

Player sword reach is 1.63 units, matching the Unity model more closely than the previous 1.15-unit web sword. The standard laser is red; golden power retains its gold laser. Camel health is 100. The Knight now uses a 1.35-second purple charge and a 1.65-second beam, with slower movement while aiming; its original health, transformation, mercy and warp rules remain. Beam origin and visible sword articulation share the same pose calculation.

The first hydra head is 60 HP. Each death multiplies that nest’s head health by 1.2, scales living heads’ remaining health by the same ratio, and queues two new heads at the death time plus 10 seconds. The nest can be destroyed during the interval when no head is alive. Destroying it clears all queued heads, removes the iris/collar, and cuts a permanent irregular passage. Other nests have independent health and timers.

Damage holes use deterministic, irregular radial profiles in both texture masks and collision. Breaches release six curved shell fragments. Each fragment samples the original surface using its original position and orientation while moving independently; this is curved shell geometry, not a whole sphere. Fragment HP is 42. Gravity and free-flight damping are absent; contact, weapons and lasso can change their motion. Ordinary breach formation still takes four wall contacts.
