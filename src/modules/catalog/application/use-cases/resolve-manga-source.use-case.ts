import { Inject, Injectable } from '@nestjs/common';
import { MangaSourceUnavailableError } from '../../../../shared/domain/errors';
import {
  isEligibleForPublicCatalogSource,
  isUserScopedSourceOwnedByActor,
} from '../../../../shared/domain/public-catalog-source.policy';
import {
  MANGA_SOURCE_RESOLUTION_LOAD_PORT,
  type MangaExternalSourceCandidate,
  type MangaSourceResolutionLoadPort,
  type MangaSourceResolutionSnapshot,
} from '../ports/manga-source-resolution.port';

/** Catálogo / sync sem usuário: não considera preferência privada nem fontes user-scoped. */
export type ResolveMangaSourcePublicContext = { kind: 'public' };

/** Leitura ou sync com escopo de usuário (ou installation para match de source privada). */
export type ResolveMangaSourceUserContext = {
  kind: 'user';
  userId: string;
};

export type ResolveMangaSourceContext =
  | ResolveMangaSourcePublicContext
  | ResolveMangaSourceUserContext;

export type ResolvedMangaSource =
  | {
      kind: 'legacy_default';
      canonicalSlug: string;
      provider: 'NEXUSTOONS';
    }
  | {
      kind: 'hub_row';
      sourceRowId: string;
      provider: string;
      externalId: string;
      canonicalSlug: string;
    };

export interface ResolveMangaSourceInput {
  slug: string;
  context: ResolveMangaSourceContext;
  /** Para elegibilidade de `MangaExternalSource` com `ownerInstallationId`. */
  installationId?: string | null;
}

function compareGlobalCandidates(
  a: MangaExternalSourceCandidate,
  b: MangaExternalSourceCandidate,
): number {
  if (b.priority !== a.priority) {
    return b.priority - a.priority;
  }
  return b.healthScore - a.healthScore;
}

function isGlobalEligibleForContext(
  row: MangaExternalSourceCandidate,
  context: ResolveMangaSourceContext,
): boolean {
  if (row.isUserScoped) {
    return false;
  }
  if (!row.isFallbackEnabled) {
    return false;
  }
  if (context.kind === 'public') {
    return isEligibleForPublicCatalogSource(row);
  }
  return row.isActive;
}

function isUserScopedVisibleToViewer(
  row: MangaExternalSourceCandidate,
  context: ResolveMangaSourceUserContext,
  installationId: string | null | undefined,
): boolean {
  return isUserScopedSourceOwnedByActor({
    row,
    actorUserId: context.userId,
    installationId,
  });
}

function pickPreferred(
  snapshot: MangaSourceResolutionSnapshot,
  context: ResolveMangaSourceContext,
): MangaExternalSourceCandidate | null {
  if (snapshot.preferredSourceId == null) {
    return null;
  }
  const row = snapshot.sources.find((s) => s.id === snapshot.preferredSourceId);
  if (row == null || row.isUserScoped) {
    return null;
  }
  return isGlobalEligibleForContext(row, context) ? row : null;
}

function pickOfficial(
  snapshot: MangaSourceResolutionSnapshot,
  context: ResolveMangaSourceContext,
): MangaExternalSourceCandidate | null {
  const candidates = snapshot.sources.filter(
    (s) => s.isOfficial && isGlobalEligibleForContext(s, context),
  );
  if (candidates.length === 0) {
    return null;
  }
  return [...candidates].sort(compareGlobalCandidates)[0] ?? null;
}

function pickUserPreference(
  snapshot: MangaSourceResolutionSnapshot,
  context: ResolveMangaSourceContext,
  installationId: string | null | undefined,
): MangaExternalSourceCandidate | null {
  if (context.kind !== 'user' || snapshot.userPreferredSourceId == null) {
    return null;
  }
  const row = snapshot.sources.find(
    (s) => s.id === snapshot.userPreferredSourceId,
  );
  if (row == null || !row.isActive || !row.isFallbackEnabled) {
    return null;
  }
  if (row.isUserScoped) {
    return isUserScopedVisibleToViewer(row, context, installationId)
      ? row
      : null;
  }
  return row;
}

function pickBestGlobal(
  snapshot: MangaSourceResolutionSnapshot,
  context: ResolveMangaSourceContext,
): MangaExternalSourceCandidate | null {
  const candidates = snapshot.sources.filter((s) =>
    isGlobalEligibleForContext(s, context),
  );
  if (candidates.length === 0) {
    return null;
  }
  return [...candidates].sort(compareGlobalCandidates)[0] ?? null;
}

function toHubResolved(
  row: MangaExternalSourceCandidate,
  snapshot: MangaSourceResolutionSnapshot,
): ResolvedMangaSource {
  return {
    kind: 'hub_row',
    sourceRowId: row.id,
    provider: row.provider,
    externalId: row.externalId,
    canonicalSlug: snapshot.mangaSlug,
  };
}

function toLegacy(canonicalSlug: string): ResolvedMangaSource {
  return {
    kind: 'legacy_default',
    canonicalSlug,
    provider: 'NEXUSTOONS',
  };
}

@Injectable()
export class ResolveMangaSourceUseCase {
  constructor(
    @Inject(MANGA_SOURCE_RESOLUTION_LOAD_PORT)
    private readonly loadPort: MangaSourceResolutionLoadPort,
  ) {}

  async execute(input: ResolveMangaSourceInput): Promise<ResolvedMangaSource> {
    const userId = input.context.kind === 'user' ? input.context.userId : null;
    const snapshot = await this.loadPort.loadBySlug({
      slug: input.slug.trim(),
      userId,
    });

    if (snapshot == null) {
      return toLegacy(input.slug.trim());
    }

    if (snapshot.sources.length === 0) {
      return toLegacy(snapshot.mangaSlug);
    }

    const installationId = input.installationId ?? null;

    const preferred = pickPreferred(snapshot, input.context);
    if (preferred != null) {
      return toHubResolved(preferred, snapshot);
    }

    const official = pickOfficial(snapshot, input.context);
    if (official != null) {
      return toHubResolved(official, snapshot);
    }

    const userPref = pickUserPreference(
      snapshot,
      input.context,
      installationId,
    );
    if (userPref != null) {
      return toHubResolved(userPref, snapshot);
    }

    const best = pickBestGlobal(snapshot, input.context);
    if (best != null) {
      return toHubResolved(best, snapshot);
    }

    throw new MangaSourceUnavailableError(
      `Nenhuma fonte ativa elegível para o mangá "${snapshot.mangaSlug}".`,
    );
  }
}
