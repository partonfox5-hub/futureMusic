# Human5 context pack

Unifying spec for Astra (and anyone splitting work across furniture, Mira, and lighting). Attach **this pack plus** the assigned feature pack so an isolated edit still has project memory.

- **API:** `../mira-context.js` — `HUMAN5`, `ASTRA_RULES`, `briefFor(pack)`, `sessionPrompt(pack)`
- **Brief:** `ASTRA.md` (read this first in a new session)
- **File map:** `WIRING.md`
- **Readable spec:** `harness.html`

No Three.js. No house. This pack does not draw anything; it is project memory.

```js
import {HUMAN5, briefFor, sessionPrompt} from '../mira-context.js';
console.log(briefFor('furniture'));
console.log(sessionPrompt('body'));
```
