import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors';
import {
  USER_MANGA_LIST_REPOSITORY,
  type UserMangaListRepositoryPort,
  type UserMangaListDetailDto,
} from '../ports/user-manga-list.repository.port';

@Injectable()
export class GetUserMangaListUseCase {
  constructor(
    @Inject(USER_MANGA_LIST_REPOSITORY)
    private readonly listRepo: UserMangaListRepositoryPort,
  ) {}

  async execute(
    listId: string,
    userId: string,
  ): Promise<UserMangaListDetailDto> {
    const detail = await this.listRepo.findDetailOwnedByUser(listId, userId);
    if (!detail) {
      throw new NotFoundError('Lista não encontrada');
    }
    return detail;
  }
}
