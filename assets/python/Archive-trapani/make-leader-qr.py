#!/usr/bin/env python3

from qr_common import (
    LEADER_COLOR,
    save_labelled_qr,
)


HOST = "192.168.1.10"
PORT = 8443

URL = (
    f"https://{HOST}:{PORT}"
    "/leader.html"
)

LABEL = (
    "3 of 3 : Play as Leader"
)

OUTPUT = (
    "assets/qr-images/"
    "qr-leader.png"
)


def main():
    path = save_labelled_qr(
        payload=URL,
        label=LABEL,
        output_path=OUTPUT,
        fill=LEADER_COLOR,
        text_color=LEADER_COLOR,
    )

    print(
        f"Leader {path} -> {URL}"
    )


if __name__ == "__main__":
    main()