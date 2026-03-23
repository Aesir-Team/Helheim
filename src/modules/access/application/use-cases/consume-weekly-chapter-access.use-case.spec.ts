import { ConsumeWeeklyChapterAccessUseCase } from './consume-weekly-chapter-access.use-case';
import type { WeeklyChapterAccessRepositoryPort } from '../ports/weekly-chapter-access.repository.port';

describe('ConsumeWeeklyChapterAccessUseCase', () => {
  it('Given accessLevel coin, should skip repository', async () => {
    const repo: WeeklyChapterAccessRepositoryPort = {
      existsForUserChapterWeek: jest.fn(),
      countDistinctChaptersForWeek: jest.fn(),
      createIfNotExists: jest.fn(),
    };
    const sut = new ConsumeWeeklyChapterAccessUseCase(repo);

    const out = await sut.execute({
      userId: 'u1',
      chapterId: 'c1',
      accessLevel: 'coin',
    });

    expect(out).toBe('skipped_non_public');
    expect(repo.createIfNotExists).not.toHaveBeenCalled();
  });

  it('Given accessLevel public, should delegate createIfNotExists', async () => {
    const repo: WeeklyChapterAccessRepositoryPort = {
      existsForUserChapterWeek: jest.fn(),
      countDistinctChaptersForWeek: jest.fn(),
      createIfNotExists: jest.fn().mockResolvedValue('created'),
    };
    const sut = new ConsumeWeeklyChapterAccessUseCase(repo);

    const out = await sut.execute({
      userId: 'u1',
      chapterId: 'c1',
      accessLevel: 'public',
    });

    expect(out).toBe('created');
    expect(repo.createIfNotExists).toHaveBeenCalledWith(
      'u1',
      'c1',
      expect.any(Date) as Date,
    );
  });
});
