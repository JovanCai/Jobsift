#!/usr/bin/env python3
"""
Job Feed Filter — icon generator.

Design: 3 list rows on a dark background, the middle row struck through
in red. Reads at 16x16 and doesn't rely on any specific brand color.
"""
from PIL import Image, ImageDraw
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'icons')

BG = (17, 24, 39, 255)        # gray-900
ROW = (240, 240, 240, 255)    # off-white
STRIKE = (220, 38, 38, 255)   # red-600


def make_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded background
    radius = max(2, size // 6)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)

    # 3 rows (as small rounded pills)
    row_h = max(2, round(size * 0.13))
    row_w = round(size * 0.60)
    x_left = round(size * 0.20)
    x_right = x_left + row_w
    ys = [round(size * 0.24), round(size * 0.50), round(size * 0.76)]
    row_radius = max(1, row_h // 2)
    for y in ys:
        top = y - row_h // 2
        bot = top + row_h
        draw.rounded_rectangle([x_left, top, x_right, bot], radius=row_radius, fill=ROW)

    # Red strike-through on the middle row (thicker than the row itself)
    strike_w = max(2, round(size * 0.09))
    mid = ys[1]
    pad = max(1, round(size * 0.06))
    # Slight diagonal for a "canceled" feel
    dx = round(size * 0.04)
    draw.line(
        [(x_left - pad, mid + dx), (x_right + pad, mid - dx)],
        fill=STRIKE,
        width=strike_w,
    )
    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in (16, 48, 128):
        path = os.path.join(OUT_DIR, f'icon{size}.png')
        make_icon(size).save(path)
        print(f'wrote {path} ({size}x{size})')


if __name__ == '__main__':
    main()
