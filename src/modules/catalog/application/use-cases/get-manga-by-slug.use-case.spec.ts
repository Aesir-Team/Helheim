import { GetMangaBySlugUseCase } from './get-manga-by-slug.use-case';
import type {
  MangaRepositoryPort,
  MangaDetailDto,
} from '../ports/manga.repository.port';
import type { ExternalMangaGatewayPort } from '../ports/external-manga-gateway.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import type { SyncMangaFromSourceUseCase } from './sync-manga-from-source.use-case';
import type { ChapterSummariesViewerLockApplier } from '../services/chapter-summaries-viewer-lock.applier';
import type { ChapterSummariesCatalogEnricher } from '../services/chapter-summaries-catalog-enricher.service';
import type { ReadingProgressRepositoryPort } from '../../../progress/application/ports/reading-progress.repository.port';
import type { ChapterRepositoryPort } from '../ports/chapter.repository.port';

function makeChapterRepoForDetail(
  overrides?: Partial<ChapterRepositoryPort>,
): ChapterRepositoryPort {
  return {
    findExistingNumbersByMangaId: jest.fn(),
    countPublishedByMangaId: jest.fn(),
    countPublishedWithNumberAtMost: jest.fn(),
    resolveChaptersReadCountsForBookmarks: jest
      .fn()
      .mockImplementation((items: readonly unknown[]) =>
        Promise.resolve(items.map(() => 0)),
      ),
    listByMangaSlug: jest.fn(),
    listPublishedSummariesFromMangaSlugFromNumberAsc: jest.fn(),
    findById: jest.fn(),
    findNeighborChapterIds: jest.fn(),
    upsertByMangaAndNumber: jest.fn(),
    applyFreeTierAccessForManga: jest.fn(),
    ...overrides,
  };
}

function makeReadingProgressRepo(
  overrides?: Partial<ReadingProgressRepositoryPort>,
): ReadingProgressRepositoryPort {
  return {
    findByUserAndManga: jest.fn().mockResolvedValue(null),
    aggregateForUser: jest.fn(),
    upsert: jest.fn(),
    listContinueReading: jest.fn(),
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
    enrichSummaries: jest.fn(async (_v, items) => [...items]),
  } as unknown as ChapterSummariesCatalogEnricher;
}

const DETAIL_STUB: MangaDetailDto = {
  id: 'm1',
  title: 'Solo Leveling',
  slug: 'solo-leveling',
  coverImage: 'https://img.test/cover.jpg',
  status: 'ongoing',
  type: 'manhwa',
  rating: 4.8,
  views: 1000,
  isNsfw: false,
  lastChapterAt: new Date('2026-01-01'),
  categories: [],
  alternativeTitles: null,
  description: 'Desc',
  bannerImage: null,
  releaseYear: 2020,
  author: 'Author',
  artist: null,
  officialLink: null,
  chaptersCount: 5,
  chaptersSyncedCount: 5,
  chaptersReadCount: null,
  latestChapters: [],
};

const EXTERNAL_MANGA = {
  id: 'ext-1',
  slug: 'solo-leveling',
  title: 'Solo Leveling',
  coverImage: 'https://img.test/cover.jpg',
};

function makeRepo(
  overrides?: Partial<MangaRepositoryPort>,
): MangaRepositoryPort {
  return {
    findBySlug: jest.fn().mockResolvedValue(null),
    findByIdForListItem: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }),
    listBySlugs: jest.fn().mockResolvedValue([]),
    upsertBySlug: jest.fn().mockResolvedValue({ id: 'm1' }),
    mergeReportedChapterCount: jest.fn().mockResolvedValue(undefined),
    linkCategories: jest.fn().mockResolvedValue(undefined),
    getSyncStatus: jest
      .fn()
      .mockResolvedValue({ syncStatus: 'idle', lastSyncedAt: new Date() }),
    setSyncStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeGateway(
  overrides?: Partial<ExternalMangaGatewayPort>,
): ExternalMangaGatewayPort {
  return {
    listMangas: jest.fn().mockResolvedValue([]),
    listTrending: jest.fn().mockResolvedValue([]),
    getMangaBySlug: jest.fn().mockResolvedValue(null),
    getChapterById: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function makeSync(): Pick<SyncMangaFromSourceUseCase, 'execute'> {
  return {
    execute: jest.fn().mockResolvedValue(null),
  };
}

async function flushSetImmediate(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(() => {
      resolve();
    });
  });
}

describe('GetMangaBySlugUseCase', () => {
  describe('Given external returns manga', () => {
    it('should upsert then return from DB (even when manga already existed)', async () => {
      const repo = makeRepo({
        findBySlug: jest.fn().mockResolvedValue(DETAIL_STUB),
      });
      const gateway = makeGateway({
        getMangaBySlug: jest.fn().mockResolvedValue(EXTERNAL_MANGA),
      });
      const sync = makeSync();
      const sut = new GetMangaBySlugUseCase(
        repo,
        gateway,
        sync as unknown as SyncMangaFromSourceUseCase,
        makeLockApplier(),
        makeSummaryEnricher(),
        makeReadingProgressRepo(),
        makeChapterRepoForDetail(),
      );

      const result = await sut.execute('solo-leveling');

      await flushSetImmediate();
      expect(sync.execute).toHaveBeenCalledWith('solo-leveling');

      expect(gateway.getMangaBySlug).toHaveBeenCalledWith('solo-leveling');
      expect(repo.upsertBySlug).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'solo-leveling',
          title: 'Solo Leveling',
          externalId: 'ext-1',
        }),
      );
      expect(result.slug).toBe('solo-leveling');
      expect(result.chaptersReadCount).toBeNull();
    });

    it('should merge reported chapter count when external lists published chapters', async () => {
      const repo = makeRepo({
        findBySlug: jest.fn().mockResolvedValue(DETAIL_STUB),
      });
      const gateway = makeGateway({
        getMangaBySlug: jest.fn().mockResolvedValue({
          ...EXTERNAL_MANGA,
          chapters: [
            { id: 'a', number: '1', title: 'A', releaseStatus: 'published' },
            { id: 'b', number: '2', title: 'B', releaseStatus: 'draft' },
            { id: 'c', number: '3', title: 'C' },
          ],
        }),
      });
      const sync = makeSync();
      const sut = new GetMangaBySlugUseCase(
        repo,
        gateway,
        sync as unknown as SyncMangaFromSourceUseCase,
        makeLockApplier(),
        makeSummaryEnricher(),
        makeReadingProgressRepo(),
        makeChapterRepoForDetail(),
      );

      await sut.execute('solo-leveling');
      await flushSetImmediate();

      expect(repo.mergeReportedChapterCount).toHaveBeenCalledWith(
        'solo-leveling',
        2,
      );
    });

    it('should trim slug for gateway and findBySlug', async () => {
      const repo = makeRepo({
        findBySlug: jest.fn().mockResolvedValue(DETAIL_STUB),
      });
      const gateway = makeGateway({
        getMangaBySlug: jest.fn().mockResolvedValue(EXTERNAL_MANGA),
      });
      const sync = makeSync();
      const sut = new GetMangaBySlugUseCase(
        repo,
        gateway,
        sync as unknown as SyncMangaFromSourceUseCase,
        makeLockApplier(),
        makeSummaryEnricher(),
        makeReadingProgressRepo(),
        makeChapterRepoForDetail(),
      );

      await sut.execute('  solo-leveling  ');

      await flushSetImmediate();
      expect(sync.execute).toHaveBeenCalledWith('solo-leveling');

      expect(gateway.getMangaBySlug).toHaveBeenCalledWith('solo-leveling');
      expect(repo.findBySlug).toHaveBeenCalledWith('solo-leveling');
    });
  });

  describe('Given manga does NOT exist in DB but exists in external source', () => {
    it('should fetch from gateway, persist, and return', async () => {
      const findBySlug = jest.fn().mockResolvedValue(DETAIL_STUB);

      const repo = makeRepo({ findBySlug });
      const gateway = makeGateway({
        getMangaBySlug: jest.fn().mockResolvedValue(EXTERNAL_MANGA),
      });

      const sync = makeSync();
      const sut = new GetMangaBySlugUseCase(
        repo,
        gateway,
        sync as unknown as SyncMangaFromSourceUseCase,
        makeLockApplier(),
        makeSummaryEnricher(),
        makeReadingProgressRepo(),
        makeChapterRepoForDetail(),
      );
      const result = await sut.execute('solo-leveling');

      await flushSetImmediate();
      expect(sync.execute).toHaveBeenCalledWith('solo-leveling');

      expect(gateway.getMangaBySlug).toHaveBeenCalledWith('solo-leveling');
      expect(repo.upsertBySlug).toHaveBeenCalled();
      expect(result.slug).toBe('solo-leveling');
    });
  });

  describe('Given viewer autenticado (JWT)', () => {
    it('should expose chaptersReadCount from reading_progress for barra global no detalhe', async () => {
      const findByUserAndManga = jest.fn().mockResolvedValue({
        id: 'p1',
        userId: 'u1',
        mangaId: 'm1',
        chapterId: 'ch1',
        pageNumber: 1,
        chaptersReadCount: 42,
        lastReadAt: new Date('2026-01-01'),
      });
      const progress = makeReadingProgressRepo({ findByUserAndManga });
      const chapterRepo = makeChapterRepoForDetail({
        resolveChaptersReadCountsForBookmarks: jest
          .fn()
          .mockResolvedValue([42]),
      });
      const repo = makeRepo({
        findBySlug: jest.fn().mockResolvedValue(DETAIL_STUB),
      });
      const gateway = makeGateway({
        getMangaBySlug: jest.fn().mockResolvedValue(EXTERNAL_MANGA),
      });
      const sut = new GetMangaBySlugUseCase(
        repo,
        gateway,
        makeSync() as unknown as SyncMangaFromSourceUseCase,
        makeLockApplier(),
        makeSummaryEnricher(),
        progress,
        chapterRepo,
      );

      const result = await sut.execute('solo-leveling', {
        userId: 'u1',
        role: 'USER',
      });
      await flushSetImmediate();

      expect(findByUserAndManga).toHaveBeenCalledWith('u1', 'm1');
      expect(chapterRepo.resolveChaptersReadCountsForBookmarks).toHaveBeenCalledWith(
        [{ mangaId: 'm1', bookmarkChapterId: 'ch1' }],
      );
      expect(result.chaptersReadCount).toBe(42);
    });

    it('should use chaptersReadCount 0 when ainda não há registro de progresso', async () => {
      const progress = makeReadingProgressRepo({
        findByUserAndManga: jest.fn().mockResolvedValue(null),
      });
      const repo = makeRepo({
        findBySlug: jest.fn().mockResolvedValue(DETAIL_STUB),
      });
      const gateway = makeGateway({
        getMangaBySlug: jest.fn().mockResolvedValue(EXTERNAL_MANGA),
      });
      const sut = new GetMangaBySlugUseCase(
        repo,
        gateway,
        makeSync() as unknown as SyncMangaFromSourceUseCase,
        makeLockApplier(),
        makeSummaryEnricher(),
        progress,
        makeChapterRepoForDetail(),
      );

      const result = await sut.execute('solo-leveling', {
        userId: 'u1',
        role: 'USER',
      });
      await flushSetImmediate();

      expect(result.chaptersReadCount).toBe(0);
    });
  });

  describe('Given manga does NOT exist in DB nor in external source', () => {
    it('should throw NotFoundError', async () => {
      const repo = makeRepo();
      const gateway = makeGateway();
      const sync = makeSync();

      const sut = new GetMangaBySlugUseCase(
        repo,
        gateway,
        sync as unknown as SyncMangaFromSourceUseCase,
        makeLockApplier(),
        makeSummaryEnricher(),
        makeReadingProgressRepo(),
        makeChapterRepoForDetail(),
      );

      await expect(sut.execute('non-existent')).rejects.toThrow(NotFoundError);
      expect(sync.execute).not.toHaveBeenCalled();
    });
  });

  describe('Given gateway fails but manga exists in DB', () => {
    it('should return from DB without throwing', async () => {
      const repo = makeRepo({
        findBySlug: jest.fn().mockResolvedValue(DETAIL_STUB),
      });
      const gateway = makeGateway({
        getMangaBySlug: jest
          .fn()
          .mockRejectedValue(new Error('network down')),
      });
      const sync = makeSync();

      const sut = new GetMangaBySlugUseCase(
        repo,
        gateway,
        sync as unknown as SyncMangaFromSourceUseCase,
        makeLockApplier(),
        makeSummaryEnricher(),
        makeReadingProgressRepo(),
        makeChapterRepoForDetail(),
      );
      const result = await sut.execute('solo-leveling');

      await flushSetImmediate();
      expect(sync.execute).toHaveBeenCalledWith('solo-leveling');

      expect(result.slug).toBe('solo-leveling');
      expect(repo.upsertBySlug).not.toHaveBeenCalled();
    });
  });

  describe('Given empty slug', () => {
    it('should throw NotFoundError', async () => {
      const repo = makeRepo();
      const gateway = makeGateway();
      const sync = makeSync();
      const sut = new GetMangaBySlugUseCase(
        repo,
        gateway,
        sync as unknown as SyncMangaFromSourceUseCase,
        makeLockApplier(),
        makeSummaryEnricher(),
        makeReadingProgressRepo(),
        makeChapterRepoForDetail(),
      );

      await expect(sut.execute('   ')).rejects.toThrow(NotFoundError);
      expect(gateway.getMangaBySlug).not.toHaveBeenCalled();
      expect(sync.execute).not.toHaveBeenCalled();
    });
  });
});
