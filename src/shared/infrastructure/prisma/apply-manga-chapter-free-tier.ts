import type { PrismaClient } from '@prisma/client';
import {
  compareChapterNumberAsc,
  freePublicChapterCount,
} from '../../domain/chapter-free-tier.policy';

export interface ApplyMangaChapterFreeTierParams {
  freeFraction: number;
  coinChapterCost: number;
}

export interface ApplyMangaChapterFreeTierResult {
  publicCount: number;
  coinCount: number;
}

/**
 * Primeiros capítulos (por `number` ascendente) → `public` + coinCost 0;
 * demais publicados → `coin` + `coinChapterCost`.
 */
export async function applyMangaChapterFreeTier(
  prisma: PrismaClient,
  mangaId: string,
  params: ApplyMangaChapterFreeTierParams,
): Promise<ApplyMangaChapterFreeTierResult> {
  const cost = Math.max(0, Math.floor(params.coinChapterCost));
  const rows = await prisma.chapter.findMany({
    where: {
      mangaId,
      deletedAt: null,
      releaseStatus: 'published',
    },
    select: { id: true, number: true },
  });
  if (rows.length === 0) {
    return { publicCount: 0, coinCount: 0 };
  }
  const sorted = [...rows].sort((a, b) =>
    compareChapterNumberAsc(a.number, b.number),
  );
  const k = freePublicChapterCount(sorted.length, params.freeFraction);
  const publicIds = sorted.slice(0, k).map((r) => r.id);
  const coinIds = sorted.slice(k).map((r) => r.id);

  await prisma.$transaction([
    prisma.chapter.updateMany({
      where: { id: { in: publicIds } },
      data: { accessLevel: 'public', coinCost: 0 },
    }),
    prisma.chapter.updateMany({
      where: { id: { in: coinIds } },
      data: { accessLevel: 'coin', coinCost: cost },
    }),
  ]);

  return { publicCount: publicIds.length, coinCount: coinIds.length };
}
