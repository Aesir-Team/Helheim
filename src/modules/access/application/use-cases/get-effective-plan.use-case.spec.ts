import { GetEffectivePlanUseCase } from './get-effective-plan.use-case';
import type { SubscriptionRepositoryPort } from '../ports/subscription.repository.port';
import type {
  PlanRepositoryPort,
  PlanDto,
} from '../ports/plan.repository.port';

const FREE_PLAN: PlanDto = {
  id: 'plan-free-id',
  slug: 'gratuito',
  name: 'Gratuito',
  freeChaptersPerWeek: 5,
  isActive: true,
};

function makeSut(overrides?: {
  sub?: Partial<SubscriptionRepositoryPort>;
  plan?: Partial<PlanRepositoryPort>;
}) {
  const subscriptionRepo: SubscriptionRepositoryPort = {
    findActiveByUserId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
    ...overrides?.sub,
  };

  const planRepo: PlanRepositoryPort = {
    findBySlug: jest.fn().mockResolvedValue(FREE_PLAN),
    ...overrides?.plan,
  };

  const sut = new GetEffectivePlanUseCase(subscriptionRepo, planRepo);
  return { sut, subscriptionRepo, planRepo };
}

describe('GetEffectivePlanUseCase', () => {
  describe('Given a user with an active subscription', () => {
    it('should return the plan from the subscription', async () => {
      const { sut } = makeSut({
        sub: {
          findActiveByUserId: jest.fn().mockResolvedValue({
            id: 'sub-1',
            userId: 'user-1',
            planId: 'plan-premium',
            planSlug: 'premium',
            planName: 'Premium',
            freeChaptersPerWeek: null,
          }),
        },
      });

      const result = await sut.execute('user-1');

      expect(result).toEqual({
        planSlug: 'premium',
        planName: 'Premium',
        freeChaptersPerWeek: null,
        isUnlimited: true,
      });
    });
  });

  describe('Given a user without any active subscription', () => {
    it('should fall back to the default free plan', async () => {
      const { sut, planRepo } = makeSut();

      const result = await sut.execute('user-no-sub');

      expect(planRepo.findBySlug).toHaveBeenCalledWith('gratuito');
      expect(result).toEqual({
        planSlug: 'gratuito',
        planName: 'Gratuito',
        freeChaptersPerWeek: 5,
        isUnlimited: false,
      });
    });
  });

  describe('Given no active subscription and the free plan does not exist in DB', () => {
    it('should return a hardcoded fallback (freeChaptersPerWeek = 5)', async () => {
      const { sut } = makeSut({
        plan: { findBySlug: jest.fn().mockResolvedValue(null) },
      });

      const result = await sut.execute('user-no-sub');

      expect(result).toEqual({
        planSlug: 'gratuito',
        planName: 'Gratuito',
        freeChaptersPerWeek: 5,
        isUnlimited: false,
      });
    });
  });

  describe('Given a user with a subscription to a plan with freeChaptersPerWeek = 10', () => {
    it('should return isUnlimited false and the correct limit', async () => {
      const { sut } = makeSut({
        sub: {
          findActiveByUserId: jest.fn().mockResolvedValue({
            id: 'sub-2',
            userId: 'user-2',
            planId: 'plan-basic',
            planSlug: 'basico',
            planName: 'Básico',
            freeChaptersPerWeek: 10,
          }),
        },
      });

      const result = await sut.execute('user-2');

      expect(result).toEqual({
        planSlug: 'basico',
        planName: 'Básico',
        freeChaptersPerWeek: 10,
        isUnlimited: false,
      });
    });
  });
});
