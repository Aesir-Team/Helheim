# Fase 3 — Separar público vs privado no domínio

## Objetivo
Impedir contaminação do catálogo público do Midgard por sources privadas do usuário.

## Entregas
- Regra explícita no domínio:
  - **queries públicas** usam apenas:
    - `isUserScoped = false`
    - `isPublicEligible = true`
    - `isActive = true`
  - **queries privadas** exigem ownership (`ownerUserId` / `ownerInstallationId`)
- Revisar repositórios/query builders para garantir que:
  - home
  - trending
  - recommended
  - latest updates
  - busca pública
  - estatísticas globais
  **nunca** considerem source privada.

## Contexto do runtime atual
Hoje discovery/home usa BD + ingestão externa + leitura via Prisma.  
Essa separação precisa existir antes de expandir providers.

## Resultado
Midgard passa a ter:
- catálogo público
- biblioteca privada do usuário
Sem misturar os dois.

## Status (entregue)
- **Domínio:** `src/shared/domain/public-catalog-source.policy.ts` — `PUBLIC_CATALOG_EXTERNAL_SOURCE_PREDICATE`, `isEligibleForPublicCatalogSource`, `mangaPublicCatalogVisibilityWhere()` (mangá listável no catálogo público se não tem linhas no hub **ou** tem pelo menos uma fonte com o predicado), `isUserScopedSourceOwnedByActor` para contexto privado. Testes: `public-catalog-source.policy.spec.ts`.
- **`PrismaMangaRepository`:** `list`, `listBySlugs` e `findBySlug` aplicam escopo de catálogo público (`withPublicCatalogScope`). Cobre home (recommended, latest), busca e detalhe público. `findByIdForListItem`, sync e upsert **não** usam esse filtro (listas/sync internos).
- **`PrismaMangaSourceResolutionRepository`:** com `userId == null`, `externalSources` carrega só linhas que satisfazem o predicado público (defesa em profundidade para sync/resolução pública).
- **`ResolveMangaSourceUseCase`:** globais em contexto `public` usam `isEligibleForPublicCatalogSource`; ownership de fonte user-scoped delega a `isUserScopedSourceOwnedByActor`.
- **Métricas globais:** `views`/`rating` no `Manga` continuam agregados canônicos do registro; não há query por `MangaExternalSource` para ranking hoje — quando existir, reutilizar o mesmo predicado.
