import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepositoryPort,
} from '../ports/subscription.repository.port';
import {
  PLAN_REPOSITORY,
  type PlanRepositoryPort,
} from '../ports/plan.repository.port';

const FREE_PLAN_SLUG = 'gratuito';
const FREE_PLAN_FALLBACK = {
  planSlug: FREE_PLAN_SLUG,
  planName: 'Gratuito',
  freeChaptersPerWeek: 5,
  isUnlimited: false,
} as const;

export interface EffectivePlanOutput {
  planSlug: string;
  planName: string;
  freeChaptersPerWeek: number | null;
  isUnlimited: boolean;
}

@Injectable()
export class GetEffectivePlanUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: SubscriptionRepositoryPort,
    @Inject(PLAN_REPOSITORY)
    private readonly planRepo: PlanRepositoryPort,
  ) {}

  async execute(userId: string): Promise<EffectivePlanOutput> {
    const active = await this.subscriptionRepo.findActiveByUserId(userId);

    if (active) {
      return {
        planSlug: active.planSlug,
        planName: active.planName,
        freeChaptersPerWeek: active.freeChaptersPerWeek,
        isUnlimited: active.freeChaptersPerWeek === null,
      };
    }

    const freePlan = await this.planRepo.findBySlug(FREE_PLAN_SLUG);

    if (freePlan) {
      return {
        planSlug: freePlan.slug,
        planName: freePlan.name,
        freeChaptersPerWeek: freePlan.freeChaptersPerWeek,
        isUnlimited: freePlan.freeChaptersPerWeek === null,
      };
    }

    return FREE_PLAN_FALLBACK;
  }
}
