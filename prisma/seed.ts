import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Dados mínimos para o MVP (PLANO-MVP.md §2).
 * Plano gratuito com limite semanal — usado pela Fase D (acesso).
 */
async function main(): Promise<void> {
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

  console.log('[seed] Plano "gratuito" (freeChaptersPerWeek=5) garantido.');
}

void main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
