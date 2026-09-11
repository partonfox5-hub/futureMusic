# Astra — Human5 unifying context

You are joining a **long-running Human5 session**. This pack is the **project memory**: what the app is, how furniture / Mira / lighting fit, what you must not break, and what still lives only in the host.

If you were given only one feature pack (body, furniture, lighting, or house), **read this file first** so a change in that pack still composes with everything else.

```js
import {HUMAN5, ASTRA_RULES, briefFor, sessionPrompt} from '../mira-context.js';
console.log(sessionPrompt('furniture')); // or 'body' | 'lighting' | 'house'
```

Then open only the assigned pack plus the contracts below.

## What Human5 is

A first-person / VR house you share with **Mira** (and optionally a dog, cat, cars, guns). Desktop orbit or pointer-lock WASD; Quest grip/trigger. Three.js **r170** ES modules under `public/human5/`.

- Live: `https://futuremusic.online/human5/`
- Local: `http://localhost:8765/human5/` from `public/` (`python -m http.server 8765`)
- Cache-bust with `?v=` on every edited module

It is **not** Unreal, not a scanned photogrammetry title, not a full cloth/ragdoll solver. Approximations are bounded on purpose (Quest). Needboard is a different local app. Horde (`/horde`) is a different production game.

Local cache is **16.2**. Production is still **16.0**. Do not `git push` unless the owner asked. Never force-push `origin master`.

## How the pieces compose

```
index.html → mira-boot.js → engine.js
                              ├─ createStudioLights + RoomLight     lighting pack
                              ├─ createMiraSystem (mira-v2.js)      body pack
                              ├─ MiraWorld + buildHouse             host (house-pack = floorplan data)
                              ├─ Props (grab, guns, cars, piano click)
                              └─ fire, weather, dogs, voice, HUD
```

`engine.js` is the **host**. Packs are slices you can improve in isolation. They must still plug into the host through the contracts in `mira-context.js`.

| Pack | Public API | You own | You do not own |
|---|---|---|---|
| Body | `mira-body.js` | Mira mesh, face, hair, tissue, contact, skin shader | House, guns, piano mesh, cars |
| Furniture | `mira-furniture.js` | Meshes, mass, AABB, piano assets, destruction cells | Mira shader, studio lights, grab loop |
| Lighting | `mira-lighting.js` | Studio rig, XR LightProbe | Mira retopo, furniture meshes |
| House | `mira-house.js` | Floorplan data, room arrangement on CELL 0.6 | Wall/door *physics*, Mira, guns |
| Context | `mira-context.js` | This spec | Implementation of the above |

Grab/throw of furniture stays **one** implementation: `Props` in `mira-v2-props.js`. Furniture pack must not grow a second physics loop.

## Shared contracts (the glue)

- **Units:** meters, Y-up, gravity `9.81`.
- **Obstacles:** `{x,z,w,d,y,h}` AABBs. Pathfinding, player, bullets, cars all use `world.obstacle` / `world.blocked` / `world.project`.
- **Seats:** `{group, position, yaw, approach, occupant}`. Piano seats add `piano`, `keyboard`, `sitDuration`. Sit IK (legs/arms/fingers) runs in `MiraWorld.after` — not in the body pack. When `actor.seat` is set, `poseArms` / `poseActivity` must no-op or they fight the piano.
- **Mira:** `createMiraSystem` is the runtime. `actor.world` is the MiraWorld. Do not rename bones. **14,164** body verts, **49** morphs, **103** bones. Skin is wrapped Lambert in `mira-v2.js`, not MeshPhysical transmission.
- **Lights:** `createStudioLights(scene,{renderer,quest,shadows})` → `{key,fill,rim,hemi,ambient}`. XR: `RoomLight.start(session)` + `tick(frame)`. Desktop studio lights must not change when AR is off. House point lamps stay in `mira-v2-house.js`. Weather may retint key/fill/rim — do not bake weather into the studio rig.
- **Destruction:** `panel()` = instanced cells (floors, walls, TV glass). `register()` = one whole mesh (do not use for floors — they vanish as one piece). TV **screen** is glass cells; stand is wood/metal.
- **Renderer:** ACES Filmic, exposure **1.05**, sRGB. Quest: no MSAA, cheaper shadows, pixel ratio 1.12.
- **Input:** desktop click uses/fires; VR trigger uses/fires; grip grabs; **piano click is checked before gun fire**. Full-auto rifle sets `desktopTrigger` inside `props.desktop()` because the engine capture listener calls `stopImmediatePropagation`.

If your pack change needs a host one-liner (for example world.sit IK, or Props gravity skip for a cased extinguisher), do the smallest fix and say so in the reply. Do not silently fork a second world.

## Cross-cuts (why isolated edits break)

These span more than one folder. Respect them even if you were only assigned one pack.

1. **Piano.** Furniture owns mesh + MP3 + key collision. Body must not override seated pose. Walk-to-bench and finger curl live in `MiraWorld.after`. Hands at `.61±hx` so they are not crossed; feet toward the keyboard (bench local −Z).
2. **Furniture grab.** Pack tags mass/AABB. `Props.tickFurniture` is the only gravity/hold/throw.
3. **AR lookdev.** Studio lights are desktop/VR. `RoomLight` is XR-only. Body passthrough harness may dim authored lights in AR; desktop orbit must keep `createStudioLights`.
4. **Cased extinguisher.** Not a gun-rack pickup. Wall case with smashable glass. `item.cased` skips gravity until `hold()` clears it.
5. **Sniper.** `scopeLens` (objective) + `scopeEye` (ocular). ADS overlay is in Props, not the furniture pack.

## Hard limits

Keep:

- Three.js r170
- Mira vertex order / morph names / bone names
- Wrapped skin in `mira-v2.js`
- AABB furniture obstacles
- `?v=` cache bust on edited imports
- No force-push to `origin master`

Do not:

- Rebuild Mira from a concept image
- Replace `createMiraSystem`
- Open Unreal / 3DGS / NeRF as the runtime
- Duplicate grab/throw or lighting in a pack that does not own it
- Push production unless the owner asked

## Gaps (still only in the host)

These are **not** in the three feature packs. Do not pretend they are. Touch them only when the assigned task requires it:

House floorplan and doors · Props grab/guns/recoil/sniper overlay · cars · weather · dogs/cat · wardrobe cloth · voice · A* walk and piano sit IK · castle · flora · laundry machines.

Recent house facts the host currently assumes:

- Stairs start in the open living room (`z=2.40`, yaw `π`), not into the hallway wall.
- One fire extinguisher, wall-mounted in a red glass case (not on the gun rack, not on the floor).
- TV **screen** is destructible glass cells; the stand is wood/metal.
- Piano: MP3 under `assets/piano/` while Mira sits and fingers move; player key volume is enlarged toward the bench.
- Reverse: with gear **R** and no throttle/brake, the car creeps back at about 0.63 m/s.

## How to take a session

1. Read this file + `mira-context.js` (or `sessionPrompt('body'|'furniture'|'lighting')`).
2. Open the assigned pack’s `WIRING.md`.
3. Edit only that pack’s files unless a contract forces a host one-liner.
4. Serve over HTTP. Quest Browser for XR. `?debug=1` exposes `window.human2`.
5. Do not push unless asked. Cache-bump `?v=` on anything you changed.

## Success

A later Astra session can open **only** furniture (or only body, or only lighting), still know it is Human5, still respect Mira’s mesh contract, still leave grab/lights/host in the right files, and still ship a change that `engine.js` can load without a rewrite.
