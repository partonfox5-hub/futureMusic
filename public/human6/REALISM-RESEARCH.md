# Rendering and simulation choices · UPDATE 9

MQSR sharpens and spatially upscales the composited image. It cannot reconstruct skin source data or correct illumination. Meta warns about temporal flicker near display resolution. The native OpenXR QUALITY_SHARPENING flag has no equivalent setting in the WebXR Layers API. There is no MQSR switch added to Three.js here.

Priorities for this project: stable mapped anatomy; cornea/iris response and gaze; matching available AR light estimates; consistent photographic albedo/roughness/normal assets; frame pacing and then resolution. The 1.2 framebuffer option is an experiment, not a guaranteed native-resolution match. Render targets and recommended pixel density vary with the runtime. Keep 72 Hz unless the measured GPU and CPU frame budget supports 90. Foveation is adjustable. Native quad-layer menus need a separate compatible layer implementation; the current menu remains a textured mesh with hover feedback.

The new eye shader reprojects the photographed iris texture beneath the authored corneal bulge, remaps pupil radius and darkens the limbus. A MeshPhysicalMaterial clearcoat supplies environment-responsive wet highlights without the old additive shell. This is a single-pass approximation: not volumetric ray-traced refraction, a scanned replacement eye or a real-room reflection capture. AR primary light and SH estimates are used when available; room reflection capture and depth occlusion are not enabled. Depth sensing is separate from hit testing and must be capability-tested on the target browser.

Skin still uses the supplied maps, repaired UVs, blended seams and bounded wrapped-light diffusion. Upscaling these textures would not make them photographic. The strongest next asset investment is a consistently lit, cross-polarized, licensed full-body scan fitted to this exact mesh/UV layout with its paired normal and roughness maps. The adapted male profile shares the source female topology; a dedicated male scan and rig remains the next anatomical asset upgrade.

The new garment patterns are original parametric geometry fitted to the current skinned surface, with separate legs and garment slots. They are not photographs, branded products or scanned fashion assets. Their constrained particle mesh can drape, collide, tear locally under deliberate pull and detach; it is not Chaos cloth and has no full fabric self-collision or volumetric clothing layers.

Hair uses 20 seven-node guides, full gravity, stretch constraints, smoother Catmull–Rom interpolation and final card-vertex collision with body and player-hand capsules. Compact styles use fewer layers. Higher-end strand systems such as TressFX add guide/follower rendering, signed-distance fields and shock handling on GPU compute. Integrating that pipeline into this WebGL WebXR renderer would require new groom assets and a major rendering rewrite. More guide nodes alone do not turn cards into simulated dense strands.

Kokoro is the free local feminine TTS path (Heart, Bella, Emma), with a masculine Adam voice. The Apache-licensed model downloads on first use and runs on this device. First-run transfer and generation may be slow on Quest; a status label and retry control expose failures. TTS is not a conversational language model. Full NLP still uses the optional configured chat server; local scripted replies and local speech-recognition fallback remain available.

Primary sources:
- https://developers.meta.com/horizon/blog/vr-image-quality-meta-quest-super-resolution/
- https://developers.meta.com/horizon/documentation/native/android/mobile-openxr-composition-layer-filtering/
- https://www.w3.org/TR/webxrlayers-1/
- https://www.w3.org/TR/webxr-lighting-estimation-1/
- https://www.w3.org/TR/webxr-depth-sensing-1/
- https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- https://threejs.org/docs/pages/WebXRManager.html
- https://gpuopen.com/news/tressfx-4-simulation-changes/
- https://gpuopen.com/tressfx/
- https://matthias-research.github.io/pages/publications/XPBD.pdf
- https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX

No headset/GPU render validation is implied by numerical tests. Start with one NPC and add clothing and higher pixel density while measuring performance.
