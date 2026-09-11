# Human5 17.2 — Checkpoint 06

Read `docs/CHECKPOINT-06-GAMEPLAY.md` for what is implemented, integration order, controls and practical limits. Functional test evidence is in `test-results/` and `docs/GAMEPLAY-TEST-RESULTS.md`.

The complete project ZIP is runnable with the original relative asset layout. The module checkpoint contains all 28 modules, integration scripts, source patches, documentation, optional identity asset and tests. It expects the original game assets or the previous complete export.

For a fresh original-project integration:

```sh
python integration/apply-all-upgrades.py /path/to/original/human5 /path/to/new/human5
```

For an already integrated 17.1 project use `apply-gameplay.py` instead. Do not apply source patches twice. Local module queries are normalized to 17.2.0.

This is an intermediate checkpoint. The later ecology/traffic/fishing, weapons/portals/interiors, final performance pass and laptop conversion app remain separate upcoming groups. No Quest headset FPS or exact photo identity claim is made.
