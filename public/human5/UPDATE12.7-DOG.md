# Dog graphics 12.7 — blocks 1 + 2

This full human5 folder uses your uploaded 12.6 as its base. Only Dog.js, DogFur.js, DogJaw.js and mira-v2-dog.js changed. All other existing files, including human assets, attention/AI, grab code, tail solver, paw IK, host engine and old maps, are byte-identical.

- Head: sclera, amber iris discs, dark pupils, thin transparent cornea domes and tight rims; 100% Head skinning. No transmission. Cornea shadow/depth flags survive compactMeshes.
- Nose: flatter recessed planum, darker nostril cavities, roughness .19, metalness 0, environment response 1.2.
- Form: millimetre skull/muzzle changes, stop/cheek/lip shapes, low-poly ear thickness. Tongue roughness .28 and pinker pigment. Skeleton/bind positions unchanged.
- Maps: generated tan guard-hair tile (1024²) and dark nose leather (512²), sRGB. Old maps retained; missing fur_albedo_v2 falls back to fur_albedo.jpg. Successful image loads switch the one-pixel DataTexture placeholders to ordinary image texture uploads.
- Changed internal imports use ?v=12.7. The untouched host importer may retain its old query: hard-refresh/purge the cached mira-v2-dog.js entry, or update only its import URL to mira-v2-dog.js?v=12.7 in your integration. No unrelated module cache versions were changed.

Check UPDATE12.7-DOG.diff for the complete text diffs. Geometry/skin/compaction/default-dog/jaw/shell-fallback checks passed using Three.js r170. Total visible geometry with all shells: 14,980 triangles. No WebGL/Quest visual or 72 FPS claim is made.

Stopped after requested high-value blocks 1+2. Region fur lengths, discard refinement, coat roughness tuning, whiskers, and new lookdev images are not included. The existing three-shell shader and slow-frame 3→2 drop remain.

Maps were authored with built-in image generation: two material panels, medium-tan vertical canine guard hairs with dark undercoat flecks; dark fine-pebbled nose leather with no fur or anatomy. Panels were split, resized to the specified sizes and edge-blended for tiling. No eye texture was generated; iris geometry supplies amber color.
