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
  /** Total de capítulos public+public no mangá (mesma regra do detalhe do catálogo). */
  chaptersCount: number;
  chapterId: string;
  chapterNumber: string;
  chapterTitle: string | null;
  pageNumber: number;
  chaptersReadCount: number;
  lastReadAt: Date;
}

/** Agregados leves para perfil (uma transação count + sum). */
export interface ReadingProgressUserAggregatesDto {
  mangasWithProgressCount: number;
  chaptersReadTotal: number;
}

export interface ReadingProgressRepositoryPort {
  findByUserAndManga(
    userId: string,
    mangaId: string,
  ): Promise<ReadingProgressRowDto | null>;

  /** Contagem de mangás com progresso + soma de `chaptersReadCount` (métricas do PATCH progresso). */
  aggregateForUser(userId: string): Promise<ReadingProgressUserAggregatesDto>;

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
