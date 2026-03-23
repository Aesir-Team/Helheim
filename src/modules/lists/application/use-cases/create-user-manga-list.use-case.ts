import { Inject, Injectable } from '@nestjs/common';
import {
  USER_MANGA_LIST_REPOSITORY,
  type UserMangaListRepositoryPort,
  type UserMangaListSummaryDto,
} from '../ports/user-manga-list.repository.port';

export interface CreateUserMangaListInput {
  userId: string;
  name: string;
}

@Injectable()
export class CreateUserMangaListUseCase {
  constructor(
    @Inject(USER_MANGA_LIST_REPOSITORY)
    private readonly listRepo: UserMangaListRepositoryPort,
  ) {}

  async execute(
    input: CreateUserMangaListInput,
  ): Promise<UserMangaListSummaryDto> {
    return this.listRepo.create(input.userId, input.name.trim());
  }
}
