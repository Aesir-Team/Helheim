# Fase 1 — Refactor de modelagem mínima

## Objetivo
Preparar o banco para **multi-source real** sem quebrar o que existe.

## Entregas (modelagem)
- Ampliar `ExternalSourceProvider`
- Adicionar `SourceOriginType`
- Adicionar `preferredSourceId` em `Manga` (preferência **global**, apenas source global)
- Evoluir `MangaExternalSource` para suportar hub real com campos como:
  - `originType`
  - `isOfficial`
  - `isPublicEligible`
  - `isFallbackEnabled`
  - `isUserScoped`
  - `ownerUserId`
  - `ownerInstallationId`
  - `sourceName`
  - `sourceSlug`
  - `healthScore`
  - `failureCount`
  - `lastSuccessAt`
- Tornar a unique de `MangaExternalSource` mais flexível do que `@@unique([mangaId, provider])` (hoje ela limita o hub multi-source).
- Criar `UserMangaSourcePreference` (preferência privada por usuário).

## Resultado esperado
- schema continua reconhecível
- `Manga` continua canônico
- `MangaExternalSource` vira o hub real
- o sistema passa a suportar source global e source privada (user-scoped) **sem misturar** com catálogo público

