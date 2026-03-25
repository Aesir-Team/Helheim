# Fase 4 — Isolar o gateway atual como provider formal

## Objetivo
Transformar Nexustoons em implementação de provider, não em “a fonte do produto”.

## Entregas
- Manter `ExternalMangaGatewayPort`, mas criar uma camada acima:
  - `SourceAdapter`
  - `SourceAdapterResolver`
- Mover decisões específicas de provider para a borda
- Deixar `NexustoonsMangaGateway` como adapter de uma source do tipo `external`

## Resultado
- Trocar provider no futuro fica fácil
- Criar provider parceiro ou Komga fica natural

## Status (entregue)
- **`SourceMangaAdapterPort`**: `application/ports/source-manga-adapter.port.ts` — alias tipado de `ExternalMangaGatewayPort` (um adapter por implementação na borda).
- **`SourceAdapterResolverPort`**: `application/ports/source-adapter-resolver.port.ts` — `resolveForPublicCatalogIngest()` e `resolveForProvider(provider)`.
- **`DefaultSourceAdapterResolver`**: `infrastructure/adapters/default-source-adapter.resolver.ts` — injeta `EXTERNAL_MANGA_GATEWAY` (Nexustoons); provider desconhecido → `NotFoundError`. Testes: `default-source-adapter.resolver.spec.ts`.
- **`CatalogInfrastructureModule`**: `NexustoonsMangaGateway` como provider explícito; `EXTERNAL_MANGA_GATEWAY` → `useExisting`; exporta `SOURCE_ADAPTER_RESOLVER`.
- **Use cases** passam a depender de `SOURCE_ADAPTER_RESOLVER`: `ListMangas`, `GetHomeFeed`, `GetMangaBySlug` (ingestão pública), `SyncMangaFromSource` (`resolveForProvider` a partir de `ResolveMangaSourceUseCase`).
- **Testes**: `fake-source-adapter-resolver.ts` para mocks.
- **`ExternalMangaGatewayPort`**: mantido; comentário orienta novos fluxos ao resolver.
