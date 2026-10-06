#!/usr/bin/env python3

from PIL import Image, ImageDraw
from pathlib import Path


# ------------------------------------------------------------
# Fixed configuration
# ------------------------------------------------------------

REPO_ROOT = Path("/Users/gs/Developer/SG/SatGam")

TEMPLATE_PNG = REPO_ROOT / "assets/md-images/grid_template.PNG"
NOTATION_PNG = REPO_ROOT / "assets/md-images/notation_overlay.PNG"

GRID_OUT = REPO_ROOT / "assets/md-images/phonehenge_grid_coloured.PNG"
COMPOSITE_OUT = REPO_ROOT / "assets/md-images/phonehenge_notation_composite.PNG"

# Inner box found by experiment
BOX_X = 80
BOX_Y = 160
BOX_W = 910
BOX_H = 730

# Spacing
COL_GAP = 3
ROW_GAP = 5


# ------------------------------------------------------------
# SatGam warm colours
# ------------------------------------------------------------
# We want the visual equivalent of LaTeX xcolor tints:
#   warmY!15, warmR!15, etc.
#
# Since we are ALWAYS compositing onto a white background,
# we can use the original warm RGB values with alpha ~= 15%.
#
# 15% of 255 = 38.25, so use alpha = 38.
# When alpha-composited onto white, these match the LaTeX table
# tints very closely.

COLOR_MAP = {
    "warmY": (235, 235,   0,  38),
    "warmR": (255,  16,  64,  38),
    "warmG": ( 64, 255,   0,  38),
    "warmB": (  0, 180, 255,  38),
    "warmM": (255,  80, 255,  38),
}

COLUMN_COLOURS = [
    COLOR_MAP["warmY"],
    COLOR_MAP["warmR"],
    COLOR_MAP["warmG"],
    COLOR_MAP["warmB"],
    COLOR_MAP["warmM"],
]


# ------------------------------------------------------------
# Functions
# ------------------------------------------------------------

def make_transparent_grid_layer(canvas_size, inner_box, col_gap, row_gap):
    """
    Create a transparent RGBA image containing the 5 coloured
    Phonehenge columns and their row divisions.

    Layout:
      - 5 columns
      - 6 rows in column 1
      - 5 rows in columns 2..5
    """
    canvas_w, canvas_h = canvas_size
    out = Image.new("RGBA", (canvas_w, canvas_h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(out)

    box_x, box_y, box_w, box_h = inner_box

    if box_w <= 0 or box_h <= 0:
        raise ValueError(f"Inner box must have positive dimensions, got {inner_box}")

    col_count = 5
    total_rows = 6

    col_w = box_w / col_count
    row_h = box_h / total_rows

    for col in range(col_count):
        fill = COLUMN_COLOURS[col]

        # column 1 has 6 rows, columns 2..5 have 5 rows
        rows_in_this_col = 6 if col == 0 else 5

        for row in range(rows_in_this_col):
            x0 = box_x + col * col_w + col_gap / 2
            x1 = box_x + (col + 1) * col_w - col_gap / 2

            y0 = box_y + row * row_h + row_gap / 2
            y1 = box_y + (row + 1) * row_h - row_gap / 2

            if x1 <= x0 or y1 <= y0:
                continue

            draw.rectangle(
                [int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))],
                fill=fill
            )

    return out


def composite_over_white(img_rgba):
    """
    Composite any RGBA image over a solid white background.
    Result remains RGBA, but fully rendered against white.
    """
    white_bg = Image.new("RGBA", img_rgba.size, (255, 255, 255, 255))
    return Image.alpha_composite(white_bg, img_rgba)


def composite_grid_and_notation(grid_on_white, notation_img):
    """
    Overlay notation PNG on top of the white-backed coloured grid.
    The notation overlay is expected to be RGBA with transparency.
    """
    if grid_on_white.size != notation_img.size:
        raise ValueError(
            f"Image sizes do not match: grid={grid_on_white.size}, notation={notation_img.size}"
        )
    return Image.alpha_composite(grid_on_white, notation_img)


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

def main():
    if not TEMPLATE_PNG.exists():
        raise FileNotFoundError(f"Template PNG not found: {TEMPLATE_PNG}")

    if not NOTATION_PNG.exists():
        raise FileNotFoundError(f"Notation PNG not found: {NOTATION_PNG}")

    # Open template first (for reference / compatibility with earlier workflow)
    template_img = Image.open(TEMPLATE_PNG).convert("RGBA")

    # Open notation second; notation image defines the master canvas size
    notation_img = Image.open(NOTATION_PNG).convert("RGBA")

    print("template size:", template_img.size)
    print("notation size:", notation_img.size)

    # Resize template to match notation if needed
    if template_img.size != notation_img.size:
        print(f"Resizing template from {template_img.size} to match notation size {notation_img.size}")
        template_img = template_img.resize(notation_img.size, Image.LANCZOS)

    inner_box = (BOX_X, BOX_Y, BOX_W, BOX_H)
    print("inner box:", inner_box)
    print("col gap:", COL_GAP)
    print("row gap:", ROW_GAP)

    # Step 1: make a transparent coloured grid layer
    grid_layer = make_transparent_grid_layer(
        canvas_size=notation_img.size,
        inner_box=inner_box,
        col_gap=COL_GAP,
        row_gap=ROW_GAP,
    )

    # Step 2: render that layer onto white so it matches LaTeX !15 tints
    grid_on_white = composite_over_white(grid_layer)

    # Step 3: composite notation on top
    composite_img = composite_grid_and_notation(grid_on_white, notation_img)

    # Save outputs
    grid_on_white.save(GRID_OUT)
    composite_img.save(COMPOSITE_OUT)

    print(f"wrote grid-only PNG: {GRID_OUT}")
    print(f"wrote composite PNG: {COMPOSITE_OUT}")


if __name__ == "__main__":
    main()