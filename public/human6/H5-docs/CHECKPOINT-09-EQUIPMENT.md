# Human5 17.5 — Checkpoint 09

This complete project checkpoint adds equipment, working portal views/transit and four vehicle designs to the saved 17.4 stabilization release. It includes the original project assets. The separate laptop NPC creator, character fidelity work, bathroom/basement features and the final additional performance pass remain in progress.

## Controls

In VR, press **Y → GEAR**:

- **WEAPONS / TOOLS** has Firearms, Melee, Tools, Launchers and Spells. Select Equip in Hand or Spawn in Front, then an item. The pointing controller receives an equipped item. Clear Unheld Spawns removes only loose equipment created by this menu.
- **VEHICLES** spawns the sedan, Cinder sports coupe, Canyon pickup, Sable motorcycle or Badlands monster truck. Select a vehicle to enter/exit it or remove an unoccupied user spawn. Quest allows four additional user vehicles; traffic and the two existing scene vehicles remain separate.
- **DRIVE** retains the P/R/N/D controls. Forward ratios shift automatically. Left trigger accelerates; X brakes. Grip the wheel or motorcycle handlebars to steer. Desktop uses W/A/S/D and Space.

Sniper zoom uses the **holding hand's thumbstick forward/back**, from 2× to 12×. Desktop uses the mouse wheel while the sniper is held. This changes the optic camera, not headset FOV. The image is displayed on the rear ocular in VR; a desktop-only optical overlay assists mouse play. The holding-hand vertical stick is consumed by a sniper or fishing rod, preventing unintended forward walking while adjusting them.

Portal shots alternate blue and orange. Aim at a broad upright wall with room for the full doorway. Both portals are required to pass through. Small objects, sloped floors and ceilings are rejected by the placement tool. Clear Portals is on the equipment page.

The same equipment and vehicle actions are available in desktop controls.

## Implemented behavior

### Portals and optical views

Fixed the `T` variable shadowing bug that prevented portal construction. Wall anchoring preserves world-space size under rotated or scaled hosts. The view camera uses the full entry-to-exit matrix; the projection matrix includes that mapping and clips geometry at the exit plane. XR eyes use separate render targets and select their own texture at draw time. This is one level of portal rendering, with no recursive portals.

Front-to-back crossings rotate velocity and orientation. Cooldown is per entity, rather than a global lock that prevented a second object from crossing. Player placement accounts for room-scale head offset. NPCs and objects held during player transit move with the transfer to avoid stretching across the map. Ordinary bullets and launcher projectiles can cross paired doorways. Aperture collision ignores the supporting wall only; an unpaired portal does not create a hole in collision.

Up to two remote terrain cells and associated city interiors can remain loaded for portal destinations. This is additional to the normal nearby cell set. Rendering is skipped beyond 45 m or outside the source eye's frustum. Quest portal targets are 320 × 576 per eye and per portal, allocated on demand. Scope targets are 384 square on Quest, allocated while used and released after inactivity. Small optic glass uses a coated-glass approximation without a scene-wide transmission pass.

Scopes, portals and car mirrors share renderer-state preservation, including XR, render target, viewport, scissor, shadow updates and visibility. A failing offscreen draw still restores state. Mirrors now follow their own model's mirror location and use the active view-update budget, instead of a fixed 3–4 Hz update on Quest.

### Weapons and spells

The existing firearm and melee designs gain formed stocks, trigger/bolt/safety details, rails, grip ribs, barrel fittings and a beveled sword blade. Static surfaces merge by material. The tested weapon set ranges from 2–9 draws and 116–3,452 triangles per item. These are original procedural assets; they do not reproduce commercial game assets or reach the requested CSGO art quality.

A flintlock musket replaces the redcoat's rifle fallback. Rocket and mini-nuke launchers have reloads, cooldowns, bounded swept projectiles and radial game damage. The mini-nuke produces a growing mushroom cloud. This is a fictional game effect; it does not simulate nuclear physics or radiation.

| Spell | Behavior |
|---|---|
| Lightning | Visible bolt, combat impact and ignition of eligible material |
| Fireball | Moving projectile, contact impact, ignition; water extinguishes it |
| Freeze | Holds an unprotected NPC's pose/AI for 4.5 seconds; extinguishes a targeted surface |
| Resurrection | Restores the targeted NPC through the existing injury/health system |
| Necromancy | Restores a targeted dead NPC as a follower, or summons a clothed zombie follower at a ground target within the normal NPC cap |

Combat impacts use the existing armor/invincibility rules. Mini-nuke, rocket and fireball damage work is bounded and deferred across frames. Six projectiles and three cloud effects are pooled on Quest, with one mini-nuke in flight at a time. A mushroom cloud uses 64 instanced pieces. These are approximations; radial damage does not model blast pressure, detailed wall fracture, or a full fluid plume.

Bullet travel speed and usable range were increased. A held sniper shoots along its optical sight line with a 100 m convergence point, rather than an unrelated desktop camera ray.

### Vehicles

The four new models retain the host's seat, grips, hinges, part damage, punctures, dents, automatic selector and repair contracts. Dimensions and wheel contact geometry match each design. The pickup and monster truck have open cargo beds and hinged tailgates. The coupe is an original long-hood sports design, without manufacturer branding.

| Model | Mass used | Wheel contacts | Width × length × height |
|---|---:|---:|---|
| Cinder coupe | 1,460 kg | 4 | 1.91 × 4.55 × 1.23 m |
| Canyon pickup | 2,190 kg | 4 | 2.06 × 5.34 × 1.92 m |
| Sable motorcycle | 290 kg | 2 | 0.78 × 2.16 × 1.37 m |
| Badlands monster truck | 3,900 kg | 4 | 2.90 × 5.55 × 2.94 m |

These values are design parameters, not measurements of real production vehicles. Suspension travel, wheel radius, engine torque and rotational inertia vary by model. Motorcycle roll uses a turn-dependent balance assist and a parked lean; it is not a complete rider/gyroscopic simulation. Collision impulses transfer between cars. Protected NPCs are not displaced by the car's direct contact branch.

Panel vertices retain local dents. Wheel damage changes alignment and suspension, and front/engine damage reduces power and steering response. Repair restores both visible geometry and mechanical state. Parked, settled vehicles sleep; driving, grips, movement, damage and changed ground wake them.

These models remain procedural game assets. The supplied actual renders show the current quality and its remaining gap from GTA V. No scanned models, authored 4K vehicle textures or calibrated real-vehicle handling are included.

## Validation and remaining limits

`test-results/equipment/` contains browser evidence and actual renders. Tests cover portal construction, rotated/scaled wall anchoring, separate synthetic eye targets, projective mapping, per-entity transit/cooldown, offscreen exception recovery, rear-ocular zoom, catalog models, protected NPCs, freeze expiry, resurrection/follower conversion, projectile lifetime and the mushroom instance cap.

Vehicle tests verify tire settling, sleeping, acceleration, shifting, steering, uneven-ground suspension, dents, punctures, reduced power/steering and repair for all four new models. Forty-eight body rays agree with the unfiltered posed-mesh query. Existing fire, tissue, rugs, voice, world/elevator, armor and ecology tests remain part of the release checks. The original uploaded project can be reproduced through the supplied integration chain with byte-identical code files.

**This is not a Quest frame-rate certification.** Browser tests use workstation Chromium/SwiftShader; XR eye tests use synthetic cameras. Actual stereo rendering cost, controller ergonomics, view latency and sustained on-headset performance still need the final hardware gate. A scope or visible portal adds a scene render, so use the WORLD → PERFORMANCE controls and exported session report when testing the headset. The requested additional full-application performance pass is still required before the final game export.

Current limits include single-level wall portals, approximate projectile radius/collision, bounded radial damage, simplified motorcycle balance, and a four-user-vehicle Quest cap. Full-scene saves still do not serialize every NPC, portal, dropped item and vehicle state. Character photographic likeness, the 4K skin asset pipeline, wetness/showers/mirrors, the starting-house basement/arcade/crate and the separate photo/video NPC creator are not delivered by this checkpoint.

## Integration

Use the complete project ZIP directly, preserving the `/human5/` directory and pinned Three.js 0.170.0 import map. Serve it over a secure origin for WebXR/microphone use.

To reproduce this checkpoint from saved 17.4:

```sh
python integration/apply-equipment.py /path/to/17.4/human5 /path/to/new/human5
```

From the original complete uploaded project:

```sh
python integration/apply-all-upgrades.py /path/to/original/human5 /path/to/new/human5
```

The output directory must be new. Checksums reject an unexpected source instead of silently overwriting customized work. `H5-EQUIPMENT.patch`, `H5-EQUIPMENT-MANIFEST.json` and `equipment-overrides/` provide the exact host edits. The seven new modules are `human5-equipment`, `human5-equipment-models`, `human5-scope`, `human5-view-surfaces`, `human5-vehicle-models`, `human5-vehicle-spawns` and `human5-ray-budget`; existing vehicle, NPC and streaming modules are updated too.
