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
| **Acesso** | Plano gratuito com **limite semanal** de capítulos distintos; bloquear leitura quando exceder; VIP/assinante ilimitado quando o plano estiver ligado ao usuário. |
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
| Módulos `catalog` (use cases, controllers), `access` (controllers), `lists`, `progress` | **A fazer** (Fases B-F) |

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

### Fase B — Catálogo (P0)

**Objetivo:** expor mangás, capítulos e páginas conforme `PRODUTO-REGRAS-DE-NEGOCIO` §3.2 e §3.3.

| # | Entrega | Detalhes | TDD |
|---|---------|----------|-----|
| B.1 | Repositórios Prisma | `Manga`, `Chapter`, `ChapterPage`, `Category`, `MangaCategory`, `MangaExternalSource`. | Ports com fake nos testes |
| B.2 | `ListMangasUseCase` | Paginação, filtros básicos (tipo, status, categoria); excluir `deletedAt`. | Sim |
| B.3 | `GetMangaBySlugUseCase` | Detalhe + preview de capítulos; opcional flags de leitura se usuário logado (integração na Fase D). | Sim |
| B.4 | `ListChaptersByMangaSlugUseCase` | Ordenação recent/oldest; só `published`; excluir soft-deleted. | Sim |
| B.5 | ~~Gateway externo (port)~~ | `ExternalMangaGatewayPort` + `NexustoonsMangaGateway` + testes unitários. | **Feito** |
| B.6 | `SyncMangaFromSourceUseCase` | Persistir metadados + capítulos + páginas; respeitar `Manga.syncStatus` / por `MangaExternalSource`; não bloquear request principal (job/`setImmediate`/fila). | Sim |
| B.7 | Fluxo "não existe no BD" | Orquestrar sync na primeira busca por slug; 404 se fonte não tiver. | Sim / E2E |
| B.8 | Controllers + DTOs + Swagger | `GET /mangas`, `GET /mangas/:slug`, `GET /mangas/:slug/chapters`, `GET /categories` alinhados ao contrato MVP. | — |

**Critério de aceite:** front consegue montar Home, Busca, Detalhe e Lista de capítulos só com a API (dados reais ou seed).

---

### Fase C — Leitura do capítulo sem regra de cota (P0 técnico)

**Objetivo:** entregar `GET /chapters/:id` com páginas + prev/next **antes** de embutir consumo semanal, para destravar integração do viewer.

| # | Entrega | Detalhes | TDD |
|---|---------|----------|-----|
| C.1 | `GetChapterForReadingUseCase` | Retornar metadados + `pages` ordenadas; prev/next resolvidos via `ORDER BY number` (sem linked list no schema). | Sim |
| C.2 | Controller + Swagger | `GET /chapters/:id` | — |

**Nota:** na Fase D este use case passa a chamar **CheckAccess** + **Consume** antes de devolver páginas.

---

### Fase D — Acesso (limite semanal) (P0)

**Objetivo:** `PRODUTO-REGRAS-DE-NEGOCIO` §3.4.

| # | Entrega | Detalhes | TDD |
|---|---------|----------|-----|
| D.1 | `CheckChapterAccessUseCase` | Entrada: `userId`, `chapterId`. Saída: `allowed`, `reason`. Regras: role VIP/ADMIN/MODERATOR -> liberado; plano com `freeChaptersPerWeek === null` -> liberado; senão contar `UserChapterWeekAccess` na `weekStart` atual; capítulo `coin` no MVP pode ser **bloqueado** ou tratado como "em breve" (definir decisão única). | Sim |
| D.2 | `ConsumeWeeklyChapterAccessUseCase` | Se permitido e capítulo `public`, criar registro idempotente `(userId, chapterId, weekStart)`. | Sim |
| D.3 | Integrar em `GetChapterForReadingUseCase` | Se não autenticado -> 401; se não permitido -> 403 com corpo claro; se permitido -> consume + retorno das páginas. | Sim |
| D.4 | Ajuste de listagens | Capítulos/mangá podem expor `isUnlocked` / contagem usada na semana para o front (opcional endpoint `GET /users/me/access-summary`). | Opcional |

**Critério de aceite:** usuário free após N capítulos distintos na semana recebe 403 ao abrir novo capítulo `public`; mesmo capítulo reaberto na mesma semana não consome nova unidade.

---

### Fase E — Listas (P1)

**Objetivo:** §3.5.

| # | Entrega | Detalhes | TDD |
|---|---------|----------|-----|
| E.1 | Ports + repositório `UserMangaList` / `UserMangaListItem` | Validação: `listId` pertence ao `userId`. | Sim |
| E.2 | CRUD listas | Criar, renomear, excluir, ordenar (se necessário). | Sim |
| E.3 | Itens | Adicionar/remover mangá; impedir duplicata no mesmo par lista+mangá. | Sim |
| E.4 | Controllers + Swagger | Rotas com prefixo `users/me/lists`. | — |

**Critério de aceite:** usuário A não lê nem altera listas de B.

---

### Fase F — Progresso / continuar lendo (P1)

**Objetivo:** §3.6.

| # | Entrega | Detalhes | TDD |
|---|---------|----------|-----|
| F.1 | `SaveReadingProgressUseCase` | Upsert por `(userId, mangaId)`; atualizar `chapterId`, `pageNumber`, `lastReadAt`, `chaptersReadCount` conforme regra de produto. | Sim |
| F.2 | `GetContinueReadingUseCase` | Lista ordenada por `lastReadAt` (limite N). | Sim |
| F.3 | Controllers + Swagger | `GET/PATCH .../reading-progress` (ou PUT) alinhado ao mock MVP. | — |
| F.4 | (Opcional) Atualizar `mangasReadCount` nas listas | Job ou hook após salvar progresso. | Depois |

---

### Fase G — Encerramento MVP (qualidade)

| # | Entrega | Detalhes |
|---|---------|----------|
| G.1 | E2E | Fluxos: registro -> login -> listar mangás -> slug -> capítulo (com seed). |
| G.2 | Documentação | Atualizar tabela de rotas com status; README "como rodar MVP". |
| G.3 | CI | Lint, test, build, migrate em pipeline (já existente: validar após novos módulos). |
| G.4 | Decisão produto: capítulos `accessLevel = coin` no MVP | Ou esconder no catálogo, ou retornar 402/403 com mensagem até módulo Coins. |

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

**Ordem linear sugerida:** **A -> B -> C -> D -> E -> F -> G**.

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
- `docs/NEXUSTOONS-GATEWAY.md` — documentação do adapter externo.
- `prisma/schema.prisma` — modelo de dados.
- `.cursor/rules/midgard-core-api.mdc` — regras operacionais do projeto.

---

*Plano vivo: marque checkboxes conforme as entregas forem concluídas no repositório.*
