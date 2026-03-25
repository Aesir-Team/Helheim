# Skill: Midgard Reading & Access

## Quando usar
Use ao:
- alterar `GET /chapters/:id`
- mexer em `CheckChapterAccessUseCase`
- implementar unlock por coins
- revisar progresso automático
- mexer em flags de capítulo

## Regra principal
Preservar o comportamento atual até task explícita de Access v2.

## Estado atual que deve ser respeitado

### Leitura
- `public` pode ser lido sem JWT
- `coin` exige JWT
- `coin` sem unlock => 403
- VIP/ADMIN/MODERATOR ignoram bloqueio por coin

### Progress
- leitura autenticada pode atualizar progresso automaticamente
- visitante não grava progresso no servidor
- `PATCH /reading-progress` continua sendo o endpoint explícito de upsert

### Lista de capítulos
- `isLocked`:
  - sem JWT => `accessLevel === coin`
  - com JWT => considera unlock/VIP
- `isRead` depende de `reading_progress`
- `isNew` depende de janela configurável

## Regra estratégica
Não reintroduzir weekly quota sem task explícita.

## Se implementar Coins futuramente
Obrigatório:
- transação atômica
- validar saldo
- criar `CoinTransaction`
- criar `UserChapterCoinUnlock`
- idempotência quando necessário
- não debitar duas vezes o mesmo unlock

## Checklist
- comportamento de visitante preservado?
- comportamento autenticado preservado?
- `reason` de 403 correto?
- progresso continua idempotente?
- flags continuam coerentes com docs?

