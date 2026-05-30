#!/usr/bin/env python3
"""
SatGam single-origin HTTPS + WSS server using aiohttp.

Purpose:
  Serve static SatGam files and the WebSocket clock bus from the same
  HTTPS origin.

Example:
  https://192.168.1.10:8443/leader.html?wsMode=same-origin

WebSocket endpoint:
  wss://192.168.1.10:8443/ws
"""

import argparse
import json
import mimetypes
import os
import ssl
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

from aiohttp import web, WSMsgType


mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")


LEADERS = set()
CONSORTS = set()
WS_INFO = {}


def now_utc():
    return datetime.now(timezone.utc).isoformat()


def make_ssl_context(cert_file, key_file):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile=cert_file, keyfile=key_file)
    return ctx


def clean_path(root, url_path):
    """
    Resolve a URL path safely inside root.
    """
    if url_path == "/":
        url_path = "/index.html"

    rel = unquote(url_path.lstrip("/"))
    candidate = (root / rel).resolve()

    try:
        candidate.relative_to(root)
    except ValueError:
        return None

    return candidate


def path_kind(path):
    clean = path.split("?", 1)[0]

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


def log(app, key, msg):
    if app["diag"].get(key, False):
        print(msg)


async def static_handler(request):
    app = request.app
    root = app["root"]
    path = "/" + request.match_info.get("tail", "")

    file_path = clean_path(root, path)
    if file_path is None or not file_path.exists() or not file_path.is_file():
        return web.Response(status=404, text="404 Not Found\n")

    kind = path_kind(path)
    peer = request.remote or "unknown"

    if kind and app["diag"].get("log_assets", True):
        if kind.startswith("page:"):
            role = kind.split(":", 1)[1]
            print(f"[http-client] {peer} loaded {role}.html")
        elif kind.startswith("asset:"):
            asset = kind.split(":", 1)[1]
            print(f"[asset] {peer} loaded {asset}")

            loaded = app["asset_state"].setdefault(peer, set())
            loaded.add(asset)
            has_csound = any(a.startswith("csound") for a in loaded)
            has_orc = "orc" in loaded

            reported = app["audio_reported"].setdefault(peer, False)
            if has_csound and has_orc and not reported:
                app["audio_reported"][peer] = True
                print(f"[audio-assets] {peer} loaded Csound JS + ORC")

    if app["diag"].get("log_http", False):
        print(f'{peer} "{request.method} {path}" 200')

    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    }

    content_type, _ = mimetypes.guess_type(str(file_path))
    return web.FileResponse(path=file_path, headers=headers, chunk_size=256 * 1024)


async def ws_handler(request):
    app = request.app
    ws = web.WebSocketResponse(heartbeat=30)
    await ws.prepare(request)

    peer = request.remote or "unknown"
    role = "unregistered"

    log(app, "log_ws", f"[ws] accepted connection from {peer}")

    try:
        async for msg in ws:
            if msg.type != WSMsgType.TEXT:
                continue

            try:
                data = json.loads(msg.data)
            except Exception as err:
                log(app, "log_ws", f"[ws] bad JSON from {role} {peer}: {msg.data!r} ({err})")
                continue

            kind = data.get("type")

            if kind == "register":
                role = "leader" if data.get("role") == "leader" else "consort"
                WS_INFO[ws] = {"role": role, "peer": peer}

                if role == "leader":
                    LEADERS.add(ws)
                else:
                    CONSORTS.add(ws)

                log(app, "log_ws", f"[ws] register from {peer}: {data}")
                log(
                    app,
                    "log_ws",
                    f"[ws] +{role} connected from {peer} "
                    f"(leaders={len(LEADERS)} consorts={len(CONSORTS)})"
                )
                continue

            if kind == "client-status":
                if app["diag"].get("log_client_status", True):
                    stage = data.get("stage", "unknown-stage")
                    page = data.get("page", "-")
                    role2 = data.get("role", role)
                    extra = {
                        k: v for k, v in data.items()
                        if k not in ("type", "stage", "role", "page", "userAgent")
                    }
                    msg2 = f"[client-status] {peer} {role2} {page} stage={stage}"
                    if extra:
                        msg2 += f" data={extra}"
                    print(msg2)
                continue

            if kind != "tick":
                log(app, "log_ws", f"[ws] recv from {role} {peer}: {data}")

            if role == "leader" and kind in ("config", "start", "tick", "stop", "reset"):
                payload = dict(data)
                payload["_server_t"] = now_utc()

                if CONSORTS:
                    if kind != "tick":
                        log(
                            app,
                            "log_ws",
                            f"[ws] leader -> consorts {kind} "
                            f"(count={len(CONSORTS)}) payload={payload}"
                        )

                    dead = []
                    for c in list(CONSORTS):
                        try:
                            await c.send_str(json.dumps(payload))
                        except Exception as err:
                            dead.append(c)
                            if kind != "tick":
                                log(app, "log_ws", f"[ws] relay error to consort for {kind}: {err}")

                    for c in dead:
                        CONSORTS.discard(c)
                else:
                    if kind != "tick":
                        log(app, "log_ws", f"[ws] leader sent {kind}, but no consorts are connected")

            elif role == "consort":
                if kind != "tick":
                    log(app, "log_ws", f"[ws] consort message ignored for relay: {data}")

    finally:
        LEADERS.discard(ws)
        CONSORTS.discard(ws)
        WS_INFO.pop(ws, None)

        if role != "unregistered":
            log(
                app,
                "log_ws",
                f"[ws] -{role} disconnected from {peer} "
                f"(leaders={len(LEADERS)} consorts={len(CONSORTS)})"
            )
        else:
            log(app, "log_ws", f"[ws] -unregistered disconnected from {peer}")

    return ws


def create_app(args):
    root = Path(args.root).resolve()

    app = web.Application()
    app["root"] = root
    app["asset_state"] = {}
    app["audio_reported"] = {}
    app["diag"] = {
        "log_http": args.log_http,
        "log_ws": args.log_ws,
        "log_assets": args.log_assets,
        "log_client_status": args.log_client_status,
    }

    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/{tail:.*}", static_handler)

    return app


def main():
    ap = argparse.ArgumentParser(description="SatGam single-origin HTTPS/WSS server")
    ap.add_argument("-r", "--root", default=".", help="Static root directory")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8443)
    ap.add_argument("--cert-file", default="assets/certs/SatGam.pem",
    help="TLS certificate file. Default: assets/certs/SatGam.pem",
    )

    ap.add_argument("--key-file", default="assets/certs/SatGam-key.pem",
    help="TLS private key file. Default: assets/certs/SatGam-key.pem",
    )
    ap.add_argument("--log-http", action=argparse.BooleanOptionalAction, default=False)
    ap.add_argument("--log-ws", action=argparse.BooleanOptionalAction, default=True)
    ap.add_argument("--log-assets", action=argparse.BooleanOptionalAction, default=True)
    ap.add_argument("--log-client-status", action=argparse.BooleanOptionalAction, default=True)

    args = ap.parse_args()

    root = Path(args.root).resolve()
    if not root.exists():
        raise SystemExit(f"Root does not exist: {root}")

    ssl_ctx = make_ssl_context(args.cert_file, args.key_file)
    app = create_app(args)

    print(
        "[settings] "
        f"log_http={args.log_http} "
        f"log_ws={args.log_ws} "
        f"log_assets={args.log_assets} "
        f"log_client_status={args.log_client_status}"
    )
    print(f"[https+wss] Serving {root}")
    print(f"[https+wss] https://{args.host}:{args.port}")
    print(f"[https+wss] WebSocket endpoint: wss://{args.host}:{args.port}/ws")

    web.run_app(
        app,
        host=args.host,
        port=args.port,
        ssl_context=ssl_ctx,
        print=None,
    )


if __name__ == "__main__":
    main()