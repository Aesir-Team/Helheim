import { Inject, Injectable } from '@nestjs/common';
import {
  CHAPTER_COIN_UNLOCK_REPOSITORY,
  type ChapterCoinUnlockRepositoryPort,
} from '../../../access/application/ports/chapter-coin-unlock.repository.port';
import {
  applyViewerChapterLockFlags,
  type ChapterLockAwareSummary,
} from '../../../../shared/domain/chapter-viewer-lock.policy';
import { isPrivilegedCatalogReaderRole } from '../../../../shared/domain/catalog-privileged-roles';

export interface ChapterListViewerContext {
  userId: string;
  role: string;
}

@Injectable()
export class ChapterSummariesViewerLockApplier {
  constructor(
    @Inject(CHAPTER_COIN_UNLOCK_REPOSITORY)
    private readonly coinUnlockRepo: ChapterCoinUnlockRepositoryPort,
  ) {}

  async apply<T extends ChapterLockAwareSummary>(
    viewer: ChapterListViewerContext | null | undefined,
    summaries: readonly T[],
  ): Promise<T[]> {
    const v = viewer ?? null;
    let unlocked: ReadonlySet<string> = new Set();
    if (v != null && !isPrivilegedCatalogReaderRole(v.role)) {
      const coinIds = summaries
        .filter((c) => c.accessLevel === 'coin')
        .map((c) => c.id);
      if (coinIds.length > 0) {
        unlocked = await this.coinUnlockRepo.findUnlockedChapterIdsForUser(
          v.userId,
          coinIds,
        );
      }
    }
    return applyViewerChapterLockFlags(summaries, v, unlocked);
  }
}
