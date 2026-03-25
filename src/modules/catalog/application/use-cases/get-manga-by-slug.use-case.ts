import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MANGA_REPOSITORY,
  type MangaRepositoryPort,
  type MangaDetailDto,
} from '../ports/manga.repository.port';
import {
  SOURCE_ADAPTER_RESOLVER,
  type SourceAdapterResolverPort,
} from '../ports/source-adapter-resolver.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import { SyncMangaFromSourceUseCase } from './sync-manga-from-source.use-case';
import {
  ChapterSummariesViewerLockApplier,
  type ChapterListViewerContext,
} from '../services/chapter-summaries-viewer-lock.applier';
import { ChapterSummariesCatalogEnricher } from '../services/chapter-summaries-catalog-enricher.service';
import {
  READING_PROGRESS_REPOSITORY,
  type ReadingProgressRepositoryPort,
} from '../../../progress/application/ports/reading-progress.repository.port';
import {
  CHAPTER_REPOSITORY,
  type ChapterRepositoryPort,
} from '../ports/chapter.repository.port';

@Injectable()
export class GetMangaBySlugUseCase {
  private readonly logger = new Logger(GetMangaBySlugUseCase.name);

  constructor(
    @Inject(MANGA_REPOSITORY)
    private readonly mangaRepo: MangaRepositoryPort,
    @Inject(SOURCE_ADAPTER_RESOLVER)
    private readonly sourceAdapterResolver: SourceAdapterResolverPort,
    private readonly syncMangaFromSource: SyncMangaFromSourceUseCase,
    private readonly viewerLockApplier: ChapterSummariesViewerLockApplier,
    private readonly summaryEnricher: ChapterSummariesCatalogEnricher,
    @Inject(READING_PROGRESS_REPOSITORY)
    private readonly readingProgressRepo: ReadingProgressRepositoryPort,
    @Inject(CHAPTER_REPOSITORY)
    private readonly chapterRepo: ChapterRepositoryPort,
  ) {}

  async execute(
    slug: string,
    viewer?: ChapterListViewerContext | null,
  ): Promise<MangaDetailDto> {
    const normalized = slug.trim();
    if (!normalized) {
      throw new NotFoundError('Manga slug is required');
    }

    await this.ingestExternalMangaBySlug(normalized);

    const persisted = await this.mangaRepo.findBySlug(normalized);
    if (!persisted) {
      throw new NotFoundError(`Manga "${normalized}" not found`);
    }

    setImmediate(() => {
      void this.syncMangaFromSource.execute(normalized).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.debug(
          `Background chapter sync failed (slug=${normalized}): ${message}`,
        );
      });
    });

    const v = viewer ?? null;
    const locked = await this.viewerLockApplier.apply(
      v,
      persisted.latestChapters,
    );
    const latestChapters = await this.summaryEnricher.enrichSummaries(
      v,
      locked,
    );

    let chaptersReadCount: number | null = null;
    if (v != null) {
      const progress = await this.readingProgressRepo.findByUserAndManga(
        v.userId,
        persisted.id,
      );
      if (progress == null) {
        chaptersReadCount = 0;
      } else {
        const [derived] =
          await this.chapterRepo.resolveChaptersReadCountsForBookmarks([
            {
              mangaId: persisted.id,
              bookmarkChapterId: progress.chapterId,
            },
          ]);
        chaptersReadCount = derived;
      }
    }

    return { ...persisted, latestChapters, chaptersReadCount };
  }

  /** Alinhado à busca em lista: tenta fonte externa, upsert no catálogo; falha HTTP não bloqueia leitura local. */
  private async ingestExternalMangaBySlug(slug: string): Promise<void> {
    try {
      const adapter =
        this.sourceAdapterResolver.resolveForPublicCatalogIngest();
      const external = await adapter.getMangaBySlug(slug);
      if (!external) {
        return;
      }

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

      const publishedFromSource = (external.chapters ?? []).filter(
        (ch) => !ch.releaseStatus || ch.releaseStatus === 'published',
      ).length;
      if (publishedFromSource > 0) {
        await this.mangaRepo.mergeReportedChapterCount(
          slug,
          publishedFromSource,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Nexustoons getMangaBySlug ingest failed (slug=${slug}): ${message}`,
      );
    }
  }
}
