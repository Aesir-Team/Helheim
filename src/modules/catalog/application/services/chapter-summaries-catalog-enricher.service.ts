import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChapterSummaryDto } from '../ports/chapter.repository.port';
import {
  READING_PROGRESS_REPOSITORY,
  type ReadingProgressRepositoryPort,
} from '../../../progress/application/ports/reading-progress.repository.port';
import {
  CHAPTER_REPOSITORY,
  type ChapterRepositoryPort,
} from '../ports/chapter.repository.port';
import {
  isChapterNewByAge,
  isChapterReadUpToBookmark,
} from '../../../../shared/domain/chapter-summary-flags.policy';
import type { ChapterListViewerContext } from './chapter-summaries-viewer-lock.applier';

@Injectable()
export class ChapterSummariesCatalogEnricher {
  constructor(
    private readonly config: ConfigService,
    @Inject(READING_PROGRESS_REPOSITORY)
    private readonly progressRepo: ReadingProgressRepositoryPort,
    @Inject(CHAPTER_REPOSITORY)
    private readonly chapterRepo: ChapterRepositoryPort,
  ) {}

  /**
   * Preenche `isNew` (idade de `createdAt`) e `isRead` (progresso do usuário neste mangá).
   * Sem JWT: `isRead` sempre false.
   */
  async enrichSummaries(
    viewer: ChapterListViewerContext | null | undefined,
    summaries: readonly ChapterSummaryDto[],
  ): Promise<ChapterSummaryDto[]> {
    if (summaries.length === 0) {
      return [];
    }

    const now = new Date();
    const maxAgeDays = this.resolveNewChapterMaxAgeDays();
    const mangaId = summaries[0]?.mangaId;
    if (mangaId === undefined || mangaId === '') {
      return summaries.map((s) => ({
        ...s,
        isNew: isChapterNewByAge(s.createdAt, now, maxAgeDays),
        isRead: false,
      }));
    }

    let bookmarkNumber: string | null = null;
    const v = viewer ?? null;
    if (v != null) {
      const progress = await this.progressRepo.findByUserAndManga(
        v.userId,
        mangaId,
      );
      if (progress != null) {
        const bookmarkChapter = await this.chapterRepo.findById(
          progress.chapterId,
        );
        bookmarkNumber = bookmarkChapter?.number ?? null;
      }
    }

    return summaries.map((s) => ({
      ...s,
      isNew: isChapterNewByAge(s.createdAt, now, maxAgeDays),
      isRead: isChapterReadUpToBookmark(s.number, bookmarkNumber),
    }));
  }

  private resolveNewChapterMaxAgeDays(): number {
    const raw = this.config.get<string | number>('CHAPTER_IS_NEW_MAX_AGE_DAYS');
    const n =
      typeof raw === 'number'
        ? raw
        : raw != null && raw !== ''
          ? Number.parseInt(String(raw), 10)
          : 14;
    return Number.isFinite(n) && n > 0 ? n : 14;
  }
}
