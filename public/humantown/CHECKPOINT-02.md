# Town checkpoint 02 — needs, orders and smart-object foundation

Built on checkpoint 01, preserving its complete folder structure and assets. Checkpoint 01 and the separate Update 9 sandbox remain unchanged.

## Implemented in this checkpoint
- Hunger, energy, bladder, hygiene and entertainment drain continuously. Comfort is derived from location, housing, nearby crowding, time of day and posture.
- Critical needs show warnings. Zero hunger for 60 seconds of unpaused simulated play causes death; the game-speed multiplier does not shorten that real-time countdown. Eating resets the countdown. Bladder accidents lower hygiene. Exhaustion slows walking. Crisis warnings do not interrupt player orders.
- Movement now belongs to the fixed-step simulation, so pause also pauses directed movement. Walk, wait, append and cancel orders have a strict player-over-autonomy policy.
- Smart-object registry: interaction advertisements, eligibility reasons, ownership and guest access, food availability, capacity reservations, timed motive changes, completion hooks and cleanup. Sleep starts below 35 energy, toilet below 35 bladder and shower below 45 hygiene. Relief already in progress continues beyond its starting threshold.
- Desktop and Y panels: live need values, crisis warnings, resident cycling, pause, waiting and order cancellation. Ground click / VR trigger continues to direct walking.
- Need-driven concern expression on active Mira actors.

## Try it
Serve the extracted root through an HTTP server, then open /town/. WebXR requires HTTPS or localhost. Use Resident to choose a character; Orders to wait, queue another wait or cancel. Ground targeting replaces the current order with a walk. Y opens the VR panel and pages through controls; trigger activates the highlighted row.

## Scope and limits
This is the simulation foundation, not the furniture slice. The registry is exercised by automated fixtures; the town has no registered usable bed, toilet, fridge or food yet. Those arrive in checkpoint 03. Until then needs cannot be replenished through the interface; pause or reload to stop/reset the session. Reload currently resets the town.
Comfort is a gameplay approximation. Walking still follows direct lines; town navigation, clip-based locomotion, collapse/sleep animations, autonomous needs selection, jobs and persistent saves remain later checkpoints. Hunger death removes the detailed actor; there is no corpse/funeral sequence. Smart-object definitions must be re-registered by their modules when restoring JSON.
The fixed simulation runs at 4 Hz. A single delayed callback contributes at most one second; browser suspension/offline time is not simulated. The 60-second starvation rule applies to active, unpaused play, with 0.25-second tick resolution. No separate offline progression is implemented.

## Validation
15 simulation tests pass, including 30/72/120-fps equivalence, starvation at game speeds 0.25/1/4, partial zero-hunger intervals, pause, queue priority, relief gates, capacity and access checks, cancellation/death cleanup and JSON state continuation. Checkpoint 01 movement/grip regressions also pass. All project JS syntax and local JS import paths are checked. See validation.json and audit/.
No visual browser or Quest hardware testing performed. Existing 3D and microphone limitations remain. No new live demo published for this checkpoint.

## Resume locations
Working source: /workspace/sites/mira-town/dist/town
Project tests: /workspace/sites/mira-town/audit
Recovery archive: mira-town-checkpoint02.zip
Next: checkpoint 03 — fridge inventories and usable bed, toilet, shower and entertainment objects. Keep the order/registry boundaries; object modules should supply their own ads and completion behavior.
