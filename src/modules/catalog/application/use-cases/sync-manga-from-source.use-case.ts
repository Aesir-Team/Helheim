import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MANGA_REPOSITORY,
  type MangaRepositoryPort,
} from '../ports/manga.repository.port';
import {
  CHAPTER_REPOSITORY,
  type ChapterRepositoryPort,
} from '../ports/chapter.repository.port';
import {
  EXTERNAL_MANGA_GATEWAY,
  type ExternalMangaGatewayPort,
  type ExternalMangaChapterRefDto,
} from '../ports/external-manga-gateway.port';

export interface SyncResult {
  mangaId: string;
  chaptersUpserted: number;
}

function isPublished(ch: ExternalMangaChapterRefDto): boolean {
  return !ch.releaseStatus || ch.releaseStatus === 'published';
}

@Injectable()
export class SyncMangaFromSourceUseCase {
  private readonly logger = new Logger(SyncMangaFromSourceUseCase.name);

  constructor(
    @Inject(MANGA_REPOSITORY)
    private readonly mangaRepo: MangaRepositoryPort,
    @Inject(CHAPTER_REPOSITORY)
    private readonly chapterRepo: ChapterRepositoryPort,
    @Inject(EXTERNAL_MANGA_GATEWAY)
    private readonly gateway: ExternalMangaGatewayPort,
  ) {}

  async execute(slug: string): Promise<SyncResult | null> {
    const syncInfo = await this.mangaRepo.getSyncStatus(slug);
    if (syncInfo?.syncStatus === 'syncing') {
      this.logger.warn(`Sync already running for "${slug}", skipping`);
      return null;
    }

    await this.mangaRepo.setSyncStatus(slug, 'syncing');

    try {
      const external = await this.gateway.getMangaBySlug(slug);
      if (!external) {
        await this.mangaRepo.setSyncStatus(slug, 'idle');
        return null;
      }

      const { id: mangaId } = await this.mangaRepo.upsertBySlug({
        slug: external.slug,
        title: external.title,
        coverImage: external.coverImage,
        type: external.type ?? 'manhwa',
        alternativeTitles: external.alternativeTitles,
        description: external.description,
        bannerImage: external.bannerImage,
        status: external.status,
        rating: external.rating,
        views: external.views,
        releaseYear: external.releaseYear,
        isNsfw: external.isNsfw,
        author: external.author,
        artist: external.artist,
        officialLink: external.officialLink,
        lastChapterAt: external.lastChapterAt
          ? new Date(external.lastChapterAt)
          : null,
        externalId: external.id,
      });

      const cats = external.categories;
      if (cats && cats.length > 0) {
        await this.mangaRepo.linkCategories(
          mangaId,
          cats.map((c) => ({
            name: c.name,
            slug: c.slug,
            type: c.type,
            isNsfw: c.isNsfw,
          })),
        );
      }

      let chaptersUpserted = 0;

      const publishedChapters = (external.chapters ?? []).filter(isPublished);

      for (const ch of publishedChapters) {
        const detail = await this.gateway.getChapterById(ch.id);
        if (!detail) continue;

        await this.chapterRepo.upsertByMangaAndNumber({
          mangaId,
          number: ch.number,
          title: ch.title,
          releaseStatus: ch.releaseStatus ?? 'published',
          accessLevel: detail.accessLevel ?? ch.accessLevel,
          coinCost: detail.coinCost ?? ch.coinCost,
          pages: detail.pages,
        });
        chaptersUpserted++;
      }

      await this.mangaRepo.setSyncStatus(slug, 'idle');
      return { mangaId, chaptersUpserted };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sync failed for "${slug}": ${message}`);
      await this.mangaRepo.setSyncStatus(slug, 'error', message);
      return null;
    }
  }
}
