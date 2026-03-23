import { Inject, Injectable } from '@nestjs/common';
import {
  MANGA_REPOSITORY,
  type MangaRepositoryPort,
} from '../../../catalog/application/ports/manga.repository.port';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';
import {
  USER_MANGA_LIST_REPOSITORY,
  type UserMangaListRepositoryPort,
} from '../ports/user-manga-list.repository.port';

export interface AddMangaToListInput {
  userId: string;
  listId: string;
  mangaId: string;
}

@Injectable()
export class AddMangaToListUseCase {
  constructor(
    @Inject(USER_MANGA_LIST_REPOSITORY)
    private readonly listRepo: UserMangaListRepositoryPort,
    @Inject(MANGA_REPOSITORY)
    private readonly mangaRepo: MangaRepositoryPort,
  ) {}

  async execute(input: AddMangaToListInput): Promise<void> {
    const manga = await this.mangaRepo.findByIdForListItem(input.mangaId);
    if (!manga) {
      throw new NotFoundError('Mangá não encontrado');
    }

    const result = await this.listRepo.addItem(
      input.listId,
      input.userId,
      input.mangaId,
    );

    if (result === 'list_not_found') {
      throw new NotFoundError('Lista não encontrada');
    }
    if (result === 'already_in_list') {
      throw new ConflictError('Este mangá já está nesta lista');
    }
  }
}
