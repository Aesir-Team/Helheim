import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EXTERNAL_MANGA_GATEWAY } from '../application/ports/external-manga-gateway.port';
import { NexustoonsMangaGateway } from './nexustoons/nexustoons-manga.gateway';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EXTERNAL_MANGA_GATEWAY,
      useClass: NexustoonsMangaGateway,
    },
  ],
  exports: [EXTERNAL_MANGA_GATEWAY],
})
export class CatalogInfrastructureModule {}
