# Deploy G360 em Linux com Docker (rede interna / VM)

Guia para publicar **PostgreSQL + backend + frontend** num servidor Linux usando o `docker-compose.yml` da raiz do repositório. Adequado para ambiente de **homologação ou LAN** (acesso por IP, ex.: `10.0.0.x`).

---

## O que fica a correr

| Serviço      | Contentor       | Porta no host (acesso remoto) | Notas |
|-------------|-----------------|--------------------------------|--------|
| Frontend    | `g360-frontend` | **8080** → Nginx (SPA)         | URL principal para utilizadores |
| API         | `g360-backend`  | **8500**                       | O browser chama `http://<host>:8500/api/v1` (lógica em `FRONTEND/src/services/api.js`) |
| PostgreSQL  | `g360-postgres` | **127.0.0.1:5433** (predefinição) | Só localhost no servidor; não exposto à LAN por defeito |

Credenciais da BD no compose: utilizador `g360_dev`, base `g360` (ver `docker-compose.yml`).

---

## Pré-requisitos no servidor

1. **Linux** com kernel recente (ex.: Ubuntu 22.04 / 24.04).
2. **Docker Engine** e plugin **Compose** (`docker compose version`).
3. **Git** e acesso de rede para `git clone` / `git pull` e para pulls do Docker Hub e artefactos de build (`npm`).
4. Utilizador com **`sudo`** ou pertencente ao grupo **`docker`**.
5. Espaço em disco suficiente (builds: ordem de **vários GB** entre imagens, cache e volumes).

Instalação do Docker (oficial): [https://docs.docker.com/engine/install/](https://docs.docker.com/engine/install/)

---

## 1. Clonar o repositório (primeira vez)

```bash
cd ~
git clone https://github.com/leonardomendes201704/G360.git g360
cd g360
```

(Repositório privado: configurar SSH key ou token no servidor antes do `clone`.)

---

## 2. Expor portas na rede (obrigatório para aceder por IP)

O `docker-compose.yml` do repo, por defeito, publica API e UI só em **127.0.0.1** (desenvolvimento local). Para aceder a partir de outras máquinas na rede usando `http://<IP_DO_SERVIDOR>:8080`, é preciso publicar em todas as interfaces.

**Opção A — `sed` (rápido; atenção: `git pull` pode repor o ficheiro)**

Na raiz do clone (`g360`):

```bash
sed -i 's/127.0.0.1:8500:8500/8500:8500/' docker-compose.yml
sed -i 's/127.0.0.1:8080:80/8080:80/' docker-compose.yml
```

**Opção B — ficheiro de override (recomendado para não alterar o YAML principal)**

Criar `docker-compose.override.yml` na mesma pasta com apenas os mapeamentos desejados e usar o mesmo comando `docker compose up`. Validar com `docker compose config` que não há portas duplicadas.

Manter o Postgres em **`127.0.0.1:5433`** na rede de produção interna reduz exposição da BD; só o host Linux acede à porta 5433.

---

## 3. Ficheiro `.env` na raiz do repositório

O Docker Compose carrega automaticamente o ficheiro **`.env`** na pasta onde corre o compose, para substituir variáveis como `${FRONTEND_URL}`.

Criar `~/g360/.env` (ajustar o IP ou DNS real):

```env
FRONTEND_URL=http://10.0.0.80:8080
JWT_SECRET=<valor-longo-aleatorio-min-32-chars>
```

Gerar `JWT_SECRET` no servidor:

```bash
openssl rand -hex 32
```

**Não** commitar `.env` (já está coberto por `.gitignore`).

- `FRONTEND_URL`: usado pelo backend (redirects, e-mails que referenciem a UI, etc.).
- Em `NODE_ENV=development` no compose, o CORS já aceita origens em IPs privados (`10.x`, `192.168.x`, etc.) na porta do frontend.

---

## 4. Build e subida dos contentores

Na raiz do repo (onde está o `docker-compose.yml`):

```bash
sudo docker compose up -d --build
```

- A **primeira** execução demora (npm install + build Vite + imagens).
- O backend executa **`prisma db push`** ao arranque para alinhar o schema ao Postgres vazio.

Ver estado:

```bash
sudo docker compose ps
sudo docker compose logs -f backend
```

---

## 5. Dados iniciais (seed)

Após os contentores estarem **healthy / running**:

```bash
cd ~/g360
sudo docker compose exec backend npm run seed
```

No final do seed é indicado o utilizador administrador predefinido. **Alterar a password** após o primeiro login em ambiente partilhado.

---

## 6. Verificação rápida

Substituir `SEU_IP` pelo IP ou hostname do servidor:

```bash
curl -sS -o /dev/null -w "%{http_code}" http://SEU_IP:8080/
curl -sS http://SEU_IP:8500/api/v1/health
```

Esperado: **200** na página inicial e no health (com `"database":{"status":"up"}`).

**URL para utilizadores:** `http://SEU_IP:8080/`

---

## 7. Deploys seguintes (atualizar código)

```bash
cd ~/g360
git pull
# Se tiver usado sed no compose e o git repuser 127.0.0.1, voltar a aplicar o passo 2 ou usar override fixo.
sudo docker compose up -d --build
```

Se houver apenas alterações de backend/frontend sem mudar dependências, por vezes basta rebuild seletivo; para consistência, `--build` na raiz é o fluxo mais seguro.

---

## 8. PostgreSQL a partir do teu PC

Com o mapeamento predefinido `127.0.0.1:5433`, a BD **não** escuta na interface LAN. Opções:

1. **Túnel SSH:** `ssh -L 5433:127.0.0.1:5433 utilizador@SEU_IP` e ligar o cliente a `localhost:5433`.
2. **Exec no contentor:** `sudo docker compose exec g360-postgres psql -U g360_dev -d g360`.

---

## 9. Operações úteis

| Ação | Comando |
|------|---------|
| Parar stack | `sudo docker compose down` |
| Parar e apagar volumes (apaga dados da BD) | `sudo docker compose down -v` |
| Logs | `sudo docker compose logs -f --tail=200` |
| Rebuild só frontend (exemplo) | `sudo docker compose build frontend --no-cache && sudo docker compose up -d frontend` |

Volumes nomeados (dados persistentes): `g360_pgdata`, `g360_uploads` (prefixo pode incluir nome do projeto conforme versão do Compose).

---

## 10. Segurança (checklist)

- [ ] Restringir **firewall** (UFW / security group) às redes que devem aceder a **8080** e **8500**.
- [ ] Não expor **5433** à internet; preferir sempre localhost + túnel.
- [ ] Trocar password do **admin** e credenciais temporárias de SSH.
- [ ] Gerar **JWT_SECRET** forte e único por ambiente; nunca versionar em git.
- [ ] Para produção com utilizadores externos: colocar **HTTPS** (reverse proxy: Caddy, Nginx, Traefik) e rever `FRONTEND_URL`, cookies e HSTS conforme política da empresa.

---

## Referência rápida (exemplo HMG)

| Item | Valor típico |
|------|----------------|
| Pasta no servidor | `/home/<user>/g360` |
| UI | `http://<IP>:8080/` |
| API | `http://<IP>:8500/api/v1` |
| Health | `http://<IP>:8500/api/v1/health` |
| BD no host | `127.0.0.1:5433` (utilizador `g360_dev`, base `g360`) |

Este documento descreve o fluxo usado em deploy com Docker Compose na raiz do monorepo G360.
