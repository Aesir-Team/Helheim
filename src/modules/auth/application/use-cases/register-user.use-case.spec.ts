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

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUserUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: HASH_SERVICE, useValue: hashService },
        { provide: TOKEN_SERVICE, useValue: tokenService },
      ],
    }).compile();

    useCase = module.get(RegisterUserUseCase);
  });

  it('deve registrar usuário e retornar user + token', async () => {
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
    expect(tokenService.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'test@example.com',
    });
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
  });
});
