import { GetHomeFeedUseCase } from './get-home-feed.use-case';
import type {
  MangaRepositoryPort,
  MangaSummaryDto,
} from '../ports/manga.repository.port';
import type { ExternalMangaGatewayPort } from '../ports/external-manga-gateway.port';

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
    const repo = makeRepo({
      list: jest
        .fn()
        .mockResolvedValueOnce({
          data: [
            MANGA_STUB,
            { ...MANGA_STUB, id: 'm2', slug: 'tower-of-god', title: 'ToG' },
          ],
          total: 2,
          page: 1,
          limit: 30,
          totalPages: 1,
        })
        .mockResolvedValueOnce({
          data: [{ ...MANGA_STUB, id: 'm3', slug: 'lat-1', title: 'Lat 1' }],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
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
      expect.objectContaining({ sortBy: 'rating', limit: 30, includeNsfw: true }),
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
    expect(result.recommended).toHaveLength(1);
    expect(result.latestUpdates).toHaveLength(1);
  });

  it('should fallback trending to local views when external fails', async () => {
    const repo = makeRepo({
      list: jest
        .fn()
        .mockResolvedValueOnce({
          data: [MANGA_STUB],
          total: 1,
          page: 1,
          limit: 5,
          totalPages: 1,
        })
        .mockResolvedValueOnce({
          data: [MANGA_STUB],
          total: 1,
          page: 1,
          limit: 15,
          totalPages: 1,
        })
        .mockResolvedValueOnce({
          data: [MANGA_STUB],
          total: 1,
          page: 1,
          limit: 5,
          totalPages: 1,
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
});
