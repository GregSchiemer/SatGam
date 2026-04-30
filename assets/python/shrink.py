#!/usr/bin/env python3
"""
shrink.py — create scaled-down copies of an image.

Examples:
  python3 assets/python/shrink.py assets/md-images/ph2.PNG --pct 50 25
  python3 assets/python/shrink.py assets/md-images/ph2.PNG --pct 50 --out-dir assets/md-images
"""

import argparse
from pathlib import Path
from PIL import Image


def parse_args():
    p = argparse.ArgumentParser(description="Create scaled-down copies of an image.")
    p.add_argument("src", help="Source image path (e.g., assets/md-images/ph2.PNG)")
    p.add_argument(
        "--pct",
        type=int,
        nargs="+",
        default=[50, 25],
        help="One or more percentages (e.g., --pct 50 25). Default: 50 25",
    )
    p.add_argument(
        "--out-dir",
        default=None,
        help="Output directory (default: same directory as src).",
    )
    p.add_argument(
        "--suffix",
        default="_{pct}",
        help="Filename suffix template. Default: _{pct} (e.g., ph2_50.png)",
    )
    p.add_argument(
        "--format",
        default="png",
        choices=["png", "jpg", "jpeg", "webp"],
        help="Output format/extension. Default: png",
    )
    p.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing output files (default: refuse).",
    )
    return p.parse_args()


def main():
    args = parse_args()

    src = Path(args.src)
    if not src.exists():
        raise SystemExit(f"ERROR: source file not found: {src}")

    out_dir = Path(args.out_dir) if args.out_dir else src.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(src)
    w, h = img.size

    for pct in args.pct:
        if pct <= 0:
            raise SystemExit(f"ERROR: pct must be > 0 (got {pct})")

        new_w = max(1, w * pct // 100)
        new_h = max(1, h * pct // 100)

        stem = src.stem
        suffix = args.suffix.format(pct=pct)
        out = out_dir / f"{stem}{suffix}.{args.format}"

        if out.exists() and not args.overwrite:
            raise SystemExit(f"ERROR: output exists (use --overwrite): {out}")

        resized = img.resize((new_w, new_h), Image.LANCZOS)

        # Preserve transparency when writing PNG/WebP.
        save_kwargs = {}
        if args.format.lower() in ("jpg", "jpeg"):
            # JPEG doesn't support alpha
            if resized.mode in ("RGBA", "LA"):
                resized = resized.convert("RGB")
            save_kwargs["quality"] = 95

        resized.save(out, **save_kwargs)
        print(f"wrote {out} ({new_w}x{new_h})")


if __name__ == "__main__":
    main()