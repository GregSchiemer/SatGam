#!/bin/zsh
# SatGam QR wrapper (interactive)
# Generates leader/consort QR PNGs using assets/python/make-qr.py
#
# Usage:
#   ./assets/bash/make-qr-satgam.sh
#   ./assets/bash/make-qr-satgam.sh MacBook-Pro-2.local 8000 8010
#   ./assets/bash/make-qr-satgam.sh 192.168.1.50 8000 8010 https
#
# Notes:
# - Press Enter at prompts to keep defaults/current values.
# - This script ONLY generates QR codes. It does NOT start the server.

set -euo pipefail

# --- Resolve SatGam root from script location (assets/bash -> project root) ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# --- Defaults (can be overridden by positional args or prompt input) ---
HOST_DEFAULT="MacBook-Pro-2.local"
HTTP_PORT_DEFAULT="8000"
WS_PORT_DEFAULT="8010"
SCHEME_DEFAULT="http"

HOST="${1:-$HOST_DEFAULT}"
HTTP_PORT="${2:-$HTTP_PORT_DEFAULT}"
WS_PORT="${3:-$WS_PORT_DEFAULT}"
SCHEME="${4:-$SCHEME_DEFAULT}"

# --- Helpers ---
trim() {
  local s="$1"
  # remove leading/trailing whitespace
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  print -r -- "$s"
}

prompt_default() {
  local label="$1"
  local current="$2"
  local input
  vared -p "$label [$current]: " -c input || true
  input="$(trim "${input:-}")"
  if [[ -z "$input" ]]; then
    print -r -- "$current"
  else
    print -r -- "$input"
  fi
}

is_valid_port() {
  local p="$1"
  [[ "$p" =~ ^[0-9]+$ ]] || return 1
  (( p >= 1 && p <= 65535 )) || return 1
  return 0
}

# --- Interactive prompts ---
echo "=== SatGam QR Code Generator (wrapper) ==="
echo "Project root: $ROOT_DIR"
echo

HOST="$(prompt_default "Host (.local or LAN IP)" "$HOST")"
HTTP_PORT="$(prompt_default "HTTP port (pages)" "$HTTP_PORT")"
WS_PORT="$(prompt_default "WebSocket port (clock bus)" "$WS_PORT")"
SCHEME="$(prompt_default "Scheme (http/https)" "$SCHEME")"

# --- Validate ---
if [[ "$SCHEME" != "http" && "$SCHEME" != "https" ]]; then
  echo "❌ Scheme must be 'http' or 'https' (got: $SCHEME)"
  exit 1
fi

if ! is_valid_port "$HTTP_PORT"; then
  echo "❌ Invalid HTTP port: $HTTP_PORT"
  exit 1
fi

if ! is_valid_port "$WS_PORT"; then
  echo "❌ Invalid WS port: $WS_PORT"
  exit 1
fi

# --- Preview URLs ---
LEADER_URL="${SCHEME}://${HOST}:${HTTP_PORT}/leader.html?wsPort=${WS_PORT}"
CONSORT_URL="${SCHEME}://${HOST}:${HTTP_PORT}/consort.html?wsPort=${WS_PORT}"

echo
echo "Will generate QR codes for:"
echo "  Leader : $LEADER_URL"
echo "  Consort: $CONSORT_URL"
echo

read "CONFIRM?Proceed? [Y/n]: "
CONFIRM="$(trim "${CONFIRM:-}")"
if [[ -n "$CONFIRM" && "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Cancelled."
  exit 0
fi

# --- Run generator from project root (important for default outdir path) ---
cd "$ROOT_DIR"

python3 assets/python/make-qr.py \
  --scheme "$SCHEME" \
  --host "$HOST" \
  --http-port "$HTTP_PORT" \
  --ws-port "$WS_PORT"

echo
echo "✅ QR images generated:"
echo "  $ROOT_DIR/assets/qr-images/qr-leader.png"
echo "  $ROOT_DIR/assets/qr-images/qr-consort.png"