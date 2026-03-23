import { ListChaptersUseCase } from './list-chapters.use-case';
import type {
  ChapterRepositoryPort,
  ChapterSummaryDto,
} from '../ports/chapter.repository.port';

const CHAPTER_STUB: ChapterSummaryDto = {
  id: 'ch-1',
  mangaId: 'm1',
  number: '1',
  title: 'Chapter 1',
  accessLevel: 'public',
  coinCost: 0,
  createdAt: new Date('2026-01-01'),
};

function makeRepo(
  overrides?: Partial<ChapterRepositoryPort>,
): ChapterRepositoryPort {
  return {
    listByMangaSlug: jest
      .fn()
      .mockResolvedValue({ data: [CHAPTER_STUB], total: 1 }),
    findById: jest.fn().mockResolvedValue(null),
    findNeighborChapterIds: jest
      .fn()
      .mockResolvedValue({ prevChapterId: null, nextChapterId: null }),
    upsertByMangaAndNumber: jest.fn().mockResolvedValue({ id: 'ch-1' }),
    ...overrides,
  };
}

describe('ListChaptersUseCase', () => {
  it('should list chapters with defaults (desc, page 1, limit 50)', async () => {
    const repo = makeRepo();
    const sut = new ListChaptersUseCase(repo);

    const result = await sut.execute({ mangaSlug: 'solo-leveling' });

    expect(repo.listByMangaSlug).toHaveBeenCalledWith('solo-leveling', {
      order: 'desc',
      page: 1,
      limit: 50,
    });
    expect(result.data).toHaveLength(1);
  });

  it('should cap limit at 200', async () => {
    const repo = makeRepo();
    const sut = new ListChaptersUseCase(repo);

    await sut.execute({ mangaSlug: 'test', limit: 999 });

    expect(repo.listByMangaSlug).toHaveBeenCalledWith('test', {
      order: 'desc',
      page: 1,
      limit: 200,
    });
  });

  it('should forward order and page params', async () => {
    const repo = makeRepo();
    const sut = new ListChaptersUseCase(repo);

    await sut.execute({ mangaSlug: 'test', order: 'asc', page: 3, limit: 10 });

    expect(repo.listByMangaSlug).toHaveBeenCalledWith('test', {
      order: 'asc',
      page: 3,
      limit: 10,
    });
  });
});
