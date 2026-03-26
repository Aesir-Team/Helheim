export const MANGA_EXTERNAL_SOURCE_REPOSITORY = Symbol(
  'MANGA_EXTERNAL_SOURCE_REPOSITORY',
);

export interface MangaExternalSourceRow {
  id: string;
  mangaId: string;
  provider: string;
  externalId: string;
  isUserScoped: boolean;
  ownerUserId: string | null;
  ownerInstallationId: string | null;
  isActive: boolean;
}

export interface MangaExternalSourceRepositoryPort {
  findById(id: string): Promise<MangaExternalSourceRow | null>;

  getSyncStatus(
    sourceId: string,
  ): Promise<{ syncStatus: string; lastSyncedAt: Date | null } | null>;

  setSyncStatus(
    sourceId: string,
    status: 'idle' | 'syncing' | 'error',
    error?: string,
  ): Promise<void>;

  /** Após validar adapter (sem persistir capítulo global). */
  markSourceSyncSuccess(sourceId: string): Promise<void>;
}
