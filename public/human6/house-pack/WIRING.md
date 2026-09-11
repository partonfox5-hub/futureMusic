# House architecture pack — wiring

Import:

```js
import {
  createHouseWorld, realizeFloorplan, clearHouse,
  PRECISE_PLAN, AS_BUILT_PLAN, CELL, snapCell,
  Builder, HouseDoors, placeStairs
} from '../mira-house.js';
```

## In this pack

| Role | File |
|---|---|
| Public API | `../mira-house.js` |
| Floorplan data + realize | `../mira-v2-floorplan.js` |
| Door meshes / hinge | `../mira-v2-doors.js` |
| Surface maps + wall shader | `../mira-v2-walls.js` |
| VR modular placer (CELL grid) | `../mira-v2-builder.js` |
| Instanced wall/floor cells | `../mira-v2-destruction.js` |
| `placeStairs` | `../mira-v2-furniture.js` |
| Production layout (read-only reference) | `../mira-v2-house.js` |

Project context: `../mira-context.js` and `../context-pack/ASTRA.md`.

## Building contract (do not change)

- Grid **CELL = 0.6 m**. VR Builder snaps to this. `PRECISE_PLAN` corners sit on it.
- Walls are `world.fractures.panel(center, size, kind, hole)` — instanced cells, same as production.
- Door / window cutouts use `doorHole` / `winHole` (extra `CELL*.55` radius). Do not invent a second hole system.
- Swinging doors: `HouseDoors.place(x,y,z,yaw,opts)` only.
- Stairs: `placeStairs` with production rise/run unless the brief changes stairs. Bottom stays in the **open living room**.
- Floors use `panel(..., {skipObstacle:true})` so they do not nuke as one `register()` mesh.

## Not in this pack

Mira body, studio lighting lookdev, guns, cars, piano mesh/MP3, laundry machines, gym weights, grab/throw, weather, voice.

Furniture **anchors** are listed on the plan (`piano`, `bed`, …) so rooms stay usable; detailed meshes stay in the furniture pack.
