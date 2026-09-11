# Human5 17.8 — integrated game release

This complete export includes all saved module groups through character checkpoint 11 and two additional application performance passes. It is ready to serve from its `human5/` folder. The separate photo/video NPC creator is a subsequent, separate deliverable.

## Latest play-feedback corrections

- Car/house impacts no longer pass a missing point into the wall decal code. Collision samples cover two heights, fracture work is capped per frame, and absorbed impact energy slows the vehicle. The repeated actual Willow-house collision test broke four wall cells without an exception. Vehicle damage and handling degradation remain integrated.
- Default car cabin and mirror views are prepared during initial loading. Quest rear-view mirrors use a stable 256×128 target, a quality-dependent 32–55 m range and reduced update frequency; tiny grass/understory and bird meshes are omitted from this small mirror only. Main-view ecology, collision and simulation are retained. First-view stalls still occur in the workstation software renderer; this is not a claim that entry latency is eliminated.
- Mira's replacement groom uses straight guided shoulder-length cards over a continuous fitted crown/underlayer, with a small natural part, flexible tips, cutting/regrowth and wetness. It replaces the rejected separated, corrugated locks. It remains a procedural game groom, below the quality of an authored strand groom.
- Character defaults set the requested shape/material/contact sliders near 75% and maximum hair flexibility. Local conforming mesh refinement supplies anatomical silhouette detail; blended pigment and subtle relief avoid a separate pasted-on surface. Supported tissue settles under gravity, reverses with gravity and responds to water density. Tests measure about 16.5 mm breast-cage and 3.1 mm glute-cage downward displacement in the default pose; these are game parameters, not clinical calibration.
- Corrected face landmark locations, eye/tearline geometry and expression balance improve the old result. **The current face still does not reproduce the reference identity photographically.** No scanned or authored 4K identity texture set is included.

## Integrated feature groups

The earlier checkpoint notes describe controls and detailed limits. This full folder includes them all:

- Five distinct furnished 1–3 bedroom houses beside the city; fabrics, patterned couches, tearing shells/exposed flammable stuffing, mattresses, opened pet-food bags, knitted/cuttable rugs and shallow carpet pile.
- Glass-bulb fixtures, bounded dynamic lighting, held/tipped torch contact and flame spread, extinguishing and environmental tissue/wetness response.
- Streamed 2.1 km region with trails/rural roads, forest/understory/cuttable grass, rivers/lake, mountains/volcano, twelve irregular city blocks and 3–7-floor apartment/office buildings, elevator/stairs, restaurant and furnished penthouse.
- Weather menu, enemy/pedestrian roles, shared NPC armor/protection/follower controls, pets with jaw grips, traffic/pedestrian budgets, fishing and flock/feeders.
- Dedicated weapon/tool and vehicle-spawn tabs; sedan, truck, sports car, motorcycle and monster truck; suspension/automatic shifting/damage; scopes, launchers, bounded mushroom-cloud effects, spells and single-level visible portals.
- Working shower dial, steam, pane condensation and local hand wiping, bathroom mirrors, wet skin/hair/clothes; starting-house basement stairs, playable canvas arcade adapter/demo and exterior-latched dog crate.
- Selected-NPC X deletion, locomotion release/drift fixes, furniture sleep, attached sink hardware and retained microphone permission/capture diagnostics on XR entry.

These are integrated procedural gameplay implementations. Vehicle/weapon architecture is not an asset-quality equivalent of GTA or CS:GO. A city traffic record does not include a fully animated visible driver, and distant population uses proxies. World persistence is not yet a complete save of every NPC, clothing, haircut and furniture state. The imported project contains no full conversation server: speech recognition and TTS can operate locally, but unrestricted conversational replies still depend on the host's configured dialogue backend.

## Performance and testing

Read `FINAL-PERFORMANCE.md` and the saved JSON reports. The first pass reduces simulation work; the second tests the real animation/render loop, vehicle entry and streaming. Changes include adaptive detail, contact cadence, cached fire membership, distant hair/cloth LOD, sleeping furniture, reduced redundant facial morph atlases and removal of legacy CPU seam diffusion where the new skin shader already owns seam treatment. A slow rendered frame no longer resets all NPC and furniture physics.

The available browser uses Chromium/SwiftShader, a simulated Quest user agent and a 960×600 monoscopic viewport. **It is not Quest hardware or immersive stereo. Sustained Quest 60/72 FPS is not verified or guaranteed.** The app requests a supported refresh rate, uses foveation and records long frames rather than hiding them. Use `QUEST-TEST-PROTOCOL.md` and export an on-headset report for the next hardware-specific optimization cycle.

## Run and integrate

1. Extract the complete ZIP, preserving the `human5/` directory and relative assets.
2. Desktop: serve its parent directory with `python -m http.server 8000`; open `http://localhost:8000/human5/`. Quest: use an HTTPS origin. A plain laptop LAN HTTP address will not provide secure-context microphone/WebXR access.
3. Keep the pinned Three.js 0.170.0 import map. Initial scene preparation and first speech-model download can take time.
4. `?debug` exposes the actual systems as `window.human2`. Desktop settings provide NPC profile import/export and performance report export. The menu's Weapons/Tools and Vehicles tabs contain equipment and drivable spawns.
5. Module ZIP: `python integration/apply-delta.py PATH_TO_17_7 NEW_OUTPUT` applies the checked final delta. `apply-all-upgrades.py ORIGINAL_COMPLETE_PROJECT NEW_OUTPUT` replays the entire chain. Inputs are checksum-checked and never overwritten. The full project ZIP is already integrated; it does not require Grok to merge modules.

Tests are source and browser regressions, not a substitute for a headset playtest. Original input assets and their licensing remain the project owner's responsibility; this release does not grant new rights to third-party assets.

The final character visual check also caught simultaneous legacy/new hair immediately after NPC-profile import. The replacement now hides the old mesh at installation, before the next animation frame.
The final crown was also fitted against the source head surface to prevent the forehead from protruding through it. This last geometry-coordinate correction does not add draws or vertices.
