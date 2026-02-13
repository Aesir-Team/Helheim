import { Test, TestingModule } from '@nestjs/testing';
import { LoginUseCase } from './login.use-case';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../ports/user.repository.port';
import { HASH_SERVICE, HashServicePort } from '../ports/hash.service.port';
import { TOKEN_SERVICE, TokenServicePort } from '../ports/token.service.port';
import { UnauthorizedError } from '../../../../shared/domain/errors';
import { AuthUserWithPassword } from '../../domain/entities/user.entity';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: jest.Mocked<UserRepositoryPort>;
  let hashService: jest.Mocked<HashServicePort>;
  let tokenService: jest.Mocked<TokenServicePort>;

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

  beforeEach(async () => {
    userRepo = {
      findByEmail: jest.fn().mockResolvedValue(mockUser),
      findById: jest.fn(),
      create: jest.fn(),
      updateProfile: jest.fn(),
    };
    hashService = {
      hash: jest.fn(),
      compare: jest.fn().mockResolvedValue(true),
    };
    tokenService = {
      sign: jest.fn().mockResolvedValue('jwt-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: HASH_SERVICE, useValue: hashService },
        { provide: TOKEN_SERVICE, useValue: tokenService },
      ],
    }).compile();

    useCase = module.get(LoginUseCase);
  });

  it('deve retornar user e token quando credenciais corretas', async () => {
    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'plain',
    });

    expect(userRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(hashService.compare).toHaveBeenCalledWith('plain', 'hashed');
    expect(result.token).toBe('jwt-token');
    expect(result.user.email).toBe('test@example.com');
  });

  it('deve lançar UnauthorizedError se email não existir', async () => {
    userRepo.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'unknown@example.com', password: 'plain' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('deve lançar UnauthorizedError se senha incorreta', async () => {
    hashService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedError);
  });
});
