# Current project status — 17.8

All saved game module groups through checkpoint 11 are integrated into this export, followed by two application performance passes. The full game ZIP and checked individual module bundle are the game deliverables. Read FINAL-RELEASE.md for current behavior; old checkpoint documents describe their state at the date they were written.

## Material limits that remain

- Photographic identity, professional skin/groom quality and GTA/CSGO-level authored vehicle/weapon assets have not been achieved by the procedural refinements. The current system keeps the supplied rig and expressive morphs; a source-image fit is not a recovered scan.
- Quest device performance and thermal soak, real microphone permission/audio capture, stereo portals/mirrors, controller interaction and haptics still need headset validation. Desktop SwiftShader is not a proxy for Quest FPS. The measured complete render loop still contains significant stalls, including first view/streaming work.
- The physics is a bounded game approximation, not anatomically or mechanically calibrated FEM. Armor, deformation, tissue and soft fabric use explicit budgets.
- A complete persistent save of every NPC, outfit, haircut and furniture state is not implemented. Traffic/outing behavior is bounded; visible fully animated seated ambient drivers are not included.
- The supplied application has no complete dialogue server. Microphone capture, local recognition and TTS are separate from the conversation backend.

## Subsequent separate deliverable

Build the local photo/video-to-NPC application only after saving this final game checkpoint. Requirements: one/multiple photos; video duration at most 60 seconds; bounded sharp/diverse frame extraction with selection review; detected laptop GPU/VRAM, explicit model installation/license requirements; common photo/video processing path; compatible Human5 NPC profile export, editable fit and provenance. Exact body identity or hidden anatomy cannot be established from photographs. No cloud upload is implied.
