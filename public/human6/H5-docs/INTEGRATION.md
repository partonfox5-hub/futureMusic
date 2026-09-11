# Human5 17.0 integration guide

This release upgrades the supplied Human5 project, using its Three.js **0.170.0** import map, original rig, physics ownership, input routing and assets. It is an integration build, not a claim of photographic reconstruction or certified Quest performance.

## Ready-to-run project

The complete project archive contains a `human5/` folder with every new module already wired into `engine.js`. Serve its parent directory and visit `/human5/index.html`. Preserve this folder name: the supplied bootstrap uses `/human5/` paths. For desktop verification, run `python -m http.server 8000` in the parent directory and open `http://localhost:8000/human5/`. Quest needs an HTTPS origin; plain HTTP to a laptop LAN address is not a microphone/WebXR secure context.

The existing voice server is not included in the supplied project. The retained local speech worker can recognize speech after its first model download. An existing compatible server can still answer `/api/mira/health` and `/api/mira/stt`. Keep provider secrets in that server. Static hosting alone does not create a chat server.

## Apply to the original, or give this to an integrating model

```bash
python integration/apply-upgrade.py /path/to/original/human5 /path/to/new/human5
```

Run from the module bundle; its `modules/`, `assets/`, and `integration/` directories must remain siblings. The script validates source anchors before copying. It refuses an existing output directory and never edits the supplied original. `H5-UPGRADE.patch` contains the host edits; `H5-UPGRADE-MANIFEST.json` records source/result hashes. A later upstream version may require a manual merge: a rejected source anchor is intentional.

All project-local JavaScript query versions are normalized to `17.0.0`. In the upload, different URLs could instantiate different copies of mutable exports such as `SCENES`. Do not combine old and new URL variants in an integration. Three itself stays pinned at r170; no new runtime package is required.

## Ownership and order

1. Construct the original world, props, actors, wardrobe, water, fire, terrain, pets and vehicles.
2. Replace the original light rig using `createQuestLighting`; do not stack both rigs.
3. Call `installHuman5Upgrade` once. It installs the new map and adapters; actor attachment happens when asynchronous V2 loading completes.
4. Call `installPerformance` once.
5. Begin frame measurement, call upgrade/performance `beforeFrame`, and retain the original actor, water and prop ticks. End measurement after every render pass, including mirrors and portals.
6. The original prop tick calls the replacement combustion tick. **Do not also call `upgrade.fire.tick` yourself.**

The original furniture solver owns rigid motion. Fire owns thermal state, textile grids own rug deformation, TissueRig owns tissue particles, and the original body rig owns articulation. Vehicle `step` is replaced; the original collision/damage/door/seat lifecycle remains in use. Never run both vehicle integrators.

## Module map

| File | Responsibility / integration API |
|---|---|
| `human5-common.js` | Shared gravity, bounds, sweep, lifecycle helpers |
| `human5-lighting.js` | Fixtures, glass bulbs, fixed light pool, daylight, optional AR light estimates |
| `human5-fire.js` | Bounded thermal system, swept torch contact, wetness and fuel |
| `human5-fire-host.js` | Original hearth/weapon/prop fire adapter |
| `human5-furniture.js` | Layered cushions, exposed foam, stuffing, pet bag tear tabs |
| `human5-textiles.js` | Knitted rug grids and tear topology, carpet/pile rendering |
| `human5-neighborhood.js` | Five plans, doors, furnishings, road, parking, bed support |
| `human5-dynamics.js` | Environment-aware tissue, spine response and gait variation |
| `human5-tissue-surface.js` | Small affine strain deformation in the skin shader |
| `human5-skinning.js` | Palette-based CPU skin queries matching the original deformation |
| `human5-skin.js` | Normal seams, coherent body tone, texture manifest loader |
| `human5-identity.js` | Reference preset, expression channels, morph-preserving sculpt |
| `human5-groom.js` | Small layered reference hairstyle with guided locks |
| `human5-npc-profile.js` | Validated `human5.npc/1` import/export |
| `human5-vehicles.js` | Six-speed automatic, wheel suspension, handling damage, details and dashboard |
| `human5-voice.js` | Retained microphone stream, recorder/VAD, speech backend fallback |
| `human5-batching.js` | Opaque rigid mesh consolidation with original hit identities |
| `human5-performance.js` | Telemetry, adaptive detail, furniture sleep and view budgets |
| `human5-upgrade.js` | Single public installation point and controls |

## Controls and preserved behavior

The new cul-de-sac is the default; the original scenes remain in Scene selection. Reset House now rebuilds the selected map. Desktop controls and VR grabbing remain host controls. Use the existing P/R/N/D selector: Drive shifts through six forward gears automatically. Braking is required before changing direction while moving. Wheel punctures, dents, detachable panels, horn, door handles and mirrors remain active. Wheel/front-end damage now changes alignment, steering response, suspension and grip; engine-area damage reduces power. Repair restores those mechanical states and the original panel geometry.

The “Mira reference & material upgrades” panel provides expressions, physics settings, map rebuilding and NPC profile import/export. The VR face menu adds wide smile/frown and a Voice control. A reference profile changes the existing actor; it does not silently spawn another copy or remove its expressions.

Rugs can be grabbed with the VR grip controls, stretched using two hands, cut and burned. A cut removes real triangles; the weave's small holes use alpha testing. Foam appears through cushion cuts, and loose stuffing is independently flammable. Pet bag tabs can be pulled or clicked. Opening a bag preserves the original food quantity and feeding records.

The first microphone permission dialog may consume the user activation needed to enter XR. If the banner says “Microphone ready. Tap ENTER VR again,” tap again. Subsequent entry uses the retained granted stream. In the headset, Voice status distinguishes starting, listening, hearing, transcribing, replying, muted and error states. TTS playback alone does not prove microphone capture.

## Assets and identities

The active supplied skin atlases are 2048 pixels. The optional generated head texture in `assets/identity/` is **1254 pixels** and is a draft; it is not the default and is not described as a 4K scan. The reference likeness is an artist-fit approximation using the existing mesh and expressions. The generated draft can be inspected using `human2.upgrade.useGeneratedFace()` when the debug URL is enabled.

The portable profile schema deliberately contains parameters, not executable code, network URLs, arbitrary bone edits or identity claims. `shape` and `sculpt` keys are bounded and validated before application. This is the compatibility contract for the separate photo-fitting app.

## Testing and rollback

```bash
npm install
npm test
npx playwright install chromium
H5_PROJECT=/absolute/path/human5 node tests/browser-regression.cjs
```

On Windows PowerShell set `$env:H5_PROJECT='C:\path\human5'` before the last command. The browser script uses the installed Three package to avoid CDN variation during tests. It checks gameplay, shader/JavaScript errors, lifecycle and CPU simulation cost, and writes screenshots/JSON.

The integrated project includes the host patch and manifest. Roll back by serving your original folder; the integration script has not modified it. Do not replace a newer upstream project wholesale with this build without reviewing the patch.


## Final release 17.8 additions

`human5-startup-warmup.js` prepares vehicle views during loading. `human5-home.js` and `human5-home-mechanics.js` own the basement, arcade, crate, showers, mirrors and local condensation masks. `human5-anatomy-detail.js` performs conforming local mesh refinement at construction. `human5-groom.js`, skin, identity, haircuts and NPC profile modules contain the checkpoint 11 character changes. `human5-performance.js` and the patched engine/contact/fire hosts contain both final performance passes. Consult FINAL-RELEASE.md and FINAL-PERFORMANCE.md before using historical next-step statements in older checkpoint notes.

The photo/video creator should export `human5.npc/1`, validated by `human5-npc-profile.js`; the current game accepts bounded shape/sculpt/physics fields, not arbitrary reconstructed meshes or a projected photograph. Import through the desktop profile file input with a V2 actor selected. Profile fitting retains the game's existing rig, tissue physics, clothing and expressions.
