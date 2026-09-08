Drop one speaker per folder.

  samples/mira-default/*.mp3
  samples/mira-calm/*.mp3
  samples/mira-hurt/*.mp3
  samples/mira-play/*.mp3
  samples/dog-default/*.mp3   (spoken owner lines, not actual dog sounds)

Rules:
- Recordings you made, or a written license to clone.
- No music, no other voices, no ads.
- Soft close-mic reads make Mira sound intimate.
- 30-90 seconds of clean speech is enough for a zero-shot clone.

Then either:
  python prep.py --voice mira-default samples\mira-default\*.mp3
or press "Prepare voice" in the UI (http://127.0.0.1:7860).
