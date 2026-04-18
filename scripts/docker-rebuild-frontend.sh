#!/usr/bin/env bash
# Reconstrói a imagem do serviço frontend (Vite build + Nginx) e recria o contentor.
# Uso: na raiz do repositório —  ./scripts/docker-rebuild-frontend.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
docker compose build frontend --no-cache
docker compose up -d frontend
echo "Frontend Docker pronto: http://localhost:8080 (após o build completar)."
