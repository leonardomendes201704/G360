#Requires -Version 5.1
<#
.SYNOPSIS
  Faz `git pull` e `docker compose up -d --build` no clone G360 de um servidor Linux
  acessivel por SSH (ex.: http://10.0.0.80:8080), conforme docs/deploy-docker-linux.md.
.DESCRIPTION
  A sessao de SSH tem de ter acesso: chave em ssh-agent, ou inserir password de forma
  interactiva. Este script nao guarda credenciais.
  Se no servidor o `docker` exigir `sudo` sem NOPASSWD, o comando abre TTY: remove
  `-UseSudo` e ligue o utilizador `docker` ao grupo, ou use um terminal interactivo
  e execute o bloco "Deploys seguintes" do guia a mao.
.PARAMETER SshUser
  Nome de utilizador Linux no servidor (obrigatorio).
.PARAMETER Server
  IP ou DNS (predefinido: 10.0.0.80).
.PARAMETER RemotePath
  Directório do clone (predefinido: ~/g360).
.PARAMETER UseSudo
  Prefixa `sudo` no `docker compose` (muitas instalacoes de grupo).
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string] $SshUser,
  [string] $Server = "10.0.0.80",
  [string] $RemotePath = "~/g360",
  [switch] $UseSudo
)
$ErrorActionPreference = "Stop"
$dc = if ($UseSudo) { "sudo docker compose" } else { "docker compose" }
$cmd = "cd " + $RemotePath + " && git pull && " + $dc + " up -d --build"
Write-Host "A ligar: ${SshUser}@${Server}" -ForegroundColor Cyan
Write-Host "Remoto: $cmd" -ForegroundColor DarkGray
# Comando remoto num unico argumento (bash no servidor)
ssh -o ConnectTimeout=15 "$($SshUser)@$($Server)" "$cmd"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Concluido. Teste no browser: http://${Server}:8080/" -ForegroundColor Green
Write-Host "Health API: http://${Server}:8500/api/v1/health" -ForegroundColor DarkGray
