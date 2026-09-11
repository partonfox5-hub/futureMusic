# Human5 17.2 — NPCs, armor, pets and controls

This checkpoint extends the saved 17.1 world project. It is an integrated implementation checkpoint, not a declaration that the complete feature list or the requested commercial-game visual quality has been reached. No Quest hardware test was possible here.

## Integration

Use the full project ZIP directly, retaining its relative folders and pinned Three.js 0.170.0 import map. Serve over HTTPS for Quest microphone and immersive VR. For an existing 17.1 integration, run:

```sh
python integration/apply-gameplay.py /path/to/human5-17.1 /path/to/new-human5-17.2
```

The script requires a new output directory, verifies source anchors, copies all 28 modules, normalizes local cache versions, and emits `H5-GAMEPLAY.patch` plus a SHA-256 manifest. The older core and world integration scripts remain available for original-source integration; apply them in order before this script. Do not mix version-query suffixes: that can create separate copies of the scene registry.

## Implemented

- Shared combat protection at prop impact, direct injury impact, severing, actor strike/death/knockdown, and secondary knockback entry points. Selected or all NPC invincibility includes dogs and cats. It does not restore injuries that existed before enabling it; use Heal for that.
- Armor regions with finite durability and a shield reservoir. Covered body damage begins on the strike that exhausts durability; remaining energy passes through. Armor visually follows the host skeleton and disappears by damaged region. Player armor is invisible, reduces impulses and lowers movement speed according to added mass. Player health and a restoration control are provided.
- Six fictional enemy archetypes: bandit, insurgent, SWAT, redcoat, zombie and gangster; pedestrian role also available. Same V2 bodies, clothing, grabs, balance and injury system as Mira. Still, wander, passive and hunt-player modes. Six active full NPCs on the Quest path, ten on desktop; deliberate spawn requests receive a clear message at the limit.
- Follower conversion and follow, stay, guard, patrol, destination, fetch weapon, attack target and dismiss orders. Point commands work through the public desktop call and the XR trigger path. Selecting a different NPC is independent of hostility.
- A finite road/trail graph and bounded local A* avoid the old repeatedly sorted 8,000-node search. Dynamic path planning remains approximate; it is not a complete navigation mesh or an automatic doorway/elevator planner.
- Dog/cat mouth contact attachments for ordinary weapons, movable furniture, clothing and actor grabs. Weapon grip preserves the selected contact point. Weapon carrying disables discharge, automatic fire and melee sweeps. Heavy furniture follows a slower constrained drag target. Jaw-grabbing can hand weapons/furniture back to the player.
- Bite energy reduced from 12 cutting energy to 1.2 bite energy per bite. Bites cannot occur while mouth-carrying. Existing occasional furniture-chewing behavior remains.
- One fine, filtered fur shell close to the viewer, no large spiky fringe cards; short-coat directional detail, petting ripple uniforms, wetness input, and subtle coupled spine/chest motion. This refines the existing procedural model; it does not replace the pet meshes with scanned animals.
- Sixteen original garment entries: role uniforms, suit pieces, trousers, lounge/sport items, satin and floral lace. They use the existing tearable cloth solver. Lace holes and stripes are shader details. They are inspired by common garment construction, not copied branded product assets. Cloth now uses world gravity and local terrain height rather than an artificial sea-level floor.
- VR menu uses four large categories and contextual tabs instead of eleven cramped tabs. PLAY exposes NPC commands/protection and pet fetch/drop controls; selected names are visible and can be cycled. Desktop controls expose the same systems.
- NPC foot baseline follows terrain before pose evaluation, avoiding a doubled terrain height afterward.

## Practical limits and remaining groups

Combat is game physics, not a forensic simulation. NPC ranged attacks use a bounded line-of-sight/shot effect and role cooldown, rather than the entire player magazine/ballistic simulation. Armor geometry and uniforms are procedural approximations. The redcoat temporarily uses the existing rifle model until the subsequent weapons group adds a musket. Shields provide a front-facing gameplay reservoir rather than exact articulated shield contact for every strike. Clothing/armor spawning still creates noticeable one-time CPU work and shader warm-up; measure this on the headset.

Queued: automatic pedestrians/traffic and outings; fishing/fish; birds/feeders; vegetation and grass/hair cutting; weapon models, launcher/spells/scope/portal fixes; mirrors, showers and NPC wetness; starting-house basement, arcade adapter/demo and latched dog crate. The final performance pass and complete final export follow those groups. The separate laptop photo-to-NPC application starts only after that game export is saved.

Exports are not promises of identical photo reconstruction, authored CSGO/GTA assets, or a forced 60 FPS. See the core research and Quest test protocol for the practical limits.
