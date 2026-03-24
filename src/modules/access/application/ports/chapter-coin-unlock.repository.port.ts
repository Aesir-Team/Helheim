export const CHAPTER_COIN_UNLOCK_REPOSITORY = Symbol(
  'CHAPTER_COIN_UNLOCK_REPOSITORY',
);

export interface ChapterCoinUnlockRepositoryPort {
  hasUnlock(userId: string, chapterId: string): Promise<boolean>;

  /** Capítulos `coin` já desbloqueados pelo usuário (subconjunto de `chapterIds`). */
  findUnlockedChapterIdsForUser(
    userId: string,
    chapterIds: string[],
  ): Promise<ReadonlySet<string>>;
}
