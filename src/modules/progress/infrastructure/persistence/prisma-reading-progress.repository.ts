import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type {
  ReadingProgressRepositoryPort,
  ReadingProgressRowDto,
  ContinueReadingEntryDto,
} from '../../application/ports/reading-progress.repository.port';

@Injectable()
export class PrismaReadingProgressRepository implements ReadingProgressRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndManga(
    userId: string,
    mangaId: string,
  ): Promise<ReadingProgressRowDto | null> {
    const row = await this.prisma.readingProgress.findUnique({
      where: { userId_mangaId: { userId, mangaId } },
    });
    return row ? this.toRow(row) : null;
  }

  async upsert(
    userId: string,
    mangaId: string,
    data: {
      chapterId: string;
      pageNumber: number;
      chaptersReadCount: number;
      lastReadAt: Date;
    },
  ): Promise<ReadingProgressRowDto> {
    const row = await this.prisma.readingProgress.upsert({
      where: { userId_mangaId: { userId, mangaId } },
      create: {
        userId,
        mangaId,
        chapterId: data.chapterId,
        pageNumber: data.pageNumber,
        chaptersReadCount: data.chaptersReadCount,
        lastReadAt: data.lastReadAt,
      },
      update: {
        chapterId: data.chapterId,
        pageNumber: data.pageNumber,
        chaptersReadCount: data.chaptersReadCount,
        lastReadAt: data.lastReadAt,
      },
    });
    return this.toRow(row);
  }

  async listContinueReading(
    userId: string,
    limit: number,
  ): Promise<ContinueReadingEntryDto[]> {
    const rows = await this.prisma.readingProgress.findMany({
      where: {
        userId,
        manga: { deletedAt: null },
        chapter: { deletedAt: null, releaseStatus: 'published' },
      },
      orderBy: { lastReadAt: 'desc' },
      take: limit,
      include: {
        manga: {
          select: { title: true, slug: true, coverImage: true },
        },
        chapter: {
          select: { number: true, title: true },
        },
      },
    });

    return rows.map((r) => ({
      progressId: r.id,
      mangaId: r.mangaId,
      mangaTitle: r.manga.title,
      mangaSlug: r.manga.slug,
      mangaCoverImage: r.manga.coverImage,
      chapterId: r.chapterId,
      chapterNumber: r.chapter.number,
      chapterTitle: r.chapter.title,
      pageNumber: r.pageNumber,
      chaptersReadCount: r.chaptersReadCount,
      lastReadAt: r.lastReadAt,
    }));
  }

  private toRow(row: {
    id: string;
    userId: string;
    mangaId: string;
    chapterId: string;
    pageNumber: number;
    chaptersReadCount: number;
    lastReadAt: Date;
  }): ReadingProgressRowDto {
    return {
      id: row.id,
      userId: row.userId,
      mangaId: row.mangaId,
      chapterId: row.chapterId,
      pageNumber: row.pageNumber,
      chaptersReadCount: row.chaptersReadCount,
      lastReadAt: row.lastReadAt,
    };
  }
}
