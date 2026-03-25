# Fase 2 — Introduzir resolução de source

## Objetivo
Parar de espalhar a lógica “usa Nexustoons” pelo core e centralizar a escolha de origem.

## Entregas
- Criar `SourceResolverService` **ou** `ResolveMangaSourceUseCase`
- Criar estratégia de resolução para:
  - catálogo público
  - leitura do usuário autenticado
  - usuário sem conta via `installationId` (se aplicável)

## Ordem sugerida de resolução
1) `preferredSourceId` global do mangá (se elegível)  
2) source oficial elegível  
3) source preferida do usuário (privada)  
4) melhor source global ativa por prioridade/health  
5) erro de indisponibilidade  

## Regras
- source user-scoped **nunca** entra na resolução pública
- source user-scoped só é elegível se `ownerUserId` ou `ownerInstallationId` bater
- `preferredSourceId` global do `Manga` **nunca** pode apontar para source privada

## Não trocar ainda
- endpoints públicos continuam chamando os mesmos use cases
- a resolução nova entra “por trás” deles (mudança interna, sem quebrar contratos)

