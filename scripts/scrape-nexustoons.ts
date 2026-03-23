import { PrismaClient, type MangaType, type MangaStatus } from '@prisma/client';
import { createHash } from 'crypto';

const BASE_URL =
  process.env.EXTERNAL_MANGA_BASE_URL ?? 'https://nexustoons.com';
const CRYPTO_SECRET = 'OrionNexus2025CryptoKey!Secure';
const LIMIT = parseInt(process.env.SCRAPE_LIMIT ?? '120', 10);
const INCLUDE_NSFW = process.env.SCRAPE_NSFW !== 'false';
const DELAY_MS = parseInt(process.env.SCRAPE_DELAY_MS ?? '500', 10);
const MAX_CHAPTERS = parseInt(process.env.SCRAPE_MAX_CHAPTERS ?? '0', 10);

const prisma = new PrismaClient();

// ─── OrionCrypto (port of JS decryption) ────────────────────────────

interface KeyData {
  key: number[];
  sbox: number[];
  rsbox: number[];
}

function deriveKeys(): KeyData[] {
  const keyData: KeyData[] = [];
  for (let i = 0; i < 5; i++) {
    const raw = `_orion_key_${i}_v2_${CRYPTO_SECRET}`;
    const hex = createHash('sha256').update(raw).digest('hex');
    const keyBytes = Array.from(Buffer.from(hex, 'hex'));

    const sbox = Array.from({ length: 256 }, (_, idx) => idx);
    let j = 0;
    for (let r = 0; r < 256; r++) {
      j = (j + sbox[r] + keyBytes[r % keyBytes.length]) % 256;
      [sbox[r], sbox[j]] = [sbox[j], sbox[r]];
    }
    const rsbox = new Array<number>(256);
    for (let r = 0; r < 256; r++) rsbox[sbox[r]] = r;

    keyData.push({ key: keyBytes, sbox, rsbox });
  }
  return keyData;
}

const KEYS = deriveKeys();

function rotateRight(val: number, n: number): number {
  n = n % 8;
  return ((val >>> n) | (val << (8 - n))) & 0xff;
}

function decryptPayload(keyIndex: number, b64: string): string {
  const cipher = Buffer.from(b64, 'base64');
  const kd = KEYS[keyIndex];
  const key = kd.key;
  const rsbox = kd.rsbox;
  const u = key.length;
  const result = Buffer.alloc(cipher.length);

  for (let d = cipher.length - 1; d >= 0; d--) {
    let h = cipher[d];
    h ^= d > 0 ? cipher[d - 1] : key[u - 1];
    h = rsbox[h];
    const f = (((key[(d + 3) % u] + (d & 255)) & 255) % 7) + 1;
    h = rotateRight(h, f);
    h ^= key[d % u];
    result[d] = h;
  }
  return result.toString('utf-8');
}

function decryptResponse<T>(raw: unknown): T {
  if (
    raw &&
    typeof raw === 'object' &&
    'd' in raw &&
    typeof (raw as Record<string, unknown>).d === 'string'
  ) {
    const obj = raw as { d: string; k?: number; v?: number };
    const keyIdx = obj.v === 1 ? 0 : (obj.k ?? 0);
    const text = decryptPayload(keyIdx, obj.d);
    return JSON.parse(text) as T;
  }
  return raw as T;
}

// ─── Nexustoons API types ───────────────────────────────────────────

interface NexusCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type: string;
  isNsfw: boolean;
}

interface NexusChapter {
  id: number;
  mangaId: number;
  number: string;
  title: string | null;
  views: number;
  createdAt: string;
}

interface NexusManga {
  id: number;
  slug: string;
  title: string;
  alternativeTitles?: string;
  description?: string;
  coverImage: string;
  bannerImage?: string | null;
  status: string;
  type: string;
  rating: number;
  views: number;
  releaseYear?: number | null;
  isNsfw: boolean;
  author?: string;
  artist?: string;
  officialLink?: string | null;
  lastChapterAt?: string;
  categories?: { category: NexusCategory }[];
  chapters?: NexusChapter[];
  chapterCount?: number;
}

interface NexusPage {
  pageNumber: number;
  imageUrl: string;
}

interface NexusChapterDetail {
  id: number;
  mangaId: number;
  number: string;
  title: string | null;
  pages: NexusPage[];
  totalPages: number;
}

interface NexusListResponse {
  data: NexusManga[];
  total?: number;
}

// ─── Fetch helpers ──────────────────────────────────────────────────

async function fetchApi<T>(path: string): Promise<T | null> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`  ✗ HTTP ${res.status} → ${url}`);
    return null;
  }
  const raw: unknown = await res.json();
  return decryptResponse<T>(raw);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Stats ──────────────────────────────────────────────────────────

const stats = {
  mangasUpserted: 0,
  chaptersUpserted: 0,
  pagesInserted: 0,
  categoriesUpserted: 0,
  errors: 0,
};

// ─── Upsert helpers ─────────────────────────────────────────────────

function toMangaType(raw: string): MangaType {
  const map: Record<string, MangaType> = {
    manga: 'manga',
    manhwa: 'manhwa',
    manhua: 'manhua',
  };
  return map[raw.toLowerCase()] ?? 'manhwa';
}

function toMangaStatus(raw: string): MangaStatus {
  const map: Record<string, MangaStatus> = {
    ongoing: 'ongoing',
    completed: 'completed',
    cancelled: 'cancelled',
    hiatus: 'ongoing',
  };
  return map[raw.toLowerCase()] ?? 'ongoing';
}

async function upsertCategory(cat: NexusCategory): Promise<string> {
  const row = await prisma.category.upsert({
    where: { slug: cat.slug },
    create: {
      name: cat.name,
      slug: cat.slug,
      type: cat.type === 'theme' ? 'theme' : 'genre',
      isNsfw: cat.isNsfw,
    },
    update: { name: cat.name, isNsfw: cat.isNsfw },
  });
  return row.id;
}

async function upsertManga(ext: NexusManga): Promise<string> {
  const row = await prisma.manga.upsert({
    where: { slug: ext.slug },
    create: {
      slug: ext.slug,
      title: ext.title,
      alternativeTitles: ext.alternativeTitles || null,
      description: ext.description || null,
      coverImage: ext.coverImage,
      bannerImage: ext.bannerImage || null,
      status: toMangaStatus(ext.status),
      type: toMangaType(ext.type),
      rating: ext.rating ?? 0,
      views: ext.views ?? 0,
      releaseYear: ext.releaseYear ?? null,
      isNsfw: ext.isNsfw,
      author: ext.author || null,
      artist: ext.artist || null,
      officialLink: ext.officialLink || null,
      lastChapterAt: ext.lastChapterAt ? new Date(ext.lastChapterAt) : null,
      externalId: String(ext.id),
      syncStatus: 'idle',
      lastSyncedAt: new Date(),
    },
    update: {
      title: ext.title,
      alternativeTitles: ext.alternativeTitles || undefined,
      description: ext.description || undefined,
      coverImage: ext.coverImage,
      bannerImage: ext.bannerImage || undefined,
      status: toMangaStatus(ext.status),
      rating: ext.rating ?? undefined,
      views: ext.views ?? undefined,
      lastChapterAt: ext.lastChapterAt
        ? new Date(ext.lastChapterAt)
        : undefined,
      author: ext.author || undefined,
      artist: ext.artist || undefined,
      syncStatus: 'idle',
      lastSyncedAt: new Date(),
    },
  });
  return row.id;
}

async function linkCategories(
  mangaId: string,
  categoryIds: string[],
): Promise<void> {
  for (const categoryId of categoryIds) {
    await prisma.mangaCategory.upsert({
      where: { mangaId_categoryId: { mangaId, categoryId } },
      create: { mangaId, categoryId },
      update: {},
    });
  }
}

async function upsertExternalSource(
  mangaId: string,
  externalId: number,
): Promise<void> {
  await prisma.mangaExternalSource.upsert({
    where: { mangaId_provider: { mangaId, provider: 'NEXUSTOONS' } },
    create: {
      mangaId,
      provider: 'NEXUSTOONS',
      externalId: String(externalId),
      priority: 100,
      isActive: true,
      syncStatus: 'idle',
      lastSyncedAt: new Date(),
    },
    update: {
      externalId: String(externalId),
      syncStatus: 'idle',
      lastSyncedAt: new Date(),
    },
  });
}

async function upsertChapterWithPages(
  mangaId: string,
  ch: NexusChapter,
  pages: NexusPage[],
): Promise<void> {
  const row = await prisma.chapter.upsert({
    where: { mangaId_number: { mangaId, number: String(ch.number) } },
    create: {
      mangaId,
      number: String(ch.number),
      title: ch.title || null,
      views: ch.views ?? 0,
      createdAt: ch.createdAt ? new Date(ch.createdAt) : new Date(),
    },
    update: {
      title: ch.title || undefined,
      views: ch.views ?? undefined,
    },
  });

  if (pages.length > 0) {
    await prisma.chapterPage.deleteMany({ where: { chapterId: row.id } });
    await prisma.chapterPage.createMany({
      data: pages.map((p) => ({
        chapterId: row.id,
        pageNumber: p.pageNumber,
        imageUrl: p.imageUrl,
      })),
    });
    stats.pagesInserted += pages.length;
  }
  stats.chaptersUpserted++;
}

// ─── Main ───────────────────────────────────────────────────────────

async function scrapeList(): Promise<NexusManga[]> {
  console.log(
    `\n📡 Buscando mangás (limit=${LIMIT}, nsfw=${INCLUDE_NSFW}, sortBy=lastChapterAt)...`,
  );
  const result = await fetchApi<NexusListResponse>(
    `/api/mangas?limit=${LIMIT}&includeNsfw=${INCLUDE_NSFW}&sortBy=lastChapterAt`,
  );
  if (!result) {
    console.error('✗ Falha ao buscar lista de mangás');
    return [];
  }
  const mangas =
    result.data ?? (Array.isArray(result) ? (result as NexusManga[]) : []);
  console.log(`  ✓ ${mangas.length} mangás encontrados`);
  return mangas;
}

async function scrapeTrending(): Promise<NexusManga[]> {
  console.log(`\n🔥 Buscando trending (limit=20)...`);
  const result = await fetchApi<NexusListResponse>(
    `/api/mangas/trending?limit=20&includeNsfw=${INCLUDE_NSFW}`,
  );
  if (!result) return [];
  const mangas =
    result.data ?? (Array.isArray(result) ? (result as NexusManga[]) : []);
  console.log(`  ✓ ${mangas.length} trending encontrados`);
  return mangas;
}

async function fetchFullManga(slug: string): Promise<NexusManga | null> {
  const result = await fetchApi<NexusManga>(
    `/api/manga/${encodeURIComponent(slug)}`,
  );
  return result;
}

async function processManga(
  ext: NexusManga,
  index: number,
  total: number,
): Promise<void> {
  const label = `[${index + 1}/${total}] ${ext.title} (${ext.slug})`;

  try {
    console.log(`\n── ${label}`);

    // Fetch full details (all chapters) via /api/manga/{slug}
    await sleep(DELAY_MS);
    const full = await fetchFullManga(ext.slug);
    const manga = full ?? ext;

    // Upsert categories (handle both list format {category: {...}} and detail format {...} directly)
    const categoryIds: string[] = [];
    if (manga.categories) {
      for (const mc of manga.categories) {
        const cat = (mc as { category?: NexusCategory }).category ?? mc;
        if (!cat || !cat.slug || !cat.name) continue;
        const catId = await upsertCategory(cat);
        categoryIds.push(catId);
        stats.categoriesUpserted++;
      }
    }

    // Upsert manga
    const mangaId = await upsertManga(manga);
    stats.mangasUpserted++;

    // Link categories
    if (categoryIds.length > 0) {
      await linkCategories(mangaId, categoryIds);
    }

    // Register external source
    await upsertExternalSource(mangaId, manga.id);

    // Process chapters (full detail has ALL chapters)
    const chapters = manga.chapters ?? [];
    const chaptersToProcess =
      MAX_CHAPTERS > 0 ? chapters.slice(0, MAX_CHAPTERS) : chapters;
    console.log(
      `   📖 ${chaptersToProcess.length}/${chapters.length} capítulos para processar`,
    );

    for (let ci = 0; ci < chaptersToProcess.length; ci++) {
      const ch = chaptersToProcess[ci];
      await sleep(DELAY_MS);

      const detail = await fetchApi<NexusChapterDetail>(
        `/api/chapter/${ch.id}`,
      );
      if (!detail) {
        console.log(`   ⚠ Cap ${ch.number}: sem dados`);
        continue;
      }

      const pages = detail.pages ?? [];
      await upsertChapterWithPages(mangaId, ch, pages);

      if ((ci + 1) % 10 === 0 || ci === chaptersToProcess.length - 1) {
        console.log(
          `   ✓ Cap ${ch.number} (${pages.length} pgs) — ${ci + 1}/${chaptersToProcess.length}`,
        );
      }
    }

    console.log(
      `   ✅ OK — ${categoryIds.length} cats, ${chaptersToProcess.length} caps`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ ERRO em ${label}: ${msg}`);
    stats.errors++;
  }
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════');
  console.log('  Midgard — Scrape Nexustoons → PostgreSQL');
  console.log('═══════════════════════════════════════════════');
  console.log(
    `Config: limit=${LIMIT} nsfw=${INCLUDE_NSFW} delay=${DELAY_MS}ms maxCh=${MAX_CHAPTERS || 'all'}`,
  );

  const [listMangas, trendingMangas] = await Promise.all([
    scrapeList(),
    scrapeTrending(),
  ]);

  // Merge: trending first, then the rest (deduplicate by slug)
  const seen = new Set<string>();
  const allMangas: NexusManga[] = [];
  for (const m of [...trendingMangas, ...listMangas]) {
    if (!seen.has(m.slug)) {
      seen.add(m.slug);
      allMangas.push(m);
    }
  }

  console.log(`\n📊 Total único: ${allMangas.length} mangás`);

  for (let i = 0; i < allMangas.length; i++) {
    await processManga(allMangas[i], i, allMangas.length);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Resultado final');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Mangás upserted:    ${stats.mangasUpserted}`);
  console.log(`  Capítulos upserted: ${stats.chaptersUpserted}`);
  console.log(`  Páginas inseridas:  ${stats.pagesInserted}`);
  console.log(`  Categorias:         ${stats.categoriesUpserted}`);
  console.log(`  Erros:              ${stats.errors}`);
  console.log('═══════════════════════════════════════════════');
}

main()
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
