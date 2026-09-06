# Mira v1 + v2 — revision 8

Replace the complete `human2/` folder with this package. Its folder layout is unchanged: `human2/`, `human2/assets/`, and `human2/assets/tex/`. V2 scripts use `?v=8` and textures use `?v=r8`; purge the hosting/CDN cache when updating. Open `human2/index.html` over HTTP on desktop or HTTPS on Quest. Start with one actor on Balanced.

The original Mira remains selectable in the shared spawner. `mira-v1.html` opens the original scene. The original core, voice code, preserved engine, GLB and uploaded textures are unchanged. V2 keeps actor geometry, materials, animation and physics state separate.

## Revision 8 — contact, clothing, scenes and voice

- **Skin contact:** hands, finger-group probes, forearms and heads now receive a final collision pass against deformed/morphed body triangles, with bone-group broad-phase culling. Own-limb surfaces are excluded from their own probes. Existing flexion limits still control the arm solve; head corrections stay bounded. Contacts feed the existing soft-tissue response. This substantially reduces penetration, but finite probes, limited iterations and bounded neck/arm reach do not guarantee zero penetration or exact deformable-body collision. Main actor masses still use the existing capsule separation.
- **Wardrobe:** the wooden rack holds a linen top, wrap skirt and summer dress. On desktop, drag a garment onto a v2 actor. In VR, point at a garment, hold trigger, move it over Mira and release. The desktop clothing selector and VR SCENE page also equip the selected actor. Trigger-drag worn fabric to pull it; a sustained pull releases its anchors. High local stretch removes adjacent faces and constraints to form a tear. Detached pieces can be dragged back onto a Mira to fit a fresh garment; at most four unheld loose garments remain. Body meshes are never hidden or replaced.
- **Cloth model:** each article is a separate 252-particle, 448-triangle mesh with stretch/shear/bend constraints, fixed 1/90-second steps, gravity, body/player-hand volumes, and deformed-skin attachment contact. Skin attachments follow existing shape and tissue motion. Cloth collides with scene boxes and the floor. This is a small experimental XPBD-style solver and three simple procedural garments, not Unreal Chaos Cloth, tailored production garments, full cloth self-collision, robust continuous collision detection or physical tear propagation. Pulling and extreme slider/activity combinations can still produce intersections.
- **Three dioramas:** Living room, Jungle and Beach are selectable on desktop and in the VR SCENE tab. They use procedural 3D scenery, chairs/couch seats, and collision obstacles. These are compact geometric dioramas, not scanned photoreal environments. Floor targets use a grid A* route with inflated obstacles and guarded diagonal movement. Point/click or point/trigger a seat to walk to its approach point and sit, with hips aligned to the cushion and feet on the floor. A new command releases a seat; standing up is a transition shortcut rather than a captured get-up clip. Main furniture/rock contact uses bounding boxes. Balls collide with their tops and sides. Player locomotion is blocked by obstacles.
- **Menu:** opening Y positions the panel using the headset's world orientation, including player-rig rotation. It also recentres when left behind or turned away from. SCENE includes scene, wardrobe and voice choices. The original passthrough AR entry remains available separately; diorama geometry is hidden in AR.
- **Voice startup:** entering VR/AR enables the microphone and gives a greeting after a short pause. The browser's microphone permission prompt must be allowed. Input pauses during replies; exiting XR stops microphone capture. A missing server is detected quickly through `/api/mira/health`.
- **Speech fallbacks:** browser recognition is tried first. When it is absent or fails to produce a result, a separate worker can transcribe using quantized Whisper Tiny English through Transformers.js. Its first use downloads runtime/model files from jsDelivr/Hugging Face; startup can take time and internet access is required for that download. Audio stays on the device on this fallback path. Browser speech voices are used for replies; if unavailable, a separate pinned eSpeak worker generates basic audible speech. That voice is intentionally a compatibility fallback and sounds synthetic. Server TTS is used when configured.
- **Conversation limit:** offline replies classify a small set of intents/emotional cues and use authored responses. They are not a general LLM. Full conversational NLP and higher-quality voices require the included `mira-voice-server.mjs`, `OPENAI_API_KEY`, and `MIRA_ORIGIN`, with `/api/mira/health`, `/api/mira/stt`, `/api/mira/chat` and `/api/mira/tts` forwarded from the same HTTPS origin. No API key was supplied, and no paid provider calls were made. ChatGPT subscription/credits are not embedded as an API credential.

### Validation and practical limits

`validation-v2.json` includes this revision's numerical/contact, seat/path, cloth and menu checks. A deliberately embedded wrist was reduced from roughly 74 mm penetration to roughly 3 mm in the sampled contact fixture. All three scene fixtures produced obstacle-free seat routes. Seated hips aligned at 0.59 m and feet at 0.065 m for the test actor. Sustained cloth pulling detached its anchors and removed six faces in the tear test. Menu checks cover headset yaw and a rotated/translated player rig. The basic speech engine is checked for generated WAV output.

These are CPU and mocked-input checks. No GPU appearance, real microphone/Whisper accuracy, headset audio, or Quest frame-rate validation was available. Triangle contact and cloth add significant CPU cost: start with one Mira and one garment, then measure on the Quest before adding actors/articles. The retained UPDATE 7 checkpoint is available through the previous download/version.

Research and components: [XPBD paper](https://matthias-research.github.io/pages/publications/XPBD.pdf), [Epic cloth asset/collision workflow](https://dev.epicgames.com/documentation/unreal-engine/panel-cloth-editor-overview), [browser speech recognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [microphone permissions](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [Transformers.js 2.17.2 pipelines](https://huggingface.co/docs/transformers.js/v2.17.2/pipelines), [Whisper Tiny English model](https://huggingface.co/Xenova/whisper-tiny.en), [standalone eSpeak/speak.js source and GPL notice](https://github.com/kripken/speak.js). The eSpeak engine is fetched at commit `9c6f642f7d78bab51d16b2e8b79cdf205643ec35`; its source/engine is separate from this ZIP. Transformers.js is pinned to 2.17.2; model files use the named repository's main revision.

## What changed in revision 7

- **Point to walk:** click a Mira to select her, then click a floor location. Drag still orbits; Shift-drag or Grab body still manipulates the hit surface. In VR, point at a Mira and pull trigger to select her, then point at the floor and pull trigger to walk there. A ring marks the selected destination. Commands stop on arrival, within the existing walking tolerance. Targets are limited to the room floor (3.8 m from centre, at most 8 m along the ray); this is direct steering, not obstacle-aware navigation.
- **Y opens POSES:** the selected actor's panel now starts on a page with Free behaviour, Relaxed stand, Wander, Hands on hips, eight exercise/activity choices, Hug nearby and Arm around. ACTOR, BODY, STYLE and MOOD remain accessible. Grip continues to grab the body; trigger operates the panel or floor commands. Trigger release does not release a grip.
- **Held idle positions:** Hands on hips uses both arms with outward elbow bends. Manually selected idle positions stay active until changed; automatic idle still varies poses. Desktop Idle pose and the VR pose cycle share these choices.
- **Buttock sculpting:** Butt height, Butt spacing and Butt angle complement the existing Butt size control. The same controls appear on desktop and across the four BODY slider pages in VR. Symmetric surface warps feather into the attachment and preserve the central fold; sampled combined extremes pass local orientation checks.
- **Nearby social gestures:** two free-behaviour v2 actors occasionally approach, face one another for a hug or stand alongside for an arm around, smile, ease into contact, then release. The same gestures can be requested from POSES with a compatible idle/walking v2 partner within 2.5 m. Grabs, a new walk/pose command, speech or falling interrupt the pair. Torso/head capsules separate main body masses; hand targets project to the partner's exterior and arm IK retains its flexion constraints. These are coordinated procedural gestures with approximate contact, not a full active ragdoll or mesh self-collision solver. Very different actor heights and busy actors are excluded.

## Revision 7 checks

Actual model tests cover directed-walk arrival and stopping, a sustained hands-on-hips pose, both social sequences through approach/hold/release, interruption of both partners, and separation of overlapping main-body capsules. Input mocks cover ray selection, floor-trigger walking, invalid rays, opening POSES with Y, buttock-slider pagination, reconnection and reversed controller order. Shape sampling covers the three new buttock controls at combined limits. The release includes results in `validation-v2.json`.

No GPU render or Quest hardware test was possible in the available browser. Social poses were inspected with CPU geometry views; clothing/hair and fine limb-to-limb contact are not guaranteed collision-free. Existing shader-generation checks are not a substitute for compiling on the headset. Revision 6 limitations below still apply.

## What changed in revision 6

- **UV seam repair from the supplied original FBX.** The old exporter collapsed polygon-corner UVs into one UV per control point. V2 now restores 1,478 seam vertices and corrects 4,223 triangle corners across skin, nails and lashes. Every split carries its original skin weights and all facial morph deltas. The unchanged original GLB remains the v1 source. Skin colour matching now includes seams within the same material, including inner arms and legs.
- **Skin detail.** A new generated, photograph-inspired hairless skin swatch adds subtle rest-space detail across chest, abdomen, back and buttocks, blended continuously across UV seams. The original anatomical maps remain. Leg albedo is filtered more gently and normal strength reduced to soften the coarse follicle appearance. This is generated detail over the supplied textures, not a new scanned or cross-polarized body texture set. The recovered original torso source was also too flat to supply missing photographic information.
- **Four compact hair options:** low bun, pixie crop, light short bob and high bun, alongside the four earlier styles. Compact cuts use one card layer rather than two; buns include a separate tied volume within the same mesh. Compact hair has lower compliance, while loose cards retain motion/contact. Desktop and VR share all eight choices.
- **Resting arms.** Gravity-oriented upper/lower segments replace fixed resting wrist targets. A small damped shoulder pendulum follows body acceleration and gait; the resting elbow is slightly flexed. Gesture/exercise/grab IK still controls purposeful reach. IK caps arm flexion at 145 degrees and knee flexion at 140, with bend poles and softened extension.
- **Larger tissue under gravity.** Lower-pole shape now responds to size and softness. Increased downward excursion and lower attachment frequency allow more settling, particularly at the rear. Gravity limits no longer depend on the jiggle-intensity setting. Triangle orientation protection remains enabled at extreme settings.
- **Ordinary hand contact.** New **Hand contact response** slider, 0–4 (default 1.35), controls tissue impulse/indentation from palms and finger segments without gripping. Zero disables this extra contact-driven tissue response; it does not disable collision detection, gravity, or gripping.
- **Very light controller haptics.** Skin, head, hair and floor contact use short, coalesced pulses. Intensity stays at or below 6.5%, duration at or below 18 ms, with at least 120 ms between pulses per controller. Browsers/controllers without haptic support are a no-op. Bare optical hand tracking cannot vibrate.
- **Torso manipulation.** Rotating a grip on the hips, belly or chest turns the body and distributes bounded bending/twist through Waist, Spine01 and Spine02. Releasing lets the torso return smoothly. Surface contact offsets and independent two-controller grabs remain. Limb solving runs after the final arm pose, preserving a held limb during gestures. Spine/joint behaviour is a constrained animation/physics approximation, not a biomechanical vertebra/disc model.

## Revision 6 validation and remaining limits

Numerical checks compare every corrected UV corner against the original FBX, preserve every morph count, inspect deformed arm surfaces, measure resting elbow angles, exercise all eight hair choices and eight activities, check gravity settling versus size, verify torso limits/return and contact-slider response, and mock-test haptic pulse caps. Extreme shape/deformation checks found no inverted triangles in the sampled cases. Y-button reconnection, menu pagination and selection checks pass. Fifty-two surface/depth shader variants are generated successfully, including the previous zero-morph crash regression.

The available browser cannot create WebGL (`GL_RENDERER = Disabled`), so there is no GPU-render or Quest 3 hardware validation. CPU geometry views are diagnostic, not rendered appearance proof. Headset performance, haptic feel, shading and fast hand contacts still require on-device review. These bounded surface/bone solvers do not guarantee self-collision-free anatomy in every possible pose and slider combination. Voice still requires working browser recognition or the documented server endpoints below.

Research: [Khronos glTF attributes](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), [passive/active arm dynamics](https://pubmed.ncbi.nlm.nih.gov/19640879/), [layered skin reflectance](https://vgl.ict.usc.edu/Research/LFR/), [XPBD compliance](https://matthias-research.github.io/pages/publications/XPBD.pdf), [Gamepad haptics](https://www.w3.org/TR/gamepad/). Compliance changes deformation under load; damping controls decay. Increasing damping alone does not produce greater gravitational sag.

The skin-detail asset was generated with the built-in image tool from a seamless, evenly lit, hairless inner-forearm-skin swatch brief with fine pores and restrained colour variation. Asset: `assets/tex/skin_detail_v2.jpg`. No full-body image editing or paid voice-provider calls were used in this revision.

## Revision 5 implementation history (superseded where described above)

### Arms, fingers and player hands

The supplied arm vertices have a baked A-pose tilt of about 30 degrees, while the arm bones and inverse bind matrices describe a T pose. The previous correction omitted the twist and elbow-share bones that carry most arm weights, leaving the wrist and arm surfaces in different rest poses. Revision 5 includes those bones, restoring a continuous arm surface aligned with the skeleton. It also removes unrelated body-bone influences from distal arm/hand vertices. These issues made moving hands distort even when the bone positions themselves looked correct.

Arm width now changes the surface instead of multiplying upper-arm and forearm scales through the hand hierarchy. The thumb scale reductions are removed. Resting wrists sit beside and slightly ahead of the hips; the elbow bend plane sits behind the upper arm. The IK reach interval bounds elbow flexion to 150 degrees, with softened full extension. Arm swing follows the footstep phase with a small delay, plus subtle motion during standing. Finger flexion now uses the rig's actual knuckle axis, with relaxed curl, small spreading and different open/holding states.

Controller hands use the supplied textured hand and nail geometry, isolated from the body and articulated through its skeleton. Each visible hand has 3,380 triangles. Left/right orientation is corrected, and palm/finger capsules follow the joints, including fingertip extensions. These are controller-driven hands; optical hand-tracking retargeting is not implemented.

### Expressions and attention

Happy and laughing expressions combine mouth-corner lift, cheeks, dimples and moderate eye narrowing. A small jaw opening now survives the original idle pipeline. The default feeling is warm/content. Manual expression selection and contextual emotions remain available.

Blink intervals are divided by 1.3: **30% more frequent on average**, with the same closing/opening duration. Finite fixations alternate between the player, nearby Miras and room targets. Eyes respond faster than the head and neck. Low-amplitude brow, smile and cheek changes, breathing, slight head roll and speaking nods add variation. These are authored procedural cues, not measured emotional microexpressions or captured facial performance.

**Lively idle** is the default for newly spawned v2 actors. It alternates short walks with rests and occasional greetings. Six walk styles and sixteen idle actions are available: rest, weight shift, hands together, hand on hip, hair tuck, looking at a hand, wave, explanation, shoulder roll, looking around, breathing, neck stretch, sigh, arm stretch, wiggle and dance. Actions ease in and out; quiet intervals receive more weight. Stand/Walk/exercise buttons select manual movement. Lively idle resumes autonomy.

Eight coordinated activities are available: squats, overhead stretch, jumping jacks, marching, side steps, dancing, alternating reaches and heel raises. Final hip motion, planted/raised foot targets and arm IK drive the tissue anchors. The additional activity tags also work with the conversation client. These remain procedural animations rather than motion-captured clips.

### Head and hair interaction

Grip the head and turn the controller, or move the contact point, to turn it in yaw and pitch. The neck shares the motion. This constraint turns the head without dragging the whole actor; it has bounded pitch, yaw and roll and eases back after release. Passive controller-hand contact also gives a small head/neck response. It is an approximate capsule/contact model, not full skin-to-skin collision.

Hair has **41,798 vertices**, twice the original card count, in two offset layers. Four selectable silhouettes reuse the supplied atlas: **Long layers, Shoulder length, Soft bob and Swept back**. They reshape the existing cards; they are not four newly authored strand grooms.

Twenty five-node chains (100 guides) provide pinned roots, compliant length/rest constraints and damped movement response. Body and player-hand capsules project the guides after shape constraints, so rest-shape limits cannot undo contact. Collider interpolation and tangential velocity transfer give brushing motion. The final card vertices also project against up to 32 nearby capsules in the vertex shader, reducing penetration between guides. Body projection runs before player-hand contact. The flexibility slider changes rest-shape strength and allowed deflection.

This is an approximate hair-card system, with no strand self-collision. Fast tracking jumps and mutually intersecting head/hand colliders remain limitations. Two card layers and vertex collision work increase GPU cost; start with one actor on Quest and measure performance on the headset.

### Skin and soft tissue

V2 matches adjoining skin material colors in linear light at shared surface locations and feathers the correction over a roughly 10 cm surface neighborhood, with geodesic distance relaxation and smoothing in log color-gain space. This preserves each map's texture detail while reducing hard color jumps at material borders. It cannot remove every artifact painted inside an atlas.

The skin shader uses a bounded roughness range, a dielectric reflectance of approximately 0.028, restrained diffuse wrapping and adjustable normal detail. A mild four-neighbor albedo filter softens harsh pixel detail without changing the texture files. Coincident UV vertices share compatible normals. Studio key/fill/rim lighting reduces harsh contrast. V2 skin stops receiving the low-resolution self-shadows that can appear as black scuffs; it still casts floor shadows. This removes those shadow artifacts at the cost of detailed body self-shadowing. Eye/cornea highlights are restrained. The UV-constrained head albedo generated in revision 4 uses the latest AI face reference; the existing small reference head-proportion sculpt remains. Five proportional face presets are available: Natural, Reference, Soft oval, Heart and Defined. The head/eyes/teeth and expression endpoints receive consistent small proportional edits. These are variations of the supplied identity and an approximate reference likeness, not recovered 3D face scans. Smiles now use stronger mouth-corner and cheek poses with moderate jaw opening. The source head image is 1,254 square pixels; it is not presented as a new 4K photographic scan.

The body still uses the uploaded diffuse texture and original normal/roughness maps. No new photographic body scan is included. Its source detail and painted artifacts remain a quality limit.

Breast enlargement uses a sequence of small smooth surface warps, preserving the chest attachment while changing volume. Placement, symmetric spacing and symmetric angle are independently adjustable. Combined extremes receive the same deformation checks. Nonuniform hip/waist/thigh bone scales and thigh-root translations are replaced with continuous surface shaping, removing a source of inner-leg tearing.

Buttock weights now cover a broader rear region and peak above the source's roughly 25% maximum. Unrelated glute weights are removed from the hands; the centre crease and attachment regions remain anchored. Buttock surface growth includes a lower-pole displacement and a transition into the upper thighs. The authored centre fold is preserved.

**Jiggle now spans 0–6 (previous maximum 3), default 2.8.** Softness controls compliance/oscillation frequency; damping separately controls settling. Higher viscosity would suppress oscillation, so it is not used as a synonym for softness. Free tissue has stronger inertial response and wider bounds. Grabbed tissue has a stiff, highly damped anchor. Fixed 1/120-second substeps remain. Triangle-derived displacement constraints reduce motion in directions that would invert the surface, adapting to the current shape. Consequently the maximum safe displacement depends on size and placement.

Five small additional surface guides add secondary motion at the waist, left/right upper thigh and left/right cheek. Their controls are separate from breast/buttock motion. The depth pass receives the same guide offsets. These reduced models do not conserve full incompressible tissue volume or simulate FEM, Dyna, or a general active ragdoll. The procedural fall/get-up system remains: standing → falling → down → recovering → standing. Holding a limb delays recovery. Full environment-mesh and arbitrary body self-collision are not implemented. Revision 7 adds limited torso/head contact between actors.

## Controls

| Input | Action |
| --- | --- |
| Desktop click Mira / click floor | Select actor / walk to target |
| Desktop drag / wheel | Orbit / zoom |
| Face view / Body view | Frame the selected actor |
| Grab body, then drag; or Shift-drag | Pull the hit surface in the camera plane |
| Lively idle | Resume autonomous rests, social actions and short walks |
| Stand / Walk / exercise buttons | Select manual movement |
| Quest left Y | Open/close POSES, activities, spawner and sliders |
| Controller ray + trigger | Select actor, walk to floor target, or operate the open menu |
| Grip near body | Grab a limb, tissue region or head |
| Turn controller while holding head | Turn head and neck |
| Quest right B / desktop B | Spawn a ball |
| Left stick / right stick | Move / turn |

Y/B use the secondary face button at index 5 for the Quest Touch profile. Y edges are read directly from session input sources, independently of controller connected-event order, and reset on reconnection/new sessions. The panel draws over scene geometry. BODY has four pages of sliders; STYLE has face, hairstyle and hair-color choices. The v1-only page retains its original controls. The panel opens on POSES for the selected actor. Player locomotion pauses while the VR menu is open. Both controllers can hold independently.

## Quest voice

The client now requests the microphone once and unlocks its AudioContext in the activation gesture. It monitors quieter speech, records before speech starts so the initial syllable is retained, pauses input during replies, and falls back from browser recognition errors to `/api/mira/stt`. Stopping voice cancels pending work and releases microphone tracks. Native-recognition failure, missing endpoints, HTTP errors and invalid transcription responses are visible.

The desktop panel shows a microphone level meter and status. The VR menu also shows voice status. If the meter moves but transcription fails, microphone capture works and the server connection needs attention. Static hosting alone cannot supply transcription when the browser lacks working SpeechRecognition.

The client retains these same-origin routes:

| Route | Request | Response |
| --- | --- | --- |
| `POST /api/mira/stt` | Multipart `file` containing audio | JSON `{ "text": "Hello Mira" }` |
| `POST /api/mira/chat` | JSON `text`, `persona`, bounded `history`, `emotion` | JSON `reply`, optional `emotion`, `intensity`, `valence`, `arousal`, `action` |
| `POST /api/mira/tts` | JSON `text`, `voice` | Audio bytes with an audio content type |

Existing working endpoints can remain in place. If your website lacks them, this package adds **`mira-voice-server.mjs`**, an optional Node 20+ companion implementing all three routes. It uses server-side OpenAI credentials, accepts only the configured page origin, caps request sizes/concurrency/rate, and binds to localhost. No API key is included, and no paid API requests were made during verification.

Configure `OPENAI_API_KEY` and `MIRA_ORIGIN` in the server environment, with MIRA_ORIGIN exactly the HTTPS origin of the website, then run:

```sh
node mira-voice-server.mjs
```

The default local port is 8787. Optional variables: `MIRA_VOICE_PORT`, `MIRA_STT_MODEL` (default `gpt-4o-mini-transcribe`) and `MIRA_CHAT_MODEL` (default `gpt-4o-mini`). TTS uses `tts-1` / `nova`. These API calls use the configured provider account, separately from this editing session.

Route `/api/mira/` through your existing HTTPS host and access controls to the companion. For example, inside an existing nginx HTTPS server:

```nginx
location /api/mira/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
}
```

A static-only host needs a separate server/function for these routes. The companion does not host the web page. It requires deployment and credentials on your infrastructure; it is not automatically activated by uploading the ZIP. When chat is unavailable, the UI labels the short local fallback replies. Browser speech synthesis remains the audio fallback. History and emotional context are separate per actor and held in session memory, up to twelve messages. Legacy `[[EMOTION:happy]]` and `[[ACTION:stretch]]` reply tags remain supported.

## Validation and render fix

`validation-v2.json` records the checks and their scope. Tests use the supplied GLB and Three.js r170 with texture loading stubbed for Node. The prior empty-morph-attribute bug remains fixed: eyes and teeth have no empty `morphAttributes.position` property, while body meshes retain 49 expression targets. Surface/depth program generation covers both v1 and v2, and the earlier render-loop exception is reproduced by the regression fixture.

Revision 5 checks use actual skinned arm and finger vertices, not only bone endpoints. CPU surface plots were inspected for standing, squats, marching, stretching and dancing. Numerical tests cover eight activities, four distinct hair silhouettes, a brushing guide and final-card contact fixture, five face geometry variations, stronger smiles, independent softness/damping response, shape Jacobians at combined extremes, and 48 maximum-softness breast/buttock displacement cases with no flipped triangles. Skin-boundary fixture colors meet at 138 matched positions and blend over 1,619 vertices. Input tests cover Y before connection callbacks, reversed source order, reconnects, a new session, ray-operated slider pagination and hairstyle selection. Independent grabs, recovery and original v1 geometry isolation remain tested. The voice code retains the previous capture/server behavior; the new activity tags are accepted.

**No rendered WebGL or Quest 3 hardware pass was possible in this environment.** The available browser reports `GL_RENDERER = Disabled`. Generated shader source and numerical checks do not prove GPU compilation, frame rate, visual seam removal or likeness. The old `contentscript.js` extension warnings are separate from the model's shader error. Do not change EventEmitter limits to mask them.

## Research and the remaining realism ceiling

The implementation takes practical cues from these primary sources. The methods here are deliberately reduced for the existing WebGL/Quest architecture; citing a method does not mean its full industrial implementation is included.

- Collins et al., *Dynamic arm swinging in human walking* (2009): passive swing and contralateral coordination. https://pmc.ncbi.nlm.nih.gov/articles/PMC2817299/
- Macklin et al., *XPBD: Position-Based Simulation of Compliant Constrained Dynamics* (2016): compliance and damping are distinct, with time-step-scaled constraints. The hair length constraints use XPBD; the tissue anchors use an implicit spring update. https://matthias-research.github.io/pages/publications/XPBD.pdf
- AMD TressFX 4 simulation changes: skinned roots, shock handling and separate body/hand collision fields. This project uses capsules and guides, not TressFX or a generated volumetric SDF. https://gpuopen.com/news/tressfx-4-simulation-changes/
- Google Filament material documentation: roughness, dielectric reflectance and skin IOR around 1.4. Three.js remains this project's renderer. https://google.github.io/filament/Materials.md.html
- Immersive Web, WebXR Gamepads Module: gamepads are attached to XR input sources. https://immersive-web.github.io/webxr-gamepads-module/


- Disney Research, *Realistic and Interactive Robot Gaze*: attention, habituation, coordinated eyes/head and overlapping response speeds. https://la.disneyresearch.com/publication/realistic-and-interactive-robot-gaze/
- NVIDIA GPU Gems 3, chapter 14: skin reflectance detail and subsurface transport. This package's mobile diffuse wrap is only an approximation. https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-14-advanced-techniques-realistic-real-time-skin
- NVIDIA GPU Gems 3, chapter 24: linear-light rendering and appearance errors. https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-24-importance-being-linear
- Macklin et al., *Small Steps in Physics Simulation*: short constraint substeps. https://matthias-research.github.io/pages/publications/smallsteps.pdf
- MPI, 4D shape research / Dyna: motion-dependent shape learned from captured human motion. This project does not include those datasets or models. https://is.mpg.de/ps/projects/4d-shape
- MDN SpeechRecognition: limited browser availability and implementation differences. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- OpenAI transcription and speech API guides, used for the optional companion. https://developers.openai.com/api/docs/guides/speech-to-text and https://developers.openai.com/api/docs/guides/text-to-speech
- Meta WebXR performance guidance: measure overdraw, bandwidth and texture budgets on the target device. https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/

For substantially more photographic skin, the next asset step is consistent, properly licensed scanned/cross-polarized albedo with matched roughness and normal detail, fitted to this exact UV layout. Larger JPEG dimensions alone cannot recover missing detail. Higher-detail meshes, calibrated eye/cornea geometry, authored corrective blendshapes, face reconstruction from multiple views, and captured motion would improve realism beyond these procedural corrections. Quest delivery would then need measured LOD, texture compression and overdraw budgets.

The head image was generated from the existing head atlas, the UV normal map and the latest supplied AI portrait. The prompt requested fixed UV feature coordinates, finer diffuse skin detail, warm cheek/lip coloration, extended padding and no painted hair or eyeballs. It was encoded to the existing `assets/tex/head_v2.jpg` path. The original images and v1 textures are preserved.
