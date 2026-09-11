# Checkpoint 05 — streamed region, Human5 17.1

This builds on the saved 17.0 complete project. It contains the prior character, furniture, lighting, fire, voice and vehicle upgrades plus a **2,112 × 2,112 metre procedural region**. The later requested pets, combat/population, clothing, weapon/spell, cuttable grass/hair and shower upgrades are queued for subsequent checkpoints; they are not claimed here.

## Implemented

- A connected road network from the five-house cul-de-sac to twelve irregularly arranged city parcels, with hiking routes toward the forest, lake, mountains and volcano.
- A continuous terrain height function shared by cell generation, walking, wheel contacts and water samples. A persistent distant terrain mesh keeps the landscape visible beyond loaded cells.
- Nine nearby 96 m terrain cells. Terrain generation yields after rows with a nominal 2.2 ms work slice on Quest. The final geometry/forest commit is atomic and can exceed that slice; it is not a hard frame-time guarantee. Up to three extra burning cells may stay resident.
- Instanced broadleaf/pine trees in resident cells, cheap distant forest silhouettes, physical trunks, cutting/felling and movable timber. Felled-tree and sculpted-terrain state survives cell eviction. Forest thermal registration is limited to nearby trees and the existing combustion budget.
- A carved lake, inlet river and outflow connected to the original hydro/swimming system. River current is supplied to that system. A mountain range and volcano have actual terrain elevation, crater lava and a bounded plume.
- Twelve buildings with 3–7 floors at 3.15 m spacing, stair flights below 18 cm rise per step, and elevators with call buttons, destination buttons, motion limits, opening/closing gates and a doorway sensor. Ground foundations follow parcel elevation.
- Different apartment/office partitions. The restaurant has dining tables, chairs and a kitchen; the top floor of Lookout has furniture and tall glazing. Most other rooms intentionally remain unfurnished.
- A WORLD page in the VR panel, desktop weather/travel controls, and explicit save/load of terrain edits, felled trees, tree damage, elevator floor and weather selection. Clear/cloud/rain/snow can be pinned manually; dynamic mode changes over time. Rain/snow particles are masked under the registered building/house roofs.
- Additional static house/door batching and a 4 m collision broad phase for the larger region.

## Load and integration

The complete ZIP already includes everything. Serve its parent and open `/human5/`; Quest needs HTTPS. Do not use a local file URL.

To build from the original uploaded project:

```bash
python integration/apply-all-upgrades.py /original/human5 /new/human5
```

To add only this stage to an existing 17.0 integration:

```bash
python integration/apply-world.py /version17/human5 /version17_1/human5
```

The scripts validate exact source anchors, refuse an existing output and normalize local import query versions. `H5-UPGRADE.patch` and `H5-WORLD.patch`, with their hash manifests, describe both host-integration stages. New modules: `human5-worldfield.js`, `human5-worldrender.js`, `human5-city.js`, `human5-openworld.js`.

The terrain adapter pauses its previous terrain renderer while this region is active, but retains the original terrain-gun controls through the new field adapter. Swimming samples enter the original water solver rather than running a second buoyancy integrator. Elevator support enters `world.floors`; the elevator carries resting riders by its actual per-step movement.

## Controls and state

WORLD → Weather selects automatic or fixed weather. WORLD → Destination → Travel is a convenient inspection shortcut; ordinary walking/driving remains available. Exit a vehicle before using Travel. Elevator buttons work with a free hand’s pointer/trigger; the WORLD panel can also request a destination in the current building. A queued call waits for doors to close; entering the doorway reopens the door.

The region save is deliberately a **terrain/tree/weather/elevator record**. It is not a complete save of character, loose furniture, fire, weapons or clothes. Existing scene-save controls still own their original state. Restaurant and penthouse interiors remain allocated after first visit so their loose furnishings do not lose floor support when out of view. They are hidden when distant. Other nearby interiors load/evict with a maximum of three proximity selections, so the two retained special interiors may raise the resident interior count to five.

## Evidence and remaining limits

`npm test` covers the earlier modules; `node tests/world.mjs` covers terrain seams, water depth, protected edits, serialization, building floor counts, stair support, elevator travel/door interlock and cleanup. `tests/world-browser.cjs` exercises the complete browser integration, including an actual camera rider, scene round trip, furniture, weather, tree felling and water queries. See `WORLD-TEST-RESULTS.md`.

This is procedural game architecture, not authored commercial-game scenery. Distant buildings are simplified facades; detailed interiors appear nearby. City structural walls are static collision geometry in this stage, not the house fracture system. There is no lava-fluid simulation or eruption hazard. Full thermal/fire state is not preserved for arbitrarily many evicted burning cells. Roads/trails follow a simplified graded field, not a civil-engineering road solver.

The larger view costs more than the prior neighborhood. No Quest hardware was available; the 60 FPS goal remains unverified. More population and effects must use explicit budgets and require another whole-project performance pass.
