import { Test, TestingModule } from '@nestjs/testing';
import { RegisterUserUseCase } from './register-user.use-case';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../ports/user.repository.port';
import { HASH_SERVICE, HashServicePort } from '../ports/hash.service.port';
import { TOKEN_SERVICE, TokenServicePort } from '../ports/token.service.port';
import { ConflictError } from '../../../../shared/domain/errors';
import { AuthUserWithPassword } from '../../domain/entities/user.entity';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepositoryPort,
} from '../../../access/application/ports/subscription.repository.port';
import {
  PLAN_REPOSITORY,
  PlanRepositoryPort,
} from '../../../access/application/ports/plan.repository.port';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let userRepo: jest.Mocked<UserRepositoryPort>;
  let hashService: jest.Mocked<HashServicePort>;
  let tokenService: jest.Mocked<TokenServicePort>;
  let subscriptionRepo: jest.Mocked<SubscriptionRepositoryPort>;
  let planRepo: jest.Mocked<PlanRepositoryPort>;

  const mockUser: AuthUserWithPassword = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    coinsBalance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFreePlan = {
    id: 'plan-free-id',
    slug: 'gratuito',
    name: 'Gratuito',
    freeChaptersPerWeek: 5,
    isActive: true,
  };

  beforeEach(async () => {
    userRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn().mockResolvedValue(mockUser),
      updateProfile: jest.fn(),
    };
    hashService = {
      hash: jest.fn().mockResolvedValue('hashed'),
      compare: jest.fn(),
    };
    tokenService = {
      sign: jest.fn().mockResolvedValue('jwt-token'),
      verify: jest.fn(),
    };
    subscriptionRepo = {
      findActiveByUserId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
    };
    planRepo = {
      findBySlug: jest.fn().mockResolvedValue(mockFreePlan),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUserUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: HASH_SERVICE, useValue: hashService },
        { provide: TOKEN_SERVICE, useValue: tokenService },
        { provide: SUBSCRIPTION_REPOSITORY, useValue: subscriptionRepo },
        { provide: PLAN_REPOSITORY, useValue: planRepo },
      ],
    }).compile();

    useCase = module.get(RegisterUserUseCase);
  });

  it('deve registrar usuário, criar subscription gratuita e retornar user + token', async () => {
    userRepo.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'plain',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(userRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(hashService.hash).toHaveBeenCalledWith('plain');
    expect(userRepo.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      passwordHash: 'hashed',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(planRepo.findBySlug).toHaveBeenCalledWith('gratuito');
    expect(subscriptionRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      planId: 'plan-free-id',
      planName: 'Gratuito',
      priceInCents: null,
    });
    expect(tokenService.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'test@example.com',
      role: 'USER',
    });
    expect(result.user.id).toBe('user-1');
    expect(result.token).toBe('jwt-token');
  });

  it('deve registrar normalmente mesmo se plano gratuito não existir no BD', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    planRepo.findBySlug.mockResolvedValue(null);

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'plain',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(subscriptionRepo.create).not.toHaveBeenCalled();
    expect(result.user.id).toBe('user-1');
    expect(result.token).toBe('jwt-token');
  });

  it('deve lançar ConflictError se email já existir', async () => {
    userRepo.findByEmail.mockResolvedValue(mockUser);

    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'plain',
        firstName: 'Test',
        lastName: 'User',
      }),
    ).rejects.toThrow(ConflictError);

    expect(userRepo.create).not.toHaveBeenCalled();
    expect(subscriptionRepo.create).not.toHaveBeenCalled();
  });
});
