import { Inject, Injectable } from '@nestjs/common';
import { getUtcWeekStartMonday } from '../../../../shared/domain/week-start';
import { GetEffectivePlanUseCase } from './get-effective-plan.use-case';
import {
  WEEKLY_CHAPTER_ACCESS_REPOSITORY,
  type WeeklyChapterAccessRepositoryPort,
} from '../ports/weekly-chapter-access.repository.port';

/** MVP: capítulos por coins ainda não têm fluxo de desbloqueio na API. */
export const CHAPTER_ACCESS_REASON_COIN_NOT_AVAILABLE =
  'coin_chapter_not_available' as const;

export const CHAPTER_ACCESS_REASON_WEEKLY_LIMIT =
  'weekly_chapter_limit_exceeded' as const;

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
      reasonCode:
        | typeof CHAPTER_ACCESS_REASON_COIN_NOT_AVAILABLE
        | typeof CHAPTER_ACCESS_REASON_WEEKLY_LIMIT;
      message: string;
    };

@Injectable()
export class CheckChapterAccessUseCase {
  constructor(
    private readonly getEffectivePlan: GetEffectivePlanUseCase,
    @Inject(WEEKLY_CHAPTER_ACCESS_REPOSITORY)
    private readonly weekAccessRepo: WeeklyChapterAccessRepositoryPort,
  ) {}

  async execute(
    input: CheckChapterAccessInput,
  ): Promise<CheckChapterAccessOutput> {
    if (PRIVILEGED_ROLES.has(input.role)) {
      return { allowed: true };
    }

    if (input.accessLevel === 'coin') {
      return {
        allowed: false,
        reasonCode: CHAPTER_ACCESS_REASON_COIN_NOT_AVAILABLE,
        message:
          'Este capítulo exige desbloqueio por coins. Recurso ainda não disponível no app.',
      };
    }

    const now = new Date();
    const weekStart = getUtcWeekStartMonday(now);

    const plan = await this.getEffectivePlan.execute(input.userId);
    if (plan.isUnlimited) {
      return { allowed: true };
    }

    const alreadyThisWeek = await this.weekAccessRepo.existsForUserChapterWeek(
      input.userId,
      input.chapterId,
      weekStart,
    );
    if (alreadyThisWeek) {
      return { allowed: true };
    }

    const limit = plan.freeChaptersPerWeek;
    if (limit == null) {
      return { allowed: true };
    }

    const used = await this.weekAccessRepo.countDistinctChaptersForWeek(
      input.userId,
      weekStart,
    );
    if (used >= limit) {
      return {
        allowed: false,
        reasonCode: CHAPTER_ACCESS_REASON_WEEKLY_LIMIT,
        message: `Limite de ${String(limit)} capítulo(s) distinto(s) por semana atingido.`,
      };
    }

    return { allowed: true };
  }
}
