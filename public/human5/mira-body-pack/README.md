# Mira body pack

Physics + graphics for the Mira NPC only. No house, guns, or weather.

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
