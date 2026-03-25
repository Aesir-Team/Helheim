import { MangaSourceUnavailableError } from '../../../../shared/domain/errors';
import type {
  MangaSourceResolutionLoadPort,
  MangaSourceResolutionSnapshot,
} from '../ports/manga-source-resolution.port';
import {
  ResolveMangaSourceUseCase,
  type ResolveMangaSourceContext,
} from './resolve-manga-source.use-case';

function baseRow(
  id: string,
  overrides: Partial<MangaSourceResolutionSnapshot['sources'][0]> = {},
): MangaSourceResolutionSnapshot['sources'][0] {
  return {
    id,
    provider: 'NEXUSTOONS',
    externalId: 'ext-1',
    originType: 'external',
    isOfficial: false,
    isPublicEligible: true,
    isFallbackEnabled: true,
    isUserScoped: false,
    ownerUserId: null,
    ownerInstallationId: null,
    healthScore: 1,
    priority: 0,
    isActive: true,
    ...overrides,
  };
}

function makeSnapshot(
  overrides: Partial<MangaSourceResolutionSnapshot> = {},
): MangaSourceResolutionSnapshot {
  return {
    mangaId: 'm1',
    mangaSlug: 'solo-leveling',
    preferredSourceId: null,
    legacyExternalId: 'legacy-ext',
    sources: [],
    userPreferredSourceId: null,
    ...overrides,
  };
}

function makeSut(
  load: MangaSourceResolutionLoadPort,
): ResolveMangaSourceUseCase {
  return new ResolveMangaSourceUseCase(load);
}

describe('ResolveMangaSourceUseCase', () => {
  it('Given no manga row, should return legacy Nexustoons with request slug', async () => {
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest.fn().mockResolvedValue(null),
    };
    const sut = makeSut(load);

    const r = await sut.execute({
      slug: '  unknown  ',
      context: { kind: 'public' },
    });

    expect(r).toEqual({
      kind: 'legacy_default',
      canonicalSlug: 'unknown',
      provider: 'NEXUSTOONS',
    });
  });

  it('Given manga with no hub rows, should return legacy with manga slug', async () => {
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest.fn().mockResolvedValue(makeSnapshot({ sources: [] })),
    };
    const sut = makeSut(load);

    const r = await sut.execute({
      slug: 'solo-leveling',
      context: { kind: 'public' },
    });

    expect(r).toEqual({
      kind: 'legacy_default',
      canonicalSlug: 'solo-leveling',
      provider: 'NEXUSTOONS',
    });
  });

  it('Given preferred global public-eligible source, should pick it', async () => {
    const s1 = baseRow('src-pref', { priority: 0 });
    const s2 = baseRow('src-high', { priority: 99 });
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest
        .fn()
        .mockResolvedValue(
          makeSnapshot({ preferredSourceId: 'src-pref', sources: [s1, s2] }),
        ),
    };
    const sut = makeSut(load);

    const r = await sut.execute({
      slug: 'solo-leveling',
      context: { kind: 'public' },
    });

    expect(r).toMatchObject({
      kind: 'hub_row',
      sourceRowId: 'src-pref',
    });
  });

  it('Given preferred is user-scoped, should skip and use official', async () => {
    const badPref = baseRow('bad', { isUserScoped: true, ownerUserId: 'u1' });
    const official = baseRow('off', { isOfficial: true, priority: 5 });
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest.fn().mockResolvedValue(
        makeSnapshot({
          preferredSourceId: 'bad',
          sources: [badPref, official],
        }),
      ),
    };
    const sut = makeSut(load);

    const r = await sut.execute({
      slug: 'solo-leveling',
      context: { kind: 'public' },
    });

    expect(r).toMatchObject({ kind: 'hub_row', sourceRowId: 'off' });
  });

  it('Given public context and preferred not public-eligible, should skip preferred', async () => {
    const pref = baseRow('p1', {
      isPublicEligible: false,
      priority: 100,
    });
    const fallback = baseRow('f1', { priority: 1 });
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest.fn().mockResolvedValue(
        makeSnapshot({
          preferredSourceId: 'p1',
          sources: [pref, fallback],
        }),
      ),
    };
    const sut = makeSut(load);

    const r = await sut.execute({
      slug: 'solo-leveling',
      context: { kind: 'public' },
    });

    expect(r).toMatchObject({ kind: 'hub_row', sourceRowId: 'f1' });
  });

  it('Given user context, should allow non-public-eligible global preferred', async () => {
    const pref = baseRow('p1', {
      isPublicEligible: false,
      priority: 100,
    });
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest.fn().mockResolvedValue(
        makeSnapshot({
          preferredSourceId: 'p1',
          sources: [pref],
        }),
      ),
    };
    const sut = makeSut(load);
    const ctx: ResolveMangaSourceContext = {
      kind: 'user',
      userId: 'u1',
    };

    const r = await sut.execute({
      slug: 'solo-leveling',
      context: ctx,
    });

    expect(r).toMatchObject({ kind: 'hub_row', sourceRowId: 'p1' });
  });

  it('Given user preference on owned scoped source, should pick before generic global', async () => {
    const globalLow = baseRow('g1', { priority: 0 });
    const scoped = baseRow('priv', {
      isUserScoped: true,
      ownerUserId: 'u1',
      priority: 0,
    });
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest.fn().mockResolvedValue(
        makeSnapshot({
          sources: [globalLow, scoped],
          userPreferredSourceId: 'priv',
        }),
      ),
    };
    const sut = makeSut(load);

    const r = await sut.execute({
      slug: 'solo-leveling',
      context: { kind: 'user', userId: 'u1' },
    });

    expect(r).toMatchObject({ kind: 'hub_row', sourceRowId: 'priv' });
  });

  it('Given user preference on scoped source of another user, should fall back to global', async () => {
    const globalG = baseRow('g1', { priority: 1 });
    const scoped = baseRow('priv', {
      isUserScoped: true,
      ownerUserId: 'other',
    });
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest.fn().mockResolvedValue(
        makeSnapshot({
          sources: [globalG, scoped],
          userPreferredSourceId: 'priv',
        }),
      ),
    };
    const sut = makeSut(load);

    const r = await sut.execute({
      slug: 'solo-leveling',
      context: { kind: 'user', userId: 'u1' },
    });

    expect(r).toMatchObject({ kind: 'hub_row', sourceRowId: 'g1' });
  });

  it('Given installationId matching scoped preference, should pick scoped', async () => {
    const scoped = baseRow('priv', {
      isUserScoped: true,
      ownerInstallationId: 'inst-1',
      ownerUserId: null,
    });
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest.fn().mockResolvedValue(
        makeSnapshot({
          sources: [scoped],
          userPreferredSourceId: 'priv',
        }),
      ),
    };
    const sut = makeSut(load);

    const r = await sut.execute({
      slug: 'solo-leveling',
      context: { kind: 'user', userId: 'anon' },
      installationId: 'inst-1',
    });

    expect(r).toMatchObject({ kind: 'hub_row', sourceRowId: 'priv' });
  });

  it('Given only user-scoped rows and public context, should throw', async () => {
    const scoped = baseRow('priv', {
      isUserScoped: true,
      ownerUserId: 'u1',
    });
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest
        .fn()
        .mockResolvedValue(makeSnapshot({ sources: [scoped] })),
    };
    const sut = makeSut(load);

    await expect(
      sut.execute({ slug: 'solo-leveling', context: { kind: 'public' } }),
    ).rejects.toBeInstanceOf(MangaSourceUnavailableError);
  });

  it('Given global rows, should pick highest priority then health', async () => {
    const a = baseRow('a', { priority: 10, healthScore: 0.5 });
    const b = baseRow('b', { priority: 20, healthScore: 0.1 });
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest
        .fn()
        .mockResolvedValue(makeSnapshot({ sources: [a, b] })),
    };
    const sut = makeSut(load);

    const r = await sut.execute({
      slug: 'solo-leveling',
      context: { kind: 'public' },
    });

    expect(r).toMatchObject({ kind: 'hub_row', sourceRowId: 'b' });
  });

  it('Given same priority, should pick higher healthScore', async () => {
    const a = baseRow('a', { priority: 5, healthScore: 0.3 });
    const b = baseRow('b', { priority: 5, healthScore: 0.9 });
    const load: MangaSourceResolutionLoadPort = {
      loadBySlug: jest
        .fn()
        .mockResolvedValue(makeSnapshot({ sources: [a, b] })),
    };
    const sut = makeSut(load);

    const r = await sut.execute({
      slug: 'solo-leveling',
      context: { kind: 'public' },
    });

    expect(r).toMatchObject({ kind: 'hub_row', sourceRowId: 'b' });
  });
});
