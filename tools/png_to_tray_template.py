#!/usr/bin/env python3
"""
PNG to macOS Tray Template Converter
Creates a monochrome menu bar (tray) template image pair from the app logo.

macOS tints template images automatically for light/dark menu bars. Electron
treats any image whose file name ends in "Template" as a template image and
picks up the @2x variant next to it.

Usage:
    python png_to_tray_template.py <input.png> [output_dir]

Writes <output_dir>/trayTemplate.png (18x18) and trayTemplate@2x.png (36x36).
If output_dir is not specified, the input file's directory is used.
"""

import sys
from pathlib import Path
from PIL import Image

# Menu bar icons are drawn at 18pt (16-18pt is the usual range)
BASE_SIZE = 18

# The logo is a bright purple mark on a near-black tile. The blue channel
# separates them best: background ~28, mark ~240.
BACKGROUND_LEVEL = 60
MARK_LEVEL = 200

# Empty margin around the mark, as a fraction of the icon size
PADDING = 0.06


def extract_mark(source: Image.Image) -> Image.Image:
    """Return the logo mark as black on transparent, cropped to its bounds."""
    rgba = source.convert('RGBA')
    _, _, blue, alpha = rgba.split()

    span = MARK_LEVEL - BACKGROUND_LEVEL
    mask = blue.point(lambda b: max(0, min(255, (b - BACKGROUND_LEVEL) * 255 // span)))
    # Keep transparent corners of the source transparent
    mask = Image.composite(mask, Image.new('L', rgba.size, 0), alpha)

    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError('No logo mark found in the source image')
    mask = mask.crop(bbox)

    # Pad to a square so the mark keeps its aspect ratio
    side = round(max(mask.size) / (1 - 2 * PADDING))
    square = Image.new('L', (side, side), 0)
    square.paste(mask, ((side - mask.width) // 2, (side - mask.height) // 2))

    mark = Image.new('RGBA', square.size, (0, 0, 0, 0))
    mark.putalpha(square)
    return mark


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else input_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)

    mark = extract_mark(Image.open(input_path))

    for scale, suffix in ((1, ''), (2, '@2x')):
        size = BASE_SIZE * scale
        out = output_dir / f'trayTemplate{suffix}.png'
        mark.resize((size, size), Image.LANCZOS).save(out)
        print(f'Created {out} ({size}x{size})')


if __name__ == '__main__':
    main()
