# Visão geral do projeto – Midgard Core API

Documento único que detalha o produto, as regras de negócio (incluindo **anúncios e coins**), o schema e **como implementar** cada parte da aplicação.

---

## 1. O que é o produto

- **App de mangás** com catálogo (mangás, capítulos, páginas).
- **Monetização:** plano gratuito (limite de capítulos/semana), assinatura (acesso ilimitado) e **coins** (ganhas ao assistir anúncios; usadas para desbloquear capítulos).
- **Funcionalidades:** listas customizadas (“Favoritos”, “Lendo”, etc.), progresso de leitura (“continuar lendo”), sync com API de terceiros (banco primeiro, scrape como fallback).

---

## 2. Stack e arquitetura

| Camada        | Tecnologia / abordagem |
|---------------|-------------------------|
| API           | NestJS (TypeScript)     |
| Banco         | PostgreSQL + Prisma     |
| Auth          | JWT                     |
| Pagamentos    | Mercado Pago (futuro)   |
| Filas (sync)  | Bull/BullMQ + Redis (opcional no MVP) |
| Arquitetura   | Clean Architecture + SOLID (ver `MVP-GUIDE.md`) |

Estrutura de pastas por módulo: `auth`, `catalog`, `access`, `lists`, `progress`, `coins`, `takedown` (ou dentro de `compliance`), cada um com `application/`, `domain/`, `infrastructure/`, `presentation/`.

---

## 3. Módulos e responsabilidades

| Módulo    | Responsabilidade |
|-----------|-------------------|
| **Auth**  | Registro, login, perfil (JWT, hash de senha). |
| **Catalog** | Mangás, capítulos, categorias; listar, detalhe, sync (banco primeiro → fallback scrape). |
| **Access** | “Pode ler/baixar?”: limite semanal (plano gratuito), ilimitado (assinante), desbloqueio por coins. |
| **Lists**  | CRUD de listas do usuário; adicionar/remover mangá. |
| **Progress** | Salvar progresso (capítulo + página); “continuar lendo”. |
| **Coins**  | Ganhar coins (anúncios, bônus); gastar (desbloqueio); extrato. |
| **Payments** (fase 2) | Assinatura paga, webhooks Mercado Pago. |
| **Takedown** | Pedidos de retirada de conteúdo (notice & takedown); canal onde titulares/usuários solicitam remoção de mangá/manhua do catálogo; alinhado a termos de uso e Marco Civil. |

---

## 4. Anúncios e coins (detalhado)

### 4.1 Regra de negócio

- **1 anúncio assistido = X coins** (ex.: 5 ou 10). O valor é **configurável** (tabela de config, env ou admin).
- Coins são usadas para **desbloquear capítulos** com `accessLevel = coin` (campo `Chapter.coinCost`).
- Um capítulo desbloqueado com coins **não cobra de novo** (registro em `UserChapterCoinUnlock`).
- Histórico de movimentação em `CoinTransaction` (tipo `ad_reward` para anúncio).

### 4.2 Fluxo “usuário assiste 1 anúncio”

1. **Frontend (app/web):** exibe anúncio via SDK (AdMob, Unity Ads, etc.).
2. **Callback do SDK:** quando o anúncio é concluído (rewarded video), o cliente chama a **API do backend** para creditar as coins.
3. **Backend:**
   - Recebe a requisição (ex.: `POST /coins/reward` ou `POST /ads/complete`) com um **token/id de idempotência** (ex.: `adSessionId` ou `rewardId` gerado pelo cliente por exibição).
   - Valida: usuário autenticado, token ainda não usado (evitar replay).
   - Busca **quantidade de coins por anúncio** (config: ex. `COINS_PER_AD=10` ou tabela `AppConfig`).
   - Em **transação**: cria `CoinTransaction` (type `ad_reward`, amount positivo), incrementa `User.coinsBalance`, marca o token como usado (tabela `AdRewardClaim` ou similar com unique em `idempotencyKey`).
   - Retorna novo saldo e, se quiser, os coins creditados.

### 4.3 Como implementar no backend

**Passo 1 – Configuração**

- Definir valor fixo por anúncio, ex. em env:
  - `COINS_PER_AD=10`
- Ou criar tabela `AppConfig` (key: `coins_per_ad`, value: `"10"`) e ler no use case.

**Passo 2 – Idempotência**

- O cliente envia um **id único por exibição** (ex.: UUID gerado ao exibir o anúncio).
- Backend guarda esse id em uma tabela, ex.:
  - `AdRewardClaim (userId, idempotencyKey, coinsGranted, createdAt)` com `UNIQUE(userId, idempotencyKey)`.
- Se a mesma chave chegar de novo → retornar 200 com o mesmo resultado (ou 409 “já creditado”), **sem** creditar de novo.

**Passo 3 – Use case**

- `CreditCoinsForAdUseCase.execute(userId, idempotencyKey)`:
  1. Verificar se já existe `AdRewardClaim` com esse `idempotencyKey` para o usuário → se sim, retornar saldo atual (idempotente).
  2. Ler `COINS_PER_AD` (ou AppConfig).
  3. Em transação Prisma:
     - `User.update({ where: id: userId, data: { coinsBalance: { increment: coinsPerAd } } })`
     - `CoinTransaction.create({ userId, amount: coinsPerAd, type: 'ad_reward', referenceId: idempotencyKey, referenceType: 'ad_reward_claim', balanceAfter: novoSaldo })`
     - `AdRewardClaim.create({ userId, idempotencyKey, coinsGranted: coinsPerAd })`
  4. Retornar `{ coinsGranted, newBalance }`.

**Passo 4 – Limites opcionais (anti-abuse)**

- Limitar quantidade de recompensas por dia, ex.: máx. 20 anúncios/dia por usuário.
- Na mesma transação: contar `AdRewardClaim` do usuário no dia; se >= 20, retornar erro “limite diário atingido” e não creditar.

**Passo 5 – API**

- `POST /coins/ad-reward` (ou `POST /ads/complete`)
- Body: `{ "idempotencyKey": "uuid-do-cliente" }`
- Headers: `Authorization: Bearer <JWT>`
- Resposta: `{ "coinsGranted": 10, "newBalance": 150 }`

**Passo 6 – Frontend**

- Após o callback “anúncio concluído” do SDK, chamar `POST /coins/ad-reward` com um `idempotencyKey` novo (um por exibição).
- Exibir “+X coins” e atualizar saldo na UI.

### 4.4 Schema necessário para anúncios

- **Já existe:** `User.coinsBalance`, `CoinTransaction` (com `type = ad_reward`), `UserChapterCoinUnlock`, `Chapter.coinCost`, `Chapter.accessLevel`.
- **Adicionar** (se ainda não tiver): tabela de idempotência para recompensa de anúncio, ex.:

```prisma
model AdRewardClaim {
  id             String   @id @default(uuid())
  userId         String
  idempotencyKey String   // token enviado pelo cliente (unique por usuário)
  coinsGranted   Int
  createdAt      DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, idempotencyKey])
  @@index([userId, createdAt])  // para limite diário
  @@map("ad_reward_claims")
}
```

E em `User`: `adRewardClaims AdRewardClaim[]`.

---

## 5. Fluxos principais da aplicação

### 5.1 Catálogo (banco primeiro, scrape como fallback)

- **Listar mangás:** `GET /mangas` → repositório no BD, paginação e filtros.
- **Detalhe do mangá:** `GET /mangas/:slug`
  - Buscar no BD por slug.
  - **Se existir:** retornar mangá + capítulos; em background, se `lastSyncedAt` antigo e `syncStatus === idle`, disparar sync 1x/dia.
  - **Se não existir:** chamar sync (scrape na API externa), persistir e retornar (ou 404 se a API não tiver).
- **Detalhe do capítulo:** `GET /chapters/:id` → buscar capítulo + páginas; delegar “pode acessar?” ao módulo Access; se permitido, consumir acesso semanal e retornar páginas.

### 5.2 Acesso (ler/baixar capítulo)

- **CheckChapterAccess:** verificar plano do usuário (limite semanal vs ilimitado); contar `UserChapterWeekAccess` na semana; se capítulo for `coin`, verificar se já existe `UserChapterCoinUnlock` ou se o saldo cobre `coinCost`.
- **Consume:** se permitido, criar registro em `UserChapterWeekAccess` (ou debitar coins e criar `UserChapterCoinUnlock` + `CoinTransaction` type `chapter_unlock`).
- Bloquear leitura/download quando limite semanal atingido (plano gratuito) ou quando capítulo é `coin` e usuário não tem desbloqueio nem saldo.

### 5.3 Listas

- CRUD de `UserMangaList`; adicionar/remover `UserMangaListItem`; listar listas com contagem de itens e `mangasReadCount` (derivado do progresso).

### 5.4 Progresso

- Ao avançar página/capítulo: upsert `ReadingProgress` (userId, mangaId, chapterId, pageNumber, chaptersReadCount, lastReadAt).
- “Continuar lendo”: buscar `ReadingProgress` do usuário ordenado por `lastReadAt`, limit 1 ou N.

### 5.5 Coins (resumo)

- **Ganhar:** anúncio (fluxo acima); bônus/admin (CoinTransaction type `bonus` ou `admin_adjustment`).
- **Gastar:** desbloqueio de capítulo (CheckChapterAccess + débito + UserChapterCoinUnlock + CoinTransaction `chapter_unlock`).
- **Extrato:** listar `CoinTransaction` do usuário com paginação.

### 5.6 Pagamentos (fase 2)

- Checkout Mercado Pago; webhook recebe notificação de pagamento; idempotência por `idempotencyKey` (ex.: event_id); criar/atualizar `Payment`, ativar/renovar `Subscription`.

### 5.7 Notice & takedown e termos de uso

- **Objetivo:** ter um canal claro para titulares de direitos (ou representantes) solicitarem a **retirada de um mangá/manhua** do catálogo, reduzindo risco jurídico e alinhando ao Marco Civil (intermediário que age ao ser notificado).
- **Requer login:** o pedido de retirada é feito **com o usuário logado**. Assim há rastreabilidade (quem solicitou), redução de abuso (uma identidade por conta) e maior legitimidade do canal.
- **Fluxo:** usuário **logado** acessa “Pedido de retirada de conteúdo” → preenche formulário (mangá a retirar, motivo, declaração de legitimidade; nome/email podem vir do perfil ou ser opcional “em nome de empresa”) → backend associa o pedido ao `userId` e registra → equipe analisa e, se procedente, remove/desindexa o mangá e responde ao solicitante (por email ou in-app).
- **Termos de uso (resumo do que deixar claro):** (1) o serviço é agregador/índice, não hospeda imagens; (2) o usuário acessa links de terceiros por sua conta e risco; (3) titulares de direitos podem solicitar remoção pelo canal oficial (com conta logada); (4) ao receber notificação válida, o serviço remove o conteúdo indicado em prazo razoável; (5) uso do app implica aceite dos termos.
- **Referência para design (Figma):** tela “Pedido de retirada de conteúdo” **acessível só para usuário logado**. Se não logado: exibir “Faça login para solicitar retirada de conteúdo” e botão para login/registro. Se logado: título e texto explicativo; campo “Mangá/Manhua” (busca por nome ou slug, ou link para a ficha); campo “Motivo”; opcional: “Nome/empresa em nome de quem solicita” e “Documento (opcional)”; checkbox “Declaro que sou titular dos direitos ou representante legal”; botão “Enviar pedido”; links para Termos de uso e Política de privacidade; mensagem de confirmação após envio (“Recebemos seu pedido. Entraremos em contato pelo email da sua conta.”).

---

## 6. Como implementar o resto da aplicação (resumo por módulo)

### Auth

- **Registro:** validar email único, hash da senha (bcrypt), criar `User`, emitir JWT.
- **Login:** verificar credenciais, emitir JWT.
- **Perfil:** `GET /me` (dados do User a partir do JWT); `PATCH /me` (atualizar nome, etc.).
- Guard JWT em rotas protegidas; opcional: refresh token.

### Catalog

- Repositórios Prisma para `Manga`, `Chapter`, `ChapterPage`, `Category`; port para gateway externo (ex.: Nexustoons).
- Use cases: ListMangas, GetMangaBySlug (com fallback sync), GetChapter, SyncMangaFromSource (chamado em background ou por job).
- Controllers: `GET /mangas`, `GET /mangas/:slug`, `GET /chapters/:id`.

### Access

- Repositórios para `Subscription`, `Plan`, `UserChapterWeekAccess`, `UserChapterCoinUnlock`; ler `User.coinsBalance`.
- Use cases: CheckChapterAccess (retorna allowed + reason), ConsumeWeeklyChapterAccess; opcional: UnlockChapterWithCoinsUseCase (debita coins, cria CoinUnlock + CoinTransaction).
- GetChapter chama CheckChapterAccess; se não permitido, 403; se permitido, Consume (e, se for unlock por coins, UnlockChapterWithCoins) e retorna conteúdo.

### Lists

- CRUD de `UserMangaList` e `UserMangaListItem`; use cases CreateList, ListUserLists, AddMangaToList, RemoveMangaFromList, GetListWithMangas.
- Controllers: `GET/POST /lists`, `GET/PATCH/DELETE /lists/:id`, `POST/DELETE /lists/:id/mangas/:mangaId`.

### Progress

- SaveReadingProgress (upsert por userId+mangaId); GetContinueReading (ordenar por lastReadAt).
- Chamar SaveReadingProgress ao avançar de página/capítulo (ou em batch ao sair do capítulo).
- Controller: `PUT /progress` (body: mangaId, chapterId, pageNumber), `GET /progress/continue`.

### Coins

- CreditCoinsForAdUseCase (anúncios, com idempotência); GetBalanceUseCase; GetCoinHistoryUseCase (extrato).
- UnlockChapterWithCoins (no Access ou Coins): debitar, criar UserChapterCoinUnlock + CoinTransaction.
- Controllers: `POST /coins/ad-reward`, `GET /coins/balance`, `GET /coins/history`.

### Payments (fase 2)

- Criar preferência de pagamento (Mercado Pago); webhook para processar notificação; atualizar Payment e Subscription; idempotencyKey no webhook.

### Takedown (Notice & takedown)

- **Requer autenticação:** `POST /takedown/requests` exige **JWT** (usuário logado). Body: mangaId ou slug, motivo (enum ou texto), declaração de legitimidade (boolean); opcional: nome/empresa e documento (quando solicita em nome de terceiro). Backend preenche requester com dados do User (userId, email do perfil) e persiste em `TakedownRequest` com status `pending`.
- **Use cases:** SubmitTakedownRequest(userId, mangaId/slug, reason, declarationAccepted, opcionais); ListTakedownRequests (admin); ProcessTakedownRequest (admin: aprovar → soft delete ou flag no Manga + notificar solicitante; rejeitar → notificar com motivo).
- **Controller:** `POST /takedown/requests` (rota **protegida** por Guard JWT). Admin: `GET /admin/takedown/requests`, `PATCH /admin/takedown/requests/:id`.
- **Frontend:** página “Pedido de retirada” **somente para logados** (senão, CTA para login); formulário conforme referência para Figma; link no rodapé (“Solicitar retirada de conteúdo” / “Direitos autorais”).

---

## 7. Schema (resumo)

- **User:** id, email, password, role, coinsBalance, timestamps.
- **Manga, Chapter, ChapterPage, Category, MangaCategory:** catálogo e sync (externalId, lastSyncedAt, syncStatus).
- **Plan, Subscription, Payment:** planos e pagamentos; Payment com idempotencyKey.
- **UserChapterWeekAccess:** limite semanal (userId, chapterId, weekStart).
- **UserChapterCoinUnlock:** capítulos desbloqueados com coins.
- **CoinTransaction:** histórico (ad_reward, chapter_unlock, bonus, refund, admin_adjustment).
- **UserMangaList, UserMangaListItem:** listas customizadas.
- **ReadingProgress:** userId, mangaId, chapterId, pageNumber, chaptersReadCount, lastReadAt.
- **AdRewardClaim:** idempotência para recompensa de anúncio (userId, idempotencyKey, coinsGranted).
- **TakedownRequest:** pedidos de retirada – id, **requesterId (userId)** – quem abriu o pedido (logado); mangaId, reason, requesterName, requesterEmail (podem vir do User ou ser preenchidos no form), requesterDocument (opcional), declarationAccepted, status (pending | approved | rejected), processedAt, processedById (admin), responseNote, createdAt. Índices por requesterId, status e createdAt.

---

## 8. Configuração “1 anúncio = X coins”

- **Opção A:** variável de ambiente `COINS_PER_AD=10`; ler no use case.
- **Opção B:** tabela `AppConfig` (key, value); key `coins_per_ad`, value numérico; permite mudar sem deploy.
- **Opção C:** no futuro, painel admin que altera `AppConfig` ou env em runtime.

---

## 9. Checklist de implementação (ordem sugerida)

1. Estrutura de pastas e módulos NestJS (auth, catalog, access, lists, progress, coins).
2. Auth: registro, login, JWT, perfil.
3. Catalog: listar mangás, detalhe mangá (com fallback sync), detalhe capítulo.
4. Access: CheckChapterAccess, ConsumeWeeklyChapterAccess; integrar em GetChapter.
5. Coins: config COINS_PER_AD, AdRewardClaim, CreditCoinsForAdUseCase, POST /coins/ad-reward; depois UnlockChapterWithCoins e integração com Access.
6. Lists: CRUD listas, adicionar/remover mangá.
7. Progress: salvar progresso, “continuar lendo”.
8. Takedown: página e API de pedido de retirada; termos de uso; modelo TakedownRequest; fluxo admin para processar pedidos e remover mangá do catálogo.
9. Pagamentos (fase 2): Mercado Pago, webhooks, Subscription.

Com isso você tem o projeto todo detalhado em um único documento, com foco em **anúncios (1 ad = X coins)** e em **como implementar** cada parte da aplicação.
