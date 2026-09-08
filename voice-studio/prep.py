"""Clean MP3/WAV samples into 24 kHz mono clips and pick a Chatterbox reference."""
from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VOICES = ROOT / "voices"
SAMPLES = ROOT / "samples"
SR = 24000


def ffmpeg_bin() -> str:
    exe = shutil.which("ffmpeg")
    if not exe:
        raise RuntimeError("ffmpeg is not on PATH. Install ffmpeg and reopen the terminal.")
    return exe


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "ffmpeg failed")


def duration_sec(path: Path) -> float:
    ffprobe = shutil.which("ffprobe") or ffmpeg_bin().replace("ffmpeg", "ffprobe")
    r = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True,
        text=True,
    )
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def to_wav_24k_mono(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    # Peak near -6 dB, 24 kHz mono. No brickwall limiter.
    run([
        ffmpeg_bin(), "-y", "-i", str(src),
        "-ac", "1", "-ar", str(SR),
        "-af", "loudnorm=I=-16:TP=-6.5:LRA=11",
        str(dst),
    ])


def split_silence(wav: Path, out_dir: Path, min_s: float = 4.0, max_s: float = 12.0) -> list[Path]:
    """Cut on silence. Keep 4–12 s pieces. If the whole file is already in range, keep it."""
    out_dir.mkdir(parents=True, exist_ok=True)
    dur = duration_sec(wav)
    if min_s <= dur <= max_s:
        dest = out_dir / "clip_000.wav"
        shutil.copy2(wav, dest)
        return [dest]
    pattern = out_dir / "clip_%03d.wav"
    run([
        ffmpeg_bin(), "-y", "-i", str(wav),
        "-af", "silenceremove=start_periods=1:start_silence=0.25:start_threshold=-35dB,"
               "areverse,silenceremove=start_periods=1:start_silence=0.25:start_threshold=-35dB,areverse",
        str(out_dir / "_trim.wav"),
    ])
    trimmed = out_dir / "_trim.wav"
    run([
        ffmpeg_bin(), "-y", "-i", str(trimmed),
        "-f", "segment", "-segment_time", "8", "-reset_timestamps", "1",
        str(pattern),
    ])
    trimmed.unlink(missing_ok=True)
    clips = []
    for i, p in enumerate(sorted(out_dir.glob("clip_*.wav"))):
        d = duration_sec(p)
        if d < 2.2:
            p.unlink(missing_ok=True)
            continue
        if d > max_s:
            cut = out_dir / f"clip_{i:03d}_cut.wav"
            run([ffmpeg_bin(), "-y", "-i", str(p), "-t", str(max_s), str(cut)])
            p.unlink(missing_ok=True)
            p = cut
        clips.append(p)
    return clips


def pick_ref(clips: list[Path]) -> Path | None:
    """Prefer a single 6–12 s take. Never average several MP3s."""
    scored = []
    for p in clips:
        d = duration_sec(p)
        if d < 4:
            continue
        # Prefer 6–12 s. Penalize very long leftovers.
        score = -abs(d - 9.0)
        scored.append((score, d, p))
    if not scored:
        return clips[0] if clips else None
    scored.sort(reverse=True)
    return scored[0][2]


def ingest(voice_id: str, files: list[Path], mood: str = "default") -> dict:
    """files: user MP3/WAV samples. Writes voices/<id>/clips and ref.wav."""
    voice_id = slug(voice_id)
    dest = VOICES / voice_id
    clips_dir = dest / "clips"
    if clips_dir.exists():
        shutil.rmtree(clips_dir)
    clips_dir.mkdir(parents=True, exist_ok=True)
    made: list[Path] = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp_p = Path(tmp)
        for i, src in enumerate(files):
            src = Path(src)
            wav = tmp_p / f"in_{i:03d}.wav"
            to_wav_24k_mono(src, wav)
            made.extend(split_silence(wav, clips_dir / f"src_{i:03d}"))
    # Flatten clips into clips/
    flat = []
    n = 0
    for p in made:
        if not p.exists():
            continue
        dest_clip = clips_dir / f"clip_{n:03d}.wav"
        dest_clip.parent.mkdir(parents=True, exist_ok=True)
        if p.parent != clips_dir:
            shutil.move(str(p), dest_clip)
        else:
            dest_clip = p
        flat.append(dest_clip)
        n += 1
    for leftover in clips_dir.glob("src_*"):
        if leftover.is_dir():
            shutil.rmtree(leftover, ignore_errors=True)
    ref = pick_ref(flat)
    if not ref:
        raise RuntimeError("No usable 4–12 s clip. Record closer, drop music, cut other voices.")
    ref_wav = dest / "ref.wav"
    shutil.copy2(ref, ref_wav)
    cfg = {
        "id": voice_id,
        "mood": mood,
        "sample_rate": SR,
        "exaggeration": 0.5,
        "cfg_weight": 0.5,
        "temperature": 0.8,
        "ref": "ref.wav",
        "clips": len(flat),
        "ref_seconds": round(duration_sec(ref_wav), 2),
        "license": "Use only recordings you made or have a written license to clone.",
    }
    (dest / "config.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    if not (dest / "ref.txt").exists():
        (dest / "ref.txt").write_text(
            "Type the exact words spoken in ref.wav. Matching text helps long-term fine-tunes.\n",
            encoding="utf-8",
        )
    return cfg


def slug(s: str) -> str:
    out = "".join(ch.lower() if ch.isalnum() else "-" for ch in (s or "voice"))
    while "--" in out:
        out = out.replace("--", "-")
    return out.strip("-") or "voice"


def main() -> None:
    import argparse
    p = argparse.ArgumentParser(description="Clean MP3/WAV samples into a Chatterbox voice profile")
    p.add_argument("--voice", required=True, help="Voice id, e.g. mira-default")
    p.add_argument("--mood", default="default")
    p.add_argument("files", nargs="+", help="MP3/WAV files, one speaker")
    args = p.parse_args()
    cfg = ingest(args.voice, [Path(f) for f in args.files], mood=args.mood)
    print(json.dumps(cfg, indent=2))


if __name__ == "__main__":
    main()
