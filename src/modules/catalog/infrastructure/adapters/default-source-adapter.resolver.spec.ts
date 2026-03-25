import { NotFoundError } from '../../../../shared/domain/errors';
import { DefaultSourceAdapterResolver } from './default-source-adapter.resolver';
import type { SourceMangaAdapterPort } from '../../application/ports/source-manga-adapter.port';

function makeAdapter(): SourceMangaAdapterPort {
  return {
    listMangas: jest.fn().mockResolvedValue([]),
    listTrending: jest.fn().mockResolvedValue([]),
    getMangaBySlug: jest.fn().mockResolvedValue(null),
    getChapterById: jest.fn().mockResolvedValue(null),
  };
}

describe('DefaultSourceAdapterResolver', () => {
  it('resolveForPublicCatalogIngest should retornar o adapter Nexustoons', () => {
    const adapter = makeAdapter();
    const sut = new DefaultSourceAdapterResolver(adapter);

    expect(sut.resolveForPublicCatalogIngest()).toBe(adapter);
  });

  it('resolveForProvider NEXUSTOONS should retornar o mesmo adapter', () => {
    const adapter = makeAdapter();
    const sut = new DefaultSourceAdapterResolver(adapter);

    expect(sut.resolveForProvider('nexustoons')).toBe(adapter);
    expect(sut.resolveForProvider('NEXUSTOONS')).toBe(adapter);
  });

  it('resolveForProvider desconhecido should lançar NotFoundError', () => {
    const sut = new DefaultSourceAdapterResolver(makeAdapter());

    expect(() => sut.resolveForProvider('MANGADEX')).toThrow(NotFoundError);
  });
});
