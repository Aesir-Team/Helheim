# Fase 2 — Introduzir resolução de source

## Objetivo
Parar de espalhar a lógica “usa Nexustoons” pelo core e centralizar a escolha de origem.

## Entregas
- Criar `SourceResolverService` **ou** `ResolveMangaSourceUseCase`
- Criar estratégia de resolução para:
  - catálogo público
  - leitura do usuário autenticado
  - usuário sem conta via `installationId` (se aplicável)

## Ordem sugerida de resolução
1) `preferredSourceId` global do mangá (se elegível)  
2) source oficial elegível  
3) source preferida do usuário (privada)  
4) melhor source global ativa por prioridade/health  
5) erro de indisponibilidade  

## Regras
- source user-scoped **nunca** entra na resolução pública
- source user-scoped só é elegível se `ownerUserId` ou `ownerInstallationId` bater
- `preferredSourceId` global do `Manga` **nunca** pode apontar para source privada

## Não trocar ainda
- endpoints públicos continuam chamando os mesmos use cases
- a resolução nova entra “por trás” deles (mudança interna, sem quebrar contratos)

## Status (entregue)
- **`ResolveMangaSourceUseCase`**: ordem 1→4 conforme acima; `MangaSourceUnavailableError` quando há linhas no hub mas nenhuma elegível; **legacy** (Nexustoons + slug) quando não há mangá no BD ou zero linhas em `MangaExternalSource`.
- **`MANGA_SOURCE_RESOLUTION_LOAD_PORT`** + **`PrismaMangaSourceResolutionRepository`**: carrega `Manga` + `externalSources` + `UserMangaSourcePreference` (quando `userId`).
- **`ResolvePublicCatalogSourceUseCase`**: ponto único para ingestão global (trending/busca); hoje retorna `NEXUSTOONS`; chamado por `GetHomeFeedUseCase` e `ListMangasUseCase` antes do gateway.
- **`SyncMangaFromSourceUseCase`**: contexto `public`; usa slug canônico resolvido; falha de resolução → `syncStatus` error sem chamar o gateway.
- **`get-manga-by-slug`**: ingest inicial continua no gateway direto (sem mudança de contrato), conforme “não trocar ainda”.
- Testes: `resolve-manga-source.use-case.spec.ts`, ajustes em sync/home/list.
