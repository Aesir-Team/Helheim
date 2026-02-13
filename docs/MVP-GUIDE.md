# Guia MVP – Midgard Core API

Escopo mínimo, Clean Architecture, SOLID e boas práticas para evoluir o projeto de forma profissional.

---

## 1. Escopo do MVP

### O que entra no MVP (primeira entrega)

| Área | Funcionalidade | Prioridade |
|------|----------------|------------|
| **Auth** | Registro (email/senha) + Login (JWT) | P0 |
| **Auth** | Perfil do usuário (leitura + atualização básica) | P0 |
| **Catálogo** | Listar mangás (paginação, filtros básicos) | P0 |
| **Catálogo** | Detalhe do mangá (com capítulos) | P0 |
| **Catálogo** | Detalhe do capítulo (páginas) | P0 |
| **Catálogo/Sync** | Buscar mangá no banco primeiro; se não achar, fallback: scrape na API de terceiros, persistir e retornar. Se já existir, sync 1x/dia em background (primeiro que abrir) | P0 |
| **Acesso** | Regra: usuário pode ler/baixar X capítulos/semana (plano gratuito) ou ilimitado (assinante) | P0 |
| **Acesso** | Bloquear leitura e download quando limite semanal atingido | P0 |
| **Listas** | CRUD de listas do usuário (nome livre) | P1 |
| **Listas** | Adicionar/remover mangá da lista | P1 |
| **Progresso** | Salvar/retornar progresso (capítulo + página) ao ler | P1 |
| **Progresso** | “Continuar lendo” (último mangá/capítulo) | P1 |

### O que fica para depois do MVP

- Assinatura paga (checkout, webhook Mercado Pago)
- Coins (anúncios, desbloqueio por coins)
- Notificações, denúncias, admin
- Busca avançada, recomendação

---

## 2. Clean Architecture no NestJS

### Camadas e responsabilidades

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION (Controllers, DTOs, Guards, Pipes)                 │
│  → Recebe HTTP, valida input, chama Application, formata output │
├─────────────────────────────────────────────────────────────────┤
│  APPLICATION (Use Cases, Ports)                                  │
│  → Orquestra regras de negócio, usa apenas interfaces (ports)   │
├─────────────────────────────────────────────────────────────────┤
│  DOMAIN (Entities, Value Objects, Domain Services)              │
│  → Entidades puras, regras de negócio centrais, zero deps       │
├─────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE (Adapters: Prisma, HTTP Client, Queue)           │
│  → Implementa ports (repositórios, gateways), detalhes técnicos  │
└─────────────────────────────────────────────────────────────────┘
```

**Regra de dependência:** dependências apontam sempre para dentro (Presentation → Application → Domain; Infrastructure implementa interfaces definidas em Application/Domain).

### Estrutura de pastas sugerida

```
src/
├── main.ts
├── app.module.ts
│
├── shared/                    # Código transversal (não é domínio)
│   ├── domain/                # Value objects, erros de domínio reutilizáveis
│   │   ├── value-objects/
│   │   └── errors/
│   └── infrastructure/
│       └── ...
│
├── modules/
│   ├── auth/
│   │   ├── application/       # Use cases + ports
│   │   │   ├── ports/
│   │   │   │   ├── user.repository.port.ts
│   │   │   │   └── token.service.port.ts
│   │   │   ├── use-cases/
│   │   │   │   ├── register-user.use-case.ts
│   │   │   │   └── login.use-case.ts
│   │   │   └── auth.module.ts
│   │   ├── domain/            # Entidades e regras do domínio Auth
│   │   │   └── entities/
│   │   ├── infrastructure/    # Adapters (Prisma, JWT)
│   │   │   ├── persistence/
│   │   │   └── auth.module.ts
│   │   └── presentation/
│   │       ├── controllers/
│   │       ├── dto/
│   │       └── guards/
│   │
│   ├── catalog/               # Mangás, capítulos, categorias
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   ├── manga.repository.port.ts
│   │   │   │   ├── chapter.repository.port.ts
│   │   │   │   └── external-manga.gateway.port.ts
│   │   │   └── use-cases/
│   │   │       ├── list-mangas.use-case.ts
│   │   │       ├── get-manga-by-slug.use-case.ts
│   │   │       ├── get-chapter.use-case.ts
│   │   │       └── sync-manga-from-source.use-case.ts
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── presentation/
│   │
│   ├── access/                # Regras de “pode ler/baixar?” (limite semanal, VIP)
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   ├── subscription.repository.port.ts
│   │   │   │   └── chapter-access.repository.port.ts
│   │   │   └── use-cases/
│   │   │       ├── check-chapter-access.use-case.ts
│   │   │       └── consume-weekly-chapter.use-case.ts
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── presentation/
│   │
│   ├── lists/                 # Listas do usuário (UserMangaList)
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── use-cases/
│   │   │       ├── create-list.use-case.ts
│   │   │       ├── add-manga-to-list.use-case.ts
│   │   │       └── list-user-lists.use-case.ts
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── presentation/
│   │
│   └── progress/              # ReadingProgress, “continuar lendo”
│       ├── application/
│       │   ├── ports/
│       │   └── use-cases/
│       │       ├── save-reading-progress.use-case.ts
│       │       └── get-continue-reading.use-case.ts
│       ├── domain/
│       ├── infrastructure/
│       └── presentation/
```

Cada módulo pode ter seu `*.module.ts` na camada de aplicação (onde registra use cases e ports) e outro na infra (onde registra adapters concretos com `PrismaService` etc.).

---

## 3. SOLID aplicado ao projeto

### S – Single Responsibility

- **Use case:** uma classe por fluxo (ex.: `RegisterUserUseCase` só registra; `LoginUseCase` só faz login).
- **Repository:** uma interface por agregação (ex.: `MangaRepositoryPort` só persiste/consulta mangá; não misturar com “enviar email”).
- **Controller:** só recebe request, chama um use case e devolve response; sem lógica de negócio.

### O – Open/Closed

- Novos comportamentos de “acesso” (ex.: “pode ler por coins”) = novo use case ou nova estratégia que implementa uma interface (ex.: `ChapterAccessPolicy`), sem alterar as existentes.
- Novos gateways (outra API de mangá) = nova implementação de `ExternalMangaGatewayPort`, sem mudar use case de sync.

### L – Liskov Substitution

- Qualquer implementação de `MangaRepositoryPort` (Prisma, in-memory para teste) deve ser substituível sem quebrar o use case.
- Testes: usar repositórios fake/mock que implementam as mesmas ports.

### I – Interface Segregation

- Ports pequenos e focados: ex. `GetMangaBySlugPort` com um método `getBySlug(slug)`, em vez de um “repositório gigante” com dezenas de métodos.
- Cliente (use case) depende só da interface que usa.

### D – Dependency Inversion

- Use cases dependem de **abstrações** (ports), não de Prisma ou HTTP.
- No NestJS: `@Inject(MANGA_REPOSITORY) private readonly mangaRepo: MangaRepositoryPort`.
- A implementação concreta (adapter Prisma) é registrada no módulo de infra e injetada pelo container.

---

## 4. Use cases (lista objetiva)

### Auth

| Use case | Entrada | Saída | Responsabilidade |
|----------|---------|--------|-------------------|
| RegisterUser | email, password, firstName, lastName | User + token ou erro | Validar email único, hash da senha, criar User, emitir token |
| Login | email, password | token ou erro | Validar credenciais, emitir JWT |
| GetProfile | userId (do token) | User (sem senha) | Buscar usuário autenticado |
| UpdateProfile | userId, payload parcial | User atualizado | Atualizar nome, etc. (sem trocar senha aqui) |

### Catalog

| Use case | Entrada | Saída | Responsabilidade |
|----------|---------|--------|-------------------|
| ListMangas | filters, pagination | { data: Manga[], total } | Listar com filtros (status, type, busca), paginado |
| GetMangaBySlug | slug, userId? | Manga + chapters (resumo) + “já na lista X?” | Detalhe do mangá; se userId, verificar listas e progresso |
| GetChapter | chapterId, userId? | Chapter + pages + “pode acessar?” | Retornar capítulo e páginas; delegar “pode acessar?” ao módulo Access |
| SyncMangaFromSource | mangaId (ou slug) | void | Verificar lastSyncedAt + syncStatus; se precisar sync, chamar gateway externo, atualizar BD e lastSyncedAt |

### Access

| Use case | Entrada | Saída | Responsabilidade |
|----------|---------|--------|-------------------|
| CheckChapterAccess | userId, chapterId | { allowed: boolean, reason? } | Verificar plano (limite semanal vs ilimitado), contar acessos (ler/baixar) na semana, retornar se pode ou não |
| ConsumeWeeklyChapterAccess | userId, chapterId | void | Registrar UserChapterWeekAccess para a semana atual (ler ou baixar; só chamar se CheckChapterAccess permitir) |

### Lists

| Use case | Entrada | Saída | Responsabilidade |
|----------|---------|--------|-------------------|
| CreateList | userId, name | UserMangaList | Criar lista com nome; opcional sortOrder |
| ListUserLists | userId | UserMangaList[] (com contagem de itens / mangasReadCount) | Listar listas do usuário |
| AddMangaToList | userId, listId, mangaId | void ou erro | Validar dono da lista, adicionar item (unique listId+mangaId) |
| RemoveMangaFromList | userId, listId, mangaId | void | Remover item; atualizar mangasReadCount se usar cache |
| GetListWithMangas | userId, listId | List + items (mangás) + progresso por mangá | Para tela “minha lista” com “X capítulos lidos” por mangá |

### Progress

| Use case | Entrada | Saída | Responsabilidade |
|----------|---------|--------|-------------------|
| SaveReadingProgress | userId, mangaId, chapterId, pageNumber | void | Upsert ReadingProgress (chaptersReadCount pode ser derivado ou incrementado conforme regra) |
| GetContinueReading | userId | ReadingProgress[] (ordenado por lastReadAt, limit 1 ou N) | Para “continuar lendo” na home |

---

## 5. Ports (interfaces) principais

Definir em `application/ports` e implementar em `infrastructure`:

```ts
// Exemplo: catalog/application/ports/manga.repository.port.ts
export interface MangaRepositoryPort {
  findMany(args: FindManyMangasArgs): Promise<Paginated<Manga>>;
  findBySlug(slug: string): Promise<Manga | null>;
  findById(id: string): Promise<Manga | null>;
  save(manga: MangaAggregate): Promise<Manga>;
  updateSyncState(id: string, data: { lastSyncedAt?: Date; syncStatus?: string; lastSyncError?: string | null }): Promise<void>;
}

// Exemplo: catalog/application/ports/external-manga.gateway.port.ts
export interface ExternalMangaGatewayPort {
  fetchBySlug(slug: string): Promise<ExternalMangaDto>;
  fetchChapters(externalMangaId: string): Promise<ExternalChapterDto[]>;
}
```

Access, Lists e Progress seguem o mesmo padrão: port por repositório ou serviço externo, use cases recebendo apenas essas abstrações.

---

## 6. Fluxo de dados do catálogo: banco primeiro, scrape como fallback

**Regra:** sempre buscar no **banco de dados** primeiro. Se não achar, **fallback** = scrape na API de terceiros, persistir e retornar. Fonte de verdade = nosso BD.

### 6.1 GET /mangas/:slug
- Controller chama `GetMangaBySlugUseCase`.
   - Use case:
     - **Buscar no banco:** `MangaRepositoryPort.findBySlug(slug)`.
     - **Se encontrou:** retornar mangá + capítulos (resumo). Em paralelo (background): se `lastSyncedAt` for anterior ao início do dia e `syncStatus === 'idle'`, disparar `SyncMangaFromSourceUseCase` (1x/dia).
     - **Se não encontrou (fallback):** chamar `SyncMangaFromSourceUseCase`: buscar na API de terceiros pelo slug, persistir mangá + capítulos no BD; retornar o mangá recém-persistido (ou 404 se a API externa também não tiver).
     - Resumo: **sempre prioriza o BD**; scrape só quando falta dado ou para refresh diário.
### 6.2 GET /chapters/:id (ler/baixar capítulo)
- Controller chama `GetChapterUseCase`. Busca capítulo e páginas; se não existir, 404. Chama `CheckChapterAccessUseCase`; se não permitido, 403. Se permitido, chama `ConsumeWeeklyChapterAccessUseCase` e retorna capítulo + páginas.

**Resumo:** banco primeiro; se não achar, scrape (fallback) e persiste; limite semanal nos use cases de Access.

---

## 7. Otimizações e boas práticas

### Performance

- **Paginação:** sempre limit/offset ou cursor em listagens (ex.: list mangás, capítulos).
- **Índices:** usar os que já existem no schema (slug, lastSyncedAt, userId+weekStart, etc.) e evitar filtros em colunas não indexadas.
- **Sync em background:** não fazer scrape na thread da request; usar fila (Bull/BullMQ com Redis) ou pelo menos `setImmediate`/job em processo.
- **Leitura de capítulo:** retornar só `id`, `pageNumber`, `imageUrl` das páginas; evitar payload gigante.

### Consistência

- **Transações:** operações que alteram mais de uma entidade (ex.: consumir acesso + criar UserChapterWeekAccess + atualizar ReadingProgress) em uma transação Prisma.
- **Idempotência:** `ConsumeWeeklyChapterAccess` e “registrar progresso” devem ser idempotentes (unique constraint + upsert).

### Segurança

- **Auth:** JWT em HTTP-only cookie ou header; refresh token opcional no MVP.
- **Autorização:** em todo use case que recebe `userId`, validar se o recurso pertence ao usuário (ex.: listas, progresso).
- **Rate limit:** por IP e por usuário em login e em endpoints pesados (ex.: sync).

### Testes

- **Unit:** use cases com repositórios/gateways mockados; testar regras de acesso (limite semanal, VIP).
- **Integration:** controllers + use cases reais + Prisma em memória (ou SQLite) para fluxos críticos (registro, login, abrir capítulo).
- **E2E:** poucos cenários (ex.: login → listar mangás → abrir capítulo) para validar pipeline.

### Observabilidade

- **Logs:** um logger por camada (ou por módulo); em produção, nível info e error.
- **Métricas:** contagem de requests por rota, latência; opcionalmente contagem de sync por dia.
- **Tracing:** em fase posterior, request id em todo o fluxo.

---

## 8. Ordem sugerida de implementação

1. **Estrutura base**
   - Criar pastas por módulo (auth, catalog, access, lists, progress) com application/domain/infrastructure/presentation.
   - Configurar injeção de dependência por módulo (NestJS modules + providers para ports/adapters).

2. **Auth**
   - Domain: User (pode ser só tipo/interface no início).
   - Ports: UserRepositoryPort, TokenServicePort (ou HashServicePort).
   - Use cases: RegisterUser, Login, GetProfile.
   - Adapters: PrismaUserRepository, JwtTokenService.
   - Controller + DTOs + Guard JWT.

3. **Catalog**
   - Ports: MangaRepositoryPort, ChapterRepositoryPort, ExternalMangaGatewayPort.
   - Use cases: ListMangas, GetMangaBySlug, GetChapter, SyncMangaFromSource.
   - Adapters: Prisma repositórios + HttpClient ou adapter para Nexustoons.
   - Controllers + DTOs; em GetMangaBySlug, chamar sync em background quando necessário.

4. **Access**
   - Ports: SubscriptionRepositoryPort (ou PlanRepositoryPort), ChapterAccessRepositoryPort (para UserChapterWeekAccess).
   - Use cases: CheckChapterAccess, ConsumeWeeklyChapterAccess.
   - Integrar em GetChapter: só retornar páginas se CheckChapterAccess permitir e após Consume.

5. **Lists**
   - Use cases e repositórios para listas + itens; atualizar mangasReadCount quando houver progresso (ou derivar na leitura).

6. **Progress**
   - SaveReadingProgress, GetContinueReading; integrar “continuar lendo” na home ou no perfil.

7. **Polish**
   - Filtros e ordenação em list mangás, tratamento de erros padronizado (filters, DTOs), documentação (Swagger) e README com como rodar o MVP.

---

## 9. Checklist MVP

- [x] Estrutura de pastas Clean Architecture por módulo
- [x] Auth: registro, login, perfil (leitura + atualização)
- [ ] Catalog: listar mangás, detalhe mangá, detalhe capítulo
- [ ] Sync: 1x/dia ao primeiro acesso, com lastSyncedAt + syncStatus
- [ ] Access: limite semanal de capítulos (ler/baixar) + bloqueio quando atingido
- [ ] Listas: CRUD listas, adicionar/remover mangá
- [ ] Progresso: salvar e “continuar lendo”
- [ ] Use cases com ports; repositórios e gateways como adapters
- [ ] Testes unitários nos use cases de acesso e auth
- [ ] Documentação da API (Swagger) e README atualizado

Com isso você tem um MVP bem delimitado, alinhado a Clean Architecture e SOLID, pronto para evoluir com pagamentos, coins e mais funcionalidades sem refatoração pesada.
