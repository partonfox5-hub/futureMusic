# Human6 20.1.0

This update audits the expansion requests in the supplied thread and fixes the new vehicle/torch reports. It includes the complete WebXR project, with no new build step. Serve `index.html` over HTTPS for Quest Browser.

## Driving, impacts and holding

- Suspension pitch and roll now follow the vehicle's heading. The previous rotation order unloaded wheels after a turn and caused a spin. Grounded drive torque respects available tire grip; lateral tire response and stability correction remain bounded by surface traction.
- A collision damages the full vehicle footprint before rigid collision response. Wall cells, their newly exposed wooden framing, and furniture consume a shared kinetic-energy budget. The car can carry through weak partitions; heavy masonry still resists it. Impact response has very low restitution.
- Exposed studs use a bounded instance pool. A breached wall no longer creates a separate draw for every stud. Collision and weapon picking still resolve individual members.
- Held-item collision constrains the prop without translating the camera rig. Player projection and prop rays exclude the player's own held collider. This removes two feedback paths that could push the player backwards while holding a torch.

## Missing connections completed

Streamed settlement walls, windows, furniture and roofs now participate in damage. Holes persist when buildings unload and reload and are included in world saves. Damage edits ranges inside the existing material batches rather than creating a mesh per brick. Roofs lose support when most nearby wall sections fail.

House, temple and fortress roofs have walkable height queries. Ascending flight stops at the underside; descending flight lands on the roof. Orbital/landing impacts now reach individual cells in instanced walls and the new settlement damage system. Firearm accuracy, coordination and melee percentages are saved and restored with the world.

## Further visual work

The pets have smoother body surfaces, shorter neck/leg proportions where appropriate, fuller cat flanks, curved layered irises, refined ear cups, and revised mouth seams. A new shared short-fur texture replaces the broad legacy coat pattern, with a directional coat shader and bounded close-range hair geometry. The six breed rigs, paws and tails retain their existing animation controls. Actual renderer previews are in `H6-tests/pet-*-preview.png`.

Settlement materials now add filtered wood grain, masonry joints and plaster variation within the same material batches. These remain procedural environments and animals, not scanned or photorealistic assets.

## Verification and performance

**25/25 browser integration checks passed; no page or shader errors.** See `H6-tests/integration-result.json`. The new tests cover turn recovery at 72/120 Hz simulation steps, braking, wall/framing breaches, masonry resistance, multiple furniture impacts, held-item player isolation, persistent building holes, roof collision and setting saves.

In the controlled 1,250 kg sedan test, a 14 m/s impact breaks 12 plaster cells and carries forward at 11.75 m/s after fracture work. At 5 m/s, masonry stops the vehicle. The steering fixture keeps wheel contact after settling, with peak tire slip around 6 degrees; these are repeatable simulation tests, not Quest hardware recordings.

The performance pass pools tire-solver vectors, batches bird feeders and exposed studs, culls remote unoccupied cars, and uses exact roof functions instead of dense floor grids. Isolated pet previews use 10 dog / 13 cat draws. Framebuffer scale remains 1.0; existing FFR, simulation LOD, shadow limits and optional menu Layers remain active.

Desktop structural captures: Home 291 calls, Car 296, Close Mira 223, Timberfall 217. These include shadows and use SwiftShader. The captures are diagnostics, not a controlled performance comparison or evidence of headset frame rate. Home <=150 / Car <=200 are still unverified and these desktop snapshots exceed them. The game includes named Quest capture/export controls for the required hardware measurement.

No physical Quest 3 is available here. Controller comfort/alignment, compositor support, and sustained headset frame time need an on-device playtest. KTX2/Basis conversion of the inherited texture set and sky/video compositor migration are not included; the supplied recommendation was used to prioritize measurement, draw reduction and simulation work before quality reductions.

`REQUEST-AUDIT-20.1.0.md` maps every feature request in this thread to the build.
