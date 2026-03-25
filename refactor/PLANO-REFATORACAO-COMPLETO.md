# Plano final revisado — Refactor completo do Midgard Backend

## Objetivo

Levar o Midgard do modelo atual para um modelo de plataforma extensível, com:

- Midgard como **core canônico**
- runtime de providers/extensões como camada separada
- **SourceConnection** como conexão concreta
- catálogo público e conteúdo privado separados
- suporte a:
  - source oficial do sistema
  - source parceira
  - source externa aprovada
  - source privada do usuário
- preservação do **runtime atual** da API

## Regra de ouro

Provider/extensão não é produto.  
Connection não é catálogo.  
`Manga` continua sendo a verdade canônica do Midgard.

---

## Decisões fechadas antes de começar

### 1. Weekly quota fica fora deste refactor

Mesmo que o documento de produto ainda cite limite semanal, o runtime atual do MVP já opera em `public`/`coin`, unlock e VIP, e o plano registra que a cota semanal foi removida do fluxo atual de leitura.

- não reativar `UserChapterWeekAccess`
- não mexer em weekly quota agora
- tratar como **Access v2**, fora deste refactor

### 2. Suporte a usuário sem conta: sim

Extensões/connections privadas podem pertencer a:

- `ownerUserId`
- ou `ownerInstallationId`

Essa decisão entra cedo para evitar retrabalho.

### 3. `preferredSourceId` global é obrigatório

`Manga` terá uma source global preferida, mas:

- ela **nunca** pode ser user-scoped
- a preferência privada do usuário vai para `UserMangaSourcePreference`

### 4. Queries públicas, métricas e cache global devem ignorar conteúdo privado

Não basta filtrar só home/busca. Também ficam fora:

- ranking
- latest global
- recommendation
- contadores globais
- jobs que calculam popularidade
- cache compartilhado
- feeds materializados

---

## Visão alvo de modelagem

### Core canônico

- `Manga`
- `Chapter`
- `ChapterPage`

### Camada de extensões

- `UserExtension`
- `SourceConnection`
- `MangaExternalSource` (vínculo)

### Camada de preferência

- `UserMangaSourcePreference`

### Futuro

- `Partner`
- `ContentSourceRegistry` ou equivalente

---

## Épico 0 — Congelar e proteger o runtime atual

### Objetivo

Garantir que o refactor não quebre a API já consumida pelo app.

### Entregas

- reforçar testes dos fluxos estáveis: auth, `GET /mangas/:slug`, `GET /mangas/:slug/chapters`, `GET /chapters/:id`, listas, progresso
- congelar contratos HTTP atuais
- congelar comportamento atual de leitura:
  - `public` sem JWT lê
  - `coin` exige JWT/unlock/VIP
  - progresso automático na leitura autenticada
- formalizar que weekly quota está fora do runtime atual

### Critério de aceite

- smoke/e2e do fluxo atual verdes
- nenhum endpoint principal muda contrato
- comportamento documentado coerente com a API atual

---

## Épico 1 — Refactor de schema para “extension + connection + vínculo”

### Objetivo

Introduzir a base estrutural nova sem quebrar o resto.

### Entregas

- criar `UserExtension`
- criar `SourceConnection`
- refatorar `MangaExternalSource` para apontar para `sourceConnectionId`
- adicionar `preferredSourceId` em `Manga` (global, nunca user-scoped)
- criar `UserMangaSourcePreference`
- suportar ownership por `ownerUserId` e `ownerInstallationId`
- manter temporariamente campos legados em `Manga`: `externalId`, `lastSyncedAt`, `syncStatus`, `lastSyncError`

### Regras

- `Manga` continua central
- `MangaExternalSource` vira vínculo: mangá + connection + `externalId`
- `preferredSourceId` nunca aponta para source privada
- `UserMangaSourcePreference` pode apontar para source privada do dono

### Critério de aceite

- migrations sobem
- schema compatível com módulos atuais
- `MangaExternalSource` deixa de ser sobrecarregada
- sistema continua funcional com campos legados temporários

---

## Épico 1.5 — Migração e backfill de dados

### Objetivo

Migrar os dados atuais para o novo modelo sem perda.

### Entregas

- criar uma `SourceConnection` global padrão para a Nexustoons
- backfill dos registros atuais de `MangaExternalSource` para apontar para essa connection
- preencher `preferredSourceId` dos mangás que hoje dependem da fonte atual
- manter compatibilidade com dados legados até a transição terminar

### Regras

- nenhum mangá perde vínculo externo já existente
- o sistema continua lendo o catálogo atual normalmente
- backfill **idempotente**

### Critério de aceite

- mangás que dependem da Nexustoons continuam funcionando
- `sourceConnectionId` preenchido para vínculos migrados
- rollback viável em ambiente de teste

---

## Épico 2 — Criar módulo `extensions`

### Objetivo

Isolar lógica de extensão/plugin do resto do sistema.

### Estrutura sugerida

`src/modules/extensions/{application,domain,infrastructure,presentation}`

### Casos de uso

- `RegisterUserExtensionUseCase`
- `ValidateExtensionManifestUseCase`
- `EnableExtensionUseCase`
- `DisableExtensionUseCase`
- `BlockExtensionUseCase`
- `ListUserExtensionsUseCase`

### Regras

- extensão do usuário nasce privada; não pública por padrão; não fallback global por padrão
- ownership por `ownerUserId` ou `ownerInstallationId`
- status operacional: `active`, `disabled`, `blocked`, `error`

### Critério de aceite

- registrar extensão sem afetar catálogo público
- ownership e status estáveis
- extensão privada não contamina o produto principal

---

## Épico 3 — Criar módulo `sources`

### Objetivo

Tratar conexões concretas como primeira classe.

### Estrutura sugerida

`src/modules/sources/{application,domain,infrastructure,presentation}`

### Casos de uso

- `CreateSourceConnectionUseCase`
- `ValidateSourceConnectionUseCase`
- `ResolveSourceConnectionUseCase`
- `DisconnectSourceConnectionUseCase`
- `ListSourceConnectionsUseCase`

### Regras

`SourceConnection` representa URL/config concreta. Pode ser: oficial, parceira, externa aprovada, privada do usuário.

Se privada:

- `isUserScoped = true`
- `isPublicEligible = false`
- `isFallbackEnabled = false` globalmente
- só o dono pode usá-la

### Critério de aceite

- sistema/usuário registra connection
- ownership resolvido corretamente
- queries públicas não usam source privada

---

## Épico 4 — Runtime de provider/extensão

### Objetivo

Parar de tratar Nexustoons como “a fonte”.

### Entregas

Contrato de provider: compatibilidade com connection, validação, catálogo, detalhe, capítulos, páginas.

**Ports:** `SourceProviderPort`, `SourceProviderRegistryPort`

**Implementações:** `NexustoonsSourceProvider`, `MockSourceProvider`; futuros: `KomgaSourceProvider`, `PartnerSourceProvider`

### Regra

Nexustoons continua funcionando por trás do runtime novo.

### Critério de aceite

- connection resolve provider
- Nexustoons funciona atrás do runtime
- core não conhece detalhes da Nexustoons

---

## Épico 5 — Sync por connection

### Objetivo

Mudar de sync “fonte externa” para sync “source connection”.

### Entregas

Refatorar sync para receber: `sourceConnectionId`, contexto do dono, tipo de sync (catálogo público / biblioteca privada).

**Fluxo:** resolver connection → provider → detalhe/capítulos/páginas → persistir `Manga` e vínculo → atualizar sync state da connection e do vínculo.

### Regras

- sync fora da thread crítica; banco-primeiro
- source privada **nunca** atualiza catálogo público; sincroniza só para o dono
- sync privado = biblioteca; sync público = catálogo

### Critério de aceite

- sync por connection funciona
- sync público e privado separados
- leitura atual intacta

---

## Épico 6 — Refactor da resolução de source

### Objetivo

Definir origem/fallback de forma previsível.

### Casos de uso

- `ResolveMangaCatalogSourceUseCase`
- `ResolveMangaReadingSourceUseCase`
- `ResolveUserPreferredSourceUseCase`

### Ordem revisada

**Catálogo público**

1. source oficial Midgard  
2. source parceira  
3. melhor source global elegível (prioridade/saúde)  
4. indisponível  

**Leitura do usuário**

1. source oficial Midgard  
2. **preferência do usuário**  
3. source global preferida do mangá  
4. melhor source global elegível  
5. source privada do usuário  
6. indisponível  

Inversão intencional: escolha explícita do usuário ganha da preferred global (salvo regra futura).

### Regras

Source privada **nunca** entra em: home, trending, recommended, latest, busca pública, métricas globais, **fallback global**.

### Critério de aceite

- escolha previsível; fallback global sem source privada
- dono usa source privada
- preferência do usuário respeitada sem contaminar catálogo global

---

## Épico 7 — Refactor das queries públicas

### Objetivo

Blindar o catálogo público.

### Entregas

Revisar use cases de: home, trending, recommended, latest updates, busca pública, sync status público (se impactado), **jobs de ranking**, materializações/feed, **cache global**, **métricas globais**.

Filtro obrigatório:

- `isUserScoped = false`
- `isPublicEligible = true`
- `isActive = true`

Tudo que alimentar recommendation, ranking, popularidade, latest global, cache compartilhado também ignora source privada.

### Critério de aceite

- sources privadas não no catálogo global
- discovery não contaminado
- métricas e caches globais sem conteúdo user-scoped

---

## Épico 8 — Refactor da leitura

### Objetivo

Preservar contrato atual, mudando origem interna.

### Entregas

No `GET /chapters/:id`: manter `CheckChapterAccessUseCase`; `public` sem JWT; `coin` com JWT/unlock/VIP; obter páginas via `ResolveMangaReadingSourceUseCase`, `SourceConnection`, `SourceProvider`, `MangaExternalSource`.

### Decisão explícita sobre páginas

- **Catálogo público:** `ChapterPage` persistida normalmente.
- **Source privada do usuário:** recomendado **não** persistir em `ChapterPage` global por padrão; preferir fetch on-demand ou cache privado; se cache, chave inclui o dono.

### Critério de aceite

- contrato de leitura inalterado
- resolução interna por connection
- progresso automático permanece
- source privada não escreve páginas em storage global compartilhado

---

## Épico 9 — Extensões do usuário

### Objetivo

Permitir extensão/conexão própria.

### Entregas

- endpoints para registrar extensão e criar connection
- validação de manifest/config
- ownership por `ownerUserId` ou `ownerInstallationId`

### Regras obrigatórias

- nasce privado; não catálogo público; não monetização de catálogo; não fallback global

### Critério de aceite

- usuário registra extensão e conecta origem sem afetar catálogo global

---

## Épico 10 — Governança mínima

### Objetivo

Segurança operacional e readiness de parceiro.

### Entregas

Status em `UserExtension` e `SourceConnection`: `active`, `disabled`, `blocked`, `error`.

### Regras

- bloquear/desativar extensão; desconectar connection
- source privada: sem métricas globais; sem cache compartilhado; **nunca** `preferredSourceId` global do mangá

### Critério de aceite

- desligar extensão/conexão sem quebrar catálogo; ownership e escopo consistentes

---

## Épico 11 — Compatibilidade transitória

### Objetivo

Migração gradual sem big bang.

### Entregas

- convívio: campos legados em `Manga` + novo modelo com `SourceConnection`
- feature flag ou resolução dual se necessário
- feature nova nasce no modelo novo
- código legado pode ler espelho até migração completa

### Critério de aceite

- operação durante migração sem regressão
- modelo novo com cobertura progressiva
- remoção segura do legado depois

---

## Ordem recomendada (sprints)

| Sprint | Épicos |
|--------|--------|
| 1 | 0, 1, **1.5** |
| 2 | 2, 3 |
| 3 | 4, 5 |
| 4 | 6, 7 |
| 5 | 8, 9 |
| 6 | 10, **11** |

---

## O que não mexer agora

- Auth, Lists, Progress
- Access/coins atuais
- contratos HTTP existentes do app
- unlock completo por coin
- reativação de cota semanal

---

## Inconsistências a corrigir

### 1. `MangaExternalSource` sobrecarregada

Separar em: `UserExtension`, `SourceConnection`, `MangaExternalSource` (vínculo).

### 2. Constraints restritivas

`@@unique([mangaId, provider])` e `@@unique([provider, externalId])` — refatorar para modelo por connection.

---

## Resultado esperado

### Core estável

Manga, Chapter, ChapterPage, Lists, Progress, Access

### Extensões/providers

UserExtension, SourceProvider, SourceProviderRegistry

### Conexões

SourceConnection

### Vínculo externo

MangaExternalSource

### Resolução

source pública/privada, preferred, fallback

### Governança

público vs privado; global vs user-scoped; oficial vs parceiro vs privado

---

## Recomendação final de execução

1. schema + backfill  
2. modules foundation (extensions + sources)  
3. provider runtime  
4. sync por connection  
5. resolução pública/privada  
6. leitura  
7. extensões do usuário  
8. governança e compatibilidade transitória  
