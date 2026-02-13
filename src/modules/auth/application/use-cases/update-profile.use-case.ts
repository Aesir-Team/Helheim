import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type {
  UpdateUserProfileInput,
  UserRepositoryPort,
} from '../ports/user.repository.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import { AuthUser } from '../../domain/entities/user.entity';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepositoryPort,
  ) {}

  async execute(
    userId: string,
    input: UpdateUserProfileInput,
  ): Promise<AuthUser> {
    const existing = await this.userRepo.findById(userId);
    if (!existing) {
      throw new NotFoundError('Usuário não encontrado');
    }
    const user = await this.userRepo.updateProfile(userId, input);
    return this.toAuthUser(user);
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: AuthUser['role'];
    coinsBalance: number;
    createdAt: Date;
    updatedAt: Date;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      coinsBalance: user.coinsBalance,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
