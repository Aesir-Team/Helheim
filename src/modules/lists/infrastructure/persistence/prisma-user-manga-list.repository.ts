import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type {
  UserMangaListRepositoryPort,
  UserMangaListSummaryDto,
  UserMangaListDetailDto,
} from '../../application/ports/user-manga-list.repository.port';

@Injectable()
export class PrismaUserMangaListRepository implements UserMangaListRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listSummariesForUser(
    userId: string,
  ): Promise<UserMangaListSummaryDto[]> {
    const rows = await this.prisma.userMangaList.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            items: {
              where: { manga: { deletedAt: null } },
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
      mangasReadCount: row.mangasReadCount,
      itemCount: row._count.items,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async findDetailOwnedByUser(
    listId: string,
    userId: string,
  ): Promise<UserMangaListDetailDto | null> {
    const row = await this.prisma.userMangaList.findFirst({
      where: { id: listId, userId },
      include: {
        items: {
          where: { manga: { deletedAt: null } },
          orderBy: [{ sortOrder: 'asc' }, { addedAt: 'asc' }],
          include: {
            manga: {
              select: { title: true, slug: true, coverImage: true },
            },
          },
        },
        _count: {
          select: {
            items: {
              where: { manga: { deletedAt: null } },
            },
          },
        },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
      mangasReadCount: row.mangasReadCount,
      itemCount: row._count.items,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      items: row.items.map((it) => ({
        itemId: it.id,
        mangaId: it.mangaId,
        sortOrder: it.sortOrder,
        addedAt: it.addedAt,
        mangaTitle: it.manga.title,
        mangaSlug: it.manga.slug,
        mangaCoverImage: it.manga.coverImage,
      })),
    };
  }

  async create(userId: string, name: string): Promise<UserMangaListSummaryDto> {
    const agg = await this.prisma.userMangaList.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const nextOrder = (agg._max.sortOrder ?? -1) + 1;

    const row = await this.prisma.userMangaList.create({
      data: {
        userId,
        name,
        sortOrder: nextOrder,
      },
    });

    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
      mangasReadCount: row.mangasReadCount,
      itemCount: 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async update(
    listId: string,
    userId: string,
    data: { name?: string; sortOrder?: number },
  ): Promise<UserMangaListSummaryDto | null> {
    try {
      const row = await this.prisma.userMangaList.update({
        where: { id: listId, userId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        },
        include: {
          _count: {
            select: {
              items: {
                where: { manga: { deletedAt: null } },
              },
            },
          },
        },
      });

      return {
        id: row.id,
        name: row.name,
        sortOrder: row.sortOrder,
        mangasReadCount: row.mangasReadCount,
        itemCount: row._count.items,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        return null;
      }
      throw e;
    }
  }

  async deleteOwned(listId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.userMangaList.deleteMany({
      where: { id: listId, userId },
    });
    return result.count > 0;
  }

  async listIdsForUserOrdered(userId: string): Promise<string[]> {
    const rows = await this.prisma.userMangaList.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async applySortOrders(
    userId: string,
    orderedListIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction(
      orderedListIds.map((id, idx) =>
        this.prisma.userMangaList.updateMany({
          where: { id, userId },
          data: { sortOrder: idx },
        }),
      ),
    );
  }

  async addItem(
    listId: string,
    userId: string,
    mangaId: string,
  ): Promise<'created' | 'already_in_list' | 'list_not_found'> {
    const list = await this.prisma.userMangaList.findFirst({
      where: { id: listId, userId },
      select: { id: true },
    });
    if (!list) {
      return 'list_not_found';
    }

    const agg = await this.prisma.userMangaListItem.aggregate({
      where: { listId },
      _max: { sortOrder: true },
    });
    const nextItemOrder = (agg._max.sortOrder ?? -1) + 1;

    try {
      await this.prisma.userMangaListItem.create({
        data: {
          listId,
          mangaId,
          sortOrder: nextItemOrder,
        },
      });
      return 'created';
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return 'already_in_list';
      }
      throw e;
    }
  }

  async removeItem(
    listId: string,
    userId: string,
    mangaId: string,
  ): Promise<boolean> {
    const result = await this.prisma.userMangaListItem.deleteMany({
      where: {
        mangaId,
        list: { id: listId, userId },
      },
    });
    return result.count > 0;
  }
}
