# Human5 17.5 — Checkpoint 09

Read `docs/CHECKPOINT-09-EQUIPMENT.md` for controls, implemented behavior, validation and limits. This intermediate checkpoint adds the Weapons / Tools and Vehicles pages, weapon details, launchers, spells, sniper zoom, portal views/transit and four drivable vehicle designs to the 17.4 stabilization build. The complete project ZIP is already integrated and includes the original assets.

From Checkpoint 08:

```sh
python integration/apply-equipment.py /path/to/17.4/human5 /path/to/new/human5
```

From the original complete uploaded game:

```sh
python integration/apply-all-upgrades.py /path/to/original/human5 /path/to/new/human5
```

Both commands require a fresh destination. Checksums protect customized source from silent replacement. The patch, manifest and individual modules are included for manual integration.

Serve the parent directory with the game at `/human5/index.html`. WebXR and microphone capture need a secure origin. Keep the Three.js 0.170 import map. VR: Y → GEAR → WEAPONS / TOOLS or VEHICLES. WORLD → PERFORMANCE exports workload reports. X removes the selected NPC unless driving, when it is the brake.

This checkpoint does not certify Quest FPS or commercial-game model quality. The final additional performance gate, character fidelity work, remaining house features and separate laptop photo/video (up to 60 seconds) NPC creator are tracked in `docs/PROJECT-REMAINING.md`.
