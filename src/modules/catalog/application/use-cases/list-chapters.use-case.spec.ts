import { ListChaptersUseCase } from './list-chapters.use-case';
import type {
  ChapterRepositoryPort,
  ChapterSummaryDto,
} from '../ports/chapter.repository.port';
import type { ChapterSummariesViewerLockApplier } from '../services/chapter-summaries-viewer-lock.applier';
import type { ChapterSummariesCatalogEnricher } from '../services/chapter-summaries-catalog-enricher.service';

const CHAPTER_STUB: ChapterSummaryDto = {
  id: 'ch-1',
  mangaId: 'm1',
  number: '1',
  title: 'Chapter 1',
  accessLevel: 'public',
  isLocked: false,
  coinCost: 0,
  createdAt: new Date('2026-01-01'),
  isRead: false,
  isNew: false,
};

function makeRepo(
  overrides?: Partial<ChapterRepositoryPort>,
): ChapterRepositoryPort {
  return {
    findExistingNumbersByMangaId: jest.fn().mockResolvedValue([]),
    listByMangaSlug: jest
      .fn()
      .mockResolvedValue({ data: [CHAPTER_STUB], total: 1 }),
    listPublishedSummariesFromMangaSlugFromNumberAsc: jest
      .fn()
      .mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    findNeighborChapterIds: jest
      .fn()
      .mockResolvedValue({ prevChapterId: null, nextChapterId: null }),
    upsertByMangaAndNumber: jest.fn().mockResolvedValue({ id: 'ch-1' }),
    applyFreeTierAccessForManga: jest
      .fn()
      .mockResolvedValue({ publicCount: 0, coinCount: 0 }),
    ...overrides,
  };
}

function makeLockApplier(): ChapterSummariesViewerLockApplier {
  return {
    apply: jest.fn(async (_v, items) => [...items]),
  } as unknown as ChapterSummariesViewerLockApplier;
}

function makeSummaryEnricher(): ChapterSummariesCatalogEnricher {
  return {
    enrichSummaries: jest.fn(async (_v, items) =>
      items.map((s) => ({ ...s, isRead: false, isNew: true })),
    ),
  } as unknown as ChapterSummariesCatalogEnricher;
}

describe('ListChaptersUseCase', () => {
  it('should list chapters with defaults (asc, page 1, limit 50)', async () => {
    const repo = makeRepo();
    const sut = new ListChaptersUseCase(
      repo,
      makeLockApplier(),
      makeSummaryEnricher(),
    );

    const result = await sut.execute({ mangaSlug: 'solo-leveling' });

    expect(repo.listByMangaSlug).toHaveBeenCalledWith('solo-leveling', {
      order: 'asc',
      page: 1,
      limit: 50,
    });
    expect(result.data).toHaveLength(1);
  });

  it('should cap limit at 200', async () => {
    const repo = makeRepo();
    const sut = new ListChaptersUseCase(
      repo,
      makeLockApplier(),
      makeSummaryEnricher(),
    );

    await sut.execute({ mangaSlug: 'test', limit: 999 });

    expect(repo.listByMangaSlug).toHaveBeenCalledWith('test', {
      order: 'asc',
      page: 1,
      limit: 200,
    });
  });

  it('should forward order and page params', async () => {
    const repo = makeRepo();
    const sut = new ListChaptersUseCase(
      repo,
      makeLockApplier(),
      makeSummaryEnricher(),
    );

    await sut.execute({ mangaSlug: 'test', order: 'asc', page: 3, limit: 10 });

    expect(repo.listByMangaSlug).toHaveBeenCalledWith('test', {
      order: 'asc',
      page: 3,
      limit: 10,
    });
  });
});
