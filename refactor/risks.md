# Riscos e mitigação

## Risco 1 — Quebrar o app atual
### Mitigação
- congelar contratos HTTP
- reforçar e2e/smoke
- manter DTOs e status HTTP
- priorizar mudanças internas por trás dos mesmos endpoints

## Risco 2 — Source privada contaminar produto público
### Mitigação
- filtros obrigatórios no backend (não confiar no frontend)
- impedir fallback global de source privada
- garantir que home/busca/ranking/recommended/latest, **jobs**, **feeds materializados**, **cache global** e **métricas** não usem user-scoped
- bloquear `preferredSourceId` global para source privada
- páginas de leitura vindas de source privada: não persistir em `ChapterPage` global compartilhado por padrão

## Risco 3 — Complexidade de sync crescer rápido
### Mitigação
- manter mecanismo atual de sync assíncrono
- introduzir contexto de connection de forma incremental
- separar `catalog sync` de `private library sync`

## Risco 4 — Schema crescer demais cedo
### Mitigação
- fase 1 mínima e compatível
- manter campos legados temporários em `Manga` para transição
- **Épico 11**: dual-path / feature flag até migração completa
- adiar modelagens maiores (`Partner`, registry avançado) para fase posterior

## Risco 7 — Backfill incorreto ou não idempotente
### Mitigação
- backfill idempotente (Épico 1.5)
- validar em staging; rollback testável
- smoke após backfill em todos os fluxos do Épico 0

## Risco 5 — Big bang refactor
### Mitigação
- executar por épicos/sprints
- feature flags internas quando necessário
- migrar módulo por módulo, sem reescrita total

## Risco 6 — Reintroduzir regras antigas por conflito documental
### Mitigação
- runtime atual como fonte operacional
- weekly quota tratada como Access v2 (fora deste refactor)
- qualquer reintrodução só com task explícita

