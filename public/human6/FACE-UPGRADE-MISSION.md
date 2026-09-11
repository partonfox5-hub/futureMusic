# Mira Face & Hair Realism — Update 12 implementation mission

You are editing the existing Mira v2 WebXR human simulator (`human2/`). Three.js r170, WebGL2, Quest-first.

**Do NOT** change renderer, rig topology, clothing, house, car, weapons, locomotion, voice, or eye albedo textures (`eye_l.jpg`, `eye_r.jpg`, `eye_l_n.jpg`, `eye_r_n.jpg` stay byte-identical).

A starter patch for Phase A plus partial B/C/D is already in this tree. Continue from there. Zip after each remaining phase.

---

## What is already there (do not rediscover)

- CC3 skinned GLB `assets/mira.glb` (15.3 MB). Body mesh 14,164 verts, **49 morphs** on BODY only. Eyes, teeth, and hair have **0 morphs**.
- Morph names (use these; do not invent missing ARKit shapes):
  `V_Open, V_Tight_O, V_Wide, V_Lip_Open, Brow_Raise_Inner/Outer L/R, Brow_Drop L/R, Brow_Compress L/R, Eye_Blink/Squint/Wide L/R, Eye_L/R_Look_L/R/Up/Down, Nose_Sneer L/R, Cheek_Raise/Puff L/R, Mouth_Smile/Frown/Stretch/Dimple/Press/Pucker_Up/Funnel_Up L/R, Mouth_Shrug_Upper, Jaw_Open, Jaw_Forward`.
- Missing (do not fake as new GLB targets): `mouthClose, mouthRoll*, mouthUpperUp, mouthLowerDown, jawLeft/Right, tongueOut, cheekSquint`.
- Expressions: `FACE_POSES` in `mira-v2-features.js`. Starter patch already retuned default `content` to a resting-beauty mix with rest `Eye_Blink` and **no** `Eye_Wide`.
- Eyes: `LivingEyes` (`mira-v2-eyes.js`) MeshPhysical cornea + iris parallax + pupil remap. **Keep iris textures.** Starter already lowered cornea `envMapIntensity` to 0.68 and raised rest pupil to 0.054.
- Hair: `HairGuides` (`mira-v2-hair.js`) 20 chains × 7 XPBD nodes, Catmull-Rom card offsets, 32 capsules. Advanced doubles cards to ~42k. GLB hair material is **MASK alphaCutoff 0.48** (reads as plastic sheets). Starter loosened rest-lerp and compact flex; shader is still isotropic Standard.
- Skin: `installV2Skin` wrap-SSS. Starter raised head wrap mix to 0.32 and added region roughness. Default female albedo is still `head_v2.jpg` at **1254²**. `head.jpg` / `head_v2` / warm/cool/rosy have RGB std ≈ 6–10 (painted clay). **Only `head_ref.jpg` has photographic chroma (std ≈ 53/44/40)** — and it has hair painted on the atlas, so it cannot be used raw as the head albedo.
- Face tissue: `SurfaceFlesh` 2 head guides. Starter raised cap 0.0025 → 0.009. Still only two guides.
- Classic/Advanced eye and hair toggles must keep working. V1 actor path stays untouched.

## User complaints to actually fix

1. Face reads plastic and stiff.
2. Default expression is not beautiful; eyes look too wide and intense; gaze is dull.
3. Eyelids and periocular tissue lack thickness and motion.
4. Hair looks noodly and either stiff or like fixed tubes.
5. Later: convert a 2D face photo into this same 3D actor (same topology, including plausible hair).

## Hard constraints

- Stay on this CC3 mesh + existing 49 morphs. No new GLB morphs.
- No 3DGS, NeRF, VASA-3D, TressFX, SoraKu 20k strands, spectral SSS, MeshPhysical **transmission** (broken in WebXR stereo), WebGPURenderer swap.
- Quest Browser WebGPU-in-WebXR is still experimental. Ship WebGL2.
- One actor on Balanced is the perf baseline. No extra full-screen passes.
- After each phase, write a zip checkpoint + short `UPDATE12-*.md` + `validation-update12.json`.
- Bump `?v=` on every edited module.

---

## Phase A — Resting beauty + eyelid aperture (starter already applied)

Verify on device, do not revert:

- Rest `Eye_Blink` 0.10–0.14, `Eye_Squint` 0.16–0.22, small Duchenne smile, **Eye_Wide = 0** at rest.
- Gaze-coupled lids and blink asymmetry already in `tickFace`.
- If FACE VIEW still stares, raise rest `Eye_Blink` toward 0.16 before touching geometry again.

## Phase B — Head material + albedo (do next)

- Convert **Std_Skin_Head only** to `MeshPhysicalMaterial`: metalness 0, sheen 0.25–0.40 peach, sheenRoughness ~0.45, clearcoat 0.06–0.12, clearcoatRoughness 0.45, envMapIntensity ~0.55. **No transmission.**
- Keep F0 0.028. RGB wrap ≈ `vec3(0.55, 0.28, 0.14)`, mix ~0.34 on head, body stays 0.18.
- Finish region masks (lips ~0.28–0.38 roughness, lids ~0.32, T-zone ~0.40, cheeks 0.52–0.60).
- **Re-author a 2048² UV-locked `head_v3.jpg`.** Sheen cannot invent melanin/hemoglobin. Prompt must lock existing UV feature coordinates, no painted hair, no painted eyeballs, warmer cheeks/lips, periocular warmth, pores. Keep `head_v2.jpg` as fallback. Use `head_n.jpg` / `head_r.jpg` as structural maps.
- Optional wrinkle overlay: modulate detail by Smile + Brow_Compress + Squint.

## Phase C — Eyelids / periocular / tearline

- Keep the millimetre rest sculpt already in `shapePoint()`. Refine if lids clip cornea.
- Expand `SurfaceFlesh` from 2 head guides to ~6 (L/R cheek, L/R lid, lips). Blink morph remains the closer; springs are secondary tissue.
- Author two tiny procedural ribbons parented to each eye (CC3 **Enhance Eyes** pattern):
  - Eye Occlusion: soft shadow on sclera from lids.
  - Tear Line: wet highlight at lid margin.
  Skin to Head; follow `Eye_Blink`. Do not replace eye textures.
- Lashes stay MASK. If they detach from the new lid rest pose, offset lash verts with the same sculpt.

## Phase D — Hair that is hair (cards, not strands)

- Keep `hair.png` and the 11 silhouettes. Classic path unchanged.
- Shader: Scheuermann / Kajiya-Kay dual anisotropic spec (primary shift + secondary colored), strand tangent from card long axis / `v2HairCoord`. Root darkening.
- Switch **hair** off MASK cutoff 0.48 to hashed/dithered alpha or keep `alphaToCoverage` with a lower cutoff. **Lashes stay MASK.**
- Sim: 32–40 chains × 8–9 nodes. Roots stiff, mid compliant, tips free. Keep 32 capsule contacts + VS projection.
- Optional extra thin flyaway layer for long styles only; cull on Quest Balanced.
- Show `scalp.jpg` under pixie / crop / part.

Do **not** port WebGPU strand sims (WebHairSim, SoraKu, TressFX) in this checkpoint.

## Phase E — Photo → this actor (same topology)

Do **not** generate a new mesh. Do **not** call a fictional “GPT-6 Astra 3D API.” GPT-class models can **author** textures and classify hair; they cannot emit a Quest-ready skinned CC3 head by themselves.

Pipeline that fits THIS rig (three.ws / projection-first method):

1. User drops 1–3 frontal photos (desktop control first; Quest applies a previously fitted profile).
2. MediaPipe FaceLandmarker WASM — 478 landmarks + 52 blendshapes. CDN: `@mediapipe/tasks-vision`.
3. Umeyama align + TPS / bounded Laplacian onto existing head verts. Write into `faceProfile` / identity-delta that `shapePoint()` already understands so the 49 morphs still rebase.
4. De-light (edge-aware divide-by-low-frequency) and project the face plate into the existing head UV island. Composite only inside the face oval. Do not paint hair or eyeballs onto the atlas. Do not overwrite `eye_l/r.jpg`.
5. Hair from one photo: sample color → existing `HAIR_COLORS` tint; classify length/part → nearest of the 11 `HAIR_STYLES`. No on-device strand groom generation.

Honest UI limits: front-face likeness only; no 360 hair reconstruction; glasses/beards degrade fit.

Optional later EXTERNAL hook (not this zip): Avaturn / AvatarSDK MetaPerson / Hunyuan3D / TRELLIS / Tripo, then wrap **back onto Mira topology**. Ready Player Me shut down 2026-01-31 — do not use it.

---

## Validation

- Syntax + module refs.
- Morph names used must exist in the GLB `extras.targetNames` (49 names).
- Eyes/teeth still have no empty `morphAttributes.position`.
- V1 actor unchanged. Classic eyes/hair still restore.
- Rest `Eye_Blink` in [0.08, 0.16] when emotion is content/neutral and no override; `Eye_Wide == 0` in those states.
- Hair Advanced still collides with head/hand capsules.
- Update 10/11 fixtures still pass.
- No `GL_RENDERER` in this cloud browser — do not claim GPU/Quest visual proof.

## Files you are expected to touch

`mira-v2-features.js`, `mira-v2-eyes.js`, `mira-v2-hair.js`, `mira-v2-tissue.js`, `mira-v2.js` (shader + MORPH use only), `mira-v2-controls.js`, `engine.js` / `mira-vr-menu.js` (new controls), new `mira-v2-tearline.js`, optional `mira-v2-photofit.js`, `UPDATE12-FACE-HAIR.md`, `validation-update12.json`.

Optional new texture: `assets/tex/head_v3.jpg` at 2048². Never overwrite eye textures or the GLB.

## Success looks like

Close FACE VIEW: lids cover ~10–15% of the iris at rest, a soft Duchenne hint, wet inner lid and lip spec, cheeks that give a millimetre when the head turns, hair cards with **lengthwise** highlights that swing instead of bending like rubber tubes. Eye textures unchanged. One actor 72 Hz on Quest remains the performance contract.

## Research to follow, not reimplement

- Wrapped SSS: GPU Gems 3 ch.14 / Barré-Brisebois GDC 2011 (already cited in `mira-v2.js`).
- Hair cards: Scheuermann GDC 2004 / Kajiya-Kay.
- Photo fit: MediaPipe Face Landmarker for Web; three.ws reconstruction worker (MediaPipe 468 + Umeyama + TPS + projective texturing, ~5s CPU); Instant Skinned Gaussian Avatars (SUI 2025) is Three.js+WebXR but is a different representation — do not rebase Mira onto it.
- Eyes: keep current LivingEyes parallax/pupil; CC3 Enhance Eyes occlusion/tearline.
- Reject as runtime: PhysHead / GaussianAvatars / GRMM / VASA-3D / TressFX / spectral SSS.
