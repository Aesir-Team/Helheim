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

## Status (entregue — núcleo)
- **`SyncMangaFromSourceInput`**: `kind: 'catalog' | 'private_library'`; atalho `execute(slug)` ≡ `{ kind: 'catalog', slug }`.
- **`SyncResult`**: inclui `kind` e, em biblioteca privada, `catalogWritesSkipped: true` quando não há escrita em `Manga`/`Chapter` canônicos.
- **`catalog`**: fluxo anterior (resolve público, upsert mangá/capítulos, `Manga.syncStatus`).
- **`private_library`**: exige `sourceId` + `actorUserId` ou `installationId`; valida `MangaExternalSource` **user-scoped** e ownership (`public-catalog-source.policy`); cooldown e `syncStatus` por **linha** em `manga_external_sources`; chama adapter só para checar/remoto; **`markSourceSyncSuccess`** na source; **não** chama `upsertBySlug`, `linkCategories`, `mergeReportedChapterCount`, `chapterRepo.upsert*`, `applyFreeTier` (persistência de capítulos privados = fase seguinte).
- **Port** `MANGA_EXTERNAL_SOURCE_REPOSITORY` + **`PrismaMangaExternalSourceRepository`**.
- **Testes** em `sync-manga-from-source.use-case.spec.ts` (ramo `private_library`).

## Próximo passo (fora deste escopo mínimo)
- Persistir páginas/capítulos só para o dono (tabela ou storage privado) e UI/HTTP para disparar `private_library` sync.