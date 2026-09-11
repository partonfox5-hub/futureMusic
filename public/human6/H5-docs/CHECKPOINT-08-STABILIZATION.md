# Human5 17.4 — Checkpoint 08: performance and interaction stabilization

This complete project checkpoint extends 17.3. The same map, characters, wildlife, traffic, clothes, furniture, fire and water systems are integrated. It is an intermediate checkpoint, not the final quality/performance export.

## Changes

- Fitted clothing beyond 2.8 m uses the same garment faces/material with skeletal deformation. It switches back inside 2.2 m, on grabbing, on detachment, around nearby fire, or when burning. The transition transfers the current pose to the fabric particles. Cuts remain in both representations. Draped garments retain their particle solver. Close cloth runs a bounded 60 Hz solve, shares prepared body data, and resolves world contact after constraint iterations instead of during every iteration.
- Body contact searches use a spatial hierarchy per bone and prepare active morph weights once per batch. Contact queries continue using current skinned triangles. Far, unoccupied actors skip detailed self-contact queries when their pose is not being updated. This is a conservative gameplay broad phase; unusual extreme poses still need visual testing.
- Fixture light occlusion uses the world's nearby obstacle grid and a short visibility cache. Static furniture transforms no longer invalidate the obstacle grid unnecessarily. Empty basins reuse geometry/transforms. Inactive water droplets submit zero instances.
- Releasing movement input stops translation on desktop and VR. Analog stick magnitude determines speed. Leaving desktop first person no longer enables a camera orbit toward a stale target; the explicit orbit button anchors its target ahead of the current view.
- A held piece of furniture no longer receives an extra exact-position snap after the mass-dependent grip calculation. Ground friction uses elapsed time instead of multiplying a fixed factor for every contact corner. This improves the existing approximate solver; it is not a replacement rigid-body engine.
- Sinks have an open bowl, connected faucet pipe and nozzle, and a lever mounted on the rear ledge. The water volume uses the bowl dimensions instead of the full furniture bounding box. These pieces move with the sink.
- X deletes the selected NPC: keyboard X or the Quest left X button. Holding X deletes once; text fields and driving retain their controls. Deletion releases held props, furniture grips, clothing drags, restraints, wardrobe pieces and combat state.
- WORLD → PERFORMANCE on the VR panel offers Auto, Detail, Balanced and Sustain, shows frame workload and exports the existing performance report. City activity can also be toggled there. Automatic control still uses the session's supported refresh rate; this build does not force an unsupported 60 Hz display mode.
- Point-to-walk targeting now uses the streamed region's terrain query in the large map.

## Validation

`tests/stabilization-regression.cjs` exercises four stick-release directions, analog speed, fitted cloth positions, cloth grip/cut/detach transitions, 48 accelerated-versus-unpruned body-contact queries, sink attachment and water delivery, empty droplet submission, dropped-furniture settling, and X deletion cleanup. See the JSON evidence and actual sink render in `test-results/stabilization/`.

`tests/stabilization-profile.cjs` runs the integrated simulation with all world/gameplay/ecology systems at a fixed 72-step schedule, then records rendered scene complexity. It uses Chromium with SwiftShader and a Quest user agent. It is a workstation diagnostic, not a headset frame-rate test. It omits real XR controller polling and GPU frame presentation from the simulation timing. See `PERFORMANCE-CHECKPOINT-08.md` for measurements and limits.

The integration tool reproduces this checkpoint from the original uploaded complete project, with source checksums and exact module snapshots. The full project ZIP contains the original assets and all integrated modules. The module ZIP includes 35 modules, changed host-file overrides, prior-stage scripts, research, tests and documentation.

## Remaining quality bar

The current procedural character face/hair is still below the reference likeness requested. This checkpoint does not claim photographic reconstruction, authored 4K texture assets or the requested final anatomy refinement. The experimental portrait work is ongoing. New vehicle types, weapons/spells/portals/scope, shower/wetness, basement/arcade/crate, additional realism polish and the separate laptop application are still pending. Another whole-application performance pass and its tests are required immediately before the final game export.
