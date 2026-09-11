# Astra — Human5 house architecture

You are rearranging the **living-room house**. First read `../mira-context.js` and `../context-pack/ASTRA.md` (or `sessionPrompt('house')`).

This pack is the **floorplan**: rooms, slabs, wall segments, door/window holes, swinging doors, stairs, roof, lamps, garage stalls. It uses the same modular builder the VR “build” tool uses (`CELL = 0.6`).

You do **not** rewrite how walls work. Keep `Destruction.panel`, `doorHole` / `winHole`, `HouseDoors`, and `placeStairs`.

## Attach / open

- `human5/mira-house.js`
- `human5/house-pack/` (this folder)
- `human5/mira-v2-floorplan.js` (the plan you edit)
- Live harness: `harness.html` — key **1** as-built, **2** CELL-grid plan

Production `buildHouse` in `mira-v2-house.js` is the current shipped layout. Do not switch the host to `realizeFloorplan` unless the owner asked to promote.

## What you may change

- Room rectangles (living, kitchen, bath, bedroom, dining, garage, gym, laundry, upstairs)
- Where interior walls sit, and which openings they have
- Door `place` positions so they line up with `doorHole`s
- Stair **position** (keep rise/run/width unless asked). Bottom must stay in open living room, with a stairwell hole in the interior wall — never run the flight into a solid wall
- Roof envelopes to match the new footprint
- Furniture **anchors** on the plan (positions only)

Prefer **`PRECISE_PLAN`**: same program as production, corners on the 0.6 m grid so walls meet.

## What you must not change

- `CELL` (0.6), `WALL_T` (0.14), `WALL_H` (3), `STORY` (3.05)
- `doorHole` / `winHole` padding
- Instanced cell destruction / plaster shader
- Door hinge, latch, casing
- Mira, guns, cars, piano MP3, lighting lookdev, grab loop

## Room program (keep unless the brief says otherwise)

Open living + kitchen (no wall on the x-split). Bath west of bedroom. Garage north of kitchen. Gym east of kitchen. Laundry south of gym. Stairs in living near the kitchen split, yaw `π`, run south through a hole in the z-interior wall.

## Success

Orbit the harness on plan **2**: walls meet on the grid, every door has a hole, stairs land in the living room, garage still takes two cars, gym/laundry still exist. Production house is unchanged until a promote is asked.
