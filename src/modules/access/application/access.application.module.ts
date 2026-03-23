import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/infrastructure/prisma/prisma.module';
import { GetEffectivePlanUseCase } from './use-cases/get-effective-plan.use-case';
import { CheckChapterAccessUseCase } from './use-cases/check-chapter-access.use-case';
import { ConsumeWeeklyChapterAccessUseCase } from './use-cases/consume-weekly-chapter-access.use-case';
import { PLAN_REPOSITORY } from './ports/plan.repository.port';
import { SUBSCRIPTION_REPOSITORY } from './ports/subscription.repository.port';
import { WEEKLY_CHAPTER_ACCESS_REPOSITORY } from './ports/weekly-chapter-access.repository.port';
import { PrismaPlanRepository } from '../infrastructure/persistence/prisma-plan.repository';
import { PrismaSubscriptionRepository } from '../infrastructure/persistence/prisma-subscription.repository';
import { PrismaWeeklyChapterAccessRepository } from '../infrastructure/persistence/prisma-weekly-chapter-access.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    GetEffectivePlanUseCase,
    CheckChapterAccessUseCase,
    ConsumeWeeklyChapterAccessUseCase,
    { provide: PLAN_REPOSITORY, useClass: PrismaPlanRepository },
    {
      provide: SUBSCRIPTION_REPOSITORY,
      useClass: PrismaSubscriptionRepository,
    },
    {
      provide: WEEKLY_CHAPTER_ACCESS_REPOSITORY,
      useClass: PrismaWeeklyChapterAccessRepository,
    },
  ],
  exports: [
    GetEffectivePlanUseCase,
    CheckChapterAccessUseCase,
    ConsumeWeeklyChapterAccessUseCase,
    PLAN_REPOSITORY,
    SUBSCRIPTION_REPOSITORY,
    WEEKLY_CHAPTER_ACCESS_REPOSITORY,
  ],
})
export class AccessApplicationModule {}
