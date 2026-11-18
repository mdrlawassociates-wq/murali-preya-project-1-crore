"""Generate the small PWA icon set without external image dependencies."""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)


def make(size: int, name: str, maskable: bool = False) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(size * 0.09) if maskable else 0
    box = (pad, pad, size - pad - 1, size - pad - 1)
    draw.rounded_rectangle(box, radius=int(size * 0.22), fill=(23, 53, 43, 255))

    inner = size - 2 * pad
    scale = inner / 192.0
    base_x = pad + int(48 * scale)
    widths = [int(96 * scale), int(70 * scale), int(44 * scale)]
    heights = [int(7 * scale), int(7 * scale), int(7 * scale)]
    ys = [pad + int(62 * scale), pad + int(92 * scale), pad + int(122 * scale)]

    for width, height, y in zip(widths, heights, ys):
        draw.rounded_rectangle(
            (base_x, y, base_x + width, y + height),
            radius=height // 2,
            fill=(238, 244, 240, 255),
        )

    dot_x = pad + int(150 * scale)
    dot_y = pad + int(122 * scale)
    dot_r = int(7 * scale)
    draw.ellipse(
        (dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r),
        fill=(212, 139, 58, 255),
    )

    img.save(OUT / name)


make(192, "icon-192.png")
make(512, "icon-512.png")
make(512, "icon-512-maskable.png", maskable=True)
print(f"Icons written to {OUT}")
