# Human6 WebXR 20.0.1

Continuation of the 20.0.0 expansion build. Serve this folder over HTTPS for Quest;
open index.html. The full expansion controls remain in HUMAN6-EXPANSIONS.md.

## Changes in this checkpoint

- Rigid meshes share draws while retaining individual colors, roughness,
  metalness and emissive lighting. Batches track moved parts, detached debris,
  changed material values, and replacement geometry.
- Wheels batch beneath their rolling pivots. Steering wheel and fixed shifter
  details also batch. Car collision dents can still target original panels.
- Upgraded pet food packaging joins the batches after its meshes are replaced.
  Pull tabs remain independent; tearing, opening and deflation remain functional.
- Cats have shorter lower legs with corresponding mesh and skeleton changes,
  a fuller British Shorthair torso, revised pupils and thicker tails. Tail
  constraints respect breed scale. Fur is sampled by surface area, with short
  silhouette hairs replacing three speckled shell layers.
- Pet foot IK reuses its vectors and quaternions during updates. All six breeds
  retain four valid floor contacts. This does not remove allocations from every
  inherited simulation module.

## Evidence and remaining work

18/18 integration and regression cases pass; no browser page or shader errors.
See H6-tests/VALIDATION.md and its JSON results. The two pet previews are actual
procedural model renders, not target art or proof of photorealism. These animals
still need further art work to reach the requested level of realism.

Latest single-camera desktop draw counts, including shadows: Home 307, Car 315,
Close Mira 223, Timberfall 326. The previous checkpoint recorded 348, 374, 266 and
389 respectively. Actor poses and scene state vary between runs, so these are
structural diagnostics rather than a controlled performance benchmark.

The Home <=150 / Car <=200 budgets have not been met in these captures. No actual
Quest 3 frame rate is claimed. Use the included Home/Car/Close Mira recording
buttons on the headset before making framebuffer-quality decisions. Scale stays
at 1.0. Compositor Layers on hardware and extended streaming still need testing.
