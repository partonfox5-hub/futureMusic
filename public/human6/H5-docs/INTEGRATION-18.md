# Module integration — Human5 18.0

The complete ZIP is the preferred runnable checkpoint. The module ZIP contains changed files at their exact `human5/` paths, a manifest with SHA-256 hashes, a patch against checkpoint 12 (17.8.0), tests and offline generation tools. Apply the overlay to that complete base, not to an arbitrary partial module bundle. All JavaScript cache suffixes were updated together to prevent duplicate/stale module instances.

New entry points:

| Module | Contract / host connection |
|---|---|
| `modules/human5-cash.js` | `installCash({scene,world,props,camera,water,quest})`; install once before equipment catalog creation; `tick(dt)` once per frame. Exposes `world.h5Cash`, `spawnPile`, `cut`, `grab`, `drop`, `clearLoose`, `snapshot`, `dispose`. |
| `src/dog/PetBreeds.js` | Six breed definitions, `breedFor`, `breedIdFor`. |
| `src/dog/PetSurfaces.js` | Baked quantized surface data; generated offline. |
| `src/dog/PetAppearance.js` | `buildPetAppearance(model)` before mesh compaction; existing DogModel bone names retained. |
| `modules/human5-rack-garments.js` | Garment-shaped rack displays and paging, connected through Wardrobe. |
| `modules/human5-sedan-detail.js` | Refines the existing sedan after its base meshes exist and before damage/rest-pose snapshots. |
| `modules/human5-distance-models.js` | Distant car/person geometry and animated pedestrian material, connected through population. |
| `modules/human5-seasons.js` | Singleton season state, canopy materials/geometries, tree tint and subscription. Keep one import identity. |

Host files were updated in place: `engine.js`, VR menu, Props, Wardrobe, Dog system and controllers, population, world renderer/streamer, vegetation, existing procedural trees, lighting/weather, upgrade and performance modules, and vehicle refinement. Do not install an extra light rig or call a second cash/dog tick.

Cash wraps `make`, `impact`, `grip`, `drop`, and `desktop` on the existing Props object. It registers its bundle meshes as ray-hit targets and removes them when opened or cleared. Equipment creation handles a null result when a spawn cap is reached. Loose bill picking uses the shared instanced mesh plus `instanceId`. Bills render one draw with 24 triangles each; tied bundles still use their ordinary prop meshes. Scene changes clear loose cash while retained held bundles follow the host lifecycle.

Forest LOD changes geometry/material on the existing trunk/broadleaf/pine instances. `tree.canopyIndex` maps each tree into its species-specific instance pool; `mesh.userData.h5Forest` supplies the corresponding packed lookup for damage. Removing a tree must use that canopy index rather than `tree.index * 2` for leaf instances. Both near and far resources are disposed when a cell unloads.

The audio and fur texture loaders resolve asset URLs relative to their module location. Keep `assets/pets/` beside the existing `assets/dog/`. This overlay uses existing fur assets from the complete base; audio provenance is in the new pet asset folder. New geometry and cash/leaf art were generated procedurally; inherited project assets retain their existing provenance.

Tests run with Node, Three.js 0.170.0 and Playwright. Read `H5-tests/README.md`. They start their own local server and intercept the Three CDN with the pinned local package for reproducibility. For actual Quest qualification, serve the complete build over HTTPS and export the built-in Performance report during headset play.
