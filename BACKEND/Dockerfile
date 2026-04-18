# G360 API — imagem para desenvolvimento / stack local Docker
# Contexto de build: raiz do repositório (ver docker-compose) para copiar rbac-matrix.json para /rbac-matrix.json
# (audit-log-module.js resolve ../../../rbac-matrix.json a partir de src/utils → raiz do monorepo).

FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY BACKEND/package.json BACKEND/package-lock.json ./
RUN npm install --legacy-peer-deps

COPY BACKEND/ ./
COPY rbac-matrix.json /rbac-matrix.json

RUN npx prisma generate

ENV NODE_ENV=development
ENV DEV_HTTP=true
ENV PORT=8500

EXPOSE 8500

CMD ["sh", "-c", "npx prisma db push --skip-generate && exec node src/app.js"]
