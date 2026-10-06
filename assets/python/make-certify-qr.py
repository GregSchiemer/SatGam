#!/usr/bin/env python3

from qr_common import save_labelled_qr


HOST = "192.168.1.10"
PORT = 8000

URL = (
    f"http://{HOST}:{PORT}"
    "/certify.html"
)

LABEL = (
    "2 of 3 : Certify Csound"
)

OUTPUT = (
    "assets/qr-images/"
    "qr-certify.png"
)


def main():
    path = save_labelled_qr(
        payload=URL,
        label=LABEL,
        output_path=OUTPUT,
    )

    print(
        f"Certify {path} -> {URL}"
    )


if __name__ == "__main__":
    main()