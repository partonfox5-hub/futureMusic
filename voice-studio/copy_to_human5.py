"""Copy baked ogg files into the Quest asset tree. Does not change gameplay code."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out" / "voice"
HUMAN5 = ROOT.parent / "public" / "human5" / "assets" / "voice"


def copy_bank(src: Path = OUT, dest: Path = HUMAN5) -> list[str]:
    if not src.exists():
        raise FileNotFoundError(f"Nothing baked yet at {src}")
    copied = []
    for ogg in src.rglob("*.ogg"):
        rel = ogg.relative_to(src)
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ogg, target)
        copied.append(str(target).replace("\\", "/"))
    return copied


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--dest", type=Path, default=HUMAN5)
    args = p.parse_args()
    files = copy_bank(dest=args.dest)
    print(f"copied {len(files)} ogg files -> {args.dest}")
    for f in files:
        print(" ", f)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
