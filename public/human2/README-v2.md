# Mira v1 + v2

This package keeps the `human2/`, `human2/assets/`, and `human2/assets/tex/` layout. Serve the folder over HTTP for desktop use, or HTTPS in Quest Browser for VR/AR. Open `human2/index.html`, hard-refresh after replacing an older deployment, and start with one actor on Balanced.

## Render fix — module revision 3

The initial v2 package attached an empty `morphAttributes.position` list to the eyes and teeth, which have no facial morph targets. Three.js r170 treats the property's presence as enabling morph rendering. This generated a zero-length shader uniform in the surface and shadow passes and then threw while reading missing morph influences, interrupting the render loop. A frame could remain partially drawn before textures finished loading.

V2 now preserves the absence of morph attributes on those meshes while retaining all 49 facial targets on the body. The fix covers both the eye and `MeshDepthMaterial` failures. The original v1 core, voice and engine remain unchanged. All v2 module URLs use `?v=3` to invalidate cached scripts, and the main page declares an inline empty favicon to avoid the unrelated favicon 404.

Replace the complete `human2/` folder with this package, clear any hosting/CDN cache for that folder, then press **Ctrl+Shift+R**. Extension messages from `contentscript.js` are separate from the model's render failure; changing EventEmitter listener limits is not part of this fix.

The regression checks reproduce the old morph-upload exception, exercise the corrected Three.js morph-upload path, generate surface/depth shaders for all 13 meshes in both versions, verify skin/eye map assignments and nonmetallic materials, and recheck animation, grabs, recovery and Y/B input. The cloud browser could load the page but could not create a WebGL context (`GL_RENDERER = Disabled`), so a rendered browser/Quest visual pass remains unavailable.

## Versions

- **Mira v1:** the original actor implementation and original textures remain available in the shared spawner. `mira-core.js`, `mira-voice.js`, the GLB and all uploaded textures are byte-for-byte unchanged. `engine-v1.js` preserves the uploaded engine; `mira-v1.html` opens the original scene with its original controls. That page's script URL is made relative so it can run at a different mount point.
- **Mira v2:** `mira-v2.js` uses the original actor as its v1 branch and builds v2 through `mira-v2-features.js`. Geometry, materials, skin weights, expression state and hair simulation are isolated per v2 actor. V2 defaults to the reference appearance and standing idle. Select actors independently using the actor picker; Remove frees a slot. The original two-actor Quest limit is retained.

## Controls

| Input | Action |
| --- | --- |
| Desktop drag / wheel | Orbit / zoom |
| Face view / Body view | Frame the selected actor |
| Grab body, then drag; or Shift-drag | Grab the hit skin surface and pull in the camera plane |
| First person | Pointer-lock look; WASD movement; Escape releases |
| Desktop B | Spawn a ball |
| Desktop F | Hold the noodle |
| Quest left Y | Open/close the world-space spawner and slider panel |
| Controller ray + trigger | Operate panel buttons and drag sliders |
| Grip near body | Grab a limb or tissue region; both controllers can hold independently |
| Trigger near body, with menu closed | Alternative grab |
| Quest right B | Spawn a ball |
| Left stick / right stick | Move / turn; locomotion pauses while the menu is open |

Y/B use the left/right secondary face button at gamepad index 5 in the Quest Touch profile. Unrelated generic controllers may use different mappings. The panel is rendered in the XR scene; it does not depend on a DOM overlay. The original v1-only page retains its original Y-to-ball mapping.

## V2 changes

**Shape and tissue.** Breast enlargement uses a smooth chest-anchored vertex deformation instead of scaling breast attachment bones. The v2 branch rebuilds breast skin weights with a smooth falloff into the chest. This addresses the dented attachment and the folding that appeared under large displacement. The shape slider changes the undeformed surface; secondary motion translates bones without dynamic scale or squash. Gravity is transformed from world down into the actual rotated parent frame. Larger breasts settle farther and have lower spring frequency. Compression into the chest is tightly limited; outward and downward motion have separate limits. Fixed 1/120-second integration, damping, tracking-jump rejection and bounded contact impulses control instability.

This is a reduced bone-and-surface approximation, **not** FEM tissue, an incompressible volumetric model, or a medical/anatomical simulation. No volume-accuracy claim is made. Shape growth is smooth and bounded, and secondary motion is limited to preserve the supplied mesh.

**Grabs and balance.** Desktop raycasting selects the actual skinned triangle. Near controller grabs combine body capsules with a skinned-vertex proximity check and bone-weight ownership. The initial surface offset is retained. Mid-arm, forearm/hand and leg contacts drive different IK constraints; the torso follows sustained pulls. Pulling a leg removes support and can trigger a fall. States progress through standing, falling, down, recovering and standing; holding the actor delays recovery. A staged procedural get-up uses hip rotation, knee flexion and early palm bracing. Recovery is animation-driven, **not** a general active ragdoll. Contacts approximate the body with capsules; there is no arbitrary environment-mesh, actor-to-actor, or full self-collision solver.

**Movement.** Six selectable walk styles alter speed and cadence. Feet retain stance targets and use two-bone IK. Arms use world-space hand targets, elbow poles and eased transitions; fingers have a graduated resting curl, thumb pose and distinct open/holding/tense states. Twelve idle choices cover rest, weight shift, hands together, hand on hip, hair tuck, looking at a hand, wave, explanation, shoulder roll, looking around, breathing and neck stretch. Existing squat/stretch/jumping-jack modes remain. Sad/tired/concerned states soften body posture and slow walking; tense states affect hand pose. These are procedural motions, not motion capture.

**Expressions and conversation.** Sixteen named expressions use the supplied CC3 morph targets, with moderated strengths, some asymmetry, complete blink closure and actual eyeball rotation. Expressions persist, then gradually settle instead of randomly changing mood. Conversation Context uses the reply's emotional state; choosing a manual expression holds it for inspection. The two reference-clip buttons replay hand-tuned 3.0625-second smile/surprise curves based on visual timing in the supplied videos. They are not tracked or retargeted facial capture. Speech still uses the existing amplitude plus approximate text-viseme path, not phoneme-aligned facial performance capture.

**Hair.** Twelve four-point guide chains deform the existing hair cards in the vertex shader. Roots stay pinned; compliant segment constraints, rest-shape attraction, damping, floor projection and head/neck/upper-body/hand capsules provide secondary motion and collision response. The full 20,899-vertex hair mesh is not CPU-reskinned each frame. This is a small guide-based approximation, not TressFX, strand simulation, SDF collision or hair self-collision. Guide interpolation can still allow some card penetration.

**Appearance.** `head_v2.jpg` is a new UV-aligned generated head albedo guided by the supplied AI face and the real head normal-map layout. The reference preset also applies a small jaw/nose proportional sculpt and rebases facial morph endpoints. Identity resemblance is approximate; a single view and two short clips do not supply a 3D scan or side/back head geometry. The same head atlas is used for both v2 presets; the reference switch controls the proportional sculpt. The original five v1 face textures remain intact.

The body texture generation request was rejected by the image tool. `body_v2.jpg` therefore retains the uploaded body albedo, including its limited detail and any remaining painted artifacts. Original normal/roughness maps remain. The earlier full source package was inspected, but its head/torso diffuse maps were also altered, so they were not substituted. The new head can show color differences at the neck against the older body/limb maps. Skin retains a single-pass diffusion approximation. A modest directional shadow adds body/ground contact; Faster disables shadows in XR. Hair and corneas do not cast shadows in this pass.

## Conversation service contract

V2 preserves `/api/mira/chat`, `/api/mira/tts` and `/api/mira/stt`. No server implementation or credentials are included. Static hosting uses local canned replies with heuristic context expressions and browser speech synthesis when available. The UI identifies local fallback replies. This is not a local language model.

`POST /api/mira/chat` receives `text`, `persona`, a bounded `history` array, and an inferred `emotion`. Existing services that accept the original fields can ignore the additions. A service can return:

```json
{
  "reply": "I hear you. Tell me what happened.",
  "emotion": "concerned",
  "intensity": 0.65,
  "valence": -0.25,
  "arousal": 0.35,
  "action": "idle"
}
```

Legacy `[[EMOTION:concerned]]` and `[[ACTION:stretch]]` tags in `reply` also work. Values and actions are whitelisted; intensities are clamped. History is kept separately per actor in session memory, up to 12 messages. The client sends no API keys. The host must implement authentication, model selection, conversation processing and service limits if an AI backend is desired. Microphone permission is requested only on explicit user activation; stopping voice prevents automatic recognition restart.

For integration/profiling, `?debug=1` exposes `window.human2`. Call the selected v2 actor's `setEmotion(name, intensity, {hold, source, valence, arousal})` or `beginSpeech(text, emotion)`. All actor-specific state is in memory.

## Validation and limits

`validation-v2.json` records numerical checks. Tests loaded the actual supplied GLB in Three.js r170, with texture loading stubbed for Node; they did not render WebGL. They cover multiple frame rates, shape ranges, extreme tissue offsets, two-hand release, leg-triggered falls, recovery, expression persistence, conversation history, actor selection/removal, and Quest Y/B button edge behavior. The original files and original engine were checked against the uploaded archive.

- 30/72/90/120 fps simulations returned from falls to standing with finite transforms.
- Shape-only orientation checks passed at breast slider values 0.38, 0.7, 1, 1.5, 2 and 2.35.
- 24 combinations of breast size and extreme allowed tissue offsets produced no reversed triangles relative to the corresponding undeformed pose in the checked region. This is a bounded orientation test, not proof of physical volume or all-pose collision correctness.
- Two controllers held independently and releasing one preserved the other hold.
- Left Y toggled once per press and did not spawn a ball; right B spawned one; menu selection consumed the trigger.
- Six walk styles were exercised numerically; their foot errors are recorded in the validation file.

**Browser/WebGL visual rendering and Quest 3 frame rate, controller behavior, skin seams, likeness and collision appearance have not been verified on hardware.** Inspect the desktop demo, then check one actor on Balanced in the headset. The numerical runtime timing is not a Quest GPU benchmark. Texture compression, authored motion capture, depth-fitted face reconstruction and volumetric flesh remain future work.

## Research used to choose the implementation

- Meta WebXR performance: reduce bandwidth/overdraw, use measured budgets; KTX2/Basis is recommended for GPU texture compression. Compression is documented but not implemented here: https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/
- Macklin et al., *XPBD* (2016), compliance and iteration/time-step behavior: https://matthias-research.github.io/pages/publications/XPBD.pdf
- Macklin et al., *Small Steps in Physics Simulation* (2019), substepping constraint simulations: https://matthias-research.github.io/pages/publications/smallsteps.pdf
- AMD TressFX integration guide, guide-based hair and practical collision representations. Used for design principles; this package does not integrate TressFX: https://raw.githubusercontent.com/GPUOpen-Effects/TressFX/master/doc/TressFX4xDeveloperGuide.pdf
- NVIDIA GPU Gems 3, chapter 14, skin appearance depends on material detail and subsurface transport. The mobile shader here remains an approximation: https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-14-advanced-techniques-realistic-real-time-skin
- WebXR Gamepads specification: https://immersive-web.github.io/webxr-gamepads-module/
- Three.js SkinnedMesh API: https://threejs.org/docs/pages/SkinnedMesh.html

## Generated asset provenance

The built-in image generation tool produced `assets/tex/head_v2.jpg`. Its prompt requested a 2048-square CC3 head albedo, using `head_n.jpg` as the immutable UV layout, `head.jpg` as the edit target, and the supplied AI-generated portrait as the likeness reference; closed eye slits, nose/mouth/ear coordinates, restrained freckles and makeup, neutral diffuse lighting, no painted hair/eyeballs, no labels, and matching padding were specified. The returned image was resized/encoded for the existing 2K JPEG runtime path. The body generation did not succeed and its output was not replaced with an invented scan.
