import { GetMangaBySlugUseCase } from './get-manga-by-slug.use-case';
import type {
  MangaRepositoryPort,
  MangaDetailDto,
} from '../ports/manga.repository.port';
import type { ExternalMangaGatewayPort } from '../ports/external-manga-gateway.port';
import { NotFoundError } from '../../../../shared/domain/errors';

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
  latestChapters: [],
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
    upsertBySlug: jest.fn().mockResolvedValue({ id: 'm1' }),
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

describe('GetMangaBySlugUseCase', () => {
  describe('Given manga exists in DB', () => {
    it('should return from DB without calling gateway', async () => {
      const repo = makeRepo({
        findBySlug: jest.fn().mockResolvedValue(DETAIL_STUB),
      });
      const gateway = makeGateway();
      const sut = new GetMangaBySlugUseCase(repo, gateway);

      const result = await sut.execute('solo-leveling');

      expect(result.slug).toBe('solo-leveling');
      expect(gateway.getMangaBySlug).not.toHaveBeenCalled();
    });
  });

  describe('Given manga does NOT exist in DB but exists in external source', () => {
    it('should fetch from gateway, persist, and return', async () => {
      const findBySlug = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(DETAIL_STUB);

      const repo = makeRepo({ findBySlug });
      const gateway = makeGateway({
        getMangaBySlug: jest.fn().mockResolvedValue({
          id: 'ext-1',
          slug: 'solo-leveling',
          title: 'Solo Leveling',
          coverImage: 'https://img.test/cover.jpg',
        }),
      });

      const sut = new GetMangaBySlugUseCase(repo, gateway);
      const result = await sut.execute('solo-leveling');

      expect(gateway.getMangaBySlug).toHaveBeenCalledWith('solo-leveling');
      expect(repo.upsertBySlug).toHaveBeenCalled();
      expect(result.slug).toBe('solo-leveling');
    });
  });

  describe('Given manga does NOT exist in DB nor in external source', () => {
    it('should throw NotFoundError', async () => {
      const repo = makeRepo();
      const gateway = makeGateway();

      const sut = new GetMangaBySlugUseCase(repo, gateway);

      await expect(sut.execute('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Given manga exists in DB and sync is stale (>24h)', () => {
    it('should return from DB immediately (background sync is fire-and-forget)', async () => {
      const repo = makeRepo({
        findBySlug: jest.fn().mockResolvedValue(DETAIL_STUB),
        getSyncStatus: jest.fn().mockResolvedValue({
          syncStatus: 'idle',
          lastSyncedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        }),
      });
      const gateway = makeGateway();

      const sut = new GetMangaBySlugUseCase(repo, gateway);
      const result = await sut.execute('solo-leveling');

      expect(result.slug).toBe('solo-leveling');
    });
  });
});
