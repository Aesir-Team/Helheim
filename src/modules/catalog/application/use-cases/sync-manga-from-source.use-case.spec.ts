import { ConfigService } from '@nestjs/config';
import { SyncMangaFromSourceUseCase } from './sync-manga-from-source.use-case';
import type { MangaRepositoryPort } from '../ports/manga.repository.port';
import type { ChapterRepositoryPort } from '../ports/chapter.repository.port';
import type { ExternalMangaGatewayPort } from '../ports/external-manga-gateway.port';
import type { MangaSyncProgressPort } from '../ports/manga-sync-progress.port';

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
      .mockResolvedValue({ syncStatus: 'idle', lastSyncedAt: null }),
    setSyncStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeChapterRepo(
  overrides?: Partial<ChapterRepositoryPort>,
): ChapterRepositoryPort {
  return {
    findExistingNumbersByMangaId: jest.fn().mockResolvedValue([]),
    countPublishedByMangaId: jest.fn().mockResolvedValue(0),
    countPublishedWithNumberAtMost: jest.fn().mockResolvedValue(0),
    resolveChaptersReadCountsForBookmarks: jest
      .fn()
      .mockImplementation((items: readonly unknown[]) =>
        Promise.resolve(items.map(() => 0)),
      ),
    listByMangaSlug: jest.fn().mockResolvedValue({ data: [], total: 0 }),
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

function makeProgress(): MangaSyncProgressPort {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
    getLatestBySlug: jest.fn().mockResolvedValue(null),
  };
}

function makeConfig(
  overrides: Record<string, string | number> = {},
): ConfigService {
  const defaults: Record<string, string | number> = {
    MANGA_SYNC_DEADLINE_MS: 3 * 60 * 60 * 1000,
    MANGA_SYNC_CHAPTER_DELAY_MS: 0,
    MANGA_SYNC_REDIS_TTL_SEC: 3600,
  };
  const map = { ...defaults, ...overrides };
  return {
    get: jest.fn(<T = unknown>(key: string): T => map[key] as T),
  } as unknown as ConfigService;
}

function makeSut(
  repo: MangaRepositoryPort,
  chapterRepo: ChapterRepositoryPort,
  gateway: ExternalMangaGatewayPort,
  progress?: MangaSyncProgressPort,
  config?: ConfigService,
): SyncMangaFromSourceUseCase {
  return new SyncMangaFromSourceUseCase(
    repo,
    chapterRepo,
    gateway,
    progress ?? makeProgress(),
    config ?? makeConfig(),
  );
}

describe('SyncMangaFromSourceUseCase', () => {
  it('should skip if already syncing', async () => {
    const repo = makeRepo({
      getSyncStatus: jest
        .fn()
        .mockResolvedValue({ syncStatus: 'syncing', lastSyncedAt: null }),
    });
    const sut = makeSut(repo, makeChapterRepo(), makeGateway());

    const result = await sut.execute('test-slug');

    expect(result).toBeNull();
    expect(repo.setSyncStatus).not.toHaveBeenCalled();
  });

  it('should skip if recently synced within cooldown', async () => {
    const repo = makeRepo({
      getSyncStatus: jest.fn().mockResolvedValue({
        syncStatus: 'idle',
        lastSyncedAt: new Date(),
      }),
    });
    const gateway = makeGateway();
    const sut = makeSut(repo, makeChapterRepo(), gateway);

    const result = await sut.execute('fresh-slug');

    expect(result).toBeNull();
    expect(repo.setSyncStatus).not.toHaveBeenCalled();
    expect(gateway.getMangaBySlug).not.toHaveBeenCalled();
  });

  it('should return null if gateway returns nothing', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const sut = makeSut(repo, makeChapterRepo(), gateway);

    const result = await sut.execute('non-existent');

    expect(repo.setSyncStatus).toHaveBeenCalledWith('non-existent', 'syncing');
    expect(repo.setSyncStatus).toHaveBeenCalledWith('non-existent', 'idle');
    expect(result).toBeNull();
  });

  it('should upsert manga and chapters from gateway', async () => {
    const repo = makeRepo();
    const chapterRepo = makeChapterRepo();
    const progress = makeProgress();
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockResolvedValue({
        id: 'ext-1',
        slug: 'solo-leveling',
        title: 'Solo Leveling',
        coverImage: 'https://img/cover.jpg',
        type: 'manhwa',
        chapters: [
          { id: 'ext-ch-1', number: '1', title: 'Ch 1' },
          { id: 'ext-ch-2', number: '2', title: 'Ch 2' },
        ],
      }),
      getChapterById: jest.fn().mockResolvedValue({
        id: 'ext-ch-1',
        pages: [{ pageNumber: 1, imageUrl: 'https://img/1.jpg' }],
      }),
    });

    const sut = makeSut(repo, chapterRepo, gateway, progress);
    const result = await sut.execute('solo-leveling');

    expect(repo.upsertBySlug).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'solo-leveling',
        title: 'Solo Leveling',
      }),
    );
    expect(repo.mergeReportedChapterCount).toHaveBeenCalledWith(
      'solo-leveling',
      2,
    );
    expect(gateway.getChapterById).toHaveBeenCalledTimes(2);
    expect(chapterRepo.upsertByMangaAndNumber).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ mangaId: 'm1', chaptersUpserted: 2 });
    expect(chapterRepo.applyFreeTierAccessForManga).toHaveBeenCalledWith('m1', {
      freeFraction: 0.1,
      coinChapterCost: 1,
    });
    expect(progress.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        slug: 'solo-leveling',
        mangaType: 'manhwa',
        totalChapters: 2,
        chaptersProcessed: 2,
      }),
    );
  });

  it('should sync only chapters not yet persisted by number', async () => {
    const chapterRepo = makeChapterRepo({
      findExistingNumbersByMangaId: jest.fn().mockResolvedValue(['1']),
    });
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockResolvedValue({
        id: 'ext-1',
        slug: 'solo-leveling',
        title: 'Solo Leveling',
        coverImage: 'https://img/cover.jpg',
        type: 'manhwa',
        chapters: [
          { id: 'ext-ch-1', number: '1', title: 'Ch 1' },
          { id: 'ext-ch-2', number: '2', title: 'Ch 2' },
        ],
      }),
      getChapterById: jest.fn().mockResolvedValue({
        id: 'ext-ch-2',
        pages: [{ pageNumber: 1, imageUrl: 'https://img/2.jpg' }],
      }),
    });
    const progress = makeProgress();
    const sut = makeSut(makeRepo(), chapterRepo, gateway, progress);

    const result = await sut.execute('solo-leveling');

    expect(chapterRepo.findExistingNumbersByMangaId).toHaveBeenCalledWith(
      'm1',
      ['1', '2'],
    );
    expect(gateway.getChapterById).toHaveBeenCalledTimes(1);
    expect(gateway.getChapterById).toHaveBeenCalledWith('ext-ch-2');
    expect(chapterRepo.upsertByMangaAndNumber).toHaveBeenCalledTimes(1);
    expect(chapterRepo.upsertByMangaAndNumber).toHaveBeenCalledWith(
      expect.objectContaining({ number: '2' }),
    );
    expect(result).toEqual({ mangaId: 'm1', chaptersUpserted: 1 });
    expect(chapterRepo.applyFreeTierAccessForManga).toHaveBeenCalledWith('m1', {
      freeFraction: 0.1,
      coinChapterCost: 1,
    });
    expect(progress.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'running',
        slug: 'solo-leveling',
        totalChapters: 2,
        chaptersProcessed: 1,
      }),
    );
    expect(progress.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        totalChapters: 2,
        chaptersProcessed: 2,
      }),
    );
  });

  it('Given deadline 0, should timeout before getChapterById and publish timeout state', async () => {
    const repo = makeRepo();
    const chapterRepo = makeChapterRepo();
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockResolvedValue({
        id: 'ext-1',
        slug: 'slow',
        title: 'Slow',
        coverImage: 'c',
        chapters: [{ id: 'c1', number: '1', title: 'One' }],
      }),
      getChapterById: jest.fn(),
    });
    const progress = makeProgress();
    const sut = makeSut(
      repo,
      chapterRepo,
      gateway,
      progress,
      makeConfig({
        MANGA_SYNC_DEADLINE_MS: 0,
        MANGA_SYNC_CHAPTER_DELAY_MS: 0,
      }),
    );

    const result = await sut.execute('slow');

    expect(result).toEqual({ mangaId: 'm1', chaptersUpserted: 0 });
    expect(chapterRepo.applyFreeTierAccessForManga).toHaveBeenCalledWith('m1', {
      freeFraction: 0.1,
      coinChapterCost: 1,
    });
    expect(gateway.getChapterById).not.toHaveBeenCalled();
    expect(progress.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'timeout',
        slug: 'slow',
        totalChapters: 1,
        chaptersProcessed: 0,
        errorMessage: 'manga_sync_deadline_exceeded',
      }),
    );
    expect(repo.setSyncStatus).toHaveBeenCalledWith(
      'slow',
      'error',
      'manga_sync_deadline_exceeded',
    );
  });

  it('should filter out draft chapters', async () => {
    const chapterRepo = makeChapterRepo();
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockResolvedValue({
        id: 'ext-1',
        slug: 'test-manga',
        title: 'Test',
        coverImage: 'c',
        chapters: [
          {
            id: 'ch-1',
            number: '1',
            title: 'Published',
            releaseStatus: 'published',
          },
          { id: 'ch-2', number: '2', title: 'Draft', releaseStatus: 'draft' },
          { id: 'ch-3', number: '3', title: 'No status' },
        ],
      }),
      getChapterById: jest.fn().mockResolvedValue({
        id: 'ch-1',
        pages: [{ pageNumber: 1, imageUrl: 'https://img/1.jpg' }],
      }),
    });

    const sut = makeSut(makeRepo(), chapterRepo, gateway);
    const result = await sut.execute('test-manga');

    expect(gateway.getChapterById).toHaveBeenCalledTimes(2);
    expect(gateway.getChapterById).toHaveBeenCalledWith('ch-1');
    expect(gateway.getChapterById).toHaveBeenCalledWith('ch-3');
    expect(gateway.getChapterById).not.toHaveBeenCalledWith('ch-2');
    expect(result).toEqual({ mangaId: 'm1', chaptersUpserted: 2 });
  });

  it('should propagate accessLevel and coinCost to chapter upsert', async () => {
    const chapterRepo = makeChapterRepo();
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockResolvedValue({
        id: 'ext-1',
        slug: 'test-manga',
        title: 'Test',
        coverImage: 'c',
        chapters: [
          {
            id: 'ch-1',
            number: '1',
            title: 'Coin Chapter',
            releaseStatus: 'published',
            accessLevel: 'coin',
            coinCost: 5,
          },
        ],
      }),
      getChapterById: jest.fn().mockResolvedValue({
        id: 'ch-1',
        accessLevel: 'coin',
        coinCost: 5,
        pages: [{ pageNumber: 1, imageUrl: 'https://img/1.jpg' }],
      }),
    });

    const sut = makeSut(makeRepo(), chapterRepo, gateway);
    await sut.execute('test-manga');

    expect(chapterRepo.upsertByMangaAndNumber).toHaveBeenCalledWith(
      expect.objectContaining({
        accessLevel: 'coin',
        coinCost: 5,
        releaseStatus: 'published',
      }),
    );
  });

  it('should use mangaType key manga for doujinshi in progress payload', async () => {
    const progress = makeProgress();
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockResolvedValue({
        id: 'ext-1',
        slug: 'dj',
        title: 'DJ',
        coverImage: 'c',
        type: 'doujinshi',
        chapters: [
          { id: 'c1', number: '1', title: 'A', releaseStatus: 'published' },
        ],
      }),
      getChapterById: jest.fn().mockResolvedValue({
        id: 'c1',
        pages: [{ pageNumber: 1, imageUrl: 'https://cdn/x.png' }],
      }),
    });

    const sut = makeSut(makeRepo(), makeChapterRepo(), gateway, progress);
    await sut.execute('dj');

    expect(progress.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        mangaType: 'manga',
        slug: 'dj',
        lastImageUrlPreview: ['https://cdn/x.png'],
      }),
    );
  });

  it('should link categories when present', async () => {
    const repo = makeRepo();
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockResolvedValue({
        id: 'ext-1',
        slug: 'cat-manga',
        title: 'Cat Manga',
        coverImage: 'c',
        categories: [
          {
            id: '1',
            name: 'Action',
            slug: 'action',
            type: 'genre',
            isNsfw: false,
          },
          {
            id: '2',
            name: 'Fantasy',
            slug: 'fantasy',
            type: 'genre',
            isNsfw: false,
          },
        ],
      }),
    });

    const sut = makeSut(repo, makeChapterRepo(), gateway);
    await sut.execute('cat-manga');

    expect(repo.linkCategories).toHaveBeenCalledWith('m1', [
      { name: 'Action', slug: 'action', type: 'genre', isNsfw: false },
      { name: 'Fantasy', slug: 'fantasy', type: 'genre', isNsfw: false },
    ]);
  });

  it('should not call linkCategories when no categories', async () => {
    const repo = makeRepo();
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockResolvedValue({
        id: 'ext-1',
        slug: 'no-cats',
        title: 'No Cats',
        coverImage: 'c',
      }),
    });

    const sut = makeSut(repo, makeChapterRepo(), gateway);
    await sut.execute('no-cats');

    expect(repo.linkCategories).not.toHaveBeenCalled();
  });

  it('should set error status on gateway failure', async () => {
    const repo = makeRepo();
    const progress = makeProgress();
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockRejectedValue(new Error('Network error')),
    });

    const sut = makeSut(repo, makeChapterRepo(), gateway, progress);
    const result = await sut.execute('fail-slug');

    expect(repo.setSyncStatus).toHaveBeenCalledWith(
      'fail-slug',
      'error',
      'Network error',
    );
    expect(result).toBeNull();
    expect(progress.publish).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', slug: 'fail-slug' }),
    );
  });
});
