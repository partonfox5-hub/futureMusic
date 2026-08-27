"""Compose Meta Horizon Store cover assets from the in-game-look master."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SESS = Path(r"C:\Users\parto\.grok\sessions\C%3A%5C\01a03ecd-fdc1-7f81-b101-90c786f7943c\images")
DL_DIR = Path(r"C:\Users\parto\Downloads\blockbuild-store-assets")
DL_ROOT = Path(r"C:\Users\parto\Downloads")
ICON_SRC = ROOT.parent / "icons" / "icon-512.png"
TITLE = "Blockbuild"
LETTER_COLORS = [
    (201, 26, 9),    # red
    (35, 120, 65),   # green
    (0, 85, 191),    # blue
    (245, 205, 47),  # yellow
]

# 5x7 block glyphs. 1 = fill. Title is drawn in all-caps so the word stays Blockbuild.
GLYPHS = {
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
}


def cover(im: Image.Image, size: tuple[int, int], focus=(0.5, 0.48)) -> Image.Image:
    tw, th = size
    im = im.convert("RGB")
    sw, sh = im.size
    scale = max(tw / sw, th / sh)
    nw, nh = max(tw, int(sw * scale + 0.5)), max(th, int(sh * scale + 0.5))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    cx, cy = int(nw * focus[0]), int(nh * focus[1])
    left = max(0, min(nw - tw, cx - tw // 2))
    top = max(0, min(nh - th, cy - th // 2))
    return im.crop((left, top, left + tw, top + th))


def render_block_text(text: str, cell: int, fill=(245, 205, 47), outline=(27, 42, 52)) -> Image.Image:
    gap = 1
    cols = 5
    rows = 7
    letter_w = cols + gap
    w = letter_w * len(text) * cell
    h = (rows + 2) * cell
    img = Image.new("RGBA", (w + cell * 2, h + cell * 2), (0, 0, 0, 0))
    px = img.load()

    def stamp(x0: int, y0: int, color: tuple[int, int, int], alpha: int = 255) -> None:
        for yy in range(cell):
            for xx in range(cell):
                x, y = x0 + xx, y0 + yy
                if 0 <= x < img.size[0] and 0 <= y < img.size[1]:
                    px[x, y] = (*color, alpha)

    ox = cell
    oy = cell
    color_i = 0
    for ch in text.upper():
        g = GLYPHS.get(ch, GLYPHS[" "])
        letter_fill = fill if ch == " " else LETTER_COLORS[color_i % len(LETTER_COLORS)]
        if ch != " ":
            color_i += 1
        for r, row in enumerate(g):
            for c, bit in enumerate(row):
                if bit != "1":
                    continue
                sx = ox + c * cell
                sy = oy + r * cell
                stamp(sx + max(1, cell // 8), sy + max(1, cell // 8), (12, 18, 28))
                stamp(sx, sy, outline)
                inset = max(1, cell // 10)
                for yy in range(inset, cell - inset):
                    for xx in range(inset, cell - inset):
                        x, y = sx + xx, sy + yy
                        if 0 <= x < img.size[0] and 0 <= y < img.size[1]:
                            px[x, y] = (*letter_fill, 255)
        ox += letter_w * cell
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def paste_title(base: Image.Image, y_frac: float, cell: int | None = None) -> Image.Image:
    img = base.convert("RGBA")
    if cell is None:
        cell = max(8, img.size[0] // 92)
    title = render_block_text(TITLE, cell)
    max_w = int(img.size[0] * 0.78)
    if title.size[0] > max_w:
        nh = int(title.size[1] * max_w / title.size[0])
        title = title.resize((max_w, nh), Image.Resampling.NEAREST)
    x = (img.size[0] - title.size[0]) // 2
    y = int(img.size[1] * y_frac) - title.size[1] // 2
    y = max(int(img.size[1] * 0.18), min(y, int(img.size[1] * 0.72) - title.size[1]))
    img.alpha_composite(title, (x, y))
    return img.convert("RGB")


def save_rgb(img: Image.Image, name: str, extra: list[Path] | None = None) -> None:
    rgb = img.convert("RGB")
    dests = [ROOT, DL_DIR]
    if extra:
        dests.extend(extra)
    for dest in dests:
        dest.mkdir(parents=True, exist_ok=True)
        rgb.save(dest / name, format="PNG", optimize=True)


def save_rgba(img: Image.Image, name: str) -> None:
    rgba = img.convert("RGBA")
    for dest in (ROOT, DL_DIR):
        dest.mkdir(parents=True, exist_ok=True)
        rgba.save(dest / name, format="PNG", optimize=True)


def wordmark_logo() -> Image.Image:
    title = render_block_text(TITLE, 28)
    brick = Image.open(ICON_SRC).convert("RGBA").resize((420, 420), Image.Resampling.NEAREST)
    gap = 56
    w = brick.size[0] + gap + title.size[0] + 80
    h = max(brick.size[1], title.size[1]) + 80
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    canvas.alpha_composite(brick, (40, (h - brick.size[1]) // 2))
    canvas.alpha_composite(title, (40 + brick.size[0] + gap, (h - title.size[1]) // 2))
    return canvas


def main() -> None:
    land = Image.open(SESS / "4.jpg")
    square = Image.open(SESS / "5.jpg")
    port = Image.open(SESS / "6.jpg")

    universal = paste_title(cover(land, (2560, 1440), (0.5, 0.50)), 0.22, cell=18)
    save_rgb(universal, "cover-landscape-2560x1440.png")
    save_rgb(universal, "blockbuild-universal-basic-asset.png", extra=[DL_ROOT])
    save_rgb(universal, "universal-basic-asset-2560x1440.png")

    save_rgb(paste_title(cover(square, (1440, 1440), (0.5, 0.48)), 0.20, cell=14), "cover-square-1440x1440.png")
    save_rgb(paste_title(cover(port, (1008, 1440), (0.5, 0.42)), 0.20, cell=12), "cover-portrait-1008x1440.png")
    save_rgb(paste_title(cover(land, (3000, 900), (0.5, 0.36)), 0.48, cell=16), "hero-cover-3000x900.png")
    save_rgb(paste_title(cover(land, (1080, 360), (0.5, 0.34)), 0.48, cell=10), "mini-landscape-1080x360.png")
    save_rgb(cover(land, (2560, 1440), (0.5, 0.52)), "trailer-cover-2560x1440.png")

    icon = Image.open(ICON_SRC).convert("RGB").resize((512, 512), Image.Resampling.NEAREST)
    save_rgb(icon, "icon-512x512.png")
    spatial = Image.open(ICON_SRC).convert("RGBA").resize((180, 180), Image.Resampling.NEAREST)
    save_rgba(spatial, "spatialized-icon-180x180.png")
    save_rgba(wordmark_logo(), "logo-transparent.png")

    listing = ROOT / "listing.txt"
    if listing.exists():
        DL_DIR.mkdir(parents=True, exist_ok=True)
        (DL_DIR / "listing.txt").write_text(listing.read_text(encoding="utf-8"), encoding="utf-8")
    print("universal:", DL_ROOT / "blockbuild-universal-basic-asset.png")
    print("set:", DL_DIR)


if __name__ == "__main__":
    main()
