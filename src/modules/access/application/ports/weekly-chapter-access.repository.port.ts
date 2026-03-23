export const WEEKLY_CHAPTER_ACCESS_REPOSITORY = Symbol(
  'WEEKLY_CHAPTER_ACCESS_REPOSITORY',
);

export interface WeeklyChapterAccessRepositoryPort {
  existsForUserChapterWeek(
    userId: string,
    chapterId: string,
    weekStart: Date,
  ): Promise<boolean>;

  countDistinctChaptersForWeek(
    userId: string,
    weekStart: Date,
  ): Promise<number>;

  createIfNotExists(
    userId: string,
    chapterId: string,
    weekStart: Date,
  ): Promise<'created' | 'already_existed'>;
}
