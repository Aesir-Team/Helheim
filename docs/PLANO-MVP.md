# Plano de execução — MVP Midgard Core API

Plano operacional para entregar o **MVP** descrito em `PRODUTO-REGRAS-DE-NEGOCIO.md` (seções 3 e 4) e `NEXUSTOONS-GATEWAY.md`.

---

## 1. Objetivo do MVP

Entregar uma API que permita ao app mobile:

| Resultado | Critério de sucesso |
|-----------|---------------------|
| **Conta** | Registrar, logar, ver e editar perfil (JWT). |
| **Catálogo** | Listar/buscar mangás, ver ficha, listar capítulos, ver páginas do capítulo. |
| **Sync** | Banco primeiro; se não existir, buscar fonte externa e persistir; atualização periódica em background sem bloquear a request. |
| **Acesso** | Capítulos **`public`** sem limite semanal; capítulos **`coin`** exigem desbloqueio (`UserChapterCoinUnlock`); papéis VIP/ADMIN/MODERATOR ignoram bloqueio por coin na leitura. |
| **Listas** | CRUD de listas e itens (mangá em lista). |
| **Progresso** | Salvar último capítulo/página; listar "continuar lendo". |

**Fora do escopo deste plano (pós-MVP):** checkout Mercado Pago, coins/anúncios como fluxo completo (schema já existe), takedown, busca avançada, recomendação.

---

## 2. Pré-requisitos técnicos

Conferência com o repositório atual:

| Item | Situação no repo |
|------|------------------|
| `DATABASE_URL` | Obrigatório para Prisma (`prisma/schema.prisma`, `prisma.config.ts`). Copie `.env.example` -> `.env`. |
| Migrations | Há **3** pastas em `prisma/migrations` (`initial`, `manga_external_sources`, `schema_improvements`) — **aplique todas** (`npx prisma migrate deploy` ou `migrate dev`). |
| Seed (`Plan` gratuito) | **`prisma/seed.ts`** + **`npm run db:seed`** (`prisma db seed`, runner `tsx`). Garante plano `slug=gratuito`, `freeChaptersPerWeek=5`. |
| `JWT_SECRET` | Documentado em **`.env.example`**. Código: `auth.application.module.ts` (default só para dev). |
| Gateway mangá | Placeholders comentados em **`.env.example`** (`EXTERNAL_MANGA_*`); preencher na Fase B do sync. |
| `PORT` | Documentado em `.env.example`; default `3000` em `main.ts`. |

**Comandos úteis**

```bash
cp .env.example .env   # ajustar DATABASE_URL e JWT_SECRET (ex.: URL do docker-compose no comentário do .env.example)
docker compose up -d postgres   # Postgres local (opcional; ou use instância externa)
npm run setup:dev-db    # sobe Postgres (compose), aplica migrations e roda seed — atalho para o checklist abaixo
# ou passo a passo:
npx prisma migrate deploy   # CI/prod; em dev também pode usar migrate dev
npm run db:seed             # plano gratuito
```

**Checklist de pré-requisitos — feito (baseline do repositório)**

| # | OK | Item | Referência / observação |
|---|:--:|------|-------------------------|
| 1 | OK | PostgreSQL + `DATABASE_URL` | `docker-compose.yml` + comentário em `.env.example`; atalho `npm run setup:dev-db`. |
| 2 | OK | Migrations | 3 migrations em `prisma/migrations`; `npx prisma migrate deploy` (ou via `setup:dev-db`). |
| 3 | OK | `JWT_SECRET` | Modelo em `.env.example`; obrigatório preencher no `.env`. **Produção:** nunca usar default do código. |
| 4 | OK | Seed | `prisma/seed.ts` + `npm run db:seed`; plano `slug=gratuito`. Subscription no registro: **Fase A** (implementada). |
| 5 | OK | Gateway (Fase B) | `EXTERNAL_MANGA_BASE_URL` em `.env.example`; `EXTERNAL_MANGA_API_KEY` opcional. |

> **Feito** = fluxo documentado, script `setup:dev-db` e artefatos no repo. Em **nova máquina** ou **CI/prod**, repetir `cp .env.example .env`, ajustar segredos/URL e rodar `npm run setup:dev-db` (ou `migrate deploy` + `db:seed`).

---

## 3. Estado atual do repositório

| Área | Status |
|------|--------|
| Auth (register, login, me, patch me) | **Feito** |
| Auth: registro cria `Subscription` gratuita (Fase A.3) | **Feito** |
| Health + Swagger/Scalar (`/docs`, `/api-json`) | **Feito** (ajustar conforme novos módulos) |
| Prisma schema (catálogo, acesso, listas, progresso, planos, multi-fonte) | **Modelado** |
| `ExternalMangaGatewayPort` + `NexustoonsMangaGateway` (adapter HTTP) | **Feito** (testes unitários passando) |
| `CatalogInfrastructureModule` registrado em `AppModule` | **Feito** |
| `AccessApplicationModule` (`GetEffectivePlanUseCase`, ports Plan/Subscription) | **Feito** (Fase A.2 — testes passando) |
| `CatalogApplicationModule` + `CatalogController` + `ChapterReadingController` (Fases B–D) | **Feito** (`GET /chapters/:id` com JWT opcional; acesso por `public` / `coin` + unlock) |
| `ListsApplicationModule` + rotas `users/me/lists` (Fase E) | **Feito** |
| `ProgressApplicationModule` + `GET/PATCH .../reading-progress` (Fase F) | **Feito** |
| Fase G (E2E, `docs/API-ROTAS-MVP.md`, CI com seed, catálogo sem `coin`) | **Feito** |

---

## 4. Fases do plano (ordem recomendada)

### Fase A — Fundação de dados e plano gratuito (P0) — CONCLUIDA

**Objetivo:** qualquer regra de "limite semanal" precisa saber **qual plano** o usuário tem.

| # | Entrega | Detalhes | Status |
|---|---------|----------|--------|
| A.1 | ~~Seed / migration~~ | `prisma/seed.ts` + `npm run db:seed`. Plan `gratuito` garantido. | **Feito** |
| A.2 | ~~Plano efetivo do usuario~~ | `GetEffectivePlanUseCase` + ports Plan/Subscription + adapters Prisma. 4 testes unitarios. | **Feito** |
| A.3 | ~~Subscription no registro~~ | `RegisterUserUseCase` cria `Subscription` gratuita; 3 testes (happy, sem plano, conflito). | **Feito** |

**Criterio de aceite:** dado um `userId`, a aplicacao retorna `freeChaptersPerWeek` numerico ou `null` (ilimitado). Nunca ha duas subscriptions ativas para o mesmo usuario.

---

### Fase B — Catálogo (P0) — CONCLUÍDA

**Objetivo:** expor mangás, capítulos e páginas conforme `PRODUTO-REGRAS-DE-NEGOCIO` §3.2 e §3.3.

| # | Entrega | Detalhes | Status |
|---|---------|----------|--------|
| B.1 | ~~Repositórios Prisma~~ | Ports (`MangaRepositoryPort`, `ChapterRepositoryPort`, `CategoryRepositoryPort`) + adapters Prisma. | **Feito** |
| B.2 | ~~`ListMangasUseCase`~~ | Paginação, filtros (tipo, status, categoria, search, sortBy, nsfw); cap 100/page. 3 testes. | **Feito** |
| B.3 | ~~`GetMangaBySlugUseCase`~~ | Detalhe + preview capítulos; em toda requisição consulta Nexustoons por slug, upsert no BD e lê o Prisma; falha na fonte não bloqueia se já existir local. | **Feito** |
| B.4 | ~~`ListChaptersUseCase`~~ | Ordenação asc/desc; só published; excluir soft-deleted; cap 200/page. 3 testes. | **Feito** |
| B.5 | ~~Gateway externo (port)~~ | `ExternalMangaGatewayPort` + `NexustoonsMangaGateway` + testes unitários. | **Feito** |
| B.6 | ~~`SyncMangaFromSourceUseCase`~~ | Persiste metadados + capítulos + páginas; respeita `syncStatus` (skip se syncing); error handling com status. 4 testes. | **Feito** |
| B.7 | ~~Fluxo "não existe no BD"~~ | Integrado em `GetMangaBySlugUseCase`: sync na primeira busca; `NotFoundError` se fonte não tiver. | **Feito** |
| B.8 | ~~Controllers + DTOs + Swagger~~ | `GET /mangas`, `GET /mangas/:slug`, `GET /mangas/:slug/chapters`, `GET /categories` + `ListCategoriesUseCase` + `CatalogApplicationModule`. | **Feito** |

**Critério de aceite:** front consegue montar Home, Busca, Detalhe e Lista de capítulos só com a API (dados reais ou seed). **Testes unitários passando, lint ok, build ok.**

---

### Fase C — Leitura do capítulo sem regra de cota (P0 técnico) — CONCLUÍDA

**Objetivo:** entregar `GET /chapters/:id` com páginas + prev/next **antes** de embutir consumo semanal, para destravar integração do viewer.

| # | Entrega | Detalhes | TDD |
|---|---------|----------|-----|
| C.1 | ~~`GetChapterForReadingUseCase`~~ | Metadados + `pages` ordenadas; `findNeighborChapterIds` no port (ordenação por `number`, sem linked list). Testes unitários. | **Feito** |
| C.2 | ~~Controller + Swagger~~ | `GET /api/v1/chapters/:id` (`ChapterReadingController` + `ChapterForReadingResponseDto`). | **Feito** |

**Nota:** na Fase D este use case passa a chamar **CheckAccess** + **Consume** antes de devolver páginas.

---

### Fase D — Acesso à leitura (`public` / `coin`) (P0) — CONCLUÍDA

**Objetivo:** `PRODUTO-REGRAS-DE-NEGOCIO` §3.4.

| # | Entrega | Detalhes | Status |
|---|---------|----------|--------|
| D.1 | ~~`CheckChapterAccessUseCase`~~ | Entrada: `userId`, `role`, `chapterId`, `accessLevel`. Saída: `allowed`, `reason`. VIP/ADMIN/MODERATOR → liberado; `public` → liberado; `coin` → liberado só com `UserChapterCoinUnlock`; senão `coin_chapter_not_unlocked`. | **Feito** |
| D.2 | ~~Cota semanal~~ | Removida do produto: sem `ConsumeWeeklyChapterAccessUseCase` nem limite por `UserChapterWeekAccess` na leitura. | **Alterado** |
| D.3 | ~~Integração em `GetChapterForReadingUseCase`~~ | JWT obrigatório em `GET /chapters/:id`; 403 `ForbiddenError` + `reason` no filtro global. | **Feito** |
| D.4 | Ajuste de listagens | `GET /users/me/access-summary` / `isUnlocked` nas listagens — **opcional, não feito**. | Opcional |

**Critério de aceite:** usuário free após N capítulos distintos na semana recebe 403 ao abrir novo capítulo `public`; mesmo capítulo reaberto na mesma semana não consome nova unidade.

---

### Fase E — Listas (P1) — CONCLUÍDA

**Objetivo:** §3.5.

| # | Entrega | Detalhes | Status |
|---|---------|----------|--------|
| E.1 | ~~Ports + repositório~~ | `USER_MANGA_LIST_REPOSITORY` + `PrismaUserMangaListRepository`; ownership em todas as operações. | **Feito** |
| E.2 | ~~CRUD listas~~ | Criar, renomear (`name` / `sortOrder`), excluir; `PATCH users/me/lists/reorder` com permutação completa dos IDs. | **Feito** |
| E.3 | ~~Itens~~ | POST/DELETE itens; duplicata `(listId, mangaId)` → 409; valida mangá via `MangaRepositoryPort.findByIdForListItem`. | **Feito** |
| E.4 | ~~Controllers + Swagger~~ | `GET/POST /users/me/lists`, `GET/PATCH/DELETE /users/me/lists/:listId`, `PATCH .../reorder`, `POST/DELETE .../items` (+ `:mangaId`). JWT. | **Feito** |

**Critério de aceite:** usuário A não lê nem altera listas de B.

---

### Fase F — Progresso / continuar lendo (P1) — CONCLUÍDA

**Objetivo:** §3.6.

| # | Entrega | Detalhes | Status |
|---|---------|----------|--------|
| F.1 | ~~`SaveReadingProgressUseCase`~~ | Upsert `ReadingProgress`; valida mangá + capítulo publicado; **invariante** `chapter.mangaId === mangaId`; idempotente se `chapterId`+`pageNumber`+`chaptersReadCount` iguais; sem `chaptersReadCount` no body → mantém no mesmo capítulo ou +1 ao mudar de capítulo. | **Feito** |
| F.2 | ~~`GetContinueReadingUseCase`~~ | Lista por `lastReadAt` desc; `limit` 1–100 (padrão 20); omite mangá/capítulo soft-deleted ou capítulo não publicado. | **Feito** |
| F.3 | ~~Controllers + Swagger~~ | JWT: `GET /users/me/reading-progress?limit=`, `PATCH /users/me/reading-progress` (body: `mangaId`, `chapterId`, `pageNumber?`, `chaptersReadCount?`). `CHAPTER_REPOSITORY` exportado no catálogo. | **Feito** |
| F.4 | Atualizar `mangasReadCount` nas listas | Job ou hook após salvar progresso. | **Depois** (opcional) |

**Critério de aceite:** um registro por `(usuário, mangá)`; PATCH repetido com os mesmos dados não altera o estado.

---

### Fase G — Encerramento MVP (qualidade) — CONCLUÍDA

| # | Entrega | Detalhes | Status |
|---|---------|----------|--------|
| G.1 | ~~E2E~~ | `test/mvp-flow.e2e-spec.ts`: `ensureMvpFixtures` no `beforeAll` → registro → listagem → slug → capítulos → `GET /chapters/:id` com JWT; `test/app.e2e-spec.ts` health; `test/create-e2e-app.ts` + filtro de domínio. `prisma/mvp-fixtures.ts` compartilhado com `db:seed`. | **Feito** |
| G.2 | ~~Documentação~~ | `docs/API-ROTAS-MVP.md` (tabela de rotas + G.4); README com MVP, link e `test:e2e`. | **Feito** |
| G.3 | ~~CI~~ | `.github/workflows/ci.yml`: lint, unit, build; job e2e com Postgres, `migrate deploy`, **`npm run db:seed`**, `test:e2e`. | **Feito** |
| G.4 | ~~Decisão `coin`~~ | **Listagem/preview:** só `public` (`PrismaChapterRepository.listByMangaSlug`, detalhe mangá). **Leitura:** 403 `coin_chapter_not_unlocked` sem desbloqueio. | **Feito** |

---

## 5. Dependências entre fases

```
A (plano efetivo) ──┬──► D (acesso)
                    │
B (catálogo) ───────┼──► C (chapter read) ──► D (acesso no GET chapter)
                    │
                    └──► E (listas)     [paralelo a C/D após B.2]
                    └──► F (progresso)  [paralelo; precisa B para manga/chapter válidos]
```

**Ordem linear sugerida:** **A → B → C → D → E → F → G** (D–G concluídas no repositório).

---

## 6. Definition of Done (por feature)

- [ ] Use case com testes unitários (ports mockados).
- [ ] Controller com validação (DTO + class-validator) e documentação Swagger alinhada à regra §14 em `.cursor/rules/midgard-core-api.mdc`.
- [ ] Sem `any`; erros de domínio mapeados para HTTP adequado.
- [ ] Regras do `PRODUTO-REGRAS-DE-NEGOCIO.md` correspondentes citadas no PR ou no código (comentário breve no use case).

---

## 7. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| API externa instável | Timeout, retry limitado, `lastSyncError` por fonte; fallback multi-fonte (`MangaExternalSource`). |
| Sync pesado | Nunca na thread crítica; fila em produção. |
| Plano gratuito sem Subscription | Seed + criação no registro (Fase A). |
| Escopo "coin" no meio do MVP | Tratar como capítulo premium bloqueado até fase Coins. |

---

## 8. Referências

- `docs/PRODUTO-REGRAS-DE-NEGOCIO.md` — regras de negócio (fonte de verdade PO).
- `docs/API-ROTAS-MVP.md` — rotas do MVP (tabela) e decisão capítulos `coin`.
- `docs/API-MVP-DETALHADA.md` — contratos HTTP detalhados (MVP).
- `docs/NEXUSTOONS-GATEWAY.md` — documentação do adapter externo.
- `prisma/schema.prisma` — modelo de dados.
- `.cursor/rules/midgard-core-api.mdc` — regras operacionais do projeto.

---

*Plano vivo: marque checkboxes conforme as entregas forem concluídas no repositório.*
