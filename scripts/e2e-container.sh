#!/usr/bin/env bash
# Run Playwright E2E tests inside a container via Podman.
#
# The WSL2/Fedora host cannot install the Chromium binary that
# Playwright needs, so this script delegates browser execution to the
# official Playwright container image, which ships with browsers
# pre-installed.
#
# Prerequisites:
#   - Podman (or Docker — swap `podman` for `docker` below)
#   - A running dev server on the host (e.g. `bun dev`)
#
# Usage:
#   scripts/e2e-container.sh            # run all E2E tests
#   scripts/e2e-container.sh --grep "sidebar"  # filter tests

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:5173}"

parse_base_url_endpoint() {
  local raw_url
  raw_url="${1:-$BASE_URL}"

  node --input-type=module - "$raw_url" <<'EOF'
const rawUrl = process.argv[2];

let parsedUrl;
try {
  parsedUrl = new URL(rawUrl);
} catch {
  console.error(`ERROR: Invalid PLAYWRIGHT_BASE_URL: ${rawUrl}`);
  process.exit(1);
}

if (parsedUrl.hostname === "") {
  console.error(`ERROR: PLAYWRIGHT_BASE_URL is missing a hostname: ${rawUrl}`);
  process.exit(1);
}

const defaultPortByProtocol = {
  "http:": "80",
  "https:": "443",
};
const fallbackPort = defaultPortByProtocol[parsedUrl.protocol];

if (!fallbackPort && parsedUrl.port === "") {
  console.error(`ERROR: Unsupported PLAYWRIGHT_BASE_URL protocol: ${parsedUrl.protocol}`);
  process.exit(1);
}

console.log(`${parsedUrl.hostname}\t${parsedUrl.port || fallbackPort}`);
EOF
}

# ── Pre-flight: is the dev server reachable? ──────────────────────
check_server() {
  local host port
  read -r host port < <(parse_base_url_endpoint "$BASE_URL")
  if ! timeout 1 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
    echo "ERROR: Dev server not reachable at $BASE_URL" >&2
    echo "Start it first:  bun dev" >&2
    exit 1
  fi
}

main() {
  local pw_version image

  check_server

  # Derive the image tag from the installed @playwright/test version
  # so the container's browser binaries match the test runner exactly.
  pw_version="$(node -e "console.log(require('@playwright/test/package.json').version)")"
  image="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v${pw_version}-jammy}"

  # ── Run tests inside the container ──────────────────────────────
  # --network=host: container shares the host network stack, so
  #   localhost inside the container reaches the host dev server.
  # PLAYWRIGHT_BROWSERS_PATH: tells Playwright where to find the
  #   pre-installed browsers inside the container image.
  # PLAYWRIGHT_SKIP_WEBSERVER: prevents the config from trying to
  #   launch `bun dev` inside the container (bun isn't available).
  exec podman run --rm -i \
    --network=host \
    -e "PLAYWRIGHT_BROWSERS_PATH=/ms-playwright" \
    -e "PLAYWRIGHT_SKIP_BROWSER_GC=1" \
    -e "PLAYWRIGHT_BASE_URL=$BASE_URL" \
    -e "PLAYWRIGHT_SKIP_WEBSERVER=1" \
    -v "$PROJECT_DIR:/work:Z" \
    -w /work \
    "$image" \
    npx playwright test "$@"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
