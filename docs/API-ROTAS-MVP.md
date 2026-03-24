# Rotas da API — MVP Midgard Core

Referência **expandida** (parâmetros, erros, auth, checklist): [`API-MVP-DETALHADA.md`](./API-MVP-DETALHADA.md).

**Prefixo dos recursos REST:** **`/api/v1`**.

**Fora do prefixo** (na raiz do servidor, ex.: `http://localhost:3000`):

| Caminho | Uso |
|---------|-----|
| **`/docs`** | Scalar (documentação interativa) |
| **`/api-json`** | OpenAPI em JSON |

## Decisão G.4 — capítulos `accessLevel = coin`

- **Listagem** (`GET /mangas/:slug/chapters`): capítulos **publicados** (`public` e `coin`) em **paginação** (`page`, `limit` — default `page=1`, `limit=50`, máx. `200`), ordenação natural por `number` (`order` `asc`|`desc`); `isLocked` indica coin na UI.
- **A partir de um número** (`GET /mangas/:slug/chapters/by-number/:number`): encontra o capítulo **publicado** com aquele `number` e devolve **`data` em ordem asc** a partir dele (inclusive), **paginado** (`page`, `limit`, mesmos defaults/máx. da listagem); leitura com páginas em `GET /chapters/:id` (UUID).
- **Preview no detalhe do mangá** (`chaptersCount`, `latestChapters`): apenas os **últimos** capítulos publicados no payload (não substitui a listagem paginada).
- **Faixa grátis (~10% por padrão):** ao fim de cada sync e via `npm run db:apply-free-tier`, os primeiros capítulos (por ordem de `number`) ficam **`public`**; o restante **`coin`** (`MANGA_FREE_CHAPTER_FRACTION`, `MANGA_COIN_CHAPTER_COST` no `.env`).
- **Listagem de capítulos** (`GET /mangas/:slug/chapters` e `.../by-number/...`): **JWT opcional**; com token, `isLocked` considera VIP ou desbloqueio por coins.
- **Leitura** (`GET /chapters/:id`): capítulo **`public`** pode ser lido **sem JWT** (sem progresso no servidor). Capítulo **`coin`** sem JWT → **403** `authentication_required`; com JWT → **403** `coin_chapter_not_unlocked` se ainda não desbloqueado (ver `ChapterAccessForbiddenResponseDto`).

---

## Tabela de rotas (status MVP)

| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| GET | `/docs` | N | Scalar (sem `api/v1`) |
| GET | `/api-json` | N | OpenAPI JSON (sem `api/v1`) |
| GET | `/health` | N | Health check |
| POST | `/auth/register` | N | Registro + JWT |
| POST | `/auth/login` | N | Login + JWT |
| GET | `/auth/me` | JWT | Perfil |
| PATCH | `/auth/me` | JWT | Atualizar nome |
| GET | `/home` | N | Home agregada (`trending`, `recommended`, `latestUpdates`) |
| GET | `/mangas` | N | Listar mangás (paginação/filtros) |
| GET | `/mangas/:slug` | N | Detalhe (sync se ausente no BD) |
| GET | `/mangas/:slug/chapters` | N | Capítulos publicados, **paginado** (`page`, `limit`, `order`) |
| GET | `/mangas/:slug/chapters/by-number/:number` | N | Lista **asc** a partir do `number` (deep link), paginada (`?page=&limit=`) |
| GET | `/categories` | N | Categorias |
| GET | `/chapters/:id` | Opcional | `public` sem JWT OK; JWT para cota/progresso; `coin` exige JWT |
| GET | `/users/me/lists` | JWT | Listas do usuário |
| POST | `/users/me/lists` | JWT | Criar lista |
| PATCH | `/users/me/lists/reorder` | JWT | Reordenar listas |
| GET | `/users/me/lists/:listId` | JWT | Detalhe + itens |
| PATCH | `/users/me/lists/:listId` | JWT | Renomear / ordem |
| DELETE | `/users/me/lists/:listId` | JWT | Excluir lista |
| POST | `/users/me/lists/:listId/items` | JWT | Adicionar mangá |
| DELETE | `/users/me/lists/:listId/items/:mangaId` | JWT | Remover mangá |
| GET | `/users/me/reading-progress` | JWT | Continuar lendo (`?limit=`) |
| PATCH | `/users/me/reading-progress` | JWT | Salvar progresso |

---

## Smoke / E2E local

1. `cp .env.example .env` — `DATABASE_URL`, `JWT_SECRET`.
2. `docker compose up -d postgres` (ou Postgres próprio).
3. `npx prisma migrate deploy` e `npm run db:seed` (plano `gratuito` + mangá `seed-mvp-demo`).
4. `npm run test:e2e` (sobe a app in-memory com `AppModule`; o spec chama `ensureMvpFixtures` no `beforeAll`, então funciona mesmo sem `db:seed` local se o BD estiver migrado).

No CI: job **e2e** executa `migrate deploy` → **`db:seed`** (redundante mas idempotente) → `test:e2e`.

Slug do mangá demo: constante `MVP_DEMO_MANGA_SLUG` em `prisma/mvp-fixtures.ts`.
