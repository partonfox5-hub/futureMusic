# Update 10 — natural grips, smooth locomotion and house building

Based on the user-uploaded human2(5).zip. Keep the human2 directory structure when replacing the existing installation. This is a simulator update, not a Town checkpoint.

## Controls

- VR weapons: reach within 22 cm of the handle, press and HOLD grip to pick up and wield, release grip to drop. Either hand works. Trigger fires pistols; swing your hand for sword/mace hits. A ray pointed at a distant weapon no longer grabs it.
- Pistols use their actual handle centre and an upright barrel pose. Sword/mace handles orient up out of the closed grip. Hand rotation carries the weapon in all three dimensions. Recoil pivots around the handle.
- Left joystick: headset-relative forward/back and strafe, with a radial deadzone and normalized diagonal speed. Right joystick X: continuous smooth turning around your actual headset position. Walking speed 1.45 m/s; turn rate up to approximately 123 degrees/s. Menu and driving keep their separate controls.
- Y opens the menu in front of you. BUILD is the last tab. Choose Wall, Floor, Ceiling or Furniture. Walls/floors/ceilings have 1×1, 2×2 and 3×3 patches. Each constituent square is 0.6 m: patches are 0.6, 1.2 or 1.8 m across, matching the destruction cell scale.
- Choose plaster, brick, wood, tile, stone, metal or glass. Each square remains separately destructible. Wood, brick, tile and metal use repeatable procedural surface textures.
- Wall base and ceiling underside heights adjust in 0.6 m increments. Default ceiling height: 3 m. Rotation advances by 90 degrees. Place adjacent patches to extend a house and omit cells for doors/windows. Floors are at ground level; there are no stairs or multi-storey walking mechanics.
- START PLACING closes the VR panel. Aim DOWN at the ground within 18 m and press trigger for each placement. Green preview means ready; red means blocked. Opening Y stops placement. A patch uses the preview's first grid cell as its origin.
- The desktop Build houses panel controls the same system: aim at the ground, click to place, Escape or STOP to finish. UNDO LAST removes the last placed patch or furniture item.
- SAVE SCENE / LOAD LAST includes your construction. Named presets and JSON export/import also include it. Save before changing dioramas or rebuilding the original house; these actions reset construction. Saving is local to this browser; export a preset JSON for a separate backup.

## Existing furniture catalog

Chair, couch, table, bed, nightstand, kitchen counter, refrigerator, bathtub, sink, wall picture and clothing rack. The furniture models are reused from the original house, including pillows and decorative details. Chairs and couches retain NPC seating; rack clothing tokens can dress NPCs. Placement adds collision and destruction registration. No new bed/bath/kitchen NPC activity systems are implied.

## Technical changes and limits

- Application headset queries use the rig-parented camera refreshed from the current XRFrame viewer pose before simulation. This avoids losing the rig transform when querying Three.js's internally unparented XR camera.
- xr-standard thumbsticks use axes[2]/axes[3]; the touchpad slots are never substituted just because the stick is centred. Handedness, rather than input-source order, selects movement versus turning.
- Slow-frame recovery clears motion history without releasing grips. Trigger release remains separate from grip release. Throw velocity is measured in world coordinates. Melee collision samples sweep along the weapon as well as its tip.
- All three environments now use 60×60 m ground with play bounds approximately ±29.4 m. Distant fog is adjusted. NPC navigation takes direct clear paths and has a bounded fallback search.
- Construction is limited to 240 placements per scene to bound growth. Each patch uses one instanced mesh. Existing debris limits remain. Furniture adds draw calls; practical Quest performance depends on actor and furniture counts.
- Scene presets preserve individual broken construction squares. Placed furniture is restored intact. Existing base-house damage and all dynamic props are not a complete save-state simulation.
- This implements nearby handle pickup and direct hand-following weapon control inspired by the requested GORN feel. It does not replace the engine with GORN's rigid-body/constraint simulation: held weapons can still visually intersect solid geometry, although swept hits apply impact/destruction. Dropped-weapon physics remains lightweight.

## Verification

17 deterministic simulation checks passed using Three.js 0.170.0: stick mapping/deadzones, movement signs, rotated-rig forward direction, room-scale turn pivot, controller ordering, simultaneous movement/turning, grip anchors in both hands, upright gun/melee axes, firing/reset grip retention, throw velocity, exact cell counts, wall collision/destruction/undo, walkable floors/overhead ceilings, duplicate/bounds rejection, all furniture and cleanup, save/restore of broken squares, malformed input rejection. See validation-update10.json.

All JavaScript syntax and local module references were checked. All original binary model/texture assets are preserved byte-for-byte. Browser rendering, actual Quest hand alignment, controller events, and on-device frame rate have NOT been tested here. Please test one pistol and one melee weapon in each hand, forward/back/strafe while looking around, turning after physically stepping sideways, and a small built room on Quest before a long play session.

Reference: WebXR Gamepads Module, xr-standard mapping: https://www.w3.org/TR/webxr-gamepads-module-1/#xr-standard-gamepad-mapping ; Three.js r170 WebXRManager camera update logic (same version as this project's import map).
