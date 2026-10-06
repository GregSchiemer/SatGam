"""
Shared QR-code rendering helpers for Satellite Gamelan.

This module contains presentation code 
shared by the dedicated QR generators:

    make-wifi-qr.py
    make-connect-qr.py
    make-registration-qr.py
    make-certify-qr.py
    make-leader-qr.py
    make-consort-qr.py
"""

from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont


DEFAULT_FONT_SIZE = 18

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

LEADER_COLOR = (31, 158, 63)
CONSORT_COLOR = (0, 0, 255)


def candidate_font_paths():
    """
    Return suitable font files in preference order.
    """
    return [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Trebuchet MS.ttf",
        "/System/Library/Fonts/Supplemental/Verdana.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]


def load_label_font(size=DEFAULT_FONT_SIZE, font_path=None):
    """
    Load the label font.

    An explicit font_path may be supplied; otherwise suitable
    system fonts are tried in order.
    """
    paths = []

    if font_path:
        paths.append(font_path)

    paths.extend(candidate_font_paths())

    for path in paths:
        p = Path(path)

        if not p.exists():
            continue

        try:
            return ImageFont.truetype(
                str(p),
                size=size,
            )
        except OSError:
            continue

    try:
        return ImageFont.load_default(
            size=size
        )
    except TypeError:
        return ImageFont.load_default()


def make_qr(
    payload,
    fill=BLACK,
    back=WHITE,
    box_size=10,
    border=4,
):
    """
    Generate a QR image from a text payload.
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )

    qr.add_data(payload)
    qr.make(fit=True)

    return qr.make_image(
        fill_color=fill,
        back_color=back,
    ).convert("RGB")


def add_label(
    qr_img,
    label,
    font,
    text_color=BLACK,
):
    """
    Add a centred label above a QR code.
    """
    side_pad = 32
    gap = 8
    text_vpad = 10
    min_banner_h = 44

    temp = Image.new(
        "RGB",
        (10, 10),
        WHITE,
    )

    temp_draw = ImageDraw.Draw(temp)

    bbox = temp_draw.textbbox(
        (0, 0),
        label,
        font=font,
    )

    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    banner_h = max(
        min_banner_h,
        text_h + text_vpad * 2,
    )

    qr_w, qr_h = qr_img.size

    card_w = max(
        qr_w + side_pad * 2,
        text_w + side_pad * 2,
    )

    card_h = (
        banner_h
        + gap
        + qr_h
        + side_pad
    )

    card = Image.new(
        "RGB",
        (card_w, card_h),
        WHITE,
    )

    draw = ImageDraw.Draw(card)

    text_x = (
        card_w - text_w
    ) // 2 - bbox[0]

    text_y = (
        banner_h - text_h
    ) // 2 - bbox[1]

    draw.text(
        (text_x, text_y),
        label,
        fill=text_color,
        font=font,
    )

    qr_x = (
        card_w - qr_w
    ) // 2

    qr_y = (
        banner_h + gap
    )

    card.paste(
        qr_img,
        (qr_x, qr_y),
    )

    return card


def save_labelled_qr(
    payload,
    label,
    output_path,
    *,
    fill=BLACK,
    text_color=BLACK,
    font_size=DEFAULT_FONT_SIZE,
    font_path=None,
):
    """
    Generate, label and save a QR image.
    """
    output_path = Path(output_path)

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    font = load_label_font(
        size=font_size,
        font_path=font_path,
    )

    qr_img = make_qr(
        payload,
        fill=fill,
        back=WHITE,
    )

    card = add_label(
        qr_img,
        label,
        font,
        text_color=text_color,
    )

    card.save(
        output_path,
        format="PNG",
    )

    return output_path