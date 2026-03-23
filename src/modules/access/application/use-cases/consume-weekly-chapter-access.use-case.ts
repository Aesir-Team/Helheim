import { Inject, Injectable } from '@nestjs/common';
import { getUtcWeekStartMonday } from '../../../../shared/domain/week-start';
import {
  WEEKLY_CHAPTER_ACCESS_REPOSITORY,
  type WeeklyChapterAccessRepositoryPort,
} from '../ports/weekly-chapter-access.repository.port';

export interface ConsumeWeeklyChapterAccessInput {
  userId: string;
  chapterId: string;
  accessLevel: 'public' | 'coin';
}

@Injectable()
export class ConsumeWeeklyChapterAccessUseCase {
  constructor(
    @Inject(WEEKLY_CHAPTER_ACCESS_REPOSITORY)
    private readonly weekAccessRepo: WeeklyChapterAccessRepositoryPort,
  ) {}

  async execute(
    input: ConsumeWeeklyChapterAccessInput,
  ): Promise<'created' | 'already_existed' | 'skipped_non_public'> {
    if (input.accessLevel !== 'public') {
      return 'skipped_non_public';
    }

    const weekStart = getUtcWeekStartMonday(new Date());
    return this.weekAccessRepo.createIfNotExists(
      input.userId,
      input.chapterId,
      weekStart,
    );
  }
}
