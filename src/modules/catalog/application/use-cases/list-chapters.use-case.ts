import { Inject, Injectable } from '@nestjs/common';
import {
  CHAPTER_REPOSITORY,
  type ChapterRepositoryPort,
  type ChapterSummaryDto,
} from '../ports/chapter.repository.port';
import {
  ChapterSummariesViewerLockApplier,
  type ChapterListViewerContext,
} from '../services/chapter-summaries-viewer-lock.applier';
import { ChapterSummariesCatalogEnricher } from '../services/chapter-summaries-catalog-enricher.service';

export interface ListChaptersInput {
  mangaSlug: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  /** Com JWT opcional: ajusta `isLocked` para VIP/desbloqueios reais. */
  viewer?: ChapterListViewerContext | null;
}

export interface ListChaptersOutput {
  data: ChapterSummaryDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListChaptersUseCase {
  constructor(
    @Inject(CHAPTER_REPOSITORY)
    private readonly chapterRepo: ChapterRepositoryPort,
    private readonly viewerLockApplier: ChapterSummariesViewerLockApplier,
    private readonly summaryEnricher: ChapterSummariesCatalogEnricher,
  ) {}

  async execute(input: ListChaptersInput): Promise<ListChaptersOutput> {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 50, 200);
    const order = input.order ?? 'asc';

    const result = await this.chapterRepo.listByMangaSlug(input.mangaSlug, {
      order,
      page,
      limit,
    });

    const locked = await this.viewerLockApplier.apply(
      input.viewer ?? null,
      result.data,
    );
    const data = await this.summaryEnricher.enrichSummaries(
      input.viewer ?? null,
      locked,
    );

    return { data, total: result.total, page, limit };
  }
}
