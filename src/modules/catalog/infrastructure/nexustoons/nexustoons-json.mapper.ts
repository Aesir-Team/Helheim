import type {
  ExternalChapterDetailDto,
  ExternalChapterPageDto,
  ExternalMangaCategoryDto,
  ExternalMangaChapterRefDto,
  ExternalMangaDetailDto,
  ExternalMangaSummaryDto,
} from '../../application/ports/external-manga-gateway.port';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Retorna undefined para strings vazias (Nexustoons usa "" para campos ausentes). */
function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value;
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/** Número de capítulo na API pode vir como string ou number. */
function asChapterNumber(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return String(value);
  }
  return undefined;
}

/** Extrai array de mangás de vários formatos comuns de API. */
export function extractMangaArrayPayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (!isRecord(raw)) {
    return [];
  }
  const data = raw.data;
  if (Array.isArray(data)) {
    return data;
  }
  const mangas = raw.mangas;
  if (Array.isArray(mangas)) {
    return mangas;
  }
  const results = raw.results;
  if (Array.isArray(results)) {
    return results;
  }
  return [];
}

function asStringOrNumber(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  return undefined;
}

export function mapToMangaSummary(
  raw: unknown,
): ExternalMangaSummaryDto | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = asStringOrNumber(raw.id);
  const slug = asString(raw.slug);
  const title = asString(raw.title);
  const coverImage =
    asString(raw.coverImage) ??
    asString(raw.cover) ??
    asString(raw.thumbnail) ??
    '';
  if (!id || !slug || !title) {
    return null;
  }
  return {
    id,
    slug,
    title,
    coverImage,
    alternativeTitles: asNonEmptyString(raw.alternativeTitles) ?? null,
    description: asNonEmptyString(raw.description) ?? null,
    bannerImage: asNonEmptyString(raw.bannerImage) ?? null,
    status: asNonEmptyString(raw.status) ?? null,
    type: asNonEmptyString(raw.type) ?? null,
    rating: asNumber(raw.rating) ?? null,
    views: asNumber(raw.views) ?? null,
    releaseYear: asNumber(raw.releaseYear) ?? null,
    isNsfw: asBoolean(raw.isNsfw) ?? null,
    author: asNonEmptyString(raw.author) ?? null,
    artist: asNonEmptyString(raw.artist) ?? null,
    officialLink: asNonEmptyString(raw.officialLink) ?? null,
    lastChapterAt: asString(raw.lastChapterAt) ?? null,
  };
}

function mapToChapterRef(raw: unknown): ExternalMangaChapterRefDto | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = asStringOrNumber(raw.id);
  const number = asChapterNumber(raw.number);
  if (!id || number === undefined) {
    return null;
  }
  return {
    id,
    number,
    title: asNonEmptyString(raw.title) ?? null,
    createdAt: asString(raw.createdAt) ?? null,
    releaseStatus: asString(raw.releaseStatus) ?? null,
    accessLevel: asString(raw.accessLevel) ?? null,
    coinCost: asNumber(raw.coinCost) ?? null,
  };
}

function mapToCategory(raw: unknown): ExternalMangaCategoryDto | null {
  if (!isRecord(raw)) return null;
  const nested = isRecord(raw.category) ? raw.category : raw;
  const id = asStringOrNumber(nested.id);
  const name = asNonEmptyString(nested.name);
  const slug = asString(nested.slug);
  if (!id || !name || !slug) return null;
  return {
    id,
    name,
    slug,
    type: asString(nested.type) ?? null,
    isNsfw: asBoolean(nested.isNsfw) ?? null,
  };
}

export function mapToMangaDetail(raw: unknown): ExternalMangaDetailDto | null {
  const base = mapToMangaSummary(raw);
  if (!base) {
    return null;
  }
  if (!isRecord(raw)) {
    return base;
  }

  let chaptersRaw: unknown[] = [];
  const ch = raw.chapters;
  if (Array.isArray(ch)) {
    chaptersRaw = ch;
  } else if (isRecord(ch) && Array.isArray(ch.data)) {
    chaptersRaw = ch.data;
  }
  const chapters = chaptersRaw
    .map((c) => mapToChapterRef(c))
    .filter((c): c is ExternalMangaChapterRefDto => c !== null);

  const catsRaw = Array.isArray(raw.categories) ? raw.categories : [];
  const categories = catsRaw
    .map((c) => mapToCategory(c))
    .filter((c): c is ExternalMangaCategoryDto => c !== null);

  return {
    ...base,
    chapters: chapters.length > 0 ? chapters : undefined,
    categories: categories.length > 0 ? categories : undefined,
  };
}

function mapToPage(raw: unknown): ExternalChapterPageDto | null {
  if (!isRecord(raw)) {
    return null;
  }
  const pageNumber = asNumber(raw.pageNumber) ?? asNumber(raw.page);
  const imageUrl =
    asString(raw.imageUrl) ?? asString(raw.url) ?? asString(raw.src) ?? '';
  if (pageNumber === undefined || !imageUrl) {
    return null;
  }
  return { pageNumber, imageUrl };
}

export function mapToChapterDetail(
  raw: unknown,
): ExternalChapterDetailDto | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = asStringOrNumber(raw.id);
  if (!id) {
    return null;
  }
  let pagesRaw: unknown[] = [];
  const pages = raw.pages;
  if (Array.isArray(pages)) {
    pagesRaw = pages;
  } else if (Array.isArray(raw.images)) {
    pagesRaw = raw.images;
  } else if (isRecord(pages) && Array.isArray(pages.data)) {
    pagesRaw = pages.data;
  }
  const mapped = pagesRaw
    .map((p) => mapToPage(p))
    .filter((p): p is ExternalChapterPageDto => p !== null)
    .sort((a, b) => a.pageNumber - b.pageNumber);
  return {
    id,
    mangaId: asStringOrNumber(raw.mangaId) ?? null,
    number: asChapterNumber(raw.number) ?? null,
    title: asNonEmptyString(raw.title) ?? null,
    releaseStatus: asString(raw.releaseStatus) ?? null,
    accessLevel: asString(raw.accessLevel) ?? null,
    coinCost: asNumber(raw.coinCost) ?? null,
    pages: mapped,
  };
}
