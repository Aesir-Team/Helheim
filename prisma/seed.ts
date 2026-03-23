import { PrismaClient } from '@prisma/client';
import { ensureMvpFixtures, MVP_DEMO_MANGA_SLUG } from './mvp-fixtures';

const prisma = new PrismaClient();

/**
 * Dados mínimos para o MVP (PLANO-MVP.md §2 + G).
 */
async function main(): Promise<void> {
  await ensureMvpFixtures(prisma);
  console.log('[seed] Plano "gratuito" + mangá demo garantidos.');
  console.log(`[seed] Slug E2E: "${MVP_DEMO_MANGA_SLUG}".`);
}

void main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
