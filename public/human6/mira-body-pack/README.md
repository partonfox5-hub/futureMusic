# Mira body pack

Physics + graphics for the Mira NPC only. No house, guns, or weather.

Related packs (separate): **furniture-pack/**, **lighting-pack/**, **context-pack/** (unifying Human5 spec).

**Project memory:** before editing, read `../mira-context.js` and `../context-pack/ASTRA.md`. Keep 14,164 verts / 49 morphs / 103 bones. When `actor.seat` is set, world.after owns IK — do not fight it in poseArms. `HUMAN5` / `sessionPrompt('body')` are re-exported from `mira-body.js`.

- **API:** `../mira-body.js` — `installMiraBody`, `enterPassthrough`, `startMiraBodyLoop`
- **Astra brief:** `ASTRA.md`
- **File map:** `WIRING.md`
- **Quest / desktop harness:** `harness.html`

```js
import {installMiraBody, enterPassthrough, startMiraBodyLoop} from '../mira-body.js';
const body = await installMiraBody({scene, renderer, camera, rig, xrOn});
await enterPassthrough(body);
startMiraBodyLoop(body);
```
