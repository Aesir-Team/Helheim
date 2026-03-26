# Guia de modificações no frontend — alinhado ao refactor Midgard (core-api)

Este documento resume **o que o app precisa fazer hoje**, **o que preparar sem mudar API ainda**, e **o que virá** quando os épicos do plano expuserem novos contratos. Base: `PLANO-REFATORACAO-COMPLETO.md`, fases `00–08` e entregas já feitas no backend (modelagem hub, resolução de source, público/privado, isolamento de provider).

---

## 1. Princípio geral

- **Regra de ouro do refactor:** o runtime atual da API deve ser preservado enquanto o modelo evolui por baixo (`refactor/00-runtime-freeze.md`, `docs/RUNTIME-VIGENTE-MVP.md`).
- **Implicação para o frontend:** não é obrigatório “quebrar” o app agora; a maioria das mudanças abaixo é **defensiva** ou **futura**.
- **Catálogo público ≠ biblioteca do usuário:** no futuro, listas de discovery (home, busca, trending) só refletem conteúdo **público elegível**; conteúdo de fonte conectada pelo usuário vive em fluxos **privados** (outras telas / endpoints).

---

## 2. O que já mudou no backend e impacta o frontend

### 2.1 Contratos HTTP principais (MVP)

- **Sem mudança intencional** nos contratos de: registro/login, listagem de mangás, detalhe por slug, capítulos, leitura (`public` / `coin`), listas, progresso.
- **JWT opcional** em algumas rotas de catálogo: token **inválido** deve ser tratado como **401** (não como “anônimo”). Garanta que o cliente não reutilize token corrompido em loop silencioso.

### 2.2 Catálogo público mais “estrito” (já em produção no código)

O repositório de mangás aplica escopo de **catálogo público**:

- Mangá **com** linhas em `manga_external_sources` só aparece em **listagem**, **listBySlugs** (ex.: ordem do trending após ingestão) e **GET detalhe público** se existir **pelo menos uma** fonte com:
  - `isUserScoped = false`
  - `isPublicEligible = true`
  - `isActive = true`
- Mangá **sem** nenhuma linha no hub continua listável (legado Nexustoons / só tabela `mangas`).

**O que fazer no frontend**

- Tratar **404** em `GET /mangas/:slug` e lista vazia como cenários normais se no futuro existirem títulos só privados.
- Não assumir que “todo mangá que existe no banco” aparece na home/busca.

### 2.3 Sync em background

- Se a resolução de source (contexto público) concluir que **não há fonte elegível** no hub, o sync pode marcar erro **sem** chamar a API externa. A UI de **status de sync** (se existir) pode mostrar estado de erro sem páginas novas — comportamento esperado.

### 2.4 Cota semanal

- **Fora do runtime atual.** Não implementar UI nem cliente para limite semanal até um “Access v2” explícito.

---

## 3. O que ainda não tem endpoint dedicado (mas o modelo já existe)

Campos/tabelas já no schema (fase 1) que **ainda não viram feature completa na API** para o app:

- `Manga.preferredSourceId` (global, nunca user-scoped).
- `MangaExternalSource` (hub: origem, escopo, saúde, prioridade, etc.).
- `UserMangaSourcePreference` (preferência por usuário/mangá).

**O que fazer no frontend agora**

- **Nada obrigatório**, salvo documentar tipos futuros se usarem gerador OpenAPI.
- **Preparar mental model:** “slug canônico do Midgard” continua sendo a chave de navegação; “provider + externalId” é detalhe de hub (virá para admin / settings / debug antes do usuário final).

---

## 4. Preparação recomendada (sem esperar novas rotas)

### 4.1 Separação conceitual na UI

- **Discovery:** home, busca, recomendados, últimas atualizações → tratar como **só catálogo público**.
- **Biblioteca / “minhas fontes”** (futuro): telas separadas; não misturar cards de Komga/import com grid da home global.

### 4.2 Identidade para fontes privadas (futuro)

- O plano prevê **`ownerUserId` ou `ownerInstallationId`** para quem não tem conta. Se o produto usar instalação anônima, o cliente precisará de estratégia estável de **`installationId`** (persistido no device, rotação, LGPD) — alinhar com backend quando o endpoint existir.

### 4.3 Cache e analytics

- Qualquer cache em memória/disk keyed só por `slug` ou `mangaId` pode colidir quando o mesmo título tiver **origens diferentes** por usuário. Futuro: chaves devem incluir **usuário** (e talvez **sourceId**) para dados não públicos.
- Eventos de analytics globais (trending, “mais lidos” global) não devem misturar leitura vinda de **fonte privada** — regra de produto; o backend filtra discovery; o app deve evitar enviar esses eventos como globais se a tela for “biblioteca privada”.

### 4.4 Tratamento de erros

- Prever mensagem amigável quando a API retornar erro de **fonte indisponível** / **adapter não registrado** (futuro, outros providers): não hardcodar “Nexustoons caiu” como única cópia.

---

## 5. Mudanças futuras (quando os épicos do plano chegarem na API)

Estas são **prováveis** quando existirem módulos `extensions`, `sources`, sync por `SourceConnection`, etc. Ajuste o roadmap do app conforme os tickets forem fechando.

| Área | Provável no backend | Impacto no frontend |
|------|---------------------|---------------------|
| Conexões / extensões | CRUD de `SourceConnection`, status `active/disabled/blocked/error` | Telas de “Conectar Komga / import / extensão”, listagem de conexões, indicadores de erro |
| Preferência de leitura | APIs em cima de `UserMangaSourcePreference` | Seletor “de onde ler este título” (só para o dono); não afeta cards públicos |
| Sync | Sync **catalog** vs **private library** | Jobs/indicadores distintos; texto claro “atualizando sua biblioteca” vs “catálogo” |
| Leitura | Mesmo `GET /chapters/:id` por fora; resolução interna por connection | Pouca mudança de contrato; possível metadado extra (origem) no futuro |
| Governança / parceiro | `originType`, `official` / `partner`, `Partner` | Badges “Oficial”, “Parceiro”, filtros editoriais |
| Feature flags | Convívio legado + modelo novo (`Épico 11`) | Flags no cliente para ligar telas de connections antes do rollout geral |

O **Épico 6** do plano revisa a **ordem de resolução** na leitura (preferência do usuário pode ganhar da preferida global do mangá). Quando isso for implementado de ponta a ponta, a UI de “fonte preferida” passa a ter efeito direto na leitura — alinhar com o documento de produto da época.

---

## 6. Checklist rápido para o time de frontend

- [ ] Confirmar tratamento de **401** com Bearer inválido nas rotas de catálogo com JWT opcional.
- [ ] Não depender de “mangá sempre listável” se o produto for introduzir **apenas** fontes privadas para alguns títulos.
- [ ] Separar mentalmente **discovery global** vs **biblioteca do usuário** na arquitetura de navegação/estado.
- [ ] Planejar **`installationId`** se houver roadmap de usuário sem conta + fonte privada.
- [ ] Evitar cache global sem `userId` para dados que possam vir de **source privada** no futuro.
- [ ] Acompanhar **OpenAPI/Swagger** do core-api quando saírem endpoints de connections/preferences — gerar tipos e telas a partir do contrato real.

---

## 7. Referências no repositório

- Runtime congelado: `docs/RUNTIME-VIGENTE-MVP.md`, `refactor/00-runtime-freeze.md`
- Modelo hub: `refactor/01-modelagem-minima.md`
- Resolução: `refactor/02-source-resolution.md`
- Público/privado: `refactor/03-public-vs-private.md`
- Provider: `refactor/04-provider-isolation.md`
- Plano completo: `refactor/PLANO-REFATORACAO-COMPLETO.md`

---

*Documento orientado a produto/engineering; não substitui o Swagger nem contratos gerados. Atualizar quando novos endpoints forem mergeados.*
