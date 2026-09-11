# Human5 18.0 — checkpoint 14

This is the complete integrated web project, based on the saved 17.8/17.9 game checkpoints. Use this folder as a complete replacement, or use the matching module overlay for an existing 17.8 installation. This is an incremental procedural-art and interaction release; it does not claim photographic character likeness or GTA-quality assets.

## Start and controls

Extract the ZIP. Serve the directory containing `human5/` and open `/human5/index.html`. For desktop development, `python -m http.server 8000` from that parent directory serves `http://localhost:8000/human5/index.html`. Quest should use your existing HTTPS host. Opening the HTML directly as a local file will not load the module graph correctly. No application build step is required; Three.js remains pinned to 0.170.0 through the existing import map. Browser cache query versions are consistently 18.0.0.

| Feature | Control |
|---|---|
| Pets | VR menu → PLAY → PETS → Breed to spawn → SPAWN PET. Remove a selected pet to free one of four active slots. |
| Seasons | VR menu → WORLD → TRAVEL → Tree season: spring, summer, autumn, winter. |
| Clothing rack | Point/trigger or click the rack's PREV/NEXT controls, then drag the actual garment-shaped display to an NPC. Six visible garments per page. |
| Cash pile | VR menu → GEAR → WEAPONS / TOOLS → TOOLS → SPAWN CASH PILE. It creates three bundles. |
| Cash bundle in hand | Choose “Bundle of $100 bills” in Tools while EQUIP IN HAND is selected. |
| Cut cash bands | Sweep a knife/sword through the bundle. A slow deliberate blade sweep can cut it. This uses the existing melee hit path. |
| Individual bills | Set CASH GRIP: ONE BILL, reach within 15 cm, squeeze grip. Release grip to drop or throw. |
| Throw a handful | Set CASH GRIP: HANDFUL; one grip gathers up to 12 nearby loose bills. Move the hand, then release grip. |
| Clear cash | Tools → CLEAR UNHELD SPAWNS clears loose notes and unheld spawned bundles. Desktop also has a Cash bundles section with explicit controls. |
| Desktop cash | Click a loose bill within 3 m to pick it up; Q releases it. The Cash bundles section changes grip mode. |
| Performance report | VR menu → WORLD → PERFORMANCE → EXPORT PERFORMANCE REPORT. |

## Included changes

**Pets.** Labrador Retriever, Beagle and German Shepherd; British Shorthair, Siamese and Maine Coon. Each has a connected baked surface, distinct proportions and coat pattern, ears, muzzle, eyes, tail volume and gameplay parameters. The existing 28-bone skeleton, joint animation, needs, petting, jaw interaction, bites and dynamic object mouth grips remain connected. Mesh generation happens offline; spawning decodes cached geometry. Fur uses one opaque surface with filtered fiber detail, a subtle normal map, wetness response and a short touch ripple. Pet intermediate pose calculations update bones instead of repeatedly traversing all visible meshes; conservative deformation bounds permit offscreen culling.

**Pet audio.** Thirteen short recorded clips cover barks, whines, growls, meows and purrs. A shared positional player limits output to three voices, queues at most six, applies cooldowns and avoids consecutive reuse of the same clip. Breeds share the underlying recordings with modest pitch changes. Clips are mono 24 kHz, approximately 215 KB combined. `assets/pets/sources.json` identifies original CC0 recordings, source pages and trim ranges.

**Original sedan.** Raked pillars, rounded window seals/trim, mirror housings, projector details, grille, exhaust and engine-cover detail, plus a corrected tire profile and merged spokes. Details remain attached to the corresponding damaged/hinged parts. Existing driving, suspension, damage and collision logic is preserved. The repeated Willow-house wall collision check is included in validation.

**Clothing rack.** All 27 entries display garment silhouettes using the same fabric-style input as the fitted clothes. Pants have separate legs, tops have sleeves, and dresses/skirts/underwear have their relevant openings or hems. This is a folded display mesh, not a second full cloth simulation.

**Distance models.** Ambient distant cars use a colored 288-triangle car shape; pedestrians use a 728-triangle one-piece human shape with a small walking deformation. Existing promotion into nearby interactive cars/NPCs remains intact. Unused separate limb/head instance updates were removed; instance counts now contain only visible virtual traffic records.

**Trees and seasons.** Leaf clusters and needle whorls replace the main close forest primitives. Spring introduces fresh greens and some blossom-colored crowns; summer is full, autumn varies warm leaf color, winter removes deciduous canopies. Pine green varies by stand; broadleaf tint varies by tree. Resident and distant forests share the season state. Nearby cells use detailed branches/cards; farther cells use cheaper branched trunks and canopy silhouettes. Packed pine/broadleaf instances retain the correct tree-damage mapping. Season is a display mode independent of weather.

**Cash.** Rubber-banded game-currency bundles are regular grabbable props. Cutting a bundle releases 32 individually tracked $100 notes. A single instanced draw renders up to 192 loose notes with shader bending, curved lighting normals and wetness tint. Loose-paper motion runs at 30 Hz; held notes follow hand tracking at display rate. Orientation-dependent drag, tumble, collisions, support sleep, water flotation and zero-gravity behavior are implemented. Maximum: eight tied bundles, 192 loose bills, 12 bills per handful. Settled notes periodically check their support so they can wake if furniture moves. The engraved-style texture is original Human5 currency art.

**Lighting and performance.** A sky reflection environment is used outdoors and a precomputed room environment inside neighborhood houses. Shadows follow elevation and snap in light space. Unused directional lights were removed from the VR scene. Fixture candidates refresh at 12 Hz; selected held-lamp positions still follow each frame. The Quest fixture pool remains two point lights and one spot light. Furniture sleep compares numeric transforms and builds its held-object lookup once per pass. The first measured run exposed excess forest geometry; the second run includes the cheaper distance geometry. See `FINAL-PERFORMANCE.md` and raw evidence.

## Limits and follow-through

- These animals and the sedan remain visibly stylized procedural art. They are not scanned or artist-authored photorealistic assets. The breed roster is implemented, but especially long-coat silhouette detail still has room for improvement.
- The fur surface gives filtered texture and small ripples; it does not simulate each hair. Audio excerpts include ambient/mixed calls and are not recordings of each named breed. Decoding/playback lifecycle was tested; no listening-quality certification is implied.
- Cash uses a rigid tied bundle and lightweight flexible-note approximation. It does not solve every bill-to-bill contact, crease, knot or rubber-band stretch. Cutting is recognized on the bundle collision surface, not by a strand-level cutting solver. Cash is transient and is not a new complete-world persistence system.
- Lighting is bounded direct lighting plus prefiltered environments. Indoor environment selection currently covers the neighborhood house bounds, not a room-by-room light-probe bake throughout every city building. It is not real-time global illumination.
- Seasons change the trees; there is no calendar simulation or universal season conversion of every ground material. Detail changes occur by streamed cell and can be visible near a boundary.
- Existing limits from checkpoint 12 remain, including the gap between Mira's procedural face and photographic reference identity, incomplete all-object persistence, and dependence on the configured dialogue backend for unrestricted conversations.
- Quest hardware was unavailable for these tests. Software-renderer frame intervals are not headset FPS measurements, and this release does not guarantee 60/72 FPS. The included whole-project measurements still expose CPU and transition stalls that need on-device profiling.
