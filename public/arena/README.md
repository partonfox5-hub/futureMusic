# NetKnight / Battle Sphere Arena — Quest WebVR 4.0

A JavaScript/WebXR reimplementation of the supplied **NetKnight Unity game**, with the original connected arena, active combat systems, enemies, progression, collectible economy, story art and music. The C# files are included for reference. Procedural models, materials, animation, browser controls and rendering have been rebuilt for the web.

## Put it on your website

1. Extract the ZIP and upload the **contents of the `netknight-webvr` folder** together to a folder on your website. Keep `index.html`, `js`, `vendor` and `assets` beside each other.
2. Open that folder's `index.html` in **Meta Quest Browser**, using your Touch controllers.
3. Choose **Enter VR**. The desktop button also works with a mouse and keyboard.

Use HTTPS. Immersive WebXR requires a secure context and an explicit user action. See the [WebXR session requirements](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession). For an embedded game, grant the iframe spatial tracking permission; a direct link to the game's own page is also supported. Details and examples are in [HOSTING.md](docs/HOSTING.md).

There is **no runtime build step, CDN dependency, login, backend, or Unity installation requirement**. All game files, Three.js, recordings and images are included. The archive is approximately 35 MB. Load music is streamed as it plays; the whole archive does not need to be downloaded before the first frame.

## Version 4 update

- Obsidian-black sword with silver edges and red runic inscriptions; a layered red laser with fire, smoke and scorch marks at its contacts.
- Larger mech Dark Knight with articulated armor, an obsidian sword and a telegraphed purple sword laser.
- Camel health increased from 28 to **100**.
- Hydra first head **60 HP**. Every head killed gives that nest **20% more maximum health**, compounded, and schedules **two replacements after 10 seconds**. Living heads retain their percentage of remaining health. Kill all heads and destroy the **240-HP nest before regrowth** to remove it permanently, leaving an irregular opening. There is no eight-head limit.
- Curved, patterned hull fragments break loose at breaches. They drift in zero gravity, support player contact and can be destroyed.
- Interior pattern families and broadcast strips inspired by the actual Unity textures. Screens independently greet nearby players and hide their occupants when incoming projectiles are predicted.
- Turbulent fire/smoke explosions, contact lighting, a continuously rising cannon hum, and impact sounds scaled to explosion size.
- An additional graphics realism review and performance pass. Long rays now traverse intersected spatial cells; screens share one instance batch, and dense hydras use fewer neck segments.

See [UPDATE-4.md](docs/UPDATE-4.md) for the exact rules, changes and measured results.

## Complete game systems

- Eight original sphere centers and radii, eleven main tunnels, four side chambers, outer hull play and lava beneath the arena.
- Charged plasma cannon, physical sword swings, charged sword laser, drawn solid plasma, lasso, force pulse and seeking shoulder missiles.
- Seven drone variants; Dark and White Knights; hover-camel, armored trilobite, owl-lemurs and hornet packs.
- Three timed hydra nests, multi-head escalation, vulnerable kennels and permanent nest destruction. **Hydras have reptilian skulls, horns, teeth, hinged jaws, continuous articulated necks, and a visible mouth charge. Plasma orbs originate inside the mouth.**
- Crates, explosive barrels, floating platforms, destructible hatches and hull openings, physical hull fragments, animated windows and destructible scrolling arena displays.
- Power glyph belts, healing wells, the gold blimp power-up, missile pickups, rare pet cages and all eight orbital companions.
- Original comic/tutorial text and images, original five-track music playlist and 43 sound recordings, with spatial mixing and new charge, impact, screen and pet accents.
- Desktop and headset menus, world map/navigation, persistent saves, JSON import/export, best scores and behavior history used by the Knight.

The active Unity code retires coin stores. That remains the default. **Settings → Next-run coin store** restores the dormant source shop for a new run, including pets, missiles and rocket boosts. The source comparison documents this optional mode and the other implementation differences.

## Controls

| Action | Quest Touch | Desktop |
|---|---|---|
| Fly / strafe | Left stick | W A S D |
| Rise / descend | Right stick up / down | Space / Shift |
| Turn | Right stick left / right | Mouse |
| Boost / wall kick | A | E |
| Plasma | Hold left trigger, release to fire | Hold left mouse, release |
| Sword / sword laser | Swing right controller / hold right trigger | Right mouse |
| Draw solid plasma | Hold left grip, release | C |
| Lasso / pull | Hold right grip | R |
| Force pulse | B | Q |
| Seeking missiles | Click either stick | F / H |
| HUD | Y | Y |
| Nearby store, optional mode | X | X |
| **Pause / menu** | **Left grip + X** | **P / Esc** |
| World map | Map in pause menu | M |

The system menu button belongs to the headset/browser. The grip + X combination provides an in-game pause button. In headset menus, point either controller and press its trigger. Snap turning is the default; smooth turning, a movement vignette, sound levels and graphics presets are adjustable.

## Saves

Pause → Save stores the run in that browser. An automatic checkpoint is also written periodically and when the page loses visibility. **Export save** downloads a portable JSON copy; **Import save** restores it. Browser-local saves are specific to the website origin and can disappear if site data is cleared. The snapshot includes enemies, pickups, world damage, hydra state, pets, missiles in flight, completed plasma strokes, progression timers and random state. An unfinished trigger charge is cancelled on pause. Version 3 saves are accepted and upgraded to the new camel/hydra rules; version 4 saves retain regrowth deadlines and torn-hole contours.

## Validation and limits

**42 automated gameplay, audio and geometry checks pass**, along with an application lifecycle test covering desktop start/fire/pause, save/load, settings, simulated XR denial/entry/controller input/pause/exit. A 12-minute CPU simulation completed with finite positions. Source recordings and art were copied without byte changes.

**GPU rendering and physical Quest 3 operation have not been verified in this environment.** The available browser setup could not render WebGL, and no headset was attached. The XR lifecycle test uses adapters and is not a headset test. Do not interpret its simulated clock as measured FPS. Quest frame rate, visual appearance, controller alignment and comfort need a real-device check. No claim of Unity PhysX or AI frame-for-frame equivalence is made.

Read [SOURCE-PARITY.md](docs/SOURCE-PARITY.md) for exact source facts and implementation differences, and [FOUR-PASSES.md](docs/FOUR-PASSES.md) for the graphics/audio work and measured CPU optimizations.

## Developer files

- `js/`: readable game modules; `models.js` contains the new procedural models.
- `unity-source/`: original C# references from the supplied Unity project.
- `tests/`: simulation, audio, geometry and app lifecycle checks.
- `docs/validation/`: recorded validation results; `docs/previews/` contains a CPU projection of the actual hydra mesh.
- `tools/serve.mjs`: optional local HTTP server. Run `npm run dev` for local desktop testing.

The hosted game needs no npm packages. For optional developer geometry/lifecycle tests, run `npm install` to install the pinned development-only canvas package, then `npm test` and `npm run test:lifecycle`. `npm run benchmark` runs the longer CPU-only stress scenario. `npm run preview:hydra` regenerates the hydra silhouette review. `npm run preview:update` generates the current sword, mech and texture reviews; these are CPU projections, not GPU screenshots. `npm run benchmark:update` checks the long-ray optimization against its previous implementation.

The supplied game's art, audio and original code remain attributed to their original owners. Three.js r160 is bundled under its MIT license in `vendor/THREE-LICENSE.txt`.
