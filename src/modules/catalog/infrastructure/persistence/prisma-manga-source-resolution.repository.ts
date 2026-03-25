import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type {
  MangaExternalSourceCandidate,
  MangaSourceResolutionLoadPort,
  MangaSourceResolutionSnapshot,
} from '../../application/ports/manga-source-resolution.port';

function mapSource(row: {
  id: string;
  provider: string;
  externalId: string;
  originType: string;
  isOfficial: boolean;
  isPublicEligible: boolean;
  isFallbackEnabled: boolean;
  isUserScoped: boolean;
  ownerUserId: string | null;
  ownerInstallationId: string | null;
  healthScore: number;
  priority: number;
  isActive: boolean;
}): MangaExternalSourceCandidate {
  return {
    id: row.id,
    provider: row.provider,
    externalId: row.externalId,
    originType: row.originType,
    isOfficial: row.isOfficial,
    isPublicEligible: row.isPublicEligible,
    isFallbackEnabled: row.isFallbackEnabled,
    isUserScoped: row.isUserScoped,
    ownerUserId: row.ownerUserId,
    ownerInstallationId: row.ownerInstallationId,
    healthScore: row.healthScore,
    priority: row.priority,
    isActive: row.isActive,
  };
}

@Injectable()
export class PrismaMangaSourceResolutionRepository implements MangaSourceResolutionLoadPort {
  constructor(private readonly prisma: PrismaService) {}

  async loadBySlug(input: {
    slug: string;
    userId: string | null;
  }): Promise<MangaSourceResolutionSnapshot | null> {
    const manga = await this.prisma.manga.findFirst({
      where: { slug: input.slug, deletedAt: null },
      select: {
        id: true,
        slug: true,
        externalId: true,
        preferredSourceId: true,
        externalSources: {
          select: {
            id: true,
            provider: true,
            externalId: true,
            originType: true,
            isOfficial: true,
            isPublicEligible: true,
            isFallbackEnabled: true,
            isUserScoped: true,
            ownerUserId: true,
            ownerInstallationId: true,
            healthScore: true,
            priority: true,
            isActive: true,
          },
        },
        userSourcePreferences:
          input.userId != null
            ? {
                where: { userId: input.userId },
                select: { sourceId: true },
                take: 1,
              }
            : false,
      },
    });

    if (manga == null) {
      return null;
    }

    const prefs = manga.userSourcePreferences;
    const userPreferredSourceId =
      Array.isArray(prefs) && prefs.length > 0
        ? (prefs[0]?.sourceId ?? null)
        : null;

    return {
      mangaId: manga.id,
      mangaSlug: manga.slug,
      preferredSourceId: manga.preferredSourceId,
      legacyExternalId: manga.externalId,
      sources: manga.externalSources.map(mapSource),
      userPreferredSourceId,
    };
  }
}
