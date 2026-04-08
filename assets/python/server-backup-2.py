#!/usr/bin/env python3
"""
SatGam server: static HTTP + WebSocket clock bus + preflight checks

Mode A:
  plain HTTP + WS

Mode B:
  HTTPS + WSS (enabled with --tls)
"""

import argparse
import asyncio
import json
import mimetypes
import os
import re
import ssl
import sys
import threading
import time
import webbrowser
from datetime import datetime, timezone
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

import websockets


# ---- MIME fixes ----
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')


# ---- Preflight (improved) ----
def _read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def _strip_js_comments(text: str) -> str:
    """Remove JS /* block */ comments, then strip // line comments."""
    no_block = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    lines = []
    for line in no_block.splitlines():
        line = line.split('//', 1)[0]
        lines.append(line)
    return '\n'.join(lines)


def _page_imports_clock(root: str, page: str):
    """
    Return (bool, message). True if page (or its <script type="module" src="...">)
    imports clockTransport(.js).
    """
    p = os.path.join(root, page)
    try:
        html = _read(p)
    except FileNotFoundError:
        return False, f"missing: {p}"

    # 1) Inline <script type="module"> blocks
    inline_blocks = re.findall(
        r"<script[^>]*type=['\"]module['\"][^>]*>(.*?)</script>",
        html,
        flags=re.I | re.S
    )
    for block in inline_blocks:
        clean = _strip_js_comments(block)
        if re.search(r"from\s+['\"][^\"']*clockTransport(\.js)?['\"]", clean):
            return True, f"{page} imports clockTransport.js (inline)"

    # 2) External module scripts: <script type="module" src="...">
    srcs = re.findall(
        r"<script[^>]*type=['\"]module['\"][^>]*src=['\"]([^\"']+)['\"]",
        html,
        flags=re.I
    )
    for src in srcs:
        js_path = os.path.normpath(os.path.join(root, src.lstrip('/')))
        try:
            js = _read(js_path)
            clean = _strip_js_comments(js)
            if re.search(r"from\s+['\"][^\"']*clockTransport(\.js)?['\"]", clean):
                return True, f"{page} imports clockTransport.js via {src}"
        except FileNotFoundError:
            pass

    return False, f"{page} did not show a direct import during preflight"


def preflight(root):
    ok = True
    print("——— Preflight ———")

    # 1) main.js should NOT auto-start
    p_main = os.path.join(root, "js", "gui", "main.js")
    try:
        txt = _read(p_main)
        clean = _strip_js_comments(txt)
        auto = re.search(r'runTimeStart\s*\(', clean)
        if auto:
            print(f"❌ auto-start found in {p_main} (remove runTimeStart())")
            ok = False
        else:
            print("✅ no auto-start in main.js")
    except FileNotFoundError:
        print(f"⚠️ missing: {p_main}")
        ok = False

    # 2) clockTransport robust wsPort parse
    p_clk = os.path.join(root, "js", "gui", "clockTransport.js")
    try:
        txt = _read(p_clk)
        if "qsPort" in txt:
            print("✅ robust wsPort parsing present (qsPort)")
        else:
            print(f"❌ {p_clk} missing robust wsPort parsing (add qsPort logic)")
            ok = False
    except FileNotFoundError:
        print(f"⚠️ missing: {p_clk}")
        ok = False

    # 3) leader/consort import clockTransport
    for page in ("leader.html", "consort.html"):
        has_import, msg = _page_imports_clock(root, page)
        if has_import:
            print(f"✅ {msg}")
        else:
            print(f"⚠️ {msg} (static check). If you see [ws] connections later, WS is wired at runtime.")

    print("———— End preflight ————")
    return ok


# ---- TLS helpers ----
def build_ssl_context(cert_file: str, key_file: str):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile=cert_file, keyfile=key_file)
    return ctx


# ---- HTTP / HTTPS (no-cache) ----
class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def run_http(root: str, host: str, port: int, ssl_ctx=None, label="http"):
    os.chdir(root)
    handler = partial(NoCacheHandler, directory=root)
    httpd = ThreadingHTTPServer((host, port), handler)

    if ssl_ctx is not None:
        httpd.socket = ssl_ctx.wrap_socket(httpd.socket, server_side=True)

    print(f"[{label}] Serving {root} on {label}://{host}:{port}")
    try:
        httpd.serve_forever()
    finally:
        httpd.server_close()


# ---- WebSocket clock bus ----
LEADERS = set()
CONSORTS = set()


async def ws_handler(websocket):
    role = "consort"
    try:
        first = await asyncio.wait_for(websocket.recv(), timeout=5)
        msg = json.loads(first)
        if msg.get("type") == "register":
            role = "leader" if msg.get("role") == "leader" else "consort"
    except Exception:
        pass

    group = LEADERS if role == "leader" else CONSORTS
    group.add(websocket)
    print(f"[ws] +{role} connected (leaders={len(LEADERS)} consorts={len(CONSORTS)})")

    try:
        async for raw in websocket:
            try:
                data = json.loads(raw)
            except Exception:
                continue

            kind = data.get("type")
            if role == "leader" and kind in ("config", "start", "tick", "stop"):
                payload = {"type": kind}
            
                if kind == "config":
                    if "mode" in data:
                        payload["mode"] = data["mode"]
                    if "sendTicks" in data:
                        payload["sendTicks"] = data["sendTicks"]
                    if "checkpointEveryBeats" in data:
                        payload["checkpointEveryBeats"] = data["checkpointEveryBeats"]
            
                if CONSORTS:
                    print(f"[ws] leader -> consorts {kind} (count={len(CONSORTS)})")
                    await asyncio.gather(
                        *(c.send(json.dumps(payload)) for c in list(CONSORTS)),
                        return_exceptions=True
                    )
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"[ws] connection reset/closed: {e}")
    except websockets.exceptions.ConnectionClosedOK:
        pass
    finally:
        group.discard(websocket)
        print(f"[ws] -{role} disconnected (leaders={len(LEADERS)} consorts={len(CONSORTS)})")


async def run_ws(host: str, port: int, ssl_ctx=None, label="ws"):
    print(f"[{label}] Listening on {label}://{host}:{port}")
    async with websockets.serve(ws_handler, host, port, max_size=2**20, ssl=ssl_ctx):
        await asyncio.Future()


def auto_open_leader(args):
    """
    Open leader.html in the local browser after HTTP/HTTPS server starts.
    This opens on the Mac running server.py (not on phones).
    """
    if not getattr(args, "open_leader", False):
        return

    # 0.0.0.0 is a bind address, not a browser destination
    browser_host = "localhost" if args.host in ("0.0.0.0", "::") else args.host

    if args.tls:
        scheme = "https"
        page_port = args.https_port
        bus_port = args.wss_port
    else:
        scheme = "http"
        page_port = args.http_port
        bus_port = args.ws_port

    qs = f"?wsPort={bus_port}" if bus_port else ""
    url = f"{scheme}://{browser_host}:{page_port}/leader.html{qs}"

    # Let HTTP/HTTPS thread start listening first
    time.sleep(0.25)

    print(f"[open] {url}")
    webbrowser.open_new_tab(url)


def main():
    ap = argparse.ArgumentParser(description="SatGam HTTP/HTTPS + WS/WSS server")
    ap.add_argument("-r", "--root", default=".", help="Static root directory")
    ap.add_argument("--http-port", type=int, default=8000)
    ap.add_argument("--ws-port", type=int, default=8010)
    ap.add_argument("--https-port", type=int, default=8443)
    ap.add_argument("--wss-port", type=int, default=8444)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--tls", action="store_true", help="Enable Mode B: HTTPS + WSS")
    ap.add_argument("--cert-file", default=None, help="TLS certificate PEM file")
    ap.add_argument("--key-file", default=None, help="TLS private key PEM file")
    ap.add_argument("--no-preflight", action="store_true", help="Skip preflight checks")
    ap.add_argument("--preflight-only", action="store_true", help="Run preflight and exit")
    ap.add_argument("--fail-on-preflight", action="store_true", help="Exit 1 if preflight fails")
    ap.add_argument("--open-leader", action="store_true", help="Auto-open leader.html in local browser after startup")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    ok = True
    if not args.no_preflight or args.preflight_only:
        ok = preflight(root)
        if args.preflight_only:
            sys.exit(0 if ok else 1)
        if not ok and args.fail_on_preflight:
            sys.exit(1)

    ssl_ctx = None
    if args.tls:
        if not args.cert_file or not args.key_file:
            print("❌ --tls requires --cert-file and --key-file")
            sys.exit(1)
        ssl_ctx = build_ssl_context(args.cert_file, args.key_file)

    # Mode A: existing HTTP + WS
    if not args.tls:
        t = threading.Thread(
            target=run_http,
            args=(root, args.host, args.http_port, None, "http"),
            daemon=True
        )
        t.start()

        auto_open_leader(args)

        try:
            asyncio.run(run_ws(args.host, args.ws_port, None, "ws"))
        except KeyboardInterrupt:
            print("\nShutting down…")
        return

    # Mode B: HTTPS + WSS
    t = threading.Thread(
        target=run_http,
        args=(root, args.host, args.https_port, ssl_ctx, "https"),
        daemon=True
    )
    t.start()

    auto_open_leader(args)

    try:
        asyncio.run(run_ws(args.host, args.wss_port, ssl_ctx, "wss"))
    except KeyboardInterrupt:
        print("\nShutting down…")


if __name__ == "__main__":
    main()