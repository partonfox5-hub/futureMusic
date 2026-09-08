"""Batch-generate line banks from lines.json. Rebake one id when writing changes."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LINES_PATH = ROOT / "lines.json"


def load_bank(path: Path = LINES_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def folder_for(voices: dict, voice_id: str) -> str:
    meta = voices.get(voice_id) or {}
    if meta.get("folder"):
        return meta["folder"]
    return voice_id.split("-", 1)[0]


def select_lines(bank: dict, only_id: str | None, voice: str | None) -> list[dict]:
    rows = list(bank.get("lines") or [])
    if only_id:
        want = {s.strip() for s in only_id.split(",") if s.strip()}
        rows = [r for r in rows if r.get("id") in want]
    if voice:
        rows = [r for r in rows if r.get("voice") == voice]
    return rows


def main(argv: list[str] | None = None) -> int:
    from engine import bake_line, device_note, load_model, pick_device, word_count

    p = argparse.ArgumentParser(description="Bake cloned TTS lines to out/voice/<folder>/<id>.ogg")
    p.add_argument("--id", dest="only_id", help="Comma-separated line ids. Omit to bake the whole bank.")
    p.add_argument("--voice", help="Only this voice profile, e.g. mira-default")
    p.add_argument("--lines", type=Path, default=LINES_PATH)
    p.add_argument("--force", action="store_true", help="Overwrite existing ogg files")
    p.add_argument("--model", choices=("chatterbox", "turbo"), default="chatterbox")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args(argv)

    bank = load_bank(args.lines)
    voices = bank.get("voices") or {}
    rows = select_lines(bank, args.only_id, args.voice)
    if not rows:
        print("No matching lines.", file=sys.stderr)
        return 2

    print(device_note(pick_device()))
    if not args.dry_run:
        load_model(args.model)

    from engine import OUT
    ok = 0
    skipped = 0
    for row in rows:
        line_id = row["id"]
        voice_id = row["voice"]
        text = (row.get("text") or "").strip()
        folder = folder_for(voices, voice_id)
        ogg = OUT / folder / f"{line_id}.ogg"
        n = word_count(text)
        warn = "  (long — clones smear past ~18 words)" if n > 18 else ""
        if ogg.exists() and not args.force and not args.dry_run:
            print(f"skip {folder}/{line_id}{warn}")
            skipped += 1
            continue
        print(f"bake {folder}/{line_id}  [{voice_id}]  {text}{warn}")
        if args.dry_run:
            continue
        info = bake_line(line_id, text, voice_id, folder, model_kind=args.model)
        print(f"  -> {info['ogg']}")
        ok += 1
    print(f"done. baked={ok} skipped={skipped} dry={args.dry_run}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
