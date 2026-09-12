# NetKnight 5 — combat, broadcast intro and holographic visor

This archive updates the existing complete WebXR game. Its eight original spheres, eleven main connections, four side chambers, weapons, enemies, pets, story art, music and saved-run support remain included.

## Balance and damage

- Exposed hydra boxes have **180 HP**, exactly three **60-HP base heads**. Head regrowth still compounds head health by 20%; box health does not grow. Kill every living head before damaging its box. Destroying the box permanently cancels that nest's regrowth and leaves its opening.
- Sphere-wall structural resistance rises from 4 to **4.6 impact units**, a 15% increase. Individual contacts apply one unit, so identical discrete impacts breach on the **fifth contact** instead of the fourth. Tunnel resistance remains four contacts.
- Enemy projectiles can exhaust the player's hull and then power to end the run. The intentional hull-first, power-second health system remains. A resting sword no longer provides a passive shield; a moving blade must actually intercept the projectile before it reaches the player.
- Hostile splash and nearby barrel-chain explosions now hurt the player, with distance falloff and solid-wall occlusion. Direct hits do not also apply splash damage to the player during the same immunity interval. Healing wells wait two seconds after a hit before restoring hull/power. Saved immunity is capped at the intended 0.38 seconds, and loading zero power cannot revive a completed run.
- New crate/barrel groups use wider offsets and added positional variation. The number of props is not increased.

## Pursuit and swarms

Enemy navigation uses the actual tunnel/room connections and open damage holes or hatches. Enemies can find an exit in another sphere, leave through a breach, re-enter through an opening, and steer around exterior sphere and tunnel obstacles. Transit steering suppresses combat orbiting and hull repulsion near openings. Solid sphere/tunnel walls now block movement from both sides.

The repeating UFO interval is **1.3 times its previous value**. Batch size is **1.3 times the former 2–3 saucers**, rounded probabilistically so the average is 30% larger (3.25 instead of 2.5). Individual batches can contain 2–4. The first hatch retains its original 120-second delay. A bundled synthetic overhead PA voice announces each actual release: “Attention. Incoming U F O swarm.” Its separate voice channel stays audible when combat channels are busy and briefly lowers the music. No browser speech service or network TTS is required.

## Sword and power fragments

The sword laser has overlapping fire and smoke volumes along its entire clipped path, plus the existing impact burns and smoke. A forceful physical swing launches a red crescent projectile with a digital crackle; it has swept collision, damage and impact ignition. The swing calculation subtracts player translation, has a 0.45-second cooldown, and must rearm after slowing. Desktop slashes use the deliberate right-button sword swing. Looking around, walking, turning with the stick, pausing, and an untracked fallback controller do not intentionally trigger this attack.

Power fragments are small glowing RGB speckles, with eight alternating pitched collection chimes. Instanced point cores and halos share one texture and fixed buffers.

## Restored intro and tutorial

The opening rebuilds the supplied `NkIntro` presentation with a 3D studio, gold and magenta hosts, animated mouths/arms, the nine original comic/tutorial panels and text, type-on captions, and the Future Music logo splash. The fight tutorial also explains the new slash. An additional visor lesson explains the map, power gauge, hull and zero-power defeat.

The intro plays on the first game start and new runs. It is replayable from **Intro / tutorial** on the landing page or **Replay intro / tutorial** in the pause menu. On Quest, either trigger advances and **B skips**. On desktop, **Space / Next** advances and **Escape / Skip to game** skips. The presentation advances automatically as well. The game clock, enemies and spawn timers remain paused throughout; exiting the intro suppresses held weapon buttons until released. The original story/comic archive remains in the pause menu.

## Holographic visor

A true 3D minimap sits in the lower-left periphery. It preserves sphere centers/radii, all 15 tunnel sections and four side rooms, using transparent shells, gold/cyan wireframes and a green heading marker. Red/white markers track the Knight; gold markers show surviving hydra nests. The occupied sphere highlights cyan. Geometry is built once per map; markers update without rebuilding it.

The **top-center power gauge** combines a large numeric glyph reading, attack multiplier, a 32-segment color meter, multiplier ticks and a recoverable-peak marker. It marks power damage after the hull is exhausted. It refreshes at 10 Hz and performs no texture upload while the simulation clock is paused. **Y toggles the entire visor**, including the minimap and power display. Desktop placement adapts to the viewport; headset placement uses fixed peripheral positions.

## Validation and performance pass

65 automated tests pass, plus the application lifecycle scenario with DOM, renderer and XR adapters. They cover source map geometry, all six mobile enemy families pursuing outside, multi-sphere exit routes, re-entry, real defeat, projectile/parry ordering, hostile splash, immunity migration, hydra-box health, swarm cadence/size, slash collision, RGB/chimes, beam coverage/caps, intro skip/replay/frozen time, both VR advance/skip controls, and minimap/gauge state.

The combat/navigation feature pass, before the final hornet patrol preservation and intro/visor integration, completed a 12-minute simulation of 43,200 steps with finite positions. CPU timings on the build host: median **1.104 ms**, p95 **3.381 ms**, p99 **5.056 ms** per step. Maximum population was 1,076 entities with 66 simultaneous projectiles. This replaces the previous version's long-run report; scenario population changes mean these are not a controlled speedup measurement.

A separate 96-enemy exterior-pursuit scenario ran 3,600 steps with one 59-node navigation graph build: median **0.442 ms**, p95 **0.905 ms**. A 600-fragment / 64-slash / maximum-length-beam effect update measured median **0.205 ms**, p95 **0.500 ms**. The beam adds two sprite batches, with 64 fire and 64 smoke instances maximum (32 each in Performance mode); existing transient fire/smoke stays capped at 256. Shared navigation destination fields refresh at most about three times per second for a stationary target.

These are **CPU measurements, not Quest FPS**. GPU rendering, headset optics, controller alignment, audio playback on Quest, and physical Quest 3 performance remain unverified. Automated XR tests use adapters. Included previews show actual canvases and CPU projections of actual geometry, not GPU screenshots.

## Compatibility and hosting

Version 3 and 4 saves are accepted. Version 4 box damage migrates proportionally from 240 to 180 HP without healing it. Head health/regrowth deadlines, world damage and player progression persist. The archive is a complete static site with bundled dependencies and an **Enter VR** button; upload the extracted folder contents to an HTTPS website. Versioned `?v=5.0.0` module URLs prevent mixed old/new modules after replacement. See `HOSTING.md`.

The new PA recording was synthesized offline with FFmpeg's libflite RMS voice, then pitch/EQ/compression/echo processed. `tools/generate-announcer.py` reproduces it; the original 43 sound recordings, five music tracks and 13 story images remain included unchanged.
