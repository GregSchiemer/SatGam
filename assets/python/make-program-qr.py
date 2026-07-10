#!/usr/bin/env python3
"""
Make a single QR code for a concert program note.

Example:
  python3 assets/python/make-program-qr.py https://anaphoria.com/musinst.html

Output:
  musinst.png
"""

import argparse
from pathlib import Path
from urllib.parse import urlparse

import qrcode


def output_name_from_url(url):
    path = urlparse(url).path
    stem = Path(path).stem

    if not stem:
        stem = "qr"

    return f"{stem}.png"


def make_qr(url):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    qr.add_data(url)
    qr.make(fit=True)

    return qr.make_image(
        fill_color="black",
        back_color="white",
    ).convert("RGB")


def main():
    ap = argparse.ArgumentParser(
        description="Generate one QR code PNG from one URL."
    )

    ap.add_argument(
        "url",
        help="The secure URL to encode, for example https://anaphoria.com/musinst.html",
    )

    ap.add_argument(
        "--outdir",
        default="~/Desktop",
        help="Output directory. Default: ~/Desktop",
    )

    args = ap.parse_args()

    parsed = urlparse(args.url)

    if parsed.scheme != "https":
        raise SystemExit("Error: the URL should begin with https://")

    if not parsed.netloc:
        raise SystemExit("Error: please provide a complete URL.")

    outdir = Path(args.outdir).expanduser()
    outdir.mkdir(parents=True, exist_ok=True)

    filename = output_name_from_url(args.url)
    outpath = outdir / filename

    img = make_qr(args.url)
    img.save(outpath)

    print("QR URL: ", args.url)
    print("Saved:  ", outpath)


if __name__ == "__main__":
    main()