# Fase 0 — Congelar o runtime atual

**Status:** entregue (documentação + E2E de regressão).

## Objetivo
Impedir regressão enquanto a base estrutural muda.

## Ponto-chave
Existe divergência histórica entre docs antigas (limite semanal) e o **runtime atual** (leitura centrada em `public`/`coin`, unlock/VIP, sem reativar cota semanal).  
Nesta fase, o foco é **documentar e testar o comportamento vigente**, não mudar regra.

## Comportamento vigente a preservar
- `public` sem JWT lê normalmente
- `coin` sem unlock retorna 403 (com `reason` apropriado)
- JWT opcional em rotas públicas relevantes
- Bearer inválido nas rotas opcionais retorna 401 (padrão atual)
- progresso automático ao abrir capítulo autenticado (falha não bloqueia resposta)

## Entregas (feitas)
- **Documentação:** [`docs/RUNTIME-VIGENTE-MVP.md`](../docs/RUNTIME-VIGENTE-MVP.md) — tabela de rotas, weekly quota fora do runtime, links para `API-ROTAS-MVP`, `API-MVP-DETALHADA`, `PLANO-MVP`.
- **Testes E2E:** `test/mvp-flow.e2e-spec.ts` — fluxo existente + casos adicionais:
  - `GET /mangas/:slug` com Bearer inválido → 401
  - `GET /mangas/:slug/chapters` com Bearer inválido → 401
  - `GET /chapters/:id` em capítulo `coin` com JWT sem unlock → 403 `coin_chapter_not_unlocked`
  - `POST /users/me/lists` + `GET /users/me/lists`
  - `PATCH /users/me/reading-progress`

## Não mudar nesta fase
- contratos HTTP
- regras de auth
- progress
- lists
- unlock/coin
- reativação de weekly quota

