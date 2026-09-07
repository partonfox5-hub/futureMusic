# Update 12.1 — texture hook (Astra fallback)

Astra could not open Blender. It returned a UV-only pack. That pack is now in the tree and wired for female Advanced.

## Shipped and hooked
- `assets/tex/head_v3.jpg` — 2048² female Advanced albedo (replaces `head_v2.jpg` on female only)
- `assets/tex/head_region.png` — linear RGBA: R lips, G T-zone, B lid wetness, A unused cavity
- `assets/tex/head_wrinkle.jpg` — present, **not wired** (almost white; mean 254.9)
- `installV2Skin` samples `head_region.png` for lip / lid / T-zone roughness
- Head triplanar detail amount dropped 0.24 → 0.14 so the new pores do not double-print
- Cache: `mira-v2-features.js?v=12.1`, `TEXVER=r12`

## Untouched
GLB, 14,164 verts, 49 morphs, 103 bones, four eye files, hair cards, Classic/male `head.jpg`.

## Honest quality
Usable modest grade: blush, lip chroma, faint pores, no painted hair on the atlas. Not photographic. Face variation is still low vs `head_ref.jpg`. CPU lookdev is color-only — not Cycles, not Quest. Stare, lid thickness, tearline, and noodle hair are unchanged.

## Next
Do not spend another Astra session on albedo. Next session only if Blender is actually attached: High, Blocks 3–5 of the DCC brief (`Rest_Beauty`, tearline/occlusion, hair cards). Attach this wired tree so textures are not regenerated.
