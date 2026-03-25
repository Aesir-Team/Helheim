# Fase 5 — Sync por source (não por “fonte externa única”)

## Objetivo
Preparar o sistema para múltiplas origens mantendo a regra base: **sync em background** e **banco primeiro**.

## Entregas
- Refatorar `SyncMangaFromSourceUseCase` para receber `sourceId` (ou contexto de source)
- Suportar sync de:
  - source global oficial
  - source externa aprovada
  - source privada do usuário
- Separar dois tipos de sync:
  - **catalog sync** (público)
  - **private library sync** (privado do dono)

## Regra crítica
Source privada do usuário **nunca** atualiza metadata pública do catálogo.
Sync privado só atualiza a visão daquele dono.

