#!/usr/bin/env python3
"""
SatGam server: static HTTP + WebSocket clock bus + preflight checks

Mode A:
  plain HTTP + WS

Mode B:
  HTTPS + WSS (enabled with --tls)

Diagnostic additions:
  --log-http / --no-log-http
  --log-ws / --no-log-ws
  --log-user-agent / --no-log-user-agent
  --log-assets / --no-log-assets
  --log-client-status / --no-log-client-status

Browser-side milestone messages are not required yet, but this server is
ready to receive messages of type "client-status" when we add them later.
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
from urllib.parse import urlparse

import websockets


# ---- MIME fixes ----
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')


# ---- Diagnostics state ----
DIAG = {
    "log_http": True,
    "log_ws": True,
    "log_user_agent": False,
    "log_assets": True,
    "log_client_status": True,
}

HTTP_CLIENTS = {}
HTTP_CLIENTS_LOCK = threading.Lock()


def _diag_bool_arg(ap, name, default, help_text):
    """
    Add --name / --no-name using argparse.BooleanOptionalAction.
    Python 3.10 supports this.
    """
    ap.add_argument(
        f"--{name}",
        action=argparse.BooleanOptionalAction,
        default=default,
        help=help_text,
    )


def _now_utc():
    return datetime.now(timezone.utc).isoformat()


def _client_record(ip):
    with HTTP_CLIENTS_LOCK:
        rec = HTTP_CLIENTS.setdefault(ip, {
            "pages": set(),
            "assets": set(),
            "user_agent": None,
            "reported_audio_assets": False,
        })
        return rec


def _short_user_agent(ua):
    if not ua:
        return "-"
    ua = " ".join(str(ua).split())
    if len(ua) > 180:
        return ua[:177] + "..."
    return ua


def _path_kind(path):
    """
    Return a small diagnostic tag for paths we care about.
    """
    clean = urlparse(path).path

    if clean.endswith("/leader.html") or clean == "/leader.html":
        return "page:leader"

    if clean.endswith("/consort.html") or clean == "/consort.html":
        return "page:consort"

    if clean.endswith("/js/synth/csound6/csound.js"):
        return "asset:csound6-js"

    if clean.endswith("/js/synth/csound7/csound.js"):
        return "asset:csound7-js"

    if clean.endswith("/js/synth/csound.js"):
        return "asset:csound-js"

    if clean.endswith("/assets/csd/sprite-chords.orc"):
        return "asset:orc"

    return None


def _track_http_request(ip, path, code, user_agent):
    """
    Passive per-IP tracking for:
      - leader.html / consort.html launches
      - Csound JS load
      - ORC resource load

    This does not change browser behaviour.
    """
    if not DIAG.get("log_assets", True):
        return

    try:
        code_int = int(code)
    except Exception:
        code_int = 0

    kind = _path_kind(path)
    if not kind:
        return

    rec = _client_record(ip)

    with HTTP_CLIENTS_LOCK:
        if user_agent:
            rec["user_agent"] = user_agent

        if kind.startswith("page:"):
            role = kind.split(":", 1)[1]
            first_time = role not in rec["pages"]
            rec["pages"].add(role)

            if first_time:
                msg = f"[http-client] {ip} loaded {role}.html"
                if DIAG.get("log_user_agent", False):
                    msg += f" ua={_short_user_agent(rec.get('user_agent'))!r}"
                print(msg)

        elif kind.startswith("asset:") and 200 <= code_int < 300:
            asset = kind.split(":", 1)[1]
            first_time = asset not in rec["assets"]
            rec["assets"].add(asset)

            if first_time:
                print(f"[asset] {ip} loaded {asset}")

            has_csound = any(a.startswith("csound") for a in rec["assets"])
            has_orc = "orc" in rec["assets"]

            if has_csound and has_orc and not rec["reported_audio_assets"]:
                rec["reported_audio_assets"] = True

                roles = ",".join(sorted(rec["pages"])) or "unknown-page"
                msg = f"[audio-assets] {ip} loaded Csound JS + ORC ({roles})"
                if DIAG.get("log_user_agent", False):
                    msg += f" ua={_short_user_agent(rec.get('user_agent'))!r}"
                print(msg)


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
            print(
                f"⚠️ {msg} (static check). "
                f"If you see [ws] connections later, WS is wired at runtime."
            )

    print("———— End preflight ————")
    return ok


# ---- TLS helpers ----
def build_ssl_context(cert_file: str, key_file: str):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile=cert_file, keyfile=key_file)
    return ctx


# ---- HTTP / HTTPS (no-cache + optional diagnostics) ----
class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        """
        Standard library HTTP logging comes through here.
        This preserves the old log format unless --no-log-http is used.
        """
        if not DIAG.get("log_http", True):
            return

        msg = format % args
        if DIAG.get("log_user_agent", False):
            ua = _short_user_agent(self.headers.get("User-Agent", "-"))
            msg = f"{msg} ua={ua!r}"

        sys.stderr.write(
            "%s - - [%s] %s\n" % (
                self.address_string(),
                self.log_date_time_string(),
                msg
            )
        )

    def log_request(self, code='-', size='-'):
        """
        Called by SimpleHTTPRequestHandler after a request is handled.
        We use it for passive asset/page tracking, then allow log_message()
        to print the normal request line if enabled.
        """
        ip = self.client_address[0] if self.client_address else "unknown-ip"
        ua = self.headers.get("User-Agent", "-")
        _track_http_request(ip, self.path, code, ua)
        super().log_request(code, size)


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
WS_INFO = {}


def _peer_name(websocket):
    try:
        host, port = websocket.remote_address[:2]
        return f"{host}:{port}"
    except Exception:
        return "unknown-peer"


def _peer_ip(websocket):
    try:
        return websocket.remote_address[0]
    except Exception:
        return "unknown-ip"


def _ws_user_agent(websocket):
    """
    Try to read User-Agent from the WebSocket handshake.
    This varies slightly between websockets versions, so keep it forgiving.
    """
    try:
        headers = getattr(websocket, "request_headers", None)
        if headers:
            return headers.get("User-Agent")
    except Exception:
        pass

    try:
        request = getattr(websocket, "request", None)
        headers = getattr(request, "headers", None)
        if headers:
            return headers.get("User-Agent")
    except Exception:
        pass

    return None


def _ws_log(msg):
    if DIAG.get("log_ws", True):
        print(msg)


def _status_log(msg):
    if DIAG.get("log_client_status", True):
        print(msg)


def _remember_ws_info(websocket, role, peer, data=None):
    info = WS_INFO.setdefault(websocket, {})
    info["role"] = role
    info["peer"] = peer
    info["ip"] = _peer_ip(websocket)

    ua = _ws_user_agent(websocket)
    if ua:
        info["user_agent"] = ua

    if isinstance(data, dict):
        if data.get("userAgent"):
            info["user_agent"] = data.get("userAgent")
        if data.get("page"):
            info["page"] = data.get("page")
        if data.get("statusId"):
            info["status_id"] = data.get("statusId")

    return info


def _handle_client_status(websocket, role, peer, data):
    """
    Accept future browser-side milestone messages without changing the clock bus.

    Expected future message shape:
      {
        "type": "client-status",
        "stage": "audio-ready",
        "role": "leader",
        "page": "/leader.html",
        "userAgent": navigator.userAgent
      }
    """
    info = _remember_ws_info(websocket, role, peer, data)

    stage = data.get("stage") or data.get("status") or data.get("event") or "unknown-stage"
    page = data.get("page") or info.get("page") or "-"
    ip = info.get("ip", "unknown-ip")
    role2 = data.get("role") or role or info.get("role", "-")
    ua = data.get("userAgent") or info.get("user_agent")

    msg = f"[client-status] {ip} {role2} {page} stage={stage}"

    # Preserve the whole data object for useful context, but keep common fields readable.
    extra = {
        k: v for k, v in data.items()
        if k not in ("type", "stage", "status", "event", "role", "page", "userAgent")
    }
    if extra:
        msg += f" data={extra}"

    if DIAG.get("log_user_agent", False):
        msg += f" ua={_short_user_agent(ua)!r}"

    _status_log(msg)


async def ws_handler(websocket):
    role = "consort"
    peer = _peer_name(websocket)

    _ws_log(f"[ws] accepted connection from {peer}")
    
    try:
        first = await asyncio.wait_for(websocket.recv(), timeout=5)
        try:
            msg = json.loads(first)
        except Exception as e:
            _ws_log(f"[ws] bad JSON during register from {peer}: {first!r} ({e})")
            msg = {}

        if msg.get("type") == "register":
            role = "leader" if msg.get("role") == "leader" else "consort"
            _remember_ws_info(websocket, role, peer, msg)

            reg_msg = f"[ws] register from {peer}: {msg}"
            if DIAG.get("log_user_agent", False):
                ua = WS_INFO.get(websocket, {}).get("user_agent")
                reg_msg += f" ua={_short_user_agent(ua)!r}"
            _ws_log(reg_msg)
        else:
            _ws_log(f"[ws] first message from {peer} was not register: {msg}")
            _remember_ws_info(websocket, role, peer, msg)

            if msg.get("type") == "client-status":
                _handle_client_status(websocket, role, peer, msg)

    except Exception as e:
        _ws_log(f"[ws] register timeout/fallback for {peer}: {e}")
        _remember_ws_info(websocket, role, peer, None)

    group = LEADERS if role == "leader" else CONSORTS
    group.add(websocket)
    _ws_log(f"[ws] +{role} connected from {peer} (leaders={len(LEADERS)} consorts={len(CONSORTS)})")

    try:
        async for raw in websocket:
            try:
                data = json.loads(raw)
            except Exception as e:
                _ws_log(f"[ws] bad JSON from {role} {peer}: {raw!r} ({e})")
                continue

            kind = data.get("type")
            _remember_ws_info(websocket, role, peer, data)

            # Browser-side milestone diagnostics.
            # These are intentionally not relayed to consorts.
            if kind == "client-status":
                _handle_client_status(websocket, role, peer, data)
                continue

            if kind != "tick":
                _ws_log(f"[ws] recv from {role} {peer}: {data}")

            # Leader messages relayed to all consorts
            if role == "leader" and kind in ("config", "start", "tick", "stop", "reset"):
                payload = dict(data)
                payload["_server_t"] = _now_utc()

                if CONSORTS:
                    if kind != "tick":
                        _ws_log(
                            f"[ws] leader -> consorts {kind} "
                            f"(count={len(CONSORTS)}) payload={payload}"
                        )

                    results = await asyncio.gather(
                        *(c.send(json.dumps(payload)) for c in list(CONSORTS)),
                        return_exceptions=True
                    )

                    if kind != "tick":
                        for i, result in enumerate(results):
                            if isinstance(result, Exception):
                                _ws_log(f"[ws] relay error to consort[{i}] for {kind}: {result}")
                else:
                    if kind != "tick":
                        _ws_log(f"[ws] leader sent {kind}, but no consorts are connected")

            # Optional visibility for consort-originated traffic
            elif role == "consort":
                if kind != "tick":
                    _ws_log(f"[ws] consort message ignored for relay: {data}")

            else:
                if kind != "tick":
                    _ws_log(f"[ws] leader message ignored (unknown type): {data}")

    except websockets.exceptions.ConnectionClosedError as e:
        _ws_log(f"[ws] connection reset/closed for {role} {peer}: {e}")
    except websockets.exceptions.ConnectionClosedOK:
        pass
    finally:
        group.discard(websocket)
        WS_INFO.pop(websocket, None)
        _ws_log(f"[ws] -{role} disconnected from {peer} (leaders={len(LEADERS)} consorts={len(CONSORTS)})")


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


def _print_diag_settings():
    print(
        "[diag] "
        f"log_http={DIAG['log_http']} "
        f"log_ws={DIAG['log_ws']} "
        f"log_user_agent={DIAG['log_user_agent']} "
        f"log_assets={DIAG['log_assets']} "
        f"log_client_status={DIAG['log_client_status']}"
    )


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
    ap.add_argument(
        "--open-leader",
        action="store_true",
        help="Auto-open leader.html in local browser after startup"
    )

    _diag_bool_arg(
        ap,
        "log-http",
        True,
        "Enable/disable normal HTTP request status lines."
    )
    _diag_bool_arg(
        ap,
        "log-ws",
        True,
        "Enable/disable normal WebSocket connection and relay logs."
    )
    _diag_bool_arg(
        ap,
        "log-user-agent",
        False,
        "Enable/disable User-Agent display in HTTP/WS diagnostic logs."
    )
    _diag_bool_arg(
        ap,
        "log-assets",
        True,
        "Enable/disable passive tracking of page, Csound JS, and ORC loads."
    )
    _diag_bool_arg(
        ap,
        "log-client-status",
        True,
        "Enable/disable future browser-side WebSocket milestone messages."
    )

    args = ap.parse_args()

    DIAG["log_http"] = args.log_http
    DIAG["log_ws"] = args.log_ws
    DIAG["log_user_agent"] = args.log_user_agent
    DIAG["log_assets"] = args.log_assets
    DIAG["log_client_status"] = args.log_client_status

    root = os.path.abspath(args.root)
    ok = True
    if not args.no_preflight or args.preflight_only:
        ok = preflight(root)
        if args.preflight_only:
            sys.exit(0 if ok else 1)
        if not ok and args.fail_on_preflight:
            sys.exit(1)

    _print_diag_settings()

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
            print("\nShutting down...")
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
        print("\nShutting down...")


if __name__ == "__main__":
    main()