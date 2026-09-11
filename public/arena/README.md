# Battle Sphere Arena — WebXR overhaul 2.0

Complete standalone web game for Quest Browser and desktop. Based on the `battlesphere-arena-webxr.zip` you supplied. This is source plus ready-to-host files; no Unity, APK, npm install, API key, CDN, or build step is needed to play.

## Put it on your website

1. Extract the ZIP. Open its `battle-sphere-arena` folder.
2. Upload that folder's contents to your playable website directory, for example `public/games/battle-sphere-arena/`. Keep `js/` and `vendor/` beside `index.html` and `game.js`.
3. Open the resulting HTTPS address in **Quest Browser** and select **ENTER VR**. Grant the browser's immersive-session permission.
4. On a computer, select **PLAY IN BROWSER** and allow mouse capture.

WebXR requires a secure context. A plain `http://192.168…` LAN address or opening `index.html` as a local file will not provide Quest VR. See [MDN's WebXR session requirements](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession).

Your original store template is retained at `integration/battle-sphere-arena-landing.ejs`. Keep your existing checkout/access logic on the server; this standalone game does not replace it. That EJS template needs your site's existing server routes and header/footer partials.

If embedding the game, use a same-origin HTTPS iframe with `allow="xr-spatial-tracking; fullscreen; autoplay"` and `allowfullscreen`. The parent server must allow XR through its Permissions Policy. Opening the game URL directly is the simplest setup.

## Controls

| Action | Quest controllers | Desktop |
|---|---|---|
| Fly | Left stick; forward follows where you look | WASD |
| Look / turn | Head tracking; right stick left/right | Mouse |
| Rise / descend | Right stick up/down | Space / C or left Ctrl |
| Shoot | Press either trigger once per shot | Left click or F |
| Pause / settings | Y on left controller, or B on right | P or Esc |
| Select a VR menu item | Point a controller and press its trigger | Click |
| Restart | RESTART RUN in menu | RESTART RUN in menu |
| Leave VR | EXIT VR in menu | — |

The VR HUD shows power, score and survival time. The VR menu freezes gameplay and includes restart, sound, turning and quality controls. Losing power ends the run and offers a restart. Leaving VR pauses the game.

Controls & Settings offers Smooth or 30-degree Snap turning, a movement vignette, music/sound volumes and a performance display. Preferences are stored only in this browser. No user data is transmitted.

## Four passes included

1. **Graphics and sound foundation:** modeled armored sentinel drones and controller blasters; paneled spherical hull, structural ribs, lit equatorial markings, a geometric reactor and gyroscopic rings; original spatial laser, impact, destruction and reactor sounds.
2. **Graphics and sound polish:** emissive drone eyes/thrusters, damage flashes, muzzle flashes, pooled sparks and expanding destruction rings; original ambient/electronic music, nearby drone hums, warning tones; readable desktop and in-world VR menus, HUD, haptics and optional movement vignette.
3. **Performance:** shared/batched model geometry and instanced drone fleet; merged arena and rotor pieces; reusable bolt, particle, event and sound-voice pools; capped simulation catch-up and no timer-driven respawns. The retained 20 MB trailer is not loaded or decoded during gameplay.
4. **Performance and reliability:** adaptive detail/foveation, conservative Quest framebuffer presets, 72 Hz request when supported, throttled texture/DOM/audio updates, allocation cleanup, continuous projectile collision, input/session lifecycle checks and a 20-minute simulation stress run.

The original rules remain: radius 42, 14 seekers, two hits per drone, 1.6 m/s pursuit, power starting at 1000 and capped at 1400, passive drain 4/s, contact drain 40/s per drone, two power per shot, +18 power and +25 points per kill. Corrected bugs include dead drones draining power, one bolt damaging multiple overlapping enemies, projectiles skipping targets, controller shots ignoring rig rotation and XR movement moving only the camera. A depleted-power end state, pause and restart complete the run lifecycle.

## Performance presets

| Preset | XR framebuffer scale, set before entry | Foveation | Spark pool emission budget |
|---|---:|---:|---:|
| Performance | 0.80 | 0.75 | 96 |
| Balanced / Auto initial | 0.90 | 0.50 | 168 |
| High | 1.00 | 0.25 | 240 |

Auto reduces effects and raises foveation after sustained missed frames. It never changes enemy count, rules or simulation speed. Framebuffer scale changes take effect on the next VR entry; live quality changes affect foveation and scenery/effects only. Foveation support depends on the runtime. High is a manual option. The target is 72 Hz when advertised by the headset, **not a measured guarantee**.

## Verification and limits

**Passed:** 16 gameplay, controller-transform and audio-buffer tests; application start/fire/pause/resume/reset and XR session lifecycle tests using a renderer/DOM adapter; 108,000 simulation steps (20 simulated minutes) under repeated fire; JavaScript syntax and package reference checks.

**Not verified:** rendered graphics, WebGL shader compilation, actual immersive tracking/haptics, subjective audio quality and Quest GPU/thermal frame rates. The available test browser explicitly disabled WebGL, and no physical Quest was available. The lifecycle adapter checks real app logic and Three.js scene transforms; it does not render pixels or reproduce headset tracking. See `docs/TEST-RESULTS.md` and the JSON reports for the precise evidence.

The source supplied in the latest ZIP is the same 14-drone, single-sphere game as the earlier upload. Its store-page prose and older wishlist mention additional worlds/enemies/pets that are not implemented in that source. This release preserves and improves the executable game; it does not claim to reconstruct absent gameplay.

## Local desktop testing

With Python installed, run this inside the extracted folder:

```sh
python -m http.server 8788
```

Open `http://localhost:8788/` on that computer. Alternatively, with Node.js installed, run `npm run dev` and open `http://localhost:4173/`. This local HTTP route is for desktop testing; use your HTTPS website for Quest.

Optional developer checks, with Node.js 20 or newer:

```sh
npm test
npm run test:lifecycle
npm run benchmark
```

No package installation is required. Add `?debug=1` to expose read-only diagnostics on the performance output for debugging. This does not enable cheats or remote reporting.

## Files

- `index.html`, `style.css`, `game.js`: launch page and entry point.
- `js/`: complete editable gameplay, models, arena, effects, audio, controls and VR UI source.
- `vendor/`: local Three.js 0.160.1 and its MIT license, preserving the original engine version.
- `images/`, `trailer.mp4`: your unchanged original media.
- `original/`: your original game, page and README for comparison.
- `integration/`: your unchanged server store-page template.
- `docs/`, `tests/`, `tools/`: change notes, evidence and developer utilities.

New models, shaders and synthesized audio are procedural source assets in this package. Your original media is preserved unchanged.
