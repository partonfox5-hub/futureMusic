# Human — custom WebXR engine

Standalone engine (Three.js renderer, our sim loop) for a realistic adult female avatar: skin shading, hair cards, chest/hair springs, facial morphs, wander.

Source of truth: this folder.  
Site copy: `futuremusic.online/public/human/`  
Live (home-network gated, unlisted): https://futuremusic.online/human

## Rebuild the GLB

```
python tools/dump_mira.py
python tools/dump_morphs.py
python tools/dump_bones.py
python tools/dump_weights.py
python tools/dump_hair_weights.py
python tools/pack_glb.py
```

Each dump is its own process — ufbx python crashes if skeleton, morphs, and weights share a run.

Project brief for other models: `CONTEXT.md`.

Uses the Mira FBX + baked skin maps from `human-unreal`.
