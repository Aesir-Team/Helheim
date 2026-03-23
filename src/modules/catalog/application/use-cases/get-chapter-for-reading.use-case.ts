import { Inject, Injectable } from '@nestjs/common';
import {
  CHAPTER_REPOSITORY,
  type ChapterRepositoryPort,
  type ChapterDetailDto,
  type ChapterPageDto,
} from '../ports/chapter.repository.port';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/errors';
import { CheckChapterAccessUseCase } from '../../../access/application/use-cases/check-chapter-access.use-case';
import { ConsumeWeeklyChapterAccessUseCase } from '../../../access/application/use-cases/consume-weekly-chapter-access.use-case';

/**
 * Fase D (PLANO-MVP): após autenticação, CheckChapterAccess + ConsumeWeeklyChapterAccess (cap. public).
 *
 * Regra de produto: navegação prev/next via ordenação por `number` (schema sem linked list).
 */
export interface ChapterForReadingDto extends ChapterDetailDto {
  prevChapterId: string | null;
  nextChapterId: string | null;
}

export interface GetChapterForReadingInput {
  chapterId: string;
  userId: string;
  role: string;
}

@Injectable()
export class GetChapterForReadingUseCase {
  constructor(
    @Inject(CHAPTER_REPOSITORY)
    private readonly chapterRepo: ChapterRepositoryPort,
    private readonly checkChapterAccess: CheckChapterAccessUseCase,
    private readonly consumeWeeklyChapterAccess: ConsumeWeeklyChapterAccessUseCase,
  ) {}

  async execute(
    input: GetChapterForReadingInput,
  ): Promise<ChapterForReadingDto> {
    const detail = await this.chapterRepo.findById(input.chapterId);
    if (!detail) {
      throw new NotFoundError(`Capítulo "${input.chapterId}" não encontrado`);
    }

    const accessLevel = this.toAccessLevel(detail.accessLevel);

    const access = await this.checkChapterAccess.execute({
      userId: input.userId,
      role: input.role,
      chapterId: detail.id,
      accessLevel,
    });

    if (!access.allowed) {
      throw new ForbiddenError(access.message, access.reasonCode);
    }

    await this.consumeWeeklyChapterAccess.execute({
      userId: input.userId,
      chapterId: detail.id,
      accessLevel,
    });

    const { prevChapterId, nextChapterId } =
      await this.chapterRepo.findNeighborChapterIds(input.chapterId);

    return {
      ...detail,
      pages: this.sortPages(detail.pages),
      prevChapterId,
      nextChapterId,
    };
  }

  private toAccessLevel(raw: string): 'public' | 'coin' {
    return raw === 'coin' ? 'coin' : 'public';
  }

  private sortPages(pages: ChapterPageDto[]): ChapterPageDto[] {
    return [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  }
}
