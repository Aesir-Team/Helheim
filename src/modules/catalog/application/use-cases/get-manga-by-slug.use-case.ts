import { Inject, Injectable } from '@nestjs/common';
import {
  MANGA_REPOSITORY,
  type MangaRepositoryPort,
  type MangaDetailDto,
} from '../ports/manga.repository.port';
import {
  EXTERNAL_MANGA_GATEWAY,
  type ExternalMangaGatewayPort,
} from '../ports/external-manga-gateway.port';
import { NotFoundError } from '../../../../shared/domain/errors';

const SYNC_STALE_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class GetMangaBySlugUseCase {
  constructor(
    @Inject(MANGA_REPOSITORY)
    private readonly mangaRepo: MangaRepositoryPort,
    @Inject(EXTERNAL_MANGA_GATEWAY)
    private readonly gateway: ExternalMangaGatewayPort,
  ) {}

  async execute(slug: string): Promise<MangaDetailDto> {
    const existing = await this.mangaRepo.findBySlug(slug);

    if (existing) {
      this.triggerBackgroundSyncIfStale(slug).catch(() => {});
      return existing;
    }

    return this.syncAndReturn(slug);
  }

  private async syncAndReturn(slug: string): Promise<MangaDetailDto> {
    const external = await this.gateway.getMangaBySlug(slug);
    if (!external) throw new NotFoundError(`Manga "${slug}" not found`);

    await this.mangaRepo.setSyncStatus(slug, 'syncing');

    try {
      await this.mangaRepo.upsertBySlug({
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

      await this.mangaRepo.setSyncStatus(slug, 'idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.mangaRepo.setSyncStatus(slug, 'error', message);
    }

    const persisted = await this.mangaRepo.findBySlug(slug);
    if (!persisted) throw new NotFoundError(`Manga "${slug}" not found`);
    return persisted;
  }

  private async triggerBackgroundSyncIfStale(slug: string): Promise<void> {
    const sync = await this.mangaRepo.getSyncStatus(slug);
    if (!sync || sync.syncStatus !== 'idle') return;

    const stale =
      !sync.lastSyncedAt ||
      Date.now() - sync.lastSyncedAt.getTime() > SYNC_STALE_MS;

    if (!stale) return;

    await this.syncAndReturn(slug).catch(() => {});
  }
}
