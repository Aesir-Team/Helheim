/**
 * Port para buscar mangás/capítulos em fonte externa (Nexustoons).
 * Use cases de sync dependem desta interface, não do HTTP concreto.
 */

export const EXTERNAL_MANGA_GATEWAY = Symbol('EXTERNAL_MANGA_GATEWAY');

export type ListExternalMangasParams = {
  search?: string | null;
  limit?: number | null;
  includeNsfw?: boolean | null;
  sortBy?: 'views' | 'lastChapterAt' | null;
};

export type ListExternalTrendingParams = {
  limit?: number | null;
  includeNsfw?: boolean | null;
};

/** Resumo de mangá vindo da API externa (antes de persistir no Prisma). */
export interface ExternalMangaSummaryDto {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  alternativeTitles?: string | null;
  description?: string | null;
  bannerImage?: string | null;
  status?: string | null;
  type?: string | null;
  rating?: number | null;
  views?: number | null;
  releaseYear?: number | null;
  isNsfw?: boolean | null;
  author?: string | null;
  artist?: string | null;
  officialLink?: string | null;
  lastChapterAt?: string | null;
}

export interface ExternalMangaChapterRefDto {
  id: string;
  number: string;
  title?: string | null;
  createdAt?: string | null;
}

export interface ExternalMangaDetailDto extends ExternalMangaSummaryDto {
  chapters?: ExternalMangaChapterRefDto[];
}

export interface ExternalChapterPageDto {
  pageNumber: number;
  imageUrl: string;
}

export interface ExternalChapterDetailDto {
  id: string;
  mangaId?: string | null;
  number?: string | null;
  title?: string | null;
  pages: ExternalChapterPageDto[];
}

export interface ExternalMangaGatewayPort {
  listMangas(
    params: ListExternalMangasParams,
  ): Promise<ExternalMangaSummaryDto[]>;

  listTrending(
    params: ListExternalTrendingParams,
  ): Promise<ExternalMangaSummaryDto[]>;

  /** 404 ou corpo vazio → `null`. */
  getMangaBySlug(slug: string): Promise<ExternalMangaDetailDto | null>;

  /** 404 ou corpo vazio → `null`. */
  getChapterById(chapterId: string): Promise<ExternalChapterDetailDto | null>;
}
