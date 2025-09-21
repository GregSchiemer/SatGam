#!/usr/bin/env python3
"""
Make two QR codes for SatGam:

- assets/qr-images/qr-leader.png   -> http://<host>:<http_port>/leader.html[?wsPort=<ws_port>]
- assets/qr-images/qr-consort.png  -> http://<host>:<http_port>/consort.html[?wsPort=<ws_port>]

Examples:
  python3 assets/python/make-qr.py --host MacBook-Pro-2.local --http-port 8000 --ws-port 8010
  python3 assets/python/make-qr.py --host 192.168.1.50 --http-port 8000
"""
import argparse, socket
from pathlib import Path
import qrcode
from PIL import Image, ImageDraw, ImageFont

def guess_host():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]; s.close()
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

def add_label(qr_img, role, palette):
    pad = 32
    banner_h = 72
    W, H = qr_img.size
    card_w = W + pad*2
    card_h = H + pad*2 + banner_h
    card = Image.new("RGB", (card_w, card_h), palette["bg"])
    draw = ImageDraw.Draw(card)
    # banner
    draw.rectangle([0, 0, card_w, banner_h], fill=palette["banner_bg"])
    font = ImageFont.load_default()
    text = role.upper()
    tw, th = draw.textbbox((0, 0), text, font=font)[2:]
    draw.text(((card_w - tw)//2, (banner_h - th)//2), text, fill=palette["banner_fg"], font=font)
    # qr
    card.paste(qr_img, (pad, banner_h + pad))
    return card

def main():
    ap = argparse.ArgumentParser(description="Generate SatGam QR codes (leader/consort)")
    ap.add_argument("--scheme", default="http", choices=["http", "https"])
    ap.add_argument("--host", default=None, help="LAN host or .local hostname visible to phones")
    ap.add_argument("--http-port", type=int, default=8000, help="HTTP server port (pages)")
    ap.add_argument("--ws-port", type=int, default=None, help="Optional WebSocket port to append as ?wsPort=")
    ap.add_argument("--outdir", default="assets/qr-images", help="Output directory for PNGs")
    args = ap.parse_args()

    host = args.host or guess_host()
    base = f"{args.scheme}://{host}:{args.http_port}"
    suffix = f"?wsPort={args.ws_port}" if args.ws_port else ""

    outdir = Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)

    # Colors (safe for scanning)
    BLUE_DARK  = (0, 70, 160)
    BLUE_LIGHT = (220, 235, 255)
    WHITE      = (255, 255, 255)
    BLACK      = (0, 0, 0)

    # Leader: dark blue modules on white, blue banner
    leader_url  = f"{base}/leader.html{suffix}"
    leader_qr   = mk_qr(leader_url, fill=BLUE_DARK, back=WHITE)
    leader_card = add_label(leader_qr, "Leader", palette={"bg": WHITE, "banner_bg": BLUE_DARK, "banner_fg": WHITE})
    leader_path = outdir / "qr-leader.png"
    leader_card.save(leader_path)

    # Consort: black modules on light blue, blue banner
    consort_url  = f"{base}/consort.html{suffix}"
    consort_qr   = mk_qr(consort_url, fill=BLACK, back=BLUE_LIGHT)
    consort_card = add_label(consort_qr, "Consort", palette={"bg": BLUE_LIGHT, "banner_bg": BLUE_DARK, "banner_fg": WHITE})
    consort_path = outdir / "qr-consort.png"
    consort_card.save(consort_path)

    print("Base URL:", base)
    if args.ws_port:
        print("WebSocket port:", args.ws_port)
    print("Leader  →", leader_path,  "->", leader_url)
    print("Consort →", consort_path, "->", consort_url)
    print("Scan from phones while the server is running on the same Wi-Fi.")

if __name__ == "__main__":
    main()
