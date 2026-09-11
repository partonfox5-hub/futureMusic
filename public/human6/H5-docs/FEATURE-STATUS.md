# Feature coverage and review points — 17.8

“Implemented” describes code and integration, not photographic or physically calibrated fidelity. Browser and numeric test results are in `H5-test-results`; real Quest interaction remains a separate gate.

| Request | Integrated implementation / evidence | Remaining practical limit |
|---|---|---|
| Quest lighting and lamps | Glass bulb materials; fixture light pool; lighting module and acceptance tests | Bounded raster lighting; no path-traced global illumination |
| Torch contact / spread | Held-frame sweeps, exposed fuel, water extinguishing, incremental collision grid | Artistic combustion rates; bounded effects |
| Furniture, bags, cushions | Tearable shells, exposed highly flammable stuffing, preserved host dynamics | Approximate tear geometry and support |
| Rugs / carpet | Indexed cloth holes, two-hand tension tearing, patterned rugs, nearby pile instances | No individual-fiber simulation |
| Five homes | Distinct 1–3 bedroom plans, varied furniture/patterns; neighborhood tests | Procedural asset detail |
| Large living world | 2112 m field, 96 m cells, nine resident terrain cells, limited pinned portal cells | Loading spikes remain; not every state persists across sessions |
| City / vertical buildings | Twelve irregular blocks, 3.15 m floor spacing, 3–7 floors, elevator/stairs, restaurant, penthouse | Bounded detailed interiors; most floors unfurnished |
| Nature / weather | Trails, rivers/lake, mountains/volcano, vegetation, cuttable grass, weather controls | Distant forest simplified; small near-detail budgets |
| NPC character | Revised face/groom, original morph rig, joint/gait/spine and tissue extensions | Reference identity and photorealistic skin are unmet |
| Default physique / touch | Requested slider proportions, max hair motion, 7.5% fluid bias, layered support | Numeric game tuning, not measured anatomy |
| Hair / wetness | Straight shoulder groom, guide contact, trim/regrow, wet material response | Card groom; no individual strands |
| Enemies / armor / followers | Six enemy roles, hostile modes, shared V2 bodies, armor and commands | Approximate AI/armor; active NPC cap |
| Invincibility / delete | Damage, sever and knockback guards; selected X removal/cleanup | Existing injuries require healing |
| Pets | Softer fur treatment, articulated behavior and mouth grips; small bite damage | Approximate fur and skeleton |
| City activity | Virtual populations promoted to bounded full NPC/car counts, signals, rural outings | No visible animated ambient driver; outings not long-soak tested |
| Fishing / birds | Cast/reel/bait/fish states, flock steering, feeder visits | Bounded procedural animals; controller feel needs Quest playtest |
| Weapons / tools | Dedicated tabs, procedural detail, scope zoom, launchers, spells | Authored CS:GO-level meshes are unmet |
| Vehicles | Five vehicle classes, spawning, suspension, automatic shifting, dents/mechanical losses | GTA-quality assets/collision response are unmet |
| House-impact crash | Real Willow collision regression; finite response, four broken cells, no exception | First-use view/streaming hitches remain |
| Portals / mirrors | One-level per-eye projective views, clipping/transit, small render targets | No recursive portal rendering; stereo needs headset validation |
| Shower / steam / fog | Temperature/flow controls, pooled droplets/steam, local wipe mask, wetness | Bounded visual effects |
| Basement / arcade / crate | Stairs, actual canvas game adapter/demo, joystick/buttons, exterior bolt/hinge | Additional HTML games require rendering/control adapters |
| Voice on VR entry | Retained microphone lease, capture status, VAD, local speech fallback tests | HTTPS, permission and initial model download; full dialogue backend absent |
| Player sliding / sink | Analog release stops drift; removed camera pull; sink nozzle local attachment tests | Physical Quest locomotion comfort not measured |
| Two final performance passes | Simulation profiles and complete home/car/city/forest loop plus regressions | 60/72 FPS not established; raw reports expose remaining stalls |
| Local photo/video creator | Separate deliverable after this game ZIP | Does not convert a photograph into a guaranteed exact scan |
