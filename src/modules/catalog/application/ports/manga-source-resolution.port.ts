export const MANGA_SOURCE_RESOLUTION_LOAD_PORT = Symbol(
  'MANGA_SOURCE_RESOLUTION_LOAD_PORT',
);

/** Snapshot de linhas do hub + preferências; sem tipos Prisma na aplicação. */
export interface MangaExternalSourceCandidate {
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
}

export interface MangaSourceResolutionSnapshot {
  mangaId: string;
  mangaSlug: string;
  preferredSourceId: string | null;
  legacyExternalId: string | null;
  sources: MangaExternalSourceCandidate[];
  userPreferredSourceId: string | null;
}

export interface MangaSourceResolutionLoadPort {
  loadBySlug(input: {
    slug: string;
    userId: string | null;
  }): Promise<MangaSourceResolutionSnapshot | null>;
}
