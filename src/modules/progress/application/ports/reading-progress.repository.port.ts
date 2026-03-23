export const READING_PROGRESS_REPOSITORY = Symbol(
  'READING_PROGRESS_REPOSITORY',
);

export interface ReadingProgressRowDto {
  id: string;
  userId: string;
  mangaId: string;
  chapterId: string;
  pageNumber: number;
  chaptersReadCount: number;
  lastReadAt: Date;
}

export interface ContinueReadingEntryDto {
  progressId: string;
  mangaId: string;
  mangaTitle: string;
  mangaSlug: string;
  mangaCoverImage: string;
  chapterId: string;
  chapterNumber: string;
  chapterTitle: string | null;
  pageNumber: number;
  chaptersReadCount: number;
  lastReadAt: Date;
}

export interface ReadingProgressRepositoryPort {
  findByUserAndManga(
    userId: string,
    mangaId: string,
  ): Promise<ReadingProgressRowDto | null>;

  upsert(
    userId: string,
    mangaId: string,
    data: {
      chapterId: string;
      pageNumber: number;
      chaptersReadCount: number;
      lastReadAt: Date;
    },
  ): Promise<ReadingProgressRowDto>;

  listContinueReading(
    userId: string,
    limit: number,
  ): Promise<ContinueReadingEntryDto[]>;
}
