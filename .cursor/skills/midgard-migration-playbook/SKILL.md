# Skill: Midgard Migration Playbook

## Quando usar
Use ao planejar ou implementar a transição do Midgard atual para Midgard 2.0.

## Missão
Migrar sem quebrar o produto atual.

## Objetivo da migração
Sair de:
- backend dependente de uma fonte externa principal

Para:
- plataforma central de catálogo, leitura, governança e providers

## Fases recomendadas

### Fase 1 — Desacoplamento da fonte atual
- manter provider atual atrás de port formal
- remover conhecimento específico da fonte do core

### Fase 2 — Source registry
- introduzir `ContentSource`
- introduzir classificação de source
- introduzir resolver de adapters

### Fase 3 — Governance mínima
- decidir elegibilidade pública
- decidir visibilidade
- separar origem oficial vs privada

### Fase 4 — Público vs privado
- catálogo público do Midgard
- biblioteca conectada do usuário

### Fase 5 — Partner readiness
- entidade `Partner`
- vínculo partner-title
- pipeline de ingestão oficial

## Regras da migração
- não quebrar contratos HTTP atuais sem task explícita
- preservar listas/progresso/leitura durante a transição
- evitar big bang refactor
- preferir camadas/adapters novos antes de remoções profundas

## Perguntas obrigatórias antes de cada mudança
1. isso preserva o runtime atual?
2. isso aproxima do hub de providers?
3. isso melhora governança?
4. isso separa melhor catálogo público e conteúdo privado?

