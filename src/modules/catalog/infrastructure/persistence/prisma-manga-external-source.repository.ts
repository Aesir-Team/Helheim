import { Injectable } from '@nestjs/common';
import type { MangaSyncStatus } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type {
  MangaExternalSourceRepositoryPort,
  MangaExternalSourceRow,
} from '../../application/ports/manga-external-source.repository.port';

@Injectable()
export class PrismaMangaExternalSourceRepository implements MangaExternalSourceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MangaExternalSourceRow | null> {
    const row = await this.prisma.mangaExternalSource.findFirst({
      where: { id },
      select: {
        id: true,
        mangaId: true,
        provider: true,
        externalId: true,
        isUserScoped: true,
        ownerUserId: true,
        ownerInstallationId: true,
        isActive: true,
      },
    });
    if (row == null) {
      return null;
    }
    return {
      id: row.id,
      mangaId: row.mangaId,
      provider: row.provider,
      externalId: row.externalId,
      isUserScoped: row.isUserScoped,
      ownerUserId: row.ownerUserId,
      ownerInstallationId: row.ownerInstallationId,
      isActive: row.isActive,
    };
  }

  async getSyncStatus(
    sourceId: string,
  ): Promise<{ syncStatus: string; lastSyncedAt: Date | null } | null> {
    const row = await this.prisma.mangaExternalSource.findFirst({
      where: { id: sourceId },
      select: { syncStatus: true, lastSyncedAt: true },
    });
    if (row == null) {
      return null;
    }
    return { syncStatus: row.syncStatus, lastSyncedAt: row.lastSyncedAt };
  }

  async setSyncStatus(
    sourceId: string,
    status: 'idle' | 'syncing' | 'error',
    error?: string,
  ): Promise<void> {
    await this.prisma.mangaExternalSource.updateMany({
      where: { id: sourceId },
      data: {
        syncStatus: status as MangaSyncStatus,
        lastSyncError: status === 'error' ? (error ?? null) : null,
        ...(status === 'idle' ? { lastSyncedAt: new Date() } : {}),
      },
    });
  }

  async markSourceSyncSuccess(sourceId: string): Promise<void> {
    const now = new Date();
    await this.prisma.mangaExternalSource.updateMany({
      where: { id: sourceId },
      data: {
        syncStatus: 'idle',
        lastSyncedAt: now,
        lastSuccessAt: now,
        lastSyncError: null,
      },
    });
  }
}
