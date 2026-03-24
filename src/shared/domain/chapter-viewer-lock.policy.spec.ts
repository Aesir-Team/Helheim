import { applyViewerChapterLockFlags } from './chapter-viewer-lock.policy';

describe('applyViewerChapterLockFlags', () => {
  const coin = {
    id: 'c1',
    accessLevel: 'coin',
    isLocked: true,
    extra: 1,
  };
  const pub = {
    id: 'p1',
    accessLevel: 'public',
    isLocked: false,
    extra: 2,
  };

  it('Given VIP viewer, should unlock coin rows for UI', () => {
    const out = applyViewerChapterLockFlags([coin, pub], { userId: 'u', role: 'VIP' }, new Set());
    expect(out[0]).toMatchObject({ id: 'c1', isLocked: false, extra: 1 });
    expect(out[1]).toEqual(pub);
  });

  it('Given USER e capítulo na lista de desbloqueados, should set isLocked false', () => {
    const out = applyViewerChapterLockFlags(
      [coin],
      { userId: 'u', role: 'USER' },
      new Set(['c1']),
    );
    expect(out[0]?.isLocked).toBe(false);
  });

  it('Given USER sem desbloqueio, should manter isLocked true em coin', () => {
    const out = applyViewerChapterLockFlags(
      [coin],
      { userId: 'u', role: 'USER' },
      new Set(),
    );
    expect(out[0]?.isLocked).toBe(true);
  });

  it('Given sem viewer, should manter flags do repositório', () => {
    const out = applyViewerChapterLockFlags([coin], null, new Set());
    expect(out[0]?.isLocked).toBe(true);
  });
});
