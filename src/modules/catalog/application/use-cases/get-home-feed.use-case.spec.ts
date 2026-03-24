import { GetHomeFeedUseCase } from './get-home-feed.use-case';
import type {
  MangaRepositoryPort,
  MangaSummaryDto,
} from '../ports/manga.repository.port';
import type { ExternalMangaGatewayPort } from '../ports/external-manga-gateway.port';
import type { ListMangasParams } from '../ports/manga.repository.port';

const MANGA_STUB: MangaSummaryDto = {
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
  categories: [{ id: 'c1', name: 'Action', slug: 'action' }],
};

function makeRepo(overrides?: Partial<MangaRepositoryPort>): MangaRepositoryPort {
  return {
    findBySlug: jest.fn().mockResolvedValue(null),
    findByIdForListItem: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue({
      data: [MANGA_STUB],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    }),
    listBySlugs: jest.fn().mockResolvedValue([MANGA_STUB]),
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

function makeGateway(
  overrides?: Partial<ExternalMangaGatewayPort>,
): ExternalMangaGatewayPort {
  return {
    listMangas: jest.fn().mockResolvedValue([]),
    listTrending: jest.fn().mockResolvedValue([
      {
        id: 'ext-1',
        slug: 'solo-leveling',
        title: 'Solo Leveling',
        coverImage: 'https://img.test/cover.jpg',
      },
    ]),
    getMangaBySlug: jest.fn().mockResolvedValue(null),
    getChapterById: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('GetHomeFeedUseCase', () => {
  it('Given trending external data, should ingest and return sections from local db', async () => {
    const ratingPool: MangaSummaryDto[] = [
      MANGA_STUB,
      { ...MANGA_STUB, id: 'm2', slug: 'tower-of-god', title: 'ToG' },
      ...Array.from({ length: 22 }, (_, i) => ({
        ...MANGA_STUB,
        id: `rec-${i}`,
        slug: `rec-slug-${i}`,
        title: `Rec ${i}`,
      })),
    ];

    const repo = makeRepo({
      list: jest.fn((params: ListMangasParams) => {
        if (params.sortBy === 'rating') {
          return Promise.resolve({
            data: ratingPool,
            total: 100,
            page: params.page,
            limit: params.limit,
            totalPages: 4,
          });
        }
        if (params.sortBy === 'lastChapterAt') {
          return Promise.resolve({
            data: [{ ...MANGA_STUB, id: 'm3', slug: 'lat-1', title: 'Lat 1' }],
            total: 1,
            page: 1,
            limit: params.limit,
            totalPages: 1,
          });
        }
        return Promise.reject(new Error(`unexpected list sortBy=${params.sortBy}`));
      }),
      listBySlugs: jest.fn().mockResolvedValue([MANGA_STUB]),
    });
    const gateway = makeGateway();
    const sut = new GetHomeFeedUseCase(repo, gateway);

    const result = await sut.execute({ limit: 10, includeNsfw: true });

    expect(gateway.listTrending).toHaveBeenCalledWith({
      limit: 10,
      includeNsfw: true,
    });
    expect(repo.upsertBySlug).toHaveBeenCalled();
    expect(repo.listBySlugs).toHaveBeenCalledWith(['solo-leveling'], true);
    expect(repo.list).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sortBy: 'rating',
        page: 1,
        limit: 20,
        includeNsfw: true,
      }),
    );
    expect(repo.list).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sortBy: 'lastChapterAt',
        limit: 10,
        includeNsfw: true,
      }),
    );
    expect(result.trending).toHaveLength(1);
    expect(result.recommended).toHaveLength(10);
    expect(result.latestUpdates).toHaveLength(1);
  });

  it('should fallback trending to local views when external fails', async () => {
    const repo = makeRepo({
      list: jest.fn((params: ListMangasParams) => {
        if (params.sortBy === 'views') {
          return Promise.resolve({
            data: [MANGA_STUB],
            total: 1,
            page: 1,
            limit: params.limit,
            totalPages: 1,
          });
        }
        if (params.sortBy === 'rating') {
          return Promise.resolve({
            data: [
              MANGA_STUB,
              { ...MANGA_STUB, id: 'r1', slug: 'other-1', title: 'O1' },
            ],
            total: 2,
            page: params.page,
            limit: params.limit,
            totalPages: 1,
          });
        }
        if (params.sortBy === 'lastChapterAt') {
          return Promise.resolve({
            data: [MANGA_STUB],
            total: 1,
            page: 1,
            limit: params.limit,
            totalPages: 1,
          });
        }
        return Promise.reject(new Error(`unexpected list sortBy=${params.sortBy}`));
      }),
    });
    const gateway = makeGateway({
      listTrending: jest.fn().mockRejectedValue(new Error('network')),
    });
    const sut = new GetHomeFeedUseCase(repo, gateway);

    const result = await sut.execute({ limit: 5 });

    expect(repo.upsertBySlug).not.toHaveBeenCalled();
    expect(repo.list).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sortBy: 'views', limit: 5 }),
    );
    expect(result.trending).toHaveLength(1);
  });

  it('should paginate rating list until recommended reaches limit when first batch overlaps trending', async () => {
    const trendingSlugs = new Set(['t-0', 't-1', 't-2', 't-3', 't-4', 't-5', 't-6', 't-7', 't-8', 't-9']);
    const trending: MangaSummaryDto[] = Array.from({ length: 10 }, (_, i) => ({
      ...MANGA_STUB,
      id: `t${i}`,
      slug: `t-${i}`,
      title: `Trend ${i}`,
    }));

    const page1: MangaSummaryDto[] = Array.from({ length: 20 }, (_, i) => ({
      ...MANGA_STUB,
      id: `p1-${i}`,
      slug: `t-${i % 10}`,
      title: `Overlap ${i}`,
    }));
    const page2: MangaSummaryDto[] = Array.from({ length: 10 }, (_, i) => ({
      ...MANGA_STUB,
      id: `p2-${i}`,
      slug: `ok-${i}`,
      title: `Ok ${i}`,
    }));

    let ratingCalls = 0;
    const repo = makeRepo({
      list: jest.fn((params: ListMangasParams) => {
        if (params.sortBy === 'rating') {
          ratingCalls += 1;
          if (params.page === 1) {
            return Promise.resolve({
              data: page1,
              total: 50,
              page: 1,
              limit: params.limit,
              totalPages: 3,
            });
          }
          return Promise.resolve({
            data: page2,
            total: 50,
            page: 2,
            limit: params.limit,
            totalPages: 3,
          });
        }
        if (params.sortBy === 'lastChapterAt') {
          return Promise.resolve({
            data: [],
            total: 0,
            page: 1,
            limit: params.limit,
            totalPages: 0,
          });
        }
        return Promise.reject(new Error(`unexpected list sortBy=${params.sortBy}`));
      }),
      listBySlugs: jest.fn().mockResolvedValue(trending),
    });
    const gateway = makeGateway({
      listTrending: jest.fn().mockResolvedValue(
        trending.map((m) => ({
          id: m.id,
          slug: m.slug,
          title: m.title,
          coverImage: m.coverImage,
        })),
      ),
    });
    const sut = new GetHomeFeedUseCase(repo, gateway);

    const result = await sut.execute({ limit: 10, includeNsfw: true });

    expect(ratingCalls).toBe(2);
    expect(result.recommended).toHaveLength(10);
    expect(result.recommended.every((m) => m.slug.startsWith('ok-'))).toBe(true);
  });
});
