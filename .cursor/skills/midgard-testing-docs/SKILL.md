# Skill: Midgard Testing & Docs

## Quando usar
Use sempre que tocar em:
- use case
- controller
- adapter
- regra de negócio
- contrato HTTP

## Processo obrigatório
1. BDD
2. teste falhando
3. implementação mínima
4. refatoração
5. docs/Swagger atualizados

## Estratégia de testes

### Use cases
- unitários
- ports mockadas/fakes
- sem Prisma real

### Adapters
- testar implementação do port
- mockar HTTP/Redis quando possível
- usar integração real só quando necessário

### Controllers
- integração leve ou e2e
- validar DTO, auth e status HTTP

### Mappers
- teste unitário puro

## Docs obrigatórias
Se mudou contrato:
- atualizar Swagger
- atualizar docs em `docs/`
- manter OpenAPI coerente

## Definition of Done
- teste cobrindo o comportamento
- sem `any`
- Swagger alinhado
- doc alinhada
- sem conflito com regra global do projeto

