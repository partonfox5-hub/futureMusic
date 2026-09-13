# Request audit — Human6 WebXR 20.1.0

Reviewed against the requests visible in this thread and the existing 20.0.1 checkpoint. “Retained” means the implementation was already present; it does not imply a new feature was added twice.

| Request | Build status and location |
|---|---|
| Mobile infantry, correct weapon grip/aim, faster firefights | Retained: `human6-tactics.js` uses hand IK, muzzle shots, bursts/reloads, strafing, cover/flanks and shared reports. Runtime check fires nine shots and moves over three metres in two seconds. |
| Firearm accuracy %, group coordination %, melee skill % | Retained sliders/menu controls, 0–100%. **Added world-save persistence**. Accuracy is an aim-attempt probability; cover can still block a shot. |
| More convincing melee duels | Retained guard, windup, strike, recovery, stamina, circling and parries/counters; phase regression passes. |
| Better weapon and impact sound effects | Retained cached synthesized weapon layers, distance/stereo attenuation and material-sensitive impacts in `human6-audio.js`. |
| Rare night woodland horde/spore creatures with growing limbs | Retained procedural joint-chain creatures inspired by the supplied horde project, rare night encounters, limb growth/severing and Quest population caps. |
| Rideable wild horses/elephants, saddles, same mount action as cars | Retained E / existing mount interaction, saddle grips, horse/elephant riding, left automatic reins, optional right rein grip, arm steering, and independent right-hand weapons. |
| Replicating creeper flood, slow lava, menu-erupted volcano | Retained budgeted full-region fluid simulation and local rendering; Powers/Dragons page manages eruption and sources. |
| Both hands overhead plus jump to fly; 3D sticks; flight boost | Retained gesture gate and controls; ground sprint boost replaced. **Added roof underside collision and roof landings**. |
| Orbital strikes, Superman landing shockwaves and craters | Retained terrain effects. **Fixed instanced walls being skipped and connected settlement structural damage**. |
| Live map position, location labels, territory colors | Retained minimap and physical two-handed unfolding map, all named places, waypoints and faction colors. |
| Create/lead groups, selected-NPC dropdown assignment, politics/capture | Retained groups and assignment UI, group commands, symmetric war/peace, contested capture and ownership saves. |
| Five house floor plans | Retained cottage, longhouse, lodge, cross hall and courtyard plans. **Added persistent damage to streamed structures and usable roof surfaces**. |
| Four distinct towns and two distinct cities, 10–20 buildings each | Retained 74 buildings across Timberfall, Red Mesa, Frostbridge, Reedwater, Civic City and Sunspire; six architectural palettes/styles. **Added wood/masonry/plaster material detail**. |
| Three caves, three groves, temple, two forts, fortress | Retained all eleven landmarks and labeled map markers. Temple/fortress roofs now support landing. |
| Larger map with walkable/rideable travel distances | Retained 4.224 km square region, connected routes and bounded detailed residency. No claim of zero performance cost. |
| Halve bird count again | Retained nine Quest birds / 24 desktop birds. **Batched feeder geometry**. |
| Mira duplicate chest feature | Retained suppression of residual atlas pigment, normal/gloss and microdetail that could duplicate the existing geometry feature. |
| Ground-clipping cul-de-sac squiggle | Retained removal of the legacy floppy noodle's automatic outdoor appearance. |
| More realistic dog/cat models and fur | **Further revised anatomy/bind proportions, eye geometry/shading, ears, mouth and surface smoothing; added a shared fine-fur texture and directional groom**. Six breeds retain valid skinning and foot contact. Art remains procedural. |
| Vehicle feels as if sliding on ice | **Fixed heading-relative suspension order, bounded tire response, available drive grip and grounded stability**. Turn recovery/braking regression passes at two simulation rates. |
| Car only dents/bounces off one wall unit | **Added full-footprint fracture work across wall cells and exposed framing, multi-furniture impacts, low restitution and persistent streamed-building damage**. Weak-wall and masonry tests pass. |
| Holding a torch moves player backwards | **Removed held-prop rig translation and excluded held colliders from player projection/rays**. Player-isolation regression passes. |
| Performance pass following supplied recommendations | Retained on-Quest profiling, static/repeated geometry batching, 10–30 Hz distant simulation, optional menu Layers, framebuffer 1.0, FFR and single directional shadows. **Added tire-vector pooling, stud/feeder batching, remote-car culling and cheap exact roof height queries**. |

Hardware-only validation is outstanding: actual Quest draw/CPU/GPU captures, comfort, rein alignment, and compositor behavior. Home/Car draw targets are not yet demonstrated. KTX2 conversion, sky/video compositor migration and eliminating every allocation in the inherited engine are not part of this checkpoint. Procedural art is not a substitute for a final authored/scanned asset pipeline.
