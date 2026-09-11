# Update 12 — Astra texture pack review

Astra delivered the **texture-only fallback** (Blender was unavailable). Files are now in `human2/assets/tex/`. The existing Advanced path already loads `head_v3.jpg` and `head_region.png` (`mira-v2-features.js` `applyLooks` + `installV2Skin`). No JS change was required to hook albedo + region roughness.

## Verdict: keep the maps, do not treat the face as fixed

| Asset | Use it? | Why |
|---|---|---|
| `head_v3.jpg` 2048² | **Yes, as Advanced female albedo** | UV-locked, no painted hair/irises, nostrils and lip chroma slightly better than `head_v2`. Face-plate RGB std ~12 vs `head_ref` ~55 — still clay-adjacent, not a scan. Only ~9% of face-island pixels moved >12 levels vs upscaled v2. |
| `head_region.png` | **Yes** | Channels land on the right features (R lips, G T-zone, B lids). Sparse but correctly placed. Already sampled in the head roughness mix. |
| `head_wrinkle.jpg` | **Skip wiring** | Almost pure white (min 243, mean 255). Multiplying by it does nothing. Do not spend tokens on it. |

CPU lookdev BEFORE/AFTER is the same mesh + same blink/squint. Color shift is real but small. Those stills are **not** Cycles or Quest proof (no cornea, no SSS, no wet spec).

Contract held: GLB, 49 morphs, 103 bones, four eye files untouched.

## What this does **not** fix
- Resting stare / wide fissure (needs `Rest_Beauty` or more lid geo)
- Plastic spec / missing tearline + eye occlusion meshes
- Noodly hair
- Expression beauty beyond the Phase A morph mix already in the tree

## Next spend
1. On-device check of Advanced female with `head_v3` (this pack).
2. Second Astra session **only if Blender is actually attached**. Same High tier. Scope: Rest_Beauty shapekey + tearline/occlusion only. Do not re-author albedo unless the device shot still reads clay.
3. Do not burn another texture-only Astra pass. Diminishing returns.

If Blender stays unavailable, a code-only tearline (two thin ribbons parented to Head) is the next cheapest visual win. Hair shader (Kajiya-Kay) is second.
