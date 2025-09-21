#!/usr/bin/env python3
"""
SatGam server: static HTTP + WebSocket clock bus + preflight checks
"""

import argparse, asyncio, json, mimetypes, os, re, sys, threading
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
        html, flags=re.I | re.S
    )
    for block in inline_blocks:
        clean = _strip_js_comments(block)
        if re.search(r"from\s+['\"][^\"']*clockTransport(\.js)?['\']", clean):
            return True, f"{page} imports clockTransport.js (inline)"

    # 2) External module scripts: <script type="module" src="...">
    srcs = re.findall(
        r"<script[^>]*type=['\"]module['\"][^>]*src=['\"]([^\"']+)['\"]",
        html, flags=re.I
    )
    for src in srcs:
        # Resolve relative to page root
        js_path = os.path.normpath(os.path.join(root, src.lstrip('/')))
        try:
            js = _read(js_path)
            clean = _strip_js_comments(js)
            if re.search(r"from\s+['\"][^\"']*clockTransport(\.js)?['\']", clean):
                return True, f"{page} imports clockTransport.js via {src}"
        except FileNotFoundError:
            # ignore missing file here; dev might build it later
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

    # 3) leader/consort import clockTransport (direct or via module src)
    for page in ("leader.html", "consort.html"):
        has_import, msg = _page_imports_clock(root, page)
        if has_import:
            print(f"✅ {msg}")
        else:
            # downgrade to a warning and clarify it's static-only
            print(f"⚠️ {msg} (static check). If you see [ws] connections later, WS is wired at runtime.")
            # not fatal

    print("———— End preflight ————")
    return ok

# ---- HTTP (no-cache) ----
class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_http(root: str, host: str, port: int):
    os.chdir(root)
    handler = partial(NoCacheHandler, directory=root)
    httpd = ThreadingHTTPServer((host, port), handler)
    print(f"[http] Serving {root} on http://{host}:{port}")
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
            if role == "leader" and kind in ("start", "tick", "stop"):
                payload = {"type": kind, "t": datetime.now(timezone.utc).isoformat()}
                if "bpm" in data:
                    payload["bpm"] = data["bpm"]
                if CONSORTS:
                    await asyncio.gather(
                        *(c.send(json.dumps(payload)) for c in list(CONSORTS)),
                        return_exceptions=True
                    )
    finally:
        group.discard(websocket)
        print(f"[ws] -{role} disconnected (leaders={len(LEADERS)} consorts={len(CONSORTS)})")

async def run_ws(host: str, port: int):
    print(f"[ws] Listening on ws://{host}:{port}")
    async with websockets.serve(ws_handler, host, port, max_size=2**20):
        await asyncio.Future()

def main():
    ap = argparse.ArgumentParser(description="SatGam HTTP + WS server")
    ap.add_argument("-r", "--root", default=".", help="Static root directory")
    ap.add_argument("--http-port", type=int, default=8000)
    ap.add_argument("--ws-port", type=int, default=8010)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--no-preflight", action="store_true", help="Skip preflight checks")
    ap.add_argument("--preflight-only", action="store_true", help="Run preflight and exit")
    ap.add_argument("--fail-on-preflight", action="store_true", help="Exit 1 if preflight fails")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    ok = True
    if not args.no_preflight or args.preflight_only:
        ok = preflight(root)
        if args.preflight_only:
            sys.exit(0 if ok else 1)
        if not ok and args.fail_on_preflight:
            sys.exit(1)

    # start HTTP in a thread
    t = threading.Thread(target=run_http, args=(root, args.host, args.http_port), daemon=True)
    t.start()

    # run WS on main loop
    try:
        asyncio.run(run_ws(args.host, args.ws_port))
    except KeyboardInterrupt:
        print("\nShutting down…")

if __name__ == "__main__":
    main()
