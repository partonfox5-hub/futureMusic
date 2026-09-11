# Lighting pack — wiring

Import:

```js
import {createStudioLights, RoomLight} from '../mira-lighting.js';
```

## In this pack

| Role | File |
|---|---|
| Public API | `../mira-lighting.js` |
| Studio rig + XR `LightProbe` | `../mira-v2-light.js` |
| Production caller | `../engine.js` (`createStudioLights`, `RoomLight.tick(frame)`) |
| Interior point lamps | `../mira-v2-house.js` (`gndLights`) |
| Weather re-tints key/fill/rim | `../mira-v2-weather.js` |

## How the scene is lit

1. **Renderer** (engine): `ACESFilmic` tone mapping, exposure **1.05**, `SRGBColorSpace`, shadows on (`PCFSoft` desktop / `BasicShadowMap` Quest).
2. **`createStudioLights`**: hemisphere (sky/ground), key directional (shadow caster at 1.4, 3.2, 2.8), fill, rim, weak ambient, PMREM from `RoomEnvironment` (`environmentIntensity` 0.65).
3. **House** adds four warm `PointLight`s in the living room (`gndLights`).
4. **XR passthrough:** `RoomLight.start(session)` uses WebXR `light-estimation`. `tick(frame)` copies SH coefficients onto a `LightProbe` and a primary directional, and dims authored lights.

## Knobs that matter

- `key.intensity` / `fill.intensity` / `rim.intensity`
- `renderer.toneMappingExposure`
- `scene.environmentIntensity`
- `key.shadow.bias` / `normalBias` (acne vs peter-panning on Mira skin)
- House point-light intensity/distance in `mira-v2-house.js`

## Not in this pack

Furniture meshes, Mira shaders, guns.

Project context (how this pack sits in Human5): `../mira-context.js` and `../context-pack/ASTRA.md`.
