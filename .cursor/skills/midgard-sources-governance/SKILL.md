# Skill: Midgard Sources & Governance

## Quando usar
Use ao:
- generalizar `ExternalMangaGatewayPort`
- criar suporte a múltiplas fontes
- preparar provider oficial
- separar catálogo público de conteúdo privado
- preparar o Midgard para parceiros

## Objetivo
Transformar Midgard em hub de providers sem perder governança.

## Modelo alvo

### Tipos de origem
- `OFFICIAL_PARTNER`
- `MIDGARD_DIRECT`
- `LICENSED_PROVIDER`
- `USER_CONNECTED`
- `LOCAL_IMPORT`

### Escopos
- catálogo público
- biblioteca privada do usuário
- parceiro oficial
- provider externa aprovada

## Regras

### 1. Toda origem precisa ser classificada
Nenhuma source entra “solta”.

### 2. Provider não implica elegibilidade pública
Só porque uma source existe, não significa que seu conteúdo entra em:
- home
- busca pública
- recommendation
- trending

### 3. Midgard normaliza tudo
Dados externos devem ser convertidos para modelos internos antes de persistir.

### 4. Conteúdo do usuário fica isolado
Komga/imports/biblioteca do usuário não devem contaminar o catálogo público.

## Estruturas sugeridas

### `ContentSource`
Campos recomendados:
- `id`
- `slug`
- `name`
- `type`
- `originClass`
- `trustLevel`
- `licenseStatus`
- `visibilityMode`
- `isPublicEligible`
- `priority`
- `isEnabled`

### `SourceAdapter`
Contrato sugerido:
- `search`
- `getTitle`
- `getChapters`
- `getPages`
- `getLatest?`

### `SourceAdapterResolver`
Resolve adapter por source.

### `IngestionPolicy`
Decide:
- pode ingerir?
- pode publicar?
- pode indexar?
- pode aparecer na home?

## Regras práticas de migração
- manter Nexustoons atrás de adapter formal
- não espalhar lógica Nexustoons em use cases centrais
- preparar `MangaExternalSource` para virar vínculo de origem mais robusto
- introduzir `sources` e `ingestion` como módulos dedicados quando possível

## Anti-padrões
- um provider alimentando tudo sem classificação
- lógica de confiança dentro do controller
- usar “fonte atual” como identidade do sistema

