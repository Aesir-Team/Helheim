import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import {
  MANGA_SYNC_PROGRESS,
  type MangaSyncProgressPort,
  type MangaSyncProgressState,
} from '../ports/manga-sync-progress.port';
import {
  normalizeMangaTypeFromExternal,
  type CanonicalMangaType,
} from '../../../../shared/domain/manga-external.normalization';
import {
  parseCoinChapterCost,
  parseFreeChapterFraction,
} from '../../../../shared/domain/chapter-free-tier.policy';

export interface SyncResult {
  mangaId: string;
  chaptersUpserted: number;
}

function isPublished(ch: ExternalMangaChapterRefDto): boolean {
  return !ch.releaseStatus || ch.releaseStatus === 'published';
}

/** Evita re-sync completo a cada GET no detalhe (capítulos + páginas). */
const SYNC_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parsePositiveMs(
  raw: string | number | undefined | null,
  fallback: number,
): number {
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
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
    @Inject(MANGA_SYNC_PROGRESS)
    private readonly syncProgress: MangaSyncProgressPort,
    private readonly config: ConfigService,
  ) {}

  async execute(slug: string): Promise<SyncResult | null> {
    const syncInfo = await this.mangaRepo.getSyncStatus(slug);
    if (syncInfo?.syncStatus === 'syncing') {
      this.logger.warn(`Sync already running for "${slug}", skipping`);
      return null;
    }

    if (
      syncInfo?.syncStatus === 'idle' &&
      syncInfo.lastSyncedAt != null &&
      Date.now() - syncInfo.lastSyncedAt.getTime() < SYNC_COOLDOWN_MS
    ) {
      this.logger.debug(
        `Sync skipped for "${slug}": within ${SYNC_COOLDOWN_MS / 3600000}h cooldown`,
      );
      return null;
    }

    await this.mangaRepo.setSyncStatus(slug, 'syncing');

    let mangaTypeKey: CanonicalMangaType = 'manhwa';

    try {
      const external = await this.gateway.getMangaBySlug(slug);
      if (!external) {
        await this.mangaRepo.setSyncStatus(slug, 'idle');
        return null;
      }

      mangaTypeKey = normalizeMangaTypeFromExternal(external.type);

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

      const publishedChapters = (external.chapters ?? []).filter(isPublished);
      const publishedNumbers = publishedChapters.map((ch) => ch.number);
      const existingNumbers = new Set(
        await this.chapterRepo.findExistingNumbersByMangaId(
          mangaId,
          publishedNumbers,
        ),
      );
      const chaptersToSync = publishedChapters.filter(
        (ch) => !existingNumbers.has(ch.number),
      );
      const deadlineMs = parsePositiveMs(
        this.config.get<string | number>('MANGA_SYNC_DEADLINE_MS'),
        3 * 60 * 60 * 1000,
      );
      const chapterDelayMs = parsePositiveMs(
        this.config.get<string | number>('MANGA_SYNC_CHAPTER_DELAY_MS'),
        300,
      );

      const startedAt = new Date();
      const deadlineAt = new Date(startedAt.getTime() + deadlineMs);

      await this.publishState({
        slug,
        mangaType: mangaTypeKey,
        status: 'running',
        startedAt: startedAt.toISOString(),
        deadlineAt: deadlineAt.toISOString(),
        totalChapters: chaptersToSync.length,
        chaptersProcessed: 0,
        lastChapterNumber: null,
        lastImageUrlPreview: [],
        updatedAt: startedAt.toISOString(),
      });

      let chaptersUpserted = 0;

      for (const ch of chaptersToSync) {
        if (Date.now() >= deadlineAt.getTime()) {
          const nowIso = new Date().toISOString();
          await this.publishState({
            slug,
            mangaType: mangaTypeKey,
            status: 'timeout',
            startedAt: startedAt.toISOString(),
            deadlineAt: deadlineAt.toISOString(),
            totalChapters: chaptersToSync.length,
            chaptersProcessed: chaptersUpserted,
            lastChapterNumber: ch.number,
            lastImageUrlPreview: [],
            updatedAt: nowIso,
            errorMessage: 'manga_sync_deadline_exceeded',
          });
          await this.mangaRepo.setSyncStatus(
            slug,
            'error',
            'manga_sync_deadline_exceeded',
          );
          await this.applyFreeTierForMangaSafe(mangaId);
          return { mangaId, chaptersUpserted };
        }

        await sleep(chapterDelayMs);

        const detail = await this.gateway.getChapterById(ch.id);
        if (!detail) {
          continue;
        }

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

        const preview = detail.pages
          .slice(0, 3)
          .map((p) => p.imageUrl)
          .filter((u): u is string => typeof u === 'string' && u.length > 0);

        await this.publishState({
          slug,
          mangaType: mangaTypeKey,
          status: 'running',
          startedAt: startedAt.toISOString(),
          deadlineAt: deadlineAt.toISOString(),
          totalChapters: chaptersToSync.length,
          chaptersProcessed: chaptersUpserted,
          lastChapterNumber: ch.number,
          lastImageUrlPreview: preview,
          updatedAt: new Date().toISOString(),
        });
      }

      const doneIso = new Date().toISOString();
      await this.publishState({
        slug,
        mangaType: mangaTypeKey,
        status: 'completed',
        startedAt: startedAt.toISOString(),
        deadlineAt: deadlineAt.toISOString(),
        totalChapters: chaptersToSync.length,
        chaptersProcessed: chaptersUpserted,
        lastChapterNumber:
          chaptersToSync.length > 0
            ? chaptersToSync[chaptersToSync.length - 1].number
            : null,
        lastImageUrlPreview: [],
        updatedAt: doneIso,
      });

      await this.applyFreeTierForMangaSafe(mangaId);
      await this.mangaRepo.setSyncStatus(slug, 'idle');
      return { mangaId, chaptersUpserted };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sync failed for "${slug}": ${message}`);
      await this.publishState({
        slug,
        mangaType: mangaTypeKey,
        status: 'failed',
        startedAt: new Date().toISOString(),
        deadlineAt: new Date().toISOString(),
        totalChapters: 0,
        chaptersProcessed: 0,
        lastChapterNumber: null,
        lastImageUrlPreview: [],
        updatedAt: new Date().toISOString(),
        errorMessage: message,
      });
      await this.mangaRepo.setSyncStatus(slug, 'error', message);
      return null;
    }
  }

  private async applyFreeTierForMangaSafe(mangaId: string): Promise<void> {
    const freeFraction = parseFreeChapterFraction(
      this.config.get<string | number>('MANGA_FREE_CHAPTER_FRACTION'),
    );
    const coinChapterCost = parseCoinChapterCost(
      this.config.get<string | number>('MANGA_COIN_CHAPTER_COST'),
    );
    try {
      const r = await this.chapterRepo.applyFreeTierAccessForManga(mangaId, {
        freeFraction,
        coinChapterCost,
      });
      this.logger.debug(
        `Free tier applied mangaId=${mangaId} public=${r.publicCount} coin=${r.coinCount} fraction=${freeFraction}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `applyFreeTierAccessForManga failed mangaId=${mangaId}: ${message}`,
      );
    }
  }

  private async publishState(state: MangaSyncProgressState): Promise<void> {
    try {
      await this.syncProgress.publish(state);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`sync progress publish failed: ${msg}`);
    }
  }
}
