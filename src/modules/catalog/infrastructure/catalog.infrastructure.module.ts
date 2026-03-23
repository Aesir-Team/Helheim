import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EXTERNAL_MANGA_GATEWAY } from '../application/ports/external-manga-gateway.port';
import { MANGA_SYNC_PROGRESS } from '../application/ports/manga-sync-progress.port';
import { NexustoonsMangaGateway } from './nexustoons/nexustoons-manga.gateway';
import { MangaSyncProgressService } from './redis/manga-sync-progress.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EXTERNAL_MANGA_GATEWAY,
      useClass: NexustoonsMangaGateway,
    },
    MangaSyncProgressService,
    {
      provide: MANGA_SYNC_PROGRESS,
      useExisting: MangaSyncProgressService,
    },
  ],
  exports: [EXTERNAL_MANGA_GATEWAY, MANGA_SYNC_PROGRESS],
})
export class CatalogInfrastructureModule {}
