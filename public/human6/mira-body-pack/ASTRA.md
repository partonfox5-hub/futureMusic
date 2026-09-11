# Astra — Mira body, Quest passthrough

You are GPT-6 Astra. **First** read the unifying Human5 spec: `../mira-context.js` and `../context-pack/ASTRA.md` (or `sessionPrompt('body')`) so this body work still fits the house, furniture grab, piano sit IK, and lighting.

This pack is **only** the Mira NPC body: skinned CC3 mesh, wrapped-diffuse skin, XPBD tissue, contact, eyes, hair, and AR light estimation.

Do **not** open the house, weapons, piano, weather, cars, dogs, or voice. Do **not** rewrite `createMiraSystem`. Do **not** retopo Mira. Do **not** switch the runtime to Unreal / 3DGS / NeRF.

## Attach / open

- `human5/mira-body.js` (the public API)
- `human5/mira-body-pack/` (this folder)
- Files listed in `WIRING.md`
- `human5/assets/mira.glb` and `human5/assets/tex/`
- Live harness: open `harness.html` in Quest Browser

If Blender is needed for a new mesh (occlusion card, contact shadow catcher), say so. Prefer JS + shader patches first.

## What “passthrough” means here

Quest **immersive-ar**: the real room is the background. Mira is composited on top. Today:

- Renderer is created with `alpha: true`
- `enterPassthrough()` clears to transparent and starts `RoomLight` (`XRLightProbe`)
- A faint floor disc is the only scenery
- Skin uses a wrapped Lambert lobe in `mira-v2.js` (`installSkinShader`)
- Mira often looks **too dark, too plastic, or ungrounded** against the real room because authored studio lights still fight the XR estimate, and there is no contact shadow / occlusion against the passthrough camera.

## Do this session (in order)

1. **Lookdev in AR** — Quest Browser, `harness.html`, Enter passthrough. Note: skin vs real walls, foot contact, hair alpha fringing, specular from real windows.
2. **Match XR light** — edit `mira-v2-light.js` (and only the skin compile in `mira-v2.js` if needed) so Mira’s key/fill come from `getLightEstimate`. Dim or kill leftover studio lights in AR. Keep VR/desktop lighting unchanged when not presenting AR.
3. **Grounding** — a cheap contact shadow or blob under the feet that follows `actor.group` and reads on the passthrough floor. No screenspace AO rewrite.
4. **Compositing** — hair/lash `alphaTest` vs passthrough fringing; do not drop `alphaToCoverage` without a Quest check. Do not enable MeshPhysical transmission as “skin”.
5. If quota remains: a soft occlusion card or depth fade so Mira’s silhouette does not glow against bright real windows.

Zip or patch after each block. Prefer a **new** file `mira-v2-passthrough.js` imported from `mira-body.js` over editing every actor file.

## Keep

- 14,164 body verts and order
- 49 morph names
- 103 bones
- Existing UVs
- Eye JPEGs byte-identical
- XPBD 8-particle cages unless a lighting bug forces a one-line clamp

## Do not

- Rebuild Mira from a concept image
- Apply shape keys to Basis
- Touch `mira-v2-piano.js`, weather, guns, house
- Add a full deferred pipeline or extra eye-buffer passes
- Enable `MeshPhysicalMaterial.transmission` for skin

## Success

In Quest passthrough, at ~1.5 m: Mira’s skin brightness matches the real room, feet sit on the real floor with a readable contact shadow, hair cards do not halo, and grabbing still jiggles tissue. Desktop orbit still works with the studio lights.

## API you must keep working

```js
const body = await installMiraBody({scene, renderer, camera, rig, xrOn});
await enterPassthrough(body);
startMiraBodyLoop(body);
body.actor;              // selected MiraActorV2
body.system.tick(dt, t, keys);
body.roomLight.tick(frame);
```
