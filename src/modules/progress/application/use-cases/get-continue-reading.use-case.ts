import { Inject, Injectable } from '@nestjs/common';
import {
  READING_PROGRESS_REPOSITORY,
  type ReadingProgressRepositoryPort,
  type ContinueReadingEntryDto,
} from '../ports/reading-progress.repository.port';
import {
  CHAPTER_REPOSITORY,
  type ChapterRepositoryPort,
} from '../../../catalog/application/ports/chapter.repository.port';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** PRODUTO §3.6 — ordenado por última leitura. */
@Injectable()
export class GetContinueReadingUseCase {
  constructor(
    @Inject(CHAPTER_REPOSITORY)
    private readonly chapterRepo: ChapterRepositoryPort,
    @Inject(READING_PROGRESS_REPOSITORY)
    private readonly progressRepo: ReadingProgressRepositoryPort,
  ) {}

  async execute(
    userId: string,
    limit?: number,
  ): Promise<ContinueReadingEntryDto[]> {
    const raw = limit ?? DEFAULT_LIMIT;
    const capped = Math.min(Math.max(1, raw), MAX_LIMIT);
    const rows = await this.progressRepo.listContinueReading(userId, capped);
    const counts = await this.chapterRepo.resolveChaptersReadCountsForBookmarks(
      rows.map((r) => ({
        mangaId: r.mangaId,
        bookmarkChapterId: r.chapterId,
      })),
    );
    return rows.map((r, i) => ({
      ...r,
      chaptersReadCount: counts[i] ?? 0,
    }));
  }
}
