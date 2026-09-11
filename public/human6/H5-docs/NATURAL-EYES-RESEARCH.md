# Natural eyes for Human5 and Photo NPC Studio

Research and implementation review · 11 September 2026  
Target: Quest 3 WebXR / Three.js 0.170.0; offline authoring on the user's Windows laptop, provisionally an RTX 5060 Laptop GPU.

## Decision

Improve the existing eye region in two stages: correct neutral fitting and animation/material defects now, then obtain better identity geometry and surface capture offline. A larger texture or a stronger “beauty” prior cannot recover eyelid anatomy absent from the photographs. The current release improves specific failure modes but does **not** meet the requested “indistinguishable from HD video” standard.

For the game, keep a conventional skinned mesh, expression shapes and an inexpensive eye shader. For authoring, evaluate multi-view reconstruction independently, then transfer reviewed geometry and texture detail to that mesh. This preserves your interaction, expressions, physics and mobile rendering architecture. Research systems that render a convincing novel view do not automatically supply a collision-ready, clothed, editable game NPC.

The dedicated review covers the uploaded reference as visible in the conversation, the supplied game's implementation and the runnable Studio code. The renewed inference tests use the supplied clothed portrait retained with the previous Studio test project. They do not treat photographs as calibrated scans or infer ethnicity from appearance. External sources below are original research, official repositories and platform documentation. Repository and hardware statements were checked on the review date; performance figures attributed to papers are the authors' measurements, not measurements on your laptop.

## Your art direction, expressed as controllable choices

Your Western/classical preference with a restrained anime influence is a useful artistic brief. Here, the natural-eye requirement takes priority: relaxed lids, soft transitions around the socket, believable eye size, warm sclera, restrained limbal contrast, and a face that retains the reference's distinctive asymmetry. This is an implementation decision for your project, not a scientific ranking of faces or a rule about ancestry.

Studio 2 exposes **Reference**, **Soft natural**, and **Illustrative** preferences. The preference only affects a small eye-opening prior where measurements are uncertain. Its default strength is 25%. It does not change skin tone, select an ethnic template, classify the subject, or enforce a supposed universal facial ratio. Under strong measurement confidence, these options produce the same fit. “Illustrative” is explicit and optional; it does not silently enlarge every subject's eyes.

The present controls are deliberately modest: their maximum uncertain-region opening adjustment is 3.5% for Soft natural or 7.5% for Illustrative, multiplied by the strength slider. At the default, Soft natural contributes at most 0.875% to the prior opening before fitting. These are our artistic limits, not biological measurements. They address the requested gentle direction while preventing a beauty setting from replacing the person in the source.

## Why the existing eyes looked artificial

The code audit identified several interacting causes.

| Observed issue | Implementation cause or limitation | Change in this release |
|---|---|---|
| Eyes look partly shaded even while open | Fixed translucent planes sat across the eye region independently of the lids | Replaced by narrow ribbons sampled from animated eyelid vertices |
| Neutral faces inherit squint | Blinking and squinting landmarks could enter neutral fitting; small nonzero blink/squint values also existed in the game's neutral expression | Expression-weighted measurements; neutral defaults now zero |
| Fitted noses turn upward | Learned monocular depth participated in the old canonical alignment, allowing depth uncertainty to influence vertical geometry | Roll alignment uses image coordinates; uncalibrated nose depth and rotation remain at the template |
| Cheek or jaw fitting alters eyes | Broad residual deformation can influence nearby regions | Smaller, bounded field; zero pins; explicit ocular and nasal damping |
| Eyes feel painted | Iris/pupil remapping, limbal contrast and material response were overly simple | Softer limbus, warmer sclera, dark pupil, adjusted parallax and optical material parameters |
| Close-up still looks like a game model | Limited template anatomy, skin maps, lashes, groom and lighting | Remains an acknowledged asset-quality limit; no invented claim of a reconstructed eye scan |

These causes are not interchangeable. A correct diffuse texture will still look wrong over a badly fitted lower lid; a correct lid will still look wrong if a floating shadow card crosses the iris. The validation therefore separates geometry, motion, shading and identity.

## What high-fidelity eye research actually implies

### Model the entire eye region

Bérard and colleagues' *High-Quality Capture of Eyes* separates the transparent cornea, opaque sclera and iris, including individual geometry and dilation. Their capture apparatus uses specialized multiple-camera and lighting arrangements. The paper demonstrates how much information a high-end eye asset contains; it does not establish that a single casual portrait can recover that information. For Human5, the useful lesson is to distinguish the optical surface from the visible iris and to retain individual shape. A new set of sampled textures alone would not reproduce that system. [Bérard et al., 2014](https://la.disneyresearch.com/wp-content/uploads/High-Quality-Capture-of-Eyes-Pub-Paper.pdf)

Wood and colleagues' SynthesEyes pipeline combines an articulated eye with scanned surrounding facial geometry, suitable topology and gaze-dependent lid shapes. It explicitly deals with gaps between lids and eyeballs and with restoring lost scan detail after retopology. This supports a whole-region workflow: socket, lid margin, tear region, lash roots and brow need to agree under motion. Its simplified optical model also provides a practical reference for rasterized approximations. It is a research rendering pipeline, not an asset already integrated into this game. [Wood et al., ICCV 2015](https://www.cl.cam.ac.uk/~pr10/publications/iccv15.pdf)

Pinskiy and Miller describe procedural lid deformation using spherical coordinates, curvature-aware propagation, wrinkle unfolding and gaze-driven surrounding tissue. The key transferable principle is that lids move over the curved eyeball and pull adjacent tissue; they are not flat sliding shutters. Their complete deformer is not implemented here. The current patch follows existing skin vertices, while a future asset pass should improve the underlying blink and gaze shapes themselves. [Disney, Realistic Eye Motion](https://media.disneyanimation.com/uploads/production/publication_asset/66/asset/realisticEyeMotion.pdf)

### Separate identity from expression and camera pose

MediaPipe supplies predicted landmarks, expression coefficients and transformation matrices. These are useful observations for a fitting system, but the interface does not turn an arbitrary photograph into measured metric anatomy. The current application runs this detector locally on CPU. It now consumes blink, squint, eye-wide and nose-sneer evidence instead of assuming every detected lid is a neutral lid. The transformation output is recorded for future calibrated fitting; the present solver does not claim a full perspective camera calibration. [Google Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)

SMIRK targets expressive and asymmetric monocular face reconstruction, while EMOCA emphasizes emotional fidelity beyond conventional geometric and image losses. Both reinforce the need to validate expression independently of neutral identity. Neither is installed as the default Studio backend. A future integration should share identity across views while allowing per-frame pose, gaze and expression; otherwise a smile or squint may become permanent geometry. [SMIRK official project](https://georgeretsi.github.io/smirk/), [EMOCA official project](https://emoca.is.tue.mpg.de/)

FLAME offers articulated eyes, jaw and neck together with shape and expression representation. It is a potential intermediate model, not a substitute for Human5's existing skin weights, morph channels and material conventions. Any conversion needs a reviewed correspondence map and separate attention to model terms. [FLAME project](https://flame.is.tue.mpg.de/)

### Capture motion, not just a pleasing still

AniEyelid reconstructs animatable eyelid detail from a phone RGB video using eyeball calibration and a neural eyelid control module. That is particularly relevant to your one-minute input request. However, the public repository lists an older CUDA/PyTorch environment and unresolved preprocessing/calibration release work. Its prepared data is described as academic-use material. It is a research candidate, not a verified one-click Windows/8 GB pipeline. [AniEyelid paper](https://arxiv.org/abs/2410.01360), [official code and current limitations](https://github.com/StoryMY/AniEyelid)

EyeNeRF combines explicit eye structure with a neural representation of the surrounding region to model difficult eye appearance. It is useful evidence that refraction, reflections and periocular appearance must be considered together. Its reconstruction and rendering approach is not the conventional GLB-plus-morph-target format expected by Human5. Importing it would require a deliberate conversion or a new renderer, followed by Quest profiling. [EyeNeRF, 2022](https://arxiv.org/abs/2206.08428)

## Newer reconstruction candidates and laptop feasibility

“Most advanced” depends on the output required. A face mesh with stable topology, a relightable neural avatar and a photorealistic image generator solve different tasks. The table distinguishes research value from compatibility actually established in this workspace.

| Method | Relevant output/strength | What remains before it can improve Human5 |
|---|---|---|
| Current Studio 2 | Actual local CPU landmark inference; conservative template fit; existing profile and expression compatibility | Does not reconstruct skin maps, hidden anatomy or an identical skull |
| Pixel3DMM, 2025 | Dense UV and normal predictions for fitting facial geometry; evaluation includes neutral and posed geometry | Separate environment, model assets, license suitability, target mesh transfer and actual laptop measurement |
| VGGTFace, AAAI 2026 | Multi-view, topologically consistent facial mesh; reported 16-view reconstruction on RTX 4090 | No measured 5060 Laptop VRAM/runtime here; transfer and expression rebuilding still required |
| UVFaceFusion, July 2026 | New UV-space multi-view fusion; reported under 3 seconds for 16 views on RTX 4090 | Public code currently lists base-resolution reconstruction only, with detailed inference pending; hardware and downstream terms need review |
| AniEyelid | Eye-region video reconstruction and animation | Calibration/preprocessing, compatible GPU environment and conversion into the game rig |
| EyeNeRF | Strong eye/periocular appearance and optical modelling | A different representation/rendering path; no tested mobile export |

Pixel3DMM's official repository uses a CUDA 11.8 installation example and states a noncommercial license. Its paper reports improved geometric accuracy; that is not a guarantee of likeness or eye realism for every uploaded photograph. [Pixel3DMM paper](https://arxiv.org/abs/2505.00615), [official code](https://github.com/SimonGiebenhain/pixel3dmm)

VGGTFace reports approximately 10-second reconstruction from 16 views on an RTX 4090 and exports a mesh. Its repository depends on Pixel3DMM's UV predictor and VGGT; its own MIT license does not replace those upstream terms. [VGGTFace paper](https://arxiv.org/abs/2511.20366), [official code](https://github.com/grignarder/vggtface)

UVFaceFusion is a newer candidate found during this pass. The July 2026 paper reports under three seconds on an RTX 4090. The public repository identifies GPL v3 for its code and lists detailed-resolution inference and training code as unfinished release items. This makes it a useful next benchmark, not grounds to promise an identical, HD-textured NPC on the user's laptop. [UVFaceFusion paper](https://arxiv.org/abs/2607.18798), [official repository](https://github.com/grignarder/UVFaceFusion)

NVIDIA lists the RTX 5060 Laptop GPU with 8 GB of GDDR7. The earlier “560” description is ambiguous, so the application reports the detected GPU and memory using `nvidia-smi` rather than assuming the name. No NVIDIA GPU was available for this validation. [NVIDIA laptop specifications](https://www.nvidia.com/en-us/geforce/laptops/50-series/)

PyTorch 2.7 introduced Blackwell support and CUDA 12.8 wheels. This is evidence against blindly reusing an old research environment on an RTX 50-series GPU; it is not a claim that 2.7 is the newest recommended release today. Custom CUDA extensions and their build targets also require compatibility checks. Keep experimental models separate from the working CPU Studio environment. [PyTorch 2.7 release](https://pytorch.org/blog/pytorch-2-7/)

Our engineering recommendation is to benchmark one offline geometric backend at a time with a neutral multi-view capture. Record total time, peak allocated/reserved GPU memory, failure handling and visual fit before writing a Human5 adapter. A 4090 result cannot be scaled by CUDA-core count into a reliable laptop forecast. Lower image count, reduced input resolution and sequential model residency are candidates to test, not established 8 GB fixes. The current release does not automatically install these research models or upload reference media to their online demos.

## Implemented neutral-fitting changes

The revised solver lives in `studio/fitting.py` and keeps the existing export format.

1. Project detections into image coordinates and remove in-plane roll using the eye axis. Map to the template's own eye-axis basis. Preserve the template's depth instead of treating learned monocular `z` as calibrated anatomy.
2. Weight samples by approximate frontality and face pixel coverage. This frontality score is a heuristic, not calibrated yaw. Side views remain useful for reference review but this solver is not a multi-view triangulator.
3. Build independent confidence weights for lids, canthi, mouth/chin and nose. Map MediaPipe anatomical left/right labels to the corresponding landmark groups; a unilateral blink must suppress the correct eye. Downweight blink, squint, eye-wide, smile/jaw-open and nose-sneer observations in the appropriate region.
4. Aggregate landmarks robustly, reducing the influence of large disagreements. Preserve measured asymmetry; use only weak symmetry regularization where confidence is low.
5. Blend uncertain eyelid targets toward a neutral prior. Apply the selected style only to that prior. Prevent inverted or collapsed neutral lids with broad bounds relative to the template.
6. Fit the nine existing sculpt controls with bounded robust least squares. Start from zero sculpt rather than implicitly treating Mira's previous preferred sculpt as anatomical evidence.
7. Fit a smaller extra spatial field. New exports use a 40 mm influence radius and a maximum displacement of 4 mm, versus the prior 65 mm/12 mm settings. Add stationary pins around the eye region and nose; suppress residual vertical/depth motion near the nasal tip and damp it near the eye center.
8. Export confidence and warnings alongside the profile. The displayed residual is mapped 2D-anchor agreement in template units, **not** a measured likeness error or medical-quality accuracy.

The solver intentionally leaves unobserved nose depth and rotation at the template. This prevents a known artifact but cannot prove the template nose matches the photograph. The next step for accurate nasal profile is calibrated multi-view geometry or reviewed manual sculpting, not increasing the uncertain prior.

The importer applies the extra field when geometry is rebuilt, not each rendered frame. It rebases expression endpoints through the deformation and preserves the supplied topology, UVs, skeleton and expression channel count. Old valid fields remain importable; the 4 mm limit describes newly generated Studio 2 fields, while the schema retains compatibility with earlier bounded fields. Photo fields must still be exported separately: the game's generic scene-save format does not persist them.

## Implemented eye rendering and motion changes

`mira-v2-tearline.js` now samples eight landmarks on the actual morphed and skinned face. It generates four very thin lid-contact ribbons and two lower tear ribbons, combined into **two meshes / 204 vertices**. The ribbons follow the local head transform and deforming skin instead of remaining fixed over the iris. They reuse vector scratch objects to avoid per-vertex temporary allocation. The full-blink regression measured approximately 5.6 mm of sampled lid motion and found finite ribbon positions.

The shade ribbon is 0.75 mm wide at its maximum and fades along its length and width. The lower meniscus is 0.32 mm wide. These are practical template-scale parameters, not a claim that every person's anatomy has those dimensions. The tear material uses a restrained wet highlight. Eye detail can still be switched to the existing Classic mode.

`mira-v2-eyes.js` retains the existing bulged eye geometry and adds no full-scene transmission pass. The advanced material uses a cornea-referenced IOR of 1.376, a restrained clearcoat lobe, warm scleral modulation, a softer limbus and a dark pupil. Iris parallax remains a bounded shader approximation rather than a ray-traced refractive volume. The iris texture is remapped as the pupil changes. These settings should be reviewed at oblique angles because a one-surface approximation cannot reproduce all internal optical effects.

Pupil contraction and dilation now use different damping rates. Illumination sampling reuses a scene-level light list refreshed periodically, replacing repeated full scene traversal for every nearby actor. This remains an artistic luminance response, not a physiological light-adaptation model.

The game already has eye/head target tracking, vergence, blink timing and gaze-dependent expression channels. This pass preserves them and removes the small baked-in neutral squint. It does not add an independently validated saccade or ocular-muscle simulation. The new tear details depend on the quality of those existing morphs; they cannot repair incorrect eyelid topology by themselves.

## How to get closer to the HD-video target

The following is a proposed asset workflow, not a claim that all steps ship in this release.

**Capture and fitting.** Use a close neutral portrait and several consistent three-quarter/profile views. For a video of at most 60 seconds, a practical allocation is 10 seconds relaxed forward gaze, 20 seconds slowly turning each way, 10 seconds looking up/down and sideways with the head still, 10 seconds natural blinks, and 10 seconds mild smile/frown. This is a suggested collection protocol, not a measured optimum. Keep the camera and lighting stable, avoid beauty filters, and retain original resolution. Studio's current frame selector ranks visual quality/diversity; it does not yet label the best neutral-eye frames automatically. Review and select those frames yourself.

**Geometry.** Fit the neutral socket depth, upper-lid fold, lower-lid curve, inner and outer canthus positions, iris visibility and left/right asymmetry. Check front, three-quarter and profile views. Maintain a continuous lid margin and contact with the eyeball through blinks, vertical gaze and expressions. Eye angle should come from the subject's evidence; do not inject a fixed upward slant to represent a style category.

**Surface maps.** Recover or author diffuse color with highlights removed, roughness variation, a separate eye normal map, detailed iris structure and restrained scleral vessels. Keep tear highlights in the material response rather than painting them into the iris. Avoid strong pore noise across the entire face: pores that are too large or contrasty can make skin look rougher and older than the reference. This is an asset-authoring observation from the current render, not an inference about the subject's health or age.

**Expression validation.** Compare relaxed open eyes, natural blink, full closure, smile, frown, surprise and side gaze. Evaluate moving clips rather than selecting a single attractive frame. A successful neutral image with a broken blink is still a failure. Gaze tracking should be stable and purposeful, with the head following larger shifts; excessive random motion would reduce realism.

**Lighting validation.** Inspect the same face under a broad neutral source, daylight, an interior lamp and night illumination. The corneal reflection must move with the view and lights. Strong overhead light can deepen sockets and exaggerate any geometric defect, so compare against a neutral setup before changing identity. Use actual in-game captures for acceptance; generated concept imagery would not demonstrate that the shader or rig works.

**Identity review.** Compare aligned crops at similar camera distance and expression. Review landmark placement, silhouette, brow-to-lid distance, iris exposure, nasal bridge and mouth relation. Keep a per-subject reference set. A single scalar residual, an attractiveness classifier or an image similarity score is insufficient to approve the character.

## Quest performance strategy

Meta recommends identifying whether the application is CPU-, vertex- or fragment-bound, then iterating with device captures. Its guidance includes reducing dynamic light cost, using compressed textures, managing transparency, and using fixed foveated rendering. Those recommendations support concentrating expensive detail near the selected NPC rather than giving every distant pedestrian the same eye cost. [Meta WebXR performance workflow](https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/)

For this release, the eye finish uses two small draws, no extra render target and no recurrent fitting. The shared light-list cache reduces scene walks. Existing actor LOD, population limits, foveation and adaptive quality remain. Scene-wide costs still dominate several software-renderer tests; the separate performance report records those results without turning them into a headset FPS claim.

A texture budget calculation illustrates why resolution is not free. An uncompressed RGBA8 4096² map occupies 64 MiB before mipmaps, approximately 85.3 MiB with a full mip chain. A 2048² equivalent is 16 MiB / 21.3 MiB. These are arithmetic estimates, excluding allocation overhead. Four 4K maps are roughly 341 MiB with mips in that format. Texture compression changes the storage calculation substantially; a compressed asset pipeline should be measured on the actual target. No new 4K eye/skin scan or compressed texture conversion is claimed in this patch.

Our proposed mobile priority order is: accurate silhouette and lid motion; coherent material/light response; stable close-range iris detail; then extra microdetail. Stream or downgrade high-resolution head maps for distant characters. Keep shadows and reflections budgeted across the scene; increasing eye realism must not secretly add a per-eye scene render.

A 60 FPS target corresponds to 16.67 ms per frame; 72 Hz corresponds to 13.89 ms. The app must request a supported session refresh rate and meet that rate's CPU/GPU budget. It cannot force a device to sustain 60 FPS by setting a JavaScript variable. Final approval requires an actual Quest session, stereo rendering, sustained play and thermal conditions. No Quest was connected here.

## Evidence and limits

The shipped validation covers synthetic neutral-fit invariance to roll and arbitrary monocular depth, suppression of blinking/squinting views, protection against nose lift, weak-evidence-only style behavior, preservation of asymmetric evidence, bounded field displacement and expression endpoint rebasing. It also exercises actual local MediaPipe inference on the supplied portrait, the 60-second video boundary, the Studio browser workflow and import into the running game.

The video inference test uses a repeated portrait encoded into a 60-second clip. It verifies upload/decoding, frame limits and the inference path; it is **not** evidence of successful reconstruction from a moving person or general video identity accuracy. The existing tests reject over-60-second input separately. The browser preview is a neutral clay head and does not reproduce the game's eye, skin, groom or lighting shaders.

The integrated game test checks field import, repeated shape changes, zero/restore strength, disposal, reimport, finite vertices and preservation of all 49 original expression channels. Eye regression captures and numerical results are included with the project. These demonstrate that the changes execute and that specific defects are controlled. They do not establish photographic likeness, perceptual beauty, accurate internal anatomy, real-world medical mechanics or stable Quest framerate.

The most consequential remaining work is a better authored or captured head/eyelid asset, reviewed blink/gaze correctives, a better groom, and calibrated skin/eye surface maps. The current procedural head and hair remain visibly synthetic. The report and release notes deliberately preserve that distinction so the next integration effort can target the real gap rather than repeat slider tuning indefinitely.

## Source inventory

All links below point to primary sources. Dates refer to the publication or project version identified above, with repositories consulted on 11 September 2026.

- Bérard et al., *High-Quality Capture of Eyes* (2014): [source](https://la.disneyresearch.com/wp-content/uploads/High-Quality-Capture-of-Eyes-Pub-Paper.pdf)
- Pinskiy and Miller, *Realistic Eye Motion Using Procedural Geometric Methods*: [source](https://media.disneyanimation.com/uploads/production/publication_asset/66/asset/realisticEyeMotion.pdf)
- Wood et al., *Rendering of Eyes for Eye-Shape Registration and Gaze Estimation* (2015): [source](https://www.cl.cam.ac.uk/~pr10/publications/iccv15.pdf)
- Google, Face Landmarker: [source](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)
- SMIRK (2024): [source](https://georgeretsi.github.io/smirk/)
- EMOCA (2022): [source](https://emoca.is.tue.mpg.de/)
- FLAME: [source](https://flame.is.tue.mpg.de/)
- AniEyelid (2024): [source](https://arxiv.org/abs/2410.01360) and [source](https://github.com/StoryMY/AniEyelid)
- EyeNeRF (2022): [source](https://arxiv.org/abs/2206.08428)
- Pixel3DMM (2025): [source](https://arxiv.org/abs/2505.00615) and [source](https://github.com/SimonGiebenhain/pixel3dmm)
- VGGTFace (2025 preprint / AAAI 2026): [source](https://arxiv.org/abs/2511.20366) and [source](https://github.com/grignarder/vggtface)
- UVFaceFusion (July 2026): [source](https://arxiv.org/abs/2607.18798) and [source](https://github.com/grignarder/UVFaceFusion)
- NVIDIA RTX 50-series laptop specifications: [source](https://www.nvidia.com/en-us/geforce/laptops/50-series/)
- PyTorch 2.7 release (2025): [source](https://pytorch.org/blog/pytorch-2-7/)
- Meta WebXR performance workflow: [source](https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/)
