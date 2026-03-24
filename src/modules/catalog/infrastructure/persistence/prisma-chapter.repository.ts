import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type { AccessLevel, ReleaseStatus } from '@prisma/client';
import type {
  ChapterRepositoryPort,
  ChapterSummaryDto,
  ChapterDetailDto,
  UpsertChapterInput,
  ApplyFreeTierAccessParams,
  ApplyFreeTierAccessResult,
} from '../../application/ports/chapter.repository.port';
import { applyMangaChapterFreeTier } from '../../../../shared/infrastructure/prisma/apply-manga-chapter-free-tier';
import { compareChapterNumberAsc } from '../../../../shared/domain/chapter-free-tier.policy';

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

    /** Lista todos os publicados; frontend usa isLocked/accessLevel para UX de bloqueio. */
    const where = {
      mangaId: manga.id,
      deletedAt: null,
      releaseStatus: 'published' as const,
    };

    const skip = (options.page - 1) * options.limit;

    const [lightRows, total] = await this.prisma.$transaction([
      this.prisma.chapter.findMany({
        where,
        select: { id: true, number: true },
      }),
      this.prisma.chapter.count({ where }),
    ]);

    const cmp =
      options.order === 'asc'
        ? compareChapterNumberAsc
        : (a: string, b: string) => compareChapterNumberAsc(b, a);

    const sortedIds = [...lightRows]
      .sort((a, b) => cmp(a.number, b.number))
      .map((r) => r.id);
    const pageIds = sortedIds.slice(skip, skip + options.limit);

    const rows =
      pageIds.length === 0
        ? []
        : await this.prisma.chapter.findMany({
            where: { id: { in: pageIds } },
          });

    const byId = new Map(rows.map((r) => [r.id, r]));
    const orderedRows = pageIds
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => row !== undefined);

    const data: ChapterSummaryDto[] = orderedRows.map((row) => ({
      id: row.id,
      mangaId: row.mangaId,
      number: row.number,
      title: row.title,
      accessLevel: row.accessLevel,
      isLocked: row.accessLevel === 'coin',
      coinCost: row.coinCost,
      createdAt: row.createdAt,
    }));

    return { data, total };
  }

  async listPublishedSummariesFromMangaSlugFromNumberAsc(
    mangaSlug: string,
    fromNumber: string,
    options: { page: number; limit: number },
  ): Promise<{ data: ChapterSummaryDto[]; total: number } | null> {
    const manga = await this.prisma.manga.findFirst({
      where: { slug: mangaSlug, deletedAt: null },
      select: { id: true },
    });
    if (!manga) {
      return null;
    }

    const where = {
      mangaId: manga.id,
      deletedAt: null,
      releaseStatus: 'published' as const,
    };

    const lightRows = await this.prisma.chapter.findMany({
      where,
      select: { id: true, number: true },
    });

    const sorted = [...lightRows].sort((a, b) =>
      compareChapterNumberAsc(a.number, b.number),
    );
    const startIdx = sorted.findIndex((r) => r.number === fromNumber);
    if (startIdx === -1) {
      return null;
    }

    const forward = sorted.slice(startIdx);
    const total = forward.length;
    const skip = (options.page - 1) * options.limit;
    const pageSlice = forward.slice(skip, skip + options.limit);
    const pageIds = pageSlice.map((r) => r.id);

    const rows =
      pageIds.length === 0
        ? []
        : await this.prisma.chapter.findMany({
            where: { id: { in: pageIds } },
          });

    const byId = new Map(rows.map((r) => [r.id, r]));
    const orderedRows = pageIds
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => row !== undefined);

    const data: ChapterSummaryDto[] = orderedRows.map((row) => ({
      id: row.id,
      mangaId: row.mangaId,
      number: row.number,
      title: row.title,
      accessLevel: row.accessLevel,
      isLocked: row.accessLevel === 'coin',
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
      isLocked: row.accessLevel === 'coin',
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
      select: { id: true, number: true },
    });

    const sorted = [...siblings].sort((a, b) =>
      compareChapterNumberAsc(a.number, b.number),
    );

    const idx = sorted.findIndex((s) => s.id === chapterId);
    if (idx === -1) {
      return { prevChapterId: null, nextChapterId: null };
    }

    const prev = idx > 0 ? sorted[idx - 1] : undefined;
    const next = idx < sorted.length - 1 ? sorted[idx + 1] : undefined;

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

  async applyFreeTierAccessForManga(
    mangaId: string,
    params: ApplyFreeTierAccessParams,
  ): Promise<ApplyFreeTierAccessResult> {
    return applyMangaChapterFreeTier(this.prisma, mangaId, params);
  }
}
