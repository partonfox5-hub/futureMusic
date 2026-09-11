# House architecture pack

Rearrange the living-room house using the existing modular builder. **Do not rewrite how walls work** (Destruction.panel cells, door holes, HouseDoors, placeStairs).

- **API:** `../mira-house.js` — `createHouseWorld`, `realizeFloorplan`, `PRECISE_PLAN`, `AS_BUILT_PLAN`
- **Brief:** `ASTRA.md`
- **File map:** `WIRING.md`
- **Harness:** `harness.html` (1 = as-built, 2 = CELL-grid plan)

**Project memory:** read `../mira-context.js` and `../context-pack/ASTRA.md`. `HUMAN5` / `sessionPrompt('house')` are re-exported.

```js
import {createHouseWorld, realizeFloorplan, PRECISE_PLAN} from '../mira-house.js';
const world = createHouseWorld(scene);
realizeFloorplan(world, PRECISE_PLAN);
```

Production still uses `mira-v2-house.js` `buildHouse` until this plan is promoted.
