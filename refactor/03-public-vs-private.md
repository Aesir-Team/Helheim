# Fase 3 — Separar público vs privado no domínio

## Objetivo
Impedir contaminação do catálogo público do Midgard por sources privadas do usuário.

## Entregas
- Regra explícita no domínio:
  - **queries públicas** usam apenas:
    - `isUserScoped = false`
    - `isPublicEligible = true`
    - `isActive = true`
  - **queries privadas** exigem ownership (`ownerUserId` / `ownerInstallationId`)
- Revisar repositórios/query builders para garantir que:
  - home
  - trending
  - recommended
  - latest updates
  - busca pública
  - estatísticas globais
  **nunca** considerem source privada.

## Contexto do runtime atual
Hoje discovery/home usa BD + ingestão externa + leitura via Prisma.  
Essa separação precisa existir antes de expandir providers.

## Resultado
Midgard passa a ter:
- catálogo público
- biblioteca privada do usuário
Sem misturar os dois.

