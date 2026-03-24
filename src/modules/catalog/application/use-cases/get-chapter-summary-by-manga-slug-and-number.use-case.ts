import { Inject, Injectable } from '@nestjs/common';
import {
  CHAPTER_REPOSITORY,
  type ChapterRepositoryPort,
} from '../ports/chapter.repository.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import type { ListChaptersOutput } from './list-chapters.use-case';

export interface GetChapterSummaryByMangaSlugAndNumberInput {
  mangaSlug: string;
  /** Número do capítulo no mangá (ex.: `1`, `12.5`); comparado ao campo `number` no BD (igualdade exata). */
  chapterNumber: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class GetChapterSummaryByMangaSlugAndNumberUseCase {
  constructor(
    @Inject(CHAPTER_REPOSITORY)
    private readonly chapterRepo: ChapterRepositoryPort,
  ) {}

  async execute(
    input: GetChapterSummaryByMangaSlugAndNumberInput,
  ): Promise<ListChaptersOutput> {
    const slug = input.mangaSlug.trim();
    const number = input.chapterNumber.trim();
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 50, 200);
    if (!slug || !number) {
      throw new NotFoundError('Mangá ou capítulo não encontrado');
    }

    const result =
      await this.chapterRepo.listPublishedSummariesFromMangaSlugFromNumberAsc(
        slug,
        number,
        { page, limit },
      );
    if (!result) {
      throw new NotFoundError(
        `Capítulo "${number}" não encontrado no mangá "${slug}"`,
      );
    }

    return { ...result, page, limit };
  }
}
