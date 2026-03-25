# Fase 4 — Isolar o gateway atual como provider formal

## Objetivo
Transformar Nexustoons em implementação de provider, não em “a fonte do produto”.

## Entregas
- Manter `ExternalMangaGatewayPort`, mas criar uma camada acima:
  - `SourceAdapter`
  - `SourceAdapterResolver`
- Mover decisões específicas de provider para a borda
- Deixar `NexustoonsMangaGateway` como adapter de uma source do tipo `external`

## Resultado
- Trocar provider no futuro fica fácil
- Criar provider parceiro ou Komga fica natural

