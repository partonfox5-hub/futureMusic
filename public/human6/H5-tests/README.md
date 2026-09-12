# Checkpoint 18 validation harnesses

In this directory run `npm install`, then `npx playwright install chromium`. Optional: set `H5_CHROMIUM` to an existing Chromium executable. `H5_PROJECT` defaults to the parent game folder; `H5_RESULTS` chooses the evidence output directory.

Run `npm run integrity`, `npm run batching`, `npm run features`, `npm run stress`, and `npm run profile`. The earlier cash/eyes/recent scripts remain available for targeted follow-up. `node integration.cjs` additionally captures the isolated sedan/rack/season scenes and tests all 27 garments and decoding all 13 voices. Run browser checks sequentially so competing renderers do not distort the timings.

The profile uses the actual animation loop in a fixed Sustain tier, at 960×600, with a simulated Quest user agent. Four scenes each record 64 rendered frames. Chromium SwiftShader is a software renderer: these reports are diagnostic comparisons, not Quest GPU/FPS evidence. No hardware speed assertions are encoded. Gameplay checks assert caps, cleanup, finite deformation/physics, forest damage routing and a real house-wall collision. The pinned Three package supplies the CDN code during tests; other model assets remain in the game folder.

`cash-regression.cjs` uses deterministic temporary floor/water hooks only for the explicit support-sleep, float and zero-gravity cases, restoring them afterwards. Its ordinary picking and release checks run through the application's actual Props integration. `final-stress.cjs` similarly isolates a lamp pool for bounded-light tests, then tests the actual environment selection, packed trees, pet rigs, audio pool and car-wall collision in the loaded game.

Run `node capture-pets.cjs` for the six-breed asset sheet. The sheet normalizes view scale for each pet; in-game breed sizes use their individual scale presets.

`node checkpoint15-regression.cjs` checks the XR head placement, hand-pushed hair/scalp envelope, shared anatomy relief, day/night cycle and audio graph lifetime. `node eyes-regression.cjs` checks animated eyelid details, batch damage visibility and removal/disposal of both intact and cut restraint links.

`checkpoint18-regression.cjs` tests the new controls, mattress/drawers, lights, activities, running and ragdoll lifecycle in the loaded app. `batching-regression.cjs` is a non-browser Three.js check of original-object ray hits, triangle indices, geometry damage, visibility and detached-source cleanup. The car collision stress test forces a batch refresh before rendering the damaged scene.
