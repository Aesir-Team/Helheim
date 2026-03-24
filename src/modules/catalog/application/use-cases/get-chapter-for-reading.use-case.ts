import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
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
import { SaveReadingProgressUseCase } from '../../../progress/application/use-cases/save-reading-progress.use-case';

/** Visitante sem JWT em capítulo `coin` — precisa de conta para desbloqueio futuro / cota. */
export const CHAPTER_READING_REASON_AUTH_REQUIRED =
  'authentication_required' as const;

/**
 * Fase D (PLANO-MVP): após autenticação, CheckChapterAccess + ConsumeWeeklyChapterAccess (cap. public).
 *
 * Capítulos `public` (faixa grátis): visitante pode ler sem JWT (sem cota nem progresso no servidor).
 *
 * Regra de produto: navegação prev/next via ordenação por `number` (schema sem linked list).
 */
export interface ChapterForReadingDto extends ChapterDetailDto {
  prevChapterId: string | null;
  nextChapterId: string | null;
}

export interface GetChapterForReadingInput {
  chapterId: string;
  /** `null` = visitante (só leitura de capítulos `public`). */
  user: { userId: string; role: string } | null;
}

@Injectable()
export class GetChapterForReadingUseCase {
  private readonly logger = new Logger(GetChapterForReadingUseCase.name);

  constructor(
    @Inject(CHAPTER_REPOSITORY)
    private readonly chapterRepo: ChapterRepositoryPort,
    private readonly checkChapterAccess: CheckChapterAccessUseCase,
    private readonly consumeWeeklyChapterAccess: ConsumeWeeklyChapterAccessUseCase,
    @Inject(forwardRef(() => SaveReadingProgressUseCase))
    private readonly saveReadingProgress: SaveReadingProgressUseCase,
  ) {}

  async execute(
    input: GetChapterForReadingInput,
  ): Promise<ChapterForReadingDto> {
    const detail = await this.chapterRepo.findById(input.chapterId);
    if (!detail) {
      throw new NotFoundError(`Capítulo "${input.chapterId}" não encontrado`);
    }

    const accessLevel = this.toAccessLevel(detail.accessLevel);
    const user = input.user;

    if (user === null) {
      if (accessLevel === 'coin') {
        throw new ForbiddenError(
          'Faça login para acessar capítulos bloqueados por coins.',
          CHAPTER_READING_REASON_AUTH_REQUIRED,
        );
      }
      if (accessLevel === 'public') {
        const { prevChapterId, nextChapterId } =
          await this.chapterRepo.findNeighborChapterIds(input.chapterId);
        return {
          ...detail,
          pages: this.sortPages(detail.pages),
          prevChapterId,
          nextChapterId,
        };
      }
      throw new ForbiddenError(
        'Autenticação necessária para este capítulo.',
        CHAPTER_READING_REASON_AUTH_REQUIRED,
      );
    }

    const access = await this.checkChapterAccess.execute({
      userId: user.userId,
      role: user.role,
      chapterId: detail.id,
      accessLevel,
    });

    if (!access.allowed) {
      throw new ForbiddenError(access.message, access.reasonCode);
    }

    await this.consumeWeeklyChapterAccess.execute({
      userId: user.userId,
      chapterId: detail.id,
      accessLevel,
    });

    try {
      await this.saveReadingProgress.execute({
        userId: user.userId,
        mangaId: detail.mangaId,
        chapterId: detail.id,
        pageNumber: 1,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Reading progress on chapter open failed (chapterId=${detail.id}): ${message}`,
      );
    }

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
