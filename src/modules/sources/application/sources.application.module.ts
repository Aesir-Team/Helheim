import { Module } from '@nestjs/common';

/**
 * Boundary inicial de `sources` para migração gradual.
 * Reusa providers/ports já existentes no catálogo enquanto os use cases
 * dedicados de sources são extraídos nas próximas fases.
 */
@Module({})
export class SourcesApplicationModule {}
