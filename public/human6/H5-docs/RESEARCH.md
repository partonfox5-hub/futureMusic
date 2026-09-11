# Human5: realistic characters and interactive worlds on Quest 3 WebXR

Research and implementation assessment, 11 September 2026. This report separates published methods, engineering choices in this release, and work that still needs authored assets or headset evidence. The uploaded source was the integration authority; the complete project was consulted for call order, data structures and regression checks.

## 1. Recommendation and practical target

Use a conventional animated triangle mesh with a calibrated material, a small contact-aware tissue model, procedural variation around the existing animation, a fixed number of useful lights, and bounded world simulation. Spend the most quality budget on the face, silhouette, feet, hand contacts and the nearby room. Use expensive reconstruction or learning offline, then distill the result into the original rig and texture layout.

“Most advanced reconstruction” and “most appropriate interactive Quest representation” are separate decisions. A convincing rendered head from a research system does not automatically provide collision volumes, editable skeleton weights, watertight topology, two-eye performance, dynamic relighting and all game expressions. This release retains those interfaces instead of replacing the entire character with an incompatible representation.

The browser controls XR scheduling through its device/session interfaces. The application cannot force an unsupported display rate or override the runtime's scheduling. The current WebXR publication is a June 2026 Candidate Recommendation Draft; implementation support still matters. The release requests a supported rate, prefers 72 Hz when available, and measures what actually arrives. At 72 Hz the entire frame interval is about 13.89 ms; at 60 Hz it is 16.67 ms. These are time budgets, not promises. [W3C WebXR](https://www.w3.org/TR/webxr/)

## 2. Lighting: where the work should go

### Fixture light and visible fixture are independent

A scene may have many visible lamp meshes while only a few nearby sources use dynamic lights. The release builds standing lamps, table lamps, chandeliers, suspended shaded lamps and torches. Glass bulb envelopes surround a small emissive element. Shaded lamps use a downward spotlight when selected by the pool; chandeliers use a point source. Shadows, reflection, emission and actual light contribution are separate effects.

Quest defaults use two point-light slots and one spotlight slot, plus the directional daylight rig. Slots persist even when their intensity reaches zero. This avoids changing shader light counts as the player walks between rooms. Selection considers distance, brightness, retained ownership and wall obstruction. All bulbs remain visible. This is an explicit compromise: the pool does not compute additive illumination from every lamp in every house.

Glass uses a physical material with a refractive index and clearcoat, but no transmission render pass in the Quest default. Three documents that its physical material adds per-pixel cost and benefits from environment lighting. Real transmission, nested glass, thick refractive bulb walls and shaded-lamp caustics do not become negligible merely because the fixture is small. Keep full transmission as an optional desktop setting. [Three MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)

### Indirect light and shadows

The implementation uses an environment map generated once from a neutral room environment, restrained hemisphere illumination and one directional shadow map. This is not a baked five-house global-illumination solution. A production art pass should bake diffuse indirect light into the static architectural shell, preserve neutral material albedo, and use local reflection/irradiance data when moving through rooms. Avoid baking sun shadows into movable couches or clothing.

There are no dynamic shadows on pooled lamps in this release. Their obstruction checks prevent selecting a lamp across a blocking wall, but do not make the unshadowed source physically correct at every visible surface. A future room-aware lighting model can assign receiver masks or bounded local probes. Changing the renderer to implement that is a separate migration, not an assumed r170 feature.

Character self-shadow reception showed coarse artifacts in close-up verification. The default skin refinement therefore retains stable unshadowed skin receivers while leaving directional lighting, normal relief, environment response and world shadows active. `installSkinRefinement({receiveShadow:true})` remains available for a later validated shadow setup. This is a recorded quality limitation, not a claim that the artifacts were solved with accurate subsurface scattering.

The AR light-estimation path is optional. A successful probe estimates real-world illumination; it is useful for passthrough, not a substitute for authored VR lighting. The draft exposes directional and spherical-harmonic estimates, but an API being specified does not establish Quest support in every browser version. The adapter requests support and preserves a fallback. [Immersive Web lighting estimation](https://immersive-web.github.io/lighting-estimation/)

## 3. Skin and the meaning of “4K”

The strongest first improvement is coherent shape, normals and color across UV/material boundaries. A large texture cannot repair a neck whose head and torso photographs have different exposures, inconsistent limb normals, a poorly placed hairline, or rigid foot contact. These problems were visible in the provided pipeline and were addressed independently.

The release keeps vertex ordering, bone weights and morph channels. It welds compatible normals at coincident seam vertices, rebases morph deltas through the identity warp, removes a four-sample albedo blur and uses a continuous body tone below the jaw. The existing pore/wrinkle normal relief remains. This reduces exposure seams at the expense of some atlas-specific body color detail; it does not create new scanned anatomy.

The active source skin maps are 2048 square. The generated optional face draft is 1254 square. Neither is renamed or advertised as 4096. A genuine 4K delivery requires UV-compatible high-resolution albedo, normal and roughness data with enough source information to justify the texel density. Upscaling alone invents or interpolates detail. Fine pores should normally affect normals and roughness, while a sufficient mesh handles the silhouette.

A 4096-square RGBA8 texture consumes 64 MiB before mipmaps and about 85.3 MiB with a full mip chain. A 2048-square texture is one quarter of that. These are arithmetic storage estimates; actual compressed formats differ. JPEG download size does not equal GPU allocation. Loading multiple full-resolution body regions plus duplicated actor maps can consume memory rapidly.

KTX2/Basis delivery is the preferred production direction. Select appropriate color spaces and a supported GPU format at load time. Albedo is color; normal, roughness and masks are data. The loader in this release accepts a configured r170 KTX2Loader, checks actual dimensions and rejects an unconfigured compressed path. The transcoder binaries and new compressed skin atlas are not bundled. [Three KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html), [KTX2 specification](https://github.khronos.org/KTX-Specification/ktxspec.v2.html)

Classical multilayer skin rendering treats absorption and scattering as more than surface shininess. That literature explains why colored scattering and a specular layer matter. It does not establish that a multipass desktop technique fits this WebXR scene. The shipped shader is a restrained approximation using the host's existing wrap/crease system, not a measured tissue optical model. [NVIDIA GPU Gems 3, skin rendering](https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-14-advanced-techniques-realistic-real-time-skin)

## 4. Tissue, gravity, water and the spine

### Bounded simulation that works with the rig

The original project already contains a small XPBD TissueRig. Its installation was disabled on Quest, despite the new behavior needing it. The integration enables that bounded rig: four eight-particle clusters, fixed substeps and limited iterations. There is no full volumetric body solve.

XPBD introduces compliance into position-based constraints so stiffness behavior is less dependent on the chosen timestep and iteration count than ordinary stiffness-scaled position corrections. The Small Steps work provides further evidence for using smaller substeps rather than treating more iterations in one large step as equivalent. These are foundations for the chosen small tissue solve, not evidence of anatomical calibration. [XPBD paper](https://matthias-research.github.io/pages/publications/XPBD.pdf), [Small Steps paper](https://matthias-research.github.io/pages/publications/smallsteps.pdf)

The environmental adapter applies gravity, displaced-fluid buoyancy and drag to each tissue particle before its original constraint step. Existing soft bones continue to own centroid motion. A separate skin shader adds only the small affine shape change of a cluster about its center, clamped to 6 mm. This avoids applying centroid translation twice. Thigh and waist surface guides receive bounded gravity equilibrium offsets and inertia.

A submerged region does not necessarily float to the shoulder simply because it is called a breast. The behavior depends on its displaced volume, effective density, attachments, compression and the body posture. The simplified force used here is proportional to gravity times `1 − fluidDensity / tissueDensity × submergedFraction`. It is zero when gravity is zero. Fully submerged tissue with an effective density below water experiences a small upward tendency; denser tissue retains a downward tendency. Attachments still constrain the result. This is an engineering model, not a medical determination of anyone's tissue composition.

Zero gravity removes gravitational sag and buoyancy acceleration; it does not remove elastic restoring forces, damping or momentum. The system should settle toward its attachment/rest configuration without a magical upward breast pose. Tests cover finite zero-gravity state and both signs of density-dependent buoyancy.

### Articulation and contact response

The spine adapter uses four constrained angular response regions at the existing waist, spine and neck bones. It adds gravity/acceleration response, contact torque and an impulse response while retaining the host's pose, balance, grab and recovery ownership. Hands and feet are solved afterward using the established chains. It does not claim a vertebra-by-vertebra simulation, disc mechanics, measured muscle tensions or a calibrated injury model.

A better future anatomical model would calibrate joint axes and coupling rather than simply add more bones. SKEL is relevant because it connects a statistical human shape to a biomechanically motivated skeleton and degrees of freedom. Its model, licensing and retargeting requirements must be assessed before replacing this rig. More accurate offline joint calibration could be transferred back to a small runtime constraint model. [SKEL project](https://skel.is.tue.mpg.de/)

Grip and strike behavior still uses the project's established hit selection and impulses. New tissue deformation is bounded to keep attachments and triangles stable. Changing this to large arbitrary surface pulling would require validated attachment constraints, contact handling and corrective blendshapes. The module intentionally does not let a soft-tissue impulse become a second whole-body physics integrator.

## 5. Movement and expression

The gait adapter varies step duration and placement when a new step begins, adds foot roll, counterrotation and turning response, and keeps variation persistent for the step. Sampling new random offsets every frame would produce vibration rather than human variation. Foot placement, reachable targets and contact constraints remain more useful than adding noise to every joint.

Motion quality also depends on transitions. Inertialization and well-behaved spring formulations are useful references for preserving velocity while transitioning between animations. A future authored locomotion set should blend from the current motion state into the next one and solve contact consistently. This release augments the procedural host; it does not bundle a new motion-capture library. [Inertialization](https://theorangeduck.com/page/inertialization-transitioning), [Spring formulations](https://theorangeduck.com/page/spring-roll-call)

DeepMimic demonstrates physics-based imitation of reference motion and recovery behaviors. It is a research/training approach to robust motion control, not a lightweight library that can simply be inserted into a JavaScript render loop. For this application, offline training or motion extraction would need a separate project, followed by validation of the distilled controller on this skeleton. [DeepMimic](https://xbpeng.github.io/projects/DeepMimic/index.html)

Mira's reference preset uses bounded skull/jaw/cheek/nose/brow/lip adjustments and the original facial channel vocabulary. Soft smile, wide smile, frown, anger, reference look and surprise are provided. Expression deltas are transformed alongside neutral geometry, so a neutral sculpt does not invalidate the deformation basis. Speech can continue to own mouth channels. These are expression presets, not a claim that every photographed expression has been numerically recovered.

The reference hairstyle is a small crown and guided shoulder locks, replacing the original front cards for this preset. The legacy hairstyle controls remain available. The new groom is intentionally a practical mesh approximation; final close-up photographic quality still needs an authored strand/card groom and texture art.

## 6. What advanced reconstruction does and does not provide

DECA separates identity/detail reconstruction from expression so inferred detail can be animated. EMOCA focuses on emotionally expressive monocular reconstruction. These are relevant offline face-fitting approaches, but their output conventions, model files, licensing, template registration and texture quality must all be handled before use with Mira's existing facial rig. [DECA](https://deca.is.tue.mpg.de/), [EMOCA](https://emoca.is.tue.mpg.de/)

SMPL-X jointly models body, hands and face and is useful as an intermediate fitting representation. It is not the same topology, skeleton or blendshape basis as the uploaded character. A useful pipeline must transfer the fitted proportions and surface to the host rig, preserve expression/skin weights and quantify residual fitting error. An unrigged reconstructed mesh is not yet a game NPC. [SMPL-X](https://smpl-x.is.tue.mpg.de/)

GaussianAvatars attaches Gaussian primitives to a parametric face surface and demonstrates controllable expression/pose rendering. It is an important photorealistic head representation, but does not by itself deliver a relightable, destructible whole-body Quest character with the current game's physics interfaces. [GaussianAvatars](https://shenhanqian.github.io/gaussian-avatars)

PhysGaussian couples Gaussian representations to physical simulation using continuum mechanics. It is relevant to longer-term research into reconstructed materials and motion. There is no evidence in the source that this system's reconstruction/training, simulation and rendering fit the requested complete Quest scene. Treat it as an offline research candidate, not a feature silently present in these modules. [PhysGaussian](https://xpandora.github.io/PhysGaussian/)

The supplied images cannot establish exact hidden geometry, tissue properties or skull shape. A front photograph can constrain projected features but not the depth of an unseen back or profile. Multiple views help, but unknown lens distortion, pose, clothing and lighting remain confounders. The delivered artist preset is therefore labeled an approximation. A future fitting app should preserve that uncertainty and allow explicit height and manual correction, rather than invent exact measurements.

## 7. Fire, damaged furniture and textiles

The thermal system stores heat, remaining fuel, wetness and exposure. Torch flames follow their wick transform whether the torch is held, lying down or moving. Sweeps between frames reduce missed contact with thin objects. The thermal update has a spatial grid and a fixed visual emitter budget. Flames are crossed animated meshes, not a fluid solver.

Wood, outer fabric, foam, paper and inert surfaces have different artistic ignition/spread settings. Exposed stuffing lights more readily and burns faster. A couch or mattress contains an outer shell and inner foam; a cut creates an opening through the outer shader/depth mask and reveals the inner material. Loose stuffing enters the original movable-object solver. Fire spreads through registered combustible surfaces, not through every arbitrary unregistered material or inert glass/metal.

Pet-food bags retain their food records while receiving a shaped body, top seam, pull tab and open mouth. Removed original meshes are removed from picking. A top-opening action does not replenish the food. Bed mattresses have a support plane independent of the headboard, detach on grabbing, and use the same layered damage path.

Knitted rugs use a small deformation grid. The visible weave has filtered strand gaps and pattern variation; major damage removes actual triangles. Two-hand stretching can break links, while cuts also release adjacent bend links. This is a fabric approximation, not a simulation of every knot. Carpet uses shallow height variation, normal detail and a bounded near-view pile representation. Distant carpet avoids drawing individual fibers.

## 8. Neighborhood and vehicles

Five furnished plans contain 1, 2, 3, 2 and 3 bedrooms respectively. They use distinct arrangements, a corridor where needed, real openings and the original operable doors. Shared furniture gets color/pattern and size variants. This avoids creating a separate expensive art/material set for every room. The cul-de-sac has road markings, paths, curb parking and terrain clearance around the buildings. The original scenes remain selectable.

Vehicles keep the source panel/damage model, doors, player seating, steering interaction and puncturable wheels. The refinement adds model details, dashboard speed/RPM, six automatic Drive ratios, shift hysteresis, torque interruption, creep, a direction-change interlock, four suspension contacts, terrain normals, load-dependent grip and speed-sensitive steering. Park no longer flattens the chassis on a slope or glues an airborne zero-gravity car to the ground.

Mechanical damage is coupled to the solver: impacts near wheels change alignment and suspension, front-end damage reduces steering authority, and engine-region damage reduces available torque. Wheel toe/camber changes are visible. Damage is bounded and Repair resets both panel deformation and mechanical state. This is a tunable gameplay model, not a calibrated crashworthiness simulation.

A four-contact sprung-mass model and tire-force limits are established practical approaches. PhysX's vehicle documentation explicitly separates suspension scene queries, loads, tire forces, drivetrain and rigid-body integration. The shipped solver borrows that architecture at a small scale; it is not PhysX, a full tire model or a reproduction of GTA's proprietary handling. The original collision and damage system remains the owner outside the replacement vehicle step. [PhysX vehicle guide](https://nvidia-omniverse.github.io/PhysX/physx/5.4.1/docs/Vehicles.html), [Jolt vehicle constraint API](https://jrouwe.github.io/JoltPhysics/class_vehicle_constraint.html)

## 9. Voice is an input pipeline

TTS success proves output audio, not microphone permission or transcription. The release explicitly acquires a microphone stream and keeps it across XR entry; it does not grant, immediately stop, and reopen the microphone. It checks availability/policy, distinguishes blocked or missing input, maintains a silent analyser sink, and closes tracks on shutdown or cancellation. A late permission grant after cancellation is stopped.

Microphone acquisition belongs to Media Capture, with secure-context and permission requirements. It is not an invented `microphone` optional WebXR session feature. A permission dialog may consume the user activation needed by XR, which is why the UI can require one additional Enter VR tap after the first grant. [Media Capture and Streams](https://w3c.github.io/mediacapture-main/)

On the Quest code path, a recorder and bounded voice-activity segments feed an existing speech server or the local worker. Local model warmup is explicit. Listening pauses during Mira's reply, and errors in TTS release that pause. The tests cover retained stream ownership, cancellation, local warmup, segmentation, transcript delivery and shutdown. They do not simulate an actual Quest operating-system permission dialog or certify its microphone hardware.

## 10. Performance priorities and acceptance

Measure all render passes and long frame intervals. Do not publish an FPS counter that drops the slowest frames. The release records delivered intervals, CPU sections, optional asynchronous GPU timer results, draw calls, triangles, resource counts and detail tier. GPU results are associated with their original frames. Disjoint timer results are discarded rather than treated as valid.

The adaptive tiers change foveation, nearby carpet pile, interior detail distance and update budgets with hysteresis. Furniture can sleep until its state changes; held and moving objects wake. Opaque rigid parts can batch while hits resolve to the original part. Far noninteracting actors have a lower pose update rate. Mirrors and portals have bounded extra-view cadence. The source car mirror already has a stricter cadence and keeps it.

Framebuffer scale must be selected before an XR session in Three's WebXRManager; it is not a safe arbitrary mid-session quality slider. Foveation can be adjusted through supported runtime behavior. The implementation follows those constraints rather than resizing active XR render targets on every slow frame. [Three WebXRManager](https://threejs.org/docs/pages/WebXRManager.html)

The measured CPU hot paths included unnecessary pet contact scans and repeated skeleton updates. The integration adds a conservative broad phase, respects the existing petting cooldown before scanning, updates shared skeletons once per contact batch, and uses the existing bone palette for vertex queries. An equivalence test compares the optimized deformation with Three’s original skinning.

The final test report records actual local measurements and their limits. The local browser uses SwiftShader and a simulated Quest user-agent branch, not Quest hardware. Its mono render counts and CPU simulation microbenchmark are useful for regression; its FPS is not a headset prediction. Acceptance for the target still requires the on-device protocol in `QUEST-TEST-PROTOCOL.md`, including thermal soak, voice, grabbing, fire, water and driving.

The performance objective remains sustained supported refresh with comfortable headroom. If on-headset timing misses that target, reduce measured expensive work first: unnecessary skinned contact scans, duplicate transforms, overdraw and extra views. Keep close face quality, hand responsiveness and clear motion ahead of distant decoration. No result in this package certifies “forced 60 FPS.”
