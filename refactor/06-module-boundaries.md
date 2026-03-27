# Fase 6 — Refactor de boundaries de módulo

## Objetivo
Alinhar a arquitetura com a visão Midgard 2.0 sem big bang refactor.

## Entregas
- Manter módulos atuais (Auth, Catalog, Access, Lists, Progress), mas preparar novos boundaries:
  - `catalog`
  - `reading`
  - `library`
  - `access`
  - `sources`
  - `ingestion`
  - `governance`
- Curto prazo:
  - `lists` + `progress` podem continuar onde estão, mas com naming/ports alinhados ao conceito de `library`
- Médio prazo:
  - extrair `sources` e `ingestion` como módulos dedicados

## Importante
Não mover tudo de uma vez:
1) criar módulos novos
2) migrar responsabilidades aos poucos

## Status (entregue — transição sem big bang)
- Novo módulo agregador **`library`**: `src/modules/library/application/library.application.module.ts` (compõe `lists` + `progress` e exporta ambos).
- `AppModule` passa a importar `LibraryApplicationModule` no lugar de `ListsApplicationModule` + `ProgressApplicationModule` diretos.
- Módulos boundary criados:  
  - `src/modules/sources/application/sources.application.module.ts`  
  - `src/modules/ingestion/application/ingestion.application.module.ts`  
  - `src/modules/governance/application/governance.application.module.ts`
- Naming/ports de curto prazo alinhados para `library` com aliases:
  - `library-list.repository.port.ts` (`LIBRARY_LIST_REPOSITORY` -> `USER_MANGA_LIST_REPOSITORY`)
  - `library-reading-progress.repository.port.ts` (`LIBRARY_READING_PROGRESS_REPOSITORY` -> `READING_PROGRESS_REPOSITORY`)
- `lists` e `progress` continuam intactos e ativos (controllers/fluxos atuais preservados), mas agora preparados para migração gradual de responsabilidades.
- Exportes ampliados para facilitar extração progressiva:
  - `ListsApplicationModule` exporta repositório e use cases principais.
  - `ProgressApplicationModule` exporta também `GetContinueReadingUseCase`.
  - `CatalogApplicationModule` exporta `MANGA_EXTERNAL_SOURCE_REPOSITORY` para consumo futuro de `sources/ingestion`.

