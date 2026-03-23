import { Inject, Injectable } from '@nestjs/common';
import {
  USER_MANGA_LIST_REPOSITORY,
  type UserMangaListRepositoryPort,
  type UserMangaListSummaryDto,
} from '../ports/user-manga-list.repository.port';

/** PRODUTO §3.5 — listas do usuário (somente do titular). */
@Injectable()
export class ListUserMangaListsUseCase {
  constructor(
    @Inject(USER_MANGA_LIST_REPOSITORY)
    private readonly listRepo: UserMangaListRepositoryPort,
  ) {}

  async execute(userId: string): Promise<UserMangaListSummaryDto[]> {
    return this.listRepo.listSummariesForUser(userId);
  }
}
