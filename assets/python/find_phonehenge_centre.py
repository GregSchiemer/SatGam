#!/usr/bin/env python3

from pathlib import Path
import argparse
import json
import math

import numpy as np
from PIL import Image
import matplotlib.pyplot as plt


SPROCKETS = [1, 6, 11, 16, 21]
ANGLE_STEP_DEG = 72.0


def line_angle(p1, p2):
    """
    Return orientation of the line through p1 and p2, in radians.

    Because a line has no intrinsic direction, theta and theta + pi
    represent the same axis.
    """
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]

    if dx == 0 and dy == 0:
        raise ValueError("The two clicks for a sprocket cannot be identical.")

    return math.atan2(dy, dx)


def midpoint(p1, p2):
    return np.array(
        [
            (p1[0] + p2[0]) / 2.0,
            (p1[1] + p2[1]) / 2.0,
        ],
        dtype=float,
    )


def wrap_line_angle(theta):
    """
    Normalize an unoriented line angle to [-pi/2, +pi/2).
    """
    return (theta + math.pi / 2) % math.pi - math.pi / 2


def angular_difference_line(a, b):
    """
    Smallest angular difference between two unoriented lines.
    Returned in radians, range approximately [-pi/2, +pi/2].
    """
    return wrap_line_angle(a - b)


def fit_regular_angle(measured_angles):
    """
    Fit a common angular offset theta0 such that corrected line i is

        theta_i = theta0 + i * 72 degrees

    while remembering that each line angle is equivalent modulo 180°.

    Doubling the angles removes the 180° line-direction ambiguity.
    """
    step = math.radians(ANGLE_STEP_DEG)

    reduced = []

    for i, measured in enumerate(measured_angles):
        expected_offset = i * step
        reduced.append(measured - expected_offset)

    sin_sum = sum(math.sin(2.0 * a) for a in reduced)
    cos_sum = sum(math.cos(2.0 * a) for a in reduced)

    theta0 = 0.5 * math.atan2(sin_sum, cos_sum)

    corrected = [
        theta0 + i * step
        for i in range(len(measured_angles))
    ]

    return theta0, corrected


def fit_henge_centre(midpoints, corrected_angles):
    """
    Find the point closest, in a least-squares sense, to all five
    corrected radial lines.

    Each line passes through its clicked sprocket midpoint and uses its
    mathematically corrected orientation.
    """

    rows = []
    rhs = []

    for point, theta in zip(midpoints, corrected_angles):

        # Direction along the sprocket's long axis.
        dx = math.cos(theta)
        dy = math.sin(theta)

        # Unit normal to that axis.
        nx = -dy
        ny = dx

        rows.append([nx, ny])
        rhs.append(nx * point[0] + ny * point[1])

    A = np.asarray(rows, dtype=float)
    b = np.asarray(rhs, dtype=float)

    centre, _, _, _ = np.linalg.lstsq(A, b, rcond=None)

    return centre


def perpendicular_distance(point, centre, theta):
    """
    Perpendicular distance from centre to the corrected line through point.
    """
    dx = math.cos(theta)
    dy = math.sin(theta)

    nx = -dy
    ny = dx

    delta = centre - point

    return abs(nx * delta[0] + ny * delta[1])


def intersection_radius(midpoint_value, centre):
    """
    Distance from fitted centre to a clicked sprocket midpoint.
    Useful as a secondary diagnostic.
    """
    return float(np.linalg.norm(midpoint_value - centre))


def draw_diagnostics(
    image,
    click_pairs,
    midpoints,
    measured_angles,
    corrected_angles,
    centre,
    output_file,
):
    fig, ax = plt.subplots(figsize=(10, 10))

    ax.imshow(image)

    height, width = image.shape[:2]
    line_length = max(width, height) * 0.65

    for i, sprocket in enumerate(SPROCKETS):

        p1, p2 = click_pairs[i]
        mp = midpoints[i]

        # Clicked points
        ax.plot(
            [p1[0], p2[0]],
            [p1[1], p2[1]],
            marker="o",
            linewidth=1,
        )

        # Corrected mathematical line
        theta = corrected_angles[i]

        dx = math.cos(theta)
        dy = math.sin(theta)

        x1 = mp[0] - dx * line_length
        y1 = mp[1] - dy * line_length
        x2 = mp[0] + dx * line_length
        y2 = mp[1] + dy * line_length

        ax.plot(
            [x1, x2],
            [y1, y2],
            linestyle="--",
            linewidth=1,
        )

        ax.text(
            mp[0] + 8,
            mp[1] + 8,
            str(sprocket),
            fontsize=10,
        )

    # Fitted henge centre
    ax.plot(
        centre[0],
        centre[1],
        marker="+",
        markersize=20,
        markeredgewidth=2,
    )

    ax.set_title(
        f"Fitted Phonehenge centre: "
        f"({centre[0]:.2f}, {centre[1]:.2f})"
    )

    ax.set_xlim(0, width)
    ax.set_ylim(height, 0)
    ax.set_aspect("equal")

    fig.tight_layout()
    fig.savefig(output_file, dpi=150)
    plt.close(fig)


def collect_clicks(image):
    """
    Display image and collect exactly two clicks for each of:
    sprockets 1, 6, 11, 16, 21.

    For each sprocket:
        first click  = midpoint of one short edge
        second click = midpoint of the opposite short edge
    """

    click_pairs = []

    fig, ax = plt.subplots(figsize=(11, 11))
    ax.imshow(image)
    ax.set_title(
        "Click the two short-edge midpoints for each requested sprocket"
    )

    for sprocket in SPROCKETS:

        print()
        print(
            f"Sprocket {sprocket}: "
            "click the midpoint of its two opposite short edges."
        )

        ax.set_title(
            f"Sprocket {sprocket}: click the two short-edge midpoints"
        )

        plt.draw()

        points = plt.ginput(
            2,
            timeout=-1,
            show_clicks=True,
        )

        if len(points) != 2:
            plt.close(fig)
            raise RuntimeError(
                f"Expected two clicks for sprocket {sprocket}."
            )

        click_pairs.append(points)

        p1, p2 = points

        # Show the measured axis immediately.
        ax.plot(
            [p1[0], p2[0]],
            [p1[1], p2[1]],
            marker="o",
            linewidth=1,
        )

        mp = midpoint(p1, p2)

        ax.text(
            mp[0] + 6,
            mp[1] + 6,
            str(sprocket),
            fontsize=10,
        )

        plt.draw()

    plt.close(fig)

    return click_pairs


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Find the true centre of a 25-sprocket Phonehenge using "
            "five manually identified sprocket centre-lines constrained "
            "to exact 72-degree spacing."
        )
    )

    parser.add_argument(
        "image",
        help="Phonehenge PNG image"
    )

    parser.add_argument(
        "-o",
        "--output",
        help="Diagnostic PNG output"
    )

    parser.add_argument(
        "--json",
        dest="json_output",
        help="Optional JSON file containing the fitted geometry"
    )

    args = parser.parse_args()

    image_path = Path(args.image)

    if args.output:
        diagnostic_path = Path(args.output)
    else:
        diagnostic_path = image_path.with_name(
            image_path.stem + "-centre-diagnostic.png"
        )

    if args.json_output:
        json_path = Path(args.json_output)
    else:
        json_path = image_path.with_name(
            image_path.stem + "-centre.json"
        )

    pil_image = Image.open(image_path).convert("RGBA")
    image = np.asarray(pil_image)

    width, height = pil_image.size

    print()
    print(f"image       : {image_path}")
    print(f"size        : {width} x {height}")
    print(f"sprockets   : {SPROCKETS}")
    print(f"separation  : {ANGLE_STEP_DEG} degrees")
    print()
    print("For each sprocket:")
    print("  click the midpoint of one short edge")
    print("  then the midpoint of the opposite short edge")
    print()

    click_pairs = collect_clicks(image)

    midpoints = []
    measured_angles = []

    for p1, p2 in click_pairs:
        midpoints.append(midpoint(p1, p2))
        measured_angles.append(line_angle(p1, p2))

    theta0, corrected_angles = fit_regular_angle(measured_angles)

    centre = fit_henge_centre(
        midpoints,
        corrected_angles,
    )

    residuals = []
    radii = []

    print()
    print("FITTED PHONEHENGE GEOMETRY")
    print("--------------------------")
    print(
        f"centre              : "
        f"({centre[0]:.3f}, {centre[1]:.3f})"
    )
    print(
        f"first corrected axis: "
        f"{math.degrees(theta0):.3f} degrees"
    )
    print()

    for i, sprocket in enumerate(SPROCKETS):

        measured_deg = math.degrees(
            wrap_line_angle(measured_angles[i])
        )

        corrected_deg = math.degrees(
            wrap_line_angle(corrected_angles[i])
        )

        correction_deg = math.degrees(
            angular_difference_line(
                corrected_angles[i],
                measured_angles[i],
            )
        )

        residual = perpendicular_distance(
            midpoints[i],
            centre,
            corrected_angles[i],
        )

        radius = intersection_radius(
            midpoints[i],
            centre,
        )

        residuals.append(residual)
        radii.append(radius)

        print(
            f"sprocket {sprocket:2d}  "
            f"measured={measured_deg:8.3f}°  "
            f"corrected={corrected_deg:8.3f}°  "
            f"angle correction={correction_deg:+7.3f}°  "
            f"residual={residual:6.3f}px  "
            f"radius={radius:8.3f}px"
        )

    rms = math.sqrt(
        sum(r * r for r in residuals) / len(residuals)
    )

    mean_radius = sum(radii) / len(radii)

    radius_sd = math.sqrt(
        sum((r - mean_radius) ** 2 for r in radii)
        / len(radii)
    )

    print()
    print(f"RMS line residual   : {rms:.3f} px")
    print(f"mean centre radius  : {mean_radius:.3f} px")
    print(f"radius spread       : {radius_sd:.3f} px")

    draw_diagnostics(
        image,
        click_pairs,
        midpoints,
        measured_angles,
        corrected_angles,
        centre,
        diagnostic_path,
    )

    result = {
        "image": str(image_path),
        "image_size": [width, height],
        "sprockets": SPROCKETS,
        "angular_spacing_degrees": ANGLE_STEP_DEG,
        "centre": {
            "x": float(centre[0]),
            "y": float(centre[1]),
        },
        "first_axis_degrees": float(
            math.degrees(theta0)
        ),
        "rms_line_residual_px": float(rms),
        "mean_sprocket_centre_radius_px": float(mean_radius),
        "radius_spread_px": float(radius_sd),
        "measurements": [],
    }

    for i, sprocket in enumerate(SPROCKETS):
        result["measurements"].append(
            {
                "sprocket": sprocket,
                "clicked_midpoint": [
                    float(midpoints[i][0]),
                    float(midpoints[i][1]),
                ],
                "measured_axis_degrees": float(
                    math.degrees(
                        wrap_line_angle(measured_angles[i])
                    )
                ),
                "corrected_axis_degrees": float(
                    math.degrees(
                        wrap_line_angle(corrected_angles[i])
                    )
                ),
                "line_residual_px": float(residuals[i]),
                "radius_px": float(radii[i]),
            }
        )

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print()
    print(f"diagnostic image    : {diagnostic_path}")
    print(f"geometry JSON       : {json_path}")
    print()


if __name__ == "__main__":
    main()