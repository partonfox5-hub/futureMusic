"""Compose Meta Horizon Store cover assets at required pixel sizes."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
REPO_OUT = ROOT
SESS = Path(r"C:\Users\parto\.grok\sessions\C%3A%5C\01a03ecd-fdc1-7f81-b101-90c786f7943c\images")
DL = Path(r"C:\Users\parto\Downloads\blockbuild-store-assets")
ICON_SRC = ROOT.parent / "icons" / "icon-512.png"
FONT = Path(r"C:\Windows\Fonts\segoeuib.ttf")
TITLE = "Blockbuild"


def cover(im: Image.Image, size: tuple[int, int], focus=(0.5, 0.42)) -> Image.Image:
    tw, th = size
    im = im.convert("RGB")
    sw, sh = im.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(sw * scale + 0.5), int(sh * scale + 0.5)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    cx, cy = int(nw * focus[0]), int(nh * focus[1])
    left = max(0, min(nw - tw, cx - tw // 2))
    top = max(0, min(nh - th, cy - th // 2))
    return im.crop((left, top, left + tw, top + th))


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), size)


def title_size(w: int, h: int) -> int:
    return max(36, int(min(w * 0.09, h * 0.13)))


def draw_title(base: Image.Image, y_frac: float) -> Image.Image:
    img = base.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    f = font(title_size(*img.size))
    x0, y0, x1, y1 = draw.textbbox((0, 0), TITLE, font=f)
    tw, th = x1 - x0, y1 - y0
    x = (img.size[0] - tw) // 2 - x0
    y = int(img.size[1] * y_frac) - th // 2 - y0
    # Keep title out of the top/bottom 20% (Asset.3).
    y = max(int(img.size[1] * 0.22), min(y, int(img.size[1] * 0.72) - th))
    outline = max(3, img.size[0] // 420)
    for dx in range(-outline, outline + 1):
        for dy in range(-outline, outline + 1):
            if dx * dx + dy * dy <= outline * outline:
                draw.text((x + dx, y + dy), TITLE, font=f, fill=(18, 28, 42, 230))
    draw.text((x, y), TITLE, font=f, fill=(255, 255, 255, 255))
    glow = overlay.filter(ImageFilter.GaussianBlur(radius=max(2, outline)))
    out = Image.alpha_composite(img, glow)
    out = Image.alpha_composite(out, overlay)
    return out.convert("RGB")


def save_rgb(img: Image.Image, name: str) -> None:
    rgb = img.convert("RGB")
    for dest in (REPO_OUT, DL):
        dest.mkdir(parents=True, exist_ok=True)
        rgb.save(dest / name, format="PNG", optimize=True)


def save_rgba(img: Image.Image, name: str) -> None:
    rgba = img.convert("RGBA")
    for dest in (REPO_OUT, DL):
        dest.mkdir(parents=True, exist_ok=True)
        rgba.save(dest / name, format="PNG", optimize=True)


def wordmark_logo() -> Image.Image:
    w, h = 3200, 640
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    brick = Image.open(ICON_SRC).convert("RGBA")
    bh = 420
    brick = brick.resize((bh, bh), Image.Resampling.LANCZOS)
    f = font(220)
    x0, y0, x1, y1 = draw.textbbox((0, 0), TITLE, font=f)
    tw, th = x1 - x0, y1 - y0
    gap = 48
    total = bh + gap + tw
    x = (w - total) // 2
    yb = (h - bh) // 2
    canvas.alpha_composite(brick, (x, yb))
    tx = x + bh + gap - x0
    ty = (h - th) // 2 - y0
    outline = 8
    for dx in range(-outline, outline + 1):
        for dy in range(-outline, outline + 1):
            if dx * dx + dy * dy <= outline * outline:
                draw.text((tx + dx, ty + dy), TITLE, font=f, fill=(18, 28, 42, 255))
    draw.text((tx, ty), TITLE, font=f, fill=(255, 255, 255, 255))
    return canvas


def main() -> None:
    land = Image.open(SESS / "1.jpg")
    square = Image.open(SESS / "2.jpg")
    port = Image.open(SESS / "3.jpg")

    save_rgb(draw_title(cover(land, (2560, 1440), (0.5, 0.45)), 0.26), "cover-landscape-2560x1440.png")
    save_rgb(draw_title(cover(square, (1440, 1440), (0.5, 0.40)), 0.24), "cover-square-1440x1440.png")
    save_rgb(draw_title(cover(port, (1008, 1440), (0.5, 0.38)), 0.24), "cover-portrait-1008x1440.png")
    save_rgb(draw_title(cover(land, (3000, 900), (0.5, 0.32)), 0.50), "hero-cover-3000x900.png")
    save_rgb(draw_title(cover(land, (1080, 360), (0.5, 0.30)), 0.50), "mini-landscape-1080x360.png")
    save_rgb(cover(land, (2560, 1440), (0.5, 0.48)), "trailer-cover-2560x1440.png")

    icon = Image.open(ICON_SRC).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    save_rgb(icon, "icon-512x512.png")
    spatial = Image.open(ICON_SRC).convert("RGBA").resize((180, 180), Image.Resampling.LANCZOS)
    save_rgba(spatial, "spatialized-icon-180x180.png")
    save_rgba(wordmark_logo(), "logo-transparent.png")

    listing = ROOT / "listing.txt"
    if listing.exists():
        DL.mkdir(parents=True, exist_ok=True)
        (DL / "listing.txt").write_text(listing.read_text(encoding="utf-8"), encoding="utf-8")
    print("wrote", REPO_OUT)
    print("wrote", DL)


if __name__ == "__main__":
    main()
