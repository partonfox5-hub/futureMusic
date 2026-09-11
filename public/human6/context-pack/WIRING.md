# Context pack — wiring

```js
import {HUMAN5, ASTRA_RULES, briefFor, sessionPrompt} from '../mira-context.js';
```

This module is a **leaf**. Do not import body, furniture, or lighting from it (avoids cycles). Those packs may re-export `HUMAN5`.

## In this pack

| Role | File |
|---|---|
| Machine spec | `../mira-context.js` |
| Conversational brief | `ASTRA.md` |
| Readable dump | `harness.html` |
| This map | `WIRING.md` |

## Sister packs

| Pack | API | Folder |
|---|---|---|
| Mira body / face / hair | `mira-body.js` | `mira-body-pack/` |
| Furniture + collision | `mira-furniture.js` | `furniture-pack/` |
| Lighting | `mira-lighting.js` | `lighting-pack/` |
| House architecture | `mira-house.js` | `house-pack/` |

Host that composes them: `engine.js`.

## Not in this pack

Meshes, shaders, lights, physics implementations.
