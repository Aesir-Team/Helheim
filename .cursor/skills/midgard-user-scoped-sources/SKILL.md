# Skill: User-Scoped Sources (fontes privadas do usuário)

## Quando usar
Use ao:
- implementar “biblioteca conectada” do usuário (Komga, import local, servidor pessoal, provider privado)
- mexer em `MangaExternalSource` / fontes externas
- criar resolução de source (preferred/fallback)
- tocar em sync/ingestion envolvendo sources do usuário
- tocar em cache quando a origem pode ser privada
- tocar em queries públicas (home/busca/ranking) para garantir isolamento

## Objetivo
Permitir que um usuário conecte fontes próprias/privadas ao Midgard **sem contaminar**:
- catálogo público
- fallback global
- recommendation/trending/latest globais
- métricas globais
- monetização de conteúdo

## Definição oficial
Uma **user-scoped source** é uma origem conectada por um usuário e válida **somente** no contexto privado daquele usuário.

### Pode
- leitura pessoal
- biblioteca pessoal
- progresso
- listas
- preferência de source do próprio usuário
- sync privado do dono

### Não pode
- catálogo público
- busca pública
- home / trending / recommended / latest updates globais
- fallback global do sistema
- métricas globais do produto

## Regras de domínio obrigatórias (invariantes)

### Regra 1 — Escopo privado
- `isUserScoped = true`
- `ownerUserId != null`

### Regra 2 — Nunca pública
- `isPublicEligible = false`

### Regra 3 — Nunca fallback global
- global: `isFallbackEnabled = false`
- pode ser fallback **apenas** no contexto do dono

### Regra 4 — Resolução por dono
Uma source user-scoped **só pode** ser resolvida se:
- `source.ownerUserId === currentUserId`
Caso contrário, deve ser ignorada como se não existisse.

### Regra 5 — Isolamento de descoberta (queries públicas)
Conteúdo user-scoped **nunca entra** em:
- home feed
- busca pública
- trending / ranking / recommendation
- latest updates globais
- catálogo editorial
- feed de outros usuários

Filtro obrigatório em queries globais:
- `isUserScoped = false`
- `isPublicEligible = true`

### Regra 6 — Isolamento comercial
Conteúdo user-scoped:
- não pode ser monetizado pela plataforma
- não entra em plano premium
- não gera coin unlock

### Regra 7 — Isolamento de métricas
Conteúdo user-scoped:
- não entra em analytics globais de catálogo
- não entra em popularidade global (“mais lidos”)
- não entra em recomendação sistêmica

### Regra 8 — Isolamento de cache
Conteúdo user-scoped:
- não pode usar cache compartilhado entre usuários
- não pode gerar chave global reutilizável

Regra prática:
- se vier de user-scoped, **cache key inclui `userId`**.

Exemplo permitido:
- `chapter-pages:{userId}:{sourceId}:{chapterExternalId}`

Exemplo proibido:
- `chapter-pages:{sourceId}:{chapterExternalId}`

### Regra 9 — Isolamento de sync
Sync user-scoped:
- só pode ser disparado pelo dono
- só atualiza biblioteca privada do dono
- nunca atualiza catálogo público

### Regra 10 — Governança mínima
Source user-scoped deve poder ser:
- desativada / bloqueada / removida
- auditada minimamente (quem conectou, quando, último erro)

## Taxonomia oficial de origem

```ts
type SourceOriginType =
  | 'official'
  | 'partner'
  | 'external'
  | 'user_connected'
  | 'local_import';
```

Regra:
- se `originType` ∈ (`user_connected`, `local_import`):
  - `isUserScoped = true`
  - `isPublicEligible = false`
  - `isFallbackEnabled = false` globalmente
- se `originType` ∈ (`official`, `partner`):
  - `ownerUserId = null`

## Preferred source (regra crítica)
- `Manga.preferredSourceId` (global) **só pode apontar** para source global:
  - `isUserScoped = false`
  - `isPublicEligible = true`

Preferência privada por usuário deve ser separada:

```prisma
model UserMangaSourcePreference {
  id         String   @id @default(uuid())
  userId     String
  mangaId    String
  sourceId   String
  usageCount Int      @default(0)
  lastUsedAt DateTime @default(now())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([userId, mangaId])
}
```

## Política de resolução de source (resumo)

### Resolução global do sistema (catálogo público)
Considerar apenas sources:
- `isActive = true`
- `isPublicEligible = true`
- `isFallbackEnabled = true`
- `isUserScoped = false`

### Resolução no contexto do usuário autenticado
Ordem sugerida:
1) source oficial do Midgard  
2) preferred source global elegível  
3) preferred source privada do usuário  
4) melhor source global elegível  
5) erro de indisponibilidade

Regra crítica:
Source user-scoped só entra se:
- request for do dono (`ownerUserId === currentUserId`)
- a obra estiver no contexto/biblioteca dele

## Checklist de segurança (sempre)
- source tem `ownerUserId` quando `isUserScoped`?
- source user-scoped está fora de queries públicas?
- source user-scoped não entra em fallback global?
- não usa cache compartilhado (cache key inclui userId)?
- não entra em monetização (assinatura/coins)?
- não pode virar `preferredSource` global do mangá?

