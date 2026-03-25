import type { ExternalMangaGatewayPort } from '../ports/external-manga-gateway.port';
import type { SourceAdapterResolverPort } from '../ports/source-adapter-resolver.port';

/** Testes: um único adapter (gateway mock) para ingestão pública e por provider. */
export function fakeSourceAdapterResolverFromGateway(
  gateway: ExternalMangaGatewayPort,
): SourceAdapterResolverPort {
  return {
    resolveForPublicCatalogIngest: () => gateway,
    resolveForProvider: () => gateway,
  };
}
