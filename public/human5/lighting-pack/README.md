# Lighting pack

Studio lights, PMREM environment, and Quest XR light-estimation. This is the surface to edit when working on Human5 lighting.

**Project memory:** before editing, read `../mira-context.js` and `../context-pack/ASTRA.md`. House lamps stay in `mira-v2-house.js`; weather may retint key/fill/rim; `RoomLight` is XR-only. `HUMAN5` / `sessionPrompt('lighting')` are re-exported from `mira-lighting.js`.

- **API:** `../mira-lighting.js` — `createStudioLights`, `RoomLight`
- **File map:** `WIRING.md`
- **Harness:** `harness.html` (sliders for key / fill / rim / exposure)

```js
import {createStudioLights, RoomLight} from '../mira-lighting.js';
const {key, fill, rim, hemi, ambient} = createStudioLights(scene, {renderer, quest, shadows:true});
const xrLight = new RoomLight(scene, renderer, rig);
```
