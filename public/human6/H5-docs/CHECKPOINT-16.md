# Human5 19.1 — checkpoint 16

Complete integrated project based on checkpoint 14 / 18.0, including all checkpoint 15 changes and the dedicated eye/Studio pass. Earlier checkpoint documents and patches are historical; do not reapply their patches over this full release.

Serve this `human5` folder at `/human5/` using the existing server arrangement. Open `/human5/index.html`. Quest WebXR and microphone access require the same HTTPS setup as your existing game. This release introduces no new game runtime dependency. All local module cache tags use 19.1.0.

## Included changes

- Scalp clearance shared by hair guides, card edges and crown. Smoothed face-framing transitions and restricted upper-crown motion; stronger, bounded open-palm contact on the hanging hair. Hair is still a procedural card groom, not a photographed or strand-simulated hairstyle.
- XR vehicle entry/exit places the tracked head using the pose before the rig changes. This fixes the reproduced first-entry offset with detached WebXR camera objects and nonzero rig yaw.
- Desktop and VR walking/sprinting 30% faster.
- VR panel **Gear → Links → DELETE ALL RESTRAINT ROPES** clears intact/cut links, cuffs and pending placement.
- Existing rubber pet toy enlarged by 65% in each dimension; mass and buoyancy volume adjusted. The object keeps its existing chicken ID and fetch/tug rules.
- Pigment and anatomical relief share a rest-space anchor. Corrected relief being overwritten during body scaling. Both breast and glute regions receive small, bounded, motion-excited tissue waves which decay at rest. These remain game approximations, not a validated tissue solver.
- Revised pet silhouettes/proportions and a sparse close-range fur layer; retained three dog and three cat breed variants. Fur/geometry remain visibly stylized.
- Three shared synthesized combustion loops with RPM/load, shift, cabin, distance and damage response. Four active engine-voice limit; parked/distant graphs stop. These are synthesized sounds, not licensed recordings of real engines.
- **24-minute foreground day/night cycle**, moving sun/moon, warm transitions, rolling clouds and night stars with coordinated world lighting. VR **World** panel offers **+3 hours** and pause/resume. Hidden time pauses. The two existing environment maps remain precomputed approximations.
- Reduced Quest forest and bird populations, cached scene light enumeration and allocation-free rigid-batch visibility checks. Existing seasons, damage and streaming continue.
- Eye finish now follows actual animated eyelid vertices: two narrow ribbon draws replace four fixed planes. Adjusted sclera, limbus, pupil, parallax and corneal material response; neutral expression no longer starts with a small blink/squint.
- **Photo NPC Studio import is integrated** in desktop settings. Select a V2 NPC and import an extended `.h5photo.json` before entering VR. New Studio 2 fits suppress blink/squint/eye-wide/nose-sneer evidence, ignore uncalibrated depth for nose tilt and limit extra displacement to 4 mm. Old valid fields remain compatible.

## Studio 2

Studio is a separate ZIP, run locally on the laptop. Windows: install Python 3.12, run `setup-windows.cmd` once, then `start-windows.cmd`; install FFmpeg for videos up to 60 seconds. There is no EXE in this source release. `START-HERE.txt` has the short instructions.

The 19.1 game already includes the bridge. The older-game installer supports the expected 17.8, 18.x and 19.x engine layouts and creates a new copy. Standard `.h5npc.json` profiles also remain supported, without the extra field.

Photo fields are **not included in generic game scene saves**. Use **EXPORT PHOTO NPC** to save the extended profile separately. Normal profile replacement removes the active photo identity. Import/rebuild is a one-time CPU task and can hitch; do it before entering VR.

## Verification and practical limits

The packaged 19.1 runtime resolves 322 relative imports across 162 parsed ES modules. Browser checks compile the revised shaders. Focused tests cover first vehicle entry, hair contact/clearance, anatomy relief, bulk rope disposal, day-cycle phases, audio lifetime, finite pet geometry and actual house-wall collision. Studio tests cover local inference, video limits, browser workflow, neutral-eye failure modes, bridge installation and expression-preserving import.

The additional complete-project performance pass ran after the feature changes. Resident tree counts and triangle submission fell, but CPU timings were mixed and some cases regressed. **No Quest 60 FPS / 72 Hz guarantee is established.** Read `H5-docs/FINAL-PERFORMANCE.md` and the raw evidence.

The human face, eyes, hair and pets still do not match photographic realism. The dedicated research report explains what changed, what was measured, and which offline capture/reconstruction steps could address that remaining asset gap. The screenshots are real application captures, not image-generation stand-ins.

No research GPU backend was newly installed or benchmarked on an RTX 5060. Studio remains an actual local AI landmark detector plus template fitting, not an identical-person reconstruction or 4K texture generator. The full research report compares newer approaches without presenting untested code as an implemented backend.

## Integration files

- `modules/human5-xr-placement.js`: tracked head placement helper, used by vehicle entry/exit.
- `modules/human5-anatomy-anchor.js`: common rest-space relief/material anchor.
- `modules/human5-day-night.js`: pure clock and lighting directions.
- `mira-v2-tearline.js`, `mira-v2-eyes.js`: eye rendering and animated lid details.
- `modules/human5-photo-field.js`, `modules/human5-photo-import.js`: Studio extended-profile bridge.
- `modules/human5-groom.js`, pet modules, weather, lighting, SFX, locomotion and VR menu files: integrated changes described above.

The separate module-update ZIP includes complete replacement files, hashes, a dry-run installer and an explanation of which baseline versions it accepts. Use the full project ZIP when replacing your deployed project wholesale. Use the module update or its manifest when reviewing/merging into a separately modified branch.
