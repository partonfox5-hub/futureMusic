# Checkpoint 13 — 17.9.0

Full integrated web game, based on the 17.8.0 complete project. Extract the ZIP, serve its parent folder with an HTTP server, then open /human5/index.html. Quest requires HTTPS for immersive WebXR; reuse your existing hosting method.

Included in this checkpoint:
- Three dog breeds: Labrador Retriever, Beagle, German Shepherd. Three cat breeds: British Shorthair, Siamese, Maine Coon. Connected offline sculpt meshes, breed coat patterns, eye/muzzle/ear differences, tuned size, gait, movement speed, social frequency and carrying limits. Existing jaw, tail, needs, bites and dynamic mouth grips remain integrated.
- Recorded pet audio bank: 13 compact mono clips, positional falloff, per-pet cooldowns, repeat avoidance, up to three simultaneous voices. The source recordings are shared between breeds with restrained pitch variation. Dog distress/growl excerpts contain mixed calls and ambience; these are not dedicated recordings of each breed. Provenance in assets/pets/sources.json.
- Original sedan: raked pillars, rounded seals and trim, projector details, mirror housings, corrected axial tire profile, merged spokes, grille, exhaust and engine cover. Original collision and damage system remains intact.
- All 27 wardrobe entries have hanging garment silhouettes with the same fabric style and color as their fitted counterpart. Six visible items per rack page. Point/trigger or click PREV/NEXT on the rack, then drag a garment onto an NPC.
- World/Weather: spring, summer, autumn and winter tree appearance. Leaf cluster canopy, evergreen needle whorls, bare deciduous branches, stand-consistent pine color and per-tree broadleaf variation. Resident and distant canopy update together.
- Distant traffic uses a 288-triangle car silhouette. Distant pedestrians use a 728-triangle one-piece colored human silhouette with shader movement; promotion to interactive actors and cars is retained.
- Lighting preparation: outdoor sky reflection environment, interior environment selection, height-following shadows, unused zero-intensity directional lights removed from VR, lamp candidate refresh at 12 Hz.

Controls: Pets tab > Breed to spawn > SPAWN PET; REMOVE SELECTED PET frees a slot (four active pets maximum). World/Weather > Tree season. Clothing rack PREV/NEXT controls its five pages.

Validation: full engine startup, six breeds simulated for 90 steps each with finite deformed vertices, existing 28-bone rig preserved; 27 garment meshes and pages [6,6,6,6,3]; 13 audio buffers decoded without errors; winter hides deciduous leaves and retains pine foliage; car into Willow wall regression breaks four wall sections without an exception. Browser/renderer errors: zero in the passing checks. Evidence and actual WebGL captures are in H5-test-results/checkpoint-13.

Limits: procedural pet and vehicle art remains visibly stylized; this is not a photogrammetry asset pack. Fur is a filtered surface/normal approximation, not individual simulated hairs. Rack displays are folded garment templates, not a full cloth simulation on the hangers. Tree seasons are display modes, not a calendar/ecosystem simulation. Audio quality is constrained by the source recordings. Quest hardware has not been tested here, and 60/72 FPS is not certified. Cash interactions and the final performance passes are still in progress and are not included in this frozen checkpoint.
