# Human5 checkpoint 15 — 19.0

Complete integrated project based on checkpoint 14. Serve the human5 folder under /human5/ using the same server arrangement as the prior project; start at /human5/index.html. Keep HTTPS for Quest WebXR and microphone permissions. No new runtime dependencies.

## Changes

- A common, larger scalp envelope constrains hair guides, sheet edges and crown underlayer. Open hands impart tangential velocity; tracking discontinuities reset guides.
- XR vehicle placement computes the tracked head offset before rotating/translating the player rig, including first entry with a detached XR ArrayCamera. Exit also accounts for the room-scale head offset.
- Player walking and sprint speed increased 30% in desktop and VR modes. Swimming and vehicles are unchanged.
- Gear → Links: DELETE ALL RESTRAINT ROPES removes intact and cut links, cuffs and any pending attachment.
- The existing rubber pet toy is 65% larger in each dimension, with updated mass and volume. Its existing chicken ID and fetch/tug behavior are retained.
- One rest-space anatomical anchor drives pigment and mesh relief. A bug that overwrote relief during body shaping was corrected. Motion-excited, submillimetre to millimetre tissue waves now affect both breast and glute regions, remain bounded and decay at rest.
- Revised pet rib-cage, muzzle, haunch and paw proportions; denser visible surface fibers and a sparse close-range guard coat. Additional fur is hidden beyond five metres and the outer layer beyond 2.4 metres. These are improved procedural models, still visibly stylized, not scans of real animals.
- Three shared combustion loops replace the old two-oscillator engine sound. RPM, load, transmission shifts, distance and cabin filtering affect the sound. At most four engine graphs; parked/distant voices stop. Sounds are synthesized, not recorded from a real car.
- Full day/night cycle: 24 minutes of foreground wall time, moving sun and moon, warm horizon transitions, drifting clouds, night stars and coordinated scene lighting. World menu has +3 hours and pause/resume. The sky uses the existing single sky draw and a 128×128 noise texture. Environment maps remain precomputed approximations, intensity adjusted through the day.
- Quest resident trees reduced from 100 to 72 per forest cell, far forest density reduced, birds from 36 to 18 and feeder limit from six to four. Existing terrain streaming, damage and seasons remain.

## Validation

H5-tests/checkpoint15-regression.cjs checks actual car entry through a mocked XR camera, three additional nonzero rig/yaw cases, hand-pushed hair clearance, anatomical relief, rope clearing, enlarged toy, day-cycle phases/period and engine voice cleanup. No page or shader errors occurred. Hair displacement in the deterministic palm case reached about 45 mm; this is a game behavior check, not a clinical measurement.

The full-loop performance report uses Chromium SwiftShader and a simulated Quest user agent, not an attached Quest. It cannot establish headset FPS. CPU stalls remain. Use the in-game EXPORT PERFORMANCE REPORT after several minutes on the device.

## Next work

The separately requested eye research, fitted eyelid improvements and NPC Studio 2nd pass are still in progress. This checkpoint deliberately preserves a runnable milestone before that work; it does not contain those later changes.
