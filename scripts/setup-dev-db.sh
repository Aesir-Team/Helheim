#!/usr/bin/env bash
# Pré-requisitos do PLANO-MVP: Postgres, migrations, seed.
# Uso: na raiz do repo, com `.env` já existente (copie de `.env.example`).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Crie .env a partir de .env.example: cp .env.example .env" >&2
  exit 1
fi

echo "[setup-dev-db] Subindo PostgreSQL (docker compose)..."
docker compose up -d postgres

echo "[setup-dev-db] Aguardando Postgres aceitar conexões..."
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U "${DB_USER:-midgard}" -d "${DB_NAME:-midgard_db}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ "$i" -eq 30 ]]; then
    echo "Timeout: Postgres não respondeu. Verifique docker compose logs postgres" >&2
    exit 1
  fi
done

echo "[setup-dev-db] Aplicando migrations..."
npx prisma migrate deploy

echo "[setup-dev-db] Executando seed..."
npm run db:seed

echo "[setup-dev-db] Concluído."
