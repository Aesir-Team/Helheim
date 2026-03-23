import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';
import {
  USER_MANGA_LIST_REPOSITORY,
  type UserMangaListRepositoryPort,
  type UserMangaListSummaryDto,
} from '../ports/user-manga-list.repository.port';

export interface UpdateUserMangaListInput {
  listId: string;
  userId: string;
  name?: string;
  sortOrder?: number;
}

@Injectable()
export class UpdateUserMangaListUseCase {
  constructor(
    @Inject(USER_MANGA_LIST_REPOSITORY)
    private readonly listRepo: UserMangaListRepositoryPort,
  ) {}

  async execute(
    input: UpdateUserMangaListInput,
  ): Promise<UserMangaListSummaryDto> {
    if (input.name === undefined && input.sortOrder === undefined) {
      throw new ConflictError('Informe name e/ou sortOrder para atualizar');
    }

    const updated = await this.listRepo.update(input.listId, input.userId, {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    });

    if (!updated) {
      throw new NotFoundError('Lista não encontrada');
    }

    return updated;
  }
}
