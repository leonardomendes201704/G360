# Reconstrói a imagem do serviço frontend (Vite build + Nginx) e recria o contentor.
# Uso:  .\scripts\docker-rebuild-frontend.ps1  (a partir da raiz do repo; o script muda para a raiz)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
docker compose build frontend --no-cache
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker compose up -d frontend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Frontend Docker pronto: http://localhost:8080 (após o build completar)."
