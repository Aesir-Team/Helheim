import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EXTERNAL_MANGA_GATEWAY } from '../application/ports/external-manga-gateway.port';
import { SOURCE_ADAPTER_RESOLVER } from '../application/ports/source-adapter-resolver.port';
import { MANGA_SYNC_PROGRESS } from '../application/ports/manga-sync-progress.port';
import { DefaultSourceAdapterResolver } from './adapters/default-source-adapter.resolver';
import { NexustoonsMangaGateway } from './nexustoons/nexustoons-manga.gateway';
import { MangaSyncProgressService } from './redis/manga-sync-progress.service';

@Module({
  imports: [ConfigModule],
  providers: [
    NexustoonsMangaGateway,
    {
      provide: EXTERNAL_MANGA_GATEWAY,
      useExisting: NexustoonsMangaGateway,
    },
    {
      provide: SOURCE_ADAPTER_RESOLVER,
      useClass: DefaultSourceAdapterResolver,
    },
    MangaSyncProgressService,
    {
      provide: MANGA_SYNC_PROGRESS,
      useExisting: MangaSyncProgressService,
    },
  ],
  exports: [EXTERNAL_MANGA_GATEWAY, SOURCE_ADAPTER_RESOLVER, MANGA_SYNC_PROGRESS],
})
export class CatalogInfrastructureModule {}
