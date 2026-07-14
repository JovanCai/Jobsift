#!/usr/bin/env python3
"""
Job Feed Filter — 图标生成脚本。
设计（去商标化）：
  - 深青色圆角方块背景（不用 LinkedIn 蓝，避免品牌联想）
  - 白色漏斗形状（filter 的通用符号）
  - 漏斗颈下方一颗小红点，表示"过滤掉的一份"
"""
from PIL import Image, ImageDraw
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'icons')

BG = (30, 41, 59, 255)       # slate-800，中性深色
FUNNEL = (245, 245, 245, 255)
DOT = (204, 16, 22, 255)


def make_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 圆角背景
    radius = max(3, size // 6)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)

    # 漏斗（六边形轮廓）
    s = size
    funnel = [
        (0.16 * s, 0.24 * s),   # 左上
        (0.84 * s, 0.24 * s),   # 右上
        (0.58 * s, 0.52 * s),   # 右上收窄
        (0.58 * s, 0.72 * s),   # 右下柄
        (0.42 * s, 0.72 * s),   # 左下柄
        (0.42 * s, 0.52 * s),   # 左下收窄
    ]
    draw.polygon(funnel, fill=FUNNEL)

    # 底部小红点（表示"被过滤掉的东西"）
    dot_r = max(1.0, s * 0.09)
    cx, cy = 0.5 * s, 0.86 * s
    draw.ellipse(
        [cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r],
        fill=DOT,
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
