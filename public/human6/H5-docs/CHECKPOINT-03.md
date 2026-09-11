# Human5 checkpoint 03

Includes the feature modules, generated optional face map, and a source-checked integration script. New work: four threaded rug patterns with deformable grids, persistent cuts and tension tears; shallow carpet tiles and nearby instanced pile; five different furnished house plans; Mira reference sculpt and expression presets; microphone permission lease, capture diagnostics and recognition fallback startup.

Run `python integration/apply-upgrade.py /path/to/human5 /path/to/separate-output`. This creates a separate integration copy and a unified host patch. It refuses an existing output folder and source mismatches. Do not overwrite your working project with this intermediate checkpoint.

The first isolated furniture/lamp browser render compiled cleanly: 63 draw calls, 7,922 triangles for the preview setup. The full application loads; comprehensive integration, lifecycle and performance tests are still in progress. No Quest hardware frame-rate claim has been made.

Voice input now retains the permission-granted microphone through XR entry. The first permission dialog can require a second tap on Enter VR, because XR requires a current user activation. The speech server remains optional; the local recognizer must download its model on first use. Permission, captured audio, transcription, chat and TTS are distinct states. Provider credentials remain server-side.

The generated face texture is an optional 1,254 × 1,254 artist reference map, not a 4K scan. The default still uses the supplied texture pending visual QA.
