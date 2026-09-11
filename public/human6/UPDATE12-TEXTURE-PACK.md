# Mira Update 12 — texture-only asset pack

**Status:** Blender/bpy unavailable. This is the requested UV-only fallback, not a completed DCC pass. No runtime modules were edited. The supplied Phase A behavior remains intact. Copy `assets/tex/` into the existing `human2/assets/tex/`; copying alone does not activate the maps.

## Assets and hookup

| File | Data / destination |
|---|---|
| `head_v3.jpg` | 2048² RGB, sRGB albedo for female Advanced `Std_Skin_Head` only. Keep Classic and `head_v2.jpg` fallback. |
| `head_region.png` | 2048² RGBA, **linear data / NoColorSpace**. R = lip wetness, G = T-zone oil, B = lower-lid/tear wetness, A = cavity amount (0 neutral). Alpha is data, not material opacity. |
| `head_wrinkle.jpg` | 2048² RGB, linear multiplicative cavity; white neutral. Optional, subtle expression overlay. Do not multiply this and region A together. |

External maps use the shipped head UV0, unmirrored, with image origin at top left. For textures assigned to GLTFLoader materials, use `flipY=false`. Use normal mipmaps; albedo has a 36 px border blend to the original flat base and nearest-island padding outside coverage. Original lip/eyebrow pigment is retained at exact source UV coordinates; surrounding skin uses registered generated detail and reference chroma. Keep `head_n.jpg` and the existing normal strength. Start head roughness at the existing value; **suggested, untested** region blend: lips toward 0.30, oil toward 0.44, lid toward 0.25, blend by the corresponding channel. Apply region A only with expressions, e.g. `albedo *= 1.0 - 0.18*A*expressionWeight`. Verify existing shader contributions before adding these values to avoid doubling its region effects. No transmission.

## Geometry and eye preservation

| Contract item | Before → after |
|---|---|
| Body vertices / existing morphs | 14,164 → 14,164 / 49 → 49 |
| Skeleton / skin influences | 103 named bones → same / VEC4 joints and weights → same |
| Mesh objects in shipped GLB | `body`, `eyes`, `teeth`, `hair` → same |
| Lashes | Existing `Std_Eyelash` body primitive retained; source has no separate lash object |
| UVs, vertex order, Basis, all morph deltas | Original GLB byte-identical; no re-export |
| Four eye albedo/normal JPEGs | Byte-identical, recorded in `validation.json` |
| New objects / materials / shape keys | **None.** No `Rest_Beauty`, tearline, occlusion, or GLB supplied |

Keep the starter's Eye_Blink 0.12 + Eye_Squint 0.18 and its rest/lid coupling. Do not add Eye_Wide. Hair, scalp, lashes and all unrelated systems remain the supplied versions. No hair improvement is claimed.

## Visual check and Blender / photo recipe

`lookdev/` contains same-camera BEFORE/AFTER **CPU texture previews**, not Cycles or Quest proof. Both use the original mesh plus the same blink/squint mix, studio-style diffuse key/fill/rim, camera approximately 0.35 m from the face target. They omit physical cornea transparency, normal-map shading, SSS, wet specular, runtime skin deformation and shadow transport. Use them to compare color and UV placement only. `tools/preview_asset.py` reproduces them from the starter.

In Blender 4.x, import the original `mira.glb`, keep all original shape keys and armature; set the existing left/right blink keys to .12 and squint keys to .18. On `Std_Skin_Head`, compare old/new albedo with all other settings fixed. Camera targets (0,1.514,.060), frontal offset (0,.008,.35); ¾ offset (.185,.018,.297); use 38° FOV, plus a 16° eye close-up at target y=1.510. Add area key/fill/rim; render Cycles with fixed exposure before sculpting. No likeness photos were attached. For a future photo fit: align eyes/nose/mouth in camera projection to **this** head; de-light photos, project into a new image on existing UV0, exclude scalp/hair/eyeballs, feather only the face oval, extend padding, save `head_fit.jpg`. Never replace the UV layout or identity from a generated portrait. Validate all original accessors before exporting any new sculpt.
