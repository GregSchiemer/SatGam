#!/usr/bin/env python3

"""
Generate a labelled Wi-Fi QR code for Satellite Gamelan.

Example:

    python3 assets/python/make-wifi-qr.py \
        --ssid Vercoe \
        --password 'your-password'

Default output:

    assets/qr-images/qr-wifi.png

Requires:

    python3 -m pip install "qrcode[pil]"
"""

from __future__ import annotations

import argparse
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont


# ---------------------------------------------------------------------------
# Wi-Fi QR payload
# ---------------------------------------------------------------------------

def escape_wifi_field(value: str) -> str:
    """
    Escape characters that have special meaning in Wi-Fi QR payloads.
    """
    replacements = {
        "\\": r"\\",
        ";": r"\;",
        ",": r"\,",
        ":": r"\:",
        '"': r"\"",
    }

    return "".join(replacements.get(char, char) for char in value)


def make_wifi_payload(
    ssid: str,
    password: str,
    security: str = "WPA",
    hidden: bool = False,
) -> str:
    """
    Construct the standard Wi-Fi QR payload.
    """
    ssid = escape_wifi_field(ssid)
    password = escape_wifi_field(password)

    hidden_field = "H:true;" if hidden else ""

    return (
        f"WIFI:"
        f"T:{security};"
        f"S:{ssid};"
        f"P:{password};"
        f"{hidden_field}"
        f";"
    )


# ---------------------------------------------------------------------------
# Font loading
# ---------------------------------------------------------------------------

def load_font(size: int):
    """
    Load a simple system font, falling back gracefully if necessary.
    """
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttf",
    ]

    for font_path in candidates:
        path = Path(font_path)
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size)
            except OSError:
                pass

    return ImageFont.load_default()


# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------

def text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def draw_centred_text(
    draw: ImageDraw.ImageDraw,
    canvas_width: int,
    y: int,
    text: str,
    font,
    fill: str = "black",
) -> int:
    width, height = text_size(draw, text, font)
    x = (canvas_width - width) // 2
    draw.text((x, y), text, font=font, fill=fill)
    return y + height


# ---------------------------------------------------------------------------
# Labelled QR image
# ---------------------------------------------------------------------------

def make_labelled_qr(
    payload: str,
    title: str,
    font_size: int,
) -> Image.Image:
    """
    Generate the Wi-Fi QR and place it on a white canvas
    with a single banner title above it.
    """

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    qr.add_data(payload)
    qr.make(fit=True)

    qr_image = qr.make_image(
        fill_color="black",
        back_color="white",
    ).convert("RGB")

    qr_width, qr_height = qr_image.size

    banner_font = load_font(font_size)

    top_margin = 24
    side_margin = 24
    title_gap = 18
    bottom_margin = 24

    temp = Image.new("RGB", (10, 10), "white")
    temp_draw = ImageDraw.Draw(temp)

    title_width, title_height = text_size(
        temp_draw,
        title,
        banner_font,
    )

    canvas_width = max(
        qr_width + (side_margin * 2),
        title_width + (side_margin * 2),
    )

    canvas_height = (
        top_margin
        + title_height
        + title_gap
        + qr_height
        + bottom_margin
    )

    canvas = Image.new(
        "RGB",
        (canvas_width, canvas_height),
        "white",
    )

    draw = ImageDraw.Draw(canvas)

    y = top_margin

    y = draw_centred_text(
        draw,
        canvas_width,
        y,
        title,
        banner_font,
    )

    y += title_gap

    qr_x = (canvas_width - qr_width) // 2
    canvas.paste(qr_image, (qr_x, y))

    return canvas


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser(
        description="Generate a labelled QR code for joining a Wi-Fi network."
    )

    ap.add_argument(
        "--ssid",
        default="Vercoe",
        help="Wi-Fi network name (default: Vercoe)",
    )

    ap.add_argument(
        "--password",
        required=True,
        help="Wi-Fi password",
    )

    ap.add_argument(
        "--security",
        default="WPA",
        choices=("WPA", "WEP", "nopass"),
        help="Wi-Fi security type (default: WPA)",
    )

    ap.add_argument(
        "--hidden",
        action="store_true",
        help="Mark the Wi-Fi network as hidden",
    )

    ap.add_argument(
        "--font-size",
        type=int,
        default=18,
        help="Banner font size",
    )

    ap.add_argument(
        "--output",
        default="assets/qr-images/qr-connect.png",
        help="Output PNG path (default: assets/qr-images/qr-connect.png)",
    )

    args = ap.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    password = "" if args.security == "nopass" else args.password

    payload = make_wifi_payload(
        ssid=args.ssid,
        password=password,
        security=args.security,
        hidden=args.hidden,
    )

    title = f"1 of 3 : Join {args.ssid} Network"

    image = make_labelled_qr(
        payload=payload,
        title=title,
        font_size=args.font_size,
    )

    image.save(output_path, format="PNG")

    print("[Wi-Fi QR]")
    print(f"  SSID      : {args.ssid}")
    print(f"  security  : {args.security}")
    print(f"  hidden    : {args.hidden}")
    print(f"  font_size : {args.font_size}")
    print(f"  size      : {image.width} x {image.height}")
    print(f"  output    : {output_path.resolve()}")


if __name__ == "__main__":
    main()