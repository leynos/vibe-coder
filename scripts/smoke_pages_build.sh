#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-dist}"

if [[ ! -d "$OUT_DIR" ]]; then
  echo "✗ ${OUT_DIR} does not exist (build probably failed)"
  exit 2
fi

if [[ ! -f "${OUT_DIR}/index.html" ]]; then
  echo "✗ ${OUT_DIR}/index.html missing"
  exit 3
fi

# naive checks for a typical Vite/Next export
if ! grep -E '<link.*href=.*\.css' -q "${OUT_DIR}/index.html"; then
  echo "! index.html contains no CSS link tags (Tailwind might have been purged away or base path is wrong)"
fi

if ! grep -E '<script.*src=.*\.js' -q "${OUT_DIR}/index.html"; then
  echo "! index.html contains no JS script tags (check build output)"
fi

# print a short summary
BYTES=$(du -sh "${OUT_DIR}" | awk '{print $1}')
FILES=$(find "${OUT_DIR}" -type f | wc -l | awk '{print $1}')
echo "✓ build artefacts present: ${FILES} files, ${BYTES} total in ${OUT_DIR}"

# show a couple of top-level files for sanity
echo "─ top-level artefacts:"
# shellcheck disable=SC2012
ls -1 "${OUT_DIR}" | sed 's/^/  · /'
