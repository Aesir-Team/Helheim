import { ConfigService } from '@nestjs/config';
import { SyncMangaFromSourceUseCase } from './sync-manga-from-source.use-case';
import type { MangaRepositoryPort } from '../ports/manga.repository.port';
import type { ChapterRepositoryPort } from '../ports/chapter.repository.port';
import type { ExternalMangaGatewayPort } from '../ports/external-manga-gateway.port';
import type { MangaSyncProgressPort } from '../ports/manga-sync-progress.port';
import {
  ForbiddenError,
  MangaSourceUnavailableError,
} from '../../../../shared/domain/errors';
import type { MangaExternalSourceRepositoryPort } from '../ports/manga-external-source.repository.port';
import { fakeSourceAdapterResolverFromGateway } from '../test-utils/fake-source-adapter-resolver';
import { ResolveMangaSourceUseCase } from './resolve-manga-source.use-case';

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

function makeExternalSourceRepo(
  overrides?: Partial<MangaExternalSourceRepositoryPort>,
): MangaExternalSourceRepositoryPort {
  return {
    findById: jest.fn().mockResolvedValue(null),
    getSyncStatus: jest
      .fn()
      .mockResolvedValue({ syncStatus: 'idle', lastSyncedAt: null }),
    setSyncStatus: jest.fn().mockResolvedValue(undefined),
    markSourceSyncSuccess: jest.fn().mockResolvedValue(undefined),
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

function makeResolveMangaSource(
  overrides?: Partial<Pick<ResolveMangaSourceUseCase, 'execute'>>,
): ResolveMangaSourceUseCase {
  const execute =
    overrides?.execute ??
    jest.fn((input: { slug: string }) =>
      Promise.resolve({
        kind: 'legacy_default' as const,
        canonicalSlug: input.slug,
        provider: 'NEXUSTOONS' as const,
      }),
    );
  return { execute } as unknown as ResolveMangaSourceUseCase;
}

function makeSut(
  repo: MangaRepositoryPort,
  chapterRepo: ChapterRepositoryPort,
  gateway: ExternalMangaGatewayPort,
  progress?: MangaSyncProgressPort,
  config?: ConfigService,
  resolveMangaSource?: ResolveMangaSourceUseCase,
  externalSourceRepo?: MangaExternalSourceRepositoryPort,
): SyncMangaFromSourceUseCase {
  return new SyncMangaFromSourceUseCase(
    repo,
    chapterRepo,
    fakeSourceAdapterResolverFromGateway(gateway),
    progress ?? makeProgress(),
    config ?? makeConfig(),
    resolveMangaSource ?? makeResolveMangaSource(),
    externalSourceRepo ?? makeExternalSourceRepo(),
  );
}

describe('SyncMangaFromSourceUseCase', () => {
  it('should set sync error when source resolution reports unavailable hub', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const resolve = makeResolveMangaSource({
      execute: jest
        .fn()
        .mockRejectedValue(
          new MangaSourceUnavailableError('Nenhuma fonte ativa elegível'),
        ),
    });
    const sut = makeSut(
      repo,
      makeChapterRepo(),
      gateway,
      undefined,
      undefined,
      resolve,
    );

    const result = await sut.execute('blocked-slug');

    expect(result).toBeNull();
    expect(repo.setSyncStatus).toHaveBeenCalledWith('blocked-slug', 'syncing');
    expect(repo.setSyncStatus).toHaveBeenCalledWith(
      'blocked-slug',
      'error',
      'Nenhuma fonte ativa elegível',
    );
    expect(gateway.getMangaBySlug).not.toHaveBeenCalled();
  });

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
    expect(result).toEqual({
      mangaId: 'm1',
      chaptersUpserted: 2,
      kind: 'catalog',
    });
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
    expect(result).toEqual({
      mangaId: 'm1',
      chaptersUpserted: 1,
      kind: 'catalog',
    });
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

    expect(result).toEqual({
      mangaId: 'm1',
      chaptersUpserted: 0,
      kind: 'catalog',
    });
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
    expect(result).toEqual({
      mangaId: 'm1',
      chaptersUpserted: 2,
      kind: 'catalog',
    });
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

  describe('private_library sync', () => {
    const privateSourceBase = {
      id: 'src-priv',
      mangaId: 'm1',
      provider: 'NEXUSTOONS',
      externalId: 'ext-x',
      isUserScoped: true,
      ownerUserId: 'user-1',
      ownerInstallationId: null as string | null,
      isActive: true,
    };

    it('should throw ForbiddenError when source is not user-scoped', async () => {
      const extRepo = makeExternalSourceRepo({
        findById: jest.fn().mockResolvedValue({
          ...privateSourceBase,
          isUserScoped: false,
          ownerUserId: null,
        }),
      });
      const sut = makeSut(
        makeRepo(),
        makeChapterRepo(),
        makeGateway(),
        undefined,
        undefined,
        undefined,
        extRepo,
      );
      await expect(
        sut.execute({
          kind: 'private_library',
          slug: 'solo-leveling',
          sourceId: 'src-priv',
          actorUserId: 'user-1',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when actor does not own source', async () => {
      const extRepo = makeExternalSourceRepo({
        findById: jest.fn().mockResolvedValue(privateSourceBase),
      });
      const sut = makeSut(
        makeRepo(),
        makeChapterRepo(),
        makeGateway(),
        undefined,
        undefined,
        undefined,
        extRepo,
      );
      await expect(
        sut.execute({
          kind: 'private_library',
          slug: 'solo-leveling',
          sourceId: 'src-priv',
          actorUserId: 'other',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should touch adapter and source row without upserting manga or chapters', async () => {
      const findByIdForListItem = jest.fn().mockResolvedValue({
        id: 'm1',
        title: 'Solo',
        slug: 'solo-leveling',
        coverImage: 'c',
      });
      const repo = makeRepo({ findByIdForListItem });
      const chapterRepo = makeChapterRepo();
      const gateway = makeGateway({
        getMangaBySlug: jest.fn().mockResolvedValue({
          id: 'ext-1',
          slug: 'solo-leveling',
          title: 'Solo Leveling',
          coverImage: 'x',
          type: 'manhwa',
        }),
      });
      const markSourceSyncSuccess = jest.fn().mockResolvedValue(undefined);
      const extRepo = makeExternalSourceRepo({
        findById: jest.fn().mockResolvedValue(privateSourceBase),
        getSyncStatus: jest
          .fn()
          .mockResolvedValue({ syncStatus: 'idle', lastSyncedAt: null }),
        setSyncStatus: jest.fn().mockResolvedValue(undefined),
        markSourceSyncSuccess,
      });
      const sut = makeSut(
        repo,
        chapterRepo,
        gateway,
        undefined,
        undefined,
        undefined,
        extRepo,
      );

      const result = await sut.execute({
        kind: 'private_library',
        slug: 'solo-leveling',
        sourceId: 'src-priv',
        actorUserId: 'user-1',
      });

      expect(result).toEqual({
        mangaId: 'm1',
        chaptersUpserted: 0,
        kind: 'private_library',
        catalogWritesSkipped: true,
      });
      expect(repo.upsertBySlug).not.toHaveBeenCalled();
      expect(chapterRepo.upsertByMangaAndNumber).not.toHaveBeenCalled();
      expect(markSourceSyncSuccess).toHaveBeenCalledWith('src-priv');
      expect(gateway.getMangaBySlug).toHaveBeenCalledWith('solo-leveling');
    });
  });
});
