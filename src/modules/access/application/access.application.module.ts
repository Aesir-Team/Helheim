import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/infrastructure/prisma/prisma.module';
import { GetEffectivePlanUseCase } from './use-cases/get-effective-plan.use-case';
import { CheckChapterAccessUseCase } from './use-cases/check-chapter-access.use-case';
import { PLAN_REPOSITORY } from './ports/plan.repository.port';
import { SUBSCRIPTION_REPOSITORY } from './ports/subscription.repository.port';
import { CHAPTER_COIN_UNLOCK_REPOSITORY } from './ports/chapter-coin-unlock.repository.port';
import { PrismaPlanRepository } from '../infrastructure/persistence/prisma-plan.repository';
import { PrismaSubscriptionRepository } from '../infrastructure/persistence/prisma-subscription.repository';
import { PrismaChapterCoinUnlockRepository } from '../infrastructure/persistence/prisma-chapter-coin-unlock.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    GetEffectivePlanUseCase,
    CheckChapterAccessUseCase,
    { provide: PLAN_REPOSITORY, useClass: PrismaPlanRepository },
    {
      provide: SUBSCRIPTION_REPOSITORY,
      useClass: PrismaSubscriptionRepository,
    },
    {
      provide: CHAPTER_COIN_UNLOCK_REPOSITORY,
      useClass: PrismaChapterCoinUnlockRepository,
    },
  ],
  exports: [
    GetEffectivePlanUseCase,
    CheckChapterAccessUseCase,
    PLAN_REPOSITORY,
    SUBSCRIPTION_REPOSITORY,
    CHAPTER_COIN_UNLOCK_REPOSITORY,
  ],
})
export class AccessApplicationModule {}
