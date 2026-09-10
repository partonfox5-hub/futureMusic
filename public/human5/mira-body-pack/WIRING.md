# Mira body pack — wiring

Import **one** module:

```js
import {installMiraBody, enterPassthrough, startMiraBodyLoop, MIRA_BODY} from '../mira-body.js';
```

Host demo: `harness.html` (Quest Browser → Enter passthrough AR).

## In this pack (body only)

| Role | File |
|---|---|
| Public API | `../mira-body.js` |
| Actor, skin shader, GLB load, XR hands, grab | `../mira-v2.js` |
| V2 pose / IK / morph / walk | `../mira-v2-features.js` |
| Sliders, face presets | `../mira-v2-controls.js` |
| Installs face + tissue + crease + contact on V2 | `../mira-v2-realism.js` |
| Secondary flesh vertex offsets | `../mira-v2-tissue.js` |
| Eyes | `../mira-v2-eyes.js` |
| Tearline / occlusion cards | `../mira-v2-tearline.js` |
| Hair cards | `../mira-v2-hair.js` |
| Head UV restore | `../mira-v2-uv.js` |
| Triangle contact | `../mira-v2-contact.js` |
| Controller haptics | `../mira-v2-haptics.js` |
| Hug pair (tissue capsules) | `../mira-v2-social.js` |
| XR `light-estimation` for passthrough | `../mira-v2-light.js` |
| Blink / lids / Duchenne | `../src/body/FaceDrive.js` |
| Breast / glute XPBD host | `../src/body/TissueRig.js` |
| Expression crease maps | `../src/body/SkinCrease.js` |
| Hand pickup pose | `../src/body/ContactMotion.js` |
| 8-particle XPBD cage | `../src/body/XPBDCluster.js` |
| Mesh | `../assets/mira.glb` |
| Albedo / n / r | `../assets/tex/` |

## Contract (do not break)

- Body verts **14,164**, vertex order unchanged
- **49** named morphs kept
- **103** bones, names unchanged (`Head`, `L_Eye`, `L_Breast`, …)
- 4-bone skin weights
- Separate meshes: body, eyes, teeth, hair, lashes
- Three.js **r170**
- `createMiraSystem` is the runtime. Wrap it; do not replace it.

## Not in this pack

House, castle, gym, piano, laundry, weather, guns, cars, dogs, flora, wardrobe, voice, Needboard.

## Passthrough host already does

`enterPassthrough()`:

- `immersive-ar` + `local-floor` + optional `light-estimation`
- `scene.background = null`, clear alpha 0
- `RoomLight.start(session)` (spherical harmonics + primary directional)
- Floor opacity 0.12

Mira stays visible. The house is not loaded.
