import { Test, TestingModule } from '@nestjs/testing';
import { GetProfileUseCase } from './get-profile.use-case';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../ports/user.repository.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import { AuthUserWithPassword } from '../../domain/entities/user.entity';

describe('GetProfileUseCase', () => {
  let useCase: GetProfileUseCase;
  let userRepo: jest.Mocked<UserRepositoryPort>;

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
      findById: jest.fn().mockResolvedValue(mockUser),
      findByEmail: jest.fn(),
      create: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProfileUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
      ],
    }).compile();

    useCase = module.get(GetProfileUseCase);
  });

  it('deve retornar perfil sem password', async () => {
    const result = await useCase.execute('user-1');
    expect(userRepo.findById).toHaveBeenCalledWith('user-1');
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('test@example.com');
    expect((result as { password?: string }).password).toBeUndefined();
  });

  it('deve lançar NotFoundError se usuário não existir', async () => {
    userRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('unknown')).rejects.toThrow(NotFoundError);
  });
});
