import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type {
  MangaRepositoryPort,
  MangaSummaryDto,
  MangaDetailDto,
  MangaForListItemDto,
  ListMangasParams,
  PaginatedResult,
  UpsertMangaInput,
  CategoryLinkInput,
} from '../../application/ports/manga.repository.port';
import type {
  MangaSyncStatus,
  MangaType,
  MangaStatus,
  CategoryType,
} from '@prisma/client';
import {
  normalizeMangaStatusFromExternal,
  normalizeMangaTypeFromExternal,
} from '../../../../shared/domain/manga-external.normalization';

@Injectable()
export class PrismaMangaRepository implements MangaRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string): Promise<MangaDetailDto | null> {
    const row = await this.prisma.manga.findFirst({
      where: { slug, deletedAt: null },
      include: {
        categories: { include: { category: true } },
        chapters: {
          where: {
            deletedAt: null,
            releaseStatus: 'published',
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            mangaId: true,
            number: true,
            title: true,
            createdAt: true,
            accessLevel: true,
            coinCost: true,
          },
        },
        _count: {
          select: {
            chapters: {
              where: {
                deletedAt: null,
                releaseStatus: 'published',
              },
            },
          },
        },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      coverImage: row.coverImage,
      status: row.status,
      type: row.type,
      rating: row.rating,
      views: row.views,
      isNsfw: row.isNsfw,
      lastChapterAt: row.lastChapterAt,
      alternativeTitles: row.alternativeTitles,
      description: row.description,
      bannerImage: row.bannerImage,
      releaseYear: row.releaseYear,
      author: row.author,
      artist: row.artist,
      officialLink: row.officialLink,
      categories: row.categories.map((mc) => ({
        id: mc.category.id,
        name: mc.category.name,
        slug: mc.category.slug,
      })),
      chaptersCount: row._count.chapters,
      latestChapters: row.chapters.map((ch) => ({
        id: ch.id,
        mangaId: ch.mangaId,
        number: ch.number,
        title: ch.title,
        accessLevel: ch.accessLevel,
        isLocked: ch.accessLevel === 'coin',
        coinCost: ch.coinCost,
        createdAt: ch.createdAt,
        isRead: false,
        isNew: false,
      })),
    };
  }

  async findByIdForListItem(
    mangaId: string,
  ): Promise<MangaForListItemDto | null> {
    const row = await this.prisma.manga.findFirst({
      where: { id: mangaId, deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
      },
    });
    return row;
  }

  async list(
    params: ListMangasParams,
  ): Promise<PaginatedResult<MangaSummaryDto>> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (params.type) where.type = params.type as MangaType;
    if (params.status) where.status = params.status as MangaStatus;
    if (params.includeNsfw !== true) where.isNsfw = false;
    if (params.search) {
      where.title = { contains: params.search, mode: 'insensitive' };
    }
    if (params.categorySlug) {
      where.categories = {
        some: { category: { slug: params.categorySlug } },
      };
    }

    const orderBy: Record<string, string> = {};
    const sortKey = params.sortBy ?? 'lastChapterAt';
    orderBy[sortKey] = 'desc';

    const skip = (params.page - 1) * params.limit;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.manga.findMany({
        where,
        orderBy,
        skip,
        take: params.limit,
        include: { categories: { include: { category: true } } },
      }),
      this.prisma.manga.count({ where }),
    ]);

    const data: MangaSummaryDto[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      coverImage: row.coverImage,
      status: row.status,
      type: row.type,
      rating: row.rating,
      views: row.views,
      isNsfw: row.isNsfw,
      lastChapterAt: row.lastChapterAt,
      categories: row.categories.map((mc) => ({
        id: mc.category.id,
        name: mc.category.name,
        slug: mc.category.slug,
      })),
    }));

    return {
      data,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  async listBySlugs(
    slugs: string[],
    includeNsfw?: boolean,
  ): Promise<MangaSummaryDto[]> {
    if (slugs.length === 0) {
      return [];
    }

    const rows = await this.prisma.manga.findMany({
      where: {
        deletedAt: null,
        slug: { in: slugs },
        ...(includeNsfw === true ? {} : { isNsfw: false }),
      },
      include: { categories: { include: { category: true } } },
    });

    const bySlug = new Map<string, MangaSummaryDto>(
      rows.map((row) => [
        row.slug,
        {
          id: row.id,
          title: row.title,
          slug: row.slug,
          coverImage: row.coverImage,
          status: row.status,
          type: row.type,
          rating: row.rating,
          views: row.views,
          isNsfw: row.isNsfw,
          lastChapterAt: row.lastChapterAt,
          categories: row.categories.map((mc) => ({
            id: mc.category.id,
            name: mc.category.name,
            slug: mc.category.slug,
          })),
        },
      ]),
    );

    const ordered: MangaSummaryDto[] = [];
    for (const slug of slugs) {
      const row = bySlug.get(slug);
      if (row) {
        ordered.push(row);
      }
    }
    return ordered;
  }

  async upsertBySlug(input: UpsertMangaInput): Promise<{ id: string }> {
    const type = normalizeMangaTypeFromExternal(input.type) as MangaType;
    const status = normalizeMangaStatusFromExternal(
      input.status,
    ) as MangaStatus;

    const row = await this.prisma.manga.upsert({
      where: { slug: input.slug },
      create: {
        slug: input.slug,
        title: input.title,
        coverImage: input.coverImage,
        type,
        alternativeTitles: input.alternativeTitles ?? null,
        description: input.description ?? null,
        bannerImage: input.bannerImage ?? null,
        status,
        rating: input.rating ?? 0,
        views: input.views ?? 0,
        releaseYear: input.releaseYear ?? null,
        isNsfw: input.isNsfw ?? false,
        author: input.author ?? null,
        artist: input.artist ?? null,
        officialLink: input.officialLink ?? null,
        lastChapterAt: input.lastChapterAt ?? null,
        externalId: input.externalId ?? null,
      },
      update: {
        title: input.title,
        coverImage: input.coverImage,
        type,
        alternativeTitles: input.alternativeTitles ?? undefined,
        description: input.description ?? undefined,
        bannerImage: input.bannerImage ?? undefined,
        status,
        rating: input.rating ?? undefined,
        views: input.views ?? undefined,
        releaseYear: input.releaseYear ?? undefined,
        isNsfw: input.isNsfw ?? undefined,
        author: input.author ?? undefined,
        artist: input.artist ?? undefined,
        lastChapterAt: input.lastChapterAt ?? undefined,
      },
    });

    return { id: row.id };
  }

  async linkCategories(
    mangaId: string,
    categories: CategoryLinkInput[],
  ): Promise<void> {
    if (categories.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      const categoryIds: string[] = [];

      for (const cat of categories) {
        const row = await tx.category.upsert({
          where: { slug: cat.slug },
          create: {
            name: cat.name,
            slug: cat.slug,
            type: (cat.type as CategoryType) || 'genre',
            isNsfw: cat.isNsfw ?? false,
          },
          update: { name: cat.name },
        });
        categoryIds.push(row.id);
      }

      await tx.mangaCategory.deleteMany({ where: { mangaId } });
      await tx.mangaCategory.createMany({
        data: categoryIds.map((categoryId) => ({ mangaId, categoryId })),
        skipDuplicates: true,
      });
    });
  }

  async getSyncStatus(
    slug: string,
  ): Promise<{ syncStatus: string; lastSyncedAt: Date | null } | null> {
    const row = await this.prisma.manga.findFirst({
      where: { slug },
      select: { syncStatus: true, lastSyncedAt: true },
    });
    if (!row) return null;
    return { syncStatus: row.syncStatus, lastSyncedAt: row.lastSyncedAt };
  }

  async setSyncStatus(
    slug: string,
    status: 'idle' | 'syncing' | 'error',
    error?: string,
  ): Promise<void> {
    await this.prisma.manga.updateMany({
      where: { slug },
      data: {
        syncStatus: status as MangaSyncStatus,
        lastSyncError: status === 'error' ? (error ?? null) : null,
        ...(status === 'idle' ? { lastSyncedAt: new Date() } : {}),
      },
    });
  }
}
