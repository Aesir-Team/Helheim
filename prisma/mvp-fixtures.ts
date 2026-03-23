import type { PrismaClient } from '@prisma/client';

/** Slug do mangá sintético para E2E e dev (PLANO-MVP G). */
export const MVP_DEMO_MANGA_SLUG = 'seed-mvp-demo';

/**
 * Idempotente: plano gratuito + mangá demo + cap. public + cap. coin (G.4).
 * Usado por `prisma/seed.ts` e por E2E (`test/mvp-flow.e2e-spec.ts`).
 */
export async function ensureMvpFixtures(prisma: PrismaClient): Promise<void> {
  await prisma.plan.upsert({
    where: { slug: 'gratuito' },
    create: {
      name: 'Gratuito',
      slug: 'gratuito',
      description:
        'Leia até 5 capítulos distintos por semana. Upgrade para ilimitado com assinatura.',
      freeChaptersPerWeek: 5,
      priceInCents: null,
      billingInterval: null,
      isActive: true,
    },
    update: {
      name: 'Gratuito',
      description:
        'Leia até 5 capítulos distintos por semana. Upgrade para ilimitado com assinatura.',
      freeChaptersPerWeek: 5,
      priceInCents: null,
      billingInterval: null,
      isActive: true,
    },
  });

  const manga = await prisma.manga.upsert({
    where: { slug: MVP_DEMO_MANGA_SLUG },
    create: {
      title: 'MVP Seed Demo',
      slug: MVP_DEMO_MANGA_SLUG,
      coverImage: 'https://cdn.midgard.local/seed-mvp/cover.png',
      type: 'manhwa',
      status: 'ongoing',
      description:
        'Obra sintética para testes E2E e desenvolvimento local (PLANO-MVP G).',
      isNsfw: false,
    },
    update: {
      title: 'MVP Seed Demo',
      deletedAt: null,
      description:
        'Obra sintética para testes E2E e desenvolvimento local (PLANO-MVP G).',
    },
  });

  const publicChapter = await prisma.chapter.upsert({
    where: {
      mangaId_number: { mangaId: manga.id, number: '1' },
    },
    create: {
      mangaId: manga.id,
      number: '1',
      title: 'Capítulo público (seed)',
      releaseStatus: 'published',
      accessLevel: 'public',
    },
    update: {
      releaseStatus: 'published',
      accessLevel: 'public',
      deletedAt: null,
    },
  });

  const pageCount = await prisma.chapterPage.count({
    where: { chapterId: publicChapter.id },
  });
  if (pageCount === 0) {
    await prisma.chapterPage.create({
      data: {
        chapterId: publicChapter.id,
        pageNumber: 1,
        imageUrl: 'https://cdn.midgard.local/seed-mvp/ch1-p1.png',
      },
    });
  }

  await prisma.chapter.upsert({
    where: {
      mangaId_number: { mangaId: manga.id, number: '99-coin' },
    },
    create: {
      mangaId: manga.id,
      number: '99-coin',
      title: 'Capítulo premium (coin, oculto na listagem MVP)',
      releaseStatus: 'published',
      accessLevel: 'coin',
      coinCost: 10,
    },
    update: {
      releaseStatus: 'published',
      accessLevel: 'coin',
      deletedAt: null,
    },
  });
}
