#!/usr/bin/env bash
set -euo pipefail

REPO="mamoonk/omni-router"
APP_NAME="omni-router"
BRANCH="master"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▸ $*${RESET}"; }
success() { echo -e "${GREEN}✔ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
die()     { echo -e "${RED}✖ $*${RESET}" >&2; exit 1; }

OS="$(uname -s)"

command -v git  >/dev/null 2>&1 || die "git is required but not found."
command -v node >/dev/null 2>&1 || die "Node.js is required but not found."
command -v npm  >/dev/null 2>&1 || die "npm is required but not found."

NODE_VER="$(node -v | sed 's/v//' | cut -d. -f1)"
[ "$NODE_VER" -ge 18 ] || die "Node.js 18+ is required (found v$(node -v))."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

info "Downloading ${APP_NAME}…"
git clone --depth=1 --branch "$BRANCH" "https://github.com/${REPO}.git" "$TMP_DIR"
cd "$TMP_DIR"

info "Installing dependencies…"
npm install

info "Building application…"
npm run build

INSTALL_DIR=""
case "$OS" in
  Darwin)
    INSTALL_DIR="/Applications/${APP_NAME}.app"
    npx electron-builder --mac --config.extraMetadata.main=out/main/index.js 2>/dev/null || true
    if [ -f "release/*.dmg" ]; then
      success "macOS DMG built at $(echo release/*.dmg)"
    fi
    ;;
  Linux)
    npx electron-builder --linux --config.extraMetadata.main=out/main/index.js 2>/dev/null || true
    if ls release/*.AppImage 2>/dev/null; then
      success "Linux AppImage built at $(echo release/*.AppImage)"
    fi
    ;;
esac

success "${APP_NAME} installed successfully!"
echo ""
echo "  ${BOLD}Run in dev mode:${RESET}  npm run dev"
echo "  ${BOLD}Run web server:${RESET}  npm run build:web && npm run start:web"
echo "  ${BOLD}Run preview:${RESET}    npm run preview"
