import { Inject, Injectable } from '@nestjs/common';
import {
  MANGA_REPOSITORY,
  type MangaRepositoryPort,
  type ListMangasParams,
  type PaginatedResult,
  type MangaSummaryDto,
} from '../ports/manga.repository.port';

export interface ListMangasInput {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  categorySlug?: string;
  search?: string;
  sortBy?: 'lastChapterAt' | 'views' | 'rating' | 'createdAt';
  includeNsfw?: boolean;
}

@Injectable()
export class ListMangasUseCase {
  constructor(
    @Inject(MANGA_REPOSITORY)
    private readonly mangaRepo: MangaRepositoryPort,
  ) {}

  async execute(
    input: ListMangasInput,
  ): Promise<PaginatedResult<MangaSummaryDto>> {
    const params: ListMangasParams = {
      page: input.page ?? 1,
      limit: Math.min(input.limit ?? 20, 100),
      type: input.type,
      status: input.status,
      categorySlug: input.categorySlug,
      search: input.search,
      sortBy: input.sortBy,
      includeNsfw: input.includeNsfw,
    };

    return this.mangaRepo.list(params);
  }
}
