# CONTEXT DUMP — photoreal human avatar on Quest 3 via WebXR

Paste this file to another model. It describes the **existing stack**, **what is live**, **what is fake**, and **what we are trying to ship**. Do not invent a new engine or move this onto Unreal at runtime.

---

## One-sentence goal

Get as close as possible to a **photoreal adult female 3D human** running **in the browser on Meta Quest 3 through WebXR** (passthrough AR / VR), at a stable headset frame rate, **unlisted and home-network gated**.

Live URL (not linked from Projects / nav / SEO):

**https://futuremusic.online/human**

---

## What “success” looks like

On Quest 3 Browser (and desktop as a debug view):

1. Mira (the character) actually loads and is visible (this already works).
2. **Limbs hinge** on a real skeleton (thigh / knee / spine / head), not a frozen bind-pose statue.
3. **Walk and idle** are skeletal clips or a procedural walk on that skeleton, not a root-slide + vertical bob.
4. **Flesh jiggle** on `L_Breast` / `R_Breast` via Verlet spring bones after animation, not a chest vertex-shader band.
5. **Skin** reads as flesh: UV-correct albedo + the 4K Unreal normals + cheap SSS (three.js `SubsurfaceScatteringShader` + thickness), not a flat taupe `MeshStandardMaterial`.
6. **Hair** looks and moves like hair: CC3 **cards** with **cutout/hash** (not blended overdraw), skinned to `Head`, 4–12 spring chains + head/chest colliders, cheap Kajiya-Kay / anisotropic spec. **Not** millions of GPU strands (Quest cannot afford that in WebGL2 WebXR).
7. Face still does morphs (smile / frown / blink / jaw) — these already work.
8. Stay **custom three.js**. No Unreal runtime, no MetaHuman, no organs/fluids.

Target: **72 fps** immersive-ar on Quest 3, stereo, passthrough on. 90 fps is a bonus, not the bar.

---

## Three related projects — do not mix them

| Project | Path | Role |
|---|---|---|
| **human-webxr** (source of truth for the live avatar) | `C:\Users\parto\OneDrive\Desktop\human-webxr` | Custom three.js WebXR engine + GLB packer |
| **futuremusic.online** (site that serves it) | `C:\Users\parto\OneDrive\Desktop\futuremusic.online` | Express + EJS + `public/`. Copy of `/human` lives in `public/human/` |
| **human-unreal** (offline DCC / anatomy, not the runtime) | `C:\Users\parto\OneDrive\Desktop\human-unreal` | Unreal 5.6 project that holds the Fab Mira FBX + 4K textures. **Not shipped to Quest.** |

There is also a separate Unity Quest APK, **CritterDen** (`C:\Users\parto\OneDrive\Desktop\critterden-unity`), which is **pets / furniture AR**, not this human. Ignore it for Mira.

---

## Live site rules (owner)

- Repo: `https://github.com/partonfox5-hub/futureMusic.git`
- Deploy: `git push origin master` → Cloud Run rebuilds production. Agent is allowed to commit + push. No force-push.
- **`/human` is production-first**, unlisted, **not** a `/test-*` page, **not** on the Projects grid or main nav.
- Home-gated by `lib/home-gate.js`: owner WAN `47.224.115.198`/24, RFC1918, localhost, Quest/Oculus UA. `/human` is in `RESTRICTED_PREFIXES`.
- Route: `server.js` `app.get(["/human","/human/"])` serves `public/human/index.html` with `X-Robots-Tag: noindex` and WebXR `Permissions-Policy`.
- Cache-bust query on `engine.js` and `mira.glb` (`?v=N`) after every ship.
- Horde (`/horde`) is a different WebXR game; do not reuse its spawn-panel code as the human engine.

---

## Runtime stack (what actually draws pixels)

```
Quest 3 Browser / desktop Chrome
  └── public/human/index.html
        importmap: three@0.170.0 from jsDelivr
        engine.js  (custom loop — NOT Unreal, NOT A-Frame, NOT Babylon)
        assets/mira.glb
```

- **Renderer:** `THREE.WebGLRenderer`, WebGL2, `renderer.xr.enabled = true`.
- **XR:** `immersive-ar` first (`local-floor`), fallback `immersive-vr`. Passthrough = `scene.background = null`.
- **Desktop:** PointerLockControls + WASD. `controls.object` must not cover the UI (canvas `z-index: 0`, UI `z-index: 20`).
- **No bundler.** Plain ES modules + CDN importmap. Keep it that way unless there is a hard reason (KTX2 transcoder, etc.).
- **Do not** switch the Quest path to `WebGPURenderer`. Strand-hair / Frostbite software rasterizers need WebGPU + desktop GPUs. Quest Browser WebXR is still WebGL2.

---

## Character asset (Mira)

**Source FBX:** `human-unreal\Content\Human\Raw\MiraFemale.fbx` (~96 MB)

Fab “Free Rigged Female 3D Character” (CC3 / Character Creator style), **not** a MetaHuman. MetaHuman Creator OOM’d this 16 GB machine; do not re-enable it.

| Piece | Facts |
|---|---|
| Body | ~14,164 verts, materials `Std_Skin_Head/Body/Arm/Leg`, `Std_Nails`, `Std_Eyelash` |
| Skeleton | **101 bones**, CC3 names (no `CC_Base_` prefix in this export): `BoneRoot → Hip → Pelvis/Waist → …` |
| Breast bones | `L_Breast` (child of `L_RibsTwist`), `R_Breast` (child of `R_RibsTwist`) |
| Head chain | `Spine02 → NeckTwist01 → NeckTwist02 → Head → FacialBone` |
| Morphs | 148 in FBX; we keep 14: smiles, frowns, blinks, brows, cheeks, `Jaw_Open`, `V_Open` |
| Hair | Separate mesh `Default_Material_Transparency`, CC3 **hair cards**. Node `hair` is a **root sibling**, not a bone, not parented to `Head`. **No hair bones** in the skeleton. |
| Scalp | Node `Scalp_Male` / material `Scalp1_Transparency` exists in FBX; **not** in the live GLB dump |
| Underwear | `Waista_` — **omit** from the web GLB (also hidden in Unreal) |
| Skin clusters | Body has **78** clusters. Eyes/teeth have a few. Hair likely none or Head-only (dump to confirm). |

**Coordinate system:** FBX is Z-up centimeters. Web dump converts positions with `(x, z, -y) * 0.01` → glTF Y-up meters. Bind-pose mesh is about **1.63 m** tall. Live engine then recenters and scales to 1.68 m.

**Textures** (from Unreal bake, `human-unreal\Content\Human\Tex\`):

- `mira_head.png` `mira_body.png` `mira_arm.png` `mira_leg.png` — albedo, UV-correct but still a bit flat
- 4K Unreal normals `Std_Skin_*_Normal.png` (best maps we have; not yet in the web GLB)
- `mira_hair.png` — hair card sheet, currently weak / grayish
- `mira_scalp.png` — unused on web

---

## How the live GLB is built

Source: `human-webxr/tools/`

```
python tools/dump_mira.py           # meshes + UVs + tris → mira_dump.npz
python tools/dump_morphs.py         # 14 morph deltas → mira_morphs.npz
python tools/dump_bones.py          # 101-bone tree via root_node.children → mira_bones.json
python tools/dump_weights.py        # body/eyes/teeth JOINTS/WEIGHTS → mira_skin.npz
python tools/dump_hair_weights.py   # hair → Head/Jaw/NeckTwist*  (20k verts, own process)
python tools/pack_glb.py            # numpy + PNGs → assets/mira.glb AND public/human/assets/mira.glb
```

**ufbx python is fragile.** Native crash if you:

- Read `node.local_transform.scale`
- Walk `node.parent` after other ops (segfault; try/except will **not** catch it)
- Mix heavy face/UV walks with skin cluster iteration in the same process

Workarounds that **do** work:

- Copy material **names** to a Python list first
- Walk hierarchy via `scene.root_node.children` (not `node.parent`)
- Use `node.node_to_parent` 4×4, never `local_transform`
- One concern per process (mesh / morph / skin)
- `os._exit(0)` after writing — scene destructor also crashes (exit code 1 after success)

`export_mira_glb.py` is an older all-in-one attempt; skin was disabled (`USE_SKIN = False`). Prefer the dump → pack split.

Triangle winding was reversed in `pack_glb.py` (`idx[:, ::-1]`) because the Y-up remap flipped winding; don’t “fix” that without checking backfaces on Quest.

---

## What the live `/human` engine does today (and why she looks stiff)

File: `human-webxr/engine.js` (copied to `public/human/engine.js`)

As of 2026-09-04 the packed GLB **does** include a 101-bone `skins` chunk, `JOINTS_0`/`WEIGHTS_0` on body/hair/eyes/teeth, and hair `alphaMode: MASK`. Engine does a **procedural walk** on named bones (not Mixamo clips yet), head look-at on `Head`, Verlet-ish springs on `L_Breast`/`R_Breast`. Still missing: SSS + Unreal normals, real walk clips, hair helper chains, rebuilt hair texture.

Older live behavior before that pack (if you see a statue, you are on a cached `mira.glb?v=2`):

| Feature | Live behavior | Needed |
|---|---|---|
| Limbs | Frozen T-pose-ish bind | glTF `SkinnedMesh` + 101-bone skeleton |
| Walk | Root XZ slide + Y bob | Skeletal idle/walk (procedural or Mesh2Motion clips) |
| Head look | Yaws the **whole avatar group** when idle | Yaw/pitch `Head` + a little `NeckTwist01`, clamped |
| Jiggle | Fake spring rotating the **entire hair mesh**; chest not really bone-driven | Verlet on `L_Breast` / `R_Breast` after mixer |
| Hair | `transparent: true`, `depthWrite: false`, `alphaTest: 0.12`, `alphaMode: BLEND` | `MASK` / `alphaHash`, `depthWrite: true`, `alphaTest ~0.5`, skin to `Head` |
| Skin shading | `MeshStandardMaterial` DoubleSide, no SSS, no normals | SSS shader + 4K normals + thickness |
| Morphs | **Works** (14 blend shapes on body) | Keep |

**Already-burned Quest pitfall:** `MeshPhysicalMaterial` + sheen + `onBeforeCompile` vertex jiggle produced a **black / invisible** mesh. Quest path must stay on `MeshStandardMaterial` or a small explicit `ShaderMaterial`. Gate fancier materials to desktop.

Black-screen incident: canvas covered UI (fixed with z-index); mesh was also backface-culled / shader-invisible. Gold debug cube + `LOAD FAILED` banner + taupe studio clear color are the debug rails. Do not remove them until skinned Mira is proven on-device.

---

## Hair — research decision (do not reopen casually)

**Keep CC3 hair cards. Do not convert to per-strand geometry.**

Why: Frostbite / Indiana Jones / NVIDIA LSS strand hair budgets ~2 ms on consoles or &lt;10 ms on an RTX 3060 WebGPU demo. Quest WebXR has ~13.9 ms **total** at 72 Hz, stereo, and passthrough eats 20–40% more GPU. Overdraw from blended cards is the actual killer (Meta Flowerbed used **masked** alpha and ≤4 overlapping layers).

Hair plan:

1. One draw call, same card mesh.
2. Skin to `Head` (required). If dump finds no hair clusters, 100% Head weights or parent the node to `Head`.
3. If dangling locks need motion: add **4–12 helper bone chains** (children of `Head`) in `pack_glb.py` and weight nearby cards. Same Verlet solver as breasts.
4. `alphaMode: MASK` or three.js `alphaHash`. **Never** ship `transparent + depthWrite: false` on hair.
5. Cheap two-lobe Kajiya-Kay / anisotropy along card tangent. No Marschner. No MeshPhysical sheen on Quest.
6. Rebuild `mira_hair.png` as 1K–2K PNG, straight alpha, dense strand coverage. Restore opaque scalp cap so the skull never shows through cutout.
7. Eyelashes: own cutout material, do not reuse the hair albedo.
8. Out: per-strand Verlet, WebGPU software rasterizers, NVIDIA LSS, Ammo cloth, dual card+strand LODs.

---

## Animation / physics plan (engine loop order)

```
mixer.update(dt)            // or procedural walk on named bones
headLookAt(camera)          // Head + NeckTwist01 only
springBones.update(dt)      // L_Breast, R_Breast, hair chains + sphere/capsule colliders
renderer.render(...)
```

- Walk clips stay **in-place**; move the root `avatar` group in XZ (existing wander).
- Preferred clip source: [Mesh2Motion](https://app.mesh2motion.org) (Mixamo often **rejects nude** meshes). Until clips exist, a **procedural walk** on `L_Thigh` / `R_Thigh` / calves / arms is acceptable and far better than bob.
- Spring libs to steal from, don’t rewrite Verlet if they fit: `wiggle` (three.tools), `@pixiv/three-vrm-springbone`, `hairphysic`.
- Skip Ammo.js for v1.

---

## File map (the only files that matter for `/human`)

```
human-webxr/
  index.html              # UI + three 0.170 importmap
  engine.js               # renderer, XR, morphs, wander, materials
  assets/mira.glb         # packed character
  CONTEXT.md              # this file
  tools/
    dump_mira.py          # mesh dump
    dump_morphs.py        # morph dump
    dump_skin.py          # skeleton + weights
    pack_glb.py           # glTF packer
    mira_dump.npz / .json
    mira_morphs.npz
    mira_skin.npz / .json
    export_mira_glb.py    # legacy; skin disabled
  probe_skin.py           # ufbx crash probes (dev only)

futuremusic.online/
  public/human/           # SHIPPED COPY of index.html, engine.js, assets/mira.glb
  lib/home-gate.js        # IP / Quest UA gate; /human is restricted
  server.js               # /human route + headers
  AGENTS.md               # site deploy rules
```

After editing `human-webxr`, **copy into `public/human/`** then commit + push from the site repo. Cloud Run does not see `human-webxr` itself.

---

## Constraints other models must not violate

- Nude **exterior** anatomy project. No internal organs, no fluids.
- Adult character. Do not add minors.
- Do not list `/human` on Projects, homepage, or nav.
- Do not ship Unreal / MetaHuman to the headset.
- Do not depend on Mixamo as a hard requirement (nude filter).
- Do not put `MeshPhysicalMaterial` sheen / custom `onBeforeCompile` on the Quest path without an on-device proof.
- Do not force-push `origin master`.
- Owner machine: Windows, PowerShell, ~16 GB RAM, Unreal editor often dies. Prefer isolated Python dumps over opening the editor.

---

## Current workstream (as of 2026-09-04)

1. **Joints first** — `dump_skin.py` via `root_node.children` + `node_to_parent`; pack `skins` + `JOINTS_0`/`WEIGHTS_0` for body (and hair if clusters exist).
2. Procedural or clipped walk on that skeleton; head look-at on `Head`.
3. Spring bones on breasts + hair helper chains.
4. Hair MASK/hash + texture rebuild + scalp cap.
5. SSS + Unreal normals on skin.
6. Push to `https://futuremusic.online/human` with cache-bust. Confirm on Quest 3.

If ufbx skin dump still dies: fallback is Mesh2Motion auto-rig of the existing static GLB, then pack that. Do not stall the whole project on ufbx.
