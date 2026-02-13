import { Test, TestingModule } from '@nestjs/testing';
import { UpdateProfileUseCase } from './update-profile.use-case';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../ports/user.repository.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import { AuthUserWithPassword } from '../../domain/entities/user.entity';

describe('UpdateProfileUseCase', () => {
  let useCase: UpdateProfileUseCase;
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
      updateProfile: jest.fn().mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProfileUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
      ],
    }).compile();

    useCase = module.get(UpdateProfileUseCase);
  });

  it('deve atualizar firstName e lastName e retornar perfil sem password', async () => {
    const result = await useCase.execute('user-1', {
      firstName: 'Updated',
      lastName: 'Name',
    });
    expect(userRepo.updateProfile).toHaveBeenCalledWith('user-1', {
      firstName: 'Updated',
      lastName: 'Name',
    });
    expect(result.firstName).toBe('Updated');
    expect(result.lastName).toBe('Name');
    expect((result as { password?: string }).password).toBeUndefined();
  });

  it('deve lançar NotFoundError se usuário não existir', async () => {
    userRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute('unknown', { firstName: 'A' }),
    ).rejects.toThrow(NotFoundError);

    expect(userRepo.updateProfile).not.toHaveBeenCalled();
  });
});
