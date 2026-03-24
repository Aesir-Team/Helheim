import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import {
  AuthUser,
  AuthUserWithPassword,
} from '../../domain/entities/user.entity';
import {
  READING_PROGRESS_REPOSITORY,
  type ReadingProgressRepositoryPort,
} from '../../../progress/application/ports/reading-progress.repository.port';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepositoryPort,
    @Inject(READING_PROGRESS_REPOSITORY)
    private readonly readingProgressRepo: ReadingProgressRepositoryPort,
  ) {}

  async execute(userId: string): Promise<AuthUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    const aggregates = await this.readingProgressRepo.aggregateForUser(userId);
    return {
      ...this.toAuthUser(user),
      reading: {
        mangasWithProgressCount: aggregates.mangasWithProgressCount,
        chaptersReadTotal: aggregates.chaptersReadTotal,
      },
    };
  }

  private toAuthUser(user: AuthUserWithPassword): AuthUser {
    const profile: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      role: user.role,
      coinsBalance: user.coinsBalance,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    return profile;
  }
}
