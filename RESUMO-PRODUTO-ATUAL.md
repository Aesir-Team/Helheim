# Midgard Core API — resumo detalhado do produto (estado atual)

Este arquivo descreve **o produto e o que já está feito hoje** no repositório `midgard/core-api`, com foco em:

- **Visão de produto** (o que é / o que não é, papéis, monetização planejada)
- **Stack e arquitetura** (NestJS + Prisma/Postgres + Clean Architecture)
- **Domínios e módulos implementados** (Auth, Catalog, Access, Lists, Progress)
- **Rotas expostas** (contratos principais, auth, erros)
- **Regras de negócio já codificadas** (e divergências vs docs)
- **Pontos de redesign** e ideias de alterações futuras

Fontes primárias usadas para este resumo:

- `docs/PRODUTO-REGRAS-DE-NEGOCIO.md`
- `docs/PLANO-MVP.md`
- `docs/API-ROTAS-MVP.md` (e referência a `docs/API-MVP-DETALHADA.md`)
- `docs/NEXUSTOONS-GATEWAY.md`
- `prisma/schema.prisma`
- Controllers e use cases em `src/modules/**`

---

## 1) Visão do produto (o “por quê”)

### O que o produto é
- **Catálogo / indexador** de mangás, manhwas e manhuas.
- O app mobile usa a API para:
  - descoberta (home + busca + filtros)
  - ficha do mangá (metadados + últimos capítulos)
  - listagem paginada de capítulos
  - leitura do capítulo (páginas + navegação prev/next)
  - listas customizadas do usuário
  - progresso (“continuar lendo”)

### O que o produto não é
- **Não hospeda as imagens**: a API trabalha com **URLs** de páginas vindas de terceiros.
- Não substitui termos legais (aceite e transparência no app) e não “resolve” compliance sozinha (takedown é fase futura).

### Papéis (roles)
Definidos no schema (`Role`): `USER`, `VIP`, `MODERATOR`, `ADMIN`.

Regra já aplicada no código: **VIP/Moderador/Admin** podem ter **privilégios de leitura** (ex.: ignorar bloqueio por `coin` na leitura).

### Monetização (planejada)
Nos docs, a monetização prevista é:
- **Plano gratuito** com **limite semanal**
- **Assinatura** (ilimitado)
- **Coins** (ganhas por anúncios) para desbloqueio de capítulos premium (`coin`)
- **Pagamentos** (Mercado Pago) na fase 2

**Estado atual do repositório:** base de planos/assinaturas está modelada e existe “plano efetivo”, mas **limite semanal não está aplicado na leitura** (ver seção 6).

---

## 2) Stack / plataforma / execução

### Stack
- **Node.js + NestJS (TypeScript)**
- **PostgreSQL**
- **Prisma**
- **JWT** (auth)
- Swagger/OpenAPI: **Scalar em `/docs`** e JSON em `/api-json`

### Comandos e pré-requisitos (alto nível)
Documentado em `docs/PLANO-MVP.md`.

Pontos importantes:
- `DATABASE_URL` (Prisma)
- migrations existentes em `prisma/migrations`
- seed com plano gratuito: `prisma/seed.ts` + `npm run db:seed`
- `JWT_SECRET` no `.env`
- gateway externo via `EXTERNAL_MANGA_BASE_URL` etc.

---

## 3) Arquitetura e organização do código

### Pastas e “camadas”
O repositório segue a divisão por módulo em `src/modules/` e separa (na prática) responsabilidades em:
- **presentation**: controllers, DTOs, guards
- **application**: use cases, ports (interfaces), services de aplicação
- **infrastructure**: adapters (Prisma, HTTP gateways), modules Nest de infra
- shared: utilitários e regras de domínio em `src/shared/`

### Ports & adapters (o que isso significa aqui)
- Use cases dependem de **ports** (`*.repository.port.ts`, `ExternalMangaGatewayPort`, etc.).
- Infra implementa ports (ex.: Prisma repositories e gateway HTTP Nexustoons).

---

## 4) Modelo de dados (Prisma) — o que existe hoje

Arquivo: `prisma/schema.prisma`.

### Entidades centrais (catálogo)
- **`Manga`**
  - slug único
  - metadados: capa, banner, descrição, status, tipo, rating, views, nsfw, autor/artista/ano etc.
  - `reportedChapterCount`: usado para `chaptersCount` (max entre BD e “reportado”)
  - sync: `syncStatus`, `lastSyncedAt`, `lastSyncError`
  - `externalSources`: suporta multi-fonte (`MangaExternalSource`)
- **`Chapter`**
  - `(mangaId, number)` único
  - `releaseStatus` (`published`/`draft`)
  - **`accessLevel`** (`public`/`coin`) + `coinCost`
  - `pages` (`ChapterPage`)
- **`Category`** + pivot `MangaCategory`

### Usuário e recursos do usuário
- **`User`**: email, password (hash), `nickname` único, role, `coinsBalance`
- **Listas**: `UserMangaList`, `UserMangaListItem`
- **Progresso**: `ReadingProgress` (1 por `(userId, mangaId)` — regra aplicada)

### Assinaturas / pagamentos / coins (modelados)
Mesmo que nem todos os fluxos estejam “ligados” nas rotas:
- **Plan**, **Subscription**, **Payment**
- **CoinTransaction**, **AdRewardClaim**
- **UserChapterCoinUnlock**
- **UserChapterWeekAccess** (existe no schema, mas consumo semanal não está ativo no fluxo atual de leitura)
- **TakedownRequest** (modelado)

---

## 5) Integração com fonte externa (Nexustoons)

Documento: `docs/NEXUSTOONS-GATEWAY.md`.

### Como funciona hoje
Existe `ExternalMangaGatewayPort` e um adapter HTTP `NexustoonsMangaGateway`, usado para:
- Trending externo
- Busca externa (quando `search` vem preenchido)
- Detalhe externo por slug
- Páginas do capítulo por `chapterId`

### Mapeamento resiliente
O mapper aceita respostas com formatos diferentes (arrays na raiz, `{ data: [] }`, etc.), e normaliza campos.

### Regra “banco primeiro”
A regra está descrita nos docs; na prática:
- Listagem local é a base (Prisma).
- Para `GET /mangas/:slug` e `GET /mangas?search=...` existe ingest (upsert) a partir da fonte externa e depois leitura do BD.
- Sync pesado (capítulos/páginas) roda em background.

---

## 6) Módulos do produto — o que está implementado hoje

### 6.1 Auth (feito)
Controller: `src/modules/auth/presentation/controllers/auth.controller.ts`

Rotas:
- `POST /api/v1/auth/register`
  - cria usuário com `nickname` único
  - retorna perfil + JWT
  - cria assinatura/plano gratuito conforme `docs/PLANO-MVP.md`
- `POST /api/v1/auth/login`
  - retorna perfil + JWT
- `GET /api/v1/auth/me` (JWT obrigatório)
- `PATCH /api/v1/auth/me` (JWT obrigatório)

Erros:
- 409 para duplicidade (email/nickname)
- 401 para credenciais inválidas ou token inválido

### 6.2 Catalog (feito)
Controllers:
- `src/modules/catalog/presentation/controllers/catalog.controller.ts`
- `src/modules/catalog/presentation/controllers/chapter-reading.controller.ts`

Rotas principais (prefixo `/api/v1`, ver `docs/API-ROTAS-MVP.md`):
- `GET /home`
  - blocos: `trending`, `recommended`, `latestUpdates`
  - `limit` default 10, máx. 100; `includeNsfw` opcional
  - trending tenta Nexustoons e faz upsert; fallback local por `views`
  - recommended = maior rating no BD, **exclui** slugs de trending e pagina até preencher `limit`
- `GET /mangas`
  - paginação + filtros (type/status/categorySlug/search/sortBy/includeNsfw)
  - quando `search` existe, ingere resultados da fonte externa e depois pagina no BD
  - cap por página: **100**
- `GET /mangas/:slug`
  - JWT **opcional** (usa guard opcional)
  - tenta ingerir detalhe via Nexustoons (sem bloquear se falhar)
  - responde do BD
  - agenda sync em background (capítulos/páginas)
  - inclui `latestChapters` (amostra) e `chaptersReadCount` se houver usuário
- `GET /mangas/:slug/chapters`
  - JWT opcional
  - capítulos publicados paginados; default `limit=50`, máx. `200` (ver docs)
  - flags por capítulo para UI (`isLocked`, `isRead`, `isNew`) são enriquecidas quando há JWT
- `GET /mangas/:slug/chapters/by-number/:number`
  - encontra capítulo publicado e retorna lista paginada a partir dele (ordem asc natural)
  - JWT opcional
- `GET /categories`
  - categorias para filtro
- `GET /chapters/:id`
  - JWT opcional (ver “Acesso” abaixo)
  - retorna páginas + `prevChapterId`/`nextChapterId`

Decisões importantes já aplicadas (conforme `docs/API-ROTAS-MVP.md`):
- Capítulos `coin` **aparecem na listagem**, mas leitura exige acesso.
- Existe “faixa grátis” aplicada após sync: parte inicial dos capítulos fica `public` e o restante `coin` (via envs e job utilitário citados nos docs).

### 6.3 Access (feito, mas escopo ajustado)
Use cases:
- `src/modules/access/application/use-cases/check-chapter-access.use-case.ts`
- `src/modules/access/application/use-cases/get-effective-plan.use-case.ts`

O que está implementado na prática:
- **`CheckChapterAccessUseCase`**:
  - `public` → permitido
  - `coin` → permitido somente se:
    - usuário tem papel privilegiado (VIP/MODERATOR/ADMIN), **ou**
    - existe `UserChapterCoinUnlock` para `(userId, chapterId)`
  - se negado: 403 com reason `coin_chapter_not_unlocked`
- **Não existe consumo de cota semanal no fluxo atual de leitura.**
  - O próprio comentário do use case diz: “`public` sem limite semanal”.
  - O schema tem `UserChapterWeekAccess`, mas não está sendo usado para bloquear leitura hoje.

O que existe como base para planos:
- **`GetEffectivePlanUseCase`** resolve o plano efetivo:
  - se há subscription ativa: usa snapshot (inclui `freeChaptersPerWeek`)
  - senão: usa plan `slug=gratuito` do BD; se não existir, fallback hardcoded (5/semana)
  - **Observação**: mesmo existindo esse use case, ele não está conectado ao `GET /chapters/:id` para impor limite semanal (atualmente).

### 6.4 Lists (feito)
Controller: `src/modules/lists/presentation/controllers/user-lists.controller.ts`

Todas as rotas são **JWT obrigatório** (`/users/me/...`):
- `GET /users/me/lists`
- `POST /users/me/lists`
- `PATCH /users/me/lists/reorder`
- `GET /users/me/lists/:listId`
- `PATCH /users/me/lists/:listId`
- `DELETE /users/me/lists/:listId`
- `POST /users/me/lists/:listId/items` (adicionar mangá)
- `DELETE /users/me/lists/:listId/items/:mangaId` (remover)

Regras já aplicadas:
- Ownership: usuário A não acessa nem altera listas de B.
- Duplicata de item em lista tende a virar 409 (conforme casos de uso).

### 6.5 Progress (feito)
Controller: `src/modules/progress/presentation/controllers/reading-progress.controller.ts`

Rotas (JWT obrigatório):
- `GET /users/me/reading-progress?limit=`
  - default 20; 1–100
  - ordenado por última leitura
- `PATCH /users/me/reading-progress`
  - upsert por `(userId, mangaId)`
  - valida invariantes (capítulo pertence ao mangá)
  - idempotência (PATCH repetido com mesmos dados não “bagunça” estado)

Além disso, no fluxo de leitura:
- Ao abrir `GET /chapters/:id` autenticado, o servidor tenta gravar progresso automaticamente (page 1). Se falhar, **não bloqueia** a resposta.

---

## 7) Regras de negócio: “planejado” vs “implementado”

### Regras que batem com o planejado
- Banco primeiro + ingest/sync em background.
- Capítulos `coin` existem e são bloqueados sem unlock.
- VIP/MOD/ADMIN com privilégio no acesso ao catálogo.
- Listas e progresso com ownership e idempotência.

### Divergências relevantes (importante para redesenho)
- **Limite semanal do plano gratuito**:
  - **Nos docs de produto** (`docs/PRODUTO-REGRAS-DE-NEGOCIO.md`), a cota semanal é uma regra central.
  - **No repositório atual**, a leitura `public` está **sem limite semanal** (o consumo semanal não está aplicado).
  - Existe infra/base no schema e um use case de “plano efetivo”, então reativar isso é possível, mas exige desenho de UX e decisões (consumo em quais rotas, idempotência por semana, mensagens e estados).
- **Coins e anúncios (fluxo completo)**:
  - Modelos existem no schema, mas não há (ainda) endpoints completos de “ganhar coins por anúncio” e “desbloquear capítulo por coins”.
  - Hoje o “coin unlock” é considerado via `UserChapterCoinUnlock`, mas não existe o fluxo público para criar esse registro.

---

## 8) Contratos HTTP e comportamento de autenticação (padrões atuais)

### JWT obrigatório vs opcional
- **Obrigatório**:
  - `/auth/me`, `/auth/me (PATCH)`
  - `/users/me/lists/*`
  - `/users/me/reading-progress*`
- **Opcional** (mas Bearer inválido → 401, conforme docs atuais):
  - `GET /mangas/:slug`
  - `GET /mangas/:slug/chapters`
  - `GET /mangas/:slug/chapters/by-number/:number`
  - `GET /chapters/:id`

### Erros relevantes já usados
- 401: token inválido/ausente em rotas protegidas; e em rotas “JWT opcional” quando o header vem inválido (padrão atual de doc/guard).
- 403: acesso negado (`authentication_required`, `coin_chapter_not_unlocked`, etc.).
- 404: mangá/capítulo inexistente.
- 409: conflitos (ex.: lista, nickname/email).

---

## 9) “Home” (estado atual)

Use case: `src/modules/catalog/application/use-cases/get-home-feed.use-case.ts`

Seções:
- **Trending**:
  - tenta Nexustoons trending → upsert → lê do BD (mantém ordem)
  - fallback: BD ordenado por views
- **Recommended**:
  - pega do BD por rating
  - **exclui** slugs que já estão no trending
  - pagina o BD até preencher `limit` (sem números mágicos; página = `limit * 2`)
- **Latest updates**:
  - BD ordenado por `lastChapterAt`

---

## 10) O que falta / backlog (para você redesenhar)

### Itens “pós-MVP” citados nos docs (ou parcialmente modelados)
- **Pagamentos / Mercado Pago**:
  - checkout + webhooks idempotentes
  - ativação/renovação de subscription
- **Coins / anúncios**:
  - endpoint idempotente de reward por ad (`AdRewardClaim`)
  - endpoint de unlock por coins (transação atômica + `CoinTransaction` + `UserChapterCoinUnlock`)
  - extrato / saldo
- **Takedown**:
  - endpoints para submissão e acompanhamento
  - backoffice/admin (não existe ainda)
- **Busca avançada / ranking / recomendação**:
  - hoje há filtros básicos + “recommended” por rating

### Redesign sugerido (decisões a tomar)
1) **Política de autenticação nas rotas públicas**
   - Hoje: JWT opcional, mas Bearer inválido vira 401.
   - Alternativa comum: tratar Bearer inválido como “anônimo” em rotas públicas (não 401), para reduzir fricção no app.
2) **Limite semanal**
   - Reativar como regra de produto (como nos docs) ou manter removido.
   - Definir: “consome na listagem?” “consome no GET chapter?” “consome por capítulo distinto?” “releitura consome?” “download consome?”
3) **Coins vs assinatura**
   - Onde coins entram: só para `coin`? também para “furar cota semanal”?
   - UX: “capítulos coin aparecem sempre” vs “esconder quando usuário não tem coins”.
4) **Sync e performance**
   - Quando disparar sync: sempre no detalhe? apenas quando `lastSyncedAt` velho?
   - Introduzir fila (Bull/Redis) em produção para sync pesado.

---

## 11) Mapa rápido das rotas (para produto/design)

Veja tabela oficial em `docs/API-ROTAS-MVP.md`. Em resumo:

- Público:
  - `GET /home`
  - `GET /mangas`
  - `GET /mangas/:slug` (JWT opcional)
  - `GET /mangas/:slug/chapters` (JWT opcional)
  - `GET /mangas/:slug/chapters/by-number/:number` (JWT opcional)
  - `GET /categories`
  - `GET /chapters/:id` (JWT opcional; coin exige login)
- Auth:
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /auth/me` (JWT)
  - `PATCH /auth/me` (JWT)
- Usuário:
  - `GET/POST/PATCH/DELETE /users/me/lists...` (JWT)
  - `GET/PATCH /users/me/reading-progress...` (JWT)

---

## 12) Checklist “onde mexer” (se você for redesenhar agora)

- Regras e visão: `docs/PRODUTO-REGRAS-DE-NEGOCIO.md`
- Plano operacional: `docs/PLANO-MVP.md`
- Contrato HTTP: `docs/API-ROTAS-MVP.md` + `docs/API-MVP-DETALHADA.md`
- Leitura / bloqueio coin:
  - `src/modules/catalog/application/use-cases/get-chapter-for-reading.use-case.ts`
  - `src/modules/access/application/use-cases/check-chapter-access.use-case.ts`
- Plano efetivo / subscription base:
  - `src/modules/access/application/use-cases/get-effective-plan.use-case.ts`
- Home (trending/recommended/latest):
  - `src/modules/catalog/application/use-cases/get-home-feed.use-case.ts`
- Sync:
  - `src/modules/catalog/application/use-cases/sync-manga-from-source.use-case.ts`
  - `docs/NEXUSTOONS-GATEWAY.md`
- Guards JWT opcional:
  - `src/modules/auth/presentation/guards/optional-jwt-auth.guard.ts` (ponto importante se for mudar o comportamento de 401)

