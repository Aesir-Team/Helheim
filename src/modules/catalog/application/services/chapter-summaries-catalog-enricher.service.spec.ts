import { ChapterSummariesCatalogEnricher } from './chapter-summaries-catalog-enricher.service';
import type { ChapterSummaryDto } from '../ports/chapter.repository.port';
import type { ConfigService } from '@nestjs/config';
import type { ReadingProgressRepositoryPort } from '../../../progress/application/ports/reading-progress.repository.port';
import type { ChapterRepositoryPort } from '../ports/chapter.repository.port';

describe('ChapterSummariesCatalogEnricher', () => {
  const base: ChapterSummaryDto = {
    id: 'ch-1',
    mangaId: 'm1',
    number: '1',
    title: null,
    accessLevel: 'public',
    isLocked: false,
    coinCost: 0,
    createdAt: new Date('2026-03-20T00:00:00.000Z'),
    isRead: false,
    isNew: false,
  };

  function makeSut(overrides?: {
    config?: Partial<ConfigService>;
    progress?: Partial<ReadingProgressRepositoryPort>;
    chapter?: Partial<ChapterRepositoryPort>;
  }) {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
      ...overrides?.config,
    } as unknown as ConfigService;

    const progressRepo: ReadingProgressRepositoryPort = {
      findByUserAndManga: jest.fn().mockResolvedValue(null),
      aggregateForUser: jest.fn(),
      upsert: jest.fn(),
      listContinueReading: jest.fn(),
      ...overrides?.progress,
    };

    const chapterRepo: ChapterRepositoryPort = {
      findExistingNumbersByMangaId: jest.fn(),
      listByMangaSlug: jest.fn(),
      listPublishedSummariesFromMangaSlugFromNumberAsc: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      findNeighborChapterIds: jest.fn(),
      upsertByMangaAndNumber: jest.fn(),
      applyFreeTierAccessForManga: jest.fn(),
      ...overrides?.chapter,
    };

    const sut = new ChapterSummariesCatalogEnricher(
      config,
      progressRepo,
      chapterRepo,
    );
    return { sut, progressRepo, chapterRepo };
  }

  it('Given sem viewer, should manter isRead false e calcular isNew', async () => {
    const { sut } = makeSut();
    const now = new Date('2026-03-24T12:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);
    const out = await sut.enrichSummaries(null, [{ ...base }]);
    jest.useRealTimers();
    expect(out[0]?.isRead).toBe(false);
    expect(out[0]?.isNew).toBe(true);
  });

  it('Given progress no capítulo 2, should marcar 1 e 2 como lidos', async () => {
    const { sut, progressRepo, chapterRepo } = makeSut({
      progress: {
        findByUserAndManga: jest.fn().mockResolvedValue({
          id: 'rp1',
          userId: 'u1',
          mangaId: 'm1',
          chapterId: 'ch-2',
          pageNumber: 1,
          chaptersReadCount: 2,
          lastReadAt: new Date(),
        }),
      },
      chapter: {
        findById: jest.fn().mockResolvedValue({
          ...base,
          id: 'ch-2',
          number: '2',
          views: 0,
          mangaSlug: 'x',
          mangaTitle: 'X',
          pages: [],
        }),
      },
    });

    const items: ChapterSummaryDto[] = [
      { ...base, id: 'ch-1', number: '1' },
      { ...base, id: 'ch-2', number: '2' },
      { ...base, id: 'ch-3', number: '3' },
    ];

    const out = await sut.enrichSummaries(
      { userId: 'u1', role: 'USER' },
      items,
    );

    expect(progressRepo.findByUserAndManga).toHaveBeenCalledWith('u1', 'm1');
    expect(out[0]?.isRead).toBe(true);
    expect(out[1]?.isRead).toBe(true);
    expect(out[2]?.isRead).toBe(false);
  });
});
