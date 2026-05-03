#!/usr/bin/env bash
# Dispatch E2E tests: host Playwright on Ubuntu, container on Fedora.
#
# Ubuntu (and Debian-family) can install Chromium natively via
# `npx playwright install`, so tests run directly on the host.
# Fedora/WSL2 cannot, so tests delegate to a Podman container.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
OS_ID="$(. /etc/os-release 2>/dev/null && echo "$ID" || echo "unknown")"

case "$OS_ID" in
  ubuntu|debian|linuxmint|pop)
    exec playwright test "$@"
    ;;
  *)
    exec "$SCRIPT_DIR/e2e-container.sh" "$@"
    ;;
esac
