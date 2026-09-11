# Furniture pack

Meshes, mass, grab roots, and AABB obstacles for house furniture. No Mira, guns, cars, or weather.

**Project memory:** before editing, read `../mira-context.js` and `../context-pack/ASTRA.md` so this pack still fits Human5 (grab stays in Props, piano sit IK stays in MiraWorld). `HUMAN5` / `sessionPrompt('furniture')` are re-exported from `mira-furniture.js`.

- **API:** `../mira-furniture.js`
- **File map:** `WIRING.md`
- **Desktop harness:** `harness.html`

```js
import {createFurnitureWorld, tagMovable, detailToilet, detailFridge} from '../mira-furniture.js';
const world = createFurnitureWorld(scene);
detailToilet(world, 0, 0);
```

Collision lives on `world.obstacles` after `tagMovable` / `captureFurniture`. Grab/throw integration is `Props.tickFurniture` in `mira-v2-props.js`.
