import type { ExternalMangaGatewayPort } from './external-manga-gateway.port';

/**
 * Contrato de um adapter de source (Nexustoons, Komga, parceiro, etc.).
 * Mantém o mesmo shape de `ExternalMangaGatewayPort` — uma instância por provider/implementação na borda.
 *
 * @see refactor/04-provider-isolation.md
 */
export type SourceMangaAdapterPort = ExternalMangaGatewayPort;
