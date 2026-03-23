import { ConfigService } from '@nestjs/config';
import { NexustoonsMangaGateway } from './nexustoons-manga.gateway';
import { ExternalMangaGatewayHttpError } from './external-manga-gateway-http.error';

function mockFetchResponse(
  body: unknown,
  init?: { ok?: boolean; status?: number },
) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: (): Promise<unknown> => Promise.resolve(body),
  };
}

function firstFetchUrl(mock: jest.Mock): string {
  const calls = mock.mock.calls as unknown as [
    string,
    RequestInit | undefined,
  ][];
  const first = calls[0];
  if (first === undefined) {
    throw new Error('fetch was not called');
  }
  return first[0];
}

describe('NexustoonsMangaGateway', () => {
  const config = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'EXTERNAL_MANGA_BASE_URL') {
        return 'https://nexustoons.com';
      }
      return defaultValue;
    }),
  } as unknown as ConfigService;

  let gateway: NexustoonsMangaGateway;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    gateway = new NexustoonsMangaGateway(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listMangas', () => {
    it('omite query params quando todos são null', async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse([
          {
            id: '1',
            slug: 'a',
            title: 'A',
            coverImage: 'https://x.jpg',
          },
        ]),
      );

      const out = await gateway.listMangas({
        search: null,
        limit: null,
        includeNsfw: null,
        sortBy: null,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(firstFetchUrl(fetchMock)).toBe(
        'https://nexustoons.com/api/mangas',
      );
      expect(out).toHaveLength(1);
      expect(out[0].slug).toBe('a');
    });

    it('envia limit, includeNsfw e sortBy como na API Nexustoons', async () => {
      fetchMock.mockResolvedValue(mockFetchResponse([]));

      await gateway.listMangas({
        limit: 120,
        includeNsfw: true,
        sortBy: 'lastChapterAt',
      });

      const url = new URL(firstFetchUrl(fetchMock));
      expect(url.pathname).toBe('/api/mangas');
      expect(url.searchParams.get('limit')).toBe('120');
      expect(url.searchParams.get('includeNsfw')).toBe('true');
      expect(url.searchParams.get('sortBy')).toBe('lastChapterAt');
    });

    it('envia search quando preenchido', async () => {
      fetchMock.mockResolvedValue(mockFetchResponse([]));
      await gateway.listMangas({ search: 'solo' });
      const url = new URL(firstFetchUrl(fetchMock));
      expect(url.searchParams.get('search')).toBe('solo');
    });

    it('lança ExternalMangaGatewayHttpError quando HTTP não OK', async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({}, { ok: false, status: 502 }),
      );
      await expect(gateway.listMangas({})).rejects.toThrow(
        ExternalMangaGatewayHttpError,
      );
    });
  });

  describe('listTrending', () => {
    it('chama /api/mangas/trending com limit e includeNsfw', async () => {
      fetchMock.mockResolvedValue(mockFetchResponse([]));

      await gateway.listTrending({ limit: 10, includeNsfw: true });

      const url = new URL(firstFetchUrl(fetchMock));
      expect(url.pathname).toBe('/api/mangas/trending');
      expect(url.searchParams.get('limit')).toBe('10');
      expect(url.searchParams.get('includeNsfw')).toBe('true');
    });
  });

  describe('getMangaBySlug', () => {
    it('usa /api/mangas/{slug}', async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          id: '1',
          slug: 'solo-leveling',
          title: 'Solo',
          coverImage: 'c',
        }),
      );

      const m = await gateway.getMangaBySlug('solo-leveling');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://nexustoons.com/api/mangas/solo-leveling',
        { method: 'GET' },
      );
      expect(m?.slug).toBe('solo-leveling');
    });

    it('codifica slug com caracteres especiais', async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          id: '1',
          slug: 'a%20b',
          title: 'T',
          coverImage: 'c',
        }),
      );
      await gateway.getMangaBySlug('a b');
      expect(firstFetchUrl(fetchMock)).toContain('a%20b');
    });

    it('retorna null em 404', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        json: (): Promise<unknown> => Promise.resolve({}),
      });
      await expect(gateway.getMangaBySlug('missing')).resolves.toBeNull();
    });
  });

  describe('getChapterById', () => {
    it('usa /api/chapter/{id}', async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          id: 'ch-uuid',
          pages: [{ pageNumber: 1, imageUrl: 'https://p.jpg' }],
        }),
      );

      const c = await gateway.getChapterById('ch-uuid');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://nexustoons.com/api/chapter/ch-uuid',
        { method: 'GET' },
      );
      expect(c?.id).toBe('ch-uuid');
      expect(c?.pages).toHaveLength(1);
    });

    it('retorna null em 404', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        json: (): Promise<unknown> => Promise.resolve({}),
      });
      await expect(gateway.getChapterById('x')).resolves.toBeNull();
    });
  });
});
