import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { HASH_SERVICE } from '../ports/hash.service.port';
import type { HashServicePort } from '../ports/hash.service.port';
import { TOKEN_SERVICE } from '../ports/token.service.port';
import type { TokenServicePort } from '../ports/token.service.port';
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepositoryPort,
} from '../../../access/application/ports/subscription.repository.port';
import {
  PLAN_REPOSITORY,
  type PlanRepositoryPort,
} from '../../../access/application/ports/plan.repository.port';
import { ConflictError } from '../../../../shared/domain/errors';
import { AuthUser } from '../../domain/entities/user.entity';

const FREE_PLAN_SLUG = 'gratuito';

export interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterUserOutput {
  user: AuthUser;
  token: string;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepositoryPort,
    @Inject(HASH_SERVICE) private readonly hashService: HashServicePort,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenServicePort,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: SubscriptionRepositoryPort,
    @Inject(PLAN_REPOSITORY)
    private readonly planRepo: PlanRepositoryPort,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) throw new ConflictError('Email já cadastrado');

    const passwordHash = await this.hashService.hash(input.password);
    const user = await this.userRepo.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    await this.attachFreePlan(user.id);

    const token = await this.tokenService.sign({
      sub: user.id,
      email: user.email,
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      coinsBalance: user.coinsBalance,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: authUser, token };
  }

  private async attachFreePlan(userId: string): Promise<void> {
    const freePlan = await this.planRepo.findBySlug(FREE_PLAN_SLUG);
    if (!freePlan) return;

    await this.subscriptionRepo.create({
      userId,
      planId: freePlan.id,
      planName: freePlan.name,
      priceInCents: null,
    });
  }
}
