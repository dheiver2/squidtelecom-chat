#!/usr/bin/env bash
# Copia o worker do pdf.js de node_modules para /public, mantendo a versão do
# worker idêntica à do pacote pdfjs-dist instalado (evita drift de versão).
# Roda automaticamente no postinstall.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
DEST="public/pdf.worker.min.mjs"

if [ -f "$SRC" ]; then
  cp "$SRC" "$DEST"
  echo "[sync-pdf-worker] $SRC -> $DEST"
else
  echo "[sync-pdf-worker] aviso: $SRC não encontrado (pdfjs-dist instalado?)." >&2
fi
