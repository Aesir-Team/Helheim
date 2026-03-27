import { Module } from '@nestjs/common';

/**
 * Boundary inicial de `ingestion`.
 * Sync permanece no catálogo por ora (compatibilidade), mas o módulo já existe
 * como ponto de migração para flows de ingestão.
 */
@Module({})
export class IngestionApplicationModule {}
