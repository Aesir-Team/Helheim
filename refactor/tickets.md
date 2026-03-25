# Backlog macro (alinhado ao plano final revisado)

## Ticket 1 — Schema + backfill (Épicos 1 + 1.5)

### Escopo

- migration: `UserExtension`, `SourceConnection`, `UserMangaSourcePreference`
- `Manga.preferredSourceId` (global, nunca user-scoped)
- `MangaExternalSource` → vínculo com `sourceConnectionId`
- ownership: `ownerUserId` / `ownerInstallationId` onde aplicável
- **SourceConnection global padrão Nexustoons** + backfill idempotente dos vínculos atuais
- preencher `preferredSourceId` onde a fonte atual era implícita
- manter campos legados em `Manga` durante transição

### Critérios de aceite

- migrations sobem; rollback testável
- nenhum mangá perde vínculo; catálogo continua legível
- `sourceConnectionId` preenchido nos vínculos migrados
- `preferredSourceId` nunca aponta para source privada

---

## Ticket 2 — Módulos `extensions` + `sources` (Épicos 2 + 3)

### Escopo

- `src/modules/extensions` e `src/modules/sources` com use cases listados no plano
- regras: extensão/connection privada nasce isolada; queries públicas não veem user-scoped

### Critérios de aceite

- registrar extensão e connection sem contaminar discovery público
- ownership resolvido (`userId` ou `installationId`)

---

## Ticket 3 — Provider runtime + sync por connection (Épicos 4 + 5)

### Escopo

- `SourceProviderPort`, `SourceProviderRegistryPort`, `NexustoonsSourceProvider`, mock
- sync recebe `sourceConnectionId`, dono, tipo (catálogo vs biblioteca privada)
- estados de sync em connection + vínculo

### Critérios de aceite

- core sem detalhes Nexustoons
- sync assíncrono e banco-primeiro preservados
- sync privado não altera catálogo público

---

## Ticket 4 — Resolução + queries públicas + leitura (Épicos 6 + 7 + 8)

### Escopo

- `ResolveMangaCatalogSourceUseCase`, `ResolveMangaReadingSourceUseCase`, `ResolveUserPreferredSourceUseCase`
- ordem de leitura: preferência do usuário **antes** da preferred global do mangá (conforme plano)
- blindar home, busca, trending, recommended, latest, jobs, feeds, cache e métricas globais
- leitura: mesma API; páginas de source privada sem contaminar `ChapterPage` global (on-demand / cache por dono)

### Critérios de aceite

- fallback global sem source privada
- caches/métricas globais sem user-scoped
- contrato `GET /chapters/:id` inalterado

---

## Ticket 5 — Extensões do usuário + governança + compat (Épicos 9 + 10 + 11)

### Escopo

- endpoints de extensão + connection (quando expuser API)
- status `active` / `disabled` / `blocked` / `error`
- feature flag ou dual-path durante migração; features novas só no modelo novo

### Critérios de aceite

- desligar extensão/connection sem quebrar catálogo
- transição sem regressão; legado removível com segurança depois
