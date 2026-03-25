import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors';
import type { SourceMangaAdapterPort } from '../../application/ports/source-manga-adapter.port';
import type { SourceAdapterResolverPort } from '../../application/ports/source-adapter-resolver.port';
import { EXTERNAL_MANGA_GATEWAY } from '../../application/ports/external-manga-gateway.port';

/**
 * MVP: único adapter registrado (Nexustoons / origem `external`).
 * Novos providers: registrar instância e estender `resolveForProvider`.
 */
@Injectable()
export class DefaultSourceAdapterResolver implements SourceAdapterResolverPort {
  constructor(
    @Inject(EXTERNAL_MANGA_GATEWAY)
    private readonly nexustoonsAdapter: SourceMangaAdapterPort,
  ) {}

  resolveForPublicCatalogIngest(): SourceMangaAdapterPort {
    return this.nexustoonsAdapter;
  }

  resolveForProvider(provider: string): SourceMangaAdapterPort {
    const key = provider.trim().toUpperCase();
    if (key === 'NEXUSTOONS') {
      return this.nexustoonsAdapter;
    }
    throw new NotFoundError(
      `Adapter de source não registrado para o provider "${provider}".`,
    );
  }
}
