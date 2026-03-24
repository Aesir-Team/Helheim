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

const HOME_LIMIT_DEFAULT = 10;
const HOME_LIMIT_CAP = 24;

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
    const limit = Math.min(Math.max(input.limit ?? HOME_LIMIT_DEFAULT, 1), HOME_LIMIT_CAP);
    const includeNsfw = input.includeNsfw;

    const trending = await this.resolveTrending(limit, includeNsfw);
    const trendingSlugs = new Set(trending.map((m) => m.slug));

    const recommendedPage = await this.mangaRepo.list({
      page: 1,
      limit: limit * 3,
      sortBy: 'rating',
      includeNsfw,
    });
    const recommended = recommendedPage.data
      .filter((m) => !trendingSlugs.has(m.slug))
      .slice(0, limit);

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
      const bySlugs = await this.mangaRepo.listBySlugs(orderedSlugs, includeNsfw);
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
