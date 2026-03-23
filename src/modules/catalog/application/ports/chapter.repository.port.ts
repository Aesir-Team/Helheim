export const CHAPTER_REPOSITORY = Symbol('CHAPTER_REPOSITORY');

export interface ChapterSummaryDto {
  id: string;
  mangaId: string;
  number: string;
  title: string | null;
  accessLevel: string;
  coinCost: number;
  createdAt: Date;
}

export interface ChapterDetailDto extends ChapterSummaryDto {
  views: number;
  pages: ChapterPageDto[];
  mangaSlug: string;
  mangaTitle: string;
}

export interface ChapterPageDto {
  pageNumber: number;
  imageUrl: string;
}

export interface UpsertChapterInput {
  mangaId: string;
  number: string;
  title?: string | null;
  releaseStatus?: string | null;
  accessLevel?: string | null;
  coinCost?: number | null;
  pages: { pageNumber: number; imageUrl: string }[];
}

export type ChapterNeighborIds = {
  prevChapterId: string | null;
  nextChapterId: string | null;
};

export interface ChapterRepositoryPort {
  listByMangaSlug(
    mangaSlug: string,
    options: { order: 'asc' | 'desc'; page: number; limit: number },
  ): Promise<{ data: ChapterSummaryDto[]; total: number }>;

  findById(id: string): Promise<ChapterDetailDto | null>;

  /**
   * Vizinhos entre capítulos publicados do mesmo mangá, ordenados por `number` (asc),
   * alinhado à listagem — sem linked list no schema (PRODUTO §9).
   */
  findNeighborChapterIds(chapterId: string): Promise<ChapterNeighborIds>;

  upsertByMangaAndNumber(data: UpsertChapterInput): Promise<{ id: string }>;
}
