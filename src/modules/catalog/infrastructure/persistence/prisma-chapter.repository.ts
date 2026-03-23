import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type { AccessLevel, ReleaseStatus } from '@prisma/client';
import type {
  ChapterRepositoryPort,
  ChapterSummaryDto,
  ChapterDetailDto,
  UpsertChapterInput,
} from '../../application/ports/chapter.repository.port';

@Injectable()
export class PrismaChapterRepository implements ChapterRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findExistingNumbersByMangaId(
    mangaId: string,
    numbers: string[],
  ): Promise<string[]> {
    if (numbers.length === 0) {
      return [];
    }
    const rows = await this.prisma.chapter.findMany({
      where: {
        mangaId,
        number: { in: numbers },
        deletedAt: null,
      },
      select: { number: true },
    });
    return rows.map((row) => row.number);
  }

  async listByMangaSlug(
    mangaSlug: string,
    options: { order: 'asc' | 'desc'; page: number; limit: number },
  ): Promise<{ data: ChapterSummaryDto[]; total: number }> {
    const manga = await this.prisma.manga.findFirst({
      where: { slug: mangaSlug, deletedAt: null },
      select: { id: true },
    });

    if (!manga) return { data: [], total: 0 };

    /** MVP (PLANO G.4): listagem só expõe capítulos `public`; `coin` segue oculto até módulo Coins. */
    const where = {
      mangaId: manga.id,
      deletedAt: null,
      releaseStatus: 'published' as const,
      accessLevel: 'public' as const,
    };

    const skip = (options.page - 1) * options.limit;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.chapter.findMany({
        where,
        orderBy: { number: options.order },
        skip,
        take: options.limit,
      }),
      this.prisma.chapter.count({ where }),
    ]);

    const data: ChapterSummaryDto[] = rows.map((row) => ({
      id: row.id,
      mangaId: row.mangaId,
      number: row.number,
      title: row.title,
      accessLevel: row.accessLevel,
      coinCost: row.coinCost,
      createdAt: row.createdAt,
    }));

    return { data, total };
  }

  async findById(id: string): Promise<ChapterDetailDto | null> {
    const row = await this.prisma.chapter.findFirst({
      where: { id, deletedAt: null, releaseStatus: 'published' },
      include: {
        pages: { orderBy: { pageNumber: 'asc' } },
        manga: { select: { slug: true, title: true } },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      mangaId: row.mangaId,
      number: row.number,
      title: row.title,
      accessLevel: row.accessLevel,
      coinCost: row.coinCost,
      views: row.views,
      createdAt: row.createdAt,
      mangaSlug: row.manga.slug,
      mangaTitle: row.manga.title,
      pages: row.pages.map((p) => ({
        pageNumber: p.pageNumber,
        imageUrl: p.imageUrl,
      })),
    };
  }

  async findNeighborChapterIds(
    chapterId: string,
  ): Promise<{ prevChapterId: string | null; nextChapterId: string | null }> {
    const current = await this.prisma.chapter.findFirst({
      where: { id: chapterId, deletedAt: null, releaseStatus: 'published' },
      select: { id: true, mangaId: true },
    });
    if (!current) {
      return { prevChapterId: null, nextChapterId: null };
    }

    const siblings = await this.prisma.chapter.findMany({
      where: {
        mangaId: current.mangaId,
        deletedAt: null,
        releaseStatus: 'published',
      },
      select: { id: true },
      orderBy: { number: 'asc' },
    });

    const idx = siblings.findIndex((s) => s.id === chapterId);
    if (idx === -1) {
      return { prevChapterId: null, nextChapterId: null };
    }

    const prev = idx > 0 ? siblings[idx - 1] : undefined;
    const next = idx < siblings.length - 1 ? siblings[idx + 1] : undefined;

    return {
      prevChapterId: prev?.id ?? null,
      nextChapterId: next?.id ?? null,
    };
  }

  async upsertByMangaAndNumber(
    data: UpsertChapterInput,
  ): Promise<{ id: string }> {
    const row = await this.prisma.chapter.upsert({
      where: {
        mangaId_number: { mangaId: data.mangaId, number: data.number },
      },
      create: {
        mangaId: data.mangaId,
        number: data.number,
        title: data.title ?? null,
        releaseStatus: (data.releaseStatus as ReleaseStatus) ?? 'published',
        accessLevel: (data.accessLevel as AccessLevel) ?? 'public',
        coinCost: data.coinCost ?? 0,
      },
      update: {
        title: data.title ?? undefined,
        releaseStatus: data.releaseStatus
          ? (data.releaseStatus as ReleaseStatus)
          : undefined,
        accessLevel: data.accessLevel
          ? (data.accessLevel as AccessLevel)
          : undefined,
        coinCost: data.coinCost ?? undefined,
      },
    });

    if (data.pages.length > 0) {
      await this.prisma.chapterPage.deleteMany({
        where: { chapterId: row.id },
      });
      await this.prisma.chapterPage.createMany({
        data: data.pages.map((p) => ({
          chapterId: row.id,
          pageNumber: p.pageNumber,
          imageUrl: p.imageUrl,
        })),
      });
    }

    return { id: row.id };
  }
}
