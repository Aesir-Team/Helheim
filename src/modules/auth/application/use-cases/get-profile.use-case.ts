import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import { AuthUser } from '../../domain/entities/user.entity';

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
    const { password: _, ...profile } = user;
    return profile;
  }
}
