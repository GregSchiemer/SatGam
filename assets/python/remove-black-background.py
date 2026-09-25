from PIL import Image
import argparse
from pathlib import Path


def remove_black_background(input_file, output_file, threshold=3):
    """
    Convert black background pixels to transparency while preserving
    coloured gradient pixels.

    A pixel is treated as background only when R, G and B are all
    less than or equal to `threshold`.
    """

    img = Image.open(input_file).convert("RGBA")
    pixels = img.load()

    width, height = img.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]

            # Remove only black / near-black background pixels
            if r <= threshold and g <= threshold and b <= threshold:
                pixels[x, y] = (r, g, b, 0)

    img.save(output_file, "PNG")

    print(f"input     : {input_file}")
    print(f"output    : {output_file}")
    print(f"size      : {width} x {height}")
    print(f"threshold : {threshold}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert a black PNG background to transparency."
    )

    parser.add_argument(
        "input",
        help="Input PNG image"
    )

    parser.add_argument(
        "-o",
        "--output",
        help="Output PNG image"
    )

    parser.add_argument(
        "-t",
        "--threshold",
        type=int,
        default=3,
        help="Black threshold from 0-255 (default: 3)"
    )

    args = parser.parse_args()

    input_path = Path(args.input)

    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.with_name(
            input_path.stem + "-transparent.png"
        )

    remove_black_background(
        input_path,
        output_path,
        args.threshold
    )