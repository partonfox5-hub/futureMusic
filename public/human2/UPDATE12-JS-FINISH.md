# Update 12.2 — JS eye finish + hair spec (no Blender)

Blender was unavailable. This pass adds runtime stand-ins only.

## Eyes
- New `mira-v2-tearline.js` (`EnhanceEyes` / `EyeFinish`)
- Two Head-parented cards per eye: `Mira_EyeOcclusion_L/R`, `Mira_TearLine_L/R`
- Occlusion shader keeps an iris window; darkens the lid ring
- Tearline is a thin wet ribbon
- Driven by `cur.Eye_Blink_L/R`; hidden in Classic eyes and if the head is missing
- Eye albedo files and LivingEyes iris path unchanged

## Hair
- Advanced: Kajiya-Kay dual spec from `v2HairCoord` tangent, root darkening, `alphaHash`
- Classic: restores original MASK / alphaTest / A2C
- Same 20×7 guides and card geometry. Lashes stay MASK.

## Not done
Rest_Beauty sculpt, real CC3 occlusion meshes, new hair cards, photo-fit.
