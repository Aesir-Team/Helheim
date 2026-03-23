# Gateway Nexustoons (fonte externa do catálogo)

Integração **HTTP** com a API pública Nexustoons — não há scrap de HTML neste adapter.

**Implementação:** `NexustoonsMangaGateway` → port `ExternalMangaGatewayPort` (`EXTERNAL_MANGA_GATEWAY`).  
**Base URL:** `EXTERNAL_MANGA_BASE_URL` (default `https://nexustoons.com`).

---

## Rotas utilizadas

| Método | Caminho | Uso no Midgard |
|--------|---------|----------------|
| GET | `/api/mangas` | Listagem; o Midgard chama com `search` quando o cliente usa `GET /api/v1/mangas?search=` (upsert no catálogo antes de paginar no Prisma) |
| GET | `/api/mangas/trending` | Trending (`listTrending`) |
| GET | `/api/manga/{slug}` | Detalhe da obra (`getMangaBySlug`) — o Midgard chama em **toda** `GET /api/v1/mangas/:slug` (upsert no catálogo antes de ler o Prisma) |
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

## Sync de capítulos (background) e Redis

O `SyncMangaFromSourceUseCase` percorre os capítulos **um a um** com pausa configurável (`MANGA_SYNC_CHAPTER_DELAY_MS`, padrão 300 ms). Há um **prazo máximo** (`MANGA_SYNC_DEADLINE_MS`, padrão **3 horas** = 10_800_000 ms): ao estourar, interrompe, grava `syncStatus`/`error` no Prisma e publica estado `timeout` no Redis (se habilitado).

**URLs das imagens** continuam no **PostgreSQL** (`ChapterPage.imageUrl`), via `upsertByMangaAndNumber`.

Se `REDIS_URL` estiver definido, o progresso é gravado como JSON na chave:

`midgard:manga-sync:v1:{manga|manhwa|manhua}:{slug}`

O segmento do meio é o **tipo canônico** Midgard (ex.: doujinshi da fonte → `manga`). Campos úteis no JSON: `status` (`running` | `completed` | `timeout` | `failed`), `chaptersProcessed`, `totalChapters`, `lastChapterNumber`, `lastImageUrlPreview` (até 3 URLs da última leitura), `deadlineAt`. TTL da chave: `MANGA_SYNC_REDIS_TTL_SEC` (padrão 7 dias).

---

## Próximos passos (MVP)

- Mapear `ExternalSourceProvider.NEXUSTOONS` em `MangaExternalSource`.
