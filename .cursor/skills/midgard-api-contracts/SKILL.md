# Skill: Midgard API Contracts

## Quando usar
Use ao:
- criar endpoint
- alterar DTO
- ajustar auth de rota
- mexer em status HTTP
- revisar Swagger/OpenAPI

## Fonte de verdade
Para HTTP atual, respeitar primeiro:
- comportamento real implementado
- `API-ROTAS-MVP.md`
- `API-MVP-DETALHADA.md`

## Regras obrigatórias

### 1. Prefixos
- recursos REST: `/api/v1`
- docs: `/docs`
- OpenAPI JSON: `/api-json`

### 2. Auth
- rotas JWT obrigatórias exigem Bearer válido
- rotas com JWT opcional:
  - sem header => modo anônimo
  - Bearer inválido => 401

### 3. Erros
Documentar e manter consistência:
- 400 validação
- 401 auth
- 403 acesso negado com `reason` quando aplicável
- 404 recurso inexistente
- 409 conflito de negócio

### 4. Capítulos
Preservar contratos:
- `GET /mangas/:slug/chapters`
- `GET /mangas/:slug/chapters/by-number/:number`
- `GET /chapters/:id`

Comportamentos atuais:
- lista mostra capítulos publicados
- `isLocked`, `isRead`, `isNew` são enriquecidos conforme JWT
- leitura `coin` sem unlock => 403
- leitura `public` sem JWT é permitida

### 5. Progress
- `GET /users/me/reading-progress`
- `PATCH /users/me/reading-progress`
- upsert por `(userId, mangaId)`
- idempotência obrigatória

### 6. Lists
- ownership estrito
- cuidado com ordem de rotas como `PATCH /reorder` antes de `PATCH /:listId`

## Swagger obrigatório
Toda mudança de rota exige:
- `@ApiTags`
- `@ApiOperation`
- `@ApiResponse` de sucesso
- `@ApiResponse` de erro
- `@ApiBearerAuth('Bearer')` quando aplicável
- DTOs com `@ApiProperty`

## Checklist
Antes de finalizar:
- rota está coerente com docs atuais?
- erro 401/403 está correto?
- DTO request/response foi atualizado?
- OpenAPI continua refletindo o comportamento real?

