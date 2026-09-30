#!/usr/bin/env python3
"""
SatGam certificate-registration HTTP server.

Purpose:
  Serve registration.html and the files needed to download/install
  the SatGam root certificate on phones connected to the same LAN.

This server is intentionally plain HTTP only:
  - no HTTPS / TLS
  - no WebSocket
  - no leader/consort relay
  - no application preflight checks

Default URL:
  http://<host>:8000/registration.html

Examples:

  From the SatGam repository root:

    python3 assets/python/server.py

  Explicit root:

    python3 assets/python/server.py --root .

  Open registration.html automatically on the Mac running the server:

    python3 assets/python/server.py --open-registration

  Bind to a different interface if needed:

    python3 assets/python/server.py --host 127.0.0.1
"""

import argparse
import mimetypes
import os
import threading
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8000


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
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def registration_url(host, port):
    """Return a browser-friendly local registration URL."""
    browser_host = "localhost" if host in ("0.0.0.0", "::") else host
    return f"http://{browser_host}:{port}/registration.html"


def open_registration_page(host, port):
    time.sleep(0.25)
    url = registration_url(host, port)
    print(f"[open] {url}")
    webbrowser.open_new_tab(url)


def main():
    parser = argparse.ArgumentParser(
        description="Serve SatGam certificate registration over plain HTTP."
    )

    parser.add_argument(
        "-r",
        "--root",
        default=".",
        help="Static root directory (default: current directory)",
    )

    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=f"Bind address (default: {DEFAULT_HOST})",
    )

    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"HTTP port (default: {DEFAULT_PORT})",
    )

    parser.add_argument(
        "--open-registration",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Open registration.html in the local browser after startup",
    )
    
    args = parser.parse_args()

    root = os.path.abspath(args.root)

    if not os.path.isdir(root):
        parser.error(f"root directory does not exist: {root}")

    handler = partial(
        NoCacheHandler,
        directory=root,
    )

    try:
        httpd = ThreadingHTTPServer(
            (args.host, args.port),
            handler,
        )
    except OSError as exc:
        raise SystemExit(
            f"Could not start HTTP server on {args.host}:{args.port}: {exc}"
        ) from exc

    print(f"[http] ✅ Serving {root}")
    print(f"[http] Listening on http://{args.host}:{args.port}")
    print(
        "[http] Registration page: "
        f"http://<LAN-host>:{args.port}/registration.html"
    )
    print("Press Ctrl-C to stop.")

    if args.open_registration:
        threading.Thread(
            target=open_registration_page,
            args=(args.host, args.port),
            daemon=True,
        ).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
