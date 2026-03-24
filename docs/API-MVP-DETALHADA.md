# API Midgard Core — referência detalhada (MVP)

Documento complementar à tabela resumida em [`API-ROTAS-MVP.md`](./API-ROTAS-MVP.md). Descreve contratos HTTP, parâmetros e comportamentos alinhados ao código atual.

---

## 1. Convenções gerais

| Item | Valor |
|------|--------|
| **Base da API REST** | `{ORIGIN}/api/v1` (ex.: `http://localhost:3000/api/v1`) |
| **Porta** | `PORT` no `.env`; padrão **3000** |
| **Content-Type** | `application/json` em corpos de request/response |
| **Validação** | `ValidationPipe` global: propriedades não declaradas no DTO são rejeitadas (**400** com mensagem de validação no formato Nest). |
| **Documentação interativa** | **`GET /docs`** — Scalar ( **sem** prefixo `api/v1`) |
| **OpenAPI JSON** | **`GET /api-json`** — **sem** prefixo `api/v1` |

Todas as rotas da tabela “recursos” abaixo usam o prefixo **`/api/v1`**, exceto `/docs` e `/api-json`.

---

## 2. Autenticação (JWT)

Rotas marcadas como **JWT** exigem cabeçalho:

```http
Authorization: Bearer <token>
```

O token é emitido em **`POST /auth/register`** e **`POST /auth/login`**. O payload inclui `sub` (user id), `email` e **`role`** (`USER` | `VIP` | `ADMIN` | `MODERATOR`). Tokens antigos sem `role` são tratados como `USER` no guard.

**Papéis com leitura sem cota semanal no catálogo:** `VIP`, `ADMIN`, `MODERATOR` (ver use case de acesso ao capítulo).

---

## 3. Erros e códigos HTTP

| Situação | HTTP | Corpo típico |
|----------|------|----------------|
| Validação de DTO (class-validator) | **400** | `{ statusCode, message, error }` (Nest) |
| Token ausente / inválido (guard) | **401** | Mensagem Nest |
| Acesso ao capítulo negado (cota / coin) | **403** | `{ statusCode, message, reason }` — `reason` pode ser `weekly_chapter_limit_exceeded` ou `coin_chapter_not_available` |
| Recurso de domínio inexistente (`NotFoundError`) | **404** | `{ statusCode, message }` |
| Conflito de negócio (`ConflictError`) — email duplicado, mangá já na lista, etc. | **409** | `{ statusCode, message }` |
| Registro com email em uso | **409** | Via `ConflictException` no controller de auth |

O filtro global **`DomainExceptionFilter`** mapeia erros de domínio para 401/403/404/409 conforme a tabela acima.

---

## 4. Health

### `GET /api/v1/health`

| | |
|--|--|
| **Auth** | Não |
| **Resposta 200** | Texto plano: `Hello World!` |

---

## 5. Auth (`/api/v1/auth`)

### `POST /api/v1/auth/register`

| | |
|--|--|
| **Auth** | Não |
| **Body** | `email` (email), `password` (string, mín. 6), `firstName`, `lastName` (strings, máx. 100), `nickname` (string, 2–100 caracteres, **único**; persistido em minúsculas) |
| **201** | `{ user, token }` — perfil sem senha + JWT |
| **409** | Email já cadastrado |

Efeito colateral: cria **`Subscription`** no plano `gratuito` quando o plano existe no BD (seed).

### `POST /api/v1/auth/login`

| | |
|--|--|
| **Auth** | Não |
| **Body** | `email`, `password` (obrigatória, não vazia) |
| **200** | `{ user, token }` |
| **401** | Credenciais inválidas (mensagem genérica) |

### `GET /api/v1/auth/me`

| | |
|--|--|
| **Auth** | JWT |
| **200** | Perfil do usuário autenticado |

### `PATCH /api/v1/auth/me`

| | |
|--|--|
| **Auth** | JWT |
| **Body** | Opcional: `firstName`, `lastName`, `nickname` (2–100; **único**; pelo menos um campo costuma ser enviado) |
| **200** | Perfil atualizado |

---

## 6. Catálogo (`/api/v1`)

### `GET /api/v1/home`

| | |
|--|--|
| **Auth** | Não |
| **Query** | `limit` (default 10, máx. 24), `includeNsfw` (`true` para incluir NSFW) |
| **200** | `{ trending, recommended, latestUpdates }` (3 listas de `MangaSummary`) |

Lógica da home:
- **`trending`**: consulta `GET /api/mangas/trending` da Nexustoons, faz **upsert** local e responde na mesma ordem pelo banco (fallback local por `views` se externo falhar).
- **`recommended`**: catálogo local ordenado por **`rating`**, excluindo slugs já usados em `trending`.
- **`latestUpdates`**: catálogo local ordenado por **`lastChapterAt`**.

### `GET /api/v1/mangas`

| | |
|--|--|
| **Auth** | Não |
| **Query** | `page`, `limit`, `type` (`manga` \| `manhwa` \| `manhua`), `status` (`ongoing` \| `completed` \| `cancelled`), `categorySlug`, `search`, `sortBy` (`lastChapterAt` \| `views` \| `rating` \| `createdAt`), `includeNsfw` (`true` para incluir NSFW) |
| **200** | Lista paginada de resumos de mangá |

Com **`search` não vazio**, a API também consulta a **Nexustoons**, faz **upsert** dos mangás retornados no banco e só então pagina o resultado **a partir do Prisma** (erro na fonte externa: segue só com o que já existir localmente).

Por padrão, listagens excluem obras **NSFW** salvo `includeNsfw=true`.

### `GET /api/v1/mangas/:slug`

| | |
|--|--|
| **Auth** | Não |
| **200** | Detalhe do mangá + `chaptersCount`, `latestChapters` (ver §8 G.4) |
| **404** | Slug vazio ou mangá inexistente no BD após tentativa na fonte externa |

Em toda requisição válida, a API **consulta a Nexustoons pelo slug**, faz **upsert** do mangá e responde com o estado no **Prisma**; erro na fonte externa **não impede** retornar o que já estiver salvo localmente. Tipos/status fora do enum Midgard (ex.: `doujinshi`, `hiatus`) são **normalizados** na persistência.

Após responder **200**, dispara em **background** (`SyncMangaFromSourceUseCase`) a sincronização **capítulo a capítulo** (pausa e **prazo máximo 3h** configuráveis por env). Com **`REDIS_URL`**, o progresso fica em `midgard:manga-sync:v1:{manga|manhwa|manhua}:{slug}`. Não roda de novo dentro de **24h** após sync completo bem-sucedido (`lastSyncedAt`), salvo `error` ou `syncing`.

### `GET /api/v1/mangas/:slug/chapters`

| | |
|--|--|
| **Auth** | Não |
| **Query** | `order` (`asc` \| `desc`, default **`asc`** — cap. 1, 2, 3…), `page` (default **1**), `limit` (default **50**, máx. **200**) |
| **200** | Lista **paginada** de capítulos **publicados** (`public` e `coin`); campo `isLocked` indica bloqueio na UI. Ordenação por `number` em **ordem natural** (ex.: 1, 2, 10 — não lexicográfica). |

### `GET /api/v1/mangas/:slug/chapters/by-number/:number`

| | |
|--|--|
| **Auth** | Não |
| **Path** | `number` = valor do campo `number` do capítulo no BD (ex.: `1`, `12.5`) — **igualdade exata** |
| **Query** | `page` (default **1**), `limit` (default **50**, máx. **200**) — paginação sobre o subconjunto **a partir desse capítulo (inclusive), ordem asc natural** |
| **200** | Mesmo formato de `GET .../mangas/:slug/chapters`: `{ data, total, page, limit }`. `data` está sempre em **ordem ascendente** por `number`; `total` = quantidade de capítulos publicados **desse número até o fim** do mangá |
| **404** | Mangá inexistente, capítulo inexistente, não publicado ou soft-deleted |

Para obter **páginas** de leitura e prev/next, use o `id` de cada item em `GET /api/v1/chapters/:id`.

### `GET /api/v1/categories`

| | |
|--|--|
| **Auth** | Não |
| **200** | Lista de categorias |

---

## 7. Leitura de capítulo (`/api/v1/chapters`)

### `GET /api/v1/chapters/:id`

| | |
|--|--|
| **Auth** | **Opcional** — capítulos **`public`** (faixa grátis): leitura **sem JWT**; **`coin`**: exige JWT (senão **403** `authentication_required`). Com JWT válido, aplica cota / regras de plano. |
| **200** | Metadados do capítulo, `pages` ordenadas, `prevChapterId`, `nextChapterId` (entre capítulos publicados) |
| **401** | Header `Authorization: Bearer` **presente** mas token inválido ou expirado |
| **403** | `coin` sem login (`reason: authentication_required`); com JWT: limite semanal excedido ou capítulo **`coin`** no MVP (`reason: coin_chapter_not_available`) |
| **404** | Capítulo inexistente / não publicado / soft-deleted |

**Visitante (sem JWT)** em capítulo **`public`**: não consome cota semanal nem grava progresso no servidor.

**Usuário autenticado** em capítulo **`public`**: após checagem de acesso, consome cota de forma idempotente por `(usuário, capítulo, semana ISO UTC)`.

Após **consumo** bem-sucedido (fluxo autenticado), o servidor grava progresso como no `PATCH` de leitura (`chapterId` atual, `pageNumber: 1`). Falha ao gravar progresso **não** altera o **200** da leitura.

---

## 8. Decisão produto — capítulos `coin` (G.4)

- **Listagem** `GET /mangas/:slug/chapters`: capítulos **publicados** (`public` e `coin`) em **paginação** (`page`, `limit`, `order`); `isLocked` para UX; ordenação natural por `number`.
- **Por número** `GET /mangas/:slug/chapters/by-number/:number`: a partir do capítulo com aquele `number`, lista **asc** paginada (deep link + scroll); leitura com imagens em `GET /chapters/:id`.
- **Preview no detalhe** (`chaptersCount`, `latestChapters`): só **amostra** recente no JSON do mangá; lista completa = endpoint paginado acima.
- **Leitura** `GET /chapters/:id`: capítulo **`coin`** **sem JWT** → **403** `reason: authentication_required`; **com JWT** → **403** `reason: coin_chapter_not_available` até existir fluxo de coins.

Detalhe curto: [`API-ROTAS-MVP.md` § Decisão G.4](./API-ROTAS-MVP.md).

---

## 9. Listas (`/api/v1/users/me/lists`)

Todas exigem **JWT**. `listId` e `mangaId` nos paths são **UUID v4** (validação por pipe onde aplicável).

| Método | Caminho completo | Corpo / notas |
|--------|------------------|----------------|
| GET | `/users/me/lists` | — |
| POST | `/users/me/lists` | `name` (1–200 caracteres) |
| PATCH | `/users/me/lists/reorder` | `{ listIds: uuid[] }` — permutação **completa** de todas as listas do usuário; `[]` se não houver listas |
| GET | `/users/me/lists/:listId` | Detalhe + itens (mangás não soft-deleted) |
| PATCH | `/users/me/lists/:listId` | Pelo menos um: `name`, `sortOrder` (inteiro). Corpo vazio → **400** no controller |
| DELETE | `/users/me/lists/:listId` | **204** sem corpo |
| POST | `/users/me/lists/:listId/items` | `{ mangaId: uuid }` — **204** |
| DELETE | `/users/me/lists/:listId/items/:mangaId` | **204** |

**409** ao duplicar mangá na mesma lista. **404** quando a lista não pertence ao usuário ou item inexistente (sem vazar existência entre usuários).

> **Ordem de rotas no Nest:** `PATCH .../reorder` está registrado antes de `PATCH .../:listId` para não capturar `reorder` como UUID.

---

## 10. Progresso de leitura (`/api/v1/users/me/reading-progress`)

Todas exigem **JWT**.

### `GET /users/me/reading-progress`

| | |
|--|--|
| **Query** | `limit` opcional (inteiro 1–100; default **20** no use case). Valor inválido → **400** |
| **200** | Array de entradas “continuar lendo”, ordenado por `lastReadAt` desc. Cada item inclui `chaptersCount` (total de capítulos **publicados** no mangá, mesma regra do detalhe) para barra de progresso com `chaptersReadCount`. Omite mangá/capítulo indisponíveis (soft delete / não publicado) |

### `PATCH /users/me/reading-progress`

| | |
|--|--|
| **Body** | `mangaId` (uuid), `chapterId` (uuid), opcional `pageNumber` (≥1), opcional `chaptersReadCount` (≥0) |
| **200** | Registro de progresso salvo (upsert por par usuário+mangá) |
| **404** | Mangá ou capítulo indisponível; mensagem específica se capítulo não publicado |
| **409** | `chapterId` não pertence ao `mangaId`; ou validações numéricas no use case |

Idempotente: mesmo `chapterId` + `pageNumber` + `chaptersReadCount` calculado → não altera o registro.

---

## 11. O que **não** está nesta API (MVP)

- Pagamentos / checkout (ex.: Mercado Pago)
- Fluxo completo de **coins** e anúncios (schema pode existir; leitura `coin` bloqueada como acima)
- Webhooks de gateway
- Takedown / moderação avançada
- Busca avançada além do `search` simples em título de mangá
- Rotas administrativas globais

---

## 12. Cobertura da documentação (checklist)

| Área | Rotas no código | Documentado acima |
|------|-----------------|-------------------|
| App (health) | `GET health` | §4 |
| Auth | register, login, me GET/PATCH | §5 |
| Catálogo | mangas, mangas/:slug, chapters list, categories | §6 |
| Leitura | chapters/:id | §7 |
| Listas | 8 rotas sob `users/me/lists` | §9 |
| Progresso | GET + PATCH `users/me/reading-progress` | §10 |
| Docs OpenAPI | `GET /docs`, `GET /api-json` | §1 |

Nenhuma outra rota HTTP está registrada nos controllers do `AppModule` além das listadas.

---

## 13. Referências

- [`API-ROTAS-MVP.md`](./API-ROTAS-MVP.md) — tabela rápida + smoke/E2E  
- [`PLANO-MVP.md`](./PLANO-MVP.md) — fases e pré-requisitos  
- [`PRODUTO-REGRAS-DE-NEGOCIO.md`](./PRODUTO-REGRAS-DE-NEGOCIO.md) — regras de negócio  

Fonte de verdade dos DTOs e status HTTP: código em `src/modules/*/presentation` e `DomainExceptionFilter`.
