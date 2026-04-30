#!/usr/bin/env python3

from PIL import Image
import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Convert white pixels in a PNG to transparent, leaving black pixels solid black."
    )
    parser.add_argument("src", help="source PNG")
    parser.add_argument("--out", required=True, help="output PNG")
    args = parser.parse_args()

    src = Path(args.src)
    out = Path(args.out)

    img = Image.open(src).convert("RGBA")
    pixels = img.getdata()

    new_pixels = []
    for r, g, b, a in pixels:
        # treat pure white as transparent
        if (r, g, b) == (255, 255, 255):
            new_pixels.append((255, 255, 255, 0))
        else:
            # everything else becomes solid black
            new_pixels.append((0, 0, 0, 255))

    img.putdata(new_pixels)
    img.save(out)
    print("wrote", out)


if __name__ == "__main__":
    main()