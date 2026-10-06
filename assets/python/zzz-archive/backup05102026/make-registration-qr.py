#!/usr/bin/env python3

from qr_common import save_labelled_qr


HOST = "192.168.1.10"
PORT = 8000

URL = (
    f"http://{HOST}:{PORT}"
    "/registration.html"
)

LABEL = (
    "2 of 3 : Register WASM Certificate"
)

OUTPUT = (
    "assets/qr-images/"
    "qr-registration.png"
)


def main():
    path = save_labelled_qr(
        payload=URL,
        label=LABEL,
        output_path=OUTPUT,
    )

    print(
        f"Registration {path} -> {URL}"
    )


if __name__ == "__main__":
    main()