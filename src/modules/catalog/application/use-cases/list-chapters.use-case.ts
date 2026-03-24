import { Inject, Injectable } from '@nestjs/common';
import {
  CHAPTER_REPOSITORY,
  type ChapterRepositoryPort,
  type ChapterSummaryDto,
} from '../ports/chapter.repository.port';

export interface ListChaptersInput {
  mangaSlug: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ListChaptersOutput {
  data: ChapterSummaryDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListChaptersUseCase {
  constructor(
    @Inject(CHAPTER_REPOSITORY)
    private readonly chapterRepo: ChapterRepositoryPort,
  ) {}

  async execute(input: ListChaptersInput): Promise<ListChaptersOutput> {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 50, 200);
    const order = input.order ?? 'asc';

    const result = await this.chapterRepo.listByMangaSlug(input.mangaSlug, {
      order,
      page,
      limit,
    });

    return { ...result, page, limit };
  }
}
