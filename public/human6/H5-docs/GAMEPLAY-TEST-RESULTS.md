# Gameplay verification — 17.2

Automated checks use local Three.js 0.170.0 and Chromium 152 with SwiftShader. The browser user agent selects the Quest code path; it does not supply Quest hardware, stereo rendering, tracked controllers or headset microphone capture.

- 103 host/module/dog JavaScript files passed syntax checks in the initial integrated build.
- Unit tests: armor absorption, breaking-hit penetration and unarmored regions; all shared invincibility/impulse/sever/death entry points; player protection, added mass and healing; heap ordering; a cul-de-sac-to-volcano route; bounded local obstacle avoidance and failure.
- Live integrated browser: SWAT spawn with two garments and articulated armor; protected impact and direct sever/strike leave health, root position and injury state unchanged; follower conversion and stay; player shield and mass; dog ordinary-weapon ownership/contact attachment, no discharge, no bite while carrying, release; pet bag uses the host furniture grip map; one fur shell with wetness/ripple shader compilation; cat protection; host NPC/prop/pet update loop.
- Final point-order wiring run additionally checks that a pending destination command creates host navigation.

Raw evidence and a diagnostic screenshot are under `test-results/`. They are functional/rendering checks, not commercial visual-fidelity validation. Full scene/world lifecycle, elevators, portals and later systems receive another whole-project pass once the remaining groups are integrated. Active crowd and outfit budgets are still subject to the final performance pass.
