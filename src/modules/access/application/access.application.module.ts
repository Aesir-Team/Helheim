import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/infrastructure/prisma/prisma.module';
import { GetEffectivePlanUseCase } from './use-cases/get-effective-plan.use-case';
import { PLAN_REPOSITORY } from './ports/plan.repository.port';
import { SUBSCRIPTION_REPOSITORY } from './ports/subscription.repository.port';
import { PrismaPlanRepository } from '../infrastructure/persistence/prisma-plan.repository';
import { PrismaSubscriptionRepository } from '../infrastructure/persistence/prisma-subscription.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    GetEffectivePlanUseCase,
    { provide: PLAN_REPOSITORY, useClass: PrismaPlanRepository },
    {
      provide: SUBSCRIPTION_REPOSITORY,
      useClass: PrismaSubscriptionRepository,
    },
  ],
  exports: [GetEffectivePlanUseCase, PLAN_REPOSITORY, SUBSCRIPTION_REPOSITORY],
})
export class AccessApplicationModule {}
