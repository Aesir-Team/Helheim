import { Inject, Injectable } from '@nestjs/common';
import {
  MANGA_REPOSITORY,
  type MangaRepositoryPort,
} from '../../../catalog/application/ports/manga.repository.port';
import {
  CHAPTER_REPOSITORY,
  type ChapterRepositoryPort,
} from '../../../catalog/application/ports/chapter.repository.port';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';
import {
  READING_PROGRESS_REPOSITORY,
  type ReadingProgressRepositoryPort,
  type ReadingProgressRowDto,
} from '../ports/reading-progress.repository.port';

/**
 * PRODUTO §3.6 + invariante schema: `chapterId` deve pertencer ao `mangaId`.
 * Idempotente: PATCH repetido com os mesmos dados não altera o registro.
 */
export interface SaveReadingProgressInput {
  userId: string;
  mangaId: string;
  chapterId: string;
  pageNumber?: number;
}

@Injectable()
export class SaveReadingProgressUseCase {
  constructor(
    @Inject(READING_PROGRESS_REPOSITORY)
    private readonly progressRepo: ReadingProgressRepositoryPort,
    @Inject(MANGA_REPOSITORY)
    private readonly mangaRepo: MangaRepositoryPort,
    @Inject(CHAPTER_REPOSITORY)
    private readonly chapterRepo: ChapterRepositoryPort,
  ) {}

  async execute(
    input: SaveReadingProgressInput,
  ): Promise<ReadingProgressRowDto> {
    const manga = await this.mangaRepo.findByIdForListItem(input.mangaId);
    if (!manga) {
      throw new NotFoundError('Mangá não encontrado');
    }

    const chapter = await this.chapterRepo.findById(input.chapterId);
    if (!chapter) {
      throw new NotFoundError(
        'Capítulo indisponível ou não publicado. Tente sincronizar o mangá.',
      );
    }

    if (chapter.mangaId !== input.mangaId) {
      throw new ConflictError('Este capítulo não pertence ao mangá informado');
    }

    const existing = await this.progressRepo.findByUserAndManga(
      input.userId,
      input.mangaId,
    );

    const pageNumber = input.pageNumber ?? existing?.pageNumber ?? 1;
    if (pageNumber < 1) {
      throw new ConflictError('pageNumber deve ser >= 1');
    }

    /** Alinhado a `isRead` na listagem: capítulos com `number` ≤ ao marcador (não contador de visitas). */
    const chaptersReadCount =
      await this.chapterRepo.countPublishedWithNumberAtMost(
        input.mangaId,
        chapter.number,
      );

    const now = new Date();
    if (
      existing &&
      existing.chapterId === input.chapterId &&
      existing.pageNumber === pageNumber &&
      existing.chaptersReadCount === chaptersReadCount
    ) {
      return existing;
    }

    return this.progressRepo.upsert(input.userId, input.mangaId, {
      chapterId: input.chapterId,
      pageNumber,
      chaptersReadCount,
      lastReadAt: now,
    });
  }
}
