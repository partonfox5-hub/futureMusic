# Astra session 2 — Blender required. Skip albedo.

You already shipped `head_v3.jpg` and `head_region.png`. Do not regenerate them. Do not open Unreal. Do not rewrite JS first.

Blender must be available. If it is not, stop in one line.

Import `human2/assets/mira.glb`. Do not apply the armature. Do not apply shape keys to Basis. Keep 14,164 body verts, 49 named morphs, 103 bones, existing UVs, separate body/eyes/teeth/hair meshes. Eye JPEGs stay byte-identical.

Work order, zip after each:

1. Shape key `Rest_Beauty` (millimetres): drop upper-lid margin so rest covers ~10–15% of the iris; add lid thickness and a hint of orbital fat; tiny outer-canthus down; soft cheek. Leave Basis alone.
2. New meshes skinned to Head: `Mira_EyeOcclusion_L/R`, `Mira_TearLine_L/R`. A few hundred tris each. Do not cover the iris disc. Do not replace eye textures.
3. Hair cards only: extra hairline/flyaway layer and/or improved `hair_v2.png`. No 20k runtime strands. Keep `hair.png` as fallback.
4. Cycles FACE close-ups vs the existing CPU lookdev. Export `mira-face-pack.glb` (additive) plus `WIRING.md`. Do not overwrite `mira.glb` until morph counts are verified.

If quota is low, ship 1 + 2 and stop.
