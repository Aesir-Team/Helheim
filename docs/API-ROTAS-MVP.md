# Rotas da API — MVP Midgard Core

Referência **expandida** (parâmetros, erros, auth, checklist): [`API-MVP-DETALHADA.md`](./API-MVP-DETALHADA.md).

**Prefixo dos recursos REST:** **`/api/v1`**.

**Fora do prefixo** (na raiz do servidor, ex.: `http://localhost:3000`):

| Caminho | Uso |
|---------|-----|
| **`/docs`** | Scalar (documentação interativa) |
| **`/api-json`** | OpenAPI em JSON |

## Decisão G.4 — capítulos `accessLevel = coin`

- **Listagem** (`GET /mangas/:slug/chapters`) e **preview no detalhe do mangá** (`chaptersCount`, `latestChapters`): apenas capítulos **`public`**. Capítulos **`coin`** ficam **ocultos** até o módulo Coins.
- **Leitura** (`GET /chapters/:id` com JWT): capítulo **`coin`** → **403** com `reason: coin_chapter_not_available` (ver `ChapterAccessForbiddenResponseDto`).

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
| GET | `/mangas` | N | Listar mangás (paginação/filtros) |
| GET | `/mangas/:slug` | N | Detalhe (sync se ausente no BD) |
| GET | `/mangas/:slug/chapters` | N | Capítulos **public** publicados |
| GET | `/categories` | N | Categorias |
| GET | `/chapters/:id` | **JWT** | Leitura (cota semanal / coin bloqueado MVP) |
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
