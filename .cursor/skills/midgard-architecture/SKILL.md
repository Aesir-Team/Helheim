# Skill: Midgard Architecture

## Quando usar
Use esta skill ao:
- criar módulo novo
- refatorar módulo existente
- mover responsabilidades entre camadas
- revisar boundaries de domínio
- preparar o Midgard 2.0

## Objetivo
Garantir que o backend evolua de forma coerente com:
- Clean Architecture
- ports/adapters
- catálogo canônico
- leitura desacoplada da origem
- hub de providers
- governança de conteúdo

## Modelo mental oficial

Midgard é dividido em pilares:

1. Discover / Catalog
2. Read / Reading
3. Organize / Library
4. Access / Monetization
5. Sources / Ingestion / Governance
6. Partners (futuro)

## Módulos alvo

- `auth`
- `catalog`
- `reading`
- `library`
- `access`
- `sources`
- `ingestion`
- `governance`
- `partners`

## Regras

### 1. Não acoplar o core a uma fonte externa
`NexustoonsMangaGateway` é implementação de provider, não identidade do produto.

### 2. Core fixo do produto
As partes mais estáveis são:
- catálogo canônico
- leitura
- listas
- progresso
- auth
- acesso

### 3. Providers entram pela borda
Toda integração externa deve passar por:
- port
- adapter
- normalização
- política de governança

### 4. Catálogo público não é todo conteúdo ingerido
Introduzir políticas de elegibilidade e visibilidade sempre que possível.

## Checklist de implementação

### Ao criar módulo novo
- criar `application`, `domain`, `infrastructure`, `presentation`
- definir ports em `application/ports`
- manter `domain` sem Nest, Prisma ou HTTP
- expor provider tokens
- registrar módulos de application e infrastructure separadamente

### Ao refatorar módulo existente
- localizar dependências para fora do boundary
- mover regra de negócio para use case
- mover integração externa para adapter
- reduzir controller a orquestração HTTP

### Ao tocar em catálogo
- preservar `Manga`/`Chapter`/`Category` como modelos centrais
- evitar vazar DTO externo para o domínio
- tratar origem externa como enrichment, não verdade absoluta

## Anti-padrões proibidos
- use case importando Prisma
- controller com regra de negócio
- adapter retornando shape cru da API externa para o domínio
- código novo que assuma “uma única fonte externa principal”

