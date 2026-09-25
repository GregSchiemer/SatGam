#!/usr/bin/env python3

from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFilter


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_rgba(c1, c2, t):
    return tuple(
        int(round(lerp(c1[i], c2[i], t)))
        for i in range(4)
    )


def paste_centered(base, overlay, cx, cy):
    x = int(round(cx - overlay.width / 2))
    y = int(round(cy - overlay.height / 2))
    base.alpha_composite(overlay, (x, y))


def make_bezel_sprite(
    width=52,
    height=104,
    corner_radius=12,
    stroke_width=3,
    silver=(185, 185, 195, 150),
    white=(255, 255, 255, 235),
    highlight_power=2.4,
    blur_radius=0.8,
):
    """
    Build one upright portrait bezel as a transparent RGBA image.

    Important convention:
    - the strongest highlight is on the BOTTOM edge
    - after rotation, that bottom edge should face the henge centre
    """

    W, H = width, height

    # Vertical gradient: silver at top, white at bottom
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)

    for y in range(H):
        t = y / (H - 1)
        t = t ** highlight_power
        color = lerp_rgba(silver, white, t)
        gdraw.line((0, y, W, y), fill=color)

    # Ring mask for the bezel stroke
    ring_mask = Image.new("L", (W, H), 0)
    mdraw = ImageDraw.Draw(ring_mask)

    inset = max(1, stroke_width // 2 + 1)
    box = [inset, inset, W - inset - 1, H - inset - 1]

    mdraw.rounded_rectangle(
        box,
        radius=corner_radius,
        outline=255,
        width=stroke_width,
    )

    if blur_radius > 0:
        ring_mask = ring_mask.filter(
            ImageFilter.GaussianBlur(blur_radius)
        )

    bezel = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bezel = Image.composite(grad, bezel, ring_mask)

    # Optional extra inner-edge glow near the bottom short edge
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)

    glow_y = H - inset - stroke_width
    glow_draw.line(
        (corner_radius + 2, glow_y, W - corner_radius - 3, glow_y),
        fill=(255, 255, 255, 75),
        width=1,
    )
    glow = glow.filter(ImageFilter.GaussianBlur(1.2))

    bezel = Image.alpha_composite(bezel, glow)

    return bezel


def add_bezels_to_phonehenge(
    input_file,
    output_file,
    centre_x=551.311,
    centre_y=547.264,
    ring_radius=426.671,
    start_angle_deg=-80.007,
    num_sprockets=25,
    bezel_width=52,
    bezel_height=104,
    corner_radius=12,
    stroke_width=3,
):
    base = Image.open(input_file).convert("RGBA")

    bezel = make_bezel_sprite(
        width=bezel_width,
        height=bezel_height,
        corner_radius=corner_radius,
        stroke_width=stroke_width,
    )

    angle_step = 360.0 / num_sprockets

    for i in range(num_sprockets):
        angle_deg = start_angle_deg + i * angle_step
        angle_rad = math.radians(angle_deg)

        # centre of the current sprocket
        cx = centre_x + ring_radius * math.cos(angle_rad)
        cy = centre_y + ring_radius * math.sin(angle_rad)

        # Rotate bezel to match sprocket orientation.
        # The bezel is created upright, and its bottom edge is the highlighted
        # "inner" edge, so this rotation should make the highlight face inward.
        rotated = bezel.rotate(
            angle_deg + 90,
            resample=Image.Resampling.BICUBIC,
            expand=True,
        )

        paste_centered(base, rotated, cx, cy)

    base.save(output_file, "PNG")

    print(f"input           : {input_file}")
    print(f"output          : {output_file}")
    print(f"centre          : ({centre_x:.3f}, {centre_y:.3f})")
    print(f"ring radius     : {ring_radius:.3f}")
    print(f"start angle     : {start_angle_deg:.3f}")
    print(f"num sprockets   : {num_sprockets}")
    print(f"bezel size      : {bezel_width} x {bezel_height}")
    print(f"corner radius   : {corner_radius}")
    print(f"stroke width    : {stroke_width}")


if __name__ == "__main__":
    input_path = Path("assets/md-images/phonehenge-icon.png")
    output_path = Path("assets/md-images/phonehenge-icon-bezels.png")

    add_bezels_to_phonehenge(
        input_file=input_path,
        output_file=output_path,

        # recovered pentagon-fit geometry
        centre_x=551.311,
        centre_y=547.264,
        ring_radius=426.671,
        start_angle_deg=-80.007,
        num_sprockets=25,

        # visual tuning parameters
        bezel_width=52,
        bezel_height=104,
        corner_radius=12,
        stroke_width=3,
    )