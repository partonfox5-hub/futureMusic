# Town checkpoint 01 — recovery snapshot

Saved September 7, 2026. This is the first Town development checkpoint, not the completed 15-phase game. Update 9 remains separate and unchanged.

## Included
- Complete copied Update 9 assets and modules, with a new /town entry point.
- Town shell: 25 parcels, crossroads, three persistent-in-memory resident records, clock, active-plot scene and director panels.
- Headset-relative left-stick movement and smooth right-stick yaw around the viewer's position. Joystick axes 2/3 remain authoritative when centered.
- Y menu placed 0.8 m ahead of the current headset pose, hover indication, X shop hook (shop is not implemented yet).
- Grip-preserving slow-frame reset; native grip pose correction for pistols; firing retains ownership; ammunition, reload and slide animation.
- Fallback map if WebGL or character loading is unavailable.

## Validation actually performed
Node numerical/regression tests passed for: population cap, plot count, clock progression, joystick axes, heading-relative forward motion, right-stick turn direction, head pivot, panel distance, grip release guard and shooting without dropping. JavaScript syntax and local module-reference checks are recorded in validation.json.
No Quest headset or GPU/browser visual validation was performed for this checkpoint. The gun orientation change still requires an on-device check against the physical grip. Do not regard this snapshot as a finished production game.

## Still unfinished
Needs depletion, smart-object interactions, economy, 100 jobs, construction, inventories, social planning, ambulance, vehicle extensions and persistence are not implemented. Motive bars show initial values. Resident walking currently uses a direct line; obstacle-aware town navigation is pending. Actor animation/pooling is preliminary. VR fields/dropdowns need a controller editor. Detailed scenes load one parcel; the terrain overview remains present. Clothes and other Update 9 systems are copied but not all connected to the Town UI. No new motion capture or scanned skin assets have been acquired.

## Resume
Working directory: /workspace/sites/mira-town
Runtime entry: dist/town/town.js
Tests: audit/checkpoint01.mjs
Preserved baseline: /workspace/sites/mira-v2-demo/dist
Baseline commit: 9d0525589245014aa3cfae10cb6d2a46b85b4336
Serve the extracted folder with a static HTTP server and open /town/. WebXR requires HTTPS (or localhost). Three.js imports currently require the CDN. The original futuremusic.online deployment has not been modified.

The user requested a durable checkpoint before any more additions because credits are low. Resume with checkpoint 02 only after this archive has been saved successfully. Preserve all earlier ZIPs. The complete 15-phase plan is in TOWN-HANDOFF.md.
