import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors';
import { USER_MANGA_LIST_REPOSITORY } from '../ports/user-manga-list.repository.port';
import type { UserMangaListRepositoryPort } from '../ports/user-manga-list.repository.port';

@Injectable()
export class DeleteUserMangaListUseCase {
  constructor(
    @Inject(USER_MANGA_LIST_REPOSITORY)
    private readonly listRepo: UserMangaListRepositoryPort,
  ) {}

  async execute(listId: string, userId: string): Promise<void> {
    const ok = await this.listRepo.deleteOwned(listId, userId);
    if (!ok) {
      throw new NotFoundError('Lista não encontrada');
    }
  }
}
