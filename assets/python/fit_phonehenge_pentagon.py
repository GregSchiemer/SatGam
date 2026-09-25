#!/usr/bin/env python3

import argparse
import json
import math
from pathlib import Path

import numpy as np


SPROCKETS = [1, 6, 11, 16, 21]
STEP_DEG = 72.0


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Fit an ideal regular pentagon to the five stored "
            "Phonehenge sprocket-centre measurements."
        )
    )

    parser.add_argument(
        "json_file",
        help="JSON produced by find_phonehenge_centre.py"
    )

    args = parser.parse_args()

    json_path = Path(args.json_file)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # ------------------------------------------------------------
    # Extract the five stored clicked midpoints.
    # ------------------------------------------------------------

    measurements_by_sprocket = {
        item["sprocket"]: item
        for item in data["measurements"]
    }

    points = []

    for sprocket in SPROCKETS:
        item = measurements_by_sprocket[sprocket]
        x, y = item["clicked_midpoint"]
        points.append(complex(x, y))

    points = np.asarray(points, dtype=np.complex128)

    # ------------------------------------------------------------
    # 1. Best-fit centre.
    #
    # For an equally spaced regular polygon, the ideal vertices sum
    # to zero, so the least-squares translation is simply the
    # arithmetic mean of the measured vertices.
    # ------------------------------------------------------------

    centre = np.mean(points)

    centred = points - centre

    # ------------------------------------------------------------
    # 2. Construct an ideal regular pentagon.
    #
    # Its starting phase is initially zero. A single complex number
    # q will supply both:
    #
    #       radius = abs(q)
    #       rotation = arg(q)
    #
    # ------------------------------------------------------------

    angles = np.radians(
        np.arange(5, dtype=float) * STEP_DEG
    )

    unit_vertices = np.exp(1j * angles)

    # ------------------------------------------------------------
    # 3. Least-squares similarity fit.
    #
    # Find q such that:
    #
    #       centred[i] ~= q * unit_vertices[i]
    #
    # Because all unit vertices have magnitude 1, this reduces to:
    # ------------------------------------------------------------

    q = np.mean(
        centred * np.conjugate(unit_vertices)
    )

    radius = abs(q)
    rotation_rad = np.angle(q)
    rotation_deg = math.degrees(rotation_rad)

    # ------------------------------------------------------------
    # 4. Generate the ideal fitted sprocket centres.
    # ------------------------------------------------------------

    fitted = centre + q * unit_vertices

    residual_vectors = points - fitted
    residuals = np.abs(residual_vectors)

    rms = math.sqrt(
        np.mean(residuals ** 2)
    )

    max_error = float(np.max(residuals))

    # ------------------------------------------------------------
    # Report
    # ------------------------------------------------------------

    print()
    print("REGULAR PENTAGON FIT")
    print("--------------------")

    print(
        f"centre      : "
        f"({centre.real:.3f}, {centre.imag:.3f})"
    )

    print(
        f"radius      : "
        f"{radius:.3f} px"
    )

    print(
        f"start angle : "
        f"{rotation_deg:.3f}°"
    )

    print()

    for i, sprocket in enumerate(SPROCKETS):

        measured = points[i]
        ideal = fitted[i]
        error = residuals[i]

        print(
            f"sprocket {sprocket:2d}  "
            f"measured=({measured.real:8.3f}, "
            f"{measured.imag:8.3f})  "
            f"fitted=({ideal.real:8.3f}, "
            f"{ideal.imag:8.3f})  "
            f"error={error:6.3f}px"
        )

    print()
    print(f"RMS position error : {rms:.3f} px")
    print(f"maximum error      : {max_error:.3f} px")
    print()

    # ------------------------------------------------------------
    # Save result alongside original JSON.
    # ------------------------------------------------------------

    output_path = json_path.with_name(
        json_path.stem + "-pentagon-fit.json"
    )

    result = {
        "source": str(json_path),
        "sprockets": SPROCKETS,
        "angular_spacing_degrees": STEP_DEG,

        "centre": {
            "x": float(centre.real),
            "y": float(centre.imag),
        },

        "radius_px": float(radius),

        "start_angle_degrees": float(rotation_deg),

        "rms_position_error_px": float(rms),
        "maximum_position_error_px": float(max_error),

        "vertices": [],
    }

    for i, sprocket in enumerate(SPROCKETS):

        result["vertices"].append(
            {
                "sprocket": sprocket,

                "measured": [
                    float(points[i].real),
                    float(points[i].imag),
                ],

                "fitted": [
                    float(fitted[i].real),
                    float(fitted[i].imag),
                ],

                "error_px": float(residuals[i]),
            }
        )

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"saved       : {output_path}")
    print()


if __name__ == "__main__":
    main()