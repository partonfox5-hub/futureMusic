# UPDATE 9 · phased rebuild

Phase 1 complete: independent NPC configuration startup, runtime failure message, desktop and Y-menu spawning profiles and personality, eight face profiles, eleven hair variants, repaired player-hand UVs, visible VR hover and pointing cursor, standard forward/strafe and smooth turn, hand response maximum 8, haptic gain maximum 2 (actuator output remains a gentle 0.13 peak).

Preserves Mira v1 and the human2/assets/tex folder structure. Body profiles share the supplied rig. The male profile is an adaptation of the original anatomy, not a dedicated male scan. Configuration is stored on this device. Full conversational replies require the optional chat service; local fallback replies remain available.

Phase 2 complete: layered cornea / iris shader, pupil modulation and convergence; smoother seven-node hair guides with full gravity; optional AR lighting estimation, 1.2 render scale and 90 Hz preference; free local Kokoro voices; eleven modular garment patterns, eight outfit presets, desktop and VR slot selection. Phase 3 complete: expanded multi-room house, driveway, rounded furniture, breakable wall/ceiling cells and furniture parts, debris collision, sword/mace and ballistic/laser pistols with distinct pits, burns, flashes and sparks. Desktop click picks up / uses, Q drops; VR grip picks up / swings, trigger fires, release grip drops. Scene tab also equips weapons. House routes to rooms and driveway, obstacle removal after breakage, and distinct impact states passed numerical checks.

Phase 4 complete: two-point cuffs/tethers and short links on v2 limbs, neck, scenery and moving objects; adjustable length, selection, cut with loose ends, removal; left-thumbstick click and desktop/VR controls. Bloodless impact marks, regional accumulated damage, guarded fractured-arm poses, impaired leg recovery, optional exceptional blade detachment and restore action. Detachment is disabled by default. Tether shortening reduced anchor error from 0.424 m to 0.215 m for a 0.20 m target; cutting stopped constraint forces; detached triangle indices restored correctly.

Phase 5 complete: a modular driveway car, driver seat entry/exit, wheel grips, left-trigger accelerator, X brake, W/S/A/D and Space desktop controls, damped chassis pitch/roll, speed-dependent steering grip, punctures, wheel loss, vertex dents and detachable panels. Swept chassis probes break house/furniture cells under sufficient impact. A 384×192 rear view renders at 15 Hz while driving, with a user toggle. Reset restores the vehicle. Menus and cache versions are updated for the final release. Tethers use bounded position constraints and existing joint-limited IK, not a full articulated rigid-body solver. Short links constrain positions, not all six rigid-body degrees of freedom. Injury levels are stylized gameplay values. Destruction is bounded pre-fractured geometry, not arbitrary FEM fracture or Unreal Chaos. Weapon energy is a game model with mass and swept speed; not a measured injury simulator.

Validation: syntax and module references checked; actual GLB loaded in numerical checks with finite adapted body geometry. Browser menus tested separately. Quest controllers, frame rate and rendered appearance require hardware validation.


## Final validation and boundaries

- Actual GLB numerical fixtures pass: adapted male geometry; eye material/shader construction; eleven garments; house routes to every room and driveway; breakable-obstacle removal; distinct laser/bullet material state; tether convergence/cutting; sever/restore geometry.
- Vehicle fixture accelerates to 7.35 m/s and brakes to rest, turns left for positive steering, dents panels, punctures/detaches/repairs a wheel, and restores XR/viewport/render-target state after its mirror render call.
- XR input fixture passes Y with reversed controller connection order, press-edge handling, forward menu placement, and ray hover/trigger on the LINKS tab.
- Browser confirms final NPC body, hair, outfit and personality dropdown changes. Kokoro generated audio and completed browser playback in phase 2.
- This cloud browser reports GL_RENDERER=Disabled. No rendered WebGL, GPU shader compilation, headset microphone or Quest frame-rate test passed here because those facilities are unavailable. Test on Quest with one actor and Balanced quality first. Mirror rendering, two extra room lights, garments and damage add cost.
- The car is a bicycle/traction game model with swept probes and pre-fractured surroundings. It is not GTA vehicle physics, deformable chassis finite elements, arbitrary wall cutting or a certified mechanics model. The yard is bounded.
- Body/cloth/hair collision still uses finite probes, triangles and guide constraints. Extreme fast motions can penetrate; no claim of perfectly accurate flesh contact. Restraints are compliant and can retain small residual error at joint limits.
- Detachment is bloodless, optional, and cuts a weighted mesh region rather than generating anatomical cross-sections. Clothing refits to remaining surfaces; it is not a layered cutting simulator.
- A true male scan, photographic skin replacement, full scattering/refraction, real-room reflection/depth capture, strand grooms and a full local conversational language model remain asset/engine work. Consult REALISM-RESEARCH.md for the priority order and primary sources.

## Controls

Desktop: configure under CREATE NPC, then SPAWN CONFIGURED NPC. Click floor to walk, click chair to sit, Shift-drag body to grab. Click a table weapon to hold it, click to use it, Q to drop. E enters/exits the car; W/S drive/reverse, A/D steer, Space brakes. PLACE TWO ANCHORS starts a link; click each endpoint, then select/adjust/cut/remove in LINKS & INJURIES.

Quest: left stick moves, right stick turns. Y opens the menu in front; hover glows gold. Grip grabs body, clothing or equipment; trigger selects/fires. Left-stick press attaches a tether endpoint or selects an existing link. LINKS sets length, cuts/removes and restores NPCs. DRIVE enters/exits/repairs the car; grip the wheel rim, left trigger accelerates, X brakes. The menu applies the car brake while open. A microphone permission prompt and initial speech-model downloads still require browser cooperation; they cannot be bypassed automatically.
