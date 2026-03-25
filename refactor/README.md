# Refactor plan — Midgard (novo nível “tipo Tachimanga”)

Este diretório organiza o refactor para evoluir o backend sem quebrar o runtime atual:

- Midgard continua como **core canônico**
- providers/extensões viram camada separada
- usuário pode adicionar conexão/extensão própria
- catálogo público e conteúdo privado ficam isolados

## Documento principal
- `PLANO-REFATORACAO-COMPLETO.md` — **plano final revisado**: decisões fechadas, épicos **0–11** (inclui **1.5** backfill e **11** compatibilidade transitória), ordem de leitura, sprints e critérios de aceite

## Complementos
- `tickets.md` — tickets macro para execução incremental
- `risks.md` — riscos e mitigação

## Arquivos legados de fases
Os arquivos `00-...` a `08-...` foram mantidos como histórico da primeira organização e podem ser consultados como referência incremental.

