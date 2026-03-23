import { ListMangasUseCase } from './list-mangas.use-case';
import type {
  MangaRepositoryPort,
  MangaSummaryDto,
  PaginatedResult,
} from '../ports/manga.repository.port';

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
    upsertBySlug: jest.fn().mockResolvedValue({ id: 'm1' }),
    linkCategories: jest.fn().mockResolvedValue(undefined),
    getSyncStatus: jest.fn().mockResolvedValue(null),
    setSyncStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ListMangasUseCase', () => {
  it('should delegate to mangaRepo.list with defaults', async () => {
    const repo = makeRepo();
    const sut = new ListMangasUseCase(repo);

    const result = await sut.execute({});

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
    const sut = new ListMangasUseCase(repo);

    await sut.execute({ limit: 500 });

    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
  });

  it('should forward all filter params', async () => {
    const repo = makeRepo();
    const sut = new ListMangasUseCase(repo);

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
});
