#!/usr/bin/env bash
#
# NFP — remote development deploy (VPS + PM2 + Expo Metro)
#
# Idempotent. Safe order:
#   1) sync git to origin/main
#   2) npm install (on failure: abort, do NOT touch PM2)
#   3) start/restart Metro via PM2
#   4) health-check http://localhost:2000
#
# Usage (on the VPS, as the SSH deploy user):
#   bash "$HOME/apps/nfp/scripts/deploy.sh"
#
set -euo pipefail

APP_NAME="nfp-metro"
APP_DIR="${APP_DIR:-$HOME/apps/nfp}"
LOG_DIR="${LOG_DIR:-$HOME/logs/nfp}"
REPO_URL="${REPO_URL:-https://github.com/romainrun/NFP.git}"
BRANCH="${BRANCH:-main}"
METRO_PORT="${METRO_PORT:-2000}"
HEALTH_URL="http://127.0.0.1:${METRO_PORT}"
HEALTH_RETRIES="${HEALTH_RETRIES:-18}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-5}"

log() {
  printf '[nfp-deploy] %s\n' "$*"
}

fail() {
  printf '[nfp-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

# Non-interactive SSH sessions often skip .bashrc.
# Load common Node/PM2 locations used on VPS images.
load_runtime_path() {
  export PATH="/usr/local/bin:/usr/bin:$HOME/.local/bin:$PATH"

  # nvm
  if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh"
  fi

  # fnm
  if [[ -s "$HOME/.local/share/fnm/fnm" ]] || command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --shell bash 2>/dev/null)" || true
  fi

  # Login profiles (ignore interactive-only failures)
  [[ -f /etc/profile ]] && . /etc/profile 2>/dev/null || true
  [[ -f "$HOME/.profile" ]] && . "$HOME/.profile" 2>/dev/null || true
  [[ -f "$HOME/.bash_profile" ]] && . "$HOME/.bash_profile" 2>/dev/null || true
  [[ -f "$HOME/.bashrc" ]] && . "$HOME/.bashrc" 2>/dev/null || true

  # Global npm prefix bins (pm2, expo often land here)
  if command -v npm >/dev/null 2>&1; then
    local npm_bin
    npm_bin="$(npm bin -g 2>/dev/null || true)"
    [[ -n "${npm_bin}" ]] && export PATH="${npm_bin}:$PATH"
  fi
}

ensure_layout() {
  mkdir -p "$(dirname "$APP_DIR")" "$LOG_DIR"

  if [[ ! -d "$APP_DIR/.git" ]]; then
    log "First deploy — cloning ${REPO_URL} into ${APP_DIR}"
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  fi

  # Avoid "dubious ownership" when Actions SSH user != repo owner.
  git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
}

sync_repository() {
  cd "$APP_DIR"

  log "Fetching origin/${BRANCH}"
  git remote set-url origin "$REPO_URL"
  git fetch --prune origin "$BRANCH" || fail "git fetch failed — aborting (Metro untouched)"

  log "Hard reset to origin/${BRANCH} (detached HEAD safe)"
  git checkout -B "$BRANCH" "origin/${BRANCH}" || fail "git checkout failed — aborting"
  git reset --hard "origin/${BRANCH}" || fail "git reset failed — aborting"
  git clean -fd -e node_modules -e .expo || true

  log "Now at $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"
}

install_dependencies() {
  cd "$APP_DIR"

  log "Installing dependencies (npm install — keeps node_modules, no cache clear)"
  # Do not restart Metro if this fails.
  if ! npm install --no-audit --no-fund; then
    fail "npm install failed — Metro left running with previous build"
  fi
}

ensure_pm2_startup() {
  # Best-effort: persist process list across reboot. Full `pm2 startup`
  # systemd unit usually needs a one-time root setup (see docs/DEPLOYMENT.md).
  if ! pm2 describe "$APP_NAME" >/dev/null 2>&1 && ! pm2 ls >/dev/null 2>&1; then
    log "PM2 not responding — is it installed for this user?"
  fi

  # Save current process list when we can; ignore failures on locked systems.
  pm2 save --force >/dev/null 2>&1 || pm2 save >/dev/null 2>&1 || true
}

start_or_restart_metro() {
  cd "$APP_DIR"

  mkdir -p "$LOG_DIR"

  if [[ ! -f "$APP_DIR/ecosystem.config.js" ]]; then
    fail "ecosystem.config.js missing after sync"
  fi

  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    log "Restarting existing PM2 process: ${APP_NAME}"
    # restart keeps the process entry; avoids a gap that would drop Expo clients longer than needed
    pm2 restart ecosystem.config.js --only "$APP_NAME" --update-env \
      || fail "pm2 restart failed"
  else
    log "Creating PM2 process: ${APP_NAME}"
    pm2 start ecosystem.config.js --only "$APP_NAME" \
      || fail "pm2 start failed"
  fi

  ensure_pm2_startup
  pm2 status "$APP_NAME" || true
}

health_check() {
  log "Waiting for Metro at ${HEALTH_URL}"
  local attempt=1
  while (( attempt <= HEALTH_RETRIES )); do
    # Metro answers with 200 on / or status endpoints once listening.
    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1 \
      || curl -fsS --max-time 5 "${HEALTH_URL}/status" >/dev/null 2>&1; then
      log "Health check OK (attempt ${attempt}/${HEALTH_RETRIES})"
      return 0
    fi
    log "Metro not ready yet (${attempt}/${HEALTH_RETRIES}) — sleeping ${HEALTH_SLEEP_SECONDS}s"
    sleep "$HEALTH_SLEEP_SECONDS"
    attempt=$((attempt + 1))
  done

  log "Dumping recent Metro logs"
  pm2 logs "$APP_NAME" --lines 80 --nostream || true
  fail "Metro health check failed on ${HEALTH_URL}"
}

main() {
  load_runtime_path

  log "Starting NFP development deploy"
  log "USER=$(whoami) HOME=$HOME APP_DIR=$APP_DIR LOG_DIR=$LOG_DIR"
  log "node=$(command -v node || echo missing) npm=$(command -v npm || echo missing) pm2=$(command -v pm2 || echo missing)"

  require_cmd git
  require_cmd curl
  require_cmd node
  require_cmd npm
  require_cmd npx
  require_cmd pm2

  ensure_layout
  sync_repository
  install_dependencies
  start_or_restart_metro
  health_check
  log "Deploy finished successfully"
}

main "$@"
