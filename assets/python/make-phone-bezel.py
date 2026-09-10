#!/usr/bin/env python3

"""
make-phone-bezel.py

Create mobile-phone images from screenshots.

The phone geometry is based on the diagnostic dimensions that produced
the correct continuous rounded-rectangle footprint:

    side margin   = 12 px
    top margin    = 50 px
    corner radius = 50 px

Construction:

    1. Read screenshot dimensions.
    2. Create a larger rounded-rectangle phone footprint.
    3. Fill the footprint black.
    4. Place the screenshot inside the footprint without resizing it.
    5. Draw one silver rounded-rectangle perimeter around the phone.
    6. Save the result as a PNG with transparency outside the phone.

Typical single-image use:

    python3 assets/python/make-phone-bezel.py \
        --screen assets/screen-shots/ss-state-14.PNG \
        -o assets/md-images/ph-state-14.PNG

Batch use:

    python3 assets/python/make-phone-bezel.py \
        --screen-dir assets/screen-shots \
        --output-dir assets/md-images
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw


# ----------------------------------------------------------------------
# Phone geometry
# ----------------------------------------------------------------------

DEFAULT_SIDE_MARGIN = 12
DEFAULT_TOP_MARGIN = 50
DEFAULT_CORNER_SIZE = 50

# Width of the silver perimeter stroke.
DEFAULT_OUTLINE_WIDTH = 12

# Phone body and outline colours.
PHONE_BODY_RGB = (0, 0, 0)
SILVER_RGB = (192, 192, 192)

VALID_IMAGE_SUFFIXES = {
    ".png",
    ".PNG",
    ".jpg",
    ".JPG",
    ".jpeg",
    ".JPEG",
    ".webp",
    ".WEBP",
}


# ----------------------------------------------------------------------
# Continuous clockwise rounded-rectangle geometry
# ----------------------------------------------------------------------

def arc_points(
    cx: float,
    cy: float,
    radius: float,
    start_angle: float,
    end_angle: float,
    steps: int = 64
) -> list[tuple[float, float]]:
    """
    Return points along a circular arc.

    Image coordinates increase downward, so increasing angle traverses
    clockwise around the image.
    """

    points = []

    for i in range(steps + 1):
        t = i / steps

        angle = (
            start_angle
            + (end_angle - start_angle) * t
        )

        x = (
            cx
            + radius * math.cos(angle)
        )

        y = (
            cy
            + radius * math.sin(angle)
        )

        points.append(
            (x, y)
        )

    return points


def rounded_rect_polygon(
    width: int,
    height: int,
    corner_size: float,
    inset: float = 0.0
) -> list[tuple[float, float]]:
    """
    Construct one continuous clockwise rounded rectangle.

    The path begins halfway down the right edge, equivalent to the
    3 o'clock starting position used in the JavaScript prototype.
    """

    left = float(inset)
    top = float(inset)

    right = float(
        width - 1 - inset
    )

    bottom = float(
        height - 1 - inset
    )

    usable_w = (
        right - left
    )

    usable_h = (
        bottom - top
    )

    if usable_w <= 0 or usable_h <= 0:
        raise ValueError(
            "Rounded rectangle has non-positive dimensions."
        )

    radius = min(
        float(corner_size),
        usable_w / 2.0,
        usable_h / 2.0
    )

    mid_y = (
        top + bottom
    ) / 2.0

    points: list[
        tuple[float, float]
    ] = []

    # --------------------------------------------------------------
    # Start at 3 o'clock
    # --------------------------------------------------------------

    points.append(
        (
            right,
            mid_y
        )
    )

    # Right vertical edge
    points.append(
        (
            right,
            bottom - radius
        )
    )

    # --------------------------------------------------------------
    # Bottom-right corner
    # --------------------------------------------------------------

    arc = arc_points(
        cx=right - radius,
        cy=bottom - radius,
        radius=radius,
        start_angle=0.0,
        end_angle=math.pi / 2.0
    )

    points.extend(
        arc[1:]
    )

    # Bottom horizontal edge
    points.append(
        (
            left + radius,
            bottom
        )
    )

    # --------------------------------------------------------------
    # Bottom-left corner
    # --------------------------------------------------------------

    arc = arc_points(
        cx=left + radius,
        cy=bottom - radius,
        radius=radius,
        start_angle=math.pi / 2.0,
        end_angle=math.pi
    )

    points.extend(
        arc[1:]
    )

    # Left vertical edge
    points.append(
        (
            left,
            top + radius
        )
    )

    # --------------------------------------------------------------
    # Top-left corner
    # --------------------------------------------------------------

    arc = arc_points(
        cx=left + radius,
        cy=top + radius,
        radius=radius,
        start_angle=math.pi,
        end_angle=3.0 * math.pi / 2.0
    )

    points.extend(
        arc[1:]
    )

    # Top horizontal edge
    points.append(
        (
            right - radius,
            top
        )
    )

    # --------------------------------------------------------------
    # Top-right corner
    # --------------------------------------------------------------

    arc = arc_points(
        cx=right - radius,
        cy=top + radius,
        radius=radius,
        start_angle=3.0 * math.pi / 2.0,
        end_angle=2.0 * math.pi
    )

    points.extend(
        arc[1:]
    )

    # Return to 3 o'clock
    points.append(
        (
            right,
            mid_y
        )
    )

    return points


# ----------------------------------------------------------------------
# Phone construction
# ----------------------------------------------------------------------

def make_phone_image(
    screenshot: Image.Image,
    side_margin: int = DEFAULT_SIDE_MARGIN,
    top_margin: int = DEFAULT_TOP_MARGIN,
    corner_size: int = DEFAULT_CORNER_SIZE,
    outline_width: int = DEFAULT_OUTLINE_WIDTH
) -> Image.Image:
    """
    Create the completed phone image from one screenshot.
    """

    screenshot = screenshot.convert(
        "RGBA"
    )

    screen_w, screen_h = (
        screenshot.size
    )

    # --------------------------------------------------------------
    # Outer phone dimensions
    # --------------------------------------------------------------

    outer_w = (
        screen_w
        + 2 * side_margin
    )

    outer_h = (
        screen_h
        + 2 * top_margin
    )

    size = (
        outer_w,
        outer_h
    )

    # --------------------------------------------------------------
    # Create transparent output canvas
    # --------------------------------------------------------------

    phone = Image.new(
        "RGBA",
        size,
        (0, 0, 0, 0)
    )

    # --------------------------------------------------------------
    # Generate the outer rounded phone footprint
    # --------------------------------------------------------------

    outer_polygon = rounded_rect_polygon(
        width=outer_w,
        height=outer_h,
        corner_size=corner_size
    )

    phone_draw = ImageDraw.Draw(
        phone
    )

    # --------------------------------------------------------------
    # Black phone body
    # --------------------------------------------------------------

    phone_draw.polygon(
        outer_polygon,
        fill=PHONE_BODY_RGB + (255,)
    )

    # --------------------------------------------------------------
    # Place screenshot inside the black footprint
    #
    # Screenshot dimensions are unchanged.
    # The screenshot begins exactly:
    #
    #     12 px from left/right
    #     50 px from top/bottom
    #
    # with the default geometry.
    # --------------------------------------------------------------

    phone.alpha_composite(
        screenshot,
        dest=(
            side_margin,
            top_margin
        )
    )

    # --------------------------------------------------------------
    # Silver perimeter
    #
    # Draw the perimeter using the SAME rounded-rectangle geometry
    # as the black phone footprint.
    #
    # The stroke is drawn slightly inside the actual image boundary
    # so it is not clipped by the PNG canvas.
    # --------------------------------------------------------------

    stroke_inset = (
        outline_width / 2.0
        + 0.5
    )

    outline_radius = max(
        1.0,
        corner_size - stroke_inset
    )

    outline_polygon = rounded_rect_polygon(
        width=outer_w,
        height=outer_h,
        corner_size=outline_radius,
        inset=stroke_inset
    )

    # Pillow polygon outlines are less reliable for smooth curved
    # paths, so use line() on the continuous ordered perimeter.
    phone_draw = ImageDraw.Draw(
        phone
    )

    closed_outline = (
        outline_polygon
        + [outline_polygon[0]]
    )

    phone_draw.line(
        closed_outline,
        fill=SILVER_RGB + (255,),
        width=outline_width,
        joint="curve"
    )

    return phone


# ----------------------------------------------------------------------
# Single screenshot
# ----------------------------------------------------------------------

def composite_phone_image(
    screen_path: Path,
    output_path: Path,
    side_margin: int = DEFAULT_SIDE_MARGIN,
    top_margin: int = DEFAULT_TOP_MARGIN,
    corner_size: int = DEFAULT_CORNER_SIZE,
    outline_width: int = DEFAULT_OUTLINE_WIDTH
) -> Path:
    """
    Read a screenshot, build the phone image, and save it.
    """

    with Image.open(
        screen_path
    ) as source:

        screenshot = source.convert(
            "RGBA"
        )

    phone = make_phone_image(
        screenshot=screenshot,
        side_margin=side_margin,
        top_margin=top_margin,
        corner_size=corner_size,
        outline_width=outline_width
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    phone.save(
        output_path
    )

    screen_w, screen_h = (
        screenshot.size
    )

    outer_w, outer_h = (
        phone.size
    )

    print(
        "[phone image]"
    )

    print(
        f"  screenshot    : {screen_path}"
    )

    print(
        f"  output        : {output_path}"
    )

    print(
        f"  screen size   : "
        f"{screen_w} x {screen_h}"
    )

    print(
        f"  phone size    : "
        f"{outer_w} x {outer_h}"
    )

    print(
        f"  side margin   : "
        f"{side_margin} px"
    )

    print(
        f"  top margin    : "
        f"{top_margin} px"
    )

    print(
        f"  corner radius : "
        f"{corner_size} px"
    )

    print(
        f"  silver stroke : "
        f"{outline_width} px"
    )

    print()

    return output_path


# ----------------------------------------------------------------------
# Batch helpers
# ----------------------------------------------------------------------

def iter_image_files(
    directory: Path
) -> Iterable[Path]:
    """
    Return supported image files in filename order.
    """

    for path in sorted(
        directory.iterdir()
    ):

        if (
            path.is_file()
            and path.suffix in VALID_IMAGE_SUFFIXES
        ):
            yield path


def mapped_output_name(
    screen_path: Path
) -> str:
    """
    Convert screenshot names such as:

        ss-state-14.PNG

    to:

        ph-state-14.PNG
    """

    stem = screen_path.stem
    suffix = screen_path.suffix

    if stem.startswith(
        "ss-"
    ):
        output_stem = (
            "ph-"
            + stem[3:]
        )

    else:
        output_stem = (
            "ph-"
            + stem
        )

    return (
        output_stem
        + suffix
    )


def process_directory(
    screen_dir: Path,
    output_dir: Path,
    side_margin: int = DEFAULT_SIDE_MARGIN,
    top_margin: int = DEFAULT_TOP_MARGIN,
    corner_size: int = DEFAULT_CORNER_SIZE,
    outline_width: int = DEFAULT_OUTLINE_WIDTH
) -> list[Path]:
    """
    Convert every screenshot in a directory.
    """

    if not screen_dir.exists():

        raise FileNotFoundError(
            f"screen directory not found: "
            f"{screen_dir}"
        )

    if not screen_dir.is_dir():

        raise NotADirectoryError(
            f"not a directory: "
            f"{screen_dir}"
        )

    inputs = list(
        iter_image_files(
            screen_dir
        )
    )

    if not inputs:

        raise FileNotFoundError(
            f"no supported screenshots found in: "
            f"{screen_dir}"
        )

    output_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    print(
        f"[batch] processing "
        f"{len(inputs)} screenshot(s)"
    )

    print(
        f"  input  : {screen_dir}"
    )

    print(
        f"  output : {output_dir}"
    )

    print()

    outputs = []

    for screen_path in inputs:

        output_path = (
            output_dir
            / mapped_output_name(
                screen_path
            )
        )

        composite_phone_image(
            screen_path=screen_path,
            output_path=output_path,
            side_margin=side_margin,
            top_margin=top_margin,
            corner_size=corner_size,
            outline_width=outline_width
        )

        outputs.append(
            output_path
        )

    return outputs


# ----------------------------------------------------------------------
# Command line
# ----------------------------------------------------------------------

def main() -> None:

    assets_dir = (
        Path(__file__)
        .resolve()
        .parents[1]
    )

    default_output_dir = (
        assets_dir
        / "md-images"
    )

    ap = argparse.ArgumentParser(
        description=(
            "Composite screenshots into "
            "rounded black mobile-phone bodies "
            "with a silver perimeter."
        )
    )

    mode = (
        ap.add_mutually_exclusive_group(
            required=True
        )
    )

    mode.add_argument(
        "--screen",
        help=(
            "path to one screenshot"
        )
    )

    mode.add_argument(
        "--screen-dir",
        help=(
            "directory containing screenshots"
        )
    )

    ap.add_argument(
        "-o",
        "--output",
        help=(
            "output PNG for single-image mode"
        )
    )

    ap.add_argument(
        "--output-dir",
        help=(
            "output directory for batch mode "
            f"(default: {default_output_dir})"
        )
    )

    ap.add_argument(
        "--side-margin",
        type=int,
        default=DEFAULT_SIDE_MARGIN,
        help=(
            f"left/right black bezel width "
            f"(default {DEFAULT_SIDE_MARGIN})"
        )
    )

    ap.add_argument(
        "--top-margin",
        type=int,
        default=DEFAULT_TOP_MARGIN,
        help=(
            f"top/bottom black bezel width "
            f"(default {DEFAULT_TOP_MARGIN})"
        )
    )

    ap.add_argument(
        "--corner-size",
        type=int,
        default=DEFAULT_CORNER_SIZE,
        help=(
            f"outer phone corner radius "
            f"(default {DEFAULT_CORNER_SIZE})"
        )
    )

    ap.add_argument(
        "--outline-width",
        type=int,
        default=DEFAULT_OUTLINE_WIDTH,
        help=(
            f"silver perimeter width "
            f"(default {DEFAULT_OUTLINE_WIDTH})"
        )
    )

    args = ap.parse_args()

    # --------------------------------------------------------------
    # Batch mode
    # --------------------------------------------------------------

    if args.screen_dir:

        output_dir = (
            Path(args.output_dir)
            if args.output_dir
            else default_output_dir
        )

        process_directory(
            screen_dir=Path(
                args.screen_dir
            ),
            output_dir=output_dir,
            side_margin=args.side_margin,
            top_margin=args.top_margin,
            corner_size=args.corner_size,
            outline_width=args.outline_width
        )

        return

    # --------------------------------------------------------------
    # Single-image mode
    # --------------------------------------------------------------

    screen_path = Path(
        args.screen
    )

    if not screen_path.exists():

        raise FileNotFoundError(
            f"screenshot not found: "
            f"{screen_path}"
        )

    output_path = (
        Path(args.output)
        if args.output
        else (
            default_output_dir
            / mapped_output_name(
                screen_path
            )
        )
    )

    composite_phone_image(
        screen_path=screen_path,
        output_path=output_path,
        side_margin=args.side_margin,
        top_margin=args.top_margin,
        corner_size=args.corner_size,
        outline_width=args.outline_width
    )


if __name__ == "__main__":
    main()
