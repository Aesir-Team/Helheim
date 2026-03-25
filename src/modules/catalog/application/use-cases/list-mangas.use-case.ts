import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MANGA_REPOSITORY,
  type MangaRepositoryPort,
  type ListMangasParams,
  type PaginatedResult,
  type MangaSummaryDto,
  type UpsertMangaInput,
} from '../ports/manga.repository.port';
import {
  EXTERNAL_MANGA_GATEWAY,
  type ExternalMangaGatewayPort,
  type ExternalMangaSummaryDto,
} from '../ports/external-manga-gateway.port';
import { ResolvePublicCatalogSourceUseCase } from './resolve-public-catalog-source.use-case';

/** Máximo de itens trazidos da fonte externa por busca (evita burst). */
const EXTERNAL_SEARCH_LIMIT_CAP = 60;

function toUpsertFromExternalSummary(
  e: ExternalMangaSummaryDto,
): UpsertMangaInput {
  return {
    slug: e.slug,
    title: e.title,
    coverImage: e.coverImage,
    type: e.type ?? 'manhwa',
    alternativeTitles: e.alternativeTitles ?? null,
    description: e.description ?? null,
    bannerImage: e.bannerImage ?? null,
    status: e.status ?? null,
    rating: e.rating ?? null,
    views: e.views ?? null,
    releaseYear: e.releaseYear ?? null,
    isNsfw: e.isNsfw ?? null,
    author: e.author ?? null,
    artist: e.artist ?? null,
    officialLink: e.officialLink ?? null,
    lastChapterAt: e.lastChapterAt ? new Date(e.lastChapterAt) : null,
    externalId: e.id,
  };
}

function toExternalSortBy(
  sortBy: ListMangasParams['sortBy'],
): 'views' | 'lastChapterAt' | null {
  if (sortBy === 'views' || sortBy === 'lastChapterAt') {
    return sortBy;
  }
  return null;
}

export interface ListMangasInput {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  categorySlug?: string;
  search?: string;
  sortBy?: 'lastChapterAt' | 'views' | 'rating' | 'createdAt';
  includeNsfw?: boolean;
}

@Injectable()
export class ListMangasUseCase {
  private readonly logger = new Logger(ListMangasUseCase.name);

  constructor(
    @Inject(MANGA_REPOSITORY)
    private readonly mangaRepo: MangaRepositoryPort,
    @Inject(EXTERNAL_MANGA_GATEWAY)
    private readonly gateway: ExternalMangaGatewayPort,
    private readonly resolvePublicCatalogSource: ResolvePublicCatalogSourceUseCase,
  ) {}

  async execute(
    input: ListMangasInput,
  ): Promise<PaginatedResult<MangaSummaryDto>> {
    const params: ListMangasParams = {
      page: input.page ?? 1,
      limit: Math.min(input.limit ?? 20, 100),
      type: input.type,
      status: input.status,
      categorySlug: input.categorySlug,
      search: input.search?.trim() || undefined,
      sortBy: input.sortBy,
      includeNsfw: input.includeNsfw,
    };

    if (params.search) {
      await this.ingestExternalSearchMatches(params);
    }

    return this.mangaRepo.list(params);
  }

  private async ingestExternalSearchMatches(
    params: ListMangasParams,
  ): Promise<void> {
    const search = params.search;
    if (!search) {
      return;
    }

    const externalLimit = Math.min(
      EXTERNAL_SEARCH_LIMIT_CAP,
      Math.max(params.limit * 2, 24),
    );

    try {
      void this.resolvePublicCatalogSource.execute();
      const items = await this.gateway.listMangas({
        search,
        limit: externalLimit,
        includeNsfw: params.includeNsfw ?? null,
        sortBy: toExternalSortBy(params.sortBy),
      });

      await Promise.all(
        items.map((item) =>
          this.mangaRepo.upsertBySlug(toUpsertFromExternalSummary(item)),
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Nexustoons search ingest failed (search=${search}): ${message}`,
      );
    }
  }
}
