import { Inject, Injectable } from '@nestjs/common';
import {
  MANGA_SYNC_PROGRESS,
  type MangaSyncProgressPort,
  type MangaSyncProgressState,
} from '../ports/manga-sync-progress.port';

export interface MangaSyncStatusDto {
  hasActiveState: boolean;
  progressPercent: number;
  state: MangaSyncProgressState | null;
}

@Injectable()
export class GetMangaSyncStatusUseCase {
  constructor(
    @Inject(MANGA_SYNC_PROGRESS)
    private readonly syncProgress: MangaSyncProgressPort,
  ) {}

  async execute(slug: string): Promise<MangaSyncStatusDto> {
    const normalized = slug.trim();
    if (!normalized) {
      return {
        hasActiveState: false,
        progressPercent: 0,
        state: null,
      };
    }

    const state = await this.syncProgress.getLatestBySlug(normalized);
    if (!state) {
      return {
        hasActiveState: false,
        progressPercent: 0,
        state: null,
      };
    }

    const progressPercent =
      state.totalChapters <= 0
        ? state.status === 'completed'
          ? 100
          : 0
        : Math.min(
            100,
            Math.max(
              0,
              Math.round((state.chaptersProcessed / state.totalChapters) * 100),
            ),
          );

    return {
      hasActiveState: true,
      progressPercent,
      state,
    };
  }
}
