# Primeira sincronização de mangá — latência inicial e UX de loading

Documento focado no problema da **primeira carga de capítulos** quando o mangá ainda não foi sincronizado localmente.

Objetivo: reduzir fricção para o usuário final com uma estratégia clara de backend + frontend, sem bloquear evolução futura.

---

## 1) Problema observado

No primeiro acesso ao detalhe de um mangá, o sistema:

1. Busca/atualiza metadados do mangá.
2. Dispara sincronização de capítulos e páginas em background.
3. Pode levar tempo até os capítulos ficarem visíveis no banco local.

Esse atraso é mais perceptível em obras com muitos capítulos, porque o processo atual é sequencial por capítulo e pode incluir espera entre iterações.

---

## 2) Como funciona hoje (estado atual)

### 2.1 Fluxo backend

- `GET /api/v1/mangas/:slug`:
  - tenta ingest no externo para o mangá;
  - retorna o detalhe com dados persistidos;
  - agenda o sync de capítulos com `setImmediate` (não bloqueia a response).

- `SyncMangaFromSourceUseCase`:
  - filtra capítulos publicados;
  - compara com números já existentes no banco (incremental);
  - sincroniza capítulo a capítulo (incluindo páginas);
  - publica progresso no Redis (quando `REDIS_URL` existe);
  - ao final aplica política de free-tier e fecha status de sync.

### 2.2 Gargalos principais

1. **Processamento sequencial** (1 capítulo por vez).
2. **Delay configurado por capítulo** (`MANGA_SYNC_CHAPTER_DELAY_MS`).
3. Volume inicial alto em mangás com muitos capítulos.
4. Em mangás grandes, mesmo com listagem exibindo todos os publicados, pode haver atraso para preencher metadados/páginas até o sync inicial avançar.

---

## 3) Estratégia recomendada para UX (frontend)

### 3.1 Estado explícito de “primeira raspagem”

Na tela de detalhe/lista de capítulos:

- Se a lista vier vazia **e** houver indício de sync em andamento, exibir:
  - Skeleton de lista de capítulos;
  - Mensagem: `Sincronizando capítulos pela primeira vez...`;
  - Indicador de progresso (percentual e contadores).

### 3.2 Polling de progresso

Enquanto estiver em `running`:

- Polling curto: 2s (ou 3s) por requisição.
- Atualizar:
  - `chaptersProcessed / totalChapters`
  - último capítulo processado
  - timestamp de atualização.

Ao detectar `completed`:

- Recarregar capítulos imediatamente.
- Remover loading.

Ao detectar `failed` ou `timeout`:

- Mostrar aviso amigável:
  - `A sincronização demorou mais que o esperado. Tente novamente em instantes.`
- Exibir botão de recarregar.

### 3.3 Comportamento quando Redis estiver ausente

Sem Redis, não há estado de progresso publicado. Nesse caso:

- manter fallback de UX:
  - skeleton por janela curta (ex.: 8-12s),
  - retries automáticos da listagem de capítulos,
  - mensagem neutra de atualização em andamento.

### 3.4 Regra de produto para capítulos bloqueados (nova diretriz)

Diretriz confirmada para o MVP:

1. A lista deve exibir **todos os capítulos publicados**.
2. Cada capítulo deve ter estado de acesso:
   - `unlocked` (liberado), ou
   - `locked` (bloqueado por coin).
3. Capítulo `locked`:
   - aparece na lista normalmente (para o usuário saber que existe),
   - **não** retorna conteúdo (páginas),
   - **não** pode ser lido antes de desbloquear.
4. Desbloqueio por coin:
   - ao consumir coins e criar o unlock do usuário, o capítulo vira `unlocked` para esse usuário.
5. Após desbloqueio:
   - leitura livre daquele capítulo para o usuário,
   - acesso recorrente sem novo pagamento para o mesmo capítulo.

UX recomendada na lista:

- Exibir cadeado e badge de custo (`X coins`) nos itens `locked`.
- Permitir clique no item bloqueado para abrir modal de desbloqueio.
- Não esconder capítulos bloqueados; esconder gera percepção de “faltam capítulos”.

### 3.5 Status atual do backend (implementado)

Implementado nesta etapa:

1. `GET /api/v1/mangas/:slug/chapters` agora retorna **todos os capítulos publicados** (não apenas `public`).
2. Cada item traz `isLocked` para renderização direta no frontend:
   - `isLocked = true` quando `accessLevel = coin`;
   - `isLocked = false` quando `accessLevel = public`.
3. Endpoint de progresso disponível para primeira carga:
   - `GET /api/v1/mangas/:slug/sync-status`.

Limitação atual (importante para frontend):

- O fluxo de unlock por coin ainda não está exposto na API nesta etapa.
- Portanto, `GET /api/v1/chapters/:id` continua bloqueando capítulos `coin` com `403`.
- A UI deve mostrar estado `locked` e CTA de desbloqueio, mas a ação real de unlock depende da fase de Coins.

---

## 4) Contrato de progresso (recomendado para API)

> O backend já possui o modelo de estado de sync. A recomendação é expor um endpoint HTTP simples para o frontend consultar.

### 4.1 Endpoint implementado

- `GET /api/v1/mangas/:slug/sync-status`

### 4.2 Response (200)

```json
{
  "slug": "solo-leveling",
  "mangaType": "manhwa",
  "status": "running",
  "startedAt": "2026-03-23T12:00:00.000Z",
  "deadlineAt": "2026-03-23T15:00:00.000Z",
  "totalChapters": 120,
  "chaptersProcessed": 34,
  "lastChapterNumber": "34",
  "updatedAt": "2026-03-23T12:02:10.000Z",
  "errorMessage": null
}
```

Estrutura real de envelope:

```json
{
  "hasActiveState": true,
  "progressPercent": 28,
  "state": {
    "slug": "solo-leveling",
    "mangaType": "manhwa",
    "status": "running",
    "startedAt": "2026-03-23T12:00:00.000Z",
    "deadlineAt": "2026-03-23T15:00:00.000Z",
    "totalChapters": 120,
    "chaptersProcessed": 34,
    "lastChapterNumber": "34",
    "updatedAt": "2026-03-23T12:02:10.000Z",
    "errorMessage": null
  }
}
```

### 4.3 Regras de exibição no frontend

- `status = running` -> barra e contador.
- `status = completed` -> recarrega capítulos e oculta barra.
- `status = failed | timeout` -> alerta + ação de retry.
- `hasActiveState = false` -> tratar como “sem sync ativo”.

---

## 4.4 Contrato de capítulos para listagem da UI

Endpoint:

- `GET /api/v1/mangas/:slug/chapters`

Exemplo de item:

```json
{
  "id": "ch-uuid",
  "number": "42",
  "title": "The Awakening",
  "accessLevel": "coin",
  "isLocked": true,
  "coinCost": 1,
  "createdAt": "2026-01-15T00:00:00.000Z"
}
```

Regra de uso no app:

- `isLocked=true` -> mostrar bloqueado (sem tentar abrir leitura direta).
- `isLocked=false` -> fluxo normal de leitura.
- Mesmo para capítulos bloqueados, manter item visível na lista.

---

## 5) Otimizações de performance (ordem de implementação)

## 5.1 Ganho rápido (baixo risco)

- Ajustar `MANGA_SYNC_CHAPTER_DELAY_MS` para valor menor:
  - produção: testar `50` a `150`;
  - desenvolvimento: `0` a `50`.

Impacto: melhora imediata no tempo total da primeira sync.

## 5.2 Ganho estrutural (médio esforço)

- Processamento com **concorrência limitada**:
  - exemplo: lotes de 3-8 capítulos em paralelo;
  - com controle para não saturar a fonte externa.

Impacto: redução significativa de tempo em mangás grandes.

## 5.3 Evolução avançada (opcional)

- Estratégia em duas fases:
  1. persistir metadados de capítulos rapidamente;
  2. carregar páginas por job assíncrono.

Impacto: capítulos “aparecem” cedo para o usuário, mesmo que imagens completas ainda estejam sendo preenchidas.

---

## 6) Critérios de aceite (frontend + backend)

1. Ao abrir mangá não sincronizado, usuário vê feedback claro de carregamento.
2. Progresso é atualizado periodicamente sem travar a navegação.
3. Ao finalizar sync, capítulos aparecem sem refresh manual obrigatório.
4. Em erro/timeout, usuário recebe mensagem amigável e opção de tentativa.
5. Tempo percebido de “tela vazia” é eliminado.
6. Lista de capítulos mostra todos os capítulos publicados (inclusive bloqueados).
7. Capítulo bloqueado não expõe conteúdo até unlock por coin.
8. Após unlock, o capítulo permanece liberado para o usuário.

---

## 7) Plano de rollout sugerido

### Fase 1 (imediata)

- Ajustar `MANGA_SYNC_CHAPTER_DELAY_MS`.
- Implementar UX de loading com fallback (mesmo sem endpoint novo).

### Fase 2

- Expor endpoint `sync-status`.
- Integrar polling do frontend com barra real.

### Fase 3

- Introduzir concorrência limitada no sync.
- Reavaliar limites de taxa e estabilidade da fonte externa.

---

## 8) Checklist técnico

- [ ] Redis ativo em produção (`REDIS_URL`).
- [ ] TTL de progresso revisado (`MANGA_SYNC_REDIS_TTL_SEC`).
- [ ] Delay por capítulo calibrado (`MANGA_SYNC_CHAPTER_DELAY_MS`).
- [ ] Endpoint de status documentado no Swagger.
- [ ] Frontend com estados: `idle`, `running`, `completed`, `failed/timeout`.
- [ ] Mensagens de erro e retry aprovadas por produto.
- [ ] Endpoint de capítulos retorna todos os publicados com status de bloqueio por usuário.
- [ ] Endpoint de leitura mantém bloqueio real de conteúdo para capítulos não desbloqueados.
- [ ] Fluxo de unlock por coin idempotente e auditável (transação + ledger).

---

## 9) Resumo executivo

Para o problema de primeira sincronização demorada, a solução mais eficiente é combinar:

1. **redução de latência no backend** (principalmente delay e, depois, concorrência controlada), e
2. **feedback explícito no frontend** (loading + progresso + retry).

Com isso, mesmo quando o sync real demorar, o usuário deixa de perceber “tela quebrada” e entende claramente que o conteúdo está sendo preparado.
