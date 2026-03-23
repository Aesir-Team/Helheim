import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors';
import {
  USER_MANGA_LIST_REPOSITORY,
  type UserMangaListRepositoryPort,
} from '../ports/user-manga-list.repository.port';

export interface RemoveMangaFromListInput {
  userId: string;
  listId: string;
  mangaId: string;
}

@Injectable()
export class RemoveMangaFromListUseCase {
  constructor(
    @Inject(USER_MANGA_LIST_REPOSITORY)
    private readonly listRepo: UserMangaListRepositoryPort,
  ) {}

  async execute(input: RemoveMangaFromListInput): Promise<void> {
    const ok = await this.listRepo.removeItem(
      input.listId,
      input.userId,
      input.mangaId,
    );
    if (!ok) {
      throw new NotFoundError('Lista ou item não encontrado');
    }
  }
}
