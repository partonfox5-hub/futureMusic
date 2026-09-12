# Human5 19.3.0 — complete checkpoint 18

This folder is the complete integrated game, including checkpoints 16 and 17. Read `H5-docs/FINAL-RELEASE.md` for this release, controls and limitations, and `H5-docs/FINAL-PERFORMANCE.md` for measured results. Earlier checkpoint notes and patch files are historical: do not reapply them to this build.

Serve the directory containing `human5/` and open `/human5/index.html`. For desktop development, run `python -m http.server 8000` from that parent directory, then visit `http://localhost:8000/human5/index.html`. Use your existing HTTPS host for Quest WebXR and microphone access. Opening the HTML directly as a local file does not work. Three.js remains pinned to 0.170.0; no new game runtime package is required. All runtime cache tags use 19.3.0.

VR controls: left stick click starts a 10-second sprint (+50%), followed by a 10-second cooldown; right stick click places restraint anchors; A jumps. Default travel is another 15% faster. Open Y → GEAR → WEAPONS / TOOLS → TOOLS for Flashlight or Godlight. Vehicle lights have dashboard, menu and desktop controls. WORLD → PERFORMANCE exports measurements.

The game remains source rather than a Windows executable. Photo NPC Studio remains a separate application; its existing `.h5photo.json` import bridge is preserved. No Studio inference changes are part of checkpoint 18.

Tests and raw results are included in `H5-tests/` and `H5-test-results/checkpoint18/`. Software-renderer checks passed, but sustained Quest 60/72 FPS has not been verified.
