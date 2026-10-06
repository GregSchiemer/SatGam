#!/usr/bin/env python3

from qr_common import (
    CONSORT_COLOR,
    save_labelled_qr,
)


HOST = "192.168.1.10"
PORT = 8443

URL = (
    f"https://{HOST}:{PORT}"
    "/consort.html"
)

LABEL = (
    "3 of 3 : Play as Consort"
)

OUTPUT = (
    "assets/qr-images/"
    "qr-consort.png"
)


def main():
    path = save_labelled_qr(
        payload=URL,
        label=LABEL,
        output_path=OUTPUT,
        fill=CONSORT_COLOR,
        text_color=CONSORT_COLOR,
    )

    print(
        f"Consort {path} -> {URL}"
    )


if __name__ == "__main__":
    main()