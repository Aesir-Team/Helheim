import { Injectable } from '@nestjs/common';

/**
 * Fonte usada para ingestão global (home trending, busca sem `mangaId`).
 * Hoje único provider; futuros hubs escolhem aqui sem espalhar Nexustoons nos use cases.
 */
export interface PublicCatalogSourceResolution {
  readonly primaryProvider: 'NEXUSTOONS';
}

@Injectable()
export class ResolvePublicCatalogSourceUseCase {
  execute(): PublicCatalogSourceResolution {
    return { primaryProvider: 'NEXUSTOONS' };
  }
}
