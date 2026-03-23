import { Inject, Injectable } from '@nestjs/common';
import { ConflictError } from '../../../../shared/domain/errors';
import {
  USER_MANGA_LIST_REPOSITORY,
  type UserMangaListRepositoryPort,
} from '../ports/user-manga-list.repository.port';

export interface ReorderUserMangaListsInput {
  userId: string;
  orderedListIds: string[];
}

@Injectable()
export class ReorderUserMangaListsUseCase {
  constructor(
    @Inject(USER_MANGA_LIST_REPOSITORY)
    private readonly listRepo: UserMangaListRepositoryPort,
  ) {}

  async execute(input: ReorderUserMangaListsInput): Promise<void> {
    const incoming = input.orderedListIds;
    if (new Set(incoming).size !== incoming.length) {
      throw new ConflictError('IDs de lista duplicados na ordenação');
    }

    const current = await this.listRepo.listIdsForUserOrdered(input.userId);
    if (current.length === 0 && incoming.length === 0) {
      return;
    }

    if (current.length !== incoming.length) {
      throw new ConflictError(
        'A ordenação deve incluir exatamente todas as suas listas',
      );
    }

    const currentSet = new Set(current);
    for (const id of incoming) {
      if (!currentSet.has(id)) {
        throw new ConflictError('Lista inválida na ordenação');
      }
    }

    await this.listRepo.applySortOrders(input.userId, incoming);
  }
}
