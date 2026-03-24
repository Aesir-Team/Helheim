export const MANGA_REPOSITORY = Symbol('MANGA_REPOSITORY');

export interface MangaSummaryDto {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  status: string;
  type: string;
  rating: number;
  views: number;
  isNsfw: boolean;
  lastChapterAt: Date | null;
  categories: { id: string; name: string; slug: string }[];
}

export interface MangaDetailDto extends MangaSummaryDto {
  alternativeTitles: string | null;
  description: string | null;
  bannerImage: string | null;
  releaseYear: number | null;
  author: string | null;
  artist: string | null;
  officialLink: string | null;
  chaptersCount: number;
  latestChapters: ChapterPreviewDto[];
}

export interface ChapterPreviewDto {
  id: string;
  number: string;
  title: string | null;
  createdAt: Date;
}

export interface ListMangasParams {
  page: number;
  limit: number;
  type?: string;
  status?: string;
  categorySlug?: string;
  search?: string;
  sortBy?: 'lastChapterAt' | 'views' | 'rating' | 'createdAt';
  includeNsfw?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpsertMangaInput {
  slug: string;
  title: string;
  coverImage: string;
  type: string;
  alternativeTitles?: string | null;
  description?: string | null;
  bannerImage?: string | null;
  status?: string | null;
  rating?: number | null;
  views?: number | null;
  releaseYear?: number | null;
  isNsfw?: boolean | null;
  author?: string | null;
  artist?: string | null;
  officialLink?: string | null;
  lastChapterAt?: Date | null;
  externalId?: string | null;
}

export interface CategoryLinkInput {
  name: string;
  slug: string;
  type?: string | null;
  isNsfw?: boolean | null;
}

/** Metadados mínimos para item de lista (mangá publicado no catálogo). */
export interface MangaForListItemDto {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
}

export interface MangaRepositoryPort {
  findBySlug(slug: string): Promise<MangaDetailDto | null>;

  /** Mangá não soft-deleted; usado para validar add em lista (PRODUTO §3.5). */
  findByIdForListItem(mangaId: string): Promise<MangaForListItemDto | null>;
  list(params: ListMangasParams): Promise<PaginatedResult<MangaSummaryDto>>;
  listBySlugs(
    slugs: string[],
    includeNsfw?: boolean,
  ): Promise<MangaSummaryDto[]>;
  upsertBySlug(data: UpsertMangaInput): Promise<{ id: string }>;
  /** Upsert categorias e vincula ao mangá (substituindo links anteriores). */
  linkCategories(
    mangaId: string,
    categories: CategoryLinkInput[],
  ): Promise<void>;
  getSyncStatus(
    slug: string,
  ): Promise<{ syncStatus: string; lastSyncedAt: Date | null } | null>;
  setSyncStatus(
    slug: string,
    status: 'idle' | 'syncing' | 'error',
    error?: string,
  ): Promise<void>;
}
