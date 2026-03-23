import {
  extractMangaArrayPayload,
  mapToChapterDetail,
  mapToMangaDetail,
  mapToMangaSummary,
} from './nexustoons-json.mapper';

describe('nexustoons-json.mapper', () => {
  describe('extractMangaArrayPayload', () => {
    it('aceita array na raiz', () => {
      expect(extractMangaArrayPayload([{ x: 1 }])).toEqual([{ x: 1 }]);
    });

    it('aceita { data: [] }', () => {
      expect(extractMangaArrayPayload({ data: [{ id: '1' }] })).toEqual([
        { id: '1' },
      ]);
    });

    it('aceita { mangas: [] }', () => {
      expect(extractMangaArrayPayload({ mangas: [] })).toEqual([]);
    });
  });

  describe('mapToMangaSummary', () => {
    it('mapeia objeto mínimo válido', () => {
      expect(
        mapToMangaSummary({
          id: 'm1',
          slug: 'solo',
          title: 'Solo',
          coverImage: 'https://cdn/x.jpg',
        }),
      ).toEqual({
        id: 'm1',
        slug: 'solo',
        title: 'Solo',
        coverImage: 'https://cdn/x.jpg',
        alternativeTitles: null,
        description: null,
        bannerImage: null,
        status: null,
        type: null,
        rating: null,
        views: null,
        releaseYear: null,
        isNsfw: null,
        author: null,
        artist: null,
        officialLink: null,
        lastChapterAt: null,
      });
    });

    it('usa cover como fallback de capa', () => {
      const r = mapToMangaSummary({
        id: 'm1',
        slug: 's',
        title: 'T',
        cover: 'https://c.jpg',
      });
      expect(r?.coverImage).toBe('https://c.jpg');
    });

    it('retorna null se faltar slug', () => {
      expect(
        mapToMangaSummary({ id: 'm1', title: 'T', coverImage: 'x' }),
      ).toBeNull();
    });
  });

  describe('mapToMangaDetail', () => {
    it('inclui capítulos quando array chapters existe', () => {
      const d = mapToMangaDetail({
        id: 'm1',
        slug: 's',
        title: 'T',
        coverImage: 'c',
        chapters: [{ id: 'ch1', number: '1', title: 'Cap 1' }],
      });
      expect(d?.chapters).toEqual([
        { id: 'ch1', number: '1', title: 'Cap 1', createdAt: null },
      ]);
    });
  });

  describe('mapToChapterDetail', () => {
    it('mapeia páginas', () => {
      const c = mapToChapterDetail({
        id: 'ch1',
        mangaId: 'm1',
        number: '5',
        pages: [
          { pageNumber: 1, imageUrl: 'https://a.jpg' },
          { pageNumber: 2, imageUrl: 'https://b.jpg' },
        ],
      });
      expect(c).toEqual({
        id: 'ch1',
        mangaId: 'm1',
        number: '5',
        title: null,
        pages: [
          { pageNumber: 1, imageUrl: 'https://a.jpg' },
          { pageNumber: 2, imageUrl: 'https://b.jpg' },
        ],
      });
    });

    it('aceita images[] com url', () => {
      const c = mapToChapterDetail({
        id: 'ch1',
        images: [
          { page: 1, url: 'https://a.jpg' },
          { page: 2, url: 'https://b.jpg' },
        ],
      });
      expect(c?.pages).toHaveLength(2);
      expect(c?.pages[0]).toEqual({ pageNumber: 1, imageUrl: 'https://a.jpg' });
    });
  });
});
