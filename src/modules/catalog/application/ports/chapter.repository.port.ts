export const CHAPTER_REPOSITORY = Symbol('CHAPTER_REPOSITORY');

export interface ChapterSummaryDto {
  id: string;
  mangaId: string;
  number: string;
  title: string | null;
  accessLevel: string;
  isLocked: boolean;
  coinCost: number;
  createdAt: Date;
  /** Com JWT na listagem: progresso neste mangá (ver `chapter-summary-flags.policy`). */
  isRead: boolean;
  /** `createdAt` dentro de `CHAPTER_IS_NEW_MAX_AGE_DAYS` (default 14). */
  isNew: boolean;
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

export interface ApplyFreeTierAccessParams {
  freeFraction: number;
  /** `coinCost` aplicado aos capítulos que saem de `public` (MVP). */
  coinChapterCost: number;
}

export interface ApplyFreeTierAccessResult {
  publicCount: number;
  coinCount: number;
}

export interface ChapterRepositoryPort {
  findExistingNumbersByMangaId(
    mangaId: string,
    numbers: string[],
  ): Promise<string[]>;

  listByMangaSlug(
    mangaSlug: string,
    options: { order: 'asc' | 'desc'; page: number; limit: number },
  ): Promise<{ data: ChapterSummaryDto[]; total: number }>;

  /**
   * Capítulos publicados a partir do número informado (inclusive), em ordem **asc** natural por `number`,
   * com paginação sobre esse subconjunto (deep link + scroll).
   * Retorna `null` se o mangá não existir ou não houver capítulo publicado com esse `number`.
   */
  listPublishedSummariesFromMangaSlugFromNumberAsc(
    mangaSlug: string,
    fromNumber: string,
    options: { page: number; limit: number },
  ): Promise<{ data: ChapterSummaryDto[]; total: number } | null>;

  findById(id: string): Promise<ChapterDetailDto | null>;

  /**
   * Vizinhos entre capítulos publicados do mesmo mangá, ordenados por `number` (asc),
   * alinhado à listagem — sem linked list no schema (PRODUTO §9).
   */
  findNeighborChapterIds(chapterId: string): Promise<ChapterNeighborIds>;

  upsertByMangaAndNumber(data: UpsertChapterInput): Promise<{ id: string }>;

  /**
   * Recalcula `accessLevel` / `coinCost` para todos os capítulos publicados do mangá:
   * os primeiros (por `number` ascendente) ficam `public`, o restante `coin`.
   */
  applyFreeTierAccessForManga(
    mangaId: string,
    params: ApplyFreeTierAccessParams,
  ): Promise<ApplyFreeTierAccessResult>;
}
