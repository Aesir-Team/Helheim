import {
  PUBLIC_CATALOG_EXTERNAL_SOURCE_PREDICATE,
  isEligibleForPublicCatalogSource,
  isUserScopedSourceOwnedByActor,
  mangaPublicCatalogVisibilityWhere,
} from './public-catalog-source.policy';

describe('public-catalog-source.policy', () => {
  describe('PUBLIC_CATALOG_EXTERNAL_SOURCE_PREDICATE', () => {
    it('should fixar o predicado de catálogo público', () => {
      expect(PUBLIC_CATALOG_EXTERNAL_SOURCE_PREDICATE).toEqual({
        isUserScoped: false,
        isPublicEligible: true,
        isActive: true,
      });
    });
  });

  describe('isEligibleForPublicCatalogSource', () => {
    it('should aceitar só combinação pública elegível', () => {
      expect(
        isEligibleForPublicCatalogSource({
          isUserScoped: false,
          isPublicEligible: true,
          isActive: true,
        }),
      ).toBe(true);
      expect(
        isEligibleForPublicCatalogSource({
          isUserScoped: true,
          isPublicEligible: true,
          isActive: true,
        }),
      ).toBe(false);
      expect(
        isEligibleForPublicCatalogSource({
          isUserScoped: false,
          isPublicEligible: false,
          isActive: true,
        }),
      ).toBe(false);
      expect(
        isEligibleForPublicCatalogSource({
          isUserScoped: false,
          isPublicEligible: true,
          isActive: false,
        }),
      ).toBe(false);
    });
  });

  describe('mangaPublicCatalogVisibilityWhere', () => {
    it('should exigir nenhuma source ou alguma pública elegível', () => {
      const w = mangaPublicCatalogVisibilityWhere();
      expect(w.OR).toHaveLength(2);
      expect(w.OR[1]).toEqual({
        externalSources: {
          some: { ...PUBLIC_CATALOG_EXTERNAL_SOURCE_PREDICATE },
        },
      });
    });
  });

  describe('isUserScopedSourceOwnedByActor', () => {
    it('should tratar fonte não user-scoped como visível', () => {
      expect(
        isUserScopedSourceOwnedByActor({
          row: {
            isUserScoped: false,
            ownerUserId: null,
            ownerInstallationId: null,
          },
          actorUserId: 'u1',
        }),
      ).toBe(true);
    });

    it('should exigir ownerUserId quando user-scoped', () => {
      expect(
        isUserScopedSourceOwnedByActor({
          row: {
            isUserScoped: true,
            ownerUserId: 'u1',
            ownerInstallationId: null,
          },
          actorUserId: 'u1',
        }),
      ).toBe(true);
      expect(
        isUserScopedSourceOwnedByActor({
          row: {
            isUserScoped: true,
            ownerUserId: 'u1',
            ownerInstallationId: null,
          },
          actorUserId: 'u2',
        }),
      ).toBe(false);
    });

    it('should aceitar installationId quando bate', () => {
      expect(
        isUserScopedSourceOwnedByActor({
          row: {
            isUserScoped: true,
            ownerUserId: null,
            ownerInstallationId: 'inst-a',
          },
          actorUserId: null,
          installationId: 'inst-a',
        }),
      ).toBe(true);
      expect(
        isUserScopedSourceOwnedByActor({
          row: {
            isUserScoped: true,
            ownerUserId: null,
            ownerInstallationId: 'inst-a',
          },
          actorUserId: null,
          installationId: 'inst-b',
        }),
      ).toBe(false);
    });
  });
});
