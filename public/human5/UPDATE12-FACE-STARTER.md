# Update 12 starter — face rest + lids + hair compliance

This is a **starter patch**, not the finished lifelike face. Eye albedo files are unchanged. V1 is unchanged. Classic/Advanced toggles remain.

## What this zip already changes

- Default `content` pose is now a resting-beauty mix: Eye_Blink 0.12, Eye_Squint 0.18, small Duchenne smile, **no Eye_Wide**. Neutral is no longer empty.
- Curious / listening no longer drive Eye_Wide. Surprise/afraid still can.
- Gaze-coupled lids: looking down adds blink, looking up opens slightly. Asymmetric / half blinks.
- Millimetre periocular sculpt in `shapePoint()` (lid drop, orbital fat, canthus, cheek mass). Morphs rebase through the existing likeness loop.
- Cornea envMapIntensity 1.05 → 0.68; rest pupil 0.048 → 0.054. Iris textures not touched.
- Head wrap SSS mix 0.32; region roughness for lips/lids/T-zone; head normalScale 0.28; roughness no longer crushed to 0.55–0.86 on the head.
- Face tissue cap 0.0025 → 0.009 so cheeks can actually move.
- Hair: compact flex 0.38 → 0.62; rest-lerp root 14→6.2, mid 1.6, tip 0.8; wider rest bound.

## Still required (see FACE-UPGRADE-MISSION.md)

B. 2048 UV-locked head albedo with real chroma (only `head_ref.jpg` currently has it; `head.jpg` / `head_v2.jpg` are painted clay). MeshPhysical sheen. Wrinkle overlay.
C. Tearline + eye-occlusion ribbons. More face tissue guides.
D. Kajiya-Kay hair shader, 36×9 guides, hashed alpha (hair MASK cutoff 0.48 is still a sheet).
E. MediaPipe photo-fit onto this CC3 UV — not a new mesh, not “GPT-6 Astra 3D.”

Cache: edited modules `?v=12.0`. Purge CDN/Quest cache.
