import { SyncMangaFromSourceUseCase } from './sync-manga-from-source.use-case';
import type { MangaRepositoryPort } from '../ports/manga.repository.port';
import type { ChapterRepositoryPort } from '../ports/chapter.repository.port';
import type { ExternalMangaGatewayPort } from '../ports/external-manga-gateway.port';

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
    upsertBySlug: jest.fn().mockResolvedValue({ id: 'm1' }),
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
    listByMangaSlug: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    findById: jest.fn().mockResolvedValue(null),
    findNeighborChapterIds: jest
      .fn()
      .mockResolvedValue({ prevChapterId: null, nextChapterId: null }),
    upsertByMangaAndNumber: jest.fn().mockResolvedValue({ id: 'ch-1' }),
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

describe('SyncMangaFromSourceUseCase', () => {
  it('should skip if already syncing', async () => {
    const repo = makeRepo({
      getSyncStatus: jest
        .fn()
        .mockResolvedValue({ syncStatus: 'syncing', lastSyncedAt: null }),
    });
    const sut = new SyncMangaFromSourceUseCase(
      repo,
      makeChapterRepo(),
      makeGateway(),
    );

    const result = await sut.execute('test-slug');

    expect(result).toBeNull();
    expect(repo.setSyncStatus).not.toHaveBeenCalled();
  });

  it('should return null if gateway returns nothing', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const sut = new SyncMangaFromSourceUseCase(
      repo,
      makeChapterRepo(),
      gateway,
    );

    const result = await sut.execute('non-existent');

    expect(repo.setSyncStatus).toHaveBeenCalledWith('non-existent', 'syncing');
    expect(repo.setSyncStatus).toHaveBeenCalledWith('non-existent', 'idle');
    expect(result).toBeNull();
  });

  it('should upsert manga and chapters from gateway', async () => {
    const repo = makeRepo();
    const chapterRepo = makeChapterRepo();
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockResolvedValue({
        id: 'ext-1',
        slug: 'solo-leveling',
        title: 'Solo Leveling',
        coverImage: 'https://img/cover.jpg',
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

    const sut = new SyncMangaFromSourceUseCase(repo, chapterRepo, gateway);
    const result = await sut.execute('solo-leveling');

    expect(repo.upsertBySlug).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'solo-leveling',
        title: 'Solo Leveling',
      }),
    );
    expect(gateway.getChapterById).toHaveBeenCalledTimes(2);
    expect(chapterRepo.upsertByMangaAndNumber).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ mangaId: 'm1', chaptersUpserted: 2 });
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

    const sut = new SyncMangaFromSourceUseCase(
      makeRepo(),
      chapterRepo,
      gateway,
    );
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

    const sut = new SyncMangaFromSourceUseCase(
      makeRepo(),
      chapterRepo,
      gateway,
    );
    await sut.execute('test-manga');

    expect(chapterRepo.upsertByMangaAndNumber).toHaveBeenCalledWith(
      expect.objectContaining({
        accessLevel: 'coin',
        coinCost: 5,
        releaseStatus: 'published',
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

    const sut = new SyncMangaFromSourceUseCase(
      repo,
      makeChapterRepo(),
      gateway,
    );
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

    const sut = new SyncMangaFromSourceUseCase(
      repo,
      makeChapterRepo(),
      gateway,
    );
    await sut.execute('no-cats');

    expect(repo.linkCategories).not.toHaveBeenCalled();
  });

  it('should set error status on gateway failure', async () => {
    const repo = makeRepo();
    const gateway = makeGateway({
      getMangaBySlug: jest.fn().mockRejectedValue(new Error('Network error')),
    });

    const sut = new SyncMangaFromSourceUseCase(
      repo,
      makeChapterRepo(),
      gateway,
    );
    const result = await sut.execute('fail-slug');

    expect(repo.setSyncStatus).toHaveBeenCalledWith(
      'fail-slug',
      'error',
      'Network error',
    );
    expect(result).toBeNull();
  });
});
