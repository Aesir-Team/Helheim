# Runtime vigente da API (MVP) — referência para refactor Fase 0

Este documento **congela** o comportamento operacional atual da Core API, alinhado ao que está implementado e testado.  
Serve como contrato de “não regressão” durante o refactor descrito em `refactor/00-runtime-freeze.md` e `refactor/PLANO-REFATORACAO-COMPLETO.md`.

## Documentação HTTP relacionada

- Rotas resumidas: [`docs/API-ROTAS-MVP.md`](./API-ROTAS-MVP.md)
- Contratos detalhados: [`docs/API-MVP-DETALHADA.md`](./API-MVP-DETALHADA.md)
- Plano MVP (estado implementado): [`docs/PLANO-MVP.md`](./PLANO-MVP.md)

## Weekly quota (legado / fora do runtime atual)

- O schema e o plano gratuito ainda podem mencionar `freeChaptersPerWeek` / `UserChapterWeekAccess`.
- **A leitura atual não consome cota semanal**: o fluxo vigente é `public` / `coin`, unlock e papéis `VIP` / `ADMIN` / `MODERATOR`.
- Qualquer reativação de cota semanal é **Access v2**, fora do escopo do refactor estrutural atual.

## Prefixo e rotas sensíveis

Todas as rotas abaixo usam o prefixo **`/api/v1`**.

| Rota | Auth | Comportamento a preservar |
|------|------|---------------------------|
| `GET /mangas/:slug` | JWT **opcional** | Sem `Authorization` → anônimo. `Bearer` inválido → **401**. |
| `GET /mangas/:slug/chapters` | JWT **opcional** | Idem. Lista capítulos publicados; flags enriquecidas com JWT válido. |
| `GET /chapters/:id` | JWT **opcional** | Capítulo **`public`**: **200** sem JWT. Capítulo **`coin`** sem JWT → **403** `authentication_required`. Com JWT sem unlock → **403** `coin_chapter_not_unlocked` (salvo VIP/ADMIN/MODERATOR). |
| `PATCH /users/me/reading-progress` | JWT **obrigatório** | Upsert por `(userId, mangaId)`. |
| `GET/POST /users/me/lists` (e sub-rotas) | JWT **obrigatório** | Ownership estrito. |

## Leitura e progresso

- Abrir capítulo com **JWT válido** pode gravar progresso automaticamente (página 1); falha ao gravar **não** deve impedir **200** com páginas.
- Visitante sem JWT **não** grava progresso no servidor.

## Onde está coberto em testes

- E2E: `test/mvp-flow.e2e-spec.ts` (fluxo principal + extensões da Fase 0).
- Fixtures: `prisma/mvp-fixtures.ts` (`MVP_DEMO_MANGA_SLUG`).
