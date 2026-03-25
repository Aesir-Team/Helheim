# Fase 6 — Refactor de boundaries de módulo

## Objetivo
Alinhar a arquitetura com a visão Midgard 2.0 sem big bang refactor.

## Entregas
- Manter módulos atuais (Auth, Catalog, Access, Lists, Progress), mas preparar novos boundaries:
  - `catalog`
  - `reading`
  - `library`
  - `access`
  - `sources`
  - `ingestion`
  - `governance`
- Curto prazo:
  - `lists` + `progress` podem continuar onde estão, mas com naming/ports alinhados ao conceito de `library`
- Médio prazo:
  - extrair `sources` e `ingestion` como módulos dedicados

## Importante
Não mover tudo de uma vez:
1) criar módulos novos
2) migrar responsabilidades aos poucos

