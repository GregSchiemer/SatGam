from PIL import Image
import math
import argparse
from pathlib import Path


def resize_to_width(img, target_width):
    w, h = img.size
    scale = target_width / w
    new_size = (int(round(w * scale)), int(round(h * scale)))
    return img.resize(new_size, Image.Resampling.LANCZOS)


def place_centered(base, overlay, cx, cy):
    x = int(round(cx - overlay.width / 2))
    y = int(round(cy - overlay.height / 2))
    base.paste(overlay, (x, y), overlay)


def make_recursive_phonehenge(
    base_file,
    overlay_file,
    output_file,
    num_sprockets=25,
    ring_radius=350,
    sprocket_height=0,
    mini_width=110,
#    start_angle_deg=-90,
    start_angle_deg = -80.007,
    rotate_miniatures=False,
    rotate_offset_deg=0,
):
    """
    Place a miniature phonehenge image at the centre of each master sprocket.

    ring_radius:
        Radius to the inner foot of each master sprocket.

    sprocket_height:
        Height / long dimension of each master sprocket.
        The miniature placement radius is increased by half this amount
        so placement occurs at the sprocket centre rather than its foot.
    """

    base = Image.open(base_file).convert("RGBA")
    overlay_src = Image.open(overlay_file).convert("RGBA")

    mini = resize_to_width(overlay_src, mini_width)

    W, H = base.size
#    mid_x = W / 2
#    mid_y = H / 2

    mid_x = 551.311
    mid_y = 547.264
    placement_radius = 426.671

#    placement_radius = ring_radius + sprocket_height / 2

    for i in range(num_sprockets):
        angle_deg = start_angle_deg + (360.0 * i / num_sprockets)
        angle_rad = math.radians(angle_deg)

        cx = mid_x + placement_radius * math.cos(angle_rad)
        cy = mid_y + placement_radius * math.sin(angle_rad)

        if rotate_miniatures:
            mini_img = mini.rotate(
                angle_deg + rotate_offset_deg,
                resample=Image.Resampling.BICUBIC,
                expand=True
            )
        else:
            mini_img = mini

        place_centered(base, mini_img, cx, cy)

    base.save(output_file, "PNG")

    print(f"base image         : {base_file}")
    print(f"overlay image      : {overlay_file}")
    print(f"output             : {output_file}")
    print(f"master size        : {W} x {H}")
    print(f"num sprockets      : {num_sprockets}")
    print(f"ring radius        : {ring_radius}")
    print(f"sprocket height    : {sprocket_height}")
    print(f"placement radius   : {placement_radius}")
    print(f"mini width         : {mini_width}")
    print(f"start angle        : {start_angle_deg}")
    print(f"rotate miniatures  : {rotate_miniatures}")
    print(f"rotate offset      : {rotate_offset_deg}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Create a recursive phonehenge by placing miniature copies on each sprocket."
    )

    parser.add_argument("base", help="Master phonehenge image")
    parser.add_argument(
        "-m", "--mini-source",
        help="Image to use for the miniature clone (defaults to base image)"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output PNG filename"
    )
    parser.add_argument(
        "--num-sprockets",
        type=int,
        default=25,
        help="Number of sprockets / placements (default: 25)"
    )
    parser.add_argument(
        "--ring-radius",
        type=float,
        default=350,
        help="Radius to the inner foot of each master sprocket (default: 350)"
    )
    parser.add_argument(
        "--sprocket-height",
        type=float,
        default=0,
        help="Height of each master sprocket; placement radius increases by half this amount"
    )
    parser.add_argument(
        "--mini-width",
        type=int,
        default=110,
        help="Width of each miniature phonehenge (default: 110)"
    )
    parser.add_argument(
        "--start-angle",
        type=float,
        default=-90,
        help="Angle of first sprocket in degrees (default: -90)"
    )
    parser.add_argument(
        "--rotate-miniatures",
        action="store_true",
        help="Rotate each miniature to match the sprocket angle"
    )
    parser.add_argument(
        "--rotate-offset",
        type=float,
        default=0,
        help="Extra angle offset applied to each rotated miniature"
    )

    args = parser.parse_args()

    base_path = Path(args.base)
    mini_source_path = Path(args.mini_source) if args.mini_source else base_path

    if args.output:
        output_path = Path(args.output)
    else:
        output_path = base_path.with_name(base_path.stem + "-recursive.png")

    make_recursive_phonehenge(
        base_file=base_path,
        overlay_file=mini_source_path,
        output_file=output_path,
        num_sprockets=args.num_sprockets,
        ring_radius=args.ring_radius,
        sprocket_height=args.sprocket_height,
        mini_width=args.mini_width,
        start_angle_deg=args.start_angle,
        rotate_miniatures=args.rotate_miniatures,
        rotate_offset_deg=args.rotate_offset,
    )