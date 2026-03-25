/**
 * Regras de isolamento catálogo público vs fontes user-scoped (Midgard hub).
 * Queries de discovery (home, busca, trending/recommended/latest no BD) devem alinhar-se a isto.
 *
 * @see refactor/03-public-vs-private.md
 */

/** Predicado de linha `MangaExternalSource` elegível ao catálogo público (Prisma where / checagem em memória). */
export const PUBLIC_CATALOG_EXTERNAL_SOURCE_PREDICATE = {
  isUserScoped: false,
  isPublicEligible: true,
  isActive: true,
} as const;

export type PublicCatalogSourceRow = {
  isUserScoped: boolean;
  isPublicEligible: boolean;
  isActive: boolean;
};

export function isEligibleForPublicCatalogSource(
  row: PublicCatalogSourceRow,
): boolean {
  return (
    row.isUserScoped === false &&
    row.isPublicEligible === true &&
    row.isActive === true
  );
}

/**
 * Escopo de visibilidade do mangá no catálogo público:
 * - sem linhas no hub → legado / só catálogo canônico, continua listável;
 * - com linhas → pelo menos uma fonte pública elegível ativa.
 */
export function mangaPublicCatalogVisibilityWhere() {
  return {
    OR: [
      { externalSources: { none: {} } },
      {
        externalSources: {
          some: { ...PUBLIC_CATALOG_EXTERNAL_SOURCE_PREDICATE },
        },
      },
    ],
  };
}

export type UserScopedSourceRow = {
  isUserScoped: boolean;
  ownerUserId: string | null;
  ownerInstallationId: string | null;
};

/**
 * Fonte user-scoped só pode ser usada em contexto privado se o ator for o dono
 * (`ownerUserId` ou `ownerInstallationId` quando aplicável).
 */
export function isUserScopedSourceOwnedByActor(input: {
  row: UserScopedSourceRow;
  actorUserId: string | null;
  installationId?: string | null;
}): boolean {
  if (!input.row.isUserScoped) {
    return true;
  }
  if (
    input.actorUserId != null &&
    input.row.ownerUserId != null &&
    input.row.ownerUserId === input.actorUserId
  ) {
    return true;
  }
  const inst = input.installationId;
  if (
    inst != null &&
    inst !== '' &&
    input.row.ownerInstallationId != null &&
    input.row.ownerInstallationId === inst
  ) {
    return true;
  }
  return false;
}
