/**
 * Recalcula accessLevel de todos os capítulos publicados por mangá:
 * primeiros ~MANGA_FREE_CHAPTER_FRACTION (padrão 10%) por ordem de `number` → public;
 * demais → coin + MANGA_COIN_CHAPTER_COST.
 *
 * Uso:
 *   npx tsx scripts/apply-chapter-free-tier-all-mangas.ts
 *   npx tsx scripts/apply-chapter-free-tier-all-mangas.ts --dry-run
 *   npx tsx scripts/apply-chapter-free-tier-all-mangas.ts --slug=solo-leveling
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { applyMangaChapterFreeTier } from '../src/shared/infrastructure/prisma/apply-manga-chapter-free-tier';
import {
  freePublicChapterCount,
  parseCoinChapterCost,
  parseFreeChapterFraction,
} from '../src/shared/domain/chapter-free-tier.policy';

function loadDotEnvOptional(): void {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) {
    return;
  }
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

function parseArgs(): { dryRun: boolean; slug: string | null } {
  const dryRun = process.argv.includes('--dry-run');
  const slugArg = process.argv.find((a) => a.startsWith('--slug='));
  const slug = slugArg ? slugArg.slice('--slug='.length).trim() || null : null;
  return { dryRun, slug };
}

async function main(): Promise<void> {
  loadDotEnvOptional();
  const { dryRun, slug } = parseArgs();
  const freeFraction = parseFreeChapterFraction(
    process.env.MANGA_FREE_CHAPTER_FRACTION,
  );
  const coinChapterCost = parseCoinChapterCost(
    process.env.MANGA_COIN_CHAPTER_COST,
  );

  const prisma = new PrismaClient();
  try {
    const mangas = await prisma.manga.findMany({
      where: {
        deletedAt: null,
        ...(slug !== null ? { slug } : {}),
      },
      select: { id: true, slug: true, title: true },
      orderBy: { slug: 'asc' },
    });

    if (mangas.length === 0) {
      console.log(
        slug !== null ? `Nenhum mangá com slug=${slug}` : 'Nenhum mangá.',
      );
      process.exitCode = slug !== null ? 1 : 0;
      return;
    }

    console.log(
      `Mangás: ${mangas.length} | freeFraction=${freeFraction} | coinChapterCost=${coinChapterCost} | dryRun=${dryRun}`,
    );

    let totalPublic = 0;
    let totalCoin = 0;

    for (const m of mangas) {
      if (dryRun) {
        const rows = await prisma.chapter.findMany({
          where: {
            mangaId: m.id,
            deletedAt: null,
            releaseStatus: 'published',
          },
          select: { id: true },
        });
        const n = rows.length;
        const pub = freePublicChapterCount(n, freeFraction);
        console.log(
          `[dry-run] ${m.slug} (${m.title}): caps=${n} → public=${pub} coin=${n - pub}`,
        );
        totalPublic += pub;
        totalCoin += n - pub;
        continue;
      }

      const r = await applyMangaChapterFreeTier(prisma, m.id, {
        freeFraction,
        coinChapterCost,
      });
      totalPublic += r.publicCount;
      totalCoin += r.coinCount;
      console.log(
        `[ok] ${m.slug}: public=${r.publicCount} coin=${r.coinCount}`,
      );
    }

    console.log(`Total capítulos: public=${totalPublic} coin=${totalCoin}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
