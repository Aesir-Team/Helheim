import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type { WeeklyChapterAccessRepositoryPort } from '../../application/ports/weekly-chapter-access.repository.port';

@Injectable()
export class PrismaWeeklyChapterAccessRepository implements WeeklyChapterAccessRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async existsForUserChapterWeek(
    userId: string,
    chapterId: string,
    weekStart: Date,
  ): Promise<boolean> {
    const row = await this.prisma.userChapterWeekAccess.findFirst({
      where: { userId, chapterId, weekStart },
      select: { id: true },
    });
    return row != null;
  }

  async countDistinctChaptersForWeek(
    userId: string,
    weekStart: Date,
  ): Promise<number> {
    return this.prisma.userChapterWeekAccess.count({
      where: { userId, weekStart },
    });
  }

  async createIfNotExists(
    userId: string,
    chapterId: string,
    weekStart: Date,
  ): Promise<'created' | 'already_existed'> {
    try {
      await this.prisma.userChapterWeekAccess.create({
        data: { userId, chapterId, weekStart },
      });
      return 'created';
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return 'already_existed';
      }
      throw e;
    }
  }
}
