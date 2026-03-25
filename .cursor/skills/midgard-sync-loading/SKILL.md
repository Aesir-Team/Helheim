# Skill: Midgard Sync & Loading

## Quando usar
Use ao:
- alterar sync inicial
- mexer em Redis de progresso
- expor `sync-status`
- melhorar primeira carga
- otimizar performance de sync

## Regra principal
Sync nunca deve bloquear a resposta principal.

## Fluxo esperado
- detalhe do mangá responde com dados persistidos
- sync roda em background
- progresso pode ser publicado via Redis
- frontend usa polling/skeleton se necessário

## Regras

### 1. Banco primeiro
Sempre responder com o que já existe no BD.

### 2. Sync assíncrono
Usar fila, `setImmediate` ou job, mas nunca travar a request crítica.

### 3. Estado observável
Quando existir estado de sync:
- `running`
- `completed`
- `failed`
- `timeout`

### 4. Lista de capítulos
Mesmo durante primeira sync:
- objetivo é evitar tela vazia
- capítulos bloqueados devem aparecer
- `isLocked` precisa estar disponível para UI

## Otimizações permitidas
- reduzir delay por capítulo
- concorrência limitada
- estratégia em duas fases
- persistir metadados antes de páginas, se fizer sentido

## Proibido
- mover sync pesado para dentro da rota síncrona
- esconder capítulos bloqueados para “simplificar”
- quebrar `sync-status` sem atualizar docs e frontend

