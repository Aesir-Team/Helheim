import { ListMangasUseCase } from './list-mangas.use-case';
import type {
  MangaRepositoryPort,
  MangaSummaryDto,
  PaginatedResult,
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

function makeRepo(
  overrides?: Partial<MangaRepositoryPort>,
): MangaRepositoryPort {
  const result: PaginatedResult<MangaSummaryDto> = {
    data: [MANGA_STUB],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };
  return {
    findBySlug: jest.fn().mockResolvedValue(null),
    findByIdForListItem: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue(result),
    listBySlugs: jest.fn().mockResolvedValue([]),
    upsertBySlug: jest.fn().mockResolvedValue({ id: 'm1' }),
    linkCategories: jest.fn().mockResolvedValue(undefined),
    getSyncStatus: jest.fn().mockResolvedValue(null),
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

const EXTERNAL_ITEM = {
  id: 'ext-1',
  slug: 'new-from-nexus',
  title: 'New From Nexus',
  coverImage: 'https://img.test/n.jpg',
  alternativeTitles: null,
  description: null,
  bannerImage: null,
  status: 'ongoing',
  type: 'manhwa',
  rating: 4,
  views: 10,
  releaseYear: null,
  isNsfw: false,
  author: null,
  artist: null,
  officialLink: null,
  lastChapterAt: '2026-01-01T00:00:00.000Z',
};

describe('ListMangasUseCase', () => {
  it('should delegate to mangaRepo.list with defaults', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const sut = new ListMangasUseCase(repo, gateway);

    const result = await sut.execute({});

    expect(gateway.listMangas).not.toHaveBeenCalled();
    expect(repo.list).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      type: undefined,
      status: undefined,
      categorySlug: undefined,
      search: undefined,
      sortBy: undefined,
      includeNsfw: undefined,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].slug).toBe('solo-leveling');
  });

  it('should cap limit at 100', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const sut = new ListMangasUseCase(repo, gateway);

    await sut.execute({ limit: 500 });

    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
  });

  it('should forward all filter params', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const sut = new ListMangasUseCase(repo, gateway);

    await sut.execute({
      page: 2,
      limit: 10,
      type: 'manhwa',
      status: 'ongoing',
      categorySlug: 'action',
      search: 'solo',
      sortBy: 'views',
      includeNsfw: true,
    });

    expect(repo.list).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      type: 'manhwa',
      status: 'ongoing',
      categorySlug: 'action',
      search: 'solo',
      sortBy: 'views',
      includeNsfw: true,
    });
  });

  it('should not call external gateway when search is empty or whitespace', async () => {
    const repo = makeRepo();
    const gateway = makeGateway();
    const sut = new ListMangasUseCase(repo, gateway);

    await sut.execute({ search: '   ' });

    expect(gateway.listMangas).not.toHaveBeenCalled();
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: undefined }),
    );
  });

  it('Given search text, should ingest Nexustoons matches then list from repo', async () => {
    const repo = makeRepo();
    const gateway = makeGateway({
      listMangas: jest.fn().mockResolvedValue([EXTERNAL_ITEM]),
    });
    const sut = new ListMangasUseCase(repo, gateway);

    await sut.execute({ search: '  nexus  ', limit: 10, sortBy: 'views' });

    expect(gateway.listMangas).toHaveBeenCalledWith({
      search: 'nexus',
      limit: 24,
      includeNsfw: null,
      sortBy: 'views',
    });
    expect(repo.upsertBySlug).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'new-from-nexus',
        title: 'New From Nexus',
        externalId: 'ext-1',
      }),
    );
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'nexus',
        limit: 10,
        sortBy: 'views',
      }),
    );
  });

  it('should pass sortBy null to external when repo sort is not supported by Nexustoons', async () => {
    const repo = makeRepo();
    const gateway = makeGateway({ listMangas: jest.fn().mockResolvedValue([]) });
    const sut = new ListMangasUseCase(repo, gateway);

    await sut.execute({ search: 'x', sortBy: 'rating' });

    expect(gateway.listMangas).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: null }),
    );
  });

  it('should still list from repo when external search fails', async () => {
    const repo = makeRepo();
    const gateway = makeGateway({
      listMangas: jest.fn().mockRejectedValue(new Error('network')),
    });
    const sut = new ListMangasUseCase(repo, gateway);

    const result = await sut.execute({ search: 'fail' });

    expect(repo.upsertBySlug).not.toHaveBeenCalled();
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'fail' }),
    );
    expect(result.data).toHaveLength(1);
  });
});
