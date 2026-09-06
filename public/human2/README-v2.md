# Mira v1 + v2 — revision 4

Replace the complete `human2/` folder with this package. Its folder layout is unchanged: `human2/`, `human2/assets/`, and `human2/assets/tex/`. V2 scripts use `?v=4` and textures use `?v=r4`; purge the hosting/CDN cache when updating. Open `human2/index.html` over HTTP on desktop or HTTPS on Quest. Start with one actor on Balanced.

The original Mira remains selectable in the shared spawner. `mira-v1.html` opens the original scene. The original core, voice code, preserved engine, GLB and uploaded textures are unchanged. V2 keeps actor geometry, materials, animation and physics state separate.

## What changed in revision 4

### Arms, fingers and player hands

The supplied arm vertices have a baked A-pose tilt of about 30 degrees, while the arm bones and inverse bind matrices describe a T pose. V2 corrects that mismatch before animation. It also removes unrelated body-bone influences from distal arm/hand vertices. These issues made moving hands distort even when the bone positions themselves looked correct.

Arm width now changes the surface instead of multiplying upper-arm and forearm scales through the hand hierarchy. The thumb scale reductions are removed. Resting wrists sit beside and slightly ahead of the hips; elbow targets are forward of their previous positions. Finger flexion now uses the rig's actual knuckle axis, with relaxed curl, small spreading and different open/holding states.

Controller hands use the supplied textured hand and nail geometry, isolated from the body and articulated through its skeleton. Each visible hand has 3,380 triangles. Left/right orientation is corrected, and palm/finger capsules follow the joints, including fingertip extensions. These are controller-driven hands; optical hand-tracking retargeting is not implemented.

### Expressions and attention

Happy and laughing expressions combine mouth-corner lift, cheeks, dimples and moderate eye narrowing. A small jaw opening now survives the original idle pipeline. The default feeling is warm/content. Manual expression selection and contextual emotions remain available.

Blink intervals are divided by 1.3: **30% more frequent on average**, with the same closing/opening duration. Finite fixations alternate between the player, nearby Miras and room targets. Eyes respond faster than the head and neck. Low-amplitude brow, smile and cheek changes, breathing, slight head roll and speaking nods add variation. These are authored procedural cues, not measured emotional microexpressions or captured facial performance.

**Lively idle** is the default for newly spawned v2 actors. It alternates short walks with rests and occasional greetings. Six walk styles and sixteen idle actions are available: rest, weight shift, hands together, hand on hip, hair tuck, looking at a hand, wave, explanation, shoulder roll, looking around, breathing, neck stretch, sigh, arm stretch, wiggle and dance. Actions ease in and out; quiet intervals receive more weight. Stand/Walk/exercise buttons select manual movement. Lively idle resumes autonomy.

### Head and hair interaction

Grip the head and turn the controller, or move the contact point, to turn it in yaw and pitch. The neck shares the motion. This constraint turns the head without dragging the whole actor; it has bounded pitch, yaw and roll and eases back after release. Passive controller-hand contact also gives a small head/neck response. It is an approximate capsule/contact model, not full skin-to-skin collision.

Hair now has **41,798 vertices**, twice the original card count, in two offset layers. Its silhouette broadens away from the pinned scalp. Twelve four-node guide chains provide secondary motion, length/rest constraints, floor/body projection, and collisions with the player palm/finger capsules. There is no full strand or hair self-collision solver; guide interpolation can still allow some card penetration. Twice the card count is not a measured doubling of physical hair volume. Alpha overdraw increases, so Quest GPU performance needs hardware measurement.

### Skin and soft tissue

V2 matches adjoining skin material colors in linear light at shared surface locations and feathers the correction over a roughly 5.5 cm surface neighborhood. This preserves each map's texture detail while reducing hard color jumps at material borders. It cannot remove every artifact painted inside an atlas.

The skin shader has a bounded roughness floor, weaker broad environmental reflection, less diffuse wrapping and reduced normal intensity. Eye/cornea highlights are restrained. A newly generated, UV-constrained head albedo uses the latest AI face reference; the existing small reference head-proportion sculpt remains. This is an approximate likeness, not a recovered 3D scan. The source head image is 1,254 square pixels; it is not presented as a new 4K photographic scan.

The body still uses the uploaded diffuse texture and original normal/roughness maps. No new photographic body scan is included. Its source detail and painted artifacts remain a quality limit.

Breast enlargement retains the earlier smooth chest-anchored deformation and reweighted attachment. Buttocks now use broad surface growth and a lower-pole displacement instead of scaling glute attachment bones. The transition includes the rear/upper-thigh region and preserves the authored central fold rather than cutting a deeper groove. Default jiggle increases from **1.15 to 2.30**; gravity settling is stronger and glute spring frequency is lower. Grabbed tissue uses a stiff, highly damped constraint without the free-motion acceleration drive. Fixed 1/120-second substeps and conservative compression/displacement bounds remain.

These are reduced surface/bone approximations. They do not enforce incompressible tissue volume, simulate independent thigh flesh, or implement FEM, Dyna, a medical anatomical model, or a general active ragdoll. The procedural fall/get-up system remains: standing → falling → down → recovering → standing. Holding a limb delays recovery. Full environment-mesh, actor-to-actor and arbitrary body self-collision are not implemented.

## Controls

| Input | Action |
| --- | --- |
| Desktop drag / wheel | Orbit / zoom |
| Face view / Body view | Frame the selected actor |
| Grab body, then drag; or Shift-drag | Pull the hit surface in the camera plane |
| Lively idle | Resume autonomous rests, social actions and short walks |
| Stand / Walk / exercise buttons | Select manual movement |
| Quest left Y | Open/close the 3D spawner and sliders |
| Controller ray + trigger | Operate the menu |
| Grip near body | Grab a limb, tissue region or head |
| Turn controller while holding head | Turn head and neck |
| Quest right B / desktop B | Spawn a ball |
| Left stick / right stick | Move / turn |

Y/B use the secondary face button at index 5 for the Quest Touch profile. The v1-only page retains its original controls. Movement pauses while the VR menu is open. Both controllers can hold independently.

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

Revision 4 checks include skin-boundary color continuity on a controlled fixture, actual skinned controller-hand dimensions, arm-width extremes, smile/jaw behavior, blink timing, head grab/release, a hair-guide/hand contact, autonomous behavior, independent grabs, fall/get-up, shape/tissue bounds and Y/B input. Microphone tests cover quiet speech, native-recognition failure, echo suppression, missing-server status and resource cleanup. HTTP tests exercise all companion routes against a mock provider; they do not send audio to a paid service.

**No rendered WebGL or Quest 3 hardware pass was possible in this environment.** The available browser reports `GL_RENDERER = Disabled`. Generated shader source and numerical checks do not prove GPU compilation, frame rate, visual seam removal or likeness. The old `contentscript.js` extension warnings are separate from the model's shader error. Do not change EventEmitter limits to mask them.

## Research and the remaining realism ceiling

The implementation takes practical cues from the following primary sources:

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
