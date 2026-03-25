# Fase 0 — Congelar o runtime atual

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

## Entregas
- Documentar explicitamente o comportamento vigente (links para docs/rotas atuais)
- Reforçar testes nos fluxos sensíveis:
  - `GET /mangas/:slug`
  - `GET /mangas/:slug/chapters`
  - `GET /chapters/:id`
  - `PATCH /users/me/reading-progress`
  - listas (`/users/me/lists/*`)

## Não mudar nesta fase
- contratos HTTP
- regras de auth
- progress
- lists
- unlock/coin
- reativação de weekly quota

