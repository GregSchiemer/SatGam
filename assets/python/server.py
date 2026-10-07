#!/usr/bin/env python3
"""
SatGam certificate-registration HTTP server.

Purpose:
  Start the HTTP registration service before players begin the
  three-stage Satellite Gamelan connection procedure:

    1. Join the Vercoe Wi-Fi network.
    2. Certify Csound WASM.
    3. Run Satellite Gamelan as Leader or Consort.

  The server provides certify.html and the files required to
  download/install the SatGam root certificate on phones
  connected to the same LAN.

This server is intentionally plain HTTP only:
  - no HTTPS / TLS
  - no WebSocket
  - no leader/consort relay
  - no application preflight checks

The optional --launch-performance-server flag launches the separate
aio_server.py HTTPS/WSS performance server in a new macOS Terminal window.

Default certification URL:
  http://<LAN-host>:8000/certify.html

Performance preparation:

  From the SatGam repository root:

    python3 assets/python/server.py --launch-performance-server

Other examples:

  Start only the HTTP certification server:

    python3 assets/python/server.py

  Open certify.html on the Mac for testing:

    python3 assets/python/server.py --open-registration

  Start both servers and open certify.html:

    python3 assets/python/server.py \
        --launch-performance-server \
        --open-registration

  Bind the HTTP server to a specific interface:

    python3 assets/python/server.py --host 127.0.0.1
"""

import argparse
import mimetypes
import os
import shlex
import subprocess
import sys
import threading
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8000
DEFAULT_AIO_PORT = 8443


# MIME types useful to SatGam and certificate-registration resources.
mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("application/x-apple-aspen-config", ".mobileconfig")
mimetypes.add_type("application/x-x509-ca-cert", ".cer")
mimetypes.add_type("application/x-pem-file", ".pem")


class NoCacheHandler(SimpleHTTPRequestHandler):
    """Standard static-file handler with cache disabled."""

    def end_headers(self):
        self.send_header(
            "Cache-Control",
            "no-cache, no-store, must-revalidate",
        )
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def registration_url(host, port):
    """Return a browser-friendly local certification URL."""
    browser_host = (
        "localhost"
        if host in ("0.0.0.0", "::")
        else host
    )

    return (
        f"http://{browser_host}:{port}"
        "/certify.html"
    )


def open_registration_page(host, port):
    """Open certify.html in the default browser."""
    time.sleep(0.25)

    url = registration_url(
        host,
        port,
    )

    print(f"[open] {url}")

    webbrowser.open_new_tab(url)


def launch_performance_server(root, port):
    """
    Launch aio_server.py in a new macOS Terminal window.
    """

    if sys.platform != "darwin":
        raise RuntimeError(
            "--launch-performance-server "
            "currently requires macOS Terminal"
        )

    repo_root = Path(root).resolve()

    aio_server = (
        repo_root
        / "assets"
        / "python"
        / "aio_server.py"
    )

    if not aio_server.is_file():
        raise FileNotFoundError(
            f"aio_server.py not found: {aio_server}"
        )

    command = (
        f"cd {shlex.quote(str(repo_root))} && "
        "python3 assets/python/aio_server.py "
        f"--port {port} -r ."
    )

    # Escape the shell command for inclusion
    # inside an AppleScript string.
    applescript_command = (
        command
        .replace("\\", "\\\\")
        .replace('"', '\\"')
    )

    script = (
        'tell application "Terminal"\n'
        f'    do script "{applescript_command}"\n'
        '    activate\n'
        'end tell'
    )

    subprocess.run(
        [
            "osascript",
            "-e",
            script,
        ],
        check=True,
    )

    print(
        "[launch] 🛜 aio_server.py requested "
        "in a new Terminal window "
        f"on port {port}"
    )


def main():

    parser = argparse.ArgumentParser(
        description=(
            "Serve SatGam certificate registration "
            "over plain HTTP."
        )
    )

    parser.add_argument(
        "-r",
        "--root",
        default=".",
        help=(
            "Static root directory "
            "(default: current directory)"
        ),
    )

    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=(
            f"Bind address "
            f"(default: {DEFAULT_HOST})"
        ),
    )

    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=(
            f"HTTP port "
            f"(default: {DEFAULT_PORT})"
        ),
    )

    parser.add_argument(
        "--open-registration",
        action="store_true",
        help=(
            "Open certify.html "
            "on the host Mac after startup"
        ),
    )

    parser.add_argument(
        "--launch-performance-server",
        action="store_true",
        help=(
            "Launch aio_server.py "
            "in a new macOS Terminal window"
        ),
    )

    parser.add_argument(
        "--aio-port",
        type=int,
        default=DEFAULT_AIO_PORT,
        help=(
            "HTTPS/WSS port passed to aio_server.py "
            f"(default: {DEFAULT_AIO_PORT})"
        ),
    )

    args = parser.parse_args()

    root = os.path.abspath(
        args.root
    )

    if not os.path.isdir(root):
        parser.error(
            f"root directory does not exist: {root}"
        )

    handler = partial(
        NoCacheHandler,
        directory=root,
    )

    try:

        httpd = ThreadingHTTPServer(
            (
                args.host,
                args.port,
            ),
            handler,
        )

    except OSError as exc:

        raise SystemExit(
            "Could not start HTTP server on "
            f"{args.host}:{args.port}: {exc}"
        ) from exc

    print(
        f"[http] 🛜 Serving {root}"
    )

    print(
        "[http] Listening on "
        f"http://{args.host}:{args.port}"
    )

    print(
        "[http] QR 1 of 3 "
        "is supplied externally"
    )

    print(
        "[http] QR 2 of 3 and QR 3 of 3 "
        "appear on "
        f"http://<LAN-host>:{args.port}/certify.html"
    )

    if args.launch_performance_server:

        try:

            launch_performance_server(
                root=root,
                port=args.aio_port,
            )

        except (
            OSError,
            RuntimeError,
            subprocess.CalledProcessError,
        ) as exc:

            httpd.server_close()

            raise SystemExit(
                "Could not launch "
                f"aio_server.py: {exc}"
            ) from exc

    else:

        print(
            "[http] Performance server not launched. "
            "Use --launch-performance-server "
            "to start aio_server.py."
        )

    if args.open_registration:

        threading.Thread(
            target=open_registration_page,
            args=(
                args.host,
                args.port,
            ),
            daemon=True,
        ).start()

    print(
        "Press Ctrl-C "
        "to stop the HTTP server."
    )

    try:

        httpd.serve_forever()

    except KeyboardInterrupt:

        print(
            "\nShutting down HTTP server..."
        )

    finally:

        httpd.server_close()


if __name__ == "__main__":
    main()