# G360 SPA — build estático servido por Nginx
# Contexto de build: raiz do repositório (ver docker-compose) para incluir rbac-matrix.json na raiz.
# Sem VITE_API_URL no build: o cliente usa o mesmo hostname do browser na porta 8500 (ver src/services/api.js).

FROM node:20-alpine AS build
WORKDIR /app

COPY FRONTEND/package.json FRONTEND/package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY FRONTEND/ ./
# RoleModal.jsx resolve ../../../../rbac-matrix.json = ficheiro na raiz do monorepo (acima de FRONTEND).
COPY rbac-matrix.json /rbac-matrix.json
# ChangelogTab.jsx resolve ../../../../docs/CHANGELOG.md a partir de /app/src/components/config,
# o que no container aponta para /docs/CHANGELOG.md.
COPY docs/CHANGELOG.md /docs/CHANGELOG.md

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY FRONTEND/nginx.docker.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
