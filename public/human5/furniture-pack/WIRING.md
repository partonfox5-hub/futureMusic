# Furniture pack — wiring

Import:

```js
import {
  createFurnitureWorld, tagMovable, syncFurniture, furnitureRoot,
  detailToilet, detailFridge, installPiano
} from '../mira-furniture.js';
```

## In this pack

| Role | File |
|---|---|
| Public API | `../mira-furniture.js` |
| Mass, mix, grab root, AABB obstacle | `../mira-v2-furniture.js` |
| Detailed meshes (toilet, fridge, …) | `../mira-v2-furnish.js` |
| Piano + bench seat + key collision | `../mira-v2-piano.js` |
| Breakable cell register | `../mira-v2-destruction.js` |
| Piano audio | `../assets/piano/` |

## Collision contract

- `tagMovable(world, group, id)` builds `userData.furniture` with `mass`, `velocity`, `obstacle` `{x,z,w,d,y,h}`.
- `world.obstacle(...)` is the walk/projectile blocker.
- `syncFurniture(world, group)` after you move a held piece.
- `furnitureRoot(mesh)` walks to the movable group.
- Player grab/throw/gravity: `Props.tickFurniture` / `holdFurniture` in `mira-v2-props.js` (not copied here; keep one implementation).

## Not in this pack

Mira body, lighting, guns, cars, weather, dogs. House *layout* is `mira-house.js` / `house-pack/` (this pack still owns furniture meshes).

Project context (how this pack sits in Human5): `../mira-context.js` and `../context-pack/ASTRA.md`.
