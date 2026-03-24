import { Inject, Injectable } from '@nestjs/common';
import {
  CHAPTER_COIN_UNLOCK_REPOSITORY,
  type ChapterCoinUnlockRepositoryPort,
} from '../ports/chapter-coin-unlock.repository.port';

/** Capítulo `coin` sem registro de desbloqueio para o usuário. */
export const CHAPTER_ACCESS_REASON_COIN_NOT_UNLOCKED =
  'coin_chapter_not_unlocked' as const;

const PRIVILEGED_ROLES = new Set(['VIP', 'ADMIN', 'MODERATOR']);

export interface CheckChapterAccessInput {
  userId: string;
  role: string;
  chapterId: string;
  accessLevel: 'public' | 'coin';
}

export type CheckChapterAccessOutput =
  | { allowed: true }
  | {
      allowed: false;
      reasonCode: typeof CHAPTER_ACCESS_REASON_COIN_NOT_UNLOCKED;
      message: string;
    };

/**
 * Acesso à leitura: `public` sem limite semanal; `coin` só com `UserChapterCoinUnlock`.
 * Capítulos gratuitos não passam por débito/crédito de coins neste fluxo.
 */
@Injectable()
export class CheckChapterAccessUseCase {
  constructor(
    @Inject(CHAPTER_COIN_UNLOCK_REPOSITORY)
    private readonly coinUnlockRepo: ChapterCoinUnlockRepositoryPort,
  ) {}

  async execute(
    input: CheckChapterAccessInput,
  ): Promise<CheckChapterAccessOutput> {
    if (PRIVILEGED_ROLES.has(input.role)) {
      return { allowed: true };
    }

    if (input.accessLevel === 'public') {
      return { allowed: true };
    }

    const unlocked = await this.coinUnlockRepo.hasUnlock(
      input.userId,
      input.chapterId,
    );
    if (unlocked) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reasonCode: CHAPTER_ACCESS_REASON_COIN_NOT_UNLOCKED,
      message:
        'Este capítulo exige desbloqueio com coins. Desbloqueie antes de ler.',
    };
  }
}
