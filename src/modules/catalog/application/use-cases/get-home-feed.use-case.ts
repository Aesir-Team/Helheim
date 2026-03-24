import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MANGA_REPOSITORY,
  type MangaRepositoryPort,
  type MangaSummaryDto,
  type UpsertMangaInput,
} from '../ports/manga.repository.port';
import {
  EXTERNAL_MANGA_GATEWAY,
  type ExternalMangaGatewayPort,
  type ExternalMangaSummaryDto,
} from '../ports/external-manga-gateway.port';

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

export interface GetHomeFeedInput {
  limit?: number;
  includeNsfw?: boolean;
}

export interface HomeFeedDto {
  trending: MangaSummaryDto[];
  recommended: MangaSummaryDto[];
  latestUpdates: MangaSummaryDto[];
}

@Injectable()
export class GetHomeFeedUseCase {
  private readonly logger = new Logger(GetHomeFeedUseCase.name);

  constructor(
    @Inject(MANGA_REPOSITORY)
    private readonly mangaRepo: MangaRepositoryPort,
    @Inject(EXTERNAL_MANGA_GATEWAY)
    private readonly gateway: ExternalMangaGatewayPort,
  ) {}

  async execute(input: GetHomeFeedInput): Promise<HomeFeedDto> {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 100);
    const includeNsfw = input.includeNsfw;

    const trending = await this.resolveTrending(limit, includeNsfw);
    const trendingSlugs = new Set(trending.map((m) => m.slug));

    const recommended = await this.resolveRecommendedExcludingTrending(
      limit,
      trendingSlugs,
      includeNsfw,
    );

    const latestPage = await this.mangaRepo.list({
      page: 1,
      limit,
      sortBy: 'lastChapterAt',
      includeNsfw,
    });

    return {
      trending,
      recommended,
      latestUpdates: latestPage.data,
    };
  }

  /**
   * Maior rating no BD, excluindo slugs já em trending, até `limit` itens.
   * Pagina o catálogo porque um único lote `limit*2` pode esvaziar quase todo
   * se coincidir com trending (ex.: pedir 10 e vir só 4).
   */
  private async resolveRecommendedExcludingTrending(
    limit: number,
    trendingSlugs: ReadonlySet<string>,
    includeNsfw?: boolean,
  ): Promise<MangaSummaryDto[]> {
    const out: MangaSummaryDto[] = [];
    const seen = new Set<string>();
    const pageSize = Math.max(limit * 2, 1);
    let page = 1;

    while (out.length < limit) {
      const batch = await this.mangaRepo.list({
        page,
        limit: pageSize,
        sortBy: 'rating',
        includeNsfw,
      });

      if (batch.data.length === 0) {
        break;
      }

      for (const m of batch.data) {
        if (out.length >= limit) {
          break;
        }
        if (trendingSlugs.has(m.slug) || seen.has(m.slug)) {
          continue;
        }
        seen.add(m.slug);
        out.push(m);
      }

      if (page >= batch.totalPages) {
        break;
      }
      page += 1;
    }

    return out;
  }

  private async resolveTrending(
    limit: number,
    includeNsfw?: boolean,
  ): Promise<MangaSummaryDto[]> {
    try {
      const items = await this.gateway.listTrending({
        limit,
        includeNsfw: includeNsfw ?? null,
      });

      await Promise.all(
        items.map((item) =>
          this.mangaRepo.upsertBySlug(toUpsertFromExternalSummary(item)),
        ),
      );

      const orderedSlugs = items.map((item) => item.slug);
      const bySlugs = await this.mangaRepo.listBySlugs(
        orderedSlugs,
        includeNsfw,
      );
      if (bySlugs.length > 0) {
        return bySlugs.slice(0, limit);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Nexustoons trending ingest failed: ${message}`);
    }

    const fallback = await this.mangaRepo.list({
      page: 1,
      limit,
      sortBy: 'views',
      includeNsfw,
    });
    return fallback.data;
  }
}
