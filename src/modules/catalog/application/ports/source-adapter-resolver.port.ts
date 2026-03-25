import type { SourceMangaAdapterPort } from './source-manga-adapter.port';

export const SOURCE_ADAPTER_RESOLVER = Symbol('SOURCE_ADAPTER_RESOLVER');

/**
 * Resolve qual adapter usar por contexto (ingestão pública vs provedor explícito).
 * Implementações ficam na infrastructure; use cases dependem só desta port.
 */
export interface SourceAdapterResolverPort {
  /** Home trending, busca pública, etc. — hoje Nexustoons; futuro multi-provider. */
  resolveForPublicCatalogIngest(): SourceMangaAdapterPort;

  /**
   * Sync/leitura alinhados a `MangaExternalSource.provider` (valor Prisma `ExternalSourceProvider`).
   */
  resolveForProvider(provider: string): SourceMangaAdapterPort;
}
