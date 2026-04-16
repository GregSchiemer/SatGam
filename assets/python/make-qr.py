#!/usr/bin/env python3
"""
Make two QR codes for SatGam:

- assets/qr-images/qr-leader.png   -> <scheme>://<host>:<http_port>/leader.html[?wsPort=<ws_port>]
- assets/qr-images/qr-consort.png  -> <scheme>://<host>:<http_port>/consort.html[?wsPort=<ws_port>]

Examples:
  python3 assets/python/make-qr.py --host 192.168.1.10 --http-port 8000 --ws-port 8010
  python3 assets/python/make-qr.py --scheme https --host 192.168.1.10 --http-port 8000 --ws-port 8010
  python3 assets/python/make-qr.py --scheme https --host MacBook-Pro-2.local --http-port 8443 --ws-port 8444
"""

import argparse
import socket
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont


def guess_host():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return f"{socket.gethostname().split('.')[0]}.local"


def mk_qr(url, fill, back):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color=fill, back_color=back).convert("RGB")


def candidate_font_paths():
    """
    Prefer explicit .ttf fonts over .ttc collections.
    This avoids accidentally selecting an unexpected face
    from a font collection.
    """
    return [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Trebuchet MS.ttf",
        "/System/Library/Fonts/Supplemental/Verdana.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]


def load_label_font(size, font_path=None):
    paths = []

    if font_path:
        paths.append(font_path)

    paths.extend(candidate_font_paths())

    for path in paths:
        p = Path(path)
        if not p.exists():
            continue
        try:
            font = ImageFont.truetype(str(p), size=size)
            print("QR font file:", p)
            try:
                print("QR font name:", font.getname())
            except Exception:
                pass
            return font
        except OSError:
            continue

    print("QR font fallback: ImageFont.load_default()")
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def add_label(qr_img, role, palette, font):
    pad = 32

    print("LABEL ROLE =", repr(role))

    # Measure text first so banner height can fit font size cleanly.
    temp = Image.new("RGB", (10, 10), palette["bg"])
    temp_draw = ImageDraw.Draw(temp)
    bbox = temp_draw.textbbox((0, 0), role, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    banner_h = max(72, text_h + 28)

    W, H = qr_img.size
    card_w = W + pad * 2
    card_h = H + pad * 2 + banner_h

    card = Image.new("RGB", (card_w, card_h), palette["bg"])
    draw = ImageDraw.Draw(card)

    # Banner
    draw.rectangle([0, 0, card_w, banner_h], fill=palette["banner_bg"])

    # Center text robustly using the bbox.
    text_x = (card_w - text_w) // 2 - bbox[0]
    text_y = (banner_h - text_h) // 2 - bbox[1]
    draw.text((text_x, text_y), role, fill=palette["banner_fg"], font=font)

    # QR
    card.paste(qr_img, (pad, banner_h + pad))
    return card


def main():
    ap = argparse.ArgumentParser(description="Generate SatGam QR codes (leader/consort)")
    ap.add_argument("--scheme", default="http", choices=["http", "https"],
                    help="URL scheme for the page in the QR code")
    ap.add_argument("--host", default=None,
                    help="LAN host or .local hostname visible to phones")
    ap.add_argument("--http-port", type=int, default=8000,
                    help="HTTP/HTTPS server port for the page URL")
    ap.add_argument("--ws-port", type=int, default=None,
                    help="Optional WebSocket port to append as ?wsPort=")
    ap.add_argument("--outdir", default="assets/qr-images",
                    help="Output directory for PNGs")
    ap.add_argument("--font-size", type=int, default=18,
                    help="Banner font size")
    ap.add_argument("--font-path", default=None,
                    help="Optional explicit font file path for the banner label")
    args = ap.parse_args()

    host = args.host or guess_host()
    base = f"{args.scheme}://{host}:{args.http_port}"
    suffix = f"?wsPort={args.ws_port}" if args.ws_port else ""

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    font = load_label_font(args.font_size, args.font_path)

    # Colors chosen to remain scan-safe.
    AQUA_LIGHT = (31, 158, 63)
    BLUE_DARK = (0, 0, 255)
    WHITE = (255, 255, 255)
    BLACK = (0, 0, 0)

    # Leader
    leader_url = f"{base}/leader.html{suffix}"
    leader_qr = mk_qr(leader_url, fill=AQUA_LIGHT, back=WHITE)
    leader_card = add_label(
        leader_qr,
        "Phonehenge - Leader",
        palette={"bg": WHITE, "banner_bg": AQUA_LIGHT, "banner_fg": WHITE},
        font=font,
    )
    leader_path = outdir / "qr-leader.png"
    leader_card.save(leader_path)

    # Consort
    consort_url = f"{base}/consort.html{suffix}"
    consort_qr = mk_qr(consort_url, fill=BLUE_DARK, back=WHITE)
    consort_card = add_label(
        consort_qr,
        "Phonehenge - Consort",
        palette={"bg": WHITE, "banner_bg": BLUE_DARK, "banner_fg": WHITE},
        font=font,
    )
    consort_path = outdir / "qr-consort.png"
    consort_card.save(consort_path)

    print("Base URL:", base)
    if args.ws_port:
        print("WebSocket port:", args.ws_port)
    print("Font size:", args.font_size)
    if args.font_path:
        print("Font path override:", args.font_path)
    print("Leader  →", leader_path, "->", leader_url)
    print("Consort →", consort_path, "->", consort_url)
    print("Scan from phones while the server is running on the same Wi-Fi.")


if __name__ == "__main__":
    main()