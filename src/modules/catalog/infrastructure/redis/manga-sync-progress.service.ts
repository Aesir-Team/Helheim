import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type {
  MangaSyncProgressPort,
  MangaSyncProgressState,
} from '../../application/ports/manga-sync-progress.port';

const KEY_PREFIX = 'midgard:manga-sync:v1';

@Injectable()
export class MangaSyncProgressService
  implements MangaSyncProgressPort, OnModuleDestroy
{
  private readonly logger = new Logger(MangaSyncProgressService.name);
  private readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL')?.trim() ?? '';
    this.client = url !== '' ? new Redis(url) : null;
    if (this.client) {
      this.logger.log('Manga sync progress: Redis habilitado');
    } else {
      this.logger.log(
        'Manga sync progress: REDIS_URL ausente — progresso não será publicado',
      );
    }
  }

  onModuleDestroy(): void {
    if (this.client) {
      void this.client.quit();
    }
  }

  async publish(state: MangaSyncProgressState): Promise<void> {
    if (!this.client) {
      return;
    }
    const key = `${KEY_PREFIX}:${state.mangaType}:${state.slug}`;
    const ttlSec = this.config.get<number>('MANGA_SYNC_REDIS_TTL_SEC', 604800);
    try {
      await this.client.set(key, JSON.stringify(state), 'EX', ttlSec);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis publish falhou (${key}): ${message}`);
    }
  }

  async getLatestBySlug(slug: string): Promise<MangaSyncProgressState | null> {
    if (!this.client) {
      return null;
    }
    const types = ['manga', 'manhwa', 'manhua'] as const;
    for (const mangaType of types) {
      const key = `${KEY_PREFIX}:${mangaType}:${slug}`;
      try {
        const raw = await this.client.get(key);
        if (!raw) {
          continue;
        }
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) {
          continue;
        }
        return parsed as MangaSyncProgressState;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Redis read falhou (${key}): ${message}`);
      }
    }
    return null;
  }
}
