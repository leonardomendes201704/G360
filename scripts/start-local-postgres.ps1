# Inicia o PostgreSQL de desenvolvimento (porta 5433, dados em .postgres-data).
# Ajuste $pgCtl se sua instalacao do PostgreSQL for outra versao/pasta.
# Uso: .\scripts\start-local-postgres.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$pgData = Join-Path $root ".postgres-data"
$log = Join-Path $root "BACKEND\postgres-local.log"
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"

if (-not (Test-Path $pgData)) {
    Write-Error "Pasta nao encontrada: $pgData"
    exit 1
}

try {
    & $pgCtl -D $pgData -l $log -o "-p 5433" start
    Write-Host "PostgreSQL local: iniciado (porta 5433)."
} catch {
    Write-Host $_.Exception.Message
    Write-Host "Se o servidor ja estava rodando, pode ignorar o erro acima."
}
