# Human5 Checkpoint 11 — character and glass refinement

Version 17.7.0. Includes the complete Checkpoint 10 game, including the car/wall exception fix, startup vehicle-view preparation, basement, arcade, crate and showers.

## Changes

- Mira now uses dark brown, straight, shoulder-length hair. The old oversized radial crown and separated narrow locks are replaced by a fitted continuous underlayer and 44 overlapping flat guided cards. Fine fiber variation, a restrained highlight and softer tips replace coarse stripes. The guide solve uses bounded fixed steps and reused vectors. Wetness affects its material and damping. Both the outer cards and underlying hair sheet trim and regrow together.
- Disabled inappropriate alpha-to-coverage on Quest-path eyelashes; the new groom uses alpha testing. This corrected the white edge artifacts found in browser renders without MSAA.
- The identity sculpt now uses the actual mesh's eye, nose, cheek, lip and chin heights. Eyelid width/aperture have independent controls; expression endpoints are warped with neutral geometry. Removed the misplaced periocular bulge and excessive idle grin. The tearline's curvature was also corrected: the previous coefficient displaced its edges by over 13 cm instead of millimetres.
- Anatomical pigmentation has a gradual edge and local normal relief. The body exposure/seam blend no longer paints a uniform skin color over this region. A continuous skinned surface carries the geometric relief; no separate attached decal mesh is used.
- Two local conforming refinement passes add 1,558 vertices to the shared skin buffer in this asset. The small anatomical region now has 153 vertices within the sampled 12 mm radius, versus 7 before. All original expression targets, UVs, material partitions and normalized skin weights are retained. Source geometry remains unchanged for other asset instances.
- Tissue attachment and shear compliance are separate from near-incompressible volume. Four rear attachment points eliminate the directional bias of the previous three-point cage. Glute support is firmer than breast tissue, with a bounded transient surface response over the muscular support. Fluid-response bias defaults to 7.5%, rather than replacing the solver with a liquid model.
- Hot shower glass can be wiped with a nearby tracked palm/controller. A small retained local mask clears the touched area; condensation gradually returns. Water flow, temperature, fog and wetness remain separate state.

## Starting Mira defaults

| Setting | Value | Slider position |
|---|---:|---:|
| Breast size | 1.86 | about 75% |
| Buttock size | 1.74 | about 75% |
| Thigh size | 1.57 | about 75% |
| Jiggle | 4.5 / 6 | 75% |
| Hand contact response | 12 / 16 | 75% |
| Tissue softness | 0.75 | 75% |
| Waist/thigh softness | 0.75 | 75% |
| Hair flexibility | 1.0 | maximum |
| Controller haptic gain | 3 / 4 | 75% |

The shape profile import/export ranges now match the real controls, including these larger defaults. The newer physics variables are present in the exported `human5.npc/1` profile.

## Evidence

`tests/character-regression.cjs` exercises the integrated actor, rather than only a stand-alone spring. After six seconds at the default preset, the four-point model settled approximately 16.5 mm downward at the breast cages and 3.1 mm at the glute cages. The early startup displacement is approximately 8.7 mm; it is not the final equilibrium. Zero gravity returns the cage to its rest target. Reversed gravity reverses the displacement. Full fresh-water submersion at the configured 980 kg/m³ tissue density gives approximately 0.34 mm of upward cage displacement. The attachment remains connected to the character; this is not a buoyant balloon lifting the body.

The tested states remained finite and retained cage volume within the regression threshold, with zero divergence recoveries. These are numerical game-model results, not anatomical validation.

Other passing checks cover:

- Shared topology refinement without hanging edges, area changes or unnormalized skin weights; morph continuity and source isolation.
- Guide and underlayer cutting, complete regrowth, variable timesteps and teleport recovery.
- Profile export/import at the new defaults and actual browser shader compilation.
- Basement stair traversal and collisions, hollow crate/hinge/exterior bolt, arcade canvas adapter, shower wetness, hot steam, mirror state restoration, local glass wiping and returning condensation.

Actual game portrait views are saved under `test-results/character-continuity`. These are game screenshots, not generated previews presented as game output.

## Limits and next work

This checkpoint improves the supplied procedural character. It does not match the reference photographs exactly, and the hair still lacks the fidelity of a professionally authored groom. The skin detail is not a newly authored 4K scan. The cloth, furniture, world and vehicle assets remain procedural. Neither the tissue model nor the vehicle damage system is a calibrated finite-element simulation.

The first performance diagnostic still found substantial CPU costs and spikes, especially in the city. It also exposed repeated facial morph-atlas uploads on body material partitions. Those optimization changes belong to the next working stage and are not included here. Both requested final performance passes and the final integrated game export remain pending. The separate local photo/video NPC application follows the final game export.

## Integration

Use the complete project ZIP for a ready-to-serve source folder. From the complete 17.6 game, run `python integration/apply-delta.py SOURCE NEW_OUTPUT` in the module bundle. From the original complete uploaded game, run `python integration/apply-all-upgrades.py SOURCE NEW_OUTPUT`. Both write a new directory and validate inputs; they do not overwrite your existing project.
