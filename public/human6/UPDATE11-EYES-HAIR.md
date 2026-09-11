# Update 11 — selectable Classic / Advanced eyes and hair

## Audit finding

The uploaded human2(5).zip already contained and invoked both overhauls for V2. They were not orphaned source files:

- mira-v2-features.js constructs LivingEyes and HairGuides, and ticks both every frame.
- With the actual supplied mira.glb topology loaded through Three.js r170, LivingEyes binds Std_Cornea_R and Std_Cornea_L (eyes_2 and eyes_4). The loader splits the four eye primitives into four material meshes; the material-name checks do match.
- HairGuides binds the real hair SkinnedMesh, installs the shader attribute and 20 seven-point guides, and expands the default hairstyle from 20,899 to 41,798 vertices. Both its geometry and shader hooks were active in the inspected V2 path.
- V1 uses the original appearance and bypasses these V2 systems.
- The overhaul reuses the existing eye and hair textures. There is no separate high-resolution eye or replacement groom asset waiting to load in this archive. Its changes concern materials, geometry and motion; it is not a new scanned model.
- The pupil illumination value was initialized to a fixed 0.6 and never updated. Therefore the old code could not actually respond to changing scene light. No independent eye/hair appearance selectors existed.

This inspection cannot establish which version was cached in the user's Quest browser, nor the exact visual result on that headset. The updated module cache versions prevent the new menu from mixing with the previous module URLs after installation.

## What changed

Eyes and hair now have independent Classic / Advanced choices, both for spawning and live switching on a selected V2 actor. V1 remains available and unchanged.

- Classic eyes restore the original eye materials and layered specular shell.
- Advanced eyes use the existing physical cornea material, clearcoat, iris parallax, limbal shading and pupil remapping.
- Advanced pupil size now follows a smoothed, bounded scene-light brightness estimate sampled four times per second. This is an approximation, not measured luminance or occlusion-aware eye exposure.
- Classic hair restores the original single-layer mesh/cut and material shader, with guide simulation off. Hair colour remains adjustable.
- Advanced hair enables the prior selectable groom shapes, additional card layer for longer cuts, and body/hand collision guides.
- Switching does not mutate the template or other actors. Inactive materials and geometry are disposed when the actor is removed.
- The selected actor displays its active appearance choices. Presets, imported/exported scene JSON, and Copy Selected Features preserve both choices. Older V2 presets lacking these fields retain the previous Advanced default.
- All Update 10 grip, locomotion, construction and furniture changes remain included.

## How to compare

Desktop: use FACE VIEW, then the selected actor's EYES & HAIR controls. Switch eyes and hair separately between Classic and Advanced. For the next NPC, use Spawning eye rendering / Spawning hair rendering in CREATE NPC.

VR: Y → STYLE changes the selected actor. Y → SPAWN → EYES / HAIR sets the next configured NPC. The existing SPAWN V1 option keeps the full original V1 actor available.

Classic hair keeps the original cut; switch to Advanced to select the additional hairstyles. Compare from the same distance and lighting. Hair differences are easiest to inspect using a long style during head movement or brushing. Eye effects are small-scale and easiest to inspect close to the face.

## Verification

11 appearance checks passed using the actual GLB topology and actual V2 actor constructor: cornea/hair binding, Classic geometry/material restoration, V1 independence, repeated switches and actor isolation, alternate hairstyles, shader uniform injection, scene-light pupil response, movement reaching hair shader offsets, configured spawn flags, preset save/restore, and backward compatibility. Texture loading was stubbed for these headless topology/material tests; texture files themselves are unchanged.

The 17 Update 10 simulation checks were rerun successfully. JavaScript syntax and local module references pass. Model and texture assets remain byte-for-byte unchanged. No GPU render, browser visual comparison, or Quest performance/appearance test was performed here.
