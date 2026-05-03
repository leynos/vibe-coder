#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
STUBS_DIR="${ROOT}/.act-stubs"
ART_DIR="${ROOT}/.artifacts"

mkdir -p "${STUBS_DIR}" "${ART_DIR}"

# Stub: actions/upload-pages-artifact@v3
mkdir -p "${STUBS_DIR}/upload-pages-artifact"
cat > "${STUBS_DIR}/upload-pages-artifact/action.yml" <<'YAML'
name: "upload-pages-artifact (stub)"
description: "Local stub that copies the built site into .artifacts/"
inputs:
  path:
    description: "Directory to upload"
    required: true
runs:
  using: "composite"
  steps:
    - name: Copy artefacts locally
      shell: bash
      run: |
        set -euo pipefail
        SRC="${{ inputs.path }}"
        DEST="${GITHUB_WORKSPACE}/.artifacts/site"
        rm -rf "$DEST"
        mkdir -p "$DEST"
        cp -a "$SRC/." "$DEST/"
        echo "Stubbed upload: copied '$SRC' -> '$DEST'"
YAML

# Stub: actions/deploy-pages@v4
mkdir -p "${STUBS_DIR}/deploy-pages"
cat > "${STUBS_DIR}/deploy-pages/action.yml" <<'YAML'
name: "deploy-pages (stub)"
description: "Local stub that pretends to deploy and emits a fake URL"
outputs:
  page_url:
    description: "Fake Pages URL"
    value: "http://localhost:1313/fake-pages/"
runs:
  using: "composite"
  steps:
    - name: Show artefact summary
      shell: bash
      run: |
        echo "Stubbed deploy: serving from ${GITHUB_WORKSPACE}/.artifacts/site (not actually serving)"
YAML

echo "✓ Installed Pages stubs into ${STUBS_DIR}"
