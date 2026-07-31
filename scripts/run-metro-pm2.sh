#!/usr/bin/env bash
#
# PM2 entrypoint for NFP Metro — mirrors the json2026/xml2026 VPS pattern.
# Expo host must be one of: lan | tunnel | localhost (not 0.0.0.0).
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Prefer nvm Node when available (non-interactive PM2 sessions).
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
export EXPO_NO_TELEMETRY=1
export EXPO_NO_DOCTOR=1
export CI=

# lan = listen on network interfaces (open firewall port 2000 for remote phones).
# Use tunnel instead if you prefer the same ngrok-style URL as json2026/xml2026:
#   HOST_MODE=tunnel
HOST_MODE="${HOST_MODE:-lan}"
METRO_PORT="${METRO_PORT:-2000}"

exec npx expo start --host "${HOST_MODE}" --port "${METRO_PORT}"
