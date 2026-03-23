# Gateway Nexustoons (fonte externa do catálogo)

Integração **HTTP** com a API pública Nexustoons — não há scrap de HTML neste adapter.

**Implementação:** `NexustoonsMangaGateway` → port `ExternalMangaGatewayPort` (`EXTERNAL_MANGA_GATEWAY`).  
**Base URL:** `EXTERNAL_MANGA_BASE_URL` (default `https://nexustoons.com`).

---

## Rotas utilizadas

| Método | Caminho | Uso no Midgard |
|--------|---------|----------------|
| GET | `/api/mangas` | Listagem / busca (`listMangas`) |
| GET | `/api/mangas/trending` | Trending (`listTrending`) |
| GET | `/api/mangas/{slug}` | Detalhe da obra (`getMangaBySlug`) |
| GET | `/api/chapter/{chapterId}` | Páginas do capítulo (`getChapterById`) |

---

## Query params — `GET /api/mangas`

| Param | Tipo | Observação |
|-------|------|------------|
| `search` | `string` \| omitido | Omitido se `null` ou string vazia. |
| `limit` | `number` \| omitido | Omitido se `null`. |
| `includeNsfw` | `boolean` \| omitido | Omitido se `null`. |
| `sortBy` | `views` \| `lastChapterAt` \| omitido | Omitido se `null`. |

Exemplo alinhado ao produto:  
`GET /api/mangas?limit=120&includeNsfw=true&sortBy=lastChapterAt`

---

## Query params — `GET /api/mangas/trending`

| Param | Tipo |
|-------|------|
| `limit` | número (ex.: 10) |
| `includeNsfw` | boolean |

Exemplo:  
`GET /api/mangas/trending?limit=10&includeNsfw=true`

---

## Respostas JSON

O mapper aceita formatos comuns:

- Lista: array na raiz, ou `{ data: [] }`, `{ mangas: [] }`, `{ results: [] }`.
- Mangá: objeto com `id`, `slug`, `title` e capa (`coverImage`, `cover` ou `thumbnail`).
- Capítulo: `pages[]` com `pageNumber` + `imageUrl`, ou `images[]` com `page` + `url`.

Se a API Nexustoons mudar nomes de campos, ajustar `nexustoons-json.mapper.ts` e os testes.

---

## Erros

- Status **404** em detalhe de mangá ou capítulo → retorno `null` (sem throw).
- Outros **4xx/5xx** em listagens → `ExternalMangaGatewayHttpError` com `statusCode`.

---

## Próximos passos (MVP)

- Use case `SyncMangaFromSourceUseCase` injeta `EXTERNAL_MANGA_GATEWAY` e persiste em Prisma.
- Mapear `ExternalSourceProvider.NEXUSTOONS` em `MangaExternalSource`.
