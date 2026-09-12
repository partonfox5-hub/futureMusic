# NetKnight / Battle Sphere Arena — Quest WebVR 5.0

A JavaScript/WebXR reimplementation of the supplied **NetKnight Unity game**, with the original connected arena, active combat systems, enemies, progression, collectible economy, story art and music. The C# files are included for reference. Procedural models, materials, animation, browser controls and rendering have been rebuilt for the web.

## Put it on your website

1. Extract the ZIP and upload the **contents of the `netknight-webvr` folder** together to a folder on your website. Keep `index.html`, `js`, `vendor` and `assets` beside each other.
2. Open that folder's `index.html` in **Meta Quest Browser**, using your Touch controllers.
3. Choose **Enter VR**. The desktop button also works with a mouse and keyboard.

Use HTTPS. Immersive WebXR requires a secure context and an explicit user action. See the [WebXR session requirements](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession). For an embedded game, grant the iframe spatial tracking permission; a direct link to the game's own page is also supported. Details and examples are in [HOSTING.md](docs/HOSTING.md).

There is **no runtime build step, CDN dependency, login, backend, or Unity installation requirement**. All game files, Three.js, recordings and images are included. The archive is approximately 37 MB. Load music is streamed as it plays; the whole archive does not need to be downloaded before the first frame.

## Version 5 update

- Restored **3D two-host intro/tutorial**, original story art, captions and studio splash. Skip or replay it at any time; enemy clocks stay paused during the presentation.
- **3D holographic minimap at the lower left**, showing the original arena, your heading, Knight and hydra markers. **Top-center power gauge** with a segmented graphic, glyph total, multiplier and recoverable peak.
- **180-HP hydra boxes**; **15% higher sphere-wall resistance** (five discrete contacts to breach). Head regrowth still doubles each slain head after 10 seconds and compounds head health by 20%.
- Enemies pursue through actual openings, across the tunnel network and around exterior obstacles. Walls block movement from both sides.
- Fixed passive sword shielding, missing hostile/barrel splash damage, and excessive saved immunity. Wells briefly pause recovery after a hit; verified hull → power → game-over damage.
- Wider crate/barrel scatter; glowing **RGB power speckles with eight chimes**.
- Fire and smoke along the entire sword beam, plus **red momentum slash projectiles and crackles**.
- UFO spawn intervals **30% longer**, batches **30% larger on average**, with a bundled overhead announcer voice at every release.
- All version 4 models, black/silver/red-runic sword, mech Knight, mouth-charging hydras, stronger camels, reactive screens, lighting, explosion audio, irregular holes and curved destructible debris remain included.

See [UPDATE-5.md](docs/UPDATE-5.md) for exact rules, save migration, validation and performance results. [UPDATE-4.md](docs/UPDATE-4.md) records the preceding graphics overhaul.

## Complete game systems

- Eight original sphere centers and radii, eleven main tunnels, four side chambers, outer hull play and lava beneath the arena.
- Charged plasma cannon, physical sword swings, charged sword laser, drawn solid plasma, lasso, force pulse and seeking shoulder missiles.
- Seven drone variants; Dark and White Knights; hover-camel, armored trilobite, owl-lemurs and hornet packs.
- Three timed hydra nests, multi-head escalation, vulnerable kennels and permanent nest destruction. **Hydras have reptilian skulls, horns, teeth, hinged jaws, continuous articulated necks, and a visible mouth charge. Plasma orbs originate inside the mouth.**
- Crates, explosive barrels, floating platforms, destructible hatches and hull openings, physical hull fragments, animated windows and destructible scrolling arena displays.
- Power glyph belts, healing wells, the gold blimp power-up, missile pickups, rare pet cages and all eight orbital companions.
- Original comic/tutorial text and images, original five-track music playlist and 43 sound recordings, plus a bundled PA voice, eight collection chimes and spatial charge/impact/screen/pet accents.
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
| Sword / energy slash / laser | Forceful right-controller swing / hold right trigger for laser | Right mouse |
| Draw solid plasma | Hold left grip, release | C |
| Lasso / pull | Hold right grip | R |
| Force pulse | B | Q |
| Seeking missiles | Click either stick | F / H |
| HUD | Y | Y |
| Nearby store, optional mode | X | X |
| **Pause / menu** | **Left grip + X** | **P / Esc** |
| World map | Map in pause menu | M |

In the intro, either trigger advances and B skips; on desktop use Space / Next and Escape / Skip to game. The pause menu offers **Replay intro / tutorial**.

The system menu button belongs to the headset/browser. The grip + X combination provides an in-game pause button. In headset menus, point either controller and press its trigger. Snap turning is the default; smooth turning, a movement vignette, sound levels and graphics presets are adjustable.

## Saves

Pause → Save stores the run in that browser. An automatic checkpoint is also written periodically and when the page loses visibility. **Export save** downloads a portable JSON copy; **Import save** restores it. Browser-local saves are specific to the website origin and can disappear if site data is cleared. The snapshot includes enemies, pickups, world damage, hydra state, pets, missiles in flight, completed plasma strokes, progression timers and random state. An unfinished trigger charge is cancelled on pause. Version 3 and 4 saves are accepted. Version 4 hydra boxes migrate from 240 to 180 maximum HP while retaining their percentage of remaining health. Regrowth deadlines, torn-hole contours and progression persist. Saved damage immunity is bounded.

## Validation and limits

**65 automated gameplay, audio and geometry checks pass**, along with an application lifecycle test covering intro replay/skip, frozen game clocks, holographic HUD state, desktop start/fire/pause, save/load, settings, and simulated XR denial/entry/controller input/pause/exit. A 12-minute CPU simulation completed with finite positions. Source recordings and art were copied without byte changes.

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
