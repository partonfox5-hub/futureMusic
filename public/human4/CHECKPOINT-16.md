# Checkpoint 16 — second-pass patch (h4.4)

Date: 2026-09-07

Follow-up on checkpoint 15. Old 01–15 zips kept. **Not pushed.**

## Fixes
- Pathfinding no longer A*s a 48 m town grid every frame (local window + long-range steer). NPCs only repath when the dest changes.
- Ground clicks no longer always open a pie or place furniture; pie radius is tight; place only while the X panel is open; Esc cancels.
- Extra town sun no longer double-lights the house; fog pushed out so the interior does not go black.
- Empty fuel now zeros throttle. X furniture panel does not steal the driving brake.
- Starting Mira stays idle in the bedroom (black hair), does not auto-wander out.

## Feature fill
- 20 job types, 100 job slots.
- Inventories (`food` + item bag) on HUD.
- Internet/computer job at the house desk; talk writes a line into chat.
- Chrome wheels $60 plus existing respray.
- Walk clip library per gait (arm/hip/bob/thigh).
- Construction dust uses transparent materials.

## Tested locally
Load, needs HUD, housed starter, 100 jobs, wardrobe spawn, sleep order, respray, wheels, doors, paintings.
