import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import {
  AuthUser,
  AuthUserWithPassword,
} from '../../domain/entities/user.entity';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepositoryPort,
  ) {}

  async execute(userId: string): Promise<AuthUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    return this.toAuthUser(user);
  }

  private toAuthUser(user: AuthUserWithPassword): AuthUser {
    const profile: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      coinsBalance: user.coinsBalance,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    return profile;
  }
}
