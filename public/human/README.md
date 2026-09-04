# Human — custom WebXR engine

Standalone engine (Three.js renderer, our sim loop) for a realistic adult female avatar: skin shading, hair cards, chest/hair springs, facial morphs, wander.

Source of truth: this folder.  
Site copy: `futuremusic.online/public/human/`  
Live (home-network gated, unlisted): https://futuremusic.online/human

## Rebuild the GLB

```
python tools/dump_mira.py
python tools/dump_morphs.py
python tools/pack_glb.py
```

Uses the Mira FBX + baked skin maps from `human-unreal`.
