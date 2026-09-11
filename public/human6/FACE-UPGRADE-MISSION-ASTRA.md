# Mira Face & Hair — Astra DCC pass (Update 12 assets)

You are GPT-6 Astra. Spend this session on the work you are uniquely good at: driving Blender (bpy and the UI), sculpting, texture painting, hair-card grooming, photo projection, and Cycles lookdev. Do not spend the first half of the quota reading JavaScript or rewriting the WebXR app.

This is NOT a new-character job. Mira already exists. Character-from-scratch is where Astra drifts. You will EDIT the shipped CC3 asset and export an asset pack the existing Three.js r170 / WebXR app can load.

## Attach / open first
- The human2 folder (`mira-face-update12-starter.zip` or the live `human2/`).
- Blender 4.x+ with the glTF importer enabled.
- File to import: `human2/assets/mira.glb`
- Reference maps in `human2/assets/tex/`: `head.jpg`, `head_v2.jpg`, `head_ref.jpg`, `head_n.jpg`, `head_r.jpg`, `hair.png`, `lash.png`, `scalp.jpg`, `eye_l.jpg`, `eye_r.jpg` (INSPECT ONLY — do not overwrite the four eye files).
- Optional: 1–3 frontal photos if the user wants likeness. Optional: 1–2 beauty lighting stills of the *look* (skin, lids, hair), not a new identity.
- Existing notes: `UPDATE12-FACE-STARTER.md`. Phase A rest-pose / lid coupling / wrap-SSS mix is already in JS. Do not revert those.

If Blender is not available, say so in one line and fall back to UV-locked texture authoring only. Do not burn the session researching the JS engine. Do not open Unreal.

## Export contract (violate this and the session is wasted)
KEEP:
- Body vertex count 14,164 and vertex order
- All 49 existing shape keys / morph target names and deltas
- 103 bones and names (`Head`, `L_Eye`, `R_Eye`, `FacialBone`, `JawRoot`, …)
- 4-bone skin weights
- Existing UVs on head / body / hair / eyes
- Separate meshes: body, eyes, teeth, hair, lashes
- Eye albedo + eye normals byte-identical

DO NOT:
- Retopologize, decimate, apply a subdiv modifier on the body, or merge meshes
- Apply shape keys to Basis
- Rebuild Mira as a new human from a concept image
- Touch locomotion, cloth, house, car, weapons, voice, v1
- Enable MeshPhysical transmission as a “skin” solution
- Replace the runtime with Unreal, 3DGS, NeRF, or strand-hair compute

If you add geometry, it must be NEW objects (tearline, occlusion, extra hair cards), not edits that reorder body verts.

## Why the current face fails (do not re-research)
1. Plastic: `head.jpg` and `head_v2.jpg` are painted clay (RGB std ~6–10). Only `head_ref.jpg` has photographic chroma, but hair is baked onto that atlas. Shader sheen cannot invent melanin.
2. Stare: CC3 rest lids fully open. JS starter already applies `Eye_Blink` 0.12 + `Eye_Squint` 0.18 at rest. You still need real lid thickness + tearline + occlusion geo so the fissure reads human.
3. Dead periocular: no orbital fat, no tear trough, no lid thickness as geometry.
4. Hair: one card groom, MASK cutoff 0.48, isotropic spec, 20×7 guides. Looks like noodles or a helmet.

Success at FACE VIEW distance: lids cover 10–15% of the iris at rest, soft Duchenne hint, wet inner lid and lip spec, visible pores and blush, hair cards with lengthwise highlights and a real hairline.

## Work order (zip after each block; if quota is low, finish 1–3 and stop)

### 1. Lookdev setup — 15 minutes max
Import `mira.glb`. Neutral pose. Studio key/fill/rim. Camera on the face at ~0.35 m. Save a BEFORE Cycles still (front, 3/4, lids close-up). Compare every later render to this.

### 2. Head albedo + region maps  [HIGHEST VALUE]
Paint on the EXISTING head UV island.
Deliver:
- `assets/tex/head_v3.jpg` — 2048×2048, sRGB. Hemoglobin/melanin variation, warmer cheeks and lips, periocular warmth, pores, no painted hair, no painted irises/sclera, extra padding outside the face oval so mipmaps don’t seam.
- `assets/tex/head_region.png` — 2048×2048. Suggested channels: R = lip wetness, G = T-zone oil, B = lid/tear wetness, A = wrinkle-ready cavity.
- Optional `assets/tex/head_wrinkle.jpg` — crow’s feet / nasolabial / glabella cavity the shader can multiply by Smile + Brow_Compress + Squint.

How: project / grade from `head_ref.jpg` (strip the painted hair) plus generated pore/blush detail. Lock UV feature positions to the mesh (eye corners, lip peaks, nasolabial, brow). Do not freehand a new layout.

### 3. Rest-lid sculpt as a NEW shape key
Add shape key `Rest_Beauty` on the body mesh. Do **not** apply it to Basis.
Sculpt millimetres only:
- Drop upper-lid margin so the rest fissure is slightly narrower
- Add lid thickness and orbital fat
- Tiny outer-canthus down
- Soft cheek mass and philtrum
Keep the 49 original keys intact. Export a pack GLB with `Rest_Beauty` added (50th target). If adding a key is unsafe for the exporter, export a same-order vertex-delta cache instead and say so.

If lashes detach from the new lid rest, offset lash verts only. Keep `lash.png`.

### 4. Tearline + eye occlusion (real meshes)
CC3 Enhance Eyes pattern. Two new objects per eye, skinned 100% to Head:
- `Mira_EyeOcclusion_L/R` — thin card in the socket that casts a soft lid shadow onto the sclera. Alpha ~0.25–0.45. Must not cover the iris disc at rest.
- `Mira_TearLine_L/R` — thin wet ribbon at the lid margin. Slightly glossy.
Do not replace or repaint `eye_l.jpg` / `eye_r.jpg`. Name materials so JS can find them (`Std_EyeOcclusion_*`, `Std_TearLine_*`).

### 5. Hair cards, not strand runtime
Keep cards. You MAY use Blender particle hair as a sculpting guide, then bake back to cards.
Deliver:
- Improved hair card mesh OR extra flyaway/hairline layer parented/skinned like the existing hair
- Optional new `assets/tex/hair_v2.png` (2048×1024 or 2048×2048 RGBA). Keep `hair.png` as fallback
- Cards aligned to strand direction (this becomes the tangent for Kajiya-Kay)
- Hairline that meets `scalp.jpg`
- Alpha that works as hashed/dithered, not a hard MASK 0.48 sheet
Do not ship 20k runtime strands. Quest WebGL cannot take that in this sim.

Existing style names if you can match silhouettes; otherwise ship one beautiful default long layered cut and note the rest: Long layers, Shoulder length, Soft bob, Swept back, Low bun, Pixie crop, Light short bob, High bun, Close crop, Bald, Short side part.

### 6. Photo → this head (only if photos are attached)
Project 1–3 frontal images onto the existing head UV, de-light, composite only inside the face oval, write session map `head_fit.jpg`. Optionally a small identity shape key `Photo_Fit` on the same verts. Classify hair into one of the 11 styles above plus a hex tint.

If no photo is attached, ship a documented Blender recipe in `WIRING.md` and stop. Do not burn quota building MediaPipe WASM in this pass.

### 7. Visual QA loop
Re-render the same three cameras as step 1 after each of 2–5. If lids still show the full iris disc, sculpt more `Rest_Beauty`, do not add `Eye_Wide`. If skin still reads clay, the albedo is wrong — fix the map, not a shader essay.

### 8. Only if quota remains: wire into the existing app
Three.js r170, WebGL2. Files: `mira-v2-features.js`, `mira-v2-eyes.js`, `mira-v2-hair.js`, `mira-v2-tissue.js`, `installV2Skin`, `engine.js` / `mira-vr-menu.js`.
- Load `head_v3.jpg` as default female Advanced albedo
- Load `head_region.png` into the head shader for roughness/sheen
- Apply `Rest_Beauty` at 0.7–1.0 on top of the existing content rest pose (`Eye_Blink` 0.12, `Eye_Squint` 0.18, no `Eye_Wide`)
- Attach occlusion/tearline; drive opacity/offset from `Eye_Blink`
- Hair: Kajiya-Kay / Scheuermann dual spec using card tangents; hashed alpha; keep Classic path
- Expand SurfaceFlesh face guides to ~6
- Bump `?v=12.1` on edited modules
- Write `UPDATE12-FACE-HAIR.md` and zip the full `human2/` folder

Do not rewrite XPBD, cloth, house, or voice.

## Priority if usage runs out
1. `head_v3.jpg` + `head_region.png` + BEFORE/AFTER renders
2. `Rest_Beauty` key + tearline/occlusion meshes
3. Hair card / atlas improvement
4. JS wiring
5. Photo-fit

## Deliverables
- `human2-assets-face12.zip` containing any new textures, any new GLB/additive meshes (`mira-face-pack.glb` preferred over overwriting `mira.glb` until shapekey counts are verified), lookdev stills, and a one-page `WIRING.md` (object names, material names, shape-key name, UV notes, vertex counts before/after)
- Updated `human2/` only if you reached step 8
- Do not claim Quest visual proof

## What you are better at than the previous agent — use it
Open Blender. Sculpt. Paint. Render. Compare. Iterate. The previous agent could only write shaders around a clay albedo and a wide rest lid. You can replace those assets. That is the entire point of this session.
