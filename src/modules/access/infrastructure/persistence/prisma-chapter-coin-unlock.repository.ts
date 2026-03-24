import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type { ChapterCoinUnlockRepositoryPort } from '../../application/ports/chapter-coin-unlock.repository.port';

@Injectable()
export class PrismaChapterCoinUnlockRepository
  implements ChapterCoinUnlockRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async hasUnlock(userId: string, chapterId: string): Promise<boolean> {
    const row = await this.prisma.userChapterCoinUnlock.findFirst({
      where: { userId, chapterId },
      select: { id: true },
    });
    return row != null;
  }
}
